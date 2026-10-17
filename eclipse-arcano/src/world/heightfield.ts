/**
 * Relevo e biomas determinísticos do mundo.
 * - `generateHeight(x,z)`: função analítica (cara) usada para preencher a grade.
 * - `Heightfield`: grade pré-calculada (2 m) com amostragem bilinear barata — use esta em runtime.
 */
import { Simplex2 } from '../core/noise';
import { clamp, smoothstep, lerp } from '../core/math';
import {
  BIOME_INFO,
  HEIGHTFIELD_RES,
  LOCATIONS,
  PLAYABLE_HALF,
  RIVERS,
  ROADS,
  WATER_LEVEL,
  WORLD_HALF,
  WORLD_SIZE,
  type BiomeId,
} from '../data/world';

const WORLD_SEED = 7331;
const nA = new Simplex2(WORLD_SEED);
const nB = new Simplex2(WORLD_SEED + 1);
const nC = new Simplex2(WORLD_SEED + 2);

/** Distância de um ponto a uma polilinha + parâmetro ao longo dela. */
function distToPolyline(x: number, z: number, pts: [number, number][]): number {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const abx = bx - ax;
    const abz = bz - az;
    const t = clamp(((x - ax) * abx + (z - az) * abz) / (abx * abx + abz * abz), 0, 1);
    const px = ax + abx * t - x;
    const pz = az + abz * t - z;
    const d = px * px + pz * pz;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

export function riverDistance(x: number, z: number): number {
  let best = Infinity;
  for (const r of RIVERS) best = Math.min(best, distToPolyline(x, z, r.points) - r.width * 0.5);
  return best;
}

export function roadDistance(x: number, z: number): number {
  let best = Infinity;
  for (const r of ROADS) best = Math.min(best, distToPolyline(x, z, r.points) - r.width * 0.5);
  return best;
}

const SWAMP = LOCATIONS.find((l) => l.id === 'pantano_sombrio')!;
const LAKE = LOCATIONS.find((l) => l.id === 'lago_espelhado')!;
const CANYON = LOCATIONS.find((l) => l.id === 'desfiladeiro_cinzas')!;
const FOREST = LOCATIONS.find((l) => l.id === 'floresta_lumen')!;
const RUINS = LOCATIONS.find((l) => l.id === 'ruinas_aeternum')!;
const FLATTEN = LOCATIONS.filter((l) => l.flattenTo !== undefined);

/** Altura "natural" de baixa frequência (sem detalhes), usada sob estradas. */
function baseLow(x: number, z: number): number {
  return 16 + nA.fbm(x / 700, z / 700, 3) * 20;
}

/** Altura analítica. Cara: chamar só para pré-cálculo. */
export function generateHeight(x: number, z: number): number {
  let h = baseLow(x, z) + nB.fbm(x / 160, z / 160, 4) * 6 + nC.noise(x / 40, z / 40) * 0.8;

  // Montanhas nas bordas (limite natural do mapa) e serra ao norte
  const edge = Math.max(Math.abs(x), Math.abs(z));
  const edgeF = smoothstep(PLAYABLE_HALF - 200, PLAYABLE_HALF + 40, edge);
  const northF = smoothstep(-640, -900, z) * 0.7;
  const mF = Math.max(edgeF, northF);
  if (mF > 0) h += mF * (60 + nA.ridged(x / 340, z / 340, 5) * 210 + nB.fbm(x / 120, z / 120, 3) * 12);

  // Desfiladeiro: paredes altas com corredor central
  const dc = Math.hypot(x - CANYON.x, z - CANYON.z);
  if (dc < CANYON.radius * 1.8) {
    const road = roadDistance(x, z);
    const wall = smoothstep(CANYON.radius * 1.8, CANYON.radius * 0.6, dc) * smoothstep(10, 40, road);
    h += wall * (28 + nB.ridged(x / 50, z / 50, 3) * 22);
  }

  // Pântano: rebaixa para perto da água, com montículos
  const ds = Math.hypot(x - SWAMP.x, z - SWAMP.z);
  if (ds < SWAMP.radius * 1.3) {
    const f = smoothstep(SWAMP.radius * 1.3, SWAMP.radius * 0.6, ds);
    const swampH = WATER_LEVEL + 0.4 + nC.fbm(x / 35, z / 35, 3) * 2.2;
    h = lerp(h, swampH, f);
  }

  // Lago
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z) + nC.noise(x / 60, z / 60) * 18;
  if (dl < LAKE.radius * 1.5) {
    const f = smoothstep(LAKE.radius * 1.5, LAKE.radius * 0.7, dl);
    const bed = WATER_LEVEL - 2 - 9 * smoothstep(LAKE.radius * 0.9, 0, dl);
    h = lerp(h, Math.min(h, bed), f);
  }

  // Estradas: suavizam o relevo (sem detalhes de alta frequência)
  const rd = roadDistance(x, z);
  if (rd < 14) {
    const f = smoothstep(14, 0, rd) * 0.75;
    h = lerp(h, Math.max(baseLow(x, z), WATER_LEVEL + 1.2), f);
  }

  // Aplainar assentamentos / arenas
  for (const l of FLATTEN) {
    const d = Math.hypot(x - l.x, z - l.z);
    const outer = l.flattenOuter ?? l.radius * 1.5;
    if (d < outer) {
      const f = smoothstep(outer, l.radius * 0.85, d);
      h = lerp(h, l.flattenTo! + nC.noise(x / 25, z / 25) * 0.3, f);
    }
  }

  // Rio: escava o leito (depois do aplainamento para cortar o vale de forma contínua)
  const rv = riverDistance(x, z);
  if (rv < 40) {
    const bank = smoothstep(40, 0, rv);
    const bed = WATER_LEVEL - 2.5 * smoothstep(2, -6, rv);
    h = lerp(h, Math.min(h, rv < 0 ? bed : lerp(WATER_LEVEL + 0.5, h, smoothstep(0, 40, rv))), bank);
  }

  return h;
}

