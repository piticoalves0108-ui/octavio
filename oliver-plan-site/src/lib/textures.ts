import type { TextureSpec } from "@/data/finishes";

/**
 * Texturas procedurais desenhadas em <canvas>: madeira, pedra, laca, vidro canelado e linho.
 * A mesma textura alimenta os swatches em CSS (data URL) e os materiais do Three.js (CanvasTexture),
 * então o que o cliente vê no visualizador é exatamente o que aparece no 3D.
 */

// ——— Ruído determinístico ———

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function makeNoise(seed: number) {
  const rand = mulberry32(seed);
  const size = 256;
  const perm = new Uint8Array(size * 2);
  const values = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    perm[i] = i;
    values[i] = rand();
  }
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < size; i++) perm[i + size] = perm[i];

  const fade = (t: number) => t * t * (3 - 2 * t);
  const v = (x: number, y: number) => values[perm[(x & 255) + perm[y & 255]]];

  /** Ruído de valor 2D em [0,1] */
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const w = fade(yf);
    const a = v(xi, yi);
    const b = v(xi + 1, yi);
    const c = v(xi, yi + 1);
    const d = v(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };

  const fbm = (x: number, y: number, octaves = 4) => {
    let sum = 0;
    let amp = 0.5;
    let freq = 1;
    for (let o = 0; o < octaves; o++) {
      sum += amp * noise(x * freq, y * freq);
      freq *= 2;
      amp *= 0.5;
    }
    return sum;
  };

  return { noise, fbm, rand };
}

// ——— Cores ———

type RGB = [number, number, number];

const hexToRgb = (hex: string): RGB => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

// ——— Geradores ———

function paint(w: number, h: number, fn: (x: number, y: number) => RGB) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = fn(x, y);
      const i = (y * w + x) * 4;
      d[i] = c[0];
      d[i + 1] = c[1];
      d[i + 2] = c[2];
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function wood(spec: Extract<TextureSpec, { type: "wood" }>, seed: number) {
  const { noise, fbm } = makeNoise(seed);
  const W = 256;
  const H = 768;
  const base = hexToRgb(spec.base);
  const dark = hexToRgb(spec.dark);
  const light = hexToRgb(spec.light);
  const rings = 9 * (spec.scale ?? 1);
  const cathedral = spec.figure === "cathedral";

  return paint(W, H, (x, y) => {
    const u = x / W;
    const v = y / H;
    const warp = fbm(u * 3, v * 1.2, 3) - 0.5;
    let d: number;
    if (cathedral) {
      const dx = (u - 0.5) * 2;
      // Arcos em "U" invertido: o desenho clássico do veio catedral
      d = Math.sqrt(dx * dx * rings * rings * 1.6 + Math.max(0, 1 - v) * rings * 2.2) + warp * 2.4;
    } else {
      d = u * rings * 1.4 + warp * 3.4 + Math.sin(v * Math.PI * 4 + u * 9) * 0.15;
    }
    const ring = d - Math.floor(d);
    const band = smoothstep(0, 0.12, ring) * (1 - smoothstep(0.32, 0.7, ring)) * (cathedral ? 1 : 0.6 + fbm(u * 5 + 3, v * 2, 2) * 0.5);
    const fibers = noise(u * 170, v * 5);
    const pores = noise(u * 140, v * 90) > 0.86 ? 0.35 : 0;
    const tone = fbm(u * 1.5 + 7, v * 0.8, 2);
    let c = mix(light, base, 0.45 + tone * 0.55);
    c = mix(c, dark, band * 0.55 + fibers * 0.18 + pores * 0.25);
    return c;
  });
}

function stone(spec: Extract<TextureSpec, { type: "stone" }>, seed: number) {
  const { fbm, noise } = makeNoise(seed);
  const S = 384;
  const base = hexToRgb(spec.base);
  const vein = hexToRgb(spec.vein);
  const vein2 = hexToRgb(spec.vein2 ?? spec.vein);
  const density = spec.density ?? 0.6;

  return paint(S, S, (x, y) => {
    const u = x / S;
    const v = y / S;
    const t = fbm(u * 3, v * 3, 5);
    const marble = Math.abs(Math.sin((u * 2.2 + v * 1.3) * Math.PI * 1.6 + t * 9));
    const veinMask = (1 - smoothstep(0, 0.07 + density * 0.06, marble)) * density;
    const t2 = fbm(u * 6 + 3, v * 6 + 9, 4);
    const marble2 = Math.abs(Math.sin((u * 1.1 - v * 2.4) * Math.PI * 2 + t2 * 7));
    const veinMask2 = (1 - smoothstep(0, 0.035, marble2)) * density * 0.7;
    const cloud = fbm(u * 4 + 11, v * 4, 3);
    const speck = noise(u * 300, v * 300) > 0.93 ? 0.08 : 0;
    let c = mix(base, mix(base, vein2, 0.5), cloud * 0.35);
    c = mix(c, vein, veinMask * 0.85);
    c = mix(c, vein2, veinMask2 * 0.9);
    c = mix(c, vein, speck);
    return c;
  });
}

