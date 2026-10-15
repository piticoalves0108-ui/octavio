import { damp, clamp, smoothstep } from '../core/math';
import { B, MASKS, POSE_SIZE, R_OFFX, R_OFFY, R_OFFZ, R_PITCH, R_ROLL, createPose, poseAddScaled, poseClear, setBone, addBone, type Pose } from './rig';
import { CLIPS, sampleClip, type AnyAnim, type CompiledClip } from './animClips';
import { LOCOMOTION } from '../data/player';

/**
 * Animação procedural do mago com mistura de poses:
 * 1) base de locomoção (parado/andar/correr/disparar, ar, voo, escalada, nado),
 *    cada uma gerada por funções do ciclo de passada e misturada por pesos suavizados;
 * 2) camadas de ação (clipes de poses-chave) com máscara, entrada/saída suave e modo aditivo;
 * 3) ajustes procedurais (olhar/mirar, respiração, impacto de aterrissagem, inclinação nas curvas).
 * Zero alocação por frame: todas as poses são buffers pré-alocados.
 */

export type LocoMode = 'ground' | 'air' | 'flight' | 'climb' | 'swim' | 'dodge' | 'dead';

/** Parâmetros que o Player preenche a cada frame (objeto reutilizado). */
export interface LocoParams {
  mode: LocoMode;
  /** Velocidade horizontal (m/s). */
  speed: number;
  /** Velocidade vertical (m/s). */
  vy: number;
  /** Velocidade angular do yaw do corpo (rad/s), para inclinar nas curvas. */
  turnRate: number;
  /** Direção do movimento relativa à frente do corpo (x = esquerda, z = frente), normalizada ou zero. */
  localMoveX: number;
  localMoveZ: number;
  /** Andar de lado / de costas (trava de alvo): 1 = usa passadas laterais. */
  strafe: number;
  /** Voo: inclinação do corpo para frente (rad), rolagem (rad), 0..1 pairando, 0..1 turbo, -1..1 vertical, planando. */
  flightPitch: number;
  flightBank: number;
  hover: number;
  boost: number;
  vertical: number;
  gliding: boolean;
  /** Escalada: movimento local (x lateral, y vertical) para o ciclo de mãos/pés. */
  climbX: number;
  climbY: number;
  /** Nado: 0..1 intensidade da braçada. */
  swimStroke: number;
  /** Rolamento/esquiva: progresso 0..1 (−1 = inativo) e tipo (0 chão, 1 ar/voo). */
  dodgeT: number;
  dodgeAir: boolean;
  blocking: boolean;
  /** Olhar/mirar relativo ao corpo (rad). */
  lookYaw: number;
  lookPitch: number;
  /** Intensidade (0..1) de mira ativa (gira o tronco junto com a cabeça). */
  aimWeight: number;
}

export function createLocoParams(): LocoParams {
  return {
    mode: 'ground',
    speed: 0,
    vy: 0,
    turnRate: 0,
    localMoveX: 0,
    localMoveZ: 1,
    strafe: 0,
    flightPitch: 0,
    flightBank: 0,
    hover: 1,
    boost: 0,
    vertical: 0,
    gliding: false,
    climbX: 0,
    climbY: 0,
    swimStroke: 0,
    dodgeT: -1,
    dodgeAir: false,
    blocking: false,
    lookYaw: 0,
    lookPitch: 0,
    aimWeight: 0,
  };
}

interface ActionLayer {
  clip: CompiledClip | null;
  t: number;
  dur: number;
  /** Peso no momento em que começou a sair (para saída suave a partir de qualquer ponto). */
  outFrom: number;
  /** Tempo restante de saída forçada (interrompido por outro clipe). */
  outT: number;
  outDur: number;
}

const TAU = Math.PI * 2;
const MODES: LocoMode[] = ['ground', 'air', 'flight', 'climb', 'swim', 'dodge', 'dead'];

export class Animator {
  /** Pose final (aplicada ao modelo). */
  readonly pose: Pose = createPose();
  private tmp: Pose = createPose();
  private modePose: Pose = createPose();
  private gaitPose: Pose = createPose();
  private weights = new Float32Array(MODES.length);
  /** Fase do ciclo de passada (0..1 = duas passadas). */
  phase = 0;
  private climbPhase = 0;
  private swimPhase = 0;
  private time = 0;
  private gaitSmooth = 0;
  private airBlend = 0;
  private leanRoll = 0;
  private leanPitch = 0;
  private lastSpeed = 0;
  private blockW = 0;
  private landImpulse = 0;
  private landVel = 0;
  private layers: ActionLayer[] = [];
  /** Brilho das mãos pedido pelos clipes [esq, dir]. */
  readonly aura = [0, 0];
  /** Algum clipe ativo pede que o corpo vire para a mira. */
  faceAim = false;
  /** Contador de passos para eventos (incrementa a cada meia fase). */
  private stepIndex = 0;
  /** true no frame em que um pé tocou o chão. */
  footstep = false;
  /** Morte: segura a última pose. */
  private deathClip: ActionLayer | null = null;

