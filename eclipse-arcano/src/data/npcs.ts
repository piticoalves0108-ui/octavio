/**
 * Habitantes de Brumafria: aparência procedural, personalidade, objetivos,
 * rotina por hora (âncoras de src/data/places.ts + rotas de PATROL_ROUTES) e
 * números do comportamento (velocidades, raios de reação, simulação distante).
 * Implementação em src/npc/**.
 */
import type { Cond } from '../rpg/dialogue/script';

export type NpcRole = 'elder' | 'guard' | 'smith' | 'innkeeper' | 'scholar' | 'hunter' | 'merchant' | 'priest' | 'villager' | 'child' | 'bard';

/** Atividades da rotina (cada uma tem animação própria). */
export type NpcActivity =
  | 'sleep' // dentro de casa (some na porta)
  | 'idle'
  | 'work' // trabalho manual genérico (mãos na bancada)
  | 'hammer' // martelar (forja, carpintaria)
  | 'sweep' // varrer
  | 'harvest' // colher / mexer na terra
  | 'sit'
  | 'pray'
  | 'read'
  | 'guard' // posto fixo, lança em pé
  | 'patrol' // percorre uma rota de PATROL_ROUTES
  | 'wander' // passeia entre âncoras com uma tag
  | 'chat' // conversa com gestos
  | 'drink' // sentado na taverna, caneca
  | 'sell' // atrás do balcão chamando fregueses
  | 'play'; // bardo tocando / criança brincando

export interface ScheduleEntry {
  /** Hora inicial (inclusiva) e final (exclusiva); aceita volta pela meia-noite. */
  from: number;
  to: number;
  act: NpcActivity;
  /** Âncora (places.ts). */
  at?: string;
  /** wander: tag das âncoras visitadas. */
  tag?: string;
  /** patrol: id de PATROL_ROUTES. */
  route?: string;
}

export interface NpcLook {
  sex: 'm' | 'f';
  /** Escala de altura (≈0,9–1,08; criança ≈0,68). */
  height: number;
  /** Largura do corpo (0,85 magro – 1,25 robusto). */
  build: number;
  skin: number;
  hair: number;
  hairStyle: 'short' | 'long' | 'bun' | 'bald' | 'braid' | 'tonsure' | 'curly';
  beard?: 'none' | 'short' | 'long' | 'mustache';
  shirt: number;
  pants: number;
  /** Roupa longa (vestido/túnica/batina) com esta cor. */
  robe?: number;
  /** Capa/xale/manto. */
  cloak?: number;
  apron?: number;
  hat?: 'none' | 'cap' | 'wide' | 'hood' | 'helmet' | 'scarf' | 'straw' | 'feather';
  hatColor?: number;
  tool?: 'none' | 'hammer' | 'broom' | 'sickle' | 'book' | 'spear' | 'cane' | 'basket' | 'lute' | 'bow' | 'mug';
  /** Cota e tabardo da guarda. */
  armor?: boolean;
  belt?: number;
  boots: number;
  /** Corcunda leve (idosos). */
  stoop?: boolean;
  glasses?: boolean;
}

export interface NpcDef {
  id: string;
  name: string;
  /** Subtítulo no diálogo / placa de nome. */
  title: string;
  role: NpcRole;
  faction: 'villager' | 'guard';
  /** Âncora da porta de casa (onde some para dormir/abrigar-se). */
  home: string;
  /** Abrigo para chuva/alarme (padrão: home). */
  shelter?: string;
  personality: string;
  goal: string;
  look: NpcLook;
  schedule: ScheduleEntry[];
  /** Rotinas alternativas por estado da história (a primeira que valer substitui a rotina). */
  overrides?: { when: Cond[]; schedule: ScheduleEntry[] }[];
  shop?: string;
  /** Falas pessoais usadas no diálogo genérico. */
  lines?: { hello: string[]; about: string; worry?: string };
  /** NPC da história (nunca some do mundo, marcador de missão). */
  story?: boolean;
  /** Velocidade de caminhada (m/s). */
  walk?: number;
}

/** Números de comportamento dos NPCs. */
export const NPC_RULES = {
  walkSpeed: 1.35,
  runSpeed: 3.9,
  /** Distância (m) para mostrar o nome sobre a cabeça. */
  nameplateRange: 13,
  /** Raio (m) em que o jogador é cumprimentado. */
  greetRange: 6,
  /** Raio (m) em que magia lançada pelo jogador assusta. */
  magicRange: 26,
  /** Raio (m) de reação ao jogador voando por cima. */
  flyOverRange: 22,
  flyOverMinHeight: 4,
  /** Tempo (s) escondido/encolhido depois de um alarme, antes de retomar a rotina. */
  hideSeconds: [18, 32] as [number, number],
  cowerSeconds: [5, 9] as [number, number],
  startleSeconds: 2.2,
  /** Intervalo (s) entre trocas de destino no 'wander'. */
  wanderEvery: [18, 40] as [number, number],
  /** Intervalo (s) de reavaliação da rotina. */
  scheduleCheck: 2.5,
  /** Distância (m) de interação [E]. */
  talkRange: 2.8,
  /** Raio (m) a partir do qual o NPC fica em simulação barata (sem animação por quadro). */
  activeRadius: 75,
  /** Além disto os NPCs em segundo plano ficam invisíveis. */
  visibleRadius: 140,
  /** Guardas: alcance de ataque, dano e intervalo. */
  guardAttack: { range: 2.1, damage: 14, interval: 1.5, engageRadius: 28 },
  /** Vida dos NPCs (imortais: caem nocauteados e se levantam). */
  health: 120,
  guardHealth: 260,
  knockoutSeconds: 14,
  /** Atitude (−5..5): ganho por ajudar, perda por magia em público/ataque. */
  attitudeMagic: -1,
  attitudeAttack: -3,
  /** Advertências de magia antes de Bran cobrar uma multa. */
  magicWarnings: 3,
  magicFine: 25,
  /** Horas de jogo para a guarda esquecer um ataque a civis (fora da vila). */
  hostileForgetHours: 2,
};

