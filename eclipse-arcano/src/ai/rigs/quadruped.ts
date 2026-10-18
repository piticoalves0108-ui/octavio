import * as THREE from 'three';
import { cachedGeometry, type PartBuilder } from './parts';
import { disposeMergedRig, mergeRigMeshes } from './merged';
import { easeIn, easeOut, type AnimInput, type Rig } from './anim';

/**
 * Rig quadrúpede (lobos, cervos, cavalos, ovelhas, coelhos, grifo): corpo → pescoço/cabeça
 * (mandíbula) / cauda / 4 pernas (+ asas no grifo). Passo em diagonal (trote), galope,
 * saltos (coelho), mordida, investida, uivo, pastar, deitar, morte tombando de lado.
 */
export interface QuadLook {
  body: number;
  belly: number;
  dark: number;
  eyes?: number;
  eyeGlow?: number;
  bodyL: number;
  bodyH: number;
  bodyW: number;
  legH: number;
  legR: number;
  neckL: number;
  headL: number;
  headH: number;
  tailL: number;
  ears: 'pointy' | 'round' | 'long' | 'none';
  antlers?: number;
  mane?: number;
  wool?: number;
  wings?: number;
  beak?: number;
  /** Corpo inteiro brilha (cervo luminoso). */
  glow?: number;
  hop?: boolean;
  /** Pescoço erguido (cervo/cavalo) em radianos. */
  neckUp: number;
  spikes?: number;
}

export const QUAD_LOOKS: Record<string, QuadLook> = {
  lobo: { body: 0x2c2b33, belly: 0x3e3c46, dark: 0x16151a, eyes: 0xc060ff, eyeGlow: 2.4, bodyL: 1.05, bodyH: 0.42, bodyW: 0.36, legH: 0.55, legR: 0.055, neckL: 0.32, headL: 0.36, headH: 0.22, tailL: 0.5, ears: 'pointy', neckUp: 0.45, spikes: 0x5a2a7a },
  alfa: { body: 0x1e1d24, belly: 0x4a4652, dark: 0x0e0d12, eyes: 0xff4060, eyeGlow: 2.8, bodyL: 1.1, bodyH: 0.46, bodyW: 0.4, legH: 0.56, legR: 0.065, neckL: 0.34, headL: 0.38, headH: 0.24, tailL: 0.55, ears: 'pointy', mane: 0x9a9aa8, neckUp: 0.45, spikes: 0x8a2a4a },
  cervo: { body: 0x8a5a36, belly: 0xd8c0a0, dark: 0x3a2618, eyes: 0x111111, bodyL: 1.0, bodyH: 0.5, bodyW: 0.34, legH: 0.85, legR: 0.04, neckL: 0.55, headL: 0.36, headH: 0.18, tailL: 0.14, ears: 'round', antlers: 0xc8b49a, neckUp: 1.0 },
  cervo_luminoso: { body: 0xbfeaff, belly: 0xffffff, dark: 0x7fd8ff, eyes: 0xffffff, eyeGlow: 2.5, bodyL: 1.0, bodyH: 0.5, bodyW: 0.34, legH: 0.9, legR: 0.04, neckL: 0.58, headL: 0.36, headH: 0.18, tailL: 0.16, ears: 'round', antlers: 0x9ff4ff, glow: 0.9, neckUp: 1.05 },
  cavalo: { body: 0x5a3a22, belly: 0x6a4a30, dark: 0x1a120c, eyes: 0x111111, bodyL: 1.4, bodyH: 0.62, bodyW: 0.46, legH: 0.95, legR: 0.07, neckL: 0.7, headL: 0.55, headH: 0.24, tailL: 0.6, ears: 'pointy', mane: 0x1a120c, neckUp: 0.85 },
  ovelha: { body: 0xe8e2d4, belly: 0xd8d0c0, dark: 0x2a2420, eyes: 0x111111, bodyL: 0.8, bodyH: 0.5, bodyW: 0.5, legH: 0.42, legR: 0.04, neckL: 0.18, headL: 0.28, headH: 0.18, tailL: 0.12, ears: 'long', wool: 0xf0ece0, neckUp: 0.35 },
  coelho: { body: 0x9a8a76, belly: 0xe0d8c8, dark: 0x4a4036, eyes: 0x111111, bodyL: 0.3, bodyH: 0.2, bodyW: 0.18, legH: 0.12, legR: 0.03, neckL: 0.05, headL: 0.14, headH: 0.12, tailL: 0.05, ears: 'long', hop: true, neckUp: 0.6 },
  grifo: { body: 0xb08a4a, belly: 0xe0c890, dark: 0x5a4020, eyes: 0xffc040, eyeGlow: 1.5, bodyL: 1.5, bodyH: 0.6, bodyW: 0.55, legH: 0.8, legR: 0.08, neckL: 0.5, headL: 0.45, headH: 0.3, tailL: 0.9, ears: 'pointy', wings: 0xe8e0d0, beak: 0xe0a020, mane: 0xf0ece0, neckUp: 0.9 },
};

