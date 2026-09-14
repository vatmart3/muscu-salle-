# Décisions

Un arbitrage, une ligne, une date. Le plus récent en haut.

## 2026-09-14 — Lot 7 et accueil public

- **2026-09-14** — La **semaine courante ne casse pas la série** tant qu'elle n'est pas finie : elle ne l'allonge que si l'objectif y est déjà atteint. Sans cette règle, tout le monde perdait sa série tous les lundis matin.
- **2026-09-14** — Les semaines sans séance n'apparaissent pas dans l'agrégat SQL : `semainesCompletes` les rétablit avant tout calcul de série. Leur absence faisait croire à une continuité qui n'existait pas. Testé.
- **2026-09-14** — Le tableau de bord n'a **qu'un seul héros** : l'anneau de la semaine. Les autres informations sont des lignes de texte, sans carte ni ombre.
- **2026-09-14** — La prochaine séance proposée est celle qui **suit la dernière faite dans l'ordre du programme** : un Push Pull Legs tourne, il ne repropose pas éternellement la première séance.
- **2026-09-14** — L'historique se déplie **sur place** : on ne quitte jamais la page pour lire le détail d'une série. Filtres par groupe musculaire et recherche sur le nom de séance ou d'exercice.
- **2026-09-14** — La scène 3D d'accueil est coupée si le mouvement réduit est demandé, si l'appareil est modeste (≤ 2 cœurs, ≤ 2 Go), si le mode économie de données est actif, **ou si WebGL n'est pas disponible** — un canevas sans WebGL est un rectangle vide. Le repli est la même image en SVG, sans une ligne de JavaScript.
- **2026-09-14** — Seuils d'appareil relâchés de « ≤ 4 cœurs » à « ≤ 2 cœurs » : beaucoup de téléphones milieu de gamme parfaitement capables déclarent 4 cœurs.

## 2026-09-14 — Lots 5 et 6 : séance en direct et bilan

- **2026-09-14** — **Les identifiants viennent du client** (`crypto.randomUUID`) pour les séries et les exercices de séance. C'est ce qui rend la synchronisation idempotente : renvoyer deux fois le même instantané ne crée rien en double, et un envoi perdu est simplement remplacé par le suivant.
- **2026-09-14** — La synchronisation est un **instantané complet**, pas un journal d'opérations. Un journal aurait exigé un ordre garanti et une reprise sur erreur ; l'instantané converge tout seul. Coût assumé : on renvoie toute la séance (quelques dizaines de lignes) à chaque envoi.
- **2026-09-14** — **Le démarrage exige le réseau**, tout le reste non. C'est le seul moment où il faut la bibliothèque, la dernière performance et les records. Une fois la séance lancée, saisie, validation, détection de record, chrono et timer fonctionnent sans réseau.
- **2026-09-14** — Le chrono et le timer de repos se calculent depuis un **horodatage**, jamais depuis un compteur incrémenté : verrouiller le téléphone ou changer d'app ne les fait pas dériver.
- **2026-09-14** — La détection de record est **locale d'abord** (`lib/calculs`), le serveur tranche ensuite : `synchroniserSeance` relit `est_record` et le magasin se réaligne. Sans la détection locale, aucune célébration ne serait possible hors-ligne.
- **2026-09-14** — Les records qui viennent de tomber entrent **immédiatement** dans les records connus du magasin : sans ça, la série suivante rebattrait le même record et déclencherait une seconde célébration.
- **2026-09-14** — **Une seule célébration à la fois**, même quand quatre records tombent d'un coup (première série sur un exercice neuf). Ordre de préférence : charge max, 1RM, reps, volume.
- **2026-09-14** — Le timer de repos est une **surcouche non bloquante** posée au-dessus du bouton de validation : on doit pouvoir corriger la série qu'on vient de valider, ce qui arrive dès qu'on s'est trompé d'un disque.
- **2026-09-14** — L'anneau de complétion a été **retiré du titre de l'exercice** : il faisait doublon avec la rangée d'anneaux de la barre haute, et volait la largeur au nom de l'exercice.
- **2026-09-14** — La permission de notification est demandée **au premier repos déclenché**, pas au chargement de la page : une demande à froid se fait refuser.
- **2026-09-14** — Clôturer une séance **exige le réseau** et le dit franchement plutôt que de faire semblant : la séance reste sur le téléphone jusqu'au retour de la connexion.
- **2026-09-14** — Le ressenti de fin de séance se lit en **disques de taille croissante**, pas en arcs : les arcs ressemblaient à des indicateurs de chargement.
- **2026-09-14** — Les aperçus d'écran (`/design/apercus/*`) sont **coupés en production** par leur layout : ils remplissent le magasin de séance avec des données factices et écraseraient une séance en cours.

