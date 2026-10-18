/**
 * Motor puro de missões orientado a dados: estágios, objetivos (falar, alcançar,
 * matar, chefe, coletar, interagir, flag, horário, sinal), ramificações por
 * condições/escolhas, falha, recompensas, diário com log e salvamento validado.
 * Não conhece three.js nem o DOM: tudo que precisa do mundo passa pelo `QuestHost`.
 */
import type { StoryValue } from '../../core/EventBus';
import { applyEffects, evalAll, inHours, isNightHour, type Cond, type Effect, type EffectSink, type NarrativeEnv, type QuestStatusName } from '../dialogue/script';

export type ObjectiveKind = 'talk' | 'reach' | 'kill' | 'boss' | 'collect' | 'interact' | 'flag' | 'time' | 'signal';
export type QuestCategory = 'main' | 'side' | 'contract' | 'personal' | 'mystery';

/** Onde pôr o marcador do objetivo (resolvido pelo sistema com posições reais). */
export interface MarkerRef {
  place?: string;
  npc?: string;
  location?: string;
  /** Inimigo único vivo (ex.: 'ravena'). */
  unique?: string;
  /** Coordenadas (x, z) do mundo. */
  pos?: [number, number];
  radius?: number;
  label?: string;
}

export interface ObjectiveDef {
  id: string;
  text: string;
  kind: ObjectiveKind;
  /** talk */
  npc?: string;
  dialogue?: string;
  /** reach: âncora (places.ts) ou local (world.ts) + raio (m) */
  place?: string;
  location?: string;
  /** reach: coordenadas (x, z) quando não há âncora. */
  pos?: [number, number];
  radius?: number;
  /** Pontos de interação (QUEST_POINTS) que recebem marcador enquanto não usados. */
  points?: string[];
  /** kill: tipo (typeId), ou um único (uniqueId), ou um prefixo de únicos (uniquePrefix) */
  typeId?: string;
  uniqueId?: string;
  uniquePrefix?: string;
  count?: number;
  /** boss */
  bossId?: string;
  /** collect (conta o inventário) */
  item?: string;
  /** interact: id do ponto de interação */
  target?: string;
  /** flag */
  flag?: string;
  value?: StoryValue;
  /** time */
  hours?: [number, number];
  night?: boolean;
  /** signal */
  signal?: string;
  optional?: boolean;
  /** O objetivo só existe (aparece e conta) quando estas condições valem. */
  when?: Cond[];
  /** Só pode ser cumprido enquanto estas condições valem (ex.: à noite). */
  requires?: Cond[];
  /** Marcador explícito (false = sem marcador). Padrão: derivado do objetivo. */
  marker?: MarkerRef | false;
}

/** Inimigo/criatura de missão criado ao entrar no estágio (ou quando o jogador chega perto). */
export interface QuestSpawnDef {
  typeId: string;
  /** Âncora (places.ts). */
  at: string;
  uniqueId: string;
  aggro?: boolean;
  /** Só cria quando o jogador está a menos de `near` m da âncora. */
  near?: number;
  /** Deslocamento (x, z) em metros. */
  offset?: [number, number];
  when?: Cond[];
  creature?: boolean;
}

export interface StageDef {
  id: string;
  /** Substitui a descrição da missão no diário enquanto neste estágio. */
  description?: string;
  /** Dica do próximo passo. */
  nextStep: string;
  objectives: ObjectiveDef[];
  /** Basta UM objetivo (não opcional) para concluir o estágio. */
  any?: boolean;
  onEnter?: Effect[];
  onComplete?: Effect[];
  /** Itens consumidos ao concluir o estágio. */
  consume?: [string, number][];
  /** Ramificações avaliadas em ordem; a primeira que passar define o próximo estágio. */
  branches?: { when: Cond[]; next: string }[];
  /** Próximo estágio ('complete' finaliza). Padrão: o seguinte na lista. */
  next?: string;
  /** Entrada no log ao entrar no estágio. */
  log?: string;
  spawns?: QuestSpawnDef[];
}

export interface QuestRewards {
  xp?: number;
  gold?: number;
  items?: [string, number][];
  skillPoints?: number;
  effects?: Effect[];
}

