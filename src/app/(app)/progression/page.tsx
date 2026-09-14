import type { Metadata } from "next";
import { PageProgression } from "@/components/progression/PageProgression";

export const metadata: Metadata = { title: "Progression" };

export default function Progression() {
  return <PageProgression />;
}
