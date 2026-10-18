import * as THREE from 'three';
import { cachedGeometry, type PartBuilder } from './parts';
import { disposeMergedRig, mergeRigMeshes } from './merged';
import { easeIn, type AnimInput, type Rig } from './anim';

/**
 * Rig de voador (Corvo de Cristal, fênix, dragão distante, galinha) e serpente/espírito.
 * Voador: corpo → cabeça / asas em 2 segmentos / cauda. Bater de asas, planar, mergulho
 * (asas recolhidas), pouso (asas dobradas), ciscar (galinha).
 */
export interface FlyerLook {
  body: number;
  wing: number;
  accent: number;
  eyes: number;
  bodyL: number;
  bodyR: number;
  span: number;
  neckL: number;
  tailL: number;
  beak: number;
  /** Brilho das penas/cristais. */
  glow: number;
  crystals?: boolean;
  dragon?: boolean;
  legs?: number;
  comb?: number;
}

export const FLYER_LOOKS: Record<string, FlyerLook> = {
  corvo_cristal: { body: 0x1a1c26, wing: 0x2a3a4a, accent: 0x7fe8ff, eyes: 0x9ff4ff, bodyL: 0.7, bodyR: 0.2, span: 0.9, neckL: 0.12, tailL: 0.45, beak: 0x8ad8ff, glow: 1.4, crystals: true },
  fenix: { body: 0xff7a20, wing: 0xffb040, accent: 0xffe060, eyes: 0xffffff, bodyL: 0.9, bodyR: 0.24, span: 1.4, neckL: 0.3, tailL: 1.2, beak: 0xffd040, glow: 1.8 },
  dragao: { body: 0x2a2a34, wing: 0x3a3440, accent: 0xff5a30, eyes: 0xffa040, bodyL: 1.4, bodyR: 0.3, span: 2.2, neckL: 0.9, tailL: 1.6, beak: 0x1a1a20, glow: 0.4, dragon: true },
  galinha: { body: 0xf0e8dc, wing: 0xe0d6c4, accent: 0xd03020, eyes: 0x111111, bodyL: 0.32, bodyR: 0.13, span: 0.2, neckL: 0.12, tailL: 0.15, beak: 0xe0a020, glow: 0, legs: 0xe0a020, comb: 0xd02020 },
};

export const FB = { BODY: 0, HEAD: 1, WL: 2, WL2: 3, WR: 4, WR2: 5, TAIL: 6 } as const;

