import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { EspaceAdmin, type Code, type Membre } from "@/components/admin/EspaceAdmin";

export const metadata: Metadata = { title: "Espace admin" };

export default async function PageAdmin() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: moi } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (moi?.role !== "admin") notFound();

  // `activite_salle` couvre tous les membres, contrairement à la vue
  // `classement` qui ne contient que ceux qui ont accepté d'y figurer.
  // Elle n'expose que séances et tonnage : ni mesure, ni photo, ni série.
  const [{ data: activite }, { data: codes }] = await Promise.all([
    supabase.rpc("activite_salle", { p_jours: 30 }),
    supabase
      .from("codes_acces")
      .select("code, actif, utilisations, utilisations_max, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const membres: Membre[] = (activite ?? []).map((ligne) => ({
    id: ligne.membre_id,
    prenom: ligne.prenom,
    role: ligne.role,
    created_at: ligne.inscrit_le,
    seances: Number(ligne.seances),
    tonnage: Number(ligne.tonnage),
  }));

  return <EspaceAdmin membres={membres} codes={(codes ?? []) as Code[]} />;
}
