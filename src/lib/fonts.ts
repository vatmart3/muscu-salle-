import localFont from "next/font/local";

/**
 * Deux familles, chargées en local (aucune requête vers un CDN de polices).
 *
 * — Affichage : Archivo, instanciée en largeur Expanded (wdth 125) et
 *   sous-ensemblée au latin. C'est la fonte des chiffres : charges, reps,
 *   tonnages. Graisse variable 100→900.
 * — Interface : Hanken Grotesk variable, même traitement.
 *
 * Voir DECISIONS.md (2026-09-14) pour la substitution de Satoshi.
 */

export const policeAffichage = localFont({
  src: [{ path: "../fonts/ArchivoExpanded-Variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--police-affichage",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});

export const policeUi = localFont({
  src: [{ path: "../fonts/HankenGrotesk-Variable.woff2", weight: "100 900", style: "normal" }],
  variable: "--police-ui",
  display: "swap",
  preload: true,
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
  adjustFontFallback: false,
});
