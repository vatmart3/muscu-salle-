"use client";

import { Squelette } from "@/components/ui/Etats";
import { semainesCompletes } from "@/lib/calculs";
import { depot, exercicesPratiques, tonnageHebdomadaire, volumeParGroupe } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import { Progression } from "./Progression";

export function PageProgression() {
  const { donnees, chargement } = useDonnees(async () => {
    const [profil, exercices, semaines, volumes, seances] = await Promise.all([
      depot().profil(),
      exercicesPratiques(),
      tonnageHebdomadaire(12),
      volumeParGroupe(7),
      depot().seances(),
    ]);

    const douze = semainesCompletes(semaines, 12);
    const seuil = Date.now() - 84 * 86_400_000;
    const recentes = seances.filter(
      (s) => s.statut === "terminee" && new Date(s.demarree_a).getTime() >= seuil,
    );
    const durees = recentes.map((s) => s.duree_secondes ?? 0).filter((d) => d > 0);
    const dureeMoyenne = durees.length ? Math.round(durees.reduce((t, d) => t + d, 0) / durees.length) : 0;

    return {
      unite: profil?.unite ?? ("kg" as const),
      exercices,
      semaines: douze,
      volumes,
      regularite: { seances: recentes.length, dureeMoyenne, fenetre: 84 },
    };
  }, []);

  if (chargement || !donnees) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-securite pb-8">
        <Squelette className="mt-8 h-8 w-44" />
        <Squelette rayon="bloc" className="h-64 w-full" />
        <Squelette rayon="bloc" className="h-40 w-full" />
      </main>
    );
  }

  return (
    <Progression
      exercices={donnees.exercices}
      semaines={donnees.semaines}
      volumes={donnees.volumes}
      regularite={donnees.regularite}
      unite={donnees.unite}
    />
  );
}
