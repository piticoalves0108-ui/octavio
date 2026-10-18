import * as THREE from 'three';
import { cachedGeometry, type PartBuilder } from './parts';
import { disposeMergedRig, mergeRigMeshes } from './merged';
import { HUMANOID_LOOKS, COLORS, type BuildId, type HumanoidLook } from './looks';
import type { RigMaterial } from './material';
import { easeIn, easeInOut, easeOut, type AnimInput, type ExtraAnim, type Rig } from './anim';

/**
 * Rig humanoide hierárquico (também usado por constructos, golem e o Guardião):
 * quadril → tronco → cabeça/braços(antebraço+arma)/pernas(canela+pé).
 * Uma malha por osso (primitivas fundidas, geometria em cache por variante).
 * Animação procedural: braços apontados por direção (IK simples) + flexão do cotovelo,
 * poses-chave de ataque (antecipação → impacto → recuperação), ciclo de passada, esquiva,
 * reação a dano, atordoamento, morte e rendição (ajoelhada).
 */
export const HB = { HIPS: 0, SPINE: 1, HEAD: 2, ARM_L: 3, FORE_L: 4, ARM_R: 5, FORE_R: 6, LEG_L: 7, SHIN_L: 8, LEG_R: 9, SHIN_R: 10 } as const;
const BONE_NAMES = ['hips', 'spine', 'head', 'armL', 'foreL', 'armR', 'foreR', 'legL', 'shinL', 'legR', 'shinR'];

interface Build {
  hipY: number;
  pelvisW: number;
  thigh: number;
  shin: number;
  legX: number;
  legR: number;
  spineY: number;
  chestH: number;
  chestW: number;
  chestD: number;
  waistW: number;
  shoulderX: number;
  shoulderY: number;
  upper: number;
  fore: number;
  armR: number;
  headY: number;
  headR: number;
}

export const BUILDS: Record<BuildId, Build> = {
  normal: { hipY: 0.92, pelvisW: 0.32, thigh: 0.44, shin: 0.44, legX: 0.1, legR: 0.07, spineY: 0.06, chestH: 0.52, chestW: 0.38, chestD: 0.22, waistW: 0.3, shoulderX: 0.22, shoulderY: 0.47, upper: 0.29, fore: 0.27, armR: 0.052, headY: 0.56, headR: 0.115 },
  slim: { hipY: 0.92, pelvisW: 0.29, thigh: 0.45, shin: 0.44, legX: 0.09, legR: 0.062, spineY: 0.06, chestH: 0.5, chestW: 0.33, chestD: 0.2, waistW: 0.26, shoulderX: 0.2, shoulderY: 0.46, upper: 0.29, fore: 0.27, armR: 0.045, headY: 0.54, headR: 0.11 },
  heavy: { hipY: 1.0, pelvisW: 0.5, thigh: 0.48, shin: 0.5, legX: 0.17, legR: 0.12, spineY: 0.08, chestH: 0.64, chestW: 0.7, chestD: 0.46, waistW: 0.4, shoulderX: 0.45, shoulderY: 0.54, upper: 0.38, fore: 0.42, armR: 0.11, headY: 0.66, headR: 0.15 },
  golem: { hipY: 0.95, pelvisW: 0.62, thigh: 0.42, shin: 0.5, legX: 0.25, legR: 0.19, spineY: 0.1, chestH: 0.76, chestW: 0.98, chestD: 0.62, waistW: 0.56, shoulderX: 0.62, shoulderY: 0.62, upper: 0.46, fore: 0.56, armR: 0.18, headY: 0.74, headR: 0.18 },
  colossus: { hipY: 2.5, pelvisW: 1.4, thigh: 1.2, shin: 1.3, legX: 0.62, legR: 0.4, spineY: 0.22, chestH: 1.9, chestW: 2.6, chestD: 1.5, waistW: 1.3, shoulderX: 1.6, shoulderY: 1.62, upper: 1.35, fore: 1.6, armR: 0.38, headY: 2.0, headR: 0.42 },
};

