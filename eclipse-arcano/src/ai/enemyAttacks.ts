import type { GameContext } from '../core/context';
import type { DamageInfo } from '../combat/Health';
import type { AttackDef } from '../data/enemies';
import type { Enemy } from './Enemy';
import { ballisticPitch } from './logic';
import { V1, V2, V3, V4, aimPoint, clamp, distXZ, groundAt, rand } from './shared';
import { specialImpact } from './enemySpecials';

/**
 * Execução dos ataques dos inimigos (impacto e fase ativa): golpes em arco com avanço,
 * projéteis com mira balística e antecipação do movimento, áreas, saltos, investidas e
 * mergulhos. Toda aplicação de dano passa por ctx.sys.combat (meleeSweep/explode/applyDamage).
 */
const LEAD = 0.6;

export function attackDamage(e: Enemy, a: AttackDef): number {
  return a.damage * e.dmgMul;
}

function makeInfo(e: Enemy, a: AttackDef, tag: string): DamageInfo {
  let poise = a.poise ?? a.damage * 0.6;
  // quebra-guarda: muito dano de postura contra quem está bloqueando
  if (a.guardBreak) {
    const t = e.target;
    const blocking = t?.kind === 'player' ? e.ctx.sys.player.isBlocking() : !!t?.health?.blocking;
    if (blocking) poise *= 3;
  }
  return {
    amount: attackDamage(e, a),
    type: a.type,
    source: e,
    poiseDamage: poise,
    knockback: a.knockback,
    unblockable: a.unblockable,
    statuses: a.statuses,
    tag,
  };
}

function sweep(e: Enemy, a: AttackDef, ctx: GameContext) {
  const s = e.def.scale;
  const hits = ctx.sys.combat.meleeSweep(e, e.position, e.atkDir, a.reach, a.arc, makeInfo(e, a, 'melee'), { alreadyHit: e.atkHit, verticalReach: 2.2 * Math.max(1, s), maxTargets: 4 });
  if (hits.length > 0) {
    e.atkDone = true;
    if (e.def.archetype === 'assassin') e.sp.hitAndRun = true;
    ctx.sys.audio.play(a.heavy ? 'hit_metal' : 'hit_flesh', { position: e.position, volume: 0.5 });
  }
  return hits.length;
}

/** Início da fase de impacto. */
export function beginAttackImpact(e: Enemy, ctx: GameContext) {
  const a = e.atk!;
  const p = e.position;
  const t = e.target;
  const vfx = ctx.sys.vfx;
  e.atkFrom.copy(p);
  e.atkSweepT = 0;
  switch (a.kind) {
    case 'melee':
      ctx.sys.audio.play(a.heavy ? 'swing_heavy' : 'swing', { position: p, pitch: 0.85 + Math.random() * 0.3, volume: 0.6 });
      sweep(e, a, ctx);
      if (a.heavy) {
        V1.copy(p).addScaledVector(e.atkDir, a.reach * 0.7);
        vfx.burst('dust', V1, { scale: 0.7 * e.def.scale, count: 10 });
        shakeNear(e, ctx, a.reach * 2.5, 0.25);
      }
      break;
    case 'projectile':
      fireProjectiles(e, a, ctx);
      break;
    case 'aoe': {
      const info = makeInfo(e, a, 'aoe');
      ctx.sys.combat.explode(p, a.reach, info, e, { falloff: false });
      vfx.ring(p, a.reach, a.type === 'void' ? 0xb040ff : 0xffb070, 0.35);
      vfx.burst(a.type === 'void' ? 'corruption' : 'shockwave', p, { scale: a.reach / 3, color: a.type === 'void' ? 0xb040ff : 0xffa060 });
      vfx.burst('dust', p, { scale: a.reach / 3, count: 14 });
      ctx.sys.audio.play(a.heavy ? 'boss_slam' : 'explosion', { position: p, volume: 0.7 });
      shakeNear(e, ctx, a.reach * 3, 0.4);
      break;
    }
    case 'leap': {
      // salta para onde o alvo estará (antecipação parcial), parando um pouco antes
      if (t) {
        const v = e.ai.targetVelocity(t, V1);
        V2.copy(t.position).addScaledVector(v, a.active * 0.5);
      } else V2.copy(p).addScaledVector(e.atkDir, a.maxRange);
      const dx = V2.x - p.x;
      const dz = V2.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      const travel = clamp(d - a.reach * 0.45, 0.5, a.maxRange + 1.5);
      e.atkTo.set(p.x + (dx / d) * travel, p.y, p.z + (dz / d) * travel);
      e.atkDir.set(dx / d, 0, dz / d);
      e.yaw = Math.atan2(dx, dz);
      e.faceYaw = e.yaw;
      const sp = travel / Math.max(0.15, a.active);
      e.moveVel.set(e.atkDir.x * sp, 0, e.atkDir.z * sp);
      ctx.sys.audio.play('swing_heavy', { position: p, pitch: 1.2, volume: 0.5 });
      break;
    }
    case 'charge':
      ctx.sys.audio.play('swing_heavy', { position: p, pitch: 0.6 });
      break;
    case 'dive': {
      if (t) {
        aimPoint(t, V2);
        const v = e.ai.targetVelocity(t, V1);
        const d = p.distanceTo(V2);
        const sp = Math.max(e.def.run * 1.6, 18);
        V2.addScaledVector(v, (d / sp) * LEAD);
        e.atkTo.copy(V2);
      } else e.atkTo.copy(p).addScaledVector(e.atkDir, 10).setY(p.y - 6);
      ctx.sys.audio.play('creature_call', { position: p, pitch: 1.6, volume: 0.6 });
      break;
    }
    case 'buff':
    case 'special':
      specialImpact(e, a, ctx);
      break;
  }
}

