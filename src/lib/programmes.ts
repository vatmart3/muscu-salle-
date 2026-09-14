import type { Niveau, Objectif } from "./types";

/**
 * Programmes proposés à la fin de l'onboarding.
 *
 * Principe : chaque emplacement d'une séance liste des **candidats** par ordre
 * de préférence. On retient le premier exercice dont l'équipement est
 * disponible chez le membre. Résultat : personne ne se retrouve avec un
 * programme qui demande une poulie qu'il n'a pas, et personne n'atterrit sur
 * un tableau de bord vide.
 */

export type Emplacement = {
  /** Slugs par ordre de préférence. Le premier disponible gagne. */
  candidats: readonly string[];
  /** Rôle de l'emplacement : règle le volume et le repos. */
  role: "lourd" | "principal" | "accessoire" | "gainage" | "cardio";
};

export type BlocSeance = {
  nom: string;
  emplacements: readonly Emplacement[];
};

export type ModeleProgramme = {
  cle: string;
  nom: string;
  resume: string;
  joursMin: number;
  joursMax: number;
  /** Objectifs pour lesquels ce format est le plus pertinent. */
  affinite: readonly Objectif[];
  seances: readonly BlocSeance[];
};

const TRACTION = ["traction-pronation", "tirage-vertical-poulie", "tirage-horizontal-barre-basse", "rowing-elastique"] as const;
const ROWING = ["rowing-barre", "rowing-haltere-un-bras", "rowing-kettlebell", "tirage-horizontal-poulie", "rowing-elastique"] as const;
const PRESSE_HORIZ = ["developpe-couche", "developpe-couche-halteres", "pompes-pieds-sureleves", "pompes"] as const;
const PRESSE_INCL = ["developpe-incline-barre", "developpe-incline-halteres", "pompes-piquees", "pompes"] as const;
const PRESSE_VERT = ["developpe-militaire", "developpe-halteres-assis", "developpe-kettlebell-un-bras", "pompes-piquees"] as const;
const SQUAT = ["squat-barre", "front-squat", "squat-gobelet", "squat-elastique", "fentes-avant", "squat-saute"] as const;
const CHARNIERE = ["souleve-de-terre", "souleve-de-terre-roumain", "souleve-de-terre-jambes-tendues", "kettlebell-swing", "good-morning-elastique"] as const;
const FENTE = ["fentes-bulgares", "fentes-marchees", "fentes-avant", "step-up-sur-banc", "pistol-squat"] as const;
const FESSIERS = ["hip-thrust", "kettlebell-swing", "pont-fessier-au-sol", "abduction-elastique"] as const;
const ISCHIOS = ["souleve-de-terre-roumain", "souleve-de-terre-jambes-tendues", "leg-curl-nordique", "good-morning-elastique"] as const;
const EPAULE_LAT = ["elevations-laterales", "elevations-laterales-elastique", "oiseau-halteres", "pompes-piquees"] as const;
const BICEPS = ["curl-barre", "curl-halteres-alterne", "curl-marteau", "curl-poulie-basse", "curl-elastique", "traction-supination"] as const;
const TRICEPS = ["barre-au-front", "extension-nuque-haltere", "extension-poulie-corde", "dips-triceps-sur-banc", "pompes-diamant"] as const;
const MOLLETS = ["mollets-debout-barre", "mollets-debout-halteres", "mollets-assis", "mollets-une-jambe"] as const;
const GAINAGE = ["gainage-planche", "hollow-hold", "dead-bug", "gainage-lateral"] as const;
const ABDOS_LOURD = ["releve-de-jambes-suspendu", "rollout-a-la-barre", "crunch-poulie-haute", "v-ups"] as const;
const CARDIO = ["rameur", "ski-erg", "corde-a-sauter", "burpee", "course-a-pied"] as const;
const PORTE = ["farmer-s-carry", "marche-gobelet", "bear-crawl"] as const;
const TRAINEAU = ["sled-push", "sandbag-lunges", "fentes-marchees", "burpee-broad-jump"] as const;
const COMPLET = ["thruster", "man-maker", "devil-press", "arrache-kettlebell", "burpee"] as const;

