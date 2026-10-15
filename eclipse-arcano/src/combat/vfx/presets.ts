import * as THREE from 'three';
import { PShape, type GpuParticles, type ParticleSpec } from './particles';
import { RingStyle, type RingRenderer } from './rings';
import type { LightPool } from './lights';
import type { BurstOptions, VfxKind } from '../VFX';

/**
 * Receitas de cada VfxKind: combinação de partículas (aditivas e de fumaça), anéis,
 * cascas e clarões de luz. Nenhuma alocação: usa o rascunho dos pools.
 */
export interface PresetTargets {
  add: GpuParticles;
  smoke: GpuParticles;
  rings: RingRenderer;
  lights: LightPool;
  /** Multiplicador de quantidade pelo preset de qualidade. */
  countMul: number;
}

const C = new THREE.Color();
const C2 = new THREE.Color();
const D = new THREE.Vector3();

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** Direção aleatória na esfera (em D). */
function randDir(): THREE.Vector3 {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return D.set(s * Math.cos(t), u, s * Math.sin(t));
}

/** Direção aleatória num cone em torno de `dir` (abertura em radianos). */
function coneDir(dir: THREE.Vector3, spread: number): THREE.Vector3 {
  randDir();
  D.multiplyScalar(Math.sin(spread)).add(dir).normalize();
  return D;
}

function color(p: ParticleSpec, hex: number, vary = 0.1, mixHex?: number, mixAmt = 0) {
  C.setHex(hex);
  if (mixHex !== undefined) {
    C2.setHex(mixHex);
    C.lerp(C2, mixAmt);
  }
  const v = 1 + (Math.random() * 2 - 1) * vary;
  p.r = C.r * v;
  p.g = C.g * v;
  p.b = C.b * v;
}

function at(p: ParticleSpec, pos: THREE.Vector3, jitter = 0) {
  p.x = pos.x + (jitter ? (Math.random() * 2 - 1) * jitter : 0);
  p.y = pos.y + (jitter ? (Math.random() * 2 - 1) * jitter : 0);
  p.z = pos.z + (jitter ? (Math.random() * 2 - 1) * jitter : 0);
}

function vel(p: ParticleSpec, d: THREE.Vector3, speed: number) {
  p.vx = d.x * speed;
  p.vy = d.y * speed;
  p.vz = d.z * speed;
}

const DEFAULT_COLOR: Partial<Record<VfxKind, number>> = {
  arcaneBurst: 0x58d8ff,
  arcaneSpark: 0x8fe8ff,
  lightning: 0xbfe4ff,
  fire: 0xff7a1a,
  smoke: 0x5a5a5e,
  dust: 0x8a7a62,
  impact: 0xfff0c0,
  metalSpark: 0xffa040,
  heal: 0x5dff8a,
  levelUp: 0xffd060,
  teleport: 0xc080ff,
  shockwave: 0xbfe8ff,
  crystalShatter: 0x7fe8ff,
  void: 0xb050ff,
  time: 0x9fd0ff,
  splash: 0xcfe6ff,
  leaves: 0x5d8a2a,
  pickupGlow: 0xffd870,
  corruption: 0xc040ff,
  blockSpark: 0xfff0b0,
  deathDissolve: 0x9fd8ff,
};