  constructor() {
    for (let i = 0; i < 3; i++) this.layers.push({ clip: null, t: 0, dur: 1, outFrom: 0, outT: 0, outDur: 0.15 });
    this.weights[0] = 1;
  }

  /**
   * Toca um clipe de ação. `duration` já inclui a velocidade.
   * Reações aditivas usam uma camada própria e não interrompem conjurações.
   */
  play(name: AnyAnim, duration: number) {
    const clip = CLIPS[name];
    if (name === 'death') {
      this.deathClip = { clip, t: 0, dur: duration, outFrom: 0, outT: 0, outDur: 0 };
      return;
    }
    // camada 0: ação principal; 1: ação anterior saindo; 2: aditiva
    if (clip.def.additive) {
      const l = this.layers[2];
      l.clip = clip;
      l.t = 0;
      l.dur = duration;
      l.outT = 0;
      return;
    }
    const cur = this.layers[0];
    const prev = this.layers[1];
    if (cur.clip) {
      // a ação atual passa para a camada de saída com o peso que tinha
      prev.clip = cur.clip;
      prev.t = cur.t;
      prev.dur = cur.dur;
      prev.outFrom = this.layerWeight(cur);
      prev.outDur = Math.max(0.06, clip.def.fadeIn ?? 0.1);
      prev.outT = prev.outDur;
    }
    cur.clip = clip;
    cur.t = 0;
    cur.dur = Math.max(0.05, duration);
    cur.outT = 0;
  }

  /** Interrompe ações (ex.: ao morrer, renascer, ser atordoado). */
  stopActions(fade = 0.12) {
    for (let i = 0; i < 2; i++) {
      const l = this.layers[i];
      if (!l.clip) continue;
      l.outFrom = this.layerWeight(l);
      l.outDur = fade;
      l.outT = fade;
    }
  }

  clearDeath() {
    this.deathClip = null;
  }

  /** Clipe principal ativo (ou null) e progresso 0..1. */
  currentAction(): { name: AnyAnim | null; u: number } {
    const l = this.layers[0];
    if (!l.clip || l.outT > 0) return { name: null, u: 1 };
    return { name: l.clip.name, u: l.t / l.dur };
  }
  activeActionName(): AnyAnim | null {
    const l = this.layers[0];
    return l.clip && l.outT <= 0 ? l.clip.name : null;
  }
  actionProgress(): number {
    const l = this.layers[0];
    return l.clip && l.outT <= 0 ? l.t / l.dur : 1;
  }

  /** Impulso de aterrissagem (0..1+) — agacha o corpo de forma elástica. */
  landed(strength: number) {
    this.landVel -= strength * 3.2;
  }

  private layerWeight(l: ActionLayer): number {
    if (!l.clip) return 0;
    if (l.outT > 0) return l.outFrom * (l.outT / l.outDur);
    const d = l.clip.def;
    const fi = d.fadeIn ?? 0.1;
    const fo = d.fadeOut ?? 0.15;
    let w = fi > 0 ? Math.min(1, l.t / fi) : 1;
    if (!d.hold) w = Math.min(w, fo > 0 ? Math.max(0, (l.dur - l.t) / fo) : l.t < l.dur ? 1 : 0);
    return w;
  }

