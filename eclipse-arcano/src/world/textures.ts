import * as THREE from 'three';
import { RNG } from '../core/rng';

/**
 * Texturas procedurais (canvas 2D + ruído periódico), todas originais e geradas
 * no carregamento. Só rodam no navegador (precisam de canvas).
 */

/** Ruído de valor periódico (tileável) em grade inteira. */
export class TileNoise {
  private perm = new Uint8Array(512);
  constructor(seed = 1) {
    const rng = new RNG(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      const t = p[i];
      p[i] = p[j];
      p[j] = t;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  private h(i: number, j: number) {
    return this.perm[(this.perm[i & 255] + j) & 511] / 255;
  }
  /** Valor em [0,1], período `period` (inteiro) nas duas direções. */
  value(x: number, y: number, period: number): number {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = x - xi;
    const ty = y - yi;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const x0 = ((xi % period) + period) % period;
    const y0 = ((yi % period) + period) % period;
    const x1 = (x0 + 1) % period;
    const y1 = (y0 + 1) % period;
    const a = this.h(x0, y0);
    const b = this.h(x1, y0);
    const c = this.h(x0, y1);
    const d = this.h(x1, y1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  /** fBm periódico: u,v em [0,1), `base` = número de células da 1ª oitava. */
  fbm(u: number, v: number, base: number, octaves = 4, gain = 0.5): number {
    let amp = 1;
    let sum = 0;
    let norm = 0;
    let p = base;
    for (let o = 0; o < octaves; o++) {
      sum += this.value(u * p, v * p, p) * amp;
      norm += amp;
      amp *= gain;
      p *= 2;
    }
    return sum / norm;
  }
}

/** Distância ao ponto de Voronoi mais próximo (F1) e ao segundo (F2), periódico. */
function voronoi(u: number, v: number, cells: number, rng: RNG, pts: Float32Array): [number, number] {
  void rng;
  const x = u * cells;
  const y = v * cells;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let f1 = 9;
  let f2 = 9;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = xi + i;
      const cy = yi + j;
      const wx = ((cx % cells) + cells) % cells;
      const wy = ((cy % cells) + cells) % cells;
      const k = (wy * cells + wx) * 2;
      const px = cx + pts[k];
      const py = cy + pts[k + 1];
      const d = Math.hypot(px - x, py - y);
      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) f2 = d;
    }
  }
  return [f1, f2];
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  return [c, g];
}

/**
 * Detalhe do terreno (512², dados lineares):
 * R = ruído fino (solo/grama), G = rocha (rachaduras Voronoi), B = ruído médio, A = pedriscos.
 */
export function terrainDetailTexture(): THREE.Texture {
  const S = 512;
  const [canvas, g] = makeCanvas(S, S);
  const img = g.createImageData(S, S);
  const n = new TileNoise(11);
  const rng = new RNG(5);
  const cells = 12;
  const pts = new Float32Array(cells * cells * 2);
  for (let k = 0; k < pts.length; k++) pts[k] = rng.next();
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      const fine = n.fbm(u, v, 32, 3);
      const mid = n.fbm(u + 0.37, v + 0.11, 6, 4);
      const [f1, f2] = voronoi(u, v, cells, rng, pts);
      const crack = Math.min(1, (f2 - f1) * 4.5);
      const rock = crack * (0.65 + 0.35 * n.fbm(u, v, 16, 3));
      const o = (y * S + x) * 4;
      img.data[o] = fine * 255;
      img.data[o + 1] = rock * 255;
      img.data[o + 2] = mid * 255;
      img.data[o + 3] = 0;
    }
  }
  g.putImageData(img, 0, 0);
  // Pedriscos: elipses desenhadas no canal A (via composição manual).
  const peb = g.getImageData(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const cx = rng.next() * S;
    const cy = rng.next() * S;
    const r = 1.2 + rng.next() * 3.2;
    for (let yy = -4; yy <= 4; yy++) {
      for (let xx = -4; xx <= 4; xx++) {
        const d = Math.hypot(xx / r, (yy / r) * 1.3);
        if (d > 1) continue;
        const px = (Math.floor(cx + xx) + S) % S;
        const py = (Math.floor(cy + yy) + S) % S;
        const o = (py * S + px) * 4 + 3;
        peb.data[o] = Math.max(peb.data[o], (1 - d * d) * 255);
      }
    }
  }
  g.putImageData(peb, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.premultiplyAlpha = false;
  return tex;
}

