import * as THREE from 'three';
import type { GameContext } from '../core/context';
import { ENEMY_ZONES, CREATURE_ZONES, DAWN_HOURS, type SpawnEntry, type SpawnZone, type CreatureZone, type CreatureEntry, type SpawnTime } from '../data/spawns';
import { PLACES, PATROL_ROUTES } from '../data/places';
import { getEnemyDef } from '../data/enemies';
import { CREATURES } from '../data/creatures';
import type { Enemy } from './Enemy';
import type { Creature } from './creatures/Creature';
import type { AI } from './AI';
import { distXZ, gameHours, groundAt, isDeepWater, visibleToCamera } from './shared';
import { hourIn } from './logic';

/**
 * Spawner da população ambiente (src/data/spawns.ts):
 * zonas ativadas pela distância do jogador, postos (slots) com respawn por horas de jogo,
 * condições de horário/chance, limite `q.maxActiveEnemies`, nada nasce à vista do jogador,
 * uniqueIds derrotados nunca voltam; zonas desativadas removem quem não está em combate.
 */
interface Slot {
  key: string;
  index: number;
  entity: Enemy | Creature | null;
  rolled: boolean;
}

interface ZoneRT<Z, E> {
  def: Z;
  center: THREE.Vector3;
  active: boolean;
  entries: { entry: E; slots: Slot[] }[];
  /** Bandos de pássaros ativos (chave). */
  flocks: string[];
}

const _p = new THREE.Vector3();

export class Spawner {
  readonly zones: ZoneRT<SpawnZone, SpawnEntry>[] = [];
  readonly cZones: ZoneRT<CreatureZone, CreatureEntry>[] = [];
  /** slot → horas de jogo absolutas em que pode renascer. */
  respawnAt = new Map<string, number>();
  private checkT = 0;
  enabled = true;
  private warned = new Set<string>();

  constructor(private ai: AI) {
    for (const z of ENEMY_ZONES) this.zones.push(this.makeRT(z, z.entries));
    for (const z of CREATURE_ZONES) this.cZones.push(this.makeRT(z, z.entries));
  }

  private makeRT<Z extends { id: string; place?: string; x?: number; z?: number; y?: number }, E extends { count: number; flocks?: number }>(z: Z, entries: E[]): ZoneRT<Z, E> {
    const c = new THREE.Vector3();
    const pl = z.place ? PLACES[z.place] : undefined;
    if (z.place && !pl) console.warn(`[Spawner] âncora desconhecida na zona ${z.id}: ${z.place}`);
    c.set(pl?.x ?? z.x ?? 0, z.y ?? pl?.y ?? 0, pl?.z ?? z.z ?? 0);
    return {
      def: z,
      center: c,
      active: false,
      flocks: [],
      entries: entries.map((entry, ei) => ({ entry, slots: Array.from({ length: entry.count }, (_, i) => ({ key: `${z.id}:${ei}:${i}`, index: i, entity: null, rolled: false })) })),
    };
  }

  reset() {
    for (const z of [...this.zones, ...this.cZones]) {
      z.active = false;
      z.flocks.length = 0;
      for (const e of z.entries) for (const s of e.slots) {
        s.entity = null;
        s.rolled = false;
      }
    }
    this.respawnAt.clear();
    this.checkT = 0;
  }

  update(dt: number, ctx: GameContext) {
    if (!this.enabled) return;
    this.checkT -= dt;
    if (this.checkT > 0) return;
    this.checkT = 0.5;
    const pl = ctx.sys.player.entity.position;
    const now = gameHours(ctx);
    for (const z of this.zones) {
      const d = distXZ(pl, z.center);
      if (!z.active && d < z.def.activateRange) this.activate(z);
      else if (z.active && d > z.def.activateRange + 80) this.deactivate(z, ctx);
      if (z.active) this.fillEnemies(z, ctx, now, d);
    }
    for (const z of this.cZones) {
      const d = distXZ(pl, z.center);
      if (!z.active && d < z.def.activateRange) this.activate(z);
      else if (z.active && d > z.def.activateRange + 80) this.deactivate(z, ctx);
      if (z.active) this.fillCreatures(z, ctx, now, d);
    }
  }

  private activate(z: ZoneRT<{ id: string }, SpawnEntry | CreatureEntry>) {
    z.active = true;
    for (const e of z.entries) {
      const chance = e.entry.chance ?? 1;
      const roll = Math.random() < chance;
      for (const s of e.slots) s.rolled = roll;
    }
  }

