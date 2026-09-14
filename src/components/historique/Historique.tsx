"use client";

import { useMemo, useState } from "react";
import { Anneau } from "@/components/ui/Anneau";
import { Champ } from "@/components/ui/Champ";
import { Disque } from "@/components/ui/Pastille";
import { EtatVide } from "@/components/ui/Etats";
import { BoutonLien } from "@/components/ui/Bouton";
import { GROUPES, LIBELLE_GROUPE, type Groupe, type TypeSerie, type Unite } from "@/lib/types";
import { charge, dureeLisible, entier, jourAbrege, jourMois, libelleSemaine, nombre } from "@/lib/format";
import { cn } from "@/lib/cn";

export type SerieHistorique = {
  id: string;
  index_serie: number;
  poids: number | null;
  reps: number | null;
  secondes: number | null;
  rpe: number | null;
  type: TypeSerie;
  est_record: boolean;
};

export type SeanceHistorique = {
  id: string;
  nom: string;
  demarree_a: string;
  volume_total: number;
  duree_secondes: number | null;
  ressenti: number | null;
  note: string | null;
  exercices: Array<{ id: string; nom: string; groupe: string; series: SerieHistorique[] }>;
};

/**
 * Timeline verticale groupée par semaine. Une séance se déplie sur place :
 * on ne quitte jamais la page pour voir le détail d'une série.
 */
export function Historique({ seances, unite }: { seances: SeanceHistorique[]; unite: Unite }) {
  const [recherche, setRecherche] = useState("");
  const [groupe, setGroupe] = useState<Groupe | null>(null);
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());

  const filtrees = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return seances.filter((seance) => {
      const correspondGroupe = !groupe || seance.exercices.some((e) => e.groupe === groupe);
      const correspondTexte =
        !terme ||
        seance.nom.toLowerCase().includes(terme) ||
        seance.exercices.some((e) => e.nom.toLowerCase().includes(terme));
      return correspondGroupe && correspondTexte;
    });
  }, [seances, recherche, groupe]);

  const parSemaine = useMemo(() => {
    const cartes = new Map<string, SeanceHistorique[]>();
    for (const seance of filtrees) {
      const date = new Date(seance.demarree_a);
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      const cle = date.toISOString().slice(0, 10);
      const liste = cartes.get(cle) ?? [];
      liste.push(seance);
      cartes.set(cle, liste);
    }
    return [...cartes.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtrees]);

  function basculer(id: string) {
    setOuvertes((actuelles) => {
      const suivantes = new Set(actuelles);
      if (suivantes.has(id)) suivantes.delete(id);
      else suivantes.add(id);
      return suivantes;
    });
  }

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pt-securite pb-8">
      <header className="pt-4">
        <h1 className="font-affichage text-titre font-bold">Historique</h1>
        <p className="mt-1 text-ui text-texte-doux">
          {seances.length} séance{seances.length > 1 ? "s" : ""} enregistrée{seances.length > 1 ? "s" : ""}.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Champ
          libelle="Chercher une séance ou un exercice"
          libelleMasque
          type="search"
          placeholder="Développé, Legs, traction…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <PuceFiltre actif={groupe === null} onClick={() => setGroupe(null)}>
            Tout
          </PuceFiltre>
          {GROUPES.map((g) => (
            <PuceFiltre key={g} actif={groupe === g} onClick={() => setGroupe(groupe === g ? null : g)}>
              {LIBELLE_GROUPE[g]}
            </PuceFiltre>
          ))}
        </div>
      </div>

      {parSemaine.length === 0 ? (
        <EtatVide
          titre={seances.length === 0 ? "Aucune séance enregistrée" : "Rien ne correspond"}
          texte={
            seances.length === 0
              ? "La première séance ouvre l'historique, la progression et les records."
              : "Change de mot-clé ou retire le filtre de groupe musculaire."
          }
          action={seances.length === 0 ? <BoutonLien href="/seance">Lancer une séance</BoutonLien> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {parSemaine.map(([debut, liste]) => {
            const tonnage = liste.reduce((t, s) => t + s.volume_total, 0);
            return (
              <section key={debut}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 className="font-affichage text-bloc font-bold">{libelleSemaine(debut)}</h2>
                  <span className="chiffre text-mention text-texte-doux">
                    {liste.length} séance{liste.length > 1 ? "s" : ""} · {entier(tonnage)} {unite}
                  </span>
                </div>
                <ul className="flex flex-col">
                  {liste.map((seance) => {
                    const ouverte = ouvertes.has(seance.id);
                    const records = seance.exercices.flatMap((e) => e.series.filter((s) => s.est_record));
                    return (
                      <li key={seance.id} id={seance.id} className="border-b border-trait last:border-0">
                        <button
                          type="button"
                          onClick={() => basculer(seance.id)}
                          aria-expanded={ouverte}
                          className="flex w-full min-h-16 items-center gap-3 py-3 text-left"
                        >
                          <Anneau
                            valeur={1}
                            taille={26}
                            epaisseur={18}
                            ton={records.length > 0 ? "signal" : "accent"}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-ui font-medium text-texte">{seance.nom}</span>
                            <span className="block text-mention text-texte-tenu">
                              {jourAbrege(seance.demarree_a)} {jourMois(seance.demarree_a)} ·{" "}
                              {seance.exercices.length} exercices
                              {records.length > 0 && ` · ${records.length} record${records.length > 1 ? "s" : ""}`}
                            </span>
                          </span>
                          <span className="chiffre shrink-0 text-mention text-texte-doux">
                            {entier(seance.volume_total)} {unite}
                          </span>
                          <span className="shrink-0 text-mention text-texte-tenu">
                            {dureeLisible(seance.duree_secondes)}
                          </span>
                        </button>

                        {ouverte && (
                          <div className="flex flex-col gap-4 pb-5 pl-9">
                            {seance.note && <p className="text-mention text-texte-doux">« {seance.note} »</p>}
                            {seance.exercices.map((exercice) => (
                              <div key={exercice.id}>
                                <h3 className="text-ui font-medium text-texte">{exercice.nom}</h3>
                                <ul className="mt-1 flex flex-col gap-0.5">
                                  {exercice.series.map((serie) => (
                                    <li key={serie.id} className="flex items-baseline gap-2 text-mention">
                                      <span className="chiffre w-4 shrink-0 text-texte-tenu">{serie.index_serie}</span>
                                      <span className="chiffre text-texte">
                                        {serie.secondes !== null
                                          ? `${nombre(serie.secondes)} s`
                                          : `${charge(serie.poids, unite)} × ${nombre(serie.reps)}`}
                                      </span>
                                      {serie.type !== "normale" && (
                                        <span className="etiquette">{serie.type.slice(0, 3)}</span>
                                      )}
                                      {serie.rpe !== null && <span className="text-texte-tenu">RPE {serie.rpe}</span>}
                                      {serie.est_record && (
                                        <span className="flex items-center gap-1 text-signal-texte">
                                          <Disque taille={6} /> record
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function PuceFiltre({ children, actif, onClick }: { children: React.ReactNode; actif: boolean; onClick: () => void }) {
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
