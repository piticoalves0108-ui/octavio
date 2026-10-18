import { describe, it, expect, beforeEach } from 'vitest';
import { QuestEngine, type QuestDef, type QuestHost, type ObjectiveDef } from '../src/rpg/quests/engine';
import { DialogueRunner, type DialogueDef } from '../src/rpg/dialogue/runner';
import { evalCond, evalAll, inHours, applyEffects, type Effect, type NarrativeEnv, type QuestStatusName } from '../src/rpg/dialogue/script';
import { QUESTS } from '../src/data/quests';
import { DIALOGUES } from '../src/data/dialogues';
import type { StoryValue } from '../src/core/EventBus';

/** Mundo falso: flags, inventário, ouro, nível, hora, memória, únicos derrotados. */
class World {
  flags = new Map<string, StoryValue>();
  items = new Map<string, number>();
  gold = 0;
  level = 1;
  hour = 10;
  raining = false;
  mem = new Map<string, Record<string, string | number | boolean>>();
  defeated = new Set<string>();
  bosses = new Set<string>();
  at = new Set<string>();
  applied: Effect[] = [];
  notes: string[] = [];
  events: string[] = [];
  xp = 0;
  engine!: QuestEngine;
  env: NarrativeEnv = {
    flag: (k) => this.flags.get(k),
    questStatus: (id) => this.engine?.status(id) ?? 'inactive',
    questStage: (id) => this.engine?.stage(id) ?? null,
    itemCount: (id) => this.items.get(id) ?? 0,
    gold: () => this.gold,
    level: () => this.level,
    hour: () => this.hour,
    raining: () => this.raining,
    memory: (npc) => {
      let m = this.mem.get(npc);
      if (!m) this.mem.set(npc, (m = {}));
      return m;
    },
    defeated: (u) => this.defeated.has(u),
    bossDefeated: (b) => this.bosses.has(b),
  };
  apply = (e: Effect, npc?: string) => {
    this.applied.push(e);
    if ('set' in e) this.flags.set(e.set, e.value ?? true);
    else if ('choose' in e) this.flags.set(`choice:${e.choose}`, e.value);
    else if ('give' in e) this.items.set(e.give, (this.items.get(e.give) ?? 0) + (e.qty ?? 1));
    else if ('take' in e) this.items.set(e.take, Math.max(0, (this.items.get(e.take) ?? 0) - (e.qty ?? 1)));
    else if ('gold' in e) this.gold += e.gold;
    else if ('startQuest' in e) this.engine.start(e.startQuest);
    else if ('stage' in e) this.engine.setStage(e.stage[0], e.stage[1]);
    else if ('attitude' in e) {
      const m = this.env.memory(e.npc ?? npc ?? '?');
      m.attitude = ((m.attitude as number) || 0) + e.attitude;
    } else if ('mem' in e) {
      const m = this.env.memory(e.npc ?? npc ?? '?');
      m[e.mem] = e.inc !== undefined ? ((m[e.mem] as number) || 0) + e.inc : e.value ?? true;
    } else if ('log' in e) this.engine.log(e.quest, e.log);
  };
  host(): QuestHost {
    return {
      env: this.env,
      apply: this.apply,
      day: () => 3,
      notify: (t) => this.notes.push(t),
      emit: (k, q) => this.events.push(`${k}:${q}`),
      isAt: (o: ObjectiveDef) => this.at.has(o.place ?? o.location ?? (o.pos ? o.pos.join(',') : '')),
      countDefeated: (prefix) => [...this.defeated].filter((u) => u.startsWith(prefix)).length,
      grantRewards: (r) => {
        this.xp += r.xp ?? 0;
        this.gold += r.gold ?? 0;
        for (const [id, q] of r.items ?? []) this.items.set(id, (this.items.get(id) ?? 0) + q);
        applyEffects(r.effects, { apply: this.apply });
      },
      itemName: (id) => id.toUpperCase(),
    };
  }
}

