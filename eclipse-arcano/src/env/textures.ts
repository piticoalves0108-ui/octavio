/**
 * Texturas procedurais do ambiente (geradas uma vez no init, sem assets externos).
 */
import * as THREE from 'three';

/** Hash inteiro 2D periódico → [0,1). */
function hash(ix: number, iy: number, period: number, seed: number): number {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruído de valor periódico (quíntico) em [0,1]. */
function valueNoise(x: number, y: number, period: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  const a = hash(ix, iy, period, seed);
  const b = hash(ix + 1, iy, period, seed);
  const c = hash(ix, iy + 1, period, seed);
  const d = hash(ix + 1, iy + 1, period, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** fBm periódico (cada oitava dobra a frequência e o período). */
function fbm(x: number, y: number, basePeriod: number, octaves: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * f, y * f, basePeriod * f, seed + o * 17) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/** Células (Worley invertido) periódicas — "bolhas" das nuvens cúmulos. */
function cells(x: number, y: number, period: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let best = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i + hash(ix + i, iy + j, period, seed);
      const cy = iy + j + hash(ix + i, iy + j, period, seed + 99);
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d < best) best = d;
    }
  }
  return 1 - Math.min(1, Math.sqrt(best));
}

let noiseTex: THREE.DataTexture | null = null;

/**
 * Textura RGBA 128² repetível:
 * R = fBm grande, G = fBm fino, B = células, A = ruído branco.
 * Compartilhada pelo céu (nuvens), névoa rasteira e chuva.
 */
export function envNoiseTexture(): THREE.DataTexture {
  if (noiseTex) return noiseTex;
  const N = 128;
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = x / N;
      const v = y / N;
      const r = fbm(u * 4, v * 4, 4, 5, 11);
      const g = fbm(u * 16, v * 16, 16, 3, 23);
      const b = cells(u * 8, v * 8, 8, 37) * 0.6 + cells(u * 16, v * 16, 16, 41) * 0.4;
      const a = hash(x, y, N, 53);
      const o = (y * N + x) * 4;
      data[o] = Math.round(Math.min(1, Math.max(0, (r - 0.5) * 1.6 + 0.5)) * 255);
      data[o + 1] = Math.round(g * 255);
      data[o + 2] = Math.round(b * 255);
      data[o + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  tex.name = 'env_ruido';
  noiseTex = tex;
  return tex;
}
