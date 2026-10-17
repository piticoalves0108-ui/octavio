import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { DamageInfo, DamageResult } from '../combat/Health';
import type { AttackDef } from '../data/enemies';
import type { ExtraAnim } from './rigs/anim';
import type { Enemy } from './Enemy';
import { V1, V2, V5, clamp, dist2XZ, distXZ, groundAt, isDeepWater, rand, visibleToCamera, yawTo } from './shared';

/**
 * Comportamentos especiais por tipo: uivo do Alfa (chama/fortalece a matilha), teleporte e
 * escudo do Mago Corrompido, furtividade do Espreitador (bate e some), bomba de fumaça,
 * reforços e rendição da Ravena (contrato C3).
 */
export type SpecialKind = 'none' | 'teleport' | 'shield' | 'howl' | 'smoke';

export interface SpecialState {
  kind: SpecialKind;
  t: number;
  /** Duração das fases [antecipação, ativa, recuperação]. */
  w: number;
  a: number;
  r: number;
  fired: boolean;
  anim: ExtraAnim;
  animPhase: 0 | 1 | 2;
  animT: number;
  teleportCd: number;
  shieldCd: number;
  howlCd: number;
  smokeCd: number;
  summoned: number;
  vanishT: number;
  revealT: number;
  reinforced: boolean;
  surrendered: boolean;
  hitAndRun: boolean;
  startAggro: boolean;
  /** Ignora a trela (inimigos de missão/reforços). */
  noLeash: boolean;
  /** Debandou (aliados da Ravena rendida): foge e some. */
  standDown: boolean;
  shieldTarget: Enemy | null;
}

export function makeSpecialState(): SpecialState {
  return {
    kind: 'none',
    t: 0,
    w: 0,
    a: 0,
    r: 0,
    fired: false,
    anim: 'none',
    animPhase: 0,
    animT: 0,
    teleportCd: rand(0.2, 0.7),
    shieldCd: rand(3, 6),
    howlCd: rand(2, 4),
    smokeCd: rand(5, 8),
    summoned: 0,
    vanishT: 0,
    revealT: 0,
    reinforced: false,
    surrendered: false,
    hitAndRun: false,
    startAggro: false,
    noLeash: false,
    standDown: false,
    shieldTarget: null,
  };
}

const _near: import('../core/Entity').Entity[] = [];

function begin(e: Enemy, kind: SpecialKind, anim: ExtraAnim, w: number, a: number, r: number) {
  const s = e.sp;
  e.cancelAction();
  e.act = 'special';
  s.kind = kind;
  s.t = 0;
  s.w = w;
  s.a = a;
  s.r = r;
  s.fired = false;
  s.anim = anim;
  s.animPhase = 0;
  s.animT = 0;
}

/** Decide um especial no turno de pensar do combate. Retorna true se começou um. */
export function specialsThink(e: Enemy, dist: number, ctx: GameContext): boolean {
  const sp = e.def.special;
  const s = e.sp;
  const t = e.target;
  if (!t) return false;
  // espreitador: bate e recua, depois volta a se esconder
  if (s.hitAndRun) {
    s.hitAndRun = false;
    e.fleeT = rand(1.2, 2);
    e.setState('flee');
    return true;
  }
  if (sp?.stealth && !e.stealthed && s.revealT > 4 && dist > 7 && e.sinceHurt > 3) {
    e.setStealth(true);
    ctx.sys.vfx.burst('smoke', e.getCenter(V1), { scale: 0.7, color: 0x302838 });
  }
  if (!sp) return false;
  if (sp.howl && s.howlCd <= 0 && e.combatT > 1.5) {
    const a = e.def.attacks.find((x) => x.kind === 'buff');
    begin(e, 'howl', 'howl' as ExtraAnim, a?.windup ?? 0.6, a?.active ?? 1.2, a?.recovery ?? 0.4);
    s.howlCd = sp.howl.cooldown * rand(0.9, 1.2);
    return true;
  }
  if (sp.teleportWhenSurrounded && s.teleportCd <= 0 && dist < sp.teleportWhenSurrounded.radius) {
    const a = e.def.attacks.find((x) => x.anim === 'teleport');
    begin(e, 'teleport', 'teleport', a?.windup ?? 0.35, a?.active ?? 0.1, a?.recovery ?? 0.3);
    s.teleportCd = sp.teleportWhenSurrounded.cooldown * rand(0.9, 1.2);
    return true;
  }
  if (sp.shieldAlly && s.shieldCd <= 0) {
    const ally = pickShieldAlly(e, sp.shieldAlly.radius, ctx);
    s.shieldCd = 2;
    if (ally) {
      s.shieldTarget = ally;
      begin(e, 'shield', 'cast', 0.6, 0.1, 0.4);
      s.shieldCd = sp.shieldAlly.cooldown * rand(0.9, 1.2);
      return true;
    }
  }
  if (sp.smoke && s.smokeCd <= 0 && e.health.fraction < sp.smoke.belowFraction && (e.sinceHurt < 1.2 || dist < 2.5) && Math.random() < 0.55) {
    const a = e.def.attacks.find((x) => x.anim === 'smoke');
    begin(e, 'smoke', 'smoke', a?.windup ?? 0.3, sp.smoke.vanish, 0.25);
    s.smokeCd = sp.smoke.cooldown * rand(0.9, 1.2);
    return true;
  }
  return false;
}

