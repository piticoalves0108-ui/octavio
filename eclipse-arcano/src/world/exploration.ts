import { WORLD_HALF, WORLD_SIZE } from '../data/world';

/**
 * Registro de exploração para o mapa: uma grade de células reveladas (névoa de guerra)
 * e os marcadores que o jogador coloca no mapa. Salvo junto com o mundo.
 */
export const EXPLORE_RES = 128;
export const EXPLORE_CELL = WORLD_SIZE / EXPLORE_RES; // 16 m

/** Raio revelado ao redor do jogador: no chão e no alto (voando, a vista alcança mais longe). */
export const EXPLORE_RULES = {
  groundRadius: 110,
  highRadius: 300,
  /** Altura acima do chão em que o raio chega ao máximo. */
  highAltitude: 140,
  /** Intervalo entre revelações (s). */
  interval: 0.25,
  maxPins: 60,
};

export type PinIcon = 'pin' | 'star' | 'skull' | 'chest' | 'herb' | 'eye';
export const PIN_ICONS: PinIcon[] = ['pin', 'star', 'skull', 'chest', 'herb', 'eye'];
export const PIN_COLORS = ['#ff5a5a', '#ffb347', '#ffe66a', '#6aff9a', '#5ad8ff', '#c08aff'];

export interface MapPin {
  id: number;
  x: number;
  z: number;
  icon: PinIcon;
  color: string;
}

export class Exploration {
  readonly cells = new Uint8Array(EXPLORE_RES * EXPLORE_RES);
  pins: MapPin[] = [];
  /** Muda sempre que algo é revelado (a UI redesenha a névoa quando o número muda). */
  version = 0;
  private nextPinId = 1;
  private timer = 0;

  /** Revela um círculo (coordenadas do mundo, metros). Devolve quantas células novas abriu. */
  reveal(x: number, z: number, radius: number): number {
    const cx = (x + WORLD_HALF) / EXPLORE_CELL;
    const cz = (z + WORLD_HALF) / EXPLORE_CELL;
    const r = radius / EXPLORE_CELL;
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(EXPLORE_RES - 1, Math.ceil(cx + r));
    const z0 = Math.max(0, Math.floor(cz - r));
    const z1 = Math.min(EXPLORE_RES - 1, Math.ceil(cz + r));
    const r2 = r * r;
    let opened = 0;
    for (let j = z0; j <= z1; j++) {
      const dz = j + 0.5 - cz;
      for (let i = x0; i <= x1; i++) {
        const dx = i + 0.5 - cx;
        if (dx * dx + dz * dz > r2) continue;
        const k = j * EXPLORE_RES + i;
        if (!this.cells[k]) {
          this.cells[k] = 1;
          opened++;
        }
      }
    }
    if (opened) this.version++;
    return opened;
  }

  isRevealed(x: number, z: number): boolean {
    const i = Math.floor((x + WORLD_HALF) / EXPLORE_CELL);
    const j = Math.floor((z + WORLD_HALF) / EXPLORE_CELL);
    if (i < 0 || j < 0 || i >= EXPLORE_RES || j >= EXPLORE_RES) return false;
    return this.cells[j * EXPLORE_RES + i] === 1;
  }

  /** Fração do mapa explorada (0..1). */
  fraction(): number {
    let n = 0;
    for (let k = 0; k < this.cells.length; k++) n += this.cells[k];
    return n / this.cells.length;
  }

  /** Chamado todo quadro pelo mundo com a posição do jogador e a altura acima do chão. */
  update(dt: number, x: number, z: number, heightAboveGround: number) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = EXPLORE_RULES.interval;
    const k = Math.min(1, Math.max(0, heightAboveGround / EXPLORE_RULES.highAltitude));
    this.reveal(x, z, EXPLORE_RULES.groundRadius + (EXPLORE_RULES.highRadius - EXPLORE_RULES.groundRadius) * k);
  }

  addPin(x: number, z: number, icon: PinIcon = 'pin', color = PIN_COLORS[0]): MapPin | null {
    if (this.pins.length >= EXPLORE_RULES.maxPins) return null;
    const pin: MapPin = { id: this.nextPinId++, x, z, icon, color };
    this.pins.push(pin);
    this.version++;
    return pin;
  }

  removePin(id: number) {
    const i = this.pins.findIndex((p) => p.id === id);
    if (i >= 0) {
      this.pins.splice(i, 1);
      this.version++;
    }
  }

  reset() {
    this.cells.fill(0);
    this.pins = [];
    this.nextPinId = 1;
    this.timer = 0;
    this.version++;
  }

  serialize() {
    // 1 bit por célula, em base64 (2 KB → ~2,7 KB de texto)
    const bytes = new Uint8Array(this.cells.length >> 3);
    for (let k = 0; k < this.cells.length; k++) if (this.cells[k]) bytes[k >> 3] |= 1 << (k & 7);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return { cells: btoa(bin), pins: this.pins.map((p) => ({ ...p })) };
  }

  deserialize(data: unknown) {
    this.reset();
    const d = data as { cells?: unknown; pins?: unknown } | null | undefined;
    if (typeof d?.cells === 'string') {
      try {
        const bin = atob(d.cells);
        for (let k = 0; k < this.cells.length && k >> 3 < bin.length; k++) this.cells[k] = (bin.charCodeAt(k >> 3) >> (k & 7)) & 1;
      } catch {
        /* texto inválido: mantém tudo coberto */
      }
    }
    if (Array.isArray(d?.pins)) {
      for (const p of d.pins as Partial<MapPin>[]) {
        if (typeof p?.x !== 'number' || typeof p?.z !== 'number' || !Number.isFinite(p.x) || !Number.isFinite(p.z)) continue;
        const icon = PIN_ICONS.includes(p.icon as PinIcon) ? (p.icon as PinIcon) : 'pin';
        const color = typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : PIN_COLORS[0];
        this.addPin(p.x, p.z, icon, color);
      }
    }
    this.version++;
  }
}
