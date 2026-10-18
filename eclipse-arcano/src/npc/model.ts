import * as THREE from 'three';
import { cachedGeometry, type PartBuilder } from '../ai/rigs/parts';
import { mergeRigMeshes, disposeMergedRig } from '../ai/rigs/merged';
import { createRigMaterial, type RigMaterial } from '../ai/rigs/material';
import type { NpcDef, NpcLook } from '../data/npcs';

/**
 * Modelo humanoide procedural dos habitantes: hierarquia de ossos
 * (quadril → tronco → cabeça/braços/pernas), roupas (camisa, calça, vestido/
 * túnica, avental, capa, cota e tabardo), cabelos, barbas, chapéus, óculos e
 * ferramenta na mão. Cada osso vira UMA geometria (primitivas fundidas, em cache
 * por NPC) e o conjunto é fundido numa SkinnedMesh rígida (1 draw call por NPC),
 * com o mesmo material/programa de shader dos modelos da IA.
 */
export const NB = { HIPS: 0, SPINE: 1, HEAD: 2, ARM_L: 3, FORE_L: 4, ARM_R: 5, FORE_R: 6, LEG_L: 7, SHIN_L: 8, LEG_R: 9, SHIN_R: 10 } as const;
export const NPC_BONE_COUNT = 11;

/** Proporções (altura 1 ≈ 1,75 m). */
export const NPC_PROPS = {
  hipY: 0.92,
  thigh: 0.43,
  shin: 0.43,
  spineY: 0.07,
  chestH: 0.5,
  headY: 0.58,
  headR: 0.112,
  upper: 0.29,
  fore: 0.27,
  /** Altura do assento (cadeiras/bancos). */
  seatH: 0.47,
};

export interface NpcModel {
  root: THREE.Group;
  /** Grupo do corpo (escala de altura, deslocamentos de sentar/deitar). */
  body: THREE.Group;
  bones: THREE.Bone[];
  mesh: THREE.SkinnedMesh | null;
  /** Altura total aproximada (m). */
  height: number;
  /** Posição da mão direita (para faíscas da bigorna etc.), no espaço do osso FORE_R. */
  handOffset: THREE.Vector3;
}

let SHARED_MAT: RigMaterial | null = null;
/** Material compartilhado por todos os NPCs (cor por vértice; mesmo programa dos modelos da IA). */
export function npcMaterial(): RigMaterial {
  if (!SHARED_MAT) SHARED_MAT = createRigMaterial({ roughness: 0.86, metalness: 0.05 });
  return SHARED_MAT;
}

const DARK = 0x1a1410;
const IRON = 0x8e939b;
const WOOD = 0x6b4a2b;
const STRAW = 0xd8b860;

function shade(c: number, f: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return (r << 16) | (g << 8) | b;
}

interface Dims {
  bw: number;
  fem: boolean;
  pelvisW: number;
  waistW: number;
  chestW: number;
  chestD: number;
  shoulderX: number;
  shoulderY: number;
  legX: number;
  legR: number;
  armR: number;
}

function dims(look: NpcLook): Dims {
  const bw = look.build;
  const fem = look.sex === 'f';
  return {
    bw,
    fem,
    pelvisW: (fem ? 0.33 : 0.3) * bw,
    waistW: (fem ? 0.25 : 0.28) * bw,
    chestW: (fem ? 0.33 : 0.38) * bw,
    chestD: 0.21 * (0.7 + bw * 0.3),
    shoulderX: (fem ? 0.19 : 0.215) * (0.75 + bw * 0.25),
    shoulderY: 0.46,
    legX: 0.095 * (0.8 + bw * 0.2),
    legR: 0.066 * (0.7 + bw * 0.3),
    armR: (fem ? 0.042 : 0.05) * (0.7 + bw * 0.3),
  };
}