export function emitPreset(T: PresetTargets, kind: VfxKind, pos: THREE.Vector3, opts: BurstOptions | undefined) {
  const s = opts?.scale ?? 1;
  const col = opts?.color ?? DEFAULT_COLOR[kind] ?? 0xffffff;
  const speedMul = opts?.speed ?? 1;
  const lifeMul = opts?.lifetime ?? 1;
  const dir = opts?.direction;
  const n = (base: number) => Math.max(1, Math.round((opts?.count ?? base) * T.countMul));
  const A = T.add;
  const S = T.smoke;
  let p: ParticleSpec;

  switch (kind) {
    case 'arcaneBurst': {
      for (let i = 0, c = n(26); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.15 * s);
        vel(p, randDir(), rnd(2.5, 7) * s * speedMul);
        p.drag = 3.2;
        p.life = rnd(0.4, 0.8) * lifeMul;
        p.size0 = rnd(0.25, 0.45) * s;
        p.size1 = 0.03;
        color(p, col, 0.15, 0xb070ff, Math.random() * 0.45);
        A.emit();
      }
      for (let i = 0, c = n(8); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.3 * s);
        vel(p, randDir(), rnd(1, 3) * s * speedMul);
        p.drag = 2;
        p.life = rnd(0.5, 0.9) * lifeMul;
        p.size0 = 0.35 * s;
        p.size1 = 0.05;
        p.shape = PShape.Star;
        p.spin = rnd(-3, 3);
        color(p, col, 0.05, 0xffffff, 0.4);
        A.emit();
      }
      // clarão central (branco → cor) e faíscas rápidas
      p = A.reset();
      at(p, pos);
      p.life = 0.22 * lifeMul;
      p.size0 = 2.6 * s;
      p.size1 = 3.6 * s;
      color(p, col, 0, 0xffffff, 0.65);
      A.emit();
      for (let i = 0, c = n(14); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.1 * s);
        vel(p, randDir(), rnd(7, 14) * s * speedMul);
        p.drag = 3.5;
        p.gravity = 4;
        p.life = rnd(0.25, 0.5) * lifeMul;
        p.size0 = 0.09 * s;
        p.size1 = 0.02;
        p.shape = PShape.Spark;
        p.stretch = 0.04;
        color(p, col, 0.05, 0xffffff, 0.5);
        A.emit();
      }
      T.rings.ring(pos.x, pos.y, pos.z, 0.3, 2.8 * s, 0.45, col, 0.9, RingStyle.Shock, 0.22);
      T.rings.shell(pos.x, pos.y, pos.z, 0.2, 1.8 * s, 0.35, col, 0.7);
      T.lights.flash(pos, col, 45 * s, 0.4, 10 + 4 * s);
      break;
    }
    case 'arcaneSpark': {
      for (let i = 0, c = n(10); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.05);
        vel(p, dir ? coneDir(dir, 0.8) : randDir(), rnd(3, 8) * speedMul);
        p.gravity = 6;
        p.drag = 2.5;
        p.life = rnd(0.2, 0.45) * lifeMul;
        p.size0 = 0.07 * s;
        p.size1 = 0.02;
        p.shape = PShape.Spark;
        p.stretch = 0.035;
        color(p, col, 0.1, 0xffffff, 0.3);
        A.emit();
      }
      break;
    }
    case 'lightning': {
      for (let i = 0, c = n(18); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.1);
        vel(p, dir ? coneDir(dir, 1.1) : randDir(), rnd(4, 11) * speedMul);
        p.gravity = 9;
        p.drag = 2;
        p.life = rnd(0.2, 0.5) * lifeMul;
        p.size0 = 0.08 * s;
        p.size1 = 0.02;
        p.shape = PShape.Spark;
        p.stretch = 0.045;
        p.floorY = pos.y - 3;
        color(p, col, 0.08, 0xffffff, 0.5);
        A.emit();
      }
      p = A.reset();
      at(p, pos);
      p.life = 0.16;
      p.size0 = 1.8 * s;
      p.size1 = 0.6 * s;
      color(p, col, 0, 0xffffff, 0.6);
      A.emit();
      T.rings.ring(pos.x, pos.y + 0.05, pos.z, 0.2, 1.6 * s, 0.3, col, 0.9, RingStyle.Shock, 0.3);
      T.lights.flash(pos, col, 60 * s, 0.25, 16);
      break;
    }
    case 'fire': {
      for (let i = 0, c = n(18); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.25 * s);
        if (dir) vel(p, coneDir(dir, 0.35), rnd(3, 7) * speedMul);
        else {
          randDir();
          p.vx = D.x * 1.5 * s;
          p.vy = rnd(1.5, 3.5) * s * speedMul;
          p.vz = D.z * 1.5 * s;
        }
        p.gravity = -3;
        p.drag = 1.6;
        p.life = rnd(0.45, 0.9) * lifeMul;
        p.size0 = rnd(0.35, 0.6) * s;
        p.size1 = 0.08 * s;
        p.spin = rnd(-2, 2);
        color(p, 0xffd060, 0.08, col, Math.random());
        A.emit();
      }
      for (let i = 0, c = n(5); i < c; i++) {
        p = S.reset();
        at(p, pos, 0.3 * s);
        p.vx = rnd(-0.5, 0.5);
        p.vy = rnd(1, 2) * s;
        p.vz = rnd(-0.5, 0.5);
        p.gravity = -0.5;
        p.drag = 0.8;
        p.life = rnd(1.0, 1.6) * lifeMul;
        p.size0 = 0.4 * s;
        p.size1 = 1.6 * s;
        p.a = 0.35;
        p.shape = PShape.Smoke;
        p.spin = rnd(-0.6, 0.6);
        color(p, 0x2e2a28, 0.15);
        p.delay = 0.15;
        S.emit();
      }
      T.lights.flash(pos, 0xff8a30, 30 * s, 0.4, 12);
      break;
    }
    case 'smoke': {
      for (let i = 0, c = n(10); i < c; i++) {
        p = S.reset();
        at(p, pos, 0.4 * s);
        p.vx = rnd(-0.6, 0.6) * s;
        p.vy = rnd(0.5, 1.4) * s * speedMul;
        p.vz = rnd(-0.6, 0.6) * s;
        p.gravity = -0.3;
        p.drag = 0.9;
        p.life = rnd(1.5, 2.4) * lifeMul;
        p.size0 = 0.5 * s;
        p.size1 = 2.3 * s;
        p.a = 0.45;
        p.shape = PShape.Smoke;
        p.spin = rnd(-0.5, 0.5);
        color(p, col, 0.12);
        S.emit();
      }
      break;
    }
    case 'dust': {
      for (let i = 0, c = n(12); i < c; i++) {
        p = S.reset();
        at(p, pos, 0.2 * s);
        const a = Math.random() * Math.PI * 2;
        const sp = rnd(1.5, 4) * s * speedMul;
        p.vx = Math.cos(a) * sp;
        p.vy = rnd(0.3, 1.2);
        p.vz = Math.sin(a) * sp;
        p.drag = 2.6;
        p.gravity = 0.4;
        p.life = rnd(0.8, 1.4) * lifeMul;
        p.size0 = 0.35 * s;
        p.size1 = 1.5 * s;
        p.a = 0.45;
        p.shape = PShape.Smoke;
        p.floorY = pos.y;
        p.spin = rnd(-0.8, 0.8);
        color(p, col, 0.12);
        S.emit();
      }
      break;
    }
    case 'impact': {
      for (let i = 0, c = n(12); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.05);
        vel(p, dir ? coneDir(dir, 0.9) : randDir(), rnd(3, 9) * speedMul);
        p.gravity = 8;
        p.drag = 3;
        p.life = rnd(0.15, 0.35) * lifeMul;
        p.size0 = 0.07 * s;
        p.size1 = 0.02;
        p.shape = PShape.Spark;
        p.stretch = 0.04;
        color(p, col, 0.1);
        A.emit();
      }
      p = A.reset();
      at(p, pos);
      p.life = 0.12;
      p.size0 = 0.9 * s;
      p.size1 = 0.2 * s;
      color(p, col, 0, 0xffffff, 0.5);
      A.emit();
      break;
    }
    case 'metalSpark': {
      for (let i = 0, c = n(16); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.04);
        vel(p, dir ? coneDir(dir, 0.7) : randDir(), rnd(5, 11) * speedMul);
        p.gravity = 13;
        p.drag = 1.2;
        p.life = rnd(0.25, 0.55) * lifeMul;
        p.size0 = 0.05 * s;
        p.size1 = 0.015;
        p.shape = PShape.Spark;
        p.stretch = 0.05;
        p.floorY = pos.y - 2;
        color(p, col, 0.12, 0xffe080, Math.random() * 0.5);
        A.emit();
      }
      T.lights.flash(pos, 0xffb060, 12 * s, 0.12, 6);
      break;
    }
    case 'heal': {
      for (let i = 0, c = n(20); i < c; i++) {
        p = A.reset();
        const a = Math.random() * Math.PI * 2;
        const r = rnd(0.1, 0.65) * s;
        p.x = pos.x + Math.cos(a) * r;
        p.y = pos.y + rnd(0, 1.2) * s;
        p.z = pos.z + Math.sin(a) * r;
        p.vy = rnd(1.0, 2.4) * speedMul;
        p.drag = 0.6;
        p.life = rnd(0.8, 1.3) * lifeMul;
        p.size0 = rnd(0.1, 0.18) * s;
        p.size1 = 0.03;
        p.shape = i % 3 === 0 ? PShape.Star : PShape.Glow;
        color(p, col, 0.12, 0xffffff, 0.2);
        A.emit();
      }
      T.rings.ring(pos.x, pos.y + 0.05, pos.z, 0.2, 1.3 * s, 0.6, col, 0.7, RingStyle.Shock, 0.3);
      break;
    }
    case 'levelUp': {
      for (let i = 0, c = n(40); i < c; i++) {
        p = A.reset();
        const a = Math.random() * Math.PI * 2;
        const r = rnd(0.3, 1.1) * s;
        p.x = pos.x + Math.cos(a) * r;
        p.y = pos.y + rnd(0, 0.4);
        p.z = pos.z + Math.sin(a) * r;
        p.vy = rnd(2, 5.5) * speedMul;
        p.drag = 0.9;
        p.life = rnd(0.9, 1.6) * lifeMul;
        p.size0 = rnd(0.12, 0.25) * s;
        p.size1 = 0.03;
        p.shape = i % 2 ? PShape.Star : PShape.Glow;
        p.spin = rnd(-2, 2);
        color(p, col, 0.08, 0xffffff, Math.random() * 0.4);
        A.emit();
      }
      T.rings.ring(pos.x, pos.y + 0.06, pos.z, 2.4 * s, 2.4 * s, 1.6, col, 1, RingStyle.Rune, 0.2, 1.5);
      T.rings.ring(pos.x, pos.y + 0.08, pos.z, 0.3, 4 * s, 0.8, col, 0.9, RingStyle.Shock, 0.2);
      T.rings.shell(pos.x, pos.y + 1, pos.z, 0.4, 2.5 * s, 0.6, col, 0.6);
      T.lights.flash(pos, col, 50, 0.9, 14);
      break;
    }
    case 'teleport': {
      for (let i = 0, c = n(26); i < c; i++) {
        p = A.reset();
        randDir();
        const r = rnd(0.8, 1.5) * s;
        p.x = pos.x + D.x * r;
        p.y = pos.y + 1 + D.y * r;
        p.z = pos.z + D.z * r;
        p.vx = -D.x * r * 3.2;
        p.vy = -D.y * r * 3.2;
        p.vz = -D.z * r * 3.2;
        p.life = 0.3 * lifeMul;
        p.size0 = 0.12 * s;
        p.size1 = 0.05;
        p.shape = PShape.Spark;
        p.stretch = 0.03;
        color(p, col, 0.1, 0xffffff, 0.3);
        A.emit();
      }
      for (let i = 0, c = n(14); i < c; i++) {
        p = A.reset();
        const a = Math.random() * Math.PI * 2;
        p.x = pos.x + Math.cos(a) * 0.45 * s;
        p.y = pos.y + rnd(0, 0.5);
        p.z = pos.z + Math.sin(a) * 0.45 * s;
        p.vy = rnd(4, 9);
        p.drag = 2.5;
        p.life = rnd(0.35, 0.6) * lifeMul;
        p.size0 = 0.1 * s;
        p.size1 = 0.02;
        p.shape = PShape.Spark;
        p.stretch = 0.05;
        color(p, col, 0.1, 0xffffff, 0.2);
        A.emit();
      }
      T.rings.ring(pos.x, pos.y + 0.06, pos.z, 1.5 * s, 0.2, 0.35, col, 1, RingStyle.Shock, 0.35);
      T.rings.shell(pos.x, pos.y + 1, pos.z, 1.2 * s, 0.1, 0.25, col, 0.8);
      T.lights.flash(pos, col, 30, 0.35, 10);
      break;
    }
    case 'shockwave': {
      T.rings.ring(pos.x, pos.y + 0.08, pos.z, 0.5, 6 * s, 0.55, col, 1, RingStyle.Shock, 0.14);
      T.rings.ring(pos.x, pos.y + 0.1, pos.z, 0.3, 4 * s, 0.4, 0xffffff, 0.6, RingStyle.Shock, 0.25);
      for (let i = 0, c = n(16); i < c; i++) {
        p = S.reset();
        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
        p.x = pos.x + Math.cos(a) * 0.8 * s;
        p.y = pos.y + 0.1;
        p.z = pos.z + Math.sin(a) * 0.8 * s;
        const sp = rnd(5, 9) * s * speedMul;
        p.vx = Math.cos(a) * sp;
        p.vy = rnd(0.3, 1);
        p.vz = Math.sin(a) * sp;
        p.drag = 3;
        p.life = rnd(0.7, 1.1) * lifeMul;
        p.size0 = 0.5 * s;
        p.size1 = 1.8 * s;
        p.a = 0.4;
        p.shape = PShape.Smoke;
        p.floorY = pos.y;
        color(p, 0x8a7a62, 0.1);
        S.emit();
      }
      T.lights.flash(pos, col, 35 * s, 0.3, 14);
      break;
    }
    case 'crystalShatter': {
      for (let i = 0, c = n(16); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.2 * s);
        vel(p, dir ? coneDir(dir, 1.0) : randDir(), rnd(3, 8) * s * speedMul);
        p.vy += 2;
        p.gravity = 14;
        p.drag = 0.8;
        p.life = rnd(0.6, 1.0) * lifeMul;
        p.size0 = rnd(0.12, 0.26) * s;
        p.size1 = 0.08 * s;
        p.shape = PShape.Shard;
        p.spin = rnd(-10, 10);
        p.floorY = pos.y - 1.5;
        color(p, col, 0.15, 0xffffff, Math.random() * 0.4);
        A.emit();
      }
      T.rings.shell(pos.x, pos.y, pos.z, 0.2, 1.4 * s, 0.25, col, 0.8);
      T.lights.flash(pos, col, 25 * s, 0.25, 9);
      break;
    }
    case 'void': {
      for (let i = 0, c = n(12); i < c; i++) {
        p = S.reset();
        randDir();
        const r = rnd(0.5, 1.5) * s;
        p.x = pos.x + D.x * r;
        p.y = pos.y + D.y * r * 0.6;
        p.z = pos.z + D.z * r;
        p.vx = -D.x * 1.5;
        p.vy = -D.y * 1.0;
        p.vz = -D.z * 1.5;
        p.drag = 0.5;
        p.life = rnd(0.6, 1.0) * lifeMul;
        p.size0 = 0.9 * s;
        p.size1 = 0.2 * s;
        p.a = 0.6;
        p.shape = PShape.Smoke;
        p.spin = rnd(-2, 2);
        color(p, 0x1a0628, 0.2);
        S.emit();
      }
      for (let i = 0, c = n(14); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.2 * s);
        vel(p, randDir(), rnd(2, 6) * s * speedMul);
        p.drag = 2.5;
        p.life = rnd(0.3, 0.6) * lifeMul;
        p.size0 = 0.18 * s;
        p.size1 = 0.03;
        color(p, col, 0.15, 0xff50d0, Math.random() * 0.3);
        A.emit();
      }
      T.rings.shell(pos.x, pos.y, pos.z, 1.6 * s, 0.2, 0.4, col, 0.7);
      T.lights.flash(pos, col, 25 * s, 0.4, 10);
      break;
    }
    case 'time': {
      T.rings.ring(pos.x, pos.y + 0.06, pos.z, 1.8 * s, 1.8 * s, 1.2 * lifeMul, col, 0.9, RingStyle.Rune, 0.2, -2);
      for (let i = 0, c = n(18); i < c; i++) {
        p = A.reset();
        const a = (i / 18) * Math.PI * 2;
        const r = 1.6 * s;
        p.x = pos.x + Math.cos(a) * r;
        p.y = pos.y + rnd(0.3, 1.6);
        p.z = pos.z + Math.sin(a) * r;
        p.vx = -Math.sin(a) * 1.2;
        p.vy = rnd(-0.1, 0.3);
        p.vz = Math.cos(a) * 1.2;
        p.drag = 0.3;
        p.life = rnd(0.8, 1.4) * lifeMul;
        p.size0 = 0.18 * s;
        p.size1 = 0.04;
        p.shape = PShape.Star;
        p.spin = 1.5;
        color(p, i % 2 ? col : 0xffe0a0, 0.08);
        A.emit();
      }
      break;
    }
    case 'splash': {
      for (let i = 0, c = n(24); i < c; i++) {
        p = S.reset();
        at(p, pos, 0.25 * s);
        const a = Math.random() * Math.PI * 2;
        const sp = rnd(0.5, 2.6) * s;
        p.vx = Math.cos(a) * sp;
        p.vy = rnd(2.5, 6) * s * speedMul;
        p.vz = Math.sin(a) * sp;
        p.gravity = 14;
        p.life = rnd(0.5, 0.9) * lifeMul;
        p.size0 = rnd(0.08, 0.16) * s;
        p.size1 = 0.05;
        p.a = 0.8;
        p.floorY = pos.y - 0.2;
        color(p, col, 0.06);
        S.emit();
      }
      T.rings.ring(pos.x, pos.y + 0.03, pos.z, 0.3, 2 * s, 0.7, 0xdff0ff, 0.6, RingStyle.Shock, 0.25);
      break;
    }
    case 'leaves': {
      for (let i = 0, c = n(10); i < c; i++) {
        p = S.reset();
        at(p, pos, 0.6 * s);
        p.vx = rnd(-1.2, 1.2);
        p.vy = rnd(0.5, 2);
        p.vz = rnd(-1.2, 1.2);
        p.gravity = 2.2;
        p.drag = 1.3;
        p.life = rnd(1.4, 2.2) * lifeMul;
        p.size0 = 0.14 * s;
        p.size1 = 0.12 * s;
        p.a = 0.95;
        p.shape = PShape.Shard;
        p.spin = rnd(-5, 5);
        p.floorY = pos.y - 3;
        color(p, col, 0.2, 0x9a7a2a, Math.random() * 0.5);
        S.emit();
      }
      break;
    }
    case 'pickupGlow': {
      for (let i = 0, c = n(8); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.3 * s);
        p.vy = rnd(0.6, 1.6);
        p.drag = 0.8;
        p.life = rnd(0.7, 1.2) * lifeMul;
        p.size0 = 0.18 * s;
        p.size1 = 0.03;
        p.shape = PShape.Star;
        p.spin = rnd(-2, 2);
        color(p, col, 0.1, 0xffffff, 0.3);
        A.emit();
      }
      T.rings.ring(pos.x, pos.y + 0.05, pos.z, 0.2, 0.9 * s, 0.5, col, 0.6, RingStyle.Shock, 0.3);
      break;
    }
    case 'corruption': {
      for (let i = 0, c = n(8); i < c; i++) {
        p = S.reset();
        at(p, pos, 0.5 * s);
        p.vx = rnd(-0.4, 0.4);
        p.vy = rnd(0.4, 1.2);
        p.vz = rnd(-0.4, 0.4);
        p.gravity = -0.3;
        p.drag = 0.8;
        p.life = rnd(1.2, 2) * lifeMul;
        p.size0 = 0.5 * s;
        p.size1 = 1.6 * s;
        p.a = 0.5;
        p.shape = PShape.Smoke;
        color(p, 0x20082c, 0.2);
        S.emit();
      }
      for (let i = 0, c = n(10); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.5 * s);
        p.vy = rnd(0.5, 2);
        p.vx = rnd(-0.6, 0.6);
        p.vz = rnd(-0.6, 0.6);
        p.drag = 1;
        p.life = rnd(0.6, 1.2) * lifeMul;
        p.size0 = 0.14 * s;
        p.size1 = 0.03;
        color(p, col, 0.2);
        A.emit();
      }
      break;
    }
    case 'blockSpark': {
      for (let i = 0, c = n(18); i < c; i++) {
        p = A.reset();
        at(p, pos, 0.05);
        vel(p, dir ? coneDir(dir, 0.75) : randDir(), rnd(6, 13) * speedMul);
        p.gravity = 11;
        p.drag = 1.8;
        p.life = rnd(0.2, 0.45) * lifeMul;
        p.size0 = 0.06 * s;
        p.size1 = 0.015;
        p.shape = PShape.Spark;
        p.stretch = 0.05;
        p.floorY = pos.y - 2;
        color(p, col, 0.08, 0xffc040, Math.random() * 0.5);
        A.emit();
      }
      p = A.reset();
      at(p, pos);
      p.life = 0.14;
      p.size0 = 1.3 * s;
      p.size1 = 0.4 * s;
      p.shape = PShape.Star;
      color(p, col, 0, 0xffffff, 0.6);
      A.emit();
      T.lights.flash(pos, 0xffe0a0, 25 * s, 0.18, 8);
      break;
    }
    case 'deathDissolve': {
      const h = Math.max(0.5, s * 1.8);
      for (let i = 0, c = n(30); i < c; i++) {
        p = A.reset();
        const a = Math.random() * Math.PI * 2;
        const r = rnd(0, 0.5) * Math.max(0.6, s * 0.6);
        p.x = pos.x + Math.cos(a) * r;
        p.y = pos.y + rnd(0, h);
        p.z = pos.z + Math.sin(a) * r;
        p.vx = rnd(-0.3, 0.3);
        p.vy = rnd(0.8, 2.2) * speedMul;
        p.vz = rnd(-0.3, 0.3);
        p.gravity = -0.6;
        p.drag = 0.7;
        p.life = rnd(0.9, 1.6) * lifeMul;
        p.size0 = rnd(0.08, 0.16) * Math.max(0.7, s * 0.7);
        p.size1 = 0.02;
        p.delay = Math.random() * 0.6;
        color(p, col, 0.15, 0xffffff, Math.random() * 0.3);
        A.emit();
      }
      for (let i = 0, c = n(6); i < c; i++) {
        p = S.reset();
        at(p, pos, 0.4);
        p.y = pos.y + rnd(0.2, h * 0.7);
        p.vy = rnd(0.3, 0.8);
        p.drag = 0.6;
        p.gravity = -0.2;
        p.life = rnd(1.2, 1.8) * lifeMul;
        p.size0 = 0.5;
        p.size1 = 1.6;
        p.a = 0.3;
        p.shape = PShape.Smoke;
        p.delay = Math.random() * 0.5;
        color(p, 0x302838, 0.2);
        S.emit();
      }
      break;
    }
  }
}
