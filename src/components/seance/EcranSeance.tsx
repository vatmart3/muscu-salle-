"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useSeance, exerciceActif, serieEnCours, tonnageSeance } from "@/stores/seance";
import { useChrono } from "@/hooks/useChrono";
import { useWakeLock } from "@/hooks/useWakeLock";
import { usePersistance } from "@/hooks/usePersistance";
import { Bouton } from "@/components/ui/Bouton";
import { Feuille } from "@/components/ui/Feuille";
import { ChampCharge } from "./ChampCharge";
import { BarreHaute } from "./BarreHaute";
import { CarteExercice } from "./CarteExercice";
import { TimerRepos } from "./TimerRepos";
import { CelebrationRecord } from "./CelebrationRecord";
import { AjoutExercice } from "./AjoutExercice";
import { SelecteurRpe } from "./SelecteurRpe";
import { EtatVide } from "@/components/ui/Etats";
import { pasCharge } from "@/lib/calculs";
import type { RecordTombe } from "@/lib/calculs";
import type { SerieLocale } from "@/stores/seance";
import type { Unite } from "@/lib/types";

/**
 * L'écran de séance. Un exercice à la fois, en grand ; la saisie toujours dans
 * le tiers bas ; l'état complet dans le téléphone pour survivre à un appel, un
 * verrouillage ou une coupure réseau.
 */
