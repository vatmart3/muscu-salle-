-- ═══════════════════════════════════════════════════════════════════════
-- Tests d'isolation : chacun ne voit que ses données.
-- On endosse réellement le rôle `authenticated` avec un sub de JWT, comme
-- PostgREST le fait en production.
--
-- Les identifiants sont lus AVANT de changer de rôle : une fois `authenticated`
-- endossé, la RLS masque justement ce qu'on cherche à lire.
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

select id as alice from public.profiles where prenom = 'Alice' \gset
select id as bob   from public.profiles where prenom = 'Bob'   \gset

-- Jeu de données posé en tant que propriétaire de la base (RLS contournée).
insert into public.mesures (user_id, date, poids_kg, tour_bras)
values (:'alice', current_date, 78.4, 38.0);

insert into public.photos_progres (user_id, date, angle, storage_path)
values (:'alice', current_date, 'face', :'alice' || '/face/2026-09-14.jpg');

insert into public.exercices (nom, slug, groupe_principal, equipement, type, is_custom, owner_id)
values ('Curl maison', 'curl-maison', 'biceps', 'halteres', 'charge', true, :'alice');

insert into public.seances (user_id, nom, statut, demarree_a, terminee_a, duree_secondes, volume_total)
values (:'bob', 'Legs', 'terminee', now() - interval '2 hours', now(), 3600, 9200);

update public.profiles set classement_visible = true where id = :'bob';

-- ───────────────────── Bob regarde chez Alice ─────────────────────
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', :'bob', true) \gset ignore_

  do $$ begin
    perform public.verifier(auth.uid() is not null, 'le sub du JWT est bien pris en compte');
    perform public.verifier(not public.est_admin(), 'Bob n''est pas administrateur');
    perform public.verifier((select count(*) from public.mesures) = 0, 'Bob ne voit aucune mesure d''Alice');
    perform public.verifier((select count(*) from public.photos_progres) = 0, 'Bob ne voit aucune photo d''Alice');
    perform public.verifier((select count(*) from public.records) = 0, 'Bob ne voit aucun record d''Alice');
    perform public.verifier((select count(*) from public.seances where nom = 'Push A') = 0, 'Bob ne voit pas la séance d''Alice');
    perform public.verifier((select count(*) from public.series) = 0, 'Bob ne voit aucune série d''Alice');
    perform public.verifier((select count(*) from public.profiles) = 1, 'Bob ne voit que son propre profil');
    perform public.verifier((select count(*) from public.exercices where slug = 'curl-maison') = 0, 'un exercice personnel reste privé');
    perform public.verifier((select count(*) from public.exercices where owner_id is null) > 120, 'la bibliothèque globale reste lisible par tous');
    perform public.verifier((select count(*) from public.codes_acces) = 0, 'un membre simple ne voit aucun code d''accès');
    perform public.verifier((select count(*) from public.seances_modeles) = 0, 'aucun programme d''un autre membre');
  end $$;

  select public.doit_echouer(
    format($q$ insert into public.mesures (user_id, poids_kg) values (%L, 70) $q$, :'alice'),
    'écrire une mesure au nom d''Alice');
  select public.doit_echouer(
    format($q$ insert into public.seances (user_id, nom) values (%L, 'Pirate') $q$, :'alice'),
    'créer une séance au nom d''Alice');
  select public.doit_echouer(
    format($q$ insert into public.records (user_id, exercice_id, type, valeur)
               values (%L, (select id from public.exercices where owner_id is null limit 1), 'charge_max', 500) $q$, :'bob'),
    'se fabriquer un record à la main');
  select public.doit_echouer(
    $q$ insert into public.codes_acces (code) values ('PIRATE') $q$,
    'créer un code d''accès sans être admin');
  select public.doit_echouer(
    format($q$ update public.profiles set role = 'admin' where id = %L $q$, :'bob') ,
    'se promouvoir administrateur');
rollback;

-- ───────────────────── Alice, administratrice ─────────────────────
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', :'alice', true) \gset ignore_

  do $$ begin
    perform public.verifier(public.est_admin(), 'Alice est administratrice');
    perform public.verifier((select count(*) from public.profiles) = 2, 'une administratrice voit la liste des membres');
    perform public.verifier((select count(*) from public.codes_acces) >= 1, 'une administratrice lit les codes d''accès');
    perform public.verifier((select count(*) from public.mesures) = 1, 'une administratrice ne voit que SES mesures');
  end $$;

  do $$
  declare v_bob uuid := (select id from public.profiles where prenom = 'Bob');
  begin
    perform public.verifier(
      (select count(*) from public.mesures m where m.user_id = v_bob) = 0,
      'aucune donnée corporelle d''un autre membre n''est accessible à l''admin');
    perform public.verifier(
      (select count(*) from public.photos_progres p where p.user_id = v_bob) = 0,
      'aucune photo d''un autre membre n''est accessible à l''admin');
  end $$;

  -- Le classement n'expose que le prénom et deux métriques d'entraînement.
  do $$ begin
    perform public.verifier((select count(*) from public.classement) = 1, 'le classement ne contient que les membres opt-in');
    perform public.verifier((select prenom from public.classement limit 1) = 'Bob', 'le classement affiche le prénom');
    perform public.verifier(
      (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'classement'
          and column_name not in ('membre_id', 'prenom', 'semaine', 'seances', 'tonnage')) = 0,
      'le classement n''expose que prénom, semaine, séances et tonnage');
  end $$;
rollback;

-- ───────────────────── Stockage des photos ─────────────────────
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', :'bob', true) \gset ignore_

  insert into storage.objects (bucket_id, name) values ('photos-progres', :'bob' || '/face/2026-09-14.jpg');
  select public.verifier(true, 'Bob dépose une photo dans son propre dossier');

  select public.doit_echouer(
    format($q$ insert into storage.objects (bucket_id, name) values ('photos-progres', %L) $q$, :'alice' || '/face/vol.jpg'),
    'déposer une photo dans le dossier d''un autre membre');

  select public.verifier(
    (select count(*) from storage.objects where name like :'alice' || '%') = 0,
    'les photos d''Alice sont invisibles pour Bob');
rollback;

-- ───────────────────── Le bucket reste privé ─────────────────────
select public.verifier(
  not (select public from storage.buckets where id = 'photos-progres'),
  'le bucket photos-progres n''est pas public');

-- ───────────────────── Durcissement colonne ─────────────────────
begin;
  set local role authenticated;
  select set_config('request.jwt.claim.sub', :'bob', true) \gset ignore_

  select public.doit_echouer(
    format($q$ update public.profiles set role = 'admin' where id = %L $q$, :'bob'),
    'se promouvoir administrateur');
  select public.doit_echouer(
    $q$ update public.seances set volume_total = 999999 where nom = 'Legs' $q$,
    'gonfler son tonnage à la main');
  select public.doit_echouer(
    $q$ update public.exercices set owner_id = null, is_custom = false where slug = 'curl-maison' $q$,
    's''approprier la bibliothèque globale');

  -- ce qui doit rester possible
  update public.profiles set prenom = 'Bobby', classement_visible = false where id = :'bob';
  select public.verifier(true, 'un membre modifie bien son prénom et son opt-in de classement');
  update public.seances set ressenti = 4, note = 'Jambes lourdes' where nom = 'Legs';
  select public.verifier(true, 'un membre note bien sa séance');
rollback;
