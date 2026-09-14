import type { Metadata } from "next";
import { Anneau, RangeeAnneaux } from "@/components/ui/Anneau";
import { Bouton, BoutonLien } from "@/components/ui/Bouton";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Champ, ChampTexte, ForceMotDePasse } from "@/components/ui/Champ";
import { Chiffre } from "@/components/ui/Chiffre";
import { Pastille, Disque } from "@/components/ui/Pastille";
import { EtatVide, EtatErreur, Squelette, BandeauErreur, BandeauFait } from "@/components/ui/Etats";
import { MARQUE } from "@/lib/brand";

export const metadata: Metadata = { title: "Système de design" };

const JETONS = [
  ["--color-texte", "#0A1628", "Texte principal, rail de navigation, surface d'erreur"],
  ["--color-accent", "#0071E3", "Marque. Action primaire, arc d'anneau"],
  ["--color-accent-fort", "#0047A8", "État actif, texte secondaire coloré"],
  ["--color-surface", "#EEF3FA", "Fond secondaire, rail vide des anneaux"],
  ["--color-fond", "#FFFFFF", "Fond principal"],
  ["--color-signal", "#FF4D3D", "Records uniquement"],
  ["--color-signal-texte", "#C42A1C", "Libellé de record en petit corps (AA)"],
] as const;

