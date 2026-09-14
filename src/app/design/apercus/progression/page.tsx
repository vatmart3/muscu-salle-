import { Progression } from "@/components/progression/Progression";

const semaines = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((i) => {
  const d = new Date("2026-09-07T00:00:00");
  d.setDate(d.getDate() - i * 7);
  const tonnages = [8200, 9100, 0, 11400, 12800, 10900, 13600, 14200, 6300, 15100, 16400, 12480];
  return {
    debut: d.toISOString().slice(0, 10),
    seances: [3, 3, 0, 4, 4, 3, 4, 4, 2, 4, 5, 3][11 - i] ?? 0,
    tonnage: tonnages[11 - i] ?? 0,
  };
});

export default function Apercu() {
  return (
    <Progression
      exercices={[{ id: "x", nom: "Développé couché", seances: 14 }]}
      semaines={semaines}
      volumes={[
        { groupe: "pectoraux", volume: 9800, series: 16 },
        { groupe: "dos", volume: 12400, series: 18 },
        { groupe: "quadriceps", volume: 15200, series: 14 },
        { groupe: "epaules", volume: 4300, series: 12 },
        { groupe: "biceps", volume: 2100, series: 9 },
        { groupe: "triceps", volume: 2600, series: 10 },
        { groupe: "ischios", volume: 6100, series: 8 },
        { groupe: "abdominaux", volume: 900, series: 11 },
        { groupe: "mollets", volume: 3200, series: 6 },
      ]}
      regularite={{ seances: 38, dureeMoyenne: 3180, fenetre: 84 }}
      unite="kg"
    />
  );
}
