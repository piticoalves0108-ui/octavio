import * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import { DIALOGUES } from '../data/dialogues';
import { NPC_BY_ID, SPEAKERS } from '../data/npcs';
import { QUEST_POINT_BY_ID } from '../data/quests';
import { DialogueRunner, type RunnerView, type Tone } from './dialogue/runner';
import { applyEffects } from './dialogue/script';

export interface DialogueOptionView {
  index: number;
  text: string;
  /** Opção já escolhida antes (UI pode esmaecer). */
  seen?: boolean;
  /** Indica consequência importante (UI pode destacar). */
  important?: boolean;
  /** Opção visível mas bloqueada (condição não cumprida; o motivo vem no texto). */
  disabled?: boolean;
  /** Postura da fala: compassivo, pragmático, arrogante, curioso. */
  tone?: Tone;
}

export interface DialogueView {
  npcId: string;
  speaker: string;
  /** Subtítulo do falante (ex.: "Anciã de Brumafria"). */
  speakerTitle?: string;
  text: string;
  options: DialogueOptionView[];
  /** Id da conversa e do nó (depuração/testes). */
  dialogueId?: string;
  nodeId?: string;
  /** Falante é o próprio Kaelen (fala interior) ou o narrador. */
  narration?: boolean;
}

const V = new THREE.Vector3();

/**
 * Diálogos ramificados (src/data/dialogues.ts) com condições (flags, missões,
 * itens, nível, ouro, hora, memória/atitude do NPC) e efeitos (flags, escolhas,
 * missões, itens, ouro, XP, lojas, descanso, habilidades, portões, inimigos,
 * atitude). Contrato C9: chama ui.showDialogue(view|null) a cada mudança, usa o
 * estado 'dialogue' e foca a câmera (camera.setDialogueFocus). A UI chama choose(i).
 */
export class Dialogue implements GameSystem {
  readonly name = 'dialogue';
  alwaysUpdate = true;
  active = false;
  view: DialogueView | null = null;
  protected ctx!: GameContext;
  runner!: DialogueRunner;
  private npcId = '';
  private dialogueId = '';
  /** Estatísticas (testes). */
  readonly stats = { started: 0, choices: 0, ended: 0 };

  init(ctx: GameContext) {
    this.ctx = ctx;
    const bridge = (ctx.sys.quests as unknown as { narrative: import('./quests/bridge').NarrativeBridge }).narrative;
    this.runner = new DialogueRunner(DIALOGUES, {
      env: bridge.env,
      apply: (e, npc) => bridge.apply(e, npc),
      speakerName: (id) => speakerName(id),
    });
    const pending = (ctx.sys.quests as unknown as { takePendingSeen?: () => string[] | null }).takePendingSeen?.();
    if (pending) for (const k of pending) this.runner.seen.add(k);
  }

  /** Inicia conversa com um NPC (escolhe o diálogo adequado ao contexto). */
  talkTo(npcId: string): void {
    if (this.active || !this.runner) return;
    // conta a conversa antes de escolher (as falas de "primeiro encontro" usam talks ≤ 1)
    const mem = this.ctx.sys.npcs.memory(npcId);
    mem.talks = ((mem.talks as number) || 0) + 1;
    const id = this.runner.pickFor(npcId);
    if (!id) {
      mem.talks = Math.max(0, (mem.talks as number) - 1);
      this.ctx.sys.npcs.bark(npcId, 'greet');
      return;
    }
    this.start(id, npcId);
  }

  start(dialogueId: string, npcId: string): void {
    if (this.active || !this.runner) return;
    const v = this.runner.begin(dialogueId, npcId);
    if (!v) return;
    this.active = true;
    this.npcId = npcId;
    this.dialogueId = dialogueId;
    this.stats.started++;
    const ctx = this.ctx;
    if (ctx.state === 'playing') ctx.setState('dialogue');
    if (this.focusPoint(npcId, V)) ctx.sys.camera.setDialogueFocus(V);
    ctx.events.emit('dialogue:start', { npcId, dialogueId });
    if (NPC_BY_ID[npcId]) ctx.events.emit('npc:talked', { npcId });
    // efeitos do nó inicial podem ter encerrado a conversa
    if (!this.runner.active) {
      this.finish();
      return;
    }
    this.present(v);
  }

