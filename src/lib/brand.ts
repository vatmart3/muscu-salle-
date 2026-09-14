/**
 * Identité de l'application, centralisée.
 * Changer `nom` ici renomme l'app partout : manifeste PWA, titres, e-mails.
 */
export const MARQUE = {
  nom: "FONTE",
  baseline: "Le carnet de la salle.",
  description:
    "Carnet de musculation : séances en direct, charges, records et progression. Tout reste sur ton téléphone.",
  couleurTheme: "#0071E3",
  couleurFond: "#FFFFFF",
} as const;

export type Marque = typeof MARQUE;
