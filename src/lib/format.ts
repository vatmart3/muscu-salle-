import type { Unite } from "./types";

const nombreFr = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const nombreFrEntier = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** 92.5 → « 92,5 » ; 80 → « 80 ». Jamais de zéro décimal inutile. */
export function nombre(valeur: number | null | undefined): string {
  if (valeur == null || !Number.isFinite(valeur)) return "—";
  return nombreFr.format(valeur);
}

/** 12480 → « 12 480 » (espace insécable fine, chiffres tabulaires côté CSS). */
export function entier(valeur: number | null | undefined): string {
  if (valeur == null || !Number.isFinite(valeur)) return "—";
  return nombreFrEntier.format(Math.round(valeur));
}

export function charge(valeur: number | null | undefined, unite: Unite = "kg"): string {
  if (valeur == null || !Number.isFinite(valeur)) return "—";
  return `${nombre(valeur)} ${unite}`;
}

/** Tonnage : au-delà de 10 t on bascule en tonnes pour rester lisible. */
export function tonnageLisible(kg: number | null | undefined): { valeur: string; unite: string } {
  if (kg == null || !Number.isFinite(kg)) return { valeur: "—", unite: "kg" };
  if (kg >= 10000) return { valeur: nombre(Math.round(kg / 100) / 10), unite: "t" };
  return { valeur: entier(kg), unite: "kg" };
}

/** 3738 → « 1:02:18 » ; 1458 → « 24:18 ». Format chrono, pas format texte. */
export function chrono(secondes: number | null | undefined): string {
  if (secondes == null || !Number.isFinite(secondes) || secondes < 0) return "0:00";
  const s = Math.floor(secondes % 60);
  const m = Math.floor((secondes / 60) % 60);
  const h = Math.floor(secondes / 3600);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0 ? `${h}:${mm}:${String(s).padStart(2, "0")}` : `${mm}:${String(s).padStart(2, "0")}`;
}

/** 3120 → « 52 min » ; 4980 → « 1 h 23 ». Pour les listes, pas pour le chrono. */
export function dureeLisible(secondes: number | null | undefined): string {
  if (secondes == null || !Number.isFinite(secondes) || secondes <= 0) return "—";
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

const jourCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const jourEtMois = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const dateComplete = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

export function jourAbrege(d: string | Date): string {
  return jourCourt.format(typeof d === "string" ? new Date(d) : d);
}
export function jourMois(d: string | Date): string {
  return jourEtMois.format(typeof d === "string" ? new Date(d) : d);
}
export function jourComplet(d: string | Date): string {
  return dateComplete.format(typeof d === "string" ? new Date(d) : d);
}
export function heureCourte(d: string | Date): string {
  return heure.format(typeof d === "string" ? new Date(d) : d);
}

/** « il y a 3 jours », « aujourd'hui », « hier ». */
export function depuis(d: string | Date, maintenant = new Date()): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const jours = Math.floor((debutDeJour(maintenant).getTime() - debutDeJour(date).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 7) return `il y a ${jours} jours`;
  if (jours < 14) return "la semaine dernière";
  if (jours < 60) return `il y a ${Math.floor(jours / 7)} semaines`;
  return `il y a ${Math.floor(jours / 30)} mois`;
}

export function debutDeJour(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lundi de la semaine ISO contenant `d`. */
export function debutDeSemaine(d: Date = new Date()): Date {
  const x = debutDeJour(d);
  const jour = (x.getDay() + 6) % 7; // 0 = lundi
  x.setDate(x.getDate() - jour);
  return x;
}

export function cleJour(d: Date): string {
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/** « Semaine du 8 septembre ». */
export function libelleSemaine(debut: string | Date): string {
  const d = typeof debut === "string" ? new Date(debut) : debut;
  return `Semaine du ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(d)}`;
}

/** Ordinal français : 1 → « 1re », 3 → « 3e ». */
export function rang(n: number): string {
  return n === 1 ? "1re" : `${n}e`;
}
