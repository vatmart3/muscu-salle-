"use client";

import type { EtatPersistance } from "@/hooks/usePersistance";
import { cn } from "@/lib/cn";

const LIBELLES: Record<EtatPersistance, string> = {
  "a-jour": "Enregistré sur ce téléphone",
  "en-cours": "Enregistrement…",
  refuse: "Ce navigateur refuse le stockage",
};

/**
 * État d'enregistrement, discret par conception : un point et un mot.
 * Il ne prend de la place que quand quelque chose ne va pas.
 */
export function IndicateurSynchro({ etat, onForcer }: { etat: EtatPersistance; onForcer?: () => void }) {
  const inquiet = etat === "refuse";
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
          etat === "en-cours" && "bg-accent",
          inquiet && "bg-inverse-texte",
        )}
      />
      {LIBELLES[etat]}
    </button>
  );
}
