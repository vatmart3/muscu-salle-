"use client";

import { useEffect, useRef } from "react";

/**
 * Héros de l'accueil : une barre olympique qui se charge de disques en une
 * séquence orchestrée de deux secondes, puis s'immobilise et suit doucement le
 * curseur ou l'inclinaison du téléphone.
 *
 * En SVG et en CSS, pas en 3D. Arbitrage documenté dans DECISIONS.md : la
 * scène React Three Fiber coûtait une seconde pleine d'évaluation de script
 * sur la seule page qui doit être rapide, et faisait tomber le score de
 * performance mobile à 79. Les deux autres moments 3D (le disque du record, le
 * mur des records) sont derrière l'authentification et restent en 3D.
 *
 * Le JavaScript se limite ici à écrire deux variables CSS : aucun calcul de
 * rendu, aucune bibliothèque.
 */

const DISQUES = [
  { cote: -1, x: 96, r: 58, couleur: "var(--color-accent)", ordre: 0 },
  { cote: 1, x: 404, r: 58, couleur: "var(--color-accent)", ordre: 1 },
  { cote: -1, x: 130, r: 50, couleur: "var(--color-accent-fort)", ordre: 2 },
  { cote: 1, x: 370, r: 50, couleur: "var(--color-accent-fort)", ordre: 3 },
  { cote: -1, x: 158, r: 40, couleur: "var(--color-texte)", ordre: 4 },
  { cote: 1, x: 342, r: 40, couleur: "var(--color-texte)", ordre: 5 },
  { cote: -1, x: 180, r: 30, couleur: "var(--color-accent)", ordre: 6 },
  { cote: 1, x: 320, r: 30, couleur: "var(--color-accent)", ordre: 7 },
];

export function BarreAnimee() {
  const cadre = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cadre.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let image = 0;
    const poser = (x: number, y: number) => {
      cancelAnimationFrame(image);
      image = requestAnimationFrame(() => {
        element.style.setProperty("--incline-y", `${x * 9}deg`);
        element.style.setProperty("--incline-x", `${y * -5}deg`);
      });
    };

    const auCurseur = (evenement: PointerEvent) => {
      const cadrage = element.getBoundingClientRect();
      poser(
        (evenement.clientX - cadrage.left) / cadrage.width - 0.5,
        (evenement.clientY - cadrage.top) / cadrage.height - 0.5,
      );
    };

    // Sur téléphone, c'est l'inclinaison de l'appareil qui pilote. La
    // permission n'est jamais demandée : si elle n'est pas déjà accordée,
    // l'événement ne se déclenche simplement pas.
    const auMouvement = (evenement: DeviceOrientationEvent) => {
      const gamma = evenement.gamma ?? 0;
      const beta = evenement.beta ?? 0;
      poser(Math.max(-1, Math.min(1, gamma / 45)), Math.max(-1, Math.min(1, (beta - 45) / 45)));
    };

    window.addEventListener("pointermove", auCurseur, { passive: true });
    window.addEventListener("deviceorientation", auMouvement, { passive: true });
    return () => {
      cancelAnimationFrame(image);
      window.removeEventListener("pointermove", auCurseur);
      window.removeEventListener("deviceorientation", auMouvement);
    };
  }, []);

  return (
    <div ref={cadre} className="barre-heros h-full w-full">
      <svg
        viewBox="0 0 500 180"
        role="img"
        aria-label="Une barre olympique qui se charge de disques"
        className="h-full w-full"
      >
        <g className="barre-heros__scene">
          {/* La barre et ses manchons */}
          <rect x="60" y="84" width="380" height="12" rx="6" fill="var(--color-surface-creuse)" />
          <rect x="42" y="77" width="56" height="26" rx="6" fill="var(--color-surface-creuse)" />
          <rect x="402" y="77" width="56" height="26" rx="6" fill="var(--color-surface-creuse)" />

          {DISQUES.map((disque) => (
            <g
              key={`${disque.x}-${disque.r}`}
              className="barre-heros__disque"
              style={
                {
                  "--depart": `${disque.cote * 260}px`,
                  "--retard": `${disque.ordre * 0.16}s`,
                  transformOrigin: `${disque.x}px 90px`,
                } as React.CSSProperties
              }
            >
              <rect
                x={disque.x - 9}
                y={90 - disque.r}
                width="18"
                height={disque.r * 2}
                rx="9"
                fill={disque.couleur}
              />
              <rect
                x={disque.x - 3}
                y={90 - disque.r * 0.32}
                width="6"
                height={disque.r * 0.64}
                rx="3"
                fill="var(--color-fond)"
                opacity=".5"
              />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
