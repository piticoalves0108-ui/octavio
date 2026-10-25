import * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import type { Entity } from '../core/Entity';
import { clamp, damp, dampAngle, angleDiff } from '../core/math';
import { CAMERA, FLIGHT, LOCOMOTION } from '../data/player';
import { RIDE_CAMERA } from '../data/mounts';
import { sphereCast, ceilingAbove } from './probe';
import { pickLockTarget, type LockCandidate } from './locomotion';

export type CameraMode = 'explore' | 'combat' | 'flight' | 'dialogue' | 'cinematic' | 'boss';

/**
 * Câmera em terceira pessoa:
 * - órbita suave pelo mouse (pointer lock), zoom pela roda, ombro deslocado;
 * - colisão com terreno e colisores (aproxima em interiores e atrás de paredes);
 * - modos: exploração, combate (trava de alvo enquadrando jogador e alvo), voo (mais longe,
 *   FOV cresce com a velocidade), diálogo (enquadra o NPC), chefe e cinemática;
 * - tremor por "trauma" (respeita settings.data.cameraShake);
 * - mira no centro da tela (getAimTarget) usada pelo Player.getAimRay.
 * Convenção: pitch POSITIVO = câmera acima do jogador olhando para baixo.
 */
export class CameraRig implements GameSystem {
  readonly name = 'camera';
  yaw = Math.PI;
  pitch = CAMERA.defaultPitch;
  distance = CAMERA.distance;
  mode: CameraMode = 'explore';
  protected ctx!: GameContext;

