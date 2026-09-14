import type { Metadata } from "next";
import { PageHistorique } from "@/components/historique/PageHistorique";

export const metadata: Metadata = { title: "Historique" };

export default function Historique() {
  return <PageHistorique />;
}