  update(dt: number, p: LocoParams) {
    this.time += dt;
    const pose = this.pose;
    const L = LOCOMOTION;

    // ---- Pesos dos modos (suavizados) ----
    const mi = MODES.indexOf(p.mode);
    let sum = 0;
    for (let i = 0; i < MODES.length; i++) {
      const target = i === mi ? 1 : 0;
      const lambda = MODES[i] === 'dodge' || p.mode === 'dodge' ? 18 : MODES[i] === 'dead' ? 6 : 9;
      this.weights[i] = damp(this.weights[i], target, lambda, dt);
      sum += this.weights[i];
    }
    if (sum < 1e-4) {
      this.weights[mi] = 1;
      sum = 1;
    }

    // ---- Fase da passada (sincronizada com a distância percorrida) ----
    const sp = p.mode === 'ground' || p.mode === 'dodge' ? p.speed : 0;
    const g = sp <= L.walkSpeed ? sp / L.walkSpeed : sp <= L.runSpeed ? 1 + (sp - L.walkSpeed) / (L.runSpeed - L.walkSpeed) : 2 + Math.min(1.2, (sp - L.runSpeed) / (L.sprintSpeed - L.runSpeed));
    this.gaitSmooth = damp(this.gaitSmooth, g, 10, dt);
    const gs = this.gaitSmooth;
    const stride = gs < 1 ? L.strideWalk : gs < 2 ? L.strideWalk + (L.strideRun - L.strideWalk) * (gs - 1) : L.strideRun + (L.strideSprint - L.strideRun) * Math.min(1, gs - 2);
    if (sp > 0.05) this.phase = (this.phase + (sp * dt) / (2 * stride)) % 1;
    else if (gs < 0.2) this.phase = damp(this.phase, this.phase < 0.25 ? 0 : this.phase < 0.75 ? 0.5 : 1, 4, dt) % 1;
    const si = Math.floor(this.phase * 2);
    this.footstep = false;
    if (si !== this.stepIndex) {
      this.stepIndex = si;
      if (p.mode === 'ground' && sp > 0.6) this.footstep = true;
    }

    // ---- Inclinação nas curvas e na aceleração ----
    const accel = (p.speed - this.lastSpeed) / Math.max(1e-3, dt);
    this.lastSpeed = p.speed;
    const rollTarget = p.mode === 'ground' ? clamp(-p.turnRate * p.speed * 0.022, -0.22, 0.22) : 0;
    this.leanRoll = damp(this.leanRoll, rollTarget, 8, dt);
    this.leanPitch = damp(this.leanPitch, p.mode === 'ground' ? clamp(accel * 0.012, -0.12, 0.15) : 0, 6, dt);

    // ---- Base de locomoção ----
    poseClear(pose);
    const w = this.weights;
    for (let i = 0; i < MODES.length; i++) {
      const wi = w[i] / sum;
      if (wi < 0.002) continue;
      const mp = this.modePose;
      poseClear(mp);
      switch (MODES[i]) {
        case 'ground':
          this.groundPose(mp, p, gs, dt);
          break;
        case 'air':
          this.airPose(mp, p, dt);
          break;
        case 'flight':
          this.flightPose(mp, p);
          break;
        case 'climb':
          this.climbPose(mp, p, dt);
          break;
        case 'swim':
          this.swimPose(mp, p, dt);
          break;
        case 'dodge':
          this.dodgePose(mp, p);
          break;
        case 'dead':
          this.idlePose(mp, 0);
          break;
      }
      poseAddScaled(pose, mp, wi);
    }

    // ---- Defesa (parte superior) ----
    this.blockW = damp(this.blockW, p.blocking ? 1 : 0, 14, dt);
    if (this.blockW > 0.01) {
      const bp = this.tmp;
      poseClear(bp);
      setBone(bp, B.spine, 0.06, 0, 0);
      setBone(bp, B.chest, 0.1, 0.2, 0);
      setBone(bp, B.head, -0.06, -0.15, 0);
      setBone(bp, B.upperArmR, -1.05, 0, 0.42);
      setBone(bp, B.foreArmR, -1.2, 0, 0);
      setBone(bp, B.handR, 0, 1.35, 0);
      setBone(bp, B.upperArmL, -1.25, 0, -0.2);
      setBone(bp, B.foreArmL, -0.75, 0, 0);
      setBone(bp, B.handL, 0.9, 0, 0.2);
      blendMasked(pose, bp, this.blockW, MASKS.upper);
      this.aura[0] = Math.max(this.aura[0], this.blockW * 0.6);
    }

    // ---- Camadas de ação ----
    let auraL = this.blockW * 0.6;
    let auraR = 0;
    this.faceAim = false;
    for (let k = 1; k >= 0; k--) {
      const l = this.layers[k];
      if (!l.clip) continue;
      l.t += dt;
      if (l.outT > 0) {
        l.outT -= dt;
        if (l.outT <= 0) {
          l.clip = null;
          continue;
        }
      } else if (l.t >= l.dur && !l.clip.def.hold) {
        l.clip = null;
        continue;
      }
      const wgt = this.layerWeight(l);
      if (wgt <= 0) continue;
      sampleClip(l.clip, Math.min(1, l.t / l.dur), this.tmp);
      blendMasked(pose, this.tmp, wgt, l.clip.mask);
      const a = l.clip.def.aura;
      if (a) {
        const env = wgt * smoothstep(0, 0.35, l.t / l.dur);
        auraL = Math.max(auraL, a[0] * env);
        auraR = Math.max(auraR, a[1] * env);
      }
      if (l.clip.def.faceAim && wgt > 0.1) this.faceAim = true;
    }
    const add = this.layers[2];
    if (add.clip) {
      add.t += dt;
      if (add.t >= add.dur) add.clip = null;
      else {
        const wgt = this.layerWeight(add);
        sampleClip(add.clip, add.t / add.dur, this.tmp);
        addMasked(pose, this.tmp, wgt, add.clip.mask);
      }
    }
    this.aura[0] = auraL;
    this.aura[1] = auraR;

    // ---- Morte (substitui tudo, segura a última pose) ----
    if (this.deathClip && this.deathClip.clip) {
      const d = this.deathClip;
      d.t = Math.min(d.t + dt, d.dur);
      sampleClip(d.clip!, d.t / d.dur, this.tmp);
      blendMasked(pose, this.tmp, Math.min(1, d.t / 0.12), d.clip!.mask);
    }

    // ---- Ajustes procedurais ----
    // impacto de aterrissagem (mola amortecida)
    // subpassos fixos: a mola é rígida e a integração explícita explodiria com dt grande
    const nSub = Math.min(24, Math.ceil(dt * 240));
    const h = dt / nSub;
    for (let k = 0; k < nSub; k++) {
      this.landVel += (-this.landImpulse * 160 - this.landVel * 16) * h;
      this.landImpulse += this.landVel * h;
    }
    if (this.landImpulse < -0.6) this.landImpulse = -0.6;
    else if (this.landImpulse > 0.25) this.landImpulse = 0.25;
    if (Math.abs(this.landImpulse) < 1e-4 && Math.abs(this.landVel) < 1e-3) this.landImpulse = this.landVel = 0;
    if (this.landImpulse !== 0 && p.mode !== 'dead') {
      const k = -this.landImpulse; // 0..0.6 agachamento
      pose[R_OFFY] -= k * 0.42;
      addBone(pose, B.thighL, -k * 1.1, 0, 0);
      addBone(pose, B.thighR, -k * 1.1, 0, 0);
      addBone(pose, B.shinL, k * 1.9, 0, 0);
      addBone(pose, B.shinR, k * 1.9, 0, 0);
      addBone(pose, B.footL, -k * 0.8, 0, 0);
      addBone(pose, B.footR, -k * 0.8, 0, 0);
      addBone(pose, B.spine, k * 0.35, 0, 0);
      addBone(pose, B.chest, k * 0.25, 0, 0);
      addBone(pose, B.head, -k * 0.4, 0, 0);
    }
    // olhar / mirar
    if (p.mode !== 'dead') {
      const ly = clamp(p.lookYaw, -1.25, 1.25);
      const lp = clamp(p.lookPitch, -0.9, 0.8);
      const aw = p.aimWeight;
      // cabeça e pescoço sempre; tronco acompanha quando mirando
      addBone(pose, B.neck, lp * 0.3, ly * (0.3 - aw * 0.1), 0);
      addBone(pose, B.head, lp * 0.45, ly * (0.45 - aw * 0.15), 0);
      if (aw > 0.01) {
        addBone(pose, B.spine, lp * 0.15 * aw, ly * 0.2 * aw, 0);
        addBone(pose, B.chest, lp * 0.25 * aw, ly * 0.25 * aw, 0);
      }
    }
    pose[R_ROLL] += this.leanRoll;
    pose[R_PITCH] += this.leanPitch;
  }

