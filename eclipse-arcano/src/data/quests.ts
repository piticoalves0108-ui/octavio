/**
 * Missões da fatia vertical (Prólogo + Ato I + secundárias), pontos de interação
 * de missão (altar, pedestal, fragmentos, inscrições...) e roteiros das
 * cinemáticas leves. Motor em src/rpg/quests/engine.ts; sistema em src/rpg/Quests.ts.
 */
import type { QuestDef } from '../rpg/quests/engine';
import type { Cond, Effect } from '../rpg/dialogue/script';

// ---------------------------------------------------------------------------
// Regras / números
// ---------------------------------------------------------------------------
export const QUEST_RULES = {
  /** Intervalo (s) das verificações de objetivos consultados. */
  tickInterval: 0.25,
  /** Raio padrão (m) dos objetivos "alcançar". */
  reachRadius: 10,
  /** Caçadores atirando no Cervo de Luz (q_cervo, ramo proteger). */
  hunterShot: { interval: 6.5, damage: 11, range: 34 },
  /** Ouro pago pelos caçadores se Kaelen deixar a caça acontecer. */
  hunterBribe: 120,
  /** Distância (m) para iniciar a conversa de rendição de Ravena automaticamente. */
  ravenaTalkRange: 3.2,
  /** Duração (s) do cartão de nome do chefe. */
  bossCardSeconds: 2.6,
};

/** Intensidade do Eclipse Arcano no céu conforme a história (0 = some, 1.6 = máximo). */
export const ECLIPSE_STORY = {
  /** Quando a Cidadela Celeste surge (Ato IV). */
  ato4: 1.25,
  reunificacao: 0,
  selo: 0.3,
  sombrio: 1.6,
};

// ---------------------------------------------------------------------------
// Pontos de interação de missão
// ---------------------------------------------------------------------------
export interface QuestPointDef {
  id: string;
  /** Âncora (places.ts) — ou `unique` (segue um inimigo único vivo). */
  place?: string;
  unique?: string;
  /** Deslocamento (x, y, z) em metros. */
  offset?: [number, number, number];
  prompt: string;
  kind: 'read' | 'use' | 'talk' | 'board' | 'pickup';
  /** Nome do falante quando o ponto abre um diálogo. */
  name?: string;
  /** Habilitado quando estas condições valem. */
  when?: Cond[];
  /** Precisa disto para agir; senão mostra `lockedText`. */
  requires?: Cond[];
  lockedText?: string;
  /** Some depois de usado. */
  once?: boolean;
  dialogue?: string;
  effects?: Effect[];
  model?: 'fragment' | 'hammer' | 'inscription' | 'core' | 'none';
  range?: number;
}

const inStage = (quest: string, stage: string | string[]): Cond => ({ questStage: quest, stage });

export const QUEST_POINTS: QuestPointDef[] = [
  // --- Cripta do Despertar ---
  { id: 'altar_cripta', place: 'altar_cripta', prompt: 'Examinar o Altar do Despertar', kind: 'read', name: 'Altar do Despertar', dialogue: 'lore_altar', range: 2.8 },
  { id: 'cripta_mural', place: 'cripta_mural', prompt: 'Ler o mural rúnico', kind: 'read', name: 'Mural rúnico', dialogue: 'lore_mural', range: 2.6 },
  {
    id: 'frag_cripta',
    place: 'sarcofago_cripta',
    offset: [1.1, 1.1, 0],
    prompt: 'Tocar o brilho sobre o sarcófago',
    kind: 'pickup',
    once: true,
    model: 'fragment',
    effects: [{ set: 'frag_cripta' }, { give: 'fragmento_memoria' }, { script: 'memoria_cripta' }],
  },
  // --- Ruínas ---
  {
    id: 'pedestal_cristal_ruinas',
    place: 'pedestal_cristal_ruinas',
    prompt: 'Encaixar o Cristal-Chave no pedestal',
    kind: 'use',
    when: [{ noFlag: 'portao_ruinas_aberto' }],
    requires: [{ item: 'cristal_chave' }],
    lockedText: 'Um encaixe facetado, vazio. Falta um cristal com o selo do Império.',
    effects: [{ take: 'cristal_chave' }, { set: 'portao_ruinas_aberto' }, { gate: 'portao_ruinas', open: true }, { script: 'selo_aberto' }],
    range: 3,
  },
  { id: 'ruinas_terminal', place: 'ruinas_terminal', prompt: 'Examinar o pilar tecnológico', kind: 'read', name: 'Pilar de Aeternum', dialogue: 'lore_terminal', range: 2.8 },
  {
    id: 'nucleo_guardiao',
    place: 'arena_centro',
    offset: [0, 0.4, 0],
    prompt: 'Aproximar-se do núcleo do Guardião',
    kind: 'talk',
    name: 'Núcleo do Guardião',
    when: [inStage('q_guardiao', 'escolha')],
    dialogue: 'guardiao_nucleo',
    model: 'core',
    range: 5,
  },
  {
    id: 'fragmento_camara',
    place: 'arena_centro',
    offset: [2.6, 1.2, 0],
    prompt: 'Tocar o fragmento de memória',
    kind: 'pickup',
    when: [inStage('q_ecos', 'memoria')],
    once: true,
    model: 'fragment',
    effects: [{ give: 'fragmento_memoria' }, { script: 'memoria_coracao' }],
    range: 3,
  },
  // --- Acampamento dos Corvos ---
  {
    id: 'ravena_rendida',
    unique: 'ravena',
    // sem a entidade (ex.: save antigo), a conversa acontece junto à tenda
    place: 'corvos_lider',
    prompt: 'Falar com Ravena',
    kind: 'talk',
    name: 'Ravena',
    when: [inStage('q_corvos', 'escolha')],
    dialogue: 'ravena_rendicao',
    range: 3.6,
  },
  {
    id: 'tenda_ravena',
    place: 'corvos_lider',
    prompt: 'Revistar a tenda de Ravena',
    kind: 'use',
    when: [inStage('q_corvos', 'cristal')],
    once: true,
    effects: [{ give: 'cristal_chave' }, { gold: 45 }, { script: 'revistar_tenda' }],
    range: 3,
  },
  // --- O Cervo de Luz ---
  {
    id: 'cacador_lider',
    unique: 'cervo_cacador_1',
    prompt: 'Falar com o caçador',
    kind: 'talk',
    name: 'Caçador Furtivo',
    when: [inStage('q_cervo', 'cacadores'), { noFlag: 'cervo_decisao' }],
    dialogue: 'cacador_cervo',
    range: 4,
  },
  // --- Laboratório ---
  {
    id: 'martelo_lab',
    place: 'laboratorio_terminal',
    offset: [0.8, 0.9, 0.6],
    prompt: 'Pegar o martelo dos Forjafria',
    kind: 'pickup',
    when: [inStage('q_martelo', ['laboratorio', 'martelo'])],
    once: true,
    model: 'hammer',
    effects: [{ give: 'martelo_doran' }, { log: 'Encontrei o martelo dos Forjafria preso entre as engrenagens do laboratório.', quest: 'q_martelo' }],
    range: 2.6,
  },
  // --- Ilhas Suspensas de Elyra ---
  {
    id: 'inscricao_1',
    place: 'elyra_1_topo',
    offset: [-4, 0.4, 2],
    prompt: 'Decalcar a inscrição de Elyra',
    kind: 'read',
    when: [inStage('q_elyra', 'inscricoes')],
    once: true,
    model: 'inscription',
    effects: [{ give: 'inscricao_elyra' }, { subtitle: '"Aqui o céu era chão, e o chão era promessa." — inscrição de Elyra', duration: 5 }],
    range: 2.6,
  },
  {
    id: 'inscricao_2',
    place: 'elyra_3_topo',
    offset: [2, 0.4, -2],
    prompt: 'Decalcar a inscrição de Elyra',
    kind: 'read',
    when: [inStage('q_elyra', 'inscricoes')],
    once: true,
    model: 'inscription',
    effects: [{ give: 'inscricao_elyra' }, { subtitle: '"Sete vozes, um selo. Que a última jamais desperte." — inscrição de Elyra', duration: 5 }],
    range: 2.6,
  },
  {
    id: 'inscricao_3',
    place: 'elyra_4_topo',
    offset: [3, 0.4, 3],
    prompt: 'Decalcar a inscrição de Elyra',
    kind: 'read',
    when: [inStage('q_elyra', 'inscricoes')],
    once: true,
    model: 'inscription',
    effects: [{ give: 'inscricao_elyra' }, { subtitle: '"Aurivar guarda o tempo. O tempo guarda Aurivar." — inscrição de Elyra', duration: 5 }],
    range: 2.6,
  },
  // --- Fragmentos de memória (q_fragmentos) ---
  {
    id: 'frag_farol',
    place: 'fragmento_memoria_2',
    offset: [0, 1.1, 0],
    prompt: 'Tocar o fragmento de memória',
    kind: 'pickup',
    once: true,
    model: 'fragment',
    effects: [{ set: 'frag_farol' }, { give: 'fragmento_memoria' }, { script: 'memoria_farol' }],
    range: 2.6,
  },
  {
    id: 'frag_santuario',
    place: 'santuario_cristal_altar',
    offset: [1.6, 1.1, 1.2],
    prompt: 'Tocar o fragmento de memória',
    kind: 'pickup',
    once: true,
    model: 'fragment',
    effects: [{ set: 'frag_santuario' }, { give: 'fragmento_memoria' }, { script: 'memoria_santuario' }],
    range: 2.6,
  },
  // --- Ato II: Ferroluz, Pico das Tempestades, Picos de Cristal ---
  {
    id: 'forja_celeste',
    place: 'ferroluz_forja',
    offset: [0, 1.2, -3.4],
    prompt: 'Encaixar os núcleos na Forja Celeste',
    kind: 'use',
    name: 'Forja Celeste',
    when: [inStage('q_forja', 'forja')],
    requires: [{ item: 'coracao_tempestade' }, { item: 'cristal_primordial' }],
    lockedText: 'Dois encaixes vazios: um para uma tempestade, outro para um cristal mais velho que o Império.',
    once: true,
    effects: [{ take: 'coracao_tempestade' }, { take: 'cristal_primordial' }, { set: 'forja_acesa' }, { set: 'frag_forja' }, { give: 'fragmento_memoria' }, { script: 'forja_acesa' }],
    range: 4,
  },
  {
    id: 'arquivo_ferroluz',
    place: 'ferroluz_arquivo',
    offset: [0, 1, 0],
    prompt: 'Vasculhar o arquivo do Barão',
    kind: 'read',
    name: 'Arquivo do Barão',
    when: [{ quest: 'q_ferroluz', status: 'completed' }, { noFlag: 'barao_destino' }],
    once: true,
    model: 'inscription',
    effects: [{ give: 'cartas_arquivo' }, { subtitle: 'Cartas do Barão ao "sábio". As respostas vêm numa letra antiga, de quatro mil anos atrás. Ninguém escreve assim hoje. Ninguém vivo.', duration: 6 }],
    range: 2.6,
  },
  {
    id: 'altar_tempestade',
    place: 'tempestade_altar',
    offset: [0, 1.2, 0],
    prompt: 'Pegar o Coração da Tempestade',
    kind: 'pickup',
    when: [inStage('q_tempestade', 'coracao')],
    once: true,
    model: 'core',
    effects: [{ give: 'coracao_tempestade' }, { subtitle: 'O céu do pico se abre pela primeira vez em quatro mil anos. Por um instante, só vento e sol.', duration: 5 }],
    range: 3,
  },
  {
    id: 'cristal_primordial_pegar',
    place: 'cristal_primordial_ponto',
    offset: [0, 1.4, 0],
    prompt: 'Arrancar o Cristal Primordial',
    kind: 'pickup',
    when: [inStage('q_dragao', 'cristal')],
    once: true,
    model: 'fragment',
    effects: [{ give: 'cristal_primordial' }, { subtitle: 'O cristal se solta com um som de sino. As agulhas em volta escurecem, uma a uma.', duration: 5 }],
    range: 3,
  },
  // --- Ato III: Templo Submerso e a Torre ---
  {
    id: 'selo_primeira_era',
    place: 'templo_selo',
    offset: [0, 1.3, 0],
    prompt: 'Tocar o Selo da Primeira Era',
    kind: 'read',
    when: [inStage('q_templo', 'selo')],
    once: true,
    model: 'fragment',
    effects: [{ set: 'frag_templo' }, { give: 'fragmento_memoria' }, { script: 'memoria_templo' }],
    range: 3,
  },
  {
    id: 'darian_rendido',
    place: 'torre_duelo',
    offset: [0, 0.4, 0],
    prompt: 'Falar com Darian',
    kind: 'talk',
    name: 'Darian',
    when: [inStage('q_darian', 'escolha')],
    dialogue: 'darian_escolha',
    model: 'none',
    range: 6,
  },
  // --- Ato IV: o Coração do Eclipse ---
  {
    id: 'coracao_eclipse',
    place: 'cidadela_coracao',
    offset: [0, 1.2, 0],
    prompt: 'Aproximar-se do Coração do Eclipse',
    kind: 'talk',
    name: 'Coração do Eclipse',
    when: [inStage('q_eclipse', 'escolha')],
    dialogue: 'coracao_final',
    model: 'core',
    range: 6,
  },
  // --- Vila ---
  { id: 'quadro_missoes', place: 'quadro_missoes_brumafria', offset: [0, 1.3, 0], prompt: 'Ler o quadro de missões', kind: 'board', name: 'Quadro de Missões', dialogue: 'quadro_missoes', range: 2.6 },
  { id: 'arquivo_estante', place: 'arquivo_estante', offset: [0, 1, 0], prompt: 'Folhear as crônicas antigas', kind: 'read', name: 'Crônicas de Brumafria', dialogue: 'lore_estante', range: 2.4 },
  { id: 'torre_cristal_porta', place: 'torre_cristal_porta', offset: [0, 1, 0], prompt: 'Examinar a porta selada da torre', kind: 'read', name: 'Torre de Cristal Adormecida', dialogue: 'lore_torre', range: 2.6 },
];