// ---------------------------------------------------------------------------
// Geometria por osso
// ---------------------------------------------------------------------------
function buildBone(look: NpcLook, D: Dims, bone: number, b: PartBuilder) {
  const P = NPC_PROPS;
  const sleeve = look.armor ? IRON : look.shirt;
  switch (bone) {
    case NB.HIPS: {
      b.box(D.pelvisW, 0.2, D.chestD * 0.95, look.pants, { y: -0.03 });
      if (look.belt !== undefined) b.box(D.pelvisW + 0.02, 0.05, D.chestD + 0.02, look.belt, { y: 0.06 });
      if (look.robe !== undefined) {
        // saia/túnica longa: tronco de cone do quadril até perto do tornozelo
        const len = 0.78;
        b.cyl(D.pelvisW * 0.6, D.pelvisW * 0.98, len, look.robe, { y: -len / 2 + 0.06, sz: 0.85 }, 12);
        b.cyl(D.pelvisW * 0.99, D.pelvisW * 0.99, 0.03, shade(look.robe, 0.7), { y: -len + 0.075, sz: 0.85 }, 12);
      }
      if (look.apron !== undefined) b.box(D.pelvisW * 0.82, 0.55, 0.02, look.apron, { y: -0.24, z: D.chestD * 0.5 + 0.03 });
      if (look.armor) {
        // fraldão da cota
        b.cyl(D.pelvisW * 0.58, D.pelvisW * 0.7, 0.26, IRON, { y: -0.1, sz: 0.85 }, 10);
        b.box(D.pelvisW * 0.5, 0.36, 0.02, look.shirt, { y: -0.16, z: D.chestD * 0.5 + 0.04 });
      }
      break;
    }
    case NB.SPINE: {
      const torso = look.armor ? IRON : look.robe !== undefined && look.sex === 'm' ? look.robe : look.shirt;
      b.cyl(D.waistW * 0.55, D.waistW * 0.5, 0.2, torso, { y: 0.1, sz: D.chestD / (D.waistW * 0.55) * 0.5 }, 10);
      b.cyl(D.chestW * 0.5, D.waistW * 0.55, 0.32, torso, { y: 0.34, sz: D.chestD / D.chestW }, 10);
      if (D.fem) b.sphere(0.07 * D.bw, torso, { y: 0.36, z: D.chestD * 0.34, sx: 2.1, sy: 0.85, sz: 0.8 }, 8, 6);
      // ombros
      b.sphere(D.armR * 1.25, sleeve, { x: D.shoulderX, y: D.shoulderY, sy: 0.9 }, 8, 6);
      b.sphere(D.armR * 1.25, sleeve, { x: -D.shoulderX, y: D.shoulderY, sy: 0.9 }, 8, 6);
      // pescoço
      b.cyl(0.045, 0.05, 0.1, look.skin, { y: P.headY - 0.1 });
      if (look.armor) {
        // tabardo com a cor da guarda e gola
        b.box(D.chestW * 0.62, 0.48, 0.02, look.shirt, { y: 0.27, z: D.chestD * 0.5 + 0.02 });
        b.box(D.chestW * 0.62, 0.48, 0.02, look.shirt, { y: 0.27, z: -D.chestD * 0.5 - 0.02 });
        b.box(0.06, 0.06, 0.03, 0xd8c060, { y: 0.38, z: D.chestD * 0.5 + 0.035 });
      } else {
        b.cyl(D.chestW * 0.2, D.chestW * 0.26, 0.05, shade(torso, 0.75), { y: 0.5 });
      }
      if (look.apron !== undefined) b.box(D.chestW * 0.62, 0.26, 0.02, look.apron, { y: 0.27, z: D.chestD * 0.5 + 0.02 });
      if (look.belt !== undefined && look.robe === undefined) b.box(D.waistW + 0.03, 0.05, D.chestD * 0.95, look.belt, { y: 0.02 });
      if (look.cloak !== undefined) {
        // capa/xale: painel nas costas + gola
        const long = look.sex === 'm' || look.robe === undefined;
        const h = long ? 0.95 : 0.55;
        b.box(D.chestW * 1.02, h, 0.03, look.cloak, { y: 0.52 - h / 2, z: -D.chestD * 0.55 - 0.02, rx: 0.07 });
        b.cyl(D.chestW * 0.34, D.chestW * 0.52, 0.09, look.cloak, { y: 0.49, sz: 0.8 }, 10);
      }
      if (look.tool === 'bow') b.limb(-0.18, 0.62, -0.17, 0.2, -0.05, -0.17, 0.012, 0.012, WOOD);
      if (look.tool === 'lute') {
        b.sphere(0.12, 0x9a6a3a, { x: 0.04, y: 0.2, z: D.chestD * 0.5 + 0.06, sz: 0.4, sy: 1.1 }, 10, 6);
        b.box(0.04, 0.32, 0.03, 0x5a3a1a, { x: -0.12, y: 0.42, z: D.chestD * 0.5 + 0.06, rz: 0.9 });
      }
      if (look.stoop) b.sphere(0.09 * D.bw, torso, { y: 0.44, z: -D.chestD * 0.35, sx: 1.6, sy: 0.9 }, 8, 5);
      break;
    }
    case NB.HEAD: {
      const r = P.headR;
      b.sphere(r, look.skin, { y: r * 0.95, sy: 1.08, sz: 0.98 }, 12, 9);
      // nariz, orelhas, olhos
      b.box(0.028, 0.045, 0.04, shade(look.skin, 0.92), { y: r * 0.9, z: r * 0.98 });
      b.sphere(0.022, look.skin, { x: r * 0.98, y: r * 0.95, sx: 0.5 }, 6, 4);
      b.sphere(0.022, look.skin, { x: -r * 0.98, y: r * 0.95, sx: 0.5 }, 6, 4);
      b.box(0.026, 0.018, 0.01, DARK, { x: 0.04, y: r * 1.08, z: r * 0.93 });
      b.box(0.026, 0.018, 0.01, DARK, { x: -0.04, y: r * 1.08, z: r * 0.93 });
      // sobrancelhas
      b.box(0.034, 0.01, 0.01, shade(look.hair, 0.9), { x: 0.04, y: r * 1.25, z: r * 0.92 });
      b.box(0.034, 0.01, 0.01, shade(look.hair, 0.9), { x: -0.04, y: r * 1.25, z: r * 0.92 });
      if (look.glasses) {
        b.torus(0.024, 0.004, 0x2a2a2a, { x: 0.042, y: r * 1.08, z: r * 0.99 }, 10);
        b.torus(0.024, 0.004, 0x2a2a2a, { x: -0.042, y: r * 1.08, z: r * 0.99 }, 10);
      }
      // cabelo
      const hairOn = look.hat !== 'helmet' && look.hat !== 'hood';
      const hc = look.hair;
      if (hairOn) {
        switch (look.hairStyle) {
          case 'short':
            b.sphere(r * 1.07, hc, { y: r * 1.12, z: -r * 0.08, sy: 0.82, sx: 1.02 }, 10, 6);
            break;
          case 'long':
            b.sphere(r * 1.08, hc, { y: r * 1.1, z: -r * 0.08, sy: 0.85 }, 10, 6);
            b.box(r * 1.9, r * 2.2, r * 0.5, hc, { y: r * 0.05, z: -r * 0.78 });
            break;
          case 'bun':
            b.sphere(r * 1.06, hc, { y: r * 1.12, z: -r * 0.06, sy: 0.84 }, 10, 6);
            b.sphere(r * 0.45, hc, { y: r * 1.75, z: -r * 0.55 }, 8, 6);
            break;
          case 'braid':
            b.sphere(r * 1.06, hc, { y: r * 1.12, z: -r * 0.06, sy: 0.84 }, 10, 6);
            b.limb(0, r * 0.9, -r * 1.0, 0, -r * 2.2, -r * 1.25, r * 0.22, r * 0.14, hc);
            break;
          case 'tonsure':
            b.torus(r * 0.92, r * 0.18, hc, { y: r * 1.2, rx: Math.PI / 2 }, 14);
            break;
          case 'curly':
            for (let i = 0; i < 9; i++) {
              const a = (i / 9) * Math.PI * 2;
              b.sphere(r * 0.42, hc, { x: Math.cos(a) * r * 0.72, y: r * 1.45 + Math.sin(a * 2) * r * 0.06, z: Math.sin(a) * r * 0.72 - r * 0.1 }, 7, 5);
            }
            b.sphere(r * 0.9, hc, { y: r * 1.4, sy: 0.6 }, 8, 5);
            break;
          case 'bald':
            if (look.stoop || look.beard === 'long') b.torus(r * 0.98, r * 0.12, hc, { y: r * 0.95, z: -r * 0.12, rx: Math.PI / 2 + 0.3 }, 14);
            break;
        }
      }
      switch (look.beard) {
        case 'short':
          b.sphere(r * 0.62, hc, { y: r * 0.45, z: r * 0.55, sy: 0.75, sz: 0.7 }, 8, 6);
          break;
        case 'long':
          b.cone(r * 0.62, r * 1.8, hc, { y: r * 0.05, z: r * 0.62, rx: Math.PI, sz: 0.6 }, 8);
          b.box(0.09, 0.02, 0.02, hc, { y: r * 0.72, z: r * 1.0 });
          break;
        case 'mustache':
          b.box(0.1, 0.022, 0.02, hc, { y: r * 0.72, z: r * 1.0 });
          break;
      }
      // chapéus
      const hcol = look.hatColor ?? 0x5a4a3a;
      switch (look.hat) {
        case 'cap':
          b.cyl(r * 1.05, r * 1.1, r * 0.55, hcol, { y: r * 1.62 }, 10);
          b.box(r * 1.2, 0.015, r * 0.7, shade(hcol, 0.85), { y: r * 1.4, z: r * 0.85 });
          break;
        case 'wide':
          b.cyl(r * 2.1, r * 2.1, 0.02, hcol, { y: r * 1.5 }, 14);
          b.cyl(r * 0.85, r * 1.0, r * 0.8, hcol, { y: r * 1.9 }, 12);
          b.cyl(r * 1.01, r * 1.01, r * 0.18, shade(hcol, 0.6), { y: r * 1.62 }, 12);
          break;
        case 'straw':
          b.cyl(r * 2.3, r * 2.3, 0.02, hcol ?? STRAW, { y: r * 1.48 }, 14);
          b.cone(r * 1.05, r * 1.0, hcol ?? STRAW, { y: r * 1.95 }, 12);
          break;
        case 'feather':
          b.cyl(r * 1.6, r * 1.6, 0.02, hcol, { y: r * 1.5, rz: 0.12 }, 12);
          b.cyl(r * 0.9, r * 1.02, r * 0.7, hcol, { y: r * 1.86, rz: 0.12 }, 12);
          b.cone(r * 0.12, r * 1.6, 0xd8402a, { x: -r * 0.9, y: r * 2.3, z: -r * 0.3, rz: 0.6, rx: -0.3 }, 6);
          break;
        case 'hood':
          b.sphere(r * 1.22, hcol, { y: r * 1.1, z: -r * 0.16, sy: 1.05 }, 10, 7);
          b.cone(r * 0.6, r * 0.9, hcol, { y: r * 1.3, z: -r * 1.05, rx: -1.9 }, 8);
          break;
        case 'helmet':
          b.sphere(r * 1.16, hcol, { y: r * 1.18, sy: 0.92 }, 12, 7);
          b.box(0.022, r * 0.9, 0.02, shade(hcol, 0.8), { y: r * 1.0, z: r * 1.1 });
          b.cyl(r * 1.2, r * 1.2, 0.025, shade(hcol, 0.8), { y: r * 1.02 }, 12);
          break;
        case 'scarf':
          b.sphere(r * 1.12, hcol, { y: r * 1.2, z: -r * 0.12, sy: 0.88 }, 10, 6);
          b.sphere(r * 0.3, hcol, { y: r * 0.6, z: -r * 1.0 }, 6, 4);
          break;
      }
      break;
    }
    case NB.ARM_L:
    case NB.ARM_R: {
      b.limb(0, 0, 0, 0, -P.upper, 0, D.armR, D.armR * 0.88, sleeve, 0, 7);
      if (look.armor) b.sphere(D.armR * 1.5, shade(IRON, 1.1), { y: -0.02, sy: 0.75 }, 8, 5);
      break;
    }
    case NB.FORE_L:
    case NB.FORE_R: {
      const sleeveLen = look.armor || look.robe !== undefined || look.cloak !== undefined ? 0.17 : 0.1;
      b.limb(0, 0, 0, 0, -sleeveLen, 0, D.armR * 0.88, D.armR * 0.8, sleeve, 0, 7);
      b.limb(0, -sleeveLen, 0, 0, -P.fore + 0.03, 0, D.armR * 0.7, D.armR * 0.65, look.skin, 0, 6);
      b.sphere(D.armR * 0.95, look.skin, { y: -P.fore - 0.01, sz: 0.7 }, 7, 5);
      if (bone === NB.FORE_R) buildTool(look, b);
      if (bone === NB.FORE_L && look.tool === 'book') b.box(0.15, 0.2, 0.035, 0x6a2a1a, { y: -P.fore - 0.02, z: 0.08, rx: -0.2 });
      break;
    }
    case NB.LEG_L:
    case NB.LEG_R: {
      b.limb(0, 0.02, 0, 0, -P.thigh, 0, D.legR * 1.08, D.legR * 0.86, look.pants, 0, 7);
      break;
    }
    case NB.SHIN_L:
    case NB.SHIN_R: {
      b.limb(0, 0, 0, 0, -P.shin * 0.55, 0, D.legR * 0.86, D.legR * 0.72, look.pants, 0, 7);
      b.limb(0, -P.shin * 0.55, 0, 0, -P.shin + 0.04, 0, D.legR * 0.8, D.legR * 0.78, look.boots, 0, 7);
      b.box(D.legR * 1.6, 0.06, 0.2, look.boots, { y: -P.shin + 0.02, z: 0.045 });
      break;
    }
  }
}

