import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import type { Interactable } from '../../core/Interaction';
import { PICKUP_RULES } from '../../data/loot';
import { ITEMS } from '../../data/items';
import { RARITIES } from '../../data/weapons';
import { getPickupKit } from './meshes';
import type { Inventory } from '../Inventory';

/** Estado salvo de um item solto. */
export interface PickupSave {
  defId: string | null;
  qty: number;
  x: number;
  y: number;
  z: number;
  age: number;
}

interface Slot {
  active: boolean;
  /** null = ouro. */
  defId: string | null;
  qty: number;
  pos: THREE.Vector3;
  groundY: number;
  vy: number;
  age: number;
  life: number;
  color: number;
  /** Puxado pelo ímã. */
  pulled: boolean;
  spin: number;
  interactable: Interactable;
  registered: boolean;
}

/**
 * Itens e ouro soltos no chão (saque de inimigos e excesso do inventário cheio).
 * Pool fixo, 2 InstancedMesh (gemas coloridas pela raridade e moedas), brilho por
 * sprite da VFX, ímã que puxa até o jogador e coleta automática. Sem alocação por quadro.
 */
export class PickupField {
  readonly slots: Slot[] = [];
  private gems!: THREE.InstancedMesh;
  private coins!: THREE.InstancedMesh;
  private built = false;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3(1, 1, 1);
  private p = new THREE.Vector3();
  private c = new THREE.Color();
  private center = new THREE.Vector3();
  private lastFullWarn = -1e9;
  /** Estatísticas (testes). */
  readonly stats = { spawned: 0, collected: 0, despawned: 0, evicted: 0 };

  constructor(private ctx: GameContext, private inv: Inventory) {
    const cap = PICKUP_RULES.maxActive;
    for (let i = 0; i < cap; i++) {
      const slot: Slot = {
        active: false,
        defId: null,
        qty: 0,
        pos: new THREE.Vector3(),
        groundY: 0,
        vy: 0,
        age: 0,
        life: Infinity,
        color: 0xffffff,
        pulled: false,
        spin: 0,
        registered: false,
        interactable: null as unknown as Interactable,
      };
      slot.interactable = {
        id: `saque:${i}`,
        kind: 'pickup',
        prompt: 'Pegar',
        position: slot.pos,
        range: PICKUP_RULES.interactRange,
        enabled: false,
        priority: 1,
        interact: () => this.collect(slot, true),
      };
      this.slots.push(slot);
    }
  }

  build() {
    if (this.built) return;
    this.built = true;
    const kit = getPickupKit();
    const cap = PICKUP_RULES.maxActive;
    this.gems = new THREE.InstancedMesh(kit.gem, kit.mat, cap);
    this.gems.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.gems.count = 0;
    this.gems.frustumCulled = false;
    this.gems.name = 'saque-gemas';
    this.coins = new THREE.InstancedMesh(kit.coin, kit.coinMat, cap);
    this.coins.count = 0;
    this.coins.frustumCulled = false;
    this.coins.name = 'saque-moedas';
    this.ctx.scene.add(this.gems, this.coins);
  }

  activeCount(): number {
    let n = 0;
    for (const s of this.slots) if (s.active) n++;
    return n;
  }

