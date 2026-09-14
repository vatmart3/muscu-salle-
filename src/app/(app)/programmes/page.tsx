import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { ListeProgrammes, type ProgrammeResume } from "@/components/programmes/ListeProgrammes";

export const metadata: Metadata = { title: "Programmes" };

export default async function PageProgrammes() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data } = await supabase
    .from("seances_modeles")
    .select("id, nom, description, code_partage, ordre, modele_exercices(ordre, exercices(nom))")
    .eq("owner_id", auth.user.id)
    .order("ordre");

  const programmes: ProgrammeResume[] = (data ?? []).map((m) => ({
    id: m.id,
    nom: m.nom,
    description: m.description,
    code_partage: m.code_partage,
    exercices: (m.modele_exercices ?? [])
      .sort((a, b) => a.ordre - b.ordre)
      .flatMap((me) => (me.exercices ? [me.exercices.nom] : [])),
  }));

  return <ListeProgrammes programmes={programmes} />;
}
