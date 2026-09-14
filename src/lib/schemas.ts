import { z } from "zod";
import { GROUPES, MATERIEL } from "./types";

export const prenom = z
  .string()
  .trim()
  .min(1, "Il faut un prénom.")
  .max(40, "40 caractères maximum.");

/**
 * Schémas de validation.
 *
 * Ils servaient à valider des deux côtés d'un réseau ; depuis le passage au
 * stockage local il n'y a plus qu'un côté, mais ils restent le seul endroit qui
 * dit ce qu'est une valeur acceptable — et les messages restent écrits pour
 * être lus par quelqu'un : ils disent quoi corriger, pas ce qui est invalide.
 */

// ───────────────────────────── Onboarding ─────────────────────────────

const clesMateriel = MATERIEL.map((m) => m.cle) as [string, ...string[]];

export const schemaOnboarding = z.object({
  prenom,
  sexe: z.enum(["homme", "femme", "non_precise"]),
  date_naissance: z
    .string()
    .refine((v) => {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return false;
      const ans = (Date.now() - d.getTime()) / 31_557_600_000;
      return ans >= 13 && ans <= 100;
    }, "Cette date de naissance ne tient pas debout."),
  taille_cm: z.coerce.number().int().min(120, "Au moins 120 cm.").max(230, "Au plus 230 cm."),
  poids_kg: z.coerce.number().min(30, "Au moins 30 kg.").max(300, "Au plus 300 kg."),
  objectif: z.enum(["masse", "seche", "force", "endurance", "hyrox"]),
  niveau: z.enum(["debutant", "intermediaire", "avance"]),
  jours_par_semaine: z.coerce.number().int().min(1, "Au moins une séance.").max(7, "Sept jours maximum."),
  materiel_dispo: z.array(z.enum(clesMateriel)).min(1, "Coche au moins un équipement."),
  blessures: z.string().trim().max(1000, "1000 caractères maximum.").optional().or(z.literal("")),
  unite: z.enum(["kg", "lb"]),
});
export type DonneesOnboarding = z.infer<typeof schemaOnboarding>;

// ───────────────────────────── Séance ─────────────────────────────

export const schemaSerie = z.object({
  poids: z.coerce.number().min(0, "Une charge ne peut pas être négative.").max(1000, "1000 kg maximum.").nullable(),
  reps: z.coerce.number().int().min(0).max(500, "500 répétitions maximum.").nullable(),
  secondes: z.coerce.number().int().min(0).max(36_000).nullable().optional(),
  metres: z.coerce.number().min(0).max(100_000).nullable().optional(),
  rpe: z.coerce.number().int().min(1).max(10).nullable().optional(),
  type: z.enum(["normale", "echauffement", "degressive", "echec"]),
});

export const schemaBilanSeance = z.object({
  ressenti: z.coerce.number().int().min(1).max(5).nullable(),
  note: z.string().trim().max(1000, "1000 caractères maximum.").optional().or(z.literal("")),
});

// ───────────────────────────── Corps ─────────────────────────────

const mensuration = (min: number, max: number, quoi: string) =>
  z.coerce.number().min(min, `${quoi} : au moins ${min} cm.`).max(max, `${quoi} : au plus ${max} cm.`).nullable().optional();

export const schemaMesure = z.object({
  date: z.string().min(1, "Il faut une date."),
  poids_kg: z.coerce.number().min(20, "Au moins 20 kg.").max(400, "Au plus 400 kg.").nullable().optional(),
  masse_grasse: z.coerce.number().min(1).max(70, "Au plus 70 %.").nullable().optional(),
  tour_bras: mensuration(10, 100, "Bras"),
  tour_poitrine: mensuration(40, 200, "Poitrine"),
  tour_taille: mensuration(30, 200, "Taille"),
  tour_cuisse: mensuration(20, 130, "Cuisse"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});
export type DonneesMesure = z.infer<typeof schemaMesure>;

// ───────────────────────────── Programmes ─────────────────────────────

export const schemaModele = z.object({
  nom: z.string().trim().min(1, "Il faut un nom.").max(60, "60 caractères maximum."),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  exercices: z
    .array(
      z.object({
        exercice_id: z.string().uuid(),
        series_cible: z.coerce.number().int().min(1).max(20),
        reps_cible: z.coerce.number().int().min(1).max(200),
        repos_secondes: z.coerce.number().int().min(0).max(900),
        notes: z.string().trim().max(300).optional().or(z.literal("")),
      }),
    )
    .min(1, "Un programme contient au moins un exercice."),
});

export const schemaExercicePerso = z.object({
  nom: z.string().trim().min(2, "Au moins 2 caractères.").max(80, "80 caractères maximum."),
  groupe_principal: z.enum(GROUPES),
  groupes_secondaires: z.array(z.enum(GROUPES)).max(3, "Trois groupes secondaires maximum.").default([]),
  equipement: z.string().trim().min(1, "Il faut un équipement."),
  type: z.enum(["charge", "poids_du_corps", "temps", "distance"]),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});

export const schemaReglages = z.object({
  prenom,
  unite: z.enum(["kg", "lb"]),
  jours_par_semaine: z.coerce.number().int().min(1).max(7),
  objectif: z.enum(["masse", "seche", "force", "endurance", "hyrox"]),
  theme: z.enum(["clair", "sombre"]),
  son_timer: z.coerce.boolean(),
  vibration_timer: z.coerce.boolean(),
  classement_visible: z.coerce.boolean(),
  relance_active: z.coerce.boolean(),
});

/** Traduit une erreur Zod en dictionnaire champ → premier message. */
export function erreursDeChamp(erreur: z.ZodError): Record<string, string> {
  const sortie: Record<string, string> = {};
  for (const souci of erreur.issues) {
    const cle = souci.path.join(".") || "_";
    sortie[cle] ??= souci.message;
  }
  return sortie;
}
