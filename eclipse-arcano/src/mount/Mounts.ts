import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { Interactable } from '../core/Interaction';
import type { Creature } from '../ai/creatures/Creature';
import { CREATURES } from '../data/creatures';
import { HORSE, HORSE_GEARS, HORSE_NAMES, TAMING, WHISTLE } from '../data/mounts';
import { keyLabel } from '../ui/dom';
import { isGalloping, makeRideState, stepAir, stepRide, stepTaming, terrainBlock, type RideState, type TerrainBlock } from './ride';

/** Altura do quadril do mago acima dos pés (rig do jogador). */
const HIP = 0.98;
const GALLOP_SPEED = HORSE_GEARS[HORSE_GEARS.length - 1].speed;

const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();

interface SavedHorse {
  typeId: string;
  name: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}

type SaddleRig = { setSaddle?: (on: boolean) => void };

/**
 * Montaria (estilo Zelda): chegar perto de um cavalo e montar com [E]. Cavalos do pasto
 * são mansos; os selvagens dos campos precisam ser domados (empinam e escoiceiam enquanto
 * a energia do mago se gasta). O cavalo montado vira "seu cavalo": ganha sela e nome,
 * atende ao assobio e fica salvo.
 *
 * Cavalgando: segurar frente sobe as marchas (passo → trote → meio-galope), esporas
 * (correr) dão galope, espaço pula, A/D vira, [E] desce, voar salta do cavalo para o ar.
 * O cavalo recusa subidas íngremes, beiras de penhasco e água funda.
 *
 * Roda antes do jogador: move o cavalo e põe o mago na sela (Player 'ride').
 */
export class Mounts implements GameSystem, Saveable {
  readonly name = 'mounts';
  readonly saveKey = 'mounts';
  /** Cavalo montado agora (ou null). */
  ridden: Creature | null = null;
  /** O seu cavalo (o último montado). */
  horse: Creature | null = null;
  horseName = '';
  /** Domando: progresso 0..1 (−1 = não). */
  taming = -1;
  readonly ride: RideState = makeRideState();
  readonly stats = { mounts: 0, tamed: 0, thrown: 0, whistles: 0, refusals: 0, jumps: 0, spurs: 0 };
  /** Último motivo de recusa do cavalo (testes/depuração). */
  lastRefusal: TerrainBlock = 'ok';

