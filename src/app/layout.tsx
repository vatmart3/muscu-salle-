import type { Metadata, Viewport } from "next";
import "./globals.css";
import { policeAffichage, policeUi } from "@/lib/fonts";
import { MARQUE } from "@/lib/brand";
import { DefsAnneaux } from "@/components/ui/DefsAnneaux";
import { EnregistrerServiceWorker } from "@/components/pwa/EnregistrerServiceWorker";

export const metadata: Metadata = {
  title: { default: `${MARQUE.nom} — ${MARQUE.baseline}`, template: `%s · ${MARQUE.nom}` },
  description: MARQUE.description,
  applicationName: MARQUE.nom,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: MARQUE.nom, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icones/icone-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icones/icone-192.png", sizes: "192x192" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: MARQUE.couleurFond },
    { media: "(prefers-color-scheme: dark)", color: "#060C16" },
  ],
};

/** Applique le thème avant la première peinture : pas de flash de thème clair. */
const SCRIPT_THEME = `(function(){try{var t=localStorage.getItem("fonte:theme");if(t==="sombre"||t==="clair"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${policeAffichage.variable} ${policeUi.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="min-h-dvh bg-fond text-texte antialiased">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-pastille focus:bg-inverse-fond focus:px-4 focus:py-2 focus:text-inverse-texte"
        >
          Aller au contenu
        </a>
        <DefsAnneaux />
        {children}
        <EnregistrerServiceWorker />
      </body>
    </html>
  );
}