export default function PageDesign() {
  return (
    <main id="contenu" className="mx-auto flex max-w-3xl flex-col gap-12 px-5 py-10">
      <header className="flex flex-col gap-2">
        <p className="etiquette">Système de design</p>
        <h1 className="font-affichage text-titre font-bold">{MARQUE.nom}</h1>
        <p className="text-ui text-texte-doux">
          Une seule audace : le disque de fonte. Anneaux, arcs, cercles pleins. Tout le reste reste calme.
        </p>
      </header>

      <section>
        <TitreSection>Couleurs</TitreSection>
        <ul className="flex flex-col gap-2">
          {JETONS.map(([jeton, valeur, role]) => (
            <li key={jeton} className="flex items-center gap-3 border-b border-trait pb-2 last:border-0">
              <span
                className="h-9 w-9 shrink-0 rounded-pastille border border-trait"
                style={{ background: `var(${jeton})` }}
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-col">
                <code className="text-mention font-medium">{jeton}</code>
                <span className="text-mention text-texte-doux">
                  {valeur} — {role}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <TitreSection>Typographie</TitreSection>
        <div className="flex flex-col gap-4">
          <div>
            <p className="etiquette">Charge — Archivo Expanded 700 / 72</p>
            <p className="chiffre text-charge">92,5</p>
          </div>
          <div>
            <p className="etiquette">Héros — 56</p>
            <p className="chiffre text-heros">12 480</p>
          </div>
          <div>
            <p className="etiquette">Titre d&apos;écran — 28</p>
            <p className="font-affichage text-titre font-bold">Développé couché</p>
          </div>
          <div>
            <p className="etiquette">Interface — Hanken Grotesk 15</p>
            <p className="text-ui">La dernière fois : 80 kg × 8. Tu peux monter à 82,5.</p>
          </div>
          <div>
            <p className="etiquette">Mention — 13</p>
            <p className="text-mention text-texte-doux">Séance enregistrée hors-ligne, synchronisée au retour du réseau.</p>
          </div>
        </div>
      </section>

      <section>
        <TitreSection>L&apos;anneau — cinq usages, un objet</TitreSection>
        <div className="flex flex-wrap items-end gap-8">
          <figure className="flex flex-col items-center gap-2">
            <Anneau valeur={0.75} taille={200} epaisseur={10} etiquette="Objectif de la semaine : 3 séances sur 4">
              <Chiffre valeur="12,5" unite="tonnes" taille="heros" />
              <span className="mt-2 text-mention text-texte-doux">3 / 4 séances</span>
            </Anneau>
            <figcaption className="text-mention text-texte-doux">Objectif hebdo</figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-2">
            <Anneau valeur={0.42} taille={96} epaisseur={14} sens="vider" etiquette="Repos : 42 % restant">
              <span className="chiffre text-bloc">1:14</span>
            </Anneau>
            <figcaption className="text-mention text-texte-doux">Timer de repos</figcaption>
          </figure>
          <figure className="flex flex-col items-center gap-2">
            <Anneau valeur={1} taille={72} epaisseur={18} ton="signal" etiquette="Record battu">
              <Disque taille={14} />
            </Anneau>
            <figcaption className="text-mention text-texte-doux">Record</figcaption>
          </figure>
          <figure className="flex flex-col items-start gap-2">
            <RangeeAnneaux
              actif={2}
              items={[
                { id: "a", nom: "Développé couché", part: 1 },
                { id: "b", nom: "Dips", part: 1 },
                { id: "c", nom: "Élévations", part: 0.5 },
                { id: "d", nom: "Extensions", part: 0 },
                { id: "e", nom: "Gainage", part: 0 },
              ]}
            />
            <figcaption className="text-mention text-texte-doux">Exercices de la séance</figcaption>
          </figure>
        </div>
      </section>

      <section>
        <TitreSection>Actions</TitreSection>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Bouton ton="primaire" taille="pouce" ombree>
              Lancer une séance
            </Bouton>
            <Bouton ton="primaire">Valider la série</Bouton>
            <Bouton ton="secondaire">Passer le repos</Bouton>
            <Bouton ton="fantome">Ajouter un exercice</Bouton>
            <Bouton ton="inverse" taille="compact">
              Terminer
            </Bouton>
            <Bouton disabled>Indisponible</Bouton>
          </div>
          <p className="text-mention text-texte-doux">
            L&apos;ombre n&apos;existe que sous la pilule de séance. Rayon 999px pour les actions, 28px pour les blocs,
            12px pour les champs.
          </p>
        </div>
      </section>

      <section>
        <TitreSection>Saisie</TitreSection>
        <div className="grid gap-5 sm:grid-cols-2">
          <Champ libelle="Adresse e-mail" type="email" placeholder="toi@exemple.fr" autoComplete="email" />
          <Champ libelle="Code d'accès de la salle" defaultValue="FONTE-" erreur="Ce code n'existe pas ou n'est plus actif." />
          <div className="flex flex-col gap-2">
            <Champ libelle="Mot de passe" type="password" aide="8 caractères minimum." />
            <ForceMotDePasse valeur="correctbatterie12" />
          </div>
          <ChampTexte libelle="Note de séance" placeholder="Épaule droite sensible sur le développé." />
        </div>
      </section>

      <section>
        <TitreSection>Surfaces et pastilles</TitreSection>
        <div className="flex flex-col gap-4">
          <Surface className="p-5">
            <h3 className="font-affichage text-bloc font-bold">Push A</h3>
            <p className="mt-1 text-mention text-texte-doux">Développé · Dips · Élévations latérales · Extensions</p>
          </Surface>
          <div className="flex flex-wrap gap-2">
            <Pastille>52 min</Pastille>
            <Pastille ton="accent">Intermédiaire</Pastille>
            <Pastille ton="signal">
              <Disque taille={8} /> Record
            </Pastille>
            <Pastille ton="encre">Hors-ligne</Pastille>
          </div>
        </div>
      </section>

      <section>
        <TitreSection>États</TitreSection>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="etiquette">Chargement</p>
            <Surface className="flex flex-col gap-3 p-5">
              <Squelette className="h-6 w-40" />
              <Squelette className="h-4 w-full" />
              <Squelette className="h-4 w-2/3" />
            </Surface>
          </div>
          <EtatVide
            titre="Aucune séance pour l'instant"
            texte="Lance ta première séance : les charges de départ se règlent en deux taps."
            action={<BoutonLien href="/seance">Lancer une séance</BoutonLien>}
          />
          <EtatErreur
            titre="Synchronisation impossible"
            texte="Tes séries sont enregistrées sur le téléphone. Elles partiront dès que le réseau revient."
            action={
              <Bouton ton="secondaire" taille="compact">
                Réessayer maintenant
              </Bouton>
            }
          />
          <BandeauErreur>L&apos;e-mail ou le mot de passe ne correspond pas. Vérifie la casse.</BandeauErreur>
          <BandeauFait>Mesure du jour enregistrée.</BandeauFait>
        </div>
      </section>
    </main>
  );
}
