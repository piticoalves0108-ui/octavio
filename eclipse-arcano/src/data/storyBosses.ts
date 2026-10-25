/**
 * Chefes dos Atos II a IV: números, fases e ataques (motor genérico em
 * src/ai/bosses/StoryBoss.ts). Cada ataque é uma "peça" do motor com seus números.
 */
import type { DamageType } from '../combat/Health';
import type { BossDef } from './bosses';
import type { Cond } from '../rpg/dialogue/script';

export type StoryAttackKind =
  /** Golpe em cone à frente. */
  | 'slash'
  /** Pancada em círculo em volta do chefe (ou no jogador, com `atTarget`). */
  | 'slam'
  /** Onda de choque em anel que se expande (pule ou esquive). */
  | 'ring'
  /** Investida em linha reta. */
  | 'charge'
  /** Leque de projéteis no jogador. */
  | 'volley'
  /** Círculos anunciados que explodem perto do jogador (raios, cristais, tentáculos). */
  | 'rain'
  /** Feixe que varre a arena. */
  | 'beam'
  /** Invoca inimigos. */
  | 'summon'
  /** Some e reaparece noutro ponto da arena. */
  | 'blink'
  /** Rajada de vento que empurra o jogador. */
  | 'gust'
  /** Voa alto e mergulha numa linha (dragão). */
  | 'dive'
  /** Grande explosão em volta depois de um aviso longo (fuja!). */
  | 'nova';

export interface StoryAttack {
  kind: StoryAttackKind;
  /** Peso na escolha (maior = mais frequente). */
  weight: number;
  /** Fases em que o ataque existe (1..3). */
  phases: number[];
  /** Distância ideal ao jogador [mín, máx] (fora disso o peso cai muito). */
  range: [number, number];
  cooldown: number;
  windup: number;
  recovery: number;
  damage: number;
  type: DamageType;
  /** Raio (slam/rain/nova/ring máx.), alcance (slash/charge/beam), abertura do cone (slash). */
  radius?: number;
  arc?: number;
  /** Quantidade (projéteis, círculos, invocados). */
  count?: number;
  /** Velocidade (projétil, investida, onda). */
  speed?: number;
  /** Duração ativa (feixe). */
  duration?: number;
  knockback?: number;
  /** Tipo de projétil (volley) ou de inimigo (summon). */
  projectile?: string;
  enemy?: string;
  /** Cor do aviso e dos efeitos. */
  color: number;
  /** Explode no ponto do jogador (slam). */
  atTarget?: boolean;
  /** Estados aplicados. */
  statuses?: { id: 'burn' | 'shock' | 'slow' | 'stun' | 'bleed' | 'vulnerable'; duration: number; magnitude?: number }[];
  /** Fala ou aviso ao começar (legenda). */
  shout?: string;
}

export type StoryRig =
  | { kind: 'humanoid'; look: string }
  | { kind: 'dragon'; look: string }
  | { kind: 'devourer' };

/** Efeitos especiais ao entrar numa fase. */
export interface StoryPhaseEvent {
  /** Aviso na tela. */
  notify?: string;
  /** Legenda (fala do chefe). */
  shout?: string;
  /** Clima da arena. */
  weather?: 'clear' | 'cloudy' | 'rain' | 'storm' | 'fog';
  /** Escala do corpo (ex.: o Rei fundido ao Coração cresce). */
  scale?: number;
  /** Invoca inimigos ao entrar na fase. */
  summon?: { enemy: string; count: number };
  /** Eclipse: dia e noite alternam na arena (s por meia volta). */
  eclipseCycle?: number;
  /** Passa a voar (dragão/bruxa) — altura acima do chão. */
  hover?: number;
}

export interface StoryBossDef extends BossDef {
  rig: StoryRig;
  /** Cor dos olhos/brilho principal. */
  glow: number;
  /** Arena: centro (x, z), raio e altura fixa (céu) se houver. */
  arena: { x: number; z: number; radius: number; y?: number; locationId?: string };
  /** O chefe só aparece quando estas condições valem (estágio da missão). */
  when: Cond[];
  /** Voa desde o começo (altura acima do chão). */
  hover?: number;
  /** Número de fases (2 ou 3) — `phaseAt` usa as primeiras. */
  phases: 2 | 3;
  phaseEvents?: Partial<Record<2 | 3, StoryPhaseEvent>>;
  attacks: StoryAttack[];
  /** Despertar (s, invulnerável). */
  intro: number;
  transition: number;
  /** Para numa fração de vida (rendição/conversa) em vez de morrer. */
  yieldAt?: number;
  /** Fala ao começar a luta. */
  introShout?: string;
  /** Música de fundo (padrão: 'boss'). */
  faction: 'construct' | 'corrupted' | 'bandit' | 'wild';
}

