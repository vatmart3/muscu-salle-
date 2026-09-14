import { detecterRecords, tonnage, type RecordConnu } from "@/lib/calculs";
import { cleJour } from "@/lib/format";
import { EXERCICES, exerciceParId, type FicheExercice } from "@/lib/exercices";
import type { Groupe, TypeRecord } from "@/lib/types";
import * as idb from "./idb";
import { MAGASINS } from "./idb";
import {
  cleRecord, profilVierge,
  type ExercicePersoEnregistre, type MesureEnregistree, type ModeleEnregistre,
  type PhotoEnregistree, type ProfilLocal, type RecordEnregistre, type SeanceEnregistree,
} from "./modeles";

/**
 * Dépôt de données.
 *
 * C'est le **seul** endroit de l'application qui sait où vivent les données.
 * Aucun écran n'appelle IndexedDB directement : ils passent tous par ici.
 *
 * C'est ce qui rend la promesse tenable — le jour où les données doivent être
 * partagées entre membres, on écrit un second dépôt qui parle à une base et on
 * change une ligne dans `depot()`. Les écrans, eux, ne bougent pas.
 *
 * Voir `supabase/migrations/` : le schéma relationnel équivalent est conservé
 * dans le dépôt, à jour, pour ce jour-là.
 */

export type Depot = {
  profil(): Promise<ProfilLocal | null>;
  enregistrerProfil(patch: Partial<ProfilLocal>): Promise<ProfilLocal>;

  seances(limite?: number): Promise<SeanceEnregistree[]>;
  seance(id: string): Promise<SeanceEnregistree | null>;
  seanceEnCours(): Promise<SeanceEnregistree | null>;
  enregistrerSeance(seance: SeanceEnregistree): Promise<void>;
  supprimerSeance(id: string): Promise<void>;

  mesures(): Promise<MesureEnregistree[]>;
  enregistrerMesure(mesure: MesureEnregistree): Promise<void>;
  supprimerMesure(date: string): Promise<void>;

  photos(): Promise<PhotoEnregistree[]>;
  ajouterPhoto(photo: PhotoEnregistree): Promise<void>;
  supprimerPhoto(id: string): Promise<void>;

  records(): Promise<RecordEnregistre[]>;
  recordsDeLExercice(exerciceId: string): Promise<RecordConnu[]>;

  modeles(): Promise<ModeleEnregistre[]>;
  modele(id: string): Promise<ModeleEnregistre | null>;
  enregistrerModele(modele: ModeleEnregistre): Promise<void>;
  supprimerModele(id: string): Promise<void>;

  exercices(): Promise<FicheExercice[]>;
  enregistrerExercicePerso(exercice: ExercicePersoEnregistre): Promise<void>;
  supprimerExercicePerso(id: string): Promise<void>;

  toutEffacer(): Promise<void>;
};

