"use client";

import { useEffect, useRef } from "react";

/**
 * Empêche l'écran de s'éteindre pendant une séance.
 * Le verrou est relâché par le navigateur dès que l'onglet passe en arrière-plan :
 * on le redemande au retour, sinon l'écran s'éteint entre deux séries.
 */
export function useWakeLock(actif: boolean): void {
  const verrou = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!actif || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let annule = false;

    const demander = async () => {
      try {
        if (document.visibilityState !== "visible") return;
        verrou.current = await navigator.wakeLock.request("screen");
      } catch {
        // Batterie faible, onglet masqué, permission refusée : on continue sans.
      }
    };

    const auRetour = () => {
      if (!annule && document.visibilityState === "visible") void demander();
    };

    void demander();
    document.addEventListener("visibilitychange", auRetour);

    return () => {
      annule = true;
      document.removeEventListener("visibilitychange", auRetour);
      void verrou.current?.release().catch(() => {});
      verrou.current = null;
    };
  }, [actif]);
}
