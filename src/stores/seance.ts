"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TypeExercice, TypeSerie } from "@/lib/types";
import type { RecordConnu, RecordTombe } from "@/lib/calculs";
import { detecterRecords, tonnage } from "@/lib/calculs";

/**
 * État de la séance en cours.
 *
 * Tout vit ici et rien d'autre : on peut fermer l'onglet, recevoir un appel,
 * perdre le réseau, revenir vingt minutes plus tard — la séance et le chrono
 * sont intacts. Le serveur n'est qu'une destination de synchronisation.
 *
 * Les identifiants sont générés côté client (`crypto.randomUUID`) pour qu'une
 * séance entière puisse naître et vivre hors-ligne, puis se poser telle quelle
 * en base sans renumérotation.
 */

export type SerieLocale = {
  id: string;
  index_serie: number;
  poids: number | null;
  reps: number | null;
  secondes: number | null;
  metres: number | null;
  rpe: number | null;
  type: TypeSerie;
  validee: boolean;
  est_record: boolean;
  /** Records détectés localement au moment de la validation. */
  records: RecordTombe[];
};

export type ExerciceLocal = {
  id: string;
  exercice_id: string;
  nom: string;
  groupe: string;
  typeExercice: TypeExercice;
  instructions: string;
  ordre: number;
  repos_secondes: number;
  note: string | null;
  seriesCible: number;
  repsCible: number;
  series: SerieLocale[];
  derniereFois: { poids: number | null; reps: number | null; date: string } | null;
  recordsConnus: RecordConnu[];
};

export type SeanceLocale = {
  id: string;
  nom: string;
  modele_id: string | null;
  demarree_a: string;
  note: string | null;
  ressenti: number | null;
};

export type Repos = {
  /** Horodatage de fin, en millisecondes. Permet de survivre à un rechargement. */
  finA: number;
  duree: number;
  exerciceId: string;
};

type Etat = {
  seance: SeanceLocale | null;
  exercices: ExerciceLocal[];
  indexActif: number;
  repos: Repos | null;
  /** Séries supprimées localement, à effacer côté serveur à la prochaine synchro. */
  supprimees: string[];
  /** Dernier instant où l'état local a été poussé au serveur sans erreur. */
  synchroniseeA: number | null;
  /** Marque que l'état local a changé depuis la dernière synchro réussie. */
  sale: boolean;
};

type Actions = {
  demarrer: (seance: SeanceLocale, exercices: ExerciceLocal[]) => void;
  reprendre: (etat: { seance: SeanceLocale; exercices: ExerciceLocal[] }) => void;
  choisirExercice: (index: number) => void;
  ajouterExercice: (exercice: ExerciceLocal) => void;
  retirerExercice: (id: string) => void;
  deplacerExercice: (id: string, sens: -1 | 1) => void;
  noterExercice: (id: string, note: string) => void;
  reglerRepos: (id: string, secondes: number) => void;

  majBrouillon: (exerciceId: string, champs: Partial<Pick<SerieLocale, "poids" | "reps" | "secondes" | "metres">>) => void;
  validerSerie: (exerciceId: string) => RecordTombe[];
  devaliderSerie: (exerciceId: string, serieId: string) => void;
  majSerie: (exerciceId: string, serieId: string, champs: Partial<SerieLocale>) => void;
  supprimerSerie: (exerciceId: string, serieId: string) => void;
  ajouterSerie: (exerciceId: string) => void;

  demarrerRepos: (exerciceId: string, secondes: number) => void;
  ajusterRepos: (delta: number) => void;
  arreterRepos: () => void;

  noterSeance: (note: string) => void;
  ressentir: (valeur: number) => void;

  marquerSynchronisee: (estampille: number) => void;
  marquerSale: () => void;
  reconcilier: (records: Record<string, boolean>) => void;
  vider: () => void;
};

const VIDE: Etat = {
  seance: null,
  exercices: [],
  indexActif: 0,
  repos: null,
  supprimees: [],
  synchroniseeA: null,
  sale: false,
};