  // =====================================================================
  // Poses de locomoção
  // =====================================================================

  /** Respiração e postura de repouso, cajado em pé na mão direita. */
  private idlePose(o: Pose, amount: number) {
    const t = this.time;
    const br = Math.sin(t * 1.7);
    const sway = Math.sin(t * 0.55);
    setBone(o, B.spine, 0.03 + br * 0.012, sway * 0.02, 0);
    setBone(o, B.chest, -0.02 - br * 0.025, 0, 0);
    setBone(o, B.neck, 0.02, 0, 0);
    setBone(o, B.head, 0.04 + br * 0.01, sway * 0.06, 0);
    setBone(o, B.shoulderL, 0, 0, -br * 0.015);
    setBone(o, B.shoulderR, 0, 0, br * 0.015);
    // braço esquerdo relaxado, mão levemente aberta
    setBone(o, B.upperArmL, 0.06, 0, 0.12 + br * 0.015);
    setBone(o, B.foreArmL, -0.3, 0, 0);
    setBone(o, B.handL, 0.1, 0, 0.1);
    // braço direito segurando o cajado em pé
    setBone(o, B.upperArmR, -0.12, 0, -0.34);
    setBone(o, B.foreArmR, -1.34, -0.08, 0);
    setBone(o, B.handR, 0.08, -0.05, 0);
    // pernas: base aberta, peso no pé direito
    setBone(o, B.hips, 0, sway * 0.03, 0.02 * sway);
    setBone(o, B.thighL, -0.06, 0.08, 0.07);
    setBone(o, B.shinL, 0.1, 0, 0);
    setBone(o, B.footL, -0.04, -0.06, -0.06);
    setBone(o, B.thighR, 0.03, -0.12, -0.05);
    setBone(o, B.shinR, 0.04, 0, 0);
    setBone(o, B.footR, -0.05, 0.1, 0.05);
    o[R_OFFY] = -0.008 + br * 0.004;
    o[R_OFFX] = sway * 0.012 * amount;
  }

