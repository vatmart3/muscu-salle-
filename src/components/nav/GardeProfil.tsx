"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { depot } from "@/lib/donnees/depot";

/**
 * Renvoie vers l'onboarding tant qu'il n'y a pas de profil complet.
 *
 * Le contrôle est côté navigateur, forcément : c'est là que vivent les données.
 * Il n'y a rien à protéger au sens de la sécurité — personne d'autre n'a accès
 * à ce téléphone — il s'agit seulement de ne pas afficher un tableau de bord
 * vide à quelqu'un qui n'a pas encore répondu aux questions.
 */
export function GardeProfil() {
  const routeur = useRouter();
  const chemin = usePathname();

  useEffect(() => {
    let annule = false;
    void depot()
      .profil()
      .then((profil) => {
        if (annule) return;
        if (!profil?.onboarding_termine && chemin !== "/bienvenue") routeur.replace("/bienvenue");
      });
    return () => {
      annule = true;
    };
  }, [routeur, chemin]);

  return null;
}
