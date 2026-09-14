"use client";

import Link from "next/link";
import { Anneau } from "@/components/ui/Anneau";
import { IndicateurSynchro } from "./IndicateurSynchro";
import type { EtatPersistance } from "@/hooks/usePersistance";
import { chrono, entier } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ExerciceLocal } from "@/stores/seance";

/**
 * Haut de l'écran de séance : nom, chrono qui tourne, tonnage qui monte en
 * direct, et la rangée d'anneaux — un anneau par exercice, qui se remplit à
 * mesure que les séries sont validées. C'est aussi la navigation.
 */
export function BarreHaute({
  nom,
  secondes,
  tonnage,
  unite,
  exercices,
  indexActif,
  onChoisir,
  etatSynchro,
  onForcerSynchro,
}: {
  nom: string;
  secondes: number;
  tonnage: number;
  unite: string;
  exercices: ExerciceLocal[];
  indexActif: number;
  onChoisir: (index: number) => void;
  etatSynchro: EtatPersistance;
  onForcerSynchro: () => void;
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-trait bg-fond px-5 pt-securite pb-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-affichage text-bloc font-bold">{nom}</p>
          <IndicateurSynchro etat={etatSynchro} onForcer={onForcerSynchro} />
        </div>
        <div className="flex shrink-0 items-baseline gap-4">
          <span className="chiffre text-bloc tabular-nums" aria-label={`Durée de la séance : ${chrono(secondes)}`}>
            {chrono(secondes)}
          </span>
          <span className="chiffre text-bloc tabular-nums text-accent-fort" aria-label={`Tonnage cumulé : ${entier(tonnage)} ${unite}`}>
            {entier(tonnage)}
            <span className="etiquette ml-1 text-accent-fort">{unite}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div
          role="tablist"
          aria-label="Exercices de la séance"
          className="no-scrollbar -mx-1 flex flex-1 items-center gap-1 overflow-x-auto px-1"
        >
          {exercices.map((exercice, i) => {
            const faites = exercice.series.filter((s) => s.validee).length;
            const part = Math.min(1, faites / Math.max(1, exercice.seriesCible));
            const record = exercice.series.some((s) => s.est_record);
            return (
              <button
                key={exercice.id}
                type="button"
                role="tab"
                aria-selected={i === indexActif}
                aria-label={`${exercice.nom}, ${faites} séries sur ${exercice.seriesCible}`}
                onClick={() => onChoisir(i)}
                className={cn(
                  "relative shrink-0 rounded-pastille p-1.5 transition-transform duration-[var(--duree-breve)]",
                  i === indexActif ? "scale-110" : "opacity-55",
                )}
              >
                <Anneau valeur={part} taille={24} epaisseur={17} ton={record ? "signal" : "accent"} />
                {i === indexActif && (
                  <span aria-hidden="true" className="absolute inset-x-0 -bottom-0.5 mx-auto h-1 w-1 rounded-pastille bg-accent" />
                )}
              </button>
            );
          })}
        </div>
        <Link
          href="/seance/bilan"
          className="min-h-11 shrink-0 rounded-pastille px-3 text-mention font-medium text-accent-fort hover:bg-accent-voile"
        >
          Terminer
        </Link>
      </div>
    </header>
  );
}
