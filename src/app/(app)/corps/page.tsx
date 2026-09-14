import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { urlsPhotos } from "@/actions/corps";
import { SuiviCorporel, type MesureLigne, type PhotoLigne } from "@/components/corps/SuiviCorporel";

export const metadata: Metadata = { title: "Suivi corporel" };

export default async function PageCorps() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const [{ data: profil }, { data: mesures }, { data: photos }] = await Promise.all([
    supabase.from("profiles").select("unite").eq("id", auth.user.id).single(),
    supabase
      .from("mesures")
      .select("id, date, poids_kg, masse_grasse, tour_bras, tour_poitrine, tour_taille, tour_cuisse, note")
      .eq("user_id", auth.user.id)
      .order("date", { ascending: false })
      .limit(365),
    supabase
      .from("photos_progres")
      .select("id, date, angle, storage_path")
      .eq("user_id", auth.user.id)
      .order("date", { ascending: false })
      .limit(60),
  ]);

  const urls = await urlsPhotos((photos ?? []).map((p) => p.storage_path));
  const avecUrl: PhotoLigne[] = (photos ?? []).flatMap((p) =>
    urls[p.storage_path] ? [{ ...p, url: urls[p.storage_path]! }] : [],
  );

  return (
    <SuiviCorporel
      mesures={(mesures ?? []) as MesureLigne[]}
      photos={avecUrl}
      unite={profil?.unite ?? "kg"}
      membreId={auth.user.id}
    />
  );
}
