/** PRNG determinístico (mulberry32). Use para geração procedural reprodutível. */
export class RNG {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  int(min: number, maxInclusive: number): number {
    return Math.floor(this.range(min, maxInclusive + 1));
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  /** Escolha ponderada. */
  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    let total = 0;
    for (const i of items) total += Math.max(0, weight(i));
    let r = this.next() * total;
    for (const i of items) {
      r -= Math.max(0, weight(i));
      if (r <= 0) return i;
    }
    return items[items.length - 1];
  }
}

/** Hash inteiro 2D estável -> [0,1). Útil para decidir coisas por célula sem guardar estado. */
export function hash2(x: number, y: number, seed = 0): number {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

/** Gera um RNG Math.random-like global para gameplay (não determinístico entre sessões). */
export const gameRandom = new RNG((Math.random() * 0xffffffff) >>> 0);
