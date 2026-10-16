import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Combat } from '../src/combat/Combat';
import { Health, type DamageInfo } from '../src/combat/Health';
import { Entity, type Faction } from '../src/core/Entity';
import { EntityManager } from '../src/core/EntityManager';
import { EventBus } from '../src/core/EventBus';
import { SPELL_COMBOS } from '../src/data/abilities';

/**
 * Regras do sistema de combate (Combat) com um contexto falso: golpe em arco, explosão,
 * feixe, raio em cadeia, molhado/vulnerável, parry e eventos de morte.
 * O "cenário" é uma parede infinita no plano x = wallX (linha de visão e raycast).
 */
function makeCtx(wallX = Infinity) {
  const events = new EventBus();
  const ctx: any = { scene: new THREE.Scene(), events, timeScale: 1, elapsed: 0, frame: 0 };
  ctx.entities = new EntityManager(ctx);
  const crosses = (ax: number, bx: number) => (ax - wallX) * (bx - wallX) < 0;
  ctx.physics = {
    lineOfSight: (a: THREE.Vector3, b: THREE.Vector3) => !crosses(a.x, b.x),
    raycast: (o: THREE.Vector3, d: THREE.Vector3, max: number) => {
      if (!isFinite(wallX) || Math.abs(d.x) < 1e-9) return null;
      const t = (wallX - o.x) / d.x;
      return t > 0 && t <= max ? { distance: t, point: o.clone().addScaledVector(d, t), kind: 'collider' } : null;
    },
    waterSurface: () => null,
    groundHeight: () => 0,
  };
  const noop = () => {};
  ctx.sys = {
    story: { is: () => false },
    progression: { getStat: () => 0 },
    env: { isRaining: () => false },
    vfx: { beam: noop, burst: noop, lightning: noop, ring: noop, sprite: noop, spark: noop, puff: noop, ribbonTrail: () => null, sustainedLight: () => null },
    audio: { play: noop },
    camera: {},
    player: { entity: null },
  };
  const combat = new Combat();
  combat.init(ctx);
  ctx.sys.combat = combat;
  return { ctx, combat: combat as Combat, events };
}

function mob(ctx: any, x: number, z: number, faction: Faction = 'bandit', hp = 100): Entity {
  const e = new Entity('enemy', faction);
  e.health = new Health(hp);
  e.health.maxPoise = e.health.poise = 1000;
  e.position.set(x, 0, z);
  ctx.entities.add(e);
  return e;
}

function hero(ctx: any): Entity {
  const p = new Entity('player', 'player');
  p.health = new Health(100);
  ctx.entities.add(p);
  return p;
}

const FWD = new THREE.Vector3(0, 0, 1);
const dmg = (amount: number, extra: Partial<DamageInfo> = {}): DamageInfo => ({ amount, type: 'physical', poiseDamage: 0, ...extra });

