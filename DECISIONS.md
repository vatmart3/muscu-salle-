# Décisions

Un arbitrage, une ligne, une date. Le plus récent en haut.

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
