/**
 * Grade local do chão em volta do jogador (GROUND_GRID.res² células): grama cortada,
 * queimada e em chamas. O fogo se espalha de célula em célula conforme a densidade da
 * grama, o vento, a umidade e a chuva. A grama e o terreno leem a textura `texture`
 * (R = cortada, G = queimada, B = chamas) para encolher, escurecer e brilhar.
 *
 * Lógica pura (sem cena): testável. Sem alocação por quadro.
 */
import * as THREE from 'three';
import { FIRE, GROUND_GRID } from '../data/interactive';

export interface GroundEnv {
  /** Densidade da grama 0..1 em (x, z). */
  grassAt(x: number, z: number): number;
  /** Umidade 0..1 e chuva caindo 0..1. */
  wetness: number;
  rain: number;
  /** Direção do vento (normalizada) e força (0..2). */
  windX: number;
  windZ: number;
  windStrength: number;
}

const N8X = [1, -1, 0, 0, 1, 1, -1, -1];
const N8Z = [0, 0, 1, -1, 1, -1, 1, -1];
const N8W = [1, 1, 1, 1, 0.7, 0.7, 0.7, 0.7];

export class GroundGrid {
  readonly res = GROUND_GRID.res;
  readonly cell = GROUND_GRID.cell;
  /** Canto (x0, z0) da grade no mundo (múltiplo de `cell`). */
  x0 = 0;
  z0 = 0;
  /** Grama (0..1) amostrada do mapa. */
  readonly grass: Float32Array;
  /** Tempo restante (s) até a grama cortada voltar (0 = intacta). */
  readonly cut: Float32Array;
  /** Tempo restante (s) até a grama queimada voltar. */
  readonly burnt: Float32Array;
  /** Tempo restante (s) de queima (0 = apagada). */
  readonly fire: Float32Array;
  /** Duração total da queima (para a intensidade). */
  private fireMax: Float32Array;
  /** Índices das células queimando (lista compacta). */
  private burning: Int32Array;
  burningCount = 0;
  /** Células cortadas/queimadas ainda contando para voltar. */
  private regrowList: Int32Array;
  private regrowCount = 0;
  private inRegrow: Uint8Array;
  /** Centro de massa do fogo e raio aproximado (atualizados no passo). */
  readonly fireCenter = new THREE.Vector3();
  fireRadius = 0;
  /** Textura RGBA8 (lida pelos shaders da grama e do terreno). */
  readonly texture: THREE.DataTexture;
  private pixels: Uint8Array;
  private texDirty = true;
  private uploadT = 0;
  /** Retângulo da textura no mundo: (x0, z0, tamanho, 1 = ligada). */
  readonly rect = new THREE.Vector4(0, 0, 0, 0);
  /** Novas células acesas desde a última leitura (para efeitos: arbustos, objetos, sons). */
  readonly ignited: Int32Array;
  ignitedCount = 0;
  private tickAcc = 0;
  private placed = false;

