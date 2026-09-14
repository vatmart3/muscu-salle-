"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { majReglages, supprimerCompte, type EtatReglages } from "@/actions/profil";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ChampSelect } from "@/components/ui/Champ";
import { Feuille } from "@/components/ui/Feuille";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { BandeauErreur, BandeauFait } from "@/components/ui/Etats";
import { Relances } from "@/components/pwa/Relances";
import { LIBELLE_OBJECTIF, type Objectif, type Role, type Unite } from "@/lib/types";
import { cn } from "@/lib/cn";

export type ProfilReglages = {
  prenom: string;
  unite: Unite;
  jours_par_semaine: number;
  objectif: Objectif | null;
  theme: "clair" | "sombre";
  son_timer: boolean;
  vibration_timer: boolean;
  classement_visible: boolean;
  relance_active: boolean;
  role: Role;
};

export function Reglages({ profil, email }: { profil: ProfilReglages; email: string }) {
  const [etat, action, enCours] = useActionState<EtatReglages, FormData>(majReglages, {});
  const [theme, setTheme] = useState(profil.theme);
  const [suppression, setSuppression] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null);
  const [enSuppression, demarrer] = useTransition();

  // Le thème s'applique tout de suite : un réglage qui n'a pas d'effet visible
  // avant rechargement donne l'impression de ne pas avoir été pris en compte.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("fonte:theme", theme);
    } catch {
      // Navigation privée : le thème reste appliqué pour la session en cours.
    }
  }, [theme]);

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-securite pb-8">
      <header className="pt-4">
        <h1 className="font-affichage text-titre font-bold">Profil</h1>
        <p className="mt-1 text-ui text-texte-doux">{email}</p>
      </header>

      <form action={action} className="flex flex-col gap-6">
        {etat.message && <BandeauErreur>{etat.message}</BandeauErreur>}
        {etat.fait && <BandeauFait>Réglages enregistrés.</BandeauFait>}

        <section className="flex flex-col gap-4">
          <TitreSection>Toi</TitreSection>
          <Champ libelle="Prénom" name="prenom" defaultValue={profil.prenom} erreur={etat.erreurs?.prenom} required />
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
            libelle="Relance après trois jours sans séance"
            detail="Une notification qui énonce un fait, pas un reproche."
            defaut={profil.relance_active}
          />
          <Relances actif={profil.relance_active} />
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

        <section className="flex flex-col gap-4">
          <TitreSection>Classement de la salle</TitreSection>
          <Interrupteur
            nom="classement_visible"
            libelle="Figurer au classement"
            detail="Prénom, nombre de séances et tonnage uniquement. Jamais de mesure corporelle, jamais de photo. Tu peux te retirer à tout moment."
            defaut={profil.classement_visible}
          />
        </section>

        <Bouton type="submit" taille="pouce" pleineLargeur disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer les réglages"}
        </Bouton>
      </form>

      <section className="flex flex-col gap-3">
        <TitreSection>Tes données</TitreSection>
        <Surface className="flex flex-col gap-3 p-5">
          <p className="text-ui text-texte-doux">
            L&apos;export contient toutes tes séries : date, séance, exercice, charge, répétitions, RPE et records.
          </p>
          <a
            href="/api/export"
            download
            className="inline-flex min-h-pouce items-center justify-center rounded-pastille border border-trait bg-fond px-6 text-ui font-medium text-texte hover:bg-surface-creuse"
          >
            Télécharger mes données en CSV
          </a>
        </Surface>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/programmes"
            className="inline-flex min-h-pouce items-center rounded-pastille px-4 text-ui font-medium text-accent-fort hover:bg-accent-voile"
          >
            Mes programmes
          </Link>
          <Link
            href="/classement"
            className="inline-flex min-h-pouce items-center rounded-pastille px-4 text-ui font-medium text-accent-fort hover:bg-accent-voile"
          >
            Classement de la salle
          </Link>
          {profil.role === "admin" && (
            <Link
              href="/admin"
              className="inline-flex min-h-pouce items-center rounded-pastille px-4 text-ui font-medium text-accent-fort hover:bg-accent-voile"
            >
              Espace admin
            </Link>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <TitreSection>Compte</TitreSection>
        <form action="/auth/deconnexion" method="post">
          <Bouton type="submit" ton="secondaire" taille="pouce">
            Me déconnecter
          </Bouton>
        </form>
        <Bouton ton="fantome" taille="compact" className="self-start" onClick={() => setSuppression(true)}>
          Supprimer mon compte
        </Bouton>
      </section>

      <Feuille titre="Supprimer le compte" ouverte={suppression} onFermer={() => setSuppression(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-ui text-texte">
            Tout part : séances, séries, records, mesures et photos. C&apos;est immédiat et définitif, il n&apos;y a pas
            de corbeille.
          </p>
          {erreurSuppression && <BandeauErreur>{erreurSuppression}</BandeauErreur>}
          <Champ
            libelle="Écris SUPPRIMER pour confirmer"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoCapitalize="characters"
          />
          <Bouton
            ton="inverse"
            taille="pouce"
            pleineLargeur
            disabled={enSuppression || confirmation.trim().toUpperCase() !== "SUPPRIMER"}
            onClick={() =>
              demarrer(async () => {
                const resultat = await supprimerCompte(confirmation);
                if (resultat?.erreur) setErreurSuppression(resultat.erreur);
              })
            }
          >
            {enSuppression ? "Suppression…" : "Supprimer définitivement"}
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
