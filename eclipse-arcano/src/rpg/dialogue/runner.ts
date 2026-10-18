/**
 * Motor puro de diálogos: escolhe a conversa certa para um NPC (prioridade +
 * condições), resolve variantes de texto, filtra opções por condições, aplica
 * efeitos e navega entre nós. Sem three.js/DOM — testado no vitest.
 */
import { applyEffects, evalAll, type Cond, type Effect, type EffectSink, type NarrativeEnv } from './script';

export type Tone = 'compassivo' | 'pragmatico' | 'arrogante' | 'curioso';

export interface TextVariant {
  when?: Cond[];
  text: string;
}

export interface DialogueOptionDef {
  text: string;
  /** Condições para a opção aparecer. */
  when?: Cond[];
  /** Se definido, a opção aparece BLOQUEADA (com este motivo) quando `when` falha. */
  lockedText?: string;
  effects?: Effect[];
  /** Próximo nó. Ausente = encerra a conversa. */
  next?: string;
  important?: boolean;
  tone?: Tone;
  /** Some depois de escolhida uma vez (perguntas já feitas). */
  once?: boolean;
}

export interface DialogueNodeDef {
  /** Quem fala: id de NPC, 'kaelen', 'narrador' ou um nome literal. Padrão: o NPC da conversa. */
  speaker?: string;
  /** Texto (ou variantes por condição — vale a primeira que passar). */
  text: string | TextVariant[];
  /** Efeitos ao entrar no nó. */
  effects?: Effect[];
  options?: DialogueOptionDef[];
  /** Sem opções: continua para este nó (opção única "Continuar"). */
  next?: string;
}

export interface DialogueDef {
  id: string;
  /** NPC (ou ponto de interação) dono da conversa. */
  npc: string;
  /** Maior vence no talkTo (missões > rotina > genérico). */
  priority?: number;
  when?: Cond[];
  /** Só acontece uma vez. */
  once?: boolean;
  /** Nó inicial (ou lista de inícios condicionais; vale o primeiro que passar). */
  start: string | { when?: Cond[]; node: string }[];
  nodes: Record<string, DialogueNodeDef>;
}

export interface RunnerOptionView {
  index: number;
  text: string;
  seen?: boolean;
  important?: boolean;
  disabled?: boolean;
  tone?: Tone;
}

export interface RunnerView {
  dialogueId: string;
  nodeId: string;
  npcId: string;
  speaker: string;
  text: string;
  options: RunnerOptionView[];
}

export interface RunnerHost extends EffectSink {
  env: NarrativeEnv;
  /** Nome de exibição de um falante. */
  speakerName(id: string): string;
}

export const CONTINUE_TEXT = 'Continuar';
export const END_TEXT = 'Encerrar conversa';

interface ResolvedOption {
  def: DialogueOptionDef | null;
  key: string;
  disabled: boolean;
  /** Opção sintética (Continuar → next). */
  next?: string;
}

/**
 * Executa UMA conversa por vez. `seen` (opções já escolhidas, conversas `once`
 * concluídas) é persistido pelo dono (sistema de missões salva).
 */
export class DialogueRunner {
  dialogueId: string | null = null;
  nodeId: string | null = null;
  npcId = '';
  /** Efeitos adiados até o fim da conversa (lojas, descanso, roteiros). */
  deferred: Effect[] = [];
  private options: ResolvedOption[] = [];
  /** Chaves `dlg:node:opt` já escolhidas e `done:dlg` concluídas. */
  readonly seen = new Set<string>();

  constructor(
    public defs: Record<string, DialogueDef>,
    private host: RunnerHost,
  ) {}

  get active() {
    return this.dialogueId !== null;
  }

  /** Conversa adequada para o NPC agora (ou null). */
  pickFor(npcId: string): string | null {
    let best: DialogueDef | null = null;
    for (const d of Object.values(this.defs)) {
      if (d.npc !== npcId) continue;
      if (d.once && this.seen.has(`done:${d.id}`)) continue;
      if (!evalAll(d.when, this.host.env, npcId)) continue;
      if (this.startNode(d) === null) continue;
      if (!best || (d.priority ?? 0) > (best.priority ?? 0)) best = d;
    }
    return best ? best.id : null;
  }

  private startNode(d: DialogueDef): string | null {
    if (typeof d.start === 'string') return d.start;
    for (const s of d.start) if (evalAll(s.when, this.host.env, d.npc)) return s.node;
    return null;
  }

