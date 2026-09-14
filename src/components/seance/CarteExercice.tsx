"use client";

import { useState } from "react";
import { ChampTexte } from "@/components/ui/Champ";
import { LIBELLE_GROUPE, LIBELLE_TYPE_SERIE, type Groupe, type TypeSerie, type Unite } from "@/lib/types";
import { charge, depuis, nombre } from "@/lib/format";
import { pasCharge } from "@/lib/calculs";
import { cn } from "@/lib/cn";
import type { ExerciceLocal, SerieLocale } from "@/stores/seance";
import { ChampCharge } from "./ChampCharge";
import { LigneSerie } from "./LigneSerie";
import { SelecteurRpe } from "./SelecteurRpe";

/**
 * L'exercice en cours, seul, en grand. Les autres sont accessibles par la
 * rangée d'anneaux ou par glissement — jamais par une liste grise à chevrons.
 */
export function CarteExercice({
  exercice,
  brouillon,
  unite,
  onChamp,
  onType,
  onRpe,
  onModifierSerie,
  onSupprimerSerie,
  onNote,
  onReglerRepos,
}: {
  exercice: ExerciceLocal;
  brouillon: SerieLocale | undefined;
  unite: Unite;
  onChamp: (champs: Partial<Pick<SerieLocale, "poids" | "reps" | "secondes" | "metres">>) => void;
  onType: (type: TypeSerie) => void;
  onRpe: (valeur: number | null) => void;
  onModifierSerie: (serie: SerieLocale) => void;
  onSupprimerSerie: (serie: SerieLocale) => void;
  onNote: (note: string) => void;
  onReglerRepos: (secondes: number) => void;
}) {
  const [noteOuverte, setNoteOuverte] = useState(false);
  const [rpeOuvert, setRpeOuvert] = useState(false);

  const validees = exercice.series.filter((s) => s.validee);
  const pas = pasCharge(unite);
  const auPoidsDuCorps = exercice.typeExercice === "poids_du_corps";
  const auTemps = exercice.typeExercice === "temps";

  return (
    <div className="flex flex-col gap-5">
      {/* Pas d'anneau ici : la rangée de la barre haute porte déjà la
          complétion de chaque exercice. Le titre prend toute la largeur. */}
      <header className="min-w-0">
        <h1 className="font-affichage text-titre leading-tight font-bold text-balance">{exercice.nom}</h1>
        <p className="text-mention text-texte-doux">
          {LIBELLE_GROUPE[exercice.groupe as Groupe] ?? exercice.groupe} · Série {validees.length + 1} sur{" "}
          {Math.max(exercice.seriesCible, validees.length + 1)}
        </p>
      </header>

      {validees.length > 0 && (
        <ul className="flex flex-col">
          {validees.map((serie) => (
            <LigneSerie
              key={serie.id}
              serie={serie}
              unite={unite}
              onModifier={() => onModifierSerie(serie)}
              onSupprimer={() => onSupprimerSerie(serie)}
            />
          ))}
        </ul>
      )}

      {brouillon && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            {auTemps ? (
              <ChampCharge
                libelle="Durée en secondes"
                etiquette="SEC"
                valeur={brouillon.secondes}
                pas={5}
                max={3600}
                decimales={0}
                onChange={(secondes) => onChamp({ secondes })}
              />
            ) : (
              <>
                {!auPoidsDuCorps && (
                  <ChampCharge
                    libelle={`Charge en ${unite === "kg" ? "kilogrammes" : "livres"}`}
                    etiquette={unite.toUpperCase()}
                    valeur={brouillon.poids}
                    pas={pas}
                    onChange={(poids) => onChamp({ poids })}
                  />
                )}
                <ChampCharge
                  libelle="Répétitions"
                  etiquette="REPS"
                  valeur={brouillon.reps}
                  pas={1}
                  max={500}
                  decimales={0}
                  onChange={(reps) => onChamp({ reps })}
                />
              </>
            )}
          </div>

          <p className="text-mention text-texte-doux" aria-live="polite">
            {exercice.derniereFois
              ? `La dernière fois, ${depuis(exercice.derniereFois.date)} : ${charge(exercice.derniereFois.poids, unite)} × ${nombre(exercice.derniereFois.reps)}`
              : "Première fois sur cet exercice. Commence prudemment."}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {(["echauffement", "degressive", "echec"] as const).map((type) => {
              const actif = brouillon.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={actif}
                  onClick={() => onType(actif ? "normale" : type)}
                  className={cn(
                    "min-h-11 rounded-pastille border px-3.5 text-mention font-medium",
                    "transition-[background-color,border-color,color] duration-[var(--duree-breve)]",
                    actif ? "border-texte bg-inverse-fond text-inverse-texte" : "border-trait bg-surface text-texte-doux",
                  )}
                >
                  {LIBELLE_TYPE_SERIE[type]}
                </button>
              );
            })}
            <button
              type="button"
              aria-expanded={rpeOuvert}
              onClick={() => setRpeOuvert((o) => !o)}
              className={cn(
                "min-h-11 rounded-pastille border px-3.5 text-mention font-medium",
                brouillon.rpe !== null ? "border-accent bg-accent-voile text-accent-fort" : "border-trait bg-surface text-texte-doux",
              )}
            >
              {brouillon.rpe !== null ? `RPE ${brouillon.rpe}` : "Noter l'effort"}
            </button>
          </div>

          {rpeOuvert && <SelecteurRpe valeur={brouillon.rpe} onChange={onRpe} className="pt-2" />}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-trait pt-4">
        <button
          type="button"
          onClick={() => setNoteOuverte((o) => !o)}
          aria-expanded={noteOuverte}
          className="min-h-11 rounded-pastille px-3 text-mention font-medium text-accent-fort hover:bg-accent-voile"
        >
          {exercice.note ? "Modifier la note" : "Ajouter une note"}
        </button>
        <label className="ml-auto flex items-center gap-2 text-mention text-texte-doux">
          Repos
          <select
            value={exercice.repos_secondes}
            onChange={(e) => onReglerRepos(Number(e.target.value))}
            aria-label="Durée du repos entre les séries"
            className="min-h-11 rounded-champ border border-trait bg-surface px-3 text-ui text-texte"
          >
            {[30, 45, 60, 75, 90, 120, 150, 180, 240, 300].map((s) => (
              <option key={s} value={s}>
                {s < 60 ? `${s} s` : `${Math.floor(s / 60)} min${s % 60 ? ` ${s % 60}` : ""}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      {noteOuverte && (
        <ChampTexte
          libelle={`Note sur ${exercice.nom}`}
          value={exercice.note ?? ""}
          onChange={(e) => onNote(e.target.value)}
          placeholder="Épaule droite qui tire au-dessus de 80 kg."
        />
      )}

      {exercice.instructions && (
        <p className="text-mention text-texte-tenu">{exercice.instructions}</p>
      )}

      <div className="sr-only" aria-live="polite">
        {validees.length} séries validées sur {exercice.seriesCible}.
      </div>
    </div>
  );
}
