import { describe, it, expect } from 'vitest';
import { WeatherMachine, createMix, isWeatherKind, morningFogFactor } from '../src/env/weatherMachine';
import { WindModel } from '../src/env/wind';
import { WEATHER, WEATHER_KINDS, WEATHER_TIMING, WIND } from '../src/data/weather';
import { RNG } from '../src/core/rng';
import type { WeatherKind } from '../src/core/EventBus';
import type { BiomeId } from '../src/data/world';

const seeded = (seed: number) => {
  const r = new RNG(seed);
  return () => r.next();
};

/** Simula `seconds` de clima num bioma fixo, em passos de `dt`. */
function simulate(m: WeatherMachine, biome: BiomeId, seconds: number, dt = 0.5, hours = 14) {
  const counts: Record<WeatherKind, number> = { clear: 0, cloudy: 0, rain: 0, storm: 0, fog: 0 };
  const durations: { kind: WeatherKind; s: number }[] = [];
  let since = 0;
  let changes = 0;
  for (let t = 0; t < seconds; t += dt) {
    const prev = m.current;
    const c = m.update(dt, biome, hours);
    since += dt;
    if (c) {
      durations.push({ kind: prev, s: since });
      since = 0;
      changes++;
      counts[c]++;
    }
  }
  return { counts, durations, changes };
}

describe('clima — dados', () => {
  it('todos os climas têm parâmetros coerentes', () => {
    for (const k of WEATHER_KINDS) {
      const p = WEATHER[k];
      expect(p.durationMin[0]).toBeGreaterThanOrEqual(1);
      expect(p.durationMin[1]).toBeGreaterThanOrEqual(p.durationMin[0]);
      expect(p.cloudCover).toBeGreaterThanOrEqual(0);
      expect(p.cloudCover).toBeLessThanOrEqual(1);
      expect(p.rain).toBeGreaterThanOrEqual(0);
      expect(p.rain).toBeLessThanOrEqual(1);
      expect(p.wind).toBeLessThanOrEqual(WIND.max);
    }
    expect(WEATHER.storm.lightningPerMin).toBeGreaterThan(0);
    expect(WEATHER.clear.lightningPerMin).toBe(0);
    expect(WEATHER.rain.rain).toBeGreaterThan(0.3);
    expect(WEATHER.fog.fogExtra).toBeGreaterThan(WEATHER.rain.fogExtra);
  });

  it('isWeatherKind valida', () => {
    expect(isWeatherKind('storm')).toBe(true);
    expect(isWeatherKind('snow')).toBe(false);
    expect(isWeatherKind(3)).toBe(false);
  });

  it('névoa matinal: pico de manhã, zero à tarde', () => {
    expect(morningFogFactor(6.5)).toBeCloseTo(1, 5);
    expect(morningFogFactor(14)).toBe(0);
    expect(morningFogFactor(3)).toBe(0);
    expect(morningFogFactor(8)).toBeGreaterThan(0);
  });
});

