-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — fonctions et déclencheurs
-- Toutes les fonctions SECURITY DEFINER fixent `search_path = ''` et
-- qualifient leurs objets : sans ça, un schéma injecté peut les détourner.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────── Calculs du domaine ─────────────────────────

-- Référence unique du 1RM estimé : formule d'Epley.
-- Le front en garde une copie dans lib/calculs.ts pour l'affichage hors-ligne,
-- couverte par un test de parité. Voir DECISIONS.md.
create or replace function public.epley_1rm(p_poids numeric, p_reps integer)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_poids is null or p_reps is null or p_poids <= 0 or p_reps <= 0 then 0::numeric
    when p_reps = 1 then round(p_poids, 2)
    else round(p_poids * (1 + p_reps::numeric / 30), 2)
  end;
$$;

comment on function public.epley_1rm is 'Poids × (1 + reps / 30). Source de vérité du 1RM estimé.';

-- Volume d'une série. L'échauffement ne compte pas dans le tonnage.
create or replace function public.volume_serie(p_poids numeric, p_reps integer, p_type public.type_serie)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_type = 'echauffement' then 0::numeric
    when p_poids is null or p_reps is null or p_poids <= 0 or p_reps <= 0 then 0::numeric
    else round(p_poids * p_reps, 2)
  end;
$$;

-- ───────────────────────── Utilitaires ─────────────────────────

create or replace function public.maj_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_maj_updated_at
  before update on public.profiles
  for each row execute function public.maj_updated_at();

-- Le membre courant est-il admin ? SECURITY DEFINER pour éviter la récursion
-- de policy sur `profiles` (une policy qui lit `profiles` se relit elle-même).
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.role = 'admin' from public.profiles p where p.id = auth.uid()), false);
$$;

revoke all on function public.est_admin() from public;
grant execute on function public.est_admin() to authenticated;

-- ───────────────────────── Codes d'accès ─────────────────────────

create or replace function public.verifier_code_acces(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.codes_acces c
    where upper(trim(c.code)) = upper(trim(p_code))
      and c.actif
      and (c.utilisations_max is null or c.utilisations < c.utilisations_max)
  );
$$;

revoke all on function public.verifier_code_acces(text) from public;
grant execute on function public.verifier_code_acces(text) to anon, authenticated;

comment on function public.verifier_code_acces is
  'Dit seulement si un code est utilisable. N''expose jamais la liste des codes.';

-- Consomme un code de façon atomique. Échoue si le code n'est plus valable.
create or replace function public.consommer_code_acces(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_touche integer;
begin
  update public.codes_acces c
     set utilisations = c.utilisations + 1
   where upper(trim(c.code)) = upper(trim(p_code))
     and c.actif
     and (c.utilisations_max is null or c.utilisations < c.utilisations_max);
  get diagnostics v_touche = row_count;
  if v_touche = 0 then
    raise exception 'code_acces_invalide' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.consommer_code_acces(text) from public;

-- ───────────────────── Création du profil à l'inscription ─────────────────────

create or replace function public.creer_profil_membre()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prenom text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'prenom', '')), '');
  v_code   text := nullif(trim(coalesce(new.raw_user_meta_data ->> 'code_acces', '')), '');
begin
  -- Le code est consommé dans la même transaction que la création du compte :
  -- pas de compte créé sans code valable, pas de code consommé sans compte.
  perform public.consommer_code_acces(v_code);

  insert into public.profiles (id, prenom)
  values (new.id, coalesce(v_prenom, split_part(new.email, '@', 1)));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.creer_profil_membre();

-- ───────────────────── Contexte d'une série ─────────────────────