  /** Solta `qty` de um item (ou ouro, com defId null) perto de (x,y,z). */
  spawn(defId: string | null, qty: number, x: number, y: number, z: number, opts: { scatter?: number; age?: number } = {}): boolean {
    if (!(qty > 0)) return false;
    if (defId !== null && !ITEMS[defId]) return false;
    let slot = this.slots.find((s) => !s.active);
    if (!slot) {
      // despeja o item comum mais antigo (raros nunca são descartados)
      let oldest: Slot | null = null;
      for (const s of this.slots) if (s.life !== Infinity && (!oldest || s.age > oldest.age)) oldest = s;
      if (!oldest) return false;
      this.deactivate(oldest);
      this.stats.evicted++;
      slot = oldest;
    }
    const sc = opts.scatter ?? PICKUP_RULES.scatter;
    const a = Math.random() * Math.PI * 2;
    const r = sc * Math.sqrt(Math.random());
    const px = x + Math.cos(a) * r;
    const pz = z + Math.sin(a) * r;
    const phys = this.ctx.physics;
    let g = phys.groundHeight(px, pz, y + 2);
    if (!isFinite(g) || g < y - 60) g = this.ctx.heightfield.heightAt(px, pz);
    const water = phys.waterSurface?.(px, pz);
    if (water !== null && water !== undefined && water > g) g = water;
    slot.active = true;
    slot.defId = defId;
    slot.qty = Math.floor(qty);
    slot.groundY = g;
    slot.pos.set(px, Math.max(y, g) + 0.6, pz);
    slot.vy = 3 + Math.random() * 1.5;
    slot.age = opts.age ?? 0;
    slot.pulled = false;
    slot.spin = Math.random() * 6;
    const def = defId ? ITEMS[defId] : null;
    const rarity = def ? RARITIES[def.rarity] : null;
    slot.color = def ? rarity!.color : 0xffc94a;
    // ouro e itens comuns/incomuns somem; raros ou melhores ficam (e são salvos)
    slot.life = !def || rarity!.order <= 1 ? PICKUP_RULES.despawnSeconds : Infinity;
    slot.interactable.prompt = def ? `Pegar ${def.name}${slot.qty > 1 ? ` ×${slot.qty}` : ''}` : `Pegar ${slot.qty} de ouro`;
    slot.interactable.enabled = true;
    if (!slot.registered) {
      this.ctx.sys.interaction.register(slot.interactable);
      slot.registered = true;
    }
    this.stats.spawned++;
    return true;
  }

  private deactivate(s: Slot) {
    s.active = false;
    s.interactable.enabled = false;
    if (s.registered) {
      this.ctx.sys.interaction.unregister(s.interactable.id);
      s.registered = false;
    }
  }

  /** Tenta coletar (automático pelo ímã ou [E]). */
  collect(s: Slot, manual: boolean): boolean {
    if (!s.active) return false;
    const inv = this.inv;
    if (s.defId === null) {
      inv.addGold(s.qty);
      this.ctx.events.emit('ui:notify', { text: `+${s.qty} de ouro`, kind: 'loot' });
      this.stats.collected++;
      this.deactivate(s);
      return true;
    }
    const added = inv.tryAdd(s.defId, s.qty);
    if (added <= 0) {
      if (manual || this.ctx.elapsed - this.lastFullWarn > 6) {
        this.lastFullWarn = this.ctx.elapsed;
        this.ctx.events.emit('ui:notify', { text: 'Inventário cheio.', kind: 'warning' });
        if (manual) this.ctx.sys.audio.play('ui_error');
      }
      s.pulled = false;
      return false;
    }
    s.qty -= added;
    this.stats.collected++;
    if (s.qty <= 0) this.deactivate(s);
    else {
      const def = ITEMS[s.defId];
      s.interactable.prompt = `Pegar ${def.name}${s.qty > 1 ? ` ×${s.qty}` : ''}`;
    }
    return true;
  }

  clear() {
    for (const s of this.slots) if (s.active) this.deactivate(s);
    if (this.built) {
      this.gems.count = 0;
      this.coins.count = 0;
    }
  }

