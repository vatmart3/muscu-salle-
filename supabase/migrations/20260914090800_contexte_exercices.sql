-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — contexte d'exercice en un aller-retour
--
-- L'écran de séance a besoin, pour chaque exercice, de la dernière
-- performance (« La dernière fois : 80 kg × 8 ») et des records connus, afin
-- de détecter un record sans réseau. Une requête par exercice ferait dix
-- allers-retours au lancement : c'est ce qu'on évite ici.
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.contexte_exercices(p_ids uuid[])
returns table (
  exercice_id     uuid,
  dernier_poids   numeric,
  derniers_reps   smallint,
  derniere_date   timestamptz,
  records         jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  with derniere as (
    select distinct on (sx.exercice_id)
           sx.exercice_id, x.poids, x.reps, s.demarree_a
      from public.series x
      join public.seance_exercices sx on sx.id = x.seance_exercice_id
      join public.seances s on s.id = sx.seance_id
     where s.user_id = auth.uid()
       and sx.exercice_id = any(p_ids)
       and x.validee
       and x.type <> 'echauffement'
       and s.statut = 'terminee'
     order by sx.exercice_id, s.demarree_a desc, x.index_serie desc
  ),
  recs as (
    select r.exercice_id,
           jsonb_agg(jsonb_build_object('type', r.type, 'valeur', r.valeur, 'poids', r.poids)) as records
      from public.records r
     where r.user_id = auth.uid()
       and r.exercice_id = any(p_ids)
     group by r.exercice_id
  )
  select cible.id, d.poids, d.reps, d.demarree_a, coalesce(rc.records, '[]'::jsonb)
    from unnest(p_ids) as cible(id)
    left join derniere d on d.exercice_id = cible.id
    left join recs rc on rc.exercice_id = cible.id;
$$;

comment on function public.contexte_exercices is
  'Dernière performance et records connus, pour alimenter l''écran de séance hors-ligne.';

-- ───────────────────── Reprise d'une séance abandonnée ─────────────────────

create or replace function public.abandonner_seance(p_seance_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.seances s
     set statut = 'abandonnee',
         terminee_a = coalesce(s.terminee_a, now()),
         duree_secondes = coalesce(s.duree_secondes, greatest(0, extract(epoch from (now() - s.demarree_a))::integer))
   where s.id = p_seance_id and s.user_id = auth.uid() and s.statut = 'en_cours';
end;
$$;
