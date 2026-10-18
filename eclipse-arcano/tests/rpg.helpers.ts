/**
 * Contexto mínimo (sem WebGL/DOM) para testar Inventory e Progression com o EventBus real.
 */
import * as THREE from 'three';
import { EventBus } from '../src/core/EventBus';
import { Health } from '../src/combat/Health';
import { Inventory } from '../src/rpg/Inventory';
import { Progression } from '../src/rpg/Progression';
import { PLACES } from '../src/data/places';

export function makeCtx() {
  const events = new EventBus();
  const health = new Health(100);
  const playerEntity = { kind: 'player', position: new THREE.Vector3(0, 0, 0), health, alive: true } as any;
  const notes: string[] = [];
  const menus: (string | null)[] = [];
  events.on('ui:notify', (e) => notes.push(e.text));
  const abilities = {
    unlocked: new Set<string>(['arcaneOrb']),
    ranks: new Map<string, number>([['arcaneOrb', 1]]),
    slots: ['arcaneOrb', null, null, null] as (string | null)[],
    ultimate: null as string | null,
    isUnlocked(id: string) {
      return this.unlocked.has(id);
    },
    rank(id: string) {
      return this.ranks.get(id) ?? (this.unlocked.has(id) ? 1 : 0);
    },
    unlock(id: string) {
      if (this.unlocked.has(id)) return;
      this.unlocked.add(id);
      this.ranks.set(id, 1);
      const free = this.slots.indexOf(null);
      if (free >= 0) this.slots[free] = id;
    },
    upgrade(id: string) {
      if (!this.unlocked.has(id)) return;
      this.ranks.set(id, Math.min(3, this.rank(id) + 1));
    },
  };
  const ui = {
    openMenuName: null as string | null,
    openMenu(m: string) {
      this.openMenuName = m;
      menus.push(m);
      events.emit('ui:menu', { menu: m as any });
    },
    closeMenu() {
      this.openMenuName = null;
      menus.push(null);
      events.emit('ui:menu', { menu: null });
    },
    notify() {},
    setInteractPrompt() {},
  };
  const interactables = new Map<string, any>();
  const ctx: any = {
    events,
    state: 'playing',
    elapsed: 0,
    frame: 0,
    scene: new THREE.Scene(),
    clock: { day: 1, hours: 9 },
    input: { pressed: () => false },
    heightfield: { heightAt: () => 10 },
    physics: { groundHeight: (_x: number, _z: number, fromY?: number) => (fromY !== undefined && fromY < 1e6 && fromY > 10 ? Math.min(fromY - 2.5, 10) : 10), waterSurface: () => null },
    sys: {} as any,
  };
  const player = {
    entity: playerEntity,
    get position() {
      return playerEntity.position;
    },
    health,
    energy: { current: 100, max: 100, regen: 8 },
    state: 'ground',
    refreshCount: 0,
    refreshStats() {
      this.refreshCount++;
      const maxH = ctx.sys.progression.getStat('maxHealth');
      if (maxH > health.max) health.current += maxH - health.max;
      health.max = maxH;
      health.current = Math.min(health.current, maxH);
    },
    restoreEnergy(n: number) {
      this.energy.current = Math.min(this.energy.max, this.energy.current + n);
    },
    playAnimation() {
      return 0.5;
    },
    canAct: () => true,
    isBusy: () => false,
  };
  ctx.sys = {
    player,
    abilities,
    ui,
    vfx: { burst() {}, sprite() {}, spark() {} },
    audio: { play() {} },
    interaction: {
      register: (i: any) => interactables.set(i.id, i),
      unregister: (id: string) => interactables.delete(id),
    },
    world: {
      placePosition: (id: string, out = new THREE.Vector3()) => {
        const p = PLACES[id];
        return p ? out.set(p.x, p.y ?? 10, p.z) : null;
      },
    },
  };
  const progression = new Progression();
  const inventory = new Inventory();
  ctx.sys.progression = progression;
  ctx.sys.inventory = inventory;
  progression.init(ctx);
  inventory.init(ctx);
  progression.onNewGame();
  inventory.onNewGame();
  return { ctx, events, inventory, progression, player, abilities, ui, notes, menus, interactables, health };
}