// ---------------------------------------------------------------------------
// Geometria por osso
// ---------------------------------------------------------------------------
function buildBone(look: HumanoidLook, B: Build, bone: number, b: PartBuilder) {
  const metal = !!look.metal;
  const stone = !!look.stone;
  const sleeves = look.sleeves ?? look.torso;
  const s = B.chestW / 0.38; // fator de escala aproximado do corpo
  switch (bone) {
    case HB.HIPS: {
      b.box(B.pelvisW, B.chestH * 0.32, B.chestD * 0.95, look.legs, { y: -0.02 * s });
      b.box(B.pelvisW + 0.02 * s, 0.06 * s, B.chestD + 0.02 * s, look.trim, { y: B.chestH * 0.14 });
      if (look.robe !== undefined) b.cyl(B.pelvisW * 0.62, B.pelvisW * 1.05, B.hipY * 0.85, look.robe, { y: -B.hipY * 0.4 }, 10);
      if (look.sash !== undefined) b.box(0.08 * s, 0.32 * s, 0.03 * s, look.sash, { x: B.pelvisW * 0.3, y: -0.12 * s, z: B.chestD * 0.5 });
      if (stone) b.box(B.pelvisW * 0.8, 0.12 * s, B.chestD * 0.7, look.trim, { y: B.chestH * 0.18, rx: 0.1 });
      break;
    }
    case HB.SPINE: {
      const cy = B.chestH * 0.58;
      b.box(B.waistW, B.chestH * 0.38, B.chestD * 0.85, look.torso, { y: B.chestH * 0.2 });
      if (look.build === 'heavy' || look.build === 'colossus') {
        b.box(B.chestW, B.chestH * 0.62, B.chestD, look.torso, { y: cy });
        b.box(B.chestW * 0.8, B.chestH * 0.3, B.chestD * 0.3, look.trim, { y: cy, z: B.chestD * 0.5 });
      } else if (stone) {
        b.box(B.chestW, B.chestH * 0.66, B.chestD, look.torso, { y: cy, rz: 0.04 });
        b.box(B.chestW * 0.5, B.chestH * 0.35, B.chestD * 0.4, look.trim, { x: -B.chestW * 0.2, y: cy + B.chestH * 0.2, z: B.chestD * 0.4, ry: 0.3 });
        b.box(B.chestW * 0.4, B.chestH * 0.3, B.chestD * 0.35, look.skin, { x: B.chestW * 0.28, y: cy - B.chestH * 0.1, z: B.chestD * 0.42, ry: -0.2 });
      } else {
        b.cyl(B.chestW * 0.5, B.waistW * 0.55, B.chestH * 0.62, look.torso, { y: cy, sz: B.chestD / B.chestW }, 10);
        b.box(B.chestW * 0.9, 0.05 * s, B.chestD * 1.02, look.trim, { y: B.chestH * 0.32 });
      }
      // gola/colar
      b.cyl(B.chestW * 0.22, B.chestW * 0.3, 0.08 * s, look.trim, { y: B.chestH * 0.9 });
      if (look.hood !== undefined && look.head !== 'hood') b.cyl(B.chestW * 0.34, B.chestW * 0.42, 0.12 * s, look.hood, { y: B.chestH * 0.86 });
      if (look.cape !== undefined) b.box(B.chestW * 0.95, B.chestH * 1.6, 0.03 * s, look.cape, { y: B.chestH * 0.1, z: -B.chestD * 0.55, rx: 0.08 });
      if (look.pauldrons !== undefined) {
        const r = metal ? B.armR * 2.3 : B.armR * 2;
        b.sphere(r, look.pauldrons, { x: B.shoulderX, y: B.shoulderY + 0.02 * s, sy: 0.75 }, 8, 6);
        b.sphere(r, look.pauldrons, { x: -B.shoulderX, y: B.shoulderY + 0.02 * s, sy: 0.75 }, 8, 6);
      }
      if (look.feathers !== undefined) {
        for (let i = 0; i < 4; i++) {
          b.cone(0.04 * s, 0.26 * s, look.feathers, { x: B.shoulderX + 0.02 * s, y: B.shoulderY - 0.02 * s - i * 0.03 * s, z: -0.04 * s + i * 0.03 * s, rz: -1.9 - i * 0.12 }, 4);
          b.cone(0.04 * s, 0.26 * s, look.feathers, { x: -B.shoulderX - 0.02 * s, y: B.shoulderY - 0.02 * s - i * 0.03 * s, z: -0.04 * s + i * 0.03 * s, rz: 1.9 + i * 0.12 }, 4);
        }
      }
      if (look.quiver) {
        b.cyl(0.06 * s, 0.05 * s, 0.55 * s, COLORS.WOOD, { x: -0.08 * s, y: cy, z: -B.chestD * 0.6, rz: 0.4 }, 6);
        for (let i = 0; i < 3; i++) b.box(0.012, 0.16 * s, 0.012, 0xd8d0c0, { x: -0.18 * s + i * 0.025, y: cy + 0.32 * s, z: -B.chestD * 0.6, rz: 0.4 });
      }
      if (look.sash !== undefined) b.box(B.chestW * 0.18, B.chestH * 0.8, 0.03 * s, look.sash, { x: 0, y: cy - 0.02 * s, z: B.chestD * 0.5 + 0.01, rz: 0.6 });
      if (look.runes !== undefined) {
        b.box(B.chestW * 0.5, 0.02 * s, 0.01, look.runes, { y: cy + B.chestH * 0.12, z: B.chestD * 0.51, glow: 1.4 });
        b.box(0.02 * s, B.chestH * 0.35, 0.01, look.runes, { y: cy, z: B.chestD * 0.51, glow: 1.4 });
      }
      if (look.core !== undefined) {
        // núcleo nas costas (ponto fraco)
        b.box(B.chestW * 0.5, B.chestH * 0.42, 0.05 * s, look.trim, { y: cy, z: -B.chestD * 0.5 - 0.02 * s });
        b.sphere(B.chestW * 0.15, look.core, { y: cy, z: -B.chestD * 0.5 - 0.05 * s, sz: 0.6, glow: 2.2 }, 10, 8);
        b.torus(B.chestW * 0.19, 0.018 * s, look.trim, { y: cy, z: -B.chestD * 0.5 - 0.06 * s });
      }
      if (look.crystals !== undefined) {
        b.gem(0.16 * s, look.crystals, { x: -B.chestW * 0.25, y: B.chestH * 0.95, z: -B.chestD * 0.3, sy: 2.2, rz: 0.4, glow: 1.6 });
        b.gem(0.12 * s, look.crystals, { x: B.chestW * 0.2, y: B.chestH * 0.98, z: -B.chestD * 0.2, sy: 2, rz: -0.5, glow: 1.6 });
        b.gem(0.14 * s, look.crystals, { x: 0, y: B.chestH * 0.6, z: -B.chestD * 0.55, sy: 1.8, rx: -0.8, glow: 1.6 });
      }
      break;
    }
    case HB.HEAD: {
      const r = B.headR;
      b.cyl(r * 0.45, r * 0.55, r * 0.6, look.skin, { y: r * 0.1 });
      switch (look.head) {
        case 'crow':
          b.sphere(r, look.skin, { y: r * 1.05 }, 10, 8);
          b.sphere(r * 1.18, look.hood ?? 0x222222, { y: r * 1.12, z: -r * 0.12, sz: 1.05 }, 10, 8);
          b.cone(r * 0.32, r * 1.3, 0x18161a, { y: r * 0.95, z: r * 1.35, rx: Math.PI / 2 }, 6);
          b.box(r * 1.5, r * 0.25, r * 0.4, 0x18161a, { y: r * 1.2, z: r * 0.7 });
          b.sphere(r * 0.12, 0xffd080, { x: r * 0.35, y: r * 1.22, z: r * 0.92, glow: 0.6 }, 5, 4);
          b.sphere(r * 0.12, 0xffd080, { x: -r * 0.35, y: r * 1.22, z: r * 0.92, glow: 0.6 }, 5, 4);
          break;
        case 'visor':
          b.cyl(r * 1.02, r * 1.08, r * 2.1, look.torso, { y: r * 1.1 }, 10);
          b.sphere(r * 1.02, look.torso, { y: r * 2.1, sy: 0.5 }, 10, 6);
          b.box(r * 1.4, r * 0.14, 0.02, look.eyes ?? 0x60e8ff, { y: r * 1.35, z: r * 1.02, glow: 2.2 });
          b.box(r * 0.12, r * 0.9, r * 1.6, look.trim, { y: r * 2.35 });
          break;
        case 'hood':
          b.sphere(r * 0.95, look.skin, { y: r * 1.05 }, 10, 8);
          b.cone(r * 1.35, r * 2.6, look.hood ?? look.torso, { y: r * 1.55, z: -r * 0.25, rx: -0.25 }, 10);
          b.box(r * 1.3, r * 1.1, r * 0.2, 0x0a080c, { y: r * 1.0, z: r * 0.85 });
          if (look.eyes !== undefined) {
            b.sphere(r * 0.13, look.eyes, { x: r * 0.3, y: r * 1.15, z: r * 0.95, glow: 2.5 }, 5, 4);
            b.sphere(r * 0.13, look.eyes, { x: -r * 0.3, y: r * 1.15, z: r * 0.95, glow: 2.5 }, 5, 4);
          }
          break;
        case 'hat':
          b.sphere(r, look.skin, { y: r * 1.05 }, 10, 8);
          b.cyl(r * 2.1, r * 2.1, r * 0.12, look.trim, { y: r * 1.75 }, 12);
          b.cyl(r * 0.8, r * 1.0, r * 0.9, look.trim, { y: r * 2.2 }, 10);
          b.box(r * 1.6, r * 0.3, r * 0.3, 0x3a2a1a, { y: r * 0.55, z: r * 0.75 });
          break;
        case 'hair':
          b.sphere(r, look.skin, { y: r * 1.05 }, 10, 8);
          b.sphere(r * 1.1, 0x141216, { y: r * 1.2, z: -r * 0.15, sy: 1.05 }, 10, 8);
          b.cone(r * 0.35, r * 1.8, 0x141216, { y: r * 0.6, z: -r * 1.15, rx: 2.6 }, 6);
          b.box(r * 1.5, r * 0.32, r * 0.4, 0x1a1a1e, { y: r * 1.12, z: r * 0.7 });
          b.box(r * 0.18, r * 0.08, 0.01, 0xd03040, { x: r * 0.35, y: r * 1.15, z: r * 0.92, glow: 0.4 });
          b.box(r * 0.18, r * 0.08, 0.01, 0xd03040, { x: -r * 0.35, y: r * 1.15, z: r * 0.92, glow: 0.4 });
          break;
        case 'construct':
          b.box(r * 2.1, r * 1.7, r * 1.9, look.torso, { y: r * 1.0 });
          b.box(r * 2.3, r * 0.35, r * 2.1, look.trim, { y: r * 1.9 });
          b.cyl(r * 0.36, r * 0.36, r * 0.3, look.eyes ?? 0x5fe8ff, { y: r * 1.1, z: r * 0.95, rx: Math.PI / 2, glow: 2.6 }, 10);
          b.box(r * 0.25, r * 0.9, r * 0.25, look.trim, { x: r * 1.15, y: r * 1.0 });
          b.box(r * 0.25, r * 0.9, r * 0.25, look.trim, { x: -r * 1.15, y: r * 1.0 });
          break;
        case 'stone':
          b.box(r * 2.0, r * 1.6, r * 1.8, look.skin, { y: r * 0.9, rx: 0.08, ry: 0.06 });
          b.box(r * 1.6, r * 0.5, r * 1.5, look.trim, { y: r * 1.85, rz: 0.1 });
          b.box(r * 0.35, r * 0.18, 0.05, look.eyes ?? 0x7ff0ff, { x: r * 0.45, y: r * 1.0, z: r * 0.92, glow: 2.4 });
          b.box(r * 0.35, r * 0.18, 0.05, look.eyes ?? 0x7ff0ff, { x: -r * 0.45, y: r * 1.0, z: r * 0.92, glow: 2.4 });
          break;
        case 'guardian':
          b.box(r * 2.4, r * 1.9, r * 2.2, look.torso, { y: r * 1.0 });
          b.cone(r * 1.5, r * 1.2, look.trim, { y: r * 2.4 }, 4);
          b.box(r * 0.3, r * 1.8, r * 2.4, look.pauldrons ?? look.trim, { y: r * 2.2 });
          b.box(r * 1.8, r * 0.22, 0.05, look.eyes ?? 0x6ff6ff, { y: r * 1.15, z: r * 1.12, glow: 2.8 });
          b.box(r * 0.2, r * 0.7, 0.05, look.eyes ?? 0x6ff6ff, { y: r * 0.7, z: r * 1.12, glow: 1.8 });
          break;
      }
      break;
    }
    case HB.ARM_L:
    case HB.ARM_R: {
      b.limb(0, 0, 0, 0, -B.upper, 0, B.armR * 1.1, B.armR, metal || stone ? look.torso : sleeves, 0, 7);
      b.sphere(B.armR * 1.15, metal || stone ? look.trim : sleeves, {}, 7, 5);
      if (look.runes !== undefined && metal) b.box(0.012, B.upper * 0.6, 0.012, look.runes, { z: B.armR * 1.02, y: -B.upper * 0.5, glow: 1.4 });
      if (stone && look.crystals !== undefined && bone === HB.ARM_R) b.gem(B.armR * 0.9, look.crystals, { x: -B.armR * 0.7, y: -B.upper * 0.3, sy: 1.8, rz: 0.6, glow: 1.5 });
      break;
    }
    case HB.FORE_L:
    case HB.FORE_R: {
      const right = bone === HB.FORE_R;
      const hand = right ? look.right : look.left;
      const f = B.fore;
      b.limb(0, 0, 0, 0, -f, 0, B.armR, B.armR * 0.85, metal || stone ? look.torso : look.skin, 0, 7);
      if (!metal && !stone) b.cyl(B.armR * 1.15, B.armR * 1.05, f * 0.45, look.trim, { y: -f * 0.6 }, 7); // bracelete/luva
      buildHand(b, look, B, hand, right, f);
      break;
    }
    case HB.LEG_L:
    case HB.LEG_R:
      b.limb(0, 0, 0, 0, -B.thigh, 0, B.legR * 1.2, B.legR, look.legs, 0, 7);
      if (look.robe !== undefined) b.cyl(B.legR * 1.6, B.legR * 1.9, B.thigh, look.robe, { y: -B.thigh * 0.5 }, 7);
      break;
    case HB.SHIN_L:
    case HB.SHIN_R:
      b.limb(0, 0, 0, 0, -B.shin, 0, B.legR, B.legR * 0.85, look.boots, 0, 7);
      b.box(B.legR * 2.1, B.legR * 1.1, B.legR * 3.6, look.boots, { y: -B.shin + B.legR * 0.35, z: B.legR * 0.9 });
      if (metal) b.sphere(B.legR * 1.3, look.trim, { y: 0, sz: 1.2 }, 7, 5);
      break;
  }
}

