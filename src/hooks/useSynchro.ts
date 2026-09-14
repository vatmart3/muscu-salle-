"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { synchroniserSeance } from "@/actions/seance";
import { useSeance } from "@/stores/seance";
import { useEnLigne } from "./useEnLigne";

export type EtatSynchro = "a-jour" | "en-attente" | "hors-ligne" | "erreur";

/**
 * Pousse l'état local vers le serveur dès qu'il bouge, et pas plus vite qu'il
 * ne faut. La salle capte mal : tant que ça ne passe pas, les séries restent
 * dans le téléphone et repartent au retour du réseau.
 *
 * L'envoi est un instantané complet et idempotent, pas un journal
 * d'opérations : rejouer deux fois ne crée rien en double, et un envoi perdu
 * est simplement remplacé par le suivant.
 */
export function useSynchro(): { etat: EtatSynchro; forcer: () => void } {
  const enLigne = useEnLigne();
  const [erreur, setErreur] = useState(false);
  const enVol = useRef(false);
  const aRefaire = useRef(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sale = useSeance((e) => e.sale);
  const seance = useSeance((e) => e.seance);

  const envoyer = useCallback(async () => {
    const etat = useSeance.getState();
    if (!etat.seance) return;
    if (enVol.current) {
      aRefaire.current = true;
      return;
    }
    enVol.current = true;
    const instantane = {
      seance: etat.seance,
      exercices: etat.exercices.map((e) => ({
        id: e.id,
        exercice_id: e.exercice_id,
        ordre: e.ordre,
        repos_secondes: e.repos_secondes,
        note: e.note,
        series: e.series,
      })),
      supprimees: etat.supprimees,
    };
    try {
      const resultat = await synchroniserSeance(instantane);
      if (resultat.erreur) {
        setErreur(true);
      } else {
        setErreur(false);
        useSeance.getState().marquerSynchronisee(Date.now());
        if (resultat.records) useSeance.getState().reconcilier(resultat.records);
      }
    } catch {
      setErreur(true);
    } finally {
      enVol.current = false;
      if (aRefaire.current) {
        aRefaire.current = false;
        void envoyer();
      }
    }
  }, []);

  // Envoi différé : on laisse retomber la rafale de frappes sur les
  // incrémenteurs avant de parler au réseau.
  useEffect(() => {
    if (!seance || !sale || !enLigne) return;
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => void envoyer(), 1200);
    return () => {
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, [sale, enLigne, seance, envoyer]);

  // Retour du réseau : on rattrape immédiatement.
  useEffect(() => {
    if (enLigne && useSeance.getState().sale) void envoyer();
  }, [enLigne, envoyer]);

  // Dernière chance avant que l'onglet disparaisse.
  useEffect(() => {
    const auMasquage = () => {
      if (document.visibilityState === "hidden" && useSeance.getState().sale && navigator.onLine) {
        void envoyer();
      }
    };
    document.addEventListener("visibilitychange", auMasquage);
    return () => document.removeEventListener("visibilitychange", auMasquage);
  }, [envoyer]);

  const etat: EtatSynchro = !enLigne ? "hors-ligne" : erreur ? "erreur" : sale ? "en-attente" : "a-jour";
  return { etat, forcer: () => void envoyer() };
}