## 2026-09-14 — Lot 4 : onboarding

- **2026-09-14** — **Enregistrement optimiste** : on avance à l'écran suivant tout de suite et on sauvegarde derrière. Un creux de réseau ne doit pas bloquer l'onboarding ; les réponses qui n'ont pas pu partir entrent dans une file de rejeu renvoyée avec l'étape finale. La version bloquante a été écrite d'abord, puis jetée après essai — elle rendait l'app inutilisable dès que Supabase ne répondait pas.
- **2026-09-14** — La molette (taille, poids, date) est un vrai `spinbutton` focusable, piloté aux flèches, Page précédente/suivante, Début et Fin. Le défilement au doigt et le clavier écrivent dans le même état : un sélecteur à molette non accessible aurait coûté les 100 d'accessibilité.
- **2026-09-14** — Les quatre cartes d'objectif sont illustrées **à l'anneau** (plein, fin, dense, pointillé, concentrique) et non par des photos ou des icônes empruntées : c'est le seul vocabulaire graphique autorisé.
- **2026-09-14** — Le poids saisi à l'onboarding n'est pas une colonne de profil mais la **première ligne de `mesures`** : c'est une donnée qui bouge, elle appartient à la courbe.
- **2026-09-14** — Le programme initial n'est pas un modèle figé : chaque emplacement d'une séance liste des **candidats par ordre de préférence** et on retient le premier exercice que le matériel déclaré permet. Sans ça, un membre sans rack se retrouvait avec un programme de squat barre.
- **2026-09-14** — Un format qui demande plus de jours que déclaré est **pénalisé mais pas masqué** : il reste visible comme objectif à atteindre.
- **2026-09-14** — Ajout de `typo()` : espace fine insécable avant `? ! ; : »`, insécable avant `%`. Sans ça, un point d'interrogation se retrouve seul sur une ligne dès qu'un titre passe à la ligne — ce qui arrive systématiquement à 390 px. Appliqué dans les primitives qui rendent de la copy française.

## 2026-09-14 — Lot 3 : authentification

- **2026-09-14** — Les liens d'e-mail visent `/auth/confirmer?token_hash=…` (vérification OTP côté serveur) plutôt que `{{ .ConfirmationURL }}` : la session est posée par notre propre route, dans nos cookies, sans rebond par le domaine Supabase.
- **2026-09-14** — Le paramètre `suite` des routes d'authentification est filtré : seul un chemin interne est accepté. Sans ce filtre, un lien d'e-mail devient une redirection ouverte.
- **2026-09-14** — Les erreurs d'Auth sont retraduites en français et appauvries : « User already registered » dirait à un inconnu qui est inscrit à la salle. Même réponse que le compte existe ou non sur la réinitialisation.
- **2026-09-14** — Le middleware utilise `getUser()` et non `getSession()` : `getSession()` lit un cookie sans le vérifier, c'est suffisant pour afficher un prénom, jamais pour décider d'un accès.
- **2026-09-14** — Le lien magique est ouvert avec `shouldCreateUser: false` : c'est un secours de connexion, pas une porte d'entrée qui contournerait le code de la salle.
- **2026-09-14** — Session : jeton d'accès d'une heure, rotation des jetons de rafraîchissement, boîte de 30 jours. C'est le rafraîchissement à chaque requête du middleware qui tient la session ouverte, pas une durée de jeton longue.
- **2026-09-14** — L'indicateur de robustesse est **quatre segments d'encre**, pas une barre verte : le vert n'existe pas dans cette palette, et le score pèse d'abord la longueur.
- **2026-09-14** — Les gabarits d'e-mail sont générés (`npm run emails`) en tables et styles en ligne, sans SVG : le disque de la marque est un `div` à bordure arrondie, la seule forme ronde que tous les clients de messagerie rendent correctement.
- **2026-09-14** — `src/lib/types-db.ts` est écrit à la main plutôt que généré par `supabase gen types` : la génération suppose un projet distant joignable au moment du build. Contrepartie assumée, notée dans CLAUDE.md : toute migration qui touche une colonne se reporte dans ce fichier.