function pickShieldAlly(e: Enemy, radius: number, ctx: GameContext): Enemy | null {
  let best: Enemy | null = null;
  let bestScore = 0;
  for (const o of e.ai.enemies) {
    if (o === e || !o.alive || o.deadT >= 0 || !o.engaged) continue;
    if (!o.health || o.health.shield > 5) continue;
    if (dist2XZ(o.position, e.position) > radius * radius) continue;
    if (!(ctx.sys.combat.isHostile(o, e) === false)) continue;
    const score = (1 - o.health.fraction) + (o.sinceHurt < 2 ? 0.5 : 0) + (o.elite ? 0.3 : 0);
    if (score > bestScore + 0.15) {
      bestScore = score;
      best = o;
    }
  }
  return best;
}

/** Avança o especial em curso e os temporizadores. */
export function specialsUpdate(e: Enemy, dt: number, ctx: GameContext) {
  const s = e.sp;
  s.teleportCd -= dt;
  s.shieldCd -= dt;
  s.howlCd -= dt;
  s.smokeCd -= dt;
  if (!e.stealthed) s.revealT += dt;
  else s.revealT = 0;
  // espreitador revelado ao chegar perto
  const st = e.def.special?.stealth;
  if (st && e.stealthed && e.target && distXZ(e.position, e.target.position) < st.revealRange * 0.45) e.setStealth(false);
  if (e.act !== 'special') return;
  const mul = e.health.actionMultiplier();
  s.t += dt * mul;
  const t = s.t;
  if (t < s.w) {
    s.animPhase = 0;
    s.animT = clamp(t / Math.max(0.05, s.w), 0, 1);
    e.charge = 0.6 * s.animT;
    e.chargeColor = s.kind === 'shield' ? 0xc060ff : s.kind === 'howl' ? 0xff4060 : 0xa0a0ff;
    if (e.target) e.faceYaw = yawTo(e.position.x, e.position.z, e.target.position.x, e.target.position.z);
    return;
  }
  if (!s.fired) {
    s.fired = true;
    e.charge = 0;
    fire(e, ctx);
  }
  if (t < s.w + s.a) {
    s.animPhase = 1;
    s.animT = clamp((t - s.w) / Math.max(0.05, s.a), 0, 1);
    if (s.kind === 'smoke') vanishing(e, dt, ctx);
    return;
  }
  if (s.kind === 'smoke' && e.hidden) reappear(e, ctx);
  if (t < s.w + s.a + s.r) {
    s.animPhase = 2;
    s.animT = clamp((t - s.w - s.a) / Math.max(0.05, s.r), 0, 1);
    return;
  }
  e.act = 'none';
  s.kind = 'none';
  s.anim = 'none';
}

function fire(e: Enemy, ctx: GameContext) {
  const s = e.sp;
  const vfx = ctx.sys.vfx;
  switch (s.kind) {
    case 'howl':
      howl(e, ctx);
      break;
    case 'teleport':
      teleportAway(e, ctx);
      break;
    case 'shield': {
      const ally = s.shieldTarget;
      const amount = e.def.special?.shieldAlly?.amount ?? 40;
      if (ally && ally.alive && ally.health) {
        const h = ally.health;
        h.shield = Math.max(h.shield, amount);
        h.shieldMax = Math.max(h.shieldMax, amount);
        h.shieldDecay = amount / 12;
        ally.getCenter(V2);
        vfx.shell(V2, ally.radius + 0.4, ally.radius + 0.9, 0xb040ff, 0.7, 0.6);
        vfx.chain(e.rig.muzzle(V1), V2, 0xc060ff, 0.45, 0.1);
        ctx.sys.audio.play('cast_shield', { position: ally.position, volume: 0.6 });
      }
      s.shieldTarget = null;
      break;
    }
    case 'smoke':
      vfx.burst('smoke', e.getCenter(V1), { scale: 2.6, count: 40, color: 0x2a2630 });
      for (let i = 0; i < 6; i++) {
        V2.set(e.position.x + rand(-1.5, 1.5), e.position.y + rand(0.2, 1.6), e.position.z + rand(-1.5, 1.5));
        vfx.puff(V2, 0x34303a, rand(1.6, 2.6), rand(1.6, 2.4), 0.55, 0.4);
      }
      ctx.sys.audio.play('explosion', { position: e.position, volume: 0.35, pitch: 1.6 });
      e.hidden = true;
      e.rig.root.visible = false;
      e.queryable = false;
      e.health.invulnerable = Math.max(e.health.invulnerable, s.a + 0.2);
      e.ai.releaseAttackToken(e);
      break;
  }
}

