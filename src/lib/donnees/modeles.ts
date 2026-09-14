import type {
  Angle, Groupe, Niveau, Objectif, Sexe, StatutSeance, TypeExercice, TypeRecord, TypeSerie, Unite,
} from "@/lib/types";

/**
 * Formes stockées localement.
 *
 * Différence de fond avec le schéma SQL conservé dans `supabase/` : une séance
 * est **un seul document** qui porte ses exercices et ses séries, au lieu de
 * trois tables jointes. C'est la forme sous laquelle l'écran de séance la
 * manipule déjà, et la seule façon de lire l'historique d'un an sans faire
 * trois cents allers-retours dans IndexedDB.
 */

export type ProfilLocal = {
  /** Clé fixe : il n'y a qu'un profil par navigateur. */
  id: "moi";
  prenom: string;
  sexe: Sexe;
  date_naissance: string | null;
  taille_cm: number | null;
  objectif: Objectif | null;
  niveau: Niveau | null;
  jours_par_semaine: number;
  materiel_dispo: string[];
  blessures: string | null;
  unite: Unite;
  theme: "clair" | "sombre";
  son_timer: boolean;
  vibration_timer: boolean;
  relance_active: boolean;
  onboarding_termine: boolean;
  cree_le: string;
  maj_le: string;
};

export type SerieEnregistree = {
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
  /** Types de record tombés sur cette série, pour le bilan et l'historique. */
  records: TypeRecord[];
};

export type ExerciceEnregistre = {
  id: string;
  exercice_id: string;
  nom: string;
  groupe: Groupe;
  typeExercice: TypeExercice;
  instructions: string;
  ordre: number;
  repos_secondes: number;
  note: string | null;
  seriesCible: number;
  repsCible: number;
  series: SerieEnregistree[];
};

export type SeanceEnregistree = {
  id: string;
  nom: string;
  modele_id: string | null;
  demarree_a: string;
  terminee_a: string | null;
  duree_secondes: number | null;
  volume_total: number;
  ressenti: number | null;
  note: string | null;
  statut: StatutSeance;
  exercices: ExerciceEnregistre[];
};

export type MesureEnregistree = {
  /** La date sert de clé : une mesure par jour, la dernière écrase la précédente. */
  date: string;
  poids_kg: number | null;
  masse_grasse: number | null;
  tour_bras: number | null;
  tour_poitrine: number | null;
  tour_taille: number | null;
  tour_cuisse: number | null;
  note: string | null;
};

export type PhotoEnregistree = {
  id: string;
  date: string;
  angle: Angle;
  /** Le fichier lui-même. IndexedDB stocke les Blob sans conversion. */
  fichier: Blob;
  type_mime: string;
};

export type RecordEnregistre = {
  /** `exercice_id|type` : un record courant par exercice et par type. */
  cle: string;
  exercice_id: string;
  type: TypeRecord;
  valeur: number;
  poids: number | null;
  reps: number | null;
  seance_id: string | null;
  obtenu_le: string;
};

export type ModeleExerciceEnregistre = {
  /** Identifiant de ligne : un même exercice peut figurer deux fois dans un programme. */
  id: string;
  exercice_id: string;
  ordre: number;
  series_cible: number;
  reps_cible: number;
  repos_secondes: number;
  notes: string | null;
};

export type ModeleEnregistre = {
  id: string;
  nom: string;
  description: string | null;
  couleur: string;
  ordre: number;
  exercices: ModeleExerciceEnregistre[];
};

export type ExercicePersoEnregistre = {
  id: string;
  nom: string;
  slug: string;
  groupe_principal: Groupe;
  groupes_secondaires: Groupe[];
  equipement: string;
  type: TypeExercice;
  instructions: string;
  perso: true;
};

export function cleRecord(exerciceId: string, type: TypeRecord): string {
  return `${exerciceId}|${type}`;
}

export function profilVierge(): ProfilLocal {
  const maintenant = new Date().toISOString();
  return {
    id: "moi",
    prenom: "",
    sexe: "non_precise",
    date_naissance: null,
    taille_cm: null,
    objectif: null,
    niveau: null,
    jours_par_semaine: 3,
    materiel_dispo: [],
    blessures: null,
    unite: "kg",
    theme: "clair",
    son_timer: true,
    vibration_timer: true,
    relance_active: false,
    onboarding_termine: false,
    cree_le: maintenant,
    maj_le: maintenant,
  };
}