/** Fase ativa (deslocamentos e golpes contínuos). */
export function updateAttackActive(e: Enemy, dt: number, ctx: GameContext) {
  const a = e.atk!;
  const p = e.position;
  const t = e.target;
  switch (a.kind) {
    case 'melee': {
      // avanço (lunge) sem empurrar o alvo
      const lunge = a.lunge ?? 0;
      if (lunge > 0) {
        const near = t ? distXZ(p, t.position) < t.radius + e.radius + 0.35 : false;
        const sp = near ? 0 : lunge / Math.max(0.08, a.active + 0.05);
        e.moveVel.set(e.atkDir.x * sp, 0, e.atkDir.z * sp);
      } else e.moveVel.set(0, 0, 0);
      e.atkSweepT += dt;
      if (e.atkSweepT >= 0.05) {
        e.atkSweepT = 0;
        sweep(e, a, ctx);
      }
      break;
    }
    case 'leap': {
      const k = clamp(e.phaseT / Math.max(0.1, a.active), 0, 1);
      const g = groundAt(ctx, p.x, p.z, p.y + 1);
      e.airY = g + Math.sin(k * Math.PI) * (0.8 + e.def.height * 0.5);
      if (!e.atkDone) {
        if (sweep(e, a, ctx) > 0) e.moveVel.multiplyScalar(0.25);
      }
      if (k >= 1 || distXZ(p, e.atkTo) < 0.4) e.moveVel.multiplyScalar(0.2);
      break;
    }
    case 'charge': {
      const sp = e.def.run * 2.3;
      e.moveVel.set(e.atkDir.x * sp, 0, e.atkDir.z * sp);
      if (!e.atkDone) sweep(e, a, ctx);
      if (e.atkDone) e.moveVel.multiplyScalar(0.3);
      if (Math.random() < dt * 12) ctx.sys.vfx.burst('dust', p, { scale: 0.5, count: 3 });
      break;
    }
    case 'dive': {
      // mergulho em linha até o ponto previsto; depois sobe de novo
      const sp = Math.max(e.def.run * 1.6, 18);
      const dx = e.atkTo.x - p.x;
      const dy = e.atkTo.y - p.y;
      const dz = e.atkTo.z - p.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > 0.6 && !e.atkDone) {
        e.moveVel.set((dx / d) * sp, 0, (dz / d) * sp);
        p.y += (dy / d) * sp * dt;
      } else {
        // passou: arremete para cima
        e.atkDone = true;
        p.y += sp * 0.45 * dt;
        e.moveVel.multiplyScalar(Math.exp(-2 * dt));
      }
      const g = ctx.heightfield.heightAt(p.x, p.z);
      if (p.y < g + 0.8) p.y = g + 0.8;
      if (t && !e.atkHit.has(t.id)) {
        aimPoint(t, V3);
        const r = a.reach + t.radius;
        if (p.distanceToSquared(V3) < r * r) {
          e.atkHit.add(t.id);
          e.atkDone = true;
          const info = makeInfo(e, a, 'melee');
          info.direction = V4.set(e.atkDir.x || dx, 0, e.atkDir.z || dz).normalize().clone();
          ctx.sys.combat.applyDamage(t, info);
          ctx.sys.audio.play('hit_flesh', { position: p });
        }
      }
      e.yaw = Math.atan2(e.moveVel.x || 0.0001, e.moveVel.z || 0.0001);
      e.faceYaw = e.yaw;
      e.airY = p.y;
      break;
    }
    default:
      break;
  }
}

