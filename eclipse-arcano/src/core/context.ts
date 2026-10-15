import type * as THREE from 'three';
import type { EventBus, GameStateName } from './EventBus';
import type { Input } from './Input';
import type { EntityManager } from './EntityManager';
import type { WorldClock } from './WorldClock';
import type { Settings } from './Settings';
import type { InteractionSystem } from './Interaction';
import type { Heightfield } from '../world/heightfield';
import type { CollisionWorld } from '../world/Collision';
import type { World } from '../world/World';
import type { Environment } from '../env/Environment';
import type { Player } from '../player/Player';
import type { CameraRig } from '../player/CameraRig';
import type { Combat } from '../combat/Combat';
import type { Abilities } from '../combat/Abilities';
import type { VFX } from '../combat/VFX';
import type { AI } from '../ai/AI';
import type { NPCs } from '../npc/NPCs';
import type { Inventory } from '../rpg/Inventory';
import type { Progression } from '../rpg/Progression';
import type { Quests } from '../rpg/Quests';
import type { Dialogue } from '../rpg/Dialogue';
import type { Story } from '../rpg/Story';
import type { UI } from '../ui/UI';
import type { AudioSystem } from '../audio/Audio';
import type { SaveSystem } from '../save/SaveSystem';
import type { PerfMonitor } from '../perf/PerfMonitor';

/**
 * Um sistema de jogo. A ordem de atualização é definida em Game.ts.
 * - update: só roda com o estado 'playing' (ou sempre, se `alwaysUpdate`).
 * - lateUpdate: depois de todos os updates (câmera, UI, áudio posicional).
 */
export interface GameSystem {
  readonly name: string;
  /** Chamado uma vez, na ordem de registro, depois que todos os sistemas existem. */
  init?(ctx: GameContext): void | Promise<void>;
  update?(dt: number, ctx: GameContext): void;
  lateUpdate?(dt: number, ctx: GameContext): void;
  /** Se true, update/lateUpdate também rodam em menus/pausa/diálogo. */
  alwaysUpdate?: boolean;
  onStateChange?(from: GameStateName, to: GameStateName, ctx: GameContext): void;
  /** Chamado ao iniciar novo jogo (resetar estado). */
  onNewGame?(ctx: GameContext): void;
  dispose?(): void;
}

/** Sistemas com estado persistente implementam isto e se registram em ctx.sys.save. */
export interface Saveable {
  readonly saveKey: string;
  serialize(): unknown;
  /** Deve validar os dados e lançar erro (ou ignorar campos) se inconsistentes. */
  deserialize(data: unknown, ctx: GameContext): void;
}

/** Registro tipado de todos os sistemas. */
export interface Systems {
  world: World;
  env: Environment;
  player: Player;
  camera: CameraRig;
  combat: Combat;
  abilities: Abilities;
  vfx: VFX;
  ai: AI;
  npcs: NPCs;
  inventory: Inventory;
  progression: Progression;
  quests: Quests;
  dialogue: Dialogue;
  story: Story;
  interaction: InteractionSystem;
  ui: UI;
  audio: AudioSystem;
  save: SaveSystem;
  perf: PerfMonitor;
}

export interface GameContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  uiRoot: HTMLElement;
  events: EventBus;
  input: Input;
  entities: EntityManager;
  clock: WorldClock;
  settings: Settings;
  heightfield: Heightfield;
  physics: CollisionWorld;
  sys: Systems;
  /** Estado atual do jogo. */
  readonly state: GameStateName;
  setState(state: GameStateName): void;
  /** Tempo real desde o boot (s). */
  readonly elapsed: number;
  /** Frame atual. */
  readonly frame: number;
  /** Escala de tempo do gameplay (1 = normal; usado em hit-stop / câmera lenta). */
  timeScale: number;
  /**
   * Função de renderização (padrão: renderer.render(scene, camera)).
   * O ambiente pode substituí-la por um pipeline de pós-processamento.
   */
  render: () => void;
  /** URL params úteis (?bench=..., ?debug, ?seed...). */
  params: URLSearchParams;
  /** Inicia um novo jogo (reseta todos os sistemas via onNewGame e entra em 'playing'). */
  newGame(): Promise<void>;
  /** Carrega um save e entra em 'playing'. Retorna false se falhar. */
  continueGame(slot?: string): Promise<boolean>;
  /** Volta ao menu principal. */
  quitToMenu(): void;
}
