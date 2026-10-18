import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import type { Interactable } from '../../core/Interaction';
import { CHESTS, CHEST_RULES, type ChestDef } from '../../data/loot';
import { PLACES } from '../../data/places';
import { ITEMS } from '../../data/items';
import { MISC_XP } from '../../data/progression';
import { buildChestModel, CHEST_D, CHEST_H } from './meshes';
import type { Inventory } from '../Inventory';

interface ChestRuntime {
  def: ChestDef;
  root: THREE.Group;
  lidPivot: THREE.Group;
  rune: THREE.Mesh;
  /** 0 = fechado, 1 = aberto. */
  open: number;
  /** Animando a abertura. */
  opening: boolean;
  interactable: Interactable;
}

/**
 * Baús do mundo: conteúdo fixo (data/loot.ts), um por âncora 'bau' (+ extras em ilhas).
 * Abrir dá itens/ouro/XP, marca o uniqueId em inventory.collectedUniques e o baú fica aberto
 * (não reaparece cheio). Modelos com geometrias/materiais compartilhados; ocultos de longe.
 */
export class ChestField {
  readonly chests: ChestRuntime[] = [];
  readonly group = new THREE.Group();
  private built = false;
  private frame = 0;
  private tmp = new THREE.Vector3();

  constructor(private ctx: GameContext, private inv: Inventory) {
    this.group.name = 'rpg-baus';
  }

  /** Posição final do baú (âncora + deslocamento, assentado no piso). */
  static resolvePosition(ctx: GameContext, def: ChestDef, out: THREE.Vector3): THREE.Vector3 | null {
    const p = PLACES[def.anchor];
    if (!p) return null;
    const off = def.offset ?? [0, 0, 0];
    const x = p.x + off[0];
    const z = p.z + off[2];
    let y: number;
    if (p.y !== undefined) {
      // âncora elevada (ilha, sacada, muro): procura o piso logo abaixo
      const g = ctx.physics.groundHeight(x, z, p.y + 2.5);
      y = Math.abs(g - p.y) < 4 ? g : p.y;
    } else {
      y = ctx.physics.groundHeight(x, z, ctx.heightfield.heightAt(x, z) + 1.6);
    }
    return out.set(x, y + off[1], z);
  }

  build() {
    if (this.built) return;
    this.built = true;
    this.ctx.scene.add(this.group);
    for (const def of CHESTS) {
      const pos = ChestField.resolvePosition(this.ctx, def, this.tmp);
      if (!pos) {
        console.warn(`[Saque] âncora de baú inexistente: ${def.anchor}`);
        continue;
      }
      const { root, lidPivot, rune } = buildChestModel(def.style);
      root.position.copy(pos);
      root.rotation.y = def.yaw ?? PLACES[def.anchor]?.yaw ?? 0;
      root.name = `bau:${def.id}`;
      this.group.add(root);
      const front = new THREE.Vector3(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y));
      const self: ChestRuntime = {
        def,
        root,
        lidPivot,
        rune,
        open: 0,
        opening: false,
        interactable: {
          id: `bau:${def.id}`,
          kind: 'loot',
          prompt: `Abrir ${def.label}`,
          position: new THREE.Vector3(pos.x + front.x * (CHEST_D * 0.5), pos.y + CHEST_H * 0.5, pos.z + front.z * (CHEST_D * 0.5)),
          range: CHEST_RULES.interactRange,
          enabled: true,
          priority: 2,
          interact: () => this.open(self),
        },
      };
      this.chests.push(self);
      this.ctx.sys.interaction.register(self.interactable);
    }
    this.syncCollected();
  }

  /** Reflete inventory.collectedUniques (novo jogo/carregamento): abertos ficam abertos e vazios. */
  syncCollected() {
    for (const c of this.chests) {
      const taken = this.inv.collectedUniques.has(c.def.id);
      c.open = taken ? 1 : 0;
      c.opening = false;
      c.interactable.enabled = !taken;
      this.applyLid(c);
    }
  }

  private applyLid(c: ChestRuntime) {
    const t = c.open;
    const e = 1 - Math.pow(1 - t, 3);
    c.lidPivot.rotation.x = -CHEST_RULES.openAngle * e;
    c.rune.visible = t < 0.999;
  }

  /** Abre o baú (interação [E]). Retorna false se já foi saqueado. */
  open(c: ChestRuntime): boolean {
    const ctx = this.ctx;
    const inv = this.inv;
    if (inv.collectedUniques.has(c.def.id)) return false;
    inv.collectedUniques.add(c.def.id);
    c.interactable.enabled = false;
    c.opening = true;
    const pos = c.root.position;
    ctx.sys.player.playAnimation?.('interact');
    ctx.sys.audio.play('chest_open', { position: pos });
    this.tmp.copy(pos).setY(pos.y + CHEST_H + 0.2);
    ctx.sys.vfx.burst('pickupGlow', this.tmp, { scale: 1.2 });
    // conteúdo
    const names: string[] = [];
    for (const e of c.def.contents) {
      if (!ITEMS[e.itemId]) continue;
      inv.add(e.itemId, e.qty, { silent: true, dropAt: this.tmp });
      names.push(e.qty > 1 ? `${ITEMS[e.itemId].name} ×${e.qty}` : ITEMS[e.itemId].name);
    }
    if (c.def.gold > 0) {
      inv.addGold(c.def.gold);
      names.push(`${c.def.gold} de ouro`);
    }
    ctx.events.emit('ui:notify', { text: `${c.def.label}: ${names.join(', ')}`, kind: 'loot' });
    ctx.sys.progression.addXp(MISC_XP.chestOpened, `bau:${c.def.id}`);
    ctx.events.emit('chest:opened', { chestId: c.def.id, position: c.root.position });
    inv.markChanged();
    return true;
  }

  /** Abre por id (scripts/testes). */
  openById(id: string): boolean {
    const c = this.chests.find((x) => x.def.id === id);
    return c ? this.open(c) : false;
  }

  /** `viewPos`: posição da câmera (visibilidade por distância). */
  update(dt: number, viewPos: THREE.Vector3) {
    if (!this.built) return;
    this.frame++;
    for (const c of this.chests) {
      if (c.opening) {
        c.open = Math.min(1, c.open + dt / CHEST_RULES.openDuration);
        this.applyLid(c);
        if (c.open >= 1) c.opening = false;
      }
    }
    // visibilidade por distância (a cada 15 quadros)
    if (this.frame % 15 === 0) {
      const max2 = CHEST_RULES.visibleDistance * CHEST_RULES.visibleDistance;
      for (const c of this.chests) {
        const dx = c.root.position.x - viewPos.x;
        const dz = c.root.position.z - viewPos.z;
        c.root.visible = dx * dx + dz * dz < max2;
      }
    }
  }
}
