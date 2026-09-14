"use client";

import { Anneau } from "@/components/ui/Anneau";
import { Bouton } from "@/components/ui/Bouton";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Chiffre } from "@/components/ui/Chiffre";
import { Pastille } from "@/components/ui/Pastille";
import {
  age,
  depenseQuotidienne,
  imc,
  lectureImc,
  metabolismeBase,
  seriesHebdoRecommandees,
} from "@/lib/calculs";
import { entier, nombre } from "@/lib/format";
import { programmesProposes, seancesRetenues } from "@/lib/programmes";
import type { Reponses } from "./Onboarding";

/**
 * Dernier écran de l'onboarding : il calcule quelque chose d'utile tout de
 * suite, puis propose des programmes réellement adaptés aux réponses.
 * On ne renvoie jamais quelqu'un sur un tableau de bord vide.
 */
export function Recapitulatif({
  reponses,
  onChoisir,
  enCours,
}: {
  reponses: Reponses;
  onChoisir: (cle: string | null) => void;
  enCours: boolean;
}) {
  const poids = reponses.poids_kg ?? 0;
  const taille = reponses.taille_cm ?? 0;
  const objectif = reponses.objectif ?? "masse";
  const niveau = reponses.niveau ?? "debutant";
  const jours = reponses.jours_par_semaine ?? 3;

  const indice = imc(poids, taille);
  const ans = reponses.date_naissance ? age(reponses.date_naissance) : 0;
  const mb = metabolismeBase({ sexe: reponses.sexe ?? "non_precise", poidsKg: poids, tailleCm: taille, age: ans });
  const depense = mb ? depenseQuotidienne(mb, jours) : null;
  const series = seriesHebdoRecommandees(niveau, objectif);

  const propositions = programmesProposes(objectif, jours);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex items-center gap-5">
        <Anneau valeur={1} taille={128} epaisseur={10} etiquette={indice ? `Indice de masse corporelle : ${nombre(indice)}` : undefined}>
          <Chiffre valeur={indice ? nombre(indice) : "—"} unite="IMC" taille="bloc" />
        </Anneau>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-ui text-texte">
            {indice ? `Tu es ${lectureImc(indice)}.` : "Il manque la taille ou le poids pour calculer l'IMC."}
          </p>
          {depense && (
            <p className="text-mention text-texte-doux">
              Avec {jours} séance{jours > 1 ? "s" : ""} par semaine, tu dépenses autour de{" "}
              <strong className="text-texte">{entier(depense)} kcal</strong> par jour.
            </p>
          )}
          <p className="text-mention text-texte-doux">
            {"Volume de référence\u202f:"} <strong className="text-texte">{series.min} à {series.max} séries</strong> par groupe
            musculaire et par semaine.
          </p>
        </div>
      </section>

      <section>
        <TitreSection>Programmes adaptés</TitreSection>
        <div className="flex flex-col gap-3">
          {propositions.map((modele, rang) => {
            const blocs = seancesRetenues(modele, jours);
            return (
              <Surface key={modele.cle} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-affichage text-bloc font-bold">{modele.nom}</h3>
                  {rang === 0 && <Pastille ton="accent">Le plus adapté</Pastille>}
                </div>
                <p className="text-mention text-texte-doux">{modele.resume}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {blocs.map((bloc) => (
                    <li key={bloc.nom}>
                      <Pastille>{bloc.nom}</Pastille>
                    </li>
                  ))}
                </ul>
                <Bouton
                  ton={rang === 0 ? "primaire" : "secondaire"}
                  taille="pouce"
                  pleineLargeur
                  disabled={enCours}
                  onClick={() => onChoisir(modele.cle)}
                >
                  {enCours ? "Création…" : `Prendre ${modele.nom}`}
                </Bouton>
              </Surface>
            );
          })}
        </div>
      </section>

      <button
        type="button"
        disabled={enCours}
        onClick={() => onChoisir(null)}
        className="self-start text-mention font-medium text-accent-fort underline underline-offset-4 disabled:opacity-50"
      >
        Commencer sans programme, je construirai le mien
      </button>
    </div>
  );
}
