import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { clientServeur } from "@/lib/supabase/server";

/**
 * Cible des liens envoyés par e-mail (confirmation d'inscription, lien de
 * connexion, réinitialisation). On échange le jeton à usage unique contre une
 * session, puis on renvoie vers l'écran attendu.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const brut = searchParams.get("suite") ?? "/tableau-de-bord";
  // On n'accepte qu'un chemin interne : sinon le lien d'e-mail devient une
  // redirection ouverte vers n'importe quel site.
  const suite = brut.startsWith("/") && !brut.startsWith("//") ? brut : "/tableau-de-bord";

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/connexion?souci=lien-incomplet`);
  }

  const supabase = await clientServeur();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) {
    return NextResponse.redirect(`${origin}/connexion?souci=lien-expire`);
  }
  return NextResponse.redirect(`${origin}${suite}`);
}