// Helpers de dados
const A = (a: StoryAttack) => a;

// ===========================================================================
// ATO II
// ===========================================================================

/** Colosso de Ferro e Magia — o "teste" do Barão no pátio de Ferroluz. */
export const COLOSSO: StoryBossDef = {
  id: 'colosso_ferro',
  name: 'Colosso de Ferro',
  title: 'Colosso de Ferro e Magia',
  lore: 'Orgulho dos engenheiros de Ferroluz: um autômato de guerra religado com cristais roubados. O Barão o chama de "o futuro".',
  hp: 2800,
  armor: 8,
  resist: { physical: 0.25, fire: 0.2, lightning: -0.3, arcane: 0 },
  radius: 2.1,
  height: 6,
  scale: 1,
  walk: 2.4,
  run: 5.5,
  turn: 2.2,
  poise: 420,
  phaseAt: [0.6, 0],
  slowResist: 0.5,
  xp: 1100,
  gold: [220, 300],
  drops: [
    { itemId: 'nucleo_automato', chance: 1, qty: [2, 3] },
    { itemId: 'minerio_ferroluz', chance: 1, qty: [4, 6] },
    { itemId: 'placa_colosso', chance: 1 },
  ],
  rig: { kind: 'humanoid', look: 'colosso' },
  glow: 0xffa040,
  arena: { x: 692, z: 752, radius: 24, locationId: 'posto_ferroluz' },
  when: [{ questStage: 'q_ferroluz', stage: 'teste' }],
  phases: 2,
  phaseEvents: { 2: { notify: 'O Colosso abre as válvulas: o núcleo superaquece!', shout: 'Barão Teodric: Isso! Mostre a ele do que o futuro é feito!' } },
  attacks: [
    A({ kind: 'slash', weight: 3, phases: [1, 2], range: [0, 8], cooldown: 2.5, windup: 1.0, recovery: 0.9, damage: 24, type: 'physical', radius: 8.5, arc: 120, knockback: 8, color: 0xff8a20 }),
    A({ kind: 'ring', weight: 2, phases: [1, 2], range: [0, 14], cooldown: 7, windup: 1.2, recovery: 1.0, damage: 20, type: 'physical', radius: 24, speed: 11, knockback: 7, color: 0xff3020 }),
    A({ kind: 'charge', weight: 2, phases: [1, 2], range: [9, 26], cooldown: 8, windup: 1.0, recovery: 1.2, damage: 26, type: 'physical', radius: 26, speed: 17, knockback: 12, color: 0xff2018 }),
    A({ kind: 'volley', weight: 2, phases: [1, 2], range: [8, 40], cooldown: 6, windup: 0.9, recovery: 0.8, damage: 14, type: 'fire', count: 3, speed: 20, projectile: 'fireball', color: 0xff7a2a, shout: 'Canhões de braço: carregando!' }),
    A({ kind: 'nova', weight: 1.5, phases: [2], range: [0, 12], cooldown: 12, windup: 2.2, recovery: 1.6, damage: 34, type: 'fire', radius: 9, knockback: 10, color: 0xff4a10, statuses: [{ id: 'burn', duration: 3, magnitude: 5 }], shout: 'O núcleo do Colosso brilha demais... afaste-se!' }),
  ],
  intro: 3,
  transition: 2.4,
  introShout: 'Barão Teodric: Herói da era antiga, prove seu valor contra o orgulho de Ferroluz!',
  faction: 'construct',
};

