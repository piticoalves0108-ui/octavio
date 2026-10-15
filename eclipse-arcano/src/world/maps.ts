import * as THREE from 'three';
import type { Heightfield } from './heightfield';
import { Simplex2 } from '../core/noise';
import { clamp, smoothstep } from '../core/math';
import { BIOME_INFO, ROADS, WATER_LEVEL, WORLD_HALF, WORLD_SIZE, type BiomeId } from '../data/world';

/**
 * Mapas do mundo em grade de 2 m (1024²), gerados uma vez no carregamento:
 *  - cor de bioma (macro-variação) → textura sRGB do terreno e base da cor da grama;
 *  - dados: R = estrada/terra batida, G = corrupção, B = densidade de grama, A = flores;
 *  - máscara de bloqueio (CPU) para a dispersão de vegetação (pegadas das estruturas);
 *  - altura (R16F com filtro linear, 1025²) para shaders de grama/água/partículas.
 *
 * As estruturas registram pegadas/ruas aqui ANTES do upload (World.init cuida da ordem).
 */
export const MAP_RES = 1024;
export const MAP_TEXEL = WORLD_SIZE / MAP_RES; // 2 m

const BIOME_LIST = Object.keys(BIOME_INFO) as BiomeId[];

export class WorldMaps {
  readonly res = MAP_RES;
  /** RGBA (sRGB) — cor macro do terreno. */
  readonly color = new Uint8Array(MAP_RES * MAP_RES * 4);
  /** RGBA — R estrada, G corrupção, B grama, A flores. */
  readonly data = new Uint8Array(MAP_RES * MAP_RES * 4);
  /** 1 = ocupado por estrutura/rua (sem árvores/pedras). */
  readonly block = new Uint8Array(MAP_RES * MAP_RES);

  colorTex!: THREE.DataTexture;
  dataTex!: THREE.DataTexture;
  heightTex!: THREE.DataTexture;

  private noise = new Simplex2(4242);

  constructor(readonly hf: Heightfield) {}

  /** Índice do texel que contém (x,z). */
  index(x: number, z: number): number {
    const i = clamp(Math.floor((x + WORLD_HALF) / MAP_TEXEL), 0, MAP_RES - 1);
    const j = clamp(Math.floor((z + WORLD_HALF) / MAP_TEXEL), 0, MAP_RES - 1);
    return j * MAP_RES + i;
  }

  roadAt(x: number, z: number) {
    return this.data[this.index(x, z) * 4] / 255;
  }
  corruptionAt(x: number, z: number) {
    return this.data[this.index(x, z) * 4 + 1] / 255;
  }
  grassAt(x: number, z: number) {
    return this.data[this.index(x, z) * 4 + 2] / 255;
  }
  flowersAt(x: number, z: number) {
    return this.data[this.index(x, z) * 4 + 3] / 255;
  }
  blockedAt(x: number, z: number) {
    return this.block[this.index(x, z)] !== 0;
  }

