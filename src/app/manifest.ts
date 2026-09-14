import type { MetadataRoute } from "next";
import { MARQUE } from "@/lib/brand";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${MARQUE.nom} — ${MARQUE.baseline}`,
    short_name: MARQUE.nom,
    description: MARQUE.description,
    lang: "fr",
    dir: "ltr",
    start_url: "/tableau-de-bord",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: MARQUE.couleurFond,
    theme_color: MARQUE.couleurTheme,
    categories: ["health", "fitness", "sports"],
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Lancer une séance", short_name: "Séance", url: "/seance" },
      { name: "Suivi corporel", short_name: "Corps", url: "/corps" },
    ],
  };
}
