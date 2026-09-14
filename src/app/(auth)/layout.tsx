import Link from "next/link";
import { MARQUE } from "@/lib/brand";

/**
 * Coquille des écrans d'authentification. Pas de carte, pas d'ombre : une
 * colonne calme, le mot-symbole en haut, un anneau ouvert en filigrane qui
 * installe le vocabulaire dès le premier écran.
 */
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -right-40 h-[28rem] w-[28rem] text-surface"
        viewBox="0 0 100 100"
      >
        <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="12" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" strokeWidth="6" />
      </svg>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-securite pb-securite">
        <header className="py-6">
          <Link href="/" className="font-affichage text-bloc font-bold tracking-tight">
            {MARQUE.nom}
          </Link>
        </header>
        <main id="contenu" className="flex flex-1 flex-col justify-center pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}
