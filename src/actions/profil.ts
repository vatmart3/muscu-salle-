"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { clientServeur } from "@/lib/supabase/server";
import { clientAdmin } from "@/lib/supabase/admin";
import { erreursDeChamp, schemaReglages } from "@/lib/schemas";

export type EtatReglages = { erreurs?: Record<string, string>; message?: string; fait?: boolean };

export async function majReglages(_precedent: EtatReglages, donnees: FormData): Promise<EtatReglages> {
  const lu = schemaReglages.safeParse({
    prenom: donnees.get("prenom"),
    unite: donnees.get("unite"),
    jours_par_semaine: donnees.get("jours_par_semaine"),
    objectif: donnees.get("objectif"),
    theme: donnees.get("theme"),
    son_timer: donnees.get("son_timer") === "on",
    vibration_timer: donnees.get("vibration_timer") === "on",
    classement_visible: donnees.get("classement_visible") === "on",
    relance_active: donnees.get("relance_active") === "on",
  });
  if (!lu.success) return { erreurs: erreursDeChamp(lu.error) };

  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { message: "Ta session a expiré. Reconnecte-toi." };

  const { error } = await supabase.from("profiles").update(lu.data).eq("id", auth.user.id);
  if (error) return { message: "Les réglages n'ont pas pu être enregistrés." };

  revalidatePath("/profil");
  revalidatePath("/tableau-de-bord");
  return { fait: true };
}

/**
 * Suppression de compte. Passe par la clé `service_role` parce que seule
 * l'API d'administration d'Auth peut supprimer un utilisateur — la cascade de
 * la base efface ensuite profil, séances, mesures et records.
 *
 * Les fichiers de stockage ne sont pas couverts par la cascade SQL : on les
 * retire explicitement, sinon les photos survivraient au compte.
 */
export async function supprimerCompte(confirmation: string): Promise<{ erreur?: string }> {
  if (confirmation.trim().toUpperCase() !== "SUPPRIMER") {
    return { erreur: "Écris SUPPRIMER en majuscules pour confirmer." };
  }

  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };
  const membreId = auth.user.id;

  const admin = clientAdmin();

  const { data: fichiers } = await admin.storage.from("photos-progres").list(membreId, { limit: 1000 });
  const chemins: string[] = [];
  for (const dossier of fichiers ?? []) {
    const { data: dedans } = await admin.storage
      .from("photos-progres")
      .list(`${membreId}/${dossier.name}`, { limit: 1000 });
    for (const fichier of dedans ?? []) chemins.push(`${membreId}/${dossier.name}/${fichier.name}`);
  }
  if (chemins.length > 0) await admin.storage.from("photos-progres").remove(chemins);

  const { error } = await admin.auth.admin.deleteUser(membreId);
  if (error) return { erreur: "La suppression a échoué. Réessaie ou préviens l'administrateur de la salle." };

  await supabase.auth.signOut();
  redirect("/");
}
