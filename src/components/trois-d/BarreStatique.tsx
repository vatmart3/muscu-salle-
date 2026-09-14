/**
 * Repli de la barre 3D : même image, en SVG, sans une ligne de JavaScript.
 * Sert de fallback pendant le chargement du canevas, et remplace complètement
 * la scène quand le mouvement réduit est demandé ou que l'appareil est faible.
 */
export function BarreStatique({ titre = "Une barre olympique chargée de disques" }: { titre?: string }) {
  const disques = [
    { x: 96, r: 58, c: "var(--color-accent)" },
    { x: 130, r: 50, c: "var(--color-accent-fort)" },
    { x: 160, r: 40, c: "var(--color-texte)" },
    { x: 404, r: 58, c: "var(--color-accent)" },
    { x: 370, r: 50, c: "var(--color-accent-fort)" },
    { x: 340, r: 40, c: "var(--color-texte)" },
  ];
  return (
    <svg viewBox="0 0 500 180" role="img" aria-label={titre} className="h-full w-full">
      <rect x="60" y="83" width="380" height="14" rx="7" fill="var(--color-surface-creuse)" />
      <rect x="40" y="76" width="60" height="28" rx="6" fill="var(--color-surface-creuse)" />
      <rect x="400" y="76" width="60" height="28" rx="6" fill="var(--color-surface-creuse)" />
      {disques.map((d) => (
        <g key={`${d.x}-${d.r}`}>
          <rect x={d.x - 9} y={90 - d.r} width="18" height={d.r * 2} rx="9" fill={d.c} />
          <rect x={d.x - 3} y={90 - d.r * 0.3} width="6" height={d.r * 0.6} rx="3" fill="var(--color-fond)" opacity=".55" />
        </g>
      ))}
    </svg>
  );
}
