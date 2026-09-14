"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { nombre } from "@/lib/format";

/**
 * Saisie d'une valeur de série. Le chiffre est énorme, les incrémenteurs font
 * 56 px : on tape au pouce, le téléphone posé sur le banc, sans viser.
 * La frappe directe reste possible — clavier numérique natif.
 */
export function ChampCharge({
  libelle,
  etiquette,
  valeur,
  pas,
  min = 0,
  max = 1000,
  onChange,
  decimales = 1,
}: {
  /** Lu par les lecteurs d'écran : « Charge en kilogrammes ». */
  libelle: string;
  /** Affiché sous le chiffre : « KG », « REPS ». */
  etiquette: string;
  valeur: number | null;
  pas: number;
  min?: number;
  max?: number;
  onChange: (valeur: number) => void;
  decimales?: number;
}) {
  const id = useId();
  const courant = valeur ?? 0;

  function deplacer(delta: number) {
    const cible = Math.max(min, Math.min(max, courant + delta));
    const arrondi = Math.round(cible / pas) * pas;
    onChange(Number(arrondi.toFixed(decimales)));
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {libelle}
      </label>
      <div className="flex w-full flex-col items-center rounded-bloc border border-trait bg-surface px-2 py-3">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={pas}
          min={min}
          max={max}
          value={valeur === null ? "" : String(valeur)}
          onChange={(e) => {
            const lu = Number(e.target.value.replace(",", "."));
            onChange(Number.isFinite(lu) ? Math.max(min, Math.min(max, lu)) : 0);
          }}
          onFocus={(e) => e.currentTarget.select()}
          aria-describedby={`${id}-unite`}
          className="chiffre w-full bg-transparent text-center text-charge text-texte tabular-nums outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
        />
        <span id={`${id}-unite`} className="etiquette mt-1">
          {etiquette}
        </span>
      </div>
      <div className="flex w-full gap-2">
        <BoutonPas onClick={() => deplacer(-pas)} libelle={`Retirer ${nombre(pas)} ${etiquette.toLowerCase()}`}>
          −{nombre(pas)}
        </BoutonPas>
        <BoutonPas onClick={() => deplacer(pas)} libelle={`Ajouter ${nombre(pas)} ${etiquette.toLowerCase()}`}>
          +{nombre(pas)}
        </BoutonPas>
      </div>
    </div>
  );
}

function BoutonPas({
  children,
  onClick,
  libelle,
}: {
  children: React.ReactNode;
  onClick: () => void;
  libelle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={libelle}
      className={cn(
        "chiffre flex min-h-pouce flex-1 items-center justify-center rounded-pastille",
        "border border-trait bg-fond text-bloc text-texte",
        "transition-[background-color,transform] duration-[var(--duree-breve)] active:scale-[.97] active:bg-surface-creuse",
      )}
    >
      {children}
    </button>
  );
}
