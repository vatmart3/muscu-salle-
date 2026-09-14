import { notFound } from "next/navigation";

/**
 * Aperçus d'écran pour le contrôle visuel pendant le développement.
 *
 * Ils remplissent le magasin de séance avec des données factices : hors de
 * question qu'ils soient atteignables en production, ils écraseraient la
 * séance en cours de quelqu'un.
 */
export default function LayoutApercus({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