  private gaitPoseAt(o: Pose, gait: number, phase: number, p: LocoParams) {
    poseClear(o);
    const a = phase * TAU;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const bob = Math.cos(2 * a);
    // amplitudes por andadura: 1 = andar, 2 = correr, 3 = disparar
    const run = gait >= 2 ? 1 : 0;
    const spr = gait >= 3 ? 1 : 0;
    const thighAmp = spr ? 1.05 : run ? 0.82 : 0.46;
    const kneeAmp = spr ? 1.75 : run ? 1.35 : 0.6;
    const kneeBase = spr ? 0.35 : run ? 0.28 : 0.1;
    const armAmp = spr ? 0.95 : run ? 0.62 : 0.32;
    const lean = spr ? 0.32 : run ? 0.14 : 0.03;
    // Passadas laterais / de costas (trava de alvo): rotaciona a direção do balanço da perna.
    const fz = p.strafe > 0.5 ? p.localMoveZ : 1;
    const fx = p.strafe > 0.5 ? p.localMoveX : 0;
    const kneeL = kneeBase + kneeAmp * Math.max(0, c) * (0.6 + 0.4 * Math.abs(fz));
    const kneeR = kneeBase + kneeAmp * Math.max(0, -c) * (0.6 + 0.4 * Math.abs(fz));
    setBone(o, B.thighL, -thighAmp * s * fz - kneeL * 0.35, 0, 0.04 + thighAmp * s * fx * 0.5);
    setBone(o, B.thighR, thighAmp * s * fz - kneeR * 0.35, 0, -0.04 - thighAmp * s * fx * 0.5);
    setBone(o, B.shinL, kneeL, 0, 0);
    setBone(o, B.shinR, kneeR, 0, 0);
    setBone(o, B.footL, -0.25 * Math.max(0, -s) * fz + kneeL * -0.25 + (run ? 0.15 * Math.max(0, s) : 0), 0, 0);
    setBone(o, B.footR, -0.25 * Math.max(0, s) * fz + kneeR * -0.25 + (run ? 0.15 * Math.max(0, -s) : 0), 0, 0);
    setBone(o, B.hips, 0, 0.13 * s * fz, 0.05 * s);
    setBone(o, B.spine, lean * 0.6, -0.06 * s * fz, 0);
    setBone(o, B.chest, lean * 0.4, -0.12 * s * fz, -0.03 * s);
    setBone(o, B.neck, -lean * 0.4, 0.05 * s, 0);
    setBone(o, B.head, -lean * 0.6, 0.05 * s * fz, 0);
    // braço esquerdo balança oposto à perna esquerda
    setBone(o, B.upperArmL, armAmp * s * fz - (run ? 0.15 : 0), 0, 0.14 + (run ? 0.1 : 0));
    setBone(o, B.foreArmL, -0.3 - (run ? 0.75 : 0.15) - 0.35 * Math.max(0, -s) * armAmp, 0, 0);
    setBone(o, B.handL, 0.1, 0, 0.1);
    // braço direito: cajado — em pé ao andar, inclinado à frente ao correr, baixo e horizontal no disparo
    if (spr) {
      // empunhadura invertida: o cajado vai deitado para trás, cristal arrastando
      setBone(o, B.upperArmR, 0.45 - 0.3 * s, 0, -0.26);
      setBone(o, B.foreArmR, -0.3, 0, 0);
      setBone(o, B.handR, -0.05, Math.PI, 0);
    } else if (run) {
      setBone(o, B.upperArmR, -0.25 - 0.22 * s, 0, -0.32);
      setBone(o, B.foreArmR, -1.05, -0.05, 0);
      setBone(o, B.handR, -0.25, 0, 0);
    } else {
      setBone(o, B.upperArmR, -0.12 - 0.12 * s, 0, -0.32);
      setBone(o, B.foreArmR, -1.32, -0.08, 0);
      setBone(o, B.handR, 0.08, -0.05, 0);
    }
    o[R_OFFY] = (run ? 0.045 : 0.022) * bob - (run ? 0.05 : 0.015) - (spr ? 0.04 : 0);
    o[R_PITCH] = lean * 0.6;
  }