function buildFlyerBone(L: FlyerLook, bone: number, b: PartBuilder) {
  const g = L.glow;
  switch (bone) {
    case FB.BODY:
      b.sphere(L.bodyR, L.body, { sz: L.bodyL / (L.bodyR * 2), glow: L.dragon ? 0 : g * 0.15 }, 10, 7);
      if (L.crystals) {
        b.gem(L.bodyR * 0.45, L.accent, { y: L.bodyR * 0.7, z: -L.bodyL * 0.1, sy: 1.8, rx: -0.6, glow: g });
        b.gem(L.bodyR * 0.35, L.accent, { y: L.bodyR * 0.6, z: L.bodyL * 0.15, sy: 1.6, rx: -0.5, glow: g });
      }
      if (L.legs !== undefined) {
        b.limb(L.bodyR * 0.3, -L.bodyR * 0.6, 0, L.bodyR * 0.3, -L.bodyR * 1.6, 0, 0.012, 0.01, L.legs, 0, 4);
        b.limb(-L.bodyR * 0.3, -L.bodyR * 0.6, 0, -L.bodyR * 0.3, -L.bodyR * 1.6, 0, 0.012, 0.01, L.legs, 0, 4);
      } else if (!L.dragon) {
        b.limb(L.bodyR * 0.3, -L.bodyR * 0.6, -L.bodyL * 0.1, L.bodyR * 0.3, -L.bodyR * 1.2, -L.bodyL * 0.25, 0.02, 0.012, L.beak, 0, 4);
        b.limb(-L.bodyR * 0.3, -L.bodyR * 0.6, -L.bodyL * 0.1, -L.bodyR * 0.3, -L.bodyR * 1.2, -L.bodyL * 0.25, 0.02, 0.012, L.beak, 0, 4);
      }
      if (L.dragon) {
        for (let i = 0; i < 5; i++) b.cone(L.bodyR * 0.18, L.bodyR * 0.6, L.accent, { y: L.bodyR * 0.85, z: L.bodyL * (0.3 - i * 0.15), rx: -0.4, glow: 0.8 }, 4);
        b.limb(L.bodyR * 0.5, -L.bodyR * 0.5, L.bodyL * 0.25, L.bodyR * 0.6, -L.bodyR * 1.6, L.bodyL * 0.3, L.bodyR * 0.2, L.bodyR * 0.12, L.body, 0, 5);
        b.limb(-L.bodyR * 0.5, -L.bodyR * 0.5, L.bodyL * 0.25, -L.bodyR * 0.6, -L.bodyR * 1.6, L.bodyL * 0.3, L.bodyR * 0.2, L.bodyR * 0.12, L.body, 0, 5);
      }
      break;
    case FB.HEAD:
      if (L.neckL > 0.2) b.limb(0, 0, -L.neckL, 0, 0, 0, L.bodyR * 0.4, L.bodyR * 0.3, L.body, 0, 6);
      b.sphere(L.bodyR * 0.6, L.body, { glow: L.dragon ? 0 : g * 0.2 }, 8, 6);
      b.cone(L.bodyR * 0.25, L.bodyR * (L.dragon ? 1.4 : 0.9), L.beak, { z: L.bodyR * 0.8, rx: Math.PI / 2 }, 5);
      b.sphere(L.bodyR * 0.1, L.eyes, { x: L.bodyR * 0.35, y: L.bodyR * 0.15, z: L.bodyR * 0.35, glow: L.eyes === 0x111111 ? 0 : 2.4 }, 4, 3);
      b.sphere(L.bodyR * 0.1, L.eyes, { x: -L.bodyR * 0.35, y: L.bodyR * 0.15, z: L.bodyR * 0.35, glow: L.eyes === 0x111111 ? 0 : 2.4 }, 4, 3);
      if (L.comb !== undefined) b.box(0.02, L.bodyR * 0.45, L.bodyR * 0.6, L.comb, { y: L.bodyR * 0.6 });
      if (L.dragon) {
        b.cone(L.bodyR * 0.12, L.bodyR * 0.8, L.accent, { x: L.bodyR * 0.3, y: L.bodyR * 0.5, z: -L.bodyR * 0.3, rx: -1.2 }, 4);
        b.cone(L.bodyR * 0.12, L.bodyR * 0.8, L.accent, { x: -L.bodyR * 0.3, y: L.bodyR * 0.5, z: -L.bodyR * 0.3, rx: -1.2 }, 4);
      }
      if (L.crystals) b.gem(L.bodyR * 0.3, L.accent, { y: L.bodyR * 0.5, z: -L.bodyR * 0.2, sy: 1.6, rx: -0.9, glow: g });
      break;
    case FB.WL:
    case FB.WR: {
      const s = bone === FB.WL ? 1 : -1;
      const w = L.span * 0.5;
      if (L.dragon) {
        b.limb(0, 0, 0, s * w, 0, 0, L.bodyR * 0.12, L.bodyR * 0.08, L.body, 0, 4);
        b.box(w, 0.02, L.bodyL * 0.55, L.wing, { x: s * w * 0.5, z: -L.bodyL * 0.22 });
      } else {
        b.box(w, 0.03, L.bodyL * 0.5, L.wing, { x: s * w * 0.5, z: -L.bodyL * 0.08, glow: L.crystals ? 0.2 : g * 0.3 });
      }
      break;
    }
    case FB.WL2:
    case FB.WR2: {
      const s = bone === FB.WL2 ? 1 : -1;
      const w = L.span * 0.55;
      if (L.dragon) {
        b.limb(0, 0, 0, s * w, 0, -L.bodyL * 0.3, L.bodyR * 0.08, L.bodyR * 0.04, L.body, 0, 4);
        b.box(w, 0.02, L.bodyL * 0.6, L.wing, { x: s * w * 0.5, z: -L.bodyL * 0.38, ry: s * 0.25 });
      } else {
        b.box(w, 0.025, L.bodyL * 0.38, L.crystals ? L.accent : L.wing, { x: s * w * 0.5, z: -L.bodyL * 0.12, ry: s * 0.15, glow: L.crystals ? g * 0.8 : g * 0.5 });
        if (L.crystals) for (let i = 0; i < 3; i++) b.gem(0.05, L.accent, { x: s * (w * 0.6 + i * 0.12), z: -L.bodyL * 0.3, sz: 2.5, glow: g });
      }
      break;
    }
    case FB.TAIL:
      if (L.dragon) b.limb(0, 0, 0, 0, 0.1, -L.tailL, L.bodyR * 0.35, L.bodyR * 0.05, L.body, 0, 5);
      else b.box(L.bodyR * 1.3, 0.025, L.tailL, L.wing, { z: -L.tailL * 0.5, glow: g * 0.4 });
      if (L.dragon) b.cone(L.bodyR * 0.3, L.bodyR * 0.6, L.accent, { y: 0.1, z: -L.tailL, rx: -Math.PI / 2, glow: 0.8 }, 3);
      break;
  }
}

