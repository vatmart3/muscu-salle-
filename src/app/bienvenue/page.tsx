"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Onboarding, type Reponses } from "@/components/onboarding/Onboarding";
import { Squelette } from "@/components/ui/Etats";
import { depot } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import { demanderPersistance } from "@/lib/donnees/idb";

export default function PageBienvenue() {
  const routeur = useRouter();
  const { donnees, chargement } = useDonnees(async () => {
    const [profil, mesures] = await Promise.all([depot().profil(), depot().mesures()]);
    return { profil, poids: mesures[0]?.poids_kg ?? undefined };
  }, []);

  // Les données vivent dans ce navigateur : on demande au système de ne pas
  // les effacer sous pression disque. C'est le bon moment — l'utilisateur
  // vient de décider d'utiliser l'app.
  useEffect(() => {
    void demanderPersistance();
  }, []);

  useEffect(() => {
    if (donnees?.profil?.onboarding_termine) routeur.replace("/tableau-de-bord");
  }, [donnees, routeur]);

  if (chargement) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pt-16">
        <Squelette className="h-8 w-52" />
        <Squelette className="h-5 w-full" />
        <Squelette rayon="bloc" className="h-40 w-full" />
      </main>
    );
  }

  const profil = donnees?.profil;
  const initiales: Reponses = {
    prenom: profil?.prenom || "",
    sexe: profil?.sexe ?? undefined,
    date_naissance: profil?.date_naissance ?? undefined,
    taille_cm: profil?.taille_cm ?? undefined,
    poids_kg: donnees?.poids,
    objectif: profil?.objectif ?? undefined,
    niveau: profil?.niveau ?? undefined,
    jours_par_semaine: profil?.jours_par_semaine ?? undefined,
    materiel_dispo: profil?.materiel_dispo ?? [],
    blessures: profil?.blessures ?? "",
    unite: profil?.unite ?? "kg",
  };

  return <Onboarding initiales={initiales} />;
}
