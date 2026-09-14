import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { Anneau } from "@/components/ui/Anneau";
import { TitreSection } from "@/components/ui/Surface";
import { EtatVide } from "@/components/ui/Etats";
import { BoutonLien } from "@/components/ui/Bouton";
import { debutDeSemaine, cleJour, entier, libelleSemaine } from "@/lib/format";

export const metadata: Metadata = { title: "Classement" };

/**
 * Classement de la salle. Prénom, séances, tonnage. Rien d'autre ne sort de la
 * vue `public.classement`, et seuls les membres qui l'ont accepté y figurent.
 */
export default async function PageClassement() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const debut = cleJour(debutDeSemaine());

  const [{ data: profil }, { data: lignes }] = await Promise.all([
    supabase.from("profiles").select("prenom, unite, classement_visible").eq("id", auth.user.id).single(),
    supabase.from("classement").select("membre_id, prenom, semaine, seances, tonnage").eq("semaine", debut),
  ]);

  const unite = profil?.unite ?? "kg";
  const classement = [...(lignes ?? [])].sort((a, b) => b.tonnage - a.tonnage);
  const maximum = Math.max(1, ...classement.map((l) => l.tonnage));

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-securite pb-8">
      <header className="pt-4">
        <h1 className="font-affichage text-titre font-bold">Classement de la salle</h1>
        <p className="mt-1 text-ui text-texte-doux">{libelleSemaine(debut)}. Séances et tonnage, rien d&apos;autre.</p>
      </header>

      {!profil?.classement_visible && (
        <div className="flex flex-col gap-3 rounded-bloc border border-trait bg-surface p-5">
          <h2 className="font-affichage text-bloc font-bold">Tu n&apos;y figures pas</h2>
          <p className="text-ui text-texte-doux">
            Le classement est sur inscription. Il n&apos;affiche que ton prénom, ton nombre de séances et ton tonnage —
            aucune mesure corporelle, aucune photo. Tu peux te retirer à tout moment.
          </p>
          <BoutonLien href="/profil" ton="secondaire" taille="pouce" className="self-start">
            Régler ça dans le profil
          </BoutonLien>
        </div>
      )}

      <section>
        <TitreSection>Cette semaine</TitreSection>
        {classement.length === 0 ? (
          <EtatVide
            titre="Personne pour l'instant"
            texte="Aucun membre inscrit au classement n'a terminé de séance cette semaine."
          />
        ) : (
          <ol className="flex flex-col">
            {classement.map((ligne, rang) => {
              const moi = ligne.membre_id === auth.user.id;
              return (
                <li
                  key={ligne.membre_id}
                  className="flex items-center gap-3 border-b border-trait py-3 last:border-0"
                >
                  <Anneau
                    valeur={ligne.tonnage / maximum}
                    taille={34}
                    epaisseur={13}
                    ton={moi ? "accent" : "encre"}
                    etiquette={`${ligne.prenom}, ${entier(ligne.tonnage)} ${unite}`}
                  >
                    <span className="chiffre text-mention">{rang + 1}</span>
                  </Anneau>
                  <span className="min-w-0 flex-1 truncate text-ui font-medium text-texte">
                    {ligne.prenom}
                    {moi && <span className="ml-2 text-mention text-texte-tenu">toi</span>}
                  </span>
                  <span className="shrink-0 text-mention text-texte-tenu">
                    {ligne.seances} séance{ligne.seances > 1 ? "s" : ""}
                  </span>
                  <span className="chiffre shrink-0 text-bloc">
                    {entier(ligne.tonnage)}
                    <span className="etiquette ml-1">{unite}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <p className="text-mention text-texte-tenu">
        Le classement se remet à zéro chaque lundi. Il ne mesure que le volume déplacé et l&apos;assiduité, pas la
        qualité d&apos;une séance.{" "}
        <Link href="/profil" className="font-medium text-accent-fort underline underline-offset-4">
          Se retirer
        </Link>
      </p>
    </main>
  );
}
