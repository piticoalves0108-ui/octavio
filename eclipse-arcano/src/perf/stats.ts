/**
 * Estatística de tempos de quadro (funções puras, sem alocação nos caminhos quentes).
 * Usadas pelo PerfMonitor (overlay F3) e pelos benchmarks (?bench=...).
 */

/** Buffer circular de amostras (Float32Array pré-alocado). */
export class SampleRing {
  readonly data: Float32Array;
  /** Quantidade de amostras válidas (≤ capacidade). */
  count = 0;
  /** Próxima posição de escrita. */
  private head = 0;

  constructor(readonly capacity: number) {
    this.data = new Float32Array(capacity);
  }

  push(v: number) {
    this.data[this.head] = v;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
  }

  clear() {
    this.count = 0;
    this.head = 0;
  }

  /** Copia as amostras válidas para `out` (sem ordem garantida). Retorna a quantidade. */
  copyTo(out: Float32Array): number {
    const n = Math.min(this.count, out.length);
    // as amostras válidas são as `count` mais recentes; para estatística a ordem não importa
    for (let i = 0; i < n; i++) out[i] = this.data[i];
    return n;
  }

  mean(): number {
    if (!this.count) return 0;
    let s = 0;
    for (let i = 0; i < this.count; i++) s += this.data[i];
    return s / this.count;
  }
}

/**
 * Percentil (0..100) de `sorted[0..n)` já ordenado em ordem crescente,
 * por interpolação linear entre as posições vizinhas.
 */
export function percentileSorted(sorted: ArrayLike<number>, n: number, p: number): number {
  if (n <= 0) return 0;
  if (n === 1) return sorted[0];
  const pos = (Math.min(100, Math.max(0, p)) / 100) * (n - 1);
  const i = Math.floor(pos);
  const f = pos - i;
  const a = sorted[i];
  const b = sorted[Math.min(n - 1, i + 1)];
  return a + (b - a) * f;
}

/**
 * Média dos piores `frac` quadros (ex.: 0,01 = "1% low"), em ms, sobre `sorted[0..n)` crescente.
 * Converta para FPS com 1000 / valor.
 */
export function worstMeanSorted(sorted: ArrayLike<number>, n: number, frac: number): number {
  if (n <= 0) return 0;
  const k = Math.max(1, Math.floor(n * frac));
  let s = 0;
  for (let i = n - k; i < n; i++) s += sorted[i];
  return s / k;
}

export interface FrameSummary {
  n: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  /** Média dos 1% piores (ms). */
  worst1: number;
  /** Média dos 0,1% piores (ms). */
  worst01: number;
}

/**
 * Resume `src[0..n)` usando `scratch` (mesma capacidade) como área de ordenação.
 * Não aloca além do objeto de resultado (chamado fora do caminho quente).
 */
export function summarize(src: ArrayLike<number>, n: number, scratch: Float32Array): FrameSummary {
  const m = Math.min(n, scratch.length);
  let sum = 0;
  for (let i = 0; i < m; i++) {
    const v = src[i];
    scratch[i] = v;
    sum += v;
  }
  const view = m === scratch.length ? scratch : scratch.subarray(0, m);
  view.sort();
  return {
    n: m,
    mean: m ? sum / m : 0,
    p50: percentileSorted(view, m, 50),
    p95: percentileSorted(view, m, 95),
    p99: percentileSorted(view, m, 99),
    min: m ? view[0] : 0,
    max: m ? view[m - 1] : 0,
    worst1: worstMeanSorted(view, m, 0.01),
    worst01: worstMeanSorted(view, m, 0.001),
  };
}

/** Arredonda para `d` casas (relatórios). */
export function round(v: number, d = 2): number {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

/** Gerador pseudoaleatório determinístico (mulberry32) — semente fixa nos benchmarks. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Controlador do ajuste dinâmico de resolução (renderScale adaptativo).
 * Puro: recebe o tempo médio de quadro da janela e devolve o novo fator (0..1].
 * Histerese: só reduz acima de `target × (1 + margem)` e só aumenta abaixo de `target × (1 − margem)`.
 */
export function nextDynamicScale(current: number, avgFrameMs: number, targetFps: number, minScale = 0.5, step = 0.1, margin = 0.12): number {
  if (!(avgFrameMs > 0) || !(targetFps > 0)) return current;
  const target = 1000 / targetFps;
  let s = current;
  if (avgFrameMs > target * (1 + margin)) {
    // reduz proporcionalmente ao excesso (pixels ~ escala²), limitado a um passo
    const ideal = current * Math.sqrt(target / avgFrameMs);
    s = Math.max(current - step, ideal);
  } else if (avgFrameMs < target * (1 - margin)) {
    s = current + step * 0.5;
  }
  s = Math.min(1, Math.max(minScale, s));
  return Math.round(s * 100) / 100;
}
