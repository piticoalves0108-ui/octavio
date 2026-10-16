import { describe, it, expect } from 'vitest';
import { baseFogDensity, biomeFogExtra, buildBoltSegments, flashCurve, fogDensity, fogVisibility, groundFogWeight, snapShadowCenter, thunderDelay } from '../src/env/envMath';
import { FOG, LIGHTNING } from '../src/data/weather';
import { RNG } from '../src/core/rng';

const fogInputs = (o: Partial<Parameters<typeof fogDensity>[0]> = {}) => ({
  viewDistance: 1300,
  weatherFog: 1,
  weatherFogExtra: 0,
  localExtra: 0,
  altitude: 2,
  indoor: false,
  ...o,
});

describe('névoa', () => {
  it('densidade base esconde a borda do terreno (≥ 95% de névoa na distância de visão)', () => {
    for (const vd of [600, 900, 1300, 1800]) {
      const d = baseFogDensity(vd);
      const fogAtEdge = 1 - Math.exp(-(d * vd) * (d * vd)); // FogExp2
      expect(fogAtEdge).toBeGreaterThan(0.95);
      // e não fecha demais: a 30% da distância ainda se vê bem
      const near = 1 - Math.exp(-((d * vd * 0.3) ** 2));
      expect(near).toBeLessThan(0.35);
    }
  });

  it('nunca fica abaixo do piso; clima e bioma só aumentam', () => {
    const base = fogDensity(fogInputs());
    expect(base).toBeGreaterThanOrEqual(baseFogDensity(1300) * FOG.altitudeRelief - 1e-12);
    expect(fogDensity(fogInputs({ weatherFog: 1.6, weatherFogExtra: 0.001 }))).toBeGreaterThan(base);
    expect(fogDensity(fogInputs({ localExtra: 0.006 }))).toBeGreaterThan(base);
  });

  it('a névoa local some ao voar acima da camada; interiores reduzem', () => {
    const low = fogDensity(fogInputs({ localExtra: 0.006, altitude: 5 }));
    const high = fogDensity(fogInputs({ localExtra: 0.006, altitude: 400 }));
    expect(high).toBeLessThan(low * 0.3);
    expect(high).toBeGreaterThanOrEqual(baseFogDensity(1300) * FOG.altitudeRelief - 1e-12);
    const indoor = fogDensity(fogInputs({ localExtra: 0.006, indoor: true }));
    expect(indoor).toBeLessThan(low);
  });

  it('pântano é mais denso que campos; floresta tem névoa matinal que some à tarde', () => {
    expect(biomeFogExtra('swamp', 14, 0)).toBeGreaterThan(biomeFogExtra('meadow', 14, 0) + 0.004);
    expect(biomeFogExtra('forest', 6.5, 0)).toBeGreaterThan(biomeFogExtra('forest', 14, 0) + 0.003);
    expect(biomeFogExtra('village', 6.5, 0)).toBe(0);
    // visibilidade no pântano em névoa: dezenas a poucas centenas de metros
    const swampVis = fogVisibility(fogDensity(fogInputs({ localExtra: biomeFogExtra('swamp', 6.5, 0) })));
    expect(swampVis).toBeGreaterThan(80);
    expect(swampVis).toBeLessThan(400);
  });

  it('névoa rasteira: pântano sempre, vila nunca, floresta mais de manhã', () => {
    expect(groundFogWeight('swamp', 14, 0)).toBeGreaterThan(0.6);
    expect(groundFogWeight('village', 6.5, 0.0105)).toBe(0);
    expect(groundFogWeight('forest', 6.5, 0)).toBeGreaterThan(groundFogWeight('forest', 14, 0) + 0.3);
    expect(groundFogWeight('meadow', 14, 0.0105)).toBeGreaterThan(groundFogWeight('meadow', 14, 0));
  });
});

