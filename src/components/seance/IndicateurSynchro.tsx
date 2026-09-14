"use client";

import type { EtatSynchro } from "@/hooks/useSynchro";
import { cn } from "@/lib/cn";

const LIBELLES: Record<EtatSynchro, string> = {
  "a-jour": "Enregistré",
  "en-attente": "Enregistrement…",
  "hors-ligne": "Hors-ligne, tout est gardé",
  erreur: "Pas encore enregistré",
};

/**
 * État de synchronisation, discret par conception : un point et un mot.
 * Il ne prend de la place que quand quelque chose ne va pas.
 */
export function IndicateurSynchro({ etat, onForcer }: { etat: EtatSynchro; onForcer?: () => void }) {
  const inquiet = etat === "hors-ligne" || etat === "erreur";
  return (
    <button
      type="button"
      onClick={inquiet ? onForcer : undefined}
      disabled={!inquiet}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pastille px-2 py-1 text-mention",
        inquiet ? "bg-inverse-fond text-inverse-texte" : "text-texte-tenu",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-pastille",
          etat === "a-jour" && "bg-texte-tenu",
          etat === "en-attente" && "bg-accent",
          inquiet && "bg-inverse-texte",
        )}
      />
      {LIBELLES[etat]}
    </button>
  );
}
