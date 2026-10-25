import { describe, it, expect } from 'vitest';
import { QuestEngine, type QuestHost, type ObjectiveDef } from '../src/rpg/quests/engine';
import { DialogueRunner, type RunnerView } from '../src/rpg/dialogue/runner';
import { applyEffects, evalAll, type Effect, type NarrativeEnv } from '../src/rpg/dialogue/script';
import { QUESTS, QUEST_POINT_BY_ID, CINEMATICS } from '../src/data/quests';
import { DIALOGUES } from '../src/data/dialogues';
import type { StoryValue } from '../src/core/EventBus';

/**
 * Campanha real dos Atos II a IV, só com dados + motores puros (sem WebGL):
 * Ferroluz → Bruxa e Dragão → Forja → Pântano → Templo → Darian → Eclipse → final.
 */
class World {
  flags = new Map<string, StoryValue>();
  items = new Map<string, number>();
  bosses = new Set<string>();
  at = new Set<string>();
  scripts: string[] = [];
  gates: string[] = [];
  gold = 0;
  engine!: QuestEngine;
  runner!: DialogueRunner;
  env: NarrativeEnv = {
    flag: (k) => this.flags.get(k),
    questStatus: (id) => this.engine?.status(id) ?? 'inactive',
    questStage: (id) => this.engine?.stage(id) ?? null,
    itemCount: (id) => this.items.get(id) ?? 0,
    gold: () => this.gold,
    level: () => 20,
    hour: () => 12,
    raining: () => false,
    memory: () => ({}),
    defeated: () => false,
    bossDefeated: (b) => this.bosses.has(b),
  };
  apply = (e: Effect) => {
    if ('set' in e) this.flags.set(e.set, e.value ?? true);
    else if ('choose' in e) this.flags.set(`choice:${e.choose}`, e.value);
    else if ('give' in e) this.items.set(e.give, (this.items.get(e.give) ?? 0) + (e.qty ?? 1));
    else if ('take' in e) this.items.set(e.take, Math.max(0, (this.items.get(e.take) ?? 0) - (e.qty ?? 1)));
    else if ('gold' in e) this.gold += e.gold;
    else if ('gate' in e) this.gates.push(e.gate);
    else if ('startQuest' in e) this.engine.start(e.startQuest);
    else if ('log' in e) this.engine.log(e.quest, e.log);
    else if ('script' in e) {
      this.scripts.push(e.script);
      // como o CinematicPlayer: passos de efeito (com `when`) da cinemática de mesmo nome
      for (const s of CINEMATICS[e.script] ?? []) if ('effects' in s && (!s.when || evalAll(s.when, this.env))) applyEffects(s.effects, { apply: this.apply });
    }
  };
  constructor() {
    const host: QuestHost = {
      env: this.env,
      apply: this.apply,
      day: () => 30,
      notify: () => {},
      emit: () => {},
      isAt: (o: ObjectiveDef) => this.at.has(o.place ?? o.location ?? ''),
      countDefeated: () => 0,
      grantRewards: (r) => {
        this.gold += r.gold ?? 0;
        for (const [id, q] of r.items ?? []) this.items.set(id, (this.items.get(id) ?? 0) + q);
        applyEffects(r.effects, { apply: this.apply });
      },
      itemName: (id) => id,
    };
    this.engine = new QuestEngine(QUESTS, host);
    this.runner = new DialogueRunner(DIALOGUES, { env: this.env, apply: this.apply, speakerName: (id) => id });
  }

  /** Conversa escolhendo opções pelo começo do texto (ou a primeira habilitada). */
  talk(npc: string, picks: string[] = []): string {
    const id = this.runner.pickFor(npc);
    expect(id, `sem diálogo para ${npc}`).not.toBeNull();
    let v: RunnerView | null = this.runner.begin(id!, npc);
    let guard = 0;
    while (v && guard++ < 40) {
      const want = picks.find((p) => v!.options.some((o) => o.text.includes(p) && !o.disabled));
      const opt = want ? v.options.find((o) => o.text.includes(want) && !o.disabled)! : v.options.find((o) => !o.disabled)!;
      if (want) picks.splice(picks.indexOf(want), 1);
      v = this.runner.choose(opt.index);
    }
    applyEffects(this.runner.deferred, { apply: this.apply }, npc);
    this.runner.deferred.length = 0;
    this.engine.onTalk(npc, id!);
    if (QUEST_POINT_BY_ID[npc]) this.engine.onInteract(npc);
    this.engine.tick();
    return id!;
  }

  /** Opções de um nó (para ver o que está bloqueado). */
  optionsAt(npc: string, path: string[]): RunnerView {
    let v = this.runner.begin(this.runner.pickFor(npc)!, npc)!;
    for (const p of path) v = this.runner.choose(v.options.find((o) => o.text.includes(p))!.index)!;
    return v;
  }

