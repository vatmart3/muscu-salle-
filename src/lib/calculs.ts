import type { TypeSerie, TypeRecord, Niveau, Objectif, Sexe } from "./types";

/**
 * Calculs du domaine. Un seul endroit dans le front — aucun composant ne
 * recalcule quoi que ce soit à la main.
 *
 * La référence du 1RM est la fonction Postgres `public.epley_1rm` : c'est elle
 * qui écrit les valeurs stockées. L'implémentation ci-dessous n'existe que pour
 * l'affichage optimiste et le mode hors-ligne, et un test de parité garantit
 * qu'elle ne diverge pas (src/lib/calculs.test.ts).
 */

/** Épaisseur minimale d'un disque : on n'affiche jamais plus d'une décimale. */
export function arrondiDecimal(valeur: number, decimales = 1): number {
  const f = 10 ** decimales;
  return Math.round(valeur * f) / f;
}

/** 1RM estimé, formule d'Epley : poids × (1 + reps / 30). */
export function epley1rm(poids: number, reps: number): number {
  if (!Number.isFinite(poids) || !Number.isFinite(reps)) return 0;
  if (poids <= 0 || reps <= 0) return 0;
  if (reps === 1) return arrondiDecimal(poids, 2);
  return arrondiDecimal(poids * (1 + reps / 30), 2);
}

/**
 * Volume d'une série. Les séries d'échauffement ne comptent pas dans le
 * tonnage : sinon un échauffement long gonfle artificiellement la semaine.
 */
export function volumeSerie(serie: { poids: number | null; reps: number | null; type: TypeSerie }): number {
  if (serie.type === "echauffement") return 0;
  const poids = serie.poids ?? 0;
  const reps = serie.reps ?? 0;
  if (poids <= 0 || reps <= 0) return 0;
  return arrondiDecimal(poids * reps, 2);
}

/** Tonnage d'un ensemble de séries. */
export function tonnage(series: ReadonlyArray<{ poids: number | null; reps: number | null; type: TypeSerie }>): number {
  return arrondiDecimal(series.reduce((total, s) => total + volumeSerie(s), 0), 2);
}

/** Nombre de séries qui « comptent » (hors échauffement). */
export function seriesEffectives(series: ReadonlyArray<{ type: TypeSerie }>): number {
  return series.filter((s) => s.type !== "echauffement").length;
}

// ─────────────────────────────── Records ───────────────────────────────

export type RecordConnu = {
  type: TypeRecord;
  valeur: number;
  /** Charge de référence — utile pour `reps_max` (reps à charge égale ou supérieure). */
  poids: number | null;
};

export type RecordTombe = {
  type: TypeRecord;
  valeur: number;
  ancienne: number | null;
  poids: number;
  reps: number;
};

/**
 * Compare une série validée aux records connus de l'exercice.
 * Une série d'échauffement ne bat jamais rien.
 */
export function detecterRecords(
  serie: { poids: number | null; reps: number | null; type: TypeSerie },
  recordsConnus: ReadonlyArray<RecordConnu>,
): RecordTombe[] {
  if (serie.type === "echauffement") return [];
  const poids = serie.poids ?? 0;
  const reps = serie.reps ?? 0;
  if (poids <= 0 || reps <= 0) return [];

  const connu = (type: TypeRecord) => recordsConnus.find((r) => r.type === type);
  const tombes: RecordTombe[] = [];

  const chargeMax = connu("charge_max");
  if (!chargeMax || poids > chargeMax.valeur) {
    tombes.push({ type: "charge_max", valeur: poids, ancienne: chargeMax?.valeur ?? null, poids, reps });
  }

  const rm = epley1rm(poids, reps);
  const rmConnu = connu("1rm_estime");
  if (rm > 0 && (!rmConnu || rm > rmConnu.valeur)) {
    tombes.push({ type: "1rm_estime", valeur: rm, ancienne: rmConnu?.valeur ?? null, poids, reps });
  }

  const vol = arrondiDecimal(poids * reps, 2);
  const volConnu = connu("volume_max");
  if (!volConnu || vol > volConnu.valeur) {
    tombes.push({ type: "volume_max", valeur: vol, ancienne: volConnu?.valeur ?? null, poids, reps });
  }

  // Reps à charge égale : il faut au moins égaler la charge du record précédent.
  const repsConnu = connu("reps_max");
  if (!repsConnu) {
    tombes.push({ type: "reps_max", valeur: reps, ancienne: null, poids, reps });
  } else if (poids >= (repsConnu.poids ?? 0) && reps > repsConnu.valeur) {
    tombes.push({ type: "reps_max", valeur: reps, ancienne: repsConnu.valeur, poids, reps });
  }

  return tombes;
}