  private deactivate(z: ZoneRT<{ id: string }, SpawnEntry | CreatureEntry>, ctx: GameContext) {
    z.active = false;
    for (const e of z.entries) {
      for (const s of e.slots) {
        const ent = s.entity;
        if (!ent) continue;
        if (ent.alive && !ent.removed && (ent as Enemy).engaged) continue; // em combate: o despawn por distância cuida
        if (!ent.removed) ctx.entities.remove(ent);
        s.entity = null;
      }
    }
    for (const k of z.flocks) for (let f = 0; f < 8; f++) this.ai.flocks.remove(`${k}:${f}`);
    z.flocks.length = 0;
  }

  timeOk(ctx: GameContext, time: SpawnTime | undefined): boolean {
    if (!time || time === 'any') return true;
    const night = ctx.clock.isNight();
    if (time === 'night') return night;
    if (time === 'day') return !night;
    return hourIn(ctx.clock.hours, DAWN_HOURS[0], DAWN_HOURS[1]);
  }

  private fillEnemies(z: ZoneRT<SpawnZone, SpawnEntry>, ctx: GameContext, now: number, dPlayer: number) {
    const max = ctx.settings.q.maxActiveEnemies;
    for (let ei = 0; ei < z.entries.length; ei++) {
      const { entry, slots } = z.entries[ei];
      for (const s of slots) {
        if (s.entity && (s.entity.removed || !s.entity.alive)) s.entity = null;
        if (s.entity || !s.rolled) continue;
        if (entry.uniqueId && this.ai.defeatedUniques.has(entry.uniqueId)) continue;
        if (entry.uniqueId && this.ai.findUnique(entry.uniqueId)) continue;
        const ra = this.respawnAt.get(s.key);
        if (ra !== undefined && ra > now) continue;
        if (!this.timeOk(ctx, entry.time)) continue;
        if (this.ai.activeEnemyCount() >= max) return;
        if (!this.slotPosition(z, entry, s.index, ctx, _p)) continue;
        // nada nasce à vista do jogador (exceto bem longe)
        if (dPlayer < 140 && distXZ(_p, ctx.sys.player.entity.position) < 95 && visibleToCamera(ctx, _p, 95)) continue;
        const route = entry.patrol ? PATROL_ROUTES[entry.patrol] : undefined;
        let patrol: THREE.Vector3[] | undefined;
        if (route) {
          patrol = route.points.map(([x, zz]) => new THREE.Vector3(x, groundAt(ctx, x, zz, ctx.heightfield.heightAt(x, zz) + 1.5), zz));
          if (patrol.length > 0) {
            // começa num ponto da rota longe da vista
            const k = (s.index * 2 + Math.floor(Math.random() * patrol.length)) % patrol.length;
            if (!entry.anchors) _p.copy(patrol[k]);
          }
        }
        const anchorId = entry.anchors?.[s.index % entry.anchors.length];
        const yaw = anchorId ? PLACES[anchorId]?.yaw : undefined;
        const ent = this.ai.spawnEnemy(entry.typeId, _p.clone(), { zoneId: z.def.id, uniqueId: entry.uniqueId, patrol, level: undefined }, { slot: s.key, perched: entry.perched, guard: entry.guard, yaw, patrolLoop: route?.loop });
        if (ent) {
          s.entity = ent;
          if (patrol) {
            // índice inicial = ponto mais próximo
            let bi = 0;
            let bd = Infinity;
            for (let i = 0; i < patrol.length; i++) {
              const d = distXZ(patrol[i], ent.position);
              if (d < bd) {
                bd = d;
                bi = i;
              }
            }
            ent.patrolIdx = bi;
          }
        }
      }
    }
  }

  private fillCreatures(z: ZoneRT<CreatureZone, CreatureEntry>, ctx: GameContext, now: number, dPlayer: number) {
    const max = Math.round(ctx.settings.q.maxActiveEnemies * 1.6);
    for (let ei = 0; ei < z.entries.length; ei++) {
      const { entry, slots } = z.entries[ei];
      const timeOk = this.timeOk(ctx, entry.time);
      // bandos de pássaros
      if (entry.flocks) {
        const key = `${z.def.id}:${ei}`;
        const has = z.flocks.includes(key);
        if (timeOk && !has && slots.length === 0) {
          let ok = false;
          for (let f = 0; f < entry.flocks; f++) ok = this.ai.flocks.add(`${key}:${f}`, z.center, z.def.radius, ctx) || ok;
          if (ok) z.flocks.push(key);
        } else if (!timeOk && has) {
          for (let f = 0; f < entry.flocks; f++) this.ai.flocks.remove(`${key}:${f}`);
          z.flocks.splice(z.flocks.indexOf(key), 1);
        }
      }
      for (const s of slots) {
        if (s.entity && (s.entity.removed || !s.entity.alive)) s.entity = null;
        const ent = s.entity as Creature | null;
        if (ent && !timeOk) {
          ent.leave();
          continue;
        }
        if (ent || !s.rolled || !timeOk) continue;
        const ra = this.respawnAt.get(s.key);
        if (ra !== undefined && ra > now) continue;
        if (this.ai.creatures.length >= max) return;
        const def = CREATURES[entry.typeId];
        if (!def) continue;
        if (!this.creaturePosition(z, ctx, _p, def.rig === 'serpent')) continue;
        if (def.temperament !== 'ambient' && dPlayer < 140 && distXZ(_p, ctx.sys.player.entity.position) < 70 && visibleToCamera(ctx, _p, 70)) continue;
        const c = this.ai.spawnCreature(entry.typeId, _p.clone(), { zoneId: z.def.id, slot: s.key, center: z.center, radius: z.def.radius, confined: !!z.def.confined, perchY: z.def.y });
        if (c) s.entity = c;
      }
    }
  }

