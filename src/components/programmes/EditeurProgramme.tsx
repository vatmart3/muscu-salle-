"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ajouterAuModele, majModele, majModeleExercice, partagerModele, reordonnerModeleExercices,
  retirerDuModele, retirerPartage,
} from "@/actions/programmes";
import { chercherExercices, type FicheExercice } from "@/actions/seance";
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
  codePartage,
  lignes,
}: {
  id: string;
  nom: string;
  description: string | null;
  codePartage: string | null;
  lignes: LigneProgramme[];
}) {
  const [ordre, setOrdre] = useState(lignes.map((l) => l.id));
  const [bibliotheque, setBibliotheque] = useState(false);
  const [resultats, setResultats] = useState<FicheExercice[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [code, setCode] = useState(codePartage);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const parId = new Map(lignes.map((l) => [l.id, l]));
  const liste = ordre.flatMap((x) => (parId.get(x) ? [parId.get(x)!] : []));

  function agir(promesse: Promise<{ erreur?: string }>, message?: string) {
    setErreur(null);
    setFait(null);
    demarrer(async () => {
      const resultat = await promesse;
      if (resultat.erreur) setErreur(resultat.erreur);
      else if (message) setFait(message);
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
    agir(reordonnerModeleExercices(id, copie));
  }

  function ouvrirBibliotheque() {
    setBibliotheque(true);
    if (resultats === null) void chercherExercices("").then(setResultats);
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
          onBlur={(e) => e.target.value !== nom && agir(majModele(id, { nom: e.target.value }), "Nom enregistré.")}
          className="[&_input]:chiffre [&_input]:text-titre"
        />
        <ChampTexte
          libelle="Description"
          defaultValue={description ?? ""}
          placeholder="Séance haut du corps, dominante poussée."
          onBlur={(e) =>
            e.target.value !== (description ?? "") &&
            agir(majModele(id, { description: e.target.value }), "Description enregistrée.")
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
                        agir(majModeleExercice(ligne.id, id, { ...valeurs(ligne), series_cible: v }), "Enregistré.")
                      }
                    />
                    <ChampCible
                      libelle="Reps"
                      defaut={ligne.reps_cible}
                      min={1}
                      max={200}
                      onValider={(v) =>
                        agir(majModeleExercice(ligne.id, id, { ...valeurs(ligne), reps_cible: v }), "Enregistré.")
                      }
                    />
                    <ChampCible
                      libelle="Repos (s)"
                      defaut={ligne.repos_secondes}
                      min={0}
                      max={900}
                      pas={15}
                      onValider={(v) =>
                        agir(majModeleExercice(ligne.id, id, { ...valeurs(ligne), repos_secondes: v }), "Enregistré.")
                      }
                    />
                  </div>

                  <Bouton
                    ton="fantome"
                    taille="compact"
                    className="self-start"
                    onClick={() => agir(retirerDuModele(ligne.id, id), "Exercice retiré.")}
                  >
                    Retirer de ce programme
                  </Bouton>
                </Surface>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <TitreSection>Partage</TitreSection>
        {code ? (
          <Surface className="flex flex-col gap-3 p-5">
            <p className="text-ui text-texte-doux">
              Donne ce code à un autre membre : il pourra importer une copie du programme. Les séances déjà faites ne
              sont jamais partagées.
            </p>
            <p className="chiffre text-heros tracking-[.08em]">{code}</p>
            <Bouton
              ton="secondaire"
              taille="compact"
              className="self-start"
              onClick={() =>
                demarrer(async () => {
                  const resultat = await retirerPartage(id);
                  if (resultat.erreur) setErreur(resultat.erreur);
                  else setCode(null);
                })
              }
            >
              Arrêter le partage
            </Bouton>
          </Surface>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-ui text-texte-doux">
              Le partage crée un code court. Les autres membres importent une copie ; ton programme reste le tien.
            </p>
            <Bouton
              ton="secondaire"
              taille="pouce"
              className="self-start"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  const resultat = await partagerModele(id);
                  if (resultat.erreur) setErreur(resultat.erreur);
                  else if (resultat.code) setCode(resultat.code);
                })
              }
            >
              Créer un code de partage
            </Bouton>
          </div>
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
              void chercherExercices(e.target.value).then(setResultats);
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
                      agir(ajouterAuModele(id, fiche.id), `${fiche.nom} ajouté.`);
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

function valeurs(ligne: LigneProgramme) {
  return {
    series_cible: ligne.series_cible,
    reps_cible: ligne.reps_cible,
    repos_secondes: ligne.repos_secondes,
    notes: ligne.notes,
  };
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