/** Bruxa das Tempestades — Pico das Tempestades (serra norte). */
export const BRUXA: StoryBossDef = {
  id: 'bruxa_tempestades',
  name: 'Bruxa das Tempestades',
  title: 'Morgana, a Bruxa das Tempestades',
  lore: 'Uma das Sete do Conselho, enlouquecida pelos séculos acorrentada a uma tempestade que nunca termina. Guarda o Coração da Tempestade.',
  hp: 2200,
  armor: 2,
  resist: { lightning: 0.6, arcane: 0.1, fire: -0.2, physical: 0 },
  radius: 0.7,
  height: 2.1,
  scale: 1.25,
  walk: 3,
  run: 7,
  turn: 4,
  poise: 220,
  phaseAt: [0.66, 0.33],
  slowResist: 0.6,
  xp: 1300,
  gold: [180, 260],
  drops: [
    { itemId: 'fragmento_eter', chance: 1, qty: [3, 5] },
    { itemId: 'amuleto_tempestade', chance: 1 },
  ],
  rig: { kind: 'humanoid', look: 'bruxa' },
  glow: 0x9fd8ff,
  arena: { x: -640, z: -820, radius: 26, locationId: 'pico_tempestades' },
  when: [{ questStage: 'q_tempestade', stage: 'bruxa' }],
  hover: 2.5,
  phases: 3,
  phaseEvents: {
    2: { notify: 'A Bruxa chama a tempestade!', shout: 'Morgana: Aurivar! Sete vozes juraram, e só você dormiu em paz!', weather: 'storm' },
    3: { notify: 'Os ventos enlouquecem!', shout: 'Morgana: Se eu não posso descansar, ninguém descansa!', summon: { enemy: 'mago_corrompido', count: 2 }, hover: 5 },
  },
  attacks: [
    A({ kind: 'volley', weight: 3, phases: [1, 2, 3], range: [4, 40], cooldown: 3.5, windup: 0.8, recovery: 0.6, damage: 12, type: 'lightning', count: 5, speed: 24, projectile: 'lightningBolt', color: 0x9fd8ff, statuses: [{ id: 'shock', duration: 1.5, magnitude: 3 }] }),
    A({ kind: 'rain', weight: 3, phases: [1, 2, 3], range: [0, 40], cooldown: 6, windup: 1.2, recovery: 0.8, damage: 24, type: 'lightning', radius: 2.8, count: 5, color: 0x9fd8ff, statuses: [{ id: 'shock', duration: 2, magnitude: 3 }] }),
    A({ kind: 'gust', weight: 2, phases: [1, 2, 3], range: [0, 18], cooldown: 7, windup: 0.9, recovery: 0.7, damage: 6, type: 'arcane', radius: 18, arc: 70, knockback: 18, color: 0xe0f0ff, shout: 'Morgana: Voe, passarinho!' }),
    A({ kind: 'blink', weight: 1.5, phases: [1, 2, 3], range: [0, 6], cooldown: 6, windup: 0.4, recovery: 0.3, damage: 0, type: 'arcane', color: 0x9fd8ff }),
    A({ kind: 'beam', weight: 1.5, phases: [2, 3], range: [4, 30], cooldown: 11, windup: 1.2, recovery: 1.2, damage: 7, type: 'lightning', radius: 30, duration: 4, speed: 0.9, color: 0xbfe6ff }),
    A({ kind: 'nova', weight: 1, phases: [3], range: [0, 10], cooldown: 14, windup: 2, recovery: 1.4, damage: 30, type: 'lightning', radius: 8, knockback: 9, color: 0xbfe6ff }),
  ],
  intro: 3,
  transition: 2.4,
  introShout: 'Morgana: Mais um que sobe a montanha atrás do meu coração... Ah. Você. Logo você.',
  faction: 'corrupted',
};