describe('Combat.meleeSweep', () => {
  it('acerta só hostis no arco e no alcance, uma vez por golpe', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const front = mob(ctx, 0, 2);
    const side = mob(ctx, 2, 0.3); // ~81° da frente: fora de um arco de 120°
    const behind = mob(ctx, 0, -2);
    const far = mob(ctx, 0, 4.5);
    const villager = mob(ctx, 0.5, 2, 'villager');
    const already = new Set<number>();
    const hits = combat.meleeSweep(p, p.position, FWD, 2.3, 120, dmg(10, { source: p, tag: 'melee' }), { alreadyHit: already });
    expect(hits).toEqual([front]);
    expect(front.health!.current).toBe(90);
    for (const e of [side, behind, far, villager]) expect(e.health!.current).toBe(100);
    // mesmo conjunto alreadyHit: não acerta de novo no mesmo golpe
    expect(combat.meleeSweep(p, p.position, FWD, 2.3, 120, dmg(10, { source: p }), { alreadyHit: already })).toEqual([]);
    // 360°: acerta em volta (inclusive atrás)
    const all = combat.meleeSweep(p, p.position, FWD, 2.3, 360, dmg(1, { source: p }));
    expect(all).toContain(behind);
    expect(all).toContain(side);
    expect(all).not.toContain(villager);
  });

  it('não acerta através de parede', () => {
    const { ctx, combat } = makeCtx(1);
    const p = hero(ctx);
    const blocked = mob(ctx, 1.8, 0.4); // do outro lado de x = 1
    const free = mob(ctx, -0.3, 1.8);
    const hits = combat.meleeSweep(p, p.position, FWD, 2.5, 200, dmg(10, { source: p }));
    expect(hits).toEqual([free]);
    expect(blocked.health!.current).toBe(100);
  });

  it('modify ajusta o dano por alvo numa cópia (crítico condicional)', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const rooted = mob(ctx, -0.4, 1.8);
    const free = mob(ctx, 0.4, 1.8);
    rooted.health!.addStatus('root', 3);
    const info = dmg(10, { source: p });
    let crits = 0;
    combat.meleeSweep(p, p.position, FWD, 2.5, 120, info, {
      modify: (e, i) => {
        if (e.health!.has('root')) {
          i.amount *= 1.5;
          i.crit = true;
          crits++;
        }
      },
    });
    expect(rooted.health!.current).toBe(85);
    expect(free.health!.current).toBe(90);
    expect(crits).toBe(1);
    expect(info.amount).toBe(10); // o original não muda
    expect(info.crit).toBeUndefined();
  });

  it('respeita maxTargets (mais perto primeiro)', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const a = mob(ctx, 0, 1.5);
    mob(ctx, 0.4, 2.2);
    mob(ctx, -0.4, 2.2);
    const hits = combat.meleeSweep(p, p.position, FWD, 2.5, 120, dmg(5, { source: p }), { maxTargets: 1 });
    expect(hits).toEqual([a]);
  });
});

describe('Combat.explode', () => {
  it('queda linear com a distância, sem ferir a fonte nem quem está fora do raio', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const near = mob(ctx, 0.3, 0);
    const mid = mob(ctx, 2.5, 0);
    const out = mob(ctx, 7, 0);
    const hits = combat.explode(new THREE.Vector3(0, 0.5, 0), 4, dmg(40, { type: 'arcane' }), p, { falloff: true });
    expect(hits).toContain(near);
    expect(hits).toContain(mid);
    expect(hits).not.toContain(out);
    expect(p.health!.current).toBe(100);
    const dNear = 100 - near.health!.current;
    const dMid = 100 - mid.health!.current;
    expect(dNear).toBe(40); // dentro do corpo: sem queda
    expect(dMid).toBeLessThan(dNear);
    expect(dMid).toBeGreaterThanOrEqual(40 * 0.4 - 0.05); // piso de 40%
  });

  it('parede protege quem está atrás (exceto ignoreWalls)', () => {
    const { ctx, combat } = makeCtx(1.5);
    const p = hero(ctx);
    const behindWall = mob(ctx, 3, 0);
    combat.explode(new THREE.Vector3(0, 0, 0), 5, dmg(20, { type: 'fire' }), p);
    expect(behindWall.health!.current).toBe(100);
    combat.explode(new THREE.Vector3(0, 0, 0), 5, dmg(20, { type: 'void' }), p, { ignoreWalls: true });
    expect(behindWall.health!.current).toBe(80);
  });
});

