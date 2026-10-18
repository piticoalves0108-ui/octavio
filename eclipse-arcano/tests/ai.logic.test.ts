import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AttackTokens, PlayerStyle, attackWeight, ballisticPitch, chooseAttack, closestApproach, flightTime, hourIn, inViewCone, needsMeleeToken, type AttackChoiceContext } from '../src/ai/logic';
import { EnemyHealth } from '../src/ai/EnemyHealth';
import { AI_RULES, ENEMIES, type AttackDef } from '../src/data/enemies';

/** Gerador pseudoaleatório determinístico (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ctx(over: Partial<AttackChoiceContext> = {}): AttackChoiceContext {
  return { dist: 2, heightDiff: 0, los: true, blockBias: 0, rangedBias: 0, lastId: null, repeat: 0, random: rng(7), ...over };
}

const atk = (o: Partial<AttackDef>): AttackDef => ({
  id: 'a',
  anim: 'slash',
  kind: 'melee',
  damage: 10,
  type: 'physical',
  minRange: 0,
  maxRange: 3,
  reach: 2.5,
  arc: 90,
  windup: 0.4,
  active: 0.1,
  recovery: 0.5,
  cooldown: 2,
  weight: 1,
  ...o,
});

describe('escolha de ataque (logic.chooseAttack)', () => {
  const quick = atk({ id: 'rapido', weight: 3 });
  const heavy = atk({ id: 'pesado', weight: 1, unblockable: true, heavy: true });
  const shot = atk({ id: 'tiro', kind: 'projectile', minRange: 4, maxRange: 30, weight: 2 });
  const leap = atk({ id: 'salto', kind: 'leap', minRange: 4, maxRange: 10, weight: 1 });
  const counter = atk({ id: 'riposta', counterOnly: true, weight: 5 });
  const list = [quick, heavy, shot, leap, counter];

  it('respeita alcance, recarga, linha de visão, altura e ataques especiais', () => {
    const cds = new Float32Array(list.length);
    expect(attackWeight(quick, 0, ctx({ dist: 2 }))).toBeGreaterThan(0);
    expect(attackWeight(quick, 0, ctx({ dist: 5 }))).toBe(0); // fora do alcance
    expect(attackWeight(quick, 1, ctx())).toBe(0); // em recarga
    expect(attackWeight(shot, 0, ctx({ dist: 10, los: false }))).toBe(0); // sem visão não atira
    expect(attackWeight(shot, 0, ctx({ dist: 10 }))).toBeGreaterThan(0);
    expect(attackWeight(quick, 0, ctx({ heightDiff: 4 }))).toBe(0); // alvo voando alto: corpo a corpo não alcança
    expect(attackWeight(shot, 0, ctx({ dist: 10, heightDiff: 8 }))).toBeGreaterThan(0);
    expect(attackWeight(counter, 0, ctx())).toBe(0); // só como contra-ataque
    cds.fill(9);
    expect(chooseAttack(list, cds, ctx())).toBe(-1);
  });

  it('anti-repetição: o mesmo golpe perde peso a cada repetição', () => {
    const w0 = attackWeight(quick, 0, ctx());
    const w1 = attackWeight(quick, 0, ctx({ lastId: 'rapido', repeat: 1 }));
    const w2 = attackWeight(quick, 0, ctx({ lastId: 'rapido', repeat: 2 }));
    expect(w1).toBeLessThan(w0 * 0.5);
    expect(w2).toBeLessThan(w1);
  });

  it('escolha ponderada: frequências acompanham os pesos (±5%)', () => {
    const cds = new Float32Array(list.length);
    const r = rng(42);
    const n = 20000;
    let q = 0;
    for (let i = 0; i < n; i++) if (chooseAttack(list, cds, ctx({ random: r })) === 0) q++;
    expect(q / n).toBeGreaterThan(0.7);
    expect(q / n).toBeLessThan(0.8); // 3 / (3 + 1) = 0,75
  });

  it('adaptação: jogador que bloqueia muito recebe mais golpes imbloqueáveis', () => {
    const cds = new Float32Array(list.length);
    const count = (blockBias: number) => {
      const r = rng(3);
      let h = 0;
      for (let i = 0; i < 10000; i++) if (chooseAttack(list, cds, ctx({ blockBias, random: r })) === 1) h++;
      return h / 10000;
    };
    const calm = count(0);
    const turtle = count(1);
    expect(turtle).toBeGreaterThan(calm * 2);
  });

  it('adaptação: jogador que luta de longe atrai ataques que fecham distância', () => {
    const base = attackWeight(leap, 0, ctx({ dist: 8 }));
    const adapted = attackWeight(leap, 0, ctx({ dist: 8, rangedBias: 1 }));
    expect(adapted).toBeCloseTo(base * 3, 5);
  });

  it('tokens corpo a corpo: melee/leap/charge pedem token; projéteis não', () => {
    expect(needsMeleeToken(quick)).toBe(true);
    expect(needsMeleeToken(leap)).toBe(true);
    expect(needsMeleeToken(shot)).toBe(false);
    expect(needsMeleeToken(atk({ token: false }))).toBe(false);
  });
});

describe('tokens de ataque (AttackTokens)', () => {
  it('no máximo N atacantes por alvo; renovar não conta duas vezes; liberar abre vaga', () => {
    const t = new AttackTokens({ melee: AI_RULES.meleeTokens, ranged: AI_RULES.rangedTokens });
    expect(AI_RULES.meleeTokens).toBe(2);
    expect(t.request(1, 100, 'melee', 0)).toBe(true);
    expect(t.request(2, 100, 'melee', 0)).toBe(true);
    expect(t.request(3, 100, 'melee', 0)).toBe(false);
    expect(t.request(1, 100, 'melee', 1)).toBe(true); // renovação
    expect(t.count(100, 'melee')).toBe(2);
    expect(t.request(3, 200, 'melee', 0)).toBe(true); // outro alvo
    expect(t.request(4, 100, 'ranged', 0)).toBe(true); // categoria separada
    t.release(2);
    expect(t.request(5, 100, 'melee', 0)).toBe(true);
    expect(t.holds(5, 'melee')).toBe(true);
  });

  it('expira tokens antigos ou de atacantes mortos', () => {
    const t = new AttackTokens({ melee: 2, ranged: 3 });
    t.request(1, 9, 'melee', 0);
    t.request(2, 9, 'melee', 3);
    t.expire(5, 4);
    expect(t.holds(1)).toBe(false);
    expect(t.holds(2)).toBe(true);
    t.expire(5, 4, (id) => id !== 2);
    expect(t.size).toBe(0);
  });
});

describe('adaptação ao estilo do jogador (PlayerStyle)', () => {
  it('bloquear muito sobe o viés de bloqueio; levar golpes abaixa', () => {
    const s = new PlayerStyle(AI_RULES.adapt);
    for (let i = 0; i < 10; i++) s.onEnemyHit(true);
    expect(s.block).toBeGreaterThan(0.5);
    const b = s.block;
    s.onEnemyHit(false);
    expect(s.block).toBeLessThan(b);
  });

  it('conjurar de longe e repetir a mesma habilidade são lembrados e decaem com o tempo', () => {
    const s = new PlayerStyle(AI_RULES.adapt);
    for (let i = 0; i < 8; i++) s.onPlayerRanged('arcaneOrb', 15, i);
    expect(s.ranged).toBeGreaterThan(0.4);
    expect(s.repeatOf('arcaneOrb')).toBeCloseTo(1, 5);
    s.onPlayerRanged('fireball', 15, 9);
    expect(s.repeatOf('arcaneOrb')).toBeLessThan(1);
    s.onPlayerMelee();
    for (let i = 0; i < 600; i++) s.decay(0.1);
    expect(s.ranged).toBe(0);
    expect(s.repeatOf('arcaneOrb')).toBe(0);
  });
});

describe('mira e percepção', () => {
  it('ballisticPitch: a flecha com gravidade cai no alvo (simulação)', () => {
    for (const [dx, dy] of [
      [12, 0],
      [25, 3],
      [30, -4],
    ]) {
      const v = 30;
      const g = 9;
      const p = ballisticPitch(dx, dy, v, g)!;
      expect(p).not.toBeNull();
      const t = flightTime(dx, v, p);
      const y = v * Math.sin(p) * t - 0.5 * g * t * t;
      expect(Math.abs(y - dy)).toBeLessThan(0.05);
    }
    expect(ballisticPitch(500, 0, 20, 9.8)).toBeNull(); // fora de alcance
  });

  it('cone de visão', () => {
    const cos = Math.cos((120 * Math.PI) / 360);
    expect(inViewCone(0, 1, 0, 10, cos)).toBe(true);
    expect(inViewCone(0, 1, 5, 5, cos)).toBe(true); // 45°
    expect(inViewCone(0, 1, 10, 0, cos)).toBe(false); // 90°
    expect(inViewCone(0, 1, 0, -10, cos)).toBe(false); // de costas
  });

  it('aproximação mais próxima de projétil (decide esquivar)', () => {
    const out = { t: 0, d2: 0 };
    // projétil a 10 m vindo direto a 20 m/s: impacto em 0,5 s
    closestApproach(0, 0, 10, 0, 0, -20, 0.8, out);
    expect(out.t).toBeCloseTo(0.5, 5);
    expect(out.d2).toBeCloseTo(0, 5);
    // passando de lado a 3 m
    closestApproach(3, 0, 10, 0, 0, -20, 0.8, out);
    expect(Math.sqrt(out.d2)).toBeCloseTo(3, 5);
    // se afastando: ponto mais próximo é agora
    closestApproach(0, 0, 10, 0, 0, 20, 0.8, out);
    expect(out.t).toBe(0);
  });

  it('janelas de horário com virada da meia-noite', () => {
    expect(hourIn(23, 20, 5)).toBe(true);
    expect(hourIn(3, 20, 5)).toBe(true);
    expect(hourIn(12, 20, 5)).toBe(false);
    expect(hourIn(6, 5, 8.5)).toBe(true);
    expect(hourIn(9, 5, 8.5)).toBe(false);
  });
});

describe('vida dos inimigos (EnemyHealth)', () => {
  const fwd = new THREE.Vector3(0, 0, 1);
  it('ponto fraco nas costas multiplica o dano e marca info.weakPoint', () => {
    const h = new EnemyHealth(1000);
    h.weakSide = 'back';
    h.weakMul = 1.5;
    const front = h.applyDamage({ amount: 20, type: 'arcane', direction: new THREE.Vector3(0, 0, -1) }, fwd);
    const info = { amount: 20, type: 'arcane' as const, direction: new THREE.Vector3(0, 0, 1) };
    const back = h.applyDamage(info, fwd);
    expect(front.dealt).toBe(20);
    expect(back.dealt).toBe(30);
    expect((info as { weakPoint?: boolean }).weakPoint).toBe(true);
    expect(info.amount).toBe(20); // não altera o DamageInfo original
  });

  it('núcleo exposto (superaquecimento), escudo −90% e piso de vida', () => {
    const h = new EnemyHealth(1000);
    h.exposedMul = 2;
    expect(h.applyDamage({ amount: 10, type: 'arcane' }, fwd).dealt).toBe(20);
    h.exposedMul = 0;
    h.extraMul = 0.1;
    expect(h.applyDamage({ amount: 100, type: 'arcane' }, fwd).dealt).toBe(10);
    h.extraMul = 1;
    h.floor = 500;
    const r = h.applyDamage({ amount: 9999, type: 'arcane' }, fwd);
    expect(h.current).toBe(500);
    expect(r.killed).toBe(false);
  });

  it('resistência a lentidão (chefe sofre slow reduzido)', () => {
    const h = new EnemyHealth(100);
    h.slowResist = 0.5;
    h.addStatus('slow', 4, 0.6);
    expect(h.statusMagnitude('slow')).toBeCloseTo(0.3, 5);
    expect(h.moveMultiplier()).toBeGreaterThan(0.6);
  });

  it('armadura do autômato resiste a físico; raio é fraqueza', () => {
    const d = ENEMIES['automato_sentinela'];
    expect(d.resist.lightning ?? 0).toBeLessThan(0);
    expect((d.resist.physical ?? 0) > 0 || d.armor > 0).toBe(true);
    expect(d.weakPoint?.side).toBe('back');
    expect(d.weakPoint?.mul).toBeCloseTo(1.5, 5);
  });
});