  /** Usa um ponto de interação de missão (condições, requisitos e efeitos). */
  point(id: string) {
    const p = QUEST_POINT_BY_ID[id];
    expect(p, id).toBeDefined();
    expect(evalAll(p.when ?? [], this.env), `${id} visível`).toBe(true);
    expect(evalAll(p.requires ?? [], this.env), `${id} liberado`).toBe(true);
    applyEffects(p.effects, { apply: this.apply });
    this.engine.onInteract(id);
    this.engine.tick();
  }

  reach(place: string) {
    this.at.add(place);
    this.engine.tick();
  }

  boss(id: string) {
    this.bosses.add(id);
    this.engine.onBoss(id);
    this.engine.tick();
  }
}

/** Kaelen ao fim do Ato I no caminho "luminoso". */
function luminous(): World {
  const w = new World();
  for (const f of ['ravena_poupada', 'guardiao_libertado', 'frag_farol', 'frag_cripta', 'ato1_concluido']) w.flags.set(f, true);
  w.items.set('carta_barao', 1);
  w.items.set('fragmento_memoria', 4);
  return w;
}

/** Kaelen ao fim do Ato I no caminho "implacável". */
function ruthless(): World {
  const w = new World();
  for (const f of ['ravena_executada', 'nucleo_absorvido', 'frag_cripta', 'ato1_concluido']) w.flags.set(f, true);
  w.items.set('bilhete_corvos', 1);
  w.items.set('fragmento_memoria', 2);
  return w;
}

function actTwo(w: World, opts: { arquivo: boolean }) {
  w.engine.start('q_ferroluz');
  w.reach('posto_ferroluz');
  expect(w.engine.stage('q_ferroluz')).toBe('portao');
  expect(w.talk('sentinela_ferroluz', ['Meu nome'])).toBe('sentinela_portao');
  expect(w.gates).toContain('portao_ferroluz');
  expect(w.engine.stage('q_ferroluz')).toBe('barao');
  expect(w.talk('barao', ['Que sábio', 'Que tipo'])).toBe('barao_encontro');
  expect(w.engine.stage('q_ferroluz')).toBe('teste');
  w.boss('colosso_ferro');
  expect(w.talk('barao', ['Agora diga', 'Eu trago'])).toBe('barao_pedido');
  expect(w.engine.status('q_ferroluz')).toBe('completed');
  expect(w.engine.status('q_tempestade')).toBe('active');
  expect(w.engine.status('q_dragao')).toBe('active');
  expect(w.runner.pickFor('barao')).toBe('barao_espera');

  w.reach('pico_tempestades');
  expect(w.engine.stage('q_tempestade')).toBe('bruxa');
  w.boss('bruxa_tempestades');
  w.point('altar_tempestade');
  expect(w.engine.status('q_tempestade')).toBe('completed');

  w.reach('picos_cristal');
  w.boss('dragao_cristal');
  w.point('cristal_primordial_pegar');
  expect(w.engine.status('q_dragao')).toBe('completed');

  expect(w.engine.stage('q_forja')).toBe('forja');
  expect(w.runner.pickFor('barao')).toBe('barao_forja');
  if (opts.arquivo) w.point('arquivo_ferroluz');
  w.point('forja_celeste');
  expect(w.scripts).toContain('forja_acesa');
  expect(w.items.get('coracao_tempestade')).toBe(0);
  expect(w.flags.get('frag_forja')).toBe(true);
  expect(w.engine.stage('q_forja')).toBe('confronto');
  expect(w.runner.pickFor('barao')).toBe('barao_confronto');
}

function actThree(w: World, darianPick: string) {
  expect(w.engine.stage('q_pantano')).toBe('pantano');
  w.reach('coracao_pantano');
  w.boss('devorador_almas');
  expect(w.engine.status('q_pantano')).toBe('completed');
  expect(w.flags.get('corrupcao_enfraquecida')).toBe(true);
  w.reach('templo_submerso');
  w.boss('guardiao_primeira_era');
  w.point('selo_primeira_era');
  expect(w.scripts).toContain('memoria_templo');
  expect(w.engine.status('q_templo')).toBe('completed');
  w.reach('torre_observador');
  w.boss('cavaleiro_eclipse');
  expect(w.engine.stage('q_darian')).toBe('escolha');
  expect(w.talk('darian_rendido', [darianPick])).toBe('darian_escolha');
  expect(w.engine.status('q_darian')).toBe('completed');
  expect(w.flags.get('ato3_concluido')).toBe(true);
  expect(w.scripts).toContain('epilogo_ato3');
  // o Ato IV começa com a cidadela surgindo
  expect(w.engine.stage('q_eclipse')).toBe('rei');
  expect(w.flags.get('cidadela_surgiu')).toBe(true);
}

