"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientServeur } from "@/lib/supabase/server";

export type ResultatAdmin = { erreur?: string; code?: string };

const schemaCode = z.object({
  code: z
    .string()
    .trim()
    .min(4, "Au moins 4 caractères.")
    .max(32, "32 caractères maximum.")
    .regex(/^[A-Za-z0-9-]+$/, "Lettres, chiffres et tirets uniquement.")
    .transform((v) => v.toUpperCase()),
  utilisations_max: z.coerce.number().int().min(1).max(999).nullable().optional(),
});

/**
 * Toutes ces actions s'appuient sur la RLS : la policy `codes_admin_seulement`
 * refuse l'écriture à un membre simple. On ne réimplémente pas le contrôle ici,
 * on le laisse à l'endroit où il ne peut pas être contourné.
 */
export async function creerCode(code: string, utilisationsMax: number | null): Promise<ResultatAdmin> {
  const lu = schemaCode.safeParse({ code, utilisations_max: utilisationsMax });
  if (!lu.success) return { erreur: lu.error.issues[0]?.message ?? "Code invalide." };

  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { error } = await supabase.from("codes_acces").insert({
    code: lu.data.code,
    utilisations_max: lu.data.utilisations_max ?? null,
    cree_par: auth.user.id,
  });
  if (error) {
    return { erreur: error.code === "23505" ? "Ce code existe déjà." : "Création impossible." };
  }
  revalidatePath("/admin");
  return { code: lu.data.code };
}

export async function basculerCode(code: string, actif: boolean): Promise<ResultatAdmin> {
  const supabase = await clientServeur();
  const { error } = await supabase.from("codes_acces").update({ actif }).eq("code", code);
  if (error) return { erreur: "Modification impossible." };
  revalidatePath("/admin");
  return {};
}

export async function supprimerCode(code: string): Promise<ResultatAdmin> {
  const supabase = await clientServeur();
  const { error } = await supabase.from("codes_acces").delete().eq("code", code);
  if (error) return { erreur: "Suppression impossible." };
  revalidatePath("/admin");
  return {};
}