describe('clima — máquina de estados', () => {
  it('reset aplica o clima sem transição', () => {
    const m = new WeatherMachine(seeded(1));
    m.reset('storm', 100);
    expect(m.current).toBe('storm');
    expect(m.progress).toBe(1);
    expect(m.mix.rain).toBe(WEATHER.storm.rain);
    expect(m.timeLeft).toBe(100);
  });

  it('set com transição: as nuvens chegam antes da chuva; set(…, 0) é imediato', () => {
    const m = new WeatherMachine(seeded(2));
    m.reset('clear', 600);
    expect(m.set('rain', 100)).toBe(true);
    expect(m.mix.rain).toBe(0);
    // 35% da transição: nuvens já se formando (adiantadas), chuva ainda não começou
    for (let i = 0; i < 35; i++) m.update(1, 'meadow', 12);
    const cloudFrac = (m.mix.cloudCover - WEATHER.clear.cloudCover) / (WEATHER.rain.cloudCover - WEATHER.clear.cloudCover);
    expect(cloudFrac).toBeGreaterThan(0.4);
    expect(m.mix.rain).toBe(0);
    for (let i = 0; i < 70; i++) m.update(1, 'meadow', 12);
    expect(m.progress).toBe(1);
    expect(m.mix.rain).toBeCloseTo(WEATHER.rain.rain, 6);
    // imediato
    m.set('fog', 0);
    expect(m.progress).toBe(1);
    expect(m.mix.fogExtra).toBeCloseTo(WEATHER.fog.fogExtra, 8);
  });

  it('ao sair da chuva, ela para antes de o céu abrir', () => {
    const m = new WeatherMachine(seeded(3));
    m.reset('rain', 600);
    m.set('clear', 100);
    for (let i = 0; i < 60; i++) m.update(1, 'meadow', 12);
    expect(m.mix.rain).toBe(0);
    expect(m.mix.cloudCover).toBeGreaterThan(WEATHER.clear.cloudCover + 0.1);
  });

  it('mudar no meio de uma transição não dá salto', () => {
    const m = new WeatherMachine(seeded(4));
    m.reset('clear', 600);
    m.set('storm', 60);
    for (let i = 0; i < 30; i++) m.update(1, 'meadow', 12);
    const before = { ...m.mix };
    m.set('clear', 60);
    for (const k of Object.keys(before) as (keyof typeof before)[]) expect(m.mix[k]).toBeCloseTo(before[k], 9);
  });

  it('muda sozinho só depois da duração natural, nunca para o mesmo clima', () => {
    const m = new WeatherMachine(seeded(5));
    m.reset('clear', 120);
    expect(m.update(119, 'meadow', 12)).toBeNull();
    const next = m.update(2, 'meadow', 12);
    expect(next).not.toBeNull();
    expect(next).not.toBe('clear');
    expect(m.progress).toBeLessThan(1); // transição natural é gradual
    expect(m.transitionSeconds).toBeGreaterThanOrEqual(WEATHER_TIMING.transitionSeconds[0]);
  });

  it('travado (chefe) não muda sozinho', () => {
    const m = new WeatherMachine(seeded(6));
    m.reset('storm', 5);
    m.locked = true;
    for (let i = 0; i < 1000; i++) expect(m.update(1, 'mountain', 12)).toBeNull();
    expect(m.current).toBe('storm');
  });

  it('durações naturais em minutos e sem trocas artificiais constantes', () => {
    const m = new WeatherMachine(seeded(7));
    m.reset('clear', 300);
    const { durations, changes } = simulate(m, 'meadow', 6 * 3600);
    // ~6 horas reais: algumas dezenas de mudanças, não centenas
    expect(changes).toBeGreaterThan(20);
    expect(changes).toBeLessThan(120);
    for (const d of durations.slice(1)) {
      const [a, b] = WEATHER[d.kind].durationMin;
      expect(d.s).toBeGreaterThanOrEqual(a * 60 - 1);
      expect(d.s).toBeLessThanOrEqual(b * 60 + 1);
    }
  });

  it('pesos regionais: pântano tem mais névoa, montanhas mais tempestades', () => {
    const m = new WeatherMachine(seeded(8));
    m.reset('cloudy', 600);
    const meadow = { ...m.nextWeights('meadow', 14) };
    const swamp = { ...m.nextWeights('swamp', 14) };
    const mountain = { ...m.nextWeights('mountain', 14) };
    expect(meadow.cloudy).toBe(0); // sem autotransição
    expect(swamp.fog).toBeGreaterThan(meadow.fog * 2);
    expect(mountain.storm).toBeGreaterThan(meadow.storm * 2);
    // névoa matinal
    expect(m.nextWeights('forest', 6.5).fog).toBeGreaterThan(m.nextWeights('forest', 14).fog * 1.5);

    // estatística de longo prazo
    const share = (biome: BiomeId, kind: WeatherKind) => {
      const mm = new WeatherMachine(seeded(99));
      mm.reset('clear', 60);
      const { counts, changes } = simulate(mm, biome, 40 * 3600, 1);
      return counts[kind] / changes;
    };
    expect(share('swamp', 'fog')).toBeGreaterThan(share('meadow', 'fog') * 1.8);
    expect(share('mountain', 'storm')).toBeGreaterThan(share('meadow', 'storm') * 1.8);
  });

  it('save: serializa e restaura; dados inválidos lançam erro', () => {
    const m = new WeatherMachine(seeded(9));
    m.reset('rain', 200);
    m.locked = true;
    const snap = JSON.parse(JSON.stringify(m.serialize()));
    const m2 = new WeatherMachine(seeded(10));
    m2.restore(snap);
    expect(m2.current).toBe('rain');
    expect(m2.locked).toBe(true);
    expect(m2.timeLeft).toBeCloseTo(200, 1);
    expect(m2.mix.rain).toBe(WEATHER.rain.rain);
    expect(() => m2.restore({ current: 'neve' })).toThrow();
    expect(() => m2.restore(null)).toThrow();
    // timeLeft fora da faixa é limitado
    m2.restore({ current: 'fog', timeLeft: 1e9 });
    expect(m2.timeLeft).toBeLessThanOrEqual(3600);
  });

  it('createMix copia os parâmetros', () => {
    const mix = createMix('storm');
    expect(mix.lightningPerMin).toBe(WEATHER.storm.lightningPerMin);
    expect((mix as Record<string, unknown>).durationMin).toBeUndefined();
  });
});

describe('vento', () => {
  it('força limitada, direção normalizada, rajadas 0..1', () => {
    const w = new WindModel(11, 0.5);
    let gustMax = 0;
    let minDot = 1;
    const a0 = { x: Math.cos(0.5), z: Math.sin(0.5) };
    let sMin = Infinity;
    let sMax = -Infinity;
    let gMin = Infinity;
    let lenErr = 0;
    for (let i = 0; i < 20000; i++) {
      w.update(0.05, 1.65, 0.75);
      sMin = Math.min(sMin, w.strength);
      sMax = Math.max(sMax, w.strength);
      gMin = Math.min(gMin, w.gust);
      lenErr = Math.max(lenErr, Math.abs(Math.hypot(w.dir.x, w.dir.z) - 1));
      gustMax = Math.max(gustMax, w.gust);
      minDot = Math.min(minDot, w.dir.x * a0.x + w.dir.z * a0.z);
    }
    expect(sMin).toBeGreaterThanOrEqual(0);
    expect(sMax).toBeLessThanOrEqual(WIND.max);
    expect(gMin).toBeGreaterThanOrEqual(0);
    expect(gustMax).toBeLessThanOrEqual(1);
    expect(lenErr).toBeLessThan(1e-6);
    expect(gustMax).toBeGreaterThan(0.5); // há rajadas
    expect(minDot).toBeLessThan(0.95); // a direção deriva
  });

  it('a força base acompanha o clima suavemente; snap é imediato', () => {
    const w = new WindModel(12, 0);
    w.snap(0.35);
    w.update(0.1, 1.65, 0);
    expect(w.base).toBeLessThan(0.5); // não salta
    for (let i = 0; i < 400; i++) w.update(0.05, 1.65, 0);
    expect(w.base).toBeCloseTo(1.65, 1);
    expect(w.strength).toBeCloseTo(w.base, 6); // sem rajadas (amp 0)
    w.snap(0.1);
    expect(w.strength).toBe(0.1);
  });
});