export const QB = { BODY: 0, NECK: 1, HEAD: 2, JAW: 3, TAIL: 4, FL: 5, FR: 6, BL: 7, BR: 8, WL: 9, WR: 10 } as const;

function buildQuadBone(L: QuadLook, bone: number, b: PartBuilder) {
  const g = L.glow ?? 0;
  switch (bone) {
    case QB.BODY:
      b.sphere(L.bodyW * 0.55, L.body, { sx: 1, sy: L.bodyH / L.bodyW, sz: L.bodyL / L.bodyW, glow: g }, 12, 8);
      b.sphere(L.bodyW * 0.45, L.belly, { y: -L.bodyH * 0.18, sx: 1, sy: (L.bodyH / L.bodyW) * 0.7, sz: (L.bodyL / L.bodyW) * 0.85, glow: g }, 10, 6);
      b.sphere(L.bodyW * 0.56, L.body, { z: L.bodyL * 0.32, y: L.bodyH * 0.06, sy: (L.bodyH / L.bodyW) * 1.05, sz: 1.1, glow: g }, 10, 8);
      if (L.wool !== undefined) {
        for (let i = 0; i < 6; i++) b.sphere(L.bodyW * 0.38, L.wool, { x: (i % 2 ? 1 : -1) * L.bodyW * 0.22, y: L.bodyH * 0.18, z: (i / 5 - 0.5) * L.bodyL * 0.8 }, 7, 5);
      }
      if (L.mane !== undefined && L.wings === undefined) b.sphere(L.bodyW * 0.5, L.mane, { z: L.bodyL * 0.42, y: L.bodyH * 0.2, sy: 1.2, sz: 0.9 }, 8, 6);
      if (L.spikes !== undefined) for (let i = 0; i < 4; i++) b.cone(0.035, 0.16, L.spikes, { y: L.bodyH * 0.5, z: L.bodyL * (0.25 - i * 0.16), rx: -0.4, glow: 0.6 }, 4);
      break;
    case QB.NECK:
      b.limb(0, 0, 0, 0, L.neckL, 0, L.bodyW * 0.32, L.bodyW * 0.26, L.body, g, 7);
      if (L.mane !== undefined) b.box(L.bodyW * 0.12, L.neckL * 0.95, L.bodyW * 0.32, L.mane, { y: L.neckL * 0.5, z: -L.bodyW * 0.18 });
      break;
    case QB.HEAD: {
      const hl = L.headL;
      const hh = L.headH;
      b.box(hh * 1.0, hh, hl * 0.6, L.body, { z: hl * 0.15, glow: g });
      if (L.beak !== undefined) {
        b.cone(hh * 0.42, hl * 0.7, L.beak, { z: hl * 0.75, y: -hh * 0.05, rx: Math.PI / 2 }, 6);
        b.sphere(hh * 0.62, L.mane ?? L.body, { y: hh * 0.1, z: hl * 0.05 }, 8, 6);
      } else {
        b.box(hh * 0.62, hh * 0.55, hl * 0.6, L.belly, { z: hl * 0.62, y: hh * 0.1, glow: g });
        b.box(hh * 0.32, hh * 0.25, 0.06, L.dark, { z: hl * 0.93, y: hh * 0.25 });
      }
      const eg = L.eyeGlow ?? 0;
      b.sphere(hh * 0.12, L.eyes ?? 0x111111, { x: hh * 0.4, y: hh * 0.22, z: hl * 0.32, glow: eg }, 5, 4);
      b.sphere(hh * 0.12, L.eyes ?? 0x111111, { x: -hh * 0.4, y: hh * 0.22, z: hl * 0.32, glow: eg }, 5, 4);
      if (L.ears === 'pointy') {
        b.cone(hh * 0.18, hh * 0.55, L.dark, { x: hh * 0.3, y: hh * 0.7, z: 0 }, 4);
        b.cone(hh * 0.18, hh * 0.55, L.dark, { x: -hh * 0.3, y: hh * 0.7, z: 0 }, 4);
      } else if (L.ears === 'round') {
        b.sphere(hh * 0.22, L.body, { x: hh * 0.55, y: hh * 0.55, sx: 0.5, sy: 1.2, rz: -0.6, glow: g }, 5, 4);
        b.sphere(hh * 0.22, L.body, { x: -hh * 0.55, y: hh * 0.55, sx: 0.5, sy: 1.2, rz: 0.6, glow: g }, 5, 4);
      } else if (L.ears === 'long') {
        b.box(hh * 0.18, hh * 1.1, hh * 0.08, L.dark, { x: hh * 0.25, y: hh * 0.95, rz: -0.15 });
        b.box(hh * 0.18, hh * 1.1, hh * 0.08, L.dark, { x: -hh * 0.25, y: hh * 0.95, rz: 0.15 });
      }
      if (L.antlers !== undefined) {
        const ag = L.glow ? 1.6 : 0;
        for (const s of [1, -1]) {
          b.limb(s * hh * 0.25, hh * 0.45, 0, s * hh * 0.7, hh * 1.7, -hl * 0.2, 0.02, 0.014, L.antlers, ag, 4);
          b.limb(s * hh * 0.5, hh * 1.1, -hl * 0.08, s * hh * 1.0, hh * 1.5, hl * 0.12, 0.014, 0.01, L.antlers, ag, 4);
          b.limb(s * hh * 0.65, hh * 1.5, -hl * 0.16, s * hh * 0.45, hh * 2.1, -hl * 0.1, 0.013, 0.008, L.antlers, ag, 4);
        }
      }
      break;
    }
    case QB.JAW:
      if (L.beak === undefined) b.box(L.headH * 0.5, L.headH * 0.18, L.headL * 0.55, L.dark, { z: L.headL * 0.3, y: -L.headH * 0.05 });
      break;
    case QB.TAIL:
      b.limb(0, 0, 0, 0, -L.tailL * 0.3, -L.tailL, L.bodyW * 0.12, L.bodyW * 0.06, L.mane ?? L.body, g, 5);
      break;
    case QB.FL:
    case QB.FR:
    case QB.BL:
    case QB.BR: {
      const back = bone === QB.BL || bone === QB.BR;
      const r = L.legR;
      b.limb(0, 0, 0, 0, -L.legH * 0.5, back ? -r * 1.2 : r * 0.4, r * (back ? 2.4 : 1.9), r * 1.2, L.body, g, 6);
      b.limb(0, -L.legH * 0.5, back ? -r * 1.2 : r * 0.4, 0, -L.legH, 0, r * 1.2, r * 0.9, back ? L.body : L.belly, g, 6);
      b.box(r * 2.2, r * 1.2, r * 2.6, L.beak !== undefined && !back ? L.beak : L.dark, { y: -L.legH + r * 0.5, z: r * 0.6 });
      break;
    }
    case QB.WL:
    case QB.WR: {
      if (L.wings === undefined) break;
      const s = bone === QB.WL ? 1 : -1;
      const span = L.bodyL * 1.3;
      b.box(span, 0.05, L.bodyL * 0.45, L.wings, { x: s * span * 0.5, z: -0.05 });
      b.box(span * 0.7, 0.04, L.bodyL * 0.35, L.mane ?? L.wings, { x: s * span * 1.15, z: -0.15, ry: s * 0.2 });
      break;
    }
  }
}

