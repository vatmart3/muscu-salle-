"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * Navigation principale : un rail d'encre, libellés en texte seul, actif
 * marqué par un disque. Pas d'icônes, pas cinq onglets : c'est exactement ce
 * qui fait qu'une application de fitness ressemble à toutes les autres.
 *
 * Le fond d'encre inverse le rapport figure/fond du reste de l'app — on
 * reconnaît FONTE au premier coup d'œil, même de loin.
 */
const ENTREES = [
  { href: "/tableau-de-bord", libelle: "Séances" },
  { href: "/historique", libelle: "Historique" },
  { href: "/progression", libelle: "Progrès" },
  { href: "/corps", libelle: "Corps" },
] as const;

export function RailEncre() {
  const chemin = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgb(255_255_255/0.1)] bg-inverse-fond pb-securite md:top-0 md:bottom-auto md:border-t-0 md:border-b"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-between px-2">
        {ENTREES.map(({ href, libelle }) => {
          const actif = chemin === href || chemin.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={actif ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-bloc-petit px-2 text-mention font-medium",
                  "transition-colors duration-[var(--duree-breve)]",
                  actif ? "text-inverse-texte" : "text-inverse-doux hover:text-inverse-texte",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-1.5 w-1.5 rounded-pastille transition-colors duration-[var(--duree-breve)]",
                    actif ? "bg-accent" : "bg-transparent",
                  )}
                />
                {libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
