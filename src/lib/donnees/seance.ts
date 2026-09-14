"use client";

import { epley1rm } from "@/lib/calculs";
import { exerciceParId } from "@/lib/exercices";
import type { Groupe, TypeExercice } from "@/lib/types";
import { depot, dernierePerf, identifiant } from "./depot";
import type { ExerciceEnregistre, SeanceEnregistree } from "./modeles";
import type { ExerciceLocal, SeanceLocale } from "@/stores/seance";

/**
 * Construction et clôture d'une séance, côté navigateur.
 *
 * Ce fichier remplace les Server Actions de la version qui parlait à Supabase.
 * La différence tient en une phrase : plus rien n'exige le réseau, à aucun
 * moment. Même le démarrage — qui était la seule étape en ligne — lit
 * maintenant la bibliothèque embarquée et l'historique local.
 */

export type ChargeSeance = { seance: SeanceLocale; exercices: ExerciceLocal[] };

async function versExerciceLocal(args: {
  exerciceId: string;
  ordre: number;
  repos: number;
  seriesCible: number;
  repsCible: number;
  note: string | null;
}): Promise<ExerciceLocal | null> {
  const fiche = exerciceParId(args.exerciceId) ?? (await depot().exercices()).find((e) => e.id === args.exerciceId);
  if (!fiche) return null;

  const [perf, records] = await Promise.all([
    dernierePerf(args.exerciceId),
    depot().recordsDeLExercice(args.exerciceId),
  ]);

  return {
    id: identifiant(),
    exercice_id: fiche.id,
    nom: fiche.nom,
    groupe: fiche.groupe_principal,
    typeExercice: fiche.type,
    instructions: fiche.instructions,
    ordre: args.ordre,
    repos_secondes: args.repos,
    note: args.note,
    seriesCible: args.seriesCible,
    repsCible: args.repsCible,
    series: [],
    derniereFois: perf,
    recordsConnus: records,
  };
}

/** Séance restée ouverte, telle qu'elle est en base locale. */
export async function seanceOuverte(): Promise<ChargeSeance | null> {
  const enregistree = await depot().seanceEnCours();
  if (!enregistree) return null;
  return versCharge(enregistree);
}

async function versCharge(seance: SeanceEnregistree): Promise<ChargeSeance> {
  const exercices: ExerciceLocal[] = [];
  for (const exercice of seance.exercices) {
    const [perf, records] = await Promise.all([
      dernierePerf(exercice.exercice_id, seance.id),
      depot().recordsDeLExercice(exercice.exercice_id),
    ]);
    exercices.push({
      ...exercice,
      series: exercice.series.map((s) => ({ ...s, records: [] })),
      derniereFois: perf,
      recordsConnus: records,
    });
  }
  return {
    seance: {
      id: seance.id,
      nom: seance.nom,
      modele_id: seance.modele_id,
      demarree_a: seance.demarree_a,
      note: seance.note,
      ressenti: seance.ressenti,
    },
    exercices: exercices.sort((a, b) => a.ordre - b.ordre),
  };
}

/** Démarre une séance depuis un modèle, en répétant une séance, ou à vide. */
export async function demarrerSeance(options: {
  modeleId?: string | null;
  repeterSeanceId?: string | null;
}): Promise<{ erreur?: string; charge?: ChargeSeance }> {
  const ouverte = await seanceOuverte();
  if (ouverte) return { charge: ouverte };

  type Plan = { exercice_id: string; ordre: number; repos: number; series: number; reps: number; note: string | null };
  let plan: Plan[] = [];
  let nom = "Séance libre";

  if (options.modeleId) {
    const modele = await depot().modele(options.modeleId);
    if (!modele) return { erreur: "Ce programme n'existe plus." };
    nom = modele.nom;
    plan = [...modele.exercices]
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
    const source = await depot().seance(options.repeterSeanceId);
    if (!source) return { erreur: "Cette séance n'existe plus." };
    nom = source.nom;
    plan = source.exercices
      .sort((a, b) => a.ordre - b.ordre)
      .map((e) => {
        const validees = e.series.filter((s) => s.validee && s.type !== "echauffement");
        return {
          exercice_id: e.exercice_id,
          ordre: e.ordre,
          repos: e.repos_secondes,
          series: Math.max(1, validees.length),
          reps: validees[0]?.reps ?? 8,
          note: e.note,
        };
      });
  }

  const exercices: ExerciceLocal[] = [];
  for (const p of plan) {
    const local = await versExerciceLocal({
      exerciceId: p.exercice_id,
      ordre: p.ordre,
      repos: p.repos,
      seriesCible: p.series,
      repsCible: p.reps,
      note: p.note,
    });
    if (local) exercices.push(local);
  }

  const seance: SeanceLocale = {
    id: identifiant(),
    nom,
    modele_id: options.modeleId ?? null,
    demarree_a: new Date().toISOString(),
    note: null,
    ressenti: null,
  };

  return { charge: { seance, exercices } };
}

