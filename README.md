# FONTE

Application web de suivi de musculation pour les membres d'une salle privée.
On ouvre le site, on répond à un onboarding, on lance ses séances depuis son
téléphone et on retrouve ses charges la fois suivante.

**Contrainte n°1 : l'app s'utilise d'une main, en sueur, le téléphone posé sur
le banc.**

**Les données ne quittent pas l'appareil.** Pas de compte, pas de mot de passe,
pas de serveur : le carnet est écrit dans le navigateur. L'application
fonctionne donc hors-ligne par nature — une séance dans un garage sans réseau
se déroule exactement comme les autres.

- Contexte de travail et règles de design : [`CLAUDE.md`](./CLAUDE.md)
- Journal des arbitrages, daté : [`DECISIONS.md`](./DECISIONS.md)

---

## Ce que ça fait

| | |
|---|---|
| **Séance en direct** | Un exercice à la fois, charges et répétitions en très grand, incrémenteurs de 56 px, rappel de la dernière performance, timer de repos en anneau, détection de record immédiate. |
| **Records** | Charge max, 1RM estimé, volume sur une série, répétitions à charge égale. Détectés à la validation de la série. |
| **Progression** | Courbe de 1RM par exercice, tonnage hebdomadaire lu comme une pile de disques, carte corporelle teintée par le volume des 7 derniers jours. |
| **Suivi corporel** | Poids et mensurations avec moyenne mobile 7 jours, photos de progression et comparateur avant/après. Les photos restent dans le navigateur, elles ne sont envoyées nulle part. |
| **Programmes** | Modèles de séance, bibliothèque de 131 exercices filtrée par le matériel déclaré, duplication et réordonnancement. |
| **Sauvegarde** | Export CSV des séances et sauvegarde JSON complète depuis le profil. C'est le seul moyen de changer de téléphone : à dire clairement aux membres. |

---

## Démarrer

```bash
npm install     # Node 20.9 ou plus
npm run dev     # http://localhost:3000
```

C'est tout. Aucune variable d'environnement, aucun service à lancer, aucune
base à installer : `.env.local.example` existe uniquement pour dire qu'il est
vide.

Pour un aperçu du rendu de production — et pour toute mesure de performance :

```bash
npm run servir  # arrête tout, reconstruit, sert, et vérifie que le build servi n'est pas périmé
```

---

## Où vivent les données

Tout passe par une seule porte, `src/lib/donnees/depot.ts` :

```
composants  →  depot()  →  IndexedDB
                  ↑
          la seule chose à remplacer
          le jour où la salle veut un
          classement partagé
```

Aucun écran ne sait où sont les données. Ils demandent
`depot().seances()`, `depot().enregistrerSeance(...)`, `depot().records()` — et
les agrégats (`volumeParGroupe`, `tonnageHebdomadaire`, `progressionExercice`)
sont eux aussi dans le dépôt, parce que ce sont les requêtes SQL de demain.

| Fichier | Rôle |
|---|---|
| `lib/donnees/idb.ts` | Enveloppe typée d'IndexedDB, sans dépendance. Tolérante : rend du vide plutôt que de jeter, en navigation privée ou au rendu serveur. |
| `lib/donnees/modeles.ts` | Forme des documents locaux. Une séance est **un seul document** qui porte ses exercices et ses séries, au lieu de trois tables jointes. |
| `lib/donnees/depot.ts` | L'interface `Depot`, son implémentation locale, les agrégats. |
| `lib/donnees/hooks.ts` | `useDonnees()` et `useProfil()` — lecture, état de chargement, rechargement. |
| `lib/donnees/export.ts` | CSV, sauvegarde JSON, téléchargement. |

### Le chemin de retour vers une base

Le dossier `supabase/` est **conservé volontairement** : 9 migrations, le seed
des 131 exercices, les gabarits d'e-mail et 75 assertions SQL sur les policies
RLS. `npm run db:verif` les rejoue sur un Postgres jetable, sans Docker, ce qui
les garde exactes.

