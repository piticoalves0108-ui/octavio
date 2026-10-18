import type * as THREE from 'three';
import { NB, NPC_BONE_COUNT, NPC_PROPS } from './model';

/**
 * Animação procedural dos NPCs: ciclo de passada (andar/correr), respiração, olhar
 * para o jogador e poses de atividade — martelar, varrer, colher, sentar, beber,
 * rezar, ler, vigiar, vender (chamar fregueses), conversar com gestos, tocar alaúde,
 * brincar, encolher-se, susto, acenar, apontar para o céu, cair nocauteado e golpe
 * de lança. Cada quadro calcula a pose-alvo dos 11 ossos e aproxima a pose atual
 * com amortecimento exponencial (transições suaves, zero alocação).
 */
export type NpcAnim =
  | 'idle'
  | 'talk'
  | 'chat'
  | 'hammer'
  | 'sweep'
  | 'harvest'
  | 'work'
  | 'sit'
  | 'drink'
  | 'pray'
  | 'read'
  | 'guard'
  | 'sell'
  | 'lute'
  | 'play'
  | 'cower'
  | 'startle'
  | 'wave'
  | 'pointUp'
  | 'knocked'
  | 'thrust';

export interface NpcAnimInput {
  anim: NpcAnim;
  /** Velocidade horizontal (m/s) — liga a passada. */
  speed: number;
  /** Correndo (passada larga, braços dobrados). */
  running: boolean;
  /** Giro da cabeça (rad, relativo ao corpo) e inclinação. */
  lookYaw: number;
  lookPitch: number;
  /** Corcunda (idosos). */
  stoop: boolean;
  /** Escala de altura (para a passada). */
  heightScale: number;
}

const N = NPC_BONE_COUNT;

export class NpcAnimator {
  private cur = new Float32Array(N * 3);
  private tgt = new Float32Array(N * 3);
  private bodyY = 0;
  private bodyPitch = 0;
  private tBodyY = 0;
  private tBodyPitch = 0;
  private phase = 0;
  private t = Math.random() * 10;
  /** Golpe da ferramenta neste quadro (martelo bateu, lança estocou) — para faíscas/sons. */
  strike = false;
  private lastCycle = 0;

  constructor(
    private bones: THREE.Bone[],
    private body: THREE.Object3D,
  ) {}

  private set(b: number, x: number, y: number, z: number) {
    const i = b * 3;
    this.tgt[i] = x;
    this.tgt[i + 1] = y;
    this.tgt[i + 2] = z;
  }
  private add(b: number, x: number, y: number, z: number) {
    const i = b * 3;
    this.tgt[i] += x;
    this.tgt[i + 1] += y;
    this.tgt[i + 2] += z;
  }

  update(dt: number, inp: NpcAnimInput) {
    this.t += dt;
    const t = this.t;
    this.strike = false;
    this.tgt.fill(0);
    this.tBodyY = 0;
    this.tBodyPitch = 0;

    // ---------------------------------------------------------------- base em pé
    const breath = Math.sin(t * 1.7) * 0.018;
    this.set(NB.SPINE, (inp.stoop ? 0.32 : 0.02) + breath, 0, 0);
    this.set(NB.HEAD, inp.stoop ? -0.22 : 0, 0, 0);
    this.set(NB.ARM_L, 0.02, 0, 0.09);
    this.set(NB.ARM_R, 0.02, 0, -0.09);
    this.set(NB.FORE_L, -0.16, 0, 0);
    this.set(NB.FORE_R, -0.16, 0, 0);
    this.set(NB.SHIN_L, 0.04, 0, 0);
    this.set(NB.SHIN_R, 0.04, 0, 0);

    const moving = inp.speed > 0.15;
    if (moving) this.locomotion(dt, inp);
    else this.activity(inp.anim, t, inp);

    // cabeça olha para o alvo (somado à pose)
    this.add(NB.HEAD, inp.lookPitch, inp.lookYaw * 0.75, 0);
    this.add(NB.SPINE, 0, inp.lookYaw * 0.25, 0);

    // ---------------------------------------------------------------- aproximação suave
    const k = 1 - Math.exp(-dt * (moving ? 14 : 8));
    const c = this.cur;
    const g = this.tgt;
    for (let i = 0; i < N * 3; i++) c[i] += (g[i] - c[i]) * k;
    this.bodyY += (this.tBodyY - this.bodyY) * k;
    this.bodyPitch += (this.tBodyPitch - this.bodyPitch) * Math.min(1, k * 0.8);
    for (let b = 0; b < N; b++) this.bones[b].rotation.set(c[b * 3], c[b * 3 + 1], c[b * 3 + 2]);
    this.body.position.y = this.bodyY;
    this.body.rotation.x = this.bodyPitch;
  }