export class FlyerRig implements Rig {
  readonly root = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  readonly bones: THREE.Object3D[] = [];
  readonly look: FlyerLook;
  private flap = Math.random() * 6;
  private fold = 1;
  private peck = 0;

  constructor(lookId: string, material: THREE.Material) {
    const L = FLYER_LOOKS[lookId] ?? FLYER_LOOKS.corvo_cristal;
    this.look = L;
    for (let i = 0; i < 7; i++) {
      const o = new THREE.Group();
      const geo = cachedGeometry(`f:${lookId}:${i}`, (b) => buildFlyerBone(L, i, b));
      if (geo) {
        const m = new THREE.Mesh(geo, material);
        m.castShadow = true;
        o.add(m);
        this.meshes.push(m);
      }
      this.bones[i] = o;
    }
    const b = this.bones;
    this.root.add(b[FB.BODY]);
    b[FB.BODY].position.set(0, L.legs !== undefined ? L.bodyR * 1.6 : L.bodyR * 1.3, 0);
    b[FB.BODY].add(b[FB.HEAD]);
    b[FB.HEAD].position.set(0, L.bodyR * 0.45, L.bodyL * 0.5 + L.neckL);
    b[FB.BODY].add(b[FB.WL]);
    b[FB.WL].position.set(L.bodyR * 0.7, L.bodyR * 0.3, L.bodyL * 0.08);
    b[FB.BODY].add(b[FB.WR]);
    b[FB.WR].position.set(-L.bodyR * 0.7, L.bodyR * 0.3, L.bodyL * 0.08);
    b[FB.WL].add(b[FB.WL2]);
    b[FB.WL2].position.set(L.span * 0.5, 0, 0);
    b[FB.WR].add(b[FB.WR2]);
    b[FB.WR2].position.set(-L.span * 0.5, 0, 0);
    b[FB.BODY].add(b[FB.TAIL]);
    b[FB.TAIL].position.set(0, 0, -L.bodyL * 0.45);
    // desempenho: malhas por osso → 1 SkinnedMesh rígida (1 draw + 1 de sombra)
    const merged = mergeRigMeshes(`f:${lookId}`, this.root, this.meshes, material);
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
    const h = this.bones[FB.HEAD];
    h.updateWorldMatrix(true, false);
    return out.set(0, 0, this.look.bodyR).applyMatrix4(h.matrixWorld);
  }

  update(dt: number, a: AnimInput) {
    const b = this.bones;
    const ts = a.timeScale;
    const flying = a.flying && a.dead === 0;
    this.fold += ((flying ? 0 : 1) - this.fold) * (1 - Math.exp(-5 * dt));
    const diving = a.dive > 0;
    const freq = diving ? 2 : a.speed > 8 ? 9 : 6.5;
    this.flap += dt * freq * ts * (this.look.dragon ? 0.35 : 1);
    let f = flying ? Math.sin(this.flap) : 0;
    let amp = flying ? (diving ? 0.15 : 0.85) : 0;
    if (a.phase === 0 && a.action === 'dive') amp = 1.1; // antecipação: bate forte
    if (a.action === 'volley' && a.phase === 1) f = 1;
    const fold = this.fold;
    const sweep = diving ? 0.9 : 0;
    b[FB.WL].rotation.set(0, -fold * 1.1 - sweep * 0.6, -f * amp - fold * 0.3 + sweep * 0.2);
    b[FB.WR].rotation.set(0, fold * 1.1 + sweep * 0.6, f * amp + fold * 0.3 - sweep * 0.2);
    b[FB.WL2].rotation.set(0, -fold * 1.6 - sweep * 0.5, -f * amp * 0.6);
    b[FB.WR2].rotation.set(0, fold * 1.6 + sweep * 0.5, f * amp * 0.6);
    // corpo: inclina no mergulho, balança ao andar no chão
    const body = b[FB.BODY];
    const ground = !flying;
    if (ground && a.graze) this.peck += dt * 9;
    const peckV = ground && a.graze ? Math.max(0, Math.sin(this.peck)) : 0;
    body.rotation.set(diving ? 0.9 : flying ? -a.lookPitch * 0.3 + (a.speed > 6 ? 0.15 : 0) : peckV * 0.5, 0, flying ? -a.localX * 0.4 : 0);
    body.position.y = (this.look.legs !== undefined ? this.look.bodyR * 1.6 : this.look.bodyR * 1.3) + (ground && a.speed > 0.2 ? Math.abs(Math.sin(a.time * 12)) * 0.03 : 0) + (flying ? Math.sin(this.flap) * 0.04 : 0);
    b[FB.HEAD].rotation.set(diving ? -0.6 : peckV * 0.9 - (a.action === 'volley' && a.phase === 0 ? 0.4 : 0), Math.max(-0.8, Math.min(0.8, a.lookYaw)), 0);
    b[FB.TAIL].rotation.set(Math.sin(a.time * 3) * 0.08, Math.sin(a.time * 2.2) * 0.12, 0);
    if (a.hit > 0) body.rotation.x -= a.hit * 0.4;
    if (a.dead > 0) {
      const d = easeIn(Math.min(1, a.dead));
      this.root.rotation.set(0, 0, d * 2.4);
    } else this.root.rotation.set(0, 0, 0);
  }
}

