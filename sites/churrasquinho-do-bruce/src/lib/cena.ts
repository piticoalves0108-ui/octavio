/**
 * Estado compartilhado entre o DOM (GSAP/ScrollTrigger) e a cena 3D (R3F).
 *
 * As timelines do GSAP escrevem números neste objeto; o useFrame da cena só
 * lê. Nada aqui importa three.js, então o bundle inicial não carrega o 3D.
 */
import type { PecaEspeto } from "@/content/cardapio";

export const PECAS: PecaEspeto[] = ["carne", "frango", "linguica", "queijo"];

export const CAMADAS = ["paoBase", "carne", "queijo", "tomate", "alface", "paoTopo"] as const;
export type Camada = (typeof CAMADAS)[number];

/** De onde cada camada do hambúrguer vem (unidades locais) e quando pousa na timeline. */
export const ENTRADAS: Record<Camada, { de: number; giro: number; em: number }> = {
  carne: { de: 0, giro: -1.4, em: 0.15 }, // nasce da fusão dos pedaços do espeto
  paoBase: { de: -2.6, giro: 0.9, em: 0.3 },
  queijo: { de: 2.8, giro: 1.6, em: 0.41 },
  tomate: { de: 3.0, giro: -1.2, em: 0.51 },
  alface: { de: 3.2, giro: 1.1, em: 0.6 },
  paoTopo: { de: 3.6, giro: -0.8, em: 0.69 },
};

/** Estado de cada camada do hambúrguer: deslocamento vertical, giro e escala. */
export type EstadoCamada = { y: number; giro: number; escala: number };

export const cena = {
  /** Dolly-in da câmera na entrada (0 → 1). */
  intro: 0,
  /** Saída do hero: o espeto sai da grelha e flutua (0 → 1). */
  saida: 0,
  /** Espeto de deitado para em pé antes de explodir (0 → 1). */
  vertical: 0,
  /** Vista explodida: cada pedaço viaja até o item do cardápio (0 → 1). */
  pecas: { carne: 0, frango: 0, linguica: 0, queijo: 0 } as Record<PecaEspeto, number>,
  /** Vareta de bambu saindo de cena (0 → 1). */
  vareta: 0,
  /** Pedaços se fundindo no hambúrguer (0 → 1). */
  fusao: 0,
  /** Camadas do hambúrguer, controladas pela timeline do GSAP. */
  camadas: Object.fromEntries(CAMADAS.map((c) => [c, { y: 4, giro: 0, escala: 0 }])) as Record<Camada, EstadoCamada>,
  /** Amassadinha final do pão de cima. */
  amassar: 0,
  /** Rodapé: as brasas se apagam (0 → 1). */
  apagar: 0,
  /** Abanar a brasa (clique/toque no hero). Decai sozinho na cena. */
  abanar: 0,
  /** Ponteiro em coordenadas normalizadas (-1..1), y para cima. */
  ponteiro: { x: 0, y: 0, ativo: false },
  /** Inclinação do aparelho (giroscópio opcional), -1..1. */
  inclinacao: { x: 0, y: 0, ativa: false },
  /** Quais seções com 3D estão na tela. Se nenhuma, o render pausa. */
  secoes: { hero: true, cardapio: false, espetinhos: false, hamburguer: false, rodape: false },
};

export type SecaoCena = keyof typeof cena.secoes;

/** Elementos do DOM que a cena usa como âncora (pedaços, hambúrguer, brasa do rodapé). */
export const ancoras = new Map<string, HTMLElement>();

export function registrarAncora(id: string, el: HTMLElement | null) {
  if (el) ancoras.set(id, el);
  else ancoras.delete(id);
}

/** Algo mudou fora do loop (ex.: scroll com a cena parada): pede um frame. */
type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();
export function pedirFrame() {
  ouvintes.forEach((f) => f());
}
export function aoPedirFrame(f: Ouvinte) {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
}
