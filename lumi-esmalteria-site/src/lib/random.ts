/**
 * Pseudo-aleatório determinístico com hash inteiro: dá exatamente o mesmo resultado
 * no servidor e no navegador (Math.sin pode variar nos últimos bits e quebrar a hidratação).
 */
export function hash01(seed: number) {
  let t = Math.imul(seed | 0, 2654435761) >>> 0;
  t ^= t >>> 15;
  t = Math.imul(t, 2246822519) >>> 0;
  t ^= t >>> 13;
  t = Math.imul(t, 3266489917) >>> 0;
  t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}

/** Arredonda para atributos SVG estáveis */
export const r2 = (n: number) => Math.round(n * 100) / 100;
