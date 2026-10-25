import { describe, it, expect } from 'vitest';
import { makeRideState, stepRide, stepAir, terrainBlock, stepTaming, tamingEnergy, isGalloping, type RideInput } from '../src/mount/ride';
import { HORSE, HORSE_GEARS, HORSE_NAMES, TAMING } from '../src/data/mounts';
import { CREATURES } from '../src/data/creatures';
import { CREATURE_ZONES } from '../src/data/spawns';
import { QUAD_LOOKS } from '../src/ai/rigs/quadruped';

const DT = 1 / 60;
const idle: RideInput = { forward: 0, turn: 0, spur: false, jump: false };
function run(s: ReturnType<typeof makeRideState>, inp: RideInput, seconds: number, events?: string[]) {
  let rate = 0;
  for (let t = 0; t < seconds; t += DT) rate = stepRide(s, inp, DT, events);
  return rate;
}

describe('cavalgar: marchas, esporas e giro', () => {
  it('segurar frente sobe passo → trote → meio-galope, sem galopar sozinho', () => {
    const s = makeRideState();
    run(s, { ...idle, forward: 1 }, 0.5);
    expect(s.gear).toBe(1);
    run(s, { ...idle, forward: 1 }, 6);
    expect(s.gear).toBe(3);
    expect(s.speed).toBeCloseTo(HORSE_GEARS[3].speed, 1);
    expect(isGalloping(s)).toBe(false);
  });

  it('espora dá galope por alguns segundos e gasta uma carga; sem cargas, nada', () => {
    const s = makeRideState();
    run(s, { ...idle, forward: 1 }, 1);
    const ev: string[] = [];
    stepRide(s, { ...idle, forward: 1, spur: true }, DT, ev);
    expect(ev).toContain('spur');
    expect(s.spurs).toBeCloseTo(HORSE.spurs - 1, 1);
    run(s, { ...idle, forward: 1 }, HORSE.spurGallop * 0.8);
    expect(s.speed).toBeGreaterThan(HORSE_GEARS[3].speed + 2);
    expect(isGalloping(s)).toBe(true);
    // gasta todas
    for (let i = 0; i < 6; i++) stepRide(s, { ...idle, forward: 1, spur: true }, DT);
    expect(s.spurs).toBeLessThan(1);
    const before = s.spurs;
    const ev2: string[] = [];
    stepRide(s, { ...idle, forward: 1, spur: true }, DT, ev2);
    expect(ev2).not.toContain('spur');
    // recarrega com o tempo
    run(s, { ...idle, forward: 1 }, HORSE.spurRegen * 1.1);
    expect(s.spurs).toBeGreaterThan(before + 0.9);
  });

  it('soltar para; trás freia e depois anda de ré', () => {
    const s = makeRideState();
    run(s, { ...idle, forward: 1 }, 4);
    run(s, idle, 3);
    expect(s.speed).toBe(0);
    expect(s.gear).toBe(0);
    run(s, { ...idle, forward: -1 }, 2);
    expect(s.speed).toBeCloseTo(-HORSE.reverseSpeed, 1);
  });

  it('curvas fechadas devagar e abertas no galope; de ré o giro inverte', () => {
    const slow = makeRideState();
    const rSlow = stepRide(slow, { ...idle, turn: 1 }, DT);
    const fast = makeRideState();
    fast.speed = HORSE_GEARS[4].speed;
    fast.gallopT = 1;
    const rFast = stepRide(fast, { ...idle, forward: 1, turn: 1 }, DT);
    expect(rSlow).toBeGreaterThan(rFast);
    expect(rFast).toBeGreaterThan(0);
    const back = makeRideState();
    back.speed = -1.5;
    expect(stepRide(back, { ...idle, forward: -1, turn: 1 }, DT)).toBeLessThan(0);
  });

  it('pulo só em movimento; a queda pousa no chão', () => {
    const s = makeRideState();
    const ev: string[] = [];
    stepRide(s, { ...idle, jump: true }, DT, ev);
    expect(s.airborne).toBe(false);
    run(s, { ...idle, forward: 1 }, 2);
    stepRide(s, { ...idle, forward: 1, jump: true }, DT, ev);
    expect(ev).toContain('jump');
    expect(s.airborne).toBe(true);
    const y = { value: 10 };
    let peak = 10;
    let landed = false;
    for (let i = 0; i < 200 && !landed; i++) {
      landed = stepAir(s, y, 10, DT);
      peak = Math.max(peak, y.value);
    }
    expect(landed).toBe(true);
    expect(y.value).toBe(10);
    // altura do pulo ≈ v²/2g (passa uma cerca de ~0,9 m)
    expect(peak - 10).toBeGreaterThan(0.8);
    expect(peak - 10).toBeLessThan(1.4);
  });
});

describe('cavalgar: o cavalo recusa terreno perigoso', () => {
  it('água funda, beira de penhasco e subida íngreme; terreno normal passa', () => {
    expect(terrainBlock(10, 10, 3, HORSE.deepWater + 0.2)).toBe('water');
    expect(terrainBlock(10, 10 - HORSE.cliffDrop - 0.5, 3, 0)).toBe('cliff');
    expect(terrainBlock(10, 13, 3, 0)).toBe('steep');
    expect(terrainBlock(10, 11, 3, 0.4)).toBe('ok');
    expect(terrainBlock(10, 8, 3, 0)).toBe('ok');
  });
});

describe('domar', () => {
  it('com energia cheia dá para domar; sem energia o cavalo derruba', () => {
    expect(tamingEnergy()).toBeLessThan(100);
    const st = { t: 0 };
    let energy = 100;
    let done = false;
    for (let i = 0; i < 400 && !done; i++) {
      const r = stepTaming(st, energy, DT);
      expect(r.failed).toBe(false);
      energy -= r.cost;
      done = r.done;
    }
    expect(done).toBe(true);
    expect(st.t).toBeGreaterThanOrEqual(TAMING.seconds);
    expect(stepTaming({ t: 0 }, TAMING.minEnergy - 1, DT).failed).toBe(true);
    // a energia acaba no meio
    const st2 = { t: 0 };
    let e2 = 40;
    let failed = false;
    for (let i = 0; i < 400 && !failed; i++) {
      const r = stepTaming(st2, e2, DT);
      e2 -= r.cost;
      failed = r.failed;
    }
    expect(failed).toBe(true);
  });
});

describe('dados da montaria', () => {
  it('cavalos montáveis têm visual, e as manadas usam cavalos existentes', () => {
    const horses = Object.values(CREATURES).filter((c) => c.mount);
    expect(horses.length).toBeGreaterThanOrEqual(4);
    for (const h of horses) {
      expect(h.rig).toBe('horse');
      expect(QUAD_LOOKS[h.id], h.id).toBeDefined();
    }
    expect(CREATURES.cavalo.mount).toBe('tame');
    const herds = CREATURE_ZONES.filter((z) => z.entries.some((e) => CREATURES[e.typeId]?.mount === 'wild'));
    expect(herds.length).toBeGreaterThanOrEqual(3);
    for (const z of herds) for (const e of z.entries) expect(CREATURES[e.typeId], e.typeId).toBeDefined();
    expect(new Set(HORSE_NAMES).size).toBe(HORSE_NAMES.length);
    // marchas crescentes
    for (let i = 1; i < HORSE_GEARS.length; i++) expect(HORSE_GEARS[i].speed).toBeGreaterThan(HORSE_GEARS[i - 1].speed);
  });
});
