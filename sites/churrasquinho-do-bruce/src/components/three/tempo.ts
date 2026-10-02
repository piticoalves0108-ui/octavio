/**
 * Relógio da cena. Tudo que anima é função periódica de `tempo` com período
 * PERIODO (o espeto dá uma volta, as faíscas e a fumaça fecham o ciclo), então
 * a gravação do vídeo de fallback faz loop perfeito.
 * No modo captura, `fixo` congela o tempo num valor exato.
 */
export const PERIODO = 8;

export const relogio = { fixo: null as number | null, atual: 0 };

export function tempoDaCena(elapsed: number) {
  relogio.atual = relogio.fixo ?? elapsed;
  return relogio.atual;
}

/** Gerador pseudoaleatório com semente (mulberry32): a cena é sempre igual. */
export function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const suavizar = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export const limitar = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x));