  /** Gera cor/dados base (bioma, corrupção, grama, flores, estradas). Fatiado para a tela de carregamento. */
  async generate(onProgress?: (f: number) => void) {
    const hf = this.hf;
    const N = MAP_RES;
    // Cores de bioma em sRGB 0..255 + densidades
    const bc = BIOME_LIST.map((b) => BIOME_INFO[b].color);
    const bg = BIOME_LIST.map((b) => BIOME_INFO[b].grass);
    const corrIdx = BIOME_LIST.indexOf('corrupted');
    const swampIdx = BIOME_LIST.indexOf('swamp');
    const meadowIdx = BIOME_LIST.indexOf('meadow');
    const forestIdx = BIOME_LIST.indexOf('forest');

    // Campo de corrupção suavizado na grade de biomas (8 m) com blur separável.
    const br = hf.biomeRes;
    let corr = new Float32Array(br * br);
    for (let k = 0; k < br * br; k++) corr[k] = hf.biomes[k] === corrIdx ? 1 : hf.biomes[k] === swampIdx ? 0.3 : 0;
    corr = blur(corr, br, 3);
    corr = blur(corr, br, 3);

    const n = this.noise;
    const rows = 64;
    for (let j0 = 0; j0 < N; j0 += rows) {
      for (let j = j0; j < Math.min(N, j0 + rows); j++) {
        const z = -WORLD_HALF + (j + 0.5) * MAP_TEXEL;
        // coordenada contínua na grade de biomas
        const fz = clamp((z + WORLD_HALF) / 8 - 0.5, 0, br - 1.001);
        const bj = Math.floor(fz);
        const tz = fz - bj;
        for (let i = 0; i < N; i++) {
          const x = -WORLD_HALF + (i + 0.5) * MAP_TEXEL;
          const fx = clamp((x + WORLD_HALF) / 8 - 0.5, 0, br - 1.001);
          const bi = Math.floor(fx);
          const tx = fx - bi;
          const k00 = bj * br + bi;
          const k10 = k00 + 1;
          const k01 = k00 + br;
          const k11 = k01 + 1;
          const w00 = (1 - tx) * (1 - tz);
          const w10 = tx * (1 - tz);
          const w01 = (1 - tx) * tz;
          const w11 = tx * tz;
          const b00 = hf.biomes[k00];
          const b10 = hf.biomes[k10];
          const b01 = hf.biomes[k01];
          const b11 = hf.biomes[k11];
          let r = bc[b00][0] * w00 + bc[b10][0] * w10 + bc[b01][0] * w01 + bc[b11][0] * w11;
          let g = bc[b00][1] * w00 + bc[b10][1] * w10 + bc[b01][1] * w01 + bc[b11][1] * w11;
          let b = bc[b00][2] * w00 + bc[b10][2] * w10 + bc[b01][2] * w01 + bc[b11][2] * w11;
          let grass = bg[b00] * w00 + bg[b10] * w10 + bg[b01] * w01 + bg[b11] * w11;
          const c = corr[k00] * w00 + corr[k10] * w10 + corr[k01] * w01 + corr[k11] * w11;
          const meadow = (b00 === meadowIdx ? w00 : 0) + (b10 === meadowIdx ? w10 : 0) + (b01 === meadowIdx ? w01 : 0) + (b11 === meadowIdx ? w11 : 0);
          const forest = (b00 === forestIdx ? w00 : 0) + (b10 === forestIdx ? w10 : 0) + (b01 === forestIdx ? w01 : 0) + (b11 === forestIdx ? w11 : 0);

          // Macro-variação: manchas secas/amareladas e áreas mais escuras.
          const m1 = n.noise(x / 70, z / 70);
          const m2 = n.noise(x / 17 + 31, z / 17 - 7);
          const dry = smoothstep(0.25, 0.75, m1) * (0.6 * meadow + 0.25);
          r += dry * 0.12 + m2 * 0.02;
          g += dry * 0.05 + m2 * 0.025;
          b -= dry * 0.04;
          const dark = smoothstep(0.1, -0.6, m1) * 0.12;
          r -= dark * 0.6;
          g -= dark * 0.4;
          b -= dark * 0.3;

          const h = hf.data[Math.min(j, hf.res - 1) * hf.res + Math.min(i, hf.res - 1)];
          // Margens úmidas: um pouco mais escuro/lamacento perto da água.
          const shore = smoothstep(WATER_LEVEL + 1.6, WATER_LEVEL + 0.2, h);
          r = r * (1 - shore * 0.25);
          g = g * (1 - shore * 0.2);
          b = b * (1 - shore * 0.1);

          const o = (j * N + i) * 4;
          this.color[o] = clamp(r, 0, 1) * 255;
          this.color[o + 1] = clamp(g, 0, 1) * 255;
          this.color[o + 2] = clamp(b, 0, 1) * 255;
          this.color[o + 3] = 255;

          // Grama: menos em encostas íngremes, nada debaixo d'água, falhas naturais.
          const s = hf.spacing;
          const ii = Math.min(i, hf.res - 2);
          const jj = Math.min(j, hf.res - 2);
          const dhx = hf.data[jj * hf.res + ii + 1] - hf.data[jj * hf.res + ii];
          const dhz = hf.data[(jj + 1) * hf.res + ii] - hf.data[jj * hf.res + ii];
          const slope = Math.sqrt(dhx * dhx + dhz * dhz) / s; // tangente
          grass *= smoothstep(1.1, 0.55, slope);
          grass *= smoothstep(WATER_LEVEL + 0.15, WATER_LEVEL + 0.7, h);
          grass *= 0.55 + 0.45 * smoothstep(-0.55, 0.1, m2);
          this.data[o + 1] = clamp(c, 0, 1) * 255;
          this.data[o + 2] = clamp(grass, 0, 1) * 255;
          // Flores: manchas nos campos e na floresta.
          const fl = smoothstep(0.35, 0.8, n.noise(x / 38 - 13, z / 38 + 5)) * (meadow * 0.9 + forest * 0.7) * smoothstep(0.9, 0.4, slope);
          this.data[o + 3] = clamp(fl * grass * 1.6, 0, 1) * 255;
        }
      }
      onProgress?.(Math.min(1, (j0 + rows) / N) * 0.9);
      await yieldFrame();
    }
    for (const r of ROADS) this.addRoad(r.points, r.width, 1);
    onProgress?.(1);
  }

