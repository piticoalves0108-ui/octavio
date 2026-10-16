import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import type { DamageInfo } from './Health';
import { ABILITIES, SPELL_COMBOS, abilityValue, type AbilityId } from '../data/abilities';
import { chargedValue } from './combatMath';
import { RiftVisual, ShieldBubble, StormCloud } from './abilityVisuals';

/**
 * Efeitos das 10 habilidades (o "quadro de impacto" de cada conjuração) e as zonas
 * persistentes (Tempestade, Fenda, Correntes, Escudo). Chamado pelo sistema Abilities.
 * Combinações: Estilhaçar (Correntes + Lança), Sobrecarga (Tempestade em alvo com Marca Rúnica),
 * Colapso Dimensional (Explosão Rúnica dentro da Fenda), dano elétrico em molhados (Combat).
 */

export interface CastContext {
  id: AbilityId;
  rank: number;
  /** Carga 0..1 (Lança de Energia). */
  charge: number;
  /** Multiplicador de poder mágico (spellPower × Forma Ascendente). */
  power: number;
}

interface StormZone {
  center: THREE.Vector3;
  ground: number;
  radius: number;
  t: number;
  dur: number;
  acc: number;
  interval: number;
  strikes: number;
  damage: number;
  rank: number;
  cloud: StormCloud;
  struck: number;
}

interface RiftZone {
  center: THREE.Vector3;
  ground: number;
  radius: number;
  t: number;
  dur: number;
  acc: number;
  damage: number;
  implode: number;
  pull: number;
  visual: RiftVisual;
  fxAcc: number;
  collapsed: boolean;
}

interface ChainBind {
  target: Entity;
  t: number;
  dur: number;
  acc: number;
}

