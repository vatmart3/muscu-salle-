import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { seanceEnCours } from "@/actions/seance";
import { PageSeance } from "@/components/seance/PageSeance";

export const metadata: Metadata = { title: "Séance" };

export default async function Seance() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const [{ data: profil }, { data: modeles }, { data: dernieres }, ouverte] = await Promise.all([
    supabase.from("profiles").select("unite, son_timer, vibration_timer, onboarding_termine").eq("id", auth.user.id).single(),
    supabase
      .from("seances_modeles")
      .select("id, nom, description, ordre, modele_exercices(ordre, exercices(nom))")
      .eq("owner_id", auth.user.id)
      .order("ordre"),
    supabase
      .from("seances")
      .select("id, nom, demarree_a, volume_total, duree_secondes")
      .eq("user_id", auth.user.id)
      .eq("statut", "terminee")
      .order("demarree_a", { ascending: false })
      .limit(5),
    seanceEnCours(),
  ]);

  if (!profil?.onboarding_termine) redirect("/bienvenue");

  const listeModeles = (modeles ?? []).map((m) => ({
    id: m.id,
    nom: m.nom,
    description: m.description,
    exercices: (m.modele_exercices ?? [])
      .sort((a, b) => a.ordre - b.ordre)
      .flatMap((me) => (me.exercices ? [me.exercices.nom] : [])),
  }));

  const seanceOuverte = ouverte.charge
    ? {
        charge: ouverte.charge,
        ouverteDepuis: Math.max(
          0,
          Math.floor((Date.now() - new Date(ouverte.charge.seance.demarree_a).getTime()) / 1000),
        ),
      }
    : null;

  return (
    <PageSeance
      unite={profil.unite}
      sonActif={profil.son_timer}
      vibrationActive={profil.vibration_timer}
      modeles={listeModeles}
      dernieres={dernieres ?? []}
      seanceOuverte={seanceOuverte}
    />
  );
}
