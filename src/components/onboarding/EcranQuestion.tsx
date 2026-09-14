"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Anneau } from "@/components/ui/Anneau";
import { typo } from "@/lib/format";
import { cn } from "@/lib/cn";

/**
 * Coquille d'une question d'onboarding.
 *
 * Le retour est toujours accessible, la progression se lit dans un anneau (pas
 * une barre), et l'action principale vit dans le tiers bas — comme partout
 * ailleurs dans l'application.
 */
export function EcranQuestion({
  numero,
  total,
  titre,
  precision,
  onRetour,
  sens,
  cle,
  children,
  pied,
}: {
  numero: number;
  total: number;
  titre: string;
  precision?: string;
  onRetour?: () => void;
  sens: 1 | -1;
  cle: string;
  children: ReactNode;
  pied: ReactNode;
}) {
  const mouvementReduit = useReducedMotion();
  const decalage = mouvementReduit ? 0 : 28 * sens;

  return (
    <div className="flex min-h-dvh flex-col px-5 pt-securite pb-securite">
      <header className="flex items-center justify-between gap-4 py-4">
        <button
          type="button"
          onClick={onRetour}
          disabled={!onRetour}
          className={cn(
            "-ml-2 min-h-11 rounded-pastille px-3 text-ui font-medium",
            "transition-opacity duration-[var(--duree-breve)]",
            onRetour ? "text-accent-fort hover:bg-accent-voile" : "pointer-events-none opacity-0",
          )}
        >
          Retour
        </button>
        <Anneau
          valeur={numero / total}
          taille={44}
          epaisseur={12}
          etiquette={`Question ${numero} sur ${total}`}
        >
          <span className="chiffre text-mention">{numero}</span>
        </Anneau>
      </header>

      <motion.div
        key={cle}
        initial={{ opacity: 0, x: decalage }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -decalage }}
        transition={{ duration: mouvementReduit ? 0 : 0.26, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex flex-1 flex-col"
      >
        <div className="flex flex-col gap-2 pt-2 pb-6">
          <h1 className="font-affichage text-titre font-bold">{typo(titre)}</h1>
          {precision && <p className="text-ui text-texte-doux">{typo(precision)}</p>}
        </div>
        <div className="flex flex-1 flex-col">{children}</div>
      </motion.div>

      <div className="sticky bottom-0 flex flex-col gap-3 bg-fond pt-4">{pied}</div>
    </div>
  );
}
