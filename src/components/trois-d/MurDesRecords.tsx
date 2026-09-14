"use client";

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type * as THREE from "three";
import { ACIER, GEO_BARRE, GEO_DISQUE, GEO_MANCHON, materiauDisque, SIGNAL } from "./materiaux";

export type DisqueRecord = { id: string; libelle: string; recent: boolean };

/**
 * Troisième et dernier moment 3D : la barre du profil, chargée d'un disque par
 * record obtenu. On la fait tourner au doigt ; elle ne bouge pas toute seule.
 *
 * Les disques les plus récents sont à l'extérieur : on voit la barre se
 * charger au fil des mois, comme on empile vraiment de la fonte.
 */
function Barre({ disques }: { disques: DisqueRecord[] }) {
  const groupe = useRef<THREE.Group>(null);

  // Disposition symétrique : on alterne gauche et droite en partant du centre.
  // La liste arrive du plus récent au plus ancien ; on l'inverse pour charger
  // du plus ancien au plus récent, comme on charge vraiment une barre — les
  // derniers records se retrouvent donc à l'extérieur.
  const places = useMemo(
    () =>
      [...disques].reverse().map((disque, i) => {
        const cote = i % 2 === 0 ? -1 : 1;
        const rang = Math.floor(i / 2);
        return {
          ...disque,
          x: cote * (2.3 + rang * 0.19),
          rayon: Math.max(0.42, 1 - rang * 0.055),
          index: i,
        };
      }),
    [disques],
  );

  useFrame((_, delta) => {
    // Rotation d'inertie très lente, uniquement pour donner du relief au métal.
    if (groupe.current) groupe.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupe}>
      <mesh geometry={GEO_BARRE} material={ACIER} rotation={[0, 0, Math.PI / 2]} />
      <mesh geometry={GEO_MANCHON} material={ACIER} rotation={[0, 0, Math.PI / 2]} position={[-2.95, 0, 0]} />
      <mesh geometry={GEO_MANCHON} material={ACIER} rotation={[0, 0, Math.PI / 2]} position={[2.95, 0, 0]} />
      {places.map((place) => (
        <mesh
          key={place.id}
          geometry={GEO_DISQUE}
          material={place.recent ? SIGNAL : materiauDisque(place.index)}
          position={[place.x, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={place.rayon}
        />
      ))}
    </group>
  );
}

export function MurDesRecords({ disques }: { disques: DisqueRecord[] }) {
  return (
    <div className="h-56 w-full" aria-hidden="true">
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0.5, 1.8, 8.5], fov: 34 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[4, 6, 5]} intensity={1.6} />
          <directionalLight position={[-5, 2, -3]} intensity={0.45} color="#8fb8ff" />
          <Barre disques={disques} />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.9}
            rotateSpeed={0.5}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
