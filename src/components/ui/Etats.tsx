import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Surface } from "./Surface";

/** Squelette de chargement. Jamais de spinner centré. */
export function Squelette({ className, rayon = "champ" }: { className?: string; rayon?: "champ" | "bloc" | "pastille" }) {
  const rayons = { champ: "rounded-champ", bloc: "rounded-bloc", pastille: "rounded-pastille" } as const;
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse bg-surface-creuse motion-reduce:animate-none", rayons[rayon], className)}
    />
  );
}

/**
 * Écran vide : on ne montre jamais une illustration triste, on donne l'action
 * suivante.
 */
export function EtatVide({
  titre,
  texte,
  action,
  className,
}: {
  titre: string;
  texte: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("flex flex-col items-start gap-3 p-6", className)}>
      <h3 className="font-affichage text-bloc font-bold">{titre}</h3>
      <p className="max-w-prose text-ui text-texte-doux">{texte}</p>
      {action}
    </Surface>
  );
}

/**
 * Erreur : encre inversée. Ce qui s'est passé, puis comment le corriger.
 * Le rouge est réservé aux records — il ne sert jamais d'alerte ici.
 */
export function EtatErreur({
  titre,
  texte,
  action,
  className,
}: {
  titre: string;
  texte: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Surface ton="encre" className={cn("flex flex-col items-start gap-3 p-5", className)} rayon="petit">
      <div role="alert" className="flex flex-col gap-1.5">
        <h3 className="font-affichage text-bloc font-bold">{titre}</h3>
        <p className="max-w-prose text-ui text-inverse-doux">{texte}</p>
      </div>
      {action}
    </Surface>
  );
}

/** Bandeau d'erreur compact, pour les formulaires. */
export function BandeauErreur({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-champ bg-inverse-fond px-4 py-3 text-mention font-medium text-inverse-texte"
    >
      {children}
    </p>
  );
}

/** Confirmation discrète : pas de vert, pas de coche animée. */
export function BandeauFait({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-champ border border-trait bg-surface px-4 py-3 text-mention text-texte">
      {children}
    </p>
  );
}
