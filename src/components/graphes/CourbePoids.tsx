"use client";

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { jourMois, nombre } from "@/lib/format";

export type PointPoids = { date: string; valeur: number; lissee: number };

/**
 * Poids au fil du temps. La ligne pleine est la **moyenne mobile sur 7 jours** ;
 * les mesures brutes sont en fond, en aplat léger.
 *
 * C'est l'inverse du réflexe habituel, et c'est volontaire : le poids d'un
 * matin ne veut rien dire, la tendance si. Montrer la mesure brute en premier
 * plan pousse à réagir à du bruit.
 */
export function CourbePoids({ points, unite }: { points: PointPoids[]; unite: string }) {
  if (points.length < 2) {
    return (
      <p className="text-ui text-texte-doux">
        Il faut au moins deux pesées pour tracer une tendance. La deuxième suffit à faire apparaître la courbe.
      </p>
    );
  }

  const valeurs = points.flatMap((p) => [p.valeur, p.lissee]);
  const bas = Math.floor(Math.min(...valeurs) - 1);
  const haut = Math.ceil(Math.max(...valeurs) + 1);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 8, bottom: 4, left: -18 }}>
          <CartesianGrid stroke="var(--color-trait)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => jourMois(v)}
            tick={{ fill: "var(--color-texte-tenu)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-trait)" }}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis
            domain={[bas, haut]}
            tick={{ fill: "var(--color-texte-tenu)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<Infobulle unite={unite} />} cursor={{ stroke: "var(--color-trait-fort)" }} />
          <Area
            type="monotone"
            dataKey="valeur"
            stroke="none"
            fill="var(--color-accent-voile)"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="lissee"
            stroke="var(--color-accent)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <p className="mt-2 text-mention text-texte-doux">
        Ligne pleine : moyenne sur 7 jours. Aplat : tes pesées brutes.
      </p>
    </div>
  );
}

type PropsInfobulle = {
  active?: boolean;
  payload?: Array<{ payload?: PointPoids }>;
  label?: string | number;
  unite: string;
};

function Infobulle({ active, payload, label, unite }: PropsInfobulle) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="rounded-champ border border-trait bg-fond px-3 py-2 text-mention">
      <p className="font-medium text-texte">{jourMois(String(label))}</p>
      <p className="text-texte-doux">
        Pesée : {nombre(point.valeur)} {unite}
      </p>
      <p className="text-texte-doux">
        Tendance : {nombre(point.lissee)} {unite}
      </p>
    </div>
  );
}
