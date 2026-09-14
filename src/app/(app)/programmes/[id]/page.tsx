import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { EditeurProgramme, type LigneProgramme } from "@/components/programmes/EditeurProgramme";

export const metadata: Metadata = { title: "Programme" };

export default async function PageProgramme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data } = await supabase
    .from("seances_modeles")
    .select(
      "id, nom, description, code_partage, modele_exercices(id, exercice_id, ordre, series_cible, reps_cible, repos_secondes, notes, exercices(nom, groupe_principal))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  const lignes: LigneProgramme[] = (data.modele_exercices ?? [])
    .sort((a, b) => a.ordre - b.ordre)
    .map((me) => ({
      id: me.id,
      exercice_id: me.exercice_id,
      nom: me.exercices?.nom ?? "Exercice supprimé",
      groupe: me.exercices?.groupe_principal ?? "",
      series_cible: me.series_cible,
      reps_cible: me.reps_cible,
      repos_secondes: me.repos_secondes,
      notes: me.notes,
    }));

  return (
    <EditeurProgramme
      id={data.id}
      nom={data.nom}
      description={data.description}
      codePartage={data.code_partage}
      lignes={lignes}
    />
  );
}