function buildHand(b: PartBuilder, look: HumanoidLook, B: Build, hand: string, right: boolean, f: number) {
  const s = B.chestW / 0.38;
  const hy = -f;
  const side = right ? -1 : 1;
  switch (hand) {
    case 'sword':
      b.sphere(B.armR * 1.1, look.trim, { y: hy }, 6, 5);
      b.box(0.022, 0.022, 0.14, COLORS.WOOD, { y: hy, z: 0.02 });
      b.box(0.2, 0.03, 0.035, 0x6a6e76, { y: hy, z: 0.1 });
      b.box(0.055, 0.012, 0.66, COLORS.IRON, { y: hy, z: 0.45 });
      break;
    case 'longsword':
      b.sphere(B.armR * 1.15, look.trim, { y: hy }, 6, 5);
      b.box(0.028, 0.028, 0.22, 0x30343c, { y: hy, z: 0.0 });
      b.box(0.28, 0.035, 0.045, look.trim, { y: hy, z: 0.12 });
      b.box(0.07, 0.014, 1.05, 0xc0c6d0, { y: hy, z: 0.68 });
      if (look.runes !== undefined) b.box(0.016, 0.016, 0.8, look.runes, { y: hy, z: 0.68, glow: 1.8 });
      break;
    case 'dagger':
      b.sphere(B.armR * 1.1, look.trim, { y: hy }, 6, 5);
      b.box(0.1, 0.02, 0.03, 0x6a6e76, { y: hy, z: 0.06 });
      b.box(0.04, 0.01, 0.3, COLORS.IRON, { y: hy, z: 0.22 });
      if (look.runes !== undefined) b.box(0.012, 0.012, 0.24, look.runes, { y: hy, z: 0.22, glow: 1.4 });
      break;
    case 'blade':
      b.sphere(B.armR * 1.1, look.trim, { y: hy }, 6, 5);
      b.box(0.12, 0.02, 0.03, 0x8a2228, { y: hy, z: 0.06 });
      b.box(0.045, 0.01, 0.34, 0xc8ccd4, { y: hy, z: 0.24 });
      b.box(0.04, 0.01, 0.3, 0xc8ccd4, { y: hy + 0.04, z: 0.52, rx: -0.3 });
      break;
    case 'staff':
      b.sphere(B.armR * 1.1, look.skin, { y: hy }, 6, 5);
      b.cyl(0.022, 0.026, 1.7, 0x2a1a22, { y: hy, z: 0.35, rx: Math.PI / 2 }, 6);
      b.sphere(0.075, look.runes ?? 0xb030ff, { y: hy, z: 1.22, glow: 2.6 }, 8, 6);
      b.torus(0.09, 0.012, 0x1a0e22, { y: hy, z: 1.22 });
      break;
    case 'shield':
      b.sphere(B.armR * 1.1, look.trim, { y: hy }, 6, 5);
      b.cyl(0.3, 0.3, 0.04, COLORS.WOOD, { y: hy - 0.03, x: side * -0.02 }, 12);
      b.torus(0.3, 0.018, 0x5a5e66, { y: hy - 0.03, rx: Math.PI / 2 }, 14);
      b.sphere(0.06, 0x8a8e96, { y: hy - 0.07, sy: 0.6 }, 6, 4);
      b.box(0.5, 0.045, 0.06, 0x7a1f1f, { y: hy - 0.055 });
      break;
    case 'bow': {
      b.sphere(B.armR * 1.1, look.trim, { y: hy }, 6, 5);
      // arco no plano local Y/Z (vertical quando o braço está esticado à frente)
      b.box(0.03, 0.04, 0.42, COLORS.WOOD, { y: hy + 0.05, z: 0.22, rx: -0.35 });
      b.box(0.03, 0.04, 0.42, COLORS.WOOD, { y: hy + 0.05, z: -0.22, rx: 0.35 });
      b.box(0.004, 0.004, 0.86, 0xe0d8c8, { y: hy + 0.17, z: 0 });
      break;
    }
    case 'fist':
      if (look.build === 'colossus') {
        b.box(B.armR * 2.8, B.armR * 2.6, B.armR * 2.8, look.trim, { y: hy - B.armR * 0.9 });
        b.box(B.armR * 2.9, B.armR * 0.5, B.armR * 2.9, look.torso, { y: hy - B.armR * 0.1 });
        if (look.runes !== undefined) b.box(B.armR * 3, B.armR * 0.15, B.armR * 0.15, look.runes, { y: hy - B.armR * 0.9, z: B.armR * 1.42, glow: 2 });
      } else if (look.build === 'golem') {
        b.box(B.armR * 2.6, B.armR * 2.6, B.armR * 2.6, look.skin, { y: hy - B.armR * 0.8, rx: 0.2, ry: 0.2 });
      } else {
        b.box(B.armR * 2.2, B.armR * 2.2, B.armR * 2.2, look.trim, { y: hy - B.armR * 0.6 });
      }
      break;
    case 'hammer':
      b.box(B.armR * 2, B.armR * 2, B.armR * 2, look.trim, { y: hy - B.armR * 0.4 });
      b.cyl(0.05 * s, 0.05 * s, 0.6 * s, 0x2a2624, { y: hy - B.armR, z: 0.2 * s, rx: Math.PI / 2 }, 6);
      b.box(0.34 * s, 0.26 * s, 0.26 * s, look.skin, { y: hy - B.armR, z: 0.5 * s });
      b.box(0.36 * s, 0.05 * s, 0.05 * s, look.runes ?? 0xff7a20, { y: hy - B.armR, z: 0.64 * s, glow: 1.6 });
      break;
    case 'cannon':
      b.cyl(B.armR * 1.3, B.armR * 1.5, f * 0.9, look.trim, { y: hy - f * 0.2 }, 8);
      b.torus(B.armR * 1.2, B.armR * 0.25, look.runes ?? 0xff7a20, { y: hy - f * 0.65, rx: Math.PI / 2, glow: 2 }, 10);
      b.sphere(B.armR * 0.8, look.runes ?? 0xff7a20, { y: hy - f * 0.66, glow: 2.4 }, 6, 5);
      break;
  }
}