/** Normal map tileável para a água (256²). */
export function waterNormalTexture(): THREE.Texture {
  const S = 256;
  const [canvas, g] = makeCanvas(S, S);
  const img = g.createImageData(S, S);
  const n = new TileNoise(77);
  const h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = n.fbm(x / S, y / S, 8, 4, 0.55);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const l = h[y * S + ((x + S - 1) % S)];
      const r = h[y * S + ((x + 1) % S)];
      const u = h[((y + S - 1) % S) * S + x];
      const d = h[((y + 1) % S) * S + x];
      let nx = (l - r) * 6;
      let ny = (u - d) * 6;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      const o = (y * S + x) * 4;
      img.data[o] = (nx * 0.5 + 0.5) * 255;
      img.data[o + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[o + 2] = (nz / len * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

// ---------------------------------------------------------------------------
// Camadas das estruturas (DataArrayTexture). Alfa = máscara de emissão.
// ---------------------------------------------------------------------------

export const LAYER = {
  STONE: 0,
  WOOD: 1,
  ROOF: 2,
  PLASTER: 3,
  METAL: 4,
  CRYSTAL: 5,
  COBBLE: 6,
  FABRIC: 7,
  RUNE: 8,
  PLAIN: 9,
  LOG: 10,
  THATCH: 11,
  ROCK: 12,
  MOSS: 13,
} as const;
export type LayerId = (typeof LAYER)[keyof typeof LAYER];
export const LAYER_COUNT = 14;

/** Rugosidade / metalicidade por camada (uniform arrays no shader). */
export const LAYER_PBR: { rough: number; metal: number }[] = [
  { rough: 0.9, metal: 0 }, // pedra
  { rough: 0.82, metal: 0 }, // madeira
  { rough: 0.7, metal: 0 }, // telha
  { rough: 0.95, metal: 0 }, // reboco
  { rough: 0.42, metal: 0.75 }, // metal
  { rough: 0.12, metal: 0.1 }, // cristal
  { rough: 0.88, metal: 0 }, // calçamento
  { rough: 0.95, metal: 0 }, // tecido
  { rough: 0.6, metal: 0.25 }, // pedra rúnica
  { rough: 0.7, metal: 0 }, // liso
  { rough: 0.9, metal: 0 }, // tronco
  { rough: 1, metal: 0 }, // palha
  { rough: 0.95, metal: 0 }, // rocha
  { rough: 1, metal: 0 }, // musgo/grama
];

/** Escala de UV (m por repetição) recomendada por camada. */
export const LAYER_TILE_M: number[] = [2.4, 2, 2.2, 3, 3, 1.5, 2.5, 2, 2.4, 2, 1.6, 2.4, 4, 3];

const LS = 256;

export function structureLayersTexture(): THREE.DataArrayTexture {
  const data = new Uint8Array(LS * LS * 4 * LAYER_COUNT);
  const n = new TileNoise(19);
  // Ruído base compartilhado (fBm tileável) para economizar tempo.
  const base = new Float32Array(LS * LS);
  const fine = new Float32Array(LS * LS);
  for (let y = 0; y < LS; y++) {
    for (let x = 0; x < LS; x++) {
      base[y * LS + x] = n.fbm(x / LS, y / LS, 4, 4);
      fine[y * LS + x] = n.fbm(x / LS, y / LS, 32, 2);
    }
  }
  const painters: ((g: CanvasRenderingContext2D, rng: RNG) => void)[] = [
    paintStone,
    paintWood,
    paintRoof,
    paintPlaster,
    paintMetal,
    paintCrystal,
    paintCobble,
    paintFabric,
    paintRune,
    paintPlain,
    paintLog,
    paintThatch,
    paintRock,
    paintMoss,
  ];
  const [, g] = makeCanvas(LS, LS);
  painters.forEach((paint, layer) => {
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, LS, LS);
    const rng = new RNG(100 + layer);
    paint(g, rng);
    const img = g.getImageData(0, 0, LS, LS);
    const off = layer * LS * LS * 4;
    // Ruído de sujeira por cima (multiplicativo), com deslocamento por camada.
    const sx = (layer * 37) % LS;
    const sy = (layer * 91) % LS;
    for (let y = 0; y < LS; y++) {
      for (let x = 0; x < LS; x++) {
        const k = ((y + sy) % LS) * LS + ((x + sx) % LS);
        const m = 0.82 + base[k] * 0.22 + (fine[k] - 0.5) * 0.12;
        const o = (y * LS + x) * 4;
        data[off + o] = Math.min(255, img.data[o] * m);
        data[off + o + 1] = Math.min(255, img.data[o + 1] * m);
        data[off + o + 2] = Math.min(255, img.data[o + 2] * m);
        data[off + o + 3] = img.data[o + 3];
      }
    }
  });
  const tex = new THREE.DataArrayTexture(data, LS, LS, LAYER_COUNT);
  tex.format = THREE.RGBAFormat;
  tex.type = THREE.UnsignedByteType;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// --- pintores (cada um desenha 256x256, alfa 255 = emissão total permitida) ---

function fill(g: CanvasRenderingContext2D, c: string, alpha = 255) {
  g.fillStyle = c;
  g.fillRect(0, 0, LS, LS);
  if (alpha !== 255) setAlpha(g, alpha);
}

function setAlpha(g: CanvasRenderingContext2D, a: number) {
  const img = g.getImageData(0, 0, LS, LS);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = a;
  g.putImageData(img, 0, 0);
}

function shade(base: number, rng: RNG, amount: number) {
  const v = Math.max(0, Math.min(255, base + (rng.next() - 0.5) * amount));
  return v | 0;
}

function paintStone(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#6d6a66');
  const rows = 6;
  const rh = LS / rows;
  for (let r = 0; r < rows; r++) {
    let x = r % 2 ? -rh * 0.7 : 0;
    while (x < LS) {
      const w = rh * (1.1 + rng.next() * 0.9);
      const v = shade(178, rng, 50);
      g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      roundRect(g, x + 2, r * rh + 2, w - 4, rh - 4, 5);
      // bisel
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(x + 3, r * rh + 3, w - 6, 3);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(x + 3, r * rh + rh - 6, w - 6, 3);
      if (x + w > LS) {
        // continua do outro lado (tileável)
        g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
        roundRect(g, x - LS + 2, r * rh + 2, w - 4, rh - 4, 5);
      }
      x += w;
    }
  }
  speckle(g, rng, 1400, 0.12);
}

function paintWood(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#5a4532');
  const planks = 5;
  const pw = LS / planks;
  for (let p = 0; p < planks; p++) {
    const v = shade(190, rng, 40);
    g.fillStyle = `rgb(${v},${(v * 0.8) | 0},${(v * 0.6) | 0})`;
    g.fillRect(p * pw + 1.5, 0, pw - 3, LS);
    // veios
    for (let k = 0; k < 14; k++) {
      g.strokeStyle = `rgba(60,40,20,${0.08 + rng.next() * 0.14})`;
      g.lineWidth = 1 + rng.next() * 1.5;
      g.beginPath();
      const x0 = p * pw + 4 + rng.next() * (pw - 8);
      g.moveTo(x0, 0);
      for (let y = 0; y <= LS; y += 16) g.lineTo(x0 + Math.sin(y * 0.05 + k) * 2.5, y);
      g.stroke();
    }
    // nós e pregos
    if (rng.next() < 0.6) {
      g.fillStyle = 'rgba(50,30,15,0.5)';
      ellipse(g, p * pw + pw / 2, rng.next() * LS, 4, 6);
    }
    g.fillStyle = 'rgba(40,40,40,0.8)';
    g.fillRect(p * pw + 5, 12, 3, 3);
    g.fillRect(p * pw + pw - 8, 12, 3, 3);
    g.fillRect(p * pw + 5, LS / 2 + 12, 3, 3);
    g.fillRect(p * pw + pw - 8, LS / 2 + 12, 3, 3);
  }
  // emendas
  g.fillStyle = 'rgba(30,20,10,0.6)';
  for (let p = 0; p < planks; p++) g.fillRect(p * pw, ((p * 97) % 200) + 20, pw, 2);
}

function paintRoof(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#3a2a24');
  const rows = 8;
  const rh = LS / rows;
  const cols = 8;
  const cw = LS / cols;
  for (let r = 0; r < rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const x = c * cw + (r % 2 ? cw / 2 : 0);
      const v = shade(200, rng, 45);
      const grd = g.createLinearGradient(0, r * rh, 0, r * rh + rh);
      grd.addColorStop(0, `rgb(${v},${v},${v})`);
      grd.addColorStop(1, `rgb(${(v * 0.62) | 0},${(v * 0.62) | 0},${(v * 0.62) | 0})`);
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(x + 1, r * rh);
      g.lineTo(x + cw - 1, r * rh);
      g.lineTo(x + cw - 1, r * rh + rh * 0.7);
      g.quadraticCurveTo(x + cw / 2, r * rh + rh * 1.15, x + 1, r * rh + rh * 0.7);
      g.closePath();
      g.fill();
    }
  }
  speckle(g, rng, 600, 0.1);
}

function paintPlaster(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#e6dccb');
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(${150 + rng.next() * 50},${130 + rng.next() * 40},${100 + rng.next() * 30},${0.02 + rng.next() * 0.04})`;
    ellipse(g, rng.next() * LS, rng.next() * LS, 6 + rng.next() * 18, 4 + rng.next() * 12);
  }
  // pedras aparentes
  for (let i = 0; i < 5; i++) {
    g.fillStyle = 'rgba(120,110,100,0.35)';
    roundRect(g, rng.next() * LS, rng.next() * LS, 14 + rng.next() * 12, 8 + rng.next() * 6, 3);
  }
  speckle(g, rng, 1600, 0.06);
}

function paintMetal(g: CanvasRenderingContext2D, rng: RNG) {
  // Painéis metálicos escuros; ALFA = trilhas de circuito luminosas.
  fill(g, '#9aa3ad', 0);
  const panels = 4;
  const pw = LS / panels;
  for (let i = 0; i < panels; i++) {
    for (let j = 0; j < panels; j++) {
      const v = shade(150, rng, 40);
      g.fillStyle = `rgba(${v},${v + 6},${v + 14},1)`;
      g.fillRect(i * pw + 2, j * pw + 2, pw - 4, pw - 4);
      g.fillStyle = 'rgba(30,30,40,1)';
      for (const [rx, ry] of [
        [6, 6],
        [pw - 9, 6],
        [6, pw - 9],
        [pw - 9, pw - 9],
      ])
        g.fillRect(i * pw + rx, j * pw + ry, 3, 3);
    }
  }
  // circuitos (alfa)
  const img = g.getImageData(0, 0, LS, LS);
  for (let k = 3; k < img.data.length; k += 4) img.data[k] = 0;
  const line = (x0: number, y0: number, x1: number, y1: number, w: number) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / steps);
      const y = Math.round(y0 + ((y1 - y0) * s) / steps);
      for (let a = -w; a <= w; a++)
        for (let b = -w; b <= w; b++) {
          const px = (x + a + LS) % LS;
          const py = (y + b + LS) % LS;
          const o = (py * LS + px) * 4;
          img.data[o + 3] = 255;
          img.data[o] = img.data[o] * 0.6 + 70;
          img.data[o + 1] = img.data[o + 1] * 0.6 + 90;
          img.data[o + 2] = img.data[o + 2] * 0.6 + 100;
        }
    }
  };
  for (let t = 0; t < 14; t++) {
    let x = Math.floor(rng.next() * 16) * 16;
    let y = Math.floor(rng.next() * 16) * 16;
    for (let seg = 0; seg < 5; seg++) {
      const horiz = rng.next() < 0.5;
      const len = (1 + Math.floor(rng.next() * 4)) * 16;
      const nx = horiz ? x + (rng.next() < 0.5 ? -len : len) : x;
      const ny = horiz ? y : y + (rng.next() < 0.5 ? -len : len);
      line(x, y, nx, ny, 1);
      x = nx;
      y = ny;
    }
    // nó
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) if (a * a + b * b <= 9) img.data[(((y + b + LS) % LS) * LS + ((x + a + LS) % LS)) * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

function paintCrystal(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#cfe6ff');
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(255,255,255,${0.2 + rng.next() * 0.4})`;
    g.lineWidth = 1 + rng.next() * 2;
    g.beginPath();
    const x = rng.next() * LS;
    const y = rng.next() * LS;
    g.moveTo(x, y);
    g.lineTo(x + (rng.next() - 0.5) * 120, y + (rng.next() - 0.5) * 120);
    g.stroke();
  }
  for (let i = 0; i < 30; i++) {
    g.fillStyle = `rgba(${120 + rng.next() * 60},${150 + rng.next() * 60},255,0.25)`;
    tri(g, rng.next() * LS, rng.next() * LS, 20 + rng.next() * 40, rng);
  }
  // alfa parcial: brilho interno variável
  const img = g.getImageData(0, 0, LS, LS);
  const n = new TileNoise(3);
  for (let y = 0; y < LS; y++) for (let x = 0; x < LS; x++) img.data[(y * LS + x) * 4 + 3] = 120 + n.fbm(x / LS, y / LS, 4, 3) * 135;
  g.putImageData(img, 0, 0);
}

function paintCobble(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#5b564e');
  const cells = 9;
  const s = LS / cells;
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      const v = shade(170, rng, 50);
      g.fillStyle = `rgb(${v},${v - 6},${v - 14})`;
      const ox = (rng.next() - 0.5) * 4;
      const oy = (rng.next() - 0.5) * 4;
      roundRect(g, i * s + 2 + ox, j * s + 2 + oy, s - 4, s - 4, s * 0.35);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(g, i * s + 4 + ox, j * s + 4 + oy, s - 10, (s - 8) * 0.4, s * 0.25);
    }
  }
  speckle(g, rng, 900, 0.1);
}

