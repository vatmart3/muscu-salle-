"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { ACIER, GEO_BARRE, GEO_DISQUE, SIGNAL } from "./materiaux";

/**
 * Deuxième des trois moments 3D de l'application : le disque qui vient
 * s'ajouter sur la barre quand un record tombe. Déclenché par l'utilisateur,
 * joué une fois, puis l'écran redevient calme.
 */
function Scene() {
  const disque = useRef<THREE.Mesh>(null);
  const debut = useRef<number | null>(null);

  useFrame((etat) => {
    const maille = disque.current;
    if (!maille) return;
    debut.current ??= etat.clock.elapsedTime;
    const t = Math.min(1, (etat.clock.elapsedTime - debut.current) / 0.75);
    // Chute amortie : rapide, puis un petit rebond, puis rien.
    const amorti = 1 - Math.pow(1 - t, 3);
    const rebond = t < 1 ? Math.sin(t * Math.PI * 2) * 0.12 * (1 - t) : 0;
    maille.position.y = 2.4 * (1 - amorti) + rebond;
    maille.rotation.z = Math.PI / 2;
    maille.rotation.y = (1 - amorti) * 1.6;
  });

  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} />
      <directionalLight position={[-4, 1, -2]} intensity={0.4} />
      <mesh geometry={GEO_BARRE} material={ACIER} rotation={[0, 0, Math.PI / 2]} scale={[1, 0.5, 1]} />
      <mesh ref={disque} geometry={GEO_DISQUE} material={SIGNAL} position={[0, 2.4, 0]} scale={0.85} />
    </>
  );
}

export function DisqueQuiTombe() {
  return (
    <div className="pointer-events-none h-28 w-44" aria-hidden="true">
      <Suspense fallback={null}>
        <Canvas
          camera={{ position: [0, 0.6, 5.4], fov: 32 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
}