const e = (candidats: readonly string[], role: Emplacement["role"]): Emplacement => ({ candidats, role });

export const MODELES: readonly ModeleProgramme[] = [
  {
    cle: "full-body-3",
    nom: "Full body 3 jours",
    resume: "Trois séances qui touchent tout le corps. Le meilleur rapport progrès/temps quand on s'entraîne peu.",
    joursMin: 1,
    joursMax: 3,
    affinite: ["masse", "force", "seche", "endurance"],
    seances: [
      { nom: "Full A", emplacements: [e(SQUAT, "lourd"), e(PRESSE_HORIZ, "principal"), e(ROWING, "principal"), e(EPAULE_LAT, "accessoire"), e(GAINAGE, "gainage")] },
      { nom: "Full B", emplacements: [e(CHARNIERE, "lourd"), e(PRESSE_VERT, "principal"), e(TRACTION, "principal"), e(FENTE, "accessoire"), e(ABDOS_LOURD, "gainage")] },
      { nom: "Full C", emplacements: [e(FENTE, "lourd"), e(PRESSE_INCL, "principal"), e(ROWING, "principal"), e(BICEPS, "accessoire"), e(TRICEPS, "accessoire"), e(GAINAGE, "gainage")] },
    ],
  },
  {
    cle: "haut-bas-4",
    nom: "Haut-Bas 4 jours",
    resume: "Deux séances hautes, deux séances basses. Chaque groupe revient deux fois par semaine.",
    joursMin: 4,
    joursMax: 4,
    affinite: ["masse", "force", "seche"],
    seances: [
      { nom: "Haut A", emplacements: [e(PRESSE_HORIZ, "lourd"), e(ROWING, "principal"), e(PRESSE_VERT, "principal"), e(BICEPS, "accessoire"), e(TRICEPS, "accessoire")] },
      { nom: "Bas A", emplacements: [e(SQUAT, "lourd"), e(ISCHIOS, "principal"), e(FENTE, "accessoire"), e(MOLLETS, "accessoire"), e(GAINAGE, "gainage")] },
      { nom: "Haut B", emplacements: [e(TRACTION, "lourd"), e(PRESSE_INCL, "principal"), e(EPAULE_LAT, "accessoire"), e(TRICEPS, "accessoire"), e(BICEPS, "accessoire")] },
      { nom: "Bas B", emplacements: [e(CHARNIERE, "lourd"), e(FENTE, "principal"), e(FESSIERS, "accessoire"), e(MOLLETS, "accessoire"), e(ABDOS_LOURD, "gainage")] },
    ],
  },
  {
    cle: "ppl",
    nom: "Push Pull Legs",
    resume: "Pousser, tirer, jambes. Le format qui encaisse le plus de volume quand on vient cinq ou six fois.",
    joursMin: 5,
    joursMax: 7,
    affinite: ["masse", "force", "seche"],
    seances: [
      { nom: "Push", emplacements: [e(PRESSE_HORIZ, "lourd"), e(PRESSE_VERT, "principal"), e(PRESSE_INCL, "principal"), e(EPAULE_LAT, "accessoire"), e(TRICEPS, "accessoire")] },
      { nom: "Pull", emplacements: [e(TRACTION, "lourd"), e(ROWING, "principal"), e(["face-pull-poulie", "oiseau-halteres", "rotations-externes-elastique"], "accessoire"), e(BICEPS, "accessoire"), e(["shrugs-barre", "shrugs-halteres", "suspension-a-la-barre"], "accessoire")] },
      { nom: "Legs", emplacements: [e(SQUAT, "lourd"), e(ISCHIOS, "principal"), e(FENTE, "principal"), e(FESSIERS, "accessoire"), e(MOLLETS, "accessoire"), e(GAINAGE, "gainage")] },
    ],
  },
  {
    cle: "hyrox-5",
    nom: "Hyrox 5 jours",
    resume: "Force le lundi et le jeudi, compromis au milieu, endurance le week-end. Les stations avant le chrono.",
    joursMin: 4,
    joursMax: 7,
    affinite: ["hyrox", "endurance"],
    seances: [
      { nom: "Force bas", emplacements: [e(SQUAT, "lourd"), e(CHARNIERE, "principal"), e(FENTE, "accessoire"), e(GAINAGE, "gainage")] },
      { nom: "Compromis", emplacements: [e(CARDIO, "cardio"), e(COMPLET, "principal"), e(TRAINEAU, "principal"), e(PORTE, "accessoire")] },
      { nom: "Force haut", emplacements: [e(PRESSE_VERT, "lourd"), e(TRACTION, "principal"), e(ROWING, "principal"), e(ABDOS_LOURD, "gainage")] },
      { nom: "Stations", emplacements: [e(TRAINEAU, "principal"), e(["wall-balls", "thruster", "squat-gobelet", "squat-saute"], "principal"), e(PORTE, "principal"), e(["burpee-broad-jump", "burpee", "bear-crawl"], "cardio")] },
      { nom: "Sortie longue", emplacements: [e(CARDIO, "cardio"), e(PORTE, "accessoire"), e(GAINAGE, "gainage")] },
    ],
  },
] as const;