/** Dragão de Cristal Corrompido — Picos de Cristal (oeste). */
export const DRAGAO: StoryBossDef = {
  id: 'dragao_cristal',
  name: 'Dragão de Cristal',
  title: 'Vyrmathal, o Dragão de Cristal Corrompido',
  lore: 'Guardião dos cristais primordiais desde antes do Império. A corrupção do pântano subiu até o seu ninho e envenenou suas escamas.',
  hp: 3200,
  armor: 6,
  resist: { physical: 0.15, arcane: 0.2, fire: 0.3, lightning: 0, void: -0.25 },
  radius: 2.4,
  height: 3.2,
  scale: 6,
  walk: 4,
  run: 12,
  turn: 2.6,
  poise: 380,
  phaseAt: [0.6, 0.25],
  slowResist: 0.5,
  xp: 1500,
  gold: [250, 360],
  drops: [
    { itemId: 'cristal_arcano', chance: 1, qty: [3, 5] },
    { itemId: 'escamas_cristal', chance: 1 },
  ],
  rig: { kind: 'dragon', look: 'dragao_cristal' },
  glow: 0x9ff0ff,
  arena: { x: -840, z: -210, radius: 32, locationId: 'picos_cristal' },
  when: [{ questStage: 'q_dragao', stage: 'dragao' }],
  hover: 0,
  phases: 3,
  phaseEvents: {
    2: { notify: 'O dragão levanta voo!', hover: 9 },
    3: { notify: 'Ferido, o dragão pousa e enlouquece!', hover: 0 },
  },
  attacks: [
    A({ kind: 'slash', weight: 2.5, phases: [1, 3], range: [0, 9], cooldown: 2.6, windup: 0.9, recovery: 0.8, damage: 26, type: 'physical', radius: 9, arc: 110, knockback: 9, color: 0xffa040 }),
    A({ kind: 'volley', weight: 3, phases: [1, 2, 3], range: [6, 45], cooldown: 4, windup: 0.9, recovery: 0.7, damage: 13, type: 'arcane', count: 6, speed: 26, projectile: 'crystalShard', color: 0x9ff0ff }),
    A({ kind: 'rain', weight: 2.5, phases: [1, 2, 3], range: [0, 45], cooldown: 7, windup: 1.3, recovery: 0.8, damage: 26, type: 'arcane', radius: 3, count: 6, color: 0x7fe8ff, shout: 'Cristais brotam do chão!' }),
    A({ kind: 'dive', weight: 3, phases: [2], range: [10, 60], cooldown: 6, windup: 1.2, recovery: 1.2, damage: 30, type: 'physical', radius: 40, speed: 26, knockback: 14, color: 0xff3020 }),
    A({ kind: 'beam', weight: 2, phases: [2, 3], range: [6, 32], cooldown: 10, windup: 1.3, recovery: 1.4, damage: 9, type: 'arcane', radius: 32, duration: 3.5, speed: 0.8, color: 0x9ff0ff, shout: 'O dragão inspira fundo...' }),
    A({ kind: 'ring', weight: 2, phases: [1, 3], range: [0, 16], cooldown: 8, windup: 1.1, recovery: 1.1, damage: 22, type: 'physical', radius: 26, speed: 12, knockback: 8, color: 0xff3020 }),
  ],
  intro: 3.5,
  transition: 2.8,
  introShout: 'O cristal do ninho estremece. Duas luas azuis se abrem na escuridão.',
  faction: 'wild',
};

// ===========================================================================
// ATO III
// ===========================================================================

/** Devorador de Almas — Coração do Pântano. */
export const DEVORADOR: StoryBossDef = {
  id: 'devorador_almas',
  name: 'Devorador de Almas',
  title: 'O Devorador de Almas',
  lore: 'Massa de corrupção com fome de memórias. É a ponta visível do que vaza do Coração do Eclipse.',
  hp: 3600,
  armor: 3,
  resist: { void: 0.6, arcane: 0.1, fire: -0.4, lightning: 0, physical: 0.1 },
  radius: 3.2,
  height: 5,
  scale: 1,
  walk: 0,
  run: 0,
  turn: 1.6,
  poise: 9999,
  phaseAt: [0.66, 0.33],
  slowResist: 0,
  xp: 1700,
  gold: [260, 380],
  drops: [{ itemId: 'fragmento_eter', chance: 1, qty: [4, 6] }],
  rig: { kind: 'devourer' },
  glow: 0xb040ff,
  arena: { x: -600, z: -440, radius: 30, locationId: 'coracao_pantano' },
  when: [{ questStage: 'q_pantano', stage: 'devorador' }],
  phases: 3,
  phaseEvents: {
    2: { notify: 'Corrompidos emergem do lodo!', summon: { enemy: 'espreitador', count: 3 }, weather: 'fog' },
    3: { notify: 'O Devorador se contorce: as raízes explodem!', summon: { enemy: 'mago_corrompido', count: 2 } },
  },
  attacks: [
    A({ kind: 'rain', weight: 3, phases: [1, 2, 3], range: [0, 40], cooldown: 4.5, windup: 1.2, recovery: 0.6, damage: 22, type: 'void', radius: 2.6, count: 5, color: 0xb040ff, shout: 'Tentáculos sob o lodo!' }),
    A({ kind: 'volley', weight: 2.5, phases: [1, 2, 3], range: [4, 40], cooldown: 4, windup: 0.8, recovery: 0.6, damage: 12, type: 'void', count: 5, speed: 18, projectile: 'enemyOrb', color: 0xd040ff }),
    A({ kind: 'slam', weight: 2, phases: [1, 2, 3], range: [0, 9], cooldown: 5, windup: 1.1, recovery: 0.8, damage: 28, type: 'void', radius: 7, knockback: 10, color: 0xb040ff }),
    A({ kind: 'beam', weight: 1.5, phases: [2, 3], range: [5, 30], cooldown: 11, windup: 1.3, recovery: 1, damage: 8, type: 'void', radius: 30, duration: 4.5, speed: 0.7, color: 0xd040ff }),
    A({ kind: 'nova', weight: 1.2, phases: [3], range: [0, 14], cooldown: 13, windup: 2.4, recovery: 1.4, damage: 36, type: 'void', radius: 11, knockback: 10, color: 0x9a20ff, shout: 'O Devorador incha... vai estourar!' }),
  ],
  intro: 3.5,
  transition: 2.6,
  introShout: 'Uma voz feita de muitas vozes: "Memórias... tantas... dê-nos as suas, Guardião."',
  faction: 'corrupted',
};

