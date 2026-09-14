import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { RailEncre } from "@/components/nav/RailEncre";
import { PiluleSeance } from "@/components/nav/PiluleSeance";

/**
 * Coquille de l'application connectée. Le rail et la pilule vivent ici :
 * l'écran de séance, lui, est hors de ce groupe — il prend tout l'écran.
 */
export default async function LayoutApplication({ children }: { children: React.ReactNode }) {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const { data: profil } = await supabase
    .from("profiles")
    .select("onboarding_termine, theme")
    .eq("id", auth.user.id)
    .single();

  if (!profil?.onboarding_termine) redirect("/bienvenue");

  return (
    <div className="min-h-dvh pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pt-16 md:pb-24">
      {children}
      <PiluleSeance />
      <RailEncre />
    </div>
  );
}
