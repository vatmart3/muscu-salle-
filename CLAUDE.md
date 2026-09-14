# FONTE — contexte de travail

Application web de suivi de musculation pour les membres d'une salle privée
(garage aménagé). Chacun crée son compte avec le code de la salle, remplit un
onboarding, lance ses séances depuis son téléphone et suit sa progression.

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
| `npm run e2e` | Playwright — parcours critique |
| `npm run verif` | typecheck + lint + test, à lancer avant chaque commit |
| `npm run db:verif` | Rejoue schéma + tests RLS sur un Postgres nu, sans Docker |
| `npm run db:reset` | Rejoue toutes les migrations sur la base locale Supabase |
| `npm run db:push` | Applique les migrations sur le projet distant |
| `python3 scripts/generer-icones.py` | Régénère les icônes PWA depuis la marque |
| `node scripts/capture.mjs <url> <sortie.png> [largeur] [hauteur]` | Capture d'écran de contrôle |

Supabase en local : `supabase start` puis `supabase db reset`.

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
  app/                 Routes App Router. Server Components par défaut.
    (public)/          Accueil, inscription, connexion — non authentifié
    (app)/             Tout ce qui exige une session
    design/            Page de démonstration du système de design
  components/
    ui/                Primitives : Anneau, Bouton, Champ, Surface, Chiffre…
    seance/            Écran de séance en direct
    3d/                Les trois scènes React Three Fiber
    graphes/           Graphiques stylés main (Recharts habillé)
  lib/                 brand, fonts, calculs, format, types, schémas Zod, supabase/
  stores/              Zustand — état de la séance en cours, file de synchro
  fonts/               Fichiers woff2 servis en local
supabase/
  migrations/          Schéma versionné. Jamais de modification manuelle non tracée.
  templates/           E-mails transactionnels aux couleurs de l'app
scripts/               Outils de développement
```

### Règles de structure

- **Server Components par défaut.** `"use client"` seulement quand il y a un
  état, un événement, une API navigateur ou une animation pilotée.
- Les accès Supabase côté serveur passent par `lib/supabase/server.ts`, côté
  navigateur par `lib/supabase/client.ts`. Jamais `createClient` en ligne.
- `SUPABASE_SERVICE_ROLE_KEY` ne quitte jamais le serveur. Aucun import de
  `lib/supabase/admin.ts` depuis un fichier portant `"use client"`.
- Toute validation de formulaire est écrite une fois dans `lib/schemas.ts` avec
  Zod, et utilisée **des deux côtés** (client et Server Action).
- Toute copy française passe par `typo()` de `lib/format.ts` (espace fine
  insécable avant `? ! ; : »`). Quand le texte est mêlé à du JSX, écrire
  l'espace en échappement visible : `{"Volume\u202f:"}`.
- Toute migration qui touche une colonne se reporte dans `lib/types-db.ts`.
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
- Migrations SQL numérotées et immuables une fois poussées : on corrige avec une
  nouvelle migration, jamais en éditant l'ancienne.

---

## Accessibilité — plancher

Contraste AA minimum, y compris pour le texte secondaire. Navigation clavier
complète avec focus visible dessiné. `aria-label` sur toutes les actions de
séance (les libellés seuls ne suffisent pas quand le contexte est visuel).
`prefers-reduced-motion` respecté. Responsive de 320 à 1920px.
