"use client";

import { useEffect, useState } from "react";
import { useSeance } from "@/stores/seance";
import { Squelette } from "@/components/ui/Etats";
import { EcranSeance } from "./EcranSeance";
import { Lanceur, type ModeleResume, type SeanceResume } from "./Lanceur";
import type { ChargeSeance } from "@/actions/seance";
import type { Unite } from "@/lib/types";

/**
 * Aiguillage entre le lanceur et la séance en cours.
 * L'état vient de localStorage : on affiche un squelette le temps de
 * l'hydratation plutôt que de faire clignoter le mauvais écran.
 */
export function PageSeance({
  unite,
  sonActif,
  vibrationActive,
  modeles,
  dernieres,
  seanceOuverte,
}: {
  unite: Unite;
  sonActif: boolean;
  vibrationActive: boolean;
  modeles: ModeleResume[];
  dernieres: SeanceResume[];
  seanceOuverte: { charge: ChargeSeance; ouverteDepuis: number } | null;
}) {
  const [hydrate, setHydrate] = useState(false);
  const seance = useSeance((e) => e.seance);

  useEffect(() => setHydrate(true), []);

  if (!hydrate) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col gap-4 px-5 pt-10">
        <Squelette className="h-8 w-48" />
        <Squelette rayon="bloc" className="h-32 w-full" />
        <Squelette rayon="bloc" className="h-32 w-full" />
      </main>
    );
  }

  if (seance) {
    return <EcranSeance unite={unite} sonActif={sonActif} vibrationActive={vibrationActive} />;
  }

  return <Lanceur modeles={modeles} dernieres={dernieres} seanceOuverte={seanceOuverte} unite={unite} />;
}
