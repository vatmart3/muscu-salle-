"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { inscrire, type EtatFormulaire } from "@/actions/auth";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ForceMotDePasse } from "@/components/ui/Champ";
import { BandeauErreur } from "@/components/ui/Etats";
import { MARQUE } from "@/lib/brand";

export function FormulaireInscription() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(inscrire, {});
  const [motDePasse, setMotDePasse] = useState("");

  if (etat.fait) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-affichage text-titre font-bold">Vérifie ta boîte mail.</h1>
        <p className="text-ui text-texte-doux">
          On vient d&apos;envoyer un lien de confirmation à <strong className="text-texte">{etat.fait}</strong>. Clique
          dessus et ton compte est ouvert.
        </p>
        <p className="text-mention text-texte-tenu">
          Rien reçu au bout de deux minutes ? Regarde dans les indésirables.
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
        <h1 className="font-affichage text-titre font-bold">Crée ton compte.</h1>
        <p className="text-ui text-texte-doux">
          L&apos;accès demande le code de la salle. Si tu ne l&apos;as pas, demande-le à qui t&apos;a ouvert la porte.
        </p>
      </div>

      {etat.message && <BandeauErreur>{etat.message}</BandeauErreur>}

      <Champ
        libelle="Prénom"
        name="prenom"
        autoComplete="given-name"
        required
        erreur={etat.erreurs?.prenom}
        enterKeyHint="next"
      />
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
      <div className="flex flex-col gap-2">
        <Champ
          libelle="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          required
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          erreur={etat.erreurs?.motDePasse}
          enterKeyHint="next"
        />
        <ForceMotDePasse valeur={motDePasse} />
      </div>
      <Champ
        libelle="Code d'accès de la salle"
        name="codeAcces"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder={MARQUE.codeAccesInitial}
        required
        erreur={etat.erreurs?.codeAcces}
        enterKeyHint="done"
      />

      <Bouton type="submit" taille="pouce" pleineLargeur disabled={enCours}>
        {enCours ? "Création en cours…" : "Créer mon compte"}
      </Bouton>

      <p className="text-mention text-texte-doux">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="font-medium text-accent-fort underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
