"use client";

import { useEffect, useMemo, useState } from "react";
import { Squelette } from "@/components/ui/Etats";
import { depot } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import type { PhotoEnregistree } from "@/lib/donnees/modeles";
import { SuiviCorporel, type PhotoLigne } from "./SuiviCorporel";

export function PageCorps() {
  const { donnees, chargement, recharger } = useDonnees(async () => {
    const [profil, mesures, photos] = await Promise.all([
      depot().profil(),
      depot().mesures(),
      depot().photos(),
    ]);
    return { unite: profil?.unite ?? ("kg" as const), mesures, photos };
  }, []);

  const photos = useMemo(() => donnees?.photos ?? [], [donnees]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  /*
   * Les photos sont des Blob en base : on fabrique une URL d'objet par photo,
   * et surtout on les révoque au démontage. Sans ça, revenir dix fois sur la
   * page laisse dix jeux d'images en mémoire jusqu'au rechargement complet.
   */
  useEffect(() => {
    const fabriquees: Record<string, string> = {};
    for (const photo of photos as PhotoEnregistree[]) {
      fabriquees[photo.id] = URL.createObjectURL(photo.fichier);
    }
    setUrls(fabriquees);
    return () => {
      for (const url of Object.values(fabriquees)) URL.revokeObjectURL(url);
    };
  }, [photos]);

  if (chargement || !donnees) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-securite pb-8">
        <Squelette className="mt-8 h-8 w-48" />
        <Squelette rayon="bloc" className="h-56 w-full" />
        <Squelette rayon="bloc" className="h-40 w-full" />
      </main>
    );
  }

  const avecUrl: PhotoLigne[] = (photos as PhotoEnregistree[]).flatMap((p) =>
    urls[p.id] ? [{ id: p.id, date: p.date, angle: p.angle, url: urls[p.id]! }] : [],
  );

  return (
    <SuiviCorporel
      mesures={donnees.mesures}
      photos={avecUrl}
      unite={donnees.unite}
      onChangement={recharger}
    />
  );
}
