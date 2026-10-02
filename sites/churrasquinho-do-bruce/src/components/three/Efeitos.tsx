"use client";

import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { layoutPara } from "./diretor";

/**
 * Pós-processamento com moderação (só desktop):
 * nível 2 = Bloom + Depth of Field + Noise; nível 1 = Bloom + Noise.
 * O Bloom pega só o que passa de 1.0 (brasa, faíscas): o resto fica limpo.
 */
export function Efeitos({ nivel }: { nivel: number }) {
  const aspecto = useThree((s) => s.size.width / s.size.height);
  const layout = layoutPara(aspecto);
  const foco = layout.pos.distanceTo(layout.alvo);
  return (
    <EffectComposer multisampling={nivel >= 2 ? 4 : 0} enableNormalPass={false}>
      <Bloom mipmapBlur intensity={1.25} luminanceThreshold={0.92} luminanceSmoothing={0.18} radius={0.72} />
      {nivel >= 2 ? <DepthOfField worldFocusDistance={foco} worldFocusRange={4.5} bokehScale={2.2} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {/* Grão depois do tone mapping: em valores HDR o soft light gera pontos coloridos. */}
      <Noise blendFunction={BlendFunction.OVERLAY} opacity={0.06} />
      <Vignette offset={0.28} darkness={0.62} />
    </EffectComposer>
  );
}