/** Projéteis com antecipação, gravidade (flechas) e dispersão. */
function fireProjectiles(e: Enemy, a: AttackDef, ctx: GameContext) {
  const t = e.target;
  const P = a.projectile;
  if (!t || !P) return;
  const origin = e.rig.muzzle(V1);
  // segurança: se o "cano" estiver dentro de uma parede, sai do peito
  if (!ctx.physics.lineOfSight(V4.set(e.position.x, e.position.y + e.height * 0.7, e.position.z), origin)) origin.copy(V4);
  const aim = aimPoint(t, V2);
  const v = e.ai.targetVelocity(t, V3);
  let dx = aim.x - origin.x;
  let dz = aim.z - origin.z;
  const dist0 = Math.hypot(dx, dz);
  const tf = dist0 / P.speed;
  aim.x += v.x * tf * LEAD;
  aim.z += v.z * tf * LEAD;
  aim.y += v.y * tf * LEAD * 0.5;
  // imprecisão justa (cresce com a distância)
  const err = 0.25 + dist0 * 0.015;
  aim.x += rand(-err, err);
  aim.z += rand(-err, err);
  dx = aim.x - origin.x;
  dz = aim.z - origin.z;
  const dh = Math.hypot(dx, dz) || 0.001;
  const dy = aim.y - origin.y;
  const g = P.gravity ?? 0;
  const pitch = g > 0 ? ballisticPitch(dh, dy, P.speed, g) ?? Math.PI / 4 : Math.atan2(dy, dh);
  const baseYaw = Math.atan2(dx, dz);
  const n = Math.max(1, P.count ?? 1);
  const spread = ((P.spread ?? 0) * Math.PI) / 180;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  for (let i = 0; i < n; i++) {
    const off = n > 1 ? (i - (n - 1) / 2) * spread : 0;
    const yw = baseYaw + off;
    V4.set(Math.sin(yw) * cp, sp, Math.cos(yw) * cp);
    ctx.sys.combat.spawnProjectile({
      kind: P.kind,
      source: e,
      origin,
      direction: V4,
      speed: P.speed,
      range: P.range ?? 50,
      radius: P.radius ?? 0.2,
      damage: makeInfo(e, a, 'projectile'),
      gravity: g,
      explodeRadius: P.explode ?? 0,
      homingTarget: P.homing ? t : null,
      homingStrength: P.homing ?? 0,
      homingDelay: P.homing ? 0.2 : 0,
    });
  }
  const snd = P.kind === 'arrow' ? 'swing' : P.kind === 'crystalShard' ? 'cast_blades' : P.kind === 'lightningBolt' ? 'cast_lightning' : 'cast_arcane';
  ctx.sys.audio.play(snd, { position: e.position, volume: 0.5, pitch: P.kind === 'arrow' ? 1.5 : 0.8 });
}

function shakeNear(e: Enemy, ctx: GameContext, range: number, intensity: number) {
  const pl = ctx.sys.player.entity;
  const d = distXZ(pl.position, e.position);
  if (d < range) ctx.sys.camera.shake(intensity * (1 - d / range), 0.35);
}

export function cancelAttackVisuals(e: Enemy) {
  e.tele?.cancel();
  e.tele = null;
  e.charge = 0;
}