// ---------------------------------------------------------------------------
// Poses
// ---------------------------------------------------------------------------
/** Pose compacta: direções das mãos (espaço do peito; +X esquerda, +Y cima, +Z frente), flexões etc. */
const N = 18;
const I = { RX: 0, RY: 1, RZ: 2, RB: 3, RR: 4, LX: 5, LY: 6, LZ: 7, LB: 8, LR: 9, SP: 10, SY: 11, SR: 12, HY: 13, HP: 14, ST: 15, CR: 16, HD: 17 };
type PoseSpec = Partial<{ r: [number, number, number]; rb: number; rr: number; l: [number, number, number]; lb: number; lr: number; sp: number; sy: number; sr: number; hy: number; hp: number; st: number; cr: number; hd: number }>;

function P(spec: PoseSpec, base?: Float32Array): Float32Array {
  const a = base ? base.slice() : new Float32Array(N);
  if (!base) {
    a.set([-0.12, -1, 0.05], I.RX);
    a[I.RB] = 0.15;
    a.set([0.12, -1, 0.05], I.LX);
    a[I.LB] = 0.15;
  }
  if (spec.r) a.set(spec.r, I.RX);
  if (spec.l) a.set(spec.l, I.LX);
  if (spec.rb !== undefined) a[I.RB] = spec.rb;
  if (spec.rr !== undefined) a[I.RR] = spec.rr;
  if (spec.lb !== undefined) a[I.LB] = spec.lb;
  if (spec.lr !== undefined) a[I.LR] = spec.lr;
  if (spec.sp !== undefined) a[I.SP] = spec.sp;
  if (spec.sy !== undefined) a[I.SY] = spec.sy;
  if (spec.sr !== undefined) a[I.SR] = spec.sr;
  if (spec.hy !== undefined) a[I.HY] = spec.hy;
  if (spec.hp !== undefined) a[I.HP] = spec.hp;
  if (spec.st !== undefined) a[I.ST] = spec.st;
  if (spec.cr !== undefined) a[I.CR] = spec.cr;
  if (spec.hd !== undefined) a[I.HD] = spec.hd;
  return a;
}