/** Identifiant local. `crypto.randomUUID` n'existe pas partout en http. */
export function identifiant(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

const depotLocal: Depot = {
  async profil() {
    return idb.lire<ProfilLocal>(MAGASINS.profil, "moi");
  },

  async enregistrerProfil(patch) {
    const actuel = (await idb.lire<ProfilLocal>(MAGASINS.profil, "moi")) ?? profilVierge();
    const suivant: ProfilLocal = { ...actuel, ...patch, id: "moi", maj_le: new Date().toISOString() };
    await idb.ecrire(MAGASINS.profil, suivant);
    return suivant;
  },

  async seances(limite) {
    const toutes = await idb.lireTout<SeanceEnregistree>(MAGASINS.seances);
    toutes.sort((a, b) => b.demarree_a.localeCompare(a.demarree_a));
    return limite ? toutes.slice(0, limite) : toutes;
  },

  async seance(id) {
    return idb.lire<SeanceEnregistree>(MAGASINS.seances, id);
  },

  async seanceEnCours() {
    const toutes = await idb.lireTout<SeanceEnregistree>(MAGASINS.seances);
    const ouvertes = toutes
      .filter((s) => s.statut === "en_cours")
      .sort((a, b) => b.demarree_a.localeCompare(a.demarree_a));
    return ouvertes[0] ?? null;
  },

  async enregistrerSeance(seance) {
    // Le tonnage est recalculé à l'écriture, jamais reçu de l'appelant :
    // c'est l'équivalent du déclencheur `recalculer_volume_seance` en SQL.
    const volume = tonnage(seance.exercices.flatMap((e) => e.series.filter((s) => s.validee)));
    await idb.ecrire(MAGASINS.seances, { ...seance, volume_total: volume });
    await majRecords(seance);
  },

  async supprimerSeance(id) {
    await idb.supprimer(MAGASINS.seances, id);
    await recalculerTousLesRecords();
  },

  async mesures() {
    const toutes = await idb.lireTout<MesureEnregistree>(MAGASINS.mesures);
    return toutes.sort((a, b) => b.date.localeCompare(a.date));
  },

  async enregistrerMesure(mesure) {
    await idb.ecrire(MAGASINS.mesures, mesure);
  },

  async supprimerMesure(date) {
    await idb.supprimer(MAGASINS.mesures, date);
  },

  async photos() {
    const toutes = await idb.lireTout<PhotoEnregistree>(MAGASINS.photos);
    return toutes.sort((a, b) => b.date.localeCompare(a.date));
  },

  async ajouterPhoto(photo) {
    await idb.ecrire(MAGASINS.photos, photo);
  },

  async supprimerPhoto(id) {
    await idb.supprimer(MAGASINS.photos, id);
  },

  async records() {
    const tous = await idb.lireTout<RecordEnregistre>(MAGASINS.records);
    return tous.sort((a, b) => b.obtenu_le.localeCompare(a.obtenu_le));
  },

  async recordsDeLExercice(exerciceId) {
    const tous = await idb.lireTout<RecordEnregistre>(MAGASINS.records);
    return tous
      .filter((r) => r.exercice_id === exerciceId)
      .map((r) => ({ type: r.type, valeur: r.valeur, poids: r.poids }));
  },

  async modeles() {
    const tous = await idb.lireTout<ModeleEnregistre>(MAGASINS.modeles);
    return tous.sort((a, b) => a.ordre - b.ordre);
  },

  async modele(id) {
    return idb.lire<ModeleEnregistre>(MAGASINS.modeles, id);
  },

  async enregistrerModele(modele) {
    await idb.ecrire(MAGASINS.modeles, modele);
  },

  async supprimerModele(id) {
    await idb.supprimer(MAGASINS.modeles, id);
  },

  async exercices() {
    const perso = await idb.lireTout<ExercicePersoEnregistre>(MAGASINS.exercicesPerso);
    return [...EXERCICES, ...perso].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  },

  async enregistrerExercicePerso(exercice) {
    await idb.ecrire(MAGASINS.exercicesPerso, exercice);
  },

  async supprimerExercicePerso(id) {
    await idb.supprimer(MAGASINS.exercicesPerso, id);
  },

  async toutEffacer() {
    await idb.toutEffacer();
  },
};

export function depot(): Depot {
  return depotLocal;
}

// ─────────────────────────── Records ───────────────────────────

/**
 * Met à jour les records après l'écriture d'une séance.
 *
 * Équivalent local du déclencheur `series_enregistrer_records`. La logique de
 * comparaison elle-même vit dans `lib/calculs.ts`, partagée avec ce que faisait
 * le serveur — et couverte par les mêmes tests.
 */
async function majRecords(seance: SeanceEnregistree): Promise<void> {
  const existants = await idb.lireTout<RecordEnregistre>(MAGASINS.records);
  const parCle = new Map(existants.map((r) => [r.cle, r]));
  const aEcrire: RecordEnregistre[] = [];

  for (const exercice of seance.exercices) {
    for (const serie of exercice.series) {
      if (!serie.validee) continue;

      const connus: RecordConnu[] = [...parCle.values()]
        .filter((r) => r.exercice_id === exercice.exercice_id)
        .map((r) => ({ type: r.type, valeur: r.valeur, poids: r.poids }));

      for (const tombe of detecterRecords(serie, connus)) {
        const cle = cleRecord(exercice.exercice_id, tombe.type);
        const record: RecordEnregistre = {
          cle,
          exercice_id: exercice.exercice_id,
          type: tombe.type,
          valeur: tombe.valeur,
          poids: tombe.poids,
          reps: tombe.reps,
          seance_id: seance.id,
          obtenu_le: seance.terminee_a ?? seance.demarree_a,
        };
        parCle.set(cle, record);
        aEcrire.push(record);
      }
    }
  }

  await idb.ecrirePlusieurs(MAGASINS.records, aEcrire);
}

/**
 * Reconstruit tous les records depuis zéro.
 *
 * Nécessaire après une suppression de séance : un record obtenu pendant une
 * séance effacée n'a plus de raison d'exister, et rien ne permet de le
 * « défaire » autrement que de tout rejouer dans l'ordre.
 */
export async function recalculerTousLesRecords(): Promise<void> {
  await idb.viderMagasin(MAGASINS.records);
  const seances = await idb.lireTout<SeanceEnregistree>(MAGASINS.seances);
  seances.sort((a, b) => a.demarree_a.localeCompare(b.demarree_a));
  for (const seance of seances) {
    if (seance.statut === "en_cours") continue;
    await majRecords(seance);
  }
}

// ─────────────────────────── Agrégats ───────────────────────────

/** Dernière performance validée sur un exercice, hors échauffement. */
export async function dernierePerf(
  exerciceId: string,
  saufSeanceId?: string,
): Promise<{ poids: number | null; reps: number | null; date: string } | null> {
  const seances = await depotLocal.seances();
  for (const seance of seances) {
    if (seance.statut !== "terminee" || seance.id === saufSeanceId) continue;
    const exercice = seance.exercices.find((e) => e.exercice_id === exerciceId);
    if (!exercice) continue;
    const validees = exercice.series.filter((s) => s.validee && s.type !== "echauffement");
    const derniere = validees[validees.length - 1];
    if (derniere) return { poids: derniere.poids, reps: derniere.reps, date: seance.demarree_a };
  }
  return null;
}

/** Volume par groupe musculaire sur une fenêtre glissante. Le secondaire compte pour moitié. */
export async function volumeParGroupe(jours = 7): Promise<Array<{ groupe: string; volume: number; series: number }>> {
  const seuil = Date.now() - jours * 86_400_000;
  const seances = await depotLocal.seances();
  const cumul = new Map<string, { volume: number; series: number }>();

  const ajouter = (groupe: string, volume: number, part: number) => {
    const actuel = cumul.get(groupe) ?? { volume: 0, series: 0 };
    cumul.set(groupe, { volume: actuel.volume + volume * part, series: actuel.series + 1 });
  };

  for (const seance of seances) {
    if (seance.statut !== "terminee" || new Date(seance.demarree_a).getTime() < seuil) continue;
    for (const exercice of seance.exercices) {
      const fiche = exerciceParId(exercice.exercice_id);
      const secondaires: Groupe[] = fiche?.groupes_secondaires ?? [];
      for (const serie of exercice.series) {
        if (!serie.validee || serie.type === "echauffement") continue;
        const volume = (serie.poids ?? 0) * (serie.reps ?? 0);
        if (volume <= 0) continue;
        ajouter(exercice.groupe, volume, 1);
        for (const secondaire of secondaires) ajouter(secondaire, volume, 0.5);
      }
    }
  }

  return [...cumul.entries()]
    .map(([groupe, v]) => ({ groupe, volume: Math.round(v.volume * 100) / 100, series: v.series }))
    .sort((a, b) => b.volume - a.volume);
}

/** Historique de charge max et de 1RM estimé sur un exercice, du plus ancien au plus récent. */
export async function progressionExercice(
  exerciceId: string,
): Promise<Array<{ jour: string; charge_max: number; rm_estime: number; record: boolean }>> {
  const seances = await depotLocal.seances();
  const parJour = new Map<string, { charge_max: number; rm_estime: number; record: boolean }>();

  for (const seance of seances) {
    if (seance.statut !== "terminee") continue;
    const exercice = seance.exercices.find((e) => e.exercice_id === exerciceId);
    if (!exercice) continue;
    const jour = cleJour(new Date(seance.demarree_a));
    const actuel = parJour.get(jour) ?? { charge_max: 0, rm_estime: 0, record: false };

    for (const serie of exercice.series) {
      if (!serie.validee || serie.type === "echauffement") continue;
      const poids = serie.poids ?? 0;
      const reps = serie.reps ?? 0;
      if (poids <= 0 || reps <= 0) continue;
      actuel.charge_max = Math.max(actuel.charge_max, poids);
      actuel.rm_estime = Math.max(actuel.rm_estime, Math.round(poids * (1 + reps / 30) * 100) / 100);
      if (serie.est_record) actuel.record = true;
    }
    if (actuel.charge_max > 0) parJour.set(jour, actuel);
  }

  return [...parJour.entries()]
    .map(([jour, v]) => ({ jour, ...v }))
    .sort((a, b) => a.jour.localeCompare(b.jour));
}

/** Exercices réellement pratiqués, les plus fréquents d'abord. */
export async function exercicesPratiques(): Promise<Array<{ id: string; nom: string; seances: number }>> {
  const seances = await depotLocal.seances();
  const compte = new Map<string, { id: string; nom: string; seances: number }>();
  for (const seance of seances) {
    if (seance.statut !== "terminee") continue;
    for (const exercice of seance.exercices) {
      const actuel = compte.get(exercice.exercice_id);
      compte.set(exercice.exercice_id, {
        id: exercice.exercice_id,
        nom: exercice.nom,
        seances: (actuel?.seances ?? 0) + 1,
      });
    }
  }
  return [...compte.values()].sort((a, b) => b.seances - a.seances || a.nom.localeCompare(b.nom, "fr"));
}

/** Tonnage et nombre de séances par semaine, sur les N dernières semaines. */
export async function tonnageHebdomadaire(
  semaines = 12,
): Promise<Array<{ semaine: string; seances: number; tonnage: number }>> {
  const toutes = await depotLocal.seances();
  const cumul = new Map<string, { seances: number; tonnage: number }>();

  for (const seance of toutes) {
    if (seance.statut !== "terminee") continue;
    const date = new Date(seance.demarree_a);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    const cle = cleJour(date);
    const actuel = cumul.get(cle) ?? { seances: 0, tonnage: 0 };
    cumul.set(cle, { seances: actuel.seances + 1, tonnage: actuel.tonnage + seance.volume_total });
  }

  void semaines;
  return [...cumul.entries()]
    .map(([semaine, v]) => ({ semaine, ...v }))
    .sort((a, b) => b.semaine.localeCompare(a.semaine));
}

export type { TypeRecord };
