import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import type { Entity } from '../../core/Entity';
import type { Interactable } from '../../core/Interaction';
import { ENEMIES } from '../../data/enemies';
import { BOSSES } from '../../data/bosses';
import { CREATURES } from '../../data/creatures';
import { PICKUP_RULES, rollDrops, rollGold } from '../../data/loot';
import { SHOPS, SHOP_RULES } from '../../data/shops';
import { PLACES } from '../../data/places';
import { RESPEC } from '../../data/progression';
import { ChestField } from './Chests';
import { PickupField, type PickupSave } from './Pickups';
import { HerbField } from './Herbs';
import { buildChestModel } from './meshes';
import type { Inventory } from '../Inventory';

/** Âncora do baú pessoal (armazenamento) — quarto da taverna. */
export const STASH_ANCHOR = 'taverna_descanso';

/**
 * Saque no mundo: baús, itens soltos, ervas, recompensas de inimigos (contrato C1)
 * e os pontos fixos de interação do rpg (balcões de loja, baú pessoal, santuário).
 * A construção dos modelos é adiada até o primeiro update (mundo já carregado).
 */
export class LootWorld {
  readonly chests: ChestField;
  readonly pickups: PickupField;
  readonly herbs: HerbField;
  private built = false;
  /** Entidades atingidas pelo jogador (crédito de XP/saque mesmo sem o golpe final). */
  private touched = new WeakSet<Entity>();
  /** Já recompensadas (nunca duas vezes). */
  private rewarded = new WeakSet<Entity>();
  private respecArmedUntil = -1;
  private counters: Interactable[] = [];
  private tmp = new THREE.Vector3();
  readonly stats = { kills: 0, xpFromKills: 0, goldDropped: 0, itemsDropped: 0, buildMs: 0 };

  constructor(private ctx: GameContext, private inv: Inventory) {
    this.chests = new ChestField(ctx, inv);
    this.pickups = new PickupField(ctx, inv);
    this.herbs = new HerbField(ctx, inv);
    ctx.events.on('damage', (e) => {
      const src = e.info.source;
      if (src && src.kind === 'player' && e.target !== src) this.touched.add(e.target);
    });
    ctx.events.on('enemy:killed', (e) => this.onKilled(e.entity, e.typeId, e.killer, false));
    ctx.events.on('creature:killed', (e) => this.onKilled(e.entity, e.typeId, undefined, true));
  }

  /** Constrói modelos e interagíveis fixos (uma vez). */
  build() {
    if (this.built) return;
    this.built = true;
    const t0 = performance.now();
    this.chests.build();
    this.pickups.build();
    this.herbs.build();
    this.buildCounters();
    this.stats.buildMs = performance.now() - t0;
  }

  private buildCounters() {
    const ctx = this.ctx;
    const world = ctx.sys.world;
    // Balcões das lojas
    for (const shop of Object.values(SHOPS)) {
      if (!shop.anchor || !PLACES[shop.anchor]) continue;
      const pos = world.placePosition(shop.anchor, new THREE.Vector3());
      if (!pos) continue;
      pos.y += 1;
      this.addCounter({
        id: `loja:${shop.id}`,
        kind: 'shop',
        prompt: `Negociar — ${shop.name}`,
        position: pos,
        range: SHOP_RULES.interactRange,
        enabled: true,
        priority: -1,
        interact: () => this.inv.openShop(shop.id),
      });
    }
    // Baú pessoal
    if (PLACES[STASH_ANCHOR]) {
      const pos = world.placePosition(STASH_ANCHOR, new THREE.Vector3());
      if (pos) {
        const { root } = buildChestModel('wood');
        root.position.copy(pos);
        root.rotation.y = (PLACES[STASH_ANCHOR].yaw ?? 0) + Math.PI;
        root.scale.setScalar(0.9);
        root.name = 'bau-pessoal';
        ctx.scene.add(root);
        // o modelo fica atrás da âncora; o prompt fica na frente
        const ip = pos.clone();
        ip.y += 0.5;
        this.addCounter({
          id: 'bau_pessoal',
          kind: 'stash',
          prompt: 'Abrir baú pessoal',
          position: ip,
          range: 2.6,
          enabled: true,
          priority: 1,
          interact: () => this.inv.openStash(),
        });
      }
    }
    // Santuário: redistribuição de talentos (confirmar com [E] duas vezes)
    if (PLACES[RESPEC.shrineAnchor]) {
      const pos = world.placePosition(RESPEC.shrineAnchor, new THREE.Vector3());
      if (pos) {
        pos.y += 1;
        this.addCounter({
          id: 'santuario_redistribuir',
          kind: 'use',
          prompt: 'Meditar (redistribuir talentos)',
          position: pos,
          range: 2.8,
          enabled: true,
          priority: -1,
          interact: () => this.shrineInteract(),
        });
      }
    }
  }