  private groundPose(o: Pose, p: LocoParams, gs: number, _dt: number) {
    const ph = this.phase;
    if (gs < 0.02) {
      this.idlePose(o, 1);
      return;
    }
    const gp = this.gaitPose;
    // mistura entre parado→andar→correr→disparar
    if (gs < 1) {
      this.idlePose(o, 1 - gs);
      this.gaitPoseAt(gp, 1, ph, p);
      blendAll(o, gp, gs);
    } else if (gs < 2) {
      this.gaitPoseAt(o, 1, ph, p);
      this.gaitPoseAt(gp, 2, ph, p);
      blendAll(o, gp, gs - 1);
    } else {
      this.gaitPoseAt(o, 2, ph, p);
      this.gaitPoseAt(gp, 3, ph, p);
      blendAll(o, gp, Math.min(1, gs - 2));
    }
  }

  private airPose(o: Pose, p: LocoParams, dt: number) {
    // 0 = subindo (pernas recolhidas), 1 = caindo (pernas estendidas, braços abertos)
    this.airBlend = damp(this.airBlend, p.vy > 1 ? 0 : 1, 5, dt);
    const f = this.airBlend;
    const t = this.time;
    const flail = Math.sin(t * 7) * 0.08 * f;
    setBone(o, B.spine, 0.05 - 0.08 * f, 0, 0);
    setBone(o, B.chest, 0.04 - 0.06 * f, 0, 0);
    setBone(o, B.head, -0.05 + 0.1 * f, 0, 0);
    setBone(o, B.thighL, -0.75 + 0.45 * f, 0, 0.05 + 0.08 * f);
    setBone(o, B.shinL, 1.1 - 0.7 * f, 0, 0);
    setBone(o, B.footL, -0.2 + 0.35 * f, 0, 0);
    setBone(o, B.thighR, -0.15 + 0.2 * f, 0, -0.05 - 0.08 * f);
    setBone(o, B.shinR, 0.55 - 0.25 * f, 0, 0);
    setBone(o, B.footR, 0.1 + 0.25 * f, 0, 0);
    setBone(o, B.upperArmL, -0.35 + 0.25 * f + flail, 0, 0.55 + 0.4 * f);
    setBone(o, B.foreArmL, -0.45, 0, 0);
    setBone(o, B.handL, 0.1, 0, 0.2);
    setBone(o, B.upperArmR, -0.35 + 0.1 * f - flail, 0, -0.4 - 0.2 * f);
    setBone(o, B.foreArmR, -1.1 + 0.2 * f, -0.05, 0);
    o[R_OFFY] = 0.02;
  }

  private flightPose(o: Pose, p: LocoParams) {
    const t = this.time;
    const hov = p.hover;
    const bst = p.boost;
    const fwd = 1 - hov;
    const bob = Math.sin(t * 2.1);
    const v = p.vertical;
    // pairar: pernas soltas, um joelho mais dobrado, braços abertos, palmas para baixo
    const legSway = Math.sin(t * 1.3) * 0.06 * hov;
    // no cruzeiro as pernas seguem quase juntas (a saia do sobretudo não se abre)
    setBone(o, B.thighL, -0.22 * hov + 0.15 * fwd + legSway - 0.15 * Math.max(0, -v) * hov, 0, 0.06 * hov + 0.01 * fwd);
    setBone(o, B.shinL, 0.55 * hov + 0.22 * fwd, 0, 0);
    setBone(o, B.footL, 0.55 * hov + 0.6 * fwd, 0, 0);
    setBone(o, B.thighR, 0.02 * hov + 0.21 * fwd - legSway, 0, -0.05 * hov - 0.01 * fwd);
    setBone(o, B.shinR, 0.22 * hov + 0.36 * fwd, 0, 0);
    setBone(o, B.footR, 0.5 * hov + 0.6 * fwd, 0, 0);
    // tronco: no voo inclinado a cabeça compensa para olhar à frente
    const pitch = p.flightPitch;
    setBone(o, B.spine, -0.05 * hov + 0.04 * Math.sin(t * 1.7), 0, 0);
    setBone(o, B.chest, -0.06 * hov - 0.08 * Math.max(0, v), 0, 0);
    setBone(o, B.neck, -pitch * 0.32, 0, 0);
    setBone(o, B.head, -pitch * 0.42 + 0.05 * hov, 0, -p.flightBank * 0.3);
    // braços: pairar abertos → cruzeiro ao longo do corpo → turbo com o braço esquerdo à frente
    const armOpen = 0.55 + 0.1 * bob;
    const cruiseArm = fwd * (1 - bst);
    setBone(o, B.upperArmL, -0.25 * hov + 0.45 * cruiseArm - 2.75 * bst, 0, armOpen * hov + 0.3 * cruiseArm + 0.12 * bst);
    setBone(o, B.foreArmL, -0.25 * hov - 0.15 * cruiseArm - 0.05 * bst, 0, 0);
    setBone(o, B.handL, 0.45 * hov + 0.2 * bst, 0, 0.3 * hov);
    // mão direita leva o cajado: aberto ao pairar, colado ao corpo apontando para trás no cruzeiro
    setBone(o, B.upperArmR, -0.35 * hov + 0.55 * fwd, 0, -armOpen * 0.8 * hov - 0.18 * fwd);
    setBone(o, B.foreArmR, -1.05 * hov - 0.2 * fwd, -0.05 * hov, 0);
    setBone(o, B.handR, 0.15 * hov + 1.35 * fwd, 0, 0);
    // ao subir, braços para baixo e para trás; ao descer, pernas à frente
    if (v > 0) {
      addBone(o, B.upperArmL, 0.35 * v * hov, 0, -0.25 * v * hov);
      addBone(o, B.upperArmR, 0.35 * v * hov, 0, 0.2 * v * hov);
    } else if (v < 0) {
      addBone(o, B.thighL, 0.35 * v * hov, 0, 0);
      addBone(o, B.thighR, 0.2 * v * hov, 0, 0);
    }
    if (p.gliding) {
      // planando sem energia: braços abertos em asa
      addBone(o, B.upperArmL, -0.15, 0, 0.75);
      addBone(o, B.upperArmR, -0.15, 0, -0.75);
    }
    o[R_PITCH] = pitch;
    o[R_ROLL] = p.flightBank;
    o[R_OFFY] = 0.05 * bob * hov + 0.015 * Math.sin(t * 9) * bst;
  }

