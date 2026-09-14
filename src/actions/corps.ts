"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientServeur } from "@/lib/supabase/server";
import { erreursDeChamp, schemaMesure } from "@/lib/schemas";
import type { Angle } from "@/lib/types";

export type EtatMesure = { erreurs?: Record<string, string>; message?: string; fait?: boolean };

const BUCKET = "photos-progres";

/** Enregistre ou remplace la mesure du jour. Une seule par date. */
export async function enregistrerMesure(_precedent: EtatMesure, donnees: FormData): Promise<EtatMesure> {
  const brut = Object.fromEntries(donnees.entries());
  const nettoye = Object.fromEntries(
    Object.entries(brut).map(([cle, valeur]) => [cle, valeur === "" ? undefined : valeur]),
  );
  const lu = schemaMesure.safeParse(nettoye);
  if (!lu.success) return { erreurs: erreursDeChamp(lu.error) };

  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "Ta session a expiré. Reconnecte-toi." };

  const { note, ...mesures } = lu.data;
  const { error } = await supabase.from("mesures").upsert(
    { user_id: auth.user.id, ...mesures, note: note || null },
    { onConflict: "user_id,date" },
  );
  if (error) return { message: "La mesure n'a pas pu être enregistrée. Réessaie." };

  revalidatePath("/corps");
  return { fait: true };
}

export async function supprimerMesure(id: string): Promise<{ erreur?: string }> {
  const supabase = await clientServeur();
  const { error } = await supabase.from("mesures").delete().eq("id", id);
  if (error) return { erreur: "Suppression impossible." };
  revalidatePath("/corps");
  return {};
}

// ───────────────────────────── Photos ─────────────────────────────

const schemaPhoto = z.object({
  chemin: z.string().min(1),
  angle: z.enum(["face", "profil", "dos"]),
  date: z.string().min(1),
});

/**
 * Enregistre la ligne d'une photo déjà téléversée par le navigateur.
 *
 * Le fichier passe directement du téléphone au stockage : il ne transite pas
 * par le serveur Next, donc pas de limite de taille de Server Action ni de
 * copie inutile. La RLS du bucket vérifie que le chemin commence bien par
 * l'identifiant du membre.
 */
export async function enregistrerPhoto(donnees: {
  chemin: string;
  angle: Angle;
  date: string;
}): Promise<{ erreur?: string }> {
  const lu = schemaPhoto.safeParse(donnees);
  if (!lu.success) return { erreur: "Photo invalide." };

  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  if (!lu.data.chemin.startsWith(`${auth.user.id}/`)) {
    return { erreur: "Chemin de fichier refusé." };
  }

  const { error } = await supabase.from("photos_progres").insert({
    user_id: auth.user.id,
    angle: lu.data.angle,
    date: lu.data.date,
    storage_path: lu.data.chemin,
  });
  if (error) return { erreur: "La photo n'a pas pu être enregistrée." };

  revalidatePath("/corps");
  return {};
}

export async function supprimerPhoto(id: string, chemin: string): Promise<{ erreur?: string }> {
  const supabase = await clientServeur();
  const { error } = await supabase.from("photos_progres").delete().eq("id", id);
  if (error) return { erreur: "Suppression impossible." };
  await supabase.storage.from(BUCKET).remove([chemin]);
  revalidatePath("/corps");
  return {};
}

/** URL signées de courte durée. Le bucket est privé, il n'y a pas d'URL publique. */
export async function urlsPhotos(chemins: string[]): Promise<Record<string, string>> {
  if (chemins.length === 0) return {};
  const supabase = await clientServeur();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(chemins, 60 * 30);
  const sortie: Record<string, string> = {};
  for (const entree of data ?? []) {
    if (entree.path && entree.signedUrl) sortie[entree.path] = entree.signedUrl;
  }
  return sortie;
}
