/**
 * Névoa rasteira barata: sprites grandes (billboards cilíndricos) com ruído animado,
 * espalhados por células em volta do jogador conforme o bioma (pântano sempre,
 * floresta/margem de manhã, qualquer baixada com o clima de névoa).
 * O layout só é refeito quando o jogador muda de célula ou a cada poucos segundos;
 * por quadro só mudam uniforms. 1 draw call.
 */
import * as THREE from 'three';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { hash2 } from '../core/rng';
import { GROUND_FOG } from '../data/weather';
import { WATER_LEVEL, type BiomeId } from '../data/world';

export interface GroundFogSampler {
  biomeAt(x: number, z: number): BiomeId;
  heightAt(x: number, z: number): number;
  /** Peso 0..1 de névoa numa célula. */
  weight(biome: BiomeId): number;
}

export class GroundFog {
  readonly mesh: THREE.Mesh;
  readonly uniforms = {
    uTime: GLOBAL_UNIFORMS.uTime,
    uFogColor: GLOBAL_UNIFORMS.uFogColor,
    uSunColor: GLOBAL_UNIFORMS.uSunColor,
    uWindDir: GLOBAL_UNIFORMS.uWindDir,
    uNoise: { value: null as THREE.Texture | null },
    uAmount: { value: 1 },
    uOpacity: { value: GROUND_FOG.opacity },
    uFar: { value: GROUND_FOG.radius },
  };
  private geo = new THREE.InstancedBufferGeometry();
  private aPos!: THREE.InstancedBufferAttribute;
  private aData!: THREE.InstancedBufferAttribute;
  private capacity = 0;
  private lastCellX = 1e9;
  private lastCellZ = 1e9;
  private relayoutTimer = 0;
  /** Candidatos (dist², x, z, peso) reaproveitados entre layouts. */
  private cand: number[] = [];
  private order: number[] = [];
  /** Sprites ativos no último layout. */
  active = 0;

