import type { Finish } from "@/data/colors";
import type { NailDesign } from "@/data/gallery";
import { hash01, r2 } from "@/lib/random";

/** Ladrilho SVG de glitter: partículas em posições pseudoaleatórias estáveis (mesmo resultado no servidor e no navegador) */
const glitterTile = (() => {
  const tones = ["#ffffff", "#fff4f7", "#f1d9b8", "#ffffff", "#ffe3ea"];
  const dots = Array.from({ length: 70 }, (_, i) => {
    const x = r2(hash01(i * 3 + 1) * 90);
    const y = r2(hash01(i * 3 + 2) * 90);
    const r = r2(0.35 + hash01(i * 3 + 3) * 0.95);
    const o = r2(0.45 + hash01(i * 7 + 5) * 0.55);
    return `<circle cx='${x}' cy='${y}' r='${r}' fill='${tones[i % tones.length]}' fill-opacity='${o}'/>`;
  }).join("");
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='90' height='90'>${dots}</svg>`)}`;
})();

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
      return [`url("${glitterTile}") 0 0 / 90px 90px`, `linear-gradient(165deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 40%, rgba(255,255,255,0.18) 70%, rgba(0,0,0,0.05)), ${hex}`].join(", ");
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
