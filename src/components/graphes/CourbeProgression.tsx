"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { charge, jourMois } from "@/lib/format";
import type { Unite } from "@/lib/types";

export type PointProgression = {
  jour: string;
  charge_max: number;
  rm_estime: number;
  record?: boolean;
};

/**
 * Courbe de charge max et de 1RM estimé. Recharts sert de moteur, pas de
 * style : axes redessinés, pas de grille verticale, pas de légende par défaut,
 * points de record marqués par un disque en `--signal`.
 */
export function CourbeProgression({ points, unite }: { points: PointProgression[]; unite: Unite }) {
  if (points.length < 2) {
    return (
      <p className="text-ui text-texte-doux">
        Il faut au moins deux séances sur cet exercice pour tracer une courbe. Reviens après la prochaine.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 12, right: 8, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="var(--color-trait)" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="jour"
            tickFormatter={(v: string) => jourMois(v)}
            tick={{ fill: "var(--color-texte-tenu)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-trait)" }}
            tickLine={false}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: "var(--color-texte-tenu)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<Infobulle unite={unite} />} cursor={{ stroke: "var(--color-trait-fort)" }} />
          <Line
            type="monotone"
            dataKey="rm_estime"
            name="1RM estimé"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={<PointRecord />}
            activeDot={{ r: 5, fill: "var(--color-accent)", stroke: "var(--color-fond)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="charge_max"
            name="Charge max"
            stroke="var(--color-texte-tenu)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 flex flex-wrap gap-4 text-mention text-texte-doux">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-5 rounded-pastille bg-accent" /> 1RM estimé
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-5 rounded-pastille bg-texte-tenu" /> Charge max
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2 w-2 rounded-pastille bg-signal" /> Record
        </span>
      </p>
    </div>
  );
}

type PointProps = { cx?: number; cy?: number; payload?: PointProgression };

function PointRecord({ cx, cy, payload }: PointProps) {
  if (cx === undefined || cy === undefined) return null;
  if (!payload?.record) return <circle cx={cx} cy={cy} r={2.5} fill="var(--color-accent)" />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="var(--color-fond)" />
      <circle cx={cx} cy={cy} r={4.5} fill="var(--color-signal)" />
    </g>
  );
}

/**
 * Recharts clone l'élément passé à `content` en lui injectant ses propres
 * props : on les déclare toutes optionnelles plutôt que d'importer un type
 * générique que la v3 rend difficile à satisfaire.
 */
type PropsInfobulle = {
  active?: boolean;
  payload?: Array<{ payload?: PointProgression }>;
  label?: string | number;
  unite: Unite;
};

function Infobulle({ active, payload, label, unite }: PropsInfobulle) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-champ border border-trait bg-fond px-3 py-2 text-mention shadow-none">
      <p className="font-medium text-texte">{jourMois(String(label))}</p>
      <p className="text-texte-doux">1RM estimé : {charge(point.rm_estime, unite)}</p>
      <p className="text-texte-doux">Charge max : {charge(point.charge_max, unite)}</p>
      {point.record && <p className="font-bold text-signal-texte">Record ce jour-là</p>}
    </div>
  );
}
