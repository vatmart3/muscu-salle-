"use client";

import { depot } from "./depot";

/**
 * Export CSV de toutes les séries.
 *
 * Côté serveur, c'était une route qui renvoyait un fichier. Ici, tout est déjà
 * dans le navigateur : on fabrique le contenu et on déclenche le
 * téléchargement. C'est aussi la seule sauvegarde qui existe quand les données
 * ne vivent que sur ce téléphone — d'où le bouton bien visible dans le profil.
 */

function echapper(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return "";
  const texte = String(valeur);
  return /[",;\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export async function construireCsv(): Promise<string> {
  const seances = await depot().seances();

  const entetes = [
    "date", "seance", "statut", "duree_secondes", "volume_seance", "ressenti", "note_seance",
    "exercice", "groupe", "serie", "poids", "reps", "secondes", "metres", "rpe", "type", "record",
  ];

  const lignes = [entetes.join(";")];
  for (const seance of seances) {
    for (const exercice of [...seance.exercices].sort((a, b) => a.ordre - b.ordre)) {
      for (const serie of [...exercice.series].sort((a, b) => a.index_serie - b.index_serie)) {
        lignes.push(
          [
            seance.demarree_a, seance.nom, seance.statut, seance.duree_secondes, seance.volume_total,
            seance.ressenti, seance.note, exercice.nom, exercice.groupe, serie.index_serie,
            serie.poids, serie.reps, serie.secondes, serie.metres, serie.rpe, serie.type,
            serie.est_record ? "oui" : "non",
          ]
            .map(echapper)
            .join(";"),
        );
      }
    }
  }

  // BOM UTF-8 : sans lui, Excel affiche « développé couché » en mojibake.
  return `﻿${lignes.join("\n")}`;
}

/** Sauvegarde complète, réimportable. Le CSV se lit, le JSON se restaure. */
export async function construireSauvegarde(): Promise<string> {
  const [profil, seances, mesures, modeles, records] = await Promise.all([
    depot().profil(),
    depot().seances(),
    depot().mesures(),
    depot().modeles(),
    depot().records(),
  ]);
  // Les photos sont volontairement exclues : leur poids ferait un fichier de
  // plusieurs dizaines de mégaoctets, illisible et impossible à envoyer.
  return JSON.stringify(
    { version: 1, exporte_le: new Date().toISOString(), profil, seances, mesures, modeles, records },
    null,
    2,
  );
}

export function telecharger(contenu: string, nom: string, type: string): void {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nom;
  document.body.append(lien);
  lien.click();
  lien.remove();
  // Révocation différée : Safari annule le téléchargement si l'URL disparaît
  // avant que le fichier soit écrit.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