export interface QuestDef {
  id: string;
  title: string;
  category: QuestCategory;
  /** NPC que dá a missão (marcador "!" antes de começar). */
  giver?: string;
  description: string;
  stages: StageDef[];
  rewards?: QuestRewards;
  /** Recompensas extras por ramo (avaliadas na conclusão). */
  branchRewards?: { when: Cond[]; rewards: QuestRewards }[];
  rewardsText?: string;
  /** Começa sozinha quando estas condições valerem. */
  autoStart?: Cond[];
  /** Falha quando estas condições valerem (com a missão ativa). */
  failWhen?: Cond[];
  failText?: string;
  onStart?: Effect[];
  onComplete?: Effect[];
  onFail?: Effect[];
  /** Missões iniciadas ao concluir esta. */
  next?: string[];
  /** Texto do diário depois de concluída. */
  completedText?: string | { when?: Cond[]; text: string }[];
}

export interface QuestState {
  id: string;
  status: QuestStatusName;
  stage: string | null;
  progress: Record<string, number>;
  log: string[];
  startedDay: number;
  endedDay: number;
}

export interface JournalObjectiveData {
  text: string;
  done: boolean;
  progress?: number;
  target?: number;
  optional?: boolean;
}

export interface JournalEntryData {
  id: string;
  title: string;
  category: string;
  status: QuestStatusName;
  description: string;
  nextStep: string;
  objectives: JournalObjectiveData[];
  log: string[];
  rewardsText?: string;
}

export interface QuestHost extends EffectSink {
  env: NarrativeEnv;
  day(): number;
  notify(text: string, kind: 'info' | 'quest' | 'warning'): void;
  emit(kind: 'started' | 'updated' | 'completed' | 'failed', questId: string): void;
  /** O jogador está no alvo de um objetivo 'reach'? */
  isAt(o: ObjectiveDef): boolean;
  /** Quantos únicos com este prefixo já foram derrotados. */
  countDefeated(prefix: string): number;
  grantRewards(r: QuestRewards, quest: QuestDef): void;
  onStageEnter?(quest: QuestDef, stage: StageDef): void;
  itemName?(id: string): string;
}

const MAX_LOG = 60;
const VALID_STATUS: QuestStatusName[] = ['inactive', 'active', 'completed', 'failed'];

export function objectiveTarget(o: ObjectiveDef): number {
  return o.kind === 'kill' || o.kind === 'collect' ? Math.max(1, o.count ?? 1) : 1;
}

export class QuestEngine {
  readonly states = new Map<string, QuestState>();
  tracked: string | null = null;
  /** Evita reentrância (efeitos que mexem na mesma missão durante uma transição). */
  private busy = new Set<string>();

  constructor(
    public defs: Record<string, QuestDef>,
    private host: QuestHost,
  ) {}

  // ------------------------------------------------------------------ consulta
  status(id: string): QuestStatusName {
    return this.states.get(id)?.status ?? 'inactive';
  }
  stage(id: string): string | null {
    const s = this.states.get(id);
    return s && s.status === 'active' ? s.stage : null;
  }
  stageDef(id: string): StageDef | null {
    const def = this.defs[id];
    const st = this.stage(id);
    return def && st ? def.stages.find((s) => s.id === st) ?? null : null;
  }
  active(): QuestDef[] {
    const out: QuestDef[] = [];
    for (const s of this.states.values()) if (s.status === 'active' && this.defs[s.id]) out.push(this.defs[s.id]);
    return out;
  }
  /** Objetivos que existem agora no estágio atual (filtra `when`). */
  currentObjectives(id: string): ObjectiveDef[] {
    const sd = this.stageDef(id);
    if (!sd) return [];
    return sd.objectives.filter((o) => evalAll(o.when, this.host.env));
  }
  isObjectiveDone(id: string, o: ObjectiveDef): boolean {
    const s = this.states.get(id);
    return !!s && (s.progress[o.id] ?? 0) >= objectiveTarget(o);
  }

  // ------------------------------------------------------------------ ciclo de vida
  start(id: string): boolean {
    const def = this.defs[id];
    if (!def || !def.stages.length) return false;
    const cur = this.states.get(id);
    if (cur && (cur.status === 'active' || cur.status === 'completed' || cur.status === 'failed')) return false;
    const st: QuestState = { id, status: 'active', stage: null, progress: {}, log: [], startedDay: this.host.day(), endedDay: 0 };
    this.states.set(id, st);
    this.pushLog(st, `Dia ${st.startedDay}: missão iniciada.`);
    applyEffects(def.onStart, this.host);
    this.host.emit('started', id);
    this.host.notify(`${def.category === 'main' ? 'Missão principal' : def.category === 'contract' ? 'Contrato' : 'Nova missão'}: ${def.title}`, 'quest');
    if (!this.tracked || (def.category === 'main' && this.defs[this.tracked]?.category !== 'main')) this.tracked = id;
    this.enterStage(def, st, def.stages[0].id);
    return true;
  }

