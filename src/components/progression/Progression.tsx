"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { progressionExercice } from "@/actions/progression";
import { CourbeProgression, type PointProgression } from "@/components/graphes/CourbeProgression";
import { PileDeDisques, type SemaineTonnage } from "@/components/graphes/PileDeDisques";
import { CarteCorporelle, type VolumeGroupe } from "@/components/corps/CarteCorporelle";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Chiffre } from "@/components/ui/Chiffre";
import { Squelette, EtatVide } from "@/components/ui/Etats";
import { BoutonLien } from "@/components/ui/Bouton";
import { dureeLisible, entier, nombre } from "@/lib/format";
import type { Unite } from "@/lib/types";

export type ExerciceSuivi = { id: string; nom: string; seances: number };

/**
 * Progression : une courbe par exercice, le tonnage hebdomadaire lu comme une
 * pile de disques, et la carte corporelle. Tout se compare à soi-même, jamais
 * à un idéal.
 */
export function Progression({
  exercices,
  semaines,
  volumes,
  regularite,
  unite,
}: {
  exercices: ExerciceSuivi[];
  semaines: SemaineTonnage[];
  volumes: VolumeGroupe[];
  regularite: { seances: number; dureeMoyenne: number; fenetre: number };
  unite: Unite;
}) {
  const [exerciceId, setExerciceId] = useState<string | null>(exercices[0]?.id ?? null);
  const [points, setPoints] = useState<PointProgression[] | null>(null);
  const [, demarrer] = useTransition();

  useEffect(() => {
    if (!exerciceId) return;
    setPoints(null);
    demarrer(async () => {
      setPoints(await progressionExercice(exerciceId));
    });
  }, [exerciceId]);

  const exercice = useMemo(() => exercices.find((e) => e.id === exerciceId), [exercices, exerciceId]);
  const dernier = points?.[points.length - 1];
  const premier = points?.[0];
  const ecart = dernier && premier && premier.rm_estime > 0 ? dernier.rm_estime - premier.rm_estime : null;

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-9 px-5 pt-securite pb-8">
      <header className="pt-4">
        <h1 className="font-affichage text-titre font-bold">Progression</h1>
        <p className="mt-1 text-ui text-texte-doux">
          Tout se compare à ce que tu faisais avant, jamais à quelqu&apos;un d&apos;autre.
        </p>
      </header>

      <section>
        <TitreSection>Par exercice</TitreSection>
        {exercices.length === 0 ? (
          <EtatVide
            titre="Pas encore de données"
            texte="Après deux séances sur un même exercice, la courbe de 1RM apparaît ici."
            action={<BoutonLien href="/seance">Lancer une séance</BoutonLien>}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-mention text-texte-doux">Exercice suivi</span>
              <select
                value={exerciceId ?? ""}
                onChange={(e) => setExerciceId(e.target.value)}
                className="min-h-pouce w-full rounded-champ border border-trait-fort bg-fond px-4 text-ui text-texte"
              >
                {exercices.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom} — {e.seances} séance{e.seances > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>

            {points === null ? (
              <Squelette rayon="bloc" className="h-64 w-full" />
            ) : (
              <>
                {dernier && (
                  <div className="flex flex-wrap items-end gap-6">
                    <Chiffre valeur={nombre(dernier.rm_estime)} unite={`${unite} · 1RM estimé`} taille="heros" />
                    {ecart !== null && ecart !== 0 && (
                      <p className="max-w-xs pb-2 text-mention text-texte-doux">
                        {ecart > 0 ? "+" : ""}
                        {nombre(ecart)} {unite} depuis la première séance suivie
                        {exercice ? ` sur ${exercice.nom.toLowerCase()}` : ""}.
                      </p>
                    )}
                  </div>
                )}
                <CourbeProgression points={points} unite={unite} />
              </>
            )}
          </div>
        )}
      </section>

      <section>
        <TitreSection>Tonnage hebdomadaire</TitreSection>
        {semaines.every((s) => s.tonnage === 0) ? (
          <p className="text-ui text-texte-doux">Aucun tonnage sur les douze dernières semaines.</p>
        ) : (
          <PileDeDisques semaines={semaines} unite={unite} />
        )}
      </section>

      <section>
        <TitreSection>Carte corporelle</TitreSection>
        {volumes.length === 0 ? (
          <p className="text-ui text-texte-doux">
            La silhouette se teinte dès la première séance validée des sept derniers jours.
          </p>
        ) : (
          <CarteCorporelle volumes={volumes} unite={unite} />
        )}
      </section>

      <section>
        <TitreSection>Régularité</TitreSection>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Surface className="flex flex-col gap-1 p-4">
            <span className="etiquette">Séances</span>
            <span className="chiffre text-heros">{regularite.seances}</span>
            <span className="text-mention text-texte-doux">sur {regularite.fenetre} jours</span>
          </Surface>
          <Surface className="flex flex-col gap-1 p-4">
            <span className="etiquette">Durée moyenne</span>
            <span className="chiffre text-bloc">{dureeLisible(regularite.dureeMoyenne)}</span>
            <span className="text-mention text-texte-doux">par séance</span>
          </Surface>
          <Surface className="flex flex-col gap-1 p-4">
            <span className="etiquette">Volume total</span>
            <span className="chiffre text-bloc">
              {entier(semaines.reduce((t, s) => t + s.tonnage, 0))} {unite}
            </span>
            <span className="text-mention text-texte-doux">sur 12 semaines</span>
          </Surface>
        </div>
      </section>
    </main>
  );
}
