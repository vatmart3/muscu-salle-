"use client";

import { Squelette } from "@/components/ui/Etats";
import { depot } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import { exerciceParId } from "@/lib/exercices";
import { ListeProgrammes, type ProgrammeResume } from "./ListeProgrammes";

export function PageProgrammes() {
  const { donnees, chargement, recharger } = useDonnees(async () => {
    const modeles = await depot().modeles();
    return modeles.map<ProgrammeResume>((m) => ({
      id: m.id,
      nom: m.nom,
      description: m.description,
      exercices: [...m.exercices]
        .sort((a, b) => a.ordre - b.ordre)
        .flatMap((me) => {
          const fiche = exerciceParId(me.exercice_id);
          return fiche ? [fiche.nom] : [];
        }),
    }));
  }, []);

  if (chargement || !donnees) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-securite pb-8">
        <Squelette className="mt-8 h-8 w-44" />
        <Squelette rayon="bloc" className="h-28 w-full" />
        <Squelette rayon="bloc" className="h-28 w-full" />
      </main>
    );
  }

  return <ListeProgrammes programmes={donnees} onChangement={recharger} />;
}
