/**
 * "Linguagem" de dados da narrativa: CONDIÇÕES (consultas ao estado do jogo) e
 * EFEITOS (mudanças de estado) usados por missões, diálogos, falas e pontos de
 * interação. Tudo aqui é puro (sem three.js / DOM) para ser testável no vitest.
 */
import type { StoryValue } from '../../core/EventBus';

export type QuestStatusName = 'inactive' | 'active' | 'completed' | 'failed';
export type MemoryValue = string | number | boolean;

// ---------------------------------------------------------------------------
// Condições
// ---------------------------------------------------------------------------

/**
 * Uma condição atômica. Listas de condições (Cond[]) são combinadas com E lógico.
 * A forma é decidida pela chave presente (ex.: { flag: 'x' }, { item: 'y', min: 2 }).
 */
export type Cond =
  /** Flag de história verdadeira (ou igual a `is`). */
  | { flag: string; is?: StoryValue }
  /** Flag ausente/falsa. */
  | { noFlag: string }
  /** Situação de uma missão (uma ou várias aceitas). */
  | { quest: string; status: QuestStatusName | QuestStatusName[] }
  /** Missão ativa num destes estágios. */
  | { questStage: string; stage: string | string[] }
  /** Tem o item (quantidade mínima, padrão 1). */
  | { item: string; min?: number }
  | { noItem: string }
  | { gold: number }
  | { level: number }
  /** Hora do dia em [de, até) — aceita volta pela meia-noite (ex.: [20, 5]). */
  | { hour: [number, number] }
  | { night: boolean }
  | { raining: boolean }
  /** Memória do NPC (padrão: o NPC da conversa). `min`/`max` para números, `is` para igualdade. */
  | { mem: string; npc?: string; min?: number; max?: number; is?: MemoryValue }
  /** Atitude do NPC para com Kaelen (−5..5) ≥ `attitude` (ou < com `below`). */
  | { attitude: number; npc?: string; below?: boolean }
  /** Inimigo único já derrotado (ai.defeatedUniques). */
  | { defeated: string }
  | { notDefeated: string }
  | { bossDefeated: string }
  | { any: Cond[] }
  | { not: Cond };

/** O que as condições podem consultar. Implementado pelos sistemas (e por mocks nos testes). */
export interface NarrativeEnv {
  flag(key: string): StoryValue | undefined;
  questStatus(id: string): QuestStatusName;
  questStage(id: string): string | null;
  itemCount(id: string): number;
  gold(): number;
  level(): number;
  hour(): number;
  raining(): boolean;
  memory(npcId: string): Record<string, MemoryValue>;
  defeated(uniqueId: string): boolean;
  bossDefeated(bossId: string): boolean;
}

export function isNightHour(h: number): boolean {
  return h < 5.5 || h > 19.5;
}

/** Hora em [a, b) com volta pela meia-noite. */
export function inHours(h: number, a: number, b: number): boolean {
  return a <= b ? h >= a && h < b : h >= a || h < b;
}

export function evalCond(c: Cond, env: NarrativeEnv, npc?: string): boolean {
  if ('flag' in c) {
    const v = env.flag(c.flag);
    return c.is === undefined ? !!v : v === c.is;
  }
  if ('noFlag' in c) return !env.flag(c.noFlag);
  if ('quest' in c) {
    const s = env.questStatus(c.quest);
    return Array.isArray(c.status) ? c.status.includes(s) : s === c.status;
  }
  if ('questStage' in c) {
    if (env.questStatus(c.questStage) !== 'active') return false;
    const st = env.questStage(c.questStage);
    return st !== null && (Array.isArray(c.stage) ? c.stage.includes(st) : st === c.stage);
  }
  if ('item' in c) return env.itemCount(c.item) >= (c.min ?? 1);
  if ('noItem' in c) return env.itemCount(c.noItem) <= 0;
  if ('gold' in c) return env.gold() >= c.gold;
  if ('level' in c) return env.level() >= c.level;
  if ('hour' in c) return inHours(env.hour(), c.hour[0], c.hour[1]);
  if ('night' in c) return isNightHour(env.hour()) === c.night;
  if ('raining' in c) return env.raining() === c.raining;
  if ('mem' in c) {
    const id = c.npc ?? npc;
    if (!id) return false;
    const v = env.memory(id)[c.mem];
    if (c.is !== undefined) return v === c.is;
    const n = typeof v === 'number' ? v : v ? 1 : 0;
    if (c.min !== undefined && n < c.min) return false;
    if (c.max !== undefined && n > c.max) return false;
    if (c.min === undefined && c.max === undefined) return !!v;
    return true;
  }
  if ('attitude' in c) {
    const id = c.npc ?? npc;
    if (!id) return false;
    const v = env.memory(id).attitude;
    const a = typeof v === 'number' ? v : 0;
    return c.below ? a < c.attitude : a >= c.attitude;
  }
  if ('defeated' in c) return env.defeated(c.defeated);
  if ('notDefeated' in c) return !env.defeated(c.notDefeated);
  if ('bossDefeated' in c) return env.bossDefeated(c.bossDefeated);
  if ('any' in c) return c.any.some((x) => evalCond(x, env, npc));
  if ('not' in c) return !evalCond(c.not, env, npc);
  return false;
}

