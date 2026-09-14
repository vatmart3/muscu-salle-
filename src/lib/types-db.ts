/**
 * Types de la base, écrits à la main en miroir de supabase/migrations.
 *
 * Ils ne sont pas générés par `supabase gen types` volontairement : le schéma
 * est stable et versionné ici, et une génération suppose un projet distant
 * joignable au moment du build. En contrepartie, toute migration qui touche
 * une colonne doit être reportée dans ce fichier — c'est la seule discipline
 * à tenir.
 */

import type {
  Angle, Niveau, Objectif, Role, Sexe, StatutSeance, TypeExercice, TypeRecord,
  TypeSerie, Unite,
} from "./types";

type Horodatage = string;

export type Profil = {
  id: string;
  prenom: string;
  avatar_url: string | null;
  sexe: Sexe;
  date_naissance: string | null;
  taille_cm: number | null;
  objectif: Objectif | null;
  niveau: Niveau | null;
  jours_par_semaine: number;
  materiel_dispo: string[];
  blessures: string | null;
  unite: Unite;
  role: Role;
  theme: "clair" | "sombre";
  son_timer: boolean;
  vibration_timer: boolean;
  classement_visible: boolean;
  relance_active: boolean;
  onboarding_termine: boolean;
  created_at: Horodatage;
  updated_at: Horodatage;
};

export type Exercice = {
  id: string;
  nom: string;
  slug: string;
  groupe_principal: string;
  groupes_secondaires: string[];
  equipement: string;
  type: TypeExercice;
  instructions: string;
  is_custom: boolean;
  owner_id: string | null;
  created_at: Horodatage;
};

export type SeanceModele = {
  id: string;
  owner_id: string;
  nom: string;
  description: string | null;
  couleur: string;
  ordre: number;
  code_partage: string | null;
  created_at: Horodatage;
};

export type ModeleExercice = {
  id: string;
  modele_id: string;
  exercice_id: string;
  ordre: number;
  series_cible: number;
  reps_cible: number;
  repos_secondes: number;
  notes: string | null;
};

export type Seance = {
  id: string;
  user_id: string;
  modele_id: string | null;
  nom: string;
  demarree_a: Horodatage;
  terminee_a: Horodatage | null;
  duree_secondes: number | null;
  volume_total: number;
  ressenti: number | null;
  note: string | null;
  statut: StatutSeance;
  created_at: Horodatage;
};

export type SeanceExercice = {
  id: string;
  seance_id: string;
  exercice_id: string;
  ordre: number;
  repos_secondes: number;
  note: string | null;
};

export type Serie = {
  id: string;
  seance_exercice_id: string;
  index_serie: number;
  poids: number | null;
  reps: number | null;
  secondes: number | null;
  metres: number | null;
  rpe: number | null;
  type: TypeSerie;
  validee: boolean;
  est_record: boolean;
  created_at: Horodatage;
};

export type Mesure = {
  id: string;
  user_id: string;
  date: string;
  poids_kg: number | null;
  masse_grasse: number | null;
  tour_bras: number | null;
  tour_poitrine: number | null;
  tour_taille: number | null;
  tour_cuisse: number | null;
  note: string | null;
  created_at: Horodatage;
};

export type PhotoProgres = {
  id: string;
  user_id: string;
  date: string;
  angle: Angle;
  storage_path: string;
  created_at: Horodatage;
};

export type RecordPerso = {
  id: string;
  user_id: string;
  exercice_id: string;
  type: TypeRecord;
  valeur: number;
  poids: number | null;
  reps: number | null;
  seance_id: string | null;
  obtenu_le: Horodatage;
};

export type CodeAcces = {
  code: string;
  actif: boolean;
  utilisations_max: number | null;
  utilisations: number;
  cree_par: string | null;
  created_at: Horodatage;
};

export type AbonnementPush = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: Horodatage;
};

export type LigneClassement = {
  membre_id: string;
  prenom: string;
  semaine: string;
  seances: number;
  tonnage: number;
};

/**
 * `Relationships` est exigé par postgrest-js pour reconnaître un schéma typé.
 * On ne décrit pas les jointures implicites : les requêtes imbriquées de ce
 * projet passent toutes par des noms de contrainte explicites.
 */
type Table<L, I = Partial<L>, U = Partial<L>> = {
  Row: L;
  Insert: I;
  Update: U;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profil>;
      exercices: Table<Exercice, Omit<Exercice, "id" | "created_at"> & { id?: string }>;
      seances_modeles: Table<SeanceModele, Omit<SeanceModele, "id" | "created_at" | "code_partage"> & { id?: string; code_partage?: string | null }>;
      modele_exercices: Table<ModeleExercice, Omit<ModeleExercice, "id"> & { id?: string }>;
      seances: Table<Seance, Omit<Seance, "id" | "created_at" | "volume_total" | "demarree_a"> & { id?: string; demarree_a?: string }>;
      seance_exercices: Table<SeanceExercice, Omit<SeanceExercice, "id"> & { id?: string }>;
      series: Table<Serie, Omit<Serie, "id" | "created_at" | "est_record"> & { id?: string }>;
      mesures: Table<Mesure, Omit<Mesure, "id" | "created_at"> & { id?: string }>;
      photos_progres: Table<PhotoProgres, Omit<PhotoProgres, "id" | "created_at"> & { id?: string }>;
      /** Écrits uniquement par déclencheur : rien à insérer ni à modifier depuis le client. */
      records: Table<RecordPerso, Record<string, never>, Record<string, never>>;
      codes_acces: Table<CodeAcces, Omit<CodeAcces, "utilisations" | "created_at"> & { utilisations?: number }>;
      abonnements_push: Table<AbonnementPush, Omit<AbonnementPush, "id" | "created_at"> & { id?: string }>;
    };
    Views: {
      classement: { Row: LigneClassement; Relationships: [] };
    };
    Functions: {
      epley_1rm: { Args: { p_poids: number; p_reps: number }; Returns: number };
      verifier_code_acces: { Args: { p_code: string }; Returns: boolean };
      importer_modele: { Args: { p_code: string }; Returns: string };
      terminer_seance: {
        Args: { p_seance_id: string; p_ressenti?: number | null; p_note?: string | null };
        Returns: Seance;
      };
      volume_par_groupe: {
        Args: { p_jours?: number };
        Returns: Array<{ groupe: string; volume: number; series: number }>;
      };
      derniere_perf: {
        Args: { p_exercice_id: string };
        Returns: Array<{ poids: number | null; reps: number | null; faite_le: string; seance_id: string }>;
      };
      progression_exercice: {
        Args: { p_exercice_id: string; p_limite?: number };
        Returns: Array<{ jour: string; charge_max: number; rm_estime: number; volume: number }>;
      };
      tonnage_hebdomadaire: {
        Args: { p_semaines?: number };
        Returns: Array<{ semaine: string; seances: number; tonnage: number; duree_moyenne: number }>;
      };
      generer_code_partage: { Args: Record<string, never>; Returns: string };
      est_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: {
      objectif: Objectif;
      niveau: Niveau;
      sexe: Sexe;
      unite: Unite;
      role_membre: Role;
      type_exercice: TypeExercice;
      type_serie: TypeSerie;
      statut_seance: StatutSeance;
      type_record: TypeRecord;
      angle_photo: Angle;
      theme_interface: "clair" | "sombre";
    };
    CompositeTypes: Record<string, never>;
  };
};
