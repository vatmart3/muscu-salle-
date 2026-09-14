import type { Metadata } from "next";
import { PageProgrammes } from "@/components/programmes/PageProgrammes";

export const metadata: Metadata = { title: "Programmes" };

export default function Programmes() {
  return <PageProgrammes />;
}
