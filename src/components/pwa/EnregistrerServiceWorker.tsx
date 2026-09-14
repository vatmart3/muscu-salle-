"use client";

import { useEffect } from "react";

/**
 * Enregistre le service worker après le premier rendu.
 *
 * En développement il est au contraire **désenregistré** : un worker qui sert
 * une version en cache pendant qu'on modifie le code fait perdre des heures.
 */
export function EnregistrerServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((liste) => {
        for (const enregistrement of liste) void enregistrement.unregister();
      });
      return;
    }

    const enregistrer = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Mode privé, permissions refusées : l'app fonctionne, sans hors-ligne.
      });
    };

    if (document.readyState === "complete") enregistrer();
    else window.addEventListener("load", enregistrer, { once: true });
  }, []);

  return null;
}
