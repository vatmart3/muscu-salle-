import type { Metadata } from "next";
import { BoutonLien } from "@/components/ui/Bouton";
import { HerosBarre } from "@/components/trois-d/HerosBarre";
import { MARQUE } from "@/lib/brand";

export const metadata: Metadata = {
  title: `${MARQUE.nom} — ${MARQUE.baseline}`,
  description: MARQUE.description,
};

/**
 * Accueil public. Une page, courte, plein écran. Pas de landing marketing :
 * les gens qui arrivent ici ont déjà la clé de la salle dans la poche.
 */
export default function Accueil() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 pt-securite">
        <p className="py-5 font-affichage text-bloc font-bold tracking-tight">{MARQUE.nom}</p>
      </header>

      <main id="contenu" className="flex flex-1 flex-col justify-center gap-8 px-5 pb-10">
        <div className="relative mx-auto h-52 w-full max-w-xl sm:h-72">
          <HerosBarre />
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          <h1 className="font-affichage text-titre leading-tight font-bold text-balance sm:text-heros">
            Le carnet de la salle.
          </h1>
          <p className="max-w-prose text-ui text-texte-doux">
            Tu lances ta séance, tu saisis tes séries pendant que tu les fais, et tu retrouves tes charges la fois
            suivante. Rien d&apos;autre.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <BoutonLien href="/inscription" taille="pouce" pleineLargeur className="sm:w-auto">
              Créer mon compte
            </BoutonLien>
            <BoutonLien href="/connexion" ton="secondaire" taille="pouce" pleineLargeur className="sm:w-auto">
              Me connecter
            </BoutonLien>
          </div>

          <p className="text-mention text-texte-tenu">
            L&apos;accès demande le code de la salle. Demande-le à qui t&apos;a ouvert la porte.
          </p>
        </div>
      </main>
    </div>
  );
}
