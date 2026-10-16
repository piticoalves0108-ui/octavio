import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import type { DamageInfo, DamageResult, DamageType } from './Health';
import type { WeaponBehaviorId, WeaponDef } from '../data/weapons';
import type { WeaponModel } from './weaponModels';

/**
 * Comportamentos especiais das armas (ganchos chamados pelo PlayerCombat).
 * Os números ficam em `def.behaviorParams` (data/weapons.ts).
 */

/** Informações do golpe em andamento (objeto reutilizado pelo PlayerCombat). */
export interface SwingContext {
  /** Índice no combo (0..n-1); -1 = ataque carregado. */
  step: number;
  finisher: boolean;
  heavy: boolean;
  /** Carga 0..1 (ataque carregado). */
  charge: number;
  info: DamageInfo;
  origin: THREE.Vector3;
  forward: THREE.Vector3;
  range: number;
  /** Algum comportamento já disparou um efeito "uma vez por golpe". */
  procDone: boolean;
}

/** O que o PlayerCombat oferece aos comportamentos. */
export interface CombatApi {
  readonly ctx: GameContext;
  readonly player: Entity;
  /** Dano base da arma × poder × aprimoramento × mul (sem crítico). */
  baseDamage(mul: number): number;
  /** Direção de mira (normalizada) a partir de `origin`. */
  aimDirection(origin: THREE.Vector3, out: THREE.Vector3): THREE.Vector3;
  /** Frente horizontal do golpe. */
  forward(out: THREE.Vector3): THREE.Vector3;
  /** Origem dos disparos (ponta da arma). */
  muzzle(out: THREE.Vector3): THREE.Vector3;
  /** Raio em cadeia a partir de um alvo (retorna quantos foram atingidos). */
  chainLightning(from: Entity, jumps: number, range: number, damage: number, exclude?: Set<number>): number;
  /** Atinge entidades hostis num cone horizontal à frente do jogador. */
  coneAttack(range: number, angleDeg: number, info: DamageInfo): Entity[];
  /** Cura o jogador (com efeito). */
  healPlayer(amount: number): number;
  /** Tocar animação com quadro de impacto: agenda `fn` para a fração `impact` da animação. */
  schedule(delay: number, fn: () => void): void;
}

export interface WeaponRuntime {
  def: WeaponDef;
  model: WeaponModel | null;
  /** Estado livre por arma (energia solar, modo, contadores). */
  state: Record<string, number>;
  api: CombatApi;
}

export interface WeaponBehavior {
  onEquip?(w: WeaponRuntime): void;
  onUnequip?(w: WeaponRuntime): void;
  /** Antes do golpe corpo a corpo: pode alterar o dano (tipo, estados, valor). */
  onSwing?(w: WeaponRuntime, s: SwingContext): void;
  /** Golpe corpo a corpo: ajusta o dano de UM alvo antes de aplicá-lo (cópia própria de `info`). */
  onBeforeHit?(w: WeaponRuntime, target: Entity, info: DamageInfo, s: SwingContext): void;
  /** Para cada alvo atingido (corpo a corpo ou disparo). */
  onHit?(w: WeaponRuntime, target: Entity, info: DamageInfo, result: DamageResult, s: SwingContext | null): void;
  /** Depois do golpe (com ou sem acertos) — finalizadores e golpes carregados. */
  onSwingEnd?(w: WeaponRuntime, s: SwingContext, hits: Entity[]): void;
  /** Ataque carregado solto. true = o comportamento substitui o ataque carregado padrão. */
  onHeavyRelease?(w: WeaponRuntime, charge: number): boolean;
  /** Disparo (cajado/artefato). true = o comportamento criou os projéteis. */
  onShoot?(w: WeaponRuntime, origin: THREE.Vector3, dir: THREE.Vector3, damage: number, crit: boolean): boolean;
  onKill?(w: WeaponRuntime, target: Entity): void;
  update?(w: WeaponRuntime, dt: number): void;
}

const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const V3 = new THREE.Vector3();
const V4 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

const P = (w: WeaponRuntime, k: string, d = 0) => w.def.behaviorParams?.[k] ?? d;

function rotateY(v: THREE.Vector3, ang: number, out: THREE.Vector3): THREE.Vector3 {
  return out.copy(v).applyAxisAngle(UP, ang);
}

