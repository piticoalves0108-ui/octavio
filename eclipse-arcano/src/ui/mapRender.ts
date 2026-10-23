/**
 * Desenho do mapa do mundo (usado pelo mapa em tela cheia e pelo minimapa).
 * Estilo topográfico pintado: cor do bioma clareada para tom de pergaminho, relevo
 * sombreado de noroeste, curvas de nível (10 m e 50 m), água por profundidade com
 * margem clara, estradas, construções e manchas de corrupção.
 */
import { WORLD_HALF, WORLD_SIZE, WATER_LEVEL } from '../data/world';
import type { Heightfield } from '../world/heightfield';
import type { WorldMaps } from '../world/maps';
import { EXPLORE_RES, type Exploration } from '../world/exploration';

export const MAP_PX = 1024;
/** Metros por pixel do mapa base. */
export const MAP_M_PER_PX = WORLD_SIZE / MAP_PX;

export function worldToMap(x: number, z: number, out: { x: number; y: number }) {
  out.x = (x + WORLD_HALF) / MAP_M_PER_PX;
  out.y = (z + WORLD_HALF) / MAP_M_PER_PX;
  return out;
}

export function mapToWorld(px: number, py: number, out: { x: number; z: number }) {
  out.x = px * MAP_M_PER_PX - WORLD_HALF;
  out.z = py * MAP_M_PER_PX - WORLD_HALF;
  return out;
}

const PARCH = [233, 223, 196];

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * Gera o mapa base em fatias (não trava a tela). Chama `onDone` com o canvas pronto.
 * Custo: ~1 M de pixels, dividido em blocos de 64 linhas por quadro.
 */
export class MapBaseRenderer {
  readonly canvas = document.createElement('canvas');
  ready = false;
  private started = false;
  private readonly waiters: (() => void)[] = [];

  constructor(private hf: Heightfield, private maps: WorldMaps) {
    this.canvas.width = MAP_PX;
    this.canvas.height = MAP_PX;
  }

  /** Começa (uma vez) e resolve quando terminar. */
  build(): Promise<void> {
    if (this.ready) return Promise.resolve();
    const p = new Promise<void>((r) => this.waiters.push(r));
    if (!this.started) {
      this.started = true;
      void this.run();
    }
    return p;
  }

  private async run() {
    const g = this.canvas.getContext('2d')!;
    const img = g.createImageData(MAP_PX, MAP_PX);
    const px = img.data;
    const hf = this.hf;
    const H = hf.data;
    const R = hf.res;
    const color = this.maps.color;
    const data = this.maps.data;
    const block = this.maps.block;
    const lx = -0.6;
    const lz = -0.55;
    const ly = 0.58;
    const span = Math.max(1, hf.maxHeight - WATER_LEVEL);
    const rows = 64;
    for (let j0 = 0; j0 < MAP_PX; j0 += rows) {
      for (let j = j0; j < Math.min(MAP_PX, j0 + rows); j++) {
        for (let i = 0; i < MAP_PX; i++) {
          const k = j * MAP_PX + i;
          const h = H[j * R + i];
          const hR = H[j * R + Math.min(R - 1, i + 1)];
          const hD = H[Math.min(R - 1, j + 1) * R + i];
          const hL = H[j * R + Math.max(0, i - 1)];
          const hU = H[Math.max(0, j - 1) * R + i];
          let r: number;
          let gg: number;
          let b: number;
          if (h < WATER_LEVEL - 0.2) {
            // água: rasa → funda
            const depth = Math.min(1, (WATER_LEVEL - h) / 10);
            r = mix(120, 46, depth);
            gg = mix(186, 104, depth);
            b = mix(206, 150, depth);
            // margem clara
            if (depth < 0.12) {
              r = mix(r, 220, 0.5);
              gg = mix(gg, 236, 0.5);
              b = mix(b, 236, 0.5);
            }
          } else {
            const c4 = k * 4;
            // cor do bioma → pergaminho
            r = mix(color[c4], PARCH[0], 0.38);
            gg = mix(color[c4 + 1], PARCH[1], 0.38);
            b = mix(color[c4 + 2], PARCH[2], 0.38);
            // altitude: clareia e acinzenta no alto
            const alt = Math.max(0, Math.min(1, (h - WATER_LEVEL) / span));
            const hi = Math.max(0, alt - 0.55) / 0.45;
            r = mix(r, 236, hi * 0.6);
            gg = mix(gg, 234, hi * 0.6);
            b = mix(b, 228, hi * 0.6);
            // corrupção
            const cor = data[c4 + 1] / 255;
            if (cor > 0.02) {
              r = mix(r, 92, cor * 0.55);
              gg = mix(gg, 60, cor * 0.55);
              b = mix(b, 112, cor * 0.55);
            }
            // estradas e construções
            const road = data[c4] / 255;
            if (road > 0.35) {
              const t = Math.min(1, (road - 0.35) / 0.4) * 0.75;
              r = mix(r, 196, t);
              gg = mix(gg, 166, t);
              b = mix(b, 116, t);
            }
            if (block[k]) {
              r = mix(r, 126, 0.55);
              gg = mix(gg, 108, 0.55);
              b = mix(b, 92, 0.55);
            }
            // relevo sombreado
            const nx = (hL - hR) / (2 * 2);
            const nz = (hU - hD) / (2 * 2);
            const len = Math.hypot(nx, 1, nz);
            const dot = (nx * lx + ly + nz * lz) / len;
            const shade = Math.max(0.45, Math.min(1.25, 0.42 + dot * 0.95));
            r *= shade;
            gg *= shade;
            b *= shade;
            // curvas de nível
            const c10 = Math.floor(h / 10);
            if (c10 !== Math.floor(hR / 10) || c10 !== Math.floor(hD / 10)) {
              const major = Math.floor(h / 50) !== Math.floor(hR / 50) || Math.floor(h / 50) !== Math.floor(hD / 50);
              const t = major ? 0.32 : 0.14;
              r = mix(r, 70, t);
              gg = mix(gg, 56, t);
              b = mix(b, 40, t);
            }
          }
          const o = k * 4;
          px[o] = r;
          px[o + 1] = gg;
          px[o + 2] = b;
          px[o + 3] = 255;
        }
      }
      await new Promise((res) => setTimeout(res, 0));
    }
    g.putImageData(img, 0, 0);
    // grade discreta a cada 256 m
    g.strokeStyle = 'rgba(60, 48, 30, 0.10)';
    g.lineWidth = 1;
    for (let m = 0; m <= MAP_PX; m += 128) {
      g.beginPath();
      g.moveTo(m + 0.5, 0);
      g.lineTo(m + 0.5, MAP_PX);
      g.moveTo(0, m + 0.5);
      g.lineTo(MAP_PX, m + 0.5);
      g.stroke();
    }
    this.ready = true;
    for (const w of this.waiters.splice(0)) w();
  }
}