// ---------------------------------------------------------------------------
// Serpente do lago: cadeia de segmentos que ondula e emerge da água.
// ---------------------------------------------------------------------------
const SEG = 9;

export class SerpentRig implements Rig {
  readonly root = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  readonly segs: THREE.Object3D[] = [];
  private jawBone = new THREE.Group();
  private jawOpen = 0;
  /** 0 = submersa, 1 = erguida. */
  rise = 0;

  constructor(material: THREE.Material) {
    let parent: THREE.Object3D = this.root;
    for (let i = 0; i < SEG; i++) {
      const r = 0.42 * (1 - i / (SEG + 2)) + 0.08;
      const geo = cachedGeometry(`s:${i}`, (b) => {
        b.sphere(r, i % 2 ? 0x2a5a52 : 0x234a46, { sz: 1.5 }, 8, 6);
        b.cone(r * 0.3, r * 0.9, 0x7fe8d0, { y: r * 0.9, rx: -0.3, glow: 0.8 }, 4);
        if (i === 0) {
          b.box(r * 1.5, r * 0.7, r * 2.2, 0x2a5a52, { z: r * 1.3, y: r * 0.1 });
          b.sphere(r * 0.18, 0xd0ff60, { x: r * 0.55, y: r * 0.45, z: r * 1.3, glow: 2.5 }, 5, 4);
          b.sphere(r * 0.18, 0xd0ff60, { x: -r * 0.55, y: r * 0.45, z: r * 1.3, glow: 2.5 }, 5, 4);
          b.cone(r * 0.14, r * 0.8, 0xe8e0c8, { x: r * 0.4, y: -r * 0.3, z: r * 2.0, rx: Math.PI }, 4);
          b.cone(r * 0.14, r * 0.8, 0xe8e0c8, { x: -r * 0.4, y: -r * 0.3, z: r * 2.0, rx: Math.PI }, 4);
        }
      });
      const o = new THREE.Group();
      if (geo) {
        const m = new THREE.Mesh(geo, material);
        m.castShadow = true;
        o.add(m);
        this.meshes.push(m);
      }
      o.position.set(0, i === 0 ? 0 : 0, i === 0 ? 0 : -r * 2.2);
      parent.add(o);
      parent = o;
      this.segs.push(o);
    }
    const jg = cachedGeometry('s:jaw', (b) => b.box(0.5, 0.15, 0.8, 0x1a3a36, { z: 0.45 }));
    if (jg) {
      const m = new THREE.Mesh(jg, material);
      this.jawBone.add(m);
      this.meshes.push(m);
    }
    this.segs[0].add(this.jawBone);
    this.jawBone.position.set(0, -0.2, 0.4);
  }

  setShadows(on: boolean) {
    for (const m of this.meshes) m.castShadow = on;
  }

  muzzle(out: THREE.Vector3): THREE.Vector3 {
    const h = this.segs[0];
    h.updateWorldMatrix(true, false);
    return out.set(0, 0, 1).applyMatrix4(h.matrixWorld);
  }

  update(dt: number, a: AnimInput) {
    const t = a.time;
    const rise = this.rise;
    // cabeça erguida: primeiro segmento inclina para cima; o resto ondula atrás, afundando
    const strike = a.action === 'bite' ? (a.phase === 0 ? -0.5 * a.phaseT : a.phase === 1 ? 0.9 : 0.3 * (1 - a.phaseT)) : 0;
    this.segs[0].rotation.set(-0.9 * rise + strike, a.lookYaw * 0.3, 0);
    for (let i = 1; i < SEG; i++) {
      const s = this.segs[i];
      s.rotation.set(i < 3 ? 0.35 * rise : 0.12 * rise, Math.sin(t * 2.2 - i * 0.8) * (0.25 + a.speed * 0.05), 0);
    }
    this.root.position.y = -2.2 + rise * 3.2;
    const jt = a.action === 'bite' && a.phase <= 1 ? 1 : 0;
    this.jawOpen += (jt - this.jawOpen) * (1 - Math.exp(-14 * dt));
    this.jawBone.rotation.x = this.jawOpen * 0.7;
    if (a.dead > 0) this.root.position.y -= a.dead * 2;
    void dt;
  }
}