export type Stance = 'shield' | 'knight' | 'dual' | 'bow' | 'staff' | 'fists' | 'unarmed';

const RELAX = P({});
const GUARD: Record<Stance, Float32Array> = {
  shield: P({ r: [-0.3, -0.8, 0.5], rb: 1.15, l: [0.2, -0.55, 0.8], lb: 1.35, sp: 0.1, cr: 0.15, st: 0.2 }),
  knight: P({ r: [-0.12, -0.7, 0.7], rb: 1.05, l: [-0.02, -0.72, 0.68], lb: 1.15, sp: 0.08, cr: 0.2, st: 0.25 }),
  dual: P({ r: [-0.4, -0.6, 0.65], rb: 1.2, l: [0.4, -0.6, 0.65], lb: 1.2, sp: 0.15, cr: 0.28, st: 0.2 }),
  bow: P({ r: [-0.15, -0.9, 0.3], rb: 0.7, l: [0.2, -0.8, 0.5], lb: 0.4, sp: 0.05, cr: 0.1 }),
  staff: P({ r: [-0.3, -0.65, 0.7], rb: 1.45, l: [0.25, -0.75, 0.5], lb: 0.9, sp: 0.05, cr: 0.1 }),
  fists: P({ r: [-0.45, -0.75, 0.45], rb: 0.9, l: [0.45, -0.75, 0.45], lb: 0.9, sp: 0.14, cr: 0.22, st: 0.15 }),
  unarmed: P({ r: [-0.3, -0.7, 0.55], rb: 1.0, l: [0.3, -0.7, 0.55], lb: 1.0, sp: 0.1, cr: 0.15 }),
};
const RELAX_STANCE: Partial<Record<Stance, Float32Array>> = {
  shield: P({ l: [0.18, -0.8, 0.5], lb: 1.3 }),
  staff: P({ r: [-0.18, -0.9, 0.35], rb: 1.4 }),
  bow: P({ l: [0.15, -0.95, 0.25], lb: 0.4 }),
};
const BLOCK: Record<Stance, Float32Array> = {
  shield: P({ r: [-0.35, -0.75, 0.45], rb: 1.2, l: [0.05, 0.15, 1], lb: 1.45, sp: 0.15, cr: 0.3, st: 0.3 }),
  knight: P({ r: [0.45, 0.25, 0.85], rb: 1.25, rr: -1.3, l: [0.35, 0.2, 0.85], lb: 1.3, sp: 0.12, cr: 0.3, st: 0.3 }),
  dual: P({ r: [0.35, 0.25, 0.85], rb: 1.45, l: [-0.35, 0.25, 0.85], lb: 1.45, sp: 0.18, cr: 0.35 }),
  bow: P({ r: [0.2, 0, 0.9], rb: 1.5, l: [-0.2, 0, 0.9], lb: 1.5, cr: 0.3 }),
  staff: P({ r: [0.2, 0.1, 0.9], rb: 1.5, l: [-0.2, 0.1, 0.9], lb: 1.5, cr: 0.3 }),
  fists: P({ r: [0.25, 0.1, 0.9], rb: 1.5, l: [-0.25, 0.1, 0.9], lb: 1.5, sp: 0.2, cr: 0.35 }),
  unarmed: P({ r: [0.25, 0.1, 0.9], rb: 1.5, l: [-0.25, 0.1, 0.9], lb: 1.5, cr: 0.3 }),
};