  /** Ponto de nascimento: âncora do posto, ponto da patrulha ou ponto aleatório no raio. */
  private slotPosition(z: ZoneRT<SpawnZone, SpawnEntry>, entry: SpawnEntry, index: number, ctx: GameContext, out: THREE.Vector3): boolean {
    const anchors = entry.anchors;
    if (anchors && anchors.length > 0) {
      const id = anchors[index % anchors.length];
      const pl = PLACES[id];
      if (!pl) {
        if (!this.warned.has(id)) {
          this.warned.add(id);
          console.warn(`[Spawner] âncora desconhecida: ${id}`);
        }
        return false;
      }
      // espalha quem compartilha a mesma âncora
      const dup = anchors.indexOf(id) !== anchors.lastIndexOf(id) || index >= anchors.length;
      const ox = dup ? Math.cos(index * 2.4) * 2.5 : 0;
      const oz = dup ? Math.sin(index * 2.4) * 2.5 : 0;
      const x = pl.x + ox;
      const zz = pl.z + oz;
      if (pl.y !== undefined && entry.perched) out.set(x, pl.y, zz);
      else out.set(x, groundAt(ctx, x, zz, (pl.y ?? ctx.heightfield.heightAt(x, zz)) + 1.5), zz);
      return true;
    }
    const def = getEnemyDef(entry.typeId);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * z.def.radius;
      const x = z.center.x + Math.cos(a) * r;
      const zz = z.center.z + Math.sin(a) * r;
      if (isDeepWater(ctx, x, zz)) continue;
      out.set(x, groundAt(ctx, x, zz, ctx.heightfield.heightAt(x, zz) + 1.5), zz);
      ctx.physics.resolveCapsule(out, def?.radius ?? 0.5, def?.height ?? 1.8);
      return true;
    }
    return false;
  }

  private creaturePosition(z: ZoneRT<CreatureZone, CreatureEntry>, ctx: GameContext, out: THREE.Vector3, water: boolean): boolean {
    const R = z.def.radius;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = z.def.y !== undefined ? 0 : Math.sqrt(Math.random()) * R * (z.def.confined ? 0.75 : 1);
      const x = z.center.x + Math.cos(a) * r;
      const zz = z.center.z + Math.sin(a) * r;
      const deep = isDeepWater(ctx, x, zz, 1.5);
      if (water !== deep && !(water && i > 10)) continue;
      const y = z.def.y ?? groundAt(ctx, x, zz, ctx.heightfield.heightAt(x, zz) + 1.5);
      out.set(x, y, zz);
      return true;
    }
    return false;
  }

  /** Inimigo/criatura de um posto morreu: agenda o respawn. */
  onDeath(slot: string | undefined, zoneId: string | undefined, ctx: GameContext) {
    if (!slot || !zoneId) return;
    const z = this.zones.find((x) => x.def.id === zoneId) ?? this.cZones.find((x) => x.def.id === zoneId);
    if (!z) return;
    this.respawnAt.set(slot, gameHours(ctx) + z.def.respawnHours);
    for (const e of z.entries) for (const s of e.slots) if (s.key === slot) s.entity = null;
  }

  /** Estado persistente (respawns pendentes). */
  serialize(): Record<string, number> {
    return Object.fromEntries(this.respawnAt);
  }

  deserialize(data: unknown) {
    this.respawnAt.clear();
    if (!data || typeof data !== 'object') return;
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) if (typeof v === 'number' && isFinite(v)) this.respawnAt.set(k, v);
  }

  debugZones() {
    return this.zones.map((z) => ({ id: z.def.id, active: z.active, alive: z.entries.reduce((n, e) => n + e.slots.filter((s) => s.entity && s.entity.alive).length, 0) }));
  }
}
