"use client";

import { Environment, Lightformer } from "@react-three/drei";
import type { V3 } from "./kit";

/**
 * Luz de fim de tarde entrando pela janela (com sombra), preenchimento suave
 * e um ambiente de estúdio para os reflexos de pedras, vidros e metais.
 * Nada é baixado da internet: o mapa de ambiente é gerado com Lightformers.
 */
export function SceneLights({ sun = [-8, 6, 3], intensity = 2.8, shadowSize = 6, shadows = true, closed = false }: { sun?: V3; intensity?: number; shadowSize?: number; shadows?: boolean; closed?: boolean }) {
  const s = shadowSize;
  return (
    <>
      <ambientLight intensity={closed ? 0.5 : 0.35} color="#fff3e2" />
      <hemisphereLight args={["#fffaf3", "#8b6f47", closed ? 0.55 : 0.6]} />
      <directionalLight
        position={sun}
        intensity={intensity}
        color="#ffe2bd"
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      >
        <orthographicCamera attach="shadow-camera" args={[-s, s, s, -s, 0.5, 30]} />
      </directionalLight>
      <directionalLight position={[6, 4, 8]} intensity={0.35} color="#e8eef5" />
      <Environment resolution={128} frames={1} environmentIntensity={0.75}>
        <color attach="background" args={["#d9cfc2"]} />
        <Lightformer form="rect" intensity={4} color="#fff0d8" position={[-6, 3, 1]} scale={[4, 3, 1]} target={[0, 1, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={1} color="#f2e6d6" position={[6, 2, 6]} scale={[6, 3, 1]} target={[0, 1, 0]} />
        <Lightformer form="ring" intensity={2} color="#ffd9a8" position={[0, 2.5, 6]} scale={1.5} target={[0, 1, 0]} />
      </Environment>
    </>
  );
}