/** Uivo do Alfa: fortalece lobos próximos, chama-os para a luta e invoca reforços. */
function howl(e: Enemy, ctx: GameContext) {
  const H = e.def.special!.howl!;
  const t = e.target;
  ctx.sys.audio.play('creature_call', { position: e.position, pitch: 0.55, volume: 1 });
  ctx.sys.vfx.ring(e.position, 12, 0xff4060, 0.8);
  ctx.sys.vfx.burst('corruption', e.getCenter(V1), { scale: 1.4, color: 0xff3050 });
  let wolves = 0;
  for (const o of e.ai.enemies) {
    if (!o.alive || o.deadT >= 0 || o.def.faction !== 'wild' || o.def.rig !== 'wolf') continue;
    if (dist2XZ(o.position, e.position) > H.radius * H.radius) continue;
    o.health.addStatus('empowered', H.duration, H.empowered);
    if (t && o !== e) o.engage(t, false, rand(0.1, 0.5));
    wolves++;
  }
  e.health.addStatus('empowered', H.duration, H.empowered);
  // invoca reforços se a matilha estiver pequena (limite por luta)
  if (t && wolves < 4 && e.sp.summoned < 4) {
    const n = Math.min(H.summon, 4 - e.sp.summoned);
    for (let i = 0; i < n; i++) {
      if (!pointAround(ctx, t.position, 16, 24, V5)) continue;
      const w = e.ai.spawnEnemy('lobo_sombrio', V5.clone(), { aggro: true });
      if (w) e.sp.summoned++;
    }
  }
  ctx.events.emit('ui:notify', { text: 'O Alfa uiva — a matilha responde!', kind: 'warning' });
}

/** Teleporte para longe do alvo (mago cercado). */
function teleportAway(e: Enemy, ctx: GameContext) {
  const t = e.target;
  const D = e.def.special?.teleportWhenSurrounded?.distance ?? 10;
  const vfx = ctx.sys.vfx;
  const p = e.position;
  vfx.burst('teleport', e.getCenter(V1), { color: 0xb040ff, scale: 1 });
  const base = t ? Math.atan2(p.x - t.position.x, p.z - t.position.z) : Math.random() * Math.PI * 2;
  const cx = t ? t.position.x : p.x;
  const cz = t ? t.position.z : p.z;
  for (let i = 0; i < 10; i++) {
    const a = base + rand(-1.3, 1.3);
    const x = cx + Math.sin(a) * D;
    const z = cz + Math.cos(a) * D;
    if (isDeepWater(ctx, x, z)) continue;
    const g = groundAt(ctx, x, z, p.y + 4);
    if (Math.abs(g - p.y) > 6) continue;
    V2.set(x, g, z);
    ctx.physics.resolveCapsule(V2, e.radius, e.height);
    if (Math.hypot(V2.x - x, V2.z - z) > 0.8) continue;
    p.copy(V2);
    break;
  }
  vfx.burst('teleport', e.getCenter(V1), { color: 0xb040ff, scale: 1 });
  ctx.sys.audio.play('cast_teleport', { position: p, volume: 0.6 });
  e.ai.releaseAttackToken(e);
}

function vanishing(e: Enemy, _dt: number, ctx: GameContext) {
  // fumaça residual enquanto some
  if (Math.random() < 0.3) {
    V2.set(e.position.x + rand(-1, 1), e.position.y + rand(0.3, 1.5), e.position.z + rand(-1, 1));
    ctx.sys.vfx.puff(V2, 0x2e2a34, rand(1.2, 2), 1.4, 0.4, 0.3);
  }
}