/** Todas verdadeiras (lista vazia/indefinida = verdadeiro). */
export function evalAll(list: readonly Cond[] | undefined, env: NarrativeEnv, npc?: string): boolean {
  if (!list) return true;
  for (const c of list) if (!evalCond(c, env, npc)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Efeitos
// ---------------------------------------------------------------------------

export type Effect =
  /** Define uma flag de história (padrão true). */
  | { set: string; value?: StoryValue }
  /** Escolha marcante (story.choose → flag `choice:<id>`). */
  | { choose: string; value: StoryValue }
  | { startQuest: string }
  /** Força o estágio de uma missão ativa. */
  | { stage: [string, string] }
  | { completeQuest: string }
  | { failQuest: string }
  /** Sinal genérico para objetivos 'signal' das missões. */
  | { signal: string }
  | { give: string; qty?: number }
  | { take: string; qty?: number }
  /** Ouro (+/−). Negativo só desconta se houver saldo. */
  | { gold: number }
  | { xp: number }
  | { skillPoints: number }
  /** Abre uma loja (depois da conversa). */
  | { shop: string }
  /** Descansa: 'morning' (até 7h), 'night' (até 21h) ou horas. Cura e marca checkpoint. */
  | { rest: 'morning' | 'night' | number; checkpoint?: string }
  | { unlockAbility: string }
  | { gate: string; open: boolean }
  /** Cria um inimigo de missão numa âncora. */
  | { spawn: string; at: string; uniqueId?: string; aggro?: boolean }
  /** Muda a atitude do NPC (padrão: o da conversa). */
  | { attitude: number; npc?: string }
  | { mem: string; npc?: string; value?: MemoryValue; inc?: number }
  | { notify: string; kind?: 'info' | 'quest' | 'loot' | 'warning' | 'level' | 'discovery' }
  /** Entrada no diário de uma missão. */
  | { log: string; quest: string }
  /** Roteiro nomeado (ver handlers do sistema de missões). `now` executa durante a conversa. */
  | { script: string; now?: boolean }
  | { freeUpgrade: number }
  | { checkpoint: string }
  /** Bônus permanente de atributo (progression.setExternalMod). */
  | { statMod: string; mods: Record<string, number> }
  /** Legenda (cinemática leve). */
  | { subtitle: string; duration?: number };

/** Efeitos que esperam o fim da conversa (abrem menus, mexem na câmera ou no relógio). */
export function isDeferred(e: Effect): boolean {
  return 'shop' in e || 'rest' in e || ('script' in e && !e.now);
}

/** Destino dos efeitos (implementado pelos sistemas). */
export interface EffectSink {
  apply(e: Effect, npc?: string): void;
}

export function applyEffects(list: readonly Effect[] | undefined, sink: EffectSink, npc?: string, deferred?: Effect[]) {
  if (!list) return;
  for (const e of list) {
    if (deferred && isDeferred(e)) deferred.push(e);
    else sink.apply(e, npc);
  }
}

/** Limita a atitude ao intervalo −5..5. */
export function clampAttitude(v: number): number {
  return Math.max(-5, Math.min(5, Math.round(v)));
}
