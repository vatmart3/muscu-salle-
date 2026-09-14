"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { enregistrerInstantane } from "@/lib/donnees/seance";
import { stockageDisponible } from "@/lib/donnees/idb";
import { useSeance } from "@/stores/seance";

export type EtatPersistance = "a-jour" | "en-cours" | "refuse";

/**
 * Écrit la séance en base locale dès qu'elle change.
 *
 * La version précédente parlait à un serveur et devait gérer la perte de
 * réseau, une file de rejeu et des conflits. Ici, l'écriture est locale : elle
 * aboutit ou le navigateur refuse le stockage, et il n'y a pas de troisième
 * cas. Le seul vrai risque est la navigation privée, qu'on signale franchement
 * plutôt que de laisser croire que tout est sauvé.
 *
 * L'état Zustand reste la source d'affichage ; IndexedDB est ce qui permet à la
 * séance d'apparaître ensuite dans l'historique et de nourrir les records.
 */
export function usePersistance(): { etat: EtatPersistance; forcer: () => void } {
  const [refuse, setRefuse] = useState(!stockageDisponible());
  const [enVol, setEnVol] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sale = useSeance((e) => e.sale);
  const seance = useSeance((e) => e.seance);

  const ecrire = useCallback(async () => {
    const etat = useSeance.getState();
    if (!etat.seance) return;
    setEnVol(true);
    try {
      await enregistrerInstantane(
        {
          seance: etat.seance,
          exercices: etat.exercices.map(({ derniereFois: _d, recordsConnus: _r, ...reste }) => reste),
        },
        "en_cours",
      );
      useSeance.getState().marquerSynchronisee(Date.now());
      setRefuse(false);
    } catch {
      setRefuse(true);
    } finally {
      setEnVol(false);
    }
  }, []);

  // Écriture différée : on laisse retomber la rafale de taps sur les
  // incrémenteurs avant d'ouvrir une transaction.
  useEffect(() => {
    if (!seance || !sale) return;
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => void ecrire(), 500);
    return () => {
      if (minuterie.current) clearTimeout(minuterie.current);
    };
  }, [sale, seance, ecrire]);

  // Dernière chance avant que l'onglet disparaisse.
  useEffect(() => {
    const auMasquage = () => {
      if (document.visibilityState === "hidden" && useSeance.getState().sale) void ecrire();
    };
    document.addEventListener("visibilitychange", auMasquage);
    return () => document.removeEventListener("visibilitychange", auMasquage);
  }, [ecrire]);

  const etat: EtatPersistance = refuse ? "refuse" : enVol || sale ? "en-cours" : "a-jour";
  return { etat, forcer: () => void ecrire() };
}
