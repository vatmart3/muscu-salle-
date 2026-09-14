import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { clientAdmin } from "@/lib/supabase/admin";

/**
 * Relances : une notification aux membres qui n'ont pas fait de séance depuis
 * trois jours et qui l'ont demandé.
 *
 * Appelée par le Cron Vercel (voir vercel.json). Protégée par `CRON_SECRET` :
 * sans ce garde, n'importe qui pourrait déclencher un envoi en masse.
 *
 * Le message énonce un fait. Pas de culpabilisation, pas de point
 * d'exclamation : « Trois jours sans séance », pas « Tu nous manques ».
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JOURS_SANS_SEANCE = 3;

export async function GET(requete: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const entete = requete.headers.get("authorization");
  if (!secret || entete !== `Bearer ${secret}`) {
    return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  }

  const publique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privee = process.env.VAPID_PRIVATE_KEY;
  const sujet = process.env.VAPID_SUBJECT;
  if (!publique || !privee || !sujet) {
    return NextResponse.json({ erreur: "Clés VAPID absentes" }, { status: 500 });
  }
  webpush.setVapidDetails(sujet, publique, privee);

  const admin = clientAdmin();
  const seuil = new Date(Date.now() - JOURS_SANS_SEANCE * 86_400_000).toISOString();

  const { data: candidats } = await admin
    .from("profiles")
    .select("id, prenom, abonnements_push(endpoint, p256dh, auth)")
    .eq("relance_active", true);

  let envoyees = 0;
  let nettoyees = 0;

  for (const membre of candidats ?? []) {
    const abonnements = membre.abonnements_push ?? [];
    if (abonnements.length === 0) continue;

    const { data: derniere } = await admin
      .from("seances")
      .select("demarree_a")
      .eq("user_id", membre.id)
      .eq("statut", "terminee")
      .order("demarree_a", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Jamais de séance du tout : on ne relance pas quelqu'un qui vient de
    // s'inscrire, il n'a encore rien à reprendre.
    if (!derniere || derniere.demarree_a > seuil) continue;

    const jours = Math.floor((Date.now() - new Date(derniere.demarree_a).getTime()) / 86_400_000);
    const charge = JSON.stringify({
      titre: `${jours} jours sans séance`,
      corps: "Ta dernière séance attend d'être battue.",
      url: "/seance",
      tag: "fonte-relance",
    });

    for (const abonnement of abonnements) {
      try {
        await webpush.sendNotification(
          { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.p256dh, auth: abonnement.auth } },
          charge,
        );
        envoyees += 1;
      } catch (erreur) {
        // 404 et 410 : l'abonnement est mort, on le retire plutôt que de
        // réessayer indéfiniment à chaque passage du cron.
        const code = (erreur as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await admin.from("abonnements_push").delete().eq("endpoint", abonnement.endpoint);
          nettoyees += 1;
        }
      }
    }
  }

  return NextResponse.json({ envoyees, nettoyees });
}
