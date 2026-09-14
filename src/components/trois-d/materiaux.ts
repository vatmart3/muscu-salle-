import * as THREE from "three";

/**
 * Matériaux et géométries partagés par les trois scènes 3D.
 * Tout est primitif : aucun modèle à télécharger, aucun asset à décoder.
 */

export const ACIER = new THREE.MeshStandardMaterial({ color: "#c9d3e0", metalness: 0.85, roughness: 0.32 });
export const FONTE = new THREE.MeshStandardMaterial({ color: "#0a1628", metalness: 0.25, roughness: 0.62 });
export const BLEU = new THREE.MeshStandardMaterial({ color: "#0071e3", metalness: 0.28, roughness: 0.45 });
export const BLEU_PROFOND = new THREE.MeshStandardMaterial({ color: "#0047a8", metalness: 0.28, roughness: 0.45 });
export const SIGNAL = new THREE.MeshStandardMaterial({ color: "#ff4d3d", metalness: 0.2, roughness: 0.4 });

/** Un disque de fonte : cylindre plat, percé visuellement par le manchon. */
export const GEO_DISQUE = new THREE.CylinderGeometry(1, 1, 0.16, 48);
export const GEO_BARRE = new THREE.CylinderGeometry(0.085, 0.085, 8, 20);
export const GEO_MANCHON = new THREE.CylinderGeometry(0.16, 0.16, 1.9, 20);

export function materiauDisque(rang: number): THREE.MeshStandardMaterial {
  const cycle = [BLEU, BLEU_PROFOND, FONTE];
  return cycle[rang % cycle.length] ?? BLEU;
}