  update(dt: number, ctx: GameContext) {
    if (!this.built) return;
    const player = ctx.sys.player;
    const pp = player.position;
    const alive = player.health?.alive !== false && player.state !== 'dead';
    const center = this.center.copy(pp).setY(pp.y + 1.0);
    const vfx = ctx.sys.vfx;
    const t = ctx.elapsed;
    let gi = 0;
    let ci = 0;
    const R = PICKUP_RULES;
    for (const s of this.slots) {
      if (!s.active) continue;
      s.age += dt;
      if (s.age > s.life) {
        this.deactivate(s);
        this.stats.despawned++;
        continue;
      }
      const dx = center.x - s.pos.x;
      const dy = center.y - s.pos.y;
      const dz = center.z - s.pos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (alive && s.age > R.settleTime && d2 < R.magnetRadius * R.magnetRadius) {
        if (!s.pulled) s.pulled = s.defId === null || this.inv.spaceFor(s.defId) > 0;
      } else if (d2 > R.magnetRadius * R.magnetRadius * 2.5) s.pulled = false;
      if (s.pulled) {
        const d = Math.sqrt(d2);
        if (d < R.collectRadius) {
          if (this.collect(s, false) && !s.active) continue;
        } else {
          const step = Math.min(d, R.magnetSpeed * (1 + (R.magnetRadius - Math.min(d, R.magnetRadius)) / R.magnetRadius) * dt);
          s.pos.x += (dx / d) * step;
          s.pos.y += (dy / d) * step;
          s.pos.z += (dz / d) * step;
        }
      } else {
        // queda e flutuação
        const rest = s.groundY + R.hover;
        if (s.vy !== 0 || s.pos.y > rest + 0.001) {
          s.vy -= 14 * dt;
          s.pos.y += s.vy * dt;
          if (s.pos.y <= rest) {
            s.pos.y = rest;
            s.vy = 0;
          }
        } else if (s.pos.y < rest) s.pos.y = rest;
      }
      s.spin += dt * 1.8;
      const bob = s.pulled ? 0 : Math.sin(t * 2.6 + s.spin) * 0.06;
      this.p.copy(s.pos).setY(s.pos.y + bob);
      this.e.set(0, s.spin, s.defId === null ? 0.25 : 0);
      this.q.setFromEuler(this.e);
      this.m.compose(this.p, this.q, this.s);
      if (s.defId === null) {
        this.coins.setMatrixAt(ci++, this.m);
      } else {
        this.gems.setMatrixAt(gi, this.m);
        this.c.setHex(s.color);
        this.gems.setColorAt(gi, this.c);
        gi++;
      }
      // brilho (sprite válido só neste quadro)
      if (d2 < 3600) vfx.sprite(this.p, s.defId === null ? 0.55 : 0.8, s.color, 0.55 + 0.2 * Math.sin(t * 4 + s.spin));
    }
    this.gems.count = gi;
    this.coins.count = ci;
    if (gi > 0) {
      this.gems.instanceMatrix.needsUpdate = true;
      if (this.gems.instanceColor) this.gems.instanceColor.needsUpdate = true;
    }
    if (ci > 0) this.coins.instanceMatrix.needsUpdate = true;
    this.gems.visible = gi > 0;
    this.coins.visible = ci > 0;
  }

  serialize(): PickupSave[] {
    const out: PickupSave[] = [];
    for (const s of this.slots) {
      if (!s.active) continue;
      out.push({ defId: s.defId, qty: s.qty, x: round(s.pos.x), y: round(s.groundY), z: round(s.pos.z), age: Math.round(s.age) });
    }
    return out;
  }

  deserialize(list: unknown) {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const r of list.slice(0, PICKUP_RULES.maxActive)) {
      if (!r || typeof r !== 'object') continue;
      const o = r as Record<string, unknown>;
      const defId = o.defId === null ? null : typeof o.defId === 'string' && ITEMS[o.defId] ? o.defId : undefined;
      if (defId === undefined) continue;
      const qty = Math.floor(Number(o.qty));
      const x = Number(o.x);
      const y = Number(o.y);
      const z = Number(o.z);
      if (!(qty > 0) || !isFinite(x) || !isFinite(y) || !isFinite(z)) continue;
      const def = defId ? ITEMS[defId] : null;
      const maxQ = def ? (def.stackable ? def.maxStack : 1) : 100000;
      this.spawn(defId, Math.min(qty, maxQ), x, y, z, { scatter: 0, age: Math.max(0, Number(o.age) || 0) });
    }
  }
}

function round(v: number) {
  return Math.round(v * 100) / 100;
}
