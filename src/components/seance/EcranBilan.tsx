"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { comparaisonSeance, terminerSeance, type Comparaison } from "@/actions/seance";
import { useSeance, nombreSeriesValidees, tonnageSeance } from "@/stores/seance";
import { useSynchro } from "@/hooks/useSynchro";
import { useEnLigne } from "@/hooks/useEnLigne";
import { useChrono } from "@/hooks/useChrono";
import { Anneau } from "@/components/ui/Anneau";
import { Bouton } from "@/components/ui/Bouton";
import { Chiffre } from "@/components/ui/Chiffre";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Disque } from "@/components/ui/Pastille";
import { ChampTexte } from "@/components/ui/Champ";
import { BandeauErreur, EtatVide, Squelette } from "@/components/ui/Etats";
import { LIBELLE_RECORD, type Unite } from "@/lib/types";
import { charge, chrono, dureeLisible, entier, nombre } from "@/lib/format";
import { progressionRelative } from "@/lib/calculs";
import { cn } from "@/lib/cn";

const RESSENTIS = [
  { valeur: 1, libelle: "Vidé" },
  { valeur: 2, libelle: "Dur" },
  { valeur: 3, libelle: "Correct" },
  { valeur: 4, libelle: "Bien" },
  { valeur: 5, libelle: "En forme" },
] as const;

/**
 * Bilan de fin de séance. Un chiffre, une comparaison à soi-même, les records
 * tombés, un ressenti en un tap. Puis on referme.
 */
