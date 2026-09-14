"use client";

import { useActionState, useState } from "react";
import { definirMotDePasse, type EtatFormulaire } from "@/actions/auth";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ForceMotDePasse } from "@/components/ui/Champ";
import { BandeauErreur } from "@/components/ui/Etats";

export function FormulaireNouveauMotDePasse() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(definirMotDePasse, {});
  const [valeur, setValeur] = useState("");

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="font-affichage text-titre font-bold">Nouveau mot de passe.</h1>
        <p className="text-ui text-texte-doux">
          La longueur protège plus que les caractères bizarres. Trois mots qui n&apos;ont rien à faire ensemble font un
          excellent mot de passe.
        </p>
      </div>
      {etat.message && <BandeauErreur>{etat.message}</BandeauErreur>}
      <div className="flex flex-col gap-2">
        <Champ
          libelle="Mot de passe"
          name="motDePasse"
          type="password"
          autoComplete="new-password"
          required
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          erreur={etat.erreurs?.motDePasse}
        />
        <ForceMotDePasse valeur={valeur} />
      </div>
      <Champ
        libelle="Confirmation"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        required
        erreur={etat.erreurs?.confirmation}
      />
      <Bouton type="submit" taille="pouce" pleineLargeur disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer et continuer"}
      </Bouton>
    </form>
  );
}