// ──────────────────────────── Corps & objectifs ────────────────────────────

export function imc(poidsKg: number, tailleCm: number): number | null {
  if (poidsKg <= 0 || tailleCm <= 0) return null;
  const m = tailleCm / 100;
  return arrondiDecimal(poidsKg / (m * m), 1);
}

export function lectureImc(valeur: number): string {
  if (valeur < 18.5) return "sous la fourchette de référence";
  if (valeur < 25) return "dans la fourchette de référence";
  if (valeur < 30) return "au-dessus de la fourchette de référence";
  return "nettement au-dessus de la fourchette de référence";
}

/** Métabolisme de base, Mifflin-St Jeor. */
export function metabolismeBase(args: {
  sexe: Sexe;
  poidsKg: number;
  tailleCm: number;
  age: number;
}): number | null {
  const { sexe, poidsKg, tailleCm, age } = args;
  if (poidsKg <= 0 || tailleCm <= 0 || age <= 0) return null;
  const base = 10 * poidsKg + 6.25 * tailleCm - 5 * age;
  const ajustement = sexe === "homme" ? 5 : sexe === "femme" ? -161 : -78;
  return Math.round(base + ajustement);
}

/** Dépense quotidienne estimée selon le nombre de séances hebdomadaires. */
export function depenseQuotidienne(mb: number, joursParSemaine: number): number {
  const facteur = joursParSemaine <= 1 ? 1.2 : joursParSemaine <= 3 ? 1.375 : joursParSemaine <= 5 ? 1.55 : 1.725;
  return Math.round(mb * facteur);
}

/** Séries hebdomadaires recommandées par groupe musculaire travaillé. */
export function seriesHebdoRecommandees(niveau: Niveau, objectif: Objectif): { min: number; max: number } {
  const parNiveau: Record<Niveau, { min: number; max: number }> = {
    debutant: { min: 8, max: 12 },
    intermediaire: { min: 12, max: 18 },
    avance: { min: 16, max: 22 },
  };
  const base = parNiveau[niveau];
  if (objectif === "force") return { min: Math.max(6, base.min - 3), max: base.max - 4 };
  if (objectif === "endurance" || objectif === "hyrox") return { min: base.min, max: base.max + 2 };
  return base;
}

export function age(dateNaissance: string | Date, aujourdhui = new Date()): number {
  const d = typeof dateNaissance === "string" ? new Date(dateNaissance) : dateNaissance;
  if (Number.isNaN(d.getTime())) return 0;
  let a = aujourdhui.getFullYear() - d.getFullYear();
  const m = aujourdhui.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && aujourdhui.getDate() < d.getDate())) a -= 1;
  return Math.max(0, a);
}

// ──────────────────────────── Séries temporelles ────────────────────────────

/** Moyenne mobile centrée-arrière, pour lisser le bruit quotidien du poids. */
export function moyenneMobile<T extends { date: string; valeur: number }>(
  points: ReadonlyArray<T>,
  fenetreJours = 7,
): Array<{ date: string; valeur: number; lissee: number }> {
  const tries = [...points].sort((a, b) => a.date.localeCompare(b.date));
  return tries.map((p, i) => {
    const debut = Math.max(0, i - fenetreJours + 1);
    const tranche = tries.slice(debut, i + 1);
    const somme = tranche.reduce((t, x) => t + x.valeur, 0);
    return { ...p, lissee: arrondiDecimal(somme / tranche.length, 2) };
  });
}

