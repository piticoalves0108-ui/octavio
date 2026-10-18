import type { Finish } from "@/data/colors";
import type { NailDesign } from "@/data/gallery";

/** Fundo CSS que simula cada acabamento sobre a cor do esmalte (amostras desenhadas, sem foto). */
export function finishBackground(finish: Finish, hex: string) {
  switch (finish) {
    case "perolado":
      return [
        "linear-gradient(160deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 38%)",
        "conic-gradient(from 210deg at 60% 40%, rgba(255,228,240,0) 0deg, rgba(255,228,240,0.55) 80deg, rgba(214,236,255,0.45) 170deg, rgba(255,246,220,0.35) 250deg, rgba(255,228,240,0) 360deg)",
        hex,
      ].join(", ");
    case "metalico":
      return [
        "linear-gradient(115deg, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.85) 22%, rgba(255,255,255,0) 40%, rgba(0,0,0,0.22) 58%, rgba(255,255,255,0.7) 76%, rgba(0,0,0,0.12) 100%)",
        hex,
      ].join(", ");
    case "glitter":
      return [
        "radial-gradient(circle at 30% 40%, rgba(255,255,255,0.95) 0 0.8px, transparent 1.4px) 0 0 / 11px 13px",
        "radial-gradient(circle at 70% 20%, rgba(255,236,242,0.8) 0 0.6px, transparent 1.1px) 3px 7px / 17px 11px",
        "radial-gradient(circle at 50% 80%, rgba(232,206,170,0.9) 0 0.9px, transparent 1.5px) 6px 2px / 23px 19px",
        "radial-gradient(circle at 20% 70%, rgba(255,255,255,0.7) 0 1.1px, transparent 1.8px) 9px 4px / 29px 31px",
        `linear-gradient(165deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 40%, rgba(255,255,255,0.18) 70%, rgba(0,0,0,0.05)), ${hex}`,
      ].join(", ");
    default:
      return `radial-gradient(120% 80% at 30% 15%, rgba(255,255,255,0.4), rgba(255,255,255,0) 55%), ${hex}`;
  }
}

/** Desenho do NailArt que melhor representa cada acabamento */
export function finishDesign(finish: Finish): { design: NailDesign; colors: (hex: string) => string[] } {
  switch (finish) {
    case "metalico":
      return { design: "chrome", colors: (hex) => [hex] };
    case "glitter":
      return { design: "glitter-tip", colors: (hex) => [hex, "#ffffff"] };
    case "perolado":
      return { design: "ombre", colors: (hex) => [hex, "#f6e7ef"] };
    default:
      return { design: "solid", colors: (hex) => [hex] };
  }
}
