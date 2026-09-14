-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — Row Level Security
-- Principe : chacun ne lit et n'écrit que ses propres données.
-- Deux exceptions, et seulement deux :
--   1. la bibliothèque d'exercices globale, en lecture pour tous les membres ;
--   2. la vue `classement`, prénom + métriques, pour les membres opt-in.
-- Les mesures corporelles et les photos ne sortent jamais du compte.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────── profiles ─────────────────────────────

create policy "profil_lecture_soi" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profil_lecture_admin" on public.profiles
  for select to authenticated
  using (public.est_admin());

create policy "profil_ecriture_soi" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Pas de policy INSERT : le profil est créé par le déclencheur sur auth.users.
-- Pas de policy DELETE : supprimer son compte passe par la suppression de
-- l'utilisateur Auth, qui cascade.

-- ───────────────────────────── exercices ─────────────────────────────

create policy "exercices_lecture" on public.exercices
  for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));

create policy "exercices_creation_perso" on public.exercices
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and is_custom);

create policy "exercices_maj_perso" on public.exercices
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and is_custom);

create policy "exercices_suppression_perso" on public.exercices
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ───────────────────────── seances_modeles ─────────────────────────

create policy "modeles_lecture_soi" on public.seances_modeles
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "modeles_ecriture_soi" on public.seances_modeles
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- Le partage par code court ne passe pas par une policy ouverte : il passe par
-- `public.importer_modele(code)`, SECURITY DEFINER, qui ne recopie que la
-- structure et jamais les séances réalisées.

create policy "modele_exercices_par_proprietaire" on public.modele_exercices
  for all to authenticated
  using (exists (
    select 1 from public.seances_modeles m
     where m.id = modele_exercices.modele_id and m.owner_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.seances_modeles m
     where m.id = modele_exercices.modele_id and m.owner_id = (select auth.uid())
  ));

-- ───────────────────────────── seances ─────────────────────────────

create policy "seances_soi" on public.seances
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "seance_exercices_par_proprietaire" on public.seance_exercices
  for all to authenticated
  using (exists (
    select 1 from public.seances s
     where s.id = seance_exercices.seance_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.seances s
     where s.id = seance_exercices.seance_id and s.user_id = (select auth.uid())
  ));

create policy "series_par_proprietaire" on public.series
  for all to authenticated
  using (exists (
    select 1 from public.seance_exercices se
      join public.seances s on s.id = se.seance_id
     where se.id = series.seance_exercice_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.seance_exercices se
      join public.seances s on s.id = se.seance_id
     where se.id = series.seance_exercice_id and s.user_id = (select auth.uid())
  ));

-- ───────────── Zone strictement privée : mesures et photos ─────────────
-- Aucune policy admin ici, volontairement. Un administrateur de la salle gère
-- les accès, pas les corps.

create policy "mesures_soi" on public.mesures
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "photos_soi" on public.photos_progres
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ───────────────────────────── records ─────────────────────────────

create policy "records_lecture_soi" on public.records
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "records_suppression_soi" on public.records
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Pas d'INSERT ni d'UPDATE : les records sont écrits par le déclencheur
-- `series_enregistrer_records`. Personne ne se fabrique un record à la main.

-- ───────────────────────── codes d'accès ─────────────────────────

create policy "codes_admin_seulement" on public.codes_acces
  for all to authenticated
  using (public.est_admin())
  with check (public.est_admin());

-- Un candidat à l'inscription n'a aucun accès en lecture : il passe par
-- `public.verifier_code_acces(code)`, qui ne répond que oui ou non.

-- ───────────────────────── abonnements push ─────────────────────────

create policy "push_soi" on public.abonnements_push
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ───────────────────────── Droits de schéma ─────────────────────────
-- Supabase accorde ces droits par défaut ; on les pose explicitement pour que
-- le schéma soit rejouable sur un Postgres nu (scripts/verifier-migrations.sh).

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Un visiteur non authentifié ne touche aucune table. Son seul point d'entrée
-- est `public.verifier_code_acces(code)`, qui ne répond que oui ou non.
revoke all on all tables in schema public from anon;
