import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Pastille({
  children,
  ton = "brume",
  className,
}: {
  children: ReactNode;
  ton?: "brume" | "accent" | "signal" | "encre";
  className?: string;
}) {
  const tons = {
    brume: "bg-surface text-texte-doux border-trait",
    accent: "bg-accent-voile text-accent-fort border-transparent",
    signal: "bg-signal-voile text-signal-texte border-transparent",
    encre: "bg-inverse-fond text-inverse-texte border-transparent",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-pastille border px-2.5 py-1 text-mention font-medium whitespace-nowrap",
        tons[ton],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Le disque : marqueur de record, unité graphique de la marque. */
export function Disque({ taille = 10, ton = "signal" }: { taille?: number; ton?: "signal" | "accent" | "encre" }) {
  const fond = ton === "signal" ? "bg-signal" : ton === "accent" ? "bg-accent" : "bg-texte";
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block shrink-0 rounded-pastille", fond)}
      style={{ width: taille, height: taille }}
    />
  );
}
