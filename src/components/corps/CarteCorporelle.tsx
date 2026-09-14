"use client";

import { useState } from "react";
import { LIBELLE_GROUPE, type Groupe } from "@/lib/types";
import { entier, nombre } from "@/lib/format";
import { cn } from "@/lib/cn";
import { SILHOUETTE, type Forme, type Vue } from "./silhouette";

export type VolumeGroupe = { groupe: string; volume: number; series: number };

/**
 * Carte corporelle : la silhouette se teinte du brume au bleu profond selon le
 * volume des sept derniers jours. Deuxième moment fort visuel de l'app.
 *
 * L'échelle est **relative au maximum personnel de la fenêtre** : comparer le
 * volume d'un débutant à une constante n'aurait aucun sens.
 */
export function CarteCorporelle({
  volumes,
  unite,
  jours = 7,
}: {
  volumes: VolumeGroupe[];
  unite: string;
  jours?: number;
}) {
  const [vue, setVue] = useState<Vue>("face");
  const [choisi, setChoisi] = useState<Groupe | null>(null);

  const parGroupe = new Map(volumes.map((v) => [v.groupe, v]));
  const maximum = Math.max(1, ...volumes.map((v) => v.volume));
  const detail = choisi ? parGroupe.get(choisi) : undefined;

  function teinte(groupe: Groupe | "tete"): string {
    if (groupe === "tete") return "var(--color-surface-creuse)";
    const volume = parGroupe.get(groupe)?.volume ?? 0;
    if (volume <= 0) return "var(--color-surface)";
    // Racine carrée : sans elle, un seul gros groupe écrase tous les autres.
    const part = Math.round(Math.sqrt(volume / maximum) * 100);
    return `color-mix(in oklab, var(--color-accent-fort) ${part}%, var(--color-surface))`;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div role="radiogroup" aria-label="Face ou dos" className="flex gap-1 rounded-pastille bg-surface p-1">
          {(["face", "dos"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={vue === v}
              onClick={() => setVue(v)}
              className={cn(
                "min-h-9 rounded-pastille px-4 text-mention font-medium capitalize",
                "transition-colors duration-[var(--duree-breve)]",
                vue === v ? "bg-fond text-texte" : "text-texte-doux",
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="text-mention text-texte-doux">Volume sur {jours} jours</p>
      </div>

      <div className="flex items-start gap-5">
        <svg
          viewBox="0 0 200 420"
          className="h-80 w-auto shrink-0"
          role="img"
          aria-label={`Silhouette vue de ${vue}, teintée selon le volume des ${jours} derniers jours`}
        >
          {SILHOUETTE[vue].map(({ groupe, formes }) => {
            const interactif = groupe !== "tete";
            return (
              <g
                key={groupe}
                role={interactif ? "button" : undefined}
                tabIndex={interactif ? 0 : undefined}
                aria-label={
                  interactif
                    ? `${LIBELLE_GROUPE[groupe as Groupe]} : ${entier(parGroupe.get(groupe)?.volume ?? 0)} ${unite}`
                    : undefined
                }
                onClick={interactif ? () => setChoisi(choisi === groupe ? null : (groupe as Groupe)) : undefined}
                onKeyDown={
                  interactif
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setChoisi(choisi === groupe ? null : (groupe as Groupe));
                        }
                      }
                    : undefined
                }
                className={cn(interactif && "cursor-pointer outline-offset-4")}
              >
                {formes.map((forme, i) => (
                  <Trace
                    key={i}
                    forme={forme}
                    remplissage={teinte(groupe)}
                    selectionne={choisi === groupe}
                  />
                ))}
              </g>
            );
          })}
        </svg>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {detail && choisi ? (
            <div className="rounded-bloc border border-trait bg-surface p-4">
              <h3 className="font-affichage text-bloc font-bold">{LIBELLE_GROUPE[choisi]}</h3>
              <p className="chiffre mt-1 text-heros text-accent-fort">{entier(detail.volume)}</p>
              <p className="text-mention text-texte-doux">
                {unite} sur {jours} jours · {detail.series} séries
              </p>
            </div>
          ) : (
            <p className="text-ui text-texte-doux">
              Touche un muscle pour voir son volume. Plus le bleu est profond, plus le groupe a travaillé.
            </p>
          )}

          <ul className="flex flex-col gap-1.5">
            {[...volumes]
              .sort((a, b) => b.volume - a.volume)
              .slice(0, 5)
              .map((v) => (
                <li key={v.groupe} className="flex items-baseline gap-2 text-mention">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-pastille"
                    style={{ background: teinte(v.groupe as Groupe) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-texte">
                    {LIBELLE_GROUPE[v.groupe as Groupe] ?? v.groupe}
                  </span>
                  <span className="chiffre text-texte-doux">{nombre(Math.round(v.volume / 100) / 10)} t</span>
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Trace({
  forme,
  remplissage,
  selectionne,
}: {
  forme: Forme;
  remplissage: string;
  selectionne: boolean;
}) {
  const commun = {
    fill: remplissage,
    stroke: selectionne ? "var(--color-texte)" : "var(--color-trait)",
    strokeWidth: selectionne ? 2.5 : 1,
    style: { transition: "fill var(--duree-ample) var(--courbe-disque)" },
  };
  if (forme.type === "cercle") return <circle cx={forme.cx} cy={forme.cy} r={forme.r} {...commun} />;
  if (forme.type === "ellipse") return <ellipse cx={forme.cx} cy={forme.cy} rx={forme.rx} ry={forme.ry} {...commun} />;
  return <rect x={forme.x} y={forme.y} width={forme.l} height={forme.h} rx={forme.r} {...commun} />;
}
