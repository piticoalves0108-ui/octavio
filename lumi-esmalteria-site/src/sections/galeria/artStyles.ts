/**
 * Fundos e proporções da galeria. Cada peça recebe um fundo e um formato fixos
 * (pela posição na lista completa), então o mosaico não "pula" ao filtrar.
 */

/** Fundos suaves em areia, nude rosé e off-white para as peças desenhadas */
export const artBackgrounds = [
  "radial-gradient(120% 90% at 25% 10%, rgba(255,255,255,.85), transparent 55%), linear-gradient(160deg, #F5EDE6 0%, #E8D5CE 100%)",
  "radial-gradient(110% 80% at 80% 15%, rgba(255,255,255,.7), transparent 55%), linear-gradient(200deg, #FAF7F2 0%, #F1E2DA 100%)",
  "radial-gradient(120% 90% at 50% 0%, rgba(255,255,255,.6), transparent 60%), linear-gradient(170deg, #E8D5CE 0%, #D9BDB3 100%)",
  "radial-gradient(100% 80% at 20% 90%, rgba(232,213,206,.9), transparent 60%), linear-gradient(140deg, #FAF7F2 0%, #F5EDE6 100%)",
  "radial-gradient(110% 90% at 85% 85%, rgba(200,162,122,.22), transparent 60%), linear-gradient(180deg, #F5EDE6 0%, #EFE1D8 100%)",
] as const;

/** Proporções variadas para o mosaico editorial */
export const aspects = ["aspect-[4/5]", "aspect-square", "aspect-[3/4]", "aspect-[5/4]", "aspect-[4/5]", "aspect-[2/3]", "aspect-square", "aspect-[3/4]"] as const;
