import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import type { Interactable } from '../../core/Interaction';
import { HERB_RULES, HERB_SPOTS, rollQty, type HerbSpot } from '../../data/loot';
import { ITEMS } from '../../data/items';
import { MISC_XP } from '../../data/progression';
import { LOCATION_BY_ID, WATER_LEVEL } from '../../data/world';
import { GLOBAL_UNIFORMS } from '../../core/uniforms';
import { getHerbKit } from './meshes';
import type { Inventory } from '../Inventory';

interface HerbRuntime {
  spot: HerbSpot;
  pos: THREE.Vector3;
  /** Dia de jogo em que foi colhida (0 = disponível desde o início). */
  harvestedDay: number;
  available: boolean;
  valid: boolean;
  yaw: number;
  scale: number;
  interactable: Interactable;
}

/**
 * Ervas-lúmen colhíveis na Floresta de Lúmen. Renascem a cada dia de jogo.
 * Duas InstancedMesh (folhas + bulbos luminosos que brilham mais à noite).
 */
export class HerbField {
  readonly herbs: HerbRuntime[] = [];
  private leaves!: THREE.InstancedMesh;
  private bulbs!: THREE.InstancedMesh;
  private built = false;
  private frame = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private bulbBase = new THREE.Color(0x9bff8a);

  constructor(private ctx: GameContext, private inv: Inventory) {
    for (const spot of HERB_SPOTS) {
      const h: HerbRuntime = {
        spot,
        pos: new THREE.Vector3(spot.x, 0, spot.z),
        harvestedDay: 0,
        available: true,
        valid: true,
        yaw: hash(spot.x * 13.1 + spot.z * 7.7) * Math.PI * 2,
        scale: 0.85 + hash(spot.x * 3.3 - spot.z) * 0.4,
        interactable: null as unknown as Interactable,
      };
      h.interactable = {
        id: `erva:${spot.id}`,
        kind: 'use',
        prompt: `Colher ${ITEMS[HERB_RULES.itemId]?.name ?? 'erva'}`,
        position: h.pos,
        range: HERB_RULES.interactRange,
        enabled: true,
        priority: 1,
        interact: () => this.harvest(h),
      };
      this.herbs.push(h);
    }
  }

  build() {
    if (this.built) return;
    this.built = true;
    const kit = getHerbKit();
    const n = this.herbs.length;
    this.leaves = new THREE.InstancedMesh(kit.leaves, kit.leafMat, n);
    this.bulbs = new THREE.InstancedMesh(kit.bulbs, kit.bulbMat, n);
    this.leaves.name = 'ervas-folhas';
    this.bulbs.name = 'ervas-bulbos';
    this.leaves.receiveShadow = true;
    const hf = this.ctx.heightfield;
    for (const h of this.herbs) {
      const ground = hf.heightAt(h.spot.x, h.spot.z);
      h.valid = ground > WATER_LEVEL + 0.25;
      h.pos.set(h.spot.x, this.ctx.physics.groundHeight(h.spot.x, h.spot.z, ground + 1.2), h.spot.z);
      this.ctx.sys.interaction.register(h.interactable);
    }
    this.ctx.scene.add(this.leaves, this.bulbs);
    this.refreshAvailability();
  }

  /** Recalcula disponibilidade (dia de jogo) e matrizes. */
  refreshAvailability() {
    const day = this.ctx.clock.day;
    for (const h of this.herbs) {
      h.available = h.valid && (h.harvestedDay <= 0 || day >= h.harvestedDay + HERB_RULES.regrowDays);
      h.interactable.enabled = h.available;
    }
    if (this.built) this.writeMatrices();
  }

  private writeMatrices() {
    for (let i = 0; i < this.herbs.length; i++) {
      const h = this.herbs[i];
      const k = h.available ? h.scale : 0;
      this.e.set(0, h.yaw, 0);
      this.q.setFromEuler(this.e);
      this.s.set(k, k, k);
      this.m.compose(h.pos, this.q, this.s);
      this.leaves.setMatrixAt(i, this.m);
      this.bulbs.setMatrixAt(i, this.m);
    }
    this.leaves.instanceMatrix.needsUpdate = true;
    this.bulbs.instanceMatrix.needsUpdate = true;
    this.leaves.computeBoundingSphere();
    this.bulbs.computeBoundingSphere();
  }

