"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ajouterAuModele, majLigneModele, majModele, reordonnerLignesModele, retirerDuModele,
} from "@/lib/donnees/programmes";
import { chercher, type FicheExercice } from "@/lib/exercices";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ChampTexte } from "@/components/ui/Champ";
import { Feuille } from "@/components/ui/Feuille";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Pastille } from "@/components/ui/Pastille";
import { BandeauErreur, BandeauFait, EtatVide, Squelette } from "@/components/ui/Etats";
import { LIBELLE_GROUPE, type Groupe } from "@/lib/types";
import { dureeLisible } from "@/lib/format";

export type LigneProgramme = {
  id: string;
  exercice_id: string;
  nom: string;
  groupe: string;
  series_cible: number;
  reps_cible: number;
  repos_secondes: number;
  notes: string | null;
};

export function EditeurProgramme({
  id,
  nom,
  description,
  lignes,
  onChangement,
}: {
  id: string;
  nom: string;
  description: string | null;
  lignes: LigneProgramme[];
  onChangement: () => void;
}) {
  const [ordre, setOrdre] = useState(lignes.map((l) => l.id));
  const [bibliotheque, setBibliotheque] = useState(false);
  const [resultats, setResultats] = useState<FicheExercice[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const parId = new Map(lignes.map((l) => [l.id, l]));
  const liste = ordre.flatMap((x) => (parId.get(x) ? [parId.get(x)!] : []));

  function agir(action: () => Promise<{ erreur?: string }>, message?: string) {
    setErreur(null);
    setFait(null);
    demarrer(async () => {
      const resultat = await action();
      if (resultat.erreur) {
        setErreur(resultat.erreur);
        return;
      }
      if (message) setFait(message);
      onChangement();
    });
  }

  function deplacer(ligneId: string, sens: -1 | 1) {
    const i = ordre.indexOf(ligneId);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= ordre.length) return;
    const copie = [...ordre];
    const a = copie[i]!;
    copie[i] = copie[j]!;
    copie[j] = a;
    setOrdre(copie);
    agir(() => reordonnerLignesModele(id, copie));
  }

  function ouvrirBibliotheque() {
    setBibliotheque(true);
    if (resultats === null) setResultats(chercher(""));
  }

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-securite pb-8">
      <header className="flex items-center justify-between gap-4 pt-4">
        <Link href="/programmes" className="min-h-11 rounded-pastille px-3 text-mention font-medium text-accent-fort">
          Programmes
        </Link>
      </header>

      {erreur && <BandeauErreur>{erreur}</BandeauErreur>}
      {fait && <BandeauFait>{fait}</BandeauFait>}

      <section className="flex flex-col gap-4">
        <Champ
          libelle="Nom du programme"
          defaultValue={nom}
          onBlur={(e) => e.target.value !== nom && agir(() => majModele(id, { nom: e.target.value }), "Nom enregistré.")}
          className="[&_input]:chiffre [&_input]:text-titre"
        />
        <ChampTexte
          libelle="Description"
          defaultValue={description ?? ""}
          placeholder="Séance haut du corps, dominante poussée."
          onBlur={(e) =>
            e.target.value !== (description ?? "") &&
            agir(() => majModele(id, { description: e.target.value }), "Description enregistrée.")
          }
        />
      </section>

      <section>
        <TitreSection
          action={
            <Bouton ton="fantome" taille="compact" onClick={ouvrirBibliotheque}>
              Ajouter
            </Bouton>
          }
        >
          Exercices
        </TitreSection>

        {liste.length === 0 ? (
          <EtatVide
            titre="Programme vide"
            texte="Ajoute des exercices depuis la bibliothèque : 131 mouvements, filtrables par groupe musculaire."
            action={<Bouton onClick={ouvrirBibliotheque}>Ouvrir la bibliothèque</Bouton>}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {liste.map((ligne, i) => (
              <li key={ligne.id}>
                <Surface className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-affichage text-bloc font-bold">{ligne.nom}</h3>
                      <p className="text-mention text-texte-doux">
                        {LIBELLE_GROUPE[ligne.groupe as Groupe] ?? ligne.groupe} ·{" "}
                        {dureeLisible(ligne.repos_secondes)} de repos
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => deplacer(ligne.id, -1)}
                        disabled={i === 0 || enCours}
                        aria-label={`Monter ${ligne.nom}`}
                        className="min-h-9 min-w-9 rounded-pastille border border-trait bg-fond disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => deplacer(ligne.id, 1)}
                        disabled={i === liste.length - 1 || enCours}
                        aria-label={`Descendre ${ligne.nom}`}
                        className="min-h-9 min-w-9 rounded-pastille border border-trait bg-fond disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <ChampCible
                      libelle="Séries"
                      defaut={ligne.series_cible}
                      min={1}
                      max={20}
                      onValider={(v) =>
                        agir(() => majLigneModele(id, ligne.id, { series_cible: v }), "Enregistré.")
                      }
                    />
                    <ChampCible
                      libelle="Reps"
                      defaut={ligne.reps_cible}
                      min={1}
                      max={200}
                      onValider={(v) =>
                        agir(() => majLigneModele(id, ligne.id, { reps_cible: v }), "Enregistré.")
                      }
                    />
                    <ChampCible
                      libelle="Repos (s)"
                      defaut={ligne.repos_secondes}
                      min={0}
                      max={900}
                      pas={15}
                      onValider={(v) =>
                        agir(() => majLigneModele(id, ligne.id, { repos_secondes: v }), "Enregistré.")
                      }
                    />
                  </div>

                  <Bouton
                    ton="fantome"
                    taille="compact"
                    className="self-start"
                    onClick={() => agir(() => retirerDuModele(id, ligne.id), "Exercice retiré.")}
                  >
                    Retirer de ce programme
                  </Bouton>
                </Surface>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Feuille titre="Bibliothèque" ouverte={bibliotheque} onFermer={() => setBibliotheque(false)}>
        <div className="flex flex-col gap-4">
          <Champ
            libelle="Chercher"
            libelleMasque
            placeholder="Développé, traction, squat…"
            value={recherche}
            onChange={(e) => {
              setRecherche(e.target.value);
              setResultats(chercher(e.target.value));
            }}
            autoFocus
          />
          {resultats === null ? (
            <div className="flex flex-col gap-2">
              <Squelette className="h-12 w-full" />
              <Squelette className="h-12 w-full" />
              <Squelette className="h-12 w-full" />
            </div>
          ) : (
            <ul className="flex flex-col">
              {resultats.map((fiche) => (
                <li key={fiche.id}>
                  <button
                    type="button"
                    disabled={enCours}
                    onClick={() => {
                      agir(() => ajouterAuModele(id, fiche.id), `${fiche.nom} ajouté.`);
                      setBibliotheque(false);
                    }}
                    className="flex w-full min-h-14 items-center gap-3 border-b border-trait py-3 text-left hover:bg-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-ui font-medium text-texte">{fiche.nom}</span>
                      <span className="block text-mention text-texte-tenu">
                        {LIBELLE_GROUPE[fiche.groupe_principal as Groupe] ?? fiche.groupe_principal}
                      </span>
                    </span>
                    <Pastille ton="accent">Ajouter</Pastille>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Feuille>
    </main>
  );
}


function ChampCible({
  libelle,
  defaut,
  min,
  max,
  pas = 1,
  onValider,
}: {
  libelle: string;
  defaut: number;
  min: number;
  max: number;
  pas?: number;
  onValider: (valeur: number) => void;
}) {
  return (
    <Champ
      libelle={libelle}
      type="number"
      inputMode="numeric"
      step={pas}
      min={min}
      max={max}
      defaultValue={defaut}
      onBlur={(e) => {
        const valeur = Math.max(min, Math.min(max, Number(e.target.value)));
        if (valeur !== defaut) onValider(valeur);
      }}
      className="[&_input]:chiffre [&_input]:text-center [&_input]:text-bloc"
    />
  );
}
