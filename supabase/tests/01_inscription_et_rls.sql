-- ═══════════════════════════════════════════════════════════════════════
-- Tests d'inscription, de déclencheurs et de RLS.
-- Lancés par scripts/verifier-migrations.sh sur une base jetable.
-- Chaque bloc échoue bruyamment : pas de test qui passe en silence.
-- ═══════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\timing off

create or replace function public.verifier(p_condition boolean, p_libelle text)
returns void language plpgsql as $$
begin
  if p_condition then
    raise notice '  ok    %', p_libelle;
  else
    raise exception 'ÉCHEC : %', p_libelle;
  end if;
end $$;

create or replace function public.doit_echouer(p_sql text, p_libelle text)
returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice '  ok    % (refusé : %)', p_libelle, sqlerrm;
    return;
  end;
  raise exception 'ÉCHEC : % — la requête aurait dû être refusée', p_libelle;
end $$;

-- ───────────────────── 1RM : la source de vérité ─────────────────────
do $$ begin
  perform public.verifier(public.epley_1rm(100, 1) = 100.00, '1RM à 1 rep = la charge');
  perform public.verifier(public.epley_1rm(100, 10) = 133.33, '1RM 100 kg x 10 = 133,33');
  perform public.verifier(public.epley_1rm(80, 8) = 101.33, '1RM 80 kg x 8 = 101,33');
  perform public.verifier(public.epley_1rm(0, 10) = 0, 'charge nulle = pas de 1RM');
  perform public.verifier(public.epley_1rm(null, 10) = 0, 'charge absente = pas de 1RM');
  perform public.verifier(public.volume_serie(80, 10, 'normale') = 800, 'volume d''une série normale');
  perform public.verifier(public.volume_serie(80, 10, 'echauffement') = 0, 'l''échauffement ne compte pas dans le tonnage');
end $$;

-- ───────────────────── Inscription et code d'accès ─────────────────────
do $$
declare v_alice uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_alice, 'alice@salle.fr', jsonb_build_object('prenom', 'Alice', 'code_acces', 'fonte-2026'));

  perform public.verifier(
    exists (select 1 from public.profiles p where p.id = v_alice and p.prenom = 'Alice'),
    'le profil est créé par le déclencheur, prénom repris des métadonnées');
  perform public.verifier(
    (select utilisations from public.codes_acces where code = 'FONTE-2026') = 1,
    'le code est consommé une fois, insensible à la casse');
  perform public.verifier(
    (select role from public.profiles where id = v_alice) = 'admin',
    'le premier membre inscrit devient administrateur');
end $$;

do $$ begin
  perform public.doit_echouer(
    $q$ insert into auth.users (email, raw_user_meta_data)
        values ('intrus@ailleurs.fr', '{"prenom":"Intrus","code_acces":"PAS-LE-BON"}'::jsonb) $q$,
    'inscription avec un code inconnu');
  perform public.doit_echouer(
    $q$ insert into auth.users (email, raw_user_meta_data)
        values ('sanscode@ailleurs.fr', '{"prenom":"Sans"}'::jsonb) $q$,
    'inscription sans code');
end $$;

do $$
declare v_bob uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v_bob, 'bob@salle.fr', jsonb_build_object('prenom', 'Bob', 'code_acces', 'FONTE-2026'));
  perform public.verifier(
    (select role from public.profiles where id = v_bob) = 'membre',
    'le deuxième membre reste simple membre');
  perform public.verifier(
    (select utilisations from public.codes_acces where code = 'FONTE-2026') = 2,
    'deuxième utilisation du code comptabilisée');
end $$;

-- Code épuisé : plus personne ne passe.
do $$ begin
  insert into public.codes_acces (code, actif, utilisations_max, utilisations)
  values ('EPUISE', true, 1, 1);
  perform public.verifier(not public.verifier_code_acces('EPUISE'), 'un code épuisé est refusé');
  insert into public.codes_acces (code, actif, utilisations_max) values ('COUPE', false, 10);
  perform public.verifier(not public.verifier_code_acces('COUPE'), 'un code désactivé est refusé');
  perform public.verifier(public.verifier_code_acces('  fonte-2026  '), 'espaces et casse tolérés sur un code valable');
end $$;

-- ───────────────────── Séance, volume et records ─────────────────────
do $$
declare
  v_alice   uuid := (select id from public.profiles where prenom = 'Alice');
  v_dev     uuid := (select id from public.exercices where slug = 'developpe-couche');
  v_seance  uuid;
  v_se      uuid;