  harvest(h: HerbRuntime): boolean {
    if (!h.available) return false;
    const qty = rollQty(HERB_RULES.qty, Math.random);
    const added = this.inv.tryAdd(HERB_RULES.itemId, qty);
    if (added <= 0) {
      this.ctx.events.emit('ui:notify', { text: 'Inventário cheio.', kind: 'warning' });
      this.ctx.sys.audio.play('ui_error');
      return false;
    }
    h.available = false;
    h.harvestedDay = this.ctx.clock.day;
    h.interactable.enabled = false;
    this.writeMatrices();
    this.ctx.sys.player.playAnimation?.('interact');
    this.tmp.copy(h.pos).setY(h.pos.y + 0.4);
    this.ctx.sys.vfx.burst('leaves', this.tmp, { count: 10, scale: 0.6, color: 0x9bff8a });
    this.ctx.events.emit('ui:notify', { text: `${ITEMS[HERB_RULES.itemId].name} ×${added}`, kind: 'loot' });
    this.ctx.events.emit('herb:harvested', { spotId: h.spot.id, itemId: HERB_RULES.itemId, qty: added });
    this.ctx.sys.progression.addXp(MISC_XP.herbHarvested, 'erva');
    return true;
  }

  /** Colhe por id (scripts/testes). */
  harvestById(id: string): boolean {
    const h = this.herbs.find((x) => x.spot.id === id);
    return h ? this.harvest(h) : false;
  }

  update(_dt: number, ctx: GameContext) {
    if (!this.built) return;
    this.frame++;
    const night = GLOBAL_UNIFORMS.uNight.value;
    // brilho dos bulbos (um material compartilhado)
    const k = 0.55 + night * 1.1;
    (this.bulbs.material as THREE.MeshBasicMaterial).color.setRGB(this.bulbBase.r * k, this.bulbBase.g * k, this.bulbBase.b * k);
    const pp = ctx.sys.player.position;
    const cam = ctx.camera ? ctx.camera.position : pp;
    if (this.frame % 20 === 0) {
      const f = LOCATION_BY_ID['floresta_lumen'];
      const dx = cam.x - (f?.x ?? 0);
      const dz = cam.z - (f?.z ?? 0);
      const near = dx * dx + dz * dz < ((f?.radius ?? 300) + HERB_RULES.visibleDistance) ** 2;
      this.leaves.visible = this.bulbs.visible = near;
      // renascimento ao virar o dia
      const day = ctx.clock.day;
      let changed = false;
      for (const h of this.herbs) {
        if (!h.available && h.valid && day >= h.harvestedDay + HERB_RULES.regrowDays) {
          h.available = true;
          h.interactable.enabled = true;
          changed = true;
        }
      }
      if (changed) this.writeMatrices();
    }
    // centelhas à noite nas ervas próximas
    if (night > 0.3 && this.leaves.visible && this.frame % 6 === 0) {
      for (const h of this.herbs) {
        if (!h.available) continue;
        const dx = h.pos.x - pp.x;
        const dz = h.pos.z - pp.z;
        if (dx * dx + dz * dz > 900) continue;
        this.tmp.copy(h.pos).setY(h.pos.y + 0.45 * h.scale);
        ctx.sys.vfx.spark(this.tmp, 0x9bff8a, 0.12, 1.2, (Math.random() - 0.5) * 0.2, 0.35, (Math.random() - 0.5) * 0.2);
      }
    }
  }

  serialize(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const h of this.herbs) if (h.harvestedDay > 0) out[h.spot.id] = h.harvestedDay;
    return out;
  }

  deserialize(data: unknown) {
    const d = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
    for (const h of this.herbs) {
      const v = d[h.spot.id];
      h.harvestedDay = typeof v === 'number' && isFinite(v) && v > 0 ? Math.floor(v) : 0;
    }
    this.refreshAvailability();
  }

  reset() {
    for (const h of this.herbs) h.harvestedDay = 0;
    this.refreshAvailability();
  }
}

function hash(n: number) {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}
