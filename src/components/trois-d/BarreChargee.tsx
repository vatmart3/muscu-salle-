"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import type * as THREE from "three";
import { ACIER, GEO_BARRE, GEO_DISQUE, GEO_MANCHON, materiauDisque } from "./materiaux";

/**
 * Premier des trois moments 3D : la barre qui se charge au chargement de la
 * page d'accueil, une fois, en deux secondes, puis s'immobilise.
 *
 * C'est le seul mouvement de toute l'application qui ne soit pas déclenché par
 * l'utilisateur. Ensuite, la barre ne bouge plus que sous le curseur.
 */

const DISQUES = [
  { cote: -1, rang: 0, rayon: 1.0, depart: 0.0 },
  { cote: 1, rang: 0, rayon: 1.0, depart: 0.12 },
  { cote: -1, rang: 1, rayon: 0.88, depart: 0.28 },
  { cote: 1, rang: 1, rayon: 0.88, depart: 0.4 },
  { cote: -1, rang: 2, rayon: 0.72, depart: 0.56 },
  { cote: 1, rang: 2, rayon: 0.72, depart: 0.68 },
  { cote: -1, rang: 3, rayon: 0.58, depart: 0.84 },
  { cote: 1, rang: 3, rayon: 0.58, depart: 0.96 },
] as const;

const DUREE_CHARGEMENT = 1.9;

function Disque({ cote, rang, rayon, depart, index }: (typeof DISQUES)[number] & { index: number }) {
  const maille = useRef<THREE.Mesh>(null);
  const materiau = useMemo(() => materiauDisque(index), [index]);
  const xFinal = cote * (2.55 + rang * 0.2);

  useFrame((etat) => {
    const m = maille.current;
    if (!m) return;
    const t = Math.min(1, Math.max(0, (etat.clock.elapsedTime - depart) / 0.55));
    const amorti = 1 - Math.pow(1 - t, 3);
    m.position.x = cote * 7 * (1 - amorti) + xFinal * amorti;
    m.scale.setScalar(rayon * (0.4 + 0.6 * amorti));
    m.rotation.x = (1 - amorti) * 2.2;
  });

  return (
    <mesh
      ref={maille}
      geometry={GEO_DISQUE}
      material={materiau}
      position={[cote * 7, 0, 0]}
      rotation={[0, 0, Math.PI / 2]}
      scale={rayon * 0.4}
    />
  );
}

function Scene(props: ThreeElements["group"]) {
  const groupe = useRef<THREE.Group>(null);

  useFrame((etat, delta) => {
    const g = groupe.current;
    if (!g) return;
    const t = etat.clock.elapsedTime;
    // Pendant le chargement, la barre pivote toute seule ; ensuite elle ne
    // suit plus que le curseur — doucement, jamais à la milliseconde.
    const cibleY = t < DUREE_CHARGEMENT ? -0.5 + t * 0.16 : -0.22 + etat.pointer.x * 0.42;
    const cibleX = t < DUREE_CHARGEMENT ? 0.22 : 0.16 - etat.pointer.y * 0.16;
    g.rotation.y += (cibleY - g.rotation.y) * Math.min(1, delta * 3.2);
    g.rotation.x += (cibleX - g.rotation.x) * Math.min(1, delta * 3.2);
  });

  return (
    <group ref={groupe} {...props}>
      <mesh geometry={GEO_BARRE} material={ACIER} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={GEO_MANCHON} material={ACIER} rotation={[0, 0, Math.PI / 2]} position={[-2.95, 0, 0]} />
      <mesh geometry={GEO_MANCHON} material={ACIER} rotation={[0, 0, Math.PI / 2]} position={[2.95, 0, 0]} />
      {DISQUES.map((disque, i) => (
        <Disque key={`${disque.cote}-${disque.rang}`} {...disque} index={i} />
      ))}
    </group>
  );
}

export function BarreChargee() {
  return (
    <Suspense fallback={null}>
      <Canvas
        camera={{ position: [0.4, 1.5, 9], fov: 34 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        className="!absolute inset-0"
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[4, 6, 5]} intensity={1.6} />
        <directionalLight position={[-5, 2, -3]} intensity={0.5} color="#8fb8ff" />
        <Scene position={[0, 0, 0]} />
      </Canvas>
    </Suspense>
  );
}