  /** Pose instantânea (sem transição) — usada ao reaparecer/teletransportar. */
  snap() {
    this.cur.set(this.tgt);
    this.bodyY = this.tBodyY;
    this.bodyPitch = this.tBodyPitch;
  }

  private locomotion(dt: number, inp: NpcAnimInput) {
    const run = inp.running;
    // comprimento de um ciclo completo (2 passos)
    const stride = (run ? 2.3 : 1.35) * inp.heightScale;
    this.phase = (this.phase + (inp.speed / stride) * Math.PI * 2 * dt) % (Math.PI * 200);
    const p = this.phase;
    const A = run ? 0.75 : 0.42;
    const sL = Math.sin(p);
    const sR = Math.sin(p + Math.PI);
    this.set(NB.LEG_L, -sL * A, 0, 0);
    this.set(NB.LEG_R, -sR * A, 0, 0);
    this.set(NB.SHIN_L, 0.1 + Math.max(0, Math.sin(p - 1.3)) * A * 1.5, 0, 0);
    this.set(NB.SHIN_R, 0.1 + Math.max(0, Math.sin(p + Math.PI - 1.3)) * A * 1.5, 0, 0);
    const armA = run ? 0.8 : 0.38;
    this.set(NB.ARM_L, sL * armA, 0, run ? 0.18 : 0.08);
    this.set(NB.ARM_R, sR * armA, 0, run ? -0.18 : -0.08);
    this.set(NB.FORE_L, run ? -1.3 : -0.3, 0, 0);
    this.set(NB.FORE_R, run ? -1.3 : -0.3, 0, 0);
    this.add(NB.SPINE, run ? 0.22 : 0.04, Math.sin(p) * 0.08, 0);
    this.add(NB.HIPS, 0, -Math.sin(p) * 0.06, 0);
    this.tBodyY = Math.abs(Math.cos(p)) * (run ? 0.06 : 0.025) - (run ? 0.03 : 0.01);
    if (inp.anim === 'cower' || inp.anim === 'startle') {
      // fugindo apavorado: braços para cima
      this.set(NB.ARM_L, -1.9 + sL * 0.3, 0, 0.5);
      this.set(NB.ARM_R, -1.9 + sR * 0.3, 0, -0.5);
    }
  }

