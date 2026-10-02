"use client";

/**
 * PALCO: estado compartilhado entre o DOM (scroll, seletor, botões) e a cena 3D.
 *
 * É um objeto mutável de propósito: a cena lê os valores a cada quadro sem
 * re-renderizar o React. Quem muda algo chama `avisar()`, que acorda o Canvas
 * (frameloop "demand") e os componentes inscritos.
 *
 * Este arquivo não importa three, então pode ficar no bundle inicial.
 */

export type ModoCena = "poster" | "carregando" | "canvas" | "video" | "estatico";

export const palco = {
  /** 0..1: o pneu sai do hero e rola até a seção da medida. */
  heroP: 0,
  /** 0..1: progresso da seção sticky "Leia a medida". */
  medidaP: 0,
  /** 0..1: o bloco do seletor entrando na tela. */
  seletorP: 0,
  /** 0..1: a seção da vista explodida entrando na tela. */
  anatomiaEntradaP: 0,
  /** 0..1: progresso da seção sticky da vista explodida. */
  anatomiaP: 0,
  /** Algum ato do pneu principal está na tela. */
  principalVisivel: true,
  /** A seção de alinhamento está na tela. */
  alinhamentoVisivel: false,
  /** 0 = antes, 1 = depois do alinhamento. */
  alinhado: 0,
  /** Ponteiro normalizado -1..1 (mouse ou giroscópio). */
  ponteiro: { x: 0, y: 0 },
  /** Giro extra por arrasto no toque (radianos). */
  arrasto: 0,
  /** Medida escolhida no seletor, desenhada no flanco do pneu 3D. */
  medidaEscolhida: "175/70 R14",
  /** O preloader terminou: o pneu pode entrar rolando. */
  introLiberada: false,
  modo: "poster" as ModoCena,
  /**
   * Modo captura (?captura na URL): sem amortecimento e com relógio controlado
   * de fora. Usado só pelo script que grava o pôster e o vídeo da cena.
   */
  captura: false,
  relogioCaptura: null as number | null,
  layout: "desktop" as "desktop" | "mobile",
};

type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();

export function assinar(fn: Ouvinte) {
  ouvintes.add(fn);
  return () => {
    ouvintes.delete(fn);
  };
}

export function avisar() {
  ouvintes.forEach((fn) => fn());
}

/** Índice do item ativo numa sequência sticky (ex.: 5 partes da medida). */
export function indiceAtivo(p: number, total: number, inicio = 0, fim = 1) {
  if (p <= inicio) return 0;
  const t = Math.min(0.9999, (p - inicio) / (fim - inicio));
  return Math.floor(t * total);
}

/** Faixas de progresso usadas pelo DOM e pela cena (precisam bater). */
export const FAIXAS = {
  /** Na vista explodida, as camadas se separam até aqui; depois vêm os destaques. */
  explosao: 0.18,
};
