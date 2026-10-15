import type { GameContext } from '../core/context';

/**
 * STUB — benchmarks automatizados (?bench=<cenário>). O módulo perf/ implementa
 * cenários representativos (vila cheia + chuva, voo sobre floresta, combate com
 * muitos inimigos e efeitos, luta contra chefe) e publica o resultado em
 * window.__benchResult para o script scripts/benchmark.mjs.
 */
export async function runBenchmark(ctx: GameContext, scenario: string): Promise<void> {
  await ctx.newGame();
  const start = performance.now();
  ctx.sys.perf.resetSamples();
  await new Promise((r) => setTimeout(r, 5000));
  (window as any).__benchResult = { scenario, durationMs: performance.now() - start, ...ctx.sys.perf.report() };
}
