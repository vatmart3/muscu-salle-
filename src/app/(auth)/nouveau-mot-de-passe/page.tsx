import type { Metadata } from "next";
import { FormulaireNouveauMotDePasse } from "./FormulaireNouveauMotDePasse";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default function PageNouveauMotDePasse() {
  return <FormulaireNouveauMotDePasse />;
}