## 2026-09-14 — Lot 2 : base de données

- **2026-09-14** — Référence d'interface envoyée par le commanditaire (maquette « Gofit ») : on en garde les **mécaniques** d'onboarding (une question par écran, sélecteurs à molette pour taille/poids/âge, Retour et Continuer toujours visibles, récapitulatif de profil) et **rien du look** (violet, fond sombre, photos pleine largeur, connexions sociales). Les règles 1 à 3 du brief priment.
- **2026-09-14** — Les migrations sont vérifiées sur un **Postgres nu** via `scripts/harnais-postgres.sql`, qui reproduit le minimum de l'environnement Supabase (schémas `auth` et `storage`, rôles, `auth.uid()`). `npm run db:verif` rejoue tout le schéma et les tests de RLS sans Docker ni CLI Supabase.
- **2026-09-14** — **Faille corrigée avant d'écrire une ligne d'interface** : la RLS raisonne par ligne, pas par colonne. La policy « tu modifies ta propre ligne » laissait un membre passer `profiles.role` à `admin` et gonfler `seances.volume_total`, donc le classement de la salle. Fermé par des droits `GRANT UPDATE (colonnes)` explicites plus un déclencheur `verrouiller_role`. Trouvé par les tests, pas par relecture.
- **2026-09-14** — `role` n'est modifiable par **personne** depuis l'API. Le premier inscrit est promu administrateur par déclencheur, toute autre promotion passe par du SQL volontaire. L'espace admin gère les accès, pas les rangs.
- **2026-09-14** — Le code d'accès est **consommé dans la même transaction que la création du compte** (déclencheur sur `auth.users`) : pas de compte sans code valable, pas de code brûlé sans compte. La route d'inscription revalide en amont, uniquement pour donner un message clair.
- **2026-09-14** — Le classement est une **vue `security_invoker = false`** et non une table : elle ne peut exposer que prénom, semaine, séances et tonnage, et seulement pour les membres opt-in. Un test vérifie la liste exacte des colonnes.
- **2026-09-14** — Aucune policy administrateur sur `mesures` et `photos_progres`, volontairement. Un administrateur de salle gère les accès, pas les corps. Testé.
- **2026-09-14** — Les records sont écrits **uniquement par déclencheur** (`series_enregistrer_records`) : aucune policy `insert`/`update` sur `records`. Personne ne se fabrique un record.
- **2026-09-14** — Contrainte d'unicité partielle `seances_une_seule_en_cours_idx` : un membre ne peut avoir qu'une séance en cours. C'est ce qui rend fiable la reprise de séance après fermeture de l'app.
- **2026-09-14** — Les 131 exercices sont générés par `scripts/generer-seed-exercices.py` plutôt qu'écrits à la main dans le SQL : l'échappement des apostrophes françaises est la source d'erreur numéro un d'un seed de cette taille.
- **2026-09-14** — Les mouvements Hyrox référencent du matériel absent du garage (traîneau, rameur, ski erg, medecine ball, sac). Conservés dans le seed : l'onboarding filtre sur le matériel déclaré, ils n'apparaissent donc que pour qui les coche.
- **2026-09-14** — Le groupe secondaire d'un exercice compte pour **moitié** dans `volume_par_groupe`, qui alimente la carte corporelle. Compter plein aurait teinté tout le haut du corps à chaque développé couché.