/** Bioma analítico (cara). Use Heightfield.biomeAt em runtime. */
export function generateBiome(x: number, z: number, h: number): BiomeId {
  for (const l of LOCATIONS) {
    if (l.kind === 'settlement' && Math.hypot(x - l.x, z - l.z) < l.radius) return 'village';
  }
  if (h > 85) return 'mountain';
  const ds = Math.hypot(x - SWAMP.x, z - SWAMP.z) + nB.noise(x / 80, z / 80) * 40;
  if (ds < SWAMP.radius * 0.45) return 'corrupted';
  if (ds < SWAMP.radius) return 'swamp';
  const dr = Math.hypot(x - RUINS.x, z - RUINS.z);
  if (dr < RUINS.radius * 1.1) return dr < RUINS.radius * 0.5 && nA.noise(x / 30, z / 30) > 0.3 ? 'corrupted' : 'ruins';
  if (Math.hypot(x - CANYON.x, z - CANYON.z) < CANYON.radius * 1.4 && h > 30) return 'rocky';
  if (h < WATER_LEVEL + 1.6) return 'shore';
  const df = Math.hypot(x - FOREST.x, z - FOREST.z) + nA.noise(x / 120, z / 120) * 90;
  if (df < FOREST.radius) return 'forest';
  if (nB.noise(x / 300, z / 300) > 0.45) return 'forest';
  if (h > 60) return 'rocky';
  return 'meadow';
}

const BIOME_LIST = Object.keys(BIOME_INFO) as BiomeId[];
const BIOME_CELL = 8; // m

/**
 * Grade de altura pré-calculada. ~4 MB (Float32 1025²).
 */
export class Heightfield {
  readonly res = HEIGHTFIELD_RES;
  readonly spacing = WORLD_SIZE / (HEIGHTFIELD_RES - 1);
  readonly data: Float32Array;
  readonly biomeRes = WORLD_SIZE / BIOME_CELL;
  readonly biomes: Uint8Array;
  minHeight = Infinity;
  maxHeight = -Infinity;

  constructor() {
    this.data = new Float32Array(this.res * this.res);
    this.biomes = new Uint8Array(this.biomeRes * this.biomeRes);
  }

  /** Gera tudo de forma síncrona. Para tela de carregamento, use `generateAsync`. */
  generate(): this {
    for (let j = 0; j < this.res; j++) this.generateRow(j);
    this.generateBiomes();
    return this;
  }

  async generateAsync(onProgress?: (f: number) => void): Promise<this> {
    const rowsPerSlice = 64;
    for (let j = 0; j < this.res; j += rowsPerSlice) {
      for (let k = j; k < Math.min(this.res, j + rowsPerSlice); k++) this.generateRow(k);
      onProgress?.((j / this.res) * 0.9);
      await new Promise((r) => setTimeout(r, 0));
    }
    this.generateBiomes();
    onProgress?.(1);
    return this;
  }