  /** Modo pedido por outro sistema (diálogo/cinemática/chefe). null = automático. */
  private forcedMode: CameraMode | null = null;
  /** Distância escolhida pelo jogador (roda do mouse). */
  private userDistance = CAMERA.distance;
  /** Distância efetiva (após colisão), suavizada. */
  private curDist = CAMERA.distance;
  private modeDist = CAMERA.distance;
  private shoulder = CAMERA.shoulderOffset;
  private focus = new THREE.Vector3();
  private lookAt = new THREE.Vector3();
  private lastPlayerPos = new THREE.Vector3();
  private needsSnap = true;
  private trauma = 0;
  private shakeTime = 0;
  private shakeDur = 0.3;
  private fov = 70;
  private dialogueFocus: THREE.Vector3 | null = null;
  private dialogueTarget = new THREE.Vector3();
  private cinePos: THREE.Vector3 | null = null;
  private cineLook = new THREE.Vector3();
  private lockLosTimer = 0;
  private lockCheckTimer = 0;
  private indoor = 0;
  private indoorTimer = 0;
  private combatW = 0;
  private bossW = 0;
  /** Lista reutilizada nas consultas de alvo. */
  private list: Entity[] = [];
  private cands: LockCandidate[] = [];
  private candEnts: Entity[] = [];
  private v1 = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private v3 = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private right = new THREE.Vector3();
  private shakeEuler = new THREE.Euler();
  private shakeQ = new THREE.Quaternion();

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.fov = ctx.settings.data.fov;
    const p = ctx.sys.player;
    this.yaw = p.entity.yaw;
    this.snap();
    ctx.events.on('game:newGame', () => {
      this.forcedMode = null;
      this.dialogueFocus = null;
      this.cinePos = null;
      this.yaw = ctx.sys.player.entity.yaw;
      this.pitch = CAMERA.defaultPitch;
      this.snap();
    });
    ctx.events.on('game:loaded', () => {
      this.yaw = ctx.sys.player.entity.yaw;
      this.snap();
    });
    ctx.events.on('player:respawn', () => {
      this.yaw = ctx.sys.player.entity.yaw;
      this.pitch = CAMERA.defaultPitch;
      this.snap();
    });
    ctx.events.on('player:death', () => this.setLockTarget(null));
  }

  /** Reposiciona sem suavização no próximo frame (teleporte, carregamento). */
  snap() {
    this.needsSnap = true;
  }

  lateUpdate(dt: number, ctx: GameContext) {
    const player = ctx.sys.player;
    const pe = player.entity;
    const pp = pe.position;
    const cam = ctx.camera;
    const inp = ctx.input;

    // Teleporte detectado: sem suavização
    if (this.lastPlayerPos.distanceToSquared(pp) > 15 * 15) this.needsSnap = true;
    this.lastPlayerPos.copy(pp);

    // ---- Entrada: órbita e zoom ----
    const free = this.forcedMode !== 'cinematic' && this.forcedMode !== 'dialogue' && inp.gameplayEnabled && ctx.state === 'playing';
    if (free) {
      const s = 0.0022 * inp.sensitivity;
      const dx = inp.mouseDX * s;
      const dy = inp.mouseDY * s * (inp.invertY ? -1 : 1);
      const locked = player.lockTarget && player.lockTarget.alive;
      if (locked) {
        // com alvo travado: "flick" do mouse troca de alvo; o resto é amortecido
        if (Math.abs(inp.mouseDX) > 60) this.cycleLockTarget(inp.mouseDX > 0 ? 1 : -1);
      } else this.yaw -= dx;
      this.pitch = clamp(this.pitch + dy, CAMERA.pitchMin, CAMERA.pitchMax);
      if (inp.wheel !== 0) this.userDistance = clamp(this.userDistance + inp.wheel * CAMERA.zoomStep, CAMERA.minDistance, CAMERA.maxDistance);
      if (inp.pressed('lockOn')) {
        if (player.lockTarget) this.setLockTarget(null);
        else this.setLockTarget(this.findLockTarget());
      }
    }
    this.maintainLock(dt);

    // ---- Modo automático ----
    const flying = player.isFlying();
    const lock = player.lockTarget && player.lockTarget.alive ? player.lockTarget : null;
    let mode: CameraMode = this.forcedMode ?? (lock ? 'combat' : flying ? 'flight' : 'explore');
    let boss: Entity | null = null;
    if (!this.forcedMode || this.forcedMode === 'boss') {
      const b = (ctx.sys.ai as { activeBoss?: () => Entity | null }).activeBoss?.() ?? null;
      if (b && b.alive && !lock && b.position.distanceToSquared(pp) < 90 * 90) {
        boss = b;
        if (!this.forcedMode) mode = 'boss';
      }
    }
    this.bossW = damp(this.bossW, boss && mode === 'boss' ? 1 : 0, 3, dt);
    if (ctx.state === 'dialogue' && this.dialogueFocus) mode = 'dialogue';
    this.mode = mode;

    // ---- Foco (ponto seguido) ----
    const riding = player.state === 'ride';
    const tgtY = flying ? 1.05 : player.state === 'swim' ? 0.85 : player.state === 'dodge' ? 1.15 : riding ? CAMERA.targetHeight + RIDE_CAMERA.extraHeight : CAMERA.targetHeight;
    const fx = pp.x;
    const fy = pp.y + tgtY;
    const fz = pp.z;
    if (this.needsSnap) {
      this.focus.set(fx, fy, fz);
    } else {
      const lam = flying ? 18 : CAMERA.followLambda;
      this.focus.x = damp(this.focus.x, fx, lam, dt);
      this.focus.z = damp(this.focus.z, fz, lam, dt);
      this.focus.y = damp(this.focus.y, fy, flying ? 14 : CAMERA.followLambdaY, dt);
      // nunca deixa o foco ficar muito longe (alta velocidade / quedas)
      const ddx = fx - this.focus.x;
      const ddy = fy - this.focus.y;
      const ddz = fz - this.focus.z;
      const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d2 > 9) {
        const k = 1 - 3 / Math.sqrt(d2);
        this.focus.x += ddx * k;
        this.focus.y += ddy * k;
        this.focus.z += ddz * k;
      }
    }

    // ---- Parâmetros por modo ----
    let wantDist = this.userDistance;
    let shoulder = CAMERA.shoulderOffset;
    let wantFov = ctx.settings.data.fov;
    const speed = player.speed;
    this.combatW = damp(this.combatW, lock ? 1 : 0, 5, dt);
    if (player.state === 'dead') {
      this.yaw += dt * 0.12;
      this.pitch = damp(this.pitch, 0.55, 1.5, dt);
      wantDist = Math.max(wantDist, 6.5);
      shoulder = 0;
    } else if (mode === 'flight') {
      wantDist = Math.max(this.userDistance, CAMERA.flightDistance) + speed * CAMERA.flightDistancePerSpeed;
      shoulder = CAMERA.shoulderOffset * 0.35;
      const k = clamp((speed - FLIGHT.cruiseSpeed * 0.6) / (FLIGHT.boostSpeed - FLIGHT.cruiseSpeed * 0.6), 0, 1);
      wantFov += k * FLIGHT.fovBoost;
    } else if (mode === 'combat' && lock) {
      wantDist = Math.max(this.userDistance, flying ? CAMERA.flightDistance : CAMERA.combatDistance);
      // gira para manter o alvo à frente (com o jogador ligeiramente de lado)
      const ty = Math.atan2(lock.position.x - pp.x, lock.position.z - pp.z);
      this.yaw = dampAngle(this.yaw, ty, 5, dt);
      const dist = Math.hypot(lock.position.x - pp.x, lock.position.z - pp.z);
      wantDist += clamp(dist * 0.08, 0, 2.5);
      // alvo alto (chefes/voadores) → câmera um pouco mais baixa
      const dh = lock.position.y + lock.height * 0.6 - (pp.y + 1.5);
      const pitchT = clamp(0.22 - Math.atan2(dh, Math.max(2, dist)) * 0.6, -0.25, 0.75);
      this.pitch = damp(this.pitch, pitchT, 2.5, dt);
    } else if (mode === 'boss') {
      wantDist = Math.max(this.userDistance, CAMERA.bossDistance);
      this.pitch = damp(this.pitch, Math.max(this.pitch, 0.32), 1.5, dt);
    } else if (mode === 'dialogue') {
      wantDist = CAMERA.dialogueDistance;
    }
    if (player.state === 'ground' && player.horizontalSpeed > LOCOMOTION.runSpeed + 1.2) wantFov += CAMERA.sprintFovBoost;
    if (riding && mode !== 'dialogue') {
      const sp = Math.abs(player.ride.speed);
      wantDist = Math.max(wantDist, RIDE_CAMERA.distance + sp * RIDE_CAMERA.distancePerSpeed);
      wantFov += RIDE_CAMERA.gallopFov * clamp((sp - 9) / 5, 0, 1);
    }

    // interiores: teto acima do jogador → câmera mais próxima
    this.indoorTimer -= dt;
    if (this.indoorTimer <= 0) {
      this.indoorTimer = 0.2;
      const ceil = ceilingAbove(ctx.physics, pp.x, pp.z, pp.y + 2.1, 0.6);
      this.indoor = ceil < pp.y + 7 ? 1 : 0;
    }
    if (this.indoor && mode !== 'dialogue') wantDist = Math.min(wantDist, CAMERA.indoorDistance);
    this.modeDist = this.needsSnap ? wantDist : damp(this.modeDist, wantDist, 4, dt);
    this.shoulder = damp(this.shoulder, shoulder, 4, dt);
    this.distance = this.modeDist;

    // ---- Posição desejada ----
    const dir = this.dir.set(Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const right = this.right.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    // ponto olhado: foco deslocado no ombro (e puxado para o alvo travado)
    const look = this.lookAt.copy(this.focus).addScaledVector(right, this.shoulder);
    if (lock && this.combatW > 0.01) {
      lock.getCenter(this.v1);
      this.v1.sub(this.focus);
      const len = this.v1.length();
      if (len > 0.1) look.addScaledVector(this.v1, (Math.min(len, 18) / len) * 0.28 * this.combatW);
    } else if (boss && this.bossW > 0.01) {
      // chefe sem trava: puxa o enquadramento para ele quando está à frente da câmera
      boss.getCenter(this.v1);
      this.v1.sub(this.focus);
      const len = this.v1.length();
      if (len > 0.1) {
        const front = clamp((this.v1.x * dir.x + this.v1.z * dir.z) / len, 0, 1);
        look.addScaledVector(this.v1, (Math.min(len, 25) / len) * 0.18 * this.bossW * front);
      }
    }

    const camPos = this.v2;
    if (mode === 'dialogue' && this.dialogueFocus) {
      this.dialogueCamera(camPos, look, dt);
    } else if (mode === 'cinematic' && this.cinePos) {
      camPos.copy(this.cinePos);
      look.copy(this.cineLook);
    } else if (mode === 'cinematic') {
      camPos.copy(cam.position);
      look.copy(cam.position).add(cam.getWorldDirection(this.v3));
    } else {
      // colisão: "sphere cast" do foco (cabeça) até a posição desejada
      const origin = this.v1.copy(this.focus).addScaledVector(right, this.shoulder * 0.5);
      const back = this.v3.copy(dir).negate();
      const free2 = sphereCast(ctx.physics, origin, back, this.modeDist + 0.3, CAMERA.collisionRadius, CAST_OPTS) - 0.1;
      const target = clamp(Math.min(this.modeDist, free2), 0.35, this.modeDist);
      if (this.needsSnap || target < this.curDist) this.curDist = target;
      else this.curDist = damp(this.curDist, target, 3.5, dt);
      camPos.copy(origin).addScaledVector(back, this.curDist).addScaledVector(right, this.shoulder * 0.5);
      // acima do terreno e da água
      const ground = ctx.physics.terrainHeight(camPos.x, camPos.z);
      const floor = Math.max(ground, ctx.physics.waterSurface(camPos.x, camPos.z) ?? -Infinity) + 0.3;
      if (camPos.y < floor) camPos.y = floor;
    }

    // ---- Tremor ----
    let roll = 0;
    if (this.trauma > 0) {
      this.shakeTime += dt;
      this.trauma = Math.max(0, this.trauma - dt / Math.max(0.05, this.shakeDur));
      if (ctx.settings.data.cameraShake) {
        const t = this.shakeTime;
        const k = this.trauma * this.trauma;
        const ox = (Math.sin(t * 41.3) * 0.6 + Math.sin(t * 67.1 + 1.7) * 0.4) * k * CAMERA.shakeOffset;
        const oy = (Math.sin(t * 37.7 + 0.5) * 0.6 + Math.sin(t * 73.9 + 2.3) * 0.4) * k * CAMERA.shakeOffset;
        camPos.addScaledVector(right, ox);
        camPos.y += oy;
        roll = (Math.sin(t * 29.3 + 0.9) * 0.7 + Math.sin(t * 53.1) * 0.3) * k * CAMERA.shakeRotation;
      }
    }

    cam.position.copy(camPos);
    cam.lookAt(look);
    if (roll !== 0) {
      this.shakeEuler.set(0, 0, roll);
      this.shakeQ.setFromEuler(this.shakeEuler);
      cam.quaternion.multiply(this.shakeQ);
    }

    // ---- FOV ----
    this.fov = this.needsSnap ? wantFov : damp(this.fov, wantFov, 3, dt);
    if (Math.abs(cam.fov - this.fov) > 0.02) {
      cam.fov = this.fov;
      cam.updateProjectionMatrix();
    }

    // Câmera dentro do personagem: esconde o modelo
    const headDist = camPos.distanceTo(this.focus);
    player.setModelVisible(headDist > 0.55 || mode === 'dialogue');

    this.needsSnap = false;
  }

  /** Enquadramento de diálogo: sobre o ombro do jogador, olhando para o rosto do NPC. */
  private dialogueCamera(out: THREE.Vector3, look: THREE.Vector3, dt: number) {
    const pp = this.ctx.sys.player.position;
    const t = this.dialogueTarget.copy(this.dialogueFocus!);
    const g = this.ctx.physics.groundHeight(t.x, t.z, t.y + 0.5);
    if (t.y - g < 1.0) t.y = g + 1.6; // posição de pés → altura do rosto
    const dx = t.x - pp.x;
    const dz = t.z - pp.z;
    const d = Math.hypot(dx, dz) || 1;
    const fx = dx / d;
    const fz = dz / d;
    // à direita e atrás do jogador
    const rx = -fz;
    const rz = fx;
    const cx = pp.x - fx * 1.6 - rx * 0.9;
    const cz = pp.z - fz * 1.6 - rz * 0.9;
    const cy = Math.max(pp.y + 1.75, this.ctx.physics.terrainHeight(cx, cz) + 0.4);
    out.set(cx, cy, cz);
    // mantém a câmera orbitando coerente ao sair do diálogo
    this.yaw = dampAngle(this.yaw, Math.atan2(fx, fz), 4, dt);
    this.pitch = damp(this.pitch, 0.12, 4, dt);
    look.copy(t);
    look.y -= 0.05;
  }

  // =====================================================================
  // Trava de alvo
  // =====================================================================
  private hostileFilter = (e: Entity): boolean => {
    const ctx = this.ctx;
    const pe = ctx.sys.player.entity;
    if (e === pe || !e.health || !e.alive || e.removed) return false;
    if (e.kind !== 'enemy' && e.kind !== 'boss' && e.kind !== 'creature') return false;
    return ctx.sys.combat.isHostile(pe, e);
  };

  /** Inimigo hostil mais adequado no cone de visão (até CAMERA.lockOnRange) com linha de visão. */
  findLockTarget(): Entity | null {
    const ctx = this.ctx;
    const pp = ctx.sys.player.position;
    const list = ctx.entities.queryRadius(pp, CAMERA.lockOnRange, this.list, this.hostileFilter);
    this.cands.length = 0;
    this.candEnts.length = 0;
    for (const e of list) {
      this.cands.push({ x: e.position.x, z: e.position.z, bias: e.kind === 'boss' ? 0.3 : 0 });
      this.candEnts.push(e);
    }
    const fwd = this.getForward(this.v1);
    // tenta em ordem de pontuação, descartando quem está atrás de paredes
    for (let tries = 0; tries < 4 && this.cands.length > 0; tries++) {
      const i = pickLockTarget(this.cands, pp.x, pp.z, fwd.x, fwd.z, CAMERA.lockOnRange, CAMERA.lockOnConeDeg);
      if (i < 0) return null;
      const e = this.candEnts[i];
      if (this.hasLos(e)) return e;
      this.cands.splice(i, 1);
      this.candEnts.splice(i, 1);
    }
    return null;
  }

  private hasLos(e: Entity): boolean {
    const pp = this.ctx.sys.player.position;
    this.v3.set(pp.x, pp.y + 1.5, pp.z);
    e.getCenter(this.v2);
    return this.ctx.physics.lineOfSight(this.v3, this.v2);
  }

  /** Trava (ou solta, com null) o alvo. */
  setLockTarget(target: Entity | null) {
    const player = this.ctx.sys.player;
    if (player.lockTarget === target) return;
    player.lockTarget = target;
    this.lockLosTimer = 0;
    this.ctx.events.emit('player:lockOn', { target });
  }

  /** Troca para o próximo alvo à direita (dir=1) ou à esquerda (dir=-1). */
  cycleLockTarget(dir: 1 | -1) {
    const ctx = this.ctx;
    const player = ctx.sys.player;
    const cur = player.lockTarget;
    if (!cur) return;
    const pp = player.position;
    const list = ctx.entities.queryRadius(pp, CAMERA.lockOnRange, this.list, this.hostileFilter);
    const base = Math.atan2(cur.position.x - pp.x, cur.position.z - pp.z);
    let best: Entity | null = null;
    let bestA = Infinity;
    for (const e of list) {
      if (e === cur) continue;
      const a = angleDiff(base, Math.atan2(e.position.x - pp.x, e.position.z - pp.z));
      // yaw cresce para a esquerda da câmera: direita = ângulo negativo
      const side = -a * dir;
      if (side <= 0.05 || side > Math.PI * 0.75) continue;
      if (side < bestA) {
        bestA = side;
        best = e;
      }
    }
    if (best && this.hasLos(best)) this.setLockTarget(best);
  }

  private maintainLock(dt: number) {
    const player = this.ctx.sys.player;
    const t = player.lockTarget;
    if (!t) return;
    if (!t.alive || t.removed || player.state === 'dead') {
      // alvo morreu: tenta o próximo automaticamente
      this.setLockTarget(player.state === 'dead' ? null : this.findLockTarget());
      return;
    }
    const d = Math.hypot(t.position.x - player.position.x, t.position.z - player.position.z);
    if (d > CAMERA.lockOnBreakRange) {
      this.setLockTarget(null);
      return;
    }
    this.lockCheckTimer -= dt;
    if (this.lockCheckTimer <= 0) {
      this.lockCheckTimer = 0.25;
      if (this.hasLos(t)) this.lockLosTimer = 0;
      else this.lockLosTimer += 0.25;
      if (this.lockLosTimer >= CAMERA.lockOnLosTimeout) this.setLockTarget(null);
    }
  }

  // =====================================================================
  // API pública (contrato + extras)
  // =====================================================================
  /** Tremor de câmera (respeita configuração do jogador). `intensity` 0..1. */
  shake(intensity: number, duration: number) {
    if (!this.ctx?.settings.data.cameraShake) return;
    this.trauma = clamp(Math.max(this.trauma, intensity), 0, 1);
    this.shakeDur = Math.max(0.05, duration);
  }
  /** Foco para diálogos (null = volta ao jogador). */
  setDialogueFocus(target: THREE.Vector3 | null) {
    if (target) {
      this.dialogueFocus = (this.dialogueFocus ?? new THREE.Vector3()).copy(target);
      this.forcedMode = 'dialogue';
    } else {
      this.dialogueFocus = null;
      if (this.forcedMode === 'dialogue') this.forcedMode = null;
    }
  }
  /**
   * Muda o modo. 'dialogue', 'cinematic' e 'boss' ficam fixos até outro setMode;
   * 'explore'/'combat'/'flight' devolvem ao modo automático (segue o estado do jogador).
   */
  setMode(mode: CameraMode) {
    this.mode = mode;
    this.forcedMode = mode === 'dialogue' || mode === 'cinematic' || mode === 'boss' ? mode : null;
    if (mode !== 'cinematic') this.cinePos = null;
  }
  /** Plano fixo de cinemática (posição + ponto olhado). Ativa o modo 'cinematic'. */
  setCinematicShot(position: THREE.Vector3, lookAt: THREE.Vector3) {
    this.cinePos = (this.cinePos ?? new THREE.Vector3()).copy(position);
    this.cineLook.copy(lookAt);
    this.forcedMode = 'cinematic';
    this.mode = 'cinematic';
  }
  /** Frente horizontal da câmera (XZ, normalizado). */
  getForward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }
  /** Direita horizontal da câmera (XZ, normalizado). */
  getRight(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
  }
  /** Direção 3D para onde a câmera olha (mira). */
  getLookDirection(out = new THREE.Vector3()): THREE.Vector3 {
    return this.ctx.camera.getWorldDirection(out);
  }
  /** FOV atual (graus). */
  get currentFov() {
    return this.fov;
  }
  /**
   * Ponto do mundo sob o centro da tela (até `maxDist` além do jogador): terreno, colisores
   * ou o inimigo hostil mais próximo do raio (leve assistência de mira).
   */
  getAimTarget(maxDist: number, out = new THREE.Vector3()): THREE.Vector3 {
    const ctx = this.ctx;
    const cam = ctx.camera;
    const o = this.v1.copy(cam.position);
    const d = cam.getWorldDirection(this.v2);
    // começa no ponto do raio mais próximo do jogador (ignora o que está entre a câmera e ele)
    const pp = ctx.sys.player.position;
    const t0 = Math.max(0, (pp.x - o.x) * d.x + (pp.y + 1.4 - o.y) * d.y + (pp.z - o.z) * d.z) + 0.6;
    o.addScaledVector(d, t0);
    let best = sphereCast(ctx.physics, o, d, maxDist, 0.05, CAST_AIM);
    // inimigos ao longo do raio (até 70 m)
    const range = Math.min(best, 70);
    const mid = this.v3.copy(o).addScaledVector(d, range * 0.5);
    const list = ctx.entities.queryRadius(mid, range * 0.5 + 2, this.list, this.hostileFilter);
    let hitEnt: Entity | null = null;
    for (const e of list) {
      const cx = e.position.x - o.x;
      const cy = e.position.y + e.height * 0.55 - o.y;
      const cz = e.position.z - o.z;
      const t = cx * d.x + cy * d.y + cz * d.z;
      if (t < 0 || t > best) continue;
      const px = cx - d.x * t;
      const py = cy - d.y * t;
      const pz = cz - d.z * t;
      const r = e.radius + 0.35 + t * 0.012;
      if (px * px + py * py + pz * pz <= r * r) {
        best = t;
        hitEnt = e;
      }
    }
    if (hitEnt) return hitEnt.getCenter(out);
    return out.copy(o).addScaledVector(d, best);
  }
}

const CAST_OPTS = { ignoreTrees: true, step: 0.5 };
const CAST_AIM = { ignoreTrees: false, step: 1.0, water: true };
