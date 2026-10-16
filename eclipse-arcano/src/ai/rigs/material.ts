import * as THREE from 'three';

/**
 * Material dos modelos da IA: MeshStandardMaterial com cor por vértice + brilho por vértice
 * (atributo `glow`) e uniforms por instância (clarão de dano, brilho de antecipação, pulso).
 * Todas as instâncias compartilham o MESMO programa de shader (customProgramCacheKey).
 * Compatível com vfx.dissolve (que clona e encadeia onBeforeCompile).
 */
export interface CreatureUniforms {
  /** Clarão de dano (0..1) e cor. */
  uHit: { value: number };
  uHitColor: { value: THREE.Color };
  /** Brilho de antecipação/carga (0..1+) e cor. */
  uCharge: { value: number };
  uChargeColor: { value: THREE.Color };
  /** Multiplicador do brilho das partes emissivas (núcleo, olhos, runas). */
  uGlowMul: { value: number };
  /** Cor que substitui a cor das partes emissivas (mistura 0..1). */
  uGlowTint: { value: THREE.Color };
  uGlowTintMix: { value: number };
}

export type RigMaterial = THREE.MeshStandardMaterial & { rig: CreatureUniforms };

export function createRigMaterial(opts: { roughness?: number; metalness?: number; transparent?: boolean } = {}): RigMaterial {
  const m = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: opts.roughness ?? 0.78,
    metalness: opts.metalness ?? 0.08,
    transparent: opts.transparent ?? false,
  }) as RigMaterial;
  const u: CreatureUniforms = {
    uHit: { value: 0 },
    uHitColor: { value: new THREE.Color(1, 0.35, 0.25) },
    uCharge: { value: 0 },
    uChargeColor: { value: new THREE.Color(1, 0.45, 0.1) },
    uGlowMul: { value: 1 },
    uGlowTint: { value: new THREE.Color(1, 1, 1) },
    uGlowTintMix: { value: 0 },
  };
  m.rig = u;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uHit = u.uHit;
    shader.uniforms.uHitColor = u.uHitColor;
    shader.uniforms.uCharge = u.uCharge;
    shader.uniforms.uChargeColor = u.uChargeColor;
    shader.uniforms.uGlowMul = u.uGlowMul;
    shader.uniforms.uGlowTint = u.uGlowTint;
    shader.uniforms.uGlowTintMix = u.uGlowTintMix;
    shader.vertexShader = 'attribute float glow;\nvarying float vGlow;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGlow = glow;');
    shader.fragmentShader =
      'uniform float uHit;\nuniform vec3 uHitColor;\nuniform float uCharge;\nuniform vec3 uChargeColor;\nuniform float uGlowMul;\nuniform vec3 uGlowTint;\nuniform float uGlowTintMix;\nvarying float vGlow;\n' +
      shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  vec3 rigGlowCol = mix(vColor.rgb, uGlowTint, uGlowTintMix * step(0.01, vGlow));
  totalEmissiveRadiance += rigGlowCol * vGlow * uGlowMul + uHitColor * uHit * 0.9 + uChargeColor * uCharge * (0.18 + vGlow * 1.2);`,
      );
    // partes brilhantes não recebem sombra escura demais
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= 1.0 - min(vGlow, 1.0) * 0.6;');
  };
  m.customProgramCacheKey = () => 'eclipse-rig-v1';
  return m;
}
