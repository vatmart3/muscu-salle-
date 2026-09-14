# FONTE — contexte de travail

Application web de suivi de musculation pour les membres d'une salle privée
(garage aménagé). On ouvre le site, on remplit un onboarding, on lance ses
séances depuis son téléphone et on suit sa progression.

**Les données ne quittent pas l'appareil.** Pas de compte, pas de mot de passe,
pas de serveur : tout est écrit dans le navigateur (IndexedDB), derrière une
seule couche d'accès — `src/lib/donnees/depot.ts`. Le schéma Postgres, ses
policies RLS et leurs tests restent dans `supabase/` : c'est le chemin de retour
documenté vers une base partagée, pas un service en fonctionnement.

**Contrainte n°1 de toute décision d'interface : l'app s'utilise d'une main, en
sueur, le téléphone posé sur le banc.** Si un arbitrage se présente, c'est cette
phrase qui tranche.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement sur `http://localhost:3000` |
| `npm run build` | Build de production |
| `npm run servir` | Arrête tout, reconstruit, sert, **et vérifie que le build servi n'est pas périmé** |
| `npm run typecheck` | TypeScript strict, sans émission |
| `npm run lint` | ESLint (config Next) |
| `npm run test` | Vitest — calculs du domaine |
| `npm run e2e` | Playwright — parcours critique, sans rien à démarrer |
| `npm run verif` | typecheck + lint + test, à lancer avant chaque commit |
| `npm run db:verif` | Rejoue schéma + tests RLS sur un Postgres nu — garde le chemin de retour vivant |
| `python3 scripts/generer-icones.py` | Régénère les icônes PWA depuis la marque |
| `python3 scripts/generer-exercices-ts.py` | Régénère `lib/exercices.ts` **et** le seed SQL depuis la même source |
| `node scripts/capture.mjs <url> <sortie.png> [largeur] [hauteur]` | Capture d'écran de contrôle |

Aucune variable d'environnement, aucun service à lancer : `npm install` puis
`npm run dev` suffisent.

> **Piège :** `next dev` et `next build` partagent `.next`. Construire pendant
> qu'un serveur de développement tourne produit un build corrompu qui répond
> 400 sur tous les fichiers statiques — et des scores Lighthouse flatteurs mais
> faux, puisque le JavaScript ne se charge pas. Utilise `npm run servir` :
> il arrête tout, reconstruit, redémarre, et refuse de rendre la main si le
> HTML servi référence un fichier qui n'existe pas.

---

## Architecture

```
src/
  app/                 Routes App Router.
    (app)/             Coquilles serveur : elles montent un composant client
    page.tsx           Accueil public
    design/            Page de démonstration du système de design
  components/
    ui/                Primitives : Anneau, Bouton, Champ, Surface, Chiffre…
    seance/            Écran de séance en direct
    trois-d/           Les deux scènes React Three Fiber restantes
    graphes/           Graphiques stylés main (Recharts habillé)
  lib/
    donnees/           idb · modeles · depot · hooks · seance · programmes · export
    calculs.ts         1RM, tonnage, records, moyennes — la seule source de vérité
    exercices.ts       Les 131 exercices, générés depuis la même source que le seed
    brand, fonts, format, types, schemas (Zod)
  stores/              Zustand — état de la séance en cours
  fonts/               Fichiers woff2 servis en local
supabase/              Chemin de retour : migrations/ · tests/ · templates/
scripts/               Outils de développement
```

### Règles de structure

- **Une seule porte vers les données : `lib/donnees/depot.ts`.** Aucun écran
  n'ouvre IndexedDB, n'appelle `lire`/`ecrire` ni ne connaît le nom d'un
  magasin. C'est ce qui rend le rebranchement d'une base possible sans toucher
  un composant : on écrit un second dépôt, on change une ligne dans `depot()`.
- Les agrégats (`volumeParGroupe`, `tonnageHebdomadaire`, `progressionExercice`…)
  vivent dans le dépôt, pas dans les composants : ce sont les requêtes SQL de
  demain.
- Les pages de `(app)/` sont des **coquilles serveur minces** : les données
  étant dans le navigateur, la lecture se fait dans un composant client via
  `useDonnees()`. On garde donc le rendu serveur pour la structure, jamais pour
  les données.
- Toute validation de formulaire est écrite une fois dans `lib/schemas.ts` avec
  Zod, et appliquée avant écriture dans le dépôt. Le dépôt ne fait pas
  confiance à son appelant.
