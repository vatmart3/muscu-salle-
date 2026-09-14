"use client";

import { useActionState } from "react";
import Link from "next/link";
import { demanderReinitialisation, type EtatFormulaire } from "@/actions/auth";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { BandeauErreur } from "@/components/ui/Etats";

export function FormulaireOubli() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(demanderReinitialisation, {});

  if (etat.fait) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-affichage text-titre font-bold">C&apos;est envoyé.</h1>
        <p className="text-ui text-texte-doux">
          Si un compte existe pour <strong className="text-texte">{etat.fait}</strong>, le lien de réinitialisation
          vient d&apos;y arriver. Il vaut une heure.
        </p>
        <Link href="/connexion" className="text-ui font-medium text-accent-fort underline underline-offset-4">
          Revenir à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="font-affichage text-titre font-bold">Réinitialiser.</h1>
        <p className="text-ui text-texte-doux">Donne ton adresse, on t&apos;envoie un lien pour en choisir un nouveau.</p>
      </div>
      {etat.message && <BandeauErreur>{etat.message}</BandeauErreur>}
      <Champ
        libelle="Adresse e-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        erreur={etat.erreurs?.email}
      />
      <Bouton type="submit" taille="pouce" pleineLargeur disabled={enCours}>
        {enCours ? "Envoi…" : "Envoyer le lien"}
      </Bouton>
      <Link href="/connexion" className="text-mention font-medium text-accent-fort underline underline-offset-4">
        Revenir à la connexion
      </Link>
    </form>
  );
}
