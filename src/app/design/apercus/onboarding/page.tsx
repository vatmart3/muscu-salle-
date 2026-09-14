import { Onboarding } from "@/components/onboarding/Onboarding";

export default function Apercu() {
  return (
    <Onboarding
      initiales={{
        prenom: "Martin",
        materiel_dispo: ["barre_olympique", "halteres"],
        unite: "kg",
        jours_par_semaine: 4,
        taille_cm: 178,
        poids_kg: 79,
        objectif: "masse",
        niveau: "intermediaire",
        sexe: "homme",
        date_naissance: "1994-06-12",
      }}
    />
  );
}
