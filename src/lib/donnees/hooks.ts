"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProfilLocal } from "./modeles";
import { depot } from "./depot";

/**
 * Lecture asynchrone du dépôt, avec état de chargement.
 *
 * Toutes les pages lisent par ici. Le premier rendu est toujours un squelette :
 * IndexedDB n'existe pas côté serveur, et faire semblant du contraire produit
 * une erreur d'hydratation à chaque écran.
 */
export function useDonnees<T>(
  lecture: () => Promise<T>,
  dependances: React.DependencyList = [],
): { donnees: T | null; chargement: boolean; recharger: () => void } {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [chargement, setChargement] = useState(true);
  const [jeton, setJeton] = useState(0);

  // `lecture` est recréée à chaque rendu par l'appelant : on se fie aux
  // dépendances qu'il déclare, pas à l'identité de la fonction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useCallback(lecture, dependances);

  useEffect(() => {
    let annule = false;
    setChargement(true);
    stable()
      .then((resultat) => {
        if (!annule) setDonnees(resultat);
      })
      .catch(() => {
        if (!annule) setDonnees(null);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    return () => {
      annule = true;
    };
  }, [stable, jeton]);

  return { donnees, chargement, recharger: () => setJeton((j) => j + 1) };
}

export function useProfil() {
  return useDonnees<ProfilLocal | null>(() => depot().profil(), []);
}
