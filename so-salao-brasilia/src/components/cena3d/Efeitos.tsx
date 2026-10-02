"use client";

/**
 * Pós-processamento, só no nível "alto" (desktop). Carregado em chunk separado.
 * Com moderação: profundidade de campo curta na peça, bloom só nos reflexos do metal
 * e um grão de filme quase imperceptível, como numa foto de estúdio.
 */
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";

export default function Efeitos({ foco }: { foco?: [number, number, number] }) {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <DepthOfField target={foco ?? [0, 0.55, 0]} focusRange={1.6} bokehScale={1.6} />
      <Bloom mipmapBlur intensity={0.32} luminanceThreshold={0.92} luminanceSmoothing={0.12} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.06} />
    </EffectComposer>
  );
}