describe('campanha real (dados): Atos II a IV e os três finais', () => {
  it('caminho luminoso: convence o Barão, redime Darian e chega à Reunificação', () => {
    const w = luminous();
    actTwo(w, { arquivo: true });
    expect(w.items.get('cartas_arquivo')).toBe(1);
    expect(w.talk('barao', ['Aldric', 'Você foi enganado'])).toBe('barao_confronto');
    expect(w.flags.get('barao_redimido')).toBe(true);
    expect(w.engine.status('q_forja')).toBe('completed');
    expect(w.items.get('placa_colosso')).toBe(1);
    expect(w.flags.get('ato2_concluido')).toBe(true);
    expect(w.scripts).toEqual(expect.arrayContaining(['barao_convencido', 'epilogo_ato2']));
    expect(w.runner.pickFor('barao')).toBe('barao_depois');

    actThree(w, 'Volte comigo');
    expect(w.flags.get('darian_redimido')).toBe(true);
    expect(w.items.get('emblema_darian')).toBe(1);
    expect(w.items.get('fragmento_memoria')).toBe(6);

    w.boss('rei_aldric');
    expect(w.engine.stage('q_eclipse')).toBe('escolha');
    const v = w.optionsAt('coracao_eclipse', []);
    expect(v.nodeId).toBe('inicio');
    const esc = w.optionsAt('coracao_eclipse', [CONTINUE, CONTINUE]);
    expect(esc.options.find((o) => o.text.startsWith('Usar o Coração'))?.disabled).toBeFalsy();
    expect(esc.options.find((o) => o.text.startsWith('Beber'))?.disabled).toBe(true);
    w.talk('coracao_eclipse', ['Usar o Coração']);
    expect(w.scripts).toContain('final_reunificacao');
    expect(w.flags.get('final')).toBe('reunificacao');
    expect(w.engine.status('q_eclipse')).toBe('completed');
    expect(w.flags.get('jogo_concluido')).toBe(true);
  });

  it('caminho implacável: sem provas o Barão só pode ser exposto, Darian morre e a Ascensão Sombria abre', () => {
    const w = ruthless();
    actTwo(w, { arquivo: false });
    const dec = w.optionsAt('barao', ['Aldric', CONTINUE]);
    expect(dec.nodeId).toBe('decisao');
    expect(dec.options.find((o) => o.text.startsWith('Você foi enganado'))?.disabled).toBe(true);
    w.talk('barao', ['Aldric', 'Os engenheiros']);
    expect(w.flags.get('barao_exposto')).toBe(true);
    expect(w.engine.status('q_forja')).toBe('completed');
    expect(w.items.get('placa_colosso') ?? 0).toBe(0);

    // sem o fragmento do farol, Darian não pode ser redimido
    w.reach('coracao_pantano');
    w.boss('devorador_almas');
    w.reach('templo_submerso');
    w.boss('guardiao_primeira_era');
    w.point('selo_primeira_era');
    w.reach('torre_observador');
    w.boss('cavaleiro_eclipse');
    const d = w.optionsAt('darian_rendido', [CONTINUE_ANY, CONTINUE]);
    expect(d.options.find((o) => o.text.startsWith('Volte comigo'))?.disabled).toBe(true);
    w.talk('darian_rendido', ['Você fez a sua escolha']);
    expect(w.flags.get('darian_morto')).toBe(true);
    expect(w.items.get('insignia_eclipse')).toBe(1);
    expect(w.engine.stage('q_eclipse')).toBe('rei');

    w.boss('rei_aldric');
    const esc = w.optionsAt('coracao_eclipse', [CONTINUE, CONTINUE]);
    expect(esc.options.find((o) => o.text.startsWith('Usar o Coração'))?.disabled).toBe(true);
    expect(esc.options.find((o) => o.text.startsWith('Beber'))?.disabled).toBeFalsy();
    w.talk('coracao_eclipse', ['Beber']);
    expect(w.flags.get('final')).toBe('sombrio');
    expect(w.engine.status('q_eclipse')).toBe('completed');
  });

  it('o Selo Eterno está sempre disponível', () => {
    const w = ruthless();
    w.engine.start('q_eclipse');
    w.boss('rei_aldric');
    w.talk('coracao_eclipse', ['Selar Aldric']);
    expect(w.flags.get('final')).toBe('selo');
    expect(w.engine.status('q_eclipse')).toBe('completed');
  });

  it('epílogos dos finais mostram só o destino real de cada aliado', () => {
    const w = luminous();
    w.flags.set('barao_redimido', true);
    w.flags.set('darian_morto', true);
    const shown = (id: string) => CINEMATICS[id].filter((s) => 'subtitle' in s && !('title' in s) && (!s.when || evalAll(s.when, w.env))).map((s) => (s as { subtitle: string }).subtitle);
    for (const id of ['final_reunificacao', 'final_selo', 'final_sombrio']) {
      const lines = shown(id).join('\n');
      expect(lines, id).toContain('Teodric Vael varre');
      expect(lines, id).not.toContain('numa cela');
      expect(lines, id).toContain('insígnia do Cavaleiro');
      expect(lines, id).not.toContain('acendeu o farol sozinho');
      expect(lines, id).toContain('capuz negro');
      // todo final termina definindo a flag do final (objetivo da missão)
      expect(CINEMATICS[id].some((s) => 'effects' in s && s.effects.some((e) => 'set' in e && e.set === 'final'))).toBe(true);
    }
  });
});

const CONTINUE = 'Continuar';
/** Primeira opção da tela (o que vier). */
const CONTINUE_ANY = '';
