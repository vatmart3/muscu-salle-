import { MurRecords } from "@/components/profil/MurRecords";

const records = Array.from({ length: 11 }, (_, i) => ({
  id: `r${i}`,
  exercice: ["Développé couché", "Squat barre", "Soulevé de terre", "Traction lestée", "Développé militaire"][i % 5]!,
  type: (["charge_max", "1rm_estime", "volume_max", "reps_max"] as const)[i % 4]!,
  valeur: 60 + i * 7.5,
  obtenu_le: new Date(Date.now() - i * 9 * 86400000).toISOString(),
}));

export default function Apercu() {
  return (
    <main className="mx-auto max-w-lg px-5 py-8">
      <MurRecords records={records} unite="kg" />
    </main>
  );
}
