import { describe, it, expect } from 'vitest';
import {
  addUltimateCharge,
  chargeFraction,
  chargedValue,
  effectiveCooldown,
  lightningPoints,
  mulberry32,
  nextComboStep,
  pointSegmentDist2,
  rollDamage,
  segmentVsCapsule,
  type SegHit,
} from '../src/combat/combatMath';

const v = (x: number, y: number, z: number) => ({ x, y, z });
const hit = (): SegHit => ({ dist2: 0, s: 0, t: 0 });

describe('segmentVsCapsule (colisão de projéteis/feixes)', () => {
  it('segmento atravessando o corpo tem distância 0 e parâmetro no meio', () => {
    const h = segmentVsCapsule(v(-5, 1, 0), v(5, 1, 0), v(0, 0, 0), 1.8, hit());
    expect(h.dist2).toBeCloseTo(0, 6);
    expect(h.s).toBeCloseTo(0.5, 6);
    expect(h.t).toBeCloseTo(1 / 1.8, 6);
  });

  it('segmento passando ao lado mede a distância horizontal', () => {
    const h = segmentVsCapsule(v(-5, 1, 2), v(5, 1, 2), v(0, 0, 0), 1.8, hit());
    expect(Math.sqrt(h.dist2)).toBeCloseTo(2, 6);
  });

  it('segmento acima da cabeça mede até o topo da cápsula', () => {
    const h = segmentVsCapsule(v(-5, 4, 0), v(5, 4, 0), v(0, 0, 0), 1.8, hit());
    expect(Math.sqrt(h.dist2)).toBeCloseTo(2.2, 6);
    expect(h.t).toBe(1);
  });

  it('segmento que termina antes do alvo usa a ponta (s = 1)', () => {
    const h = segmentVsCapsule(v(-5, 1, 0), v(-3, 1, 0), v(0, 0, 0), 1.8, hit());
    expect(h.s).toBe(1);
    expect(Math.sqrt(h.dist2)).toBeCloseTo(3, 6);
  });

  it('segmento vertical (queda) e segmento degenerado', () => {
    const a = segmentVsCapsule(v(0.3, 5, 0), v(0.3, -1, 0), v(0, 0, 0), 2, hit());
    expect(Math.sqrt(a.dist2)).toBeCloseTo(0.3, 6);
    const b = segmentVsCapsule(v(1, 1, 0), v(1, 1, 0), v(0, 0, 0), 2, hit());
    expect(Math.sqrt(b.dist2)).toBeCloseTo(1, 6);
  });

  it('pointSegmentDist2', () => {
    expect(pointSegmentDist2(v(0, 1, 0), v(-1, 0, 0), v(1, 0, 0))).toBeCloseTo(1, 6);
    expect(pointSegmentDist2(v(3, 0, 0), v(-1, 0, 0), v(1, 0, 0))).toBeCloseTo(4, 6);
  });
});

describe('fórmulas de dano', () => {
  it('rollDamage: arma × poder × aprimoramento × golpe, com crítico', () => {
    const r = rollDamage(20, 1.5, 1.24, 1.65, 0.1, 1.5, 0.5);
    expect(r.crit).toBe(false);
    expect(r.amount).toBeCloseTo(20 * 1.5 * 1.24 * 1.65, 6);
    const c = rollDamage(20, 1, 1, 1, 0.1, 1.5, 0.05);
    expect(c.crit).toBe(true);
    expect(c.amount).toBeCloseTo(30, 6);
    // chance > 1 (contra-ataque) é sempre crítico; multiplicador < 1 não reduz
    expect(rollDamage(10, 1, 1, 1, 1.4, 0.8, 0.99).amount).toBe(10);
  });

  it('effectiveCooldown limita a redução a 50%', () => {
    expect(effectiveCooldown(10, 0.2)).toBeCloseTo(8, 6);
    expect(effectiveCooldown(10, 0.9)).toBeCloseTo(5, 6);
    expect(effectiveCooldown(10, 0.2, 0.5)).toBeCloseTo(4, 6);
    expect(effectiveCooldown(10, NaN)).toBe(10);
  });

  it('carga do ataque pesado', () => {
    expect(chargeFraction(0.2, 0.28, 1)).toBe(0);
    expect(chargeFraction(0.78, 0.28, 1)).toBeCloseTo(0.5, 6);
    expect(chargeFraction(5, 0.28, 1)).toBe(1);
    expect(chargedValue(1.8, 3, 0.5)).toBeCloseTo(2.4, 6);
  });

  it('Carga Arcana acumula por dano e trava no máximo', () => {
    expect(addUltimateCharge(10, 100, 0.12, 100)).toBeCloseTo(22, 6);
    expect(addUltimateCharge(95, 100, 0.12, 100)).toBe(100);
    expect(addUltimateCharge(50, -3, 0.12, 100)).toBe(50);
  });
});

describe('combos', () => {
  it('nextComboStep respeita a janela e recomeça após o finalizador', () => {
    expect(nextComboStep(-1, 99, 0.45, 3)).toBe(0);
    expect(nextComboStep(0, 0.2, 0.45, 3)).toBe(1);
    expect(nextComboStep(1, 0.3, 0.45, 3)).toBe(2);
    expect(nextComboStep(2, 0.1, 0.45, 3)).toBe(0);
    expect(nextComboStep(1, 0.6, 0.45, 3)).toBe(0);
    // adaga: 4 golpes
    expect(nextComboStep(2, 0.1, 0.38, 4)).toBe(3);
  });
});

describe('raios', () => {
  it('lightningPoints começa e termina nas pontas e fica perto da linha', () => {
    const out: number[] = [];
    const n = lightningPoints(v(0, 10, 0), v(0, 0, 0), 10, 0.1, mulberry32(7), out);
    expect(n).toBe(11);
    expect(out.length).toBe(33);
    expect(out.slice(0, 3)).toEqual([0, 10, 0]);
    expect(out.slice(30, 33)).toEqual([0, 0, 0]);
    let maxOff = 0;
    let anyOff = 0;
    for (let i = 0; i < n; i++) {
      const off = Math.hypot(out[i * 3], out[i * 3 + 2]);
      maxOff = Math.max(maxOff, off);
      anyOff += off;
    }
    expect(anyOff).toBeGreaterThan(0.1); // é irregular
    expect(maxOff).toBeLessThanOrEqual(10 * 0.1 * Math.SQRT2 + 1e-6); // limitado pelo jitter
  });

  it('gerador determinístico', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });
});
