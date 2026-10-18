import { describe, expect, it } from 'vitest';
import { SampleRing, mulberry32, nextDynamicScale, percentileSorted, summarize, worstMeanSorted } from '../src/perf/stats';

describe('perf/stats', () => {
  it('percentis por interpolação linear', () => {
    const s = Float32Array.from([1, 2, 3, 4, 5]);
    expect(percentileSorted(s, 5, 0)).toBe(1);
    expect(percentileSorted(s, 5, 50)).toBe(3);
    expect(percentileSorted(s, 5, 100)).toBe(5);
    expect(percentileSorted(s, 5, 25)).toBe(2);
    expect(percentileSorted(s, 5, 95)).toBeCloseTo(4.8, 5);
    expect(percentileSorted(s, 0, 50)).toBe(0);
  });

  it('1% low = média dos piores quadros', () => {
    const arr = new Float32Array(1000).fill(10);
    for (let i = 0; i < 10; i++) arr[i] = 100; // 1% de picos
    const scratch = new Float32Array(1000);
    const s = summarize(arr, 1000, scratch);
    expect(s.worst1).toBeCloseTo(100, 5);
    expect(s.p50).toBe(10);
    expect(s.max).toBe(100);
    expect(s.mean).toBeCloseTo(10.9, 5);
    // não altera a origem
    expect(arr[0]).toBe(100);
    expect(worstMeanSorted(Float32Array.from([1, 2, 3]), 3, 0.01)).toBe(3);
  });

  it('summarize com n menor que a capacidade', () => {
    const src = Float32Array.from([5, 1, 3, 9, 7, 0, 0, 0]);
    const s = summarize(src, 5, new Float32Array(8));
    expect(s.n).toBe(5);
    expect(s.min).toBe(1);
    expect(s.max).toBe(9);
    expect(s.p50).toBe(5);
  });

  it('buffer circular mantém só as N amostras mais recentes', () => {
    const r = new SampleRing(4);
    for (let i = 1; i <= 6; i++) r.push(i);
    expect(r.count).toBe(4);
    const out = new Float32Array(4);
    r.copyTo(out);
    expect([...out].sort((a, b) => a - b)).toEqual([3, 4, 5, 6]);
    expect(r.mean()).toBeCloseTo(4.5, 5);
    r.clear();
    expect(r.count).toBe(0);
    expect(r.mean()).toBe(0);
  });

  it('gerador com semente é determinístico', () => {
    const a = mulberry32(1337);
    const b = mulberry32(1337);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('resolução dinâmica: reduz acima da meta, sobe abaixo, respeita limites e histerese', () => {
    // meta 50 FPS = 20 ms
    expect(nextDynamicScale(1, 40, 50)).toBeLessThan(1);
    expect(nextDynamicScale(1, 40, 50)).toBeGreaterThanOrEqual(0.9); // no máximo um passo
    expect(nextDynamicScale(0.5, 200, 50)).toBe(0.5); // piso
    expect(nextDynamicScale(0.7, 10, 50)).toBeCloseTo(0.75, 5); // sobe meio passo
    expect(nextDynamicScale(1, 10, 50)).toBe(1); // teto
    expect(nextDynamicScale(0.8, 20.5, 50)).toBe(0.8); // dentro da margem: não mexe
    expect(nextDynamicScale(0.8, 0, 50)).toBe(0.8);
  });
});
