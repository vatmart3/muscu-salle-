"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types-db";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Client navigateur, instancié une seule fois pour la durée de l'onglet. */
export function clientNavigateur() {
  client ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
