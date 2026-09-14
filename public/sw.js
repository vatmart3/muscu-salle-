/**
 * FONTE — service worker.
 *
 * Depuis que les données vivent dans IndexedDB, l'application est hors-ligne
 * par nature : il n'y a plus rien à synchroniser. Le rôle du worker se réduit
 * donc à garder la coquille, les polices et les pages déjà visitées, pour que
 * l'app s'ouvre sans réseau — pas seulement l'écran de séance.
 *
 * Il ne met en cache aucune donnée d'entraînement : celles-ci ne passent
 * jamais par le réseau, elles n'ont donc jamais à passer par un cache.
 */

const VERSION = "fonte-v1";
const COQUILLE = `${VERSION}-coquille`;
const PAGES = `${VERSION}-pages`;

/** Ressources sans lesquelles l'app ne s'affiche pas du tout. */
const INDISPENSABLES = [
  "/hors-ligne",
  "/manifest.webmanifest",
  "/icones/icone-192.png",
  "/icones/icone-512.png",
];

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches.open(COQUILLE).then((cache) => cache.addAll(INDISPENSABLES)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

function estStatique(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icones/") ||
    url.pathname.endsWith(".woff2")
  );
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  const url = new URL(requete.url);
  // Jamais de cache sur ce qui n'est pas à nous.
  if (url.origin !== self.location.origin) return;

  // Actifs versionnés : immuables, on sert le cache en premier.
  if (estStatique(url)) {
    evenement.respondWith(
      caches.match(requete).then(
        (cache) =>
          cache ??
          fetch(requete).then((reponse) => {
            if (reponse.ok) {
              const copie = reponse.clone();
              caches.open(COQUILLE).then((c) => c.put(requete, copie));
            }
            return reponse;
          }),
      ),
    );
    return;
  }

  // Navigations : réseau d'abord, cache ensuite, page hors-ligne en dernier.
  // C'est ce qui permet de rouvrir n'importe quel écran sans réseau : la page
  // revient du cache et lit ses données dans IndexedDB.
  if (requete.mode === "navigate") {
    evenement.respondWith(
      fetch(requete)
        .then((reponse) => {
          if (reponse.ok) {
            const copie = reponse.clone();
            caches.open(PAGES).then((c) => c.put(requete, copie));
          }
          return reponse;
        })
        .catch(async () => {
          const cache = await caches.match(requete);
          if (cache) return cache;
          const repli = await caches.match("/hors-ligne");
          return repli ?? new Response("Hors-ligne", { status: 503, headers: { "Content-Type": "text/plain" } });
        }),
    );
  }
});

self.addEventListener("notificationclick", (evenement) => {
  evenement.notification.close();
  const cible = evenement.notification.data?.url ?? "/tableau-de-bord";
  evenement.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((fenetres) => {
      for (const fenetre of fenetres) {
        if (fenetre.url.includes(cible) && "focus" in fenetre) return fenetre.focus();
      }
      return self.clients.openWindow(cible);
    }),
  );
});