  choose(optionIndex: number): void {
    if (!this.active || !this.view) return;
    const opt = this.view.options[optionIndex];
    if (!opt || opt.disabled) return;
    this.stats.choices++;
    this.ctx.events.emit('dialogue:choice', { npcId: this.npcId, dialogueId: this.dialogueId, text: opt.text, tone: opt.tone });
    const v = this.runner.choose(optionIndex);
    if (v) this.present(v);
    else this.finish();
  }

  end(): void {
    if (!this.active) {
      this.view = null;
      return;
    }
    this.runner.finish();
    this.finish();
  }

  update(_dt: number, ctx: GameContext) {
    // conversa presa (ex.: o jogo voltou ao menu): limpa
    if (this.active && (ctx.state === 'menu' || ctx.state === 'dead')) this.end();
  }

  private present(v: RunnerView) {
    const spk = v.speaker;
    const speakerId = this.speakerIdOf(v);
    const view: DialogueView = {
      npcId: v.npcId,
      speaker: spk,
      speakerTitle: speakerTitle(speakerId),
      text: v.text,
      options: v.options.map((o) => ({ index: o.index, text: o.text, seen: o.seen || undefined, important: o.important || undefined, disabled: o.disabled, tone: o.tone })),
      dialogueId: v.dialogueId,
      nodeId: v.nodeId,
      narration: speakerId === 'narrador' || speakerId === 'kaelen' || undefined,
    };
    this.view = view;
    this.ctx.sys.ui.showDialogue(view);
  }

  private speakerIdOf(v: RunnerView): string {
    const d = DIALOGUES[v.dialogueId];
    return d?.nodes[v.nodeId]?.speaker ?? v.npcId;
  }

  private finish() {
    const ctx = this.ctx;
    const npcId = this.npcId;
    const dialogueId = this.dialogueId;
    const deferred = this.runner.deferred.slice();
    this.runner.deferred.length = 0;
    this.active = false;
    this.view = null;
    this.stats.ended++;
    ctx.sys.ui.showDialogue(null);
    ctx.sys.camera.setDialogueFocus(null);
    if (ctx.state === 'dialogue') ctx.setState('playing');
    // memória: acordou para conversar → volta a dormir
    const mem = NPC_BY_ID[npcId] ? ctx.sys.npcs.memory(npcId) : null;
    if (mem && mem.acordada) mem.acordada = false;
    ctx.events.emit('dialogue:end', { npcId, dialogueId });
    // efeitos adiados (lojas, descanso, roteiros) rodam depois que a conversa fecha
    const bridge = (ctx.sys.quests as unknown as { narrative: { apply: (e: unknown, npc?: string) => void } }).narrative;
    applyEffects(deferred, { apply: (e, n) => bridge.apply(e, n) }, npcId);
  }

  /** Ponto que a câmera enquadra (cabeça do NPC, ponto de interação ou inimigo único). */
  private focusPoint(id: string, out: THREE.Vector3): boolean {
    const sys = this.ctx.sys;
    const npc = sys.npcs.get(id);
    if (npc) {
      out.copy(npc.position);
      out.y += npc.height * 0.9;
      return true;
    }
    const qp = (sys.quests as unknown as { points?: { byId: Map<string, { resolve(o: THREE.Vector3): boolean }> } }).points?.byId.get(id);
    if (qp && qp.resolve(out)) {
      out.y += 1.2;
      return true;
    }
    return false;
  }
}

/** Nome de exibição de um falante (NPC, falante especial ou ponto de interação). */
export function speakerName(id: string): string {
  return NPC_BY_ID[id]?.name ?? SPEAKERS[id]?.name ?? QUEST_POINT_BY_ID[id]?.name ?? id;
}

export function speakerTitle(id: string): string | undefined {
  return NPC_BY_ID[id]?.title ?? SPEAKERS[id]?.title;
}
