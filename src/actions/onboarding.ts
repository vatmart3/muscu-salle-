"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { clientServeur } from "@/lib/supabase/server";
import { schemaOnboarding } from "@/lib/schemas";
import { MODELES, dosage, seancesRetenues } from "@/lib/programmes";
import { cleJour } from "@/lib/format";

/** Une étape enregistre ce qu'elle sait, rien de plus : on peut fermer et reprendre. */
const schemaEtape = schemaOnboarding.partial().extend({
  poids_kg: z.coerce.number().min(20).max(400).optional(),
});

export type EtatEtape = { erreur?: string };

export async function sauverEtape(patch: unknown): Promise<EtatEtape> {
  const lu = schemaEtape.safeParse(patch);
  if (!lu.success) return { erreur: "Cette réponse n'est pas valable." };

  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { poids_kg, blessures, ...profil } = lu.data;

  if (Object.keys(profil).length > 0 || blessures !== undefined) {
    const { error } = await supabase
      .from("profiles")
      .update({ ...profil, ...(blessures !== undefined ? { blessures: blessures || null } : {}) })
      .eq("id", auth.user.id);
    if (error) return { erreur: "Impossible d'enregistrer pour l'instant. Ta réponse est gardée à l'écran." };
  }

  // Le poids n'est pas une donnée de profil : c'est la première mesure.
  if (poids_kg !== undefined) {
    const { error } = await supabase
      .from("mesures")
      .upsert({ user_id: auth.user.id, date: cleJour(new Date()), poids_kg }, { onConflict: "user_id,date" });
    if (error) return { erreur: "Le poids n'a pas pu être enregistré. Réessaie à l'étape suivante." };
  }

  return {};
}

/**
 * Construit un programme à partir d'un modèle et du matériel réellement
 * disponible : pour chaque emplacement, le premier exercice candidat que le
 * membre peut faire chez lui.
 */
export async function creerProgramme(cleModele: string): Promise<EtatEtape> {
  const modele = MODELES.find((m) => m.cle === cleModele);
  if (!modele) return { erreur: "Ce programme n'existe pas." };

  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  const { data: profil } = await supabase
    .from("profiles")
    .select("materiel_dispo, objectif, niveau, jours_par_semaine")
    .eq("id", auth.user.id)
    .single();
  if (!profil) return { erreur: "Profil introuvable." };

  const { data: exercices } = await supabase
    .from("exercices")
    .select("id, slug, equipement")
    .is("owner_id", null);
  if (!exercices) return { erreur: "La bibliothèque d'exercices est injoignable." };

  const parSlug = new Map(exercices.map((x) => [x.slug, x]));
  // Le poids du corps est toujours disponible, quoi qu'on ait coché.
  const materiel = new Set([...profil.materiel_dispo, "poids_du_corps"]);
  const objectif = profil.objectif ?? "masse";
  const niveau = profil.niveau ?? "debutant";

  const blocs = seancesRetenues(modele, profil.jours_par_semaine);
  const { data: dernier } = await supabase
    .from("seances_modeles")
    .select("ordre")
    .eq("owner_id", auth.user.id)
    .order("ordre", { ascending: false })
    .limit(1)
    .maybeSingle();
  let ordre = (dernier?.ordre ?? -1) + 1;

  for (const bloc of blocs) {
    const choisis: Array<{ id: string; role: (typeof bloc.emplacements)[number]["role"] }> = [];
    const dejaPris = new Set<string>();

    for (const emplacement of bloc.emplacements) {
      const trouve = emplacement.candidats
        .map((slug) => parSlug.get(slug))
        .find((x) => x && materiel.has(x.equipement) && !dejaPris.has(x.id));
      if (trouve) {
        dejaPris.add(trouve.id);
        choisis.push({ id: trouve.id, role: emplacement.role });
      }
    }
    if (choisis.length === 0) continue;

    const { data: cree, error } = await supabase
      .from("seances_modeles")
      .insert({ owner_id: auth.user.id, nom: bloc.nom, description: modele.resume, couleur: "accent", ordre: ordre++ })
      .select("id")
      .single();
    if (error || !cree) return { erreur: "Le programme n'a pas pu être créé. Réessaie." };

    const lignes = choisis.map((choix, i) => {
      const { series, reps, repos } = dosage(objectif, niveau, choix.role);
      return {
        modele_id: cree.id,
        exercice_id: choix.id,
        ordre: i,
        series_cible: series,
        reps_cible: reps,
        repos_secondes: repos,
        notes: null,
      };
    });
    const { error: erreurLignes } = await supabase.from("modele_exercices").insert(lignes);
    if (erreurLignes) return { erreur: "Les exercices du programme n'ont pas pu être enregistrés." };
  }

  revalidatePath("/programmes");
  return {};
}

export async function terminerOnboarding(cleModele: string | null): Promise<EtatEtape> {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { erreur: "Ta session a expiré. Reconnecte-toi." };

  if (cleModele) {
    const resultat = await creerProgramme(cleModele);
    if (resultat.erreur) return resultat;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_termine: true })
    .eq("id", auth.user.id);
  if (error) return { erreur: "Impossible de finaliser. Réessaie." };

  revalidatePath("/tableau-de-bord");
  redirect("/tableau-de-bord");
}
