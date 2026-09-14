"use client";

import { LIBELLE_TYPE_SERIE, type TypeSerie, type Unite } from "@/lib/types";
import { charge, nombre } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SerieLocale } from "@/stores/seance";

const MARQUE_TYPE: Partial<Record<TypeSerie, string>> = {
  echauffement: "ÉCH",
  degressive: "DÉG",
  echec: "ÉCHEC",
};

/** Une série validée : verrouillée, relisible d'un coup d'œil, corrigeable. */
export function LigneSerie({
  serie,
  unite,
  onModifier,
  onSupprimer,
}: {
  serie: SerieLocale;
  unite: Unite;
  onModifier: () => void;
  onSupprimer: () => void;
}) {
  const marque = MARQUE_TYPE[serie.type];
  return (
    <li className="flex items-center gap-3 border-b border-trait py-2.5 last:border-0">
      <span
        aria-hidden="true"
        className={cn(
          "chiffre flex h-7 w-7 shrink-0 items-center justify-center rounded-pastille text-mention",
          serie.est_record ? "bg-signal text-white" : "bg-surface-creuse text-texte-doux",
        )}
      >
        {serie.index_serie}
      </span>

      <span className="chiffre min-w-0 flex-1 text-ui text-texte">
        {serie.secondes !== null
          ? `${nombre(serie.secondes)} s`
          : serie.metres !== null
            ? `${nombre(serie.metres)} m`
            : `${charge(serie.poids, unite)} × ${nombre(serie.reps)}`}
      </span>

      {marque && <span className="etiquette shrink-0">{marque}</span>}
      {serie.rpe !== null && <span className="shrink-0 text-mention text-texte-tenu">RPE {serie.rpe}</span>}
      {serie.est_record && <span className="shrink-0 text-mention font-bold text-signal-texte">Record</span>}

      <button
        type="button"
        onClick={onModifier}
        aria-label={`Modifier la série ${serie.index_serie} : ${charge(serie.poids, unite)} fois ${nombre(serie.reps)}`}
        className="min-h-11 shrink-0 rounded-pastille px-3 text-mention font-medium text-accent-fort hover:bg-accent-voile"
      >
        Modifier
      </button>
      <button
        type="button"
        onClick={onSupprimer}
        aria-label={`Supprimer la série ${serie.index_serie}`}
        className="min-h-11 shrink-0 rounded-pastille px-3 text-mention font-medium text-texte-doux hover:bg-surface-creuse"
      >
        Retirer
      </button>
    </li>
  );
}

export { LIBELLE_TYPE_SERIE };