create or replace function public.contexte_serie(p_seance_exercice_id uuid)
returns table (user_id uuid, exercice_id uuid, seance_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, se.exercice_id, s.id
    from public.seance_exercices se
    join public.seances s on s.id = se.seance_id
   where se.id = p_seance_exercice_id;
$$;

-- ───────────────────── Volume de la séance, tenu à jour ─────────────────────

create or replace function public.recalculer_volume_seance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seance uuid;
  v_se     uuid := coalesce(new.seance_exercice_id, old.seance_exercice_id);
begin
  select se.seance_id into v_seance from public.seance_exercices se where se.id = v_se;
  if v_seance is null then
    return coalesce(new, old);
  end if;

  update public.seances s
     set volume_total = coalesce((
           select sum(public.volume_serie(x.poids, x.reps, x.type))
             from public.series x
             join public.seance_exercices sx on sx.id = x.seance_exercice_id
            where sx.seance_id = v_seance and x.validee
         ), 0)
   where s.id = v_seance;

  return coalesce(new, old);
end;
$$;

create trigger series_maj_volume
  after insert or update or delete on public.series
  for each row execute function public.recalculer_volume_seance();

-- ───────────────────── Détection et écriture des records ─────────────────────

-- BEFORE : on marque la série elle-même. Lire `records` ici donne bien l'état
-- d'avant, puisque le AFTER n'a pas encore écrit.
create or replace function public.marquer_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ctx      record;
  v_1rm      numeric;
  v_volume   numeric;
  v_record   boolean := false;
begin
  if not new.validee or new.type = 'echauffement'
     or new.poids is null or new.reps is null or new.poids <= 0 or new.reps <= 0 then
    new.est_record := false;
    return new;
  end if;

  select * into v_ctx from public.contexte_serie(new.seance_exercice_id);
  if v_ctx is null then
    return new;
  end if;

  v_1rm := public.epley_1rm(new.poids, new.reps);
  v_volume := round(new.poids * new.reps, 2);

  select
    coalesce(bool_or(
      (r.type = 'charge_max'  and new.poids > r.valeur) or
      (r.type = '1rm_estime'  and v_1rm > r.valeur) or
      (r.type = 'volume_max'  and v_volume > r.valeur) or
      (r.type = 'reps_max'    and new.poids >= coalesce(r.poids, 0) and new.reps > r.valeur)
    ), false)
    or not exists (
      select 1 from public.records r2
       where r2.user_id = v_ctx.user_id and r2.exercice_id = v_ctx.exercice_id
    )
  into v_record
  from public.records r
  where r.user_id = v_ctx.user_id and r.exercice_id = v_ctx.exercice_id;

  new.est_record := coalesce(v_record, true);
  return new;
end;
$$;

create trigger series_marquer_record
  before insert or update on public.series
  for each row execute function public.marquer_record();

-- AFTER : on met à jour la table des records.
create or replace function public.enregistrer_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ctx    record;
  v_1rm    numeric;
  v_volume numeric;
  v_reps   record;
begin
  if not new.validee or new.type = 'echauffement'
     or new.poids is null or new.reps is null or new.poids <= 0 or new.reps <= 0 then
    return new;
  end if;

  select * into v_ctx from public.contexte_serie(new.seance_exercice_id);
  if v_ctx is null then
    return new;
  end if;

  v_1rm := public.epley_1rm(new.poids, new.reps);
  v_volume := round(new.poids * new.reps, 2);

  insert into public.records (user_id, exercice_id, type, valeur, poids, reps, seance_id, obtenu_le)
  values (v_ctx.user_id, v_ctx.exercice_id, 'charge_max', new.poids, new.poids, new.reps, v_ctx.seance_id, now())
  on conflict (user_id, exercice_id, type) do update
    set valeur = excluded.valeur, poids = excluded.poids, reps = excluded.reps,
        seance_id = excluded.seance_id, obtenu_le = excluded.obtenu_le
    where excluded.valeur > public.records.valeur;

  insert into public.records (user_id, exercice_id, type, valeur, poids, reps, seance_id, obtenu_le)
  values (v_ctx.user_id, v_ctx.exercice_id, '1rm_estime', v_1rm, new.poids, new.reps, v_ctx.seance_id, now())
  on conflict (user_id, exercice_id, type) do update
    set valeur = excluded.valeur, poids = excluded.poids, reps = excluded.reps,
        seance_id = excluded.seance_id, obtenu_le = excluded.obtenu_le
    where excluded.valeur > public.records.valeur;

  insert into public.records (user_id, exercice_id, type, valeur, poids, reps, seance_id, obtenu_le)
  values (v_ctx.user_id, v_ctx.exercice_id, 'volume_max', v_volume, new.poids, new.reps, v_ctx.seance_id, now())
  on conflict (user_id, exercice_id, type) do update
    set valeur = excluded.valeur, poids = excluded.poids, reps = excluded.reps,
        seance_id = excluded.seance_id, obtenu_le = excluded.obtenu_le
    where excluded.valeur > public.records.valeur;

  -- Reps : il faut au moins égaler la charge du record précédent.
  select r.valeur, r.poids into v_reps
    from public.records r
   where r.user_id = v_ctx.user_id and r.exercice_id = v_ctx.exercice_id and r.type = 'reps_max';

  if v_reps is null then
    insert into public.records (user_id, exercice_id, type, valeur, poids, reps, seance_id, obtenu_le)
    values (v_ctx.user_id, v_ctx.exercice_id, 'reps_max', new.reps, new.poids, new.reps, v_ctx.seance_id, now())
    on conflict (user_id, exercice_id, type) do nothing;
  elsif new.poids >= coalesce(v_reps.poids, 0) and new.reps > v_reps.valeur then
    update public.records r
       set valeur = new.reps, poids = new.poids, reps = new.reps,
           seance_id = v_ctx.seance_id, obtenu_le = now()
     where r.user_id = v_ctx.user_id and r.exercice_id = v_ctx.exercice_id and r.type = 'reps_max';
  end if;

  return new;
end;
$$;

create trigger series_enregistrer_records
  after insert or update on public.series
  for each row execute function public.enregistrer_records();

-- ───────────────────── Fin de séance ─────────────────────

create or replace function public.terminer_seance(p_seance_id uuid, p_ressenti smallint default null, p_note text default null)
returns public.seances
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_seance public.seances;
begin
  update public.seances s
     set terminee_a = now(),
         duree_secondes = greatest(0, extract(epoch from (now() - s.demarree_a))::integer),
         statut = 'terminee',
         ressenti = coalesce(p_ressenti, s.ressenti),
         note = coalesce(p_note, s.note)
   where s.id = p_seance_id and s.user_id = auth.uid() and s.statut = 'en_cours'
  returning * into v_seance;

  if v_seance is null then
    raise exception 'seance_introuvable_ou_deja_terminee' using errcode = '22023';
  end if;

  -- Une séance sans aucune série validée n'est pas une séance : on l'abandonne.
  if not exists (
    select 1 from public.series x
      join public.seance_exercices sx on sx.id = x.seance_exercice_id
     where sx.seance_id = p_seance_id and x.validee
  ) then
    update public.seances s set statut = 'abandonnee' where s.id = p_seance_id
    returning * into v_seance;
  end if;

  return v_seance;
end;
$$;

-- ───────────────────── Partage de modèle par code court ─────────────────────

create or replace function public.generer_code_partage()
returns text
language sql
volatile
set search_path = ''
as $$
  -- 6 caractères sans ambiguïté visuelle (ni O/0, ni I/1).
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random() * 31)::int + 1, 1), '')
    from generate_series(1, 6);
