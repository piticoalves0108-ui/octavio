import * as THREE from 'three';
import { Entity } from '../core/Entity';
import type { GameContext } from '../core/context';
import type { Interactable } from '../core/Interaction';
import { Health, type DamageInfo, type DamageResult } from '../combat/Health';
import { angleDiff, clamp, dampAngle } from '../core/math';
import { NPC_RULES, type NpcActivity, type NpcDef, type ScheduleEntry } from '../data/npcs';
import { PLACES, PATROL_ROUTES, placesWithTag, type Place } from '../data/places';
import { createNpcModel, disposeNpcModel, type NpcModel } from './model';
import { NpcAnimator, type NpcAnim, type NpcAnimInput } from './anim';
import { NamePlate, SpeechBubble, type QuestMark } from './labels';
import { effectiveSchedule, entryAt, entryKey, hashPick, seeksShelterFromRain } from './schedule';
import type { NPCs } from './NPCs';

/** Estado de comportamento (camada acima da rotina). */
export type NpcMode = 'routine' | 'talk' | 'startle' | 'flee' | 'hide' | 'cower' | 'engage' | 'knocked' | 'look';

const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const TAG_CACHE = new Map<string, Place[]>();
function anchorsWithTag(tag: string): Place[] {
  let l = TAG_CACHE.get(tag);
  if (!l) {
    l = placesWithTag(tag);
    TAG_CACHE.set(tag, l);
  }
  return l;
}

/** Âncora em que a pessoa fica sentada. */
function seatAnchor(id: string | null): boolean {
  if (!id) return false;
  return id.includes('assento') || id.includes('banco') || id.includes('lareira') || id.includes('varanda') || id.includes('leitura') || id === 'taverna_bardo';
}
/** Porta de casa (o NPC some lá dentro). */
function isDoor(id: string | null | undefined): boolean {
  if (!id) return false;
  const p = PLACES[id];
  return !!p && (p.kind === 'door' || id.endsWith('_porta') || id === 'taverna_entrada' || id === 'santuario_vila_altar');
}

let nextSeed = 1;

/**
 * Habitante com rotina por hora (caminho pelo grafo da vila), atividades
 * animadas, reações (susto, fuga, abrigo, encolher-se, nocaute), conversa com
 * o jogador e — para guardas — combate simples contra ameaças.
 */
export class NpcEntity extends Entity {
  readonly def: NpcDef;
  readonly model: NpcModel;
  readonly anim: NpcAnimator;
  mode: NpcMode = 'routine';
  modeT = 0;
  modeDur = 0;
  /** Atividade atual da rotina (ao chegar ao destino). */
  activity: NpcActivity = 'idle';
  entry: ScheduleEntry | null = null;
  private entryKeyStr = '';
  /** Âncora de destino (ou null para pontos de rota/coordenadas). */
  destAnchor: string | null = null;
  readonly dest = new THREE.Vector3();
  private destYaw: number | null = null;
  private path: { x: number; z: number }[] = [];
  private pathIdx = 0;
  moving = false;
  running = false;
  /** Dentro de casa (invisível). */
  hidden = false;
  /** Abrigando-se da chuva nesta entrada. */
  sheltering = false;
  private wanderT = 0;
  private wanderK = 0;
  private patrolIdx = 0;
  private patrolDir = 1;
  private waitT = 0;
  private scheduleT = 0;
  private lastGroundX = 1e9;
  private lastGroundZ = 1e9;
  speedNow = 0;
  /** Entre os N mais próximos do jogador (IA/animação completas). */
  full = true;
  private animSkip = 0;
  private animAcc = 0;
  lookYaw = 0;
  lookPitch = 0;
  private wantLook = false;
  readonly threat = new THREE.Vector3();
  threatEntity: Entity | null = null;
  private attackT = 0;
  /** Recarga das falas deste NPC. */
  barkCd = 0;
  greetCd = 0;
  plate: NamePlate | null = null;
  bubble: SpeechBubble | null = null;
  questMark: QuestMark = '';
  readonly interactable: Interactable;
  /** Interação na porta (NPCs da história dormindo: "bater à porta"). */
  readonly doorInteract: Interactable | null;
  /** Acordado no meio da noite para conversar. */
  awakened = false;
  private seed = nextSeed++;
  private animIn: NpcAnimInput = { anim: 'idle', speed: 0, running: false, lookYaw: 0, lookPitch: 0, stoop: false, heightScale: 1 };
  private sparkT = 0;

