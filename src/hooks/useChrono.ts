"use client";

import { useEffect, useState } from "react";

/**
 * Secondes écoulées depuis un instant donné. Le calcul part de l'horodatage,
 * jamais d'un compteur incrémenté : fermer l'onglet, verrouiller le téléphone
 * ou changer d'application ne fait pas dériver le chrono.
 */
export function useChrono(depuis: string | null, actif = true): number {
  const [secondes, setSecondes] = useState(() => ecoulees(depuis));

  useEffect(() => {
    if (!depuis || !actif) return;
    setSecondes(ecoulees(depuis));
    const battement = setInterval(() => setSecondes(ecoulees(depuis)), 1000);
    const auRetour = () => setSecondes(ecoulees(depuis));
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      clearInterval(battement);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [depuis, actif]);

  return secondes;
}

function ecoulees(depuis: string | null): number {
  if (!depuis) return 0;
  const debut = new Date(depuis).getTime();
  if (Number.isNaN(debut)) return 0;
  return Math.max(0, Math.floor((Date.now() - debut) / 1000));
}

/** Secondes restantes avant un instant futur, avec battement à la seconde. */
export function useCompteARebours(finA: number | null): number {
  const [restant, setRestant] = useState(() => restantes(finA));

  useEffect(() => {
    if (finA === null) return;
    setRestant(restantes(finA));
    const battement = setInterval(() => setRestant(restantes(finA)), 250);
    return () => clearInterval(battement);
  }, [finA]);

  return restant;
}

function restantes(finA: number | null): number {
  if (finA === null) return 0;
  return Math.max(0, Math.ceil((finA - Date.now()) / 1000));
}
