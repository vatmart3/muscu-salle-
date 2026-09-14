import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { Progression, type ExerciceSuivi } from "@/components/progression/Progression";
import { semainesCompletes } from "@/lib/calculs";

export const metadata: Metadata = { title: "Progression" };

export default async function PageProgression() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const [{ data: profil }, { data: semaines }, { data: volumes }, { data: liens }, { data: recentes }] =
    await Promise.all([
      supabase.from("profiles").select("unite").eq("id", auth.user.id).single(),
      supabase.rpc("tonnage_hebdomadaire", { p_semaines: 12 }),
      supabase.rpc("volume_par_groupe", { p_jours: 7 }),
      supabase
        .from("seance_exercices")
        .select("exercice_id, exercices(nom), seances!inner(user_id, statut)")
        .eq("seances.user_id", auth.user.id)
        .eq("seances.statut", "terminee")
        .limit(2000),
      supabase
        .from("seances")
        .select("duree_secondes")
        .eq("user_id", auth.user.id)
        .eq("statut", "terminee")
        .gte("demarree_a", new Date(Date.now() - 84 * 86_400_000).toISOString()),
    ]);

  // Exercices réellement pratiqués, les plus fréquents d'abord.
  const compte = new Map<string, ExerciceSuivi>();
  for (const lien of liens ?? []) {
    const nom = lien.exercices?.nom;
    if (!nom) continue;
    const actuel = compte.get(lien.exercice_id);
    compte.set(lien.exercice_id, { id: lien.exercice_id, nom, seances: (actuel?.seances ?? 0) + 1 });
  }
  const exercices = [...compte.values()].sort((a, b) => b.seances - a.seances || a.nom.localeCompare(b.nom));

  const lignes = (semaines ?? []) as Array<{ semaine: string; seances: number; tonnage: number }>;
  const douze = semainesCompletes(lignes, 12).map((s) => ({
    debut: s.debut,
    seances: s.seances,
    tonnage: Number(s.tonnage),
  }));

  const durees = (recentes ?? []).map((s) => s.duree_secondes ?? 0).filter((d) => d > 0);
  const dureeMoyenne = durees.length ? Math.round(durees.reduce((t, d) => t + d, 0) / durees.length) : 0;

  return (
    <Progression
      exercices={exercices}
      semaines={douze}
      volumes={(volumes ?? []).map((v) => ({ ...v, volume: Number(v.volume), series: Number(v.series) }))}
      regularite={{ seances: recentes?.length ?? 0, dureeMoyenne, fenetre: 84 }}
      unite={profil?.unite ?? "kg"}
    />
  );
}
