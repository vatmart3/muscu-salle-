import type { NextRequest } from "next/server";
import { actualiserSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return actualiserSession(request);
}

export const config = {
  matcher: [
    /*
     * Tout sauf les fichiers statiques, les images et le service worker :
     * inutile de réveiller Supabase pour servir une icône.
     */
    "/((?!_next/static|_next/image|favicon.ico|icones/|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|gif|svg|webp|woff2)$).*)",
  ],
};