const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const V3 = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export class AbilityEffects {
  private storms: StormZone[] = [];
  private rifts: RiftZone[] = [];
  private chains: ChainBind[] = [];
  private stormClouds: StormCloud[] = [];
  private riftVisuals: RiftVisual[] = [];
  readonly shield: ShieldBubble;
  /** Escudo ativo: tempo restante e se reflete. */
  shieldT = 0;
  shieldDur = 0;
  shieldReflect = false;
  private list: Entity[] = [];
  /** Estatísticas para testes (números das combinações e efeitos). */
  readonly stats = {
    orbs: 0,
    lances: 0,
    lanceHits: 0,
    blasts: 0,
    blastHits: 0,
    chained: 0,
    bossSlowed: 0,
    shields: 0,
    absorbed: 0,
    blinks: 0,
    lastBlinkDistance: 0,
    storms: 0,
    stormStrikes: 0,
    blades: 0,
    rifts: 0,
    riftTicks: 0,
    implosions: 0,
    ascensions: 0,
    shatter: 0,
    overload: 0,
    collapse: 0,
    collapseHits: 0,
    overloadChained: 0,
    wetStrikes: 0,
  };

  constructor(private ctx: GameContext) {
    const uTime = ctx.sys.vfx.uTime;
    this.shield = new ShieldBubble(uTime);
    ctx.scene.add(this.shield.mesh);
    for (let i = 0; i < 2; i++) {
      const c = new StormCloud(uTime);
      ctx.scene.add(c.mesh);
      this.stormClouds.push(c);
      const r = new RiftVisual(uTime);
      ctx.scene.add(r.group);
      this.riftVisuals.push(r);
    }
    ctx.events.on('damage', (e) => {
      if (e.target === ctx.sys.player.entity && e.result.absorbed > 0 && this.shieldT > 0) {
        this.stats.absorbed += e.result.absorbed;
        this.shield.pulse();
        if (e.info.point) ctx.sys.vfx.burst('arcaneSpark', e.info.point, { color: 0x58b0ff, count: 6 });
      }
    });
  }

  private get player() {
    return this.ctx.sys.player.entity;
  }

  private dmg(c: CastContext, key = 'damage'): number {
    return abilityValue(ABILITIES[c.id], key, c.rank) * c.power;
  }

  private shake(i: number, d: number) {
    (this.ctx.sys.camera as unknown as { shake?: (i: number, d: number) => void }).shake?.(i, d);
  }

  private combo(id: 'shatter' | 'overload' | 'riftCollapse', pos: THREE.Vector3) {
    const name = SPELL_COMBOS[id].name;
    this.ctx.events.emit('combat:combo', { comboId: id, name, position: pos.clone() });
  }

  /** Origem das magias: mão esquerda (a que conjura). */
  private hand(out: THREE.Vector3): THREE.Vector3 {
    return this.ctx.sys.player.getHandWorldPosition('left', out);
  }

  /**
   * Ponto no chão para magias de área (Tempestade, Fenda): com alvo travado, o próprio alvo
   * (o raio de mira passaria por ele e cairia atrás); senão, onde a mira toca o terreno.
   */
  private groundTarget(range: number, out: THREE.Vector3): THREE.Vector3 {
    const p = this.ctx.sys.player;
    const lt = p.lockTarget;
    if (lt && lt.alive && !lt.removed && lt.position.distanceTo(this.player.position) <= range + 2) return out.copy(lt.position);
    return p.getAimPoint(range, out);
  }

  private aimDir(origin: THREE.Vector3, range: number, out: THREE.Vector3): THREE.Vector3 {
    const p = this.ctx.sys.player;
    p.getAimPoint(range, V3);
    out.subVectors(V3, origin);
    if (out.lengthSq() < 0.5) p.getAimRay(V2, out);
    return out.normalize();
  }

  /** Inimigos hostis num cone à frente (alvos das Correntes). */
  findConeTargets(range: number, coneDeg: number, max: number): Entity[] {
    const p = this.ctx.sys.player;
    const player = this.player;
    p.getAimRay(V1, V2);
    V2.y = 0;
    if (V2.lengthSq() < 1e-6) player.getForward(V2);
    V2.normalize();
    const cos = Math.cos((coneDeg * Math.PI) / 360);
    const combat = this.ctx.sys.combat;
    const out: { e: Entity; score: number }[] = [];
    const eye = V1.copy(player.position).setY(player.position.y + 1.4);
    for (const e of this.ctx.entities.queryRadius(player.position, range, this.list)) {
      if (e === player || !e.health || !e.alive || !combat.isHostile(player, e)) continue;
      const dx = e.position.x - player.position.x;
      const dz = e.position.z - player.position.z;
      const d = Math.hypot(dx, dz) || 0.001;
      const dot = (dx * V2.x + dz * V2.z) / d;
      if (dot < cos && d > 2) continue;
      if (!this.ctx.physics.lineOfSight(eye, e.getCenter(V3))) continue;
      out.push({ e, score: d * (2 - dot) });
    }
    out.sort((a, b) => a.score - b.score);
    return out.slice(0, max).map((o) => o.e);
  }

  /** Verificação antes de gastar energia (ex.: Correntes sem alvo). */
  precheck(id: AbilityId, rank: number): string | null {
    if (id === 'arcaneChains') {
      const def = ABILITIES[id];
      if (this.findConeTargets(abilityValue(def, 'range', rank), abilityValue(def, 'coneDeg', rank), 1).length === 0) return 'Nenhum alvo à frente.';
    }
    if (id === 'ascendantForm' && this.ctx.sys.abilities.ascended) return 'A Forma Ascendente já está ativa.';
    return null;
  }

  // =====================================================================
  // Execução (quadro de impacto)
  // =====================================================================
  execute(c: CastContext): THREE.Vector3 {
    const pos = new THREE.Vector3().copy(this.player.position);
    switch (c.id) {
      case 'arcaneOrb':
        return this.arcaneOrb(c);
      case 'energyLance':
        return this.energyLance(c);
      case 'runicBlast':
        return this.runicBlast(c);
      case 'arcaneChains':
        return this.arcaneChains(c);
      case 'magicShield':
        return this.magicShield(c);
      case 'blink':
        return this.blink(c);
      case 'lightningStorm':
        return this.lightningStorm(c);
      case 'etherealBlades':
        return this.etherealBlades(c);
      case 'dimensionalRift':
        return this.dimensionalRift(c);
      case 'ascendantForm':
        return this.ascendantForm(c);
    }
    return pos;
  }

  private arcaneOrb(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.arcaneOrb;
    const origin = this.hand(new THREE.Vector3());
    const dir = this.aimDir(origin, def.range, new THREE.Vector3());
    const dmg = this.dmg(c);
    this.ctx.sys.combat.spawnProjectile({
      kind: 'arcaneOrb',
      source: this.player,
      origin,
      direction: dir,
      speed: abilityValue(def, 'speed', c.rank),
      range: def.range,
      radius: abilityValue(def, 'projectileRadius', c.rank),
      damage: { amount: dmg, type: 'arcane', knockback: abilityValue(def, 'knockback', c.rank), poiseDamage: abilityValue(def, 'poise', c.rank), tag: 'arcaneOrb' },
      explodeRadius: abilityValue(def, 'radius', c.rank),
      visualScale: 1 + (c.rank - 1) * 0.15,
    });
    this.ctx.sys.vfx.burst('arcaneSpark', origin, { color: def.color, count: 10, direction: dir });
    this.stats.orbs++;
    return origin;
  }

  private energyLance(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.energyLance;
    const p = this.ctx.sys.player;
    // a lógica parte do peito (linha de mira estável); o visual parte da ponta do cajado
    const tip = p.getWeaponTipWorldPosition(new THREE.Vector3());
    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    p.getAimRay(origin, dir);
    // alvo travado quase no mesmo nível: feixe na horizontal, na altura do centro do alvo
    // (senão a linha peito→centro desce e bate no chão logo atrás do alvo)
    const lt = p.lockTarget;
    if (lt && lt.alive && !lt.removed) {
      lt.getCenter(V3);
      if (Math.abs(V3.y - origin.y) < 2 && !p.isFlying()) {
        origin.y = V3.y;
        dir.subVectors(V3, origin).normalize();
      }
    }
    const range = abilityValue(def, 'range', c.rank);
    const dmg = this.dmg(c) * chargedValue(1, abilityValue(def, 'chargedDamageMul', c.rank), c.charge);
    const width = 0.45 + c.charge * 0.45;
    const rooted = new Set<number>();
    const combat = this.ctx.sys.combat;
    const player = this.player;
    const res = combat.beamAttack(
      player,
      origin,
      dir,
      range,
      width,
      { amount: dmg, type: 'arcane', knockback: abilityValue(def, 'knockback', c.rank), poiseDamage: abilityValue(def, 'poise', c.rank) * (1 + c.charge), tag: 'energyLance' },
      {
        pierce: true,
        color: def.color,
        visual: false,
        filter: (e) => {
          if (!combat.isHostile(player, e)) return false;
          if (e.health?.has('root') || combat.hasMark(e, 'chained')) rooted.add(e.id);
          return true;
        },
        onHit: (e, _r, point) => {
          if (!rooted.has(e.id) || !e.alive) return;
          // ESTILHAÇAR: Correntes + Lança
          const S = SPELL_COMBOS.shatter;
          combat.applyDamage(e, { amount: dmg * (S.damageMul - 1), type: 'arcane', source: player, poiseDamage: S.poiseDamage, tag: 'shatter', crit: true });
          if (e.alive && e.health) {
            e.health.clearStatus('root');
            e.health.staggerTimer = Math.max(e.health.staggerTimer, S.bonusStun);
          }
          combat.clearMark(e, 'chained');
          this.ctx.sys.vfx.burst('crystalShatter', point, { color: 0x6fffd0, scale: 1.5, count: 22 });
          this.ctx.sys.vfx.flash(point, 0x6fffd0, 40, 0.3);
          this.stats.shatter++;
          this.combo('shatter', point);
        },
      },
    );
    const vfx = this.ctx.sys.vfx;
    vfx.beam(tip, res.end, def.color, width * 0.9, 0.3 + c.charge * 0.2);
    vfx.beam(tip, res.end, 0xffffff, width * 0.5, 0.25 + c.charge * 0.2);
    vfx.burst('arcaneSpark', tip, { color: def.color, scale: 1 + c.charge, count: 10 + Math.round(c.charge * 10), direction: dir });
    vfx.flash(tip, def.color, 30 + 40 * c.charge, 0.3);
    // centelhas ao longo do feixe
    const len = tip.distanceTo(res.end);
    for (let i = 0; i < Math.min(10, len / 3); i++) {
      V1.copy(tip).lerp(res.end, Math.random());
      vfx.spark(V1, def.color, 0.15, 0.35, (Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3);
    }
    this.shake(0.15 + c.charge * 0.25, 0.25);
    if (res.blocked) vfx.burst('arcaneSpark', res.end, { color: def.color, scale: 1.4 });
    this.stats.lances++;
    this.stats.lanceHits += res.hits.length;
    return tip;
  }

  private runicBlast(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.runicBlast;
    const center = new THREE.Vector3().copy(this.player.position);
    center.y += 0.2;
    const radius = abilityValue(def, 'radius', c.rank);
    const combat = this.ctx.sys.combat;
    // COLAPSO DIMENSIONAL: explosão dentro de uma fenda ativa
    for (const r of this.rifts) {
      if (!r.collapsed && r.center.distanceTo(center) <= r.radius + radius * 0.5) {
        this.implode(r, true);
      }
    }
    const hits = combat.explode(
      center,
      radius,
      { amount: this.dmg(c), type: 'arcane', knockback: abilityValue(def, 'knockback', c.rank), poiseDamage: abilityValue(def, 'poise', c.rank), tag: 'runicBlast' },
      this.player,
      { falloff: true },
    );
    for (const e of hits) combat.mark(e, 'runeMark', SPELL_COMBOS.runeMarkDuration);
    const vfx = this.ctx.sys.vfx;
    const g = V1.copy(center);
    g.y = this.ctx.physics.groundHeight(center.x, center.z, center.y + 0.5);
    if (center.y - g.y > 3) g.y = center.y - 0.2;
    vfx.runeCircle(g, radius * 0.95, def.color, 0.9, 3);
    vfx.burst('shockwave', g, { scale: radius / 5.5, color: def.color });
    vfx.shell(V2.copy(center).setY(center.y + 0.8), 0.5, radius, def.color, 0.4);
    vfx.burst('arcaneBurst', V2, { scale: 1.6, color: def.color, count: 30 });
    vfx.groundFlash(g, radius, 0xc0a0ff, 0.35);
    vfx.flash(V2, def.color, 80, 0.45);
    this.shake(0.45, 0.35);
    this.stats.blasts++;
    this.stats.blastHits += hits.length;
    return center;
  }

  private arcaneChains(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.arcaneChains;
    const targets = this.findConeTargets(abilityValue(def, 'range', c.rank), abilityValue(def, 'coneDeg', c.rank), abilityValue(def, 'targets', c.rank));
    const dur = abilityValue(def, 'duration', c.rank);
    const combat = this.ctx.sys.combat;
    const vfx = this.ctx.sys.vfx;
    const hand = this.hand(new THREE.Vector3());
    for (const e of targets) {
      const h = e.health!;
      const immune = e.kind === 'boss' || h.statusImmune.has('root');
      const info: DamageInfo = {
        amount: this.dmg(c),
        type: 'arcane',
        source: this.player,
        poiseDamage: 10,
        statuses: immune ? [{ id: 'slow', duration: dur, magnitude: abilityValue(def, 'bossSlow', c.rank) }] : [{ id: 'root', duration: dur }],
        tag: 'arcaneChains',
      };
      combat.applyDamage(e, info);
      if (immune) this.stats.bossSlowed++;
      else {
        combat.mark(e, 'chained', dur);
        this.stats.chained++;
        this.chains.push({ target: e, t: 0, dur, acc: 0 });
      }
      e.getCenter(V1);
      vfx.chain(hand, V1, def.color, 0.55, 0.14);
      vfx.runeCircle(e.position, e.radius + 0.9, def.color, dur, 2);
      vfx.burst('arcaneSpark', V1, { color: def.color, count: 10 });
    }
    return hand;
  }

  private magicShield(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.magicShield;
    const h = this.player.health!;
    const amount = abilityValue(def, 'absorb', c.rank) * this.ctx.sys.progression.getStat('shieldPower') * (c.power > 1 ? 1 + (c.power - 1) * 0.5 : 1);
    h.shield = Math.max(h.shield, amount);
    h.shieldMax = Math.max(h.shieldMax, amount);
    this.shieldDur = abilityValue(def, 'duration', c.rank);
    this.shieldT = this.shieldDur;
    this.shieldReflect = abilityValue(def, 'reflect', c.rank) > 0;
    if (this.shieldReflect) this.ctx.sys.combat.reflectors.add(this.player);
    this.shield.active = true;
    this.shield.setColor(this.shieldReflect ? 0x9fd8ff : def.color);
    const vfx = this.ctx.sys.vfx;
    const center = this.player.getCenter(new THREE.Vector3());
    vfx.shell(center, 0.4, 1.6, def.color, 0.35);
    vfx.burst('arcaneSpark', center, { color: def.color, count: 16, scale: 1.2 });
    vfx.runeCircle(this.player.position, 1.4, def.color, 0.8, 3);
    this.stats.shields++;
    return center;
  }

  /** Termina o escudo (tempo acabou ou absorção esgotada). */
  private endShield(broken: boolean) {
    const h = this.player.health!;
    h.shield = 0;
    h.shieldMax = 0;
    this.shieldT = 0;
    this.shield.active = false;
    this.ctx.sys.combat.reflectors.delete(this.player);
    if (broken) {
      const center = this.player.getCenter(V1);
      this.ctx.sys.vfx.burst('crystalShatter', center, { color: 0x58b0ff, scale: 1.3 });
      this.ctx.sys.audio.play('block', { position: center, pitch: 1.4 });
    }
  }

  private blink(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.blink;
    const p = this.ctx.sys.player;
    const player = this.player;
    const range = abilityValue(def, 'range', c.rank);
    const margin = abilityValue(def, 'wallMargin', c.rank);
    const stepUp = abilityValue(def, 'maxStepUp', c.rank);
    const flying = p.isFlying();
    // direção: entrada de movimento (relativa à câmera) ou mira
    const input = this.ctx.input;
    const mx = input.axis('left', 'right');
    const mz = input.axis('back', 'forward');
    const dir = new THREE.Vector3();
    const cam = this.ctx.sys.camera as unknown as { getForward?: (o: THREE.Vector3) => THREE.Vector3; getRight?: (o: THREE.Vector3) => THREE.Vector3 };
    if ((mx !== 0 || mz !== 0) && cam.getForward && cam.getRight) {
      cam.getForward(V1).setY(0).normalize();
      cam.getRight(V2).setY(0).normalize();
      dir.copy(V1).multiplyScalar(mz).addScaledVector(V2, mx);
    } else {
      p.getAimRay(V1, dir);
      if (!flying) dir.y = 0;
    }
    if (dir.lengthSq() < 1e-6) player.getForward(dir);
    dir.normalize();
    const from = new THREE.Vector3().copy(player.position);
    const start = V3.copy(from).setY(from.y + 1.0);
    const hit = this.ctx.physics.raycast(start, dir, range + margin, { ignoreTags: ['tree'] });
    let dist = hit ? Math.max(0, hit.distance - margin) : range;
    const dest = new THREE.Vector3();
    const test = new THREE.Vector3();
    // encurta até achar um destino válido (chão alcançável, fora de colisores)
    let ok = false;
    for (; dist > 0.5; dist -= 1) {
      dest.copy(from).addScaledVector(dir, dist);
      if (!flying) {
        const g = this.ctx.physics.groundHeight(dest.x, dest.z, from.y + stepUp);
        if (g - from.y > stepUp) continue;
        // não cair de penhascos enormes: aceita até 6 m de queda
        if (from.y - g > 6) continue;
        dest.y = g;
      } else {
        const g = this.ctx.physics.groundHeight(dest.x, dest.z, dest.y + 1);
        dest.y = Math.max(dest.y, g + 1.2);
      }
      test.copy(dest);
      this.ctx.physics.resolveCapsule(test, player.radius, player.height);
      if (test.distanceTo(dest) > 0.35) continue;
      ok = true;
      break;
    }
    const vfx = this.ctx.sys.vfx;
    if (!ok) {
      dest.copy(from);
      dist = 0;
    }
    vfx.burst('teleport', from, { color: def.color });
    if (dist > 0) {
      vfx.beam(V1.copy(from).setY(from.y + 1), V2.copy(dest).setY(dest.y + 1), def.color, 0.35, 0.25);
      p.teleport(dest, player.yaw);
      vfx.burst('teleport', dest, { color: def.color });
    }
    player.health!.invulnerable = Math.max(player.health!.invulnerable, abilityValue(def, 'iframes', c.rank));
    this.stats.blinks++;
    this.stats.lastBlinkDistance = dist;
    return dest;
  }

  private lightningStorm(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.lightningStorm;
    const p = this.ctx.sys.player;
    const aim = this.groundTarget(def.range, new THREE.Vector3());
    const ground = this.ctx.physics.groundHeight(aim.x, aim.z, aim.y + 1);
    const radius = abilityValue(def, 'radius', c.rank);
    const cloud = this.stormClouds.find((s) => !s.active) ?? this.stormClouds[0];
    // encerra tempestade antiga que usava esta nuvem
    this.storms = this.storms.filter((s) => s.cloud !== cloud);
    cloud.active = true;
    const zone: StormZone = {
      center: new THREE.Vector3(aim.x, ground, aim.z),
      ground,
      radius,
      t: 0,
      dur: abilityValue(def, 'duration', c.rank),
      acc: 0.15,
      interval: abilityValue(def, 'interval', c.rank),
      strikes: abilityValue(def, 'strikesPerTick', c.rank),
      damage: this.dmg(c),
      rank: c.rank,
      cloud,
      struck: 0,
    };
    this.storms.push(zone);
    this.ctx.sys.vfx.runeCircle(zone.center, radius, def.color, zone.dur, 0.6, 0.5);
    this.stats.storms++;
    return zone.center;
  }

  private stormStrike(z: StormZone) {
    const def = ABILITIES.lightningStorm;
    const combat = this.ctx.sys.combat;
    const vfx = this.ctx.sys.vfx;
    const player = this.player;
    const raining = !!this.ctx.sys.env?.isRaining?.();
    const n = z.strikes + (raining ? abilityValue(def, 'rainExtraStrikes', z.rank) : 0);
    const cands = this.ctx.entities.queryRadius(z.center, z.radius, this.list).filter((e) => e !== player && e.health && e.alive && combat.isHostile(player, e));
    // embaralha (Fisher-Yates parcial)
    for (let i = cands.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = cands[i];
      cands[i] = cands[j];
      cands[j] = t;
    }
    for (let k = 0; k < n; k++) {
      const e = cands[k];
      const target = V1;
      if (e) e.getCenter(target);
      else {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * z.radius;
        target.set(z.center.x + Math.cos(a) * r, 0, z.center.z + Math.sin(a) * r);
        target.y = this.ctx.physics.heightfield.heightAt(target.x, target.z);
      }
      const sky = V2.set(target.x + (Math.random() - 0.5) * 3, z.ground + 14, target.z + (Math.random() - 0.5) * 3);
      vfx.lightning(sky, target, { color: def.color, branches: 2, duration: 0.3, width: 0.16 });
      vfx.burst('lightning', target, { scale: 0.9, color: def.color });
      z.cloud.strike();
      if (e) {
        const wet = combat.isWet(e);
        if (wet) this.stats.wetStrikes++;
        combat.applyDamage(e, {
          amount: z.damage,
          type: 'lightning',
          source: player,
          poiseDamage: abilityValue(def, 'poise', z.rank),
          statuses: [{ id: 'shock', duration: abilityValue(def, 'shockDuration', z.rank), magnitude: abilityValue(def, 'shockDps', z.rank) }],
          tag: 'lightningStorm',
        });
        // SOBRECARGA: alvo com Marca Rúnica
        if (e.alive && combat.hasMark(e, 'runeMark')) {
          combat.clearMark(e, 'runeMark');
          const O = SPELL_COMBOS.overload;
          const chained = combat.chainLightning(player, e, O.jumps, O.range, { amount: z.damage * O.damageMul, type: 'lightning', poiseDamage: 10, tag: 'overload' }, undefined, 0xd0a0ff);
          vfx.burst('arcaneBurst', target, { color: 0xc0a0ff, scale: 0.8 });
          this.stats.overload++;
          this.stats.overloadChained += chained.length;
          this.combo('overload', target);
        }
      }
      this.stats.stormStrikes++;
      z.struck++;
    }
    this.ctx.sys.audio.play('thunder', { position: z.center, volume: 0.8 });
  }

  private etherealBlades(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.etherealBlades;
    const player = this.player;
    const count = abilityValue(def, 'count', c.rank);
    const range = abilityValue(def, 'range', c.rank);
    const combat = this.ctx.sys.combat;
    // alvos distintos mais próximos
    const targets = this.ctx.entities
      .queryRadius(player.position, range, this.list)
      .filter((e) => e !== player && e.health && e.alive && combat.isHostile(player, e))
      .sort((a, b) => a.position.distanceToSquared(player.position) - b.position.distanceToSquared(player.position));
    const center = player.getCenter(new THREE.Vector3());
    const aimDir = this.aimDir(center, range, new THREE.Vector3());
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + player.yaw;
      const origin = new THREE.Vector3(center.x + Math.sin(a) * 1.1, center.y + 0.5 + (i % 2) * 0.3, center.z + Math.cos(a) * 1.1);
      // velocidade inicial tangencial (órbita) e para cima
      const dir = new THREE.Vector3(Math.cos(a), 0.6, -Math.sin(a)).normalize().lerp(aimDir, 0.35).normalize();
      const target = targets.length ? targets[i % targets.length] : null;
      combat.spawnProjectile({
        kind: 'etherealBlade',
        source: player,
        origin,
        direction: dir,
        speed: abilityValue(def, 'speed', c.rank),
        range: range * 2,
        radius: 0.3,
        damage: {
          amount: this.dmg(c),
          type: 'arcane',
          poiseDamage: 12,
          knockback: 1,
          statuses: [{ id: 'vulnerable', duration: abilityValue(def, 'duration', c.rank), magnitude: abilityValue(def, 'vulnerable', c.rank) }],
          tag: 'etherealBlades',
        },
        homingTarget: target,
        homingStrength: abilityValue(def, 'homing', c.rank),
        homingDelay: abilityValue(def, 'orbitTime', c.rank),
        retarget: true,
      });
      this.ctx.sys.vfx.burst('arcaneSpark', origin, { color: def.color, count: 5 });
    }
    this.stats.blades += count;
    return center;
  }

  private dimensionalRift(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.dimensionalRift;
    const p = this.ctx.sys.player;
    const aim = this.groundTarget(def.range, new THREE.Vector3());
    const ground = this.ctx.physics.groundHeight(aim.x, aim.z, aim.y + 1);
    const visual = this.riftVisuals.find((v) => !v.active) ?? this.riftVisuals[0];
    this.rifts = this.rifts.filter((r) => r.visual !== visual);
    visual.active = true;
    const zone: RiftZone = {
      center: new THREE.Vector3(aim.x, ground + 1.4, aim.z),
      ground,
      radius: abilityValue(def, 'radius', c.rank),
      t: 0,
      dur: abilityValue(def, 'duration', c.rank),
      acc: 0,
      damage: this.dmg(c),
      implode: this.dmg(c, 'implodeDamage'),
      pull: abilityValue(def, 'pull', c.rank),
      visual,
      fxAcc: 0,
      collapsed: false,
    };
    this.rifts.push(zone);
    const vfx = this.ctx.sys.vfx;
    vfx.burst('void', zone.center, { scale: 1.4 });
    vfx.runeCircle(V1.set(aim.x, ground, aim.z), zone.radius, def.color, zone.dur, -1.5, 0.7);
    this.stats.rifts++;
    return zone.center;
  }

  private implode(r: RiftZone, collapse: boolean) {
    if (r.collapsed) return;
    r.collapsed = true;
    const def = ABILITIES.dimensionalRift;
    const C = SPELL_COMBOS.riftCollapse;
    const radius = r.radius * (collapse ? C.radiusMul : 0.85);
    const amount = r.implode * (collapse ? C.damageMul : 1);
    const statuses: DamageInfo['statuses'] = collapse ? [{ id: 'stun', duration: C.stun }] : undefined;
    const hits = this.ctx.sys.combat.explode(r.center, radius, { amount, type: 'void', source: this.player, knockback: abilityValue(def, 'implodeKnockback', 1), poiseDamage: 60, statuses, tag: collapse ? 'riftCollapse' : 'riftImplode' }, this.player, { falloff: true });
    const vfx = this.ctx.sys.vfx;
    vfx.shell(r.center, radius, 0.3, def.color, 0.35);
    vfx.shell(r.center, 0.3, radius * 1.1, 0xff70ff, 0.5, 0.9);
    vfx.burst('void', r.center, { scale: 2.2, count: 30 });
    vfx.burst('arcaneBurst', r.center, { scale: 1.6, color: def.color });
    vfx.ring(V1.set(r.center.x, r.ground, r.center.z), radius, def.color, 0.6);
    vfx.flash(r.center, collapse ? 0xff70ff : def.color, collapse ? 120 : 70, 0.5);
    this.ctx.sys.audio.play('explosion', { position: r.center });
    this.shake(collapse ? 0.7 : 0.45, 0.45);
    r.t = r.dur; // encerra
    r.visual.active = false;
    this.stats.implosions++;
    if (collapse) {
      this.stats.collapse++;
      this.stats.collapseHits = hits.length;
      this.combo('riftCollapse', r.center);
    }
  }

  private ascendantForm(c: CastContext): THREE.Vector3 {
    const def = ABILITIES.ascendantForm;
    const player = this.player;
    const center = player.getCenter(new THREE.Vector3());
    this.ctx.sys.combat.explode(player.position, def.radius, { amount: this.dmg(c), type: 'arcane', knockback: abilityValue(def, 'knockback', c.rank), poiseDamage: 80, tag: 'ascendantForm' }, player, { falloff: true });
    const vfx = this.ctx.sys.vfx;
    vfx.burst('levelUp', player.position, { color: def.color, scale: 1.3 });
    vfx.burst('shockwave', player.position, { color: def.color, scale: def.radius / 5 });
    vfx.shell(center, 0.5, def.radius, def.color, 0.6);
    vfx.flash(center, def.color, 120, 1.0);
    vfx.runeCircle(player.position, 3.2, def.color, 2.2, 1.2);
    this.shake(0.6, 0.6);
    this.stats.ascensions++;
    return center;
  }

  // =====================================================================
  // Zonas persistentes
  // =====================================================================
  update(dt: number) {
    const ctx = this.ctx;
    const player = this.player;
    const vfx = ctx.sys.vfx;
    // Escudo
    if (this.shieldT > 0) {
      this.shieldT -= dt;
      const h = player.health!;
      if (h.shield <= 0.01) this.endShield(true);
      else if (this.shieldT <= 0) this.endShield(false);
    }
    const h = player.health!;
    this.shield.update(dt, player.getCenter(V1), h.shieldMax > 0 ? h.shield / h.shieldMax : 0);

    // Tempestades
    for (let i = this.storms.length - 1; i >= 0; i--) {
      const z = this.storms[i];
      z.t += dt;
      z.acc -= dt;
      if (z.acc <= 0 && z.t < z.dur) {
        z.acc += z.interval;
        this.stormStrike(z);
      }
      if (z.t >= z.dur) {
        z.cloud.active = false;
        this.storms.splice(i, 1);
      }
    }
    for (const s of this.stormClouds) {
      const z = this.stormOf(s);
      if (z) V2.set(z.center.x, z.ground + 13, z.center.z);
      s.update(dt, z ? V2 : s.mesh.position, z ? z.radius : s.mesh.scale.x / 1.35);
    }

    // Fendas
    const combat = ctx.sys.combat;
    for (let i = this.rifts.length - 1; i >= 0; i--) {
      const r = this.rifts[i];
      r.t += dt;
      if (r.collapsed || r.t >= r.dur) {
        if (!r.collapsed) this.implode(r, false);
        r.visual.active = false;
        this.rifts.splice(i, 1);
        continue;
      }
      // puxão contínuo
      for (const e of ctx.entities.queryRadius(r.center, r.radius, this.list)) {
        if (e === player || !e.health || !e.alive || !combat.isHostile(player, e)) continue;
        V1.subVectors(r.center, e.position).setY(0);
        const d = V1.length();
        if (d < 0.6) continue;
        V1.multiplyScalar(1 / d);
        const k = (e.kind === 'boss' ? abilityValue(ABILITIES.dimensionalRift, 'bossPullMul', 1) : 1) * Math.min(1, d / 2);
        e.velocity.x += V1.x * r.pull * k * dt * 4;
        e.velocity.z += V1.z * r.pull * k * dt * 4;
      }
      r.acc -= dt;
      if (r.acc <= 0) {
        r.acc += abilityValue(ABILITIES.dimensionalRift, 'tick', 1);
        combat.explode(r.center, r.radius, { amount: r.damage, type: 'void', source: player, poiseDamage: 4, tag: 'riftTick' }, player, { falloff: false, ignoreWalls: true });
        this.stats.riftTicks++;
      }
      r.fxAcc -= dt;
      if (r.fxAcc <= 0) {
        r.fxAcc = 0.28;
        vfx.burst('void', r.center, { scale: 1.1, count: 6 });
        // filetes de matéria sendo sugados
        const a = Math.random() * Math.PI * 2;
        V1.set(r.center.x + Math.cos(a) * r.radius, r.ground + 0.3, r.center.z + Math.sin(a) * r.radius);
        vfx.spark(V1, 0xc080ff, 0.25, 0.6, (r.center.x - V1.x) * 1.6, 1.5, (r.center.z - V1.z) * 1.6, 0, 0.04);
      }
      vfx.sprite(r.center, 1.2 + Math.sin(ctx.elapsed * 9) * 0.15, 0x9b4dff, 0.8);
    }
    for (const v of this.riftVisuals) {
      const r = this.riftOf(v);
      v.update(dt, r ? r.center : v.group.position, r ? r.ground : 0, r ? r.radius : 1, 1, ctx.camera);
    }

    // Correntes (âncoras visuais enquanto o alvo está preso)
    for (let i = this.chains.length - 1; i >= 0; i--) {
      const c = this.chains[i];
      c.t += dt;
      const e = c.target;
      if (c.t >= c.dur || !e.alive || e.removed || !(e.health?.has('root') ?? false)) {
        this.chains.splice(i, 1);
        continue;
      }
      c.acc -= dt;
      if (c.acc <= 0) {
        c.acc = 0.5;
        e.getCenter(V2);
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + c.t;
          V1.set(e.position.x + Math.cos(a) * (e.radius + 0.8), e.position.y + 0.05, e.position.z + Math.sin(a) * (e.radius + 0.8));
          vfx.chain(V1, V2, ABILITIES.arcaneChains.color, 0.55, 0.09);
        }
      }
    }
    void UP;
  }

  // buscas sem closures (rodam a cada quadro)
  private stormOf(c: StormCloud): StormZone | null {
    for (let i = 0; i < this.storms.length; i++) if (this.storms[i].cloud === c) return this.storms[i];
    return null;
  }
  private riftOf(v: RiftVisual): RiftZone | null {
    for (let i = 0; i < this.rifts.length; i++) if (this.rifts[i].visual === v) return this.rifts[i];
    return null;
  }

  /** Limpa tudo (novo jogo/carregamento). */
  clear() {
    if (this.shieldT > 0) this.endShield(false);
    this.storms.length = 0;
    this.rifts.length = 0;
    this.chains.length = 0;
    for (const s of this.stormClouds) s.active = false;
    for (const v of this.riftVisuals) v.active = false;
  }

  activeZones() {
    return { storms: this.storms.length, rifts: this.rifts.length, chains: this.chains.length, shield: this.shieldT > 0 };
  }
}
