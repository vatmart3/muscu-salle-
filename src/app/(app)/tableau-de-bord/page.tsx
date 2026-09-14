import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { clientServeur } from "@/lib/supabase/server";
import { Anneau } from "@/components/ui/Anneau";
import { Chiffre } from "@/components/ui/Chiffre";
import { Surface, TitreSection } from "@/components/ui/Surface";
import { Disque } from "@/components/ui/Pastille";
import { EtatVide } from "@/components/ui/Etats";
import { BoutonLien } from "@/components/ui/Bouton";
import { LIBELLE_RECORD } from "@/lib/types";
import { MARQUE } from "@/lib/brand";
import { semainesCompletes, serieEnCours } from "@/lib/calculs";
import { charge, dureeLisible, entier, jourAbrege, nombre, tonnageLisible, typo } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

/**
 * Une colonne, une hiérarchie, un seul héros : l'anneau de la semaine.
 * Pas de grille de KPI — la seule question qui compte le lundi soir, c'est
 * « est-ce que je tiens mon objectif ».
 */
export default async function TableauDeBord() {
  const supabase = await clientServeur();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/connexion");

  const [{ data: profil }, { data: semaines }, { data: dernieres }, { data: records }, { data: modeles }] =
    await Promise.all([
      supabase.from("profiles").select("prenom, jours_par_semaine, unite").eq("id", auth.user.id).single(),
      supabase.rpc("tonnage_hebdomadaire", { p_semaines: 12 }),
      supabase
        .from("seances")
        .select("id, nom, demarree_a, volume_total, duree_secondes, modele_id")
        .eq("user_id", auth.user.id)
        .eq("statut", "terminee")
        .order("demarree_a", { ascending: false })
        .limit(3),
      supabase
        .from("records")
        .select("id, type, valeur, poids, reps, obtenu_le, exercices(nom)")
        .eq("user_id", auth.user.id)
        .order("obtenu_le", { ascending: false })
        .limit(3),
      supabase
        .from("seances_modeles")
        .select("id, nom, ordre, modele_exercices(ordre, series_cible, reps_cible, exercices(nom))")
        .eq("owner_id", auth.user.id)
        .order("ordre"),
    ]);

  const unite = profil?.unite ?? "kg";
  const objectif = profil?.jours_par_semaine ?? 3;
  const lignes = (semaines ?? []) as Array<{ semaine: string; seances: number; tonnage: number }>;
  const douzeSemaines = semainesCompletes(lignes, 12);
  const courante = douzeSemaines[0] ?? { debut: "", seances: 0, tonnage: 0 };
  const serie = serieEnCours(douzeSemaines, objectif);
  const reste = Math.max(0, objectif - courante.seances);
  const tonnageSemaine = tonnageLisible(courante.tonnage);

  // Prochaine séance : celle qui suit la dernière faite dans l'ordre du
  // programme. Sans historique, on propose la première.
  const listeModeles = modeles ?? [];
  const derniere = dernieres?.[0];
  const indexDerniere = listeModeles.findIndex((m) => m.id === derniere?.modele_id);
  const prochaine = listeModeles.length
    ? listeModeles[(indexDerniere + 1) % listeModeles.length]
    : undefined;

  const phrase = (() => {
    if (objectif <= 0) return "Règle ton objectif hebdomadaire dans le profil.";
    if (courante.seances === 0)
      return `Pas encore de séance cette semaine. Il t'en faut ${objectif} pour tenir l'objectif.`;
    if (reste === 0)
      return `Objectif tenu : ${courante.seances} séance${courante.seances > 1 ? "s" : ""} cette semaine.`;
    return `${courante.seances} séance${courante.seances > 1 ? "s" : ""} cette semaine, il t'en reste ${reste}.`;
  })();

  return (
    <main id="contenu" className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-5 pt-securite pb-8">
      {/* Barre de tête : la marque à gauche, l'accès au profil à droite.
          Le rail de navigation ne porte que les quatre écrans du quotidien ;
          programmes, classement et réglages passent par ici. */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <p className="font-affichage text-bloc font-bold tracking-tight">{MARQUE.nom}</p>
        <div className="flex items-center gap-1">
          <Link
            href="/programmes"
            className="min-h-11 rounded-pastille px-3 py-2 text-mention font-medium text-accent-fort hover:bg-accent-voile"
          >
            Programmes
          </Link>
          <Link
            href="/profil"
            className="min-h-11 rounded-pastille px-3 py-2 text-mention font-medium text-accent-fort hover:bg-accent-voile"
          >
            Profil
          </Link>
        </div>
      </div>

      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-affichage text-titre font-bold">Salut {profil?.prenom ?? ""}.</h1>
          <p className="mt-1 text-ui text-texte-doux">{typo(phrase)}</p>
        </div>
        {serie > 0 && (
          <Link
            href="/classement"
            aria-label={`Série de ${serie} semaines consécutives où l'objectif est tenu`}
            className="flex shrink-0 items-center gap-2 rounded-pastille border border-trait bg-surface px-3 py-2"
          >
            <Disque taille={9} ton="accent" />
            <span className="chiffre text-bloc">{serie}</span>
            <span className="etiquette">sem.</span>
          </Link>
        )}
      </header>

      <section className="flex flex-col items-center gap-3">
        <Anneau
          valeur={objectif > 0 ? courante.seances / objectif : 0}
          taille={248}
          epaisseur={9}
          etiquette={`${courante.seances} séances sur ${objectif} cette semaine, ${entier(courante.tonnage)} ${unite} soulevés`}
        >
          <Chiffre valeur={tonnageSemaine.valeur} unite={tonnageSemaine.unite} taille="heros" />
          <span className="mt-2.5 text-mention text-texte-doux">
            {courante.seances} / {objectif} séances
          </span>
        </Anneau>
      </section>

      {prochaine && (
        <section>
          <TitreSection>Prochaine séance</TitreSection>
          <Surface className="flex flex-col gap-3 p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-affichage text-bloc font-bold">{prochaine.nom}</h3>
              <span className="text-mention text-texte-doux">
                {(prochaine.modele_exercices ?? []).length} exercices
              </span>
            </div>
            <p className="text-mention text-texte-doux">
              {(prochaine.modele_exercices ?? [])
                .sort((a, b) => a.ordre - b.ordre)
                .flatMap((me) => (me.exercices ? [me.exercices.nom] : []))
                .join(" · ")}
            </p>
            <BoutonLien href="/seance" taille="pouce" pleineLargeur>
              Démarrer {prochaine.nom}
            </BoutonLien>
          </Surface>
        </section>
      )}

      <section>
        <TitreSection
          action={
            <Link href="/historique" className="text-mention font-medium text-accent-fort">
              Tout voir
            </Link>
          }
        >
          Dernières séances
        </TitreSection>
        {(dernieres ?? []).length === 0 ? (
          <EtatVide
            titre="Rien encore"
            texte="Ta première séance ouvrira l'historique, la progression et les records."
            action={<BoutonLien href="/seance">Lancer une séance</BoutonLien>}
          />
        ) : (
          <ul className="flex flex-col">
            {(dernieres ?? []).map((seance) => (
              <li key={seance.id}>
                <Link
                  href={`/historique#${seance.id}`}
                  className="flex min-h-14 items-center gap-3 border-b border-trait py-3 last:border-0"
                >
                  <span className="etiquette w-10 shrink-0">{jourAbrege(seance.demarree_a)}</span>
                  <span className="min-w-0 flex-1 truncate text-ui font-medium text-texte">{seance.nom}</span>
                  <span className="chiffre shrink-0 text-mention text-texte-doux">
                    {entier(seance.volume_total)} {unite}
                  </span>
                  <span className="shrink-0 text-mention text-texte-tenu">{dureeLisible(seance.duree_secondes)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {(records ?? []).length > 0 && (
        <section>
          <TitreSection>Derniers records</TitreSection>
          <ul className="flex flex-col">
            {(records ?? []).map((record) => (
              <li key={record.id} className="flex items-center gap-3 border-b border-trait py-3 last:border-0">
                <Disque taille={9} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui font-medium text-texte">{record.exercices?.nom ?? ""}</span>
                  <span className="block text-mention text-texte-doux">{LIBELLE_RECORD[record.type]}</span>
                </span>
                <span className="chiffre shrink-0 text-bloc text-signal-texte">
                  {record.type === "reps_max" ? `${nombre(record.valeur)} reps` : charge(record.valeur, unite)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
