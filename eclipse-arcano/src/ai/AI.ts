import type * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { Entity } from '../core/Entity';

export interface SpawnOptions {
  /** Pontos de patrulha. */
  patrol?: THREE.Vector3[];
  /** Zona de origem (para respawn/limites). */
  zoneId?: string;
  /** Id único (inimigos de missão/elite que não renascem após mortos). */
  uniqueId?: string;
  level?: number;
  /** Começa já em alerta contra o jogador. */
  aggro?: boolean;
}

/**
 * STUB — IA de inimigos, chefes, NPCs e criaturas.
 * O módulo ai/ substitui a implementação mantendo a API pública.
 */
export class AI implements GameSystem, Saveable {
  readonly name = 'ai';
  readonly saveKey = 'ai';
  /** Ids únicos já derrotados (elites, chefes, inimigos de missão). */
  defeatedUniques = new Set<string>();
  /** Chefes derrotados (ids). */
  defeatedBosses = new Set<string>();
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  spawnEnemy(_typeId: string, _position: THREE.Vector3, _opts?: SpawnOptions): Entity | null {
    return null;
  }
  spawnBoss(_bossId: string): Entity | null {
    return null;
  }
  /** NPC nomeado pelo id de dados (ex.: 'maren'). */
  getNpc(_npcId: string): Entity | undefined {
    return undefined;
  }
  /** Alerta civis/guardas/inimigos próximos (uso de magia em público, combate, monstros). */
  alarm(position: THREE.Vector3, radius: number, reason: 'magic' | 'combat' | 'monster') {
    this.ctx.events.emit('npc:alarm', { position, radius, reason });
  }
  /** Coordenação: limita quantos inimigos atacam o mesmo alvo ao mesmo tempo. */
  requestAttackToken(_attacker: Entity, _target: Entity): boolean {
    return true;
  }
  releaseAttackToken(_attacker: Entity) {}
  /** Há inimigos em combate ativo com o jogador? (música/câmera) */
  inCombat(): boolean {
    return false;
  }
  /** Chefe em luta (ou null). */
  activeBoss(): Entity | null {
    return null;
  }

  onNewGame() {
    this.defeatedUniques.clear();
    this.defeatedBosses.clear();
  }
  serialize() {
    return { defeatedUniques: [...this.defeatedUniques], defeatedBosses: [...this.defeatedBosses] };
  }
  deserialize(data: any) {
    this.defeatedUniques = new Set(Array.isArray(data?.defeatedUniques) ? data.defeatedUniques : []);
    this.defeatedBosses = new Set(Array.isArray(data?.defeatedBosses) ? data.defeatedBosses : []);
  }
}
