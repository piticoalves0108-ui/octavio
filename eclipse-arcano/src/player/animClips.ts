import { B, BONES, MASKS, POSE_SIZE, R_OFFX, R_OFFY, R_OFFZ, R_PITCH, R_ROLL, createPose, type BoneName, type MaskName, type Pose } from './rig';
import type { PlayerAnim } from './Player';

/**
 * Animações de ação do mago como poses-chave esparsas (radianos).
 * Ossos não citados em nenhuma chave mantêm a pose de base (locomoção).
 * 'root' = [deslocX, deslocY, deslocZ]; 'lean' = [inclinação p/ frente, rolagem].
 * Lembrete das convenções (ver rig.ts): coluna/peito com x POSITIVO inclinam para frente;
 * membros pendentes com x NEGATIVO vão para frente; peito com y NEGATIVO avança o ombro esquerdo.
 */

type KeyPose = Partial<Record<BoneName, [number, number, number]>> & { root?: [number, number, number]; lean?: [number, number] };

export interface ClipDef {
  keys: { t: number; pose: KeyPose }[];
  mask: MaskName;
  /** Soma à pose de base em vez de substituir (reações, aterrissagem). */
  additive?: boolean;
  /** Tempo de entrada/saída da mistura (s). */
  fadeIn?: number;
  fadeOut?: number;
  /** Mantém a última pose ao terminar (morte). */
  hold?: boolean;
  /** Brilho das mãos ao longo do clipe [esquerda, direita] (pico). */
  aura?: [number, number];
  /** O corpo vira para a mira durante o clipe (conjurações e golpes). */
  faceAim?: boolean;
}

export type InternalAnim = 'takeoff' | 'mantle' | 'death';
export type AnyAnim = PlayerAnim | InternalAnim;