describe('relâmpago', () => {
  it('curva do clarão: pico no início, pulsos e fim em ~1,2 s', () => {
    expect(flashCurve(-0.1)).toBe(0);
    expect(flashCurve(0)).toBeCloseTo(1, 5);
    expect(flashCurve(0.09)).toBeGreaterThan(flashCurve(0.08)); // segundo pulso
    expect(flashCurve(0.5)).toBeLessThan(0.1);
    expect(flashCurve(1.3)).toBe(0);
    for (let t = 0; t < 1.5; t += 0.01) {
      const f = flashCurve(t);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it('atraso do trovão pela distância (343 m/s)', () => {
    expect(thunderDelay(343)).toBeCloseTo(1, 6);
    expect(thunderDelay(1715, LIGHTNING.soundSpeed)).toBeCloseTo(5, 6);
    expect(thunderDelay(-10)).toBe(0);
  });

  it('raio: tronco contínuo do topo até o ponto de impacto, ramos que se apagam', () => {
    const rng = new RNG(7);
    const max = LIGHTNING.segments + LIGHTNING.branches * 7;
    const out = new Float32Array(max * 8);
    const top = { x: 10, y: 330, z: -40 };
    const bottom = { x: 0, y: 2, z: 0 };
    const n = buildBoltSegments(top, bottom, LIGHTNING.segments, LIGHTNING.branches, () => rng.next(), out, max);
    expect(n).toBeGreaterThan(LIGHTNING.segments);
    expect(n).toBeLessThanOrEqual(max);
    // primeiro segmento começa no topo; o último do tronco termina exatamente no alvo
    expect(out[0]).toBeCloseTo(top.x, 4);
    expect(out[1]).toBeCloseTo(top.y, 3);
    const last = (LIGHTNING.segments - 1) * 8;
    expect(out[last + 3]).toBeCloseTo(bottom.x, 4);
    expect(out[last + 4]).toBeCloseTo(bottom.y, 3);
    expect(out[last + 5]).toBeCloseTo(bottom.z, 4);
    // tronco conectado
    for (let s = 1; s < LIGHTNING.segments; s++) {
      expect(out[s * 8]).toBeCloseTo(out[(s - 1) * 8 + 3], 4);
      expect(out[s * 8 + 1]).toBeCloseTo(out[(s - 1) * 8 + 4], 3);
    }
    // ramos mais finos e menos brilhantes que o tronco, e descendo
    for (let s = LIGHTNING.segments; s < n; s++) {
      expect(out[s * 8 + 6]).toBeLessThan(0.5);
      expect(out[s * 8 + 7]).toBeLessThan(0.6);
      expect(out[s * 8 + 4]).toBeLessThan(out[s * 8 + 1]);
    }
    // respeita o limite do buffer
    expect(buildBoltSegments(top, bottom, LIGHTNING.segments, LIGHTNING.branches, () => rng.next(), out, 5)).toBe(5);
  });
});

describe('sombras estabilizadas', () => {
  const light = { x: 0.4, y: 0.8, z: 0.3 };
  const l = Math.hypot(light.x, light.y, light.z);
  light.x /= l;
  light.y /= l;
  light.z /= l;
  const texel = 180 / 2048;

  it('o centro ajustado fica a menos de um texel do original', () => {
    const out = { x: 0, y: 0, z: 0 };
    for (const c of [
      { x: 12.3, y: 4.5, z: -88.1 },
      { x: -430, y: 20, z: 250 },
      { x: 1001.7, y: 77, z: 3.3 },
    ]) {
      snapShadowCenter(c, light, texel, out);
      expect(Math.hypot(out.x - c.x, out.y - c.y, out.z - c.z)).toBeLessThan(texel * 0.75);
      // a profundidade ao longo da luz é preservada
      const depth = (p: typeof c) => -(p.x * light.x + p.y * light.y + p.z * light.z);
      expect(depth(out)).toBeCloseTo(depth(c), 4);
    }
  });

  it('a projeção no plano da luz cai sempre na grade de texels (bordas não tremem)', () => {
    const out = { x: 0, y: 0, z: 0 };
    // base do plano da luz igual à usada pela função
    const f = { x: -light.x, y: -light.y, z: -light.z };
    let rx = f.y * 0 - f.z * 1;
    let ry = f.z * 0 - f.x * 0;
    let rz = f.x * 1 - f.y * 0;
    const rl = Math.hypot(rx, ry, rz);
    rx /= rl;
    ry /= rl;
    rz /= rl;
    for (let i = 0; i < 50; i++) {
      const c = { x: -300 + i * 13.37, y: 10 + i * 0.7, z: 120 - i * 7.1 };
      snapShadowCenter(c, light, texel, out);
      const u = (out.x * rx + out.y * ry + out.z * rz) / texel;
      expect(Math.abs(u - Math.round(u))).toBeLessThan(1e-3);
    }
  });

  it('movimentos menores que meio texel não mudam o centro; luz vertical não quebra', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 0, y: 0, z: 0 };
    snapShadowCenter({ x: 5.0, y: 0, z: 5.0 }, { x: 0, y: 1, z: 0 }, 0.5, a);
    snapShadowCenter({ x: 5.1, y: 0, z: 5.1 }, { x: 0, y: 1, z: 0 }, 0.5, b);
    expect(Number.isFinite(a.x) && Number.isFinite(a.z)).toBe(true);
    expect(a.x).toBeCloseTo(b.x, 6);
    expect(a.z).toBeCloseTo(b.z, 6);
  });
});
