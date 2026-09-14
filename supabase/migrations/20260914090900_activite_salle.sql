-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — vue d'ensemble de l'activité, pour l'espace admin
--
-- L'espace admin passait d'abord par la vue `classement`, qui ne contient que
-- les membres ayant accepté d'y figurer : l'aperçu était donc faux. Cette
-- fonction couvre tous les membres, mais **uniquement** le nombre de séances,
-- le tonnage et la date de dernière séance. Aucune mesure, aucune photo,
-- aucun détail de série.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.activite_salle(p_jours integer default 30)
returns table (
  membre_id       uuid,
  prenom          text,
  role            public.role_membre,
  inscrit_le      timestamptz,
  seances         bigint,
  tonnage         numeric,
  derniere_seance timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.prenom,
    p.role,
    p.created_at,
    count(s.id) filter (
      where s.statut = 'terminee' and s.demarree_a >= now() - make_interval(days => p_jours)
    ),
    coalesce(sum(s.volume_total) filter (
      where s.statut = 'terminee' and s.demarree_a >= now() - make_interval(days => p_jours)
    ), 0)::numeric(12, 2),
    max(s.demarree_a) filter (where s.statut = 'terminee')
  from public.profiles p
  left join public.seances s on s.user_id = p.id
  -- Le garde-fou est ici, pas dans l'écran : un non-administrateur qui
  -- appellerait la fonction directement n'obtient aucune ligne.
  where public.est_admin()
  group by p.id, p.prenom, p.role, p.created_at
  order by p.created_at desc;
$$;

revoke all on function public.activite_salle(integer) from public;
grant execute on function public.activite_salle(integer) to authenticated;

comment on function public.activite_salle is
  'Activité de la salle pour les administrateurs : séances et tonnage seulement.';
