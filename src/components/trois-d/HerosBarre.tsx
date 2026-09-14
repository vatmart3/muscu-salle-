"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BarreStatique } from "./BarreStatique";

const BarreChargee = dynamic(() => import("./BarreChargee").then((m) => m.BarreChargee), {
  ssr: false,
  loading: () => <BarreStatique />,
});

/** Un canevas sans WebGL est un rectangle vide : mieux vaut le SVG. */
function supporteWebgl(): boolean {
  try {
    const canevas = document.createElement("canvas");
    return Boolean(canevas.getContext("webgl2") ?? canevas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Décide si la scène 3D a le droit de tourner.
 *
 * Elle est remplacée par son image SVG quand le mouvement réduit est demandé,
 * quand l'appareil est visiblement modeste, ou quand la connexion est en mode
 * économie de données. Une animation d'accueil ne vaut pas une page qui rame.
 */
export function HerosBarre() {
  const [autorisee, setAutorisee] = useState(false);

  useEffect(() => {
    const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coeurs = navigator.hardwareConcurrency ?? 8;
    const memoire = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const reseau = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const modeste = coeurs <= 2 || memoire <= 2 || reseau?.saveData === true;
    setAutorisee(!mouvementReduit && !modeste && supporteWebgl());
  }, []);

  return (
    <div className="relative h-full w-full" aria-hidden={autorisee ? "true" : undefined}>
      {autorisee ? <BarreChargee /> : <BarreStatique />}
    </div>
  );
}
