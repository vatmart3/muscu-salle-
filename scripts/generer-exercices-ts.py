#!/usr/bin/env python3
"""
Génère la bibliothèque d'exercices en TypeScript, à partir de la MÊME source
que la migration SQL (`generer-seed-exercices.py`).

Depuis le passage au stockage local, l'app embarque la bibliothèque au lieu de
la lire en base. Les deux sorties restent produites depuis la même liste : elles
ne peuvent pas diverger.

Usage : python3 scripts/generer-exercices-ts.py
"""
from __future__ import annotations
import importlib.util
import os

ICI = os.path.dirname(os.path.abspath(__file__))

specification = importlib.util.spec_from_file_location(
    "seed", os.path.join(ICI, "generer-seed-exercices.py")
)
seed = importlib.util.module_from_spec(specification)
assert specification.loader is not None
specification.loader.exec_module(seed)


def litteral(texte: str) -> str:
    return '"' + texte.replace("\\", "\\\\").replace('"', '\\"') + '"'


def main() -> None:
    lignes = []
    for nom, principal, secondaires, equipement, type_ex, consigne in seed.EXERCICES:
        slug = seed.slugifier(nom)
        sec = "[]" if not secondaires else "[" + ", ".join(litteral(s) for s in secondaires) + "]"
        lignes.append(
            f"  {{ id: {litteral(slug)}, nom: {litteral(nom)}, slug: {litteral(slug)}, "
            f"groupe_principal: {litteral(principal)}, groupes_secondaires: {sec}, "
            f"equipement: {litteral(equipement)}, type: {litteral(type_ex)}, "
            f"instructions: {litteral(consigne)} }},"
        )

    contenu = f'''import type {{ Groupe, TypeExercice }} from "./types";

/**
 * Bibliothèque d'exercices — {len(seed.EXERCICES)} entrées.
 *
 * FICHIER GÉNÉRÉ. Ne pas éditer à la main : modifier
 * scripts/generer-seed-exercices.py puis relancer
 * `python3 scripts/generer-exercices-ts.py`.
 *
 * La même liste alimente la migration SQL `..._seed_exercices.sql`, conservée
 * dans le dépôt pour le jour où les données repasseront par une base. Les deux
 * sorties viennent de la même source : elles ne peuvent pas diverger.
 *
 * L'identifiant d'un exercice global **est** son slug. C'est stable, lisible
 * dans les exports, et ça survit à un changement de moteur de stockage — ce
 * qu'un UUID généré à l'installation ne ferait pas.
 */
export type FicheExercice = {{
  id: string;
  nom: string;
  slug: string;
  groupe_principal: Groupe;
  groupes_secondaires: Groupe[];
  equipement: string;
  type: TypeExercice;
  instructions: string;
}};

export const EXERCICES: readonly FicheExercice[] = [
{chr(10).join(lignes)}
] as const;

const PAR_ID = new Map(EXERCICES.map((e) => [e.id, e]));

export function exerciceParId(id: string): FicheExercice | undefined {{
  return PAR_ID.get(id);
}}

/** Recherche insensible à la casse et aux accents, filtrable par groupe. */
export function chercher(terme: string, groupe?: Groupe | null): FicheExercice[] {{
  const normalise = (t: string) =>
    t.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
  const cible = normalise(terme.trim());
  return EXERCICES.filter(
    (e) => (!groupe || e.groupe_principal === groupe) && (!cible || normalise(e.nom).includes(cible)),
  );
}}

/** Exercices réalisables avec le matériel déclaré. Le poids du corps est toujours disponible. */
export function filtrerParMateriel(materiel: readonly string[]): FicheExercice[] {{
  const dispo = new Set([...materiel, "poids_du_corps"]);
  return EXERCICES.filter((e) => dispo.has(e.equipement));
}}
'''

    cible = os.path.join(ICI, "..", "src", "lib", "exercices.ts")
    with open(cible, "w", encoding="utf-8") as f:
        f.write(contenu)
    print(f"{len(seed.EXERCICES)} exercices écrits dans src/lib/exercices.ts")


if __name__ == "__main__":
    main()
