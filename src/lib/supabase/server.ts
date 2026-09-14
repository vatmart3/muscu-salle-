import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types-db";

/**
 * Client serveur, lié aux cookies de la requête. À créer à chaque usage :
 * un client mis en cache entre deux requêtes partagerait la session.
 */
export async function clientServeur() {
  const boite = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => boite.getAll(),
        setAll: (cookiesAEcrire) => {
          try {
            for (const { name, value, options } of cookiesAEcrire) {
              boite.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component : l'écriture de cookie est
            // interdite. Le middleware rafraîchit déjà la session, on ignore.
          }
        },
      },
    },
  );
}

/** Session courante, ou null. Ne jette jamais. */
export async function membreCourant() {
  const supabase = await clientServeur();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