begin
  insert into public.seances (user_id, nom) values (v_alice, 'Push A') returning id into v_seance;
  insert into public.seance_exercices (seance_id, exercice_id, ordre)
  values (v_seance, v_dev, 0) returning id into v_se;

  -- échauffement : ni volume, ni record
  insert into public.series (seance_exercice_id, index_serie, poids, reps, type, validee)
  values (v_se, 1, 40, 12, 'echauffement', true);
  perform public.verifier(
    (select volume_total from public.seances where id = v_seance) = 0,
    'un échauffement n''ajoute rien au tonnage');
  perform public.verifier(
    not exists (select 1 from public.records where user_id = v_alice),
    'un échauffement ne bat aucun record');

  -- première série réelle : tout est un record
  insert into public.series (seance_exercice_id, index_serie, poids, reps, type, validee)
  values (v_se, 2, 80, 10, 'normale', true);
  perform public.verifier(
    (select volume_total from public.seances where id = v_seance) = 800,
    'le tonnage de la séance suit les séries validées');
  perform public.verifier(
    (select est_record from public.series where seance_exercice_id = v_se and index_serie = 2),
    'la première série validée est marquée comme record');
  perform public.verifier(
    (select count(*) from public.records where user_id = v_alice and exercice_id = v_dev) = 4,
    'les quatre types de record sont créés');
  perform public.verifier(
    (select valeur from public.records where user_id = v_alice and exercice_id = v_dev and type = '1rm_estime') = 106.67,
    '1RM enregistré par la fonction Postgres');

  -- plus lourd, moins de reps : charge max battue, volume non
  insert into public.series (seance_exercice_id, index_serie, poids, reps, type, validee)
  values (v_se, 3, 90, 5, 'normale', true);
  perform public.verifier(
    (select valeur from public.records where user_id = v_alice and exercice_id = v_dev and type = 'charge_max') = 90,
    'charge max mise à jour');
  perform public.verifier(
    (select valeur from public.records where user_id = v_alice and exercice_id = v_dev and type = 'volume_max') = 800,
    'volume max inchangé quand la série est plus courte');
  perform public.verifier(
    (select valeur from public.records where user_id = v_alice and exercice_id = v_dev and type = 'reps_max') = 10,
    'reps max inchangé : 5 reps ne battent pas 10');

  -- même charge, une rep de plus : reps max tombe
  insert into public.series (seance_exercice_id, index_serie, poids, reps, type, validee)
  values (v_se, 4, 80, 11, 'normale', true);
  perform public.verifier(
    (select valeur from public.records where user_id = v_alice and exercice_id = v_dev and type = 'reps_max') = 11,
    'reps max battu à charge égale');

  -- série non validée : invisible pour le tonnage
  insert into public.series (seance_exercice_id, index_serie, poids, reps, type, validee)
  values (v_se, 5, 200, 10, 'normale', false);
  perform public.verifier(
    (select volume_total from public.seances where id = v_seance) = 800 + 450 + 880,
    'une série non validée n''entre pas dans le tonnage');
  perform public.verifier(
    not (select est_record from public.series where seance_exercice_id = v_se and index_serie = 5),
    'une série non validée ne bat aucun record');

  -- suppression : le tonnage se recalcule
  delete from public.series where seance_exercice_id = v_se and index_serie = 3;
  perform public.verifier(
    (select volume_total from public.seances where id = v_seance) = 800 + 880,
    'le tonnage se recalcule après suppression d''une série');
end $$;

-- ───────────────────── Une seule séance en cours ─────────────────────
do $$
declare v_alice uuid := (select id from public.profiles where prenom = 'Alice');
begin
  perform public.doit_echouer(
    format($q$ insert into public.seances (user_id, nom) values (%L, 'Doublon') $q$, v_alice),
    'deux séances en cours pour le même membre');
end $$;

-- ───────────────────── Contexte d'exercice ─────────────────────
-- `contexte_exercices` s'appuie sur auth.uid() : sans sub de JWT, elle ne
-- renverrait rien. On se présente donc comme Alice.

select id as alice from public.profiles where prenom = 'Alice' \gset
select set_config('request.jwt.claim.sub', :'alice', false) \gset ignore_

do $$
declare
  v_dev   uuid := (select id from public.exercices where slug = 'developpe-couche');
  v_squat uuid := (select id from public.exercices where slug = 'squat-barre');
  v_ligne record;
begin
  perform public.verifier(
    (select count(*) from public.contexte_exercices(array[v_dev, v_squat])) = 2,
    'le contexte renvoie une ligne par exercice demandé, même sans historique');

  select * into v_ligne from public.contexte_exercices(array[v_squat]);
  perform public.verifier(v_ligne.dernier_poids is null, 'aucune dernière perf sur un exercice jamais fait');
  perform public.verifier(v_ligne.records = '[]'::jsonb, 'aucun record sur un exercice jamais fait');

  select * into v_ligne from public.contexte_exercices(array[v_dev]);
  perform public.verifier(jsonb_array_length(v_ligne.records) = 4, 'les quatre records du développé sont renvoyés');
  perform public.verifier(v_ligne.dernier_poids is null, 'une séance encore en cours ne compte pas comme dernière perf');

  update public.seances set statut = 'terminee', terminee_a = now()
   where user_id = auth.uid() and statut = 'en_cours';

  select * into v_ligne from public.contexte_exercices(array[v_dev]);
  perform public.verifier(v_ligne.dernier_poids = 80 and v_ligne.derniers_reps = 11,
    'la dernière perf est la dernière série validée de la dernière séance terminée');
end $$;

select set_config('request.jwt.claim.sub', '', false) \gset ignore_