  /** Força um estágio (efeito de diálogo / roteiro). */
  setStage(id: string, stageId: string): boolean {
    const def = this.defs[id];
    const st = this.states.get(id);
    if (!def || !st || st.status !== 'active') return false;
    if (!def.stages.some((s) => s.id === stageId)) return false;
    this.enterStage(def, st, stageId);
    return true;
  }

  complete(id: string): boolean {
    const def = this.defs[id];
    if (!def) return false;
    let st = this.states.get(id);
    if (st && (st.status === 'completed' || st.status === 'failed')) return false;
    if (!st) {
      st = { id, status: 'active', stage: null, progress: {}, log: [], startedDay: this.host.day(), endedDay: 0 };
      this.states.set(id, st);
    }
    st.status = 'completed';
    st.endedDay = this.host.day();
    this.pushLog(st, `Dia ${st.endedDay}: missão concluída.`);
    if (def.rewards) this.host.grantRewards(def.rewards, def);
    for (const br of def.branchRewards ?? []) if (evalAll(br.when, this.host.env)) this.host.grantRewards(br.rewards, def);
    applyEffects(def.onComplete, this.host);
    this.host.emit('completed', id);
    this.host.notify(`Missão concluída: ${def.title}`, 'quest');
    if (this.tracked === id) this.tracked = this.pickTracked();
    for (const n of def.next ?? []) this.start(n);
    return true;
  }

  fail(id: string): boolean {
    const def = this.defs[id];
    const st = this.states.get(id);
    if (!def || !st || st.status !== 'active') return false;
    st.status = 'failed';
    st.endedDay = this.host.day();
    this.pushLog(st, def.failText ? `Dia ${st.endedDay}: ${def.failText}` : `Dia ${st.endedDay}: missão fracassada.`);
    applyEffects(def.onFail, this.host);
    this.host.emit('failed', id);
    this.host.notify(`Missão fracassada: ${def.title}`, 'warning');
    if (this.tracked === id) this.tracked = this.pickTracked();
    return true;
  }

  private pickTracked(): string | null {
    let side: string | null = null;
    for (const s of this.states.values()) {
      if (s.status !== 'active') continue;
      if (this.defs[s.id]?.category === 'main') return s.id;
      side ??= s.id;
    }
    return side;
  }

  log(id: string, text: string) {
    const st = this.states.get(id);
    if (st) {
      this.pushLog(st, text);
      this.host.emit('updated', id);
    }
  }

  private pushLog(st: QuestState, text: string) {
    if (st.log[st.log.length - 1] === text) return;
    st.log.push(text);
    if (st.log.length > MAX_LOG) st.log.splice(0, st.log.length - MAX_LOG);
  }

  private enterStage(def: QuestDef, st: QuestState, stageId: string) {
    const sd = def.stages.find((s) => s.id === stageId);
    if (!sd) return;
    st.stage = stageId;
    st.progress = {};
    // objetivos de abate por únicos já derrotados contam desde já (save no meio da luta, ordem livre)
    for (const o of sd.objectives) {
      if (o.kind !== 'kill') continue;
      let n = 0;
      if (o.uniquePrefix) n = this.host.countDefeated(o.uniquePrefix);
      else if (o.uniqueId && this.host.env.defeated(o.uniqueId)) n = objectiveTarget(o);
      if (n > 0) st.progress[o.id] = Math.min(objectiveTarget(o), n);
    }
    if (sd.log) this.pushLog(st, sd.log);
    this.busy.add(def.id);
    try {
      applyEffects(sd.onEnter, this.host);
      this.host.onStageEnter?.(def, sd);
    } finally {
      this.busy.delete(def.id);
    }
    this.host.emit('updated', def.id);
    if (st.status === 'active' && st.stage === stageId) this.evaluate(def, st);
  }

