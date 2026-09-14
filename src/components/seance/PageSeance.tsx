"use client";

import { useEffect, useState } from "react";
import { useSeance } from "@/stores/seance";
import { Squelette } from "@/components/ui/Etats";
import { depot } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import { seanceOuverte, type ChargeSeance } from "@/lib/donnees/seance";
import { EcranSeance } from "./EcranSeance";
import { Lanceur, type ModeleResume, type SeanceResume } from "./Lanceur";

/**
 * Aiguillage entre le lanceur et la séance en cours.
 * Le magasin Zustand est réhydraté depuis localStorage : on affiche un
 * squelette le temps de l'hydratation plutôt que de faire clignoter le
 * mauvais écran.
 */
export function PageSeance() {
  const [hydrate, setHydrate] = useState(false);
  const seance = useSeance((e) => e.seance);

  useEffect(() => setHydrate(true), []);

  const { donnees, chargement } = useDonnees(async () => {
    const [profil, modeles, seances, ouverte] = await Promise.all([
      depot().profil(),
      depot().modeles(),
      depot().seances(5),
      seanceOuverte(),
    ]);

    const exercices = await depot().exercices();
    const parId = new Map(exercices.map((e) => [e.id, e]));

    const listeModeles: ModeleResume[] = modeles.map((m) => ({
      id: m.id,
      nom: m.nom,
      description: m.description,
      exercices: [...m.exercices]
        .sort((a, b) => a.ordre - b.ordre)
        .flatMap((me) => {
          const fiche = parId.get(me.exercice_id);
          return fiche ? [fiche.nom] : [];
        }),
    }));

    const dernieres: SeanceResume[] = seances
      .filter((s) => s.statut === "terminee")
      .map((s) => ({
        id: s.id,
        nom: s.nom,
        demarree_a: s.demarree_a,
        volume_total: s.volume_total,
        duree_secondes: s.duree_secondes,
      }));

    return { profil, listeModeles, dernieres, ouverte };
  }, []);

  if (!hydrate || chargement) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-5 pt-10">
        <Squelette className="h-8 w-48" />
        <Squelette rayon="bloc" className="h-32 w-full" />
        <Squelette rayon="bloc" className="h-32 w-full" />
      </main>
    );
  }

  const unite = donnees?.profil?.unite ?? "kg";

  if (seance) {
    return (
      <EcranSeance
        unite={unite}
        sonActif={donnees?.profil?.son_timer ?? true}
        vibrationActive={donnees?.profil?.vibration_timer ?? true}
      />
    );
  }

  const ouverte: { charge: ChargeSeance; ouverteDepuis: number } | null = donnees?.ouverte
    ? {
        charge: donnees.ouverte,
        ouverteDepuis: Math.max(
          0,
          Math.floor((Date.now() - new Date(donnees.ouverte.seance.demarree_a).getTime()) / 1000),
        ),
      }
    : null;

  return (
    <Lanceur
      modeles={donnees?.listeModeles ?? []}
      dernieres={donnees?.dernieres ?? []}
      seanceOuverte={ouverte}
      unite={unite}
    />
  );
}
