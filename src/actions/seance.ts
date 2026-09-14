"use server";

import { clientServeur } from "@/lib/supabase/server";
import type { ExerciceLocal, SeanceLocale, SerieLocale } from "@/stores/seance";
import type { RecordConnu } from "@/lib/calculs";
import type { TypeExercice, TypeRecord } from "@/lib/types";

/**
 * Actions de l'écran de séance.
 *
 * Le démarrage exige le réseau : c'est le seul moment où l'on a besoin de la
 * bibliothèque, de la dernière performance et des records. Tout ce qui suit —
 * saisie, validation, records, chrono — fonctionne hors-ligne, et la
 * synchronisation se contente de reposer l'état local en base.
 */

type ContexteBrut = {
  exercice_id: string;
  dernier_poids: number | null;
  derniers_reps: number | null;
  derniere_date: string | null;
  records: Array<{ type: TypeRecord; valeur: number; poids: number | null }>;
};

export type ChargeSeance = {
  seance: SeanceLocale;
  exercices: ExerciceLocal[];
};

export type ResultatSeance = { erreur?: string; charge?: ChargeSeance };

async function contexte(supabase: Awaited<ReturnType<typeof clientServeur>>, ids: string[]) {
  if (ids.length === 0) return new Map<string, ContexteBrut>();
  const { data } = await supabase.rpc("contexte_exercices", { p_ids: ids });
  const lignes = (data ?? []) as unknown as ContexteBrut[];
  return new Map(lignes.map((l) => [l.exercice_id, l]));
}

function versExerciceLocal(args: {
  id: string;
  exercice: { id: string; nom: string; groupe_principal: string; type: TypeExercice; instructions: string };
  ordre: number;
  repos: number;
  seriesCible: number;
  repsCible: number;
  note: string | null;
  ctx: ContexteBrut | undefined;
  series?: SerieLocale[];
}): ExerciceLocal {
  const { ctx } = args;
  const recordsConnus: RecordConnu[] = (ctx?.records ?? []).map((r) => ({
    type: r.type,
    valeur: Number(r.valeur),
    poids: r.poids === null ? null : Number(r.poids),
  }));
  return {
    id: args.id,
    exercice_id: args.exercice.id,
    nom: args.exercice.nom,
    groupe: args.exercice.groupe_principal,
    typeExercice: args.exercice.type,
    instructions: args.exercice.instructions,
    ordre: args.ordre,
    repos_secondes: args.repos,
    note: args.note,
    seriesCible: args.seriesCible,
    repsCible: args.repsCible,
    series: args.series ?? [],
    derniereFois:
      ctx?.derniere_date && ctx.dernier_poids !== null
        ? { poids: Number(ctx.dernier_poids), reps: ctx.derniers_reps, date: ctx.derniere_date }
        : null,
    recordsConnus,
  };
}

