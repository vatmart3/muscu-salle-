"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSeance } from "@/stores/seance";

/**
 * La pilule de séance : flottante, persistante, et le **seul** élément de
 * l'application à porter une ombre. C'est ce qui la désigne comme l'action
 * principale sans avoir besoin d'un mot de plus.
 */
export function PiluleSeance() {
  const chemin = usePathname();
  const [monte, setMonte] = useState(false);
  const seance = useSeance((e) => e.seance);

  // L'état vient de localStorage : on attend l'hydratation pour ne pas
  // afficher « Lancer » une demi-seconde alors qu'une séance tourne.
  useEffect(() => setMonte(true), []);

  if (chemin.startsWith("/seance")) return null;

  const enCours = monte && seance !== null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[calc(4.5rem+max(1rem,env(safe-area-inset-bottom)))] md:pb-8">
      <Link
        href="/seance"
        className="pointer-events-auto inline-flex min-h-pouce items-center gap-2.5 rounded-pastille bg-accent px-7 text-ui font-medium text-white shadow-pilule transition-[background-color,transform] duration-[var(--duree-breve)] ease-[var(--courbe-disque)] hover:bg-accent-fort active:scale-[.985]"
      >
        {enCours && <span aria-hidden="true" className="h-2 w-2 rounded-pastille bg-white" />}
        {enCours ? "Reprendre la séance" : "Lancer une séance"}
      </Link>
    </div>
  );
}