/** Volume et repos, réglés par l'objectif et le rôle de l'emplacement. */
export function dosage(
  objectif: Objectif,
  niveau: Niveau,
  role: Emplacement["role"],
): { series: number; reps: number; repos: number } {
  const bonusVolume = niveau === "avance" ? 1 : niveau === "debutant" ? -1 : 0;
  const borne = (n: number) => Math.max(2, Math.min(6, n));

  if (role === "gainage") return { series: borne(3 + bonusVolume), reps: objectif === "force" ? 10 : 15, repos: 45 };
  if (role === "cardio") return { series: 1, reps: 1, repos: 120 };

  switch (objectif) {
    case "force":
      return role === "lourd"
        ? { series: borne(5 + bonusVolume), reps: 5, repos: 180 }
        : { series: borne(4 + bonusVolume), reps: 6, repos: 150 };
    case "masse":
      return role === "lourd"
        ? { series: borne(4 + bonusVolume), reps: 6, repos: 150 }
        : { series: borne(4 + bonusVolume), reps: 10, repos: 90 };
    case "seche":
      return { series: borne(3 + bonusVolume), reps: role === "lourd" ? 8 : 12, repos: 60 };
    case "endurance":
      return { series: borne(3 + bonusVolume), reps: role === "lourd" ? 10 : 15, repos: 60 };
    case "hyrox":
      return role === "lourd"
        ? { series: borne(4 + bonusVolume), reps: 6, repos: 120 }
        : { series: borne(3 + bonusVolume), reps: 12, repos: 60 };
  }
}

/**
 * Deux ou trois formats adaptés aux réponses, du plus pertinent au moins.
 * On ne propose jamais un format qui demande plus de jours que ce qui a été
 * annoncé : un programme qu'on ne tient pas est pire que pas de programme.
 */
export function programmesProposes(objectif: Objectif, joursParSemaine: number): ModeleProgramme[] {
  const note = (m: ModeleProgramme) => {
    let score = 0;
    if (m.affinite.includes(objectif)) score += 10;
    if (joursParSemaine >= m.joursMin && joursParSemaine <= m.joursMax) score += 8;
    // Un format trop dense pour le nombre de jours annoncé perd des points,
    // sans disparaître : il reste visible comme objectif à atteindre.
    if (joursParSemaine < m.joursMin) score -= 6 * (m.joursMin - joursParSemaine);
    if (joursParSemaine > m.joursMax) score -= 2 * (joursParSemaine - m.joursMax);
    if (objectif === "hyrox" && m.cle === "hyrox-5") score += 6;
    return score;
  };
  return [...MODELES].sort((a, b) => note(b) - note(a)).slice(0, 3);
}

/**
 * Nombre de séances du programme réellement planifiables dans la semaine.
 * Un Push Pull Legs à 5 jours tourne, il ne se répète pas à l'identique.
 */
export function seancesRetenues(modele: ModeleProgramme, joursParSemaine: number): BlocSeance[] {
  return modele.seances.slice(0, Math.max(1, Math.min(modele.seances.length, joursParSemaine)));
}
