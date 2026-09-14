"use client";

import { cn } from "@/lib/cn";

/**
 * RPE en arc, pas en curseur plat : dix pastilles posées sur un demi-cercle.
 * C'est la même famille de forme que les anneaux, et la cible reste large
 * quand on vise d'un pouce fatigué.
 */
export function SelecteurRpe({
  valeur,
  onChange,
  className,
}: {
  valeur: number | null;
  onChange: (valeur: number | null) => void;
  className?: string;
}) {
  const rayon = 92;
  const hauteur = rayon + 34;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <p className="etiquette">Effort ressenti</p>
      <div
        role="radiogroup"
        aria-label="Effort ressenti, de 1 à 10"
        className="relative w-full"
        style={{ height: hauteur, maxWidth: rayon * 2 + 48 }}
      >
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const angle = Math.PI - ((n - 1) / 9) * Math.PI;
          const x = 50 + (Math.cos(angle) * rayon * 100) / (rayon * 2 + 48);
          const y = hauteur - 26 - Math.sin(angle) * rayon;
          const actif = valeur === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={actif}
              aria-label={`RPE ${n}`}
              onClick={() => onChange(actif ? null : n)}
              style={{ left: `${x}%`, top: y }}
              className={cn(
                "chiffre absolute flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-pastille border text-mention",
                "transition-[background-color,border-color,color,transform] duration-[var(--duree-breve)]",
                actif
                  ? "scale-110 border-accent bg-accent text-white"
                  : "border-trait bg-surface text-texte-doux",
              )}
            >
              {n}
            </button>
          );
        })}
        <p className="absolute inset-x-0 bottom-0 text-center text-mention text-texte-doux">
          {valeur === null ? "Non noté" : LECTURE[valeur] ?? ""}
        </p>
      </div>
    </div>
  );
}

const LECTURE: Record<number, string> = {
  1: "Très facile",
  2: "Facile",
  3: "Confortable",
  4: "Ça commence",
  5: "Modéré",
  6: "Ça pousse",
  7: "Dur, 3 reps en réserve",
  8: "Très dur, 2 en réserve",
  9: "1 seule en réserve",
  10: "Rien en réserve",
};