const C = {
  skinLight: 0xe8c4a0,
  skinFair: 0xf0d2b6,
  skinTan: 0xc99668,
  skinBrown: 0x9a6a46,
  skinDark: 0x6e4a32,
  hairBlack: 0x1c1712,
  hairBrown: 0x4a3020,
  hairAuburn: 0x7a3a1c,
  hairBlond: 0xc8a050,
  hairGray: 0x9a9690,
  hairWhite: 0xdedad2,
  hairRed: 0x9a3418,
};

// Rotina comum (casa → trabalho → almoço → trabalho → lazer → casa)
function routine(home: string, work: ScheduleEntry, opts: { lunch?: string; evening?: ScheduleEntry; wake?: number; sleep?: number; morning?: ScheduleEntry } = {}): ScheduleEntry[] {
  const wake = opts.wake ?? 6;
  const sleep = opts.sleep ?? 21;
  const s: ScheduleEntry[] = [{ from: sleep, to: wake, act: 'sleep', at: home }];
  s.push(opts.morning ?? { from: wake, to: 8, act: 'wander', tag: 'praca' });
  s.push({ ...work, from: 8, to: 12 });
  s.push({ from: 12, to: 13, act: 'drink', at: opts.lunch ?? 'taverna_mesa_1_assento_a' });
  s.push({ ...work, from: 13, to: 18 });
  s.push(opts.evening ?? { from: 18, to: sleep, act: 'wander', tag: 'praca' });
  return s;
}

