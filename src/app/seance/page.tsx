import type { Metadata } from "next";
import { PageSeance } from "@/components/seance/PageSeance";

export const metadata: Metadata = { title: "Séance" };

/**
 * Rien n'est lu ici : les données vivent dans le navigateur. Cette page ne
 * fait qu'installer la coquille, le reste se charge côté client.
 */
export default function Seance() {
  return <PageSeance />;
}
