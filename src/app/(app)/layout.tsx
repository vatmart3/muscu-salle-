import { RailEncre } from "@/components/nav/RailEncre";
import { PiluleSeance } from "@/components/nav/PiluleSeance";
import { GardeProfil } from "@/components/nav/GardeProfil";

/**
 * Coquille de l'application. L'écran de séance est hors de ce groupe : il
 * prend tout l'écran, sans rail ni pilule.
 */
export default function LayoutApplication({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pt-16 md:pb-24">
      <GardeProfil />
      {children}
      <PiluleSeance />
      <RailEncre />
    </div>
  );
}