  private ctx!: GameContext;
  private prompt!: Interactable;
  private near: Creature | null = null;
  private scanT = 0;
  private whistleCd = 0;
  private refuseMsgT = 0;
  private hoofT = 0;
  private dustT = 0;
  private turnSmooth = 0;
  private jumpW = 0;
  private readonly tame = { t: 0 };
  private readonly airY = { value: 0 };
  private readonly events: string[] = [];
  private pending: SavedHorse | null = null;
  private nameIdx = Math.floor(Math.random() * HORSE_NAMES.length);

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.prompt = ctx.sys.interaction.register({
      id: 'montaria',
      kind: 'use',
      prompt: 'Montar',
      position: new THREE.Vector3(),
      range: HORSE.mountRange,
      enabled: false,
      priority: 1,
      interact: () => this.tryMount(),
    });
  }

  // =====================================================================
  update(dt: number, ctx: GameContext) {
    if (this.whistleCd > 0) this.whistleCd -= dt;
    if (this.refuseMsgT > 0) this.refuseMsgT -= dt;
    if (this.pending && ctx.state === 'playing') this.spawnSaved(this.pending);
    const pl = ctx.sys.player;
    if (this.ridden) {
      const c = this.ridden;
      if (!pl.isRiding() || c.removed || !c.alive) this.release(false);
      else {
        this.prompt.enabled = false;
        if (this.taming >= 0) this.updateTaming(dt, ctx);
        else this.updateRide(dt, ctx);
        return;
      }
    }
    // cavalo mais perto para o prompt "Montar"
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.2;
      this.near = this.findNear(ctx);
      this.prompt.enabled = !!this.near;
      if (this.near) this.prompt.prompt = this.promptFor(this.near);
    }
    if (this.near) {
      if (this.near.removed || !this.near.alive) {
        this.near = null;
        this.prompt.enabled = false;
      } else this.prompt.position.copy(this.near.position).setY(this.near.position.y + 0.6);
    }
    // assobio
    if (this.canControl(ctx) && ctx.input.pressed('whistle')) this.whistle();
    const h = this.horse;
    if (h && h.calling) h.callGoal.copy(pl.entity.position);
  }

  private canControl(ctx: GameContext) {
    return ctx.state === 'playing' && ctx.input.gameplayEnabled && ctx.sys.player.entity.alive;
  }

  private findNear(ctx: GameContext): Creature | null {
    const pl = ctx.sys.player;
    if (!pl.canInteract() || !pl.grounded) return null;
    const pp = pl.entity.position;
    const r = HORSE.mountRange + 0.6;
    let best: Creature | null = null;
    let bd = r * r;
    for (const c of ctx.sys.ai.creatures) {
      if (!c.def.mount || !c.alive || c.removed || c.deadT >= 0 || c.ridden) continue;
      const dx = c.position.x - pp.x;
      const dz = c.position.z - pp.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bd && Math.abs(c.position.y - pp.y) < 2) {
        bd = d2;
        best = c;
      }
    }
    return best;
  }

  private promptFor(c: Creature): string {
    if (c === this.horse) return `Montar em ${this.horseName}`;
    if (c.def.mount === 'wild' && !c.owned) return 'Domar o cavalo selvagem';
    return 'Montar no cavalo';
  }

  // =====================================================================
  // Montar, domar, descer
  // =====================================================================
  /** [E] perto de um cavalo. */
  tryMount(c: Creature | null = this.near): boolean {
    if (!c || this.ridden || c.ridden || c.removed || !c.alive) return false;
    const wild = c.def.mount === 'wild' && !c.owned;
    return this.mount(c, wild);
  }

  private mount(c: Creature, taming: boolean): boolean {
    const ctx = this.ctx;
    const pl = ctx.sys.player;
    if (!pl.startRide()) return false;
    this.ridden = c;
    c.ridden = true;
    c.calling = false;
    c.hasGoal = false;
    c.speed = 0;
    c.moveVel.set(0, 0, 0);
    c.setState('wander');
    Object.assign(this.ride, makeRideState());
    this.airY.value = c.position.y;
    this.turnSmooth = 0;
    this.jumpW = 0;
    this.near = null;
    this.prompt.enabled = false;
    this.stats.mounts++;
    this.neigh(c, taming ? 1.15 : 1);
    if (taming) {
      this.taming = 0;
      this.tame.t = 0;
      c.anim.rear = 1;
      ctx.sys.ui.notify('Segure firme! Domar gasta energia.', 'info');
    } else {
      this.taming = -1;
      if (c !== this.horse) this.adopt(c, false);
    }
    this.placeRider(c, 0, 0);
    ctx.events.emit('mount:mounted', { typeId: c.typeId, taming });
    return true;
  }

  /** O cavalo passa a ser seu: sela, nome, não foge, atende ao assobio. */
  private adopt(c: Creature, tamed: boolean) {
    const ctx = this.ctx;
    const old = this.horse;
    if (old && old !== c && !old.removed) {
      old.owned = false;
      (old.rig as SaddleRig).setSaddle?.(false);
      old.home.copy(old.position);
      old.confined = true;
      old.roam = 10;
    }
    ctx.sys.ai.releaseCreature(c);
    c.owned = true;
    c.confined = false;
    if (c.health) c.health.immortal = true;
    (c.rig as SaddleRig).setSaddle?.(true);
    this.horse = c;
    this.horseName = this.nextName();
    c.name = this.horseName;
    if (tamed) this.stats.tamed++;
    const key = keyLabel(ctx.input.bindings.whistle?.[0] ?? 'KeyV');
    ctx.sys.ui.notify(tamed ? `Você domou o cavalo! O nome dele é ${this.horseName}. Aperte ${key} para chamá-lo.` : `${this.horseName} agora é o seu cavalo. Aperte ${key} para chamá-lo.`, 'discovery');
    ctx.events.emit('mount:tamed', { typeId: c.typeId, name: this.horseName, wild: tamed });
  }

  private nextName(): string {
    this.nameIdx = (this.nameIdx + 1) % HORSE_NAMES.length;
    return HORSE_NAMES[this.nameIdx];
  }

  private updateTaming(dt: number, ctx: GameContext) {
    const c = this.ridden!;
    const pl = ctx.sys.player;
    if (pl.health.staggered) {
      this.throwOff();
      return;
    }
    const r = stepTaming(this.tame, pl.energy.current, dt);
    if (r.failed) {
      this.throwOff();
      return;
    }
    pl.spendEnergy(r.cost);
    this.taming = Math.min(1, this.tame.t / TAMING.seconds);
    // empina e escoiceia em alternância, girando no lugar
    const t = this.tame.t;
    const s = Math.sin(t * 4.4);
    c.anim.rear = s > 0 ? s : s * 0.95;
    c.yaw += Math.sin(t * 2.6) * dt * 2.2;
    c.object3d.rotation.y = c.yaw;
    c.moveVel.set(0, 0, 0);
    if (Math.floor(t * 2.2) !== Math.floor((t - dt) * 2.2)) {
      ctx.sys.camera.shake(0.25, 0.25);
      ctx.sys.vfx.burst('dust', c.position, { count: 10, scale: 0.8 });
      ctx.sys.audio.play('hoof', { position: c.position, volume: 1, pitch: 0.8 });
    }
    pl.ride.buck = 1;
    pl.ride.gait = 0.3;
    if (r.done) {
      this.taming = -1;
      c.anim.rear = 0;
      pl.ride.buck = 0;
      this.adopt(c, true);
      this.neigh(c, 1);
      ctx.sys.vfx.burst('heal', c.position, { count: 20 });
    }
    this.placeRider(c, 0, 0);
  }

  /** Derrubado (domar falhou ou levou um golpe forte). */
  private throwOff() {
    const ctx = this.ctx;
    const c = this.ridden;
    if (!c) return;
    const pl = ctx.sys.player;
    const wasTaming = this.taming >= 0;
    this.sidePosition(c, V1);
    pl.endRide(V1, c.yaw);
    V2.set(Math.cos(c.yaw), 0, -Math.sin(c.yaw));
    pl.applyKnockback(V2, TAMING.throwForce);
    if (wasTaming) ctx.sys.combat.applyDamage(pl.entity, { amount: TAMING.throwDamage, type: 'physical', source: c, tag: 'queda', unblockable: true });
    this.stats.thrown++;
    this.release(true);
    if (wasTaming) {
      ctx.sys.ui.notify('O cavalo te derrubou! Volte com mais energia e tente de novo.', 'warning');
      this.neigh(c, 1.2);
      c.hear(pl.entity.position, true);
    }
  }

  /** Descer (de lado) — ou, com `fly`, saltar do cavalo para o voo. */
  dismount(fly = false) {
    const ctx = this.ctx;
    const c = this.ridden;
    if (!c) return;
    const pl = ctx.sys.player;
    if (fly) {
      V1.copy(pl.entity.position);
      V1.y += 0.6;
      pl.endRide(V1, c.yaw, 6);
      this.release(true);
      pl.startFlight(false);
    } else {
      this.sidePosition(c, V1);
      pl.endRide(V1, c.yaw);
      this.release(true);
    }
    ctx.events.emit('mount:dismounted', { typeId: c.typeId });
  }

  /** Ponto ao lado do cavalo (esquerda; direita se a esquerda estiver bloqueada). */
  private sidePosition(c: Creature, out: THREE.Vector3) {
    const phys = this.ctx.physics;
    const lx = Math.cos(c.yaw);
    const lz = -Math.sin(c.yaw);
    const d = HORSE.dismountSide * c.def.scale;
    for (const side of [1, -1]) {
      out.set(c.position.x + lx * d * side, c.position.y + 1, c.position.z + lz * d * side);
      const g = phys.groundHeight(out.x, out.z, c.position.y + 1, 1.2);
      out.y = g;
      V2.copy(out);
      const r = phys.resolveCapsule(V2, 0.35, 1.8);
      if (!r.collided && Math.abs(g - c.position.y) < 1.2) return out;
    }
    out.set(c.position.x, c.position.y, c.position.z);
    return out;
  }

  /** Solta o cavalo (fim da montaria): ele fica pastando onde está. */
  private release(_clean: boolean) {
    const c = this.ridden;
    this.ridden = null;
    this.taming = -1;
    const pl = this.ctx.sys.player;
    pl.ride.gait = pl.ride.jump = pl.ride.buck = pl.ride.turn = 0;
    if (!c) return;
    c.ridden = false;
    c.anim.rear = 0;
    c.speed = 0;
    c.hasGoal = false;
    c.moveVel.set(0, 0, 0);
    c.home.copy(c.position);
    if (c.owned) {
      c.confined = true;
      c.roam = 6;
    }
    c.setState('graze');
    // não deixa o cavalo no ar (desceu durante um pulo)
    c.position.y = this.ctx.physics.groundHeight(c.position.x, c.position.z, c.position.y + 0.5, 1);
    this.ride.speed = 0;
    this.ride.airborne = false;
  }

  // =====================================================================
  // Cavalgar
  // =====================================================================
  private updateRide(dt: number, ctx: GameContext) {
    const c = this.ridden!;
    const pl = ctx.sys.player;
    const inp = ctx.input;
    const control = this.canControl(ctx);
    const st = this.ride;
    if (pl.health.staggered) {
      this.throwOff();
      return;
    }
    if (control && !st.airborne && inp.pressed('interact')) {
      this.dismount();
      return;
    }
    if (control && inp.pressed('fly')) {
      this.dismount(true);
      return;
    }
    const fwd = control ? inp.axis('back', 'forward') : 0;
    const turn = control ? inp.axis('left', 'right') : 0;
    this.events.length = 0;
    const yawRate = stepRide(st, { forward: fwd, turn, spur: control && inp.pressed('sprint'), jump: control && inp.pressed('jump') }, dt, this.events);
    for (const ev of this.events) {
      if (ev === 'spur') {
        this.stats.spurs++;
        this.neigh(c, 1.05);
        ctx.sys.vfx.burst('dust', c.position, { count: 14, scale: 1 });
      } else if (ev === 'jump') {
        this.stats.jumps++;
        this.airY.value = c.position.y;
        ctx.sys.audio.play('hoof', { position: c.position, volume: 1.2, pitch: 0.9 });
      }
    }
    // giro: A/D (+ direita). Em yaw, +x é a esquerda, então virar à direita diminui o yaw.
    c.yaw -= yawRate * dt;
    c.object3d.rotation.y = c.yaw;
    this.turnSmooth += (turn * Math.min(1, Math.abs(st.speed) / 3) - this.turnSmooth) * Math.min(1, dt * 6);

    const p = c.position;
    const fx = Math.sin(c.yaw);
    const fz = Math.cos(c.yaw);
    const phys = ctx.physics;
    // o terreno à frente deixa passar?
    if (Math.abs(st.speed) > 0.2 && !st.airborne) {
      const dir = Math.sign(st.speed);
      const la = HORSE.lookahead + Math.abs(st.speed) * 0.12;
      const ax = p.x + fx * la * dir;
      const az = p.z + fz * la * dir;
      const hHere = phys.groundHeight(p.x, p.z, p.y + 0.5, 0.8);
      const hAhead = phys.groundHeight(ax, az, p.y + 2.5, 0.1);
      const surf = phys.waterSurface(ax, az);
      const water = surf === null ? 0 : Math.max(0, surf - phys.terrainHeight(ax, az));
      const blk = terrainBlock(hHere, hAhead, la, water);
      if (blk !== 'ok') this.refuse(c, blk, dt);
    }
    // movimento com colisão (subpassos em velocidade)
    const sp = st.speed;
    const dist = Math.abs(sp * dt);
    const n = Math.max(1, Math.ceil(dist / 0.4));
    let bumped = false;
    for (let i = 0; i < n; i++) {
      p.x += (fx * sp * dt) / n;
      p.z += (fz * sp * dt) / n;
      const r = phys.resolveCapsule(p, HORSE.radius * c.def.scale, HORSE.height);
      if (r.collided) {
        const into = -(r.normal.x * fx + r.normal.z * fz) * Math.sign(sp);
        if (into > 0.6) bumped = true;
      }
    }
    if (bumped) {
      if (Math.abs(sp) > HORSE.bumpSpeed) {
        ctx.sys.camera.shake(0.45, 0.4);
        c.anim.hit = 1;
        this.neigh(c, 0.9);
        st.speed = 0;
        st.gallopT = 0;
        st.gear = 1;
      } else st.speed *= Math.exp(-8 * dt);
    }
    // chão, pulo e queda de degraus
    const g = phys.groundHeight(p.x, p.z, p.y, 0.6, HORSE.radius);
    if (st.airborne) {
      this.airY.value = p.y;
      if (stepAir(st, this.airY, g, dt)) {
        ctx.sys.camera.shake(0.3, 0.25);
        ctx.sys.vfx.burst('dust', p, { count: 16, scale: 1.1 });
        ctx.sys.audio.play('hoof', { position: p, volume: 1.4, pitch: 0.7 });
      }
      p.y = this.airY.value;
    } else if (p.y - g > 1.4) {
      // degrau grande para baixo: cai
      st.airborne = true;
      st.vy = 0;
    } else p.y += (g - p.y) * Math.min(1, dt * 14);
    // corpo do cavalo (animação)
    c.moveVel.set(fx * Math.abs(sp), 0, fz * Math.abs(sp));
    c.velocity.set(fx * sp, st.airborne ? st.vy : 0, fz * sp);
    this.jumpW += ((st.airborne ? 1 : 0) - this.jumpW) * Math.min(1, dt * 10);
    const rearT = st.airborne ? Math.max(-0.35, Math.min(0.35, st.vy / HORSE.jumpSpeed * 0.35)) : 0;
    c.anim.rear += (rearT - c.anim.rear) * Math.min(1, dt * 8);
    // sons e poeira
    this.hooves(c, dt, ctx);
    // cavaleiro
    pl.ride.gait = Math.min(1, Math.abs(sp) / GALLOP_SPEED);
    pl.ride.jump = this.jumpW;
    pl.ride.buck = 0;
    pl.ride.turn = this.turnSmooth;
    pl.ride.speed = sp;
    this.placeRider(c, fx * sp, fz * sp);
  }

  /** Põe o mago na sela. */
  private placeRider(c: Creature, vx: number, vz: number) {
    const s = c.def.scale;
    const fx = Math.sin(c.yaw);
    const fz = Math.cos(c.yaw);
    V1.set(c.position.x + fx * HORSE.seatBack * s, c.position.y + HORSE.seatHeight * s - HIP, c.position.z + fz * HORSE.seatBack * s);
    this.ctx.sys.player.setRideTransform(V1, c.yaw, vx, vz);
  }

  private refuse(c: Creature, blk: TerrainBlock, dt: number) {
    const st = this.ride;
    st.speed *= Math.exp(-14 * dt);
    if (Math.abs(st.speed) < 0.6) st.speed = 0;
    st.gallopT = 0;
    if (st.gear > 1) st.gear = 1;
    if (this.lastRefusal !== blk || this.refuseMsgT <= 0) {
      this.stats.refusals++;
      c.anim.rear = blk === 'steep' ? 0.35 : 0.7;
      if (this.refuseMsgT <= 0) {
        this.refuseMsgT = 4;
        const msg = blk === 'water' ? 'Água funda: o cavalo não entra.' : blk === 'cliff' ? 'O cavalo se recusa a pular do penhasco.' : 'Íngreme demais para o cavalo.';
        this.ctx.sys.ui.notify(msg, 'warning');
        this.neigh(c, 1.1);
      }
    }
    this.lastRefusal = blk;
  }

  private hooves(c: Creature, dt: number, ctx: GameContext) {
    const st = this.ride;
    const sp = Math.abs(st.speed);
    if (st.airborne || sp < 0.3) return;
    // batidas por segundo: passo ~3, trote ~4, galope ~6 (cada batida = uma ou duas patas)
    this.hoofT -= dt * (2 + sp * 0.32);
    if (this.hoofT <= 0) {
      this.hoofT = 1;
      ctx.sys.audio.play('hoof', { position: c.position, volume: 0.5 + Math.min(0.7, sp / GALLOP_SPEED), pitch: sp > 9 ? 0.85 : 1 });
    }
    if (isGalloping(st)) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.12;
        const surf = ctx.physics.waterSurface(c.position.x, c.position.z);
        V2.set(c.position.x - Math.sin(c.yaw) * 0.9, c.position.y + 0.1, c.position.z - Math.cos(c.yaw) * 0.9);
        ctx.sys.vfx.burst(surf !== null ? 'splash' : 'dust', V2, { count: 4, scale: 0.7 });
      }
    }
  }

  private neigh(c: Creature, pitch: number) {
    this.ctx.sys.audio.play('horse_neigh', { position: c.position, volume: 0.9, pitch });
  }

  // =====================================================================
  // Assobio
  // =====================================================================
  /** Chama o seu cavalo. Retorna true se ele veio. */
  whistle(): boolean {
    const ctx = this.ctx;
    if (this.whistleCd > 0) return false;
    this.whistleCd = WHISTLE.cooldown;
    this.stats.whistles++;
    const pl = ctx.sys.player.entity;
    ctx.sys.audio.play('whistle', { position: pl.position, volume: 0.9 });
    const h = this.horse;
    if (!h || h.removed || !h.alive) {
      ctx.sys.ui.notify('Você ainda não tem um cavalo. Monte um no pasto de Brumafria ou dome um selvagem nos campos.', 'info');
      return false;
    }
    if (this.ridden) return false;
    const d = Math.hypot(h.position.x - pl.position.x, h.position.z - pl.position.z);
    if (d > WHISTLE.range && !this.bringNear(h)) {
      ctx.sys.ui.notify(`${this.horseName} não consegue chegar até aqui.`, 'warning');
      return false;
    }
    h.callTo(pl.position, WHISTLE.stopAt);
    this.neigh(h, 1);
    return true;
  }

  /** Cavalo longe: aparece galopando atrás do jogador, fora da vista, em chão seco. */
  private bringNear(h: Creature): boolean {
    const ctx = this.ctx;
    const pl = ctx.sys.player.entity.position;
    const cam = ctx.sys.camera.getForward(V2);
    const base = Math.atan2(-cam.x, -cam.z);
    const phys = ctx.physics;
    for (let k = 0; k < 12; k++) {
      const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.4;
      const x = pl.x + Math.sin(a) * WHISTLE.arriveFrom;
      const z = pl.z + Math.cos(a) * WHISTLE.arriveFrom;
      if (phys.waterSurface(x, z) !== null) continue;
      const g = phys.terrainHeight(x, z);
      if (Math.abs(g - pl.y) > 25) continue;
      if (ctx.heightfield.slopeAt(x, z) > HORSE.maxSlopeDeg) continue;
      h.position.set(x, g, z);
      h.yaw = Math.atan2(pl.x - x, pl.z - z);
      h.object3d.rotation.y = h.yaw;
      return true;
    }
    return false;
  }

  // =====================================================================
  // Salvar
  // =====================================================================
  serialize(): { horse: SavedHorse | null } {
    const h = this.horse;
    if (!h || h.removed) return { horse: this.pending };
    return { horse: { typeId: h.typeId, name: this.horseName, x: +h.position.x.toFixed(2), y: +h.position.y.toFixed(2), z: +h.position.z.toFixed(2), yaw: +h.yaw.toFixed(3) } };
  }

  deserialize(data: unknown) {
    if (!data || typeof data !== 'object') throw new Error('montaria: dados inválidos');
    if (this.ridden) this.release(true);
    this.removeHorse();
    const d = (data as { horse?: SavedHorse } | null)?.horse;
    if (d && typeof d.typeId === 'string' && CREATURES[d.typeId]?.mount && [d.x, d.y, d.z].every((v) => typeof v === 'number' && isFinite(v))) {
      this.pending = { typeId: d.typeId, name: typeof d.name === 'string' && d.name ? d.name : HORSE_NAMES[0], x: d.x, y: d.y, z: d.z, yaw: typeof d.yaw === 'number' && isFinite(d.yaw) ? d.yaw : 0 };
    }
  }

  private spawnSaved(d: SavedHorse) {
    this.pending = null;
    const c = this.ctx.sys.ai.spawnCreature(d.typeId, V1.set(d.x, d.y, d.z));
    if (!c) return;
    c.owned = true;
    c.confined = true;
    c.roam = 6;
    c.home.set(d.x, d.y, d.z);
    if (c.health) c.health.immortal = true;
    (c.rig as SaddleRig).setSaddle?.(true);
    c.name = d.name;
    c.yaw = d.yaw;
    this.horse = c;
    this.horseName = d.name;
  }

  private removeHorse() {
    const h = this.horse;
    if (h && !h.removed) this.ctx?.entities.remove(h);
    this.horse = null;
    this.horseName = '';
    this.pending = null;
  }

  onNewGame() {
    if (this.ridden) this.release(true);
    this.removeHorse();
    this.near = null;
    Object.assign(this.ride, makeRideState());
    if (this.prompt) this.prompt.enabled = false;
  }

  debugInfo() {
    const h = this.horse;
    return {
      riding: !!this.ridden,
      taming: +this.taming.toFixed(2),
      speed: +this.ride.speed.toFixed(2),
      gear: HORSE_GEARS[this.ride.gallopT > 0 ? HORSE_GEARS.length - 1 : this.ride.gear].id,
      spurs: +this.ride.spurs.toFixed(2),
      airborne: this.ride.airborne,
      horse: h ? { name: this.horseName, type: h.typeId, x: +h.position.x.toFixed(1), z: +h.position.z.toFixed(1), calling: h.calling } : null,
      stats: this.stats,
    };
  }
}