function shot(w: WeaponRuntime, kind: string, origin: THREE.Vector3, dir: THREE.Vector3, damage: number, type: DamageType, o: { speed?: number; range?: number; radius?: number; pierce?: number; pierceFalloff?: number; explode?: number; homing?: Entity | null; homingStrength?: number; homingDelay?: number; retarget?: boolean; crit?: boolean; statuses?: DamageInfo['statuses']; scale?: number; onHit?: (e: Entity | undefined) => void; knockback?: number } = {}) {
  const api = w.api;
  return api.ctx.sys.combat.spawnProjectile({
    kind,
    source: api.player,
    origin: origin.clone(),
    direction: dir.clone(),
    speed: o.speed ?? 44,
    range: o.range ?? 60,
    radius: o.radius ?? 0.28,
    damage: { amount: damage, type, crit: o.crit, poiseDamage: damage * 0.6, knockback: o.knockback ?? 1.5, statuses: o.statuses, tag: w.def.id },
    pierce: o.pierce,
    pierceFalloff: o.pierceFalloff,
    explodeRadius: o.explode,
    homingTarget: o.homing ?? null,
    homingStrength: o.homingStrength,
    homingDelay: o.homingDelay,
    retarget: o.retarget,
    visualScale: o.scale,
    onHit: o.onHit ? (h) => o.onHit!(h.entity) : undefined,
  });
}

