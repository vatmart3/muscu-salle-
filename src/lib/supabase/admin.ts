import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types-db";

/**
 * Client `service_role`. Contourne la RLS.
 *
 * Deux usages seulement, et rien d'autre :
 *   — vérifier un code d'accès avant l'inscription (le candidat n'a pas encore
 *     de session, donc pas de RLS à lui appliquer) ;
 *   — l'envoi des relances push, déclenché par une tâche planifiée.
 *
 * `import "server-only"` fait échouer le build si un fichier client l'importe.
 */
export function clientAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL manquante. Voir .env.local.example.",
    );
  }
  return createClient<Database>(url, cle, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