  private generateRow(j: number) {
    const z = -WORLD_HALF + j * this.spacing;
    for (let i = 0; i < this.res; i++) {
      const x = -WORLD_HALF + i * this.spacing;
      const h = generateHeight(x, z);
      this.data[j * this.res + i] = h;
      if (h < this.minHeight) this.minHeight = h;
      if (h > this.maxHeight) this.maxHeight = h;
    }
  }

  private generateBiomes() {
    for (let j = 0; j < this.biomeRes; j++) {
      const z = -WORLD_HALF + (j + 0.5) * BIOME_CELL;
      for (let i = 0; i < this.biomeRes; i++) {
        const x = -WORLD_HALF + (i + 0.5) * BIOME_CELL;
        this.biomes[j * this.biomeRes + i] = BIOME_LIST.indexOf(generateBiome(x, z, this.heightAt(x, z)));
      }
    }
  }

  /** Altura do terreno (bilinear). Fora do mundo, retorna a borda. */
  heightAt(x: number, z: number): number {
    const fx = clamp((x + WORLD_HALF) / this.spacing, 0, this.res - 1.001);
    const fz = clamp((z + WORLD_HALF) / this.spacing, 0, this.res - 1.001);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const r = this.res;
    const d = this.data;
    const a = d[j * r + i];
    const b = d[j * r + i + 1];
    const c = d[(j + 1) * r + i];
    const e = d[(j + 1) * r + i + 1];
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz;
  }

  /**
   * Altura bilinear numa grade MAIS GROSSA (espaçamento múltiplo de 2 m, alinhada em
   * -WORLD_HALF), igual à que um nó de LOD distante do terreno desenha. Útil para
   * saber o quanto o relevo visível "afunda" longe da câmera (cristas agudas).
   */
  coarseHeightAt(x: number, z: number, spacing: number): number {
    const step = Math.max(1, Math.round(spacing / this.spacing));
    const cells = (this.res - 1) / step;
    const fx = clamp((x + WORLD_HALF) / (this.spacing * step), 0, cells - 1e-3);
    const fz = clamp((z + WORLD_HALF) / (this.spacing * step), 0, cells - 1e-3);
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const r = this.res;
    const d = this.data;
    const i0 = i * step;
    const j0 = j * step;
    const a = d[j0 * r + i0];
    const b = d[j0 * r + i0 + step];
    const c = d[(j0 + step) * r + i0];
    const e = d[(j0 + step) * r + i0 + step];
    return a + (b - a) * tx + (c - a) * tz + (a - b - c + e) * tx * tz;
  }

  /**
   * Quanto (m) o relevo real fica ACIMA do relevo dos nós de LOD grossos (4, 8 e 16 m)
   * em (x,z). Objetos apoiados no relevo real "flutuam" isso quando vistos de longe.
   */
  lodSag(x: number, z: number): number {
    const h = this.heightAt(x, z);
    return Math.max(0, h - this.coarseHeightAt(x, z, 4), h - this.coarseHeightAt(x, z, 8), h - this.coarseHeightAt(x, z, 16));
  }

  /** Normal do terreno (diferenças centrais). */
  normalAt(x: number, z: number, out: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 }) {
    const s = this.spacing;
    const hl = this.heightAt(x - s, z);
    const hr = this.heightAt(x + s, z);
    const hd = this.heightAt(x, z - s);
    const hu = this.heightAt(x, z + s);
    const nx = hl - hr;
    const nz = hd - hu;
    const ny = 2 * s;
    const len = Math.hypot(nx, ny, nz);
    out.x = nx / len;
    out.y = ny / len;
    out.z = nz / len;
    return out;
  }

  /** Inclinação em graus. */
  slopeAt(x: number, z: number): number {
    const n = this.normalAt(x, z);
    return (Math.acos(clamp(n.y, -1, 1)) * 180) / Math.PI;
  }

  biomeAt(x: number, z: number): BiomeId {
    const i = clamp(Math.floor((x + WORLD_HALF) / BIOME_CELL), 0, this.biomeRes - 1);
    const j = clamp(Math.floor((z + WORLD_HALF) / BIOME_CELL), 0, this.biomeRes - 1);
    return BIOME_LIST[this.biomes[j * this.biomeRes + i]];
  }

  isWater(x: number, z: number): boolean {
    return this.heightAt(x, z) < WATER_LEVEL - 0.2;
  }
}
