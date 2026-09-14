"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ChampSelect } from "@/components/ui/Champ";
import { Feuille } from "@/components/ui/Feuille";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { BandeauErreur, BandeauFait } from "@/components/ui/Etats";
import { LIBELLE_OBJECTIF, type Objectif } from "@/lib/types";
import { cn } from "@/lib/cn";
import { depot } from "@/lib/donnees/depot";
import { demanderPersistance } from "@/lib/donnees/idb";
import type { ProfilLocal } from "@/lib/donnees/modeles";
import { construireCsv, construireSauvegarde, telecharger } from "@/lib/donnees/export";
import { erreursDeChamp, schemaReglages } from "@/lib/schemas";

export function Reglages({
  profil,
  occupation,
  onChangement,
}: {
  profil: ProfilLocal;
  occupation: { utilise: number; quota: number } | null;
  onChangement: () => void;
}) {
  const routeur = useRouter();
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [theme, setTheme] = useState(profil.theme);
  const [suppression, setSuppression] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [persistant, setPersistant] = useState<boolean | null>(null);
  const [enCours, demarrer] = useTransition();

  // Le thème s'applique tout de suite : un réglage sans effet visible avant
  // rechargement donne l'impression de ne pas avoir été pris en compte.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("fonte:theme", theme);
    } catch {
      // Navigation privée : le thème reste appliqué pour la session en cours.
    }
  }, [theme]);

  useEffect(() => {
    void navigator.storage?.persisted?.().then(setPersistant).catch(() => setPersistant(null));
  }, []);

  function enregistrer(donnees: FormData) {
    const lu = schemaReglages.safeParse({
      prenom: donnees.get("prenom"),
      unite: donnees.get("unite"),
      jours_par_semaine: donnees.get("jours_par_semaine"),
      objectif: donnees.get("objectif"),
      theme: donnees.get("theme"),
      son_timer: donnees.get("son_timer") === "on",
      vibration_timer: donnees.get("vibration_timer") === "on",
      classement_visible: false,
      relance_active: donnees.get("relance_active") === "on",
    });
    if (!lu.success) {
      setErreurs(erreursDeChamp(lu.error));
      return;
    }
    setErreurs({});
    setMessage(null);
    demarrer(async () => {
      try {
        const { classement_visible: _c, ...reglages } = lu.data;
        await depot().enregistrerProfil(reglages);
        setFait(true);
        onChangement();
      } catch {
        setMessage("Les réglages n'ont pas pu être enregistrés sur ce téléphone.");
      }
    });
  }

  const pourcentage =
    occupation && occupation.quota > 0 ? Math.round((occupation.utilise / occupation.quota) * 1000) / 10 : null;

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-6 pb-8">
      <header>
        <h1 className="font-affichage text-titre font-bold">Profil</h1>
        <p className="mt-1 text-ui text-texte-doux">
          Tes données vivent dans ce navigateur, pas sur un serveur.
        </p>
      </header>

      <form action={enregistrer} className="flex flex-col gap-6">
        {message && <BandeauErreur>{message}</BandeauErreur>}
        {fait && <BandeauFait>Réglages enregistrés.</BandeauFait>}

        <section className="flex flex-col gap-4">
          <TitreSection>Toi</TitreSection>
          <Champ libelle="Prénom" name="prenom" defaultValue={profil.prenom} erreur={erreurs.prenom} required />
          <ChampSelect libelle="Objectif principal" name="objectif" defaultValue={profil.objectif ?? "masse"}>
            {(Object.keys(LIBELLE_OBJECTIF) as Objectif[]).map((cle) => (
              <option key={cle} value={cle}>
                {LIBELLE_OBJECTIF[cle]}
              </option>
            ))}
          </ChampSelect>
          <ChampSelect
            libelle="Objectif de séances par semaine"
            name="jours_par_semaine"
            defaultValue={String(profil.jours_par_semaine)}
            aide="C'est ce chiffre qui remplit l'anneau du tableau de bord et alimente ta série de semaines."
          >
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} séance{n > 1 ? "s" : ""}
              </option>
            ))}
          </ChampSelect>
          <ChampSelect libelle="Unité de charge" name="unite" defaultValue={profil.unite}>
            <option value="kg">Kilogrammes (incréments de 2,5 kg)</option>
            <option value="lb">Livres (incréments de 5 lb)</option>
          </ChampSelect>
        </section>

        <section className="flex flex-col gap-4">
          <TitreSection>Séance</TitreSection>
          <Interrupteur nom="son_timer" libelle="Son en fin de repos" defaut={profil.son_timer} />
          <Interrupteur nom="vibration_timer" libelle="Vibration en fin de repos" defaut={profil.vibration_timer} />
          <Interrupteur
            nom="relance_active"
            libelle="Rappel après trois jours sans séance"
            detail="Un bandeau à l'ouverture de l'app, qui énonce un fait. Pas de notification poussée : il faudrait un serveur pour ça."
            defaut={profil.relance_active}
          />
        </section>

        <section className="flex flex-col gap-4">
          <TitreSection>Affichage</TitreSection>
          <div className="flex flex-col gap-1.5">
            <span className="text-mention text-texte-doux">Thème</span>
            <div role="radiogroup" aria-label="Thème" className="flex gap-2">
              {(["clair", "sombre"] as const).map((valeur) => (
                <label
                  key={valeur}
                  className={cn(
                    "flex min-h-pouce flex-1 cursor-pointer items-center justify-center rounded-pastille border px-4 text-ui font-medium capitalize",
                    theme === valeur ? "border-accent bg-accent text-white" : "border-trait bg-surface text-texte-doux",
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={valeur}
                    checked={theme === valeur}
                    onChange={() => setTheme(valeur)}
                    className="sr-only"
                  />
                  {valeur}
                </label>
              ))}
            </div>
          </div>
        </section>

        <Bouton type="submit" taille="pouce" pleineLargeur disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer les réglages"}
        </Bouton>
      </form>

      <section className="flex flex-col gap-3">
        <TitreSection>Tes données</TitreSection>
        <Surface ton="encre" className="flex flex-col gap-3 p-5">
          <h2 className="font-affichage text-bloc font-bold">Elles ne sont qu&apos;ici</h2>
          <p className="text-ui text-inverse-doux">
            Séances, mesures et photos sont écrites dans le stockage de ce navigateur. Rien n&apos;est envoyé
            ailleurs — et rien ne revient si tu perds le téléphone ou si tu vides les données du site.
            {persistant === false && " Le navigateur n'a pas encore promis de les conserver."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Bouton
              ton="inverse"
              taille="compact"
              disabled={enCours}
              onClick={() =>
                demarrer(async () => {
                  telecharger(
                    await construireSauvegarde(),
                    `fonte-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`,
                    "application/json",
                  );
                })
              }
            >
              Télécharger une sauvegarde
            </Bouton>
            {persistant === false && (
              <Bouton
                ton="inverse"
                taille="compact"
                onClick={() => demarrer(async () => setPersistant(await demanderPersistance()))}
              >
                Demander la conservation
              </Bouton>
            )}
          </div>
        </Surface>

        <Surface className="flex flex-col gap-3 p-5">
          <p className="text-ui text-texte-doux">
            L&apos;export CSV contient toutes tes séries : date, séance, exercice, charge, répétitions, RPE et
            records. Il s&apos;ouvre dans un tableur.
          </p>
          <Bouton
            ton="secondaire"
            taille="pouce"
            className="self-start"
            disabled={enCours}
            onClick={() =>
              demarrer(async () => {
                telecharger(
                  await construireCsv(),
                  `fonte-${new Date().toISOString().slice(0, 10)}.csv`,
                  "text/csv;charset=utf-8",
                );
              })
            }
          >
            Télécharger mes séries en CSV
          </Bouton>
          {pourcentage !== null && (
            <p className="text-mention text-texte-tenu">
              Place occupée : {(occupation!.utilise / 1_048_576).toFixed(1)} Mo, soit {pourcentage} % de ce que le
              navigateur accorde.
            </p>
          )}
        </Surface>

        <Link
          href="/programmes"
          className="inline-flex min-h-pouce items-center self-start rounded-pastille px-4 text-ui font-medium text-accent-fort hover:bg-accent-voile"
        >
          Mes programmes
        </Link>
      </section>

      <section className="flex flex-col gap-3">
        <TitreSection>Repartir de zéro</TitreSection>
        <Bouton ton="fantome" taille="compact" className="self-start" onClick={() => setSuppression(true)}>
          Effacer toutes mes données
        </Bouton>
      </section>

      <Feuille titre="Tout effacer" ouverte={suppression} onFermer={() => setSuppression(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-ui text-texte">
            Séances, séries, records, mesures, photos et programmes. C&apos;est immédiat et définitif : il n&apos;y a
            pas de corbeille, et aucune copie ailleurs.
          </p>
          <p className="text-mention text-texte-doux">
            Télécharge une sauvegarde avant, si tu veux pouvoir regarder en arrière.
          </p>
          <Champ
            libelle="Écris EFFACER pour confirmer"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoCapitalize="characters"
          />
          <Bouton
            ton="inverse"
            taille="pouce"
            pleineLargeur
            disabled={enCours || confirmation.trim().toUpperCase() !== "EFFACER"}
            onClick={() =>
              demarrer(async () => {
                await depot().toutEffacer();
                try {
                  localStorage.removeItem("fonte:seance");
                } catch {
                  // Rien à faire : le magasin de séance sera vide au prochain chargement.
                }
                routeur.replace("/bienvenue");
              })
            }
          >
            Effacer définitivement
          </Bouton>
        </div>
      </Feuille>
    </main>
  );
}

function Interrupteur({
  nom,
  libelle,
  detail,
  defaut,
}: {
  nom: string;
  libelle: string;
  detail?: string;
  defaut: boolean;
}) {
  const [actif, setActif] = useState(defaut);
  return (
    <label className="flex cursor-pointer items-start gap-4">
      <input
        type="checkbox"
        name={nom}
        checked={actif}
        onChange={(e) => setActif(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex h-7 w-12 shrink-0 items-center rounded-pastille border p-0.5 transition-colors duration-[var(--duree-breve)]",
          "peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-focus-visible:outline-offset-2",
          actif ? "border-accent bg-accent" : "border-trait-fort bg-surface",
        )}
      >
        <span
          className={cn(
            "h-5 w-5 rounded-pastille bg-fond transition-transform duration-[var(--duree-breve)] ease-[var(--courbe-disque)]",
            actif && "translate-x-5",
          )}
        />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-ui font-medium text-texte">{libelle}</span>
        {detail && <span className="text-mention text-texte-doux">{detail}</span>}
      </span>
    </label>
  );
}
