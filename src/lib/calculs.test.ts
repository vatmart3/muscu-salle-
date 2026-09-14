import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  arrondiDecimal, depenseQuotidienne, detecterRecords, epley1rm, imc, incrementerCharge,
  kgVersLb, lbVersKg, metabolismeBase, moyenneMobile, pasCharge, progressionRelative,
  serieDeSemaines, seriesEffectives, seriesHebdoRecommandees, tonnage, volumeSerie,
} from "./calculs";

describe("1RM d'Epley", () => {
  it("rend la charge telle quelle à une répétition", () => {
    expect(epley1rm(100, 1)).toBe(100);
    expect(epley1rm(92.5, 1)).toBe(92.5);
  });

  it("applique poids × (1 + reps / 30)", () => {
    expect(epley1rm(100, 10)).toBe(133.33);
    expect(epley1rm(80, 8)).toBe(101.33);
    expect(epley1rm(60, 5)).toBe(70);
  });

  it("rend 0 sur une entrée absurde plutôt que NaN", () => {
    expect(epley1rm(0, 10)).toBe(0);
    expect(epley1rm(100, 0)).toBe(0);
    expect(epley1rm(-50, 5)).toBe(0);
    expect(epley1rm(Number.NaN, 5)).toBe(0);
  });

  /**
   * Le front n'a le droit de garder une copie du 1RM que tant qu'elle ne
   * diverge pas de la fonction Postgres qui écrit les valeurs. Ce test lit la
   * migration : si quelqu'un touche la formule en SQL sans toucher au TS, il
   * casse ici.
   */
  it("reste identique à la définition SQL de public.epley_1rm", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/20260914090200_fonctions.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("round(p_poids * (1 + p_reps::numeric / 30), 2)");
    expect(sql).toContain("when p_reps = 1 then round(p_poids, 2)");
  });
});

describe("volume et tonnage", () => {
  it("ne compte pas l'échauffement", () => {
    expect(volumeSerie({ poids: 40, reps: 12, type: "echauffement" })).toBe(0);
    expect(volumeSerie({ poids: 80, reps: 10, type: "normale" })).toBe(800);
    expect(volumeSerie({ poids: 80, reps: 10, type: "degressive" })).toBe(800);
  });

  it("additionne les séries qui comptent", () => {
    const series = [
      { poids: 40, reps: 12, type: "echauffement" as const },
      { poids: 80, reps: 10, type: "normale" as const },
      { poids: 80, reps: 8, type: "echec" as const },
    ];
    expect(tonnage(series)).toBe(1440);
    expect(seriesEffectives(series)).toBe(2);
  });

  it("ignore les valeurs manquantes", () => {
    expect(tonnage([{ poids: null, reps: 10, type: "normale" }])).toBe(0);
    expect(tonnage([{ poids: 80, reps: null, type: "normale" }])).toBe(0);
  });
});

describe("détection de record", () => {
  const connus = [
    { type: "charge_max" as const, valeur: 90, poids: 90 },
    { type: "1rm_estime" as const, valeur: 106.67, poids: 80 },
    { type: "volume_max" as const, valeur: 800, poids: 80 },
    { type: "reps_max" as const, valeur: 10, poids: 80 },
  ];

  it("ne retient rien quand la série n'égale aucun record", () => {
    expect(detecterRecords({ poids: 70, reps: 8, type: "normale" }, connus)).toEqual([]);
  });

  it("retient la charge max quand elle est dépassée", () => {
    const tombes = detecterRecords({ poids: 95, reps: 3, type: "normale" }, connus);
    expect(tombes.map((r) => r.type)).toContain("charge_max");
    expect(tombes.find((r) => r.type === "charge_max")?.ancienne).toBe(90);
  });

  it("exige au moins la charge du record précédent pour battre les reps", () => {
    // 12 reps à 75 kg : plus de reps, mais plus léger que le record à 80 kg.
    const plusLeger = detecterRecords({ poids: 75, reps: 12, type: "normale" }, connus);
    expect(plusLeger.map((r) => r.type)).not.toContain("reps_max");

    const memeCharge = detecterRecords({ poids: 80, reps: 11, type: "normale" }, connus);
    expect(memeCharge.map((r) => r.type)).toContain("reps_max");
  });

  it("ne laisse jamais un échauffement battre quoi que ce soit", () => {
    expect(detecterRecords({ poids: 200, reps: 20, type: "echauffement" }, connus)).toEqual([]);
  });

  it("marque tout en record sur un exercice jamais fait", () => {
    const tombes = detecterRecords({ poids: 60, reps: 5, type: "normale" }, []);
    expect(tombes.map((r) => r.type).sort()).toEqual(["1rm_estime", "charge_max", "reps_max", "volume_max"]);
    expect(tombes.every((r) => r.ancienne === null)).toBe(true);
  });

  it("suit la même règle que le déclencheur SQL sur les reps à charge égale", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/20260914090200_fonctions.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("new.poids >= coalesce(r.poids, 0) and new.reps > r.valeur");
  });
});

