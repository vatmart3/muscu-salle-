"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AnimatePresence } from "framer-motion";
import { depot } from "@/lib/donnees/depot";
import { creerProgramme } from "@/lib/donnees/programmes";
import { cleJour } from "@/lib/format";
import { useRouter } from "next/navigation";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ChampTexte } from "@/components/ui/Champ";
import { BandeauErreur } from "@/components/ui/Etats";
import { LIBELLE_NIVEAU, LIBELLE_OBJECTIF, MATERIEL, type Objectif } from "@/lib/types";
import type { DonneesOnboarding } from "@/lib/schemas";
import { cn } from "@/lib/cn";
import { EcranQuestion } from "./EcranQuestion";
import { ChoixOption, GlypheObjectif } from "./ChoixOption";
import { Molette, suite } from "./Molette";
import { Recapitulatif } from "./Recapitulatif";

export type Reponses = Partial<DonneesOnboarding> & { poids_kg?: number };

/**
 * Écrit les réponses là où elles vivent : le poids va dans les mesures, tout
 * le reste dans le profil. Une pesée n'est pas une donnée de profil, c'est le
 * premier point d'une courbe.
 */
async function ecrireReponses(patch: Reponses): Promise<boolean> {
  const { poids_kg, blessures, ...profil } = patch;
  if (Object.keys(profil).length > 0 || blessures !== undefined) {
    await depot().enregistrerProfil({
      ...profil,
      ...(blessures !== undefined ? { blessures: blessures || null } : {}),
    });
  }
  if (poids_kg !== undefined) {
    const date = cleJour(new Date());
    const existante = (await depot().mesures()).find((m) => m.date === date);
    await depot().enregistrerMesure({
      date,
      poids_kg,
      masse_grasse: existante?.masse_grasse ?? null,
      tour_bras: existante?.tour_bras ?? null,
      tour_poitrine: existante?.tour_poitrine ?? null,
      tour_taille: existante?.tour_taille ?? null,
      tour_cuisse: existante?.tour_cuisse ?? null,
      note: existante?.note ?? null,
    });
  }
  return true;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ANNEE_MAX = new Date().getFullYear() - 13;
const ANNEES = suite(ANNEE_MAX - 87, ANNEE_MAX).reverse();
const TAILLES = suite(120, 230);
const POIDS = suite(35, 200, 0.5);

/**
 * Valeurs affichées d'entrée par les molettes.
 *
 * Elles sont posées dans l'état dès le montage, pas seulement dessinées à
 * l'écran : une molette qui montre 175 cm alors que la réponse est encore vide
 * laisse le bouton « Continuer » mort sans que rien ne l'explique. C'est un
 * défaut que le parcours complet a attrapé, pas la relecture.
 */
const DEFAUTS = {
  taille_cm: 175,
  poids_kg: 75,
  date_naissance: `${ANNEE_MAX - 12}-01-01`,
} as const;

function joursDuMois(annee: number, mois: number): number {
  return new Date(annee, mois, 0).getDate();
}

export function Onboarding({ initiales }: { initiales: Reponses }) {
  const [reponses, setReponses] = useState<Reponses>(() => {
    const connues = Object.fromEntries(
      Object.entries(initiales).filter(([, valeur]) => valeur !== undefined && valeur !== ""),
    ) as Reponses;
    return { ...DEFAUTS, ...connues };
  });
  const [etape, setEtape] = useState(0);
  const [sens, setSens] = useState<1 | -1>(1);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const routeur = useRouter();
  /** Réponses non encore écrites : rejouées à l'étape finale. */
  const aRejouer = useRef<Reponses>({});

  const naissance = useMemo(() => {
    const d = new Date(reponses.date_naissance ?? DEFAUTS.date_naissance);
    return Number.isNaN(d.getTime())
      ? { j: 1, m: 1, a: ANNEE_MAX - 12 }
      : { j: d.getDate(), m: d.getMonth() + 1, a: d.getFullYear() };
  }, [reponses.date_naissance]);

  function poserNaissance(partiel: Partial<{ j: number; m: number; a: number }>) {
    const suivant = { ...naissance, ...partiel };
    const j = Math.min(suivant.j, joursDuMois(suivant.a, suivant.m));
    const iso = `${suivant.a}-${String(suivant.m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
    setReponses((r) => ({ ...r, date_naissance: iso }));
  }

  function basculerMateriel(cle: string) {
    setReponses((r) => {
      const actuel = r.materiel_dispo ?? [];
      return {
        ...r,
        materiel_dispo: actuel.includes(cle) ? actuel.filter((x) => x !== cle) : [...actuel, cle],
      };
    });
  }

  const questions = [
    {
      cle: "prenom",
      titre: "Comment on t'appelle ?",
      precision: "C'est ce qui s'affichera en haut de ton tableau de bord.",
      valide: () => Boolean(reponses.prenom?.trim()),
      patch: () => ({ prenom: reponses.prenom }),
      contenu: (
        <Champ
          libelle="Prénom"
          libelleMasque
          autoFocus
          autoComplete="given-name"
          value={reponses.prenom ?? ""}
          onChange={(e) => setReponses((r) => ({ ...r, prenom: e.target.value }))}
          className="[&_input]:chiffre [&_input]:text-titre"
        />
      ),
    },
    {
      cle: "sexe",
      titre: "Ton sexe ?",
      precision: "Sert au calcul de la dépense énergétique, rien d'autre.",
      valide: () => Boolean(reponses.sexe),
      patch: () => ({ sexe: reponses.sexe }),
      contenu: (
        <div className="flex flex-col gap-3">
          {([
            ["homme", "Homme"],
            ["femme", "Femme"],
            ["non_precise", "Je préfère ne pas dire"],
          ] as const).map(([cle, libelle]) => (
            <ChoixOption
              key={cle}
              titre={libelle}
              compact
              actif={reponses.sexe === cle}
              onClick={() => setReponses((r) => ({ ...r, sexe: cle }))}
            />
          ))}
        </div>
      ),
    },
    {
      cle: "naissance",
      titre: "Ta date de naissance ?",
      precision: "L'âge entre dans l'estimation de dépense et dans les repères de charge.",
      valide: () => Boolean(reponses.date_naissance),
      patch: () => ({ date_naissance: reponses.date_naissance }),
      contenu: (
        <div className="flex items-start justify-center gap-2 pt-6">
          <Molette
            libelle="Jour"
            valeurs={suite(1, joursDuMois(naissance.a, naissance.m))}
            valeur={naissance.j}
            onChange={(j) => poserNaissance({ j })}
          />
          <Molette
            libelle="Mois"
            valeurs={suite(1, 12)}
            valeur={naissance.m}
            formater={(m) => MOIS[m - 1] ?? String(m)}
            onChange={(m) => poserNaissance({ m })}
          />
          <Molette libelle="Année" valeurs={ANNEES} valeur={naissance.a} onChange={(a) => poserNaissance({ a })} />
        </div>
      ),
    },
    {
      cle: "taille",
      titre: "Ta taille ?",
      valide: () => Boolean(reponses.taille_cm),
      patch: () => ({ taille_cm: reponses.taille_cm }),
      contenu: (
        <div className="flex justify-center pt-8">
          <Molette
            libelle="Taille"
            suffixe="cm"
            valeurs={TAILLES}
            valeur={reponses.taille_cm ?? DEFAUTS.taille_cm}
            onChange={(taille_cm) => setReponses((r) => ({ ...r, taille_cm }))}
          />
        </div>
      ),
    },
    {
      cle: "poids",
      titre: "Ton poids aujourd'hui ?",
      precision: "C'est ta première mesure. Elle reste privée, personne d'autre ne la voit.",
      valide: () => Boolean(reponses.poids_kg),
      patch: () => ({ poids_kg: reponses.poids_kg }),
      contenu: (
        <div className="flex justify-center pt-8">
          <Molette
            libelle="Poids"
            suffixe="kg"
            valeurs={POIDS}
            valeur={reponses.poids_kg ?? DEFAUTS.poids_kg}
            onChange={(poids_kg) => setReponses((r) => ({ ...r, poids_kg }))}
          />
        </div>
      ),
    },
    {
      cle: "objectif",
      titre: "Tu viens chercher quoi ?",
      precision: "Ça règle le nombre de séries, les répétitions et le temps de repos de tes séances.",
      valide: () => Boolean(reponses.objectif),
      patch: () => ({ objectif: reponses.objectif }),
      contenu: (
        <div className="flex flex-col gap-3">
          {(Object.keys(LIBELLE_OBJECTIF) as Objectif[]).map((cle) => (
            <ChoixOption
              key={cle}
              titre={LIBELLE_OBJECTIF[cle]}
              detail={DETAIL_OBJECTIF[cle]}
              glyphe={<GlypheObjectif objectif={cle} actif={reponses.objectif === cle} />}
              actif={reponses.objectif === cle}
              onClick={() => setReponses((r) => ({ ...r, objectif: cle }))}
            />
          ))}
        </div>
      ),
    },
    {
      cle: "niveau",
      titre: "Où tu en es ?",
      valide: () => Boolean(reponses.niveau),
      patch: () => ({ niveau: reponses.niveau }),
      contenu: (
        <div className="flex flex-col gap-3">
          {(["debutant", "intermediaire", "avance"] as const).map((cle) => (
            <ChoixOption
              key={cle}
              titre={LIBELLE_NIVEAU[cle]}
              detail={DETAIL_NIVEAU[cle]}
              actif={reponses.niveau === cle}
              onClick={() => setReponses((r) => ({ ...r, niveau: cle }))}
            />
          ))}
        </div>
      ),
    },
    {
      cle: "jours",
      titre: "Combien de séances par semaine ?",
      precision: "Sois réaliste : c'est cet objectif qui alimentera ta série de semaines.",
      valide: () => Boolean(reponses.jours_par_semaine),
      patch: () => ({ jours_par_semaine: reponses.jours_par_semaine }),
      contenu: (
        <div role="radiogroup" aria-label="Séances par semaine" className="flex flex-wrap justify-center gap-3 pt-6">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => {
            const actif = reponses.jours_par_semaine === n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={actif}
                onClick={() => setReponses((r) => ({ ...r, jours_par_semaine: n }))}
                className={cn(
                  "chiffre flex h-16 w-16 items-center justify-center rounded-pastille border text-bloc",
                  "transition-[background-color,border-color,color] duration-[var(--duree-breve)]",
                  actif ? "border-accent bg-accent text-white" : "border-trait bg-surface text-texte-doux",
                )}
              >
                {n}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      cle: "materiel",
      titre: "Tu as quoi sous la main ?",
      precision: "On ne te proposera que des exercices que tu peux réellement faire.",
      valide: () => (reponses.materiel_dispo?.length ?? 0) > 0,
      patch: () => ({ materiel_dispo: reponses.materiel_dispo }),
      contenu: (
        <div className="flex flex-wrap gap-2">
          {MATERIEL.map(({ cle, nom }) => {
            const actif = reponses.materiel_dispo?.includes(cle) ?? false;
            return (
              <button
                key={cle}
                type="button"
                aria-pressed={actif}
                onClick={() => basculerMateriel(cle)}
                className={cn(
                  "min-h-12 rounded-pastille border px-4 text-ui font-medium",
                  "transition-[background-color,border-color,color] duration-[var(--duree-breve)]",
                  actif ? "border-accent bg-accent text-white" : "border-trait bg-surface text-texte",
                )}
              >
                {nom}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      cle: "blessures",
      titre: "Quelque chose à ménager ?",
      precision: "Épaule, dos, genou… On l'affichera au moment des exercices concernés. Tu peux passer.",
      valide: () => true,
      patch: () => ({ blessures: reponses.blessures ?? "" }),
      contenu: (
        <ChampTexte
          libelle="Blessures ou zones sensibles"
          libelleMasque
          placeholder="Épaule droite sensible en développé incliné."
          value={reponses.blessures ?? ""}
          onChange={(e) => setReponses((r) => ({ ...r, blessures: e.target.value }))}
        />
      ),
    },
    {
      cle: "unite",
      titre: "Tu comptes en quoi ?",
      valide: () => Boolean(reponses.unite),
      patch: () => ({ unite: reponses.unite }),
      contenu: (
        <div className="flex flex-col gap-3">
          <ChoixOption
            titre="Kilogrammes"
            detail="Incréments de 2,5 kg"
            actif={reponses.unite === "kg"}
            onClick={() => setReponses((r) => ({ ...r, unite: "kg" }))}
          />
          <ChoixOption
            titre="Livres"
            detail="Incréments de 5 lb"
            actif={reponses.unite === "lb"}
            onClick={() => setReponses((r) => ({ ...r, unite: "lb" }))}
          />
        </div>
      ),
    },
  ];

  const total = questions.length + 1;
  const estRecap = etape >= questions.length;
  const question = questions[Math.min(etape, questions.length - 1)]!;

  /**
   * On avance tout de suite et on écrit derrière. L'écriture est locale et
   * quasi instantanée, mais si le navigateur refuse le stockage (navigation
   * privée, quota), la réponse reste à l'écran et part dans la file de rejeu.
   */
  function avancer() {
    setErreur(null);
    const patch = question.patch();
    setSens(1);
    setEtape((e) => e + 1);
    demarrer(async () => {
      const ok = await ecrireReponses(patch).catch(() => false);
      if (!ok) aRejouer.current = { ...aRejouer.current, ...patch };
    });
  }

  function reculer() {
    setErreur(null);
    setSens(-1);
    setEtape((e) => Math.max(0, e - 1));
  }

  function finir(cleProgramme: string | null) {
    setErreur(null);
    demarrer(async () => {
      // On rattrape d'abord ce qui n'était pas passé en chemin.
      if (Object.keys(aRejouer.current).length > 0) {
        const ok = await ecrireReponses(aRejouer.current).catch(() => false);
        if (!ok) {
          setErreur(
            "Tes réponses n'ont pas pu être enregistrées. Ce navigateur refuse le stockage — vérifie que tu n'es pas en navigation privée.",
          );
          return;
        }
        aRejouer.current = {};
      }

      const profil = await depot().enregistrerProfil({ onboarding_termine: true });
      if (cleProgramme) {
        const resultat = await creerProgramme(cleProgramme, profil);
        if (resultat.erreur) {
          setErreur(resultat.erreur);
          return;
        }
      }
      routeur.replace("/tableau-de-bord");
    });
  }

  if (estRecap) {
    return (
      <AnimatePresence mode="wait" initial={false}>
        <EcranQuestion
          key="recap"
          cle="recap"
          numero={total}
          total={total}
          sens={sens}
          titre="Voilà ce que ça donne."
          precision="Choisis un programme, tu pourras le modifier à tout moment."
          onRetour={reculer}
          pied={erreur ? <BandeauErreur>{erreur}</BandeauErreur> : null}
        >
          <Recapitulatif reponses={reponses} onChoisir={finir} enCours={enCours} />
        </EcranQuestion>
      </AnimatePresence>
    );
  }

  const peutPasser = question.cle === "blessures";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <EcranQuestion
        key={question.cle}
        cle={question.cle}
        numero={etape + 1}
        total={total}
        sens={sens}
        titre={question.titre}
        precision={question.precision}
        onRetour={etape > 0 ? reculer : undefined}
        pied={
          <>
            {erreur && <BandeauErreur>{erreur}</BandeauErreur>}
            <Bouton taille="pouce" pleineLargeur onClick={avancer} disabled={!question.valide()}>
              {peutPasser && !reponses.blessures ? "Rien à signaler" : "Continuer"}
            </Bouton>
          </>
        }
      >
        {question.contenu}
      </EcranQuestion>
    </AnimatePresence>
  );
}

const DETAIL_OBJECTIF: Record<Objectif, string> = {
  masse: "Séries de 6 à 10, repos long. On cherche la charge et le volume.",
  seche: "Séries de 12, repos court. On garde le muscle en dépensant plus.",
  force: "Séries de 5, repos de trois minutes. Peu de répétitions, lourd.",
  endurance: "Séries longues, repos court. Tenir plus longtemps, pas soulever plus.",
  hyrox: "Force et stations. Traîneau, port de charge, cardio enchaîné.",
};

const DETAIL_NIVEAU: Record<"debutant" | "intermediaire" | "avance", string> = {
  debutant: "Moins d'un an de pratique régulière, ou reprise après une pause.",
  intermediaire: "Un à trois ans. Les mouvements de base sont en place.",
  avance: "Plus de trois ans. Tu sais ce que valent tes charges.",
};
