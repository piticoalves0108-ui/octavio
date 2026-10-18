/**
 * Escolha de falas curtas (puro, testável): filtra por situação, NPC, papel,
 * facção e condições; evita repetir as últimas falas do NPC e do mundo; sorteio
 * ponderado (falas exclusivas do NPC pesam mais).
 */
import { evalAll, type NarrativeEnv } from '../rpg/dialogue/script';
import { BARKS, BARK_RULES, type BarkDef, type BarkSituation } from '../data/barks';
import type { NpcRole } from '../data/npcs';

export interface BarkSpeaker {
  id: string;
  role: NpcRole;
  faction: 'villager' | 'guard';
}

export class BarkPicker {
  /** Últimas falas (texto) por NPC. */
  private recentByNpc = new Map<string, string[]>();
  /** Últimas falas do mundo inteiro. */
  private recentGlobal: string[] = [];
  private candidates: BarkDef[] = [];
  private weights: number[] = [];

  constructor(
    private barks: readonly BarkDef[] = BARKS,
    private rules = BARK_RULES,
  ) {}

  /** Candidatas válidas agora (sem anti-repetição). */
  eligible(s: BarkSpeaker, situation: BarkSituation, env: NarrativeEnv | null, out: BarkDef[] = []): BarkDef[] {
    out.length = 0;
    for (const b of this.barks) {
      if (b.situation !== situation) continue;
      if (b.npc && b.npc !== s.id) continue;
      if (b.roles && !b.roles.includes(s.role)) continue;
      if (b.faction && b.faction !== s.faction) continue;
      if (b.when && (!env || !evalAll(b.when, env, s.id))) continue;
      out.push(b);
    }
    return out;
  }

  /**
   * Escolhe uma fala (ou null se não houver). `rand` em [0,1) — injetável nos testes.
   * Registra a escolha no histórico (anti-repetição).
   */
  pick(s: BarkSpeaker, situation: BarkSituation, env: NarrativeEnv | null, rand: () => number = Math.random): BarkDef | null {
    const list = this.eligible(s, situation, env, this.candidates);
    if (list.length === 0) return null;
    const mine = this.recentByNpc.get(s.id) ?? [];
    const w = this.weights;
    w.length = 0;
    let total = 0;
    // se houver alguma fala que este NPC não disse há pouco, as repetidas ficam de fora
    let fresh = 0;
    for (const b of list) if (!mine.includes(b.text)) fresh++;
    for (const b of list) {
      let wt = (b.weight ?? 1) + (b.npc ? 2 : 0);
      if (mine.includes(b.text)) wt = fresh > 0 ? 0 : wt * 0.02;
      else if (this.recentGlobal.includes(b.text)) wt *= 0.15;
      w.push(wt);
      total += wt;
    }
    let r = rand() * total;
    let chosen = list[list.length - 1];
    for (let i = 0; i < list.length; i++) {
      if (r < w[i]) {
        chosen = list[i];
        break;
      }
      r -= w[i];
    }
    this.remember(s.id, chosen.text);
    return chosen;
  }

  private remember(npcId: string, text: string) {
    let mine = this.recentByNpc.get(npcId);
    if (!mine) {
      mine = [];
      this.recentByNpc.set(npcId, mine);
    }
    mine.push(text);
    if (mine.length > this.rules.npcMemory) mine.shift();
    this.recentGlobal.push(text);
    if (this.recentGlobal.length > this.rules.globalMemory) this.recentGlobal.shift();
  }

  /** Duração do balão para o texto. */
  duration(text: string): number {
    return Math.min(this.rules.maxSeconds, Math.max(this.rules.minSeconds, text.length * this.rules.secondsPerChar));
  }

  reset() {
    this.recentByNpc.clear();
    this.recentGlobal.length = 0;
  }
}