  private addCounter(i: Interactable) {
    this.counters.push(i);
    this.ctx.sys.interaction.register(i);
  }

  private shrineInteract() {
    const ctx = this.ctx;
    const prog = ctx.sys.progression;
    const spent = prog.spentTalentPoints();
    if (spent <= 0) {
      ctx.events.emit('ui:notify', { text: 'Você ainda não aprendeu talentos para redistribuir.', kind: 'info' });
      return;
    }
    const cost = prog.respecCost();
    if (ctx.elapsed <= this.respecArmedUntil) {
      this.respecArmedUntil = -1;
      if (prog.respec(true)) {
        this.tmp.copy(ctx.sys.player.position);
        ctx.sys.vfx.burst('levelUp', this.tmp, { color: 0xbfe4ff });
        ctx.sys.ui.openMenu('skills');
      }
      return;
    }
    if (this.inv.gold < cost) {
      ctx.events.emit('ui:notify', { text: `Redistribuir talentos custa ${cost} de ouro (você tem ${this.inv.gold}).`, kind: 'warning' });
      return;
    }
    this.respecArmedUntil = ctx.elapsed + 6;
    ctx.events.emit('ui:notify', { text: `Redistribuir ${spent} ponto${spent > 1 ? 's' : ''} de talento por ${cost} de ouro? Pressione [E] de novo para confirmar.`, kind: 'info' });
  }

  // =====================================================================
  // Recompensas de inimigos e criaturas (contrato C1)
  // =====================================================================
  private onKilled(entity: Entity, typeId: string, killer: Entity | undefined, creature: boolean) {
    if (this.rewarded.has(entity)) return;
    const def = creature ? CREATURES[typeId] : ENEMIES[typeId] ?? BOSSES[typeId];
    if (!def) return;
    const player = this.ctx.sys.player?.entity;
    if (!player) return;
    let credit = killer === player || killer?.kind === 'player' || this.touched.has(entity);
    if (!credit && !creature && !killer) {
      const dx = entity.position.x - player.position.x;
      const dz = entity.position.z - player.position.z;
      credit = dx * dx + dz * dz < PICKUP_RULES.shareRadius * PICKUP_RULES.shareRadius;
    }
    if (!credit) return;
    this.rewarded.add(entity);
    this.stats.kills++;
    if (def.xp > 0) {
      this.stats.xpFromKills += def.xp;
      this.ctx.sys.progression.addXp(def.xp, `${creature ? 'criatura' : 'inimigo'}:${typeId}`);
    }
    this.dropRewards(entity.position, def.gold, def.drops);
  }

  /** Rola ouro + tabela de drops e solta tudo no chão em volta de `pos`. */
  dropRewards(pos: THREE.Vector3, gold: readonly [number, number] | undefined, drops: readonly { itemId: string; chance: number; qty?: [number, number] }[], rnd: () => number = Math.random) {
    const g = rollGold(gold, rnd);
    if (g > 0) {
      this.pickups.spawn(null, g, pos.x, pos.y, pos.z);
      this.stats.goldDropped += g;
    }
    for (const d of rollDrops(drops, rnd)) {
      if (this.pickups.spawn(d.itemId, d.qty, pos.x, pos.y, pos.z)) this.stats.itemsDropped += d.qty;
    }
  }

  update(dt: number, ctx: GameContext) {
    if (!this.built) this.build();
    this.chests.update(dt, ctx.camera ? ctx.camera.position : ctx.sys.player.position);
    this.pickups.update(dt, ctx);
    this.herbs.update(dt, ctx);
  }

  // =====================================================================
  // Estado salvo (dentro do save do inventário)
  // =====================================================================
  serialize() {
    return { pickups: this.pickups.serialize(), herbs: this.herbs.serialize() };
  }

  deserialize(data: unknown) {
    const d = data && typeof data === 'object' ? (data as { pickups?: PickupSave[]; herbs?: unknown }) : {};
    this.pickups.deserialize(d.pickups);
    this.herbs.deserialize(d.herbs);
    this.chests.syncCollected();
  }

  reset() {
    this.pickups.clear();
    this.herbs.reset();
    this.chests.syncCollected();
    this.respecArmedUntil = -1;
  }
}
