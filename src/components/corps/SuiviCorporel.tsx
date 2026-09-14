"use client";

import { useMemo, useState, useTransition } from "react";
import { depot, identifiant } from "@/lib/donnees/depot";
import type { MesureEnregistree } from "@/lib/donnees/modeles";
import { erreursDeChamp, schemaMesure } from "@/lib/schemas";
import dynamic from "next/dynamic";
import { Comparateur, type PhotoComparee } from "./Comparateur";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ChampTexte } from "@/components/ui/Champ";
import { TitreSection } from "@/components/ui/Surface";
import { BandeauErreur, BandeauFait, EtatVide, Squelette } from "@/components/ui/Etats";
import { Pastille } from "@/components/ui/Pastille";
import { moyenneMobile, progressionRelative } from "@/lib/calculs";
import { cleJour, jourComplet, jourMois, nombre } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Angle, Unite } from "@/lib/types";

export type MesureLigne = MesureEnregistree;
export type PhotoLigne = { id: string; date: string; angle: Angle; url: string };
type EtatMesure = { erreurs?: Record<string, string>; message?: string; fait?: boolean };

/** Même raison que sur la progression : Recharts se charge à la demande. */
const CourbePoids = dynamic(() => import("@/components/graphes/CourbePoids").then((m) => m.CourbePoids), {
  ssr: false,
  loading: () => <Squelette rayon="bloc" className="h-56 w-full" />,
});

const ANGLES: Array<{ cle: Angle; libelle: string }> = [
  { cle: "face", libelle: "Face" },
  { cle: "profil", libelle: "Profil" },
  { cle: "dos", libelle: "Dos" },
];

/**
 * Zone strictement privée. C'est écrit noir sur blanc dans l'interface, parce
 * que personne ne dépose une photo de son corps dans une app de salle sans
 * savoir qui peut la voir.
 */
