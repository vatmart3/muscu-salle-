"use client";

import { useState } from "react";
import { entier, libelleSemaine, nombre } from "@/lib/format";
import { cn } from "@/lib/cn";

export type SemaineTonnage = { debut: string; seances: number; tonnage: number };

/**
 * Tonnage hebdomadaire, lu **comme des disques qu'on empile sur une barre**.
 *
 * C'est la métaphore centrale de l'app prise au mot : pas un histogramme de
 * barres, une pile de fonte. Un disque vaut une tranche fixe de tonnage, le
 * reste est un disque partiel — on voit la semaine « peser ».
 */
export function PileDeDisques({
  semaines,
  unite,
  parDisque = 1000,
}: {
  semaines: SemaineTonnage[];
  unite: string;
  /** Tonnage représenté par un disque plein. */
  parDisque?: number;
}) {
  const [choisie, setChoisie] = useState<string | null>(null);

  const ordonnees = [...semaines].sort((a, b) => a.debut.localeCompare(b.debut));
  const maximum = Math.max(parDisque, ...ordonnees.map((s) => s.tonnage));
  const disquesMax = Math.max(1, Math.ceil(maximum / parDisque));
  const hauteurDisque = 9;
  const hauteur = disquesMax * hauteurDisque + 8;
  const detail = ordonnees.find((s) => s.debut === choisie);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="no-scrollbar flex items-end gap-2 overflow-x-auto"
        style={{ height: hauteur + 26 }}
        role="list"
        aria-label="Tonnage des douze dernières semaines"
      >
        {ordonnees.map((semaine) => {
          const entiers = Math.floor(semaine.tonnage / parDisque);
          const reste = (semaine.tonnage % parDisque) / parDisque;
          const actif = choisie === semaine.debut;
          return (
            <button
              key={semaine.debut}
              type="button"
              role="listitem"
              aria-label={`${libelleSemaine(semaine.debut)} : ${entier(semaine.tonnage)} ${unite}, ${semaine.seances} séances`}
              onClick={() => setChoisie(actif ? null : semaine.debut)}
              className="flex shrink-0 flex-col items-center gap-1.5"
              style={{ width: 30 }}
            >
              <span className="flex flex-col-reverse items-center justify-start" style={{ height: hauteur }}>
                {Array.from({ length: entiers }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={cn(
                      "rounded-pastille transition-colors duration-[var(--duree-breve)]",
                      actif ? "bg-accent-fort" : "bg-accent",
                    )}
                    style={{ width: 26 - Math.min(10, i), height: hauteurDisque - 2, marginBottom: 2 }}
                  />
                ))}
                {reste > 0.02 && (
                  <span
                    aria-hidden="true"
                    className="rounded-pastille bg-surface-creuse"
                    style={{ width: 26 - Math.min(10, entiers), height: Math.max(2, (hauteurDisque - 2) * reste), marginBottom: 2 }}
                  />
                )}
              </span>
              {/* La barre sur laquelle les disques reposent. */}
              <span aria-hidden="true" className="h-0.5 w-7 rounded-pastille bg-trait-fort" />
              <span className={cn("text-mention tabular-nums", actif ? "text-texte" : "text-texte-tenu")}>
                {new Date(semaine.debut).getDate()}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-mention text-texte-doux" aria-live="polite">
        {detail
          ? `${libelleSemaine(detail.debut)} : ${entier(detail.tonnage)} ${unite} en ${detail.seances} séance${detail.seances > 1 ? "s" : ""}.`
          : `Un disque vaut ${nombre(parDisque / 1000)} tonne${parDisque >= 2000 ? "s" : ""}. Touche une semaine pour le détail.`}
      </p>
    </div>
  );
}
