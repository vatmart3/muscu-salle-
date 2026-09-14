import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TonAnneau = "accent" | "signal" | "encre";

type Props = {
  /** Part remplie, de 0 à 1. Au-delà de 1, l'anneau reste plein. */
  valeur: number;
  /** Diamètre en pixels. */
  taille?: number;
  /** Épaisseur du trait, en unités du viewBox (100 = diamètre). */
  epaisseur?: number;
  ton?: TonAnneau;
  /** « vider » inverse la lecture : utilisé par le timer de repos. */
  sens?: "remplir" | "vider";
  /** Masque le rail de fond (utile pour empiler plusieurs anneaux). */
  sansRail?: boolean;
  /** Décalage angulaire de départ, en degrés. 0 = midi. */
  depart?: number;
  /** Fraction du cercle couverte (1 = tour complet, .75 = arc ouvert en bas). */
  arc?: number;
  children?: ReactNode;
  className?: string;
  /** Étiquette lue par les lecteurs d'écran. Sans elle, l'anneau est décoratif. */
  etiquette?: string;
};

/**
 * L'anneau est l'unique vocabulaire de forme de FONTE : objectif hebdomadaire,
 * volume par groupe, timer de repos, complétion d'exercice, compteur de séries.
 * Un seul objet graphique, cinq usages.
 *
 * Pas de `"use client"` : l'arc s'anime par transition CSS sur `stroke-dashoffset`,
 * ce qui fonctionne aussi bien en composant serveur qu'après un changement d'état.
 */
export function Anneau({
  valeur,
  taille = 220,
  epaisseur = 9,
  ton = "accent",
  sens = "remplir",
  sansRail = false,
  depart = 0,
  arc = 1,
  children,
  className,
  etiquette,
}: Props) {
  const part = Math.min(1, Math.max(0, Number.isFinite(valeur) ? valeur : 0));
  const rempli = sens === "vider" ? 1 - part : part;
  const rayon = (100 - epaisseur) / 2;
  const perimetre = 2 * Math.PI * rayon;
  const longueurArc = perimetre * arc;
  const offset = longueurArc * (1 - rempli);

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: taille, height: taille }}
      role={etiquette ? "img" : undefined}
      aria-label={etiquette}
      aria-hidden={etiquette ? undefined : true}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        style={{ transform: `rotate(${-90 + depart}deg)` }}
        focusable="false"
      >
        {!sansRail && (
          <circle
            cx="50"
            cy="50"
            r={rayon}
            fill="none"
            stroke="var(--color-surface)"
            strokeWidth={epaisseur}
            strokeLinecap="round"
            strokeDasharray={`${longueurArc} ${perimetre}`}
          />
        )}
        <circle
          cx="50"
          cy="50"
          r={rayon}
          fill="none"
          stroke={`url(#anneau-${ton})`}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={`${longueurArc} ${perimetre}`}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset var(--duree-ample) var(--courbe-disque), stroke .2s linear",
          }}
        />
      </svg>
      {children != null && (
        <div
          className="relative z-10 flex flex-col items-center justify-center text-center leading-none"
          style={{ maxWidth: taille * 0.74 }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Rangée d'anneaux : un anneau par exercice, il se remplit à mesure que les
 * séries sont validées. Sert de navigation dans l'écran de séance.
 */
export function RangeeAnneaux({
  items,
  actif,
  onSelection,
  className,
}: {
  items: ReadonlyArray<{ id: string; nom: string; part: number; record?: boolean }>;
  actif: number;
  onSelection?: (index: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto", className)} role="tablist" aria-label="Exercices de la séance">
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={i === actif}
          aria-label={`${item.nom}, ${Math.round(item.part * 100)} % fait`}
          onClick={onSelection ? () => onSelection(i) : undefined}
          className={cn(
            "relative shrink-0 rounded-pastille p-1 transition-transform duration-150",
            i === actif ? "scale-110" : "opacity-60",
          )}
        >
          <Anneau valeur={item.part} taille={26} epaisseur={16} ton={item.record ? "signal" : "accent"} />
          {i === actif && (
            <span className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-pastille bg-accent" />
          )}
        </button>
      ))}
    </div>
  );
}
