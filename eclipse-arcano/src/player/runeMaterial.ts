import * as THREE from 'three';

/**
 * Materiais do mago: MeshStandardMaterial com injeção de shader para runas,
 * circuitos e sigilos PROCEDURAIS (sem texturas), cujo brilho segue a energia
 * do jogador e muda na Forma Ascendente.
 *
 * Atributo `aGlow` (vec2) por vértice no corpo:
 *  x = tipo de brilho (0 nenhum, 1 sólido, 2 faixa de runas, 3 circuito, 4 sigilo circular, 5 sólido suave)
 *  y = 1 se a peça é metálica (troca rugosidade/metalicidade no fragment shader).
 * As UVs das peças com runas/circuitos são pré-escaladas: 1 unidade em u = 1 glifo.
 */

export const GLOW = { none: 0, solid: 1, runes: 2, circuit: 3, sigil: 4, soft: 5 } as const;

/** Uniforms compartilhados por todos os materiais do personagem (atualizados pelo Player). */
export const RUNE_UNIFORMS = {
  uRuneColor: { value: new THREE.Color(0.25, 0.85, 1.0) },
  uRuneIntensity: { value: 1.2 },
  uRuneTime: { value: 0 },
  /** 0..1 — transição para a Forma Ascendente (troca os glifos e acelera o pulso). */
  uAscend: { value: 0 },
  uCloakInner: { value: new THREE.Color(0x2a1638) },
};

const COMMON_GLSL = /* glsl */ `
uniform vec3 uRuneColor;
uniform float uRuneIntensity;
uniform float uRuneTime;
uniform float uAscend;
varying vec2 vRuneUv;
varying vec2 vGlow;
varying float vRuneY;

float eaHash(float n) { return fract(sin(n) * 43758.5453123); }
float eaSeg(vec2 p, vec2 a, vec2 b, float w) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return 1.0 - smoothstep(w * 0.45, w, length(pa - ba * h));
}
// Glifo procedural: até 7 traços escolhidos por hash (mudam na Forma Ascendente).
float eaGlyph(vec2 p, float id) {
  float w = 0.14;
  float s = id * 7.31 + floor(uAscend + 0.5) * 13.7;
  float r = 0.0;
  r = max(r, step(0.3, eaHash(s + 1.0)) * eaSeg(p, vec2(0.5, 0.1), vec2(0.5, 0.9), w));
  r = max(r, step(0.5, eaHash(s + 2.0)) * eaSeg(p, vec2(0.15, 0.88), vec2(0.85, 0.88), w));
  r = max(r, step(0.55, eaHash(s + 3.0)) * eaSeg(p, vec2(0.15, 0.12), vec2(0.85, 0.12), w));
  r = max(r, step(0.55, eaHash(s + 4.0)) * eaSeg(p, vec2(0.15, 0.2), vec2(0.85, 0.8), w));
  r = max(r, step(0.6, eaHash(s + 5.0)) * eaSeg(p, vec2(0.15, 0.8), vec2(0.85, 0.2), w));
  r = max(r, step(0.45, eaHash(s + 6.0)) * eaSeg(p, vec2(0.15, 0.5), vec2(0.5, 0.5), w));
  r = max(r, step(0.6, eaHash(s + 7.0)) * eaSeg(p, vec2(0.5, 0.5), vec2(0.85, 0.65), w));
  return r;
}
float eaRunes(vec2 uv) {
  // cada célula (1 x 1 em UV) é um glifo; várias fileiras quando v > 1
  float id = floor(uv.x) + floor(uv.y) * 7.0;
  vec2 p = vec2(fract(uv.x), uv.y >= 1.0 ? fract(uv.y) : max(uv.y, 0.0));
  vec2 gp = vec2((p.x - 0.14) / 0.72, (p.y - 0.22) / 0.56);
  float inside = step(0.0, gp.x) * step(gp.x, 1.0) * step(0.0, gp.y) * step(gp.y, 1.0);
  float g = eaGlyph(gp, id) * inside;
  float border = (1.0 - smoothstep(0.03, 0.08, p.y)) + (1.0 - smoothstep(0.03, 0.08, 1.0 - p.y));
  float pulse = 0.5 + 0.5 * sin(uRuneTime * (1.7 + uAscend * 2.5) + id * 0.9);
  return max(g * (0.35 + 0.65 * pulse), border * 0.55);
}
float eaCircuit(vec2 uv) {
  vec2 c = floor(uv);
  vec2 f = fract(uv);
  float h = eaHash(dot(c, vec2(12.9898, 78.233)));
  float h2 = eaHash(dot(c, vec2(39.3468, 11.135)));
  float w = 0.09;
  float r = 0.0;
  r = max(r, step(0.4, h) * (1.0 - smoothstep(w * 0.5, w, abs(f.y - 0.5))));
  r = max(r, step(0.55, h2) * (1.0 - smoothstep(w * 0.5, w, abs(f.x - 0.5))) * step(f.y, 0.5 + w));
  float node = 1.0 - smoothstep(0.12, 0.2, length(f - 0.5));
  r = max(r, step(0.72, h2) * node);
  float flow = smoothstep(0.8, 1.0, fract(uv.x * 0.21 + uv.y * 0.13 - uRuneTime * (0.55 + uAscend)));
  return r * (0.4 + 0.9 * flow);
}
float eaSigil(vec2 uv) {
  vec2 c = uv - 0.5;
  float r = length(c) * 2.0;
  float a = atan(c.y, c.x);
  float ring1 = 1.0 - smoothstep(0.02, 0.06, abs(r - 0.88));
  float ring2 = 1.0 - smoothstep(0.015, 0.045, abs(r - 0.6));
  float band = step(0.6, r) * step(r, 0.88);
  float spokes = (1.0 - smoothstep(0.05, 0.16, abs(sin(a * (3.0 + uAscend * 2.0) + uRuneTime * 0.8)))) * band;
  float ticks = step(0.92, abs(sin(a * 16.0 - uRuneTime * 0.5))) * step(0.66, r) * step(r, 0.82);
  float core = 1.0 - smoothstep(0.12, 0.34, r);
  float s = max(max(ring1, ring2), max(spokes * 0.85, max(ticks * 0.7, core)));
  return s * step(r, 1.0);
}
float eaPattern(float gt, vec2 uv) {
  if (gt < 0.5) return 0.0;
  if (gt < 1.5) return 2.2;
  if (gt < 2.5) return eaRunes(uv);
  if (gt < 3.5) return eaCircuit(uv);
  if (gt < 4.5) return eaSigil(uv) * 1.4;
  return 0.6;
}
`;