function paintFabric(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#e8e2d4');
  for (let y = 0; y < LS; y += 3) {
    g.fillStyle = `rgba(0,0,0,${0.03 + rng.next() * 0.03})`;
    g.fillRect(0, y, LS, 1);
  }
  for (let x = 0; x < LS; x += 3) {
    g.fillStyle = `rgba(0,0,0,${0.03 + rng.next() * 0.03})`;
    g.fillRect(x, 0, 1, LS);
  }
  // listras largas (tintadas pela cor do vértice)
  g.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < LS; x += 64) g.fillRect(x, 0, 28, LS);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = 'rgba(90,70,40,0.12)';
    ellipse(g, rng.next() * LS, rng.next() * LS, 20, 12);
  }
}

function paintRune(g: CanvasRenderingContext2D, rng: RNG) {
  // Pedra escura com runas (ALFA = runas luminosas).
  fill(g, '#3d3b44');
  const rows = 4;
  const rh = LS / rows;
  for (let r = 0; r < rows; r++) {
    const v = shade(110, rng, 30);
    g.fillStyle = `rgb(${v},${v},${v + 12})`;
    g.fillRect(0, r * rh + 2, LS, rh - 4);
  }
  speckle(g, rng, 800, 0.1);
  const img = g.getImageData(0, 0, LS, LS);
  for (let k = 3; k < img.data.length; k += 4) img.data[k] = 0;
  g.putImageData(img, 0, 0);
  // glifos: traços retos e arcos numa faixa
  const glyphLayer = document.createElement('canvas');
  glyphLayer.width = glyphLayer.height = LS;
  const gg = glyphLayer.getContext('2d')!;
  gg.strokeStyle = '#ffffff';
  gg.lineWidth = 3;
  gg.lineCap = 'round';
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 1) continue;
    for (let c = 0; c < 6; c++) {
      const cx = c * (LS / 6) + LS / 12;
      const cy = r * rh + rh / 2;
      gg.beginPath();
      const strokes = 2 + Math.floor(rng.next() * 3);
      for (let s = 0; s < strokes; s++) {
        const a = rng.next() * Math.PI * 2;
        const l = 8 + rng.next() * 10;
        gg.moveTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
        gg.lineTo(cx - Math.cos(a) * l * 0.4, cy - Math.sin(a) * l * 0.4);
      }
      if (rng.next() < 0.5) gg.arc(cx, cy, 7 + rng.next() * 6, 0, Math.PI * (1 + rng.next()));
      gg.stroke();
    }
  }
  const gl = gg.getImageData(0, 0, LS, LS);
  const img2 = g.getImageData(0, 0, LS, LS);
  for (let k = 0; k < gl.data.length; k += 4) {
    const a = gl.data[k + 3];
    if (a > 0) {
      img2.data[k + 3] = a;
      img2.data[k] = Math.min(255, img2.data[k] + a * 0.5);
      img2.data[k + 1] = Math.min(255, img2.data[k + 1] + a * 0.5);
      img2.data[k + 2] = Math.min(255, img2.data[k + 2] + a * 0.6);
    }
  }
  g.putImageData(img2, 0, 0);
}

