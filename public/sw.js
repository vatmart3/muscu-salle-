/**
 * FONTE — service worker.
 *
 * Trois responsabilités, pas une de plus :
 *   1. garder la coquille de l'app et les polices sous la main ;
 *   2. laisser l'écran de séance s'ouvrir sans réseau ;
 *   3. afficher les notifications de relance.
 *
 * Rien n'est mis en cache côté API ni côté Supabase : les données d'un membre
 * n'ont rien à faire dans un cache partagé avec le navigateur.
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
  // Jamais de cache sur ce qui n'est pas à nous, ni sur les appels de données.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

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
  // C'est ce qui permet de rouvrir /seance sans réseau : la page revient du
  // cache et l'état de la séance est rechargé depuis localStorage.
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

self.addEventListener("push", (evenement) => {
  let charge = { titre: "FONTE", corps: "", url: "/tableau-de-bord" };
  try {
    if (evenement.data) charge = { ...charge, ...evenement.data.json() };
  } catch {
    charge.corps = evenement.data ? evenement.data.text() : "";
  }

  evenement.waitUntil(
    self.registration.showNotification(charge.titre, {
      body: charge.corps,
      icon: "/icones/icone-192.png",
      badge: "/icones/icone-192.png",
      tag: charge.tag || "fonte-relance",
      data: { url: charge.url },
      requireInteraction: false,
    }),
  );
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
