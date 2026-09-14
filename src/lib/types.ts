/** Types du domaine. Miroir exact des enums SQL de supabase/migrations. */

export type Objectif = "masse" | "seche" | "force" | "endurance" | "hyrox";
export type Niveau = "debutant" | "intermediaire" | "avance";
export type Sexe = "homme" | "femme" | "non_precise";
export type Unite = "kg" | "lb";
export type Role = "membre" | "admin";
export type TypeExercice = "charge" | "poids_du_corps" | "temps" | "distance";
export type TypeSerie = "normale" | "echauffement" | "degressive" | "echec";
export type StatutSeance = "en_cours" | "terminee" | "abandonnee";
export type TypeRecord = "charge_max" | "1rm_estime" | "volume_max" | "reps_max";
export type Angle = "face" | "profil" | "dos";

export const GROUPES = [
  "pectoraux",
  "dos",
  "epaules",
  "biceps",
  "triceps",
  "avant_bras",
  "quadriceps",
  "ischios",
  "fessiers",
  "mollets",
  "abdominaux",
  "lombaires",
  "cardio",
  "corps_entier",
] as const;
export type Groupe = (typeof GROUPES)[number];

export const LIBELLE_GROUPE: Record<Groupe, string> = {
  pectoraux: "Pectoraux",
  dos: "Dos",
  epaules: "Épaules",
  biceps: "Biceps",
  triceps: "Triceps",
  avant_bras: "Avant-bras",
  quadriceps: "Quadriceps",
  ischios: "Ischio-jambiers",
  fessiers: "Fessiers",
  mollets: "Mollets",
  abdominaux: "Abdominaux",
  lombaires: "Lombaires",
  cardio: "Cardio",
  corps_entier: "Corps entier",
};

export const LIBELLE_OBJECTIF: Record<Objectif, string> = {
  masse: "Prendre de la masse",
  seche: "Sécher",
  force: "Gagner en force",
  endurance: "Tenir plus longtemps",
  hyrox: "Préparer un Hyrox",
};

export const LIBELLE_NIVEAU: Record<Niveau, string> = {
  debutant: "Débutant",
  intermediaire: "Intermédiaire",
  avance: "Avancé",
};

export const LIBELLE_TYPE_SERIE: Record<TypeSerie, string> = {
  normale: "Normale",
  echauffement: "Échauffement",
  degressive: "Dégressive",
  echec: "À l'échec",
};

export const LIBELLE_RECORD: Record<TypeRecord, string> = {
  charge_max: "Charge max",
  "1rm_estime": "1RM estimé",
  volume_max: "Volume sur une série",
  reps_max: "Reps à charge égale",
};

/** Matériel de la salle. Sert au seed, à l'onboarding et au filtrage d'exercices. */
export const MATERIEL = [
  { cle: "barre_olympique", nom: "Barre olympique + disques" },
  { cle: "halteres", nom: "Haltères réglables" },
  { cle: "banc", nom: "Banc inclinable" },
  { cle: "rack", nom: "Rack à squat" },
  { cle: "barre_traction", nom: "Barre de traction" },
  { cle: "kettlebell", nom: "Kettlebells" },
  { cle: "elastique", nom: "Élastiques" },
  { cle: "poulie", nom: "Poulie" },
  { cle: "tapis", nom: "Tapis" },
  { cle: "corde_a_sauter", nom: "Corde à sauter" },
  { cle: "poids_du_corps", nom: "Poids du corps" },
] as const;

export type CleMateriel = (typeof MATERIEL)[number]["cle"];
