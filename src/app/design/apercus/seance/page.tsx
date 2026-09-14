"use client";
import { useEffect, useState } from "react";
import { useSeance } from "@/stores/seance";
import { EcranSeance } from "@/components/seance/EcranSeance";

const ex = (id: string, nom: string, groupe: string, poids: number, reps: number, faites: number) => ({
  id, exercice_id: id, nom, groupe, typeExercice: "charge" as const,
  instructions: "Omoplates serrées, coudes à 45° du buste.",
  ordre: 0, repos_secondes: 120, note: null, seriesCible: 4, repsCible: reps,
  series: [
    ...Array.from({ length: faites }, (_, i) => ({
      id: `${id}-s${i}`, index_serie: i + 1, poids, reps: reps + (i === 0 ? 2 : 0), secondes: null, metres: null,
      rpe: i === faites - 1 ? 8 : null, type: "normale" as const, validee: true, est_record: false, records: [],
    })),
    { id: `${id}-brouillon`, index_serie: faites + 1, poids, reps, secondes: null, metres: null, rpe: null,
      type: "normale" as const, validee: false, est_record: false, records: [] },
  ],
  derniereFois: { poids, reps, date: new Date(Date.now() - 6 * 86400000).toISOString() },
  recordsConnus: [{ type: "charge_max" as const, valeur: poids + 5, poids: poids + 5 }],
});

export default function Apercu() {
  const [pret, setPret] = useState(false);
  useEffect(() => {
    useSeance.getState().demarrer(
      { id: "apercu", nom: "Push A", modele_id: null, demarree_a: new Date(Date.now() - 1458000).toISOString(), note: null, ressenti: null },
      [
        { ...ex("a", "Développé couché", "pectoraux", 80, 8, 2), ordre: 0 },
        { ...ex("b", "Développé militaire", "epaules", 45, 8, 0), ordre: 1 },
        { ...ex("c", "Dips pectoraux", "pectoraux", 0, 12, 0), ordre: 2 },
        { ...ex("d", "Élévations latérales", "epaules", 10, 15, 0), ordre: 3 },
        { ...ex("e", "Extension poulie corde", "triceps", 25, 12, 0), ordre: 4 },
      ],
    );
    setPret(true);
  }, []);
  if (!pret) return null;
  return <EcranSeance unite="kg" sonActif vibrationActive />;
}