## 2026-09-14 — Lot 1 : fondations

- **2026-09-14** — Next.js 15.5 + React 19 + Tailwind v4 : stack imposée, App Router, Server Components par défaut.
- **2026-09-14** — Satoshi est distribuée par Fontshare, inaccessible depuis l'environnement de build (proxy). Substitution par **Hanken Grotesk** variable (SIL OFL), la plus proche en chasse et en rondeur, et surtout ni Inter ni Poppins. Le remplacement est un changement de deux lignes : déposer `Satoshi-Variable.woff2` dans `src/fonts/` et modifier `policeUi` dans `src/lib/fonts.ts`.
- **2026-09-14** — Archivo est chargée **instanciée en largeur Expanded** (`wdth=125`) et sous-ensemblée au latin : 37 ko au lieu de 658 ko, graisse variable 100→900 conservée. Script de génération documenté dans `DECISIONS.md` et reproductible avec `fonttools`.
- **2026-09-14** — Polices servies en local via `next/font/local` plutôt que `next/font/google` : aucune requête réseau au build, aucun CDN tiers, `font-src 'self'` dans la CSP.
- **2026-09-14** — `--color-signal` (#FF4D3D) mesure 3,29:1 sur blanc : conforme AA en grand corps et en élément graphique, **pas** en texte courant. Ajout de `--color-signal-texte` (#C42A1C, 5,68:1) réservé aux libellés de record en petit corps. Le rouge reste exclusif aux records.
- **2026-09-14** — Conséquence de la règle précédente : **les erreurs ne peuvent pas être rouges**. Elles se rendent en **encre inversée** (fond `--color-inverse-fond`, texte blanc) pour les bandeaux, et en bordure 2px d'encre + libellé en gras pour les champs. Le vert n'existe pas dans cette palette.
- **2026-09-14** — `<Anneau>` n'est **pas** un composant client : l'arc s'anime par transition CSS sur `stroke-dashoffset`. Il reste donc utilisable dans un Server Component, et Framer Motion est réservé aux mouvements qui en ont réellement besoin.
- **2026-09-14** — Les dégradés d'anneau sont déclarés **une seule fois** dans le layout racine (`<DefsAnneaux>`) plutôt que dans chaque instance : évite la duplication de `<defs>` et les collisions d'identifiants SVG.
- **2026-09-14** — Navigation : **rail d'encre** en bas, fond `--color-inverse-fond`, libellés **texte seul**, actif marqué par un disque. Pas d'icônes, pas cinq onglets. Il disparaît entièrement pendant une séance.
- **2026-09-14** — Les **séries d'échauffement ne comptent pas dans le tonnage** et ne peuvent battre aucun record : sinon un échauffement long gonfle artificiellement la semaine.
- **2026-09-14** — Le 1RM d'Epley est **écrit** par la fonction Postgres `public.epley_1rm` (source de vérité), et **affiché** par `lib/calculs.ts` pour le rendu optimiste et le mode hors-ligne. Un test de parité (`calculs.test.ts`) garantit qu'ils ne divergent pas. Sans cette copie unique et testée, l'écran de séance ne pourrait pas détecter un record sans réseau.
- **2026-09-14** — Tonnage affiché en **tonnes au-delà de 10 000 kg** : « 12,5 t » tient dans un anneau, « 12 480 kg » non.
- **2026-09-14** — Le nom de l'app est centralisé dans `src/lib/brand.ts` et alimente le manifeste PWA généré (`src/app/manifest.ts`) : le renommer est un changement d'une ligne.
