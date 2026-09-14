import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { Onboarding, type Reponses } from "@/components/onboarding/Onboarding";

export const metadata: Metadata = { title: "Bienvenue" };

export default async function PageBienvenue() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profiles")
    .select(
      "prenom, sexe, date_naissance, taille_cm, objectif, niveau, jours_par_semaine, materiel_dispo, blessures, unite, onboarding_termine",
    )
    .eq("id", auth.user.id)
    .single();

  if (profil?.onboarding_termine) redirect("/tableau-de-bord");

  // Le poids déjà saisi est repris : on peut fermer l'app et revenir.
  const { data: mesure } = await supabase
    .from("mesures")
    .select("poids_kg")
    .eq("user_id", auth.user.id)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const initiales: Reponses = {
    prenom: profil?.prenom ?? "",
    sexe: profil?.sexe ?? undefined,
    date_naissance: profil?.date_naissance ?? undefined,
    taille_cm: profil?.taille_cm ?? undefined,
    poids_kg: mesure?.poids_kg ?? undefined,
    objectif: profil?.objectif ?? undefined,
    niveau: profil?.niveau ?? undefined,
    jours_par_semaine: profil?.jours_par_semaine ?? undefined,
    materiel_dispo: profil?.materiel_dispo ?? [],
    blessures: profil?.blessures ?? "",
    unite: profil?.unite ?? "kg",
  };

  return <Onboarding initiales={initiales} />;
}
