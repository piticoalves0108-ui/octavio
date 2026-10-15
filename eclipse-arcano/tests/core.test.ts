import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Health } from '../src/combat/Health';
import { SaveSystem, memoryStorage, checksum } from '../src/save/SaveSystem';
import { EventBus } from '../src/core/EventBus';
import { Entity } from '../src/core/Entity';
import { EntityManager } from '../src/core/EntityManager';
import type { Saveable } from '../src/core/context';

describe('Health', () => {
  it('aplica resistências, armadura e fraquezas', () => {
    const h = new Health(100);
    h.resist.fire = 0.5;
    h.resist.lightning = -0.5;
    expect(h.applyDamage({ amount: 20, type: 'fire' }).dealt).toBe(10);
    expect(h.applyDamage({ amount: 20, type: 'lightning' }).dealt).toBe(30);
    h.armor = 5;
    expect(h.applyDamage({ amount: 20, type: 'physical' }).dealt).toBe(15);
  });

  it('bloqueio frontal reduz dano, parry anula, golpe pelas costas passa', () => {
    const h = new Health(100);
    h.blocking = true;
    h.blockReduction = 0.75;
    const facing = new THREE.Vector3(0, 0, 1);
    const fromFront = new THREE.Vector3(0, 0, -1); // atacante à frente, golpe vindo em direção -Z
    const fromBack = new THREE.Vector3(0, 0, 1);
    const r1 = h.applyDamage({ amount: 40, type: 'physical', direction: fromFront }, facing);
    expect(r1.blocked).toBe(true);
    expect(r1.dealt).toBe(10);
    const r2 = h.applyDamage({ amount: 40, type: 'physical', direction: fromBack }, facing);
    expect(r2.blocked).toBe(false);
    h.parryWindow = 0.2;
    const r3 = h.applyDamage({ amount: 40, type: 'physical', direction: fromFront }, facing);
    expect(r3.parried).toBe(true);
    expect(r3.dealt).toBe(0);
  });

  it('escudo absorve antes da vida; invulnerabilidade ignora', () => {
    const h = new Health(100);
    h.shield = 15;
    const r = h.applyDamage({ amount: 20, type: 'arcane' });
    expect(r.absorbed).toBe(15);
    expect(h.current).toBe(95);
    h.invulnerable = 0.3;
    expect(h.applyDamage({ amount: 50, type: 'arcane' }).immune).toBe(true);
    expect(h.current).toBe(95);
  });

  it('quebra de postura causa stagger e estados expiram', () => {
    const h = new Health(100);
    h.maxPoise = h.poise = 10;
    const r = h.applyDamage({ amount: 5, type: 'physical', poiseDamage: 12, statuses: [{ id: 'burn', duration: 1, magnitude: 4 }] });
    expect(r.staggered).toBe(true);
    expect(h.canAct()).toBe(false);
    const dots: any[] = [];
    h.update(0.6, dots);
    expect(dots.length).toBe(1);
    expect(dots[0].type).toBe('fire');
    h.update(1, dots);
    expect(h.has('burn')).toBe(false);
    expect(h.canAct()).toBe(true);
  });

  it('morte e imortalidade', () => {
    const h = new Health(30);
    h.immortal = true;
    h.applyDamage({ amount: 999, type: 'void' });
    expect(h.current).toBe(1);
    h.immortal = false;
    expect(h.applyDamage({ amount: 999, type: 'void' }).killed).toBe(true);
  });
});

function fakeCtx() {
  const events = new EventBus();
  const ctx: any = {
    events,
    state: 'playing',
    input: { pressed: () => false },
    sys: {
      player: { refreshStats() {}, state: 'ground' },
      quests: { tracked: null, getJournal: () => [] },
      progression: { level: 3 },
      world: { currentLocation: { name: 'Vila' } },
      ai: { inCombat: () => false, activeBoss: () => null },
    },
  };
  return ctx;
}

class Counter implements Saveable {
  saveKey = 'counter';
  value = 0;
  serialize() {
    return { value: this.value };
  }
  deserialize(d: any) {
    if (typeof d?.value !== 'number') throw new Error('inválido');
    this.value = d.value;
  }
}

describe('SaveSystem', () => {
  it('salva e carrega (ida e volta)', () => {
    const storage = memoryStorage();
    const save = new SaveSystem(storage);
    const ctx = fakeCtx();
    save.init(ctx);
    const c = new Counter();
    save.register(c);
    c.value = 42;
    expect(save.save('slot1')).toBe(true);
    c.value = 0;
    expect(save.load('slot1')).toBe(true);
    expect(c.value).toBe(42);
    expect(save.listSaves()[0].level).toBe(3);
  });

  it('usa o backup se o principal estiver corrompido', () => {
    const storage = memoryStorage();
    const save = new SaveSystem(storage);
    save.init(fakeCtx());
    const c = new Counter();
    save.register(c);
    c.value = 1;
    save.save('s');
    c.value = 2;
    save.save('s'); // backup agora tem value=1
    storage.set('eclipse-arcano:save:s', storage.get('eclipse-arcano:save:s')!.replace('"value":2', '"value":9'));
    c.value = 0;
    expect(save.load('s')).toBe(true);
    expect(c.value).toBe(1);
  });

  it('dados inválidos são rejeitados e o estado anterior restaurado', () => {
    const storage = memoryStorage();
    const save = new SaveSystem(storage);
    save.init(fakeCtx());
    const c = new Counter();
    save.register(c);
    const data = { counter: { value: 'x' }, __save: { playTime: 1 } };
    const file = { version: 1, meta: { slot: 'bad' }, data, checksum: checksum(JSON.stringify(data)) };
    storage.set('eclipse-arcano:save:bad', JSON.stringify(file));
    c.value = 7;
    expect(save.load('bad')).toBe(false);
    expect(c.value).toBe(7);
  });

  it('rejeita saveKey duplicado', () => {
    const save = new SaveSystem(memoryStorage());
    save.register(new Counter());
    expect(() => save.register(new Counter())).toThrow();
  });
});

describe('EntityManager', () => {
  it('consulta por raio e escalona tiers por distância', () => {
    const ctx: any = { scene: new THREE.Scene(), sys: { combat: { applyDamage() {} } } };
    const em = new EntityManager(ctx);
    const near = new Entity('enemy', 'bandit');
    near.position.set(5, 0, 5);
    const far = new Entity('enemy', 'bandit');
    far.position.set(500, 0, 0);
    let nearUpdates = 0;
    let farUpdates = 0;
    near.update = () => void nearUpdates++;
    far.update = () => void farUpdates++;
    em.add(near);
    em.add(far);
    expect(em.queryRadius(new THREE.Vector3(0, 0, 0), 10)).toEqual([near]);
    for (let i = 0; i < 30; i++) em.update(1 / 60);
    expect(nearUpdates).toBe(30);
    expect(farUpdates).toBe(0);
    expect(far.object3d.visible).toBe(false);
    em.remove(near);
    em.update(1 / 60);
    expect(em.all.length).toBe(1);
  });
});
