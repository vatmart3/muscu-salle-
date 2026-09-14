"use client";

import { useEffect, useState, useTransition } from "react";
import { enregistrerAbonnement, retirerAbonnement } from "@/actions/push";
import { Bouton } from "@/components/ui/Bouton";
import { BandeauErreur, BandeauFait } from "@/components/ui/Etats";

/**
 * Abonnement aux relances push.
 *
 * La permission n'est demandée qu'au clic explicite sur le bouton : un
 * navigateur qui voit une demande au chargement la refuse de plus en plus
 * souvent, et l'utilisateur aussi.
 */
export function Relances({ actif }: { actif: boolean }) {
  const [etat, setEtat] = useState<"inconnu" | "abonne" | "absent" | "refuse" | "indisponible">("inconnu");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEtat("indisponible");
      return;
    }
    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }
    void navigator.serviceWorker.ready
      .then((enregistrement) => enregistrement.pushManager.getSubscription())
      .then((abonnement) => setEtat(abonnement ? "abonne" : "absent"))
      .catch(() => setEtat("indisponible"));
  }, []);

  async function abonner() {
    setErreur(null);
    const cle = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!cle) {
      setErreur("Les notifications ne sont pas configurées sur ce déploiement.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setEtat(permission === "denied" ? "refuse" : "absent");
      return;
    }
    const enregistrement = await navigator.serviceWorker.ready;
    const abonnement = await enregistrement.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64VersOctets(cle),
    });
    const brut = abonnement.toJSON();
    const resultat = await enregistrerAbonnement({
      endpoint: abonnement.endpoint,
      p256dh: brut.keys?.p256dh ?? "",
      auth: brut.keys?.auth ?? "",
    });
    if (resultat.erreur) setErreur(resultat.erreur);
    else setEtat("abonne");
  }

  async function desabonner() {
    const enregistrement = await navigator.serviceWorker.ready;
    const abonnement = await enregistrement.pushManager.getSubscription();
    if (abonnement) {
      await retirerAbonnement(abonnement.endpoint);
      await abonnement.unsubscribe();
    }
    setEtat("absent");
  }

  if (etat === "indisponible") {
    return (
      <p className="text-mention text-texte-tenu">
        Ce navigateur ne gère pas les notifications. Sur iPhone, il faut d&apos;abord ajouter FONTE à l&apos;écran
        d&apos;accueil.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {erreur && <BandeauErreur>{erreur}</BandeauErreur>}
      {etat === "refuse" && (
        <BandeauErreur>
          Les notifications sont bloquées pour ce site. Il faut les réautoriser dans les réglages du navigateur.
        </BandeauErreur>
      )}
      {etat === "abonne" ? (
        <>
          <BandeauFait>
            Ce téléphone recevra une relance après trois jours sans séance
            {actif ? "." : " — pense à activer la relance dans tes réglages."}
          </BandeauFait>
          <Bouton
            ton="secondaire"
            taille="compact"
            className="self-start"
            disabled={enCours}
            onClick={() => demarrer(async () => desabonner())}
          >
            Ne plus recevoir de relance sur ce téléphone
          </Bouton>
        </>
      ) : (
        <Bouton
          ton="secondaire"
          taille="pouce"
          className="self-start"
          disabled={enCours}
          onClick={() => demarrer(async () => abonner())}
        >
          Activer les relances sur ce téléphone
        </Bouton>
      )}
    </div>
  );
}

/**
 * La clé VAPID est en base64url ; `pushManager.subscribe` veut un tampon.
 * Le `ArrayBuffer` est alloué explicitement : un `Uint8Array` générique peut
 * être adossé à un `SharedArrayBuffer`, que l'API refuse.
 */
function base64VersOctets(base64: string): ArrayBuffer {
  const remplissage = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalise = (base64 + remplissage).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(normalise);
  const tampon = new ArrayBuffer(brut.length);
  const octets = new Uint8Array(tampon);
  for (let i = 0; i < brut.length; i += 1) octets[i] = brut.charCodeAt(i);
  return tampon;
}
