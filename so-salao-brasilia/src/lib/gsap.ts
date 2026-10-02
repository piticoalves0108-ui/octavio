/**
 * Carrega GSAP + ScrollTrigger sob demanda (fora do JS inicial da página).
 * Todas as seções usam este carregador, então o arquivo é baixado uma vez só.
 */
let promessa: Promise<{
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
}> | null = null;

export function carregarGsap() {
  if (!promessa) {
    promessa = Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, st]) => {
      g.gsap.registerPlugin(st.ScrollTrigger);
      return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger };
    });
  }
  return promessa;
}

let promessaSplit: Promise<typeof import("gsap/SplitText").SplitText> | null = null;

export function carregarSplitText() {
  if (!promessaSplit) {
    promessaSplit = Promise.all([carregarGsap(), import("gsap/SplitText")]).then(([{ gsap }, s]) => {
      gsap.registerPlugin(s.SplitText);
      return s.SplitText;
    });
  }
  return promessaSplit;
}