/** Guardião da Primeira Era — Templo Submerso. Cada fragmento de memória o enfraquece. */
export const PRIMEIRA_ERA: StoryBossDef = {
  id: 'guardiao_primeira_era',
  name: 'Guardião da Primeira Era',
  title: 'Guardião da Primeira Era',
  lore: 'Mais antigo que Aeternum. Testa quem desce ao templo com as perguntas que só o verdadeiro Guardião do Tempo saberia responder.',
  hp: 3400,
  armor: 7,
  resist: { physical: 0.2, arcane: 0.2, time: -0.3, void: 0.2 },
  radius: 2.3,
  height: 6.4,
  scale: 1,
  walk: 2.2,
  run: 5,
  turn: 2.2,
  poise: 450,
  phaseAt: [0.66, 0.33],
  slowResist: 0.4,
  xp: 1800,
  gold: [240, 340],
  drops: [{ itemId: 'cristal_arcano', chance: 1, qty: [2, 4] }],
  rig: { kind: 'humanoid', look: 'primeira_era' },
  glow: 0xffe08a,
  arena: { x: -780, z: -620, radius: 26, locationId: 'templo_submerso' },
  when: [{ questStage: 'q_templo', stage: 'guardiao' }],
  phases: 3,
  phaseEvents: {
    2: { notify: 'O Guardião pergunta: "Quem acendeu o farol de Darian?"', shout: 'Guardião: Responda com a memória, não com a magia.' },
    3: { notify: 'O Guardião pergunta: "O que você trancou dentro de si?"', shout: 'Guardião: A última pergunta é sempre a mais pesada.' },
  },
  attacks: [
    A({ kind: 'slash', weight: 3, phases: [1, 2, 3], range: [0, 8], cooldown: 2.4, windup: 1.0, recovery: 0.9, damage: 26, type: 'physical', radius: 8, arc: 130, knockback: 8, color: 0xffd060 }),
    A({ kind: 'ring', weight: 2, phases: [1, 2, 3], range: [0, 14], cooldown: 7, windup: 1.2, recovery: 1, damage: 22, type: 'time', radius: 24, speed: 10, knockback: 6, color: 0xffd060, statuses: [{ id: 'slow', duration: 2, magnitude: 0.4 }] }),
    A({ kind: 'rain', weight: 2, phases: [2, 3], range: [0, 36], cooldown: 6, windup: 1.3, recovery: 0.8, damage: 22, type: 'time', radius: 3, count: 5, color: 0xffe08a }),
    A({ kind: 'beam', weight: 1.5, phases: [2, 3], range: [5, 28], cooldown: 11, windup: 1.2, recovery: 1.2, damage: 8, type: 'time', radius: 28, duration: 5, speed: 0.85, color: 0xffe08a }),
    A({ kind: 'blink', weight: 1, phases: [3], range: [0, 5], cooldown: 7, windup: 0.5, recovery: 0.4, damage: 0, type: 'time', color: 0xffe08a }),
    A({ kind: 'charge', weight: 1.5, phases: [1, 2, 3], range: [9, 26], cooldown: 9, windup: 1, recovery: 1.2, damage: 26, type: 'physical', radius: 24, speed: 16, knockback: 12, color: 0xffa040 }),
  ],
  intro: 3.2,
  transition: 3,
  introShout: 'Guardião: Diga seu nome, viajante. Não o que você usa. O que você esqueceu.',
  faction: 'construct',
};