export const QUEST_POINT_BY_ID: Record<string, QuestPointDef> = Object.fromEntries(QUEST_POINTS.map((p) => [p.id, p]));

// ---------------------------------------------------------------------------
// Missões
// ---------------------------------------------------------------------------
export const QUESTS: Record<string, QuestDef> = {
  // ========================================================= PRÓLOGO
  q_prologo: {
    id: 'q_prologo',
    title: 'O Despertar',
    category: 'main',
    description: 'Acordei numa cripta que não reconheço. A pedra conhece meu nome melhor do que eu. Preciso entender onde — e quando — estou.',
    rewards: { xp: 60 },
    next: ['q_estranho'],
    completedText: 'Saí da Cripta do Despertar. Lá embaixo, no vale, fumaça de chaminés: uma vila. Gente. Talvez respostas.',
    stages: [
      {
        id: 'despertar',
        nextStep: 'Examine o altar no fundo do mausoléu, atrás do sarcófago.',
        log: 'Despertei sobre a pedra fria. Runas apagadas, cristais arrancados das paredes. Alguém esteve aqui antes de mim.',
        onEnter: [{ script: 'intro' }],
        objectives: [
          { id: 'altar', kind: 'interact', target: 'altar_cripta', text: 'Examinar o Altar do Despertar', marker: { place: 'altar_cripta' } },
          { id: 'mural', kind: 'interact', target: 'cripta_mural', text: 'Ler o mural rúnico', optional: true, marker: { place: 'cripta_mural' } },
        ],
      },
      {
        id: 'saqueadores',
        nextStep: 'Lute com o cajado (botão esquerdo) e a Bola Arcana [1]. Esquive com [Q].',
        log: 'Vozes no pátio. Saqueadores — de capas pretas, com penas de corvo — voltaram para buscar o resto dos cristais.',
        onEnter: [{ subtitle: '— Ouviu isso? Tem alguém lá dentro! Peguem o que sobrou e acabem com ele!', duration: 4 }],
        spawns: [
          { typeId: 'corvo_saqueador', at: 'cripta_saida', uniqueId: 'cripta_corvo_1', aggro: true, offset: [-2, 4] },
          { typeId: 'corvo_saqueador', at: 'cripta_saida', uniqueId: 'cripta_corvo_2', aggro: true, offset: [2.5, 5] },
          { typeId: 'corvo_saqueador', at: 'cripta_saida', uniqueId: 'cripta_corvo_3', aggro: true, offset: [0, 1] },
        ],
        objectives: [{ id: 'corvos', kind: 'kill', typeId: 'corvo_saqueador', uniquePrefix: 'cripta_corvo_', count: 3, text: 'Derrotar os saqueadores Corvos', marker: { place: 'cripta_saida', radius: 12 } }],
      },
      {
        id: 'sair',
        nextStep: 'Saia do pátio da cripta pelo vão no muro norte e siga a estrada.',
        log: 'Os saqueadores não vão mais roubar ninguém. Um deles levava um mapa rabiscado: uma vila ao norte, "Brumafria".',
        objectives: [
          { id: 'saida', kind: 'reach', place: 'cripta_saida', radius: 6, text: 'Sair da cripta' },
          { id: 'mirante', kind: 'reach', pos: [-482, 474], radius: 14, text: 'Seguir a estrada até avistar Brumafria', marker: { pos: [-482, 474], label: 'Estrada para Brumafria' } },
        ],
        onComplete: [{ script: 'vista_brumafria' }],
      },
    ],
  },

  // ========================================================= ATO I
  q_estranho: {
    id: 'q_estranho',
    title: 'Estranho em Brumafria',
    category: 'main',
    giver: 'bran',
    description: 'Brumafria é uma vila murada de lavradores e ferreiros. Ninguém aqui vê um mago há gerações — e ninguém parece querer ver.',
    rewards: { xp: 100 },
    next: ['q_corvos'],
    completedText: [
      { when: [{ flag: 'bran_postura', is: 'arrogante' }], text: 'Bran me deixou entrar com cara de quem engole pedra. Maren me ouviu. Os Corvos roubam cristais das ruínas — e um deles, o Cristal-Chave, abre o coração de Aeternum.' },
      { text: 'Entrei em Brumafria. Maren me contou da corrupção e dos Corvos, que roubam cristais das ruínas — entre eles o Cristal-Chave, que abre o coração de Aeternum.' },
    ],
    stages: [
      {
        id: 'portao',
        nextStep: 'Siga a estrada até o portão sul de Brumafria. Um guarda vigia a entrada.',
        log: 'Cheguei aos muros de Brumafria. Um homem de capa vermelha me espera no portão, lança na mão e desconfiança no rosto.',
        objectives: [{ id: 'bran', kind: 'talk', npc: 'bran', dialogue: 'bran_portao', text: 'Falar com o guarda no portão sul' }],
      },
      {
        id: 'maren',
        nextStep: 'A Anciã Maren mora na casa a oeste da praça. De dia fica na varanda ou no jardim; à noite, bata à porta.',
        objectives: [{ id: 'maren', kind: 'talk', npc: 'maren', dialogue: 'maren_corvos', text: 'Falar com a Anciã Maren' }],
      },
    ],
  },

  q_corvos: {
    id: 'q_corvos',
    title: 'As Asas dos Corvos',
    category: 'main',
    giver: 'maren',
    description: 'Os Corvos, um bando de saqueadores, arrancam cristais das ruínas do vale. Maren acredita que o Cristal-Chave de Aeternum está com a líder deles, Ravena.',
    rewards: { xp: 250, gold: 60 },
    next: ['q_selo'],
    completedText: [
      { when: [{ flag: 'ravena_poupada' }], text: 'Poupei Ravena. Ela falou de um nobre de Ferroluz que paga pelos cristais e me deixou uma carta com o brasão do Barão. O Cristal-Chave é meu.' },
      { when: [{ flag: 'ravena_executada' }], text: 'Ravena não roubará mais ninguém. Fiquei com a lâmina dela, o Cristal-Chave e um bilhete pela metade que fala em "ouro de Ferroluz".' },
      { text: 'O Cristal-Chave está comigo. Os Corvos perderam a líder.' },
    ],
    stages: [
      {
        id: 'acampamento',
        nextStep: 'O acampamento fica a sudeste, perto da estrada para Ferroluz. Saia pelo portão leste e siga a estrada; depois desça para o sul.',
        log: 'Maren pediu que eu recupere o Cristal-Chave dos Corvos. Disse que a líder deles tem asas pretas no capuz e nenhuma no coração.',
        objectives: [{ id: 'chegar', kind: 'reach', location: 'acampamento_corvos', radius: 48, text: 'Encontrar o Acampamento dos Corvos' }],
      },
      {
        id: 'ravena',
        nextStep: 'Enfrente Ravena. Ela apara e contra-ataca: espere a abertura depois do golpe forte. Cuidado com a bomba de fumaça.',
        log: 'O acampamento cheira a fumaça e cristal queimado. A tenda maior, no fundo, deve ser da líder.',
        spawns: [{ typeId: 'ravena', at: 'corvos_lider', uniqueId: 'ravena', near: 75 }],
        branches: [{ when: [{ flag: 'ravena_morta' }], next: 'cristal' }],
        any: true,
        objectives: [
          { id: 'derrotar', kind: 'flag', flag: 'ravena_rendida', text: 'Derrotar Ravena, a líder dos Corvos', marker: { unique: 'ravena', place: 'corvos_lider' } },
          { id: 'morta', kind: 'flag', flag: 'ravena_morta', text: 'Ravena caiu', when: [{ flag: 'ravena_morta' }] },
        ],
      },
      {
        id: 'escolha',
        nextStep: 'Ravena se rendeu e espera ajoelhada. Fale com ela e decida o que fazer.',
        log: 'Ravena largou as lâminas. Sangra, mas ainda sorri como quem guarda um segredo.',
        objectives: [{ id: 'decidir', kind: 'flag', flag: 'ravena_destino', text: 'Decidir o destino de Ravena', marker: { unique: 'ravena', place: 'corvos_lider' } }],
      },
      {
        id: 'cristal',
        nextStep: 'O cristal deve estar na tenda da líder, no fundo do acampamento.',
        objectives: [
          { id: 'tenda', kind: 'interact', target: 'tenda_ravena', text: 'Revistar a tenda de Ravena', marker: { place: 'corvos_lider' } },
          { id: 'cristal', kind: 'collect', item: 'cristal_chave', count: 1, text: 'Obter o Cristal-Chave', marker: false },
        ],
      },
    ],
  },

  q_selo: {
    id: 'q_selo',
    title: 'O Selo de Aeternum',
    category: 'main',
    giver: 'maren',
    description: 'O Cristal-Chave abre o portão selado das Ruínas de Aeternum. Do outro lado fica a Câmara do Guardião — e, talvez, algo que eu deixei para trás.',
    rewards: { xp: 150 },
    next: ['q_guardiao'],
    completedText: 'O selo cedeu. O portão de Aeternum se abriu como se me reconhecesse.',
    stages: [
      {
        id: 'ruinas',
        nextStep: 'As Ruínas de Aeternum ficam a nordeste, no fim da estrada leste. Constructos ainda vigiam as colunas.',
        log: 'Tenho o Cristal-Chave. As ruínas me esperam a nordeste — e, pelos relatos, não estão vazias.',
        objectives: [{ id: 'chegar', kind: 'reach', location: 'ruinas_aeternum', radius: 95, text: 'Chegar às Ruínas de Aeternum' }],
      },
      {
        id: 'pedestal',
        nextStep: 'O pedestal fica diante do portão selado, no lado leste das ruínas, a caminho da Câmara do Guardião.',
        objectives: [
          { id: 'pedestal', kind: 'interact', target: 'pedestal_cristal_ruinas', text: 'Encaixar o Cristal-Chave no pedestal', marker: { place: 'pedestal_cristal_ruinas' } },
          { id: 'pilar', kind: 'interact', target: 'ruinas_terminal', text: 'Examinar o pilar tecnológico', optional: true, marker: { place: 'ruinas_terminal' } },
        ],
      },
    ],
  },

  q_guardiao: {
    id: 'q_guardiao',
    title: 'O Guardião Mecânico',
    category: 'main',
    description: 'Além do portão selado, a Câmara do Guardião. Algo enorme dorme no centro do anfiteatro de metal rúnico.',
    rewards: { xp: 400 },
    next: ['q_ecos'],
    completedText: [
      { when: [{ flag: 'nucleo_absorvido' }], text: 'Absorvi o núcleo do Guardião. O poder antigo correu nas minhas veias como se voltasse para casa. Por que isso me assusta?' },
      { when: [{ flag: 'guardiao_libertado' }], text: 'Libertei o espírito do Guardião. Ele me deixou a Lâmina Temporal e um pedaço de mim mesmo.' },
      { text: 'O Guardião Mecânico caiu.' },
    ],
    stages: [
      {
        id: 'camara',
        nextStep: 'Atravesse o portão aberto e o corredor até a Câmara do Guardião.',
        objectives: [{ id: 'entrar', kind: 'reach', location: 'camara_guardiao', radius: 32, text: 'Entrar na Câmara do Guardião' }],
      },
      {
        id: 'luta',
        nextStep: 'Fase 2: destrua os pilares de cristal (raios funcionam bem). Fase 3: ataque o núcleo quando ele superaquecer.',
        log: 'O Guardião despertou. Ele não me reconhece — ou reconhece, e não perdoa.',
        objectives: [{ id: 'chefe', kind: 'boss', bossId: 'guardiao_mecanico', text: 'Derrotar o Guardião Mecânico das Ruínas', marker: { place: 'arena_centro', radius: 30 } }],
      },
      {
        id: 'escolha',
        nextStep: 'O núcleo do Guardião ainda pulsa no centro da arena. Aproxime-se.',
        log: 'O colosso caiu de joelhos. No peito aberto, o núcleo pulsa — e dentro dele, algo me chama pelo nome.',
        objectives: [{ id: 'decidir', kind: 'flag', flag: 'guardiao_destino', text: 'Decidir o destino do núcleo do Guardião', marker: { place: 'arena_centro' } }],
      },
    ],
  },

  q_ecos: {
    id: 'q_ecos',
    title: 'Ecos do Passado',
    category: 'main',
    description: 'Quando o Guardião caiu, um fragmento de memória ficou flutuando na câmara. É meu. Eu sei que é meu.',
    rewards: { xp: 300 },
    onComplete: [{ set: 'ato1_concluido' }],
    completedText: 'Vi a mim mesmo desenhando o Coração do Eclipse. Ouvi um rei me agradecer. Maren aponta para Ferroluz. O Ato I terminou — mas o vale continua aberto.',
    stages: [
      {
        id: 'memoria',
        nextStep: 'Toque o fragmento de memória que flutua na Câmara do Guardião.',
        objectives: [{ id: 'fragmento', kind: 'interact', target: 'fragmento_camara', text: 'Tocar o fragmento de memória', marker: { place: 'arena_centro' } }],
      },
      {
        id: 'maren',
        nextStep: 'Volte a Brumafria e conte a Maren o que viu.',
        log: 'Eu desenhei o Coração do Eclipse. Eu. E alguém — um rei — me agradeceu por isso.',
        objectives: [{ id: 'maren', kind: 'talk', npc: 'maren', dialogue: 'maren_ecos', text: 'Contar a Maren o que viu' }],
        onComplete: [{ script: 'epilogo_ato1' }],
      },
    ],
  },

  // ========================================================= ATO II — A CIDADE DE FERRO
  q_ferroluz: {
    id: 'q_ferroluz',
    title: 'A Cidade de Ferro',
    category: 'main',
    description: 'Maren aponta para Ferroluz. O Barão Teodric fechou os portões há meses, e é para lá que vão os cristais roubados do vale.',
    autoStart: [{ quest: 'q_ecos', status: 'completed' }],
    rewards: { xp: 500, gold: 150 },
    next: ['q_tempestade', 'q_dragao'],
    completedText: 'O Barão quer religar a Forja Celeste e me pediu duas coisas impossíveis: o Coração da Tempestade e um Cristal Primordial. Ele fala de um "sábio" que o aconselha. Não gosto do jeito que ele fala dele.',
    stages: [
      {
        id: 'viagem',
        nextStep: 'Ferroluz fica no extremo sudeste do vale. Saia pelo portão leste de Brumafria, siga a estrada e as placas para Ferroluz.',
        log: 'Ferroluz. Uma fortaleza de engenheiros que estudam o que o Império deixou. Se alguém compra cristais, é lá.',
        objectives: [{ id: 'chegar', kind: 'reach', location: 'posto_ferroluz', radius: 95, text: 'Chegar a Ferroluz' }],
      },
      {
        id: 'portao',
        nextStep: 'Uma sentinela vigia o portão oeste de Ferroluz. Fale com ela.',
        log: 'Muralhas de metal e cristal, torres com faróis apagados. E um portão fechado.',
        objectives: [{ id: 'sentinela', kind: 'talk', npc: 'sentinela_ferroluz', dialogue: 'sentinela_portao', text: 'Falar com a sentinela no portão' }],
      },
      {
        id: 'barao',
        nextStep: 'O Barão Teodric espera no pátio, diante da torre de comando.',
        objectives: [{ id: 'barao', kind: 'talk', npc: 'barao', dialogue: 'barao_encontro', text: 'Falar com o Barão Teodric' }],
      },
      {
        id: 'teste',
        nextStep: 'Enfrente o Colosso no pátio. Ele é lento, mas cada golpe pesa: pule a onda de choque e saia da frente da investida. Raios fazem estrago no metal dele.',
        log: 'O Barão quer um "teste". O teste tem seis metros de altura e cheira a óleo queimado.',
        objectives: [{ id: 'colosso', kind: 'boss', bossId: 'colosso_ferro', text: 'Derrotar o Colosso de Ferro e Magia', marker: { place: 'ferroluz_arena', radius: 24 } }],
      },
      {
        id: 'pedido',
        nextStep: 'Fale de novo com o Barão no pátio.',
        log: 'O Colosso caiu. O Barão aplaudiu como quem vê um espetáculo, não como quem perdeu a máquina mais cara da cidade.',
        objectives: [{ id: 'barao2', kind: 'talk', npc: 'barao', dialogue: 'barao_pedido', text: 'Ouvir o pedido do Barão' }],
      },
    ],
  },

  q_tempestade: {
    id: 'q_tempestade',
    title: 'A Bruxa das Tempestades',
    category: 'main',
    giver: 'barao',
    description: 'No alto da serra norte, um platô onde a tempestade nunca para. O Barão diz que lá está o Coração da Tempestade, guardado por uma bruxa.',
    rewards: { xp: 700 },
    completedText: 'Morgana era uma das Sete do Conselho. Ela me reconheceu. Ela me odiava. E, no fim, me agradeceu por deixá-la descansar.',
    stages: [
      {
        id: 'subida',
        nextStep: 'O Pico das Tempestades é o pico isolado da serra norte, a noroeste do Pântano Sombrio. Uma crista estreita sobe pelo norte; também dá para escalar os paredões ou voar até o topo.',
        objectives: [{ id: 'pico', kind: 'reach', location: 'pico_tempestades', radius: 40, text: 'Subir ao Pico das Tempestades' }],
      },
      {
        id: 'bruxa',
        nextStep: 'A Bruxa flutua e foge: fique em movimento, saia dos círculos antes do raio e cuidado com a rajada de vento na beira do platô. Guarde a arma de metal.',
        log: 'Menires queimados por raios, e no centro uma mulher flutuando no olho da tempestade.',
        objectives: [{ id: 'bruxa', kind: 'boss', bossId: 'bruxa_tempestades', text: 'Derrotar Morgana, a Bruxa das Tempestades', marker: { place: 'tempestade_centro', radius: 26 } }],
      },
      {
        id: 'coracao',
        nextStep: 'O Coração da Tempestade repousa no altar ao norte do círculo.',
        objectives: [{ id: 'pegar', kind: 'collect', item: 'coracao_tempestade', count: 1, text: 'Pegar o Coração da Tempestade', points: ['altar_tempestade'] }],
      },
    ],
  },

  q_dragao: {
    id: 'q_dragao',
    title: 'O Dragão de Cristal',
    category: 'main',
    giver: 'barao',
    description: 'Nos Picos de Cristal, a oeste, dorme Vyrmathal, guardião dos cristais primordiais. A corrupção chegou ao ninho dele.',
    rewards: { xp: 800 },
    completedText: 'Vyrmathal não era mau. Estava envenenado pelo mesmo veneno que sai do pântano. Arranquei o cristal do ninho dele e não me senti herói.',
    stages: [
      {
        id: 'ninho',
        nextStep: 'Os Picos de Cristal ficam no extremo oeste do mapa, ao sul do Santuário de Cristal.',
        objectives: [{ id: 'picos', kind: 'reach', location: 'picos_cristal', radius: 45, text: 'Chegar aos Picos de Cristal' }],
      },
      {
        id: 'dragao',
        nextStep: 'Quando o dragão voar, fique de olho na linha vermelha do mergulho e esquive para o lado. Os cristais que caem do céu também avisam onde batem.',
        log: 'Agulhas de cristal do tamanho de torres. E entre elas, um ninho de ossos.',
        objectives: [{ id: 'dragao', kind: 'boss', bossId: 'dragao_cristal', text: 'Derrotar o Dragão de Cristal', marker: { place: 'cristal_ninho', radius: 30 } }],
      },
      {
        id: 'cristal',
        nextStep: 'O Cristal Primordial brilha no pedestal do ninho.',
        objectives: [{ id: 'pegar', kind: 'collect', item: 'cristal_primordial', count: 1, text: 'Arrancar o Cristal Primordial', points: ['cristal_primordial_pegar'] }],
      },
    ],
  },

  q_forja: {
    id: 'q_forja',
    title: 'A Forja Celeste',
    category: 'main',
    giver: 'barao',
    description: 'Com o Coração da Tempestade e o Cristal Primordial, a Forja Celeste de Ferroluz pode voltar a arder. O "sábio" do Barão está muito ansioso por isso.',
    autoStart: [{ quest: 'q_tempestade', status: 'completed' }, { quest: 'q_dragao', status: 'completed' }],
    rewards: { xp: 900, gold: 250 },
    branchRewards: [
      { when: [{ flag: 'barao_redimido' }], rewards: { items: [['placa_colosso', 1]], effects: [{ freeUpgrade: 1 }] } },
      { when: [{ flag: 'barao_exposto' }], rewards: { gold: 400 } },
    ],
    onComplete: [{ set: 'ato2_concluido' }, { script: 'epilogo_ato2' }],
    next: ['q_pantano'],
    completedText: [
      { when: [{ flag: 'barao_redimido' }], text: 'Teodric ouviu. Quebrou o espelho de cristal onde o "sábio" falava e chorou feito criança. Ferroluz vai me ajudar quando chegar a hora.' },
      { when: [{ flag: 'barao_exposto' }], text: 'Contei a verdade no pátio, diante de todos. Os engenheiros tiraram o Barão da torre. Ferroluz está livre — e furiosa.' },
      { text: 'A Forja Celeste arde de novo. E dentro dela, uma voz antiga sabe meu nome.' },
    ],
    stages: [
      {
        id: 'forja',
        nextStep: 'Leve o Coração da Tempestade e o Cristal Primordial à Forja Celeste, no pátio de Ferroluz (o gerador de cristal perto dos caixotes).',
        log: 'Tenho os dois núcleos. O Barão vai ter a forja dele. Espero que o "sábio" fique satisfeito.',
        objectives: [
          { id: 'forja', kind: 'interact', target: 'forja_celeste', text: 'Acender a Forja Celeste', marker: { place: 'ferroluz_forja' } },
          { id: 'arquivo', kind: 'interact', target: 'arquivo_ferroluz', text: 'Vasculhar o arquivo do Barão', optional: true, marker: { place: 'ferroluz_arquivo' } },
        ],
      },
      {
        id: 'confronto',
        nextStep: 'O "sábio" do Barão é o Rei Aldric. Fale com Teodric e decida o que fazer com ele.',
        log: 'A voz saiu da forja e me chamou de "Arquimago". Era o Rei. Sempre foi o Rei. E agora eu lembro: a Grande Cisão foi obra minha.',
        objectives: [
          { id: 'barao', kind: 'flag', flag: 'barao_destino', text: 'Confrontar o Barão Teodric', marker: { npc: 'barao' } },
          { id: 'arquivo2', kind: 'interact', target: 'arquivo_ferroluz', text: 'Procurar provas no arquivo do Barão', optional: true, marker: { place: 'ferroluz_arquivo' } },
        ],
      },
    ],
  },

  // ========================================================= ATO III — A PRIMEIRA ERA
  q_pantano: {
    id: 'q_pantano',
    title: 'O Devorador de Almas',
    category: 'main',
    description: 'A corrupção que vaza do Coração do Eclipse tem uma ponta visível: algo enorme no meio do Pântano Sombrio, que come memórias.',
    rewards: { xp: 1000 },
    onComplete: [{ set: 'corrupcao_enfraquecida' }, { subtitle: 'Com o Devorador morto, a água negra recua e revela degraus de pedra a oeste: um templo afundado.', duration: 5 }],
    next: ['q_templo'],
    completedText: 'O Devorador se desfez em lodo e vozes. Por um instante ouvi todas as memórias que ele tinha comido. Algumas eram minhas.',
    stages: [
      {
        id: 'pantano',
        nextStep: 'O Coração do Pântano fica no sudoeste, no meio do Pântano Sombrio. Leve fogo: corrompidos odeiam fogo.',
        log: 'O Ato II terminou, mas o veneno não. Ele vem do pântano. Hora de ir até a fonte.',
        objectives: [{ id: 'chegar', kind: 'reach', location: 'coracao_pantano', radius: 40, text: 'Chegar ao Coração do Pântano' }],
      },
      {
        id: 'devorador',
        nextStep: 'O Devorador não se move: fique fora do alcance dos tentáculos (círculos roxos) e ataque de longe. Fogo queima a carne corrompida.',
        log: 'Uma ilha de raízes negras. No centro, uma massa que respira e tem olhos demais.',
        objectives: [{ id: 'devorador', kind: 'boss', bossId: 'devorador_almas', text: 'Destruir o Devorador de Almas', marker: { place: 'pantano_coracao', radius: 30 } }],
      },
    ],
  },

  q_templo: {
    id: 'q_templo',
    title: 'A Primeira Era',
    category: 'main',
    description: 'Um templo mais antigo que Aeternum emergiu do pântano. O guardião dele faz perguntas que só o verdadeiro Guardião do Tempo saberia responder.',
    rewards: { xp: 1100 },
    next: ['q_darian'],
    completedText: 'O selo me devolveu o pior pedaço de mim: Darian, sozinho no farol, me chamando enquanto eu fechava a Cisão. E a verdade sobre o selo — ele só se fecha se eu voltar a dormir. Ou se o Coração for usado.',
    stages: [
      {
        id: 'descer',
        nextStep: 'O Templo Submerso fica a oeste do Coração do Pântano, onde a água recuou.',
        objectives: [{ id: 'templo', kind: 'reach', location: 'templo_submerso', radius: 32, text: 'Entrar no Templo Submerso' }],
      },
      {
        id: 'guardiao',
        nextStep: 'Cada fragmento de memória que você tem enfraquece o Guardião. Pule as ondas douradas: elas deixam lento.',
        log: 'Colunas partidas, água parada e um sol de sete raios no chão. O guardião acordou antes de eu chegar ao centro.',
        objectives: [{ id: 'guardiao', kind: 'boss', bossId: 'guardiao_primeira_era', text: 'Responder ao Guardião da Primeira Era', marker: { place: 'templo_centro', radius: 26 } }],
      },
      {
        id: 'selo',
        nextStep: 'O Selo da Primeira Era brilha no altar ao norte do templo.',
        objectives: [{ id: 'selo', kind: 'interact', target: 'selo_primeira_era', text: 'Tocar o Selo da Primeira Era', marker: { place: 'templo_selo' } }],
      },
    ],
  },

  q_darian: {
    id: 'q_darian',
    title: 'O Cavaleiro do Eclipse',
    category: 'main',
    description: 'Darian, meu aprendiz, serve o Rei com uma armadura negra. Ele me espera na Torre do Observador. Quatro mil anos esperando.',
    rewards: { xp: 1200 },
    onComplete: [{ set: 'ato3_concluido' }, { script: 'epilogo_ato3' }],
    next: ['q_eclipse'],
    completedText: [
      { when: [{ flag: 'darian_redimido' }], text: 'Estendi a mão e Darian aceitou. Ele tirou o elmo e era só um rapaz cansado. Disse que vai estar lá quando o eclipse vier.' },
      { when: [{ flag: 'darian_morto' }], text: 'Darian caiu diante da torre onde aprendeu seus primeiros feitiços. Fiquei com a insígnia dele. Pesa mais do que deveria.' },
      { text: 'O Cavaleiro do Eclipse não está mais no caminho.' },
    ],
    stages: [
      {
        id: 'torre',
        nextStep: 'A Torre do Observador fica a leste do vale, no alto de uma colina.',
        log: 'Darian. Eu me lembro dele rindo no farol. Eu me lembro de ter fechado a porta.',
        objectives: [{ id: 'torre', kind: 'reach', location: 'torre_observador', radius: 45, text: 'Ir à Torre do Observador' }],
      },
      {
        id: 'duelo',
        nextStep: 'Darian é rápido: bloqueie ou esquive dos cortes e não deixe que ele tome distância para a investida.',
        objectives: [{ id: 'duelo', kind: 'boss', bossId: 'cavaleiro_eclipse', text: 'Duelar com Darian, o Cavaleiro do Eclipse', marker: { place: 'torre_duelo', radius: 24 } }],
      },
      {
        id: 'escolha',
        nextStep: 'Darian está de joelhos no círculo de duelo. Fale com ele.',
        log: 'Ele caiu de joelhos. Ainda segura a espada, mas não a levanta.',
        objectives: [{ id: 'decidir', kind: 'flag', flag: 'darian_destino', text: 'Decidir o destino de Darian', marker: { place: 'torre_duelo' } }],
      },
    ],
  },

  // ========================================================= ATO IV — ECLIPSE
  q_eclipse: {
    id: 'q_eclipse',
    title: 'Eclipse',
    category: 'main',
    description: 'A Cidadela Celeste emergiu dos céus sobre o Desfiladeiro das Cinzas. O Antigo Rei espera no trono, com o Coração do Eclipse aos pés.',
    onStart: [{ script: 'cidadela_surge' }],
    rewards: { xp: 3000 },
    onComplete: [{ set: 'jogo_concluido' }],
    completedText: [
      { when: [{ flag: 'final', is: 'reunificacao' }], text: 'Usei o Coração como ele foi pensado. Magia e máquina, juntas de novo. E eu vou envelhecer, como todo mundo. Finalmente.' },
      { when: [{ flag: 'final', is: 'selo' }], text: 'Fechei o selo com Aldric e comigo dentro. O mundo continua dividido, mas seguro. Contem uma boa história sobre mim.' },
      { when: [{ flag: 'final', is: 'sombrio' }], text: 'Bebi o Coração. Agora o eclipse sou eu. O mundo está a salvo do Rei. Só não sei se está a salvo de mim.' },
      { text: 'O Rei caiu.' },
    ],
    stages: [
      {
        id: 'rei',
        nextStep: 'Voe até a Cidadela Celeste, no alto do céu sobre o Desfiladeiro das Cinzas. Encha a energia antes: a subida é longa. Os aliados que você poupou virão ajudar.',
        log: 'A cidadela subiu das nuvens como se sempre estivesse ali, esperando.',
        objectives: [{ id: 'rei', kind: 'boss', bossId: 'rei_aldric', text: 'Derrotar o Antigo Rei Aldric Valmora', marker: { place: 'cidadela_centro', radius: 34 } }],
      },
      {
        id: 'escolha',
        nextStep: 'O Coração do Eclipse pulsa diante do trono. Aproxime-se e decida o destino do mundo.',
        log: 'Aldric se desfez. O Coração continua batendo. Ele espera por mim, como sempre esperou.',
        objectives: [{ id: 'final', kind: 'flag', flag: 'final', text: 'Decidir o destino do Coração do Eclipse', marker: { place: 'cidadela_coracao' } }],
      },
    ],
  },

  // ========================================================= SECUNDÁRIAS
  q_martelo: {
    id: 'q_martelo',
    title: 'O Martelo Perdido',
    category: 'side',
    giver: 'doran',
    description: 'O martelo ancestral dos Forjafria sumiu quando o pai de Doran foi ao Laboratório Abandonado trocar sucata. Um autômato errante ronda o lugar desde então.',
    rewards: { xp: 200, items: [['espada_runica', 1]], effects: [{ freeUpgrade: 1 }, { attitude: 2, npc: 'doran' }, { mem: 'ajudou', npc: 'doran', inc: 1 }] },
    rewardsText: 'Espada Rúnica · 1 aprimoramento grátis na forja · 200 XP',
    completedText: 'Devolvi o martelo dos Forjafria. Doran chorou — e jurou que foi a fumaça da forja.',
    stages: [
      {
        id: 'laboratorio',
        nextStep: 'O Laboratório Abandonado fica no extremo nordeste do vale, além das ruínas. Há um autômato rondando.',
        objectives: [{ id: 'chegar', kind: 'reach', location: 'laboratorio_abandonado', radius: 34, text: 'Ir ao Laboratório Abandonado' }],
      },
      {
        id: 'martelo',
        nextStep: 'O martelo deve estar perto do terminal, no fundo do laboratório.',
        objectives: [
          { id: 'martelo', kind: 'collect', item: 'martelo_doran', count: 1, text: 'Recuperar o martelo de Doran', points: ['martelo_lab'] },
          { id: 'automato', kind: 'kill', typeId: 'automato_errante', count: 1, text: 'Derrotar o autômato errante', optional: true, marker: false },
        ],
      },
      {
        id: 'entregar',
        nextStep: 'Leve o martelo de volta à forja de Brumafria.',
        objectives: [{ id: 'doran', kind: 'talk', npc: 'doran', dialogue: 'doran_martelo_volta', text: 'Devolver o martelo a Doran' }],
      },
    ],
  },

  q_cervo: {
    id: 'q_cervo',
    title: 'O Cervo de Luz',
    category: 'side',
    giver: 'ilsa',
    description: 'Ilsa diz que caçadores de fora andam atrás do Cervo Luminoso, o espírito da Floresta de Lúmen. Ele só aparece à noite, na clareira.',
    rewards: { xp: 120 },
    branchRewards: [{ when: [{ flag: 'cervo_decisao', is: 'proteger' }], rewards: { xp: 120, items: [['amuleto_floresta', 1]] } }],
    rewardsText: 'Amuleto da Floresta (se o cervo viver) · ouro dos caçadores (se não)',
    failWhen: [{ flag: 'cervo_morto' }, { not: { flag: 'cervo_decisao', is: 'deixar' } }],
    failText: 'O Cervo de Luz morreu. A clareira ficou escura.',
    onFail: [{ attitude: -2, npc: 'ilsa' }],
    completedText: [
      { when: [{ flag: 'cervo_decisao', is: 'deixar' }], text: 'Deixei os caçadores levarem o Cervo de Luz. O ouro pesa no bolso. Ilsa não olha mais para mim.' },
      { text: 'O Cervo de Luz continua correndo pela Floresta de Lúmen. Ilsa me deu o amuleto da avó dela.' },
    ],
    stages: [
      {
        id: 'noite',
        nextStep: 'O cervo só aparece à noite. Hilda aluga quartos na taverna — dá para descansar até o anoitecer.',
        objectives: [{ id: 'noite', kind: 'time', night: true, text: 'Esperar a noite cair' }],
      },
      {
        id: 'clareira',
        nextStep: 'A clareira fica no coração da Floresta de Lúmen, a leste da vila, perto do rio.',
        objectives: [{ id: 'clareira', kind: 'reach', place: 'clareira_cervo_luminoso', radius: 22, requires: [{ night: true }], text: 'Encontrar o Cervo Luminoso na clareira (à noite)' }],
      },
      {
        id: 'cacadores',
        nextStep: 'Três caçadores cercam a clareira. Fale com o líder — ou resolva do seu jeito.',
        log: 'Lá estava ele: um cervo feito de luz azul. E, entre as árvores, três arcos apontados.',
        onEnter: [{ script: 'garantir_cervo', now: true }],
        spawns: [
          { typeId: 'cacador_furtivo', at: 'clareira_cervo_luminoso', uniqueId: 'cervo_cacador_1', offset: [9, 6] },
          { typeId: 'cacador_furtivo', at: 'clareira_cervo_luminoso', uniqueId: 'cervo_cacador_2', offset: [-8, 9] },
          { typeId: 'cacador_furtivo', at: 'clareira_cervo_luminoso', uniqueId: 'cervo_cacador_3', offset: [3, -10] },
        ],
        branches: [{ when: [{ flag: 'cervo_decisao', is: 'deixar' }], next: 'relatar' }],
        objectives: [{ id: 'decidir', kind: 'flag', flag: 'cervo_decisao', text: 'Decidir o que fazer com os caçadores', marker: { unique: 'cervo_cacador_1', place: 'clareira_cervo_luminoso' } }],
      },
      {
        id: 'proteger',
        nextStep: 'Derrube os caçadores antes que as flechas acertem o cervo.',
        // recria os que faltarem (ex.: carregar um save no meio da luta)
        spawns: [
          { typeId: 'cacador_furtivo', at: 'clareira_cervo_luminoso', uniqueId: 'cervo_cacador_1', offset: [9, 6], aggro: true, when: [{ noFlag: 'cacadores_fugiram' }] },
          { typeId: 'cacador_furtivo', at: 'clareira_cervo_luminoso', uniqueId: 'cervo_cacador_2', offset: [-8, 9], aggro: true, when: [{ noFlag: 'cacadores_fugiram' }] },
          { typeId: 'cacador_furtivo', at: 'clareira_cervo_luminoso', uniqueId: 'cervo_cacador_3', offset: [3, -10], aggro: true, when: [{ noFlag: 'cacadores_fugiram' }] },
        ],
        objectives: [
          { id: 'cacadores', kind: 'kill', typeId: 'cacador_furtivo', uniquePrefix: 'cervo_cacador_', count: 3, text: 'Derrotar os caçadores furtivos', when: [{ not: { flag: 'cacadores_fugiram' } }], marker: { place: 'clareira_cervo_luminoso', radius: 18 } },
          { id: 'fugiram', kind: 'flag', flag: 'cacadores_fugiram', text: 'Os caçadores fugiram', when: [{ flag: 'cacadores_fugiram' }] },
        ],
      },
      {
        id: 'relatar',
        nextStep: 'Volte a Brumafria e conte a Ilsa o que aconteceu.',
        objectives: [{ id: 'ilsa', kind: 'talk', npc: 'ilsa', dialogue: 'ilsa_cervo_volta', text: 'Falar com Ilsa' }],
      },
    ],
  },

  q_elyra: {
    id: 'q_elyra',
    title: 'Relíquias de Elyra',
    category: 'side',
    giver: 'teodoro',
    description: 'Teodoro jura que as Ilhas Suspensas guardam inscrições do povo de Elyra. Só se chega lá voando — e só um mago voa.',
    rewards: { xp: 300, items: [['cajado_vazio', 1]], effects: [{ set: 'lore_elyra' }, { attitude: 2, npc: 'teodoro' }, { mem: 'ajudou', npc: 'teodoro', inc: 1 }] },
    completedText: 'As inscrições falam de "sete vozes, um selo" e de um certo Aurivar. Teodoro ficou pálido. Eu também.',
    stages: [
      {
        id: 'inscricoes',
        nextStep: 'Voe [F] até as Ilhas Suspensas, ao norte do Lago Espelhado. Pouse nas ilhas para decalcar as inscrições.',
        objectives: [{ id: 'inscricoes', kind: 'collect', item: 'inscricao_elyra', count: 3, text: 'Decalcar inscrições nas Ilhas Suspensas', points: ['inscricao_1', 'inscricao_2', 'inscricao_3'] }],
      },
      {
        id: 'teodoro',
        nextStep: 'Leve os decalques a Teodoro, no arquivo de Brumafria.',
        objectives: [{ id: 'teodoro', kind: 'talk', npc: 'teodoro', dialogue: 'teodoro_elyra_volta', text: 'Entregar as inscrições a Teodoro' }],
      },
    ],
  },

  q_lobos: {
    id: 'q_lobos',
    title: 'Contrato: Lobos Sombrios',
    category: 'contract',
    giver: 'bran',
    description: 'Contrato no quadro da taverna, assinado pelo Capitão Bran: a matilha da toca da floresta, liderada por um alfa enorme, está atacando os rebanhos.',
    rewards: { xp: 200, gold: 150, effects: [{ attitude: 1, npc: 'bran' }] },
    completedText: 'A toca está vazia. Os rebanhos de Brumafria dormem melhor.',
    stages: [
      {
        id: 'cacar',
        nextStep: 'A toca fica na Floresta de Lúmen, a leste da clareira. O alfa uiva para fortalecer a matilha — derrube-o primeiro.',
        spawns: [
          { typeId: 'alfa_lobo', at: 'toca_lobos', uniqueId: 'contrato_alfa', near: 120, when: [{ defeated: 'alfa_lobos_toca' }] },
          { typeId: 'lobo_sombrio', at: 'toca_lobos', uniqueId: 'contrato_lobo_1', near: 120, offset: [4, 3], when: [{ defeated: 'alfa_lobos_toca' }] },
          { typeId: 'lobo_sombrio', at: 'toca_lobos', uniqueId: 'contrato_lobo_2', near: 120, offset: [-4, 2], when: [{ defeated: 'alfa_lobos_toca' }] },
          { typeId: 'lobo_sombrio', at: 'toca_lobos', uniqueId: 'contrato_lobo_3', near: 120, offset: [1, -4], when: [{ defeated: 'alfa_lobos_toca' }] },
        ],
        objectives: [
          { id: 'alfa', kind: 'kill', typeId: 'alfa_lobo', count: 1, text: 'Matar o alfa da matilha', marker: { place: 'toca_lobos', radius: 25 } },
          { id: 'lobos', kind: 'kill', typeId: 'lobo_sombrio', count: 3, text: 'Matar lobos sombrios', marker: false },
        ],
      },
      {
        id: 'pagamento',
        nextStep: 'Receba o pagamento com o Capitão Bran.',
        objectives: [{ id: 'bran', kind: 'talk', npc: 'bran', dialogue: 'bran_contrato_lobos', text: 'Receber o pagamento de Bran' }],
      },
    ],
  },

  q_automato: {
    id: 'q_automato',
    title: 'Contrato: Autômato Errante',
    category: 'contract',
    giver: 'bran',
    description: 'Contrato no quadro: um autômato de elite saiu do Laboratório Abandonado e esmagou duas carroças na estrada. Recompensa generosa — "de preferência em peças".',
    rewards: { xp: 250, gold: 200, items: [['manopla_tecnomagica', 1]], effects: [{ attitude: 1, npc: 'bran' }] },
    completedText: 'O autômato errante virou sucata. Bran me pagou e ainda arrumou uma manopla estranha que "ninguém aqui sabe usar".',
    stages: [
      {
        id: 'destruir',
        nextStep: 'O autômato ronda o Laboratório Abandonado, no nordeste. O núcleo nas costas é o ponto fraco; raios atravessam a armadura.',
        spawns: [{ typeId: 'automato_errante', at: 'laboratorio_entrada', uniqueId: 'contrato_automato', near: 120, offset: [0, 8], when: [{ defeated: 'automato_errante_lab' }] }],
        objectives: [{ id: 'automato', kind: 'kill', typeId: 'automato_errante', count: 1, text: 'Destruir o autômato errante', marker: { location: 'laboratorio_abandonado', radius: 30 } }],
      },
      {
        id: 'pagamento',
        nextStep: 'Receba o pagamento com o Capitão Bran.',
        objectives: [{ id: 'bran', kind: 'talk', npc: 'bran', dialogue: 'bran_contrato_automato', text: 'Receber o pagamento de Bran' }],
      },
    ],
  },

  q_fragmentos: {
    id: 'q_fragmentos',
    title: 'Fragmentos de Memória',
    category: 'mystery',
    description: 'Cacos de luz espalhados pelo vale guardam instantes da minha vida. Cada um que toco devolve uma lembrança — e uma pergunta.',
    autoStart: [{ any: [{ flag: 'frag_cripta' }, { flag: 'frag_farol' }, { flag: 'frag_santuario' }] }],
    rewards: { xp: 300, skillPoints: 1 },
    onComplete: [{ script: 'revelacao_fragmentos' }],
    completedText: 'Três memórias: o Conselho dos Sete, um aprendiz chamado Darian e uma porta que eu mesmo tranquei. Estou me reconstruindo aos pedaços.',
    stages: [
      {
        id: 'buscar',
        nextStep: 'Fragmentos brilham onde Kaelen esteve: a cripta, o alto do Farol Celeste (só voando) e o Santuário de Cristal, a oeste.',
        objectives: [
          { id: 'cripta', kind: 'flag', flag: 'frag_cripta', text: 'Fragmento da Cripta do Despertar', points: ['frag_cripta'] },
          { id: 'farol', kind: 'flag', flag: 'frag_farol', text: 'Fragmento do Farol Celeste', points: ['frag_farol'] },
          { id: 'santuario', kind: 'flag', flag: 'frag_santuario', text: 'Fragmento do Santuário de Cristal', points: ['frag_santuario'] },
        ],
      },
    ],
  },

  q_taverna: {
    id: 'q_taverna',
    title: 'Ervas para Hilda',
    category: 'side',
    giver: 'hilda',
    description: 'Hilda precisa de ervas-lúmen para as poções da taverna. Elas brilham de leve entre as raízes da Floresta de Lúmen.',
    rewards: { xp: 120, items: [['pocao_vida', 3]], effects: [{ set: 'rumores_hilda' }, { attitude: 2, npc: 'hilda' }, { mem: 'ajudou', npc: 'hilda', inc: 1 }] },
    rewardsText: 'Poção de Vida ×3 · rumores de Hilda · 120 XP',
    completedText: 'Hilda pagou em poções e em fofoca — e a fofoca valia mais.',
    stages: [
      {
        id: 'colher',
        nextStep: 'Procure as ervas-lúmen na Floresta de Lúmen, a leste da vila. À noite elas brilham mais.',
        objectives: [{ id: 'ervas', kind: 'collect', item: 'erva_lumen', count: 5, text: 'Colher ervas-lúmen', marker: { location: 'floresta_lumen', radius: 120 } }],
      },
      {
        id: 'entregar',
        nextStep: 'Leve as ervas a Hilda, no balcão do Javali Rúnico.',
        objectives: [{ id: 'hilda', kind: 'talk', npc: 'hilda', dialogue: 'hilda_ervas_volta', text: 'Entregar as ervas a Hilda' }],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Ofertas de missões ("!" sobre quem oferece; condições espelham as opções de diálogo)
// ---------------------------------------------------------------------------
export interface QuestOffer {
  /** NPC (id de npcs.ts) ou ponto de interação (QUEST_POINTS). */
  npc?: string;
  point?: string;
  when?: Cond[];
}

export const QUEST_OFFERS: Record<string, QuestOffer> = {
  q_martelo: { npc: 'doran', when: [{ quest: 'q_estranho', status: 'completed' }] },
  q_cervo: { npc: 'ilsa', when: [{ quest: 'q_prologo', status: 'completed' }, { not: { mem: 'traiu', npc: 'ilsa', is: true } }] },
  q_elyra: { npc: 'teodoro', when: [{ quest: 'q_prologo', status: 'completed' }] },
  q_taverna: { npc: 'hilda', when: [{ quest: 'q_prologo', status: 'completed' }] },
  q_lobos: { point: 'quadro_missoes' },
  q_automato: { point: 'quadro_missoes' },
};

// ---------------------------------------------------------------------------
// Cinemáticas leves (texto + câmera + fades)
// ---------------------------------------------------------------------------
export type CineVec = string | [number, number, number];

export type CineStep = (
  | { fade: 'out' | 'in'; duration?: number; color?: 'black' | 'white' }
  | { subtitle: string; speaker?: string; duration?: number }
  | { title: string; subtitle?: string; duration?: number }
  /** Plano de câmera: posição e alvo (âncora ou [x, y, z]); `rise` soma altura à âncora. */
  | { shot: { from: CineVec; fromOffset?: [number, number, number]; look: CineVec; lookOffset?: [number, number, number] }; duration?: number }
  | { wait: number }
  | { effects: Effect[] }
) & {
  /** Só toca este passo se as condições passarem (epílogos que dependem das escolhas). */
  when?: Cond[];
};

/** Epílogo dos aliados (mostra só o que aconteceu de verdade nesta partida). */
function allyEpilogues(): CineStep[] {
  return [
    { when: [{ flag: 'ravena_poupada' }], subtitle: 'Ravena sumiu das estradas. Anos depois, uma caravana de Sabine foi salva de bandidos por uma mulher de capuz negro que não quis pagamento.', duration: 6 },
    { when: [{ flag: 'ravena_executada' }], subtitle: 'Sem a Corva, os Corvos viraram meia dúzia de ladrões de galinha. Bran Holt pendurou as lâminas dela na guarita.', duration: 5.5 },
    { when: [{ flag: 'barao_redimido' }], subtitle: 'Ferroluz usou a Forja Celeste para fazer arados e lanternas. Teodric Vael varre a oficina toda manhã e ensina as crianças a ler runas.', duration: 6 },
    { when: [{ flag: 'barao_exposto' }], subtitle: 'Ferroluz passou um inverno inteiro em guerra entre engenheiros e guardas. Teodric terminou os dias numa cela, conversando com cacos de espelho.', duration: 6 },
    { when: [{ flag: 'darian_redimido' }], subtitle: 'Darian voltou ao Farol Celeste. Numa noite sem nuvens, acendeu o farol sozinho, e deixou a luz acesa até o amanhecer.', duration: 6 },
    { when: [{ flag: 'darian_morto' }], subtitle: 'Ninguém visita a Torre do Observador. A insígnia do Cavaleiro do Eclipse ficou guardada num baú que nunca mais foi aberto.', duration: 5.5 },
    { when: [{ flag: 'guardiao_libertado' }], subtitle: 'Nas ruínas de Aeternum, Teodoro jura que, de vez em quando, ouve engrenagens cantando baixinho.', duration: 5 },
    { when: [{ flag: 'nucleo_absorvido' }], subtitle: 'O Irmão Calen nunca mais falou o nome do mago. Mas acendeu uma vela por ele todas as noites.', duration: 5 },
    { when: [{ flag: 'cervo_decisao', is: 'proteger' }], subtitle: 'Na Floresta de Lúmen, Ilsa jura que o Cervo de Luz ainda aparece nas noites de lua cheia.', duration: 5 },
  ];
}

export const CINEMATICS: Record<string, CineStep[]> = {
  intro: [
    { fade: 'out', duration: 0.01 },
    { title: 'Eclipse Arcano', subtitle: 'O Mago do Tempo Perdido', duration: 3.2 },
    { subtitle: 'Há quatro mil anos, o Império de Aeternum fundiu magia e máquina. Chamaram isso de Arcanotecnia.', duration: 5 },
    { subtitle: 'Então veio a Grande Cisão. O império caiu. As máquinas dormiram. A magia virou superstição.', duration: 5 },
    { shot: { from: 'cripta_saida', fromOffset: [6, 9, -6], look: 'porta_cripta', lookOffset: [0, 1.5, 0] }, duration: 0.01 },
    { fade: 'in', duration: 2 },
    { subtitle: 'Numa cripta esquecida do Vale de Brumafria, alguém arrancou os cristais errados.', duration: 4.5 },
    { subtitle: 'Kaelen: ...Quanto tempo eu dormi?', speaker: 'kaelen', duration: 3.5 },
  ],
  vista_brumafria: [
    { shot: { from: [-486, 0, 482], fromOffset: [0, 10, 0], look: 'praca_centro', lookOffset: [0, 8, 0] }, duration: 0.01 },
    { subtitle: 'Brumafria. Muros de pedra, chaminés acesas, torres de cristal apagadas.', duration: 4 },
    { subtitle: 'Kaelen: Torres de cristal... e ninguém para acendê-las. O que aconteceu com o mundo?', speaker: 'kaelen', duration: 4 },
  ],
  selo_aberto: [
    { shot: { from: 'pedestal_cristal_ruinas', fromOffset: [-6, 5, 6], look: 'portao_ruinas', lookOffset: [0, 3, 0] }, duration: 0.01 },
    { subtitle: 'O cristal se encaixa. As runas do portão acendem, uma a uma, como quem acorda.', duration: 3.6 },
    { subtitle: 'Kaelen: Ele me reconheceu. Isso devia me tranquilizar.', speaker: 'kaelen', duration: 3.2 },
  ],
  memoria_coracao: [
    { fade: 'out', duration: 1.2, color: 'white' },
    { subtitle: '(Uma oficina de vidro e luz. As mãos de Kaelen, mais jovens, desenham um coração de metal e cristal.)', duration: 5 },
    { subtitle: 'Voz Antiga: Magnífico, Arquimago. Com ele, o Éter jamais voltará a rachar o mundo.', speaker: 'rei', duration: 5 },
    { subtitle: 'Kaelen (memória): Ele vai unir magia e máquina sem que nenhuma devore a outra. É o que sempre quisemos.', speaker: 'kaelen', duration: 5 },
    { subtitle: 'Voz Antiga: Sim. "Unir". Eu lhe agradeço, Kaelen Aurivar. Mais do que pode imaginar.', speaker: 'rei', duration: 5 },
    { fade: 'in', duration: 1.6 },
    { subtitle: 'Kaelen: O Coração do Eclipse... fui eu que o projetei.', speaker: 'kaelen', duration: 4 },
  ],
  epilogo_ato1: [
    { fade: 'out', duration: 1.5 },
    { title: 'Fim do Ato I', subtitle: 'Ecos de Brumafria', duration: 3.5 },
    { subtitle: 'Em Ferroluz, um barão ouve sussurros que acredita serem de um sábio antigo.', duration: 4.5 },
    { subtitle: 'No Pântano Sombrio, a corrupção avança mais um palmo a cada noite.', duration: 4.5 },
    { subtitle: 'E em algum lugar dentro de um coração de cristal, um rei paciente sorri.', duration: 4.5 },
    { title: 'Continua no Ato II', subtitle: 'A Cidade de Ferro', duration: 3.5 },
    { subtitle: 'O vale continua aberto: missões, segredos e fragmentos ainda esperam por você.', duration: 4 },
    { fade: 'in', duration: 1.5 },
  ],
  memoria_cripta: [
    { fade: 'out', duration: 0.8, color: 'white' },
    { subtitle: '(Sete figuras em volta de um círculo de runas. Uma delas segura a mão de Kaelen.)', duration: 4.5 },
    { subtitle: 'Conselheira: Se fizermos isto, Kaelen, você não volta. Não como era.', duration: 4.5 },
    { subtitle: 'Kaelen (memória): Então que o mundo volte no meu lugar.', speaker: 'kaelen', duration: 4 },
    { fade: 'in', duration: 1.2 },
  ],
  memoria_farol: [
    { fade: 'out', duration: 0.8, color: 'white' },
    { subtitle: '(Um rapaz de armadura clara treina feitiços no alto de um farol, rindo dos próprios erros.)', duration: 4.5 },
    { subtitle: 'Darian: Mestre, um dia eu vou acender este farol sozinho. Vai ver.', duration: 4 },
    { subtitle: 'Kaelen (memória): Eu sei, Darian. Só não tenha pressa de ficar sozinho.', speaker: 'kaelen', duration: 4.5 },
    { fade: 'in', duration: 1.2 },
  ],
  memoria_santuario: [
    { fade: 'out', duration: 0.8, color: 'white' },
    { subtitle: '(Kaelen grava runas numa porta que não existe em lugar nenhum. As mãos tremem.)', duration: 4.5 },
    { subtitle: 'Kaelen (memória): Quem abrir isto precisa ser eu. E eu não posso me lembrar de como.', speaker: 'kaelen', duration: 5 },
    { fade: 'in', duration: 1.2 },
  ],
  revelacao_fragmentos: [
    { subtitle: 'Kaelen: O Conselho dos Sete. Darian. Uma porta trancada por dentro da minha cabeça. Eu me apaguei de propósito.', speaker: 'kaelen', duration: 5.5 },
  ],
  // ======================================================= ATO II
  memoria_forja: [
    { shot: { from: 'ferroluz_forja', fromOffset: [-9, 6, 9], look: 'ferroluz_forja', lookOffset: [0, 3, 0] }, duration: 0.01 },
    { subtitle: '(Os núcleos se encaixam. A Forja Celeste respira fundo, e um fogo azul sobe pelas chaminés pela primeira vez em quatro mil anos.)', duration: 5 },
    { subtitle: 'Barão Teodric: Ela acendeu! ELA ACENDEU! Sábio, está ouvindo?', speaker: 'barao', duration: 3.8 },
    { fade: 'out', duration: 1.2, color: 'white' },
    { subtitle: '(Memória. Sete magos em volta de um círculo de runas, no alto de uma torre. O céu racha como vidro.)', duration: 5 },
    { subtitle: 'Conselheira: Agora, Kaelen! Se esperarmos mais, Aldric vai beber o mundo inteiro!', duration: 4.5 },
    { subtitle: 'Kaelen (memória): Separem tudo. A magia de um lado, a máquina do outro. Cortem cada fio.', speaker: 'kaelen', duration: 4.5 },
    { subtitle: '(Kaelen puxa. O mundo se parte ao meio. Cidades caem do céu. Em algum lugar, um farol se apaga.)', duration: 5 },
    { fade: 'in', duration: 1.4 },
    { subtitle: 'Kaelen: A Grande Cisão... fui eu. Eu quebrei o mundo para salvá-lo.', speaker: 'kaelen', duration: 4.5 },
    { subtitle: 'Voz da Forja: Obrigado, Arquimago. E obrigado a você, meu servo fiel. A forja bate, o Coração ouve. Logo eu também andarei entre vocês.', speaker: 'aldric', duration: 6 },
    { subtitle: 'Kaelen: Eu conheço essa voz. Aldric.', speaker: 'kaelen', duration: 3.5 },
    { effects: [{ set: 'rei_revelado' }] },
  ],
  epilogo_ato2: [
    { fade: 'out', duration: 1.5 },
    { title: 'Fim do Ato II', subtitle: 'A Cidade de Ferro', duration: 3.5 },
    { when: [{ flag: 'barao_redimido' }], subtitle: 'Em Ferroluz, Teodric manda virar os canhões da muralha para o céu. Os engenheiros obedecem sem perguntar.', duration: 5 },
    { when: [{ flag: 'barao_exposto' }], subtitle: 'Em Ferroluz, engenheiros e guardas brigam pelo comando da cidade. A Forja Celeste continua acesa, sem dono.', duration: 5 },
    { subtitle: 'No Pântano Sombrio, algo enorme abre mais um olho.', duration: 4 },
    { subtitle: 'E na Torre do Observador, um cavaleiro de armadura negra afia a espada e espera pelo mestre.', duration: 4.5 },
    { title: 'Ato III', subtitle: 'A Primeira Era', duration: 3.5 },
    { fade: 'in', duration: 1.5 },
  ],
  // ======================================================= ATO III
  memoria_templo: [
    { fade: 'out', duration: 1, color: 'white' },
    { subtitle: '(Memória. O Farol Celeste, na noite da Cisão. O céu está rachando.)', duration: 4 },
    { subtitle: 'Darian (memória): Mestre! Abra! Eu acendi o farol sozinho, como prometi! Me deixe entrar!', speaker: 'darian', duration: 5 },
    { subtitle: 'Kaelen (memória): (Do outro lado da porta.) Me perdoe, Darian. Se eu abrir, o selo não fecha.', speaker: 'kaelen', duration: 5 },
    { subtitle: '(A porta se fecha. O farol se apaga.)', duration: 3.5 },
    { fade: 'in', duration: 1.4 },
    { subtitle: 'Guardião da Primeira Era (eco): O selo foi costurado com a sua vida, Guardião do Tempo. Ele só se fecha de novo se você voltar a dormir. Ou se o Coração for usado.', duration: 6.5 },
    { subtitle: 'Kaelen: Dormir de novo, ou usar a coisa que eu mesmo construí. Que belas opções.', speaker: 'kaelen', duration: 4.5 },
  ],
  epilogo_ato3: [
    { fade: 'out', duration: 1.5 },
    { title: 'Fim do Ato III', subtitle: 'A Primeira Era', duration: 3.5 },
    { when: [{ flag: 'darian_redimido' }], subtitle: 'No Farol Celeste, Darian tira quatro mil anos de poeira dos degraus e acende uma vela no alto da torre.', duration: 5 },
    { when: [{ flag: 'darian_morto' }], subtitle: 'Diante da Torre do Observador, o vento empurra uma armadura vazia de um lado para o outro.', duration: 5 },
    { subtitle: 'Sobre o Desfiladeiro das Cinzas, as nuvens começam a girar.', duration: 4 },
    { subtitle: 'O Coração do Eclipse bate mais forte. A Cidadela Celeste desperta.', duration: 4 },
    { title: 'Ato IV', subtitle: 'Eclipse', duration: 3.5 },
    { fade: 'in', duration: 1.5 },
  ],
  // ======================================================= ATO IV
  cidadela_surge: [
    { effects: [{ set: 'cidadela_surgiu' }, { script: 'eclipse_avanca' }] },
    { shot: { from: [250, 0, 30], fromOffset: [0, 30, 0], look: 'cidadela_centro', lookOffset: [0, -10, 0] }, duration: 0.01 },
    { subtitle: '(O céu escurece ao meio-dia. Sobre o Desfiladeiro das Cinzas, as nuvens se abrem, e uma cidade inteira desce do alto, presa a correntes de luz.)', duration: 6 },
    { subtitle: 'Kaelen: A Cidadela Celeste. Só dá para chegar lá voando. E ele sabe que eu vou.', speaker: 'kaelen', duration: 4.5 },
  ],
  // ======================================================= FINAIS
  final_reunificacao: [
    { shot: { from: 'cidadela_coracao', fromOffset: [10, 5, 14], look: 'cidadela_coracao', lookOffset: [0, 1, 0] }, duration: 0.01 },
    { subtitle: '(Kaelen apoia as duas mãos no Coração. As runas mudam de cor: do roxo ao azul, do azul ao dourado.)', duration: 5 },
    { subtitle: 'Kaelen: Magia e máquina. Nenhuma devorando a outra. Era só isso que eu queria.', speaker: 'kaelen', duration: 4.5 },
    { effects: [{ script: 'fim_reunificacao' }] },
    { subtitle: '(Uma luz dourada desce da cidadela e corre pelo vale como água. Nas torres de Brumafria, os cristais se acendem sozinhos.)', duration: 6 },
    { fade: 'out', duration: 2, color: 'white' },
    { title: 'Reunificação', subtitle: 'Final', duration: 4 },
    ...allyEpilogues(),
    { subtitle: 'E Kaelen Aurivar, pela primeira vez em quatro mil anos, sentiu frio, fome e sono. Achou ótimo.', duration: 5 },
    { subtitle: 'Ele envelheceu como todo mundo. Dizem que morreu bem velho, em Brumafria, contando histórias em que ninguém acreditava.', duration: 6 },
    { effects: [{ set: 'final', value: 'reunificacao' }] },
    { title: 'Eclipse Arcano', subtitle: 'Obrigado por jogar. O vale continua aberto para você.', duration: 5 },
    { fade: 'in', duration: 2 },
  ],
  final_selo: [
    { shot: { from: 'cidadela_coracao', fromOffset: [-10, 5, 14], look: 'cidadela_coracao', lookOffset: [0, 1, 0] }, duration: 0.01 },
    { subtitle: '(Kaelen fecha os dedos em volta do Coração. O selo se abre de novo, como uma porta que reconhece a chave.)', duration: 5 },
    { subtitle: 'Aldric (eco): Você de novo, Arquimago. Sempre você.', speaker: 'aldric', duration: 3.8 },
    { subtitle: 'Kaelen: Desta vez eu fico do lado de dentro com você, Aldric. Vamos ter muito tempo para conversar.', speaker: 'kaelen', duration: 5 },
    { effects: [{ script: 'fim_selo' }] },
    { subtitle: '(Uma luz azul engole o trono. Quando ela se apaga, a cidadela está vazia, e o Coração dorme.)', duration: 5 },
    { fade: 'out', duration: 2 },
    { title: 'Selo Eterno', subtitle: 'Final', duration: 4 },
    ...allyEpilogues(),
    { subtitle: 'Em Brumafria, a Anciã Maren conta às crianças a história do mago que dormiu para o mundo acordar. Elas nunca acreditam na parte do dragão.', duration: 6 },
    { subtitle: 'Às vezes, em noite de eclipse, alguém jura ver uma luz azul no alto do céu, piscando como quem vigia.', duration: 5.5 },
    { effects: [{ set: 'final', value: 'selo' }] },
    { title: 'Eclipse Arcano', subtitle: 'Obrigado por jogar. O vale continua aberto para você.', duration: 5 },
    { fade: 'in', duration: 2 },
  ],
  final_sombrio: [
    { shot: { from: 'cidadela_coracao', fromOffset: [0, 4, 12], look: 'cidadela_coracao', lookOffset: [0, 1, 0] }, duration: 0.01 },
    { subtitle: '(Kaelen abre a mão. O Coração escurece, encolhe e entra no peito dele como fumaça voltando para casa.)', duration: 5 },
    { subtitle: 'Aldric (eco): Sim... SIM. Agora você entende, Arquimago. Sempre entendeu.', speaker: 'aldric', duration: 4.5 },
    { subtitle: 'Kaelen: Cale-se. Agora quem fala sou eu.', speaker: 'kaelen', duration: 3.5 },
    { effects: [{ script: 'fim_sombrio' }, { statMod: 'coracao_eclipse', mods: { spellPower: 0.2 } }] },
    { subtitle: '(O sol some atrás de um disco negro. O disco não sai mais do lugar.)', duration: 4.5 },
    { fade: 'out', duration: 2 },
    { title: 'Ascensão Sombria', subtitle: 'Final', duration: 4 },
    ...allyEpilogues(),
    { subtitle: 'O eclipse nunca mais saiu do céu do vale. As colheitas continuaram, os monstros sumiram, e as pessoas pararam de rir alto.', duration: 6 },
    { subtitle: 'Dizem que na Cidadela Celeste há um trono, e que o homem sentado nele ainda se lembra de ter sido bom. Às vezes.', duration: 6 },
    { effects: [{ set: 'final', value: 'sombrio' }] },
    { title: 'Eclipse Arcano', subtitle: 'Obrigado por jogar. O vale continua aberto para você.', duration: 5 },
    { fade: 'in', duration: 2 },
  ],
};

/** Textos do cartão de nome de chefes. */
export const BOSS_CARDS: Record<string, { title: string; subtitle: string }> = {
  guardiao_mecanico: { title: 'Guardião Mecânico das Ruínas', subtitle: 'Sentinela da Câmara de Aeternum' },
  colosso_ferro: { title: 'Colosso de Ferro e Magia', subtitle: 'O orgulho de Ferroluz' },
  bruxa_tempestades: { title: 'Morgana, a Bruxa das Tempestades', subtitle: 'Uma das Sete do Conselho' },
  dragao_cristal: { title: 'Vyrmathal, o Dragão de Cristal', subtitle: 'Guardião dos cristais primordiais' },
  devorador_almas: { title: 'O Devorador de Almas', subtitle: 'A boca da corrupção' },
  guardiao_primeira_era: { title: 'Guardião da Primeira Era', subtitle: 'Ele pergunta o que você esqueceu' },
  cavaleiro_eclipse: { title: 'Darian, o Cavaleiro do Eclipse', subtitle: 'O aprendiz que ficou para trás' },
  rei_aldric: { title: 'Aldric Valmora', subtitle: 'O Antigo Rei' },
};