// ---------------------------------------------------------------------------
describe('condições e efeitos (script.ts)', () => {
  const w = new World();
  w.engine = new QuestEngine({}, w.host());
  it('flags, itens, ouro, nível, hora (volta da meia-noite), chuva, memória, any/not', () => {
    w.flags.set('a', true);
    w.flags.set('postura', 'arrogante');
    w.items.set('cristal_chave', 1);
    w.gold = 30;
    w.level = 3;
    w.hour = 23;
    expect(evalCond({ flag: 'a' }, w.env)).toBe(true);
    expect(evalCond({ flag: 'postura', is: 'honesto' }, w.env)).toBe(false);
    expect(evalCond({ noFlag: 'b' }, w.env)).toBe(true);
    expect(evalCond({ item: 'cristal_chave' }, w.env)).toBe(true);
    expect(evalCond({ item: 'cristal_chave', min: 2 }, w.env)).toBe(false);
    expect(evalCond({ gold: 25 }, w.env)).toBe(true);
    expect(evalCond({ level: 4 }, w.env)).toBe(false);
    expect(evalCond({ hour: [20, 5] }, w.env)).toBe(true);
    expect(evalCond({ night: true }, w.env)).toBe(true);
    expect(inHours(3, 20, 5)).toBe(true);
    expect(inHours(12, 20, 5)).toBe(false);
    w.env.memory('bran').attitude = -3;
    expect(evalCond({ attitude: -2, below: true }, w.env, 'bran')).toBe(true);
    expect(evalCond({ mem: 'talks', max: 1 }, w.env, 'bran')).toBe(true);
    expect(evalCond({ any: [{ flag: 'zzz' }, { gold: 1 }] }, w.env)).toBe(true);
    expect(evalCond({ not: { flag: 'a' } }, w.env)).toBe(false);
    expect(evalAll(undefined, w.env)).toBe(true);
  });
  it('efeitos adiados (loja/descanso/roteiro) esperam o fim da conversa', () => {
    const deferred: Effect[] = [];
    const done: Effect[] = [];
    applyEffects([{ shop: 'loja_sabine' }, { set: 'x' }, { rest: 'morning' }, { script: 'a' }, { script: 'b', now: true }], { apply: (e) => done.push(e) }, undefined, deferred);
    expect(deferred.length).toBe(3);
    expect(done.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
describe('motor de missões', () => {
  let w: World;
  const defs: Record<string, QuestDef> = {
    q_a: {
      id: 'q_a',
      title: 'Teste',
      category: 'side',
      description: 'desc',
      rewards: { xp: 50, gold: 10, items: [['pocao_vida', 2]] },
      branchRewards: [{ when: [{ flag: 'escolha', is: 'boa' }], rewards: { xp: 25 } }],
      next: ['q_b'],
      stages: [
        { id: 's1', nextStep: 'fale', objectives: [{ id: 'o1', kind: 'talk', npc: 'maren', text: 'Falar' }] },
        {
          id: 's2',
          nextStep: 'mate',
          objectives: [
            { id: 'lobos', kind: 'kill', typeId: 'lobo', count: 3, text: 'Lobos' },
            { id: 'ervas', kind: 'collect', item: 'erva', count: 2, text: 'Ervas' },
            { id: 'opc', kind: 'reach', place: 'longe', text: 'Opcional', optional: true },
          ],
        },
        {
          id: 's3',
          nextStep: 'decida',
          branches: [{ when: [{ flag: 'escolha', is: 'ma' }], next: 's5' }],
          objectives: [{ id: 'd', kind: 'flag', flag: 'escolha', text: 'Decidir' }],
        },
        { id: 's4', nextStep: 'noite', next: 'complete', objectives: [{ id: 'n', kind: 'time', night: true, text: 'Noite' }] },
        { id: 's5', nextStep: 'ruim', objectives: [{ id: 'x', kind: 'signal', signal: 'fim', text: 'Fim' }] },
      ],
    },
    q_b: { id: 'q_b', title: 'B', category: 'side', description: 'b', stages: [{ id: 'b1', nextStep: '', objectives: [{ id: 'r', kind: 'reach', place: 'aqui', text: 'Ir' }] }] },
    q_f: { id: 'q_f', title: 'F', category: 'side', description: 'f', failWhen: [{ flag: 'morreu' }], failText: 'O cervo morreu.', stages: [{ id: 'f1', nextStep: '', objectives: [{ id: 'f', kind: 'flag', flag: 'nunca', text: 'x' }] }] },
    q_u: {
      id: 'q_u',
      title: 'U',
      category: 'main',
      description: 'u',
      stages: [{ id: 'u1', nextStep: '', objectives: [{ id: 'k', kind: 'kill', typeId: 'corvo', uniquePrefix: 'cripta_', count: 3, text: 'Corvos' }] }],
    },
  };
  beforeEach(() => {
    w = new World();
    w.engine = new QuestEngine(defs, w.host());
  });

  it('valida a estrutura das definições', () => {
    expect(QuestEngine.validate(defs)).toEqual([]);
    expect(QuestEngine.validate({ bad: { ...defs.q_b, id: 'bad', stages: [{ id: 'z', nextStep: '', next: 'nao_existe', objectives: [{ id: 'a', kind: 'talk', text: '' }] }] } })).toHaveLength(2);
  });

  it('progride estágios, ignora opcionais, ramifica, dá recompensas e encadeia a próxima missão', () => {
    expect(w.engine.start('q_a')).toBe(true);
    expect(w.engine.start('q_a')).toBe(false);
    expect(w.engine.tracked).toBe('q_a');
    expect(w.engine.stage('q_a')).toBe('s1');
    w.engine.onTalk('bran');
    expect(w.engine.stage('q_a')).toBe('s1');
    w.engine.onTalk('maren');
    expect(w.engine.stage('q_a')).toBe('s2');
    w.engine.onKill('lobo');
    w.engine.onKill('lobo');
    w.engine.onKill('corvo');
    w.items.set('erva', 5);
    w.engine.tick();
    expect(w.engine.stage('q_a')).toBe('s2');
    expect(w.notes.some((n) => n.includes('Lobos: 2/3'))).toBe(true);
    w.engine.onKill('lobo');
    // opcional não segura o estágio; coleta conta o inventário
    expect(w.engine.stage('q_a')).toBe('s3');
    w.flags.set('escolha', 'boa');
    w.hour = 12;
    w.engine.tick();
    expect(w.engine.stage('q_a')).toBe('s4'); // sem ramo: segue a ordem
    w.engine.tick();
    expect(w.engine.status('q_a')).toBe('active'); // ainda de dia
    w.hour = 22;
    w.engine.tick();
    expect(w.engine.status('q_a')).toBe('completed');
    expect(w.xp).toBe(75); // base + ramo
    expect(w.gold).toBe(10);
    expect(w.items.get('pocao_vida')).toBe(2);
    expect(w.engine.status('q_b')).toBe('active');
    expect(w.events).toContain('completed:q_a');
    expect(w.events).toContain('started:q_b');
  });

  it('ramificação por escolha leva a outro estágio', () => {
    w.engine.start('q_a');
    w.engine.setStage('q_a', 's3');
    w.flags.set('escolha', 'ma');
    w.engine.tick();
    expect(w.engine.stage('q_a')).toBe('s5');
    w.engine.onSignal('fim');
    expect(w.engine.status('q_a')).toBe('completed');
  });

  it('falha quando a condição de falha vale (ex.: o cervo morreu)', () => {
    w.engine.start('q_f');
    w.engine.tick();
    expect(w.engine.status('q_f')).toBe('active');
    w.flags.set('morreu', true);
    w.engine.tick();
    expect(w.engine.status('q_f')).toBe('failed');
    expect(w.engine.start('q_f')).toBe(false);
    const j = w.engine.journal().find((e) => e.id === 'q_f')!;
    expect(j.status).toBe('failed');
    expect(j.nextStep).toBe('O cervo morreu.');
  });

  it('abates por únicos contam mesmo se derrotados antes do estágio (save no meio da luta)', () => {
    w.defeated.add('cripta_1');
    w.defeated.add('cripta_2');
    w.engine.start('q_u');
    expect(w.engine.journal()[0].objectives[0].progress).toBe(2);
    w.defeated.add('cripta_3');
    w.engine.onKill('corvo', 'cripta_3');
    expect(w.engine.status('q_u')).toBe('completed');
  });

  it('diário: descrição, próximo passo, objetivos com progresso e log; ativas antes das concluídas', () => {
    w.engine.start('q_a');
    w.engine.onTalk('maren');
    w.engine.onKill('lobo');
    w.engine.log('q_a', 'Encontrei pegadas.');
    const j = w.engine.journal();
    expect(j[0].id).toBe('q_a');
    expect(j[0].nextStep).toBe('mate');
    expect(j[0].objectives.map((o) => [o.text, o.done, o.progress, o.target, o.optional])).toEqual([
      ['Lobos', false, 1, 3, undefined],
      ['Ervas', false, 0, 2, undefined],
      ['Opcional', false, undefined, undefined, true],
    ]);
    expect(j[0].log.at(-1)).toBe('Encontrei pegadas.');
    expect(j[0].log[0]).toContain('Dia 3');
  });

  it('save/load: serializa, recarrega e rejeita dados inválidos', () => {
    w.engine.start('q_a');
    w.engine.onTalk('maren');
    w.engine.onKill('lobo');
    w.engine.start('q_f');
    w.flags.set('morreu', true);
    w.engine.tick();
    const snap = JSON.parse(JSON.stringify(w.engine.serialize()));
    const w2 = new World();
    w2.engine = new QuestEngine(defs, w2.host());
    w2.engine.deserialize(snap);
    expect(w2.engine.stage('q_a')).toBe('s2');
    expect(w2.engine.status('q_f')).toBe('failed');
    expect(w2.engine.journal().find((e) => e.id === 'q_a')!.objectives[0].progress).toBe(1);
    expect(w2.engine.tracked).toBe('q_a');
    expect(() => w2.engine.deserialize(null)).toThrow();
    expect(() => w2.engine.deserialize({ states: 'x' })).toThrow();
    // missão desconhecida e estágio inválido são saneados
    w2.engine.deserialize({ states: [{ id: 'nao_existe', status: 'active' }, { id: 'q_b', status: 'active', stage: 'zzz', progress: { r: -5, ok: 'x' } }] });
    expect(w2.engine.status('q_b')).toBe('active');
    expect(w2.engine.stage('q_b')).toBe('b1');
    expect(w2.engine.states.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe('motor de diálogos', () => {
  let w: World;
  let runner: DialogueRunner;
  const defs: Record<string, DialogueDef> = {
    geral: {
      id: 'geral',
      npc: 'doran',
      priority: 1,
      start: 'ola',
      nodes: {
        ola: {
          text: [{ when: [{ mem: 'talks', max: 1 }], text: 'Primeira vez!' }, { text: 'De novo?' }],
          options: [
            { text: 'Comprar', effects: [{ shop: 'forja_doran' }] },
            { text: 'Pergunta', next: 'resp', once: true, tone: 'curioso' },
            { text: 'Pagar 25', when: [{ gold: 25 }], lockedText: 'ouro insuficiente', effects: [{ gold: -25 }], next: 'pago' },
            { text: 'Segredo', when: [{ flag: 'segredo' }] },
          ],
        },
        resp: { text: 'Resposta.', next: 'ola' },
        pago: { text: 'Pago.', effects: [{ set: 'pagou' }] },
      },
    },
    missao: { id: 'missao', npc: 'doran', priority: 20, when: [{ flag: 'missao_ativa' }], once: true, start: [{ when: [{ flag: 'variante' }], node: 'v' }, { node: 'n' }], nodes: { n: { text: 'Normal.' }, v: { text: 'Variante.' } } },
  };
  beforeEach(() => {
    w = new World();
    w.engine = new QuestEngine({}, w.host());
    runner = new DialogueRunner(defs, { env: w.env, apply: w.apply, speakerName: (id) => id.toUpperCase() });
  });

  it('escolhe por prioridade/condições e respeita conversas únicas', () => {
    expect(runner.pickFor('doran')).toBe('geral');
    w.flags.set('missao_ativa', true);
    expect(runner.pickFor('doran')).toBe('missao');
    const v = runner.begin('missao', 'doran')!;
    expect(v.text).toBe('Normal.');
    expect(runner.choose(0)).toBeNull();
    expect(runner.pickFor('doran')).toBe('geral'); // once concluída
    expect(runner.pickFor('ninguem')).toBeNull();
  });

  it('variantes de texto, opções condicionais/bloqueadas, once, efeitos e adiados', () => {
    w.env.memory('doran').talks = 1;
    let v = runner.begin('geral', 'doran')!;
    expect(v.text).toBe('Primeira vez!');
    expect(v.speaker).toBe('DORAN');
    expect(v.options.map((o) => o.text)).toEqual(['Comprar', 'Pergunta', 'Pagar 25 (ouro insuficiente)']);
    expect(v.options[2].disabled).toBe(true);
    expect(runner.choose(2)!.nodeId).toBe('ola'); // bloqueada: nada muda
    v = runner.choose(1)!;
    expect(v.text).toBe('Resposta.');
    v = runner.choose(0)!; // Continuar
    expect(v.options.map((o) => o.text)).toEqual(['Comprar', 'Pagar 25 (ouro insuficiente)']); // "once" sumiu
    w.gold = 30;
    v = runner.view()!;
    expect(v.options[1].disabled).toBeUndefined();
    v = runner.choose(1)!;
    expect(v.text).toBe('Pago.');
    expect(w.flags.get('pagou')).toBe(true);
    expect(w.gold).toBe(5);
    expect(runner.choose(0)).toBeNull(); // Encerrar
    expect(runner.active).toBe(false);
    // loja é adiada
    runner.begin('geral', 'doran');
    runner.choose(0);
    expect(runner.deferred).toEqual([{ shop: 'forja_doran' }]);
    expect(w.applied.some((e) => 'shop' in e)).toBe(false);
  });

  it('valida a estrutura e detecta nós quebrados', () => {
    expect(DialogueRunner.validate(defs)).toEqual([]);
    expect(DialogueRunner.validate({ x: { id: 'x', npc: 'a', start: 'nao', nodes: { a: { text: '', next: 'b' } } } }).length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
describe('campanha real (dados): prólogo → Ato I com escolhas', () => {
  let w: World;
  let runner: DialogueRunner;
  beforeEach(() => {
    w = new World();
    w.engine = new QuestEngine(QUESTS, w.host());
    runner = new DialogueRunner(DIALOGUES, { env: w.env, apply: w.apply, speakerName: (id) => id });
  });

  /** Conversa escolhendo opções pelo texto (ou a primeira habilitada). */
  function talk(npc: string, picks: string[] = []) {
    const id = runner.pickFor(npc);
    expect(id, `sem diálogo para ${npc}`).not.toBeNull();
    let v = runner.begin(id!, npc);
    let guard = 0;
    while (v && guard++ < 30) {
      const want = picks.find((p) => v!.options.some((o) => o.text.includes(p) && !o.disabled));
      const opt = want ? v.options.find((o) => o.text.includes(want) && !o.disabled)! : v.options.find((o) => !o.disabled)!;
      if (want) picks.splice(picks.indexOf(want), 1);
      v = runner.choose(opt.index);
    }
    // como o sistema Dialogue: efeitos adiados (loja, descanso, roteiros) depois do fim
    applyEffects(runner.deferred, { apply: w.apply }, npc);
    runner.deferred.length = 0;
    w.engine.onTalk(npc, id!);
    return id!;
  }

  it('prólogo inteiro e chegada à vila (postura arrogante registrada)', () => {
    w.engine.start('q_prologo');
    expect(w.applied.some((e) => 'script' in e && e.script === 'intro')).toBe(true);
    w.engine.onInteract('altar_cripta');
    expect(w.engine.stage('q_prologo')).toBe('saqueadores');
    for (const u of ['cripta_corvo_1', 'cripta_corvo_2', 'cripta_corvo_3']) {
      w.defeated.add(u);
      w.engine.onKill('corvo_saqueador', u);
    }
    expect(w.engine.stage('q_prologo')).toBe('sair');
    w.at.add('cripta_saida');
    w.at.add('-482,474');
    w.engine.tick();
    expect(w.engine.status('q_prologo')).toBe('completed');
    expect(w.engine.status('q_estranho')).toBe('active');
    expect(talk('bran', ['Arquimago', 'Que olhem'])).toBe('bran_portao');
    expect(w.flags.get('bran_postura')).toBe('arrogante');
    expect(w.flags.get('guardas_vigilantes')).toBe(true);
    expect(w.engine.stage('q_estranho')).toBe('maren');
    expect(talk('maren', ['Os Corvos', 'E onde eu entro', 'Eu trago'])).toBe('maren_corvos');
    expect(w.engine.status('q_estranho')).toBe('completed');
    expect(w.engine.stage('q_corvos')).toBe('acampamento');
  });

  it('Ravena: poupar (carta do Barão) vs executar (Lâmina Vampírica + bilhete)', () => {
    for (const choice of ['poupar', 'executar'] as const) {
      w = new World();
      w.engine = new QuestEngine(QUESTS, w.host());
      runner = new DialogueRunner(DIALOGUES, { env: w.env, apply: w.apply, speakerName: (id) => id });
      w.engine.start('q_corvos');
      w.at.add('acampamento_corvos');
      w.engine.tick();
      expect(w.engine.stage('q_corvos')).toBe('ravena');
      w.flags.set('ravena_rendida', true); // contrato C3 (IA)
      w.engine.tick();
      expect(w.engine.stage('q_corvos')).toBe('escolha');
      talk('ravena_rendida', ['Onde está', choice === 'poupar' ? 'Vá embora' : 'segunda chance']);
      w.engine.tick();
      expect(w.flags.get('choice:ravena')).toBe(choice === 'poupar' ? 'poupada' : 'executada');
      expect(w.items.get(choice === 'poupar' ? 'carta_barao' : 'lamina_vampirica')).toBe(1);
      expect(w.applied.some((e) => 'script' in e && e.script === (choice === 'poupar' ? 'ravena_poupar' : 'ravena_executar'))).toBe(true);
      expect(w.env.memory('bran').attitude).toBe(choice === 'poupar' ? -1 : 1);
      expect(w.engine.stage('q_corvos')).toBe('cristal');
      w.engine.onInteract('tenda_ravena');
      w.items.set('cristal_chave', 1);
      w.engine.tick();
      expect(w.engine.status('q_corvos')).toBe('completed');
      expect(w.engine.status('q_selo')).toBe('active');
      // Bran reage à escolha depois
      expect(runner.pickFor('bran')).toBe('bran_ravena');
    }
  });

  it('Guardião: absorver desbloqueia a Forma Ascendente; libertar dá a Lâmina Temporal + fragmento; Ecos encerra o Ato I', () => {
    w.engine.start('q_guardiao');
    w.at.add('camara_guardiao');
    w.engine.tick();
    expect(w.engine.stage('q_guardiao')).toBe('luta');
    w.bosses.add('guardiao_mecanico');
    w.engine.onBoss('guardiao_mecanico');
    expect(w.engine.stage('q_guardiao')).toBe('escolha');
    talk('nucleo_guardiao', ['Descanse']);
    w.engine.tick();
    expect(w.flags.get('guardiao_libertado')).toBe(true);
    expect(w.items.get('lamina_temporal')).toBe(1);
    expect(w.items.get('fragmento_memoria')).toBe(1);
    expect(w.engine.status('q_guardiao')).toBe('completed');
    expect(w.engine.stage('q_ecos')).toBe('memoria');
    w.engine.onInteract('fragmento_camara');
    expect(w.engine.stage('q_ecos')).toBe('maren');
    expect(talk('maren', ['Então vou a Ferroluz'])).toBe('maren_ecos');
    expect(w.engine.status('q_ecos')).toBe('completed');
    expect(w.flags.get('ato1_concluido')).toBe(true);
    expect(w.applied.some((e) => 'script' in e && e.script === 'epilogo_ato1')).toBe(true);

    const w2 = new World();
    w2.engine = new QuestEngine(QUESTS, w2.host());
    const r2 = new DialogueRunner(DIALOGUES, { env: w2.env, apply: w2.apply, speakerName: (id) => id });
    w2.engine.start('q_guardiao');
    w2.engine.setStage('q_guardiao', 'escolha');
    let v = r2.begin(r2.pickFor('nucleo_guardiao')!, 'nucleo_guardiao');
    while (v && !v.options.some((o) => o.text.startsWith('Seu poder'))) v = r2.choose(0);
    r2.choose(v!.options.find((o) => o.text.startsWith('Seu poder'))!.index);
    expect(w2.applied.some((e) => 'unlockAbility' in e && e.unlockAbility === 'ascendantForm')).toBe(true);
    expect(w2.flags.get('nucleo_absorvido')).toBe(true);
    expect(w2.env.memory('calen').teme_kaelen).toBe(true);
  });

  it('O Cervo de Luz: só à noite; deixar caçar dá ouro e conclui sem amuleto; matar o cervo protegendo faz falhar', () => {
    w.engine.start('q_cervo');
    w.hour = 12;
    w.engine.tick();
    expect(w.engine.stage('q_cervo')).toBe('noite');
    w.hour = 22;
    w.engine.tick();
    expect(w.engine.stage('q_cervo')).toBe('clareira');
    w.at.add('clareira_cervo_luminoso');
    w.engine.tick();
    expect(w.engine.stage('q_cervo')).toBe('cacadores');
    talk('cacador_lider', ['Quanto vale', 'Feito']);
    w.engine.tick();
    expect(w.engine.stage('q_cervo')).toBe('relatar');
    w.flags.set('cervo_morto', true);
    w.engine.tick();
    expect(w.engine.status('q_cervo')).toBe('active'); // deixou caçar: não falha
    talk('ilsa', ['Eram três arcos']);
    expect(w.engine.status('q_cervo')).toBe('completed');
    expect(w.items.get('amuleto_floresta') ?? 0).toBe(0);
    expect(w.env.memory('ilsa').traiu).toBe(true);

    const w2 = new World();
    w2.engine = new QuestEngine(QUESTS, w2.host());
    w2.engine.start('q_cervo');
    w2.engine.setStage('q_cervo', 'proteger');
    w2.flags.set('cervo_decisao', 'proteger');
    w2.flags.set('cervo_morto', true);
    w2.engine.tick();
    expect(w2.engine.status('q_cervo')).toBe('failed');
  });

  it('secundárias: martelo (recompensa + aprimoramento), ervas (consome 5), Elyra (3 inscrições), contratos do quadro', () => {
    w.engine.start('q_martelo');
    w.at.add('laboratorio_abandonado');
    w.engine.tick();
    w.items.set('martelo_doran', 1);
    w.engine.tick();
    expect(w.engine.stage('q_martelo')).toBe('entregar');
    talk('doran', []);
    expect(w.engine.status('q_martelo')).toBe('completed');
    expect(w.items.get('espada_runica')).toBe(1);
    expect(w.items.get('martelo_doran')).toBe(0);
    expect(w.applied.some((e) => 'freeUpgrade' in e)).toBe(true);

    w.engine.start('q_taverna');
    w.items.set('erva_lumen', 6);
    w.engine.tick();
    talk('hilda', []);
    expect(w.engine.status('q_taverna')).toBe('completed');
    expect(w.items.get('erva_lumen')).toBe(1);
    expect(w.items.get('pocao_vida')).toBe(3);

    w.engine.start('q_elyra');
    w.items.set('inscricao_elyra', 3);
    w.engine.tick();
    talk('teodoro', []);
    expect(w.engine.status('q_elyra')).toBe('completed');
    expect(w.items.get('cajado_vazio')).toBe(1);

    expect(runner.pickFor('quadro_missoes')).toBe('quadro_missoes');
    talk('quadro_missoes', ['Lobos Sombrios', 'Aceitar']);
    expect(w.engine.status('q_lobos')).toBe('active');
    w.engine.onKill('alfa_lobo');
    for (let i = 0; i < 3; i++) w.engine.onKill('lobo_sombrio');
    expect(w.engine.stage('q_lobos')).toBe('pagamento');
    talk('bran', []);
    expect(w.engine.status('q_lobos')).toBe('completed');
    expect(w.gold).toBeGreaterThanOrEqual(150);
  });

  it('fragmentos começam sozinhos ao tocar o primeiro e dão ponto de talento no terceiro', () => {
    w.engine.tick();
    expect(w.engine.status('q_fragmentos')).toBe('inactive');
    w.flags.set('frag_cripta', true);
    w.engine.tick();
    expect(w.engine.status('q_fragmentos')).toBe('active');
    w.flags.set('frag_farol', true);
    w.flags.set('frag_santuario', true);
    w.engine.tick();
    expect(w.engine.status('q_fragmentos')).toBe('completed');
  });

  it('save/load no meio da campanha preserva estágio, progresso e log', () => {
    w.engine.start('q_prologo');
    w.engine.onInteract('altar_cripta');
    w.defeated.add('cripta_corvo_1');
    w.engine.onKill('corvo_saqueador', 'cripta_corvo_1');
    const data = JSON.parse(JSON.stringify(w.engine.serialize())) as { states: { id: string; status: QuestStatusName }[] };
    const w2 = new World();
    w2.defeated = new Set(w.defeated);
    w2.engine = new QuestEngine(QUESTS, w2.host());
    w2.engine.deserialize(data);
    expect(w2.engine.stage('q_prologo')).toBe('saqueadores');
    const j = w2.engine.journal()[0];
    expect(j.objectives[0].progress).toBe(1);
    expect(j.log.length).toBeGreaterThanOrEqual(2);
  });
});