/**
 * Névoa de exploração: canvas pequeno (1 pixel por célula de 16 m) com as áreas não
 * reveladas opacas. Desenhado ampliado com suavização, o que dá bordas macias.
 */
export const FOG_PX = 512;

export class FogRenderer {
  /** Névoa suavizada (FOG_PX²) cobrindo o mundo inteiro. */
  readonly canvas = document.createElement('canvas');
  private small = document.createElement('canvas');
  private version = -1;
  private img: ImageData;
  private pattern: CanvasPattern | null = null;

  constructor(private exploration: Exploration) {
    this.small.width = EXPLORE_RES;
    this.small.height = EXPLORE_RES;
    this.canvas.width = FOG_PX;
    this.canvas.height = FOG_PX;
    this.img = this.small.getContext('2d')!.createImageData(EXPLORE_RES, EXPLORE_RES);
  }

  /** Textura da área não explorada: grade fina e hachuras, como um mapa ainda em branco. */
  private makePattern(g: CanvasRenderingContext2D): CanvasPattern | null {
    const c = document.createElement('canvas');
    c.width = 32;
    c.height = 32;
    const p = c.getContext('2d')!;
    p.strokeStyle = 'rgba(140, 170, 220, 0.10)';
    p.lineWidth = 1;
    p.beginPath();
    p.moveTo(0, 0.5);
    p.lineTo(32, 0.5);
    p.moveTo(0.5, 0);
    p.lineTo(0.5, 32);
    p.stroke();
    p.strokeStyle = 'rgba(140, 170, 220, 0.05)';
    p.beginPath();
    for (let k = -32; k < 32; k += 8) {
      p.moveTo(k, 32);
      p.lineTo(k + 32, 0);
    }
    p.stroke();
    return g.createPattern(c, 'repeat');
  }

  /** Atualiza se a exploração mudou. Devolve true se redesenhou. */
  refresh(): boolean {
    if (this.version === this.exploration.version) return false;
    this.version = this.exploration.version;
    const cells = this.exploration.cells;
    const d = this.img.data;
    for (let k = 0; k < cells.length; k++) {
      const o = k * 4;
      d[o] = 22;
      d[o + 1] = 26;
      d[o + 2] = 44;
      d[o + 3] = cells[k] ? 0 : 236;
    }
    this.small.getContext('2d')!.putImageData(this.img, 0, 0);
    const g = this.canvas.getContext('2d')!;
    g.clearRect(0, 0, FOG_PX, FOG_PX);
    g.imageSmoothingEnabled = true;
    g.filter = 'blur(5px)';
    g.drawImage(this.small, 0, 0, FOG_PX, FOG_PX);
    g.filter = 'none';
    // textura só onde há névoa
    this.pattern ??= this.makePattern(g);
    if (this.pattern) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = this.pattern;
      g.fillRect(0, 0, FOG_PX, FOG_PX);
      g.globalCompositeOperation = 'source-over';
    }
    return true;
  }
}

/** Converte um SVG (string) em imagem desenhável no canvas. */
export function svgToImage(svgText: string, color = '#ffffff'): HTMLImageElement {
  const img = new Image();
  const text = svgText.replace(/currentColor/g, color);
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
  return img;
}
