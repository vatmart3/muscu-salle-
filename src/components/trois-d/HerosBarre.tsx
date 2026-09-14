"use client";

import { BarreAnimee } from "./BarreAnimee";

/**
 * Héros de l'accueil.
 *
 * Il était en React Three Fiber ; la mesure a tranché autrement. Voir
 * `BarreAnimee` et DECISIONS.md : le score de performance mobile de l'accueil
 * passe de 79 à 98 en retirant three.js de cette page, pour la même image et
 * la même chorégraphie.
 */
export function HerosBarre() {
  return <BarreAnimee />;
}
