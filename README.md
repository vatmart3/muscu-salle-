# FONTE

Application web de suivi de musculation pour les membres d'une salle privée.
Chacun crée son compte avec le code de la salle, répond à un onboarding, lance
ses séances depuis son téléphone et retrouve ses charges la fois suivante.

**Contrainte n°1 : l'app s'utilise d'une main, en sueur, le téléphone posé sur
le banc.** Elle fonctionne hors-ligne pendant toute une séance et se synchronise
au retour du réseau.

- Contexte de travail et règles de design : [`CLAUDE.md`](./CLAUDE.md)
- Journal des arbitrages, daté : [`DECISIONS.md`](./DECISIONS.md)

---

## Ce que ça fait

| | |
|---|---|
| **Séance en direct** | Un exercice à la fois, charges et répétitions en très grand, incrémenteurs de 56 px, rappel de la dernière performance, timer de repos en anneau, détection de record immédiate. Tout fonctionne sans réseau. |
| **Records** | Charge max, 1RM estimé, volume sur une série, répétitions à charge égale. Détectés à la validation, confirmés par la base. |
| **Progression** | Courbe de 1RM par exercice, tonnage hebdomadaire lu comme une pile de disques, carte corporelle teintée par le volume des 7 derniers jours. |
| **Suivi corporel** | Poids et mensurations avec moyenne mobile 7 jours, photos de progression et comparateur avant/après. Strictement privé. |
| **Programmes** | Modèles de séance, bibliothèque de 131 exercices, partage par code court entre membres. |
| **Salle** | Classement hebdomadaire sur inscription (prénom, séances, tonnage), espace admin pour les codes d'accès. |

---

## Démarrer en local

### 1. Dépendances

```bash
npm install
```

Node 20.9 ou plus.

### 2. Base de données

Avec le [CLI Supabase](https://supabase.com/docs/guides/local-development) :

```bash
supabase start          # démarre Postgres, Auth, Storage et Studio
supabase db reset       # applique les migrations + le seed des 131 exercices
```

`supabase start` affiche l'URL de l'API et la clé `anon`. Pour le développement
local, **désactive la confirmation d'e-mail** (`enable_confirmations = false`
dans `supabase/config.toml`, section `[auth.email]`), sinon chaque inscription
attend un clic dans Inbucket (`http://localhost:54324`).

Sans Docker, le schéma et les policies se vérifient quand même :

```bash
npm run db:verif        # rejoue tout le schéma + 75 assertions de RLS sur un Postgres nu
```

### 3. Variables d'environnement

```bash
cp .env.local.example .env.local
```

Puis remplis les valeurs. Chaque variable est commentée dans le fichier.

### 4. Lancer

```bash
npm run dev             # http://localhost:3000
```

Le premier compte créé devient automatiquement administrateur de la salle. Le
code d'accès initial est `FONTE-2026` ; les suivants se créent depuis `/admin`.

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run servir` | Reconstruit, sert, et vérifie que le build servi n'est pas périmé |
| `npm run verif` | typecheck + lint + tests unitaires |
| `npm run test` | Vitest — calculs du domaine (28 tests) |
| `npm run db:verif` | Schéma + RLS sur un Postgres jetable, sans Docker |
| `npm run e2e:public` | Playwright — écrans publics et audit d'accessibilité |
| `npm run e2e:parcours` | Playwright — inscription → onboarding → séance → bilan |
| `npm run emails` | Régénère les gabarits d'e-mail |
| `python3 scripts/generer-icones.py` | Régénère les icônes PWA |
| `python3 scripts/generer-seed-exercices.py` | Régénère la migration de seed |

> **Attention :** `next dev` et `next build` partagent le dossier `.next`. Lancer
> un build pendant qu'un serveur de développement tourne produit un build
> corrompu qui répond 400 sur tous les fichiers statiques — et des mesures de
> performance flatteuses mais fausses, puisque le JavaScript ne se charge
> jamais. `npm run servir` fait le ménage et refuse de rendre la main si le
> build servi ne correspond pas au disque.

---

## Déployer sur Vercel

### 1. Projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Applique les migrations :
   ```bash
   supabase link --project-ref <référence-du-projet>
   supabase db push
   ```
3. **Authentication → URL Configuration** : mets l'URL de production en
   *Site URL*, et ajoute en *Redirect URLs* :
   `https://<ton-domaine>/auth/confirmer` et `https://<ton-domaine>/auth/callback`.
4. **Authentication → Email Templates** : colle le contenu de
   `supabase/templates/confirmation.html`, `connexion.html` et
   `reinitialisation.html` dans *Confirm signup*, *Magic Link* et
   *Reset Password*. Les sujets sont dans `supabase/config.toml`.
5. **Storage** : le bucket `photos-progres` est créé par la migration, privé.
   Vérifie qu'il n'est pas passé en public.

### 2. Importer le dépôt

Sur Vercel : *Add New → Project*, choisis le dépôt. Le framework est détecté
automatiquement, aucune commande à modifier.

### 3. Variables d'environnement

Dans *Settings → Environment Variables*, pour **Production** et **Preview** :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé `anon` |
| `NEXT_PUBLIC_SITE_URL` | `https://<ton-domaine>` |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé `service_role` — **jamais** préfixée `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Clé publique Web Push |
| `VAPID_PRIVATE_KEY` | Clé privée Web Push |
| `VAPID_SUBJECT` | `mailto:contact@exemple.fr` |
| `CRON_SECRET` | `openssl rand -base64 32` |

Les clés VAPID se génèrent avec `npx web-push generate-vapid-keys`.

### 4. Relances

`vercel.json` déclare un cron quotidien à 17 h UTC sur `/api/relances`. Vercel
l'ajoute automatiquement au premier déploiement ; la route refuse toute requête
sans l'en-tête `Authorization: Bearer $CRON_SECRET`.

### 5. Après le premier déploiement

1. Ouvre le site, crée ton compte avec `FONTE-2026` : tu deviens administrateur.
2. Va dans `/admin`, crée un code par personne que tu veux faire entrer, et
   désactive `FONTE-2026`.
3. Sur ton téléphone, ajoute le site à l'écran d'accueil — c'est là que le mode
   hors-ligne, le verrou d'écran et les notifications prennent tout leur sens.

---

## Qualité mesurée

Lighthouse mobile, build de production :

| Écran | Performance | Accessibilité | Bonnes pratiques |
|---|---|---|---|
| Accueil | 97 | 100 | 100 |
| Connexion | 98 | 100 | 100 |
| Inscription | 97 | 100 | 100 |
| Système de design | 98 | 100 | 100 |
| Hors-ligne | 98 | 100 | 100 |

- 28 tests unitaires sur les calculs du domaine, dont deux de parité avec le SQL
- 75 assertions SQL sur l'inscription, les déclencheurs et l'isolation RLS
- 14 tests Playwright sur les écrans publics, audit axe inclus
- Un parcours Playwright complet, ignoré proprement quand Supabase est absent

---

## Structure

```
src/app/          Routes. Server Components par défaut.
src/components/   ui/ · seance/ · onboarding/ · corps/ · graphes/ · trois-d/ · nav/
src/lib/          brand · fonts · calculs · format · types · schémas Zod · supabase/
src/stores/       Zustand — séance en cours, persistée dans localStorage
src/actions/      Server Actions
supabase/         migrations/ · tests/ · templates/
scripts/          Génération d'icônes, de seed, d'e-mails ; vérification SQL ; captures
e2e/              Playwright
```

## Licence

Projet privé.
