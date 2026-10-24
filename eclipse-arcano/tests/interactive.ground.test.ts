import { describe, expect, it } from 'vitest';
import { GroundGrid, type GroundEnv } from '../src/interactive/groundGrid';
import { FIRE } from '../src/data/interactive';

function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1e6) / 1e6;
  };
}

function env(over: Partial<GroundEnv> = {}): GroundEnv {
  return { grassAt: () => 1, wetness: 0, rain: 0, windX: 1, windZ: 0, windStrength: 0, ...over };
}

function run(g: GroundGrid, seconds: number) {
  for (let t = 0; t < seconds; t += 0.05) g.update(0.05, 150, 300);
}

/** Células queimadas (ou queimando) a leste e a oeste de x0. */
function burntSides(g: GroundGrid, x0: number) {
  let east = 0;
  let west = 0;
  for (let k = 0; k < g.res * g.res; k++) {
    if (g.burnt[k] <= 0 && g.fire[k] <= 0) continue;
    if (g.cellX(k) > x0 + 1) east++;
    else if (g.cellX(k) < x0 - 1) west++;
  }
  return { east, west };
}

describe('fogo na grama', () => {
  it('se espalha pela grama e queima até apagar', () => {
    const g = new GroundGrid(env(), rng(3));
    g.recenter(0, 0, true);
    expect(g.ignite(0, 0, 0.8)).toBeGreaterThan(0);
    run(g, 6);
    const { east, west } = burntSides(g, 0);
    expect(east + west).toBeGreaterThan(40);
    // depois de muito tempo o fogo cobre a grade e apaga (sem combustível)
    run(g, 120);
    expect(g.burningCount).toBe(0);
  });

  it('não pega onde não há grama', () => {
    const g = new GroundGrid(env({ grassAt: (x) => (x < 2 ? 1 : 0) }), rng(5));
    g.recenter(0, 0, true);
    g.ignite(0, 0, 1);
    run(g, 40);
    for (let k = 0; k < g.res * g.res; k++) if (g.cellX(k) > 3) expect(g.burnt[k] + g.fire[k]).toBe(0);
  });

  it('o vento empurra o fogo', () => {
    const g = new GroundGrid(env({ windX: 1, windZ: 0, windStrength: 1.5 }), rng(9));
    g.recenter(0, 0, true);
    g.ignite(0, 0, 0.5);
    run(g, 5);
    const { east, west } = burntSides(g, 0);
    expect(east).toBeGreaterThan(west * 1.5);
  });

  it('chão molhado ou chuva: não acende e a chuva apaga', () => {
    const wet = new GroundGrid(env({ wetness: FIRE.wetBlock + 0.1 }), rng(2));
    wet.recenter(0, 0, true);
    expect(wet.ignite(0, 0, 1)).toBe(0);
    const e = env();
    const g = new GroundGrid(e, rng(4));
    g.recenter(0, 0, true);
    g.ignite(0, 0, 2);
    run(g, 1);
    const before = g.burningCount;
    e.rain = 1;
    e.wetness = 0.8;
    run(g, 2);
    expect(g.burningCount).toBeLessThan(before);
    run(g, 3);
    expect(g.burningCount).toBe(0);
  });

  it('corta a grama num arco à frente e ela volta com o tempo', () => {
    const g = new GroundGrid(env(), rng(7));
    g.recenter(0, 0, true);
    const n = g.cutArc(0, 0, 0, 1, 2, 120);
    expect(n).toBeGreaterThan(4);
    // só à frente (+z)
    for (let k = 0; k < g.res * g.res; k++) if (g.cut[k] > 0) expect(g.cellZ(k)).toBeGreaterThan(-0.6);
    // grama cortada pega menos fogo mas ainda conta; regenera
    for (let t = 0; t < 200; t += 0.5) g.update(0.5, 150, 300);
    expect(g.regrowing).toBe(0);
  });

  it('recentralizar preserva o que foi queimado no mundo', () => {
    const g = new GroundGrid(env(), rng(11));
    g.recenter(0, 0, true);
    g.cutArc(5, 5, 1, 0, 1.2, 360);
    const k = g.index(5, 5);
    expect(g.cut[k]).toBeGreaterThan(0);
    g.recenter(30, -12);
    const k2 = g.index(5, 5);
    expect(k2).toBeGreaterThanOrEqual(0);
    expect(g.cut[k2]).toBeGreaterThan(0);
    expect(g.cut[g.index(30, -12)]).toBe(0);
  });
});