  constructor(
    def: NpcDef,
    private owner: NPCs,
  ) {
    const model = createNpcModel(def);
    super('npc', def.faction, model.root);
    this.def = def;
    this.model = model;
    this.typeId = `npc_${def.id}`;
    this.name = def.name;
    this.radius = 0.38;
    this.height = model.height;
    this.persistent = true;
    this.tags.add('npc');
    this.tags.add(`npc:${def.id}`);
    this.anim = new NpcAnimator(model.bones, model.body);
    this.animIn.stoop = !!def.look.stoop;
    this.animIn.heightScale = def.look.height;
    const h = new Health(def.faction === 'guard' ? NPC_RULES.guardHealth : NPC_RULES.health);
    h.immortal = true;
    h.regen = 4;
    this.health = h;
    this.interactable = {
      id: `npc:${def.id}`,
      kind: 'talk',
      prompt: `Conversar com ${def.name}`,
      position: new THREE.Vector3(),
      range: NPC_RULES.talkRange,
      enabled: true,
      priority: 2,
      interact: (ctx) => ctx.sys.dialogue.talkTo(def.id),
    };
    this.doorInteract = def.story
      ? {
          id: `npc_porta:${def.id}`,
          kind: 'talk',
          prompt: `Bater à porta (${def.name})`,
          position: new THREE.Vector3(),
          range: NPC_RULES.talkRange + 0.4,
          enabled: false,
          priority: 1,
          interact: () => this.owner.knock(this),
        }
      : null;
  }

  get ctx(): GameContext {
    return this.owner.context;
  }

  // =====================================================================
  // Rotina
  // =====================================================================
  /** Reavalia a rotina (troca de hora, chuva, flags). `snap` teletransporta para o destino. */
  evalSchedule(force = false, snap = false) {
    const ctx = this.ctx;
    const env = this.owner.env();
    const sched = effectiveSchedule(this.def, env);
    const e = entryAt(sched, ctx.clock.hours);
    const rain = !!env && env.raining() && seeksShelterFromRain(this.def, e);
    const key = entryKey(e) + (rain ? ':chuva' : '');
    if (!force && key === this.entryKeyStr) return;
    const prevAct = this.entry?.act;
    const wasHidden = this.hidden;
    this.entryKeyStr = key;
    this.entry = e;
    this.sheltering = rain;
    if (!snap && !wasHidden && this.isVisibleToPlayer()) {
      if (rain && prevAct !== undefined) this.owner.barkAt(this, 'rain');
      else if (e.act === 'sleep' && prevAct !== 'sleep') this.owner.barkAt(this, 'night');
    }
    this.startEntry(e, snap);
  }

  private startEntry(e: ScheduleEntry, snap: boolean) {
    this.wanderT = 0;
    this.waitT = 0;
    if (this.sheltering) {
      const sh = this.def.shelter ?? this.def.home;
      this.setDestAnchor(sh, 'idle', snap);
      return;
    }
    switch (e.act) {
      case 'sleep':
        this.setDestAnchor(e.at ?? this.def.home, 'sleep', snap);
        break;
      case 'patrol': {
        const r = e.route ? PATROL_ROUTES[e.route] : undefined;
        if (!r || r.points.length === 0) {
          this.setDestAnchor(this.def.home, 'idle', snap);
          break;
        }
        // ponto mais próximo da rota
        let best = 0;
        let bd = Infinity;
        r.points.forEach((p, i) => {
          const d = (p[0] - this.position.x) ** 2 + (p[1] - this.position.z) ** 2;
          if (d < bd) {
            bd = d;
            best = i;
          }
        });
        this.patrolIdx = best;
        this.patrolDir = 1;
        this.setDestPoint(r.points[best][0], r.points[best][1], 'patrol', snap);
        break;
      }
      case 'wander':
      case 'play':
        if (e.tag) {
          this.pickWander(e.tag, e.act, snap);
          break;
        }
        this.setDestAnchor(e.at ?? this.def.home, e.act, snap);
        break;
      default:
        this.setDestAnchor(e.at ?? this.def.home, e.act, snap);
        break;
    }
  }

