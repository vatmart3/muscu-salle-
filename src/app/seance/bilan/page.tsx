import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { EcranBilan } from "@/components/seance/EcranBilan";

export const metadata: Metadata = { title: "Bilan de séance" };

export default async function PageBilan() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: profil } = await supabase.from("profiles").select("unite").eq("id", auth.user.id).single();

  return <EcranBilan unite={profil?.unite ?? "kg"} />;
}
