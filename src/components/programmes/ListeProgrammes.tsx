"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { creerModele, dupliquerModele, reordonnerModeles, supprimerModele } from "@/lib/donnees/programmes";
import { Bouton } from "@/components/ui/Bouton";
import { Champ } from "@/components/ui/Champ";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { BandeauErreur, BandeauFait, EtatVide } from "@/components/ui/Etats";
import { Feuille } from "@/components/ui/Feuille";

export type ProgrammeResume = {
  id: string;
  nom: string;
  description: string | null;
  exercices: string[];
};

/**
 * Liste des programmes. Le réordonnancement se fait par deux boutons
 * explicites plutôt que par glisser-déposer : c'est utilisable d'un pouce, au
 * clavier et au lecteur d'écran — trois choses qu'un glisser-déposer maison ne
 * sait pas faire. Voir DECISIONS.md.
 */
export function ListeProgrammes({
  programmes,
  onChangement,
}: {
  programmes: ProgrammeResume[];
  onChangement: () => void;
}) {
  const [ordre, setOrdre] = useState(programmes.map((p) => p.id));
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [nouveau, setNouveau] = useState(false);
  const [nom, setNom] = useState("");
  const [enCours, demarrer] = useTransition();

  const parId = new Map(programmes.map((p) => [p.id, p]));
  const liste = ordre.flatMap((id) => (parId.get(id) ? [parId.get(id)!] : []));

  function deplacer(id: string, sens: -1 | 1) {
    const i = ordre.indexOf(id);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= ordre.length) return;
    const copie = [...ordre];
    const a = copie[i]!;
    copie[i] = copie[j]!;
    copie[j] = a;
    setOrdre(copie);
    demarrer(async () => {
      const resultat = await reordonnerModeles(copie);
      if (resultat.erreur) setErreur(resultat.erreur);
      else onChangement();
    });
  }

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

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-securite pb-8">
      <header className="flex items-start justify-between gap-4 pt-4">
        <div>
          <h1 className="font-affichage text-titre font-bold">Programmes</h1>
          <p className="mt-1 text-ui text-texte-doux">Tes modèles de séance, dans l&apos;ordre où tu les enchaînes.</p>
        </div>
      </header>

      {erreur && <BandeauErreur>{erreur}</BandeauErreur>}
      {fait && <BandeauFait>{fait}</BandeauFait>}

      <Bouton taille="pouce" className="self-start" onClick={() => setNouveau(true)}>
        Créer un programme
      </Bouton>

      {liste.length === 0 ? (
        <EtatVide
          titre="Aucun programme"
          texte="Crée ton premier modèle : ses exercices, séries et repos seront pré-remplis au lancement d'une séance."
          action={<Bouton onClick={() => setNouveau(true)}>Créer un programme</Bouton>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {liste.map((programme, i) => (
            <li key={programme.id}>
              <Surface className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/programmes/${programme.id}`} className="min-w-0 flex-1">
                    <h2 className="font-affichage text-bloc font-bold">{programme.nom}</h2>
                    {programme.exercices.length > 0 && (
                      <p className="mt-1 text-mention text-texte-doux">{programme.exercices.join(" · ")}</p>
                    )}
                  </Link>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => deplacer(programme.id, -1)}
                      disabled={i === 0 || enCours}
                      aria-label={`Monter ${programme.nom}`}
                      className="min-h-9 min-w-9 rounded-pastille border border-trait bg-fond text-ui disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => deplacer(programme.id, 1)}
                      disabled={i === liste.length - 1 || enCours}
                      aria-label={`Descendre ${programme.nom}`}
                      className="min-h-9 min-w-9 rounded-pastille border border-trait bg-fond text-ui disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Bouton
                    ton="secondaire"
                    taille="compact"
                    onClick={() => agir(() => dupliquerModele(programme.id), "Programme dupliqué.")}
                  >
                    Dupliquer
                  </Bouton>
                  <Bouton
                    ton="fantome"
                    taille="compact"
                    onClick={() => agir(() => supprimerModele(programme.id), "Programme supprimé.")}
                  >
                    Supprimer
                  </Bouton>
                </div>
              </Surface>
            </li>
          ))}
        </ul>
      )}

      <Feuille titre="Nouveau programme" ouverte={nouveau} onFermer={() => setNouveau(false)}>
        <div className="flex flex-col gap-4">
          <Champ
            libelle="Nom du programme"
            placeholder="Push A"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
          />
          <Bouton
            taille="pouce"
            pleineLargeur
            disabled={!nom.trim() || enCours}
            onClick={() => {
              agir(() => creerModele(nom), "Programme créé.");
              setNom("");
              setNouveau(false);
            }}
          >
            Créer
          </Bouton>
        </div>
      </Feuille>

      <TitreSection>Comment ça marche</TitreSection>
      <p className="text-mention text-texte-doux">
        Un programme sert de modèle : au lancement d&apos;une séance, ses exercices, séries et repos sont pré-remplis.
        Tu peux tout changer en cours de route, ça ne modifie pas le modèle. Les programmes vivent sur ce téléphone,
        comme le reste.
      </p>
    </main>
  );
}
