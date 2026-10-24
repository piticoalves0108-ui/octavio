/**
 * Cogumelos para colher: pontos sorteados (de forma fixa) nas florestas e no pântano, à
 * sombra das árvores. [E] colhe; renascem depois de FORAGE.regrowDays dias de jogo.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GameContext } from '../core/context';
import type { Interactable } from '../core/Interaction';
import { FORAGE } from '../data/interactive';
import { ITEMS } from '../data/items';
import { WATER_LEVEL, WORLD_HALF } from '../data/world';

interface Spot {
  pos: THREE.Vector3;
  yaw: number;
  scale: number;
  harvestedDay: number;
  available: boolean;
  interactable: Interactable;
}

export class ForageField {
  readonly spots: Spot[] = [];
  private mesh: THREE.InstancedMesh | null = null;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private up = new THREE.Vector3(0, 1, 0);

  constructor(private ctx: GameContext) {}

  build() {
    const hf = this.ctx.heightfield;
    const maps = this.ctx.sys.world.maps;
    // sorteio fixo (mesmo mundo em todo jogo)
    let seed = 0x51a7e;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    let tries = 0;
    const lim = WORLD_HALF - 40;
    while (this.spots.length < FORAGE.spots && tries < 40000) {
      tries++;
      const x = (rnd() * 2 - 1) * lim;
      const z = (rnd() * 2 - 1) * lim;
      const b = hf.biomeAt(x, z);
      if (b !== 'forest' && b !== 'swamp') continue;
      const h = hf.heightAt(x, z);
      if (h < WATER_LEVEL + 0.4 || hf.slopeAt(x, z) > 20) continue;
      if (maps?.blockedAt(x, z)) continue;
      const sp: Spot = {
        pos: new THREE.Vector3(x, h, z),
        yaw: rnd() * Math.PI * 2,
        scale: 0.8 + rnd() * 0.5,
        harvestedDay: 0,
        available: true,
        interactable: null as unknown as Interactable,
      };
      sp.interactable = {
        id: `cogumelo:${this.spots.length}`,
        kind: 'pickup',
        prompt: `Colher ${ITEMS.cogumelo?.name ?? 'cogumelo'}`,
        position: sp.pos,
        range: FORAGE.interactRange,
        enabled: true,
        priority: 1,
        interact: () => this.harvest(sp),
      };
      this.ctx.sys.interaction.register(sp.interactable);
      this.spots.push(sp);
    }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    this.mesh = new THREE.InstancedMesh(mushroomGeometry(), mat, Math.max(1, this.spots.length));
    this.mesh.name = 'cogumelos';
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.ctx.scene.add(this.mesh);
    this.refresh();
  }

  /** Recalcula o que já renasceu (chamar de vez em quando). */
  refresh() {
    const day = this.ctx.clock.day;
    for (const sp of this.spots) {
      sp.available = sp.harvestedDay <= 0 || day >= sp.harvestedDay + FORAGE.regrowDays;
      sp.interactable.enabled = sp.available;
    }
    this.write();
  }

  private write() {
    if (!this.mesh) return;
    for (let i = 0; i < this.spots.length; i++) {
      const sp = this.spots[i];
      this.q.setFromAxisAngle(this.up, sp.yaw);
      this.s.setScalar(sp.available ? sp.scale : 0);
      this.m.compose(sp.pos, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.computeBoundingSphere();
  }

  harvest(sp: Spot): boolean {
    if (!sp.available) return false;
    const qty = 1 + (Math.random() < 0.35 ? 1 : 0);
    const added = this.ctx.sys.inventory.tryAdd('cogumelo', qty);
    if (added <= 0) {
      this.ctx.sys.ui.notify('Inventário cheio.', 'warning');
      this.ctx.sys.audio.play('ui_error');
      return false;
    }
    sp.available = false;
    sp.harvestedDay = this.ctx.clock.day;
    sp.interactable.enabled = false;
    this.write();
    this.ctx.sys.player.playAnimation?.('interact');
    this.ctx.sys.vfx.burst('leaves', sp.pos, { count: 8, scale: 0.5, color: 0xc8603a });
    this.ctx.sys.audio.play('pickup', { position: sp.pos });
    return true;
  }

  serialize() {
    const out: [number, number][] = [];
    this.spots.forEach((sp, i) => {
      if (sp.harvestedDay > 0) out.push([i, sp.harvestedDay]);
    });
    return out;
  }

  deserialize(data: unknown) {
    for (const sp of this.spots) sp.harvestedDay = 0;
    if (Array.isArray(data)) {
      for (const e of data) {
        if (!Array.isArray(e)) continue;
        const sp = this.spots[Number(e[0])];
        const d = Number(e[1]);
        if (sp && isFinite(d)) sp.harvestedDay = d;
      }
    }
    this.refresh();
  }

  reset() {
    for (const sp of this.spots) sp.harvestedDay = 0;
    this.refresh();
  }
}

function mushroomGeometry(): THREE.BufferGeometry {
  const col = (g: THREE.BufferGeometry, fn: (y: number, i: number) => [number, number, number]) => {
    const p = g.getAttribute('position');
    const c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const [r, gg, b] = fn(p.getY(i), i);
      c[i * 3] = r;
      c[i * 3 + 1] = gg;
      c[i * 3 + 2] = b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  };
  const parts: THREE.BufferGeometry[] = [];
  const one = (x: number, z: number, s: number) => {
    const stem = new THREE.CylinderGeometry(0.035 * s, 0.05 * s, 0.16 * s, 7).toNonIndexed().translate(x, 0.08 * s, z);
    parts.push(col(stem, () => [0.92, 0.88, 0.78]));
    const cap = new THREE.SphereGeometry(0.11 * s, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2).toNonIndexed().scale(1, 0.7, 1).translate(x, 0.15 * s, z);
    parts.push(col(cap, (_y, i) => (i % 11 === 0 ? [1, 0.95, 0.85] : [0.78, 0.33, 0.2])));
  };
  one(0, 0, 1.2);
  one(0.13, 0.07, 0.8);
  one(-0.09, 0.11, 0.65);
  const g = mergeGeometries(parts)!;
  g.computeVertexNormals();
  return g;
}