function solid(spec: Extract<TextureSpec, { type: "solid" }>, seed: number) {
  const { noise, fbm } = makeNoise(seed);
  const S = 256;
  const base = hexToRgb(spec.base);
  const amp = (spec.noise ?? 0.03) * 255;
  return paint(S, S, (x, y) => {
    const n = (noise(x * 0.9, y * 0.9) - 0.5) * amp + (fbm(x / 60, y / 60, 2) - 0.5) * amp * 0.8;
    return [base[0] + n, base[1] + n, base[2] + n];
  });
}

function fluted(spec: Extract<TextureSpec, { type: "fluted" }>) {
  const S = 256;
  const base = hexToRgb(spec.base);
  const tint = hexToRgb(spec.tint);
  const flutes = 16;
  return paint(S, S, (x) => {
    const p = ((x / S) * flutes) % 1;
    const shade = Math.pow(Math.sin(p * Math.PI), 0.6);
    return mix(base, tint, shade * 0.85);
  });
}

function linen(spec: Extract<TextureSpec, { type: "linen" }>, seed: number) {
  const { noise } = makeNoise(seed);
  const S = 256;
  const base = hexToRgb(spec.base);
  const thread = hexToRgb(spec.thread);
  return paint(S, S, (x, y) => {
    const warp = Math.sin(x * 1.6 + noise(x * 0.05, y * 0.4) * 4) * 0.5 + 0.5;
    const weft = Math.sin(y * 1.6 + noise(x * 0.4, y * 0.05) * 4) * 0.5 + 0.5;
    const slub = noise(x * 0.08, y * 0.9) * 0.4;
    return mix(base, thread, (warp * weft) * 0.6 + slub * 0.4);
  });
}

// ——— API pública ———

const canvasCache = new Map<string, HTMLCanvasElement>();
const urlCache = new Map<string, string>();

const keyOf = (spec: TextureSpec) => JSON.stringify(spec);

export function getTextureCanvas(spec: TextureSpec): HTMLCanvasElement {
  const key = keyOf(spec);
  const cached = canvasCache.get(key);
  if (cached) return cached;
  const seed = hashString(key);
  let canvas: HTMLCanvasElement;
  switch (spec.type) {
    case "wood":
      canvas = wood(spec, seed);
      break;
    case "stone":
      canvas = stone(spec, seed);
      break;
    case "fluted":
      canvas = fluted(spec);
      break;
    case "linen":
      canvas = linen(spec, seed);
      break;
    default:
      canvas = solid(spec, seed);
  }
  canvasCache.set(key, canvas);
  return canvas;
}

export function getTextureDataURL(spec: TextureSpec): string {
  const key = keyOf(spec);
  const cached = urlCache.get(key);
  if (cached) return cached;
  const url = getTextureCanvas(spec).toDataURL("image/jpeg", 0.86);
  urlCache.set(key, url);
  return url;
}

/** Tamanho real (em metros) que uma repetição da textura cobre no 3D */
export function textureWorldSize(spec: TextureSpec): [number, number] {
  switch (spec.type) {
    case "wood":
      return [0.75, 2];
    case "stone":
      return [1.4, 1.4];
    case "fluted":
      return [0.32, 0.32];
    case "linen":
      return [0.25, 0.25];
    default:
      return [1, 1];
  }
}

/**
 * Aproximação em CSS puro, usada na renderização do servidor e antes do canvas ficar pronto.
 */
export function cssFallback(spec: TextureSpec): string {
  switch (spec.type) {
    case "wood":
      return `repeating-linear-gradient(90deg, ${spec.base} 0 6px, ${spec.dark}55 6px 7px, ${spec.light}66 7px 11px, ${spec.base} 11px 16px), ${spec.base}`;
    case "stone":
      return `linear-gradient(125deg, transparent 40%, ${spec.vein}66 42%, transparent 44%), linear-gradient(35deg, transparent 60%, ${spec.vein2 ?? spec.vein}55 61%, transparent 63%), ${spec.base}`;
    case "fluted":
      return `repeating-linear-gradient(90deg, ${spec.base} 0 4px, ${spec.tint} 8px, ${spec.base} 12px)`;
    case "linen":
      return `repeating-linear-gradient(0deg, ${spec.thread}55 0 1px, transparent 1px 3px), repeating-linear-gradient(90deg, ${spec.thread}55 0 1px, transparent 1px 3px), ${spec.base}`;
    default:
      return spec.base;
  }
}
