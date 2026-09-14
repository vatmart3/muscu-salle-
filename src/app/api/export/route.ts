import { NextResponse } from "next/server";
import { clientServeur } from "@/lib/supabase/server";

/**
 * Export CSV de toutes les séries du membre.
 *
 * Une route plutôt qu'une Server Action : le navigateur doit recevoir un
 * fichier avec un nom, pas une chaîne à recoller côté client.
 */
function echapper(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const texte = String(valeur);
  return /[",;\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export async function GET() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });

  const { data: seances } = await supabase
    .from("seances")
    .select(
      "nom, demarree_a, duree_secondes, volume_total, ressenti, note, statut, seance_exercices(ordre, exercices(nom, groupe_principal), series(index_serie, poids, reps, secondes, metres, rpe, type, validee, est_record))",
    )
    .eq("user_id", auth.user.id)
    .order("demarree_a", { ascending: false });

  const entetes = [
    "date", "seance", "statut", "duree_secondes", "volume_seance", "ressenti", "note_seance",
    "exercice", "groupe", "serie", "poids", "reps", "secondes", "metres", "rpe", "type", "validee", "record",
  ];

  const lignes: string[] = [entetes.join(";")];
  for (const seance of seances ?? []) {
    for (const lien of (seance.seance_exercices ?? []).sort((a, b) => a.ordre - b.ordre)) {
      for (const serie of (lien.series ?? []).sort((a, b) => a.index_serie - b.index_serie)) {
        lignes.push(
          [
            seance.demarree_a, seance.nom, seance.statut, seance.duree_secondes, seance.volume_total,
            seance.ressenti, seance.note, lien.exercices?.nom, lien.exercices?.groupe_principal,
            serie.index_serie, serie.poids, serie.reps, serie.secondes, serie.metres, serie.rpe,
            serie.type, serie.validee ? "oui" : "non", serie.est_record ? "oui" : "non",
          ]
            .map(echapper)
            .join(";"),
        );
      }
    }
  }

  const jour = new Date().toISOString().slice(0, 10);
  // BOM UTF-8 : sans lui, Excel affiche « développé couché » en mojibake.
  return new NextResponse(`﻿${lignes.join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fonte-${jour}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
