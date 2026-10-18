import * as THREE from 'three';
import type { GameContext } from './context';
import type { DamageInfo, DamageResult, Health } from '../combat/Health';

export type EntityKind = 'player' | 'enemy' | 'boss' | 'npc' | 'creature' | 'projectile' | 'pickup' | 'prop' | 'companion';

export type Faction =
  | 'player'
  | 'villager' // habitantes
  | 'guard' // guardas da cidade (aliados do jogador enquanto ele não atacar civis)
  | 'bandit'
  | 'corrupted' // soldados e criaturas corrompidas
  | 'construct' // autômatos / guardiões de ruínas
  | 'wild' // fauna hostil (lobos sombrios etc.)
  | 'neutral'; // fauna pacífica

/** 0 = perto (todo frame), 1 = médio (escalonado), 2 = longe (simulação mínima), 3 = dormindo. */
export type UpdateTier = 0 | 1 | 2 | 3;

/**
 * Entidade base. Composição leve: cada entidade tem um Object3D (visual + transform),
 * dados físicos simples (raio/altura/velocidade) e componentes opcionais (health).
 * Subclasses (Player, Enemy, NPC, Creature...) sobrescrevem update/farUpdate.
 */
export class Entity {
  private static nextId = 1;
  readonly id = Entity.nextId++;

  kind: EntityKind;
  faction: Faction;
  name = '';
  /** Tipo de dados (ex.: 'bandit_raider', 'npc_elder_maren'). */
  typeId = '';
  object3d: THREE.Object3D;
  velocity = new THREE.Vector3();
  /** Rotação em torno de Y (fonte de verdade da orientação horizontal). */
  yaw = 0;
  radius = 0.5;
  height = 1.8;
  health?: Health;
  alive = true;
  /** Marcado para remoção no fim do frame. */
  removed = false;
  tier: UpdateTier = 0;
  /** dt acumulado enquanto não foi atualizado (tiers escalonados). */
  pendingDt = 0;
  /** Entidades persistentes não são removidas ao descarregar regiões (ex.: NPCs com rotinas). */
  persistent = false;
  /** Ignorar o sistema de tiers (sempre tier 0). Ex.: chefes durante a luta, projéteis. */
  alwaysActive = false;
  /** Considerada por consultas espaciais (alvos, colisão entre entidades). */
  queryable = true;
  /** Empurra/é empurrada por outras entidades sólidas. */
  solid = true;
  tags = new Set<string>();
  /**
   * Obsoleto: o grid espacial agora usa `gridCell` (numérico, sem alocar strings por quadro).
   * Mantido só por compatibilidade de contrato; não é mais atualizado.
   */
  cellKey = '';
  /** Célula atual no grid espacial (gerenciado pelo EntityManager; -1 = fora do grid). */
  gridCell = -1;

  constructor(kind: EntityKind, faction: Faction, object3d: THREE.Object3D = new THREE.Group()) {
    this.kind = kind;
    this.faction = faction;
    this.object3d = object3d;
    this.object3d.userData.entityId = this.id;
  }

  get position(): THREE.Vector3 {
    return this.object3d.position;
  }

  /** Vetor frontal (XZ) a partir do yaw. */
  getForward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  /** Centro do corpo (útil para mirar/hits). */
  getCenter(out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(this.object3d.position).setY(this.object3d.position.y + this.height * 0.5);
  }

  /** Chamado quando adicionada ao EntityManager. */
  onAdded(_ctx: GameContext): void {}
  /** Atualização completa (tier 0 e 1). `dt` já inclui dt acumulado no caso de tiers escalonados. */
  update(_dt: number, _ctx: GameContext): void {}
  /** Simulação barata para entidades distantes (tier 2). */
  farUpdate(_dt: number, _ctx: GameContext): void {}
  /** Reação a dano já aplicado. */
  onDamaged(_info: DamageInfo, _result: DamageResult, _ctx: GameContext): void {}
  /** Chamado uma vez quando a vida chega a zero (antes do evento 'entity:death'). */
  onDeath(_info: DamageInfo | undefined, _ctx: GameContext): void {}
  /** Liberar recursos. Não descartar geometrias/materiais compartilhados. */
  dispose(): void {
    this.object3d.removeFromParent();
  }
}