  /** Pinta uma estrada/rua (terra batida) ao longo da polilinha. Remove grama e bloqueia vegetação. */
  addRoad(points: readonly (readonly [number, number])[], width: number, strength = 1) {
    const half = width * 0.5;
    const n = this.noise;
    for (let s = 0; s < points.length - 1; s++) {
      const [ax, az] = points[s];
      const [bx, bz] = points[s + 1];
      const pad = half + 3;
      this.forTexels(Math.min(ax, bx) - pad, Math.min(az, bz) - pad, Math.max(ax, bx) + pad, Math.max(az, bz) + pad, (x, z, k) => {
        const d = distSeg(x, z, ax, az, bx, bz) + n.noise(x / 6, z / 6) * 0.7;
        const v = smoothstep(half + 1.4, half - 0.6, d) * strength;
        if (v <= 0) return;
        const o = k * 4;
        this.data[o] = Math.max(this.data[o], v * 255);
        this.data[o + 2] *= 1 - Math.min(1, v * 1.3);
        this.data[o + 3] *= 1 - Math.min(1, v * 1.5);
        if (d < half + 0.8) this.block[k] = 1;
      });
    }
  }

  /**
   * Marca a pegada (retângulo orientado) de uma estrutura: bloqueia vegetação e
   * remove grama/flores. `dirt` (0..1) pinta terra batida em volta (pátios, quintais).
   */
  addFootprint(cx: number, cz: number, w: number, d: number, yaw: number, margin = 1, dirt = 0) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const hx = w / 2 + margin;
    const hz = d / 2 + margin;
    const ext = Math.abs(hx * c) + Math.abs(hz * s) + 2;
    const ezt = Math.abs(hx * s) + Math.abs(hz * c) + 2;
    this.forTexels(cx - ext, cz - ezt, cx + ext, cz + ezt, (x, z, k) => {
      const rx = x - cx;
      const rz = z - cz;
      // inverso da rotação three (yaw): local = R(-yaw) * mundo
      const lx = rx * c - rz * s;
      const lz = rx * s + rz * c;
      const ox = Math.abs(lx) - hx;
      const oz = Math.abs(lz) - hz;
      const out = Math.max(ox, oz);
      if (out > 1.5) return;
      const v = smoothstep(1.5, -0.5, out);
      const o = k * 4;
      this.data[o + 2] *= 1 - v;
      this.data[o + 3] *= 1 - v;
      if (dirt > 0) this.data[o] = Math.max(this.data[o], v * dirt * 255);
      if (out < 0.5) this.block[k] = 1;
    });
  }

  /** Círculo: bloqueia vegetação e remove grama (praças, arenas, plataformas). */
  addDisc(cx: number, cz: number, radius: number, dirt = 0, keepGrass = 0) {
    this.forTexels(cx - radius - 2, cz - radius - 2, cx + radius + 2, cz + radius + 2, (x, z, k) => {
      const d = Math.hypot(x - cx, z - cz) - radius;
      if (d > 1.5) return;
      const v = smoothstep(1.5, -0.5, d);
      const o = k * 4;
      this.data[o + 2] *= 1 - v * (1 - keepGrass);
      this.data[o + 3] *= 1 - v;
      if (dirt > 0) this.data[o] = Math.max(this.data[o], v * dirt * 255);
      if (d < 0.5) this.block[k] = 1;
    });
  }

  /** Só bloqueia árvores/pedras (sem mexer na grama). */
  blockDisc(cx: number, cz: number, radius: number) {
    this.forTexels(cx - radius, cz - radius, cx + radius, cz + radius, (x, z, k) => {
      if ((x - cx) ** 2 + (z - cz) ** 2 < radius * radius) this.block[k] = 1;
    });
  }

  private forTexels(minX: number, minZ: number, maxX: number, maxZ: number, fn: (x: number, z: number, k: number) => void) {
    const i0 = clamp(Math.floor((minX + WORLD_HALF) / MAP_TEXEL), 0, MAP_RES - 1);
    const i1 = clamp(Math.floor((maxX + WORLD_HALF) / MAP_TEXEL), 0, MAP_RES - 1);
    const j0 = clamp(Math.floor((minZ + WORLD_HALF) / MAP_TEXEL), 0, MAP_RES - 1);
    const j1 = clamp(Math.floor((maxZ + WORLD_HALF) / MAP_TEXEL), 0, MAP_RES - 1);
    for (let j = j0; j <= j1; j++) {
      const z = -WORLD_HALF + (j + 0.5) * MAP_TEXEL;
      for (let i = i0; i <= i1; i++) fn(-WORLD_HALF + (i + 0.5) * MAP_TEXEL, z, j * MAP_RES + i);
    }
  }

  /** Cria as texturas da GPU (chamar depois de registrar todas as pegadas). */
  upload() {
    this.colorTex = new THREE.DataTexture(this.color, MAP_RES, MAP_RES, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.colorTex.colorSpace = THREE.SRGBColorSpace;
    this.dataTex = new THREE.DataTexture(this.data, MAP_RES, MAP_RES, THREE.RGBAFormat, THREE.UnsignedByteType);
    for (const t of [this.colorTex, this.dataTex]) {
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
    // Altura em meia precisão (filtrável em WebGL2).
    const hf = this.hf;
    const half = new Uint16Array(hf.res * hf.res);
    for (let k = 0; k < half.length; k++) half[k] = THREE.DataUtils.toHalfFloat(hf.data[k]);
    this.heightTex = new THREE.DataTexture(half, hf.res, hf.res, THREE.RedFormat, THREE.HalfFloatType);
    this.heightTex.internalFormat = 'R16F';
    this.heightTex.magFilter = THREE.LinearFilter;
    this.heightTex.minFilter = THREE.LinearFilter;
    this.heightTex.generateMipmaps = false;
    this.heightTex.wrapS = this.heightTex.wrapT = THREE.ClampToEdgeWrapping;
    this.heightTex.needsUpdate = true;
  }

  dispose() {
    this.colorTex?.dispose();
    this.dataTex?.dispose();
    this.heightTex?.dispose();
  }
}

/** Trecho GLSL comum: amostragem dos mapas por coordenada de mundo. */
export const MAPS_GLSL = /* glsl */ `
uniform sampler2D tWorldColor;
uniform sampler2D tWorldData;
uniform sampler2D tWorldHeight;
vec2 worldMapUv(vec2 xz) { return (xz + ${WORLD_HALF.toFixed(1)}) / ${WORLD_SIZE.toFixed(1)}; }
// Altura do relevo: a grade tem 1025 amostras com centro do texel i em x = -1024 + 2i.
float worldHeight(vec2 xz) {
  vec2 uv = ((xz + ${WORLD_HALF.toFixed(1)}) * 0.5 + 0.5) / 1025.0;
  return texture(tWorldHeight, uv).r;
}
`;

function distSeg(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax;
  const abz = bz - az;
  const t = clamp(((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz || 1), 0, 1);
  return Math.hypot(ax + abx * t - x, az + abz * t - z);
}

function blur(src: Float32Array, n: number, r: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const inv = 1 / (2 * r + 1);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += src[j * n + clamp(i + k, 0, n - 1)];
      tmp[j * n + i] = s * inv;
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = -r; k <= r; k++) s += tmp[clamp(j + k, 0, n - 1) * n + i];
      out[j * n + i] = s * inv;
    }
  }
  return out;
}

export function yieldFrame(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}