/** Cavaleiro do Eclipse (Darian) — Torre do Observador. Rende-se em 15% da vida. */
export const DARIAN: StoryBossDef = {
  id: 'cavaleiro_eclipse',
  name: 'Darian',
  title: 'Darian, o Cavaleiro do Eclipse',
  lore: 'O aprendiz que Kaelen deixou para trás durante a Cisão. Quatro mil anos de rancor guardados numa armadura negra.',
  hp: 2600,
  armor: 5,
  resist: { void: 0.4, arcane: 0.2, physical: 0.1 },
  radius: 0.6,
  height: 2,
  scale: 1.2,
  walk: 3.4,
  run: 8,
  turn: 6,
  poise: 260,
  phaseAt: [0.6, 0.3],
  slowResist: 0.6,
  xp: 1600,
  gold: [200, 300],
  drops: [],
  rig: { kind: 'humanoid', look: 'darian' },
  glow: 0xff6a90,
  arena: { x: 640, z: 196, radius: 24, locationId: 'torre_observador' },
  when: [{ questStage: 'q_darian', stage: 'duelo' }],
  phases: 3,
  yieldAt: 0.12,
  phaseEvents: {
    2: { notify: 'Darian invoca a lâmina do eclipse!', shout: 'Darian: Você me ensinou a acender um farol. Depois me deixou no escuro.' },
    3: { notify: 'Sombras do Eclipse cercam a arena!', shout: 'Darian: O Rei me deu o que você nunca deu: um propósito!', summon: { enemy: 'cavaleiro_encantado', count: 2 } },
  },
  attacks: [
    A({ kind: 'slash', weight: 3.5, phases: [1, 2, 3], range: [0, 4.5], cooldown: 1.2, windup: 0.55, recovery: 0.5, damage: 20, type: 'physical', radius: 4.5, arc: 140, knockback: 5, color: 0xff6a90 }),
    A({ kind: 'charge', weight: 2.5, phases: [1, 2, 3], range: [6, 22], cooldown: 5, windup: 0.7, recovery: 0.8, damage: 22, type: 'void', radius: 22, speed: 22, knockback: 9, color: 0xff3a70 }),
    A({ kind: 'volley', weight: 2, phases: [1, 2, 3], range: [6, 35], cooldown: 5, windup: 0.7, recovery: 0.6, damage: 13, type: 'void', count: 3, speed: 24, projectile: 'eclipseOrb', color: 0xff6a90 }),
    A({ kind: 'blink', weight: 2, phases: [2, 3], range: [8, 40], cooldown: 5, windup: 0.4, recovery: 0.2, damage: 0, type: 'void', color: 0xff6a90 }),
    A({ kind: 'slam', weight: 1.5, phases: [2, 3], range: [0, 6], cooldown: 7, windup: 1, recovery: 0.8, damage: 26, type: 'void', radius: 6, knockback: 9, color: 0xff3a70 }),
    A({ kind: 'rain', weight: 1.5, phases: [3], range: [0, 30], cooldown: 8, windup: 1.2, recovery: 0.6, damage: 20, type: 'void', radius: 2.6, count: 4, color: 0xff3a70 }),
  ],
  intro: 2.5,
  transition: 2.2,
  introShout: 'Darian: Mestre. Quatro mil anos... e você ainda chega atrasado.',
  faction: 'corrupted',
};

// ===========================================================================
// ATO IV
// ===========================================================================

/** Cidadela Celeste (Ato IV): ilha no céu, só voando. */
export const SKY_CITADEL = { x: 60, z: -180, y: 300, radius: 44 };