function identifiant(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Repli pour les contextes sans crypto.randomUUID (vieux Safari en http).
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random().toString(16).slice(2, 6)}`;
}

/** Brouillon : la série en cours de saisie, non encore validée. */
function brouillonDe(exercice: ExerciceLocal): SerieLocale | undefined {
  return exercice.series.find((s) => !s.validee);
}

/** Prépare la prochaine série : reprend la charge de la précédente. */
function nouvelleSerie(exercice: ExerciceLocal): SerieLocale {
  const validees = exercice.series.filter((s) => s.validee);
  const derniere = validees[validees.length - 1];
  const modele = derniere ?? exercice.derniereFois;
  return {
    id: identifiant(),
    index_serie: exercice.series.length + 1,
    poids: modele?.poids ?? null,
    reps: modele?.reps ?? exercice.repsCible,
    secondes: null,
    metres: null,
    rpe: null,
    type: "normale",
    validee: false,
    est_record: false,
    records: [],
  };
}

export const useSeance = create<Etat & Actions>()(
  persist(
    (set, get) => ({
      ...VIDE,

      demarrer: (seance, exercices) =>
        set({
          ...VIDE,
          seance,
          exercices: exercices.map((e) => ({ ...e, series: e.series.length ? e.series : [nouvelleSerie(e)] })),
          sale: true,
        }),

      reprendre: ({ seance, exercices }) => set({ ...VIDE, seance, exercices, sale: false, synchroniseeA: Date.now() }),

      choisirExercice: (index) =>
        set((etat) => ({ indexActif: Math.max(0, Math.min(etat.exercices.length - 1, index)) })),

      ajouterExercice: (exercice) =>
        set((etat) => ({
          exercices: [
            ...etat.exercices,
            { ...exercice, ordre: etat.exercices.length, series: [nouvelleSerie(exercice)] },
          ],
          indexActif: etat.exercices.length,
          sale: true,
        })),

      retirerExercice: (id) =>
        set((etat) => {
          const restants = etat.exercices.filter((e) => e.id !== id).map((e, i) => ({ ...e, ordre: i }));
          const retire = etat.exercices.find((e) => e.id === id);
          return {
            exercices: restants,
            indexActif: Math.max(0, Math.min(restants.length - 1, etat.indexActif)),
            supprimees: [...etat.supprimees, ...(retire?.series.map((s) => s.id) ?? [])],
            sale: true,
          };
        }),

      deplacerExercice: (id, sens) =>
        set((etat) => {
          const i = etat.exercices.findIndex((e) => e.id === id);
          const j = i + sens;
          if (i < 0 || j < 0 || j >= etat.exercices.length) return etat;
          const copie = [...etat.exercices];
          const a = copie[i]!;
          const b = copie[j]!;
          copie[i] = b;
          copie[j] = a;
          return { exercices: copie.map((e, k) => ({ ...e, ordre: k })), indexActif: j, sale: true };
        }),

      noterExercice: (id, note) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) => (e.id === id ? { ...e, note: note || null } : e)),
          sale: true,
        })),

      reglerRepos: (id, secondes) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) =>
            e.id === id ? { ...e, repos_secondes: Math.max(0, Math.min(900, secondes)) } : e,
          ),
          sale: true,
        })),

      majBrouillon: (exerciceId, champs) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) => {
            if (e.id !== exerciceId) return e;
            const brouillon = brouillonDe(e);
            if (!brouillon) return e;
            return {
              ...e,
              series: e.series.map((s) => (s.id === brouillon.id ? { ...s, ...champs } : s)),
            };
          }),
          sale: true,
        })),

      validerSerie: (exerciceId) => {
        const etat = get();
        const exercice = etat.exercices.find((e) => e.id === exerciceId);
        if (!exercice) return [];
        const brouillon = brouillonDe(exercice);
        if (!brouillon) return [];

        const tombes = detecterRecords(brouillon, exercice.recordsConnus);

        set({
          exercices: etat.exercices.map((e) => {
            if (e.id !== exerciceId) return e;
            const validee: SerieLocale = {
              ...brouillon,
              validee: true,
              est_record: tombes.length > 0,
              records: tombes,
            };
            const misAJour = { ...e, series: e.series.map((s) => (s.id === brouillon.id ? validee : s)) };
            // Les records connus intègrent tout de suite ce qui vient de tomber :
            // sans ça, la série suivante rebattrait le même record.
            const recordsConnus = e.recordsConnus.filter((r) => !tombes.some((t) => t.type === r.type));
            return {
              ...misAJour,
              recordsConnus: [
                ...recordsConnus,
                ...tombes.map((t) => ({ type: t.type, valeur: t.valeur, poids: t.poids })),
              ],
              series: [...misAJour.series, nouvelleSerie(misAJour)],
            };
          }),
          sale: true,
        });
        return tombes;
      },

      devaliderSerie: (exerciceId, serieId) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) =>
            e.id === exerciceId
              ? { ...e, series: e.series.map((s) => (s.id === serieId ? { ...s, validee: false } : s)) }
              : e,
          ),
          sale: true,
        })),

      majSerie: (exerciceId, serieId, champs) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) =>
            e.id === exerciceId
              ? { ...e, series: e.series.map((s) => (s.id === serieId ? { ...s, ...champs } : s)) }
              : e,
          ),
          sale: true,
        })),

      supprimerSerie: (exerciceId, serieId) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) => {
            if (e.id !== exerciceId) return e;
            const restantes = e.series
              .filter((s) => s.id !== serieId)
              .map((s, i) => ({ ...s, index_serie: i + 1 }));
            return { ...e, series: restantes.length ? restantes : [nouvelleSerie({ ...e, series: [] })] };
          }),
          supprimees: [...etat.supprimees, serieId],
          sale: true,
        })),

      ajouterSerie: (exerciceId) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) =>
            e.id === exerciceId && e.series.every((s) => s.validee)
              ? { ...e, series: [...e.series, nouvelleSerie(e)] }
              : e,
          ),
          sale: true,
        })),

      demarrerRepos: (exerciceId, secondes) =>
        set({ repos: { finA: Date.now() + secondes * 1000, duree: secondes, exerciceId } }),

      ajusterRepos: (delta) =>
        set((etat) =>
          etat.repos
            ? {
                repos: {
                  ...etat.repos,
                  finA: Math.max(Date.now(), etat.repos.finA + delta * 1000),
                  duree: Math.max(5, etat.repos.duree + delta),
                },
              }
            : etat,
        ),

      arreterRepos: () => set({ repos: null }),

      noterSeance: (note) =>
        set((etat) => (etat.seance ? { seance: { ...etat.seance, note: note || null }, sale: true } : etat)),

      ressentir: (valeur) =>
        set((etat) => (etat.seance ? { seance: { ...etat.seance, ressenti: valeur }, sale: true } : etat)),

      marquerSynchronisee: (estampille) => set({ synchroniseeA: estampille, sale: false, supprimees: [] }),
      marquerSale: () => set({ sale: true }),

      /** Le serveur a le dernier mot sur ce qui est un record. */
      reconcilier: (records) =>
        set((etat) => ({
          exercices: etat.exercices.map((e) => ({
            ...e,
            series: e.series.map((s) =>
              s.id in records ? { ...s, est_record: records[s.id] ?? s.est_record } : s,
            ),
          })),
        })),

      vider: () => set({ ...VIDE }),
    }),
    {
      name: "fonte:seance",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // `indexActif` et `repos` font partie de l'état repris : revenir vingt
      // minutes plus tard doit retomber sur le bon exercice, timer compris.
    },
  ),
);

// ───────────────────────── Sélecteurs ─────────────────────────

export function exerciceActif(etat: Etat): ExerciceLocal | undefined {
  return etat.exercices[etat.indexActif];
}

export function serieEnCours(exercice: ExerciceLocal | undefined): SerieLocale | undefined {
  return exercice ? brouillonDe(exercice) : undefined;
}

export function tonnageSeance(etat: Etat): number {
  return tonnage(etat.exercices.flatMap((e) => e.series.filter((s) => s.validee)));
}

export function nombreSeriesValidees(etat: Etat): number {
  return etat.exercices.reduce((t, e) => t + e.series.filter((s) => s.validee).length, 0);
}

export function completionExercice(exercice: ExerciceLocal): number {
  const faites = exercice.series.filter((s) => s.validee).length;
  const cible = Math.max(exercice.seriesCible, faites);
  return cible === 0 ? 0 : Math.min(1, faites / cible);
}

export function nouvelleSerieVierge(exercice: ExerciceLocal): SerieLocale {
  return nouvelleSerie(exercice);
}

export { identifiant };
