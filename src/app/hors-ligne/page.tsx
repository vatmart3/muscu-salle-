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
          {MARQUE.nom} garde ta séance en cours sur le téléphone : les séries que tu valides sont conservées et
          repartiront dès que la connexion revient. Les pages que tu n&apos;as pas encore ouvertes, elles, ont besoin du
          réseau.
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
