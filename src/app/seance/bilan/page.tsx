import type { Metadata } from "next";
import { EcranBilan } from "@/components/seance/EcranBilan";

export const metadata: Metadata = { title: "Bilan de séance" };

export default function PageBilan() {
  return <EcranBilan />;
}