export function EcranSeance({
  unite,
  sonActif,
  vibrationActive,
}: {
  unite: Unite;
  sonActif: boolean;
  vibrationActive: boolean;
}) {
  const routeur = useRouter();
  const etat = useSeance();
  const { etat: etatSynchro, forcer } = usePersistance();
  const mouvementReduit = useReducedMotion();

  const [records, setRecords] = useState<RecordTombe[] | null>(null);
  const [bibliotheque, setBibliotheque] = useState(false);
  const [serieAModifier, setSerieAModifier] = useState<SerieLocale | null>(null);

  const seance = etat.seance;
  const exercice = exerciceActif(etat);
  const brouillon = serieEnCours(exercice);
  const secondes = useChrono(seance?.demarree_a ?? null, Boolean(seance));
  const tonnage = tonnageSeance(etat);

  useWakeLock(Boolean(seance));

  // Une notification de fin de repos ne sert à rien sans permission : on la
  // demande au premier repos déclenché, pas au chargement de la page.
  useEffect(() => {
    if (!etat.repos) return;
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    void Notification.requestPermission().catch(() => {});
  }, [etat.repos]);

  const valider = useCallback(() => {
    if (!exercice || !brouillon) return;
    const tombes = etat.validerSerie(exercice.id);
    if (tombes.length > 0) setRecords(tombes);
    if (exercice.repos_secondes > 0) etat.demarrerRepos(exercice.id, exercice.repos_secondes);
  }, [exercice, brouillon, etat]);

  if (!seance || !exercice) {
    return (
      <main id="contenu" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
        <EtatVide
          titre="Aucune séance en cours"
          texte="Lance une séance depuis le tableau de bord : tes charges de la dernière fois seront déjà là."
          action={<Bouton onClick={() => routeur.push("/tableau-de-bord")}>Aller au tableau de bord</Bouton>}
        />
      </main>
    );
  }

  const pretAValider = brouillon
    ? exercice.typeExercice === "temps"
      ? (brouillon.secondes ?? 0) > 0
      : (brouillon.reps ?? 0) > 0
    : false;

  return (
    <div className="flex min-h-dvh flex-col bg-fond">
      <BarreHaute
        nom={seance.nom}
        secondes={secondes}
        tonnage={tonnage}
        unite={unite}
        exercices={etat.exercices}
        indexActif={etat.indexActif}
        onChoisir={etat.choisirExercice}
        etatSynchro={etatSynchro}
        onForcerSynchro={forcer}
      />

      <main id="contenu" className="mx-auto w-full max-w-lg flex-1 px-5 pt-5 pb-4">
        <motion.div
          key={exercice.id}
          drag={mouvementReduit ? false : "x"}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.14}
          onDragEnd={(_, info) => {
            if (info.offset.x < -70) etat.choisirExercice(etat.indexActif + 1);
            if (info.offset.x > 70) etat.choisirExercice(etat.indexActif - 1);
          }}
          initial={{ opacity: 0, x: mouvementReduit ? 0 : 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: mouvementReduit ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <CarteExercice
            exercice={exercice}
            brouillon={brouillon}
            unite={unite}
            onChamp={(champs) => etat.majBrouillon(exercice.id, champs)}
            onType={(type) => brouillon && etat.majSerie(exercice.id, brouillon.id, { type })}
            onRpe={(rpe) => brouillon && etat.majSerie(exercice.id, brouillon.id, { rpe })}
            onModifierSerie={setSerieAModifier}
            onSupprimerSerie={(serie) => etat.supprimerSerie(exercice.id, serie.id)}
            onNote={(note) => etat.noterExercice(exercice.id, note)}
            onReglerRepos={(s) => etat.reglerRepos(exercice.id, s)}
          />
        </motion.div>
      </main>

      {/* Zone de pouce : tout ce qui se tape pendant la séance vit ici. */}
      <div className="sticky bottom-0 z-30 mx-auto w-full max-w-lg border-t border-trait bg-fond px-5 pt-3 pb-securite">
        <AnimatePresence>
          {etat.repos && (
            <div className="mb-3">
              <TimerRepos
                repos={etat.repos}
                nomExercice={etat.exercices.find((e) => e.id === etat.repos?.exerciceId)?.nom ?? exercice.nom}
                sonActif={sonActif}
                vibrationActive={vibrationActive}
                onAjuster={etat.ajusterRepos}
                onPasser={etat.arreterRepos}
              />
            </div>
          )}
        </AnimatePresence>

        <Bouton taille="pouce" pleineLargeur onClick={valider} disabled={!pretAValider}>
          Valider la série
        </Bouton>

        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setBibliotheque(true)}
            className="min-h-11 rounded-pastille px-3 text-mention font-medium text-accent-fort hover:bg-accent-voile"
          >
            Ajouter un exercice
          </button>
          <button
            type="button"
            onClick={() => etat.choisirExercice(etat.indexActif + 1)}
            disabled={etat.indexActif >= etat.exercices.length - 1}
            className="min-h-11 rounded-pastille px-3 text-mention font-medium text-accent-fort hover:bg-accent-voile disabled:opacity-40"
          >
            Exercice suivant
          </button>
        </div>
      </div>

      {records && (
        <CelebrationRecord records={records} unite={unite} onFini={() => setRecords(null)} />
      )}

      <AjoutExercice
        ouverte={bibliotheque}
        ordre={etat.exercices.length}
        onFermer={() => setBibliotheque(false)}
        onAjoute={etat.ajouterExercice}
      />

      <Feuille
        titre={`Série ${serieAModifier?.index_serie ?? ""}`}
        ouverte={serieAModifier !== null}
        onFermer={() => setSerieAModifier(null)}
      >
        {serieAModifier && (
          <div className="flex flex-col gap-5">
            <div className="flex gap-3">
              <ChampCharge
                libelle={`Charge en ${unite === "kg" ? "kilogrammes" : "livres"}`}
                etiquette={unite.toUpperCase()}
                valeur={serieAModifier.poids}
                pas={pasCharge(unite)}
                onChange={(poids) => {
                  etat.majSerie(exercice.id, serieAModifier.id, { poids });
                  setSerieAModifier({ ...serieAModifier, poids });
                }}
              />
              <ChampCharge
                libelle="Répétitions"
                etiquette="REPS"
                valeur={serieAModifier.reps}
                pas={1}
                max={500}
                decimales={0}
                onChange={(reps) => {
                  etat.majSerie(exercice.id, serieAModifier.id, { reps });
                  setSerieAModifier({ ...serieAModifier, reps });
                }}
              />
            </div>
            <SelecteurRpe
              valeur={serieAModifier.rpe}
              onChange={(rpe) => {
                etat.majSerie(exercice.id, serieAModifier.id, { rpe });
                setSerieAModifier({ ...serieAModifier, rpe });
              }}
            />
            <Bouton taille="pouce" pleineLargeur onClick={() => setSerieAModifier(null)}>
              Garder cette correction
            </Bouton>
            <p className="text-mention text-texte-tenu">
              Corriger une série ne rejoue pas la détection de record en direct : c&apos;est le serveur qui
              recalcule, et le résultat revient à la prochaine synchronisation.
            </p>
          </div>
        )}
      </Feuille>
    </div>
  );
}
