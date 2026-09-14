"use client";

import { Squelette } from "@/components/ui/Etats";
import { depot } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import { Historique, type SeanceHistorique } from "./Historique";

export function PageHistorique() {
  const { donnees, chargement } = useDonnees(async () => {
    const [profil, seances] = await Promise.all([depot().profil(), depot().seances()]);
    const liste: SeanceHistorique[] = seances
      .filter((s) => s.statut !== "en_cours")
      .map((s) => ({
        id: s.id,
        nom: s.nom,
        demarree_a: s.demarree_a,
        volume_total: s.volume_total,
        duree_secondes: s.duree_secondes,
        ressenti: s.ressenti,
        note: s.note,
        exercices: [...s.exercices]
          .sort((a, b) => a.ordre - b.ordre)
          .map((e) => ({
            id: e.id,
            nom: e.nom,
            groupe: e.groupe,
            series: e.series
              .filter((x) => x.validee)
              .sort((a, b) => a.index_serie - b.index_serie)
              .map((x) => ({
                id: x.id,
                index_serie: x.index_serie,
                poids: x.poids,
                reps: x.reps,
                secondes: x.secondes,
                rpe: x.rpe,
                type: x.type,
                est_record: x.est_record,
              })),
          })),
      }));
    return { unite: profil?.unite ?? "kg", liste };
  }, []);

  if (chargement || !donnees) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-securite pb-8">
        <Squelette className="mt-8 h-8 w-40" />
        <Squelette className="h-12 w-full" />
        <Squelette rayon="bloc" className="h-24 w-full" />
        <Squelette rayon="bloc" className="h-24 w-full" />
      </main>
    );
  }

  return <Historique seances={donnees.liste} unite={donnees.unite} />;
}