export class QuadrupedRig implements Rig {
  readonly root = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  readonly bones: THREE.Object3D[] = [];
  readonly look: QuadLook;
  private phase = Math.random() * 6;
  // valores suavizados
  private bodyPitch = 0;
  private bodyY = 0;
  private headPitch = 0;
  private jaw = 0;
  private crouch = 0;
  private lie = 0;
  private sit = 0;
  private side = 0;
  private wing = 0;

  constructor(lookId: string, material: THREE.Material) {
    const L = QUAD_LOOKS[lookId] ?? QUAD_LOOKS.lobo;
    this.look = L;
    const count = L.wings !== undefined ? 11 : 9;
    for (let i = 0; i < count; i++) {
      const o = new THREE.Group();
      const geo = cachedGeometry(`q:${lookId}:${i}`, (b) => buildQuadBone(L, i, b));
      if (geo) {
        const m = new THREE.Mesh(geo, material);
        m.castShadow = true;
        o.add(m);
        this.meshes.push(m);
      }
      this.bones[i] = o;
    }
    const b = this.bones;
    this.root.add(b[QB.BODY]);
    b[QB.BODY].position.set(0, L.legH + L.bodyH * 0.15, 0);
    b[QB.BODY].add(b[QB.NECK]);
    b[QB.NECK].position.set(0, L.bodyH * 0.15, L.bodyL * 0.42);
    b[QB.NECK].add(b[QB.HEAD]);
    b[QB.HEAD].position.set(0, L.neckL, 0);
    b[QB.HEAD].add(b[QB.JAW]);
    b[QB.JAW].position.set(0, -L.headH * 0.3, L.headL * 0.1);
    b[QB.BODY].add(b[QB.TAIL]);
    b[QB.TAIL].position.set(0, L.bodyH * 0.2, -L.bodyL * 0.48);
    const lx = L.bodyW * 0.32;
    const corners: [number, number, number][] = [
      [lx, -L.bodyH * 0.1, L.bodyL * 0.33],
      [-lx, -L.bodyH * 0.1, L.bodyL * 0.33],
      [lx, -L.bodyH * 0.1, -L.bodyL * 0.33],
      [-lx, -L.bodyH * 0.1, -L.bodyL * 0.33],
    ];
    for (let i = 0; i < 4; i++) {
      b[QB.FL + i].position.set(...corners[i]);
      b[QB.BODY].add(b[QB.FL + i]);
      // compensa a altura do quadril (body.y = legH + bodyH*0.15)
      b[QB.FL + i].position.y = -L.bodyH * 0.15;
    }
    if (L.wings !== undefined) {
      b[QB.BODY].add(b[QB.WL]);
      b[QB.WL].position.set(L.bodyW * 0.35, L.bodyH * 0.35, L.bodyL * 0.15);
      b[QB.BODY].add(b[QB.WR]);
      b[QB.WR].position.set(-L.bodyW * 0.35, L.bodyH * 0.35, L.bodyL * 0.15);
    }
    // desempenho: malhas por osso → 1 SkinnedMesh rígida (1 draw + 1 de sombra)
    const merged = mergeRigMeshes(`q:${lookId}`, this.root, this.meshes, material);
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
    const h = this.bones[QB.HEAD];
    h.updateWorldMatrix(true, false);
    return out.set(0, 0, this.look.headL * 0.8).applyMatrix4(h.matrixWorld);
  }

