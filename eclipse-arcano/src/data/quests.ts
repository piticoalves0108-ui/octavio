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
// Cinemáticas leves (texto + câmera + fades)
// ---------------------------------------------------------------------------
export type CineVec = string | [number, number, number];

export type CineStep =
  | { fade: 'out' | 'in'; duration?: number; color?: 'black' | 'white' }
  | { subtitle: string; speaker?: string; duration?: number }
  | { title: string; subtitle?: string; duration?: number }
  /** Plano de câmera: posição e alvo (âncora ou [x, y, z]); `rise` soma altura à âncora. */
  | { shot: { from: CineVec; fromOffset?: [number, number, number]; look: CineVec; lookOffset?: [number, number, number] }; duration?: number }
  | { wait: number }
  | { effects: Effect[] };

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
};

/** Textos do cartão de nome de chefes. */
export const BOSS_CARDS: Record<string, { title: string; subtitle: string }> = {
  guardiao_mecanico: { title: 'Guardião Mecânico das Ruínas', subtitle: 'Sentinela da Câmara de Aeternum' },
};
