"use server";

import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { urlSite } from "@/lib/site";
import {
  erreursDeChamp,
  schemaConnexion,
  schemaEmailSeul,
  schemaInscription,
  schemaNouveauMotDePasse,
} from "@/lib/schemas";

export type EtatFormulaire = {
  erreurs?: Record<string, string>;
  message?: string;
  fait?: string;
};

/**
 * Traduit les erreurs d'Auth en français, en disant quoi faire.
 * On ne renvoie jamais le message brut de Supabase : il est en anglais et il
 * en dit trop (« User already registered » révèle qu'un compte existe).
 */
function messageAuth(code: string | undefined, brut: string): string {
  switch (code) {
    case "invalid_credentials":
      return "L'e-mail ou le mot de passe ne correspond pas. Vérifie la casse du mot de passe.";
    case "email_not_confirmed":
      return "Ton adresse n'est pas encore confirmée. Regarde ta boîte mail, le lien y est.";
    case "over_email_send_rate_limit":
      return "Trop de tentatives d'affilée. Attends une minute avant de réessayer.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Allonge-le, c'est ce qui compte le plus.";
    case "user_already_exists":
    case "email_exists":
      return "Un compte existe déjà avec cette adresse. Passe par la connexion.";
    case "same_password":
      return "C'est déjà ton mot de passe actuel. Choisis-en un autre.";
    default:
      return brut || "Quelque chose a échoué de notre côté. Réessaie dans un instant.";
  }
}

// ───────────────────────────── Inscription ─────────────────────────────

export async function inscrire(_precedent: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const lu = schemaInscription.safeParse({
    prenom: donnees.get("prenom"),
    email: donnees.get("email"),
    motDePasse: donnees.get("motDePasse"),
    codeAcces: donnees.get("codeAcces"),
  });
  if (!lu.success) return { erreurs: erreursDeChamp(lu.error) };

  const supabase = await clientServeur();

  // Le code est revérifié dans la transaction de création du compte ; ce
  // premier passage sert uniquement à donner un message clair tout de suite.
  const { data: codeValable, error: erreurCode } = await supabase.rpc("verifier_code_acces", {
    p_code: lu.data.codeAcces,
  });
  if (erreurCode) return { message: "Impossible de vérifier le code pour l'instant. Réessaie dans un instant." };
  if (!codeValable) {
    return {
      erreurs: {
        codeAcces: "Ce code n'existe pas, n'est plus actif, ou a déjà servi le nombre de fois prévu.",
      },
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: lu.data.email,
    password: lu.data.motDePasse,
    options: {
      data: { prenom: lu.data.prenom, code_acces: lu.data.codeAcces },
      emailRedirectTo: `${urlSite()}/auth/confirmer?suite=/bienvenue`,
    },
  });

  if (error) {
    // L'exception levée par le déclencheur remonte ici en erreur de base.
    if (error.message.includes("code_acces_invalide")) {
      return { erreurs: { codeAcces: "Ce code vient d'être épuisé. Demandes-en un autre à la salle." } };
    }
    return { message: messageAuth(error.code, error.message) };
  }

  if (data.session) redirect("/bienvenue");
  return { fait: lu.data.email };
}

// ───────────────────────────── Connexion ─────────────────────────────

export async function connecter(_precedent: EtatFormulaire, donnees: FormData): Promise<EtatFormulaire> {
  const lu = schemaConnexion.safeParse({
    email: donnees.get("email"),
    motDePasse: donnees.get("motDePasse"),
  });
  if (!lu.success) return { erreurs: erreursDeChamp(lu.error) };

  const supabase = await clientServeur();
  const { error } = await supabase.auth.signInWithPassword({
    email: lu.data.email,
    password: lu.data.motDePasse,
  });
  if (error) return { message: messageAuth(error.code, error.message) };

  const suite = String(donnees.get("suite") ?? "");
  redirect(suite.startsWith("/") && !suite.startsWith("//") ? suite : "/tableau-de-bord");
}

/** Secours : un lien de connexion par e-mail, sans mot de passe. */
export async function envoyerLienConnexion(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const lu = schemaEmailSeul.safeParse({ email: donnees.get("email") });
  if (!lu.success) return { erreurs: erreursDeChamp(lu.error) };

  const supabase = await clientServeur();
  const { error } = await supabase.auth.signInWithOtp({
    email: lu.data.email,
    options: {
      shouldCreateUser: false, // un lien magique n'ouvre jamais un compte
      emailRedirectTo: `${urlSite()}/auth/confirmer?suite=/tableau-de-bord`,
    },
  });
  if (error) return { message: messageAuth(error.code, error.message) };
  return { fait: lu.data.email };
}

// ─────────────────────── Mot de passe oublié ───────────────────────

export async function demanderReinitialisation(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const lu = schemaEmailSeul.safeParse({ email: donnees.get("email") });
  if (!lu.success) return { erreurs: erreursDeChamp(lu.error) };

  const supabase = await clientServeur();
  await supabase.auth.resetPasswordForEmail(lu.data.email, {
    redirectTo: `${urlSite()}/auth/confirmer?suite=/nouveau-mot-de-passe`,
  });
  // Réponse identique que le compte existe ou non : sinon la page devient un
  // moyen de savoir qui est inscrit à la salle.
  return { fait: lu.data.email };
}

export async function definirMotDePasse(
  _precedent: EtatFormulaire,
  donnees: FormData,
): Promise<EtatFormulaire> {
  const lu = schemaNouveauMotDePasse.safeParse({
    motDePasse: donnees.get("motDePasse"),
    confirmation: donnees.get("confirmation"),
  });
  if (!lu.success) return { erreurs: erreursDeChamp(lu.error) };

  const supabase = await clientServeur();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { message: "Le lien a expiré. Redemande un e-mail de réinitialisation." };
  }

  const { error } = await supabase.auth.updateUser({ password: lu.data.motDePasse });
  if (error) return { message: messageAuth(error.code, error.message) };
  redirect("/tableau-de-bord");
}

export async function seDeconnecter(): Promise<void> {
  const supabase = await clientServeur();
  await supabase.auth.signOut();
  redirect("/connexion");
}
