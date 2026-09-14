"use client";

import { useId, useState } from "react";
import { jourComplet } from "@/lib/format";

export type PhotoComparee = { id: string; date: string; url: string; angle: string };

/**
 * Comparateur avant / après. Le curseur est un `input[type=range]` : on le
 * glisse au pouce comme un rideau, et il fonctionne aussi aux flèches du
 * clavier, ce qu'un rideau maison en `pointermove` ne ferait pas.
 */
export function Comparateur({ avant, apres }: { avant: PhotoComparee; apres: PhotoComparee }) {
  const [part, setPart] = useState(50);
  const id = useId();

  return (
    <figure className="flex flex-col gap-3">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-bloc border border-trait bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={apres.url}
          alt={`Photo du ${jourComplet(apres.date)}, vue de ${apres.angle}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${part}%` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avant.url}
            alt={`Photo du ${jourComplet(avant.date)}, vue de ${avant.angle}`}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ width: `calc(100% * 100 / ${Math.max(part, 1)})` }}
          />
        </div>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 w-0.5 bg-fond"
          style={{ left: `calc(${part}% - 1px)` }}
        />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-pastille border-2 border-fond bg-accent"
          style={{ left: `${part}%` }}
        />
      </div>

      <label htmlFor={id} className="sr-only">
        Position du rideau de comparaison
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={part}
        onChange={(e) => setPart(Number(e.target.value))}
        className="h-11 w-full accent-[var(--color-accent)]"
        aria-valuetext={`${part} % de la photo du ${jourComplet(avant.date)}`}
      />

      <figcaption className="flex justify-between text-mention text-texte-doux">
        <span>{jourComplet(avant.date)}</span>
        <span>{jourComplet(apres.date)}</span>
      </figcaption>
    </figure>
  );
}