- Toute copy française passe par `typo()` de `lib/format.ts` (espace fine
  insécable avant `? ! ; : »`). Quand le texte est mêlé à du JSX, écrire
  l'espace en échappement visible : `{"Volume\u202f:"}`.
- Les documents locaux sont typés dans `lib/donnees/modeles.ts`. Toute forme
  qui change se reporte **aussi** dans la migration SQL correspondante : les
  deux descriptions du même carnet ne doivent pas diverger en silence.
- Les calculs du domaine (1RM, tonnage, records, moyennes) vivent dans
  `lib/calculs.ts`. Aucun composant ne recalcule à la main.

---

## Règles de design — non négociables

1. **Une seule audace : le disque de fonte.** Anneaux, arcs, cercles pleins. Le
   composant `<Anneau>` sert à cinq usages (objectif hebdo, volume par groupe,
   timer de repos, complétion d'exercice, compteur de séries). Tout le reste
   reste calme.
2. **Le chiffre est l'image.** Archivo Expanded 700, jusqu'à 72px pour la charge
   en saisie. Chiffres tabulaires partout (`.chiffre`).
3. **Le rouge est un événement.** `--color-signal` n'apparaît **que** quand un
   record tombe. Jamais pour une erreur, jamais pour un accent, jamais en
   décoration. Une erreur se rend en **encre inversée**.
4. **Aucune ombre**, sauf sous la pilule « Lancer une séance ». Les surfaces se
   distinguent par `--color-surface` et le trait 1px `--color-trait`.
5. **Le rayon encode la hiérarchie** : `999px` actions et pastilles, `28px`
   blocs, `12px` champs, `0` séparateurs. Jamais uniforme.
6. **Aucune valeur en dur.** Couleurs, rayons, durées, tailles de texte passent
   par les jetons de `src/app/globals.css`.
7. **Le mouvement est réactif.** Aucune animation d'entrée au scroll. Durées
   entre 150 et 400 ms, courbes maison (`--courbe-disque`, `--courbe-verrou`).
   `prefers-reduced-motion` coupe tout.
8. **La 3D a exactement trois emplois** : la barre qui se charge sur l'accueil,
   le disque qui s'ajoute quand un record tombe, le mur des records du profil.
   Chargement dynamique, `<Suspense>`, désactivation si mouvement réduit.
9. **Chaque écran a quatre états** : chargement (squelette, jamais de spinner
   centré), vide (avec l'action à faire), erreur (ce qui s'est passé + comment
   corriger), succès.
10. **Mobile d'abord, 390px.** Toute saisie de séance vit dans le tiers bas de
    l'écran. Cible tactile minimale 44px, 56px pour les incrémenteurs.

### Ce qu'on ne fait jamais

Pas de dégradé décoratif. Pas de label ALL-CAPS tracké au-dessus de chaque
titre. Pas de flèche « → » collée aux boutons. Pas de puces 01/02/03. Pas de
fade-up au scroll. Pas de liste grise d'exercices avec chevron à droite. Pas de
barre d'onglets iOS générique à cinq icônes. Pas de texte de remplissage.

---

## Copy

Français, tutoiement, voix active, phrases courtes. Un bouton dit ce qui va se
passer : « Valider la série », pas « Soumettre ». Une relance énonce un fait :
« Trois jours sans séance », pas « Tu nous manques ! ». Aucun point
d'exclamation dans l'interface, sauf s'il porte une vraie information.

---

## Conventions de code

- TypeScript strict, `noUncheckedIndexedAccess` activé : indexer un tableau
  renvoie `T | undefined`, il faut le traiter.
- Nommage du domaine **en français** (`seance`, `serie`, `tonnage`, `Anneau`) —
  c'est la langue du produit. Les API du framework restent en anglais.
- Commits conventionnels : `feat:`, `fix:`, `chore:`, `docs:`, `test:`.
- Chaque arbitrage technique ou visuel : une ligne datée dans `DECISIONS.md`.
- Migrations SQL numérotées et immuables : on corrige avec une nouvelle
  migration, jamais en éditant l'ancienne. Elles ne tournent aujourd'hui que
  dans `npm run db:verif`, et c'est justement ce qui les garde exactes.

---

## Accessibilité — plancher

Contraste AA minimum, y compris pour le texte secondaire. Navigation clavier
complète avec focus visible dessiné. `aria-label` sur toutes les actions de
séance (les libellés seuls ne suffisent pas quand le contexte est visuel).
`prefers-reduced-motion` respecté. Responsive de 320 à 1920px.
