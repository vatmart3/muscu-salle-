"use server";

import { clientServeur } from "@/lib/supabase/server";
import type { PointProgression } from "@/components/graphes/CourbeProgression";

/** Historique de charge max et de 1RM estimé pour un exercice, du plus ancien au plus récent. */
export async function progressionExercice(exerciceId: string): Promise<PointProgression[]> {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const [{ data: lignes }, { data: records }] = await Promise.all([
    supabase.rpc("progression_exercice", { p_exercice_id: exerciceId, p_limite: 60 }),
    supabase
      .from("records")
      .select("obtenu_le")
      .eq("user_id", auth.user.id)
      .eq("exercice_id", exerciceId),
  ]);

  const joursRecord = new Set((records ?? []).map((r) => r.obtenu_le.slice(0, 10)));

  return ((lignes ?? []) as Array<{ jour: string; charge_max: number; rm_estime: number }>)
    .map((l) => ({
      jour: l.jour,
      charge_max: Number(l.charge_max),
      rm_estime: Number(l.rm_estime),
      record: joursRecord.has(l.jour.slice(0, 10)),
    }))
    .sort((a, b) => a.jour.localeCompare(b.jour));
}
