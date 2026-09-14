/**
 * Identité de l'application, centralisée.
 * Changer `nom` ici renomme l'app partout : manifeste PWA, titres, e-mails.
 */
export const MARQUE = {
  nom: "FONTE",
  baseline: "Le carnet de la salle.",
  description:
    "Suivi de musculation pour les membres de la salle : séances en direct, charges, records et progression.",
  /** Code d'accès de référence, seedé en base. D'autres codes se créent depuis l'espace admin. */
  codeAccesInitial: "FONTE-2026",
  couleurTheme: "#0071E3",
  couleurFond: "#FFFFFF",
} as const;

export type Marque = typeof MARQUE;
