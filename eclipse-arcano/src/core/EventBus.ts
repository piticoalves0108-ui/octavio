import type { Entity } from './Entity';
import type { DamageInfo, DamageResult } from '../combat/Health';
import type { Vector3 } from 'three';

/**
 * Catálogo central de eventos do jogo. Sistemas se comunicam por aqui em vez de
 * chamarem uns aos outros diretamente sempre que a reação é opcional
 * (UI, áudio, missões, conquistas, NPCs...).
 */
export interface GameEvents {
  'game:state': { from: GameStateName; to: GameStateName };
  'game:newGame': {};
  'game:loaded': { slot: string };
  'game:saved': { slot: string; auto: boolean };

  'damage': { target: Entity; info: DamageInfo; result: DamageResult };
  'entity:death': { entity: Entity; info?: DamageInfo };
  'enemy:killed': { entity: Entity; typeId: string; killer?: Entity };
  'creature:killed': { entity: Entity; typeId: string };

  'boss:start': { bossId: string; entity: Entity };
  'boss:phase': { bossId: string; phase: number };
  'boss:defeated': { bossId: string; entity: Entity };

  'player:flightStart': {};
  'player:flightEnd': {};
  'player:dodge': {};
  'player:death': {};
  'player:respawn': {};
  'player:landed': { impactSpeed: number };
  'player:footstep': { surface: SurfaceType; running: boolean };
  'player:attack': { weaponId: string; heavy: boolean };
  'player:jump': {};
  /** Alvo travado mudou (null = soltou). */
  'player:lockOn': { target: Entity | null };

  'ability:cast': { abilityId: string; caster: Entity; position: Vector3 };
  'ability:fail': { abilityId: string; reason: 'cooldown' | 'energy' | 'locked' | 'state' };

  'item:pickup': { defId: string; qty: number; uniqueId?: string };
  'inventory:changed': {};
  'equip:changed': { slot: string; defId: string | null };
  'gold:changed': { gold: number };

  'xp:gained': { amount: number; reason: string };
  'level:up': { level: number };
  'talent:unlocked': { talentId: string; rank: number };

  'quest:started': { questId: string };
  'quest:updated': { questId: string };
  'quest:completed': { questId: string };
  'quest:failed': { questId: string };
  'story:flag': { key: string; value: StoryValue };

  'dialogue:start': { npcId: string; dialogueId: string };
  'dialogue:end': { npcId: string; dialogueId: string };
  'npc:talked': { npcId: string };
  'npc:alarm': { position: Vector3; radius: number; reason: 'magic' | 'combat' | 'monster' };

  'location:discovered': { locationId: string; name: string };
  'location:entered': { locationId: string; name: string };
  'interact': { id: string; kind: string };

  'time:hour': { hour: number; day: number };
  'weather:changed': { weather: WeatherKind };
  'lightning': { position: Vector3 };

  'ui:notify': { text: string; kind?: 'info' | 'quest' | 'loot' | 'warning' | 'level' | 'discovery' };
  'ui:menu': { menu: MenuName | null };
  'settings:changed': { key?: string };
  'music:intensity': { state: MusicState };
}

export type GameStateName = 'boot' | 'menu' | 'loading' | 'playing' | 'paused' | 'dialogue' | 'dead' | 'cinematic';
export type MenuName = 'main' | 'pause' | 'inventory' | 'skills' | 'journal' | 'map' | 'settings' | 'shop' | 'stash' | 'credits' | 'gameover';
export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog';
export type MusicState = 'menu' | 'explore' | 'village' | 'night' | 'combat' | 'boss' | 'victory' | 'silence';
export type SurfaceType = 'grass' | 'dirt' | 'stone' | 'wood' | 'water' | 'metal' | 'sand' | 'mud';
export type StoryValue = string | number | boolean;

type Handler<T> = (payload: T) => void;

export class EventBus<E extends object = GameEvents> {
  private handlers = new Map<keyof E, Set<Handler<any>>>();

  on<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    set.add(handler);
    return () => this.off(type, handler);
  }

  once<K extends keyof E>(type: K, handler: Handler<E[K]>): () => void {
    const off = this.on(type, (p) => {
      off();
      handler(p);
    });
    return off;
  }

  off<K extends keyof E>(type: K, handler: Handler<E[K]>): void {
    this.handlers.get(type)?.delete(handler);
  }

  emit<K extends keyof E>(type: K, payload: E[K]): void {
    const set = this.handlers.get(type);
    if (!set || set.size === 0) return;
    // Cópia para permitir que handlers se desinscrevam durante o emit.
    for (const h of Array.from(set)) {
      try {
        h(payload);
      } catch (err) {
        console.error(`[EventBus] erro no handler de "${String(type)}"`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