/** [antecipação, impacto] por animação de ataque. */
const ATTACK_POSES: Partial<Record<ExtraAnim, [Float32Array, Float32Array]>> = {
  slash: [P({ r: [-0.95, 0.35, -0.25], rb: 0.6, l: [0.25, -0.6, 0.7], lb: 1.3, sy: -0.6, cr: 0.25, st: 0.3 }), P({ r: [0.8, -0.1, 0.6], rb: 0.25, l: [0.3, -0.7, 0.3], lb: 1.1, sy: 0.55, cr: 0.35, st: 0.45, sp: 0.15 })],
  slash2: [P({ r: [0.75, 0.35, 0.35], rb: 1.1, l: [0.3, -0.7, 0.4], lb: 1.2, sy: 0.55, cr: 0.25, st: 0.3 }), P({ r: [-0.95, -0.15, 0.35], rb: 0.3, l: [0.25, -0.6, 0.6], lb: 1.2, sy: -0.5, cr: 0.35, st: 0.45, sp: 0.15 })],
  overhead: [P({ r: [-0.2, 0.95, -0.3], rb: 1.2, l: [0.1, 0.9, -0.2], lb: 1.2, sp: -0.25, cr: 0.1, st: 0.2 }), P({ r: [-0.05, -0.45, 0.9], rb: 0.1, l: [0.08, -0.5, 0.85], lb: 0.15, sp: 0.45, cr: 0.45, st: 0.55 })],
  thrust: [P({ r: [-0.45, -0.2, -0.6], rb: 1.7, l: [0.4, -0.3, 0.7], lb: 0.8, sy: -0.45, cr: 0.35, st: 0.3 }), P({ r: [-0.05, 0.05, 1], rb: 0, l: [0.4, -0.6, -0.4], lb: 0.4, sy: 0.25, cr: 0.3, st: 0.85, sp: 0.25 })],
  shieldBash: [P({ r: [-0.3, -0.8, 0.3], rb: 1.0, l: [0.65, -0.2, 0.25], lb: 1.45, sy: 0.55, cr: 0.3, st: 0.2 }), P({ r: [-0.3, -0.8, -0.2], rb: 0.6, l: [0.0, 0.05, 1], lb: 1.45, sy: -0.35, cr: 0.3, st: 0.65, sp: 0.2 })],
  spin: [P({ r: [-0.95, 0.05, -0.3], rb: 0.3, l: [-0.5, 0.05, 0.7], lb: 0.4, sy: -0.9, cr: 0.45 }), P({ r: [-1, 0.0, 0.15], rb: 0.1, l: [1, 0.0, 0.15], lb: 0.1, sy: 0, cr: 0.4 })],
  dualSlash: [P({ r: [-0.85, 0.4, -0.1], rb: 0.8, l: [0.35, 0.4, 0.4], lb: 1.4, sy: -0.5, cr: 0.35, st: 0.3 }), P({ r: [0.6, -0.25, 0.75], rb: 0.3, l: [-0.25, -0.35, 0.9], lb: 0.4, sy: 0.45, cr: 0.4, st: 0.5, sp: 0.2 })],
  dualCross: [P({ r: [0.5, 0.65, 0.2], rb: 1.0, l: [-0.5, 0.65, 0.2], lb: 1.0, sp: -0.15, cr: 0.25, st: 0.2 }), P({ r: [-0.85, -0.35, 0.45], rb: 0.2, l: [0.85, -0.35, 0.45], lb: 0.2, sp: 0.3, cr: 0.45, st: 0.5 })],
  backstab: [P({ r: [-0.3, 0.85, -0.2], rb: 1.7, l: [0.4, -0.3, 0.7], lb: 1.0, sp: -0.1, cr: 0.4, st: 0.3 }), P({ r: [0, -0.55, 0.85], rb: 0.6, l: [0.3, -0.7, 0.4], lb: 0.8, sp: 0.45, cr: 0.5, st: 0.6 })],
  bow: [P({ r: [-0.3, 0.12, -0.35], rb: 2.5, l: [0.05, 0.08, 1], lb: 0, sy: -0.4, st: 0.25, cr: 0.15 }), P({ r: [-0.55, 0.1, -0.6], rb: 1.6, l: [0.05, 0.08, 1], lb: 0, sy: -0.4, st: 0.25, cr: 0.15 })],
  cast: [P({ r: [-0.35, 0.15, 0.35], rb: 1.7, l: [0.35, 0.15, 0.35], lb: 1.7, sp: -0.12, cr: 0.15 }), P({ r: [-0.1, 0.15, 1], rb: 0.1, l: [0.1, 0.15, 1], lb: 0.1, sp: 0.18, cr: 0.2, st: 0.4 })],
  castUp: [P({ r: [-0.3, 1, 0.05], rb: 0.3, l: [0.3, 1, 0.05], lb: 0.3, sp: -0.3, hd: -0.3 }), P({ r: [-0.3, -0.4, 0.85], rb: 0.1, l: [0.3, -0.4, 0.85], lb: 0.1, sp: 0.35, cr: 0.45 })],
  smash: [P({ r: [-0.2, 1, -0.3], rb: 0.9, l: [0.5, -0.5, 0.5], lb: 1.0, sp: -0.25, sy: -0.25, st: 0.2 }), P({ r: [-0.1, -0.6, 0.8], rb: 0.1, l: [0.5, -0.8, 0.2], lb: 0.6, sp: 0.5, sy: 0.15, cr: 0.45, st: 0.45 })],
  slam: [P({ r: [-0.25, 1, -0.2], rb: 0.6, l: [0.25, 1, -0.2], lb: 0.6, sp: -0.32, hd: -0.2 }), P({ r: [-0.25, -0.8, 0.55], rb: 0, l: [0.25, -0.8, 0.55], lb: 0, sp: 0.6, cr: 0.7 })],
  sweep: [P({ r: [-1, 0.1, -0.45], rb: 0.2, l: [0.6, -0.6, 0.3], lb: 0.8, sy: -0.85, cr: 0.35, st: 0.2 }), P({ r: [1, 0.0, 0.3], rb: 0.2, l: [0.6, -0.7, -0.3], lb: 0.5, sy: 0.85, cr: 0.4, st: 0.3 })],
  volley: [P({ r: [-0.5, 0.75, -0.4], rb: 1.2, l: [0.4, -0.2, 0.8], lb: 0.6, sy: -0.35, st: 0.2 }), P({ r: [0.1, 0.1, 1], rb: 0, l: [0.4, -0.7, 0.2], lb: 0.5, sy: 0.3, st: 0.45, sp: 0.15 })],
  teleport: [P({ r: [-0.2, -0.2, 0.6], rb: 1.4, l: [0.2, -0.2, 0.6], lb: 1.4, cr: 0.6, sp: 0.35 }), P({ r: [-1, 0.35, 0.0], rb: 0, l: [1, 0.35, 0.0], lb: 0, sp: -0.2, hd: -0.3 })],
  smoke: [P({ r: [-0.3, 0.3, 0.4], rb: 1.5, cr: 0.3 }), P({ r: [-0.1, -0.9, 0.5], rb: 0.3, cr: 0.65, sp: 0.4 })],
  pounce: [P({ r: [-0.4, -0.3, -0.8], rb: 0.5, l: [0.4, -0.3, -0.8], lb: 0.5, cr: 0.85, sp: 0.55 }), P({ r: [-0.3, 0.35, 1], rb: 0.3, l: [0.3, 0.35, 1], lb: 0.3, sp: 0.3, st: 0.6 })],
  roar: [P({ r: [-0.5, -0.8, -0.3], rb: 0.6, l: [0.5, -0.8, -0.3], lb: 0.6, sp: 0.3, cr: 0.4 }), P({ r: [-0.95, 0.45, 0.15], rb: 0.4, l: [0.95, 0.45, 0.15], lb: 0.4, sp: -0.35, hd: -0.5 })],
  charge: [P({ r: [-0.4, -0.3, -0.85], rb: 0.4, l: [0.4, -0.3, -0.85], lb: 0.4, sp: 0.45, cr: 0.55, st: 0.4 }), P({ r: [-0.3, -0.5, 0.8], rb: 0.3, l: [0.3, -0.5, 0.8], lb: 0.3, sp: 0.6, cr: 0.35, st: 0.7 })],
  beam: [P({ r: [-0.85, -0.4, 0.3], rb: 0.5, l: [0.85, -0.4, 0.3], lb: 0.5, sp: -0.15, cr: 0.3 }), P({ r: [-0.9, -0.25, 0.35], rb: 0.4, l: [0.9, -0.25, 0.35], lb: 0.4, sp: -0.2, cr: 0.35 })],
  slump: [P({ r: [-0.2, -1, 0.3], rb: 0.1, l: [0.2, -1, 0.3], lb: 0.1, sp: 0.5, cr: 0.5, hd: 0.5 }), P({ r: [-0.2, -1, 0.3], rb: 0.1, l: [0.2, -1, 0.3], lb: 0.1, sp: 0.5, cr: 0.5, hd: 0.5 })],
};

/** Ataques canhotos (arma na mão esquerda) espelham X das mãos. */
const KNEEL = P({ r: [-0.15, -1, 0.15], rb: 0.2, l: [0.15, -1, 0.15], lb: 0.2, sp: 0.35, hd: 0.4 });

function lerpPose(out: Float32Array, a: Float32Array, b: Float32Array, t: number) {
  for (let i = 0; i < N; i++) out[i] = a[i] + (b[i] - a[i]) * t;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);

export function stanceOf(look: HumanoidLook): Stance {
  if (look.left === 'shield') return 'shield';
  if (look.left === 'bow') return 'bow';
  if (look.right === 'staff') return 'staff';
  if (look.right === 'longsword') return 'knight';
  if ((look.right === 'blade' || look.right === 'dagger') && (look.left === 'blade' || look.left === 'dagger')) return 'dual';
  if (look.right === 'fist' || look.right === 'hammer') return 'fists';
  return 'unarmed';
}

