import type { Metadata } from "next";
import { FormulaireInscription } from "./FormulaireInscription";

export const metadata: Metadata = { title: "Créer un compte" };

export default function PageInscription() {
  return <FormulaireInscription />;
}
