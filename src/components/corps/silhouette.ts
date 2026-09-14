import type { Groupe } from "@/lib/types";

/**
 * Silhouette géométrique, construite de formes arrondies plutôt que d'un
 * tracé anatomique : c'est le même vocabulaire de forme que le reste de
 * l'application, et ça reste lisible à 40 px de large.
 *
 * Repère : 200 × 420. Chaque groupe musculaire possède une ou plusieurs
 * formes, et c'est le remplissage qui porte l'information de volume.
 */

export type Forme =
  | { type: "cercle"; cx: number; cy: number; r: number }
  | { type: "boite"; x: number; y: number; l: number; h: number; r: number }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number };

export type Vue = "face" | "dos";

export const SILHOUETTE: Record<Vue, Array<{ groupe: Groupe | "tete"; formes: Forme[] }>> = {
  face: [
    { groupe: "tete", formes: [{ type: "cercle", cx: 100, cy: 36, r: 21 }, { type: "boite", x: 92, y: 55, l: 16, h: 14, r: 6 }] },
    {
      groupe: "epaules",
      formes: [
        { type: "ellipse", cx: 60, cy: 90, rx: 20, ry: 18 },
        { type: "ellipse", cx: 140, cy: 90, rx: 20, ry: 18 },
      ],
    },
    {
      groupe: "pectoraux",
      formes: [
        { type: "boite", x: 73, y: 76, l: 25, h: 34, r: 12 },
        { type: "boite", x: 102, y: 76, l: 25, h: 34, r: 12 },
      ],
    },
    {
      groupe: "biceps",
      formes: [
        { type: "boite", x: 44, y: 110, l: 21, h: 44, r: 10 },
        { type: "boite", x: 135, y: 110, l: 21, h: 44, r: 10 },
      ],
    },
    {
      groupe: "avant_bras",
      formes: [
        { type: "boite", x: 38, y: 157, l: 19, h: 50, r: 9 },
        { type: "boite", x: 143, y: 157, l: 19, h: 50, r: 9 },
      ],
    },
    { groupe: "abdominaux", formes: [{ type: "boite", x: 81, y: 114, l: 38, h: 56, r: 13 }] },
    {
      groupe: "quadriceps",
      formes: [
        { type: "boite", x: 70, y: 196, l: 27, h: 84, r: 13 },
        { type: "boite", x: 103, y: 196, l: 27, h: 84, r: 13 },
      ],
    },
    {
      groupe: "mollets",
      formes: [
        { type: "boite", x: 74, y: 286, l: 21, h: 66, r: 10 },
        { type: "boite", x: 105, y: 286, l: 21, h: 66, r: 10 },
      ],
    },
  ],
  dos: [
    { groupe: "tete", formes: [{ type: "cercle", cx: 100, cy: 36, r: 21 }, { type: "boite", x: 92, y: 55, l: 16, h: 14, r: 6 }] },
    {
      groupe: "epaules",
      formes: [
        { type: "ellipse", cx: 60, cy: 90, rx: 20, ry: 18 },
        { type: "ellipse", cx: 140, cy: 90, rx: 20, ry: 18 },
      ],
    },
    { groupe: "dos", formes: [{ type: "boite", x: 68, y: 74, l: 64, h: 82, r: 20 }] },
    {
      groupe: "triceps",
      formes: [
        { type: "boite", x: 44, y: 110, l: 21, h: 44, r: 10 },
        { type: "boite", x: 135, y: 110, l: 21, h: 44, r: 10 },
      ],
    },
    {
      groupe: "avant_bras",
      formes: [
        { type: "boite", x: 38, y: 157, l: 19, h: 50, r: 9 },
        { type: "boite", x: 143, y: 157, l: 19, h: 50, r: 9 },
      ],
    },
    { groupe: "lombaires", formes: [{ type: "boite", x: 80, y: 160, l: 40, h: 32, r: 12 }] },
    { groupe: "fessiers", formes: [{ type: "boite", x: 72, y: 196, l: 56, h: 38, r: 18 }] },
    {
      groupe: "ischios",
      formes: [
        { type: "boite", x: 70, y: 238, l: 27, h: 66, r: 13 },
        { type: "boite", x: 103, y: 238, l: 27, h: 66, r: 13 },
      ],
    },
    {
      groupe: "mollets",
      formes: [
        { type: "boite", x: 74, y: 308, l: 21, h: 58, r: 10 },
        { type: "boite", x: 105, y: 308, l: 21, h: 58, r: 10 },
      ],
    },
  ],
};