  private activity(anim: NpcAnim, t: number, inp: NpcAnimInput) {
    const P = NPC_PROPS;
    switch (anim) {
      case 'idle': {
        const shift = Math.sin(t * 0.35);
        this.add(NB.HIPS, 0, 0, shift * 0.03);
        this.set(NB.LEG_L, 0, 0, 0.03 + Math.max(0, shift) * 0.04);
        this.set(NB.LEG_R, 0, 0, -0.03 + Math.min(0, shift) * 0.04);
        this.add(NB.HEAD, Math.sin(t * 0.23) * 0.06, Math.sin(t * 0.17) * 0.25, 0);
        break;
      }
      case 'talk':
      case 'chat': {
        const g1 = Math.sin(t * 2.1) * 0.5 + 0.5;
        const g2 = Math.sin(t * 1.6 + 1.7) * 0.5 + 0.5;
        const talkier = anim === 'talk' ? 1 : 0.7;
        this.set(NB.ARM_L, -0.35 - g1 * 0.45 * talkier, 0, 0.18 + g2 * 0.2);
        this.set(NB.FORE_L, -0.9 - g2 * 0.5 * talkier, 0, 0);
        this.set(NB.ARM_R, -0.2 - g2 * 0.5 * talkier, 0, -0.15 - g1 * 0.25);
        this.set(NB.FORE_R, -0.7 - g1 * 0.6 * talkier, 0, 0);
        this.add(NB.HEAD, Math.sin(t * 3.1) * 0.06, Math.sin(t * 0.9) * 0.18, Math.sin(t * 1.3) * 0.05);
        break;
      }
      case 'hammer': {
        // ciclo: levanta (lento) → desce (rápido) → batida
        const cyc = (t * 0.9) % 1;
        const up = cyc < 0.7 ? cyc / 0.7 : 1 - (cyc - 0.7) / 0.3;
        const ease = up * up * (3 - 2 * up);
        this.set(NB.ARM_R, -0.55 - ease * 2.1, 0, -0.2);
        this.set(NB.FORE_R, -0.5 - ease * 0.6, 0, 0);
        this.set(NB.ARM_L, -0.75, 0, 0.12);
        this.set(NB.FORE_L, -0.7, 0, 0);
        this.add(NB.SPINE, 0.22 - ease * 0.1, -0.2, 0);
        this.set(NB.LEG_L, -0.12, 0, 0.05);
        this.set(NB.LEG_R, 0.12, 0, -0.05);
        // o martelo bate no fim do ciclo (quando o ciclo recomeça)
        if (cyc < this.lastCycle) this.strike = true;
        this.lastCycle = cyc;
        break;
      }
      case 'sweep': {
        const s = Math.sin(t * 2.4);
        this.set(NB.ARM_R, -0.55, 0, -0.1);
        this.set(NB.FORE_R, -0.6, 0, 0);
        this.set(NB.ARM_L, -0.95, 0, -0.35);
        this.set(NB.FORE_L, -0.5, 0, 0);
        this.add(NB.SPINE, 0.28, s * 0.4, 0);
        this.add(NB.HIPS, 0, s * 0.12, 0);
        this.set(NB.LEG_L, -0.15, 0, 0.06);
        this.set(NB.LEG_R, 0.15, 0, -0.06);
        this.set(NB.SHIN_L, 0.2, 0, 0);
        this.set(NB.SHIN_R, 0.2, 0, 0);
        break;
      }
      case 'harvest': {
        const s = Math.sin(t * 1.8);
        this.add(NB.SPINE, 0.85, 0, 0);
        this.set(NB.HEAD, -0.5, 0, 0);
        this.set(NB.LEG_L, -0.55, 0, 0.08);
        this.set(NB.LEG_R, -0.35, 0, -0.08);
        this.set(NB.SHIN_L, 0.85, 0, 0);
        this.set(NB.SHIN_R, 0.6, 0, 0);
        this.set(NB.ARM_L, -0.6 + s * 0.25, 0, 0.1);
        this.set(NB.ARM_R, -0.6 - s * 0.25, 0, -0.1);
        this.set(NB.FORE_L, -0.4, 0, 0);
        this.set(NB.FORE_R, -0.4, 0, 0);
        this.tBodyY = -0.14;
        break;
      }
      case 'work': {
        const s = Math.sin(t * 3.0);
        this.add(NB.SPINE, 0.3, 0, 0);
        this.set(NB.HEAD, 0.25, 0, 0);
        this.set(NB.ARM_L, -0.8 + s * 0.12, 0, 0.12);
        this.set(NB.ARM_R, -0.8 - s * 0.12, 0, -0.12);
        this.set(NB.FORE_L, -0.6 + s * 0.2, 0, 0);
        this.set(NB.FORE_R, -0.6 - s * 0.2, 0, 0);
        break;
      }
      case 'sit':
      case 'drink':
      case 'lute': {
        this.tBodyY = -(P.hipY - P.seatH) * inp.heightScale;
        this.set(NB.LEG_L, -1.5, 0, 0.1);
        this.set(NB.LEG_R, -1.5, 0, -0.1);
        this.set(NB.SHIN_L, 1.45, 0, 0);
        this.set(NB.SHIN_R, 1.45, 0, 0);
        this.add(NB.SPINE, -0.06, 0, 0);
        this.set(NB.ARM_L, -0.45, 0, 0.12);
        this.set(NB.ARM_R, -0.45, 0, -0.12);
        this.set(NB.FORE_L, -0.85, 0, 0);
        this.set(NB.FORE_R, -0.85, 0, 0);
        if (anim === 'drink') {
          const sip = Math.max(0, Math.sin(t * 0.45) * 1.6 - 0.6);
          this.set(NB.ARM_R, -0.55 - sip * 0.35, 0, -0.2);
          this.set(NB.FORE_R, -1.1 - sip * 0.55, 0, 0);
          this.add(NB.HEAD, -sip * 0.3, 0, 0);
        } else if (anim === 'lute') {
          const strum = Math.sin(t * 9) * 0.12;
          this.set(NB.ARM_L, -0.65, 0, 0.55);
          this.set(NB.FORE_L, -1.35, 0.3, 0);
          this.set(NB.ARM_R, -0.35 + strum, 0, -0.25);
          this.set(NB.FORE_R, -1.05, 0, 0);
          this.add(NB.HEAD, 0.12, 0, Math.sin(t * 1.4) * 0.12);
          this.add(NB.SPINE, 0, 0, Math.sin(t * 1.4) * 0.05);
        } else {
          this.add(NB.HEAD, Math.sin(t * 0.3) * 0.08, Math.sin(t * 0.21) * 0.3, 0);
        }
        break;
      }
      case 'pray': {
        const s = Math.sin(t * 0.6) * 0.04;
        this.add(NB.SPINE, 0.12 + s, 0, 0);
        this.set(NB.HEAD, 0.38, 0, 0);
        this.set(NB.ARM_L, -0.5, 0, -0.32);
        this.set(NB.ARM_R, -0.5, 0, 0.32);
        this.set(NB.FORE_L, -1.45, 0.25, 0);
        this.set(NB.FORE_R, -1.45, -0.25, 0);
        break;
      }
      case 'read': {
        const flip = Math.max(0, Math.sin(t * 0.5) * 3 - 2.6);
        this.set(NB.HEAD, 0.42, Math.sin(t * 0.7) * 0.08, 0);
        this.set(NB.ARM_L, -0.42, 0, -0.18);
        this.set(NB.ARM_R, -0.42 - flip * 0.3, 0, 0.18);
        this.set(NB.FORE_L, -1.25, 0, 0);
        this.set(NB.FORE_R, -1.25 - flip * 0.2, 0, 0);
        break;
      }
      case 'guard': {
        this.set(NB.ARM_R, -0.12, 0, -0.06);
        this.set(NB.FORE_R, -0.25, 0, 0);
        this.set(NB.ARM_L, 0.05, 0, 0.12);
        this.add(NB.HEAD, 0, Math.sin(t * 0.33) * 0.55, 0);
        this.set(NB.LEG_L, 0, 0, 0.07);
        this.set(NB.LEG_R, 0, 0, -0.07);
        break;
      }
      case 'sell': {
        const call = Math.max(0, Math.sin(t * 0.55) * 2 - 1.2);
        this.set(NB.ARM_L, -0.3 - call * 0.7, 0, 0.2 + call * 0.6);
        this.set(NB.ARM_R, -0.3 - call * 0.7, 0, -0.2 - call * 0.6);
        this.set(NB.FORE_L, -0.9 + call * 0.4, 0, 0);
        this.set(NB.FORE_R, -0.9 + call * 0.4, 0, 0);
        this.add(NB.HEAD, -call * 0.15, Math.sin(t * 0.4) * 0.45, 0);
        break;
      }
      case 'play': {
        const hop = Math.abs(Math.sin(t * 5.2));
        this.tBodyY = hop * 0.12;
        this.set(NB.ARM_L, -2.3 + Math.sin(t * 5.2) * 0.4, 0, 0.4);
        this.set(NB.ARM_R, -2.3 - Math.sin(t * 5.2) * 0.4, 0, -0.4);
        this.set(NB.LEG_L, -hop * 0.4, 0, 0.05);
        this.set(NB.LEG_R, -hop * 0.3, 0, -0.05);
        this.set(NB.SHIN_L, hop * 0.7, 0, 0);
        this.set(NB.SHIN_R, hop * 0.6, 0, 0);
        break;
      }
      case 'cower': {
        const shake = Math.sin(t * 31) * 0.03;
        this.tBodyY = -0.38 * inp.heightScale;
        this.set(NB.LEG_L, -1.25, 0, 0.15);
        this.set(NB.LEG_R, -1.25, 0, -0.15);
        this.set(NB.SHIN_L, 2.0, 0, 0);
        this.set(NB.SHIN_R, 2.0, 0, 0);
        this.add(NB.SPINE, 0.65 + shake, 0, 0);
        this.set(NB.HEAD, 0.4, 0, 0);
        this.set(NB.ARM_L, -2.4, 0, 0.55);
        this.set(NB.ARM_R, -2.4, 0, -0.55);
        this.set(NB.FORE_L, -1.9, 0, 0);
        this.set(NB.FORE_R, -1.9, 0, 0);
        break;
      }
      case 'startle': {
        this.add(NB.SPINE, -0.22, 0, 0);
        this.set(NB.HEAD, -0.15, 0, 0);
        this.set(NB.ARM_L, -1.3, 0, 0.5);
        this.set(NB.ARM_R, -1.3, 0, -0.5);
        this.set(NB.FORE_L, -1.2, 0, 0);
        this.set(NB.FORE_R, -1.2, 0, 0);
        this.tBodyY = 0.04;
        break;
      }
      case 'wave': {
        const w = Math.sin(t * 7) * 0.35;
        this.set(NB.ARM_R, -0.3, 0, -2.5);
        this.set(NB.FORE_R, -0.5 + w, 0, 0);
        break;
      }
      case 'pointUp': {
        this.set(NB.ARM_R, -2.7, 0, -0.25);
        this.set(NB.FORE_R, -0.1, 0, 0);
        this.set(NB.HEAD, -0.65, 0, 0);
        this.add(NB.SPINE, -0.1, 0, 0);
        break;
      }
      case 'knocked': {
        this.tBodyPitch = -1.45;
        this.tBodyY = 0.16;
        this.set(NB.ARM_L, -0.3, 0, 0.9);
        this.set(NB.ARM_R, -0.2, 0, -1.0);
        this.set(NB.LEG_L, -0.2, 0, 0.12);
        this.set(NB.SHIN_L, 0.5, 0, 0);
        this.set(NB.HEAD, -0.2, 0.4, 0);
        break;
      }
      case 'thrust': {
        const cyc = (t * 1.4) % 1;
        const out = cyc < 0.35 ? cyc / 0.35 : Math.max(0, 1 - (cyc - 0.35) / 0.4);
        this.set(NB.ARM_R, -1.0 - out * 0.6, 0, -0.1);
        this.set(NB.FORE_R, -1.4 + out * 1.2, 0, 0);
        this.add(NB.SPINE, 0.15 + out * 0.15, -0.35 + out * 0.3, 0);
        this.set(NB.LEG_L, -0.4, 0, 0.05);
        this.set(NB.LEG_R, 0.3, 0, -0.05);
        this.set(NB.SHIN_L, 0.3, 0, 0);
        if (this.lastCycle < 0.34 && cyc >= 0.34) this.strike = true;
        this.lastCycle = cyc;
        break;
      }
    }
  }
}
