import { NextResponse, type NextRequest } from "next/server";
import { clientServeur } from "@/lib/supabase/server";

/** Échange PKCE : utilisé quand Supabase renvoie un `code` plutôt qu'un jeton. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const brut = searchParams.get("suite") ?? "/tableau-de-bord";
  const suite = brut.startsWith("/") && !brut.startsWith("//") ? brut : "/tableau-de-bord";

  if (!code) return NextResponse.redirect(`${origin}/connexion?souci=lien-incomplet`);

  const supabase = await clientServeur();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/connexion?souci=lien-expire`);
  return NextResponse.redirect(`${origin}${suite}`);
}