export function EcranBilan({ unite }: { unite: Unite }) {
  const routeur = useRouter();
  const etat = useSeance();
  const enLigne = useEnLigne();
  const { etat: etatSynchro, forcer } = useSynchro();
  const [comparaison, setComparaison] = useState<Comparaison | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const seance = etat.seance;
  const secondes = useChrono(seance?.demarree_a ?? null, Boolean(seance));
  const tonnage = tonnageSeance(etat);
  const series = nombreSeriesValidees(etat);
  const records = etat.exercices.flatMap((e) =>
    e.series.filter((s) => s.validee && s.est_record).flatMap((s) => s.records.map((r) => ({ ...r, exercice: e.nom }))),
  );

  useEffect(() => {
    if (!seance || !enLigne) return;
    void comparaisonSeance(seance.id, seance.nom).then(setComparaison);
  }, [seance, enLigne]);

  if (!seance) {
    return (
      <main id="contenu" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5">
        <EtatVide
          titre="Pas de séance à clôturer"
          texte="La dernière séance est déjà enregistrée. Son détail est dans l'historique."
          action={<Bouton onClick={() => routeur.push("/historique")}>Voir l&apos;historique</Bouton>}
        />
      </main>
    );
  }

  const ecartVolume = comparaison?.precedente
    ? Math.round(tonnage - comparaison.precedente.volume_total)
    : null;
  const ecartRelatif = comparaison?.precedente
    ? progressionRelative(comparaison.precedente.volume_total, tonnage)
    : null;

  function clore() {
    setErreur(null);
    if (!enLigne) {
      setErreur("Tu es hors-ligne. La séance reste gardée sur le téléphone : reviens la clôturer dès que le réseau est là.");
      return;
    }
    demarrer(async () => {
      forcer();
      const resultat = await terminerSeance(seance!.id, seance!.ressenti, seance!.note);
      if (resultat.erreur) {
        setErreur(resultat.erreur);
        return;
      }
      etat.vider();
      routeur.push("/tableau-de-bord");
    });
  }

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-lg flex-col gap-8 px-5 pt-securite pb-securite">
      <header className="flex items-center justify-between gap-4 pt-4">
        <div>
          <p className="etiquette">Bilan</p>
          <h1 className="font-affichage text-titre font-bold">{seance.nom}</h1>
        </div>
        <Link href="/seance" className="min-h-11 rounded-pastille px-3 text-mention font-medium text-accent-fort">
          Reprendre
        </Link>
      </header>

      <section className="flex items-center gap-5">
        <Anneau valeur={1} taille={140} epaisseur={11} ton={records.length > 0 ? "signal" : "accent"} etiquette={`Tonnage : ${entier(tonnage)} ${unite}`}>
          <Chiffre valeur={entier(tonnage)} unite={unite} taille="titre" />
        </Anneau>
        <dl className="flex min-w-0 flex-col gap-2.5">
          <div>
            <dt className="etiquette">Durée</dt>
            <dd className="chiffre text-bloc">{chrono(secondes)}</dd>
          </div>
          <div>
            <dt className="etiquette">Séries</dt>
            <dd className="chiffre text-bloc">{series}</dd>
          </div>
          <div>
            <dt className="etiquette">Exercices</dt>
            <dd className="chiffre text-bloc">{etat.exercices.length}</dd>
          </div>
        </dl>
      </section>

      <section>
        <TitreSection>Par rapport à la dernière fois</TitreSection>
        {!enLigne ? (
          <p className="text-ui text-texte-doux">Comparaison indisponible hors-ligne. Elle arrivera à la synchronisation.</p>
        ) : comparaison === null ? (
          <Squelette className="h-12 w-full" />
        ) : comparaison.precedente === null ? (
          <p className="text-ui text-texte-doux">
            Première fois sur cette séance. C&apos;est elle qui servira de repère la prochaine fois.
          </p>
        ) : (
          <Surface className="flex flex-col gap-1.5 p-5">
            <p className="chiffre text-heros">
              {ecartVolume !== null && ecartVolume >= 0 ? "+" : ""}
              {entier(ecartVolume)} <span className="text-bloc">{unite}</span>
            </p>
            <p className="text-ui text-texte-doux">
              de volume{ecartRelatif !== null ? ` (${ecartRelatif >= 0 ? "+" : ""}${nombre(ecartRelatif)} %)` : ""} par
              rapport au {new Date(comparaison.precedente.demarree_a).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })},
              où tu avais fait {entier(comparaison.precedente.volume_total)} {unite} en{" "}
              {dureeLisible(comparaison.precedente.duree_secondes)}.
            </p>
          </Surface>
        )}
      </section>

      {records.length > 0 && (
        <section>
          <TitreSection>Records tombés</TitreSection>
          <ul className="flex flex-col">
            {records.map((record, i) => (
              <li key={`${record.exercice}-${record.type}-${i}`} className="flex items-center gap-3 border-b border-trait py-3 last:border-0">
                <Disque taille={10} />
                <span className="min-w-0 flex-1">
                  <span className="block text-ui font-medium text-texte">{record.exercice}</span>
                  <span className="block text-mention text-texte-doux">{LIBELLE_RECORD[record.type]}</span>
                </span>
                <span className="chiffre shrink-0 text-bloc text-signal-texte">
                  {record.type === "reps_max" ? `${nombre(record.valeur)} reps` : charge(record.valeur, unite)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <TitreSection>Comment tu te sens</TitreSection>
        <div role="radiogroup" aria-label="Ressenti de la séance" className="flex gap-2">
          {RESSENTIS.map(({ valeur, libelle }) => {
            const actif = seance.ressenti === valeur;
            return (
              <button
                key={valeur}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => etat.ressentir(valeur)}
                className={cn(
                  "flex min-h-pouce flex-1 flex-col items-center justify-center gap-1 rounded-bloc-petit border px-1 text-mention font-medium",
                  "transition-[background-color,border-color,color] duration-[var(--duree-breve)]",
                  actif ? "border-accent bg-accent text-white" : "border-trait bg-surface text-texte-doux",
                )}
              >
                <span
                  aria-hidden="true"
                  className="rounded-pastille bg-current"
                  style={{ width: 6 + valeur * 2.5, height: 6 + valeur * 2.5 }}
                />
                {libelle}
              </button>
            );
          })}
        </div>
      </section>

      <ChampTexte
        libelle="Note sur la séance"
        placeholder="Bonne énergie, développé plus facile qu'attendu."
        value={seance.note ?? ""}
        onChange={(e) => etat.noterSeance(e.target.value)}
      />

      <div className="sticky bottom-0 flex flex-col gap-2 bg-fond pt-4 pb-securite">
        {erreur && <BandeauErreur>{erreur}</BandeauErreur>}
        <Bouton taille="pouce" pleineLargeur onClick={clore} disabled={enCours}>
          {enCours ? "Clôture…" : "Terminer la séance"}
        </Bouton>
        <p className="text-center text-mention text-texte-tenu">
          {etatSynchro === "a-jour" ? "Tout est enregistré." : "Enregistrement en cours…"}
        </p>
      </div>
    </main>
  );
}
