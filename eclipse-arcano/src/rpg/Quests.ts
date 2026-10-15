import type * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';

export type QuestStatus = 'inactive' | 'active' | 'completed' | 'failed';

export interface JournalObjective {
  text: string;
  done: boolean;
  progress?: number;
  target?: number;
  optional?: boolean;
}

export interface JournalEntry {
  id: string;
  title: string;
  /** 'main' | 'side' | 'contract' | 'personal' | 'mystery' */
  category: string;
  status: QuestStatus;
  description: string;
  /** Dica do próximo passo. */
  nextStep: string;
  objectives: JournalObjective[];
  /** Log de acontecimentos (entradas do diário). */
  log: string[];
  rewardsText?: string;
}

export interface QuestMarker {
  questId: string;
  label: string;
  position: THREE.Vector3;
  /** Raio da área (quando o objetivo é uma região e não um ponto). */
  radius?: number;
  main: boolean;
}

/**
 * STUB — missões (definições em data/quests.ts), diário e marcadores.
 */
export class Quests implements GameSystem, Saveable {
  readonly name = 'quests';
  readonly saveKey = 'quests';
  /** Missão rastreada no HUD. */
  tracked: string | null = null;
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }
  start(_id: string): boolean {
    return false;
  }
  complete(_id: string) {}
  fail(_id: string) {}
  status(_id: string): QuestStatus {
    return 'inactive';
  }
  /** Estágio atual (id) de uma missão ativa. */
  stage(_id: string): string | null {
    return null;
  }
  setTracked(id: string | null) {
    this.tracked = id;
  }
  getJournal(): JournalEntry[] {
    return [];
  }
  getMarkers(): QuestMarker[] {
    return [];
  }
  onNewGame() {
    this.tracked = null;
  }
  serialize() {
    return {};
  }
  deserialize(_data: any) {}
}
