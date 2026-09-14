"use client";

import { useState, useTransition } from "react";
import { basculerCode, creerCode, supprimerCode } from "@/actions/admin";
import { Bouton } from "@/components/ui/Bouton";
import { Champ, ChampSelect } from "@/components/ui/Champ";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Pastille } from "@/components/ui/Pastille";
import { BandeauErreur, BandeauFait, EtatVide } from "@/components/ui/Etats";
import { depuis, entier, jourMois } from "@/lib/format";

export type Membre = { id: string; prenom: string; role: string; created_at: string; seances: number; tonnage: number };
export type Code = { code: string; actif: boolean; utilisations: number; utilisations_max: number | null; created_at: string };

/**
 * Espace admin : membres, codes d'accès, activité de la salle.
 * Rien d'autre — aucun accès aux mesures ni aux photos, et c'est garanti par
 * l'absence de policy RLS, pas par l'absence d'écran.
 */
export function EspaceAdmin({ membres, codes }: { membres: Membre[]; codes: Code[] }) {
  const [nouveauCode, setNouveauCode] = useState("");
  const [maximum, setMaximum] = useState("10");
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function agir(promesse: Promise<{ erreur?: string }>, message: string) {
    setErreur(null);
    setFait(null);
    demarrer(async () => {
      const resultat = await promesse;
      if (resultat.erreur) setErreur(resultat.erreur);
      else setFait(message);
    });
  }

  const actifs = membres.filter((m) => m.seances > 0).length;
  const tonnageSalle = membres.reduce((t, m) => t + m.tonnage, 0);

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 pt-securite pb-8">
      <header className="pt-4">
        <h1 className="font-affichage text-titre font-bold">Espace admin</h1>
        <p className="mt-1 text-ui text-texte-doux">
          Accès et activité de la salle. Les mesures et les photos des membres ne sont accessibles à personne, pas même
          ici.
        </p>
      </header>

      {erreur && <BandeauErreur>{erreur}</BandeauErreur>}
      {fait && <BandeauFait>{fait}</BandeauFait>}

      <section className="grid grid-cols-3 gap-3">
        <Surface className="flex flex-col gap-1 p-4">
          <span className="etiquette">Membres</span>
          <span className="chiffre text-heros">{membres.length}</span>
        </Surface>
        <Surface className="flex flex-col gap-1 p-4">
          <span className="etiquette">Actifs 30 j</span>
          <span className="chiffre text-heros">{actifs}</span>
        </Surface>
        <Surface className="flex flex-col gap-1 p-4">
          <span className="etiquette">Tonnage 30 j</span>
          <span className="chiffre text-bloc">{entier(tonnageSalle)}</span>
        </Surface>
      </section>

      <section>
        <TitreSection>Codes d&apos;accès</TitreSection>
        <div className="flex flex-col gap-4">
          <Surface className="flex flex-col gap-3 p-5">
            <Champ
              libelle="Nouveau code"
              placeholder="FONTE-2027"
              value={nouveauCode}
              onChange={(e) => setNouveauCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              spellCheck={false}
              aide="Lettres, chiffres et tirets. C'est ce code qu'un nouveau membre saisit à l'inscription."
            />
            <ChampSelect
              libelle="Nombre d'utilisations"
              value={maximum}
              onChange={(e) => setMaximum(e.target.value)}
            >
              <option value="1">Une seule</option>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="30">30</option>
              <option value="">Illimité</option>
            </ChampSelect>
            <Bouton
              taille="pouce"
              disabled={nouveauCode.trim().length < 4 || enCours}
              onClick={() => {
                agir(creerCode(nouveauCode, maximum ? Number(maximum) : null), "Code créé.");
                setNouveauCode("");
              }}
            >
              Créer le code
            </Bouton>
          </Surface>

          {codes.length === 0 ? (
            <EtatVide titre="Aucun code" texte="Crée un code pour qu'un nouveau membre puisse s'inscrire." />
          ) : (
            <ul className="flex flex-col">
              {codes.map((code) => {
                const epuise = code.utilisations_max !== null && code.utilisations >= code.utilisations_max;
                return (
                  <li key={code.code} className="flex flex-wrap items-center gap-3 border-b border-trait py-3 last:border-0">
                    <span className="chiffre min-w-0 flex-1 text-bloc tracking-[.04em]">{code.code}</span>
                    <span className="text-mention text-texte-doux">
                      {code.utilisations}
                      {code.utilisations_max !== null ? ` / ${code.utilisations_max}` : " · illimité"}
                    </span>
                    {!code.actif && <Pastille ton="encre">Désactivé</Pastille>}
                    {epuise && code.actif && <Pastille>Épuisé</Pastille>}
                    <Bouton
                      ton="secondaire"
                      taille="compact"
                      disabled={enCours}
                      onClick={() =>
                        agir(basculerCode(code.code, !code.actif), code.actif ? "Code désactivé." : "Code réactivé.")
                      }
                    >
                      {code.actif ? "Désactiver" : "Réactiver"}
                    </Bouton>
                    <Bouton
                      ton="fantome"
                      taille="compact"
                      disabled={enCours}
                      onClick={() => agir(supprimerCode(code.code), "Code supprimé.")}
                    >
                      Supprimer
                    </Bouton>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section>
        <TitreSection>Membres</TitreSection>
        <ul className="flex flex-col">
          {membres.map((membre) => (
            <li key={membre.id} className="flex items-center gap-3 border-b border-trait py-3 last:border-0">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ui font-medium text-texte">
                  {membre.prenom}
                  {membre.role === "admin" && <span className="ml-2 text-mention text-texte-tenu">admin</span>}
                </span>
                <span className="block text-mention text-texte-tenu">
                  Inscrit le {jourMois(membre.created_at)} · {membre.seances} séance{membre.seances > 1 ? "s" : ""} sur
                  30 jours
                </span>
              </span>
              <span className="chiffre shrink-0 text-mention text-texte-doux">{entier(membre.tonnage)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-mention text-texte-tenu">
          Dernière inscription {membres[0] ? depuis(membres[0].created_at) : "—"}.
        </p>
      </section>
    </main>
  );
}