/** Écart relatif entre deux valeurs, en pourcentage signé. */
export function progressionRelative(avant: number, apres: number): number | null {
  if (avant <= 0) return null;
  return arrondiDecimal(((apres - avant) / avant) * 100, 1);
}

// ──────────────────────────── Charges & unités ────────────────────────────

const LB_PAR_KG = 2.2046226218;

export function kgVersLb(kg: number): number {
  return arrondiDecimal(kg * LB_PAR_KG, 1);
}
export function lbVersKg(lb: number): number {
  return arrondiDecimal(lb / LB_PAR_KG, 1);
}

/** Pas d'incrément par défaut : 2,5 kg en métrique, 5 lb en impérial. */
export function pasCharge(unite: "kg" | "lb"): number {
  return unite === "kg" ? 2.5 : 5;
}

/** Incrémente une charge en restant sur la grille du pas. */
export function incrementerCharge(valeur: number, pas: number): number {
  const cible = valeur + pas;
  if (cible < 0) return 0;
  return arrondiDecimal(Math.round(cible / pas) * pas, 2);
}

/** Série de semaines consécutives où l'objectif a été atteint. */
export function serieDeSemaines(
  semaines: ReadonlyArray<{ debut: string; seances: number }>,
  objectifHebdo: number,
): number {
  if (objectifHebdo <= 0) return 0;
  const tries = [...semaines].sort((a, b) => b.debut.localeCompare(a.debut));
  let compte = 0;
  for (const s of tries) {
    if (s.seances >= objectifHebdo) compte += 1;
    else break;
  }
  return compte;
}

/**
 * Complète une série hebdomadaire avec les semaines sans séance.
 * Indispensable au calcul de la série : une semaine à zéro n'apparaît pas dans
 * l'agrégat SQL, et son absence ferait croire à une continuité qui n'existe pas.
 */
export function semainesCompletes(
  lignes: ReadonlyArray<{ semaine: string; seances: number; tonnage: number }>,
  nombre: number,
  aujourdhui = new Date(),
): Array<{ debut: string; seances: number; tonnage: number }> {
  const connues = new Map(lignes.map((l) => [l.semaine.slice(0, 10), l]));
  const lundi = new Date(aujourdhui);
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));

  const sortie: Array<{ debut: string; seances: number; tonnage: number }> = [];
  for (let i = 0; i < nombre; i += 1) {
    const debut = new Date(lundi);
    debut.setDate(debut.getDate() - i * 7);
    const cle = `${debut.getFullYear()}-${String(debut.getMonth() + 1).padStart(2, "0")}-${String(debut.getDate()).padStart(2, "0")}`;
    const trouvee = connues.get(cle);
    sortie.push({ debut: cle, seances: trouvee?.seances ?? 0, tonnage: trouvee?.tonnage ?? 0 });
  }
  return sortie;
}

/**
 * Série de semaines en cours. La semaine courante n'est pas encore jouée :
 * elle ne casse pas la série tant qu'elle n'est pas finie, mais elle ne
 * l'allonge que si l'objectif y est déjà atteint.
 */
export function serieEnCours(
  semaines: ReadonlyArray<{ debut: string; seances: number }>,
  objectifHebdo: number,
): number {
  if (objectifHebdo <= 0 || semaines.length === 0) return 0;
  const tries = [...semaines].sort((a, b) => b.debut.localeCompare(a.debut));
  const courante = tries[0]!;
  const reste = courante.seances >= objectifHebdo ? tries : tries.slice(1);
  return serieDeSemaines(reste.map((s) => ({ debut: s.debut, seances: s.seances })), objectifHebdo);
}
