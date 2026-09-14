"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LIBELLE_RECORD } from "@/lib/types";
import { charge, nombre } from "@/lib/format";
import type { RecordTombe } from "@/lib/calculs";

/**
 * Une seule célébration, forte, puis le calme revient.
 * Pas de confettis : un disque de fonte vient s'ajouter sur la barre, le
 * libellé s'affiche une seconde, et l'écran redevient sobre.
 *
 * La scène 3D est chargée à la demande et seulement ici : elle ne pèse jamais
 * sur le bundle de l'écran de séance.
 */
const DisqueQuiTombe = dynamic(() => import("@/components/trois-d/DisqueQuiTombe").then((m) => m.DisqueQuiTombe), {
  ssr: false,
  loading: () => null,
});

export function CelebrationRecord({
  records,
  unite,
  onFini,
}: {
  records: RecordTombe[];
  unite: "kg" | "lb";
  onFini: () => void;
}) {
  const mouvementReduit = useReducedMotion();
  const [visible, setVisible] = useState(true);

  const principal = choisirPrincipal(records);

  useEffect(() => {
    setVisible(true);
    const minuterie = setTimeout(() => setVisible(false), 1600);
    const fin = setTimeout(onFini, 2100);
    return () => {
      clearTimeout(minuterie);
      clearTimeout(fin);
    };
  }, [records, onFini]);

  if (!principal) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: mouvementReduit ? 1 : 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: mouvementReduit ? 0 : 0.22, ease: [0.22, 0.61, 0.36, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 px-5 pb-40"
          role="status"
          aria-live="assertive"
        >
          {!mouvementReduit && <DisqueQuiTombe />}
          <p className="rounded-pastille bg-signal px-5 py-2.5 text-ui font-bold text-white">
            Record — {LIBELLE_RECORD[principal.type]}
          </p>
          <p className="chiffre text-heros text-signal-texte">
            {principal.type === "reps_max"
              ? `${nombre(principal.valeur)} reps`
              : charge(principal.valeur, unite)}
          </p>
          {principal.ancienne !== null && (
            <p className="text-mention text-texte-doux">
              Ancien : {principal.type === "reps_max" ? `${nombre(principal.ancienne)} reps` : charge(principal.ancienne, unite)}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Un seul record est annoncé, même quand quatre tombent d'un coup : sinon la
 * première série d'un nouvel exercice déclenche quatre célébrations.
 * Ordre de préférence : la charge parle plus que le reste.
 */
function choisirPrincipal(records: RecordTombe[]): RecordTombe | undefined {
  const ordre = ["charge_max", "1rm_estime", "reps_max", "volume_max"] as const;
  for (const type of ordre) {
    const trouve = records.find((r) => r.type === type);
    if (trouve) return trouve;
  }
  return records[0];
}
