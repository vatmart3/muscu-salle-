import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  ton?: "brume" | "nue" | "encre" | "signal";
  /** `bloc` = 28px (contenu), `petit` = 18px, `nul` = arêtes vives. */
  rayon?: "bloc" | "petit" | "nul";
  as?: ElementType;
  className?: string;
  children: ReactNode;
};

const TONS = {
  brume: "bg-surface border border-trait",
  nue: "bg-fond border border-trait",
  encre: "bg-inverse-fond text-inverse-texte border border-transparent",
  signal: "bg-signal-voile border border-signal/30",
} as const;

const RAYONS = { bloc: "rounded-bloc", petit: "rounded-bloc-petit", nul: "rounded-nul" } as const;

/**
 * Bloc de contenu. Les surfaces se distinguent par la teinte et le trait 1px,
 * jamais par une ombre portée — la seule ombre de l'app est sous la pilule de séance.
 */
export function Surface({ ton = "brume", rayon = "bloc", as: Balise = "div", className, children }: Props) {
  return <Balise className={cn(TONS[ton], RAYONS[rayon], className)}>{children}</Balise>;
}

/** Intitulé de section : un mot, un trait, rien d'autre. */
export function TitreSection({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="font-ui text-mention font-bold tracking-[.1em] text-texte-doux uppercase">{children}</h2>
      <span className="trait-h flex-1" aria-hidden="true" />
      {action}
    </div>
  );
}
