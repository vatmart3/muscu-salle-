"use server";

import { clientServeur } from "@/lib/supabase/server";

export async function enregistrerAbonnement(abonnement: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<{ erreur?: string }> {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { error } = await supabase
    .from("abonnements_push")
    .upsert({ user_id: auth.user.id, ...abonnement }, { onConflict: "endpoint" });
  if (error) return { erreur: "L'abonnement n'a pas pu être enregistré." };
  return {};
}

export async function retirerAbonnement(endpoint: string): Promise<{ erreur?: string }> {
  const supabase = await clientServeur();
  const { error } = await supabase.from("abonnements_push").delete().eq("endpoint", endpoint);
  if (error) return { erreur: "Le désabonnement a échoué." };
  return {};
}
