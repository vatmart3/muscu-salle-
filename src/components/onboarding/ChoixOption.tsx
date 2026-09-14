"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Option d'onboarding. Pas de case à cocher, pas de menu déroulant : une cible
 * large, tapable au pouce, dont l'état retenu se lit au trait et au fond.
 */
export function ChoixOption({
  titre,
  detail,
  glyphe,
  actif,
  onClick,
  compact,
}: {
  titre: string;
  detail?: string;
  glyphe?: ReactNode;
  actif: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={cn(
        "flex w-full items-center gap-4 rounded-bloc border px-4 text-left",
        "transition-[background-color,border-color] duration-[var(--duree-breve)] ease-[var(--courbe-disque)]",
        compact ? "min-h-14 py-3" : "min-h-20 py-4",
        actif
          ? "border-accent bg-accent-voile"
          : "border-trait bg-surface hover:border-trait-fort",
      )}
    >
      {glyphe && <span className="shrink-0">{glyphe}</span>}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("font-affichage font-bold", compact ? "text-ui" : "text-bloc")}>{titre}</span>
        {detail && <span className="text-mention text-texte-doux">{detail}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "ml-auto h-3.5 w-3.5 shrink-0 rounded-pastille border-2 transition-colors duration-[var(--duree-breve)]",
          actif ? "border-accent bg-accent" : "border-trait-fort bg-transparent",
        )}
      />
    </button>
  );
}

/**
 * Glyphes d'objectif. Dessinés avec le seul vocabulaire de l'app — l'anneau —
 * plutôt qu'avec des photos ou des icônes empruntées.
 */
export function GlypheObjectif({ objectif, actif }: { objectif: string; actif: boolean }) {
  const trait = actif ? "var(--color-accent)" : "var(--color-trait-fort)";
  const rail = "var(--color-surface-creuse)";
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11" aria-hidden="true" focusable="false">
      <circle cx="22" cy="22" r="17" fill="none" stroke={rail} strokeWidth="6" />
      {objectif === "masse" && <circle cx="22" cy="22" r="17" fill="none" stroke={trait} strokeWidth="10" />}
      {objectif === "seche" && <circle cx="22" cy="22" r="17" fill="none" stroke={trait} strokeWidth="2.5" />}
      {objectif === "force" && <circle cx="22" cy="22" r="9" fill="none" stroke={trait} strokeWidth="11" />}
      {objectif === "endurance" && (
        <circle cx="22" cy="22" r="17" fill="none" stroke={trait} strokeWidth="6" strokeDasharray="5 6" strokeLinecap="round" />
      )}
      {objectif === "hyrox" && (
        <>
          <circle cx="22" cy="22" r="17" fill="none" stroke={trait} strokeWidth="4" />
          <circle cx="22" cy="22" r="8" fill="none" stroke={trait} strokeWidth="4" />
        </>
      )}
    </svg>
  );
}