  // ------------------------------------------------------------------ eventos
  onKill(typeId: string, uniqueId?: string) {
    this.forEachObjective('kill', (def, st, o) => {
      let match = false;
      if (o.uniqueId) match = uniqueId === o.uniqueId;
      else if (o.uniquePrefix) match = !!uniqueId && uniqueId.startsWith(o.uniquePrefix);
      else match = o.typeId === typeId;
      if (match) this.bump(def, st, o, 1);
    });
  }
  onBoss(bossId: string) {
    this.forEachObjective('boss', (def, st, o) => {
      if (o.bossId === bossId) this.bump(def, st, o, 1);
    });
  }
  onTalk(npcId: string, dialogueId?: string) {
    this.forEachObjective('talk', (def, st, o) => {
      if (o.npc === npcId && (!o.dialogue || o.dialogue === dialogueId)) this.bump(def, st, o, 1);
    });
  }
  onInteract(targetId: string) {
    this.forEachObjective('interact', (def, st, o) => {
      if (o.target === targetId) this.bump(def, st, o, 1);
    });
  }
  onSignal(signal: string) {
    this.forEachObjective('signal', (def, st, o) => {
      if (o.signal === signal) this.bump(def, st, o, 1);
    });
  }

  private forEachObjective(kind: ObjectiveKind, fn: (def: QuestDef, st: QuestState, o: ObjectiveDef) => void) {
    // cópia: um objetivo pode concluir a missão e iniciar outra durante o laço
    for (const st of Array.from(this.states.values())) {
      if (st.status !== 'active') continue;
      const def = this.defs[st.id];
      const sd = def?.stages.find((s) => s.id === st.stage);
      if (!sd) continue;
      const stageAtStart = st.stage;
      for (const o of sd.objectives) {
        if (st.stage !== stageAtStart || st.status !== 'active') break;
        if (o.kind !== kind) continue;
        if (!evalAll(o.when, this.host.env) || !evalAll(o.requires, this.host.env)) continue;
        if ((st.progress[o.id] ?? 0) >= objectiveTarget(o)) continue;
        fn(def, st, o);
      }
    }
  }

  private bump(def: QuestDef, st: QuestState, o: ObjectiveDef, n: number) {
    const target = objectiveTarget(o);
    const before = st.progress[o.id] ?? 0;
    const after = Math.min(target, before + n);
    if (after === before) return;
    st.progress[o.id] = after;
    if (target > 1) this.host.notify(`${o.text}: ${after}/${target}`, 'quest');
    this.host.emit('updated', def.id);
    this.evaluate(def, st);
  }

  /** Avalia objetivos consultados (alcançar, coletar, flag, horário, únicos) e conclui estágios. */
  tick() {
    for (const st of Array.from(this.states.values())) {
      const def = this.defs[st.id];
      if (!def || st.status !== 'active') continue;
      if (def.failWhen && evalAll(def.failWhen, this.host.env)) {
        this.fail(def.id);
        continue;
      }
      this.evaluate(def, st);
    }
    // início automático
    for (const def of Object.values(this.defs)) {
      if (!def.autoStart || this.status(def.id) !== 'inactive') continue;
      if (evalAll(def.autoStart, this.host.env)) this.start(def.id);
    }
  }

  private evaluate(def: QuestDef, st: QuestState) {
    if (this.busy.has(def.id)) return;
    const env = this.host.env;
    for (let guard = 0; guard < 12; guard++) {
      if (st.status !== 'active') return;
      const sd = def.stages.find((s) => s.id === st.stage);
      if (!sd) return;
      let changed = false;
      for (const o of sd.objectives) {
        if (!evalAll(o.when, env)) continue;
        const ok = evalAll(o.requires, env);
        const target = objectiveTarget(o);
        const cur = st.progress[o.id] ?? 0;
        let next = cur;
        switch (o.kind) {
          case 'reach':
            if (cur < 1 && ok && this.host.isAt(o)) next = 1;
            break;
          case 'collect':
            next = o.item ? Math.min(target, this.host.env.itemCount(o.item)) : cur;
            break;
          case 'flag':
            if (o.flag) {
              const v = env.flag(o.flag);
              if (cur < 1 && ok && (o.value === undefined ? !!v : v === o.value)) next = 1;
            }
            break;
          case 'time': {
            const h = env.hour();
            const inTime = o.hours ? inHours(h, o.hours[0], o.hours[1]) : o.night !== undefined ? isNightHour(h) === o.night : true;
            if (cur < 1 && ok && inTime) next = 1;
            break;
          }
          case 'boss':
            if (cur < 1 && o.bossId && env.bossDefeated(o.bossId)) next = 1;
            break;
          case 'kill':
            if (o.uniqueId && cur < target && env.defeated(o.uniqueId)) next = target;
            else if (o.uniquePrefix) next = Math.max(cur, Math.min(target, this.host.countDefeated(o.uniquePrefix)));
            break;
          default:
            break;
        }
        if (next !== cur) {
          st.progress[o.id] = next;
          changed = true;
        }
      }
      if (changed) this.host.emit('updated', def.id);
      if (!this.stageComplete(sd, st)) return;
      this.advance(def, st, sd);
    }
  }

