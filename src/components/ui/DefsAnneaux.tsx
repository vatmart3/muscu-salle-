/**
 * Dégradés partagés par tous les anneaux de l'application.
 * Rendus une seule fois dans le layout racine : évite de dupliquer des <defs>
 * (et des identifiants) dans chaque instance d'anneau.
 */
export function DefsAnneaux() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="anneau-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent-fort)" />
        </linearGradient>
        <linearGradient id="anneau-signal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-signal)" />
          <stop offset="100%" stopColor="var(--color-signal-texte)" />
        </linearGradient>
        <linearGradient id="anneau-encre" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-texte)" />
          <stop offset="100%" stopColor="var(--color-texte)" />
        </linearGradient>
      </defs>
    </svg>
  );
}
