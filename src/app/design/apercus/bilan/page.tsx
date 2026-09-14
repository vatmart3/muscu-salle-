"use client";
import { useEffect, useState } from "react";
import { useSeance } from "@/stores/seance";
import { EcranBilan } from "@/components/seance/EcranBilan";

export default function Apercu() {
  const [pret, setPret] = useState(false);
  useEffect(() => {
    const serie = (i: number, poids: number, reps: number, record = false) => ({
      id: `s${i}`, index_serie: i, poids, reps, secondes: null, metres: null, rpe: 8,
      type: "normale" as const, validee: true, est_record: record,
      records: record ? [{ type: "charge_max" as const, valeur: poids, ancienne: poids - 5, poids, reps }] : [],
    });
    useSeance.getState().demarrer(
      { id: "apercu", nom: "Push A", modele_id: null, demarree_a: new Date(Date.now() - 3180000).toISOString(), note: null, ressenti: null },
      [
        { id: "a", exercice_id: "a", nom: "Développé couché", groupe: "pectoraux", typeExercice: "charge", instructions: "",
          ordre: 0, repos_secondes: 120, note: null, seriesCible: 4, repsCible: 8,
          series: [serie(1, 80, 10), serie(2, 80, 9), serie(3, 92.5, 3, true)], derniereFois: null, recordsConnus: [] },
        { id: "b", exercice_id: "b", nom: "Développé militaire", groupe: "epaules", typeExercice: "charge", instructions: "",
          ordre: 1, repos_secondes: 120, note: null, seriesCible: 4, repsCible: 8,
          series: [serie(1, 45, 8), serie(2, 45, 8), serie(3, 45, 7)], derniereFois: null, recordsConnus: [] },
      ],
    );
    setPret(true);
  }, []);
  if (!pret) return null;
  return <EcranBilan />;
}