  /** Começa uma conversa. Retorna a primeira vista (ou null se não existir). */
  begin(dialogueId: string, npcId?: string): RunnerView | null {
    const d = this.defs[dialogueId];
    if (!d) return null;
    const start = this.startNode(d);
    if (!start || !d.nodes[start]) return null;
    this.dialogueId = d.id;
    this.npcId = npcId ?? d.npc;
    this.deferred = [];
    return this.enter(start);
  }

  private enter(nodeId: string): RunnerView | null {
    const d = this.defs[this.dialogueId!];
    const node = d?.nodes[nodeId];
    if (!node) {
      this.finish();
      return null;
    }
    this.nodeId = nodeId;
    applyEffects(node.effects, this.host, this.npcId, this.deferred);
    // efeitos podem ter encerrado a conversa (ex.: roteiro imediato)
    if (this.dialogueId === null) return null;
    return this.view();
  }

  /** Vista atual (recalcula opções — condições podem ter mudado). */
  view(): RunnerView | null {
    if (!this.dialogueId || !this.nodeId) return null;
    const d = this.defs[this.dialogueId];
    const node = d.nodes[this.nodeId];
    const env = this.host.env;
    let text = '';
    if (typeof node.text === 'string') text = node.text;
    else {
      for (const v of node.text) {
        if (evalAll(v.when, env, this.npcId)) {
          text = v.text;
          break;
        }
      }
    }
    this.options = [];
    const out: RunnerOptionView[] = [];
    if (node.options && node.options.length) {
      node.options.forEach((o, i) => {
        const key = `${d.id}:${this.nodeId}:${i}`;
        const seen = this.seen.has(key);
        if (o.once && seen) return;
        const ok = evalAll(o.when, env, this.npcId);
        if (!ok && !o.lockedText) return;
        this.options.push({ def: o, key, disabled: !ok });
        out.push({
          index: out.length,
          text: ok ? o.text : `${o.text} (${o.lockedText})`,
          seen,
          important: o.important,
          disabled: !ok || undefined,
          tone: o.tone,
        });
      });
    }
    if (this.options.length === 0) {
      // sem opções válidas: continuar (next) ou encerrar
      this.options.push({ def: null, key: '', disabled: false, next: node.next });
      out.push({ index: 0, text: node.next ? CONTINUE_TEXT : END_TEXT });
    }
    const speakerId = node.speaker ?? this.npcId;
    return { dialogueId: d.id, nodeId: this.nodeId, npcId: this.npcId, speaker: this.host.speakerName(speakerId), text, options: out };
  }

  /**
   * Escolhe a opção `i` da vista atual. Retorna a próxima vista, ou null se a
   * conversa terminou (os efeitos adiados ficam em `deferred` para o dono rodar).
   * Opção inexistente/bloqueada: devolve a mesma vista.
   */
  choose(i: number): RunnerView | null {
    if (!this.dialogueId) return null;
    const o = this.options[i];
    if (!o || o.disabled) return this.view();
    if (!o.def) {
      if (o.next) return this.enter(o.next);
      this.finish();
      return null;
    }
    this.seen.add(o.key);
    applyEffects(o.def.effects, this.host, this.npcId, this.deferred);
    if (this.dialogueId === null) return null;
    if (o.def.next) return this.enter(o.def.next);
    this.finish();
    return null;
  }

  /** Encerra (marca `once` como concluída). */
  finish() {
    if (this.dialogueId) {
      const d = this.defs[this.dialogueId];
      if (d?.once) this.seen.add(`done:${d.id}`);
    }
    this.dialogueId = null;
    this.nodeId = null;
    this.options = [];
  }

  /** Validação estrutural dos dados (testes/depuração). Retorna lista de problemas. */
  static validate(defs: Record<string, DialogueDef>): string[] {
    const errs: string[] = [];
    for (const [id, d] of Object.entries(defs)) {
      if (d.id !== id) errs.push(`${id}: id divergente`);
      const starts = typeof d.start === 'string' ? [d.start] : d.start.map((s) => s.node);
      for (const s of starts) if (!d.nodes[s]) errs.push(`${id}: início inexistente ${s}`);
      for (const [nid, n] of Object.entries(d.nodes)) {
        if (n.next && !d.nodes[n.next]) errs.push(`${id}.${nid}: next inexistente ${n.next}`);
        for (const o of n.options ?? []) if (o.next && !d.nodes[o.next]) errs.push(`${id}.${nid}: opção "${o.text}" → nó inexistente ${o.next}`);
        const texts = typeof n.text === 'string' ? [n.text] : n.text.map((t) => t.text);
        for (const t of texts) if (!t.trim()) errs.push(`${id}.${nid}: texto vazio`);
      }
    }
    return errs;
  }
}
