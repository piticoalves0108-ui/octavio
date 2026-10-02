/**
 * Efeitos de ponteiro com Motion (molas). Este módulo só é baixado no primeiro hover,
 * para não pesar no JavaScript inicial.
 */
import { animate } from "motion";

const MOLA = { type: "spring", stiffness: 260, damping: 18, mass: 0.6 } as const;
const VOLTA = { type: "spring", stiffness: 200, damping: 16 } as const;

/** Botão magnético: o elemento `alvo` segue o cursor dentro da área `area`. */
export function ligarMagnetismo(area: HTMLElement, alvo: HTMLElement, forca: number) {
  const mover = (e: PointerEvent) => {
    const r = area.getBoundingClientRect();
    animate(
      alvo,
      { x: (e.clientX - (r.left + r.width / 2)) * forca, y: (e.clientY - (r.top + r.height / 2)) * forca * 1.2 },
      MOLA,
    );
  };
  const sair = () => animate(alvo, { x: 0, y: 0 }, VOLTA);
  area.addEventListener("pointermove", mover);
  area.addEventListener("pointerleave", sair);
  return () => {
    area.removeEventListener("pointermove", mover);
    area.removeEventListener("pointerleave", sair);
  };
}

/** Tilt de card: inclina o `alvo` conforme a posição do cursor na `area`. */
export function ligarInclinacao(area: HTMLElement, alvo: HTMLElement, graus = { x: 10, y: 12 }) {
  const mover = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = area.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    animate(alvo, { rotateX: (0.5 - py) * graus.x, rotateY: (px - 0.5) * graus.y, transformPerspective: 900 }, MOLA);
  };
  const sair = () => animate(alvo, { rotateX: 0, rotateY: 0 }, VOLTA);
  area.addEventListener("pointermove", mover);
  area.addEventListener("pointerleave", sair);
  return () => {
    area.removeEventListener("pointermove", mover);
    area.removeEventListener("pointerleave", sair);
  };
}