/**
 * Instância do rig humanoide (bones + malhas). `lookId` em HUMANOID_LOOKS.
 */
export class HumanoidRig implements Rig {
  readonly root = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  readonly bones: THREE.Object3D[] = [];
  readonly look: HumanoidLook;
  readonly build: Build;
  readonly stance: Stance;
  private cur = new Float32Array(N);
  private tgt = new Float32Array(N);
  private tmp = new Float32Array(N);
  private walkPhase = Math.random() * 6;
  private v = new THREE.Vector3();
  private q = new THREE.Quaternion();
  private qr = new THREE.Quaternion();
  private muzzleLocal = new THREE.Vector3();
  private muzzleBone: THREE.Object3D;
  private hipBaseY: number;
  /** Rotação extra do corpo (giro do ataque 'spin'). */
  private spin = 0;

  constructor(lookId: string, material: THREE.Material) {
    const look = HUMANOID_LOOKS[lookId] ?? HUMANOID_LOOKS.saqueador;
    this.look = look;
    const B = BUILDS[look.build];
    this.build = B;
    this.stance = stanceOf(look);
    this.hipBaseY = B.hipY;
    const mk = (i: number) => {
      const o = new THREE.Group();
      o.name = BONE_NAMES[i];
      const geo = cachedGeometry(`h:${lookId}:${i}`, (b) => buildBone(look, B, i, b));
      if (geo) {
        const m = new THREE.Mesh(geo, material);
        m.castShadow = true;
        m.receiveShadow = false;
        o.add(m);
        this.meshes.push(m);
      }
      this.bones[i] = o;
      return o;
    };
    for (let i = 0; i < 11; i++) mk(i);
    const b = this.bones;
    this.root.add(b[HB.HIPS]);
    b[HB.HIPS].position.set(0, B.hipY, 0);
    b[HB.HIPS].add(b[HB.SPINE]);
    b[HB.SPINE].position.set(0, B.spineY, 0);
    b[HB.SPINE].add(b[HB.HEAD]);
    b[HB.HEAD].position.set(0, B.headY, 0);
    b[HB.SPINE].add(b[HB.ARM_L]);
    b[HB.ARM_L].position.set(B.shoulderX, B.shoulderY, 0);
    b[HB.SPINE].add(b[HB.ARM_R]);
    b[HB.ARM_R].position.set(-B.shoulderX, B.shoulderY, 0);
    b[HB.ARM_L].add(b[HB.FORE_L]);
    b[HB.FORE_L].position.set(0, -B.upper, 0);
    b[HB.ARM_R].add(b[HB.FORE_R]);
    b[HB.FORE_R].position.set(0, -B.upper, 0);
    b[HB.HIPS].add(b[HB.LEG_L]);
    b[HB.LEG_L].position.set(B.legX, -0.02, 0);
    b[HB.HIPS].add(b[HB.LEG_R]);
    b[HB.LEG_R].position.set(-B.legX, -0.02, 0);
    b[HB.LEG_L].add(b[HB.SHIN_L]);
    b[HB.SHIN_L].position.set(0, -B.thigh, 0);
    b[HB.LEG_R].add(b[HB.SHIN_R]);
    b[HB.SHIN_R].position.set(0, -B.shin * 0 - B.thigh, 0);
    // origem de projéteis
    if (look.right === 'staff') {
      this.muzzleBone = b[HB.FORE_R];
      this.muzzleLocal.set(0, -B.fore, 1.22);
    } else if (look.left === 'bow') {
      this.muzzleBone = b[HB.FORE_L];
      this.muzzleLocal.set(0, -B.fore + 0.1, 0);
    } else if (look.left === 'cannon') {
      this.muzzleBone = b[HB.FORE_L];
      this.muzzleLocal.set(0, -B.fore * 1.7, 0);
    } else if (look.build === 'colossus') {
      this.muzzleBone = b[HB.SPINE];
      this.muzzleLocal.set(0, B.chestH * 0.6, B.chestD * 0.6);
    } else {
      this.muzzleBone = b[HB.FORE_R];
      this.muzzleLocal.set(0, -B.fore, 0.2);
    }
    this.cur.set(RELAX);
    // desempenho: as 11 malhas (uma por osso) viram 1 SkinnedMesh rígida (1 draw + 1 de sombra)
    const merged = mergeRigMeshes(`h:${lookId}`, this.root, this.meshes, material);
    if (merged) {
      this.meshes.length = 0;
      this.meshes.push(merged);
      this.merged = merged;
    }
  }

  /** Malha fundida (null se a fusão estiver desligada: ?rigmerge=0). */
  merged: THREE.SkinnedMesh | null = null;

  /** Libera os recursos por instância (textura de ossos da malha fundida). */
  dispose() {
    disposeMergedRig(this.merged);
  }

  setShadows(on: boolean) {
    for (const m of this.meshes) m.castShadow = on;
  }

  muzzle(out: THREE.Vector3): THREE.Vector3 {
    this.muzzleBone.updateWorldMatrix(true, false);
    return out.copy(this.muzzleLocal).applyMatrix4(this.muzzleBone.matrixWorld);
  }

  /** Posição mundial do ponto médio do peito (alvo de golpes/telegraph). */
  chestWorld(out: THREE.Vector3): THREE.Vector3 {
    const sp = this.bones[HB.SPINE];
    sp.updateWorldMatrix(true, false);
    return out.set(0, this.build.chestH * 0.6, 0).applyMatrix4(sp.matrixWorld);
  }