  constructor(
    private env: GroundEnv,
    private rnd: () => number = Math.random,
  ) {
    const n = this.res * this.res;
    this.grass = new Float32Array(n);
    this.cut = new Float32Array(n);
    this.burnt = new Float32Array(n);
    this.fire = new Float32Array(n);
    this.fireMax = new Float32Array(n);
    this.burning = new Int32Array(FIRE.maxBurning);
    this.regrowList = new Int32Array(n);
    this.inRegrow = new Uint8Array(n);
    this.ignited = new Int32Array(256);
    this.pixels = new Uint8Array(n * 4);
    this.texture = new THREE.DataTexture(this.pixels, this.res, this.res, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.wrapS = this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  get size() {
    return this.res * this.cell;
  }

  /** Índice da célula de (x, z), ou -1 fora da grade. */
  index(x: number, z: number): number {
    const i = Math.floor((x - this.x0) / this.cell);
    const j = Math.floor((z - this.z0) / this.cell);
    if (i < 0 || j < 0 || i >= this.res || j >= this.res) return -1;
    return j * this.res + i;
  }

  cellX(k: number) {
    return this.x0 + ((k % this.res) + 0.5) * this.cell;
  }

  cellZ(k: number) {
    return this.z0 + (Math.floor(k / this.res) + 0.5) * this.cell;
  }

  isBurning(x: number, z: number): boolean {
    const k = this.index(x, z);
    return k >= 0 && this.fire[k] > 0;
  }

  /** Queimando perto de (x, z) num raio (m)? Devolve a intensidade 0..1. */
  heatAt(x: number, z: number, r: number): number {
    if (!this.burningCount) return 0;
    const c = this.cell;
    const n = Math.ceil(r / c);
    const ci = Math.floor((x - this.x0) / c);
    const cj = Math.floor((z - this.z0) / c);
    let h = 0;
    for (let dj = -n; dj <= n; dj++) {
      const j = cj + dj;
      if (j < 0 || j >= this.res) continue;
      for (let di = -n; di <= n; di++) {
        const i = ci + di;
        if (i < 0 || i >= this.res) continue;
        const k = j * this.res + i;
        if (this.fire[k] > 0) h += 1;
      }
    }
    return Math.min(1, h / Math.max(1, (2 * n + 1) * (2 * n + 1) * 0.35));
  }

  /** Centraliza a grade em (x, z) preservando o que já estava dentro (desloca por células inteiras). */
  recenter(x: number, z: number, force = false) {
    const half = this.size * 0.5;
    const cx = this.x0 + half;
    const cz = this.z0 + half;
    if (!force && this.placed && Math.abs(x - cx) < GROUND_GRID.recenter && Math.abs(z - cz) < GROUND_GRID.recenter) return false;
    const nx0 = Math.floor((x - half) / this.cell) * this.cell;
    const nz0 = Math.floor((z - half) / this.cell) * this.cell;
    const di = Math.round((nx0 - this.x0) / this.cell);
    const dj = Math.round((nz0 - this.z0) / this.cell);
    const res = this.res;
    if (!this.placed || Math.abs(di) >= res || Math.abs(dj) >= res) {
      this.cut.fill(0);
      this.burnt.fill(0);
      this.fire.fill(0);
      this.fireMax.fill(0);
      this.inRegrow.fill(0);
      this.burningCount = 0;
      this.regrowCount = 0;
      this.x0 = nx0;
      this.z0 = nz0;
      for (let k = 0; k < res * res; k++) this.grass[k] = this.env.grassAt(this.cellX(k), this.cellZ(k));
    } else {
      // desloca os arrays (direção escolhida para não sobrescrever o que ainda vai ser lido)
      const shift = (a: Float32Array | Uint8Array) => {
        const jStart = dj >= 0 ? 0 : res - 1;
        const jEnd = dj >= 0 ? res : -1;
        const jStep = dj >= 0 ? 1 : -1;
        const iStart = di >= 0 ? 0 : res - 1;
        const iEnd = di >= 0 ? res : -1;
        const iStep = di >= 0 ? 1 : -1;
        for (let j = jStart; j !== jEnd; j += jStep) {
          const sj = j + dj;
          for (let i = iStart; i !== iEnd; i += iStep) {
            const si = i + di;
            a[j * res + i] = si >= 0 && sj >= 0 && si < res && sj < res ? a[sj * res + si] : 0;
          }
        }
      };
      shift(this.cut);
      shift(this.burnt);
      shift(this.fire);
      shift(this.fireMax);
      shift(this.grass);
      this.x0 = nx0;
      this.z0 = nz0;
      // grama nova nas bordas que entraram
      for (let j = 0; j < res; j++) {
        for (let i = 0; i < res; i++) {
          const si = i + di;
          const sj = j + dj;
          if (si >= 0 && sj >= 0 && si < res && sj < res) continue;
          const k = j * res + i;
          this.grass[k] = this.env.grassAt(this.cellX(k), this.cellZ(k));
        }
      }
      this.rebuildLists();
    }
    this.placed = true;
    this.rect.set(this.x0, this.z0, this.size, 1);
    this.texDirty = true;
    return true;
  }

  private rebuildLists() {
    this.burningCount = 0;
    this.regrowCount = 0;
    this.inRegrow.fill(0);
    const n = this.res * this.res;
    for (let k = 0; k < n; k++) {
      if (this.fire[k] > 0 && this.burningCount < this.burning.length) this.burning[this.burningCount++] = k;
      else this.fire[k] = 0;
      if (this.cut[k] > 0 || this.burnt[k] > 0) this.addRegrow(k);
    }
  }

  private addRegrow(k: number) {
    if (this.inRegrow[k]) return;
    this.inRegrow[k] = 1;
    this.regrowList[this.regrowCount++] = k;
  }

  /** O fogo pega aqui agora? */
  canIgnite(): boolean {
    return this.env.wetness < FIRE.wetBlock && this.env.rain < 0.3;
  }

  /** Acende o fogo num raio (m). Devolve quantas células pegaram. */
  ignite(x: number, z: number, r: number, force = false): number {
    if (!this.placed || (!force && !this.canIgnite())) return 0;
    let count = 0;
    const c = this.cell;
    const n = Math.max(0, Math.ceil(r / c));
    const ci = Math.floor((x - this.x0) / c);
    const cj = Math.floor((z - this.z0) / c);
    for (let dj = -n; dj <= n; dj++) {
      for (let di = -n; di <= n; di++) {
        if ((di * di + dj * dj) * c * c > r * r + c * c * 0.5) continue;
        const i = ci + di;
        const j = cj + dj;
        if (i < 0 || j < 0 || i >= this.res || j >= this.res) continue;
        if (this.igniteCell(j * this.res + i)) count++;
      }
    }
    return count;
  }

  private igniteCell(k: number): boolean {
    if (this.fire[k] > 0 || this.burnt[k] > 0) return false;
    const fuel = this.grass[k] * (this.cut[k] > 0 ? 0.35 : 1);
    if (fuel < FIRE.minGrass) return false;
    if (this.burningCount >= this.burning.length) return false;
    const [a, b] = FIRE.burnTime;
    const t = (a + this.rnd() * (b - a)) * (0.6 + 0.4 * fuel);
    this.fire[k] = t;
    this.fireMax[k] = t;
    this.burning[this.burningCount++] = k;
    if (this.ignitedCount < this.ignited.length) this.ignited[this.ignitedCount++] = k;
    this.texDirty = true;
    return true;
  }

  /** Corta a grama num setor (arco) ou círculo. Devolve as células com grama cortadas agora. */
  cutArc(ox: number, oz: number, fx: number, fz: number, range: number, arcDeg: number, out?: Int32Array): number {
    if (!this.placed) return 0;
    const c = this.cell;
    const n = Math.ceil(range / c);
    const ci = Math.floor((ox - this.x0) / c);
    const cj = Math.floor((oz - this.z0) / c);
    const cosHalf = Math.cos(((Math.min(360, arcDeg) * Math.PI) / 180) * 0.5);
    let count = 0;
    for (let dj = -n; dj <= n; dj++) {
      const j = cj + dj;
      if (j < 0 || j >= this.res) continue;
      for (let di = -n; di <= n; di++) {
        const i = ci + di;
        if (i < 0 || i >= this.res) continue;
        const k = j * this.res + i;
        const dx = this.cellX(k) - ox;
        const dz = this.cellZ(k) - oz;
        const d = Math.hypot(dx, dz);
        if (d > range) continue;
        if (arcDeg < 360 && d > 0.5 && (dx * fx + dz * fz) / d < cosHalf) continue;
        if (this.grass[k] < 0.15 || this.cut[k] > 0 || this.burnt[k] > 0 || this.fire[k] > 0) continue;
        this.cut[k] = 1;
        this.addRegrow(k);
        if (out && count < out.length) out[count] = k;
        count++;
      }
    }
    if (count) this.texDirty = true;
    return count;
  }

  /** Apaga o fogo num raio (água, gelo). */
  extinguish(x: number, z: number, r: number): number {
    let n = 0;
    for (let q = 0; q < this.burningCount; q++) {
      const k = this.burning[q];
      if (Math.hypot(this.cellX(k) - x, this.cellZ(k) - z) <= r && this.fire[k] > 0) {
        this.fire[k] = 0.0001;
        n++;
      }
    }
    return n;
  }

  /** Avança a simulação (passos fixos) e envia a textura quando mudou. */
  update(dt: number, cutRegrow: number, burntRegrow: number) {
    this.tickAcc += dt;
    const step = 1 / FIRE.tickHz;
    let ticks = 0;
    while (this.tickAcc >= step && ticks < 4) {
      this.tickAcc -= step;
      ticks++;
      this.tick(step, cutRegrow, burntRegrow);
    }
    if (ticks === 4) this.tickAcc = 0;
    this.uploadT -= dt;
    if (this.texDirty && this.uploadT <= 0) {
      this.uploadT = 1 / 12;
      this.writeTexture();
    }
  }

  private tick(dt: number, cutRegrow: number, burntRegrow: number) {
    const env = this.env;
    const res = this.res;
    // chuva e umidade freiam o fogo
    const quench = env.rain * FIRE.rainQuench;
    const dryK = Math.max(0, 1 - env.wetness / FIRE.wetBlock) * (1 - Math.min(1, env.rain * 2));
    const wl = Math.hypot(env.windX, env.windZ) || 1;
    const wx = env.windX / wl;
    const wz = env.windZ / wl;
    const wb = FIRE.windBias * Math.min(2, env.windStrength);
    let sx = 0;
    let sz = 0;
    let q = 0;
    const startCount = this.burningCount;
    for (let n = 0; n < startCount; n++) {
      const k = this.burning[n];
      const f = this.fire[k] - dt * (1 + quench);
      if (f <= 0) {
        this.fire[k] = 0;
        this.fireMax[k] = 0;
        this.burnt[k] = 1;
        this.cut[k] = 0;
        this.addRegrow(k);
        this.texDirty = true;
        continue;
      }
      this.fire[k] = f;
      this.burning[q++] = k;
      const i = k % res;
      const j = (k - i) / res;
      sx += i;
      sz += j;
      // espalha para as vizinhas
      if (dryK <= 0) continue;
      const base = FIRE.spreadRate * dt * dryK;
      for (let m = 0; m < 8; m++) {
        const ni = i + N8X[m];
        const nj = j + N8Z[m];
        if (ni < 0 || nj < 0 || ni >= res || nj >= res) continue;
        const nk = nj * res + ni;
        if (this.fire[nk] > 0 || this.burnt[nk] > 0) continue;
        const g = this.grass[nk] * (this.cut[nk] > 0 ? 0.35 : 1);
        if (g < FIRE.minGrass) continue;
        const dirDot = (N8X[m] * wx + N8Z[m] * wz) * N8W[m];
        const wind = Math.max(0.12, 1 + wb * dirDot);
        if (this.rnd() < base * g * wind * N8W[m]) this.igniteCell(nk);
      }
    }
    // células acesas neste passo foram acrescentadas no fim da lista: mantém
    for (let n = startCount; n < this.burningCount; n++) {
      const k = this.burning[n];
      this.burning[q++] = k;
      const i = k % res;
      sx += i;
      sz += (k - i) / res;
    }
    this.burningCount = q;
    if (q > 0) {
      this.fireCenter.set(this.x0 + (sx / q + 0.5) * this.cell, 0, this.z0 + (sz / q + 0.5) * this.cell);
      this.fireRadius = Math.sqrt(q) * this.cell * 0.7 + 1;
      this.texDirty = true;
    } else this.fireRadius = 0;
    // regeneração
    if (this.regrowCount) {
      let w = 0;
      const dc = dt / Math.max(1, cutRegrow);
      const db = dt / Math.max(1, burntRegrow);
      for (let n = 0; n < this.regrowCount; n++) {
        const k = this.regrowList[n];
        let alive = false;
        if (this.cut[k] > 0) {
          this.cut[k] = Math.max(0, this.cut[k] - dc);
          alive = alive || this.cut[k] > 0;
        }
        if (this.burnt[k] > 0) {
          this.burnt[k] = Math.max(0, this.burnt[k] - db);
          alive = alive || this.burnt[k] > 0;
        }
        if (alive) {
          this.regrowList[w++] = k;
          // na fase final a grama cresce de volta aos poucos: a textura precisa acompanhar
          if ((this.cut[k] > 0 && this.cut[k] < 0.16) || (this.burnt[k] > 0 && this.burnt[k] < 0.11)) this.texDirty = true;
        } else this.inRegrow[k] = 0;
      }
      if (w !== this.regrowCount) this.texDirty = true;
      this.regrowCount = w;
    }
  }

  /** Intensidade (0..1) da chama numa célula. */
  flameAt(k: number): number {
    const m = this.fireMax[k];
    if (m <= 0) return 0;
    const t = this.fire[k] / m; // 1 = acabou de pegar, 0 = apagando
    return Math.min(1, (1 - t) * 4) * Math.min(1, t * 3);
  }

  /** Lista de células queimando (somente leitura até `burningCount`). */
  burningCells(): Int32Array {
    return this.burning;
  }

  private writeTexture() {
    this.texDirty = false;
    const px = this.pixels;
    const n = this.res * this.res;
    for (let k = 0; k < n; k++) {
      const o = k * 4;
      // cortada: só encolhe enquanto falta mais de 15% para voltar (cresce de novo no fim)
      const c = this.cut[k];
      const b = this.burnt[k];
      px[o] = c > 0 ? Math.min(255, (c / 0.15) * 255) : 0;
      px[o + 1] = b > 0 ? Math.min(255, (b / 0.1) * 255) : 0;
      px[o + 2] = this.fire[k] > 0 ? 40 + this.flameAt(k) * 215 : 0;
      px[o + 3] = 255;
    }
    this.texture.needsUpdate = true;
  }

  /** Zera tudo (novo jogo). */
  reset() {
    this.placed = false;
    this.burningCount = 0;
    this.regrowCount = 0;
    this.ignitedCount = 0;
    this.cut.fill(0);
    this.burnt.fill(0);
    this.fire.fill(0);
    this.fireMax.fill(0);
    this.inRegrow.fill(0);
    this.rect.set(0, 0, 0, 0);
    this.texDirty = true;
  }

  /** Quantas células cortadas/queimadas ainda contam (testes). */
  get regrowing() {
    return this.regrowCount;
  }
}