// =====================================================================
// Comportamentos
// =====================================================================
const BEHAVIORS: Record<WeaponBehaviorId, WeaponBehavior> = {
  /** Cajado Ancestral: sequência de acertos prepara um disparo triplo. */
  ancestral: {
    onShoot(w, origin, dir, damage, crit) {
      const need = P(w, 'hitsToSplit', 4);
      const st = w.state;
      const onHit = (e: Entity | undefined) => {
        if (e) st.streak = (st.streak ?? 0) + 1;
        else st.streak = 0;
      };
      if ((st.streak ?? 0) >= need) {
        st.streak = 0;
        const n = P(w, 'splitCount', 3);
        const spread = (P(w, 'splitSpreadDeg', 9) * Math.PI) / 180;
        for (let i = 0; i < n; i++) {
          const a = (i - (n - 1) / 2) * spread;
          shot(w, 'arcaneBolt', origin, rotateY(dir, a, V1), damage * P(w, 'splitDamageMul', 0.7), 'arcane', { crit, scale: 1.2, onHit });
        }
        w.api.ctx.sys.vfx.burst('arcaneSpark', origin, { count: 12, scale: 1.3 });
        return true;
      }
      shot(w, 'arcaneBolt', origin, dir, damage, 'arcane', { crit, onHit });
      return true;
    },
  },

  /** Espada Rúnica (bônus contra constructos/corrompidos) e Adaga Arcana (crítico em alvos indefesos). */
  runic: {
    /** Alvo atordoado/enraizado/cambaleando: o golpe vira crítico (um único número de dano). */
    onBeforeHit(w, target, info) {
      if (P(w, 'critOnDisabled', 0) <= 0 || info.crit) return;
      const h = target.health;
      if (!h || !(h.has('root') || h.has('stun') || h.staggered)) return;
      info.amount *= Math.max(1, w.api.ctx.sys.progression.getStat('critMultiplier'));
      info.crit = true;
    },
    onHit(w, target, info, result) {
      const api = w.api;
      const bonus = P(w, 'bonusVsFactionMul', 0);
      if (bonus > 0 && (target.faction === 'construct' || target.faction === 'corrupted') && result.dealt > 0) {
        api.ctx.sys.combat.applyDamage(target, { amount: info.amount * bonus, type: 'arcane', source: api.player, poiseDamage: 0, tag: 'runic' });
        api.ctx.sys.vfx.burst('arcaneSpark', target.getCenter(V1), { color: 0x58d8ff, count: 8 });
      }
    },
  },

  /** Espada de Raios: descargas em cadeia. */
  chainLightning: {
    onHit(w, target, info, _result, s) {
      if (!s || s.procDone) return;
      const st = w.state;
      st.hits = (st.hits ?? 0) + 1;
      const every = P(w, 'guaranteedEvery', 4);
      const proc = Math.random() < P(w, 'chance', 0.35) || (every > 0 && st.hits % every === 0);
      if (!proc) return;
      s.procDone = true;
      const dmg = info.amount * P(w, 'damageMul', 0.55);
      const n = w.api.chainLightning(target, P(w, 'jumps', 3), P(w, 'jumpRange', 7), dmg);
      st.chains = (st.chains ?? 0) + 1;
      st.lastChainTargets = n;
    },
  },

  /** Lâmina Vampírica: cura sob condição. */
  vampiric: {
    onHit(w, _target, _info, result, _s) {
      const api = w.api;
      const h = api.player.health!;
      const low = h.fraction < P(w, 'lowHealth', 0.5);
      const frac = low ? P(w, 'leechLow', 0.2) : P(w, 'leech', 0.06);
      const healed = api.healPlayer(result.dealt * frac);
      w.state.healed = (w.state.healed ?? 0) + healed;
    },
    onKill(w) {
      const h = w.api.player.health!;
      const healed = w.api.healPlayer(h.max * P(w, 'killHealFraction', 0.04));
      w.state.healed = (w.state.healed ?? 0) + healed;
    },
  },

  /** Lâmina Temporal: desacelera alvos; carregado = pulso temporal. */
  temporal: {
    onSwing(w, s) {
      const list = s.info.statuses ?? (s.info.statuses = []);
      list.push({ id: 'timeSlow', duration: P(w, 'slowDuration', 2.5), magnitude: P(w, 'slow', 0.45) });
    },
    onHit(w, target) {
      w.api.ctx.sys.vfx.burst('time', target.position, { scale: 0.45, count: 8, lifetime: 0.6 });
    },
    onSwingEnd(w, s) {
      if (!s.heavy) return;
      const api = w.api;
      const pos = api.player.position;
      const r = P(w, 'pulseRadius', 5.5);
      api.ctx.sys.combat.explode(pos, r, {
        amount: api.baseDamage(P(w, 'pulseDamageMul', 1.2)),
        type: 'time',
        source: api.player,
        poiseDamage: 20,
        statuses: [{ id: 'timeSlow', duration: P(w, 'pulseDuration', 3.5), magnitude: P(w, 'pulseSlow', 0.7) }],
        tag: 'temporalPulse',
      }, api.player, { falloff: false });
      const vfx = api.ctx.sys.vfx;
      vfx.burst('time', pos, { scale: r / 1.8, count: 30 });
      vfx.ring(pos, r, 0x9fd0ff, 0.6);
      vfx.runeCircle(pos, r, 0xffe0a0, 1.4, -2.5);
      w.state.pulses = (w.state.pulses ?? 0) + 1;
    },
  },

  /** Espada Solar: acumula energia e libera golpe explosivo. */
  solar: {
    onEquip(w) {
      w.state.energy = w.state.energy ?? 0;
      w.model?.setGlow(0.5);
    },
    onHit(w, _t, _i, _r, s) {
      if (s?.heavy) return;
      w.state.energy = Math.min(P(w, 'max', 100), (w.state.energy ?? 0) + P(w, 'perHit', 14));
      w.state.sinceHit = 0;
    },
    update(w, dt) {
      const max = P(w, 'max', 100);
      // só dissipa depois de alguns segundos sem acertar (a carga cheia espera o golpe carregado)
      w.state.sinceHit = (w.state.sinceHit ?? 99) + dt;
      const decay = w.state.sinceHit > P(w, 'decayDelay', 4) ? P(w, 'decayPerSecond', 2) * dt : 0;
      const e = (w.state.energy = Math.max(0, (w.state.energy ?? 0) - decay));
      const full = e >= max - 0.01;
      const pulse = full ? 0.75 + 0.25 * Math.sin(w.api.ctx.elapsed * 10) : 1;
      w.model?.setGlow((0.45 + (e / max) * 1.6) * pulse);
      if (full && Math.random() < dt * 20) {
        w.api.muzzle(V1);
        w.api.ctx.sys.vfx.spark(V1, 0xffc040, 0.18, 0.4, 0, 1.2, 0);
      }
    },
    onSwingEnd(w, s) {
      const max = P(w, 'max', 100);
      if (!s.heavy || (w.state.energy ?? 0) < max - 0.01) return;
      const api = w.api;
      w.state.energy = 0;
      const c = V1.copy(s.origin).addScaledVector(s.forward, 2.2);
      c.y = api.ctx.physics.groundHeight(c.x, c.z, s.origin.y + 1) + 0.3;
      const r = P(w, 'blastRadius', 4.5);
      api.ctx.sys.combat.explode(c, r, {
        amount: api.baseDamage(P(w, 'blastDamageMul', 3.2)),
        type: 'fire',
        source: api.player,
        knockback: 10,
        poiseDamage: 60,
        statuses: [{ id: 'burn', duration: P(w, 'burnDuration', 3), magnitude: P(w, 'burnDps', 6) }],
        tag: 'solarBlast',
      }, api.player, { falloff: true });
      const vfx = api.ctx.sys.vfx;
      vfx.burst('fire', c, { scale: 2.2, count: 40 });
      vfx.burst('shockwave', c, { scale: r / 5, color: 0xffc040 });
      vfx.shell(c, 0.4, r, 0xffb030, 0.45);
      vfx.groundFlash(c, r * 1.1, 0xffa020, 0.5);
      vfx.flash(c, 0xffc060, 90, 0.5);
      api.ctx.sys.audio.play('explosion', { position: c });
      (api.ctx.sys.camera as unknown as { shake?: (i: number, d: number) => void }).shake?.(0.55, 0.45);
      w.state.blasts = (w.state.blasts ?? 0) + 1;
    },
  },

  /** Espada Cyber-Rúnica: alterna físico/elétrico; finalizador dispara onda de energia. */
  cyberRunic: {
    onEquip(w) {
      w.state.swings = 0;
    },
    onSwing(w, s) {
      const n = (w.state.swings = (w.state.swings ?? 0) + 1);
      const electric = n % 2 === 0;
      w.state.electric = electric ? 1 : 0;
      if (electric) {
        s.info.type = 'lightning';
        s.info.amount *= 1 + P(w, 'electricBonus', 0.1);
        (s.info.statuses ?? (s.info.statuses = [])).push({ id: 'shock', duration: 1.2, magnitude: 2 });
      } else s.info.type = 'physical';
      w.model?.setGlow(electric ? 1.5 : 0.6, electric ? 0x3cf0ff : 0xd8e4f0);
    },
    onSwingEnd(w, s) {
      if (!s.finisher) return;
      const api = w.api;
      // nasce à frente do peito (a ponta da arma varre para o lado no finalizador)
      V1.copy(api.player.position).addScaledVector(s.forward, 0.9);
      V1.y += 1.1;
      V2.copy(s.forward);
      shot(w, 'energyWave', V1, V2, api.baseDamage(P(w, 'waveDamageMul', 1.3)), 'lightning', {
        speed: P(w, 'waveSpeed', 30),
        range: P(w, 'waveRange', 18),
        radius: 0.7,
        pierce: P(w, 'wavePierce', 6),
        knockback: 4,
        scale: 1.2,
      });
      w.state.waves = (w.state.waves ?? 0) + 1;
    },
  },

  /** Cajado do Vazio: disparos que atravessam inimigos. */
  voidPierce: {
    onShoot(w, origin, dir, damage, crit) {
      shot(w, 'voidBolt', origin, dir, damage, 'void', {
        crit,
        speed: P(w, 'speed', 46),
        range: P(w, 'range', 70),
        pierce: P(w, 'pierce', 4),
        pierceFalloff: P(w, 'falloffPerTarget', 0.15),
        radius: 0.3,
      });
      return true;
    },
  },

  /** Cajado do Dragão: bolas de fogo; carregado = rajada de fogo em cone. */
  dragonFire: {
    onShoot(w, origin, dir, damage, crit) {
      shot(w, 'fireball', origin, dir, damage, 'fire', {
        crit,
        speed: 34,
        range: 55,
        radius: 0.32,
        explode: P(w, 'explodeRadius', 2),
        scale: 0.75,
        statuses: [{ id: 'burn', duration: P(w, 'burnDuration', 3), magnitude: P(w, 'burnDps', 5) }],
      });
      return true;
    },
    onHeavyRelease(w, charge) {
      const api = w.api;
      const player = api.ctx.sys.player;
      const dur = player.playAnimation('castHeavy', { speed: 1.4 });
      player.lockMovement(dur * 0.7);
      api.schedule(dur * 0.45, () => {
        const range = P(w, 'coneRange', 8) * (0.8 + 0.2 * charge);
        const ang = P(w, 'coneAngle', 55);
        const hits = api.coneAttack(range, ang, {
          amount: api.baseDamage(P(w, 'coneDamageMul', 2.4) * (0.7 + 0.3 * charge)),
          type: 'fire',
          source: api.player,
          knockback: 3,
          poiseDamage: 30,
          statuses: [{ id: 'burn', duration: P(w, 'coneBurnDuration', 4.5), magnitude: P(w, 'coneBurnDps', 9) }],
          tag: 'dragonBreath',
        });
        // visual: chamas distribuídas no volume do cone (crescem com a distância)
        const vfx = api.ctx.sys.vfx;
        api.muzzle(V1);
        api.forward(V2);
        const base = api.player.position.y + 1.1;
        for (let i = 0; i < 26; i++) {
          const a = ((Math.random() - 0.5) * ang * Math.PI) / 180;
          const dist = 0.6 + Math.pow(Math.random(), 0.7) * range;
          rotateY(V2, a, V3);
          V4.copy(api.player.position).addScaledVector(V3, dist);
          V4.y = base - dist * 0.06 + (Math.random() - 0.5) * 0.4;
          vfx.burst('fire', V4, { direction: V3, speed: 0.35, count: 2, scale: 0.45 + dist * 0.11, lifetime: 0.7 });
        }
        for (let i = 0; i < 4; i++) {
          V4.copy(api.player.position).addScaledVector(V2, range * (0.3 + i * 0.2));
          V4.y = base;
          vfx.flash(V4, 0xff7a20, 45, 0.5);
        }
        vfx.burst('fire', V1, { direction: V2, speed: 0.8, count: 8, scale: 0.7 });
        api.ctx.sys.audio.play('cast_explosion', { position: V1 });
        w.state.breaths = (w.state.breaths ?? 0) + 1;
        w.state.lastBreathHits = hits.length;
      });
      return true;
    },
  },

  /** Manopla Tecnomágica: pulso de choque a cada soco; carregado = impacto no chão. */
  technoPulse: {
    onSwingEnd(w, s) {
      const api = w.api;
      const combat = api.ctx.sys.combat;
      if (s.heavy) {
        const pos = api.player.position;
        const r = P(w, 'slamRadius', 5);
        combat.explode(pos, r, {
          amount: api.baseDamage(P(w, 'slamDamageMul', 2.2)),
          type: 'lightning',
          source: api.player,
          knockback: P(w, 'slamKnockback', 11),
          poiseDamage: 50,
          statuses: [{ id: 'shock', duration: P(w, 'shockDuration', 2), magnitude: P(w, 'shockDps', 4) }],
          tag: 'technoSlam',
        }, api.player, { falloff: true });
        const vfx = api.ctx.sys.vfx;
        vfx.burst('shockwave', pos, { scale: r / 5, color: 0x4ff0ff });
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          V1.set(pos.x + Math.cos(a) * r * 0.9, pos.y + 0.3, pos.z + Math.sin(a) * r * 0.9);
          V2.set(pos.x, pos.y + 0.4, pos.z);
          vfx.lightning(V2, V1, { color: 0x4ff0ff, branches: 1, duration: 0.25 });
        }
        api.ctx.sys.audio.play('boss_slam', { position: pos, volume: 0.7 });
        w.state.slams = (w.state.slams ?? 0) + 1;
        return;
      }
      // pulso curto à frente
      api.muzzle(V1);
      const res = combat.beamAttack(api.player, V1, s.forward, P(w, 'pulseRange', 3.5), 0.6, {
        amount: api.baseDamage(P(w, 'pulseDamageMul', 0.45)),
        type: 'lightning',
        source: api.player,
        poiseDamage: 6,
        statuses: [{ id: 'shock', duration: P(w, 'shockDuration', 2), magnitude: P(w, 'shockDps', 4) }],
        tag: 'technoPulse',
      }, { visual: false });
      V2.copy(V1).addScaledVector(s.forward, P(w, 'pulseRange', 3.5));
      api.ctx.sys.vfx.lightning(V1, res.hits.length ? res.hits[0].getCenter(V3) : V2, { color: 0x4ff0ff, branches: 1, duration: 0.18, width: 0.08 });
      w.state.pulses = (w.state.pulses ?? 0) + 1;
      w.state.pulseHits = (w.state.pulseHits ?? 0) + res.hits.length;
    },
  },

  /** Orbe do Eclipse: esferas perseguidoras; carregado = pulso gravitacional. */
  eclipseOrb: {
    onShoot(w, origin, dir, damage, crit) {
      const n = P(w, 'orbs', 3);
      for (let i = 0; i < n; i++) {
        const a = (i - (n - 1) / 2) * 0.35;
        rotateY(dir, a, V1);
        V1.y += 0.25;
        V1.normalize();
        shot(w, 'eclipseOrb', origin, V1, damage * 0.6, 'void', {
          crit,
          speed: P(w, 'orbSpeed', 22),
          range: 45,
          radius: 0.25,
          homingStrength: P(w, 'homing', 5),
          homingDelay: 0.15,
          retarget: true,
        });
      }
      return true;
    },
    onHeavyRelease(w, charge) {
      const api = w.api;
      const player = api.ctx.sys.player;
      const dur = player.playAnimation('castHeavy', { speed: 1.3 });
      player.lockMovement(dur * 0.6);
      api.schedule(dur * 0.5, () => {
        const pos = api.player.position;
        const r = P(w, 'pulseRadius', 8) * (0.8 + 0.2 * charge);
        const combat = api.ctx.sys.combat;
        const hits = combat.explode(pos, r, {
          amount: api.baseDamage(P(w, 'pulseDamageMul', 2) * (0.7 + 0.3 * charge)),
          type: 'void',
          source: api.player,
          poiseDamage: 30,
          statuses: [{ id: 'vulnerable', duration: P(w, 'vulnerableDuration', 5), magnitude: P(w, 'vulnerable', 0.25) }],
          tag: 'eclipsePulse',
        }, api.player, { falloff: false });
        // puxa em direção ao mago
        const pull = P(w, 'pullForce', 14);
        for (const e of hits) {
          V1.subVectors(pos, e.position).setY(0);
          const d = V1.length();
          if (d < 0.5) continue;
          V1.multiplyScalar(1 / d);
          const k = e.kind === 'boss' ? 0.1 : 1;
          e.velocity.x += V1.x * pull * k;
          e.velocity.z += V1.z * pull * k;
        }
        const vfx = api.ctx.sys.vfx;
        vfx.shell(V2.copy(pos).setY(pos.y + 1), r, 0.3, 0xff4f7a, 0.5);
        vfx.burst('void', V2, { scale: 1.6, count: 26 });
        vfx.ring(pos, r, 0xff4f7a, 0.5);
        api.ctx.sys.audio.play('cast_rift', { position: pos });
        w.state.pulses = (w.state.pulses ?? 0) + 1;
      });
      return true;
    },
  },

  /** Lança de Cristal: finalizador lança estilhaços. */
  crystalSpear: {
    onSwingEnd(w, s) {
      if (!s.finisher && !s.heavy) return;
      const api = w.api;
      const n = P(w, 'shards', 3);
      const spread = (P(w, 'shardSpreadDeg', 12) * Math.PI) / 180;
      V1.copy(api.player.position).addScaledVector(s.forward, 1.2);
      V1.y += 1.2;
      for (let i = 0; i < n; i++) {
        rotateY(s.forward, (i - (n - 1) / 2) * spread, V2);
        shot(w, 'crystalShard', V1, V2, api.baseDamage(P(w, 'shardDamageMul', 0.6)), 'physical', {
          speed: P(w, 'shardSpeed', 34),
          range: P(w, 'shardRange', 22),
          radius: 0.2,
        });
      }
      w.state.volleys = (w.state.volleys ?? 0) + 1;
    },
  },
};

export function getWeaponBehavior(id: WeaponBehaviorId | undefined): WeaponBehavior | null {
  return id ? BEHAVIORS[id] ?? null : null;
}
