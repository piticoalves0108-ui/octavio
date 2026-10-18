import { describe, it, expect } from 'vitest';
import { ambienceTargets, nextInterval, proximity, type AmbienceInputs } from '../src/audio/ambienceLogic';
import { AMBIENCE } from '../src/audio/data';

const inp = (o: Partial<AmbienceInputs> = {}): AmbienceInputs => ({
  biome: 'meadow',
  altitude: 0,
  height: 20,
  night: 0,
  hour: 12,
  rain: 0,
  wind: 0.4,
  gust: 0,
  indoors: false,
  crypt: false,
  tavern: false,
  water: 0,
  village: 0,
  forge: 0,
  ruins: 0,
  swamp: 0,
  corruption: 0,
  flying: false,
  menu: false,
  ...o,
});

describe('áudio — ambiência por bioma/horário/clima', () => {
  it('floresta: pássaros de dia, grilos e corujas à noite', () => {
    const day = ambienceTargets(inp({ biome: 'forest', night: 0 }));
    const night = ambienceTargets(inp({ biome: 'forest', night: 1, hour: 23 }));
    expect(day.birdRate).toBeGreaterThan(0.5);
    expect(day.crickets).toBe(0);
    expect(night.birdRate).toBeCloseTo(0, 6);
    expect(night.crickets).toBeGreaterThan(0.5);
    expect(night.owlRate).toBeGreaterThan(0);
  });

  it('pântano: sapos e borbulhas; água perto do rio', () => {
    const t = ambienceTargets(inp({ biome: 'swamp', swamp: 1, night: 0.8 }));
    expect(t.frogRate).toBeGreaterThan(0.5);
    expect(t.bubbleRate).toBeGreaterThan(0.3);
    expect(t.swamp).toBeGreaterThan(0.5);
    expect(ambienceTargets(inp({ water: 1 })).water).toBeGreaterThan(0.9);
    expect(ambienceTargets(inp({ water: 0 })).water).toBe(0);
  });

  it('montanha e altitude: vento e uivo; voo alto silencia a vida do chão', () => {
    const ground = ambienceTargets(inp({ biome: 'meadow' }));
    const mountain = ambienceTargets(inp({ biome: 'mountain', height: 230 }));
    const high = ambienceTargets(inp({ biome: 'forest', altitude: 120, height: 200 }));
    expect(mountain.wind).toBeGreaterThan(ground.wind);
    expect(mountain.howl).toBeGreaterThan(0.2);
    expect(high.wind).toBeGreaterThan(0.7);
    expect(high.birdRate).toBeLessThan(ambienceTargets(inp({ biome: 'forest' })).birdRate * 0.2);
  });

  it('chuva: cheia fora, abafada dentro; corta pássaros', () => {
    const out = ambienceTargets(inp({ rain: 1 }));
    const inside = ambienceTargets(inp({ rain: 1, indoors: true }));
    expect(out.rain).toBe(1);
    expect(out.rainMuffled).toBe(0);
    expect(inside.rain).toBe(0);
    expect(inside.rainMuffled).toBeGreaterThan(0.5);
    expect(out.birdRate).toBeLessThan(ambienceTargets(inp()).birdRate * 0.2);
    expect(inside.wind).toBeLessThan(out.wind * 0.3);
  });

  it('vila: burburinho de dia, martelo só no horário da forja, taverna cheia', () => {
    const day = ambienceTargets(inp({ biome: 'village', village: 1, forge: 1, hour: 10 }));
    const night = ambienceTargets(inp({ biome: 'village', village: 1, forge: 1, hour: 23, night: 1 }));
    expect(day.crowd).toBeGreaterThan(night.crowd);
    expect(day.hammerRate).toBeGreaterThan(0);
    expect(night.hammerRate).toBe(0);
    expect(ambienceTargets(inp({ indoors: true, tavern: true })).crowd).toBeGreaterThan(0.8);
  });

  it('ruínas: zumbido elétrico e faíscas; cripta: espaço reverberante e gotas', () => {
    const r = ambienceTargets(inp({ biome: 'ruins', ruins: 1 }));
    expect(r.hum).toBeGreaterThan(0.9);
    expect(r.crackleRate).toBeGreaterThan(0);
    expect(r.space).toBe('ruins');
    const c = ambienceTargets(inp({ indoors: true, crypt: true }));
    expect(c.space).toBe('crypt');
    expect(c.cave).toBe(1);
    expect(c.dripRate).toBeGreaterThan(0);
    expect(ambienceTargets(inp({ indoors: true })).space).toBe('indoor');
    expect(ambienceTargets(inp({ village: 1 })).space).toBe('village');
  });

  it('menu: ambiência mais baixa', () => {
    const a = ambienceTargets(inp({ biome: 'village', village: 1 }));
    const m = ambienceTargets(inp({ biome: 'village', village: 1, menu: true }));
    expect(m.wind).toBeLessThan(a.wind);
    expect(m.crowd).toBeLessThan(a.crowd);
  });

  it('níveis sempre em [0,1]', () => {
    for (const biome of ['forest', 'meadow', 'village', 'shore', 'swamp', 'ruins', 'mountain', 'rocky', 'corrupted', 'desconhecido'])
      for (const night of [0, 0.5, 1])
        for (const rain of [0, 1])
          for (const altitude of [0, 60, 300]) {
            const t = ambienceTargets(inp({ biome, night, rain, altitude, wind: 2, gust: 1, water: 1, village: 1, ruins: 1, swamp: 1, corruption: 1 }));
            for (const k of ['wind', 'howl', 'rain', 'rainMuffled', 'water', 'swamp', 'hum', 'corruption', 'crowd', 'crickets', 'cave'] as const) {
              expect(t[k]).toBeGreaterThanOrEqual(0);
              expect(t[k]).toBeLessThanOrEqual(1);
            }
            expect(t.birdRate).toBeLessThanOrEqual(AMBIENCE.birdRate);
          }
  });
});

describe('áudio — utilitários da ambiência', () => {
  it('proximidade suave', () => {
    expect(proximity(0, 6, 45)).toBe(1);
    expect(proximity(6, 6, 45)).toBe(1);
    expect(proximity(45, 6, 45)).toBe(0);
    expect(proximity(25, 6, 45)).toBeGreaterThan(0);
    expect(proximity(25, 6, 45)).toBeLessThan(1);
  });

  it('intervalos de Poisson com média 1/taxa', () => {
    expect(nextInterval(0, 0.5)).toBe(Infinity);
    let s = 0;
    const N = 4000;
    for (let i = 1; i <= N; i++) s += nextInterval(2, i / (N + 1));
    expect(s / N).toBeCloseTo(0.5, 1);
  });
});