  private pickWander(tag: string, act: NpcActivity, snap: boolean) {
    const list = anchorsWithTag(tag);
    if (!list.length) {
      this.setDestAnchor(this.def.home, 'idle', snap);
      return;
    }
    this.wanderK++;
    const p = list[hashPick(this.def.id, this.wanderK * 7 + this.seed, list.length)];
    this.setDestAnchor(p.id, act, snap);
    const [a, b] = NPC_RULES.wanderEvery;
    this.wanderT = a + Math.random() * (b - a);
  }

  private setDestAnchor(id: string, act: NpcActivity, snap: boolean) {
    const p = PLACES[id];
    this.activity = act;
    this.destAnchor = id;
    if (!p) {
      this.moving = false;
      return;
    }
    this.destYaw = p.yaw ?? null;
    this.goTo(p.x, p.z, snap);
  }

  private setDestPoint(x: number, z: number, act: NpcActivity, snap: boolean) {
    this.activity = act;
    this.destAnchor = null;
    this.destYaw = null;
    this.goTo(x, z, snap);
  }

  private goTo(x: number, z: number, snap: boolean, run = false) {
    this.dest.set(x, 0, z);
    this.running = run;
    if (snap) {
      this.arriveInstant();
      return;
    }
    // já está lá?
    const dx = x - this.position.x;
    const dz = z - this.position.z;
    if (dx * dx + dz * dz < 0.09) {
      this.path.length = 0;
      this.onArrive();
      return;
    }
    if (this.hidden) this.appear();
    const path = this.ctx.sys.world.findPath({ x: this.position.x, z: this.position.z }, { x, z });
    this.path.length = 0;
    if (path && path.length) for (const p of path) this.path.push(p);
    else this.path.push({ x, z });
    // primeiro ponto é a origem: pula
    this.pathIdx = this.path.length > 1 ? 1 : 0;
    this.moving = true;
  }

  /** Teletransporta direto ao destino (simulação distante / descanso / carregar jogo). */
  arriveInstant() {
    const ctx = this.ctx;
    if (this.destAnchor && ctx.sys.world.placePosition(this.destAnchor, V1)) this.position.copy(V1);
    else {
      this.position.x = this.dest.x;
      this.position.z = this.dest.z;
      this.position.y = ctx.physics.groundHeight(this.dest.x, this.dest.z, ctx.heightfield.heightAt(this.dest.x, this.dest.z) + 1.6);
    }
    this.lastGroundX = this.position.x;
    this.lastGroundZ = this.position.z;
    this.path.length = 0;
    this.moving = false;
    this.onArrive();
    this.anim.snap();
  }

  private onArrive() {
    this.moving = false;
    this.running = false;
    if (this.destYaw !== null) this.yaw = this.destYaw;
    if (this.mode === 'flee') {
      // chegou ao abrigo
      if (isDoor(this.def.shelter ?? this.def.home)) this.hideInside();
      this.setMode(this.hidden ? 'hide' : 'cower', this.rand(NPC_RULES.hideSeconds));
      return;
    }
    if (this.mode !== 'routine') return;
    const act = this.activity;
    if (act === 'sleep' || (this.sheltering && isDoor(this.destAnchor))) {
      this.hideInside();
      return;
    }
    if (act === 'patrol') this.waitT = 1.5 + Math.random() * 2.5;
  }

  private hideInside() {
    if (this.hidden) return;
    this.hidden = true;
    this.model.body.visible = false;
    this.queryable = false;
    this.solid = false;
    this.bubble?.hide();
    if (this.plate) this.plate.sprite.visible = false;
  }

  appear() {
    if (!this.hidden) return;
    this.hidden = false;
    this.model.body.visible = true;
    this.queryable = true;
    this.solid = true;
    // sai pela porta de casa
    const door = this.def.home;
    if (PLACES[door] && this.ctx.sys.world.placePosition(door, V1)) this.position.copy(V1);
    this.anim.snap();
  }

