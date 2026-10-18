import { describe, it, expect } from 'vitest';
import { QUESTS, QUEST_POINTS, CINEMATICS, BOSS_CARDS } from '../src/data/quests';
import { DIALOGUES } from '../src/data/dialogues';
import { NPCS, NPC_BY_ID, SPEAKERS } from '../src/data/npcs';
import { BARKS, BARK_SITUATIONS } from '../src/data/barks';
import { PLACES, PATROL_ROUTES } from '../src/data/places';
import { LOCATION_BY_ID, GATES } from '../src/data/world';
import { ITEMS } from '../src/data/items';
import { WEAPONS } from '../src/data/weapons';
import { SHOPS } from '../src/data/shops';
import { QuestEngine } from '../src/rpg/quests/engine';
import { DialogueRunner } from '../src/rpg/dialogue/runner';
import type { Cond, Effect } from '../src/rpg/dialogue/script';
import { SCRIPT_IDS } from '../src/rpg/quests/scriptIds';

const itemExists = (id: string) => !!ITEMS[id] || !!(WEAPONS as Record<string, unknown>)[id];

/** Percorre recursivamente objetos atrás de condições e efeitos. */
function collect(obj: unknown, out: { conds: Cond[]; effects: Effect[] }, key = '') {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    for (const x of obj) collect(x, out, key);
    return;
  }
  const o = obj as Record<string, unknown>;
  if (key === 'effects' || key === 'onEnter' || key === 'onComplete' || key === 'onStart' || key === 'onFail') {
    out.effects.push(o as Effect);
  }
  if (key === 'when' || key === 'requires' || key === 'autoStart' || key === 'failWhen') out.conds.push(o as Cond);
  for (const [k, v] of Object.entries(o)) collect(v, out, k === 'any' || k === 'not' ? 'when' : k);
}

