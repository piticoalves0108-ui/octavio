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
  /** Habilidade aprendida (desbloqueio por nível/história) ou rank aumentado. */
  'ability:unlocked': { abilityId: string; rank: number };
  /** Combinação entre magias (Estilhaçar, Sobrecarga, Colapso Dimensional...). */
  'combat:combo': { comboId: string; name: string; position: Vector3 };
  /** Parry bem-sucedido do jogador (ou de qualquer defensor). */
  'combat:parry': { defender: Entity; attacker?: Entity };
  /** Carga Arcana mudou (0..100) — para a UI. */
  'ultimate:charge': { value: number; max: number };

  'item:pickup': { defId: string; qty: number; uniqueId?: string };
  'inventory:changed': {};
  'equip:changed': { slot: string; defId: string | null };
  'gold:changed': { gold: number };
  /** Consumível usado (o rpg já toca o som 'potion'). */
  'item:used': { defId: string };
  /** Baú do mundo aberto (o rpg já toca 'chest_open'). */
  'chest:opened': { chestId: string; position: Vector3 };
  /** Compra/venda/recompra/aprimoramento numa loja (o ouro também emite 'gold:changed'). */
  'shop:transaction': { shopId: string; kind: 'buy' | 'sell' | 'buyback' | 'upgrade'; itemId: string; qty: number; gold: number };
  /** Erva colhida no mundo. */
  'herb:harvested': { spotId: string; itemId: string; qty: number };

  'xp:gained': { amount: number; reason: string };
  'level:up': { level: number };
  'talent:unlocked': { talentId: string; rank: number };
  /** Talentos redistribuídos no santuário. */
  'talent:respec': { refunded: number; cost: number };

  'quest:started': { questId: string };
  'quest:updated': { questId: string };
  'quest:completed': { questId: string };
  'quest:failed': { questId: string };
  'story:flag': { key: string; value: StoryValue };

  'dialogue:start': { npcId: string; dialogueId: string };
  'dialogue:end': { npcId: string; dialogueId: string };
  'npc:talked': { npcId: string };
  'npc:alarm': { position: Vector3; radius: number; reason: 'magic' | 'combat' | 'monster' };
  /** Fala curta de um NPC (balão sobre a cabeça; a UI pode mostrar como legenda). */
  'npc:bark': { npcId: string; name: string; text: string; position: Vector3; situation: string };
  /** Missão rastreada no HUD mudou. */
  'quest:tracked': { questId: string | null };
  /** Opção escolhida num diálogo (postura: compassivo/pragmatico/arrogante/curioso). */
  'dialogue:choice': { npcId: string; dialogueId: string; text: string; tone?: string };
  /** Cinemática leve (introdução, memórias, fim de capítulo). */
  'cinematic:start': { id: string };
  'cinematic:end': { id: string; skipped: boolean };
  /** Cartão de título (nome do chefe, capítulo). A UI desenha; sem UI, vira legenda. */
  'cinematic:title': { title: string; subtitle?: string; duration: number };

  'location:discovered': { locationId: string; name: string };
  'location:entered': { locationId: string; name: string };
  'interact': { id: string; kind: string };

  'time:hour': { hour: number; day: number };
  'weather:changed': { weather: WeatherKind };
  'lightning': { position: Vector3 };
  /**
   * Golpe/explosão/feixe/projétil atingiu uma área do mundo (com ou sem alvo). O mundo
   * interativo reage: corta grama, acende fogo, empurra e quebra objetos.
   */
  'world:strike': WorldStrike;
  /** Fogo pegou na grama (centro aproximado) / fogueira acesa / prato cozinhado. */
  'fire:ignited': { position: Vector3; cells: number };
  'campfire:lit': { id: string };
  'cooking:done': { itemId: string; ingredients: string[] };
  'mount:mounted': { typeId: string; taming: boolean };
  'mount:dismounted': { typeId: string };
  'mount:tamed': { typeId: string; name: string; wild: boolean };

  'ui:notify': { text: string; kind?: 'info' | 'quest' | 'loot' | 'warning' | 'level' | 'discovery' };
  'ui:menu': { menu: MenuName | null };
  'settings:changed': { key?: string };
  'music:intensity': { state: MusicState };
}

/** Área atingida por um ataque (ver evento 'world:strike'). */
export interface WorldStrike {
  /** 'sphere' = explosão/impacto; 'arc' = golpe corpo a corpo; 'beam' = feixe reto. */
  shape: 'sphere' | 'arc' | 'beam';
  /** Centro (esfera) ou origem (arco/feixe). */
  origin: Vector3;
  /** Frente do golpe (arco, no plano XZ) ou direção do feixe. */
  dir?: Vector3;
  /** Raio (esfera), alcance (arco) ou largura (feixe). */
  radius: number;
  /** Comprimento do feixe. */
  length?: number;
  /** Abertura do arco (graus). */
  arcDeg?: number;
  info: DamageInfo;
  source: Entity | null;
}

export type GameStateName = 'boot' | 'menu' | 'loading' | 'playing' | 'paused' | 'dialogue' | 'dead' | 'cinematic';
export type MenuName = 'main' | 'pause' | 'inventory' | 'skills' | 'journal' | 'map' | 'settings' | 'shop' | 'stash' | 'credits' | 'gameover' | 'cooking';
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

  /** Quantidade de handlers inscritos (de um evento ou de todos) — diagnóstico de vazamento de listeners. */
  listenerCount(type?: keyof E): number {
    if (type !== undefined) return this.handlers.get(type)?.size ?? 0;
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }
}
