/**
 * Lógica pura das rotinas dos NPCs (sem three.js): qual entrada vale agora,
 * substituições por estado da história, abrigo e atividades internas/externas.
 */
import { evalAll, inHours, type NarrativeEnv } from '../rpg/dialogue/script';
import type { NpcActivity, NpcDef, ScheduleEntry } from '../data/npcs';
import { PLACES } from '../data/places';

/** Rotina efetiva (a primeira substituição cujas condições valem, ou a padrão). */
export function effectiveSchedule(def: NpcDef, env: NarrativeEnv | null): ScheduleEntry[] {
  if (env && def.overrides) {
    for (const o of def.overrides) if (evalAll(o.when, env, def.id)) return o.schedule;
  }
  return def.schedule;
}

/** Entrada da rotina para a hora `h` (a primeira que cobre a hora; fallback: a última). */
export function entryAt(schedule: readonly ScheduleEntry[], h: number): ScheduleEntry {
  for (const s of schedule) if (inHours(h, s.from, s.to)) return s;
  return schedule[schedule.length - 1];
}

/** Chave estável de uma entrada (detecta troca de atividade). */
export function entryKey(e: ScheduleEntry): string {
  return `${e.from}-${e.to}:${e.act}:${e.at ?? ''}:${e.tag ?? ''}:${e.route ?? ''}`;
}

/** Atividades que acontecem dentro de casa (o NPC some na porta). */
export function isHomeActivity(a: NpcActivity): boolean {
  return a === 'sleep';
}

/** Atividade em que o NPC fica sentado. */
export function isSeated(a: NpcActivity): boolean {
  return a === 'sit' || a === 'drink';
}

/** Atividades que se movem continuamente (rota ou passeio). */
export function isRoaming(a: NpcActivity): boolean {
  return a === 'patrol' || a === 'wander' || a === 'play';
}

/** Âncoras dentro de prédios cobertos (não precisam de abrigo na chuva). */
export function isIndoorAnchor(id: string | undefined): boolean {
  if (!id) return false;
  const p = PLACES[id];
  if (!p) return false;
  return p.tags.includes('interior') || id.startsWith('santuario_vila');
}

/**
 * A chuva tira este NPC do lugar? Guardas ficam no posto; quem já está coberto
 * fica; os demais procuram abrigo.
 */
export function seeksShelterFromRain(def: NpcDef, e: ScheduleEntry): boolean {
  if (def.faction === 'guard') return false;
  if (e.act === 'sleep') return false;
  if (e.act === 'sell' && (e.at?.startsWith('barraca') ?? false)) return true;
  return !isIndoorAnchor(e.at);
}

/** Horas até a próxima troca de entrada (para "pular" a simulação distante). */
export function hoursUntilChange(e: ScheduleEntry, h: number): number {
  const to = e.to;
  let d = to - h;
  if (d <= 0) d += 24;
  return d;
}

/** Índice determinístico (0..n-1) a partir de um texto e um contador — variedade sem Math.random. */
export function hashPick(seed: string, k: number, n: number): number {
  let h = 2166136261 ^ k;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return n > 0 ? ((h >>> 0) % n) : 0;
}
