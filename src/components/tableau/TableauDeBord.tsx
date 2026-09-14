"use client";

import Link from "next/link";
import { Anneau } from "@/components/ui/Anneau";
import { Chiffre } from "@/components/ui/Chiffre";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Disque } from "@/components/ui/Pastille";
import { EtatVide, Squelette } from "@/components/ui/Etats";
import { BoutonLien } from "@/components/ui/Bouton";
import { LIBELLE_RECORD } from "@/lib/types";
import { MARQUE } from "@/lib/brand";
import { semainesCompletes, serieEnCours } from "@/lib/calculs";
import { charge, depuis, dureeLisible, entier, jourAbrege, nombre, tonnageLisible, typo } from "@/lib/format";
import { exerciceParId } from "@/lib/exercices";
import { depot, tonnageHebdomadaire } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";

/**
 * Une colonne, une hiérarchie, un seul héros : l'anneau de la semaine.
 * Pas de grille de KPI — la seule question qui compte le lundi soir, c'est
 * « est-ce que je tiens mon objectif ».
 */
export function TableauDeBord() {
  const { donnees, chargement } = useDonnees(async () => {
    const [profil, semaines, seances, records, modeles] = await Promise.all([
      depot().profil(),
      tonnageHebdomadaire(12),
      depot().seances(4),
      depot().records(),
      depot().modeles(),
    ]);
    return { profil, semaines, seances, records, modeles };
  }, []);

  if (chargement || !donnees) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-5 pt-securite pb-8">
        <div className="flex flex-col gap-2 pt-8">
          <Squelette className="h-8 w-44" />
          <Squelette className="h-5 w-64" />
        </div>
        <Squelette rayon="pastille" className="mx-auto h-60 w-60" />
        <Squelette rayon="bloc" className="h-32 w-full" />
        <Squelette rayon="bloc" className="h-28 w-full" />
      </main>
    );
  }

  const { profil, semaines, records, modeles } = donnees;
  const unite = profil?.unite ?? "kg";
  const objectif = profil?.jours_par_semaine ?? 3;

  const terminees = donnees.seances.filter((s) => s.statut === "terminee");
  const douzeSemaines = semainesCompletes(semaines, 12);
  const courante = douzeSemaines[0] ?? { debut: "", seances: 0, tonnage: 0 };
  const serie = serieEnCours(douzeSemaines, objectif);
  const reste = Math.max(0, objectif - courante.seances);
  const tonnageSemaine = tonnageLisible(courante.tonnage);

  // Prochaine séance : celle qui suit la dernière faite dans l'ordre du
  // programme. Sans historique, on propose la première.
  const derniere = terminees[0];
  const indexDerniere = modeles.findIndex((m) => m.id === derniere?.modele_id);
  const prochaine = modeles.length ? modeles[(indexDerniere + 1) % modeles.length] : undefined;

  const joursSansSeance = derniere
    ? Math.floor((Date.now() - new Date(derniere.demarree_a).getTime()) / 86_400_000)
    : null;

  const phrase = (() => {
    if (courante.seances === 0)
      return `Pas encore de séance cette semaine. Il t'en faut ${objectif} pour tenir l'objectif.`;
    if (reste === 0) return `Objectif tenu : ${courante.seances} séance${courante.seances > 1 ? "s" : ""} cette semaine.`;
    return `${courante.seances} séance${courante.seances > 1 ? "s" : ""} cette semaine, il t'en reste ${reste}.`;
  })();

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-5 pt-securite pb-8">
      {/* Barre de tête : la marque à gauche, l'accès au profil à droite.
          Le rail ne porte que les quatre écrans du quotidien. */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <p className="font-affichage text-bloc font-bold tracking-tight">{MARQUE.nom}</p>
        <div className="flex items-center gap-1">
          <Link
            href="/programmes"
            className="min-h-11 rounded-pastille px-3 py-2 text-mention font-medium text-accent-fort hover:bg-accent-voile"
          >
            Programmes
          </Link>
          <Link
            href="/profil"
            className="min-h-11 rounded-pastille px-3 py-2 text-mention font-medium text-accent-fort hover:bg-accent-voile"
          >
            Profil
          </Link>
        </div>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-affichage text-titre font-bold">Salut {profil?.prenom ?? ""}.</h1>
          <p className="mt-1 text-ui text-texte-doux">{typo(phrase)}</p>
        </div>
        {serie > 0 && (
          <span className="flex shrink-0 items-center gap-2 rounded-pastille border border-trait bg-surface px-3 py-2">
            <Disque taille={9} ton="accent" />
            <span className="chiffre text-bloc">{serie}</span>
            <span className="etiquette">sem.</span>
          </span>
        )}
      </header>

      {/* Relance locale : pas de notification poussée sans serveur, mais un
          fait énoncé à l'ouverture vaut mieux qu'un silence. */}
      {joursSansSeance !== null && joursSansSeance >= 3 && (
        <Surface ton="encre" rayon="petit" className="flex flex-wrap items-center gap-3 p-4">
          <p className="min-w-0 flex-1 text-ui">
            {joursSansSeance} jours sans séance. La dernière était {depuis(derniere!.demarree_a)}.
          </p>
          <BoutonLien href="/seance" ton="inverse" taille="compact">
            Reprendre
          </BoutonLien>
        </Surface>
      )}

      <section className="flex flex-col items-center gap-3">
        <Anneau
          valeur={objectif > 0 ? courante.seances / objectif : 0}
          taille={248}
          epaisseur={9}
          etiquette={`${courante.seances} séances sur ${objectif} cette semaine, ${entier(courante.tonnage)} ${unite} soulevés`}
        >
          <Chiffre valeur={tonnageSemaine.valeur} unite={tonnageSemaine.unite} taille="heros" />
          <span className="mt-2.5 text-mention text-texte-doux">
            {courante.seances} / {objectif} séances
          </span>
        </Anneau>
      </section>

      {prochaine && (
        <section>
          <TitreSection>Prochaine séance</TitreSection>
          <Surface className="flex flex-col gap-3 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-affichage text-bloc font-bold">{prochaine.nom}</h2>
              <span className="text-mention text-texte-doux">{prochaine.exercices.length} exercices</span>
            </div>
            <p className="text-mention text-texte-doux">
              {[...prochaine.exercices]
                .sort((a, b) => a.ordre - b.ordre)
                .flatMap((me) => {
                  const fiche = exerciceParId(me.exercice_id);
                  return fiche ? [fiche.nom] : [];
                })
                .join(" · ")}
            </p>
            <BoutonLien href="/seance" taille="pouce" pleineLargeur>
              Démarrer {prochaine.nom}
            </BoutonLien>
          </Surface>
        </section>
      )}

      <section>
        <TitreSection
          action={
            <Link href="/historique" className="text-mention font-medium text-accent-fort">
              Tout voir
            </Link>
          }
        >
          Dernières séances
        </TitreSection>
        {terminees.length === 0 ? (
          <EtatVide
            titre="Rien encore"
            texte="Ta première séance ouvrira l'historique, la progression et les records."
            action={<BoutonLien href="/seance">Lancer une séance</BoutonLien>}
          />
        ) : (
          <ul className="flex flex-col">
            {terminees.slice(0, 3).map((seance) => (
              <li key={seance.id}>
                <Link
                  href={`/historique#${seance.id}`}
                  className="flex min-h-14 items-center gap-3 border-b border-trait py-3 last:border-0"
                >
                  <span className="etiquette w-10 shrink-0">{jourAbrege(seance.demarree_a)}</span>
                  <span className="min-w-0 flex-1 truncate text-ui font-medium text-texte">{seance.nom}</span>
                  <span className="chiffre shrink-0 text-mention text-texte-doux">
                    {entier(seance.volume_total)} {unite}
                  </span>
                  <span className="shrink-0 text-mention text-texte-tenu">{dureeLisible(seance.duree_secondes)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {records.length > 0 && (
        <section>
          <TitreSection>Derniers records</TitreSection>
          <ul className="flex flex-col">
            {records.slice(0, 3).map((record) => (
              <li key={record.cle} className="flex items-center gap-3 border-b border-trait py-3 last:border-0">
                <Disque taille={9} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-medium text-texte">
                    {exerciceParId(record.exercice_id)?.nom ?? record.exercice_id}
                  </span>
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
    </main>
  );
}