/** Séance en cours côté serveur, s'il y en a une. Sert à la reprise. */
export async function seanceEnCours(): Promise<ResultatSeance> {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { data } = await supabase
    .from("seances")
    .select(
      "id, nom, modele_id, demarree_a, note, ressenti, seance_exercices(id, exercice_id, ordre, repos_secondes, note, exercices(id, nom, groupe_principal, type, instructions), series(id, index_serie, poids, reps, secondes, metres, rpe, type, validee, est_record))",
    )
    .eq("user_id", auth.user.id)
    .eq("statut", "en_cours")
    .order("demarree_a", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return {};

  const liens = data.seance_exercices ?? [];
  const ctx = await contexte(supabase, liens.map((l) => l.exercice_id));

  const exercices = liens
    .filter((l) => l.exercices)
    .sort((a, b) => a.ordre - b.ordre)
    .map((l) =>
      versExerciceLocal({
        id: l.id,
        exercice: l.exercices!,
        ordre: l.ordre,
        repos: l.repos_secondes,
        seriesCible: Math.max(1, (l.series ?? []).filter((s) => s.validee).length || 3),
        repsCible: 8,
        note: l.note,
        ctx: ctx.get(l.exercice_id),
        series: (l.series ?? [])
          .sort((a, b) => a.index_serie - b.index_serie)
          .map((s) => ({ ...s, records: [] })),
      }),
    );

  return {
    charge: {
      seance: {
        id: data.id,
        nom: data.nom,
        modele_id: data.modele_id,
        demarree_a: data.demarree_a,
        note: data.note,
        ressenti: data.ressenti,
      },
      exercices,
    },
  };
}

/**
 * Démarre une séance : depuis un modèle, en reprenant la dernière séance
 * terminée, ou à vide.
 */
export async function demarrerSeance(options: {
  modeleId?: string | null;
  repeterSeanceId?: string | null;
  nom?: string;
}): Promise<ResultatSeance> {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const dejaEnCours = await seanceEnCours();
  if (dejaEnCours.charge) return dejaEnCours;

  type Plan = { exercice_id: string; ordre: number; repos: number; series: number; reps: number; note: string | null };
  let plan: Plan[] = [];
  let nom = options.nom ?? "Séance libre";

  if (options.modeleId) {
    const { data: modele } = await supabase
      .from("seances_modeles")
      .select("nom, modele_exercices(exercice_id, ordre, series_cible, reps_cible, repos_secondes, notes)")
      .eq("id", options.modeleId)
      .single();
    if (!modele) return { erreur: "Ce programme n'existe plus." };
    nom = modele.nom;
    plan = (modele.modele_exercices ?? [])
      .sort((a, b) => a.ordre - b.ordre)
      .map((m) => ({
        exercice_id: m.exercice_id,
        ordre: m.ordre,
        repos: m.repos_secondes,
        series: m.series_cible,
        reps: m.reps_cible,
        note: m.notes,
      }));
  } else if (options.repeterSeanceId) {
    const { data: source } = await supabase
      .from("seances")
      .select("nom, seance_exercices(exercice_id, ordre, repos_secondes, note, series(reps, validee, type))")
      .eq("id", options.repeterSeanceId)
      .single();
    if (!source) return { erreur: "Cette séance n'existe plus." };
    nom = source.nom;
    plan = (source.seance_exercices ?? [])
      .sort((a, b) => a.ordre - b.ordre)
      .map((sx) => {
        const validees = (sx.series ?? []).filter((s) => s.validee && s.type !== "echauffement");
        return {
          exercice_id: sx.exercice_id,
          ordre: sx.ordre,
          repos: sx.repos_secondes,
          series: Math.max(1, validees.length),
          reps: validees[0]?.reps ?? 8,
          note: sx.note,
        };
      });
  }

  const { data: seance, error } = await supabase
    .from("seances")
    .insert({ user_id: auth.user.id, nom, modele_id: options.modeleId ?? null, statut: "en_cours" })
    .select("id, nom, modele_id, demarree_a, note, ressenti")
    .single();
  if (error || !seance) return { erreur: "La séance n'a pas pu démarrer. Réessaie." };

  let liens: Array<{ id: string; exercice_id: string; ordre: number; repos_secondes: number; note: string | null }> = [];
  if (plan.length > 0) {
    const { data: inseres, error: erreurLiens } = await supabase
      .from("seance_exercices")
      .insert(
        plan.map((p) => ({
          seance_id: seance.id,
          exercice_id: p.exercice_id,
          ordre: p.ordre,
          repos_secondes: p.repos,
          note: p.note,
        })),
      )
      .select("id, exercice_id, ordre, repos_secondes, note");
    if (erreurLiens || !inseres) return { erreur: "Les exercices n'ont pas pu être ajoutés à la séance." };
    liens = inseres;
  }

  const ids = plan.map((p) => p.exercice_id);
  const [{ data: fiches }, ctx] = await Promise.all([
    ids.length
      ? supabase.from("exercices").select("id, nom, groupe_principal, type, instructions").in("id", ids)
      : Promise.resolve({ data: [] as never[] }),
    contexte(supabase, ids),
  ]);

  const parId = new Map((fiches ?? []).map((f) => [f.id, f]));
  const exercices = liens
    .sort((a, b) => a.ordre - b.ordre)
    .flatMap((lien) => {
      const fiche = parId.get(lien.exercice_id);
      const source = plan.find((p) => p.exercice_id === lien.exercice_id);
      if (!fiche) return [];
      return [
        versExerciceLocal({
          id: lien.id,
          exercice: fiche,
          ordre: lien.ordre,
          repos: lien.repos_secondes,
          seriesCible: source?.series ?? 3,
          repsCible: source?.reps ?? 8,
          note: lien.note,
          ctx: ctx.get(lien.exercice_id),
        }),
      ];
    });

  return { charge: { seance, exercices } };
}

// ───────────────────────── Synchronisation ─────────────────────────

export type Instantane = {
  seance: SeanceLocale;
  exercices: Array<{
    id: string;
    exercice_id: string;
    ordre: number;
    repos_secondes: number;
    note: string | null;
    series: SerieLocale[];
  }>;
  supprimees: string[];
};

/**
 * Repose l'état local en base. Idempotent par construction : tous les
 * identifiants viennent du client, donc rejouer deux fois la même
 * synchronisation ne crée rien en double.
 */
export async function synchroniserSeance(
  instantane: Instantane,
): Promise<{ erreur?: string; records?: Record<string, boolean> }> {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { seance, exercices, supprimees } = instantane;

  const { error: erreurSeance } = await supabase
    .from("seances")
    .update({ nom: seance.nom, note: seance.note, ressenti: seance.ressenti })
    .eq("id", seance.id)
    .eq("user_id", auth.user.id);
  if (erreurSeance) return { erreur: "Synchronisation impossible." };

  if (exercices.length > 0) {
    const { error } = await supabase.from("seance_exercices").upsert(
      exercices.map((e) => ({
        id: e.id,
        seance_id: seance.id,
        exercice_id: e.exercice_id,
        ordre: e.ordre,
        repos_secondes: e.repos_secondes,
        note: e.note,
      })),
    );
    if (error) return { erreur: "Synchronisation impossible." };
  }

  // Exercices retirés en cours de séance : on efface ce qui n'est plus là.
  const { data: cotes } = await supabase.from("seance_exercices").select("id").eq("seance_id", seance.id);
  const gardes = new Set(exercices.map((e) => e.id));
  const aEffacer = (cotes ?? []).map((c) => c.id).filter((id) => !gardes.has(id));
  if (aEffacer.length > 0) await supabase.from("seance_exercices").delete().in("id", aEffacer);

  if (supprimees.length > 0) await supabase.from("series").delete().in("id", supprimees);

  const lignes = exercices.flatMap((e) =>
    e.series
      .filter((s) => s.validee || s.poids !== null || s.reps !== null)
      .map((s) => ({
        id: s.id,
        seance_exercice_id: e.id,
        index_serie: s.index_serie,
        poids: s.poids,
        reps: s.reps,
        secondes: s.secondes,
        metres: s.metres,
        rpe: s.rpe,
        type: s.type,
        validee: s.validee,
      })),
  );

  if (lignes.length > 0) {
    const { error } = await supabase.from("series").upsert(lignes);
    if (error) return { erreur: "Synchronisation impossible." };
  }

  // Le serveur a le dernier mot sur ce qui est un record.
  const { data: relus } = await supabase
    .from("series")
    .select("id, est_record")
    .in("id", lignes.map((l) => l.id));

  return { records: Object.fromEntries((relus ?? []).map((s) => [s.id, s.est_record])) };
}

export async function terminerSeance(
  seanceId: string,
  ressenti: number | null,
  note: string | null,
): Promise<{ erreur?: string; id?: string }> {
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("terminer_seance", {
    p_seance_id: seanceId,
    p_ressenti: ressenti,
    p_note: note,
  });
  if (error) return { erreur: "La séance n'a pas pu être clôturée. Réessaie." };
  return { id: seanceId };
}

export async function abandonnerSeance(seanceId: string): Promise<{ erreur?: string }> {
  const supabase = await clientServeur();
  const { error } = await supabase.rpc("abandonner_seance", { p_seance_id: seanceId });
  if (error) return { erreur: "Impossible d'abandonner cette séance." };
  return {};
}

// ───────────────────── Bibliothèque en cours de séance ─────────────────────

export type FicheExercice = {
  id: string;
  nom: string;
  groupe_principal: string;
  equipement: string;
  type: TypeExercice;
  instructions: string;
};

export async function chercherExercices(recherche: string, groupe?: string): Promise<FicheExercice[]> {
  const supabase = await clientServeur();
  let requete = supabase
    .from("exercices")
    .select("id, nom, groupe_principal, equipement, type, instructions")
    .order("nom")
    .limit(60);
  if (recherche.trim()) requete = requete.ilike("nom", `%${recherche.trim()}%`);
  if (groupe) requete = requete.eq("groupe_principal", groupe);
  const { data } = await requete;
  return data ?? [];
}

/** Contexte d'un exercice ajouté en pleine séance. */
export async function preparerExercice(
  exerciceId: string,
  seanceId: string,
  ordre: number,
): Promise<{ erreur?: string; exercice?: ExerciceLocal }> {
  const supabase = await clientServeur();
  const [{ data: fiche }, ctx] = await Promise.all([
    supabase.from("exercices").select("id, nom, groupe_principal, type, instructions").eq("id", exerciceId).single(),
    contexte(await clientServeur(), [exerciceId]),
  ]);
  if (!fiche) return { erreur: "Exercice introuvable." };

  const { data: lien, error } = await supabase
    .from("seance_exercices")
    .insert({ seance_id: seanceId, exercice_id: exerciceId, ordre, repos_secondes: 90 })
    .select("id")
    .single();
  if (error || !lien) return { erreur: "L'exercice n'a pas pu être ajouté." };

  return {
    exercice: versExerciceLocal({
      id: lien.id,
      exercice: fiche,
      ordre,
      repos: 90,
      seriesCible: 3,
      repsCible: 8,
      note: null,
      ctx: ctx.get(exerciceId),
    }),
  };
}

// ───────────────────────────── Bilan ─────────────────────────────

export type Comparaison = {
  /** Séance précédente portant le même nom, s'il y en a une. */
  precedente: { id: string; demarree_a: string; volume_total: number; duree_secondes: number | null } | null;
};

export async function comparaisonSeance(seanceId: string, nom: string): Promise<Comparaison> {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { precedente: null };

  const { data } = await supabase
    .from("seances")
    .select("id, demarree_a, volume_total, duree_secondes")
    .eq("user_id", auth.user.id)
    .eq("statut", "terminee")
    .eq("nom", nom)
    .neq("id", seanceId)
    .order("demarree_a", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { precedente: data ?? null };
}