/** Prépare un exercice ajouté en pleine séance. */
export async function preparerExercice(exerciceId: string, ordre: number): Promise<ExerciceLocal | null> {
  return versExerciceLocal({
    exerciceId,
    ordre,
    repos: 90,
    seriesCible: 3,
    repsCible: 8,
    note: null,
  });
}

type Instantane = {
  seance: SeanceLocale;
  exercices: Array<Omit<ExerciceLocal, "derniereFois" | "recordsConnus">>;
};

/** Écrit l'état courant de la séance en base locale. Appelé en continu. */
export async function enregistrerInstantane(instantane: Instantane, statut: "en_cours" | "terminee" | "abandonnee"): Promise<void> {
  const { seance, exercices } = instantane;
  const termine = statut !== "en_cours";
  const enregistree: SeanceEnregistree = {
    id: seance.id,
    nom: seance.nom,
    modele_id: seance.modele_id,
    demarree_a: seance.demarree_a,
    terminee_a: termine ? new Date().toISOString() : null,
    duree_secondes: termine
      ? Math.max(0, Math.floor((Date.now() - new Date(seance.demarree_a).getTime()) / 1000))
      : null,
    volume_total: 0, // recalculé par le dépôt
    ressenti: seance.ressenti,
    note: seance.note,
    statut,
    exercices: exercices.map<ExerciceEnregistre>((e) => ({
      id: e.id,
      exercice_id: e.exercice_id,
      nom: e.nom,
      groupe: e.groupe as Groupe,
      typeExercice: e.typeExercice as TypeExercice,
      instructions: e.instructions,
      ordre: e.ordre,
      repos_secondes: e.repos_secondes,
      note: e.note,
      seriesCible: e.seriesCible,
      repsCible: e.repsCible,
      series: e.series
        .filter((s) => s.validee)
        .map((s) => ({
          id: s.id,
          index_serie: s.index_serie,
          poids: s.poids,
          reps: s.reps,
          secondes: s.secondes,
          metres: s.metres,
          rpe: s.rpe,
          type: s.type,
          validee: s.validee,
          est_record: s.est_record,
          records: s.records.map((r) => r.type),
        })),
    })),
  };

  await depot().enregistrerSeance(enregistree);
}

/**
 * Clôture la séance. Une séance sans aucune série validée est marquée
 * abandonnée : elle ne compte ni dans l'objectif, ni dans le tonnage.
 */
export async function terminerSeance(instantane: Instantane): Promise<{ abandonnee: boolean }> {
  const aDesSeries = instantane.exercices.some((e) => e.series.some((s) => s.validee));
  await enregistrerInstantane(instantane, aDesSeries ? "terminee" : "abandonnee");
  return { abandonnee: !aDesSeries };
}

export async function abandonnerSeance(id: string): Promise<void> {
  const seance = await depot().seance(id);
  if (!seance) return;
  await depot().enregistrerSeance({
    ...seance,
    statut: "abandonnee",
    terminee_a: seance.terminee_a ?? new Date().toISOString(),
  });
}

/** Comparaison avec la dernière séance portant le même nom. */
export async function comparaisonSeance(
  seanceId: string,
  nom: string,
): Promise<{ id: string; demarree_a: string; volume_total: number; duree_secondes: number | null } | null> {
  const seances = await depot().seances();
  return (
    seances.find((s) => s.statut === "terminee" && s.nom === nom && s.id !== seanceId) ?? null
  );
}

export { epley1rm };