  constructor(noise: THREE.Texture) {
    this.uniforms.uNoise.value = noise;
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
    this.geo.setIndex([0, 1, 2, 2, 1, 3]);
    const mat = new THREE.ShaderMaterial({
      name: 'nevoa_rasteira',
      uniforms: this.uniforms,
      vertexShader: FOG_VERT,
      fragmentShader: FOG_FRAG,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.name = 'nevoa_rasteira';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 15;
    this.mesh.visible = false;
  }

  configure(count: number) {
    const cap = Math.max(0, Math.floor(count));
    if (cap === this.capacity) return;
    this.capacity = cap;
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, cap) * 4), 4); // xyz + largura
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, cap) * 3), 3); // altura, semente, peso
    this.geo.setAttribute('aPos', this.aPos);
    this.geo.setAttribute('aData', this.aData);
    this.geo.instanceCount = 0;
    this.lastCellX = 1e9; // força novo layout
  }

  /** Força o próximo update a refazer o layout (mudou hora/clima). */
  invalidate() {
    this.lastCellX = 1e9;
  }

  update(dt: number, px: number, pz: number, amount: number, sampler: GroundFogSampler) {
    this.uniforms.uAmount.value = amount;
    this.relayoutTimer -= dt;
    const cell = GROUND_FOG.cell;
    const cx = Math.floor(px / cell);
    const cz = Math.floor(pz / cell);
    if (amount > 0.01 && (cx !== this.lastCellX || cz !== this.lastCellZ || this.relayoutTimer <= 0)) {
      this.lastCellX = cx;
      this.lastCellZ = cz;
      this.relayoutTimer = 4;
      this.layout(px, pz, sampler);
    }
    this.mesh.visible = amount > 0.01 && this.active > 0;
  }

  private layout(px: number, pz: number, s: GroundFogSampler) {
    const cell = GROUND_FOG.cell;
    const R = GROUND_FOG.radius;
    const r = Math.ceil(R / cell);
    const c0x = Math.floor(px / cell);
    const c0z = Math.floor(pz / cell);
    const cand = this.cand;
    cand.length = 0;
    for (let j = -r; j <= r; j++) {
      for (let i = -r; i <= r; i++) {
        const ix = c0x + i;
        const iz = c0z + j;
        // posição determinística dentro da célula (sprites não "pulam" ao refazer)
        const x = (ix + 0.15 + 0.7 * hash2(ix, iz, 71)) * cell;
        const z = (iz + 0.15 + 0.7 * hash2(ix, iz, 72)) * cell;
        const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
        if (d2 > R * R) continue;
        const w = s.weight(s.biomeAt(x, z));
        if (w <= 0 || hash2(ix, iz, 73) > w) continue;
        cand.push(d2, x, z, w, ix, iz);
      }
    }
    // os mais próximos primeiro
    const n = cand.length / 6;
    const order = this.order;
    order.length = n;
    for (let k = 0; k < n; k++) order[k] = k;
    order.sort((a, b) => cand[a * 6] - cand[b * 6]);
    const P = this.aPos.array as Float32Array;
    const D = this.aData.array as Float32Array;
    const count = Math.min(this.capacity, n);
    const [s0, s1] = GROUND_FOG.size;
    const [h0, h1] = GROUND_FOG.height;
    for (let k = 0; k < count; k++) {
      const o = order[k] * 6;
      const x = cand[o + 1];
      const z = cand[o + 2];
      const w = cand[o + 3];
      const hs = hash2(cand[o + 4], cand[o + 5], 74);
      const ground = Math.max(s.heightAt(x, z), WATER_LEVEL);
      P[k * 4] = x;
      P[k * 4 + 1] = ground - 0.6;
      P[k * 4 + 2] = z;
      P[k * 4 + 3] = s0 + (s1 - s0) * hs;
      D[k * 3] = h0 + (h1 - h0) * hash2(cand[o + 4], cand[o + 5], 75);
      D[k * 3 + 1] = hs * 100;
      D[k * 3 + 2] = w;
    }
    this.active = count;
    this.geo.instanceCount = count;
    this.aPos.needsUpdate = true;
    this.aData.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const FOG_VERT = /* glsl */ `
attribute vec4 aPos;
attribute vec3 aData;
uniform float uFar;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
void main() {
  vec3 c = aPos.xyz;
  vec3 toCam = cameraPosition - c;
  float dist = length(toCam);
  vec3 tc = toCam / max(dist, 1e-3);
  vec2 h = normalize(vec2(toCam.x, toCam.z) + vec2(1e-4));
  vec3 right = vec3(h.y, 0.0, -h.x);
  float w = aPos.w;
  vec3 wp = c + right * position.x * w * 0.5 + vec3(0.0, position.y * aData.x * 2.2, 0.0);
  vUv = position.xy;
  vSeed = aData.y;
  // some de perto (não cobre a tela), ao longe e quando visto de cima (cartão fino)
  vAlpha = aData.z
    * smoothstep(3.0, 14.0, dist)
    * smoothstep(uFar, uFar * 0.7, dist)
    * (1.0 - smoothstep(0.45, 0.85, abs(tc.y)));
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const FOG_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uFogColor;
uniform vec3 uSunColor;
uniform vec2 uWindDir;
uniform sampler2D uNoise;
uniform float uAmount;
uniform float uOpacity;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
void main() {
  vec2 q = vec2(vUv.x, vUv.y * 2.0 - 1.0);
  float shape = smoothstep(1.0, 0.25, length(q * vec2(1.0, 1.15)));
  shape *= smoothstep(0.0, 0.25, vUv.y); // base suave (esconde a interseção com o chão)
  vec2 uv = vec2(vUv.x * 0.35 + vSeed, vUv.y * 0.18) + uWindDir * uTime * 0.012 + vec2(uTime * 0.004, 0.0);
  float n = texture2D(uNoise, uv).r * 0.7 + texture2D(uNoise, uv * 2.3 + 0.5).g * 0.3;
  float a = shape * smoothstep(0.25, 0.75, n) * vAlpha * uAmount * uOpacity;
  if (a < 0.004) discard;
  vec3 col = uFogColor * 1.06 + uSunColor * 0.04;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;