  private stageComplete(sd: StageDef, st: QuestState): boolean {
    const env = this.host.env;
    let required = 0;
    let done = 0;
    for (const o of sd.objectives) {
      if (o.optional || !evalAll(o.when, env)) continue;
      required++;
      if ((st.progress[o.id] ?? 0) >= objectiveTarget(o)) done++;
    }
    if (required === 0) return true;
    return sd.any ? done > 0 : done === required;
  }

  private advance(def: QuestDef, st: QuestState, sd: StageDef) {
    const env = this.host.env;
    this.busy.add(def.id);
    try {
      for (const [item, qty] of sd.consume ?? []) this.host.apply({ take: item, qty });
      applyEffects(sd.onComplete, this.host);
    } finally {
      this.busy.delete(def.id);
    }
    if (st.status !== 'active' || st.stage !== sd.id) return; // efeito mudou o rumo
    let next: string | undefined;
    for (const b of sd.branches ?? []) {
      if (evalAll(b.when, env)) {
        next = b.next;
        break;
      }
    }
    if (!next) next = sd.next;
    if (!next) {
      const i = def.stages.indexOf(sd);
      next = i >= 0 && i + 1 < def.stages.length ? def.stages[i + 1].id : 'complete';
    }
    if (next === 'complete') this.complete(def.id);
    else this.enterStage(def, st, next);
  }

  // ------------------------------------------------------------------ diário
  journal(): JournalEntryData[] {
    const out: JournalEntryData[] = [];
    const env = this.host.env;
    const order: Record<QuestStatusName, number> = { active: 0, completed: 1, failed: 2, inactive: 3 };
    const list = Array.from(this.states.values()).filter((s) => s.status !== 'inactive' && this.defs[s.id]);
    list.sort((a, b) => order[a.status] - order[b.status] || (a.id === this.tracked ? -1 : b.id === this.tracked ? 1 : 0) || catOrder(this.defs[a.id].category) - catOrder(this.defs[b.id].category));
    for (const st of list) {
      const def = this.defs[st.id];
      const sd = def.stages.find((s) => s.id === st.stage);
      const objectives: JournalObjectiveData[] = [];
      let description = def.description;
      let nextStep = '';
      if (st.status === 'active' && sd) {
        description = sd.description ?? def.description;
        nextStep = sd.nextStep;
        for (const o of sd.objectives) {
          if (!evalAll(o.when, env)) continue;
          const target = objectiveTarget(o);
          const p = st.progress[o.id] ?? 0;
          objectives.push({ text: o.text, done: p >= target, progress: target > 1 ? p : undefined, target: target > 1 ? target : undefined, optional: o.optional || undefined });
        }
      } else if (st.status === 'completed') {
        nextStep = 'Missão concluída.';
        if (def.completedText) {
          if (typeof def.completedText === 'string') description = def.completedText;
          else for (const v of def.completedText) if (evalAll(v.when, env)) {
            description = v.text;
            break;
          }
        }
      } else if (st.status === 'failed') {
        nextStep = def.failText ?? 'Missão fracassada.';
      }
      out.push({ id: def.id, title: def.title, category: def.category, status: st.status, description, nextStep, objectives, log: st.log.slice(), rewardsText: def.rewardsText ?? this.rewardsText(def.rewards) });
    }
    return out;
  }

  rewardsText(r?: QuestRewards): string | undefined {
    if (!r) return undefined;
    const parts: string[] = [];
    if (r.xp) parts.push(`${r.xp} XP`);
    if (r.gold) parts.push(`${r.gold} de ouro`);
    for (const [id, q] of r.items ?? []) parts.push(`${this.host.itemName?.(id) ?? id}${q > 1 ? ` ×${q}` : ''}`);
    if (r.skillPoints) parts.push(`${r.skillPoints} ponto${r.skillPoints > 1 ? 's' : ''} de talento`);
    return parts.length ? parts.join(' · ') : undefined;
  }

  // ------------------------------------------------------------------ save
  reset() {
    this.states.clear();
    this.tracked = null;
    this.busy.clear();
  }

