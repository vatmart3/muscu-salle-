import type { Metadata } from "next";
import { TableauDeBord } from "@/components/tableau/TableauDeBord";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function PageTableauDeBord() {
  return <TableauDeBord />;
}
