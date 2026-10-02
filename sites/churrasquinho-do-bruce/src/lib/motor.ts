"use client";

/**
 * Motor de animação: GSAP + ScrollTrigger + SplitText + Lenis.
 *
 * Carregado com import() depois da hidratação, para não pesar no JS inicial.
 * O conteúdo já chega visível do servidor; o motor só acrescenta movimento.
 * Com prefers-reduced-motion: sem Lenis, sem scrub longo, só fades curtos.
 */
import type { gsap as GsapTipo } from "gsap";
import type { ScrollTrigger as ScrollTriggerTipo } from "gsap/ScrollTrigger";
import type { SplitText as SplitTextTipo } from "gsap/SplitText";
import type Lenis from "lenis";

export type Motor = {
  gsap: typeof GsapTipo;
  ScrollTrigger: typeof ScrollTriggerTipo;
  SplitText: typeof SplitTextTipo;
  lenis: Lenis | null;
  reduzido: boolean;
};

let promessa: Promise<Motor> | null = null;
let motorPronto: Motor | null = null;

export const movimentoReduzido = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function motorAtual() {
  return motorPronto;
}

export function carregarMotor(): Promise<Motor> {
  if (promessa) return promessa;
  promessa = (async () => {
    const [{ gsap }, { ScrollTrigger }, { SplitText }] = await Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("gsap/SplitText"),
    ]);
    gsap.registerPlugin(ScrollTrigger, SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const reduzido = movimentoReduzido();
    let lenis: Lenis | null = null;

    if (!reduzido) {
      const { default: LenisClasse } = await import("lenis");
      lenis = new LenisClasse({ autoRaf: false, lerp: 0.11, wheelMultiplier: 0.95 });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((tempo) => lenis!.raf(tempo * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    // Recalcula as posições quando as fontes terminam de carregar.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    motorPronto = { gsap, ScrollTrigger, SplitText, lenis, reduzido };
    return motorPronto;
  })();
  return promessa;
}

/**
 * Fila de montagem: cada seção monta suas animações numa tarefa curta
 * (≤ ~10 ms por fatia), em vez de tudo num bloco só. Mantém o TBT baixo.
 */
const fila: (() => void)[] = [];
let processando = false;
export function enfileirar(tarefa: () => void) {
  fila.push(tarefa);
  if (processando) return;
  processando = true;
  setTimeout(processarFila, 0);
}
function processarFila() {
  const inicio = performance.now();
  while (fila.length && performance.now() - inicio < 10) fila.shift()!();
  if (fila.length) setTimeout(processarFila, 0);
  else {
    processando = false;
    agendarRefresh();
  }
}

let refreshAgendado = 0;
/** Junta vários pedidos de refresh num só (cada seção pede o seu ao montar). */
export function agendarRefresh() {
  if (!motorPronto) return;
  cancelAnimationFrame(refreshAgendado);
  refreshAgendado = requestAnimationFrame(() => motorPronto?.ScrollTrigger.refresh());
}

/** Rola até um elemento/posição com Lenis, ou nativo se o movimento for reduzido. */
export function rolarPara(alvo: string | HTMLElement | number, imediato = false) {
  const lenis = motorPronto?.lenis;
  if (lenis) {
    lenis.scrollTo(alvo, { immediate: imediato, offset: typeof alvo === "number" ? 0 : -8, duration: 1.4 });
    return;
  }
  if (typeof alvo === "number") window.scrollTo({ top: alvo });
  else (typeof alvo === "string" ? document.querySelector(alvo) : alvo)?.scrollIntoView();
}