export const NPCS: NpcDef[] = [
  // ------------------------------------------------------------------ nomeados
  {
    id: 'maren',
    name: 'Maren',
    title: 'Anciã de Brumafria',
    role: 'elder',
    faction: 'villager',
    home: 'casa_ancia_porta',
    personality: 'Sábia e desconfiada da magia. Fala devagar, observa muito e protege a vila acima de tudo.',
    goal: 'Descobrir de onde vem a corrupção e impedir que os Corvos tragam a desgraça para Brumafria.',
    story: true,
    walk: 1.0,
    look: { sex: 'f', height: 0.94, build: 0.9, skin: C.skinFair, hair: C.hairWhite, hairStyle: 'bun', shirt: 0x5b6b4a, pants: 0x3a3a30, robe: 0x4a5a3c, cloak: 0x6a4a6a, tool: 'cane', boots: 0x3a2a1c, stoop: true },
    schedule: [
      { from: 21, to: 6, act: 'sleep', at: 'casa_ancia_porta' },
      { from: 6, to: 8, act: 'harvest', at: 'casa_ancia_jardim' },
      { from: 8, to: 11, act: 'sit', at: 'casa_ancia_varanda' },
      { from: 11, to: 13, act: 'chat', at: 'praca_banco_2' },
      { from: 13, to: 16, act: 'harvest', at: 'casa_ancia_jardim' },
      { from: 16, to: 19, act: 'sit', at: 'casa_ancia_varanda' },
      { from: 19, to: 21, act: 'sit', at: 'taverna_lareira' },
    ],
    lines: {
      hello: ['O vento mudou desde que você chegou, mago.', 'Sente-se um pouco. Velhos falam melhor sentados.'],
      about: 'Brumafria sobreviveu a invernos, pestes e a reis. Vai sobreviver a você também, espero.',
    },
  },
  {
    id: 'bran',
    name: 'Bran Holt',
    title: 'Capitão da Guarda',
    role: 'guard',
    faction: 'guard',
    home: 'casa_11_porta',
    personality: 'Pragmático e ríspido, leal até o osso. Respeita resultados, não títulos.',
    goal: 'Manter a vila de pé com poucos homens e muita teimosia.',
    story: true,
    look: { sex: 'm', height: 1.05, build: 1.18, skin: C.skinTan, hair: C.hairBrown, hairStyle: 'short', beard: 'short', shirt: 0x6a2a24, pants: 0x3a3028, armor: true, cloak: 0x7a2420, tool: 'spear', boots: 0x2a2018, belt: 0x4a3420 },
    schedule: [
      { from: 22, to: 5, act: 'sleep', at: 'casa_11_porta' },
      { from: 5, to: 7, act: 'guard', at: 'guarita_sul_posto' },
      { from: 7, to: 12, act: 'guard', at: 'portao_sul_dentro' },
      { from: 12, to: 13, act: 'drink', at: 'taverna_balcao_cliente' },
      { from: 13, to: 18, act: 'patrol', route: 'guardas_ruas_brumafria' },
      { from: 18, to: 22, act: 'guard', at: 'portao_sul_dentro' },
    ],
    overrides: [
      // primeira chegada de Kaelen: Bran espera do lado de fora do portão sul
      { when: [{ questStage: 'q_estranho', stage: 'portao' }], schedule: [{ from: 0, to: 24, act: 'guard', at: 'portao_sul_fora' }] },
    ],
    lines: {
      hello: ['Olhos abertos, mago. Os meus estão.', 'Se veio reclamar, a fila é na taverna.'],
      about: 'Tenho seis homens, uma muralha velha e uma vila que acha que o perigo é lenda. Faça as contas.',
    },
  },
  {
    id: 'doran',
    name: 'Doran Forjafria',
    title: 'Ferreiro',
    role: 'smith',
    faction: 'villager',
    home: 'casa_10_porta',
    shop: 'forja_doran',
    personality: 'Jovial e barulhento, orgulhoso do ofício e do martelo da família.',
    goal: 'Recuperar o martelo ancestral dos Forjafria, perdido num laboratório antigo.',
    story: true,
    look: { sex: 'm', height: 1.0, build: 1.25, skin: C.skinLight, hair: C.hairRed, hairStyle: 'bald', beard: 'long', shirt: 0x8a6a4a, pants: 0x4a3a2a, apron: 0x5a3a22, tool: 'hammer', boots: 0x2a1c12, belt: 0x3a2a1a },
    schedule: [
      { from: 21, to: 5, act: 'sleep', at: 'casa_10_porta' },
      { from: 5, to: 6, act: 'idle', at: 'casa_10_quintal' },
      { from: 6, to: 12, act: 'hammer', at: 'forja_bigorna' },
      { from: 12, to: 13, act: 'drink', at: 'taverna_mesa_2_assento_a' },
      { from: 13, to: 15, act: 'work', at: 'forja_fornalha' },
      { from: 15, to: 18, act: 'hammer', at: 'forja_bigorna' },
      { from: 18, to: 21, act: 'drink', at: 'taverna_balcao_cliente' },
    ],
    lines: {
      hello: ['Ha! O mago das runas! Veio ver aço de verdade?', 'Cuidado com as fagulhas, elas não respeitam magia.'],
      about: 'Meu avô forjou a dobradiça do portão sul. Ainda range, mas não cede. Isso é Forjafria.',
      worry: 'Sem o martelo do meu avô, minhas peças saem... honestas. Só honestas.',
    },
  },
  {
    id: 'hilda',
    name: 'Hilda',
    title: 'Taverneira do Javali Rúnico',
    role: 'innkeeper',
    faction: 'villager',
    home: 'taverna_entrada',
    shelter: 'taverna_balcao',
    shop: 'taverna_hilda',
    personality: 'Fofoqueira e calorosa. Sabe de tudo antes de todo mundo e serve sopa a quem precisar.',
    goal: 'Manter a taverna cheia e a vila bem informada (e bem alimentada).',
    story: true,
    look: { sex: 'f', height: 0.97, build: 1.12, skin: C.skinFair, hair: C.hairAuburn, hairStyle: 'bun', shirt: 0xd8c8a8, pants: 0x5a3a2a, robe: 0x7a4a2a, apron: 0xe8e0d0, tool: 'mug', boots: 0x3a2a1c },
    schedule: [
      { from: 0, to: 6, act: 'sleep', at: 'taverna_entrada' },
      { from: 6, to: 8, act: 'sweep', at: 'taverna_porta' },
      { from: 8, to: 24, act: 'sell', at: 'taverna_balcao' },
    ],
    lines: {
      hello: ['Entra, entra! A sopa de hoje tem até carne.', 'Você é o assunto da vila, sabia? Senta que eu conto.'],
      about: 'O Javali Rúnico tem esse nome por causa da placa antiga que meu pai achou nas ruínas. Ninguém sabe ler, mas brilha bonito.',
      worry: 'As ervas-lúmen acabaram. Sem elas, nada de poção decente.',
    },
  },
  {
    id: 'teodoro',
    name: 'Teodoro Lumen',
    title: 'Arquivista',
    role: 'scholar',
    faction: 'villager',
    home: 'casa_13_porta',
    shelter: 'arquivo_mesa',
    personality: 'Curioso, nervoso e obcecado pela era antiga. Fala rápido quando o assunto é Aeternum.',
    goal: 'Decifrar as inscrições de Elyra e provar que a Arcanotecnia não era só lenda.',
    story: true,
    look: { sex: 'm', height: 1.02, build: 0.86, skin: C.skinFair, hair: C.hairBrown, hairStyle: 'curly', shirt: 0x6a5a40, pants: 0x3a3428, robe: 0x5a4a6a, tool: 'book', boots: 0x2a2018, glasses: true },
    schedule: [
      { from: 22, to: 6, act: 'sleep', at: 'casa_13_porta' },
      { from: 6, to: 8, act: 'read', at: 'arquivo_leitura' },
      { from: 8, to: 13, act: 'read', at: 'arquivo_mesa' },
      { from: 13, to: 14, act: 'wander', tag: 'mercado' },
      { from: 14, to: 20, act: 'read', at: 'arquivo_mesa' },
      { from: 20, to: 22, act: 'idle', at: 'torre_cristal_porta' },
    ],
    lines: {
      hello: ['Ah! Você! Quer dizer... bom dia. Você leu alguma coisa nova?', 'Cuidado com essa pilha, é do século... bem, é velha.'],
      about: 'O arquivo tem mais goteiras que livros. Mesmo assim, é o maior do vale.',
      worry: 'As ilhas lá em cima têm escrita de Elyra. Eu daria um olho para ver de perto. Bem, metade de um.',
    },
  },
  {
    id: 'ilsa',
    name: 'Ilsa Vento-Bravo',
    title: 'Caçadora',
    role: 'hunter',
    faction: 'villager',
    home: 'casa_9_porta',
    personality: 'Direta e calada. Respeita a floresta como se fosse gente, e odeia caçadores furtivos.',
    goal: 'Proteger o Cervo de Luz e os bichos da Floresta de Lúmen.',
    story: true,
    look: { sex: 'f', height: 1.0, build: 0.95, skin: C.skinTan, hair: C.hairBlond, hairStyle: 'braid', shirt: 0x6a5034, pants: 0x3a4a2a, cloak: 0x3a5a32, hat: 'hood', hatColor: 0x3a5a32, tool: 'bow', boots: 0x3a2a1c, belt: 0x4a3420 },
    schedule: [
      { from: 22, to: 5, act: 'sleep', at: 'casa_9_porta' },
      { from: 5, to: 8, act: 'work', at: 'casa_9_quintal' },
      { from: 8, to: 12, act: 'guard', at: 'portao_leste_fora' },
      { from: 12, to: 14, act: 'drink', at: 'taverna_mesa_3_assento_b' },
      { from: 14, to: 19, act: 'guard', at: 'portao_leste_fora' },
      { from: 19, to: 22, act: 'sit', at: 'taverna_lareira' },
    ],
    lines: {
      hello: ['Hm.', 'Pisa leve. Tem coisa que ouve longe.'],
      about: 'A floresta dá o que você precisa, se você não pegar o que não precisa.',
      worry: 'Tem gente de fora caçando à noite. Atrás do Cervo de Luz.',
    },
  },
  {
    id: 'sabine',
    name: 'Sabine',
    title: 'Mercadora',
    role: 'merchant',
    faction: 'villager',
    home: 'taverna_entrada',
    shelter: 'taverna_balcao_cliente',
    shop: 'loja_sabine',
    personality: 'Gananciosa mas justa. Conta moedas com os olhos e nunca quebra um acordo.',
    goal: 'Juntar ouro suficiente para abrir uma casa de comércio em Ferroluz.',
    story: true,
    look: { sex: 'f', height: 1.01, build: 0.92, skin: C.skinBrown, hair: C.hairBlack, hairStyle: 'long', shirt: 0x6a2a6a, pants: 0x2a2030, robe: 0x5a1a5a, cloak: 0x8a6a2a, hat: 'wide', hatColor: 0x3a1a3a, boots: 0x1a1412, belt: 0xc8a040 },
    schedule: [
      { from: 23, to: 6, act: 'sleep', at: 'taverna_entrada' },
      { from: 6, to: 8, act: 'drink', at: 'taverna_mesa_1_assento_b' },
      { from: 8, to: 19, act: 'sell', at: 'barraca_2_vendedor' },
      { from: 19, to: 23, act: 'drink', at: 'taverna_balcao_cliente' },
    ],
    lines: {
      hello: ['Tecidos de Ferroluz, poções, quinquilharias. Tudo com preço justo. Justo para mim.', 'Um cliente que voa! Imagine os fretes que eu economizaria.'],
      about: 'Brumafria é pequena, mas paga em dia. Em Ferroluz até o ar tem imposto.',
    },
  },
  {
    id: 'calen',
    name: 'Irmão Calen',
    title: 'Sacerdote da Aurora',
    role: 'priest',
    faction: 'villager',
    home: 'santuario_vila_altar',
    shelter: 'santuario_vila_altar',
    personality: 'Teme a magia e a chama de soberba. Reage mal a feitiços em público, mas cuida dos doentes sem perguntar nada.',
    goal: 'Manter a fé da vila acesa enquanto a escuridão cresce.',
    story: true,
    look: { sex: 'm', height: 0.99, build: 1.0, skin: C.skinLight, hair: C.hairGray, hairStyle: 'tonsure', shirt: 0xe8e0d0, pants: 0xd8d0c0, robe: 0xe8e2d4, cloak: 0xc8a040, tool: 'book', boots: 0x5a4a3a },
    schedule: [
      { from: 22, to: 5, act: 'sleep', at: 'santuario_vila_altar' },
      { from: 5, to: 7, act: 'pray', at: 'santuario_vila_altar' },
      { from: 7, to: 9, act: 'sweep', at: 'santuario_vila_oracao' },
      { from: 9, to: 12, act: 'pray', at: 'santuario_vila_altar' },
      { from: 12, to: 13, act: 'wander', tag: 'praca' },
      { from: 13, to: 18, act: 'read', at: 'santuario_vila_oracao' },
      { from: 18, to: 20, act: 'chat', at: 'praca_centro' },
      { from: 20, to: 22, act: 'pray', at: 'santuario_vila_altar' },
    ],
    lines: {
      hello: ['Que a Aurora ilumine o seu caminho. E que ele passe longe daqui.', 'Guarde as suas luzes, mago. Esta é uma casa de oração.'],
      about: 'A Aurora pede humildade. A magia de Aeternum pediu tudo, e levou.',
    },
  },

  // ------------------------------------------------------------------ moradores
  {
    id: 'tomas',
    name: 'Tomás',
    title: 'Moleiro',
    role: 'villager',
    faction: 'villager',
    home: 'casa_1_porta',
    personality: 'Bonachão, reclama do preço do trigo com a mesma paixão com que come.',
    goal: 'Consertar a roda do moinho antes da colheita.',
    look: { sex: 'm', height: 0.98, build: 1.22, skin: C.skinLight, hair: C.hairBrown, hairStyle: 'short', beard: 'mustache', shirt: 0xd8d0b8, pants: 0x5a4a3a, apron: 0xe0dccc, hat: 'cap', hatColor: 0xd8d0b8, boots: 0x3a2a1c },
    schedule: routine('casa_1_porta', { from: 8, to: 12, act: 'work', at: 'casa_1_quintal' }, { lunch: 'taverna_mesa_2_assento_b', evening: { from: 18, to: 21, act: 'drink', at: 'taverna_mesa_4_assento_a' } }),
    lines: { hello: ['Farinha fresca! Ou quase.', 'Bom dia! Se bem que dia bom é dia de chuva fina, para o trigo.'], about: 'A roda do moinho range feito porta de cripta. Sem ofensa.' },
  },
  {
    id: 'berta',
    name: 'Berta',
    title: 'Tecelã',
    role: 'villager',
    faction: 'villager',
    home: 'casa_2_porta',
    personality: 'Séria e meticulosa; conta os fios como quem reza.',
    goal: 'Terminar a tapeçaria da colheita para o santuário.',
    look: { sex: 'f', height: 0.96, build: 0.95, skin: C.skinFair, hair: C.hairGray, hairStyle: 'bun', shirt: 0x8a5a6a, pants: 0x4a3a3a, robe: 0x7a4a5a, hat: 'scarf', hatColor: 0xa86a5a, boots: 0x3a2a1c },
    schedule: routine('casa_2_porta', { from: 8, to: 12, act: 'work', at: 'casa_2_quintal' }, { lunch: 'taverna_mesa_3_assento_a' }),
    lines: { hello: ['Não pise na lã, por favor.', 'Bom dia. Ou o que sobrou dele.'], about: 'Cada fio tem um lugar. Se todo mundo soubesse o seu, a vila seria mais calma.' },
  },
  {
    id: 'otto',
    name: 'Otto',
    title: 'Curtidor',
    role: 'villager',
    faction: 'villager',
    home: 'casa_3_porta',
    personality: 'Resmungão de bom coração; cheira a couro e não se importa.',
    goal: 'Conseguir couro de lobo sombrio para botas que aguentem o pântano.',
    look: { sex: 'm', height: 1.0, build: 1.08, skin: C.skinBrown, hair: C.hairBlack, hairStyle: 'short', beard: 'short', shirt: 0x7a6a4a, pants: 0x4a3a2a, apron: 0x6a4a2a, boots: 0x2a1c12 },
    schedule: routine('casa_3_porta', { from: 8, to: 12, act: 'work', at: 'casa_3_quintal' }, { lunch: 'taverna_mesa_4_assento_b', evening: { from: 18, to: 21, act: 'drink', at: 'taverna_mesa_4_assento_b' } }),
    lines: { hello: ['Se veio vender couro de lobo, entra. Se veio reclamar do cheiro, sai.', 'Hm. Mago. Botas não precisam de magia, precisam de couro.'], about: 'Couro bom vem de bicho que viveu bem. Os lobos sombrios de agora... viveram mal.' },
  },
  {
    id: 'lia',
    name: 'Lia',
    title: 'Lavradora',
    role: 'villager',
    faction: 'villager',
    home: 'casa_4_porta',
    personality: 'Animada e prática; trabalha cantando e fala com as plantas.',
    goal: 'Salvar a plantação de trigo das manchas roxas que apareceram.',
    look: { sex: 'f', height: 0.97, build: 1.0, skin: C.skinTan, hair: C.hairBrown, hairStyle: 'braid', shirt: 0xa8885a, pants: 0x5a4a2a, robe: 0x7a6a3a, hat: 'straw', hatColor: 0xd8b860, tool: 'basket', boots: 0x4a3420 },
    schedule: routine('casa_4_porta', { from: 8, to: 12, act: 'harvest', at: 'plantacao_trigo' }, { wake: 5, morning: { from: 5, to: 8, act: 'harvest', at: 'plantacao_repolho' } }),
    lines: { hello: ['Bom dia! O trigo cresceu um palmo desde ontem. Ou eu encolhi.', 'Olha onde pisa, tem broto novo aí.'], about: 'Apareceram manchas roxas nas folhas, perto do pântano. Não gosto nada disso.' },
  },
  {
    id: 'jorge',
    name: 'Jorge',
    title: 'Lavrador',
    role: 'villager',
    faction: 'villager',
    home: 'casa_4_porta',
    personality: 'Calado e forte; acredita em trabalho e em pouca conversa.',
    goal: 'Colher as abóboras antes das geadas.',
    look: { sex: 'm', height: 1.04, build: 1.15, skin: C.skinTan, hair: C.hairBlond, hairStyle: 'short', beard: 'short', shirt: 0x6a7a4a, pants: 0x4a3a2a, hat: 'straw', hatColor: 0xc8a850, tool: 'sickle', boots: 0x3a2a1c },
    schedule: routine('casa_4_porta', { from: 8, to: 12, act: 'harvest', at: 'plantacao_abobora' }, { wake: 5, morning: { from: 5, to: 8, act: 'harvest', at: 'plantacao_vinha' } }),
    lines: { hello: ['Dia.', 'Hm. Bom ver alguém que não reclama do sol.'], about: 'Terra não mente. Gente mente. Por isso eu falo pouco.' },
  },
  {
    id: 'gaspar',
    name: 'Gaspar',
    title: 'Carpinteiro',
    role: 'villager',
    faction: 'villager',
    home: 'casa_5_porta',
    personality: 'Perfeccionista e falador; mede três vezes e reclama quatro.',
    goal: 'Reforçar as portas da vila contra o que vem do pântano.',
    look: { sex: 'm', height: 1.0, build: 1.05, skin: C.skinLight, hair: C.hairAuburn, hairStyle: 'curly', beard: 'long', shirt: 0x8a6a3a, pants: 0x4a4a3a, apron: 0x7a5a3a, tool: 'hammer', boots: 0x3a2a1c, belt: 0x4a3420 },
    schedule: routine('casa_5_porta', { from: 8, to: 12, act: 'hammer', at: 'casa_5_quintal' }, { lunch: 'taverna_mesa_2_assento_a' }),
    lines: { hello: ['Esse prego aqui? Torto. Como tudo hoje em dia.', 'Ô, mago! Sabe fazer madeira crescer reta?'], about: 'Ando reforçando as trancas das casas. Ninguém pediu, mas ninguém reclama.' },
  },
  {
    id: 'agnes',
    name: 'Agnes',
    title: 'Parteira e herbalista',
    role: 'villager',
    faction: 'villager',
    home: 'casa_6_porta',
    personality: 'Firme e maternal; trouxe metade da vila ao mundo e lembra disso a todos.',
    goal: 'Achar um remédio para a tosse roxa que pegou dois lavradores.',
    look: { sex: 'f', height: 0.93, build: 1.05, skin: C.skinBrown, hair: C.hairGray, hairStyle: 'bun', shirt: 0x5a6a5a, pants: 0x3a3a30, robe: 0x4a5a4a, apron: 0xd8d0b8, hat: 'scarf', hatColor: 0x6a8a6a, tool: 'basket', boots: 0x3a2a1c },
    schedule: routine('casa_6_porta', { from: 8, to: 12, act: 'sell', at: 'barraca_3_vendedor' }, { lunch: 'taverna_mesa_3_assento_b' }),
    lines: { hello: ['Você está pálido. Bom, pálido para quem dormiu numa cripta.', 'Chá de lúmen cura quase tudo. O resto, tempo.'], about: 'Dois lavradores tossem roxo desde a última lua. Isso não é doença daqui.' },
  },
  {
    id: 'pedro',
    name: 'Pedro',
    title: 'Pastor',
    role: 'villager',
    faction: 'villager',
    home: 'casa_7_porta',
    personality: 'Rapaz sonhador; quer ver o mundo além do vale e conta as ovelhas para dormir.',
    goal: 'Encontrar a ovelha preta que fugiu para o lado do lago.',
    look: { sex: 'm', height: 0.88, build: 0.85, skin: C.skinFair, hair: C.hairBlond, hairStyle: 'curly', shirt: 0x5a7a9a, pants: 0x4a3a2a, hat: 'cap', hatColor: 0x6a4a2a, tool: 'cane', boots: 0x4a3420 },
    schedule: routine('casa_7_porta', { from: 8, to: 12, act: 'idle', at: 'cercado_ovelhas_porteira' }, { wake: 5, morning: { from: 5, to: 8, act: 'idle', at: 'cercado_ovelhas_porteira' }, lunch: 'praca_banco_3' }),
    lines: { hello: ['Você voa mesmo? Tipo um pássaro? Tipo... de verdade?', 'Viu uma ovelha preta por aí? Atende por Carvão.'], about: 'Um dia eu vou até Ferroluz. Dizem que lá as casas têm luz sem fogo.' },
  },
  {
    id: 'mirela',
    name: 'Mirela',
    title: 'Padeira',
    role: 'villager',
    faction: 'villager',
    home: 'casa_8_porta',
    personality: 'Acorda antes do galo e espera o mesmo de todos.',
    goal: 'Fazer pão suficiente para a vila mesmo com o trigo manchado.',
    look: { sex: 'f', height: 0.95, build: 1.1, skin: C.skinLight, hair: C.hairBlack, hairStyle: 'bun', shirt: 0xd8c0a0, pants: 0x5a4a3a, robe: 0xa87a5a, apron: 0xf0ece0, boots: 0x3a2a1c },
    schedule: routine('casa_8_porta', { from: 8, to: 12, act: 'sell', at: 'barraca_5_vendedor' }, { wake: 4, morning: { from: 4, to: 8, act: 'work', at: 'casa_8_quintal' } }),
    lines: { hello: ['Pão quente! Quem chega tarde come o de ontem.', 'Mago come? Claro que come. Toma, prova.'], about: 'O trigo está saindo com um gosto de ferro. Eu disfarço com mel, mas não para sempre.' },
  },
  {
    id: 'ernesto',
    name: 'Vovô Ernesto',
    title: 'Contador de histórias',
    role: 'elder',
    faction: 'villager',
    home: 'casa_6_porta',
    walk: 0.85,
    personality: 'Velho brincalhão que jura ter visto um dragão "do tamanho de três celeiros".',
    goal: 'Contar a história do dragão a alguém que acredite.',
    look: { sex: 'm', height: 0.92, build: 0.92, skin: C.skinFair, hair: C.hairWhite, hairStyle: 'bald', beard: 'long', shirt: 0x7a6a5a, pants: 0x4a4038, cloak: 0x5a4a3a, tool: 'cane', boots: 0x3a2a1c, stoop: true },
    schedule: [
      { from: 20, to: 7, act: 'sleep', at: 'casa_6_porta' },
      { from: 7, to: 12, act: 'sit', at: 'praca_banco_1' },
      { from: 12, to: 14, act: 'drink', at: 'taverna_lareira' },
      { from: 14, to: 18, act: 'sit', at: 'praca_banco_4' },
      { from: 18, to: 20, act: 'chat', at: 'praca_centro' },
    ],
    lines: { hello: ['Já te contei do dragão? Do tamanho de três celeiros!', 'Senta aí, rapaz. Rapaz de quatro mil anos, hein? Ha!'], about: 'No meu tempo, magia era coisa de conto. Agora tem mago na praça. Prefiro os contos.' },
  },
  {
    id: 'clara',
    name: 'Clara',
    title: 'Costureira',
    role: 'villager',
    faction: 'villager',
    home: 'casa_12_porta',
    personality: 'Vaidosa e observadora; repara em cada rasgo da sua roupa.',
    goal: 'Costurar um vestido digno para o casamento da filha do moleiro.',
    look: { sex: 'f', height: 0.99, build: 0.9, skin: C.skinFair, hair: C.hairAuburn, hairStyle: 'long', shirt: 0x9a4a5a, pants: 0x3a2a3a, robe: 0x8a3a4a, boots: 0x2a1c18, belt: 0xa88a5a },
    schedule: routine('casa_12_porta', { from: 8, to: 12, act: 'work', at: 'casa_12_quintal' }, { lunch: 'taverna_mesa_1_assento_b', evening: { from: 18, to: 21, act: 'chat', at: 'praca_banco_2' } }),
    lines: { hello: ['Esse manto já viu dias melhores. Uns mil anos melhores.', 'Se quiser um remendo, cobro barato. Para heróis.'], about: 'Tecido de Ferroluz é bonito, mas desfia. O daqui dura uma vida.' },
  },
  {
    id: 'anselmo',
    name: 'Anselmo',
    title: 'Apicultor',
    role: 'villager',
    faction: 'villager',
    home: 'casa_14_porta',
    personality: 'Tranquilo e místico; diz que as abelhas avisam quando algo ruim vem.',
    goal: 'Entender por que as abelhas pararam de voar para o norte.',
    look: { sex: 'm', height: 1.0, build: 0.95, skin: C.skinTan, hair: C.hairGray, hairStyle: 'short', beard: 'short', shirt: 0xc8b070, pants: 0x5a5040, hat: 'wide', hatColor: 0xe8e0c8, boots: 0x4a3420 },
    schedule: routine('casa_14_porta', { from: 8, to: 12, act: 'work', at: 'casa_14_quintal' }, { morning: { from: 6, to: 8, act: 'harvest', at: 'plantacao_vinha_borda' } }),
    lines: { hello: ['Fale baixo. As abelhas estão de mau humor.', 'Mel? Tenho. Respostas? Menos.'], about: 'As abelhas não voam mais para o norte. Abelha sabe das coisas.' },
  },
  {
    id: 'nina',
    name: 'Nina',
    title: 'Filha dos lavradores',
    role: 'child',
    faction: 'villager',
    home: 'casa_4_porta',
    walk: 1.6,
    personality: 'Curiosa e sem medo nenhum; persegue galinhas e perguntas.',
    goal: 'Ver o mago fazer uma mágica (de perto!).',
    look: { sex: 'f', height: 0.68, build: 0.9, skin: C.skinTan, hair: C.hairBrown, hairStyle: 'braid', shirt: 0xd88a5a, pants: 0x5a4a3a, robe: 0xc87a4a, boots: 0x4a3420 },
    schedule: [
      { from: 20, to: 7, act: 'sleep', at: 'casa_4_porta' },
      { from: 7, to: 11, act: 'play', tag: 'praca' },
      { from: 11, to: 13, act: 'play', tag: 'lazer' },
      { from: 13, to: 17, act: 'play', tag: 'praca' },
      { from: 17, to: 20, act: 'idle', at: 'casa_4_quintal' },
    ],
    lines: { hello: ['Faz uma mágica! Faz! Uma pequenininha!', 'Você é velho mesmo? Mais velho que o Vovô Ernesto?'], about: 'Eu vou ser caçadora igual a Ilsa. Ou maga. Ou as duas.' },
  },
  {
    id: 'fabricio',
    name: 'Fabrício',
    title: 'Bardo itinerante',
    role: 'bard',
    faction: 'villager',
    home: 'taverna_entrada',
    shelter: 'taverna_bardo',
    personality: 'Exagerado e romântico; transforma qualquer fofoca em balada.',
    goal: 'Compor a canção do "Mago Que Caiu do Céu" e ficar famoso.',
    look: { sex: 'm', height: 1.0, build: 0.9, skin: C.skinBrown, hair: C.hairBlack, hairStyle: 'long', beard: 'mustache', shirt: 0x2a6a7a, pants: 0x5a2a3a, cloak: 0x9a3a2a, hat: 'feather', hatColor: 0x2a4a6a, tool: 'lute', boots: 0x2a1c18 },
    schedule: [
      { from: 2, to: 9, act: 'sleep', at: 'taverna_entrada' },
      { from: 9, to: 12, act: 'play', at: 'praca_banco_3' },
      { from: 12, to: 15, act: 'drink', at: 'taverna_mesa_4_assento_a' },
      { from: 15, to: 18, act: 'wander', tag: 'mercado' },
      { from: 18, to: 2, act: 'play', at: 'taverna_bardo' },
    ],
    lines: { hello: ['Ó tu, que dormiste mil anos! Rima com... nada rima com isso.', 'Uma moeda pela canção? Duas e eu ponho seu nome no refrão.'], about: 'Canto em Ferroluz, canto em Brumafria. Em Ferroluz pagam melhor, aqui aplaudem mais.' },
  },

  // ------------------------------------------------------------------ guardas
  {
    id: 'alaric',
    name: 'Alaric',
    title: 'Guarda de Brumafria',
    role: 'guard',
    faction: 'guard',
    home: 'casa_11_porta',
    personality: 'Veterano cansado; segue ordens e conta os dias para se aposentar.',
    goal: 'Chegar vivo ao fim do inverno.',
    look: { sex: 'm', height: 1.02, build: 1.1, skin: C.skinLight, hair: C.hairGray, hairStyle: 'short', beard: 'mustache', shirt: 0x6a2a24, pants: 0x3a3028, armor: true, hat: 'helmet', hatColor: 0x8a8a8a, tool: 'spear', boots: 0x2a2018 },
    schedule: [
      { from: 22, to: 6, act: 'sleep', at: 'casa_11_porta' },
      { from: 6, to: 18, act: 'guard', at: 'guarita_leste_posto' },
      { from: 18, to: 22, act: 'drink', at: 'taverna_mesa_2_assento_b' },
    ],
    lines: { hello: ['Circulando.', 'Mais um dia, mais um dia.'], about: 'Vinte anos de guarda. Nunca vi o que vejo agora.' },
  },
  {
    id: 'wen',
    name: 'Wen',
    title: 'Guarda de Brumafria',
    role: 'guard',
    faction: 'guard',
    home: 'casa_11_porta',
    personality: 'Jovem e ansiosa para provar valor; leva o regulamento ao pé da letra.',
    goal: 'Ser promovida a sargento antes dos vinte e cinco.',
    look: { sex: 'f', height: 1.0, build: 1.0, skin: C.skinBrown, hair: C.hairBlack, hairStyle: 'braid', shirt: 0x6a2a24, pants: 0x3a3028, armor: true, hat: 'helmet', hatColor: 0x8a8a8a, tool: 'spear', boots: 0x2a2018 },
    schedule: [
      { from: 22, to: 6, act: 'sleep', at: 'casa_11_porta' },
      { from: 6, to: 14, act: 'patrol', route: 'guardas_muralha_brumafria' },
      { from: 14, to: 22, act: 'guard', at: 'portao_leste_dentro' },
    ],
    lines: { hello: ['Alto! Ah, é você. Siga.', 'Regulamento da vila, artigo três: nada de feitiços na praça.'], about: 'O capitão diz que eu tenho futuro. Eu digo que a vila precisa de presente.' },
  },
  {
    id: 'joran',
    name: 'Joran',
    title: 'Guarda de Brumafria',
    role: 'guard',
    faction: 'guard',
    home: 'casa_11_porta',
    personality: 'Brincalhão e preguiçoso de dia, atento à noite.',
    goal: 'Ganhar a aposta do turno da noite contra Mira.',
    look: { sex: 'm', height: 1.06, build: 1.0, skin: C.skinTan, hair: C.hairBrown, hairStyle: 'short', shirt: 0x6a2a24, pants: 0x3a3028, armor: true, hat: 'helmet', hatColor: 0x8a8a8a, tool: 'spear', boots: 0x2a2018 },
    schedule: [
      { from: 6, to: 14, act: 'sleep', at: 'casa_11_porta' },
      { from: 14, to: 18, act: 'drink', at: 'taverna_mesa_3_assento_a' },
      { from: 18, to: 6, act: 'patrol', route: 'guardas_muralha_brumafria' },
    ],
    lines: { hello: ['Noite tranquila. Por enquanto.', 'Se vir algo com mais de dois olhos, grita.'], about: 'De noite a vila é outra. Os sons do pântano chegam até a muralha.' },
  },
  {
    id: 'mira',
    name: 'Mira',
    title: 'Guarda de Brumafria',
    role: 'guard',
    faction: 'guard',
    home: 'casa_11_porta',
    personality: 'Desconfiada e afiada; não gosta de magos, nem de quem gosta de magos.',
    goal: 'Descobrir quem anda abrindo o portão leste de madrugada.',
    look: { sex: 'f', height: 1.03, build: 1.05, skin: C.skinFair, hair: C.hairRed, hairStyle: 'short', shirt: 0x6a2a24, pants: 0x3a3028, armor: true, hat: 'helmet', hatColor: 0x8a8a8a, tool: 'spear', boots: 0x2a2018 },
    schedule: [
      { from: 6, to: 14, act: 'sleep', at: 'casa_11_porta' },
      { from: 14, to: 18, act: 'patrol', route: 'guardas_ruas_brumafria' },
      { from: 18, to: 6, act: 'guard', at: 'guarita_sul_posto' },
    ],
    lines: { hello: ['Estou de olho em você.', 'Mãos onde eu possa ver. As duas.'], about: 'Alguém abre o portão leste de madrugada. Ainda descubro quem.' },
  },
  // ===================================================== FERROLUZ (Ato II)
  {
    id: 'barao',
    name: 'Teodric Vael',
    title: 'Barão de Ferroluz',
    role: 'scholar',
    faction: 'villager',
    home: 'ferroluz_barao',
    personality: 'Engenheiro-nobre idealista, fala rápido e sonha alto. Confia demais numa voz que só ele ouve.',
    goal: 'Religar a Forja Celeste e "devolver a tecnologia ao povo".',
    story: true,
    look: { sex: 'm', height: 1.02, build: 0.95, skin: C.skinFair, hair: C.hairAuburn, hairStyle: 'short', beard: 'mustache', shirt: 0x2a3858, pants: 0x1e2434, cloak: 0xb87a20, belt: 0x6a4a1a, boots: 0x1a1a22, tool: 'book', glasses: true },
    schedule: [
      { from: 23, to: 6, act: 'sleep', at: 'ferroluz_barao' },
      { from: 6, to: 12, act: 'read', at: 'ferroluz_barao' },
      { from: 12, to: 14, act: 'wander', tag: 'ferroluz' },
      { from: 14, to: 20, act: 'work', at: 'ferroluz_oficina' },
      { from: 20, to: 23, act: 'read', at: 'ferroluz_barao' },
    ],
    overrides: [
      // exposto diante dos engenheiros: some de Ferroluz
      { when: [{ flag: 'barao_exposto' }], schedule: [{ from: 0, to: 24, act: 'sleep', at: 'ferroluz_barao' }] },
      // durante a primeira visita fica de pé diante da torre, esperando o "herói da era antiga"
      { when: [{ questStage: 'q_ferroluz', stage: ['portao', 'barao', 'pedido'] }], schedule: [{ from: 0, to: 24, act: 'idle', at: 'ferroluz_patio' }] },
      { when: [{ questStage: 'q_forja', stage: ['forja', 'confronto'] }], schedule: [{ from: 0, to: 24, act: 'idle', at: 'ferroluz_forja' }] },
    ],
    lines: {
      hello: ['Ah, o herói da era antiga! Venha, venha, há tanto a mostrar!', 'Engrenagem e runa, mestre Kaelen. Engrenagem e runa.'],
      about: 'Ferroluz guarda o que o Império deixou. Eu só quero que volte a funcionar, para todos.',
      worry: 'O sábio anda quieto. Quando ele fica quieto, eu durmo mal.',
    },
  },
  {
    id: 'sentinela_ferroluz',
    name: 'Mirela Ancoraço',
    title: 'Sentinela de Ferroluz',
    role: 'guard',
    faction: 'guard',
    home: 'ferroluz_guarda_portao_1',
    personality: 'Seca e eficiente. Cumpre ordens, mas não gosta das que o Barão anda dando.',
    goal: 'Manter o portão fechado até que o Barão diga o contrário.',
    story: true,
    look: { sex: 'f', height: 1.04, build: 1.08, skin: C.skinBrown, hair: C.hairBlack, hairStyle: 'braid', shirt: 0x3a4a6a, pants: 0x2a3040, armor: true, hat: 'helmet', hatColor: 0x7a8496, tool: 'spear', boots: 0x1e2028 },
    schedule: [{ from: 0, to: 24, act: 'guard', at: 'ferroluz_guarda_portao_1' }],
    lines: { hello: ['Portão de Ferroluz. Diga o que quer e seja breve.', 'Engenheiros dentro, curiosos fora.'], about: 'O Barão fechou o portão há meses. Diz que é para nossa proteção. Contra o quê, ele não diz.' },
  },
];

export const NPC_BY_ID: Record<string, NpcDef> = Object.fromEntries(NPCS.map((n) => [n.id, n]));

/** Falantes que não são NPCs (diálogos de pontos, cinemáticas). */
export const SPEAKERS: Record<string, { name: string; title?: string }> = {
  kaelen: { name: 'Kaelen' },
  narrador: { name: '' },
  ravena: { name: 'Ravena', title: 'Líder dos Corvos' },
  guardiao: { name: 'Espírito do Guardião', title: 'Núcleo de Aeternum' },
  rei: { name: 'Voz Antiga' },
  cacador: { name: 'Caçador Furtivo', title: 'Forasteiro armado' },
  quadro: { name: 'Quadro de Missões', title: 'Taverna do Javali Rúnico' },
  darian: { name: 'Darian', title: 'Cavaleiro do Eclipse' },
  morgana: { name: 'Morgana', title: 'Bruxa das Tempestades' },
  aldric: { name: 'Aldric Valmora', title: 'O Antigo Rei' },
  coracao: { name: 'Coração do Eclipse' },
  forja: { name: 'Forja Celeste', title: 'Ferroluz' },
};
