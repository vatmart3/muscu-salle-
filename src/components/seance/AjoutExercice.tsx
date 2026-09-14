"use client";

import { useEffect, useState, useTransition } from "react";
import { chercher, type FicheExercice } from "@/lib/exercices";
import { preparerExercice } from "@/lib/donnees/seance";
import { Feuille } from "@/components/ui/Feuille";
import { Champ } from "@/components/ui/Champ";
import { Squelette, EtatVide, BandeauErreur } from "@/components/ui/Etats";
import { GROUPES, LIBELLE_GROUPE, type Groupe } from "@/lib/types";
import { cn } from "@/lib/cn";
import type { ExerciceLocal } from "@/stores/seance";

/**
 * Bibliothèque en cours de séance. Index groupé par muscle, titres en grand :
 * pas une liste grise à chevrons.
 */
export function AjoutExercice({
  ouverte,
  ordre,
  onFermer,
  onAjoute,
}: {
  ouverte: boolean;
  ordre: number;
  onFermer: () => void;
  onAjoute: (exercice: ExerciceLocal) => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [groupe, setGroupe] = useState<Groupe | null>(null);
  const [resultats, setResultats] = useState<FicheExercice[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  // La bibliothèque est embarquée : la recherche est synchrone, sans réseau
  // ni temporisation. On la garde dans un effet pour ne filtrer qu'à
  // l'ouverture de la feuille.
  useEffect(() => {
    if (!ouverte) return;
    setResultats(chercher(recherche, groupe));
  }, [ouverte, recherche, groupe]);

  function ajouter(fiche: FicheExercice) {
    setErreur(null);
    demarrer(async () => {
      const exercice = await preparerExercice(fiche.id, ordre);
      if (!exercice) {
        setErreur("L'exercice n'a pas pu être ajouté.");
        return;
      }
      onAjoute(exercice);
      onFermer();
    });
  }

  const parGroupe = new Map<string, FicheExercice[]>();
  for (const fiche of resultats ?? []) {
    const liste = parGroupe.get(fiche.groupe_principal) ?? [];
    liste.push(fiche);
    parGroupe.set(fiche.groupe_principal, liste);
  }

  return (
    <Feuille titre="Ajouter un exercice" ouverte={ouverte} onFermer={onFermer}>
      <div className="flex flex-col gap-4">
        {erreur && <BandeauErreur>{erreur}</BandeauErreur>}

        <Champ
          libelle="Chercher un exercice"
          libelleMasque
          placeholder="Développé, traction, squat…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          autoFocus
        />

        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <PuceGroupe actif={groupe === null} onClick={() => setGroupe(null)}>
            Tout
          </PuceGroupe>
          {GROUPES.map((g) => (
            <PuceGroupe key={g} actif={groupe === g} onClick={() => setGroupe(groupe === g ? null : g)}>
              {LIBELLE_GROUPE[g]}
            </PuceGroupe>
          ))}
        </div>

        {resultats === null ? (
          <div className="flex flex-col gap-3">
            <Squelette className="h-5 w-32" />
            <Squelette className="h-12 w-full" />
            <Squelette className="h-12 w-full" />
            <Squelette className="h-12 w-full" />
          </div>
        ) : resultats.length === 0 ? (
          <EtatVide
            titre="Aucun exercice trouvé"
            texte="Essaie un autre mot, ou change de groupe musculaire."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {[...parGroupe.entries()].map(([cle, fiches]) => (
              <section key={cle}>
                <h3 className="mb-2 font-affichage text-bloc font-bold">
                  {LIBELLE_GROUPE[cle as Groupe] ?? cle}
                </h3>
                <ul className="flex flex-col">
                  {fiches.map((fiche) => (
                    <li key={fiche.id}>
                      <button
                        type="button"
                        disabled={enCours}
                        onClick={() => ajouter(fiche)}
                        className="flex w-full min-h-14 items-center gap-3 border-b border-trait py-3 text-left hover:bg-surface disabled:opacity-50"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-ui font-medium text-texte">{fiche.nom}</span>
                          <span className="block text-mention text-texte-tenu">{fiche.equipement.replace(/_/g, " ")}</span>
                        </span>
                        <span className="etiquette shrink-0 text-accent-fort">Ajouter</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </Feuille>
  );
}

function PuceGroupe({ children, actif, onClick }: { children: React.ReactNode; actif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={cn(
        "min-h-11 shrink-0 rounded-pastille border px-4 text-mention font-medium",
        "transition-[background-color,border-color,color] duration-[var(--duree-breve)]",
        actif ? "border-accent bg-accent text-white" : "border-trait bg-surface text-texte-doux",
      )}
    >
      {children}
    </button>
  );
}
