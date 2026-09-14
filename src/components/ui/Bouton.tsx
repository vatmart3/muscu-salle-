import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type TonBouton = "primaire" | "secondaire" | "fantome" | "inverse" | "signal";
export type TailleBouton = "pouce" | "normal" | "compact";

const TONS: Record<TonBouton, string> = {
  primaire:
    "bg-accent text-white hover:bg-accent-fort active:bg-accent-fort disabled:bg-surface-creuse disabled:text-texte-tenu",
  secondaire:
    "bg-surface text-texte border border-trait hover:bg-surface-creuse active:bg-surface-creuse disabled:text-texte-tenu",
  fantome: "bg-transparent text-accent-fort hover:bg-accent-voile active:bg-accent-voile disabled:text-texte-tenu",
  inverse: "bg-inverse-fond text-inverse-texte hover:opacity-90 active:opacity-80",
  signal: "bg-signal text-white hover:bg-signal-texte active:bg-signal-texte",
};

const TAILLES: Record<TailleBouton, string> = {
  pouce: "min-h-pouce px-7 text-ui",
  normal: "min-h-11 px-5 text-ui",
  compact: "min-h-9 px-4 text-mention",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-pastille font-medium " +
  "transition-[background-color,color,opacity,transform] duration-[var(--duree-breve)] " +
  "ease-[var(--courbe-disque)] active:scale-[.985] disabled:cursor-not-allowed disabled:active:scale-100 " +
  "select-none touch-manipulation";

type Commun = {
  ton?: TonBouton;
  taille?: TailleBouton;
  pleineLargeur?: boolean;
  /** Ajoute l'ombre unique de l'application. Réservé à la pilule de séance. */
  ombree?: boolean;
  children: ReactNode;
  className?: string;
};

export function Bouton({
  ton = "primaire",
  taille = "normal",
  pleineLargeur,
  ombree,
  className,
  children,
  ...rest
}: Commun & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(BASE, TONS[ton], TAILLES[taille], pleineLargeur && "w-full", ombree && "shadow-pilule", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function BoutonLien({
  ton = "primaire",
  taille = "normal",
  pleineLargeur,
  ombree,
  className,
  href,
  children,
  prefetch,
}: Commun & { href: string; prefetch?: boolean }) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(BASE, TONS[ton], TAILLES[taille], pleineLargeur && "w-full", ombree && "shadow-pilule", className)}
    >
      {children}
    </Link>
  );
}
