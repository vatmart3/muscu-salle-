import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { Reglages, type ProfilReglages } from "@/components/profil/Reglages";

export const metadata: Metadata = { title: "Profil" };

export default async function PageProfil() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profiles")
    .select(
      "prenom, unite, jours_par_semaine, objectif, theme, son_timer, vibration_timer, classement_visible, relance_active, role",
    )
    .eq("id", auth.user.id)
    .single();

  if (!profil) redirect("/bienvenue");

  return <Reglages profil={profil as ProfilReglages} email={auth.user.email ?? ""} />;
}
