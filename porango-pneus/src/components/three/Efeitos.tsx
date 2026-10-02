"use client";

import { Bloom, DepthOfField, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { estadoCena } from "./estado";

/**
 * Pós-processamento com moderação (só desktop):
 * Bloom pega só o que passa de 1 (laser, destaque amarelo, brilhos do metal),
 * Depth of Field foca sempre no assunto, Noise dá o grão de filme.
 */
export function Efeitos({ dof }: { dof: boolean }) {
  const dofRef = useRef<DepthOfFieldEffect>(null);

  // foco automático no assunto da câmera (pneu ou letras do flanco)
  useFrame(() => {
    const efeito = dofRef.current;
    if (efeito && efeito.target !== estadoCena.foco) efeito.target = estadoCena.foco;
  });

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <>{dof && <DepthOfField ref={dofRef} worldFocusRange={2.4} bokehScale={2.2} resolutionScale={0.5} />}</>
      <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.92} luminanceSmoothing={0.15} radius={0.7} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.045} />
      <Vignette offset={0.32} darkness={0.5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA />
    </EffectComposer>
  );
}
