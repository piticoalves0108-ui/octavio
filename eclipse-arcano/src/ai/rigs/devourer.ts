import * as THREE from 'three';
import { cachedGeometry } from './parts';
import type { AnimInput, Rig } from './anim';

/**
 * Devorador de Almas: massa de corrupção pulsante meio afundada no lodo, com olhos
 * espalhados, bocarra que abre ao atacar e oito tentáculos que ondulam.
 */
const TENTACLES = 8;
const SEGS = 6;

export class DevourerRig implements Rig {
  readonly root = new THREE.Group();
  readonly meshes: THREE.Mesh[] = [];
  private body = new THREE.Group();
  private jaw = new THREE.Group();
  private tent: THREE.Object3D[][] = [];
  private t = Math.random() * 10;

  constructor(material: THREE.Material) {
    const bodyG = cachedGeometry('dev:body', (b) => {
      b.sphere(2.6, 0x1c1024, { y: 1.4, sy: 0.75 }, 16, 12);
      b.sphere(1.9, 0x2a1434, { y: 2.6, z: -0.4, sy: 0.8 }, 14, 10);
      // veios brilhantes
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        b.box(0.12, 1.6, 0.06, 0xb040ff, { x: Math.sin(a) * 2.35, y: 1.6, z: Math.cos(a) * 2.35, ry: a, rz: 0.3 * Math.sin(i), glow: 1.6 });
      }
      // olhos
      const eyes: [number, number, number, number][] = [
        [0.9, 2.9, 1.5, 0.28],
        [-0.8, 3.0, 1.4, 0.24],
        [0.1, 3.5, 1.1, 0.34],
        [1.6, 2.2, 1.6, 0.18],
        [-1.7, 2.3, 1.5, 0.2],
        [0.4, 1.8, 2.3, 0.16],
      ];
      for (const [x, y, z, r] of eyes) {
        b.sphere(r * 1.25, 0x0a0410, { x, y, z }, 8, 6);
        b.sphere(r, 0xd8a0ff, { x, y, z: z + r * 0.35, glow: 2.6 }, 8, 6);
      }
      // espinhos de cristal corrompido
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + 0.4;
        b.gem(0.35, 0x9a30ff, { x: Math.sin(a) * 1.6, y: 3.4 + (i % 3) * 0.2, z: Math.cos(a) * 1.2 - 0.6, sy: 2.6, rz: Math.sin(a) * 0.5, rx: -0.4, glow: 1.4 });
      }
    });
    if (bodyG) {
      const m = new THREE.Mesh(bodyG, material);
      m.castShadow = true;
      this.body.add(m);
      this.meshes.push(m);
    }
    const jawG = cachedGeometry('dev:jaw', (b) => {
      b.box(2.4, 0.5, 1.4, 0x12081a, { z: 0.5 });
      for (let i = 0; i < 7; i++) b.cone(0.1, 0.45, 0xe8d8f0, { x: -1 + i * 0.33, y: 0.4, z: 1.1 }, 4);
      b.box(2.0, 0.2, 0.8, 0xff3a80, { y: 0.2, z: 0.4, glow: 1.8 });
    });
    if (jawG) {
      const m = new THREE.Mesh(jawG, material);
      this.jaw.add(m);
      this.meshes.push(m);
    }
    this.jaw.position.set(0, 1.5, 1.7);
    this.body.add(this.jaw);
    this.root.add(this.body);
    for (let k = 0; k < TENTACLES; k++) {
      const chain: THREE.Object3D[] = [];
      let parent: THREE.Object3D = this.root;
      for (let i = 0; i < SEGS; i++) {
        const r = 0.42 * (1 - i / (SEGS + 1)) + 0.08;
        const g = cachedGeometry(`dev:t${i}`, (b) => {
          b.limb(0, 0, 0, 0, 1.1, 0, r, r * 0.8, i % 2 ? 0x2a1434 : 0x1c1024, 0, 7);
          b.cone(r * 0.3, r * 0.8, 0xb040ff, { y: 0.5, z: r * 0.8, rx: 1.2, glow: 1.2 }, 4);
        });
        const o = new THREE.Group();
        if (g) {
          const m = new THREE.Mesh(g, material);
          m.castShadow = true;
          o.add(m);
          this.meshes.push(m);
        }
        if (i === 0) {
          const a = (k / TENTACLES) * Math.PI * 2;
          o.position.set(Math.sin(a) * 2.4, 0.4, Math.cos(a) * 2.4);
          o.rotation.set(0, a, 0);
        } else o.position.y = 1.1;
        parent.add(o);
        parent = o;
        chain.push(o);
      }
      this.tent.push(chain);
    }
  }

  setShadows(on: boolean) {
    for (const m of this.meshes) m.castShadow = on;
  }

  muzzle(out: THREE.Vector3): THREE.Vector3 {
    this.jaw.updateWorldMatrix(true, false);
    return out.set(0, 0.5, 1.2).applyMatrix4(this.jaw.matrixWorld);
  }

  update(dt: number, a: AnimInput) {
    this.t += dt * Math.max(0.2, a.timeScale);
    const t = this.t;
    const alive = 1 - a.dead;
    // respiração
    const breathe = 1 + Math.sin(t * 1.6) * 0.04 + a.hit * 0.08;
    this.body.scale.set(breathe, (1 / breathe) * alive + 0.05, breathe);
    this.body.position.y = -a.dead * 1.8;
    // boca: abre na antecipação, fecha no golpe
    const atk = a.action !== 'none';
    const open = atk ? (a.phase === 0 ? a.phaseT : a.phase === 1 ? 1 - a.phaseT * 0.8 : 0.2) : 0.12 + Math.sin(t * 2.2) * 0.06;
    this.jaw.rotation.x = open * 0.7;
    // tentáculos: ondulam; ao atacar erguem-se e batem
    for (let k = 0; k < this.tent.length; k++) {
      const chain = this.tent[k];
      const ph = k * 0.8;
      const lift = atk && a.phase === 0 ? a.phaseT : atk && a.phase === 1 ? 1 - a.phaseT : 0;
      for (let i = 0; i < chain.length; i++) {
        const o = chain[i];
        const w = Math.sin(t * 1.8 + ph + i * 0.7) * (0.25 + i * 0.05);
        o.rotation.x = (i === 0 ? 0.9 - lift * 0.6 : 0.18 + lift * 0.1) * alive + w * 0.5 + a.dead * 0.4;
        o.rotation.z = Math.cos(t * 1.3 + ph + i) * 0.2;
      }
    }
  }
}
