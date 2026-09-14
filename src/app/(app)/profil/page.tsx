import type { Metadata } from "next";
import { PageProfil } from "@/components/profil/PageProfil";

export const metadata: Metadata = { title: "Profil" };

export default function Profil() {
  return <PageProfil />;
}