/** Ferramenta presa à mão direita (eixo do cabo ao longo de +Z da mão / ±Y). */
function buildTool(look: NpcLook, b: PartBuilder) {
  const hy = -NPC_PROPS.fore - 0.02;
  switch (look.tool) {
    case 'hammer':
      b.limb(0, hy, -0.06, 0, hy, 0.3, 0.016, 0.016, WOOD);
      b.box(0.07, 0.07, 0.13, IRON, { y: hy, z: 0.32, rx: Math.PI / 2 });
      break;
    case 'spear':
      b.limb(0, hy - 0.85, 0.02, 0, hy + 1.15, 0.02, 0.018, 0.016, WOOD);
      b.cone(0.035, 0.2, IRON, { y: hy + 1.25, z: 0.02 }, 6);
      break;
    case 'broom':
      b.limb(0, hy + 0.35, 0, 0, hy - 0.75, 0.25, 0.016, 0.016, WOOD);
      b.cone(0.1, 0.28, STRAW, { y: hy - 0.8, z: 0.27, rx: Math.PI - 0.22 }, 8);
      break;
    case 'sickle':
      b.limb(0, hy, -0.04, 0, hy, 0.16, 0.014, 0.014, WOOD);
      b.torus(0.1, 0.008, IRON, { y: hy + 0.08, z: 0.2, ry: Math.PI / 2 }, 10);
      break;
    case 'cane':
      b.limb(0, hy + 0.04, 0.02, 0, hy - 0.66, 0.06, 0.014, 0.012, WOOD);
      break;
    case 'basket':
      b.cyl(0.13, 0.1, 0.14, 0xb08a50, { y: hy - 0.14 }, 9);
      b.torus(0.12, 0.008, 0x8a6a3a, { y: hy - 0.02 }, 10);
      break;
    case 'mug':
      b.cyl(0.04, 0.035, 0.1, 0x8a6a4a, { y: hy - 0.01, z: 0.05 }, 8);
      b.cyl(0.036, 0.036, 0.01, 0xe8d8a0, { y: hy + 0.04, z: 0.05 }, 8);
      break;
    case 'book':
      b.box(0.15, 0.2, 0.035, 0x3a2a5a, { y: hy - 0.02, z: 0.08, rx: -0.2 });
      break;
    default:
      break;
  }
}

