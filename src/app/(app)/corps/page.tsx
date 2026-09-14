import type { Metadata } from "next";
import { PageCorps } from "@/components/corps/PageCorps";

export const metadata: Metadata = { title: "Suivi corporel" };

export default function Corps() {
  return <PageCorps />;
}
