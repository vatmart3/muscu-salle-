"use client";

import { MODELES, dosage, seancesRetenues } from "@/lib/programmes";
import { depot, identifiant } from "./depot";
import type { ModeleEnregistre } from "./modeles";
import type { Niveau, Objectif } from "@/lib/types";

/**
 * Construit un programme à partir d'un modèle et du matériel déclaré.
 *
 * Chaque emplacement liste des candidats par ordre de préférence ; on retient
 * le premier exercice que le matériel permet réellement. La logique est celle
 * de `lib/programmes.ts`, inchangée depuis la version serveur — seule
 * l'écriture a changé de destination.
 */
export async function creerProgramme(
  cleModele: string,
  profil: { materiel_dispo: readonly string[]; objectif: Objectif | null; niveau: Niveau | null; jours_par_semaine: number },
): Promise<{ erreur?: string; crees?: number }> {
  const modele = MODELES.find((m) => m.cle === cleModele);
  if (!modele) return { erreur: "Ce programme n'existe pas." };

  const exercices = await depot().exercices();
  const parId = new Map(exercices.map((e) => [e.id, e]));
  const materiel = new Set([...profil.materiel_dispo, "poids_du_corps"]);
  const objectif = profil.objectif ?? "masse";
  const niveau = profil.niveau ?? "debutant";

  const existants = await depot().modeles();
  let ordre = existants.length;
  let crees = 0;

  for (const bloc of seancesRetenues(modele, profil.jours_par_semaine)) {
    const choisis: Array<{ id: string; role: (typeof bloc.emplacements)[number]["role"] }> = [];
    const dejaPris = new Set<string>();

    for (const emplacement of bloc.emplacements) {
      const trouve = emplacement.candidats
        .map((slug) => parId.get(slug))
        .find((e) => e && materiel.has(e.equipement) && !dejaPris.has(e.id));
      if (trouve) {
        dejaPris.add(trouve.id);
        choisis.push({ id: trouve.id, role: emplacement.role });
      }
    }
    if (choisis.length === 0) continue;

    const enregistre: ModeleEnregistre = {
      id: identifiant(),
      nom: bloc.nom,
      description: modele.resume,
      couleur: "accent",
      ordre: ordre++,
      exercices: choisis.map((choix, i) => {
        const { series, reps, repos } = dosage(objectif, niveau, choix.role);
        return {
          id: identifiant(),
          exercice_id: choix.id,
          ordre: i,
          series_cible: series,
          reps_cible: reps,
          repos_secondes: repos,
          notes: null,
        };
      }),
    };
    await depot().enregistrerModele(enregistre);
    crees += 1;
  }

  return { crees };
}


// ─────────────────── Édition des programmes ───────────────────

/**
 * Ces fonctions remplacent les Server Actions de la version serveur. Elles
 * gardent la même granularité — une intention, une fonction — pour que le
 * jour où l'on rebranche une base, seule l'implémentation change.
 */

export async function creerModele(nom: string): Promise<{ erreur?: string; id?: string }> {
  const propre = nom.trim();
  if (!propre) return { erreur: "Il faut un nom." };
  if (propre.length > 60) return { erreur: "60 caractères maximum." };

  const existants = await depot().modeles();
  const modele: ModeleEnregistre = {
    id: identifiant(),
    nom: propre,
    description: null,
    couleur: "accent",
    ordre: existants.length,
    exercices: [],
  };
  await depot().enregistrerModele(modele);
  return { id: modele.id };
}

export async function majModele(
  id: string,
  champs: { nom?: string; description?: string },
): Promise<{ erreur?: string }> {
  const modele = await depot().modele(id);
  if (!modele) return { erreur: "Programme introuvable." };
  if (champs.nom !== undefined && !champs.nom.trim()) return { erreur: "Il faut un nom." };

  await depot().enregistrerModele({
    ...modele,
    ...(champs.nom !== undefined ? { nom: champs.nom.trim().slice(0, 60) } : {}),
    ...(champs.description !== undefined ? { description: champs.description.trim() || null } : {}),
  });
  return {};
}

export async function supprimerModele(id: string): Promise<{ erreur?: string }> {
  await depot().supprimerModele(id);
  return {};
}

export async function dupliquerModele(id: string): Promise<{ erreur?: string; id?: string }> {
  const source = await depot().modele(id);
  if (!source) return { erreur: "Programme introuvable." };
  const existants = await depot().modeles();
  const copie: ModeleEnregistre = {
    ...source,
    id: identifiant(),
    nom: `${source.nom} (copie)`.slice(0, 60),
    ordre: existants.length,
    exercices: source.exercices.map((e) => ({ ...e, id: identifiant() })),
  };
  await depot().enregistrerModele(copie);
  return { id: copie.id };
}

export async function reordonnerModeles(ids: readonly string[]): Promise<{ erreur?: string }> {
  for (const [ordre, id] of ids.entries()) {
    const modele = await depot().modele(id);
    if (modele) await depot().enregistrerModele({ ...modele, ordre });
  }
  return {};
}

export async function ajouterAuModele(modeleId: string, exerciceId: string): Promise<{ erreur?: string }> {
  const modele = await depot().modele(modeleId);
  if (!modele) return { erreur: "Programme introuvable." };
  await depot().enregistrerModele({
    ...modele,
    exercices: [
      ...modele.exercices,
      {
        id: identifiant(),
        exercice_id: exerciceId,
        ordre: modele.exercices.length,
        series_cible: 3,
        reps_cible: 8,
        repos_secondes: 90,
        notes: null,
      },
    ],
  });
  return {};
}

export async function majLigneModele(
  modeleId: string,
  ligneId: string,
  champs: { series_cible?: number; reps_cible?: number; repos_secondes?: number; notes?: string | null },
): Promise<{ erreur?: string }> {
  const modele = await depot().modele(modeleId);
  if (!modele) return { erreur: "Programme introuvable." };
  const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));
  await depot().enregistrerModele({
    ...modele,
    exercices: modele.exercices.map((e) =>
      e.id !== ligneId
        ? e
        : {
            ...e,
            ...(champs.series_cible !== undefined ? { series_cible: borne(champs.series_cible, 1, 20) } : {}),
            ...(champs.reps_cible !== undefined ? { reps_cible: borne(champs.reps_cible, 1, 200) } : {}),
            ...(champs.repos_secondes !== undefined ? { repos_secondes: borne(champs.repos_secondes, 0, 900) } : {}),
            ...(champs.notes !== undefined ? { notes: champs.notes || null } : {}),
          },
    ),
  });
  return {};
}

export async function retirerDuModele(modeleId: string, ligneId: string): Promise<{ erreur?: string }> {
  const modele = await depot().modele(modeleId);
  if (!modele) return { erreur: "Programme introuvable." };
  await depot().enregistrerModele({
    ...modele,
    exercices: modele.exercices.filter((e) => e.id !== ligneId).map((e, ordre) => ({ ...e, ordre })),
  });
  return {};
}

export async function reordonnerLignesModele(
  modeleId: string,
  ids: readonly string[],
): Promise<{ erreur?: string }> {
  const modele = await depot().modele(modeleId);
  if (!modele) return { erreur: "Programme introuvable." };
  const parId = new Map(modele.exercices.map((e) => [e.id, e]));
  await depot().enregistrerModele({
    ...modele,
    exercices: ids.flatMap((id, ordre) => {
      const ligne = parId.get(id);
      return ligne ? [{ ...ligne, ordre }] : [];
    }),
  });
  return {};
}
