"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { connecter, envoyerLienConnexion, type EtatFormulaire } from "@/actions/auth";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { BandeauErreur } from "@/components/ui/Etats";

const SOUCIS: Record<string, string> = {
  "lien-expire": "Ce lien a expiré ou a déjà servi. Demande-en un nouveau.",
  "lien-incomplet": "Ce lien est incomplet. Recopie-le en entier depuis l'e-mail.",
};

export function FormulaireConnexion({ suite, souci }: { suite?: string; souci?: string }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(connecter, {});
  const [etatLien, actionLien, lienEnCours] = useActionState<EtatFormulaire, FormData>(envoyerLienConnexion, {});
  const [secours, setSecours] = useState(false);

  if (etatLien.fait) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-affichage text-titre font-bold">Le lien est parti.</h1>
        <p className="text-ui text-texte-doux">
          Ouvre <strong className="text-texte">{etatLien.fait}</strong> et clique sur le lien : tu seras connecté
          directement, sans mot de passe.
        </p>
        <button
          type="button"
          onClick={() => setSecours(false)}
          className="self-start text-ui font-medium text-accent-fort underline underline-offset-4"
        >
          Revenir au mot de passe
        </button>
      </div>
    );
  }

  if (secours) {
    return (
      <form action={actionLien} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <h1 className="font-affichage text-titre font-bold">Connexion par lien.</h1>
          <p className="text-ui text-texte-doux">
            On envoie un lien à ton adresse. Un seul clic et tu es dedans. Le lien ne crée pas de compte.
          </p>
        </div>
        {etatLien.message && <BandeauErreur>{etatLien.message}</BandeauErreur>}
        <Champ
          libelle="Adresse e-mail"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          erreur={etatLien.erreurs?.email}
        />
        <Bouton type="submit" taille="pouce" pleineLargeur disabled={lienEnCours}>
          {lienEnCours ? "Envoi…" : "Envoyer le lien"}
        </Bouton>
        <button
          type="button"
          onClick={() => setSecours(false)}
          className="self-start text-mention font-medium text-accent-fort underline underline-offset-4"
        >
          Utiliser plutôt mon mot de passe
        </button>
      </form>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="suite" value={suite ?? ""} />
      <div className="flex flex-col gap-2">
        <h1 className="font-affichage text-titre font-bold">Te revoilà.</h1>
        <p className="text-ui text-texte-doux">La session reste ouverte : tu n&apos;auras pas à refaire ça en salle.</p>
      </div>

      {souci && SOUCIS[souci] && <BandeauErreur>{SOUCIS[souci]}</BandeauErreur>}
      {etat.message && <BandeauErreur>{etat.message}</BandeauErreur>}

      <Champ
        libelle="Adresse e-mail"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        erreur={etat.erreurs?.email}
        enterKeyHint="next"
      />
      <Champ
        libelle="Mot de passe"
        name="motDePasse"
        type="password"
        autoComplete="current-password"
        required
        erreur={etat.erreurs?.motDePasse}
        enterKeyHint="done"
      />

      <Bouton type="submit" taille="pouce" pleineLargeur disabled={enCours}>
        {enCours ? "Connexion…" : "Me connecter"}
      </Bouton>

      <div className="flex flex-col gap-2 text-mention">
        <button
          type="button"
          onClick={() => setSecours(true)}
          className="self-start font-medium text-accent-fort underline underline-offset-4"
        >
          Recevoir un lien de connexion
        </button>
        <Link href="/mot-de-passe-oublie" className="self-start font-medium text-accent-fort underline underline-offset-4">
          Mot de passe oublié
        </Link>
        <p className="text-texte-doux">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-accent-fort underline underline-offset-4">
            En créer un
          </Link>
        </p>
      </div>
    </form>
  );
}
