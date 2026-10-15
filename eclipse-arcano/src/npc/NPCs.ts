import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { Entity } from '../core/Entity';

export type NpcMemoryValue = string | number | boolean;

/**
 * STUB — habitantes com rotinas por horário, reações contextuais (magia em público,
 * ataques, chuva, acontecimentos da história), falas variadas e memória de interações.
 * O módulo npc/ substitui a implementação mantendo a API pública.
 */
export class NPCs implements GameSystem, Saveable {
  readonly name = 'npcs';
  readonly saveKey = 'npcs';
  protected ctx!: GameContext;
  /** Memória por NPC (ex.: vezes que conversou, se o jogador ajudou, atitude). */
  protected memories = new Map<string, Record<string, NpcMemoryValue>>();

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  /** NPC nomeado pelo id de dados (ex.: 'maren'). */
  get(_npcId: string): Entity | undefined {
    return undefined;
  }
  all(): Entity[] {
    return [];
  }
  /** Memória mutável do NPC. */
  memory(npcId: string): Record<string, NpcMemoryValue> {
    let m = this.memories.get(npcId);
    if (!m) {
      m = {};
      this.memories.set(npcId, m);
    }
    return m;
  }
  /** Faz o NPC dizer uma fala curta contextual (balão/legenda). */
  bark(_npcId: string, _situation: string): void {}

  onNewGame() {
    this.memories.clear();
  }
  serialize() {
    return { memories: Object.fromEntries(this.memories) };
  }
  deserialize(data: any) {
    this.memories.clear();
    if (data?.memories && typeof data.memories === 'object') {
      for (const [k, v] of Object.entries(data.memories)) if (v && typeof v === 'object') this.memories.set(k, v as Record<string, NpcMemoryValue>);
    }
  }
}