$$;

create or replace function public.importer_modele(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source public.seances_modeles;
  v_nouveau uuid;
begin
  if auth.uid() is null then
    raise exception 'non_authentifie' using errcode = '42501';
  end if;

  select * into v_source from public.seances_modeles m where upper(m.code_partage) = upper(trim(p_code));
  if v_source is null then
    raise exception 'modele_introuvable' using errcode = '22023';
  end if;

  insert into public.seances_modeles (owner_id, nom, description, couleur, ordre)
  values (auth.uid(), v_source.nom, v_source.description, v_source.couleur,
          coalesce((select max(m2.ordre) + 1 from public.seances_modeles m2 where m2.owner_id = auth.uid()), 0))
  returning id into v_nouveau;

  insert into public.modele_exercices (modele_id, exercice_id, ordre, series_cible, reps_cible, repos_secondes, notes)
  select v_nouveau, me.exercice_id, me.ordre, me.series_cible, me.reps_cible, me.repos_secondes, me.notes
    from public.modele_exercices me
   where me.modele_id = v_source.id
     -- on n'importe pas les exercices personnels d'un autre membre
     and exists (select 1 from public.exercices e where e.id = me.exercice_id and e.owner_id is null);

  return v_nouveau;
end;
$$;

revoke all on function public.importer_modele(text) from public;
grant execute on function public.importer_modele(text) to authenticated;

-- ───────────────────── Classement de la salle ─────────────────────

-- Vue en lecture seule, ouverte à tous les membres. N'expose que le prénom et
-- deux métriques d'entraînement. Aucune donnée corporelle, aucune photo.
create or replace view public.classement
with (security_invoker = false) as
  select
    p.id                                          as membre_id,
    p.prenom,
    date_trunc('week', s.demarree_a)::date        as semaine,
    count(*) filter (where s.statut = 'terminee') as seances,
    coalesce(sum(s.volume_total), 0)::numeric(12, 2) as tonnage
  from public.profiles p
  join public.seances s on s.user_id = p.id and s.statut = 'terminee'
  where p.classement_visible
  group by p.id, p.prenom, date_trunc('week', s.demarree_a);

revoke all on public.classement from public, anon;
grant select on public.classement to authenticated;

comment on view public.classement is
  'Prénom + tonnage + nombre de séances, uniquement pour les membres qui ont accepté d''y figurer.';

-- ───────────────────── Agrégats pour les écrans ─────────────────────

-- Volume par groupe musculaire sur une fenêtre glissante — alimente la carte
-- corporelle. Le groupe secondaire compte pour moitié.
create or replace function public.volume_par_groupe(p_jours integer default 7)
returns table (groupe text, volume numeric, series bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with series_valides as (
    select e.groupe_principal, e.groupes_secondaires,
           public.volume_serie(x.poids, x.reps, x.type) as volume
      from public.series x
      join public.seance_exercices sx on sx.id = x.seance_exercice_id
      join public.seances s on s.id = sx.seance_id
      join public.exercices e on e.id = sx.exercice_id
     where s.user_id = auth.uid()
       and x.validee
       and x.type <> 'echauffement'
       and s.demarree_a >= now() - make_interval(days => p_jours)
  ),
  principal as (
    select groupe_principal as groupe, volume, 1::numeric as poids_groupe from series_valides
  ),
  secondaire as (
    select unnest(groupes_secondaires) as groupe, volume, 0.5::numeric as poids_groupe from series_valides
  ),
  tout as (select * from principal union all select * from secondaire)
  select t.groupe,
         round(sum(t.volume * t.poids_groupe), 2) as volume,
         count(*) as series
    from tout t
   group by t.groupe
   order by volume desc;
$$;

-- Dernière performance sur un exercice : c'est la fonction qui fait revenir les gens.
create or replace function public.derniere_perf(p_exercice_id uuid)
returns table (poids numeric, reps smallint, faite_le timestamptz, seance_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select x.poids, x.reps, s.demarree_a, s.id
    from public.series x
    join public.seance_exercices sx on sx.id = x.seance_exercice_id
    join public.seances s on s.id = sx.seance_id
   where s.user_id = auth.uid()
     and sx.exercice_id = p_exercice_id
     and x.validee
     and x.type <> 'echauffement'
     and s.statut = 'terminee'
   order by s.demarree_a desc, x.index_serie desc
   limit 1;
$$;

-- Historique du 1RM estimé et de la charge max, par séance.
create or replace function public.progression_exercice(p_exercice_id uuid, p_limite integer default 60)
returns table (jour date, charge_max numeric, rm_estime numeric, volume numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select s.demarree_a::date as jour,
         max(x.poids) as charge_max,
         max(public.epley_1rm(x.poids, x.reps)) as rm_estime,
         round(sum(public.volume_serie(x.poids, x.reps, x.type)), 2) as volume
    from public.series x
    join public.seance_exercices sx on sx.id = x.seance_exercice_id
    join public.seances s on s.id = sx.seance_id
   where s.user_id = auth.uid()
     and sx.exercice_id = p_exercice_id
     and x.validee
     and x.type <> 'echauffement'
   group by s.demarree_a::date
   order by jour desc
   limit p_limite;
$$;

-- Tonnage et nombre de séances par semaine, sur les N dernières semaines.
create or replace function public.tonnage_hebdomadaire(p_semaines integer default 12)
returns table (semaine date, seances bigint, tonnage numeric, duree_moyenne numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select date_trunc('week', s.demarree_a)::date as semaine,
         count(*) as seances,
         round(coalesce(sum(s.volume_total), 0), 2) as tonnage,
         round(coalesce(avg(s.duree_secondes), 0), 0) as duree_moyenne
    from public.seances s
   where s.user_id = auth.uid()
     and s.statut = 'terminee'
     and s.demarree_a >= date_trunc('week', now()) - make_interval(weeks => p_semaines - 1)
   group by 1
   order by 1 desc;
$$;
