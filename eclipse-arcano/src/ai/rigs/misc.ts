import * as THREE from 'three';
import { cachedGeometry } from './parts';
import { easeOut, type AnimInput, type Rig } from './anim';

/**
 * Rigs simples: pilar de cristal (fase 2 do Guardião) e espírito da floresta (orbe com fagulhas).
 */
export class PillarRig implements Rig {
  readonly root = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  private crystal = new THREE.Group();
  private ring = new THREE.Group();
  /** 0 = enterrado, 1 = erguido. */
  rise = 0;

  constructor(material: THREE.Material) {
    const base = cachedGeometry('p:base', (b) => {
      b.cyl(1.3, 1.6, 0.7, 0x4a4e58, { y: 0.35 }, 10);
      b.torus(1.25, 0.08, 0x58d8ff, { y: 0.72, rx: Math.PI / 2, glow: 1.6 }, 20);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        b.box(0.3, 0.9, 0.3, 0x5a5e68, { x: Math.cos(a) * 1.35, y: 0.6, z: Math.sin(a) * 1.35, ry: -a });
      }
    });
    const crystal = cachedGeometry('p:crystal', (b) => {
      b.gem(0.9, 0x8ff4ff, { y: 2.6, sy: 3.2, glow: 1.5 });
      b.gem(0.45, 0x6fe0ff, { x: 0.55, y: 1.4, sy: 2.2, rz: -0.35, glow: 1.3 });
      b.gem(0.4, 0x6fe0ff, { x: -0.5, y: 1.3, z: 0.2, sy: 2, rz: 0.4, glow: 1.3 });
      b.gem(0.35, 0x9ff8ff, { z: -0.5, y: 1.2, sy: 1.8, rx: -0.4, glow: 1.3 });
    });
    const ring = cachedGeometry('p:ring', (b) => {
      b.torus(1.0, 0.05, 0x7ff8ff, { rx: Math.PI / 2, glow: 2.2 }, 18);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.box(0.16, 0.16, 0.04, 0xbff8ff, { x: Math.cos(a) * 1.0, z: Math.sin(a) * 1.0, ry: -a, glow: 2.4 });
      }
    });
    const add = (g: THREE.BufferGeometry | null, parent: THREE.Object3D) => {
      if (!g) return;
      const m = new THREE.Mesh(g, material);
      m.castShadow = true;
      parent.add(m);
      this.meshes.push(m);
    };
    add(base, this.root);
    add(crystal, this.crystal);
    add(ring, this.ring);
    this.root.add(this.crystal);
    this.crystal.add(this.ring);
    this.ring.position.y = 3.2;
  }

  setShadows(on: boolean) {
    for (const m of this.meshes) m.castShadow = on;
  }

  muzzle(out: THREE.Vector3): THREE.Vector3 {
    this.ring.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.ring.matrixWorld);
  }

  update(dt: number, a: AnimInput) {
    const r = easeOut(Math.min(1, this.rise));
    this.crystal.position.y = -4.6 * (1 - r) + Math.sin(a.time * 1.3) * 0.08;
    this.crystal.rotation.y += dt * 0.35;
    this.ring.rotation.y -= dt * 1.4;
    this.ring.position.y = 3.2 + Math.sin(a.time * 2.1) * 0.25;
    this.crystal.rotation.z = a.hit * 0.06 * Math.sin(a.time * 40);
    if (a.dead > 0) this.crystal.position.y -= a.dead * 3;
  }
}

/** Espírito da floresta: núcleo luminoso com três fagulhas orbitando e cauda. */
export class SpiritRig implements Rig {
  readonly root = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  private core = new THREE.Group();
  private wisps: THREE.Group[] = [];
  private phase = Math.random() * 10;

  constructor(material: THREE.Material) {
    const coreG = cachedGeometry('sp:core', (b) => {
      b.sphere(0.16, 0xd8ffe8, { glow: 2.6 }, 10, 8);
      b.sphere(0.24, 0x7fffc8, { glow: 0.9, sy: 1.25 }, 10, 8);
      b.cone(0.1, 0.45, 0x8fffd0, { y: -0.32, rx: Math.PI, glow: 1.4 }, 6);
    });
    const wispG = cachedGeometry('sp:wisp', (b) => b.sphere(0.05, 0xc8fff0, { glow: 2.8 }, 6, 4));
    if (coreG) {
      const m = new THREE.Mesh(coreG, material);
      this.core.add(m);
      this.meshes.push(m);
    }
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Group();
      if (wispG) {
        const m = new THREE.Mesh(wispG, material);
        w.add(m);
        this.meshes.push(m);
      }
      this.core.add(w);
      this.wisps.push(w);
    }
    this.root.add(this.core);
    this.core.position.y = 1.4;
  }

  setShadows(_on: boolean) {
    for (const m of this.meshes) m.castShadow = false;
  }

  muzzle(out: THREE.Vector3): THREE.Vector3 {
    this.core.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(this.core.matrixWorld);
  }

  update(dt: number, a: AnimInput) {
    this.phase += dt;
    const t = this.phase;
    this.core.position.y = 1.4 + Math.sin(t * 1.7) * 0.18;
    this.core.rotation.z = -a.localX * 0.3;
    for (let i = 0; i < 3; i++) {
      const ang = t * (1.6 + i * 0.4) + (i * Math.PI * 2) / 3;
      const r = 0.42 + Math.sin(t * 2 + i) * 0.08;
      this.wisps[i].position.set(Math.cos(ang) * r, Math.sin(t * 2.3 + i * 2) * 0.22, Math.sin(ang) * r);
    }
    const s = a.dead > 0 ? Math.max(0.01, 1 - a.dead) : 1 + Math.sin(t * 3) * 0.05;
    this.core.scale.setScalar(s);
  }
}