/** Cria o modelo do NPC (geometria em cache por id; esqueleto próprio). */
export function createNpcModel(def: NpcDef): NpcModel {
  const look = def.look;
  const D = dims(look);
  const P = NPC_PROPS;
  const mat = npcMaterial();
  const root = new THREE.Group();
  root.name = `npc:${def.id}`;
  const body = new THREE.Group();
  body.scale.setScalar(look.height);
  root.add(body);

  const bones: THREE.Bone[] = [];
  for (let i = 0; i < NPC_BONE_COUNT; i++) bones.push(new THREE.Bone());
  const hips = bones[NB.HIPS];
  hips.position.set(0, P.hipY, 0);
  body.add(hips);
  bones[NB.SPINE].position.set(0, P.spineY, 0);
  hips.add(bones[NB.SPINE]);
  bones[NB.HEAD].position.set(0, P.headY, 0);
  bones[NB.SPINE].add(bones[NB.HEAD]);
  bones[NB.ARM_L].position.set(D.shoulderX, D.shoulderY, 0);
  bones[NB.ARM_R].position.set(-D.shoulderX, D.shoulderY, 0);
  bones[NB.SPINE].add(bones[NB.ARM_L], bones[NB.ARM_R]);
  bones[NB.FORE_L].position.set(0, -P.upper, 0);
  bones[NB.FORE_R].position.set(0, -P.upper, 0);
  bones[NB.ARM_L].add(bones[NB.FORE_L]);
  bones[NB.ARM_R].add(bones[NB.FORE_R]);
  bones[NB.LEG_L].position.set(D.legX, -0.04, 0);
  bones[NB.LEG_R].position.set(-D.legX, -0.04, 0);
  hips.add(bones[NB.LEG_L], bones[NB.LEG_R]);
  bones[NB.SHIN_L].position.set(0, -P.thigh, 0);
  bones[NB.SHIN_R].position.set(0, -P.thigh, 0);
  bones[NB.LEG_L].add(bones[NB.SHIN_L]);
  bones[NB.LEG_R].add(bones[NB.SHIN_R]);

  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < NPC_BONE_COUNT; i++) {
    const geo = cachedGeometry(`npc:${def.id}:${i}`, (b) => buildBone(look, D, i, b));
    if (!geo) continue;
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = false;
    bones[i].add(m);
    meshes.push(m);
  }
  const mesh = mergeRigMeshes(`npc:${def.id}`, root, meshes, mat);
  return { root, body, bones, mesh, height: 1.75 * look.height, handOffset: new THREE.Vector3(0, -P.fore - 0.02, 0.3) };
}

export function disposeNpcModel(m: NpcModel) {
  disposeMergedRig(m.mesh);
  m.root.removeFromParent();
}
