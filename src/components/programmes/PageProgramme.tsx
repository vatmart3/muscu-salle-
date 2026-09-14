"use client";

import { EtatVide, Squelette } from "@/components/ui/Etats";
import { BoutonLien } from "@/components/ui/Bouton";
import { depot } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import { exerciceParId } from "@/lib/exercices";
import type { Groupe } from "@/lib/types";
import { EditeurProgramme, type LigneProgramme } from "./EditeurProgramme";

export function PageProgramme({ id }: { id: string }) {
  const { donnees, chargement, recharger } = useDonnees(async () => {
    const modele = await depot().modele(id);
    if (!modele) return null;
    const lignes: LigneProgramme[] = [...modele.exercices]
      .sort((a, b) => a.ordre - b.ordre)
      .map((me) => {
        const fiche = exerciceParId(me.exercice_id);
        return {
          id: me.id,
          exercice_id: me.exercice_id,
          nom: fiche?.nom ?? "Exercice inconnu",
          groupe: (fiche?.groupe_principal ?? "corps_entier") as Groupe,
          series_cible: me.series_cible,
          reps_cible: me.reps_cible,
          repos_secondes: me.repos_secondes,
          notes: me.notes,
        };
      });
    return { modele, lignes };
  }, [id]);

  if (chargement) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-securite pb-8">
        <Squelette className="mt-8 h-8 w-52" />
        <Squelette rayon="bloc" className="h-28 w-full" />
        <Squelette rayon="bloc" className="h-28 w-full" />
      </main>
    );
  }

  if (!donnees) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
        <EtatVide
          titre="Ce programme n'existe plus"
          texte="Il a peut-être été supprimé depuis un autre onglet."
          action={<BoutonLien href="/programmes">Revenir aux programmes</BoutonLien>}
        />
      </main>
    );
  }

  return (
    <EditeurProgramme
      id={donnees.modele.id}
      nom={donnees.modele.nom}
      description={donnees.modele.description}
      lignes={donnees.lignes}
      onChangement={recharger}
    />
  );
}