  private climbPose(o: Pose, p: LocoParams, dt: number) {
    const mv = Math.hypot(p.climbX, p.climbY);
    this.climbPhase = (this.climbPhase + dt * mv * 1.1) % 1;
    const a = this.climbPhase * TAU;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const lat = p.climbX * 0.25;
    setBone(o, B.spine, 0.12, 0, 0);
    setBone(o, B.chest, 0.05, 0, lat * 0.4);
    setBone(o, B.neck, -0.15, 0, 0);
    setBone(o, B.head, -0.35, 0, 0);
    // braços alcançam acima em alternância
    setBone(o, B.upperArmL, -2.55 - 0.35 * s, 0, 0.35 + lat);
    setBone(o, B.foreArmL, -0.75 + 0.45 * s, 0, 0);
    setBone(o, B.handL, 0.4, 0, 0);
    setBone(o, B.upperArmR, -2.55 + 0.35 * s, 0, -0.35 + lat);
    setBone(o, B.foreArmR, -0.75 - 0.45 * s, 0, 0);
    setBone(o, B.handR, 0.4, 0, 0);
    // pernas empurram em alternância (oposto ao braço do mesmo lado)
    setBone(o, B.thighL, -0.85 + 0.45 * s, 0, 0.18 - lat * 0.5);
    setBone(o, B.shinL, 1.35 - 0.45 * s, 0, 0);
    setBone(o, B.footL, -0.4, 0, 0);
    setBone(o, B.thighR, -0.85 - 0.45 * s, 0, -0.18 - lat * 0.5);
    setBone(o, B.shinR, 1.35 + 0.45 * s, 0, 0);
    setBone(o, B.footR, -0.4, 0, 0);
    o[R_OFFY] = -0.05 + 0.03 * c * Math.min(1, mv);
    o[R_OFFZ] = 0.04;
    o[R_PITCH] = -0.06;
  }

  private swimPose(o: Pose, p: LocoParams, dt: number) {
    const k = p.swimStroke;
    this.swimPhase = (this.swimPhase + dt * (0.35 + 0.55 * k)) % 1;
    const a = this.swimPhase * TAU;
    const s = Math.sin(a);
    const c = Math.cos(a);
    const t = this.time;
    // nado de peito; parado = boiando com braços abrindo e fechando
    const tread = 1 - k;
    setBone(o, B.spine, 0.05, 0, 0);
    setBone(o, B.chest, 0.02, 0, 0);
    setBone(o, B.neck, -0.55 * k, 0, 0);
    setBone(o, B.head, -0.55 * k, 0, 0);
    const reach = Math.max(0, c);
    setBone(o, B.upperArmL, -2.6 * k * (0.4 + 0.6 * reach) - 0.8 * tread, 0, 0.35 + 0.9 * k * Math.max(0, -c) + 0.5 * tread * (0.5 + 0.5 * Math.sin(t * 2.2)));
    setBone(o, B.foreArmL, -0.6 * k * (1 - reach) - 0.4 * tread, 0, 0);
    setBone(o, B.handL, 0.3, 0, 0.3);
    setBone(o, B.upperArmR, -2.6 * k * (0.4 + 0.6 * reach) - 0.8 * tread, 0, -0.35 - 0.9 * k * Math.max(0, -c) - 0.5 * tread * (0.5 + 0.5 * Math.sin(t * 2.2)));
    setBone(o, B.foreArmR, -0.6 * k * (1 - reach) - 0.4 * tread, 0, 0);
    setBone(o, B.handR, 0.3, 0, -0.3);
    setBone(o, B.thighL, -0.35 * tread + 0.35 * k * s, 0, 0.12 + 0.2 * k * Math.max(0, s));
    setBone(o, B.shinL, 0.5 * tread + 0.9 * k * Math.max(0, -s), 0, 0);
    setBone(o, B.footL, 0.4, 0, 0);
    setBone(o, B.thighR, -0.1 * tread + 0.35 * k * s, 0, -0.12 - 0.2 * k * Math.max(0, s));
    setBone(o, B.shinR, 0.3 * tread + 0.9 * k * Math.max(0, -s), 0, 0);
    setBone(o, B.footR, 0.4, 0, 0);
    o[R_PITCH] = 1.2 * k + 0.12 * tread;
    o[R_OFFY] = 0.03 * Math.sin(t * 1.6);
  }

