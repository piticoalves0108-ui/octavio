import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createSkySample, eclipseDirection, lightLevels, moonDirection, moonPhase, nightFactor, sampleSky, sunDirection, timeOfDayLabel, type LightLevels } from '../src/env/dayCycle';
import { DAY_CYCLE, ECLIPSE, SKY_KEYS } from '../src/data/weather';

const v = () => ({ x: 0, y: 0, z: 0 });
const len = (p: { x: number; y: number; z: number }) => Math.hypot(p.x, p.y, p.z);

describe('ciclo dia/noite — sol', () => {
  it('direção normalizada em qualquer hora', () => {
    for (let h = 0; h < 24; h += 0.37) expect(len(sunDirection(h, v()))).toBeCloseTo(1, 5);
  });

  it('nasce a leste, culmina ao meio-dia (inclinado ao sul) e se põe a oeste', () => {
    const rise = sunDirection(DAY_CYCLE.sunrise, v());
    expect(rise.y).toBeCloseTo(0, 5);
    expect(rise.x).toBeGreaterThan(0.99); // leste = +X
    const noon = sunDirection(12, v());
    expect(noon.y).toBeGreaterThan(0.85);
    expect(noon.z).toBeGreaterThan(0.3); // sul = +Z
    const set = sunDirection(DAY_CYCLE.sunset, v());
    expect(set.y).toBeCloseTo(0, 5);
    expect(set.x).toBeLessThan(-0.99);
    expect(sunDirection(0, v()).y).toBeLessThan(-0.85);
  });

  it('trajetória contínua (sem saltos entre quadros, inclusive à meia-noite)', () => {
    const a = v();
    const b = v();
    let maxStep = 0;
    for (let h = 0; h < 24; h += 0.01) {
      sunDirection(h, a);
      sunDirection(h + 0.01, b);
      maxStep = Math.max(maxStep, Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z));
    }
    expect(maxStep).toBeLessThan(0.01);
    sunDirection(23.999, a);
    sunDirection(24.001, b);
    expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.002);
  });
});

describe('ciclo dia/noite — lua e fases', () => {
  it('a lua fica alta numa noite e a fase varia de um dia para o outro', () => {
    let best = -1;
    for (let h = 19; h < 29; h += 0.25) best = Math.max(best, moonDirection(h % 24, 1 + Math.floor(h / 24), v()).y);
    expect(best).toBeGreaterThan(0.5);
    const s = sunDirection(0, v());
    const p1 = moonPhase(s, moonDirection(0, 1, v()));
    const p8 = moonPhase(s, moonDirection(0, 8, v()));
    expect(Math.abs(p1 - p8)).toBeGreaterThan(0.05);
  });

  it('a lua não salta à meia-noite (troca de dia contínua)', () => {
    const a = moonDirection(23.999, 3, v());
    const b = moonDirection(0.001, 4, v());
    expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(0.01);
  });

  it('fase: cheia em oposição ao sol, nova em conjunção', () => {
    expect(moonPhase({ x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 })).toBeCloseTo(1, 5);
    expect(moonPhase({ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 })).toBeCloseTo(0, 5);
  });
});

describe('ciclo dia/noite — luzes', () => {
  it('nightFactor: 0 de dia, 1 de noite, monotônico com a altura do sol', () => {
    expect(nightFactor(0.5)).toBe(0);
    expect(nightFactor(-0.5)).toBe(1);
    let prev = 1;
    for (let y = -0.3; y <= 0.3; y += 0.01) {
      const n = nightFactor(y);
      expect(n).toBeLessThanOrEqual(prev + 1e-9);
      prev = n;
    }
  });

  it('a troca sol→lua da luz direcional acontece com as duas luzes ~apagadas', () => {
    const out: LightLevels = { sun: 0, moon: 0, useMoon: false };
    // varre a altura do sol; no ponto em que useMoon muda, ambas devem estar fracas
    let prevUse = false;
    for (let y = 0.3; y >= -0.3; y -= 0.001) {
      lightLevels(y, 0.6, 1, out);
      if (out.useMoon !== prevUse) {
        expect(out.sun).toBeLessThan(0.02);
        expect(out.moon).toBeLessThan(0.02);
        prevUse = out.useMoon;
      }
    }
    expect(prevUse).toBe(true);
    // lua abaixo do horizonte não ilumina; lua nova ilumina menos que a cheia
    expect(lightLevels(-0.5, -0.2, 1, out).moon).toBe(0);
    const full = lightLevels(-0.5, 0.6, 1, out).moon;
    const newMoon = lightLevels(-0.5, 0.6, 0, out).moon;
    expect(full).toBeGreaterThan(newMoon);
  });
});

describe('ciclo dia/noite — paleta do céu', () => {
  it('interpolação cíclica sem saltos (inclusive na volta 24h → 0h)', () => {
    const a = createSkySample();
    const b = createSkySample();
    let maxJump = 0;
    for (let h = 0; h < 24; h += 0.02) {
      sampleSky(h, a);
      sampleSky(h + 0.02, b);
      for (const k of ['zenith', 'horizon', 'fog', 'sun', 'hemiSky'] as const) {
        maxJump = Math.max(maxJump, Math.abs(a[k].r - b[k].r), Math.abs(a[k].g - b[k].g), Math.abs(a[k].b - b[k].b));
      }
      maxJump = Math.max(maxJump, Math.abs(a.exposure - b.exposure));
    }
    expect(maxJump).toBeLessThan(0.08);
    sampleSky(23.9999, a);
    sampleSky(0, b);
    expect(Math.abs(a.zenith.b - b.zenith.b)).toBeLessThan(1e-3);
  });

  it('coincide com os quadros-chave nas horas exatas', () => {
    const s = createSkySample();
    for (const k of SKY_KEYS) {
      sampleSky(k.hour, s);
      const c = new THREE.Color(k.zenith);
      expect(s.zenith.r).toBeCloseTo(c.r, 4);
      expect(s.exposure).toBeCloseTo(k.exposure, 4);
    }
  });

  it('meio-dia é claro e azul; meia-noite é escura', () => {
    const s = createSkySample();
    sampleSky(12, s);
    expect(s.zenith.b).toBeGreaterThan(s.zenith.r);
    const dayL = s.horizon.r + s.horizon.g + s.horizon.b;
    sampleSky(0, s);
    const nightL = s.horizon.r + s.horizon.g + s.horizon.b;
    expect(dayL).toBeGreaterThan(nightL * 10);
  });
});

describe('Eclipse Arcano e rótulos', () => {
  it('eclipse fica ao norte, na elevação configurada', () => {
    for (let h = 0; h < 24; h += 3) {
      const e = eclipseDirection(h, v());
      expect(len(e)).toBeCloseTo(1, 5);
      expect(e.z).toBeLessThan(-0.7); // norte = -Z
      expect(Math.asin(e.y) * (180 / Math.PI)).toBeCloseTo(ECLIPSE.elevationDeg, 4);
    }
  });

  it('rótulos do período do dia em pt-BR', () => {
    expect(timeOfDayLabel(2)).toBe('Madrugada');
    expect(timeOfDayLabel(6)).toBe('Amanhecer');
    expect(timeOfDayLabel(12)).toBe('Meio-dia');
    expect(timeOfDayLabel(18)).toBe('Entardecer');
    expect(timeOfDayLabel(22)).toBe('Noite');
    expect(timeOfDayLabel(26)).toBe('Madrugada');
  });
});