export const CLIP_DEFS: Record<AnyAnim, ClipDef> = {
  cast: {
    mask: 'upper',
    faceAim: true,
    aura: [1, 0.3],
    fadeIn: 0.08,
    fadeOut: 0.14,
    keys: [
      { t: 0.18, pose: { chest: [0.05, 0.25, 0], upperArmL: [-0.6, 0, 0.35], foreArmL: [-1.6, 0, 0], handL: [0.4, 0, 0] } },
      { t: 0.4, pose: { chest: [0.08, -0.4, 0], upperArmL: [-1.5, 0, 0.06], foreArmL: [-0.08, 0, 0], handL: [1.0, 0, 0], head: [0, 0.25, 0] } },
      { t: 0.7, pose: { chest: [0.05, -0.32, 0], upperArmL: [-1.45, 0, 0.08], foreArmL: [-0.12, 0, 0], handL: [0.9, 0, 0], head: [0, 0.2, 0] } },
    ],
  },
  castHeavy: {
    mask: 'full',
    faceAim: true,
    aura: [1, 1],
    fadeIn: 0.12,
    fadeOut: 0.2,
    keys: [
      {
        t: 0.36,
        pose: {
          spine: [-0.12, 0, 0],
          chest: [-0.18, 0, 0],
          head: [-0.3, 0, 0],
          upperArmR: [-2.75, 0, -0.25],
          foreArmR: [-0.5, 0, 0],
          upperArmL: [-2.5, 0, 0.45],
          foreArmL: [-0.3, 0, 0],
          handL: [0.6, 0, 0],
          thighL: [-0.15, 0, 0.05],
          thighR: [0.1, 0, -0.05],
          shinL: [0.2, 0, 0],
          shinR: [0.15, 0, 0],
          root: [0, 0.04, 0],
        },
      },
      {
        t: 0.6,
        pose: {
          spine: [0.2, 0, 0],
          chest: [0.3, 0, 0],
          head: [-0.25, 0, 0],
          upperArmR: [-1.25, 0, -0.1],
          foreArmR: [-0.35, 0, 0],
          upperArmL: [-1.45, 0, 0.1],
          foreArmL: [-0.1, 0, 0],
          handL: [1.1, 0, 0],
          thighL: [-0.75, 0, 0.05],
          shinL: [0.85, 0, 0],
          footL: [-0.1, 0, 0],
          thighR: [0.35, 0, -0.05],
          shinR: [0.55, 0, 0],
          footR: [-0.3, 0, 0],
          root: [0, -0.16, 0.06],
        },
      },
      {
        t: 0.82,
        pose: {
          spine: [0.15, 0, 0],
          chest: [0.22, 0, 0],
          head: [-0.2, 0, 0],
          upperArmR: [-1.15, 0, -0.1],
          foreArmR: [-0.4, 0, 0],
          upperArmL: [-1.35, 0, 0.12],
          foreArmL: [-0.15, 0, 0],
          handL: [1.0, 0, 0],
          thighL: [-0.65, 0, 0.05],
          shinL: [0.75, 0, 0],
          footL: [-0.1, 0, 0],
          thighR: [0.3, 0, -0.05],
          shinR: [0.5, 0, 0],
          footR: [-0.3, 0, 0],
          root: [0, -0.13, 0.05],
        },
      },
    ],
  },
  castChannel: {
    mask: 'upper',
    faceAim: true,
    aura: [1, 1],
    fadeIn: 0.15,
    fadeOut: 0.2,
    keys: [
      { t: 0.12, pose: { chest: [0.06, 0, 0], upperArmL: [-1.4, 0, 0.12], foreArmL: [-0.2, 0, 0], handL: [1.0, 0, 0], upperArmR: [-1.2, 0, -0.12], foreArmR: [-0.6, 0, 0] } },
      { t: 0.88, pose: { chest: [0.1, 0, 0], upperArmL: [-1.45, 0, 0.1], foreArmL: [-0.15, 0, 0], handL: [1.05, 0, 0], upperArmR: [-1.25, 0, -0.1], foreArmR: [-0.55, 0, 0] } },
    ],
  },
  slash1: {
    mask: 'upper',
    faceAim: true,
    fadeIn: 0.06,
    fadeOut: 0.14,
    keys: [
      { t: 0.28, pose: { spine: [0, -0.2, 0], chest: [0, -0.55, 0], upperArmR: [-1.1, 0, -1.15], foreArmR: [-0.9, 0, 0], handR: [-0.3, 0, 0], upperArmL: [-0.4, 0, 0.5], foreArmL: [-0.8, 0, 0] } },
      { t: 0.52, pose: { spine: [0.05, 0.25, 0], chest: [0.08, 0.65, 0], upperArmR: [-1.45, 0, 0.35], foreArmR: [-0.15, 0, 0], handR: [-1.0, 0, 0], upperArmL: [-0.2, 0, 0.7], foreArmL: [-0.5, 0, 0] } },
      { t: 0.72, pose: { spine: [0.05, 0.2, 0], chest: [0.06, 0.5, 0], upperArmR: [-1.2, 0, 0.3], foreArmR: [-0.3, 0, 0], handR: [-0.8, 0, 0], upperArmL: [-0.2, 0, 0.6], foreArmL: [-0.5, 0, 0] } },
    ],
  },
  slash2: {
    mask: 'upper',
    faceAim: true,
    fadeIn: 0.05,
    fadeOut: 0.14,
    keys: [
      { t: 0.28, pose: { spine: [0, 0.2, 0], chest: [0, 0.6, 0], upperArmR: [-1.0, 0, 0.55], foreArmR: [-1.3, 0, 0], handR: [-0.4, 0, 0], upperArmL: [-0.2, 0, 0.6], foreArmL: [-0.6, 0, 0] } },
      { t: 0.52, pose: { spine: [0.05, -0.25, 0], chest: [0.08, -0.7, 0], upperArmR: [-1.35, 0, -1.35], foreArmR: [-0.12, 0, 0], handR: [-1.0, 0, 0], upperArmL: [-0.5, 0, 0.4], foreArmL: [-0.9, 0, 0] } },
      { t: 0.72, pose: { spine: [0.05, -0.2, 0], chest: [0.06, -0.55, 0], upperArmR: [-1.15, 0, -1.1], foreArmR: [-0.3, 0, 0], handR: [-0.8, 0, 0], upperArmL: [-0.45, 0, 0.4], foreArmL: [-0.8, 0, 0] } },
    ],
  },
  slash3: {
    mask: 'full',
    faceAim: true,
    fadeIn: 0.08,
    fadeOut: 0.18,
    keys: [
      { t: 0.34, pose: { spine: [-0.1, 0, 0], chest: [-0.22, -0.15, 0], head: [-0.1, 0, 0], upperArmR: [-2.9, 0, -0.15], foreArmR: [-1.1, 0, 0], upperArmL: [-2.6, 0, -0.25], foreArmL: [-1.0, 0, 0], root: [0, 0.03, 0] } },
      {
        t: 0.54,
        pose: {
          spine: [0.25, 0, 0],
          chest: [0.42, 0.1, 0],
          head: [-0.3, 0, 0],
          upperArmR: [-0.85, 0, -0.1],
          foreArmR: [-0.2, 0, 0],
          handR: [-0.9, 0, 0],
          upperArmL: [-0.9, 0, -0.35],
          foreArmL: [-0.4, 0, 0],
          thighL: [-0.7, 0, 0.05],
          shinL: [0.7, 0, 0],
          thighR: [0.4, 0, -0.05],
          shinR: [0.5, 0, 0],
          footR: [-0.3, 0, 0],
          root: [0, -0.16, 0.1],
        },
      },
      {
        t: 0.78,
        pose: {
          spine: [0.2, 0, 0],
          chest: [0.35, 0.1, 0],
          head: [-0.28, 0, 0],
          upperArmR: [-0.8, 0, -0.1],
          foreArmR: [-0.25, 0, 0],
          handR: [-0.8, 0, 0],
          upperArmL: [-0.8, 0, -0.3],
          foreArmL: [-0.45, 0, 0],
          thighL: [-0.6, 0, 0.05],
          shinL: [0.6, 0, 0],
          thighR: [0.35, 0, -0.05],
          shinR: [0.45, 0, 0],
          footR: [-0.25, 0, 0],
          root: [0, -0.13, 0.08],
        },
      },
    ],
  },
  thrust: {
    mask: 'upper',
    faceAim: true,
    fadeIn: 0.06,
    fadeOut: 0.14,
    keys: [
      { t: 0.3, pose: { chest: [0, -0.45, 0], upperArmR: [-0.5, 0, -0.35], foreArmR: [-1.7, 0, 0], handR: [-1.2, 0, 0], upperArmL: [-0.7, 0, 0.2], foreArmL: [-1.0, 0, 0] } },
      { t: 0.5, pose: { spine: [0.1, 0, 0], chest: [0.2, 0.3, 0], upperArmR: [-1.55, 0, 0.05], foreArmR: [-0.05, 0, 0], handR: [-1.5, 0, 0], upperArmL: [-0.3, 0, 0.45], foreArmL: [-0.6, 0, 0] } },
      { t: 0.72, pose: { spine: [0.08, 0, 0], chest: [0.15, 0.25, 0], upperArmR: [-1.45, 0, 0.0], foreArmR: [-0.15, 0, 0], handR: [-1.4, 0, 0], upperArmL: [-0.3, 0, 0.45], foreArmL: [-0.6, 0, 0] } },
    ],
  },
  heavySlash: {
    mask: 'full',
    faceAim: true,
    fadeIn: 0.12,
    fadeOut: 0.22,
    keys: [
      {
        t: 0.42,
        pose: {
          spine: [-0.08, -0.3, 0],
          chest: [-0.2, -0.6, 0],
          upperArmR: [-2.6, 0, -0.9],
          foreArmR: [-1.2, 0, 0],
          upperArmL: [-2.2, 0, -0.5],
          foreArmL: [-1.2, 0, 0],
          thighL: [-0.2, 0, 0.1],
          thighR: [0.15, 0, -0.1],
          shinR: [0.3, 0, 0],
          root: [0, -0.04, 0],
        },
      },
      {
        t: 0.62,
        pose: {
          spine: [0.3, 0.35, 0],
          chest: [0.4, 0.75, 0],
          head: [-0.3, -0.4, 0],
          upperArmR: [-0.7, 0, 0.6],
          foreArmR: [-0.2, 0, 0],
          handR: [-1.0, 0, 0],
          upperArmL: [-0.5, 0, 0.2],
          foreArmL: [-0.8, 0, 0],
          thighL: [-0.8, 0, 0.1],
          shinL: [0.8, 0, 0],
          thighR: [0.45, 0, -0.1],
          shinR: [0.6, 0, 0],
          footR: [-0.35, 0, 0],
          root: [0, -0.2, 0.12],
        },
      },
      {
        t: 0.82,
        pose: {
          spine: [0.25, 0.3, 0],
          chest: [0.32, 0.6, 0],
          head: [-0.25, -0.35, 0],
          upperArmR: [-0.75, 0, 0.5],
          foreArmR: [-0.3, 0, 0],
          handR: [-0.9, 0, 0],
          upperArmL: [-0.5, 0, 0.25],
          foreArmL: [-0.8, 0, 0],
          thighL: [-0.7, 0, 0.1],
          shinL: [0.7, 0, 0],
          thighR: [0.4, 0, -0.1],
          shinR: [0.55, 0, 0],
          footR: [-0.3, 0, 0],
          root: [0, -0.16, 0.1],
        },
      },
    ],
  },
  staffStrike: {
    mask: 'upper',
    faceAim: true,
    fadeIn: 0.06,
    fadeOut: 0.16,
    keys: [
      { t: 0.28, pose: { spine: [0, -0.15, 0], chest: [-0.05, -0.5, 0], upperArmR: [0.45, 0, -0.35], foreArmR: [-0.4, 0, 0], handR: [0.2, 0, 0], upperArmL: [-0.6, 0, 0.3], foreArmL: [-0.9, 0, 0] } },
      { t: 0.5, pose: { spine: [0.08, 0.15, 0], chest: [0.15, 0.4, 0], upperArmR: [-2.3, 0, -0.1], foreArmR: [-0.5, 0, 0], handR: [-1.1, 0, 0], upperArmL: [-0.3, 0, 0.5], foreArmL: [-0.6, 0, 0] } },
      { t: 0.72, pose: { spine: [0.06, 0.1, 0], chest: [0.12, 0.3, 0], upperArmR: [-2.1, 0, -0.1], foreArmR: [-0.6, 0, 0], handR: [-1.0, 0, 0], upperArmL: [-0.3, 0, 0.5], foreArmL: [-0.6, 0, 0] } },
    ],
  },
  block: {
    mask: 'upper',
    faceAim: true,
    fadeIn: 0.08,
    fadeOut: 0.15,
    keys: [
      {
        t: 0.2,
        pose: {
          spine: [0.08, 0, 0],
          chest: [0.12, 0, 0],
          head: [-0.1, 0, 0],
          upperArmR: [-0.95, 0, 0.3],
          foreArmR: [-1.3, 0, 0],
          handR: [0, 1.35, 0],
          upperArmL: [-0.95, 0, -0.3],
          foreArmL: [-1.25, 0, 0],
          handL: [0, -0.5, 0],
        },
      },
      {
        t: 0.85,
        pose: {
          spine: [0.08, 0, 0],
          chest: [0.12, 0, 0],
          head: [-0.1, 0, 0],
          upperArmR: [-0.95, 0, 0.3],
          foreArmR: [-1.3, 0, 0],
          handR: [0, 1.35, 0],
          upperArmL: [-0.95, 0, -0.3],
          foreArmL: [-1.25, 0, 0],
          handL: [0, -0.5, 0],
        },
      },
    ],
  },
  hit: {
    mask: 'full',
    additive: true,
    fadeIn: 0.03,
    fadeOut: 0.2,
    keys: [
      { t: 0.25, pose: { spine: [-0.15, 0, 0.05], chest: [-0.3, 0.1, 0], head: [-0.35, 0, 0], upperArmL: [0, 0, 0.45], upperArmR: [0, 0, -0.4], lean: [-0.12, 0.04] } },
      { t: 0.6, pose: { spine: [-0.06, 0, 0], chest: [-0.1, 0.05, 0], head: [-0.12, 0, 0], upperArmL: [0, 0, 0.15], upperArmR: [0, 0, -0.12], lean: [-0.04, 0] } },
    ],
  },
  dodge: {
    mask: 'full',
    additive: true,
    fadeIn: 0.04,
    fadeOut: 0.15,
    keys: [
      { t: 0.3, pose: { spine: [0.25, 0, 0], chest: [0.25, 0, 0], head: [-0.3, 0, 0], upperArmL: [0.6, 0, 0.3], upperArmR: [0.6, 0, -0.3], thighL: [-0.5, 0, 0], shinL: [0.8, 0, 0], thighR: [0.3, 0, 0], shinR: [0.6, 0, 0], root: [0, -0.22, 0] } },
      { t: 0.75, pose: { spine: [0.1, 0, 0], chest: [0.1, 0, 0], head: [-0.1, 0, 0], thighL: [-0.25, 0, 0], shinL: [0.4, 0, 0], thighR: [0.1, 0, 0], shinR: [0.3, 0, 0], root: [0, -0.1, 0] } },
    ],
  },
  land: {
    mask: 'full',
    additive: true,
    fadeIn: 0.02,
    fadeOut: 0.22,
    keys: [
      { t: 0.18, pose: { spine: [0.2, 0, 0], chest: [0.22, 0, 0], head: [-0.25, 0, 0], thighL: [-0.75, 0, 0.06], shinL: [1.25, 0, 0], footL: [-0.5, 0, 0], thighR: [-0.75, 0, -0.06], shinR: [1.25, 0, 0], footR: [-0.5, 0, 0], upperArmL: [-0.3, 0, 0.35], upperArmR: [-0.3, 0, -0.35], root: [0, -0.3, 0] } },
      { t: 0.6, pose: { spine: [0.08, 0, 0], chest: [0.08, 0, 0], thighL: [-0.3, 0, 0], shinL: [0.5, 0, 0], footL: [-0.2, 0, 0], thighR: [-0.3, 0, 0], shinR: [0.5, 0, 0], footR: [-0.2, 0, 0], root: [0, -0.1, 0] } },
    ],
  },
  ascend: {
    mask: 'full',
    aura: [1, 1],
    fadeIn: 0.15,
    fadeOut: 0.25,
    keys: [
      { t: 0.25, pose: { spine: [0.2, 0, 0], chest: [0.3, 0, 0], head: [0.35, 0, 0], upperArmL: [-1.0, 0, -0.55], foreArmL: [-1.9, 0, 0], upperArmR: [-1.0, 0, 0.55], foreArmR: [-1.9, 0, 0], thighL: [-0.55, 0, 0], shinL: [1.0, 0, 0], thighR: [-0.55, 0, 0], shinR: [1.0, 0, 0], root: [0, -0.22, 0] } },
      { t: 0.55, pose: { spine: [-0.15, 0, 0], chest: [-0.3, 0, 0], head: [-0.45, 0, 0], upperArmL: [-0.5, 0, 1.9], foreArmL: [-0.2, 0, 0], handL: [0.6, 0, 0], upperArmR: [-0.5, 0, -1.9], foreArmR: [-0.3, 0, 0], thighL: [-0.1, 0, 0.08], shinL: [0.3, 0, 0], thighR: [0.05, 0, -0.08], shinR: [0.4, 0, 0], footL: [0.4, 0, 0], footR: [0.4, 0, 0], root: [0, 0.35, 0] } },
      { t: 0.88, pose: { spine: [-0.1, 0, 0], chest: [-0.2, 0, 0], head: [-0.3, 0, 0], upperArmL: [-0.4, 0, 1.7], foreArmL: [-0.2, 0, 0], handL: [0.5, 0, 0], upperArmR: [-0.4, 0, -1.7], foreArmR: [-0.3, 0, 0], thighL: [-0.1, 0, 0.08], shinL: [0.3, 0, 0], thighR: [0.05, 0, -0.08], shinR: [0.4, 0, 0], footL: [0.4, 0, 0], footR: [0.4, 0, 0], root: [0, 0.3, 0] } },
    ],
  },
  interact: {
    mask: 'upper',
    aura: [0.4, 0],
    fadeIn: 0.1,
    fadeOut: 0.18,
    keys: [
      { t: 0.45, pose: { spine: [0.12, 0, 0], chest: [0.18, -0.2, 0], head: [0.2, 0, 0], upperArmL: [-1.1, 0, 0.05], foreArmL: [-0.35, 0, 0], handL: [0.3, 0, 0] } },
      { t: 0.7, pose: { spine: [0.1, 0, 0], chest: [0.15, -0.15, 0], head: [0.15, 0, 0], upperArmL: [-0.9, 0, 0.1], foreArmL: [-0.6, 0, 0], handL: [0.2, 0, 0] } },
    ],
  },
  drink: {
    mask: 'upper',
    fadeIn: 0.12,
    fadeOut: 0.2,
    keys: [
      { t: 0.3, pose: { upperArmL: [-0.65, 0, -0.32], foreArmL: [-2.25, 0, 0], handL: [0.2, 0, 0], head: [0, 0, 0] } },
      { t: 0.5, pose: { upperArmL: [-0.8, 0, -0.3], foreArmL: [-2.35, 0, 0], handL: [0.5, 0, 0], head: [-0.38, 0, 0], neck: [-0.1, 0, 0] } },
      { t: 0.75, pose: { upperArmL: [-0.8, 0, -0.3], foreArmL: [-2.3, 0, 0], handL: [0.5, 0, 0], head: [-0.35, 0, 0], neck: [-0.1, 0, 0] } },
    ],
  },
  takeoff: {
    mask: 'full',
    fadeIn: 0.05,
    fadeOut: 0.2,
    aura: [0.6, 0.6],
    keys: [
      { t: 0.3, pose: { spine: [0.25, 0, 0], chest: [0.25, 0, 0], head: [-0.2, 0, 0], thighL: [-0.85, 0, 0.08], shinL: [1.45, 0, 0], footL: [-0.6, 0, 0], thighR: [-0.85, 0, -0.08], shinR: [1.45, 0, 0], footR: [-0.6, 0, 0], upperArmL: [0.55, 0, 0.3], upperArmR: [0.55, 0, -0.3], root: [0, -0.32, 0] } },
      { t: 0.65, pose: { spine: [-0.1, 0, 0], chest: [-0.15, 0, 0], head: [-0.3, 0, 0], thighL: [0.05, 0, 0.04], shinL: [0.1, 0, 0], footL: [0.5, 0, 0], thighR: [0.1, 0, -0.04], shinR: [0.15, 0, 0], footR: [0.5, 0, 0], upperArmL: [-0.6, 0, 1.3], foreArmL: [-0.2, 0, 0], upperArmR: [-0.6, 0, -1.2], foreArmR: [-0.5, 0, 0], root: [0, 0.05, 0] } },
    ],
  },
  mantle: {
    mask: 'full',
    fadeIn: 0.05,
    fadeOut: 0.15,
    keys: [
      { t: 0.3, pose: { spine: [0.35, 0, 0], chest: [0.3, 0, 0], upperArmL: [-0.5, 0, 0.25], foreArmL: [-1.3, 0, 0], upperArmR: [-0.5, 0, -0.25], foreArmR: [-1.3, 0, 0], thighL: [-1.3, 0, 0], shinL: [1.6, 0, 0], thighR: [-0.9, 0, 0], shinR: [1.3, 0, 0], lean: [0.35, 0], root: [0, -0.25, 0] } },
      { t: 0.75, pose: { spine: [0.15, 0, 0], chest: [0.1, 0, 0], upperArmL: [0.2, 0, 0.2], foreArmL: [-0.4, 0, 0], upperArmR: [0.2, 0, -0.2], foreArmR: [-0.4, 0, 0], thighL: [-0.6, 0, 0], shinL: [0.9, 0, 0], thighR: [-0.2, 0, 0], shinR: [0.4, 0, 0], lean: [0.15, 0], root: [0, -0.1, 0] } },
    ],
  },
  death: {
    mask: 'full',
    hold: true,
    fadeIn: 0.08,
    fadeOut: 0.01,
    keys: [
      { t: 0.18, pose: { spine: [0.3, 0, 0], chest: [0.3, 0.1, 0], head: [0.4, 0, 0], thighL: [-0.6, 0, 0.1], shinL: [1.2, 0, 0], thighR: [-0.5, 0, -0.1], shinR: [1.1, 0, 0], upperArmL: [0, 0, 0.3], upperArmR: [0, 0, -0.3], foreArmL: [-0.4, 0, 0], foreArmR: [-0.6, 0, 0], root: [0, -0.3, 0] } },
      { t: 0.5, pose: { spine: [-0.1, 0, 0.1], chest: [-0.2, 0.2, 0], head: [-0.3, 0.3, 0], thighL: [-0.7, 0, 0.15], shinL: [0.9, 0, 0], thighR: [-0.4, 0, -0.1], shinR: [0.7, 0, 0], upperArmL: [-0.4, 0, 0.9], upperArmR: [-0.5, 0, -0.8], foreArmL: [-0.3, 0, 0], foreArmR: [-0.4, 0, 0], lean: [-0.8, 0.1], root: [0, -0.55, -0.1] } },
      { t: 1.0, pose: { spine: [-0.05, 0, 0.05], chest: [-0.05, 0.15, 0], head: [-0.15, 0.6, 0], thighL: [-0.25, 0, 0.18], shinL: [0.35, 0, 0], thighR: [-0.05, 0, -0.12], shinR: [0.15, 0, 0], footL: [0.6, 0, 0], footR: [0.7, 0, 0], upperArmL: [-0.2, 0, 1.25], upperArmR: [-0.3, 0, -1.1], foreArmL: [-0.2, 0, 0], foreArmR: [-0.5, 0, 0], lean: [-1.5, 0.08], root: [0, -0.78, -0.2] } },
    ],
  },
};

