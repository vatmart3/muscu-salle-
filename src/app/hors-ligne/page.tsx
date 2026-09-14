import type { Metadata } from "next";
import { BoutonLien } from "@/components/ui/Bouton";
import { Anneau } from "@/components/ui/Anneau";
import { MARQUE } from "@/lib/brand";

export const metadata: Metadata = { title: "Hors-ligne" };
export const dynamic = "force-static";

/**
 * Page servie par le service worker quand une navigation échoue sans avoir été
 * mise en cache. Elle dit ce qui se passe et ce qui est conservé — pas juste
 * « pas de connexion ».
 */
export default function PageHorsLigne() {
  return (
    <main id="contenu" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5">
      <Anneau valeur={0.35} taille={96} epaisseur={12} ton="encre" />
      <div className="flex flex-col gap-3">
        <h1 className="font-affichage text-titre font-bold">Pas de réseau.</h1>
        <p className="text-ui text-texte-doux">
          Tes séances, elles, sont là : {MARQUE.nom} écrit tout dans ce navigateur, sans jamais passer par le réseau.
          Seules les pages que tu n&apos;as encore jamais ouvertes ont besoin d&apos;une connexion, le temps d&apos;être
          téléchargées une première fois.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <BoutonLien href="/seance" taille="pouce" pleineLargeur>
          Revenir à ma séance
        </BoutonLien>
        <BoutonLien href="/tableau-de-bord" ton="secondaire" taille="pouce" pleineLargeur>
          Tableau de bord
        </BoutonLien>
      </div>
    </main>
  );
}
