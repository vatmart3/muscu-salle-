"use client";

/**
 * Fin de repos : vibration, et un son court synthétisé plutôt qu'un fichier.
 * Deux raisons : aucun octet à télécharger, et aucun risque de latence sur un
 * réseau qui ne répond pas.
 */
export function vibrer(motif: number | number[] = [120, 60, 120]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(motif);
  } catch {
    // Certains navigateurs exposent l'API sans l'implémenter.
  }
}

let contexte: AudioContext | null = null;

export function bip(actif: boolean): void {
  if (!actif || typeof window === "undefined") return;
  try {
    const Constructeur = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructeur) return;
    contexte ??= new Constructeur();
    if (contexte.state === "suspended") void contexte.resume();

    const maintenant = contexte.currentTime;
    for (const [rang, frequence] of [880, 1174].entries()) {
      const oscillateur = contexte.createOscillator();
      const gain = contexte.createGain();
      oscillateur.type = "sine";
      oscillateur.frequency.value = frequence;
      const debut = maintenant + rang * 0.16;
      gain.gain.setValueAtTime(0.0001, debut);
      gain.gain.exponentialRampToValueAtTime(0.22, debut + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, debut + 0.14);
      oscillateur.connect(gain).connect(contexte.destination);
      oscillateur.start(debut);
      oscillateur.stop(debut + 0.16);
    }
  } catch {
    // Politique d'autoplay, contexte audio indisponible : la vibration suffit.
  }
}

/** Notification système quand l'app n'est pas au premier plan. */
export function notifierFinRepos(nomExercice: string): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (document.visibilityState === "visible") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("Repos terminé", {
      body: `${nomExercice} — série suivante.`,
      icon: "/icones/icone-192.png",
      badge: "/icones/icone-192.png",
      tag: "fonte-repos",
      silent: false,
    });
  } catch {
    // Certaines plateformes exigent un service worker pour notifier.
  }
}
