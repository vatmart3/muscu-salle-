import type { Metadata } from "next";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion" };

export default async function PageConnexion({
  searchParams,
}: {
  searchParams: Promise<{ suite?: string; souci?: string }>;
}) {
  const params = await searchParams;
  return <FormulaireConnexion suite={params.suite} souci={params.souci} />;
}
