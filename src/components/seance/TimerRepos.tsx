"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Anneau } from "@/components/ui/Anneau";
import { Bouton } from "@/components/ui/Bouton";
import { useCompteARebours } from "@/hooks/useChrono";
import { bip, notifierFinRepos, vibrer } from "@/hooks/useSignal";
import { chrono } from "@/lib/format";
import type { Repos } from "@/stores/seance";

/**
 * Timer de repos : un anneau qui se vide, en surcouche.
 * Il ne bloque pas l'écran — on peut toujours corriger la série qu'on vient de
 * valider, ce qui arrive tout le temps quand on s'est trompé d'un disque.
 */
export function TimerRepos({
  repos,
  nomExercice,
  sonActif,
  vibrationActive,
  onAjuster,
  onPasser,
}: {
  repos: Repos;
  nomExercice: string;
  sonActif: boolean;
  vibrationActive: boolean;
  onAjuster: (delta: number) => void;
  onPasser: () => void;
}) {
  const restant = useCompteARebours(repos.finA);
  const mouvementReduit = useReducedMotion();
  const sonne = useRef(false);

  useEffect(() => {
    sonne.current = false;
  }, [repos.finA]);

  useEffect(() => {
    if (restant > 0 || sonne.current) return;
    sonne.current = true;
    if (vibrationActive) vibrer();
    bip(sonActif);
    notifierFinRepos(nomExercice);
  }, [restant, sonActif, vibrationActive, nomExercice]);

  const part = repos.duree > 0 ? restant / repos.duree : 0;
  const fini = restant === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: mouvementReduit ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: mouvementReduit ? 0 : 16 }}
      transition={{ duration: mouvementReduit ? 0 : 0.26, ease: [0.22, 0.61, 0.36, 1] }}
      className="pointer-events-auto rounded-bloc border border-trait bg-fond p-4"
      role="timer"
      aria-live="off"
    >
      <div className="flex items-center gap-4">
        <Anneau
          valeur={1 - part}
          sens="vider"
          taille={84}
          epaisseur={12}
          ton={fini ? "encre" : "accent"}
          etiquette={`Repos, ${restant} secondes restantes`}
        >
          <span className="chiffre text-bloc">{chrono(restant)}</span>
        </Anneau>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="text-mention text-texte-doux">
            {fini ? "Repos terminé. Reprends quand tu es prêt." : `Repos entre les séries · ${nomExercice}`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Bouton ton="secondaire" taille="compact" onClick={() => onAjuster(-15)} aria-label="Retirer 15 secondes de repos">
              −15 s
            </Bouton>
            <Bouton ton="secondaire" taille="compact" onClick={() => onAjuster(15)} aria-label="Ajouter 15 secondes de repos">
              +15 s
            </Bouton>
            <Bouton ton={fini ? "primaire" : "fantome"} taille="compact" onClick={onPasser}>
              {fini ? "C'est reparti" : "Passer le repos"}
            </Bouton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
