"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Rappel de règle : le rouge est confisqué par les records. Une erreur de champ
 * se signale donc par une bordure d'encre 2px et un libellé en gras — pas par
 * une couleur d'alerte. Voir DECISIONS.md (2026-09-14).
 */

const BASE_SAISIE =
  "w-full rounded-champ bg-fond px-4 py-3 text-ui text-texte placeholder:text-texte-tenu " +
  "border border-trait-fort transition-colors duration-[var(--duree-breve)] " +
  "focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 " +
  "disabled:bg-surface disabled:text-texte-tenu";

type Enveloppe = {
  libelle: string;
  aide?: ReactNode;
  erreur?: string | null;
  /** Masque visuellement le libellé, le garde pour les lecteurs d'écran. */
  libelleMasque?: boolean;
  className?: string;
};

function Enrobage({
  id,
  libelle,
  aide,
  erreur,
  libelleMasque,
  className,
  children,
}: Enveloppe & { id: string; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-mention text-texte-doux",
          erreur && "font-bold text-texte",
          libelleMasque && "sr-only",
        )}
      >
        {libelle}
      </label>
      {children}
      {erreur ? (
        <p id={`${id}-erreur`} role="alert" className="text-mention font-medium text-texte">
          {erreur}
        </p>
      ) : aide ? (
        <p id={`${id}-aide`} className="text-mention text-texte-tenu">
          {aide}
        </p>
      ) : null}
    </div>
  );
}

export function Champ({
  libelle,
  aide,
  erreur,
  libelleMasque,
  className,
  ...rest
}: Enveloppe & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Enrobage id={id} libelle={libelle} aide={aide} erreur={erreur} libelleMasque={libelleMasque} className={className}>
      <input
        {...rest}
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        className={cn(BASE_SAISIE, erreur && "border-2 border-texte")}
      />
    </Enrobage>
  );
}

export function ChampTexte({
  libelle,
  aide,
  erreur,
  libelleMasque,
  className,
  ...rest
}: Enveloppe & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Enrobage id={id} libelle={libelle} aide={aide} erreur={erreur} libelleMasque={libelleMasque} className={className}>
      <textarea
        {...rest}
        id={id}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined}
        className={cn(BASE_SAISIE, "min-h-24 resize-y", erreur && "border-2 border-texte")}
      />
    </Enrobage>
  );
}

export function ChampSelect({
  libelle,
  aide,
  erreur,
  libelleMasque,
  className,
  children,
  ...rest
}: Enveloppe & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Enrobage id={id} libelle={libelle} aide={aide} erreur={erreur} libelleMasque={libelleMasque} className={className}>
      <select
        {...rest}
        id={id}
        aria-invalid={erreur ? true : undefined}
        className={cn(BASE_SAISIE, "appearance-none pr-10", erreur && "border-2 border-texte")}
      >
        {children}
      </select>
    </Enrobage>
  );
}

/**
 * Robustesse de mot de passe : quatre segments d'encre qui se remplissent.
 * Pas de barre verte générique — le vert n'existe pas dans cette palette.
 */
export function ForceMotDePasse({ valeur }: { valeur: string }) {
  const score = scoreMotDePasse(valeur);
  const libelles = ["Trop court", "Faible", "Correct", "Solide"] as const;
  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-pastille transition-colors duration-[var(--duree-breve)]",
              i < score ? "bg-texte" : "bg-surface-creuse",
            )}
          />
        ))}
      </div>
      <p className="text-mention text-texte-doux">
        {valeur.length === 0 ? "8 caractères minimum." : libelles[Math.max(0, score - 1)]}
      </p>
    </div>
  );
}

/** 0 à 4. Longueur d'abord, variété ensuite : c'est ce qui protège vraiment. */
export function scoreMotDePasse(valeur: string): number {
  if (valeur.length < 8) return valeur.length === 0 ? 0 : 1;
  let score = 2;
  if (valeur.length >= 12) score += 1;
  const varietes = [/[a-z]/, /[A-Z]/, /\d/, /[^\w\s]/].filter((r) => r.test(valeur)).length;
  if (varietes >= 3 && valeur.length >= 10) score += 1;
  return Math.min(4, score);
}
