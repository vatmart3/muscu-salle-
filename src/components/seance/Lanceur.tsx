"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { demarrerSeance, abandonnerSeance, type ChargeSeance } from "@/actions/seance";
import { useSeance } from "@/stores/seance";
import { Bouton } from "@/components/ui/Bouton";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Pastille } from "@/components/ui/Pastille";
import { BandeauErreur, EtatVide } from "@/components/ui/Etats";
import { chrono, depuis, dureeLisible, entier, jourAbrege } from "@/lib/format";

export type ModeleResume = { id: string; nom: string; description: string | null; exercices: string[] };
export type SeanceResume = { id: string; nom: string; demarree_a: string; volume_total: number; duree_secondes: number | null };

/**
 * Écran de lancement. Trois entrées : un modèle, la dernière séance, ou rien.
 * On ne demande jamais « que veux-tu faire ? » sans proposer une réponse.
 */
export function Lanceur({
  modeles,
  dernieres,
  seanceOuverte,
  unite,
}: {
  modeles: ModeleResume[];
  dernieres: SeanceResume[];
  /** Séance restée ouverte côté serveur : à reprendre ou à clôturer. */
  seanceOuverte: { charge: ChargeSeance; ouverteDepuis: number } | null;
  unite: string;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const reprendre = useSeance((e) => e.reprendre);
  const demarrerLocal = useSeance((e) => e.demarrer);
  const vider = useSeance((e) => e.vider);

  function lancer(options: { modeleId?: string; repeterSeanceId?: string }) {
    setErreur(null);
    demarrer(async () => {
      const resultat = await demarrerSeance(options);
      if (resultat.erreur || !resultat.charge) {
        setErreur(resultat.erreur ?? "La séance n'a pas pu démarrer.");
        return;
      }
      demarrerLocal(resultat.charge.seance, resultat.charge.exercices);
    });
  }

  function clore(id: string) {
    setErreur(null);
    demarrer(async () => {
      const resultat = await abandonnerSeance(id);
      if (resultat.erreur) {
        setErreur(resultat.erreur);
        return;
      }
      vider();
    });
  }

  const vieille = seanceOuverte && seanceOuverte.ouverteDepuis > 4 * 3600;

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-lg flex-col gap-8 px-5 pt-securite pb-24">
      <header className="flex items-center justify-between gap-4 pt-4">
        <h1 className="font-affichage text-titre font-bold">Lancer une séance</h1>
        <Link href="/tableau-de-bord" className="min-h-11 rounded-pastille px-3 text-mention font-medium text-accent-fort">
          Retour
        </Link>
      </header>

      {erreur && <BandeauErreur>{erreur}</BandeauErreur>}

      {seanceOuverte && (
        <Surface ton={vieille ? "encre" : "brume"} className="flex flex-col gap-3 p-5">
          <h2 className="font-affichage text-bloc font-bold">
            {vieille ? "Une séance traîne depuis un moment" : "Tu as une séance en cours"}
          </h2>
          <p className={vieille ? "text-ui text-inverse-doux" : "text-ui text-texte-doux"}>
            {seanceOuverte.charge.seance.nom} · démarrée {depuis(seanceOuverte.charge.seance.demarree_a)}, il y a{" "}
            {chrono(seanceOuverte.ouverteDepuis)}.
            {vieille && " Tu l'as probablement oubliée ouverte."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Bouton
              ton={vieille ? "inverse" : "primaire"}
              taille="pouce"
              disabled={enCours}
              onClick={() => reprendre(seanceOuverte.charge)}
            >
              Reprendre
            </Bouton>
            <Bouton
              ton={vieille ? "inverse" : "secondaire"}
              taille="pouce"
              disabled={enCours}
              onClick={() => clore(seanceOuverte.charge.seance.id)}
            >
              La clôturer
            </Bouton>
          </div>
        </Surface>
      )}

      <section>
        <TitreSection>Tes programmes</TitreSection>
        {modeles.length === 0 ? (
          <EtatVide
            titre="Aucun programme"
            texte="Construis-en un, ou lance une séance libre et ajoute tes exercices au fil de l'eau."
            action={<Bouton ton="secondaire" onClick={() => lancer({})}>Séance libre</Bouton>}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {modeles.map((modele) => (
              <li key={modele.id}>
                <Surface className="flex flex-col gap-3 p-5">
                  <h3 className="font-affichage text-bloc font-bold">{modele.nom}</h3>
                  {modele.exercices.length > 0 && (
                    <p className="text-mention text-texte-doux">{modele.exercices.join(" · ")}</p>
                  )}
                  <Bouton taille="pouce" pleineLargeur disabled={enCours} onClick={() => lancer({ modeleId: modele.id })}>
                    {enCours ? "Démarrage…" : `Démarrer ${modele.nom}`}
                  </Bouton>
                </Surface>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dernieres.length > 0 && (
        <section>
          <TitreSection>Refaire une séance</TitreSection>
          <ul className="flex flex-col">
            {dernieres.map((seance) => (
              <li key={seance.id}>
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => lancer({ repeterSeanceId: seance.id })}
                  className="flex w-full min-h-14 items-center gap-3 border-b border-trait py-3 text-left hover:bg-surface disabled:opacity-50"
                >
                  <span className="etiquette w-10 shrink-0">{jourAbrege(seance.demarree_a)}</span>
                  <span className="min-w-0 flex-1 text-ui font-medium text-texte">{seance.nom}</span>
                  <span className="chiffre shrink-0 text-mention text-texte-doux">
                    {entier(seance.volume_total)} {unite}
                  </span>
                  <span className="shrink-0 text-mention text-texte-tenu">{dureeLisible(seance.duree_secondes)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <TitreSection>Sans programme</TitreSection>
        <Pastille>Tu ajoutes les exercices au fur et à mesure</Pastille>
        <Bouton ton="secondaire" taille="pouce" pleineLargeur disabled={enCours} onClick={() => lancer({})}>
          Démarrer une séance libre
        </Bouton>
      </section>
    </main>
  );
}