  update(dt: number, a: AnimInput) {
    const L = this.look;
    const b = this.bones;
    const ts = a.timeScale;
    const spd = a.speed;
    const moving = spd > 0.1 && a.dead === 0;
    const stride = L.legH * (2.2 + a.run * 1.6);
    this.phase += (spd / Math.max(0.2, stride)) * Math.PI * 2 * dt * ts * 0.5;
    const ph = this.phase;
    const amp = moving ? Math.min(0.75, 0.3 + spd / (L.legH * 8)) : 0;
    const gallop = a.run > 0.6 && !L.hop;

    // alvos
    let tPitch = 0;
    let tY = 0;
    let tHead = L.neckUp;
    let tJaw = 0;
    let tCrouch = 0;
    let tSit = 0;
    let tLie = a.rest ? 1 : 0;
    let tSide = 0;
    let lambda = 10;
    if (a.graze) tHead = -0.9;
    if (a.combat) {
      tHead = L.neckUp * 0.45;
      tCrouch = 0.25;
    }
    switch (a.action) {
      case 'bite':
        if (a.phase === 0) {
          tCrouch = 0.5 * easeOut(a.phaseT);
          tHead = 0.1;
          tJaw = 0.3;
        } else if (a.phase === 1) {
          tHead = L.neckUp * 0.2;
          tJaw = 0.9 - a.phaseT * 0.8;
          tPitch = 0.12;
          lambda = 30;
        } else {
          tJaw = 0;
        }
        break;
      case 'pounce':
        if (a.phase === 0) {
          tCrouch = 0.9 * easeOut(a.phaseT);
          tPitch = 0.15;
          tJaw = 0.4;
        } else if (a.phase === 1) {
          tPitch = -0.35 + a.phaseT * 0.6;
          tJaw = 0.9;
          tY = Math.sin(a.phaseT * Math.PI) * L.legH * 0.4;
          lambda = 25;
        }
        break;
      case 'howl':
        tSit = a.phase === 2 ? 0.4 * (1 - a.phaseT) : 0.9;
        tHead = 1.5;
        tJaw = a.phase === 1 ? 0.7 : 0.2;
        break;
    }
    if (a.dodge > 0) {
      tSide = a.dodgeX * 0.5 * Math.sin(a.dodge * Math.PI);
      tCrouch = 0.4;
    }
    if (a.hit > 0) {
      tPitch -= 0.25 * a.hit;
      tHead += 0.3 * a.hit;
    }
    if (a.stagger) {
      tSide += Math.sin(a.time * 9) * 0.25;
      tCrouch += 0.3;
    }
    const k = 1 - Math.exp(-lambda * dt * ts);
    this.bodyPitch += (tPitch - this.bodyPitch) * k;
    this.bodyY += (tY - this.bodyY) * k;
    this.headPitch += (tHead - this.headPitch) * k;
    this.jaw += (tJaw - this.jaw) * Math.min(1, k * 1.5);
    this.crouch += (tCrouch - this.crouch) * k;
    this.sit += (tSit - this.sit) * k;
    this.lie += (tLie - this.lie) * (1 - Math.exp(-3 * dt));
    this.side += (tSide - this.side) * k;

    // passos
    let fl = 0;
    let fr = 0;
    let bl = 0;
    let br = 0;
    let bob = 0;
    let gp = 0;
    if (moving) {
      if (L.hop) {
        const s = Math.sin(ph * 2);
        fl = fr = s * 0.9;
        bl = br = -s * 0.9;
        bob = Math.max(0, Math.sin(ph * 2)) * L.legH * 1.4;
      } else if (gallop) {
        fl = Math.sin(ph) * amp * 1.3;
        fr = Math.sin(ph + 0.5) * amp * 1.3;
        bl = Math.sin(ph + Math.PI) * amp * 1.3;
        br = Math.sin(ph + Math.PI + 0.5) * amp * 1.3;
        gp = Math.sin(ph + 0.8) * 0.12;
        bob = Math.abs(Math.sin(ph)) * L.legH * 0.08;
      } else {
        fl = Math.sin(ph) * amp;
        br = Math.sin(ph) * amp;
        fr = Math.sin(ph + Math.PI) * amp;
        bl = Math.sin(ph + Math.PI) * amp;
        bob = Math.abs(Math.cos(ph)) * L.legH * 0.04;
      }
    }
    const cr = this.crouch;
    const lie = this.lie;
    const sit = this.sit;
    const body = b[QB.BODY];
    const baseY = L.legH + L.bodyH * 0.15;
    body.position.y = baseY - cr * L.legH * 0.25 - lie * L.legH * 0.78 - sit * L.legH * 0.25 + bob + this.bodyY;
    body.rotation.set(this.bodyPitch + gp - sit * 0.55, 0, this.side);
    // pernas (dobram ao agachar/deitar/sentar)
    const fold = lie * 1.4;
    b[QB.FL].rotation.set(-fl - cr * 0.3 - fold + sit * 0.55, 0, 0);
    b[QB.FR].rotation.set(-fr - cr * 0.3 - fold + sit * 0.55, 0, 0);
    b[QB.BL].rotation.set(-bl + cr * 0.4 + fold - sit * 0.9, 0, 0);
    b[QB.BR].rotation.set(-br + cr * 0.4 + fold - sit * 0.9, 0, 0);
    // pescoço/cabeça (olha para o alvo)
    const ly = Math.max(-0.8, Math.min(0.8, a.lookYaw));
    b[QB.NECK].rotation.set(-this.headPitch * 0.7 + Math.PI * 0.5 - 0.1, ly * 0.5, 0);
    b[QB.HEAD].rotation.set(-Math.PI * 0.5 + this.headPitch * 0.3 + 0.1 - a.lookPitch * 0.3, ly * 0.4, 0);
    b[QB.JAW].rotation.set(this.jaw * 0.6, 0, 0);
    b[QB.TAIL].rotation.set(0.3 + (a.combat ? -0.3 : 0) + Math.sin(a.time * (moving ? 6 : 2)) * 0.12, Math.sin(a.time * 3) * 0.25, 0);
    // asas (grifo)
    if (L.wings !== undefined) {
      const tw = a.flying ? 1 : 0;
      this.wing += (tw - this.wing) * (1 - Math.exp(-4 * dt));
      const flap = a.flying ? Math.sin(a.time * (a.dive > 0 ? 3 : 7)) * (a.dive > 0 ? 0.2 : 0.75) : 0;
      const fold2 = (1 - this.wing) * 1.25;
      b[QB.WL].rotation.set(0, -fold2 * 0.8, -flap - fold2 * 0.9 + (a.dive > 0 ? 0.5 : 0));
      b[QB.WR].rotation.set(0, fold2 * 0.8, flap + fold2 * 0.9 - (a.dive > 0 ? 0.5 : 0));
    }
    // morte: tomba de lado
    if (a.dead > 0) {
      const d = easeIn(Math.min(1, a.dead));
      this.root.rotation.set(0, 0, d * 1.5);
      this.root.position.y = -d * L.legH * 0.25;
    } else {
      this.root.rotation.set(0, 0, 0);
      this.root.position.y = 0;
    }
  }
}
