"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Feuille glissante, ancrée en bas : tout ce qui s'ouvre pendant une séance
 * arrive par le bas, à portée de pouce, jamais au centre de l'écran.
 *
 * Modale pour de vrai : focus déplacé à l'ouverture, rendu au déclencheur à la
 * fermeture, Échap ferme, le fond de page ne défile plus.
 */
export function Feuille({
  titre,
  ouverte,
  onFermer,
  children,
}: {
  titre: string;
  ouverte: boolean;
  onFermer: () => void;
  children: ReactNode;
}) {
  const panneau = useRef<HTMLDivElement>(null);
  const declencheur = useRef<Element | null>(null);
  const mouvementReduit = useReducedMotion();

  useEffect(() => {
    if (!ouverte) return;
    declencheur.current = document.activeElement;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panneau.current?.focus();

    const auClavier = (evenement: KeyboardEvent) => {
      if (evenement.key === "Escape") onFermer();
      if (evenement.key !== "Tab" || !panneau.current) return;
      const cibles = panneau.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const premier = cibles[0];
      const dernier = cibles[cibles.length - 1];
      if (!premier || !dernier) return;
      if (evenement.shiftKey && document.activeElement === premier) {
        evenement.preventDefault();
        dernier.focus();
      } else if (!evenement.shiftKey && document.activeElement === dernier) {
        evenement.preventDefault();
        premier.focus();
      }
    };

    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("keydown", auClavier);
      document.body.style.overflow = precedent;
      (declencheur.current as HTMLElement | null)?.focus?.();
    };
  }, [ouverte, onFermer]);

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onFermer}
        className="absolute inset-0 bg-[rgb(10_22_40/0.38)]"
      />
      <motion.div
        ref={panneau}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        initial={{ y: mouvementReduit ? 0 : "12%", opacity: mouvementReduit ? 0 : 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: mouvementReduit ? 0 : 0.26, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative flex max-h-[86dvh] w-full max-w-lg flex-col rounded-t-[28px] border border-trait bg-fond outline-none"
      >
        <div className="flex items-center justify-between gap-4 border-b border-trait px-5 py-4">
          <h2 className="font-affichage text-bloc font-bold">{titre}</h2>
          <button
            type="button"
            onClick={onFermer}
            className="min-h-11 rounded-pastille px-3 text-mention font-medium text-accent-fort hover:bg-accent-voile"
          >
            Fermer
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-securite">{children}</div>
      </motion.div>
    </div>
  );
}
