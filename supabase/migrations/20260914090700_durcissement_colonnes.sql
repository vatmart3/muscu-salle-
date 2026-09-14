-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — durcissement au niveau colonne
--
-- La RLS raisonne par ligne, pas par colonne : une policy « tu modifies ta
-- propre ligne » laisse modifier N'IMPORTE QUELLE colonne de cette ligne.
-- Deux escalades étaient ouvertes :
--   1. `profiles.role` : un membre se promouvait administrateur ;
--   2. `seances.volume_total` : un membre gonflait son tonnage, donc le
--      classement de la salle.
-- On ferme les deux par des droits colonne + un déclencheur de sécurité.
-- ═══════════════════════════════════════════════════════════════════════

-- ───────────────────────────── profiles ─────────────────────────────

revoke update on public.profiles from authenticated;

grant update (
  prenom, avatar_url, sexe, date_naissance, taille_cm,
  objectif, niveau, jours_par_semaine, materiel_dispo, blessures, unite,
  theme, son_timer, vibration_timer, classement_visible, relance_active,
  onboarding_termine
) on public.profiles to authenticated;

-- `role` n'est modifiable par personne depuis l'API. Le premier inscrit est
-- promu par déclencheur ; toute autre promotion se fait en SQL, volontairement.
create or replace function public.verrouiller_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'le rôle ne se modifie pas depuis l''application' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_verrouiller_role
  before update on public.profiles
  for each row
  when (pg_trigger_depth() = 0)  -- laisse passer le déclencheur de promotion initiale
  execute function public.verrouiller_role();

-- ───────────────────────────── seances ─────────────────────────────

revoke update on public.seances from authenticated;

grant update (
  nom, modele_id, terminee_a, duree_secondes, ressenti, note, statut
) on public.seances to authenticated;

-- `volume_total` est écrit uniquement par `recalculer_volume_seance`.
-- `demarree_a` et `user_id` sont figés à la création.

-- ───────────────────────────── series ─────────────────────────────
-- `est_record` est réécrit à chaque insertion ou mise à jour par le
-- déclencheur `series_marquer_record` : une valeur envoyée par le client est
-- systématiquement écrasée. Pas besoin de droit colonne ici.

-- ───────────────────────────── exercices ─────────────────────────────

revoke update on public.exercices from authenticated;

grant update (
  nom, groupe_principal, groupes_secondaires, equipement, type, instructions
) on public.exercices to authenticated;

-- `owner_id`, `is_custom` et `slug` sont figés : on ne s'approprie pas un
-- exercice global en basculant son propriétaire.