/** Reaparece no flanco/costas do alvo e ataca de imediato. */
function reappear(e: Enemy, ctx: GameContext) {
  const t = e.target;
  const p = e.position;
  if (t) {
    for (let i = 0; i < 8; i++) {
      const a = t.yaw + Math.PI + rand(-1.4, 1.4);
      const r = rand(3, 5);
      const x = t.position.x + Math.sin(a) * r;
      const z = t.position.z + Math.cos(a) * r;
      if (isDeepWater(ctx, x, z)) continue;
      const g = groundAt(ctx, x, z, t.position.y + 2);
      V2.set(x, g, z);
      ctx.physics.resolveCapsule(V2, e.radius, e.height);
      V1.set(V2.x, V2.y + 1, V2.z);
      V5.set(t.position.x, t.position.y + 1, t.position.z);
      if (!ctx.physics.lineOfSight(V1, V5)) continue;
      p.copy(V2);
      break;
    }
    e.yaw = e.faceYaw = yawTo(p.x, p.z, t.position.x, t.position.z);
  }
  e.hidden = false;
  e.rig.root.visible = true;
  e.queryable = true;
  ctx.sys.vfx.burst('smoke', e.getCenter(V1), { scale: 1.4, count: 18, color: 0x2a2630 });
  // golpe imediato
  const ci = e.def.attacks.findIndex((a) => a.counterOnly);
  if (ci >= 0) {
    e.counterIdx = ci;
    e.counterT = 0.2;
  }
}

/** Golpe de efeito sem dano direto (buff/especial escolhido como ataque). */
export function specialImpact(e: Enemy, a: AttackDef, ctx: GameContext) {
  if (a.kind === 'buff' && e.def.special?.howl) howl(e, ctx);
}

/** Reações especiais a dano: reforços (Ravena 50%), rendição (15%). */
export function onSpecialDamaged(e: Enemy, _info: DamageInfo, _res: DamageResult, ctx: GameContext) {
  const sp = e.def.special;
  if (!sp) return;
  const s = e.sp;
  const f = e.health.fraction;
  if (sp.reinforcements && !s.reinforced && f <= sp.reinforcements.atFraction) {
    s.reinforced = true;
    callReinforcements(e, sp.reinforcements.types, ctx);
  }
  if (sp.surrenderAt && !s.surrendered && f <= sp.surrenderAt) surrender(e, ctx);
}

function callReinforcements(e: Enemy, types: string[], ctx: GameContext) {
  const t = e.target ?? ctx.sys.player.entity;
  let n = 0;
  for (const typeId of types) {
    // fora da vista do jogador sempre que possível
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) {
      if (!pointAround(ctx, t.position, 16, 24, V5)) continue;
      if (!visibleToCamera(ctx, V5, 60)) ok = true;
    }
    if (!ok && !pointAround(ctx, t.position, 14, 20, V5)) continue;
    const r = e.ai.spawnEnemy(typeId, V5.clone(), { aggro: true });
    if (r) {
      r.sp.noLeash = true;
      n++;
    }
  }
  if (n > 0) {
    ctx.sys.audio.play('enemy_alert', { position: e.position, volume: 1 });
    ctx.events.emit('ui:notify', { text: `${e.name} assobia — reforços dos Corvos chegam!`, kind: 'warning' });
  }
}

/** Rendição (contrato C3): para de lutar, ajoelha, vira neutra e imortal; avisa a história. */
export function surrender(e: Enemy, ctx: GameContext) {
  const s = e.sp;
  s.surrendered = true;
  e.cancelAction();
  e.ai.releaseAttackToken(e);
  if (e.hidden) {
    e.hidden = false;
    e.rig.root.visible = true;
    e.queryable = true;
  }
  e.setState('surrender');
  e.faction = 'neutral';
  const h = e.health;
  h.immortal = true;
  h.blocking = false;
  h.statuses.clear();
  h.staggerTimer = 0;
  e.moveVel.set(0, 0, 0);
  if (e.typeId === 'ravena') ctx.sys.story.set('ravena_rendida', true);
  ctx.events.emit('ui:notify', { text: `${e.name} larga as lâminas e se rende.`, kind: 'info' });
  // os aliados próximos debandam
  for (const o of e.ai.enemies) {
    if (o === e || !o.alive || o.deadT >= 0 || o.def.faction !== 'bandit' || o.uniqueId) continue;
    if (dist2XZ(o.position, e.position) > 60 * 60) continue;
    o.sp.standDown = true;
    o.cancelAction();
    o.fleeT = rand(2, 3);
    o.setState('flee');
  }
}

/** Ponto de chão válido num anel em volta de `c` (sem água funda). */
export function pointAround(ctx: GameContext, c: THREE.Vector3, r0: number, r1: number, out: THREE.Vector3): boolean {
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = rand(r0, r1);
    const x = c.x + Math.sin(a) * r;
    const z = c.z + Math.cos(a) * r;
    if (isDeepWater(ctx, x, z)) continue;
    const g = groundAt(ctx, x, z, c.y + 3);
    if (Math.abs(g - c.y) > 8) continue;
    out.set(x, g, z);
    ctx.physics.resolveCapsule(out, 0.5, 1.8);
    return true;
  }
  return false;
}

void _near;