describe('Combat.beamAttack', () => {
  it('perfura todos em linha (ordem por distância) e para na parede', () => {
    const { ctx, combat } = makeCtx(10);
    const p = hero(ctx);
    const a = mob(ctx, 3, 0.2);
    const b = mob(ctx, 6, -0.3);
    const c = mob(ctx, 12, 0); // atrás da parede (x = 10)
    const off = mob(ctx, 5, 3); // fora da largura
    const order: Entity[] = [];
    const res = combat.beamAttack(p, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), 30, 0.5, dmg(25, { type: 'arcane' }), { visual: false, onHit: (e) => order.push(e) });
    expect(res.hits).toEqual([a, b]);
    expect(order).toEqual([a, b]);
    expect(res.blocked).toBe(true);
    expect(res.end.x).toBeCloseTo(10, 3);
    expect(c.health!.current).toBe(100);
    expect(off.health!.current).toBe(100);
  });

  it('pierce: false para no primeiro alvo', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const a = mob(ctx, 3, 0);
    const b = mob(ctx, 6, 0);
    const res = combat.beamAttack(p, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), 30, 0.4, dmg(10), { visual: false, pierce: false });
    expect(res.hits).toEqual([a]);
    expect(res.end.x).toBeLessThan(4);
    expect(b.health!.current).toBe(100);
  });
});

describe('Combat.applyDamage', () => {
  it('elétrico em alvo molhado ×1,5 e vulnerável soma dano', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const e = mob(ctx, 2, 0);
    combat.mark(e, 'wet', 5);
    expect(combat.isWet(e)).toBe(true);
    expect(combat.applyDamage(e, dmg(20, { type: 'lightning', source: p }))!.dealt).toBe(20 * SPELL_COMBOS.wetLightningMul);
    const f = mob(ctx, 3, 0);
    f.health!.addStatus('vulnerable', 5, 0.25);
    expect(combat.applyDamage(f, dmg(20, { type: 'arcane', source: p }))!.dealt).toBe(25);
  });

  it('chuva molha todos (env.isRaining)', () => {
    const { ctx, combat } = makeCtx();
    const e = mob(ctx, 2, 0);
    ctx.sys.env.isRaining = () => true;
    expect(combat.applyDamage(e, dmg(10, { type: 'lightning' }))!.dealt).toBe(15);
  });

  it('parry atordoa o atacante e emite combat:parry; morte emite eventos', () => {
    const { ctx, combat, events } = makeCtx();
    const p = hero(ctx);
    const e = mob(ctx, 0, 1.5);
    p.yaw = 0; // olhando para +Z (para o inimigo)
    p.health!.blocking = true;
    p.health!.parryWindow = 0.2;
    let parried = 0;
    events.on('combat:parry', () => parried++);
    const r = combat.applyDamage(p, dmg(30, { source: e }))!;
    expect(r.parried).toBe(true);
    expect(p.health!.current).toBe(100);
    expect(e.health!.staggered).toBe(true);
    expect(parried).toBe(1);
    const killed: string[] = [];
    events.on('entity:death', () => killed.push('death'));
    events.on('enemy:killed', (k) => killed.push(k.killer === p ? 'killedByPlayer' : 'killed'));
    combat.applyDamage(e, dmg(500, { source: p }));
    expect(e.alive).toBe(false);
    expect(killed).toEqual(['death', 'killedByPlayer']);
    expect(combat.stats.kills).toBe(1);
  });

  it('neutro atacado fica hostil ao agressor', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const deer = mob(ctx, 2, 0, 'neutral');
    expect(combat.isHostile(p, deer)).toBe(false);
    combat.applyDamage(deer, dmg(5, { source: p }));
    expect(combat.isHostile(p, deer)).toBe(true);
  });
});

describe('Combat.chainLightning', () => {
  it('salta para os hostis mais próximos dentro do alcance', () => {
    const { ctx, combat } = makeCtx();
    const p = hero(ctx);
    const first = mob(ctx, 10, 0);
    const second = mob(ctx, 13, 0);
    const third = mob(ctx, 15, 1);
    const tooFar = mob(ctx, 40, 0);
    const hit = combat.chainLightning(p, first, 3, 6, { amount: 10, type: 'lightning', poiseDamage: 0 });
    expect(hit).toEqual([second, third]);
    expect(first.health!.current).toBe(100); // a origem não é atingida pela cadeia
    expect(second.health!.current).toBe(90);
    expect(tooFar.health!.current).toBe(100);
  });
});