/** Clipe compilado: poses-chave densas + máscara efetiva por canal. */
export interface CompiledClip {
  name: AnyAnim;
  def: ClipDef;
  times: Float32Array;
  poses: Pose[];
  /** Máscara efetiva (máscara do clipe ∩ canais citados nas chaves). */
  mask: Float32Array;
}

function compile(name: AnyAnim, def: ClipDef): CompiledClip {
  const used = new Float32Array(POSE_SIZE);
  const poses: Pose[] = [];
  for (const k of def.keys) {
    const p = createPose();
    for (const [bn, v] of Object.entries(k.pose)) {
      if (bn === 'root') {
        const r = v as [number, number, number];
        p[R_OFFX] = r[0];
        p[R_OFFY] = r[1];
        p[R_OFFZ] = r[2];
        used[R_OFFX] = used[R_OFFY] = used[R_OFFZ] = 1;
      } else if (bn === 'lean') {
        const r = v as [number, number];
        p[R_PITCH] = r[0];
        p[R_ROLL] = r[1];
        used[R_PITCH] = used[R_ROLL] = 1;
      } else {
        const bi = B[bn as BoneName];
        if (bi === undefined) throw new Error(`osso desconhecido no clipe ${name}: ${bn}`);
        const r = v as [number, number, number];
        p[bi * 3] = r[0];
        p[bi * 3 + 1] = r[1];
        p[bi * 3 + 2] = r[2];
        used[bi * 3] = used[bi * 3 + 1] = used[bi * 3 + 2] = 1;
      }
    }
    poses.push(p);
  }
  const base = MASKS[def.mask];
  const mask = new Float32Array(POSE_SIZE);
  for (let i = 0; i < POSE_SIZE; i++) mask[i] = base[i] > 0 && used[i] ? (def.additive ? 1 : base[i]) : 0;
  return { name, def, times: new Float32Array(def.keys.map((k) => k.t)), poses, mask };
}

export const CLIPS = Object.fromEntries((Object.keys(CLIP_DEFS) as AnyAnim[]).map((n) => [n, compile(n, CLIP_DEFS[n])])) as Record<AnyAnim, CompiledClip>;

/** Amostra um clipe no tempo normalizado u (0..1) em `out` (interpolação suave entre chaves). */
export function sampleClip(clip: CompiledClip, u: number, out: Pose): Pose {
  const t = clip.times;
  const n = t.length;
  if (u <= t[0] || n === 1) {
    out.set(clip.poses[0]);
    return out;
  }
  if (u >= t[n - 1]) {
    out.set(clip.poses[n - 1]);
    return out;
  }
  let k = 0;
  while (k < n - 2 && u > t[k + 1]) k++;
  let w = (u - t[k]) / (t[k + 1] - t[k]);
  w = w * w * (3 - 2 * w);
  const a = clip.poses[k];
  const b = clip.poses[k + 1];
  for (let i = 0; i < POSE_SIZE; i++) out[i] = a[i] + (b[i] - a[i]) * w;
  return out;
}

/** Usado em testes: todos os ossos citados existem. */
export const ALL_BONES = BONES;