/** O Antigo Rei Aldric Valmora — três fases: o Rei, o Rei fundido ao Coração, o Eclipse. */
export const REI: StoryBossDef = {
  id: 'rei_aldric',
  name: 'Aldric Valmora',
  title: 'O Antigo Rei Aldric Valmora',
  lore: 'O rei que quis beber todo o Éter do mundo. Sobreviveu quatro mil anos dentro do Coração do Eclipse, esperando o despertar de quem o projetou.',
  hp: 6000,
  armor: 6,
  resist: { void: 0.3, arcane: 0.15, time: -0.2 },
  radius: 0.7,
  height: 2.2,
  scale: 1.35,
  walk: 3,
  run: 7,
  turn: 5,
  poise: 380,
  phaseAt: [0.66, 0.33],
  slowResist: 0.6,
  xp: 4000,
  gold: [600, 800],
  drops: [],
  rig: { kind: 'humanoid', look: 'rei' },
  glow: 0xffc860,
  arena: { x: SKY_CITADEL.x, z: SKY_CITADEL.z, radius: 34, y: SKY_CITADEL.y },
  when: [{ questStage: 'q_eclipse', stage: 'rei' }],
  phases: 3,
  phaseEvents: {
    2: { notify: 'O Rei se funde ao Coração do Eclipse!', shout: 'Aldric: Você o desenhou para unir, Kaelen. Veja como ele me une a tudo.', scale: 2.4, summon: { enemy: 'cavaleiro_encantado', count: 2 } },
    3: { notify: 'O ECLIPSE: dia e noite giram sobre a cidadela!', shout: 'Aldric: Eu SOU o eclipse. Sol e lua obedecem.', eclipseCycle: 9 },
  },
  attacks: [
    A({ kind: 'slash', weight: 3, phases: [1, 2, 3], range: [0, 5], cooldown: 1.6, windup: 0.6, recovery: 0.6, damage: 24, type: 'physical', radius: 5, arc: 140, knockback: 6, color: 0xffc860 }),
    A({ kind: 'volley', weight: 2.5, phases: [1, 2, 3], range: [5, 40], cooldown: 4, windup: 0.7, recovery: 0.6, damage: 14, type: 'void', count: 5, speed: 24, projectile: 'eclipseOrb', color: 0xff6a90 }),
    A({ kind: 'blink', weight: 1.5, phases: [1, 3], range: [0, 40], cooldown: 6, windup: 0.4, recovery: 0.3, damage: 0, type: 'void', color: 0xffc860 }),
    A({ kind: 'beam', weight: 2, phases: [1, 2, 3], range: [5, 30], cooldown: 9, windup: 1.1, recovery: 1.1, damage: 9, type: 'arcane', radius: 30, duration: 4, speed: 0.9, color: 0xffd880 }),
    A({ kind: 'ring', weight: 2, phases: [2, 3], range: [0, 16], cooldown: 7, windup: 1.2, recovery: 1, damage: 24, type: 'void', radius: 30, speed: 12, knockback: 8, color: 0xff6a90 }),
    A({ kind: 'slam', weight: 2, phases: [2], range: [0, 10], cooldown: 5, windup: 1.1, recovery: 0.9, damage: 32, type: 'void', radius: 9, knockback: 11, color: 0xff3a70 }),
    A({ kind: 'rain', weight: 2.5, phases: [2, 3], range: [0, 40], cooldown: 6, windup: 1.2, recovery: 0.7, damage: 26, type: 'void', radius: 3, count: 6, color: 0xff3a70 }),
    A({ kind: 'nova', weight: 1, phases: [3], range: [0, 14], cooldown: 15, windup: 2.4, recovery: 1.5, damage: 40, type: 'void', radius: 12, knockback: 12, color: 0xffc860, shout: 'Aldric: AJOELHE-SE!' }),
  ],
  intro: 3.5,
  transition: 3.2,
  introShout: 'Aldric: Arquimago. Você veio me entregar o mundo pessoalmente? Que gentileza.',
  faction: 'corrupted',
};

export const STORY_BOSSES: Record<string, StoryBossDef> = Object.fromEntries([COLOSSO, BRUXA, DRAGAO, DEVORADOR, PRIMEIRA_ERA, DARIAN, REI].map((b) => [b.id, b]));
export const STORY_BOSS_IDS = Object.keys(STORY_BOSSES);

/** Cada fragmento de memória tira esta fração da vida do Guardião da Primeira Era (até o limite). */
export const MEMORY_WEAKEN = { perFragment: 0.08, max: 0.4 };

/** Regras gerais das lutas da história. */
export const STORY_BOSS_RULES = {
  /** Fora da arena por mais que isto (s) → a luta reseta. */
  leashSeconds: 6,
  /** Folga do raio da arena para a trela (m). */
  leashExtra: 22,
  /** Intervalo (s) do alarme de raio do jogador ao chefe para o gatilho. */
  triggerCheck: 0.3,
};