  /** Rolamento no chão (giro completo do corpo encolhido) ou giro de barril no ar/voo. */
  private dodgePose(o: Pose, p: LocoParams) {
    const u = clamp(p.dodgeT, 0, 1);
    const curl = Math.sin(Math.min(1, u * 1.15) * Math.PI);
    if (p.dodgeAir) {
      // investida aérea: giro de barril em torno do eixo do movimento
      setBone(o, B.thighL, -0.2 * curl, 0, 0.1);
      setBone(o, B.thighR, 0.1 * curl, 0, -0.1);
      setBone(o, B.shinL, 0.6 * curl, 0, 0);
      setBone(o, B.shinR, 0.4 * curl, 0, 0);
      setBone(o, B.upperArmL, 0.3, 0, 0.3 + 0.4 * curl);
      setBone(o, B.upperArmR, 0.3, 0, -0.3 - 0.4 * curl);
      setBone(o, B.foreArmR, -0.9, 0, 0);
      o[R_PITCH] = 0.9 * curl + p.flightPitch * (1 - curl);
      const e = u * u * (3 - 2 * u);
      // 2π ≡ 0: ao completar o giro volta a zero para a mistura não "desgirar"
      o[R_ROLL] = e >= 0.999 ? 0 : e * TAU * (p.localMoveX >= 0 ? -1 : 1);
      return;
    }
    // corpo encolhido
    setBone(o, B.spine, 0.55 * curl, 0, 0);
    setBone(o, B.chest, 0.45 * curl, 0, 0);
    setBone(o, B.neck, 0.3 * curl, 0, 0);
    setBone(o, B.head, 0.45 * curl, 0, 0);
    setBone(o, B.thighL, -2.1 * curl, 0, 0.08);
    setBone(o, B.thighR, -1.9 * curl, 0, -0.08);
    setBone(o, B.shinL, 2.2 * curl, 0, 0);
    setBone(o, B.shinR, 2.1 * curl, 0, 0);
    setBone(o, B.footL, -0.4 * curl, 0, 0);
    setBone(o, B.footR, -0.4 * curl, 0, 0);
    setBone(o, B.upperArmL, -0.9 * curl, 0, 0.25);
    setBone(o, B.foreArmL, -1.4 * curl, 0, 0);
    setBone(o, B.upperArmR, -0.7 * curl, 0.1, -0.25);
    setBone(o, B.foreArmR, -1.2 * curl - 0.3, 0.15, 0);
    // giro completo para frente com o pivô baixado (rola no chão)
    const r = clamp((u - 0.08) / 0.72, 0, 1);
    const e = r * r * (3 - 2 * r);
    o[R_PITCH] = e >= 0.999 ? 0 : e * TAU;
    o[R_OFFY] = -0.52 * curl;
    o[R_OFFZ] = 0;
  }
}

/** dst = lerp(dst, src, w) em todos os canais. */
function blendAll(dst: Pose, src: Pose, w: number) {
  if (w <= 0) return;
  for (let i = 0; i < POSE_SIZE; i++) dst[i] += (src[i] - dst[i]) * w;
}

function blendMasked(dst: Pose, src: Pose, w: number, mask: Float32Array) {
  for (let i = 0; i < POSE_SIZE; i++) {
    const k = w * mask[i];
    if (k !== 0) dst[i] += (src[i] - dst[i]) * k;
  }
}

function addMasked(dst: Pose, src: Pose, w: number, mask: Float32Array) {
  for (let i = 0; i < POSE_SIZE; i++) {
    const k = w * mask[i];
    if (k !== 0) dst[i] += src[i] * k;
  }
}

// silencia import não usado em alguns builds
void R_OFFX;
void R_OFFZ;