const CLOAK_GLSL = /* glsl */ `
uniform vec3 uCloakInner;
// Bainha com runas, sigilo nas costas e acabamento nas laterais da capa (só por fora).
float eaCloakPattern(vec2 uv) {
  float p = 0.0;
  float hem = step(0.885, uv.y) * step(uv.y, 0.965);
  p = max(p, hem * eaRunes(vec2(uv.x * 13.0, (uv.y - 0.885) / 0.08)));
  float side = (1.0 - smoothstep(0.012, 0.025, uv.x)) + (1.0 - smoothstep(0.012, 0.025, 1.0 - uv.x));
  p = max(p, side * 0.5 * step(uv.y, 0.965));
  vec2 sp = vec2((uv.x - 0.5) * 0.95, (uv.y - 0.34) * 1.3) / 0.42 + 0.5;
  p = max(p, eaSigil(sp) * 0.9);
  return p;
}
`;

function inject(shader: THREE.WebGLProgramParametersWithUniforms, cloak: boolean) {
  Object.assign(shader.uniforms, RUNE_UNIFORMS);
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
${cloak ? '' : 'attribute vec2 aGlow;'}
varying vec2 vRuneUv;
varying vec2 vGlow;
varying float vRuneY;`,
    )
    .replace(
      '#include <uv_vertex>',
      `#include <uv_vertex>
vRuneUv = uv;
${cloak ? 'vGlow = vec2(0.0);' : 'vGlow = aGlow;'}`,
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vRuneY = position.y;`,
    );

  let frag = shader.fragmentShader.replace('#include <common>', `#include <common>\n${COMMON_GLSL}\n${cloak ? CLOAK_GLSL : ''}`);
  if (cloak) {
    frag = frag.replace('#include <color_fragment>', `#include <color_fragment>\nif (!gl_FrontFacing) diffuseColor.rgb = uCloakInner;`);
  } else {
    frag = frag
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.62, vGlow.y);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.36, vGlow.y);`);
  }
  const emissiveCode = cloak
    ? `float eaPat = gl_FrontFacing ? eaCloakPattern(vRuneUv) : 0.0;`
    : `float eaPat = eaPattern(vGlow.x, vRuneUv);`;
  frag = frag.replace(
    '#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
${emissiveCode}
float eaWave = 0.72 + 0.28 * sin(vRuneY * 5.0 - uRuneTime * (2.2 + 3.0 * uAscend));
totalEmissiveRadiance += uRuneColor * eaPat * uRuneIntensity * eaWave;
// contorno (fresnel) frio tingido pela energia: separa a silhueta escura do cenário
float eaRim = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0);
totalEmissiveRadiance += mix(vec3(0.42, 0.5, 0.7), uRuneColor, 0.45) * eaRim * (0.16 + 0.1 * uRuneIntensity);`,
  );
  shader.fragmentShader = frag;
}

/** Material do corpo (tecido, couro, pele e metal na mesma chamada de desenho). */
export function createBodyMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0.04 });
  m.name = 'ea-mago-corpo';
  m.onBeforeCompile = (s) => inject(s, false);
  m.customProgramCacheKey = () => 'ea-rune-body-v2';
  return m;
}

/** Material da capa (dupla face: forro colorido por dentro, runas por fora). */
export function createCloakMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ color: 0x252a4c, roughness: 0.88, metalness: 0.0, side: THREE.DoubleSide });
  m.name = 'ea-mago-capa';
  m.onBeforeCompile = (s) => inject(s, true);
  m.customProgramCacheKey = () => 'ea-rune-cloak-v2';
  return m;
}

let glowTex: THREE.DataTexture | null = null;
/** Textura radial suave (gerada em memória, sem canvas) para brilhos aditivos. */
export function glowTexture(): THREE.DataTexture {
  if (glowTex) return glowTex;
  const N = 64;
  const data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const dx = (i + 0.5) / N - 0.5;
      const dy = (j + 0.5) / N - 0.5;
      const r = Math.sqrt(dx * dx + dy * dy) * 2;
      const core = Math.max(0, 1 - r);
      const a = Math.pow(core, 2.2) * 0.85 + Math.pow(Math.max(0, 1 - r * 3), 2) * 0.6;
      const k = (j * N + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = 255;
      data[k + 3] = Math.min(255, Math.round(a * 255));
    }
  }
  glowTex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  glowTex.magFilter = THREE.LinearFilter;
  glowTex.minFilter = THREE.LinearFilter;
  glowTex.needsUpdate = true;
  return glowTex;
}
