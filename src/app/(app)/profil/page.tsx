import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { Reglages, type ProfilReglages } from "@/components/profil/Reglages";
import { MurRecords, type RecordAffiche } from "@/components/profil/MurRecords";
import { TitreSection } from "@/components/ui/Surface";

export const metadata: Metadata = { title: "Profil" };

export default async function PageProfil() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const [{ data: profil }, { data: records }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "prenom, unite, jours_par_semaine, objectif, theme, son_timer, vibration_timer, classement_visible, relance_active, role",
      )
      .eq("id", auth.user.id)
      .single(),
    supabase
      .from("records")
      .select("id, type, valeur, obtenu_le, exercices(nom)")
      .eq("user_id", auth.user.id)
      .order("obtenu_le", { ascending: false })
      .limit(40),
  ]);

  if (!profil) redirect("/bienvenue");

  const listeRecords: RecordAffiche[] = (records ?? []).map((r) => ({
    id: r.id,
    exercice: r.exercices?.nom ?? "Exercice supprimé",
    type: r.type,
    valeur: Number(r.valeur),
    obtenu_le: r.obtenu_le,
  }));

  return (
    <>
      <section className="mx-auto w-full max-w-2xl px-5 pt-securite">
        <div className="pt-4">
          <TitreSection>Mur des records</TitreSection>
        </div>
        <MurRecords records={listeRecords} unite={profil.unite} />
      </section>
      <Reglages profil={profil as ProfilReglages} email={auth.user.email ?? ""} />
    </>
  );
}