describe('dados da narrativa', () => {
  it('missões e diálogos passam na validação estrutural', () => {
    expect(QuestEngine.validate(QUESTS)).toEqual([]);
    expect(DialogueRunner.validate(DIALOGUES)).toEqual([]);
  });

  it('todas as âncoras, locais, rotas e portões referenciados existem', () => {
    const missing: string[] = [];
    const chk = (id: string | undefined, where: string) => {
      if (id && !PLACES[id]) missing.push(`${where}: âncora ${id}`);
    };
    for (const n of NPCS) {
      chk(n.home, n.id);
      chk(n.shelter, n.id);
      const all = [...n.schedule, ...(n.overrides ?? []).flatMap((o) => o.schedule)];
      for (const s of all) {
        chk(s.at, `${n.id}.rotina`);
        if (s.route && !PATROL_ROUTES[s.route]) missing.push(`${n.id}: rota ${s.route}`);
        if (s.tag && !Object.values(PLACES).some((p) => p.tags.includes(s.tag!))) missing.push(`${n.id}: tag ${s.tag}`);
      }
    }
    for (const p of QUEST_POINTS) chk(p.place, `ponto ${p.id}`);
    for (const q of Object.values(QUESTS)) {
      for (const st of q.stages) {
        for (const o of st.objectives) {
          chk(o.place, `${q.id}.${st.id}.${o.id}`);
          if (o.location && !LOCATION_BY_ID[o.location]) missing.push(`${q.id}: local ${o.location}`);
          if (o.marker) {
            chk(o.marker.place, `${q.id} marcador`);
            if (o.marker.location && !LOCATION_BY_ID[o.marker.location]) missing.push(`${q.id}: local ${o.marker.location}`);
          }
          if (o.target && !QUEST_POINTS.some((p) => p.id === o.target)) missing.push(`${q.id}: ponto ${o.target}`);
          for (const pt of o.points ?? []) if (!QUEST_POINTS.some((p) => p.id === pt)) missing.push(`${q.id}: ponto ${pt}`);
          if (o.npc && !NPC_BY_ID[o.npc]) missing.push(`${q.id}: npc ${o.npc}`);
          if (o.dialogue && !DIALOGUES[o.dialogue]) missing.push(`${q.id}: diálogo ${o.dialogue}`);
        }
        for (const sp of st.spawns ?? []) chk(sp.at, `${q.id} spawn`);
      }
      if (q.giver && !NPC_BY_ID[q.giver]) missing.push(`${q.id}: giver ${q.giver}`);
    }
    for (const steps of Object.values(CINEMATICS)) {
      for (const s of steps) {
        if ('shot' in s) {
          if (typeof s.shot.from === 'string') chk(s.shot.from, 'cinemática');
          if (typeof s.shot.look === 'string') chk(s.shot.look, 'cinemática');
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('itens, lojas, missões, roteiros e portões usados em efeitos/condições existem', () => {
    const bag = { conds: [] as Cond[], effects: [] as Effect[] };
    collect(QUESTS, bag);
    collect(DIALOGUES, bag);
    collect(QUEST_POINTS, bag);
    collect(CINEMATICS, bag);
    const bad: string[] = [];
    const gateIds = new Set(GATES.map((g) => g.id));
    for (const e of bag.effects) {
      if ('give' in e && !itemExists(e.give)) bad.push(`give ${e.give}`);
      if ('take' in e && !itemExists(e.take)) bad.push(`take ${e.take}`);
      if ('shop' in e && !(SHOPS as Record<string, unknown>)[e.shop]) bad.push(`shop ${e.shop}`);
      if ('startQuest' in e && !QUESTS[e.startQuest]) bad.push(`startQuest ${e.startQuest}`);
      if ('stage' in e && !QUESTS[e.stage[0]]) bad.push(`stage ${e.stage[0]}`);
      if ('log' in e && !QUESTS[e.quest]) bad.push(`log ${e.quest}`);
      if ('script' in e && !SCRIPT_IDS.includes(e.script)) bad.push(`script ${e.script}`);
      if ('gate' in e && !gateIds.has(e.gate)) bad.push(`gate ${e.gate}`);
      if ('attitude' in e && e.npc && !NPC_BY_ID[e.npc]) bad.push(`attitude npc ${e.npc}`);
      if ('mem' in e && e.npc && !NPC_BY_ID[e.npc]) bad.push(`mem npc ${e.npc}`);
    }
    for (const c of bag.conds) {
      if ('item' in c && !itemExists(c.item)) bad.push(`cond item ${c.item}`);
      if ('quest' in c && !QUESTS[c.quest]) bad.push(`cond quest ${c.quest}`);
      if ('questStage' in c) {
        const q = QUESTS[c.questStage];
        if (!q) bad.push(`cond questStage ${c.questStage}`);
        else for (const s of Array.isArray(c.stage) ? c.stage : [c.stage]) if (!q.stages.some((x) => x.id === s)) bad.push(`cond estágio ${c.questStage}.${s}`);
      }
    }
    for (const q of Object.values(QUESTS)) for (const [id] of [...(q.rewards?.items ?? []), ...(q.branchRewards ?? []).flatMap((b) => b.rewards.items ?? [])]) if (!itemExists(id)) bad.push(`recompensa ${id}`);
    expect(bad).toEqual([]);
    expect(Object.keys(BOSS_CARDS)).toContain('guardiao_mecanico');
  });

  it('cada diálogo pertence a um NPC, ponto de interação ou falante conhecido', () => {
    const owners = new Set([...NPCS.map((n) => n.id), ...QUEST_POINTS.map((p) => p.id)]);
    const bad = Object.values(DIALOGUES).filter((d) => !owners.has(d.npc)).map((d) => d.id);
    expect(bad).toEqual([]);
    // falantes explícitos dos nós
    const speakers = new Set([...NPCS.map((n) => n.id), ...Object.keys(SPEAKERS)]);
    const badSpk: string[] = [];
    for (const d of Object.values(DIALOGUES)) for (const [nid, n] of Object.entries(d.nodes)) if (n.speaker && !speakers.has(n.speaker)) badSpk.push(`${d.id}.${nid}:${n.speaker}`);
    expect(badSpk).toEqual([]);
  });

  it('NPCs: 8 nomeados da história + 10–14 moradores + guardas; ids únicos; rotina cobre 24 h', () => {
    expect(new Set(NPCS.map((n) => n.id)).size).toBe(NPCS.length);
    for (const id of ['maren', 'bran', 'doran', 'hilda', 'teodoro', 'ilsa', 'sabine', 'calen']) expect(NPC_BY_ID[id]?.story, id).toBe(true);
    const villagers = NPCS.filter((n) => !n.story && n.faction === 'villager');
    expect(villagers.length).toBeGreaterThanOrEqual(10);
    expect(villagers.length).toBeLessThanOrEqual(14);
    expect(NPCS.filter((n) => n.faction === 'guard').length).toBeGreaterThanOrEqual(4);
    for (const n of NPCS) {
      for (let h = 0; h < 24; h += 0.5) {
        const has = n.schedule.some((s) => (s.from <= s.to ? h >= s.from && h < s.to : h >= s.from || h < s.to));
        expect(has, `${n.id} sem rotina às ${h}h`).toBe(true);
      }
    }
  });

  it('falas curtas (barks): situações conhecidas, texto não vazio e variedade', () => {
    for (const b of BARKS) {
      expect(BARK_SITUATIONS).toContain(b.situation);
      expect(b.text.trim().length).toBeGreaterThan(0);
      if (b.npc) expect(NPC_BY_ID[b.npc], b.npc).toBeDefined();
    }
    for (const s of BARK_SITUATIONS) expect(BARKS.filter((b) => b.situation === s).length, s).toBeGreaterThanOrEqual(3);
  });
});
