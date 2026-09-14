"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Disque } from "@/components/ui/Pastille";
import { LIBELLE_RECORD, type TypeRecord } from "@/lib/types";
import { charge, depuis, nombre } from "@/lib/format";
import type { Unite } from "@/lib/types";

const MurDesRecords = dynamic(() => import("@/components/trois-d/MurDesRecords").then((m) => m.MurDesRecords), {
  ssr: false,
  loading: () => null,
});

export type RecordAffiche = {
  id: string;
  exercice: string;
  type: TypeRecord;
  valeur: number;
  obtenu_le: string;
};

/**
 * Mur des records : chaque record gravé devient un disque sur la barre.
 * La scène 3D est chargée à la demande et remplacée par la liste seule quand
 * le mouvement réduit est demandé — la liste porte déjà toute l'information.
 */
export function MurRecords({ records, unite }: { records: RecordAffiche[]; unite: Unite }) {
  const [troisD, setTroisD] = useState(false);

  useEffect(() => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coeurs = navigator.hardwareConcurrency ?? 8;
    setTroisD(!reduit && coeurs > 2 && records.length > 0);
  }, [records.length]);

  const recent = records[0]?.id;

  return (
    <div className="flex flex-col gap-4">
      {troisD && (
        <MurDesRecords
          disques={records.slice(0, 24).map((r) => ({ id: r.id, libelle: r.exercice, recent: r.id === recent }))}
        />
      )}

      {records.length === 0 ? (
        <p className="text-ui text-texte-doux">
          Aucun record pour l&apos;instant. Le premier tombe dès ta première série validée sur un exercice.
        </p>
      ) : (
        <>
          <p className="text-mention text-texte-doux">
            {records.length} record{records.length > 1 ? "s" : ""} gravé{records.length > 1 ? "s" : ""}. Un disque par
            record, les plus récents à l&apos;extérieur.
          </p>
          <ul className="flex flex-col">
            {records.slice(0, 12).map((record) => (
              <li key={record.id} className="flex items-center gap-3 border-b border-trait py-3 last:border-0">
                <Disque taille={9} ton={record.id === recent ? "signal" : "encre"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-medium text-texte">{record.exercice}</span>
                  <span className="block text-mention text-texte-tenu">
                    {LIBELLE_RECORD[record.type]} · {depuis(record.obtenu_le)}
                  </span>
                </span>
                <span className="chiffre shrink-0 text-bloc">
                  {record.type === "reps_max" ? `${nombre(record.valeur)} reps` : charge(record.valeur, unite)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
