"use client";

import { Squelette } from "@/components/ui/Etats";
import { TitreSection } from "@/components/ui/Surface";
import { depot } from "@/lib/donnees/depot";
import { useDonnees } from "@/lib/donnees/hooks";
import { place } from "@/lib/donnees/idb";
import { exerciceParId } from "@/lib/exercices";
import { MurRecords, type RecordAffiche } from "./MurRecords";
import { Reglages } from "./Reglages";

export function PageProfil() {
  const { donnees, chargement, recharger } = useDonnees(async () => {
    const [profil, records, occupation] = await Promise.all([
      depot().profil(),
      depot().records(),
      place(),
    ]);
    const liste: RecordAffiche[] = records.map((r) => ({
      id: r.cle,
      exercice: exerciceParId(r.exercice_id)?.nom ?? r.exercice_id,
      type: r.type,
      valeur: r.valeur,
      obtenu_le: r.obtenu_le,
    }));
    return { profil, records: liste, occupation };
  }, []);

  if (chargement || !donnees?.profil) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-securite pb-8">
        <Squelette className="mt-8 h-8 w-36" />
        <Squelette rayon="bloc" className="h-48 w-full" />
        <Squelette rayon="bloc" className="h-32 w-full" />
      </main>
    );
  }

  return (
    <>
      <section className="mx-auto w-full max-w-2xl px-5 pt-securite">
        <div className="pt-4">
          <TitreSection>Mur des records</TitreSection>
        </div>
        <MurRecords records={donnees.records} unite={donnees.profil.unite} />
      </section>
      <Reglages profil={donnees.profil} occupation={donnees.occupation} onChangement={recharger} />
    </>
  );
}