describe("corps et objectifs", () => {
  it("calcule l'IMC", () => {
    expect(imc(79, 178)).toBe(24.9);
    expect(imc(0, 180)).toBeNull();
    expect(imc(70, 0)).toBeNull();
  });

  it("applique Mifflin-St Jeor avec l'ajustement de sexe", () => {
    const homme = metabolismeBase({ sexe: "homme", poidsKg: 79, tailleCm: 178, age: 31 });
    const femme = metabolismeBase({ sexe: "femme", poidsKg: 79, tailleCm: 178, age: 31 });
    expect(homme).toBe(1753);
    expect(femme).toBe(1587);
    expect(homme! - femme!).toBe(166);
  });

  it("monte le facteur d'activité avec le nombre de séances", () => {
    expect(depenseQuotidienne(1700, 1)).toBe(2040);
    expect(depenseQuotidienne(1700, 3)).toBe(2338);
    expect(depenseQuotidienne(1700, 6)).toBe(2933);
  });

  it("baisse le volume recommandé pour la force", () => {
    expect(seriesHebdoRecommandees("intermediaire", "masse")).toEqual({ min: 12, max: 18 });
    expect(seriesHebdoRecommandees("intermediaire", "force")).toEqual({ min: 9, max: 14 });
    expect(seriesHebdoRecommandees("debutant", "masse")).toEqual({ min: 8, max: 12 });
  });
});

describe("séries temporelles", () => {
  it("lisse le bruit quotidien du poids", () => {
    const points = [
      { date: "2026-09-01", valeur: 80 },
      { date: "2026-09-02", valeur: 82 },
      { date: "2026-09-03", valeur: 78 },
    ];
    const lisse = moyenneMobile(points, 7);
    expect(lisse[0]?.lissee).toBe(80);
    expect(lisse[1]?.lissee).toBe(81);
    expect(lisse[2]?.lissee).toBe(80);
  });

  it("trie les points avant de lisser", () => {
    const desordre = [
      { date: "2026-09-03", valeur: 78 },
      { date: "2026-09-01", valeur: 80 },
      { date: "2026-09-02", valeur: 82 },
    ];
    expect(moyenneMobile(desordre, 7).map((p) => p.date)).toEqual(["2026-09-01", "2026-09-02", "2026-09-03"]);
  });

  it("calcule une progression relative signée", () => {
    expect(progressionRelative(1000, 1340)).toBe(34);
    expect(progressionRelative(1000, 900)).toBe(-10);
    expect(progressionRelative(0, 500)).toBeNull();
  });

  it("compte les semaines consécutives et s'arrête au premier trou", () => {
    const semaines = [
      { debut: "2026-09-07", seances: 4 },
      { debut: "2026-08-31", seances: 4 },
      { debut: "2026-08-24", seances: 2 },
      { debut: "2026-08-17", seances: 5 },
    ];
    expect(serieDeSemaines(semaines, 4)).toBe(2);
    expect(serieDeSemaines(semaines, 2)).toBe(4);
    expect(serieDeSemaines(semaines, 0)).toBe(0);
  });
});

describe("charges et unités", () => {
  it("convertit dans les deux sens sans dériver", () => {
    expect(kgVersLb(100)).toBe(220.5);
    expect(lbVersKg(220.5)).toBe(100);
  });

  it("reste sur la grille du pas choisi", () => {
    expect(pasCharge("kg")).toBe(2.5);
    expect(pasCharge("lb")).toBe(5);
    expect(incrementerCharge(80, 2.5)).toBe(82.5);
    expect(incrementerCharge(81, 2.5)).toBe(82.5);
    expect(incrementerCharge(80, -2.5)).toBe(77.5);
  });

  it("ne descend jamais sous zéro", () => {
    expect(incrementerCharge(1, -2.5)).toBe(0);
  });

  it("arrondit sans traîner de décimales flottantes", () => {
    expect(arrondiDecimal(0.1 + 0.2, 2)).toBe(0.3);
    expect(arrondiDecimal(133.333333, 2)).toBe(133.33);
  });
});
