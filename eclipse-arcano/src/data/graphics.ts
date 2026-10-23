/**
 * Visual estilizado (inspirado em jogos de aventura em mundo aberto com arte pintada):
 * luz com terminador suave (meio "cel"), borda iluminada em personagens e folhagem,
 * luz atravessando folhas e grama, e gradação de cor (sombras frias, luzes quentes).
 * Usado por src/env/stylize.ts (trechos de shader globais) e pelo pós-processamento.
 */
export const STYLE = {
  /** Quanto do sombreamento vira "cel" macio (0 = Lambert puro, 1 = só degrau suave). */
  cel: 0.55,
  /** Faixa (N·L) onde a luz passa de sombra para iluminado. */
  celFrom: -0.04,
  celTo: 0.4,
  /** Intensidade padrão da borda iluminada (materiais com STYL_RIM). */
  rim: 0.6,
  /** Largura da borda (1 - N·V a partir do qual ela aparece). */
  rimFrom: 0.58,
  /** Luz atravessando folhas/grama vista contra o sol (materiais com STYL_TRANSLUCENT). */
  translucency: 0.45,
  /** Gradação: tinta das sombras e das luzes (multiplicadores RGB). */
  shadowTint: [0.93, 0.98, 1.07] as const,
  lightTint: [1.045, 1.01, 0.95] as const,
  /** Pretos levantados (aspecto pintado) e saturação extra. */
  lift: 0.018,
  saturation: 1.1,
  /** Sombreamento "cel" do relevo (mais suave que o padrão). */
  terrainCel: 0.38,
};
