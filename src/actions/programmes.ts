"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientServeur } from "@/lib/supabase/server";

export type Resultat = { erreur?: string; id?: string; code?: string };

const nom = z.string().trim().min(1, "Il faut un nom.").max(60, "60 caractères maximum.");

async function session() {
  const supabase = await clientServeur();
  const { data } = await supabase.auth.getUser();
  return { supabase, membre: data.user };
}

export async function creerModele(valeurNom: string): Promise<Resultat> {
  const lu = nom.safeParse(valeurNom);
  if (!lu.success) return { erreur: lu.error.issues[0]?.message ?? "Nom invalide." };

  const { supabase, membre } = await session();
  if (!membre) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { data: dernier } = await supabase
    .from("seances_modeles")
    .select("ordre")
    .eq("owner_id", membre.id)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("seances_modeles")
    .insert({ owner_id: membre.id, nom: lu.data, ordre: (dernier?.ordre ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) return { erreur: "Le programme n'a pas pu être créé." };

  revalidatePath("/programmes");
  return { id: data.id };
}

export async function majModele(id: string, champs: { nom?: string; description?: string }): Promise<Resultat> {
  const { supabase } = await session();
  if (champs.nom !== undefined) {
    const lu = nom.safeParse(champs.nom);
    if (!lu.success) return { erreur: lu.error.issues[0]?.message ?? "Nom invalide." };
  }
  const { error } = await supabase
    .from("seances_modeles")
    .update({
      ...(champs.nom !== undefined ? { nom: champs.nom.trim() } : {}),
      ...(champs.description !== undefined ? { description: champs.description.trim() || null } : {}),
    })
    .eq("id", id);
  if (error) return { erreur: "Modification impossible." };
  revalidatePath("/programmes");
  revalidatePath(`/programmes/${id}`);
  return {};
}

export async function supprimerModele(id: string): Promise<Resultat> {
  const { supabase } = await session();
  const { error } = await supabase.from("seances_modeles").delete().eq("id", id);
  if (error) return { erreur: "Suppression impossible." };
  revalidatePath("/programmes");
  return {};
}

export async function dupliquerModele(id: string): Promise<Resultat> {
  const { supabase, membre } = await session();
  if (!membre) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { data: source } = await supabase
    .from("seances_modeles")
    .select("nom, description, couleur, modele_exercices(exercice_id, ordre, series_cible, reps_cible, repos_secondes, notes)")
    .eq("id", id)
    .single();
  if (!source) return { erreur: "Programme introuvable." };

  const { data: dernier } = await supabase
    .from("seances_modeles")
    .select("ordre")
    .eq("owner_id", membre.id)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: copie, error } = await supabase
    .from("seances_modeles")
    .insert({
      owner_id: membre.id,
      nom: `${source.nom} (copie)`.slice(0, 60),
      description: source.description,
      couleur: source.couleur,
      ordre: (dernier?.ordre ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !copie) return { erreur: "La copie n'a pas pu être créée." };

  const lignes = (source.modele_exercices ?? []).map((me) => ({ ...me, modele_id: copie.id, notes: me.notes }));
  if (lignes.length > 0) await supabase.from("modele_exercices").insert(lignes);

  revalidatePath("/programmes");
  return { id: copie.id };
}

export async function reordonnerModeles(ids: string[]): Promise<Resultat> {
  const { supabase } = await session();
  for (const [ordre, id] of ids.entries()) {
    const { error } = await supabase.from("seances_modeles").update({ ordre }).eq("id", id);
    if (error) return { erreur: "Réordonnancement impossible." };
  }
  revalidatePath("/programmes");
  return {};
}

// ───────────────────── Exercices d'un programme ─────────────────────

export async function ajouterAuModele(modeleId: string, exerciceId: string): Promise<Resultat> {
  const { supabase } = await session();
  const { data: dernier } = await supabase
    .from("modele_exercices")
    .select("ordre")
    .eq("modele_id", modeleId)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase
    .from("modele_exercices")
    .insert({ modele_id: modeleId, exercice_id: exerciceId, ordre: (dernier?.ordre ?? -1) + 1 });
  if (error) return { erreur: "L'exercice n'a pas pu être ajouté." };
  revalidatePath(`/programmes/${modeleId}`);
  return {};
}

const schemaCible = z.object({
  series_cible: z.coerce.number().int().min(1).max(20),
  reps_cible: z.coerce.number().int().min(1).max(200),
  repos_secondes: z.coerce.number().int().min(0).max(900),
  notes: z.string().trim().max(300).nullable().optional(),
});

export async function majModeleExercice(
  id: string,
  modeleId: string,
  champs: z.input<typeof schemaCible>,
): Promise<Resultat> {
  const lu = schemaCible.safeParse(champs);
  if (!lu.success) return { erreur: "Valeurs hors limites." };

  const { supabase } = await session();
  const { error } = await supabase
    .from("modele_exercices")
    .update({ ...lu.data, notes: lu.data.notes || null })
    .eq("id", id);
  if (error) return { erreur: "Modification impossible." };
  revalidatePath(`/programmes/${modeleId}`);
  return {};
}

export async function retirerDuModele(id: string, modeleId: string): Promise<Resultat> {
  const { supabase } = await session();
  const { error } = await supabase.from("modele_exercices").delete().eq("id", id);
  if (error) return { erreur: "Suppression impossible." };
  revalidatePath(`/programmes/${modeleId}`);
  return {};
}

export async function reordonnerModeleExercices(modeleId: string, ids: string[]): Promise<Resultat> {
  const { supabase } = await session();
  for (const [ordre, id] of ids.entries()) {
    const { error } = await supabase.from("modele_exercices").update({ ordre }).eq("id", id);
    if (error) return { erreur: "Réordonnancement impossible." };
  }
  revalidatePath(`/programmes/${modeleId}`);
  return {};
}

// ───────────────────────────── Partage ─────────────────────────────

/** Génère (ou renvoie) le code court de partage d'un programme. */
export async function partagerModele(id: string): Promise<Resultat> {
  const { supabase } = await session();

  const { data: existant } = await supabase.from("seances_modeles").select("code_partage").eq("id", id).single();
  if (existant?.code_partage) return { code: existant.code_partage };

  // Le code est court : on retente en cas de collision plutôt que d'allonger.
  for (let essai = 0; essai < 5; essai += 1) {
    const { data: code } = await supabase.rpc("generer_code_partage");
    if (!code) break;
    const { error } = await supabase.from("seances_modeles").update({ code_partage: code }).eq("id", id);
    if (!error) {
      revalidatePath(`/programmes/${id}`);
      return { code };
    }
  }
  return { erreur: "Le code de partage n'a pas pu être créé. Réessaie." };
}

export async function retirerPartage(id: string): Promise<Resultat> {
  const { supabase } = await session();
  const { error } = await supabase.from("seances_modeles").update({ code_partage: null }).eq("id", id);
  if (error) return { erreur: "Impossible de retirer le partage." };
  revalidatePath(`/programmes/${id}`);
  return {};
}

export async function importerParCode(code: string): Promise<Resultat> {
  const { supabase } = await session();
  const { data, error } = await supabase.rpc("importer_modele", { p_code: code.trim().toUpperCase() });
  if (error) {
    return {
      erreur: error.message.includes("modele_introuvable")
        ? "Aucun programme ne correspond à ce code."
        : "L'import a échoué. Réessaie.",
    };
  }
  revalidatePath("/programmes");
  return { id: data ?? undefined };
}
