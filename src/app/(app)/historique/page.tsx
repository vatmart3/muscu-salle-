import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { Historique, type SeanceHistorique } from "@/components/historique/Historique";

export const metadata: Metadata = { title: "Historique" };

export default async function PageHistorique() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const [{ data: profil }, { data: seances }] = await Promise.all([
    supabase.from("profiles").select("unite").eq("id", auth.user.id).single(),
    supabase
      .from("seances")
      .select(
        "id, nom, demarree_a, volume_total, duree_secondes, ressenti, note, seance_exercices(id, ordre, exercices(nom, groupe_principal), series(id, index_serie, poids, reps, secondes, rpe, type, validee, est_record))",
      )
      .eq("user_id", auth.user.id)
      .neq("statut", "en_cours")
      .order("demarree_a", { ascending: false })
      .limit(60),
  ]);

  const liste: SeanceHistorique[] = (seances ?? []).map((s) => ({
    id: s.id,
    nom: s.nom,
    demarree_a: s.demarree_a,
    volume_total: s.volume_total,
    duree_secondes: s.duree_secondes,
    ressenti: s.ressenti,
    note: s.note,
    exercices: (s.seance_exercices ?? [])
      .sort((a, b) => a.ordre - b.ordre)
      .map((sx) => ({
        id: sx.id,
        nom: sx.exercices?.nom ?? "Exercice supprimé",
        groupe: sx.exercices?.groupe_principal ?? "",
        series: (sx.series ?? [])
          .filter((x) => x.validee)
          .sort((a, b) => a.index_serie - b.index_serie)
          .map((x) => ({
            id: x.id,
            index_serie: x.index_serie,
            poids: x.poids,
            reps: x.reps,
            secondes: x.secondes,
            rpe: x.rpe,
            type: x.type,
            est_record: x.est_record,
          })),
      })),
  }));

  return <Historique seances={liste} unite={profil?.unite ?? "kg"} />;
}
