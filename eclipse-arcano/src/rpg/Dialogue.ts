import type { GameContext, GameSystem } from '../core/context';

export interface DialogueOptionView {
  index: number;
  text: string;
  /** Opção já escolhida antes (UI pode esmaecer). */
  seen?: boolean;
  /** Indica consequência importante (UI pode destacar). */
  important?: boolean;
}

export interface DialogueView {
  npcId: string;
  speaker: string;
  /** Subtítulo do falante (ex.: "Anciã de Brumafria"). */
  speakerTitle?: string;
  text: string;
  options: DialogueOptionView[];
}

/**
 * STUB — diálogos ramificados (definições em data/dialogues.ts) com condições
 * (flags, missões, itens) e efeitos (iniciar missão, dar item, abrir loja...).
 */
export class Dialogue implements GameSystem {
  readonly name = 'dialogue';
  alwaysUpdate = true;
  active = false;
  view: DialogueView | null = null;
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }
  /** Inicia conversa com um NPC (escolhe o diálogo adequado ao contexto). */
  talkTo(_npcId: string): void {}
  start(_dialogueId: string, _npcId: string): void {}
  choose(_optionIndex: number): void {}
  end(): void {
    this.active = false;
    this.view = null;
  }
}