  private routineUpdate(dt: number) {
    if (this.moving) return;
    const act = this.activity;
    if (act === 'patrol' && this.entry?.route) {
      this.waitT -= dt;
      if (this.waitT > 0) return;
      const r = PATROL_ROUTES[this.entry.route];
      if (!r) return;
      const n = r.points.length;
      if (r.loop) this.patrolIdx = (this.patrolIdx + 1) % n;
      else {
        if (this.patrolIdx + this.patrolDir >= n || this.patrolIdx + this.patrolDir < 0) this.patrolDir *= -1;
        this.patrolIdx += this.patrolDir;
      }
      const p = r.points[this.patrolIdx];
      this.setDestPoint(p[0], p[1], 'patrol', false);
      return;
    }
    if ((act === 'wander' || act === 'play') && this.entry?.tag && !this.sheltering) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) this.pickWander(this.entry.tag, act, false);
    }
  }

  // =====================================================================
  // Modos / reações
  // =====================================================================
  setMode(m: NpcMode, dur = 0) {
    this.mode = m;
    this.modeT = 0;
    this.modeDur = dur;
  }

  private rand(r: [number, number]) {
    return r[0] + Math.random() * (r[1] - r[0]);
  }

  /** Disponível para reagir (não dormindo, nocauteado ou conversando). */
  get reactive(): boolean {
    return !this.hidden && this.mode !== 'knocked' && this.mode !== 'talk';
  }

  /** Susto rápido (magia, voo, barulho) olhando para `from`. */
  startle(from: THREE.Vector3) {
    if (!this.reactive || this.mode === 'flee' || this.mode === 'engage' || this.mode === 'cower') return;
    this.threat.copy(from);
    this.moving = false;
    this.setMode('startle', NPC_RULES.startleSeconds * (0.8 + Math.random() * 0.4));
  }

  /** Olhar para o céu apontando (jogador voando por cima). */
  lookUp(from: THREE.Vector3) {
    if (!this.reactive || this.mode !== 'routine') return;
    this.threat.copy(from);
    this.moving = false;
    this.setMode('look', 2.6);
  }

  /** Corre para o abrigo (ou se encolhe se não houver para onde ir). */
  flee(from: THREE.Vector3, threat: Entity | null) {
    if (!this.reactive) return;
    if (this.def.faction === 'guard') return;
    this.threat.copy(from);
    this.threatEntity = threat;
    const sh = this.def.shelter ?? this.def.home;
    const p = PLACES[sh];
    if (!p) {
      this.setMode('cower', this.rand(NPC_RULES.cowerSeconds));
      this.moving = false;
      return;
    }
    if (this.mode !== 'flee') this.owner.barkAt(this, 'flee');
    this.setMode('flee', 40);
    this.activity = 'idle';
    this.destAnchor = sh;
    this.destYaw = p.yaw ?? null;
    this.goTo(p.x, p.z, false, true);
  }

  /** Guarda: enfrentar uma ameaça. */
  engage(target: Entity) {
    if (this.def.faction !== 'guard' || !this.reactive) return;
    if (this.mode === 'engage' && this.threatEntity === target) return;
    if (this.mode !== 'engage') this.owner.barkAt(this, target.kind === 'player' ? 'hostile' : 'guard_engage');
    this.threatEntity = target;
    this.setMode('engage', 60);
    this.attackT = 0.4;
  }

  /** Volta à rotina (recalcula o caminho a partir de onde está). */
  resume(bark = true) {
    const was = this.mode;
    this.setMode('routine');
    this.threatEntity = null;
    if (bark && (was === 'cower' || was === 'hide' || was === 'flee' || was === 'engage') && !this.hidden) this.owner.barkAt(this, 'resume');
    this.evalSchedule(true);
  }

  beginTalk() {
    if (this.hidden) this.appear();
    this.moving = false;
    this.setMode('talk');
  }

  endTalk() {
    if (this.mode !== 'talk') return;
    this.awakened = false;
    this.resume(false);
  }

  private modeUpdate(dt: number, ctx: GameContext) {
    this.modeT += dt;
    switch (this.mode) {
      case 'startle':
      case 'look':
        if (this.modeT >= this.modeDur) this.resume(false);
        break;
      case 'cower':
        if (this.modeT >= this.modeDur) {
          if (this.threatEntity && this.threatEntity.alive && !this.threatEntity.removed && this.threatEntity.position.distanceToSquared(this.position) < 30 * 30) this.flee(this.threatEntity.position, this.threatEntity);
          else this.resume();
        }
        break;
      case 'hide':
        if (this.modeT >= this.modeDur) {
          const t = this.threatEntity;
          if (t && t.alive && !t.removed && t.position.distanceToSquared(this.position) < 35 * 35) this.modeT = this.modeDur * 0.6;
          else this.resume();
        }
        break;
      case 'flee':
        if (this.modeT > this.modeDur) this.resume();
        break;
      case 'knocked':
        if (this.modeT >= this.modeDur) {
          const h = this.health!;
          h.current = h.max;
          this.resume();
        }
        break;
      case 'engage':
        this.engageUpdate(dt, ctx);
        break;
      default:
        break;
    }
  }

  private engageUpdate(dt: number, ctx: GameContext) {
    const t = this.threatEntity;
    const R = NPC_RULES.guardAttack;
    if (!t || !t.alive || t.removed || this.modeT > this.modeDur || (t.kind === 'player' && !ctx.sys.story.is('guardas_hostis'))) {
      this.resume();
      return;
    }
    const d = Math.hypot(t.position.x - this.position.x, t.position.z - this.position.z);
    if (d > R.engageRadius * 2.2) {
      this.resume();
      return;
    }
    if (d > R.range) {
      // persegue (caminho direto, sem grafo — combate é curto e perto)
      if (!this.moving || this.path.length !== 1 || (this.path[0].x - t.position.x) ** 2 + (this.path[0].z - t.position.z) ** 2 > 1) {
        this.path.length = 0;
        this.path.push({ x: t.position.x, z: t.position.z });
        this.pathIdx = 0;
        this.moving = true;
        this.running = true;
        this.destAnchor = null;
        this.destYaw = null;
      }
      return;
    }
    this.moving = false;
    this.yaw = dampAngle(this.yaw, Math.atan2(t.position.x - this.position.x, t.position.z - this.position.z), 10, dt);
    this.attackT -= dt;
    if (this.attackT <= 0) {
      this.attackT = R.interval * (0.85 + Math.random() * 0.3);
      if (ctx.sys.combat.isHostile(this, t) || t.kind !== 'player') {
        V1.set(t.position.x - this.position.x, 0, t.position.z - this.position.z).normalize();
        ctx.sys.combat.applyDamage(t, { amount: R.damage, type: 'physical', source: this, direction: V1.clone(), knockback: 2.5, tag: 'melee' });
      }
    }
  }

  // =====================================================================
  // Entity
  // =====================================================================
  override onDamaged(info: DamageInfo, _r: DamageResult, ctx: GameContext) {
    const h = this.health!;
    const src = info.source ?? null;
    if (h.current <= 1.01 && this.mode !== 'knocked') {
      this.moving = false;
      this.setMode('knocked', NPC_RULES.knockoutSeconds);
      this.owner.barkAt(this, 'knockout');
    }
    this.owner.onNpcDamaged(this, src, ctx);
  }

  override update(dt: number, ctx: GameContext) {
    this.barkCd -= dt;
    this.greetCd -= dt;
    // rotina
    this.scheduleT -= dt;
    if (this.scheduleT <= 0) {
      this.scheduleT = NPC_RULES.scheduleCheck * (0.8 + Math.random() * 0.4);
      if (this.mode === 'routine') this.evalSchedule(false);
    }
    if (this.mode === 'routine') this.routineUpdate(dt);
    else this.modeUpdate(dt, ctx);

    // movimento
    this.speedNow = 0;
    if (this.moving && this.mode !== 'talk' && this.mode !== 'knocked' && this.mode !== 'startle' && this.mode !== 'cower' && this.mode !== 'look') this.move(dt, ctx);

    if (this.hidden) {
      this.syncInteract(ctx);
      return;
    }

    // olhar para o jogador por perto
    const pl = ctx.sys.player.entity.position;
    const dx = pl.x - this.position.x;
    const dz = pl.z - this.position.z;
    const d2 = dx * dx + dz * dz;
    this.wantLook = d2 < 16 && this.mode !== 'knocked' && this.mode !== 'cower';
    let tYaw = 0;
    let tPitch = 0;
    if (this.mode === 'talk' || this.mode === 'startle' || this.mode === 'look') {
      const tx = this.mode === 'talk' ? pl.x : this.threat.x;
      const tz = this.mode === 'talk' ? pl.z : this.threat.z;
      const want = Math.atan2(tx - this.position.x, tz - this.position.z);
      this.yaw = dampAngle(this.yaw, want, 6, dt);
    } else if (this.wantLook && !this.moving) {
      tYaw = clamp(angleDiff(this.yaw, Math.atan2(dx, dz)), -1.1, 1.1);
      const dy = ctx.sys.player.entity.position.y + 1.6 - (this.position.y + this.height * 0.92);
      tPitch = clamp(-Math.atan2(dy, Math.sqrt(d2)), -0.4, 0.4);
    }
    const k = 1 - Math.exp(-dt * 5);
    this.lookYaw += (tYaw - this.lookYaw) * k;
    this.lookPitch += (tPitch - this.lookPitch) * k;
    this.object3d.rotation.y = this.yaw;

    // animação (NPCs fora do limite de ativos animam com menos frequência)
    this.animAcc += dt;
    this.animSkip = (this.animSkip + 1) % (this.full ? 1 : 4);
    if (this.animSkip === 0) {
      this.animIn.anim = this.currentAnim();
      this.animIn.speed = this.speedNow;
      this.animIn.running = this.running;
      this.animIn.lookYaw = this.lookYaw;
      this.animIn.lookPitch = this.lookPitch;
      this.anim.update(Math.min(this.animAcc, 0.25), this.animIn);
      this.animAcc = 0;
      if (this.anim.strike) this.onStrike(ctx);
    }
    this.sparkT -= dt;

    // balão
    if (this.bubble) this.bubble.update(dt);
    this.syncInteract(ctx);
  }

  override farUpdate(_dt: number, ctx: GameContext) {
    // simulação barata: pula direto para o ponto da rotina
    if (this.mode === 'routine') {
      this.evalSchedule(false);
      if (this.moving) this.arriveInstant();
    } else if (this.mode === 'flee' || this.mode === 'cower' || this.mode === 'hide' || this.mode === 'startle' || this.mode === 'look' || this.mode === 'knocked' || this.mode === 'engage') {
      if (this.mode === 'knocked' && this.health) this.health.current = this.health.max;
      this.setMode('routine');
      this.evalSchedule(true, true);
    }
    this.syncInteract(ctx);
  }

  private move(dt: number, ctx: GameContext) {
    const speed = (this.running ? NPC_RULES.runSpeed : (this.def.walk ?? NPC_RULES.walkSpeed)) * (this.mode === 'flee' ? 1.05 : 1);
    let remaining = speed * dt;
    while (remaining > 0 && this.pathIdx < this.path.length) {
      const wp = this.path[this.pathIdx];
      const dx = wp.x - this.position.x;
      const dz = wp.z - this.position.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < 0.05) {
        this.pathIdx++;
        continue;
      }
      const step = Math.min(d, remaining);
      this.position.x += (dx / d) * step;
      this.position.z += (dz / d) * step;
      remaining -= step;
      this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 9, dt);
      if (step >= d - 1e-4) this.pathIdx++;
    }
    this.speedNow = speed;
    // chão (amostrado a cada ~0,3 m)
    const gx = this.position.x - this.lastGroundX;
    const gz = this.position.z - this.lastGroundZ;
    if (gx * gx + gz * gz > 0.09) {
      this.lastGroundX = this.position.x;
      this.lastGroundZ = this.position.z;
      const hf = ctx.heightfield.heightAt(this.position.x, this.position.z);
      this.position.y = ctx.physics.groundHeight(this.position.x, this.position.z, Math.max(this.position.y, hf) + 0.5);
    }
    if (this.pathIdx >= this.path.length) {
      if (this.mode === 'engage') {
        this.moving = false;
        return;
      }
      this.path.length = 0;
      this.onArrive();
    }
  }

  private currentAnim(): NpcAnim {
    switch (this.mode) {
      case 'talk':
        return 'talk';
      case 'startle':
        return 'startle';
      case 'look':
        return 'pointUp';
      case 'cower':
        return 'cower';
      case 'flee':
        return this.def.role === 'child' ? 'cower' : 'idle';
      case 'knocked':
        return 'knocked';
      case 'engage':
        return this.moving ? 'idle' : 'thrust';
      case 'hide':
        return 'idle';
      default:
        break;
    }
    if (this.sheltering) return 'idle';
    const seated = seatAnchor(this.destAnchor);
    switch (this.activity) {
      case 'hammer':
        return 'hammer';
      case 'sweep':
        return 'sweep';
      case 'harvest':
        return 'harvest';
      case 'work':
        return 'work';
      case 'sit':
        return seated ? 'sit' : 'idle';
      case 'drink':
        return seated ? 'drink' : 'chat';
      case 'pray':
        return 'pray';
      case 'read':
        return 'read';
      case 'guard':
        return 'guard';
      case 'sell':
        return 'sell';
      case 'chat':
        return 'chat';
      case 'play':
        return this.def.look.tool === 'lute' ? (seated ? 'lute' : 'chat') : 'play';
      case 'wander':
        return 'idle';
      default:
        return 'idle';
    }
  }

  /** Golpe de ferramenta: faíscas na bigorna (perto do jogador). */
  private onStrike(ctx: GameContext) {
    if (this.activity === 'hammer' && this.mode === 'routine' && this.sparkT <= 0) {
      const pl = ctx.sys.player.entity.position;
      if (pl.distanceToSquared(this.position) < 28 * 28) {
        this.sparkT = 0.5;
        this.model.bones[6].localToWorld(V2.copy(this.model.handOffset));
        ctx.sys.vfx.burst('metalSpark', V2, { count: 6, scale: 0.5 });
      }
    }
  }

  private isVisibleToPlayer(): boolean {
    const pl = this.owner.context.sys.player.entity.position;
    return pl.distanceToSquared(this.position) < 40 * 40;
  }

  /** Atualiza a posição/estado das interações [E]. */
  private syncInteract(ctx: GameContext) {
    const it = this.interactable;
    it.position.copy(this.position);
    const hostile = this.def.faction === 'guard' && ctx.sys.story.is('guardas_hostis');
    it.enabled = !this.hidden && this.mode !== 'knocked' && this.mode !== 'flee' && this.mode !== 'engage' && !hostile && ctx.sys.dialogue.active === false;
    const di = this.doorInteract;
    if (di) {
      di.enabled = this.hidden && !hostile && !ctx.sys.dialogue.active;
      if (di.enabled && ctx.sys.world.placePosition(this.def.home, V1)) di.position.copy(V1);
    }
  }

  /** Mostra uma fala no balão. */
  say(text: string, seconds: number) {
    if (this.hidden) return;
    if (!this.bubble) {
      this.bubble = new SpeechBubble();
      this.object3d.add(this.bubble.sprite);
    }
    this.bubble.sprite.position.set(0, this.height + 0.95, 0);
    this.bubble.show(text, seconds);
  }

  /** Placa de nome visível de perto. */
  updatePlate(show: boolean, hostile: boolean) {
    if (!show || this.hidden) {
      if (this.plate) this.plate.sprite.visible = false;
      return;
    }
    if (!this.plate) {
      this.plate = new NamePlate(this.def.name, this.def.title);
      this.plate.sprite.position.set(0, this.height + 0.42, 0);
      this.object3d.add(this.plate.sprite);
    }
    this.plate.sprite.visible = !(this.bubble && this.bubble.timeLeft > 0);
    this.plate.set(this.questMark, hostile);
  }

  override dispose() {
    this.plate?.dispose();
    this.bubble?.dispose();
    disposeNpcModel(this.model);
    super.dispose();
  }
}