Rebrancher une base partagée, c'est donc : `supabase db push`, écrire un second
dépôt qui implémente la même interface, changer la ligne de `depot()` qui
choisit l'implémentation. Aucun écran à retoucher.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run servir` | Reconstruit, sert, et vérifie que le build servi n'est pas périmé |
| `npm run verif` | typecheck + lint + tests unitaires |
| `npm run test` | Vitest — calculs du domaine (28 tests) |
| `npm run e2e` | Playwright — écrans publics, audit axe, parcours complet |
| `npm run db:verif` | Schéma + RLS sur un Postgres jetable, sans Docker |

`npm run e2e` lance lui-même le serveur. Si le navigateur de Playwright n'est
pas celui de la machine, `CHROME_BIN=/chemin/vers/chrome npm run e2e` le lui
indique. `npm run db:verif` attend un Postgres joignable sur la socket
`/tmp/pgrun`, port 5433 — il crée et détruit sa propre base.
| `python3 scripts/generer-exercices-ts.py` | Régénère `lib/exercices.ts` et le seed SQL depuis la même source |
| `python3 scripts/generer-icones.py` | Régénère les icônes PWA |

> **Attention :** `next dev` et `next build` partagent le dossier `.next`. Lancer
> un build pendant qu'un serveur de développement tourne produit un build
> corrompu qui répond 400 sur tous les fichiers statiques — et des mesures de
> performance flatteuses mais fausses, puisque le JavaScript ne se charge
> jamais. `npm run servir` fait le ménage et refuse de rendre la main si le
> build servi ne correspond pas au disque.

---

## Déployer

L'application n'appelle aucun service : le déploiement n'a plus de
configuration du tout.

1. Pousse le dépôt sur GitHub.
2. Sur Vercel : *Add New → Project*, choisis le dépôt, *Deploy*. Le framework
   est détecté, il n'y a **aucune variable d'environnement à renseigner**.
3. Sur ton téléphone, ouvre le site et ajoute-le à l'écran d'accueil. C'est là
   que le mode hors-ligne et le verrou d'écran prennent tout leur sens.

Chaque téléphone porte son propre carnet. Deux personnes sur le même site ne se
voient pas — et une personne qui change de téléphone doit passer par la
sauvegarde JSON du profil.

---

## Qualité mesurée

Lighthouse mobile, build de production servi par `npm run servir`. La
performance varie d'une passe à l'autre sur une machine partagée : la colonne
donne la **plus basse** valeur observée sur trois passes, pas la plus flatteuse.

| Écran | Performance | Accessibilité | Bonnes pratiques | Blocage du fil principal |
|---|---|---|---|---|
| Accueil | 92 | 100 | 100 | 46–80 ms |
| Système de design | 97 | 100 | 100 | 73–81 ms |
| Hors-ligne | 95 | 100 | 100 | 61–70 ms |

Accessibilité et bonnes pratiques sont à 100 à chaque passe. Zéro erreur
console sur les trois écrans.

- 28 tests unitaires sur les calculs du domaine (1RM, tonnage, records,
  moyennes, séries de semaines)
- 10 tests Playwright : écrans publics, audit axe, et le parcours complet
  onboarding → séance → record → bilan → historique, rechargement de page
  compris
- 75 assertions SQL sur le schéma conservé, rejouées par `npm run db:verif`

---

## Structure

```
src/app/          Routes. Les pages de (app)/ sont des coquilles minces.
src/components/   ui/ · seance/ · onboarding/ · corps/ · graphes/ · trois-d/ · nav/ · tableau/
src/lib/          donnees/ · calculs · exercices · brand · fonts · format · types · schemas
src/stores/       Zustand — séance en cours, persistée dans localStorage
supabase/         Chemin de retour : migrations/ · tests/ · templates/
scripts/          Génération d'icônes, d'exercices, d'e-mails ; vérification SQL ; service
e2e/              Playwright
```

## Licence

Projet privé.