  update(dt: number, a: AnimInput) {
    const tgt = this.tgt;
    const st = this.stance;
    const base = a.combat || a.block ? GUARD[st] : RELAX_STANCE[st] ?? RELAX;
    let lambda = 10;
    // ---- camada de ação ----
    if (a.dead > 0) {
      tgt.set(RELAX);
      tgt[I.RX] = -0.6;
      tgt[I.LX] = 0.6;
      tgt[I.RY] = tgt[I.LY] = -0.2;
      tgt[I.HD] = -0.4;
      lambda = 6;
    } else if (a.kneel) {
      tgt.set(KNEEL);
      lambda = 5;
    } else if (a.action !== 'none' && a.action !== 'block' && ATTACK_POSES[a.action]) {
      const [w, s] = ATTACK_POSES[a.action]!;
      if (a.phase === 0) {
        lerpPose(tgt, base, w, easeOut(Math.min(1, a.phaseT * 1.25)));
        lambda = 14;
      } else if (a.phase === 1) {
        lerpPose(tgt, w, s, easeOut(Math.min(1, a.phaseT * 2.2)));
        lambda = 38;
      } else {
        lerpPose(tgt, s, base, easeInOut(a.phaseT));
        lambda = 9;
      }
    } else if (a.block || a.action === 'block') {
      tgt.set(BLOCK[st]);
      lambda = 22;
    } else {
      tgt.set(base);
    }
    // ---- locomoção ----
    const spd = a.speed;
    const moving = spd > 0.15 && a.dead === 0 && !a.kneel;
    const legLen = this.build.thigh + this.build.shin;
    const stride = legLen * (1.25 + a.run * 0.7);
    this.walkPhase += ((spd / Math.max(0.3, stride)) * Math.PI * dt) * a.timeScale;
    const ph = this.walkPhase;
    const amp = moving ? Math.min(1, spd / (legLen * 2.2)) * (0.55 + a.run * 0.25) : 0;
    if (moving && a.action === 'none' && !a.block && a.dodge === 0) {
      // braços balançam (fora de combate) e tronco inclina ao correr
      if (!a.combat) {
        tgt[I.RZ] += Math.sin(ph) * 0.35 * amp;
        tgt[I.LZ] -= Math.sin(ph) * 0.35 * amp;
      }
      tgt[I.SP] += a.run * 0.22 * Math.max(0, a.localZ);
    }
    // respiração
    tgt[I.SP] += Math.sin(a.time * 1.7) * 0.02;
    // esquiva: abaixa e inclina para o lado do movimento
    if (a.dodge > 0) {
      const k = Math.sin(a.dodge * Math.PI);
      tgt[I.CR] += 0.5 * k;
      tgt[I.SR] += -a.dodgeX * 0.5 * k;
      tgt[I.SP] += a.dodgeZ * 0.35 * k;
      lambda = Math.max(lambda, 20);
    }
    // reação a dano
    if (a.hit > 0) {
      tgt[I.SP] -= 0.35 * a.hit;
      tgt[I.HD] -= 0.3 * a.hit;
      tgt[I.SR] += 0.12 * a.hit;
    }
    if (a.stagger) {
      tgt[I.SP] += 0.25 + Math.sin(a.time * 9) * 0.12;
      tgt[I.SR] += Math.sin(a.time * 7) * 0.15;
      tgt[I.CR] += 0.3;
      tgt[I.RX] -= 0.2;
      tgt[I.LX] += 0.2;
      tgt[I.RY] = tgt[I.LY] = -0.9;
    }
    if (a.overheat) {
      tgt[I.SP] += 0.3;
      tgt[I.CR] += 0.25;
      tgt[I.HD] += 0.35;
    }
    // suavização
    const k = 1 - Math.exp(-lambda * dt * a.timeScale);
    const cur = this.cur;
    for (let i = 0; i < N; i++) cur[i] += (tgt[i] - cur[i]) * k;
    this.apply(a, amp, ph, moving, dt);
  }

  private apply(a: AnimInput, amp: number, ph: number, moving: boolean, dt: number) {
    const c = this.cur;
    const b = this.bones;
    const B = this.build;
    // braços (direção → quaternion) + rolagem + cotovelo
    this.setArm(b[HB.ARM_R], c[I.RX], c[I.RY], c[I.RZ], c[I.RR]);
    b[HB.FORE_R].rotation.set(-c[I.RB], 0, 0);
    this.setArm(b[HB.ARM_L], c[I.LX], c[I.LY], c[I.LZ], c[I.LR]);
    b[HB.FORE_L].rotation.set(-c[I.LB], 0, 0);
    // tronco e cabeça
    b[HB.SPINE].rotation.set(c[I.SP], c[I.SY], c[I.SR]);
    const ly = Math.max(-0.9, Math.min(0.9, a.lookYaw - c[I.SY]));
    b[HB.HEAD].rotation.set(c[I.HD] + Math.max(-0.5, Math.min(0.5, a.lookPitch)) - c[I.SP] * 0.6, ly, 0);
    // pernas
    const cr = Math.max(0, c[I.CR]);
    const stn = c[I.ST];
    const legLen = B.thigh + B.shin;
    let thL = -cr * 0.85 - stn * 0.45;
    let thR = -cr * 0.85 + stn * 0.35;
    let shL = cr * 1.5 + stn * 0.1;
    let shR = cr * 1.5 + stn * 0.45;
    let thLz = 0;
    let thRz = 0;
    let bob = 0;
    if (moving) {
      const az = amp * (a.combat ? 0.75 : 1);
      const fz = a.localZ * az;
      const fx = a.localX * az;
      const sL = Math.sin(ph);
      thL += -sL * fz;
      thR += sL * fz;
      thLz += sL * fx * 0.45;
      thRz += sL * fx * 0.45;
      shL += Math.max(0, Math.sin(ph - 1.3)) * amp * 1.3;
      shR += Math.max(0, Math.sin(ph + Math.PI - 1.3)) * amp * 1.3;
      bob = -Math.abs(Math.cos(ph)) * 0.05 * amp * legLen;
    }
    let hipY = this.hipBaseY - cr * 0.2 * legLen + bob + c[I.HY];
    if (a.kneel) {
      thL = -1.45;
      shL = 1.45;
      thR = 0.3;
      shR = 1.7;
      thLz = thRz = 0;
      hipY = this.hipBaseY - legLen * 0.45;
    }
    b[HB.LEG_L].rotation.set(thL, 0, thLz + 0.03);
    b[HB.LEG_R].rotation.set(thR, 0, thRz - 0.03);
    b[HB.SHIN_L].rotation.set(shL, 0, 0);
    b[HB.SHIN_R].rotation.set(shR, 0, 0);
    // quadril: compensa a inclinação para manter o tronco "em pé" ao agachar
    const hips = b[HB.HIPS];
    hips.position.y = hipY;
    hips.rotation.set(c[I.HP] + cr * 0.15, 0, 0);
    // giro do ataque circular
    if (a.action === 'spin' && a.phase === 1) this.spin = a.phaseT * Math.PI * 2;
    else this.spin *= Math.exp(-12 * dt);
    // morte: cai para trás
    if (a.dead > 0) {
      const d = easeIn(Math.min(1, a.dead));
      this.root.rotation.set(-d * 1.45, this.spin, 0);
      this.root.position.y = -d * 0.15 * legLen;
    } else {
      this.root.rotation.set(0, this.spin, 0);
      this.root.position.y = 0;
    }
  }

  private setArm(bone: THREE.Object3D, x: number, y: number, z: number, roll: number) {
    const v = this.v.set(x, y, z);
    const l = v.length();
    if (l < 1e-4) v.copy(DOWN);
    else v.multiplyScalar(1 / l);
    this.q.setFromUnitVectors(DOWN, v);
    if (roll !== 0) {
      this.qr.setFromAxisAngle(AXIS_Y, roll);
      this.q.multiply(this.qr);
    }
    bone.quaternion.copy(this.q);
  }
}