function paintPlain(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#dddddd');
  speckle(g, rng, 500, 0.05);
}

function paintLog(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#6b5038');
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${30 + rng.next() * 30},${20 + rng.next() * 20},10,${0.25 + rng.next() * 0.3})`;
    g.lineWidth = 1 + rng.next() * 3;
    const x = rng.next() * LS;
    g.beginPath();
    g.moveTo(x, 0);
    for (let y = 0; y <= LS; y += 32) g.lineTo(x + Math.sin(y * 0.03 + i) * 4, y);
    g.stroke();
  }
  for (let i = 0; i < 10; i++) {
    g.fillStyle = 'rgba(160,130,90,0.25)';
    ellipse(g, rng.next() * LS, rng.next() * LS, 3, 10);
  }
}

function paintThatch(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#8a7444');
  for (let i = 0; i < 1600; i++) {
    const x = rng.next() * LS;
    const y = rng.next() * LS;
    const v = 140 + rng.next() * 90;
    g.strokeStyle = `rgba(${v},${v * 0.82},${v * 0.45},0.7)`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (rng.next() - 0.5) * 3, y + 10 + rng.next() * 14);
    g.stroke();
  }
  g.fillStyle = 'rgba(40,30,10,0.25)';
  for (let y = 0; y < LS; y += 32) g.fillRect(0, y, LS, 3);
}

function paintRock(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#8a847a');
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(${rng.next() < 0.5 ? 40 : 200},${rng.next() < 0.5 ? 40 : 190},${rng.next() < 0.5 ? 40 : 170},${0.05 + rng.next() * 0.08})`;
    ellipse(g, rng.next() * LS, rng.next() * LS, 6 + rng.next() * 40, 4 + rng.next() * 24);
  }
  for (let i = 0; i < 25; i++) {
    g.strokeStyle = `rgba(30,25,20,${0.2 + rng.next() * 0.3})`;
    g.lineWidth = 1 + rng.next() * 1.5;
    g.beginPath();
    let x = rng.next() * LS;
    let y = rng.next() * LS;
    g.moveTo(x, y);
    for (let s = 0; s < 6; s++) {
      x += (rng.next() - 0.5) * 30;
      y += rng.next() * 18;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  speckle(g, rng, 1500, 0.12);
}

function paintMoss(g: CanvasRenderingContext2D, rng: RNG) {
  fill(g, '#6f8a46');
  for (let i = 0; i < 2600; i++) {
    const v = 0.7 + rng.next() * 0.6;
    g.fillStyle = `rgba(${(90 * v) | 0},${(130 * v) | 0},${(60 * v) | 0},0.6)`;
    g.fillRect(rng.next() * LS, rng.next() * LS, 2, 2 + rng.next() * 3);
  }
}

// utilidades de desenho
function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}
function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fill();
}
function tri(g: CanvasRenderingContext2D, x: number, y: number, s: number, rng: RNG) {
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + (rng.next() - 0.5) * s, y + s);
  g.lineTo(x + s, y + (rng.next() - 0.5) * s);
  g.closePath();
  g.fill();
}
function speckle(g: CanvasRenderingContext2D, rng: RNG, count: number, alpha: number) {
  for (let i = 0; i < count; i++) {
    const d = rng.next() < 0.5;
    g.fillStyle = d ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.7})`;
    g.fillRect(rng.next() * LS, rng.next() * LS, 1 + rng.next() * 2, 1 + rng.next() * 2);
  }
}
