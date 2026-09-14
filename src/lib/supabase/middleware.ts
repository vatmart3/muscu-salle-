import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types-db";

/** Chemins accessibles sans session. Tout le reste exige d'être connecté. */
const PUBLICS = [
  "/",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/nouveau-mot-de-passe",
  "/auth",
  "/design",
  "/hors-ligne",
];

function estPublic(chemin: string): boolean {
  return PUBLICS.some((p) => (p === "/" ? chemin === "/" : chemin === p || chemin.startsWith(`${p}/`)));
}

/**
 * Rafraîchit le jeton à chaque requête et referme l'application.
 * Sans ce passage, la session expire au bout d'une heure et quelqu'un se
 * retrouve déconnecté en pleine séance.
 */
export async function actualiserSession(request: NextRequest) {
  let reponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesAEcrire) => {
          for (const { name, value } of cookiesAEcrire) request.cookies.set(name, value);
          reponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesAEcrire) reponse.cookies.set(name, value, options);
        },
      },
    },
  );

  // getUser() valide le jeton auprès de Supabase. getSession() lirait le
  // cookie sans le vérifier : à ne pas utiliser pour décider d'un accès.
  const { data } = await supabase.auth.getUser();
  const membre = data.user;
  const chemin = request.nextUrl.pathname;

  if (!membre && !estPublic(chemin)) {
    const vers = request.nextUrl.clone();
    vers.pathname = "/connexion";
    vers.searchParams.set("suite", chemin);
    return NextResponse.redirect(vers);
  }

  if (membre && (chemin === "/connexion" || chemin === "/inscription" || chemin === "/")) {
    const vers = request.nextUrl.clone();
    vers.pathname = "/tableau-de-bord";
    vers.search = "";
    return NextResponse.redirect(vers);
  }

  return reponse;
}
