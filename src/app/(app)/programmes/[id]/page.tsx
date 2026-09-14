import type { Metadata } from "next";
import { PageProgramme } from "@/components/programmes/PageProgramme";

export const metadata: Metadata = { title: "Programme" };

export default async function Programme({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PageProgramme id={id} />;
}
