import { cn } from "@/lib/cn";

type Taille = "charge" | "heros" | "titre" | "bloc";

const TAILLES: Record<Taille, string> = {
  charge: "text-charge",
  heros: "text-heros",
  titre: "text-titre",
  bloc: "text-bloc",
};

/**
 * Le chiffre est l'image de cette application : il se traite comme de
 * l'affichage, pas comme du texte. Archivo Expanded 700, chiffres tabulaires.
 */
export function Chiffre({
  valeur,
  unite,
  taille = "heros",
  ton,
  className,
}: {
  valeur: string | number;
  unite?: string;
  taille?: Taille;
  ton?: "accent" | "signal" | "doux";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-col items-center leading-none", className)}>
      <span
        className={cn(
          "chiffre",
          TAILLES[taille],
          ton === "accent" && "text-accent-fort",
          ton === "signal" && "text-signal-texte",
          ton === "doux" && "text-texte-doux",
        )}
      >
        {valeur}
      </span>
      {unite && <span className="etiquette mt-1.5">{unite}</span>}
    </span>
  );
}