  serialize() {
    return {
      v: 1,
      tracked: this.tracked,
      states: Array.from(this.states.values()).map((s) => ({ id: s.id, status: s.status, stage: s.stage, progress: { ...s.progress }, log: s.log.slice(), startedDay: s.startedDay, endedDay: s.endedDay })),
    };
  }

  /** Valida e carrega (lança erro se o formato for inválido; ignora missões desconhecidas). */
  deserialize(data: unknown) {
    if (!data || typeof data !== 'object') throw new Error('dados de missões inválidos');
    const d = data as { tracked?: unknown; states?: unknown };
    if (d.states !== undefined && !Array.isArray(d.states)) throw new Error('lista de missões inválida');
    this.reset();
    for (const raw of (d.states as any[]) ?? []) {
      if (!raw || typeof raw.id !== 'string') continue;
      const def = this.defs[raw.id];
      if (!def) continue;
      const status: QuestStatusName = VALID_STATUS.includes(raw.status) ? raw.status : 'inactive';
      if (status === 'inactive') continue;
      let stage: string | null = typeof raw.stage === 'string' ? raw.stage : null;
      if (status === 'active' && (!stage || !def.stages.some((s) => s.id === stage))) stage = def.stages[0].id;
      const progress: Record<string, number> = {};
      if (raw.progress && typeof raw.progress === 'object') {
        for (const [k, v] of Object.entries(raw.progress)) if (typeof v === 'number' && isFinite(v) && v >= 0) progress[k] = Math.min(999, v);
      }
      const log = Array.isArray(raw.log) ? raw.log.filter((x: unknown) => typeof x === 'string').slice(-MAX_LOG) : [];
      this.states.set(raw.id, {
        id: raw.id,
        status,
        stage,
        progress,
        log,
        startedDay: Number.isFinite(raw.startedDay) ? raw.startedDay : 1,
        endedDay: Number.isFinite(raw.endedDay) ? raw.endedDay : 0,
      });
    }
    this.tracked = typeof d.tracked === 'string' && this.status(d.tracked) === 'active' ? d.tracked : this.pickTracked();
  }

  /** Validação estrutural dos dados (testes). */
  static validate(defs: Record<string, QuestDef>): string[] {
    const errs: string[] = [];
    for (const [id, q] of Object.entries(defs)) {
      if (q.id !== id) errs.push(`${id}: id divergente`);
      if (!q.stages.length) errs.push(`${id}: sem estágios`);
      const ids = new Set(q.stages.map((s) => s.id));
      if (ids.size !== q.stages.length) errs.push(`${id}: estágios repetidos`);
      for (const s of q.stages) {
        if (s.next && s.next !== 'complete' && !ids.has(s.next)) errs.push(`${id}.${s.id}: next inexistente ${s.next}`);
        for (const b of s.branches ?? []) if (b.next !== 'complete' && !ids.has(b.next)) errs.push(`${id}.${s.id}: ramo inexistente ${b.next}`);
        const oids = new Set<string>();
        for (const o of s.objectives) {
          if (oids.has(o.id)) errs.push(`${id}.${s.id}: objetivo repetido ${o.id}`);
          oids.add(o.id);
          if (o.kind === 'talk' && !o.npc) errs.push(`${id}.${s.id}.${o.id}: talk sem npc`);
          if (o.kind === 'reach' && !o.place && !o.location && !o.pos) errs.push(`${id}.${s.id}.${o.id}: reach sem alvo`);
          if (o.kind === 'kill' && !o.typeId && !o.uniqueId && !o.uniquePrefix) errs.push(`${id}.${s.id}.${o.id}: kill sem alvo`);
          if (o.kind === 'collect' && !o.item) errs.push(`${id}.${s.id}.${o.id}: collect sem item`);
          if (o.kind === 'interact' && !o.target) errs.push(`${id}.${s.id}.${o.id}: interact sem alvo`);
          if (o.kind === 'boss' && !o.bossId) errs.push(`${id}.${s.id}.${o.id}: boss sem id`);
          if (o.kind === 'flag' && !o.flag) errs.push(`${id}.${s.id}.${o.id}: flag sem chave`);
          if (o.kind === 'signal' && !o.signal) errs.push(`${id}.${s.id}.${o.id}: signal sem id`);
        }
      }
      for (const n of q.next ?? []) if (!defs[n]) errs.push(`${id}: próxima missão inexistente ${n}`);
    }
    return errs;
  }
}

function catOrder(c: string): number {
  return c === 'main' ? 0 : c === 'side' ? 1 : c === 'personal' ? 2 : c === 'contract' ? 3 : 4;
}
