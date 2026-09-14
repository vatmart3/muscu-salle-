"use client";

import { useCallback, useEffect, useId, useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

const HAUTEUR_LIGNE = 44;
const LIGNES_VISIBLES = 5;

type Props = {
  libelle: string;
  valeurs: readonly number[];
  valeur: number;
  onChange: (valeur: number) => void;
  /** Rendu d'une valeur (ex. 2,5 → « 2,5 » ; mois 3 → « mars »). */
  formater?: (valeur: number) => string;
  suffixe?: string;
  className?: string;
};

/**
 * Sélecteur à molette. Emprunté aux applications natives : on fait défiler au
 * pouce, la valeur retenue est celle qui s'aligne au centre.
 *
 * Accessible pour de vrai : le conteneur est un `spinbutton` focusable, piloté
 * aux flèches, Page précédente/suivante, Début et Fin. Le défilement au doigt
 * et le clavier écrivent dans le même état.
 */
export function Molette({ libelle, valeurs, valeur, onChange, formater, suffixe, className }: Props) {
  const piste = useRef<HTMLDivElement>(null);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enDefilement = useRef(false);
  const id = useId();

  const index = Math.max(0, valeurs.indexOf(valeur));
  const rendu = useCallback((v: number) => (formater ? formater(v) : String(v).replace(".", ",")), [formater]);

  // Recentre la piste quand la valeur change depuis l'extérieur (clavier,
  // retour arrière dans l'onboarding), jamais pendant un défilement au doigt.
  useEffect(() => {
    const el = piste.current;
    if (!el || enDefilement.current) return;
    const cible = index * HAUTEUR_LIGNE;
    if (Math.abs(el.scrollTop - cible) > 1) {
      el.scrollTo({ top: cible, behavior: "auto" });
    }
  }, [index]);

  function auDefilement() {
    const el = piste.current;
    if (!el) return;
    enDefilement.current = true;
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => {
      enDefilement.current = false;
      const i = Math.round(el.scrollTop / HAUTEUR_LIGNE);
      const v = valeurs[Math.max(0, Math.min(valeurs.length - 1, i))];
      if (v !== undefined && v !== valeur) onChange(v);
    }, 90);
  }

  function deplacer(pas: number) {
    const i = Math.max(0, Math.min(valeurs.length - 1, index + pas));
    const v = valeurs[i];
    if (v !== undefined) onChange(v);
  }

  function auClavier(evenement: KeyboardEvent<HTMLDivElement>) {
    const actions: Record<string, () => void> = {
      ArrowUp: () => deplacer(-1),
      ArrowDown: () => deplacer(1),
      PageUp: () => deplacer(-5),
      PageDown: () => deplacer(5),
      Home: () => deplacer(-valeurs.length),
      End: () => deplacer(valeurs.length),
    };
    const action = actions[evenement.key];
    if (action) {
      evenement.preventDefault();
      action();
    }
  }

  const marge = ((LIGNES_VISIBLES - 1) / 2) * HAUTEUR_LIGNE;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span id={id} className="etiquette">
        {libelle}
      </span>
      <div className="relative">
        {/* Fenêtre de lecture : deux traits, pas un cadre. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 z-10"
          style={{ top: marge, height: HAUTEUR_LIGNE }}
        >
          <span className="absolute inset-x-0 top-0 h-px bg-trait-fort" />
          <span className="absolute inset-x-0 bottom-0 h-px bg-trait-fort" />
        </div>
        <div
          ref={piste}
          role="spinbutton"
          tabIndex={0}
          aria-labelledby={id}
          aria-valuemin={valeurs[0]}
          aria-valuemax={valeurs[valeurs.length - 1]}
          aria-valuenow={valeur}
          aria-valuetext={`${rendu(valeur)}${suffixe ? ` ${suffixe}` : ""}`}
          onScroll={auDefilement}
          onKeyDown={auClavier}
          className="no-scrollbar w-28 snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-champ focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
          style={{
            height: LIGNES_VISIBLES * HAUTEUR_LIGNE,
            paddingTop: marge,
            paddingBottom: marge,
            maskImage: "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 22%, black 78%, transparent)",
          }}
        >
          {valeurs.map((v, i) => (
            <div
              key={v}
              className={cn(
                "flex snap-center items-center justify-center transition-colors duration-[var(--duree-breve)]",
                i === index ? "chiffre text-bloc text-texte" : "text-ui text-texte-tenu",
              )}
              style={{ height: HAUTEUR_LIGNE }}
            >
              {rendu(v)}
            </div>
          ))}
        </div>
      </div>
      {suffixe && <span className="text-mention text-texte-doux">{suffixe}</span>}
    </div>
  );
}

/** Suite de nombres pour alimenter une molette. */
export function suite(debut: number, fin: number, pas = 1): number[] {
  const sortie: number[] = [];
  const decimales = pas < 1 ? 1 : 0;
  for (let v = debut; v <= fin + 1e-9; v += pas) sortie.push(Number(v.toFixed(decimales)));
  return sortie;
}