export function SuiviCorporel({
  mesures,
  photos,
  unite,
  onChangement,
}: {
  mesures: MesureLigne[];
  photos: PhotoLigne[];
  unite: Unite;
  /** Prévient la page qu'il faut relire le dépôt. */
  onChangement: () => void;
}) {
  const [etat, setEtat] = useState<EtatMesure>({});
  const [enCours, demarrerMesure] = useTransition();

  /**
   * La validation Zod est la même que celle qui tournait côté serveur. Elle
   * n'a pas déménagé : elle vit dans `lib/schemas.ts` et sert ici de garde-fou
   * de saisie — un champ hors bornes n'a aucune raison d'entrer en base, même
   * locale.
   */
  function soumettre(donnees: FormData) {
    const brut = Object.fromEntries(donnees.entries());
    const nettoye = Object.fromEntries(
      Object.entries(brut).map(([cle, valeur]) => [cle, valeur === "" ? undefined : valeur]),
    );
    const lu = schemaMesure.safeParse(nettoye);
    if (!lu.success) {
      setEtat({ erreurs: erreursDeChamp(lu.error) });
      return;
    }
    const { note, date, ...reste } = lu.data;
    demarrerMesure(async () => {
      try {
        await depot().enregistrerMesure({
          date,
          poids_kg: reste.poids_kg ?? null,
          masse_grasse: reste.masse_grasse ?? null,
          tour_bras: reste.tour_bras ?? null,
          tour_poitrine: reste.tour_poitrine ?? null,
          tour_taille: reste.tour_taille ?? null,
          tour_cuisse: reste.tour_cuisse ?? null,
          note: note || null,
        });
        setEtat({ fait: true });
        onChangement();
      } catch {
        setEtat({ message: "La mesure n'a pas pu être enregistrée sur ce téléphone." });
      }
    });
  }
  const [angle, setAngle] = useState<Angle>("face");
  const [avantId, setAvantId] = useState<string | null>(null);
  const [apresId, setApresId] = useState<string | null>(null);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const [televersement, demarrer] = useTransition();

  const derniere = mesures[0];

  const courbe = useMemo(
    () =>
      moyenneMobile(
        mesures
          .filter((m) => m.poids_kg !== null)
          .map((m) => ({ date: m.date, valeur: Number(m.poids_kg) })),
        7,
      ),
    [mesures],
  );

  const tendance = useMemo(() => {
    if (courbe.length < 2) return null;
    const debut = courbe[0]!;
    const fin = courbe[courbe.length - 1]!;
    return { ecart: fin.lissee - debut.lissee, pourcent: progressionRelative(debut.lissee, fin.lissee) };
  }, [courbe]);

  const photosAngle = photos.filter((p) => p.angle === angle);
  const avant = photosAngle.find((p) => p.id === avantId) ?? photosAngle[photosAngle.length - 1];
  const apres = photosAngle.find((p) => p.id === apresId) ?? photosAngle[0];

  /**
   * La photo reste sur le téléphone : elle est stockée telle quelle dans
   * IndexedDB, sans transiter par un serveur. C'est ce qui rend la promesse de
   * confidentialité littérale plutôt que contractuelle.
   */
  async function televerser(fichier: File) {
    setErreurPhoto(null);
    if (fichier.size > 8 * 1024 * 1024) {
      setErreurPhoto("Photo trop lourde : 8 Mo maximum. Réduis-la avant de la déposer.");
      return;
    }
    try {
      await depot().ajouterPhoto({
        id: identifiant(),
        date: cleJour(new Date()),
        angle,
        fichier,
        type_mime: fichier.type || "image/jpeg",
      });
      onChangement();
    } catch {
      setErreurPhoto("Le dépôt a échoué : ce navigateur refuse le stockage, ou la place manque.");
    }
  }

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-9 px-5 pt-securite pb-8">
      <header className="pt-4">
        <h1 className="font-affichage text-titre font-bold">Suivi corporel</h1>
        <p className="mt-1 text-ui text-texte-doux">
          Rien de cette page ne quitte ce téléphone. Les mensurations et les photos sont écrites dans le stockage
          du navigateur, pas sur un serveur : personne d&apos;autre ne peut y accéder, et elles ne suivent pas si tu
          te connectes ailleurs.
        </p>
      </header>

      <section>
        <TitreSection>Poids</TitreSection>
        {derniere?.poids_kg != null && (
          <div className="mb-4 flex flex-wrap items-end gap-6">
            <span className="chiffre text-heros">
              {nombre(derniere.poids_kg)}
              <span className="etiquette ml-2">{unite}</span>
            </span>
            {tendance && Math.abs(tendance.ecart) >= 0.1 && (
              <p className="pb-2 text-mention text-texte-doux">
                {tendance.ecart > 0 ? "+" : ""}
                {nombre(tendance.ecart)} {unite} de tendance depuis le {jourMois(courbe[0]!.date)}
                {tendance.pourcent !== null ? ` (${tendance.pourcent > 0 ? "+" : ""}${nombre(tendance.pourcent)} %)` : ""}.
              </p>
            )}
          </div>
        )}
        <CourbePoids points={courbe} unite={unite} />
      </section>

      <section>
        <TitreSection>Relever aujourd&apos;hui</TitreSection>
        <form action={soumettre} className="flex flex-col gap-4">
          {etat.message && <BandeauErreur>{etat.message}</BandeauErreur>}
          {etat.fait && <BandeauFait>Mesure du jour enregistrée.</BandeauFait>}
          <input type="hidden" name="date" value={cleJour(new Date())} />
          <div className="grid grid-cols-2 gap-4">
            <Champ
              libelle={`Poids (${unite})`}
              name="poids_kg"
              type="number"
              inputMode="decimal"
              step="0.1"
              defaultValue={derniere?.poids_kg ?? ""}
              erreur={etat.erreurs?.poids_kg}
            />
            <Champ
              libelle="Masse grasse (%)"
              name="masse_grasse"
              type="number"
              inputMode="decimal"
              step="0.1"
              defaultValue={derniere?.masse_grasse ?? ""}
              erreur={etat.erreurs?.masse_grasse}
            />
            <Champ libelle="Bras (cm)" name="tour_bras" type="number" inputMode="decimal" step="0.1" defaultValue={derniere?.tour_bras ?? ""} erreur={etat.erreurs?.tour_bras} />
            <Champ libelle="Poitrine (cm)" name="tour_poitrine" type="number" inputMode="decimal" step="0.1" defaultValue={derniere?.tour_poitrine ?? ""} erreur={etat.erreurs?.tour_poitrine} />
            <Champ libelle="Taille (cm)" name="tour_taille" type="number" inputMode="decimal" step="0.1" defaultValue={derniere?.tour_taille ?? ""} erreur={etat.erreurs?.tour_taille} />
            <Champ libelle="Cuisse (cm)" name="tour_cuisse" type="number" inputMode="decimal" step="0.1" defaultValue={derniere?.tour_cuisse ?? ""} erreur={etat.erreurs?.tour_cuisse} />
          </div>
          <ChampTexte libelle="Note" name="note" placeholder="Mesures prises le matin à jeun." />
          <Bouton type="submit" taille="pouce" pleineLargeur disabled={enCours}>
            {enCours ? "Enregistrement…" : "Enregistrer la mesure du jour"}
          </Bouton>
        </form>
      </section>

      <section>
        <TitreSection>Photos de progression</TitreSection>
        <div className="flex flex-col gap-4">
          <div role="radiogroup" aria-label="Angle de prise de vue" className="flex gap-2">
            {ANGLES.map(({ cle, libelle }) => (
              <button
                key={cle}
                type="button"
                role="radio"
                aria-checked={angle === cle}
                onClick={() => {
                  setAngle(cle);
                  setAvantId(null);
                  setApresId(null);
                }}
                className={cn(
                  "min-h-11 flex-1 rounded-pastille border px-4 text-mention font-medium",
                  "transition-[background-color,border-color,color] duration-[var(--duree-breve)]",
                  angle === cle ? "border-accent bg-accent text-white" : "border-trait bg-surface text-texte-doux",
                )}
              >
                {libelle}
              </button>
            ))}
          </div>

          {erreurPhoto && <BandeauErreur>{erreurPhoto}</BandeauErreur>}

          <label className="flex min-h-pouce cursor-pointer items-center justify-center rounded-pastille border border-trait bg-surface px-6 text-ui font-medium text-texte hover:bg-surface-creuse">
            {televersement ? "Envoi…" : `Ajouter une photo de ${angle}`}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              onChange={(e) => {
                const fichier = e.target.files?.[0];
                e.target.value = "";
                if (fichier) demarrer(async () => televerser(fichier));
              }}
            />
          </label>

          {photosAngle.length === 0 ? (
            <EtatVide
              titre="Aucune photo de cet angle"
              texte="Une photo par mois, même cadrage, même lumière : c'est ce qui rend la comparaison honnête."
            />
          ) : photosAngle.length === 1 ? (
            <figure className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photosAngle[0]!.url}
                alt={`Photo du ${jourComplet(photosAngle[0]!.date)}, vue de ${angle}`}
                className="aspect-[3/4] w-full rounded-bloc border border-trait object-cover"
              />
              <figcaption className="text-mention text-texte-doux">
                {jourComplet(photosAngle[0]!.date)} — il faut une deuxième photo pour comparer.
              </figcaption>
            </figure>
          ) : (
            avant &&
            apres && (
              <div className="flex flex-col gap-4">
                <Comparateur avant={avant as PhotoComparee} apres={apres as PhotoComparee} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-mention text-texte-doux">Avant</span>
                    <select
                      value={avant.id}
                      onChange={(e) => setAvantId(e.target.value)}
                      className="min-h-11 rounded-champ border border-trait-fort bg-fond px-3 text-ui"
                    >
                      {photosAngle.map((p) => (
                        <option key={p.id} value={p.id}>
                          {jourMois(p.date)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-mention text-texte-doux">Après</span>
                    <select
                      value={apres.id}
                      onChange={(e) => setApresId(e.target.value)}
                      className="min-h-11 rounded-champ border border-trait-fort bg-fond px-3 text-ui"
                    >
                      {photosAngle.map((p) => (
                        <option key={p.id} value={p.id}>
                          {jourMois(p.date)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )
          )}

          {photosAngle.length > 0 && (
            <ul className="flex flex-col">
              {photosAngle.map((photo) => (
                <li key={photo.id} className="flex items-center gap-3 border-b border-trait py-2.5 last:border-0">
                  <span className="min-w-0 flex-1 text-mention text-texte">{jourComplet(photo.date)}</span>
                  <button
                    type="button"
                    onClick={() =>
                      demarrer(async () => {
                        await depot().supprimerPhoto(photo.id);
                        onChangement();
                      })
                    }
                    className="min-h-11 rounded-pastille px-3 text-mention font-medium text-texte-doux hover:bg-surface-creuse"
                  >
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {mesures.length > 0 && (
        <section>
          <TitreSection>Mensurations</TitreSection>
          <div className="no-scrollbar overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-mention">
              <caption className="sr-only">Historique des mensurations</caption>
              <thead>
                <tr className="border-b border-trait text-left">
                  {["Date", "Poids", "MG", "Bras", "Poitrine", "Taille", "Cuisse"].map((titre) => (
                    <th key={titre} scope="col" className="py-2 pr-3 font-medium text-texte-doux">
                      {titre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="chiffre">
                {mesures.slice(0, 14).map((m) => (
                  <tr key={m.date} className="border-b border-trait last:border-0">
                    <th scope="row" className="py-2 pr-3 text-left font-normal text-texte-doux">
                      {jourMois(m.date)}
                    </th>
                    <td className="py-2 pr-3">{m.poids_kg !== null ? nombre(m.poids_kg) : "—"}</td>
                    <td className="py-2 pr-3">{m.masse_grasse !== null ? `${nombre(m.masse_grasse)}` : "—"}</td>
                    <td className="py-2 pr-3">{m.tour_bras !== null ? nombre(m.tour_bras) : "—"}</td>
                    <td className="py-2 pr-3">{m.tour_poitrine !== null ? nombre(m.tour_poitrine) : "—"}</td>
                    <td className="py-2 pr-3">{m.tour_taille !== null ? nombre(m.tour_taille) : "—"}</td>
                    <td className="py-2 pr-3">{m.tour_cuisse !== null ? nombre(m.tour_cuisse) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3">
            <Pastille ton="encre">Sur ce téléphone uniquement</Pastille>
          </p>
        </section>
      )}
    </main>
  );
}
