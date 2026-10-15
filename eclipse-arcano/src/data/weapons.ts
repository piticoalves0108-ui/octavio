/**
 * Armas: definições (dano, velocidade, alcance, raridade, preço, comportamento especial),
 * combos por tipo de arma, ataque carregado, disparo do cajado, bloqueio/parry e aprimoramento.
 * O inventário referencia `WEAPONS` (por id) e `WeaponDef`.
 * O comportamento especial de cada arma é código (combat/weaponBehaviors.ts), mas TODOS os
 * números dele ficam aqui em `behaviorParams`.
 */
import type { DamageType } from '../combat/Health';
import type { PlayerAnim } from '../player/Player';

export type WeaponType = 'sword' | 'dagger' | 'spear' | 'staff' | 'techno' | 'artifact';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface RarityInfo {
  /** Nome exibido (pt-BR). */
  name: string;
  /** Cor (0xRRGGBB) para UI e brilho do modelo. */
  color: number;
  css: string;
  /** Intensidade do brilho/runas no modelo procedural (0..1). */
  glow: number;
  order: number;
}

export const RARITIES: Record<Rarity, RarityInfo> = {
  common: { name: 'Comum', color: 0xb8b8b8, css: '#b8b8b8', glow: 0, order: 0 },
  uncommon: { name: 'Incomum', color: 0x5fd35f, css: '#5fd35f', glow: 0.25, order: 1 },
  rare: { name: 'Rara', color: 0x4a9dff, css: '#4a9dff', glow: 0.45, order: 2 },
  epic: { name: 'Épica', color: 0xb05cff, css: '#b05cff', glow: 0.65, order: 3 },
  legendary: { name: 'Lendária', color: 0xffa630, css: '#ffa630', glow: 0.85, order: 4 },
  mythic: { name: 'Mítica', color: 0xff4f7a, css: '#ff4f7a', glow: 1, order: 5 },
};

export const WEAPON_TYPE_NAMES: Record<WeaponType, string> = {
  sword: 'Espada',
  dagger: 'Adaga',
  spear: 'Lança',
  staff: 'Cajado',
  techno: 'Arma tecnomágica',
  artifact: 'Artefato',
};

/** Identificadores dos comportamentos especiais (implementados em combat/weaponBehaviors.ts). */
export type WeaponBehaviorId =
  | 'ancestral'
  | 'runic'
  | 'chainLightning'
  | 'vampiric'
  | 'temporal'
  | 'solar'
  | 'cyberRunic'
  | 'voidPierce'
  | 'dragonFire'
  | 'technoPulse'
  | 'eclipseOrb'
  | 'crystalSpear';

/** Parâmetros do modelo procedural (combat/weaponModels.ts). */
export interface WeaponModelSpec {
  /** Comprimento total (m) — lâmina/haste. */
  length: number;
  /** Largura da lâmina/cabeça (m). */
  width: number;
  /** Cor do metal/madeira principal. */
  primary: number;
  /** Cor de detalhes (guarda, anéis, garras). */
  accent: number;
  /** Cor do brilho (runas, cristal, gume energizado). */
  glow: number;
  /** Variação de forma dentro do tipo. */
  variant?: 'plain' | 'runic' | 'serrated' | 'curved' | 'broad' | 'crystal' | 'dragon' | 'void' | 'tech' | 'orb' | 'solar' | 'temporal';
}

export interface WeaponDef {
  id: string;
  name: string;
  type: WeaponType;
  rarity: Rarity;
  /** Dano base por golpe leve (ou por disparo, no cajado/artefato). */
  damage: number;
  damageType: DamageType;
  /** Multiplicador de velocidade de ataque (1 = normal). */
  speed: number;
  /** Alcance do golpe corpo a corpo (m). */
  range: number;
  /** Arco do golpe (graus). */
  arc: number;
  /** Chance de crítico somada à do personagem. */
  critBonus: number;
  /** Dano de postura por golpe leve. */
  poise: number;
  /** Qual atributo escala o dano: 'melee' (meleePower) ou 'spell' (spellPower). */
  scaling: 'melee' | 'spell';
  levelReq: number;
  /** Preço base (ouro). */
  value: number;
  description: string;
  /** Texto curto do efeito especial (para tooltip). */
  special?: string;
  behavior?: WeaponBehaviorId;
  behaviorParams?: Record<string, number>;
  model: WeaponModelSpec;
}

// =====================================================================
// Catálogo
// =====================================================================
const LIST: WeaponDef[] = [
  {
    id: 'cajado_ancestral',
    name: 'Cajado Ancestral',
    type: 'staff',
    rarity: 'rare',
    damage: 12,
    damageType: 'arcane',
    speed: 1,
    range: 2.4,
    arc: 110,
    critBonus: 0,
    poise: 8,
    scaling: 'spell',
    levelReq: 1,
    value: 0,
    description: 'O cajado de Kaelen, selado com ele por milênios. Cristal de Éter, anéis de circuito e uma paciência infinita.',
    special: 'A cada 4 disparos seguidos que acertam, o próximo se divide em três.',
    behavior: 'ancestral',
    behaviorParams: { hitsToSplit: 4, splitCount: 3, splitSpreadDeg: 9, splitDamageMul: 0.7 },
    model: { length: 1.9, width: 0.12, primary: 0x5b4030, accent: 0xb0864a, glow: 0x58d8ff, variant: 'runic' },
  },
  {
    id: 'espada_ferro',
    name: 'Espada de Ferro',
    type: 'sword',
    rarity: 'common',
    damage: 16,
    damageType: 'physical',
    speed: 1,
    range: 2.3,
    arc: 120,
    critBonus: 0,
    poise: 12,
    scaling: 'melee',
    levelReq: 1,
    value: 45,
    description: 'Forjada em Brumafria. Pesada, honesta e sem truques.',
    model: { length: 0.95, width: 0.07, primary: 0x9aa0a8, accent: 0x6b4a2c, glow: 0xffffff, variant: 'plain' },
  },
  {
    id: 'lanca_guarda',
    name: 'Lança da Guarda',
    type: 'spear',
    rarity: 'common',
    damage: 15,
    damageType: 'physical',
    speed: 0.95,
    range: 3.6,
    arc: 40,
    critBonus: 0.02,
    poise: 11,
    scaling: 'melee',
    levelReq: 1,
    value: 50,
    description: 'Lança comprida da guarda de Brumafria. Mantém o perigo a uma boa distância.',
    model: { length: 2.1, width: 0.07, primary: 0x6e5238, accent: 0x9aa0a8, glow: 0xffffff, variant: 'plain' },
  },
  {
    id: 'adaga_arcana',
    name: 'Adaga Arcana',
    type: 'dagger',
    rarity: 'uncommon',
    damage: 10,
    damageType: 'physical',
    speed: 1.45,
    range: 1.9,
    arc: 90,
    critBonus: 0.12,
    poise: 6,
    scaling: 'melee',
    levelReq: 2,
    value: 140,
    description: 'Lâmina curta com um fio de Éter no gume. Rápida como um pensamento ruim.',
    special: 'Golpes em alvos atordoados ou enraizados são sempre críticos.',
    behavior: 'runic',
    behaviorParams: { bonusVsFactionMul: 0, critOnDisabled: 1 },
    model: { length: 0.42, width: 0.05, primary: 0x8d96a8, accent: 0x3a3550, glow: 0x9f7bff, variant: 'runic' },
  },
  {
    id: 'espada_runica',
    name: 'Espada Rúnica',
    type: 'sword',
    rarity: 'uncommon',
    damage: 20,
    damageType: 'physical',
    speed: 1,
    range: 2.35,
    arc: 125,
    critBonus: 0.03,
    poise: 14,
    scaling: 'melee',
    levelReq: 3,
    value: 220,
    description: 'Restaurada por Doran com o martelo ancestral da família. As runas despertam perto de magia corrompida.',
    special: '+40% de dano (arcano) contra constructos e corrompidos.',
    behavior: 'runic',
    behaviorParams: { bonusVsFactionMul: 0.4, critOnDisabled: 0 },
    model: { length: 1.0, width: 0.075, primary: 0xa8b0bc, accent: 0x8a6a3a, glow: 0x58d8ff, variant: 'runic' },
  },
  {
    id: 'lanca_cristal',
    name: 'Lança de Cristal',
    type: 'spear',
    rarity: 'rare',
    damage: 21,
    damageType: 'physical',
    speed: 1,
    range: 3.7,
    arc: 40,
    critBonus: 0.04,
    poise: 14,
    scaling: 'melee',
    levelReq: 4,
    value: 360,
    description: 'Ponta de cristal de Éter lapidado. Estilhaça ao final do combo e semeia fragmentos afiados.',
    special: 'O último golpe do combo lança 3 estilhaços de cristal à frente.',
    behavior: 'crystalSpear',
    behaviorParams: { shards: 3, shardSpreadDeg: 12, shardDamageMul: 0.6, shardSpeed: 34, shardRange: 22 },
    model: { length: 2.15, width: 0.09, primary: 0x4d5a6e, accent: 0xc0c8d8, glow: 0x7fe8ff, variant: 'crystal' },
  },
  {
    id: 'espada_raios',
    name: 'Espada de Raios',
    type: 'sword',
    rarity: 'rare',
    damage: 22,
    damageType: 'physical',
    speed: 1.05,
    range: 2.35,
    arc: 120,
    critBonus: 0.03,
    poise: 13,
    scaling: 'melee',
    levelReq: 4,
    value: 420,
    description: 'Uma bobina rúnica no punho acumula carga a cada golpe. O ar cheira a tempestade.',
    special: 'Golpes têm 35% de chance de soltar uma descarga que salta entre até 3 inimigos.',
    behavior: 'chainLightning',
    behaviorParams: { chance: 0.35, jumps: 3, jumpRange: 7, damageMul: 0.55, guaranteedEvery: 4 },
    model: { length: 1.0, width: 0.07, primary: 0x7d8796, accent: 0x2f3b52, glow: 0x8fd0ff, variant: 'serrated' },
  },
  {
    id: 'manopla_tecnomagica',
    name: 'Manopla Tecnomágica',
    type: 'techno',
    rarity: 'rare',
    damage: 18,
    damageType: 'lightning',
    speed: 1.2,
    range: 2.0,
    arc: 70,
    critBonus: 0.02,
    poise: 16,
    scaling: 'melee',
    levelReq: 4,
    value: 480,
    description: 'Manopla arcanotécnica de um autômato de Aeternum. Cada soco descarrega um pulso elétrico.',
    special: 'Socos soltam um pulso de choque à frente (3,5 m). Carregado: impacto no chão com onda de choque.',
    behavior: 'technoPulse',
    behaviorParams: { pulseRange: 3.5, pulseDamageMul: 0.45, slamRadius: 5, slamDamageMul: 2.2, slamKnockback: 11, shockDps: 4, shockDuration: 2 },
    model: { length: 0.32, width: 0.16, primary: 0x3c4250, accent: 0xb08a3a, glow: 0x4ff0ff, variant: 'tech' },
  },
  {
    id: 'lamina_vampirica',
    name: 'Lâmina Vampírica',
    type: 'dagger',
    rarity: 'epic',
    damage: 17,
    damageType: 'physical',
    speed: 1.4,
    range: 2.0,
    arc: 95,
    critBonus: 0.08,
    poise: 8,
    scaling: 'melee',
    levelReq: 5,
    value: 900,
    description: 'A lâmina de Ravena, a Corva. Bebe o que corta — e tem mais sede quando quem a empunha sangra.',
    special: 'Cura 6% do dano causado; 20% com a vida abaixo de 50%. Abates curam 4% da vida máxima.',
    behavior: 'vampiric',
    behaviorParams: { leech: 0.06, leechLow: 0.2, lowHealth: 0.5, killHealFraction: 0.04 },
    model: { length: 0.5, width: 0.055, primary: 0x2b1d24, accent: 0x6e1020, glow: 0xff2a48, variant: 'curved' },
  },
  {
    id: 'cajado_vazio',
    name: 'Cajado do Vazio',
    type: 'staff',
    rarity: 'epic',
    damage: 17,
    damageType: 'void',
    speed: 0.95,
    range: 2.4,
    arc: 110,
    critBonus: 0.03,
    poise: 9,
    scaling: 'spell',
    levelReq: 5,
    value: 1100,
    description: 'Relíquia de Elyra. O cristal não reflete luz: engole.',
    special: 'Disparos do Vazio atravessam até 4 inimigos (cada um sofre 15% a menos).',
    behavior: 'voidPierce',
    behaviorParams: { pierce: 4, falloffPerTarget: 0.15, speed: 46, range: 70 },
    model: { length: 1.9, width: 0.13, primary: 0x1d1a26, accent: 0x5b4a7a, glow: 0xb36bff, variant: 'void' },
  },
  {
    id: 'lamina_temporal',
    name: 'Lâmina Temporal',
    type: 'sword',
    rarity: 'epic',
    damage: 26,
    damageType: 'time',
    speed: 1.05,
    range: 2.4,
    arc: 125,
    critBonus: 0.05,
    poise: 15,
    scaling: 'melee',
    levelReq: 6,
    value: 1400,
    description: 'Presente do espírito do Guardião. O gume vibra fora de compasso com o resto do mundo.',
    special: 'Golpes desaceleram o alvo (lentidão temporal de 45% por 2,5 s). Carregado: pulso que desacelera tudo ao redor.',
    behavior: 'temporal',
    behaviorParams: { slow: 0.45, slowDuration: 2.5, pulseRadius: 5.5, pulseSlow: 0.7, pulseDuration: 3.5, pulseDamageMul: 1.2 },
    model: { length: 1.05, width: 0.08, primary: 0xc9b98a, accent: 0x3a4d6e, glow: 0x7fb8ff, variant: 'temporal' },
  },
  {
    id: 'espada_cyber_runica',
    name: 'Espada Cyber-Rúnica',
    type: 'sword',
    rarity: 'epic',
    damage: 25,
    damageType: 'physical',
    speed: 1.1,
    range: 2.4,
    arc: 125,
    critBonus: 0.04,
    poise: 14,
    scaling: 'melee',
    levelReq: 6,
    value: 1500,
    description: 'Aço de Ferroluz com circuitos rúnicos de Aeternum. Alterna entre corte físico e gume elétrico.',
    special: 'Alterna dano físico/elétrico a cada golpe. O finalizador do combo dispara uma onda de energia perfurante.',
    behavior: 'cyberRunic',
    behaviorParams: { waveDamageMul: 1.3, waveSpeed: 30, waveRange: 18, wavePierce: 6, electricBonus: 0.1 },
    model: { length: 1.05, width: 0.08, primary: 0x55606e, accent: 0x14161c, glow: 0x3cf0ff, variant: 'tech' },
  },
  {
    id: 'cajado_dragao',
    name: 'Cajado do Dragão',
    type: 'staff',
    rarity: 'legendary',
    damage: 22,
    damageType: 'fire',
    speed: 0.9,
    range: 2.5,
    arc: 110,
    critBonus: 0.04,
    poise: 10,
    scaling: 'spell',
    levelReq: 7,
    value: 2600,
    description: 'Talhado de um chifre de dragão cristalizado. Ainda está quente ao toque.',
    special: 'Disparos de fogo explodem (2 m) e queimam. Carregado: rajada de fogo em cone que incendeia tudo à frente.',
    behavior: 'dragonFire',
    behaviorParams: { explodeRadius: 2, burnDps: 5, burnDuration: 3, coneRange: 8, coneAngle: 55, coneDamageMul: 2.4, coneBurnDps: 9, coneBurnDuration: 4.5 },
    model: { length: 1.95, width: 0.16, primary: 0x4a2418, accent: 0xd0a050, glow: 0xff6a1a, variant: 'dragon' },
  },
  {
    id: 'espada_solar',
    name: 'Espada Solar',
    type: 'sword',
    rarity: 'legendary',
    damage: 30,
    damageType: 'fire',
    speed: 1,
    range: 2.5,
    arc: 130,
    critBonus: 0.05,
    poise: 17,
    scaling: 'melee',
    levelReq: 8,
    value: 3200,
    description: 'Dizem que foi temperada no último pôr do sol antes da Grande Cisão. Guarda a luz e devolve em fúria.',
    special: 'Cada golpe acumula energia solar (+14). Com a carga cheia, o ataque carregado libera um golpe explosivo (raio 4,5 m).',
    behavior: 'solar',
    behaviorParams: { perHit: 14, max: 100, blastRadius: 4.5, blastDamageMul: 3.2, burnDps: 6, burnDuration: 3, decayPerSecond: 4, decayDelay: 4 },
    model: { length: 1.1, width: 0.09, primary: 0xe8d6a0, accent: 0xb07a20, glow: 0xffc040, variant: 'solar' },
  },
  {
    id: 'orbe_eclipse',
    name: 'Orbe do Eclipse',
    type: 'artifact',
    rarity: 'mythic',
    damage: 16,
    damageType: 'void',
    speed: 1,
    range: 2.2,
    arc: 100,
    critBonus: 0.06,
    poise: 8,
    scaling: 'spell',
    levelReq: 10,
    value: 6000,
    description: 'Um fragmento do próprio Eclipse, preso numa gaiola de bronze. Não deveria existir — e sabe disso.',
    special: 'Cada ataque lança 3 esferas que perseguem inimigos. Carregado: pulso gravitacional que puxa e deixa vulneráveis.',
    behavior: 'eclipseOrb',
    behaviorParams: { orbs: 3, orbSpeed: 22, homing: 8, pulseRadius: 8, pullForce: 14, vulnerable: 0.25, vulnerableDuration: 5, pulseDamageMul: 2 },
    model: { length: 0.36, width: 0.22, primary: 0x2a2030, accent: 0xb08a3a, glow: 0xff4f7a, variant: 'orb' },
  },
];

export const WEAPONS: Record<string, WeaponDef> = Object.fromEntries(LIST.map((w) => [w.id, w]));
export const WEAPON_IDS: string[] = LIST.map((w) => w.id);
/** Arma usada quando nada está equipado. */
export const DEFAULT_WEAPON_ID = 'cajado_ancestral';

export function getWeaponDef(id: string | null | undefined): WeaponDef {
  return (id && WEAPONS[id]) || WEAPONS[DEFAULT_WEAPON_ID];
}

// =====================================================================
// Combos (por tipo de arma)
// =====================================================================
export interface ComboStep {
  anim: PlayerAnim;
  /** Multiplicador de dano do golpe. */
  damageMul: number;
  /** Fração da animação em que o golpe acerta (quadro de impacto). */
  impact: number;
  /** Velocidade da animação (multiplicada pela velocidade da arma). */
  speed: number;
  rangeMul: number;
  arcMul: number;
  /** Avanço do corpo durante o golpe (m). */
  lunge: number;
  knockback: number;
  poiseMul: number;
  /** Finalizador do combo (ganchos especiais, hit-stop maior). */
  finisher?: boolean;
}

export interface ComboDef {
  steps: ComboStep[];
  /** Após o fim de um golpe, por quanto tempo (s) um novo clique continua o combo. */
  window: number;
  /** Fração da animação a partir da qual um clique já engata o próximo golpe (buffer). */
  cancelAt: number;
}

const S = (anim: PlayerAnim, damageMul: number, impact: number, o: Partial<ComboStep> = {}): ComboStep => ({
  anim,
  damageMul,
  impact,
  speed: 1,
  rangeMul: 1,
  arcMul: 1,
  lunge: 0.35,
  knockback: 2.5,
  poiseMul: 1,
  ...o,
});

export const COMBOS: Record<WeaponType, ComboDef> = {
  // Espada: 3 golpes (horizontal, revés, golpe descendente pesado)
  sword: {
    steps: [S('slash1', 1, 0.46), S('slash2', 1.1, 0.46), S('slash3', 1.65, 0.56, { knockback: 7, poiseMul: 2.2, lunge: 0.7, arcMul: 0.8, finisher: true })],
    window: 0.45,
    cancelAt: 0.6,
  },
  // Adaga: 4 golpes rápidos
  dagger: {
    steps: [
      S('slash1', 0.85, 0.44, { speed: 1.25 }),
      S('slash2', 0.85, 0.44, { speed: 1.25 }),
      S('thrust', 0.95, 0.48, { speed: 1.3, arcMul: 0.6, rangeMul: 1.15, lunge: 0.6 }),
      S('slash3', 1.45, 0.55, { speed: 1.15, knockback: 5, poiseMul: 1.8, finisher: true }),
    ],
    window: 0.38,
    cancelAt: 0.55,
  },
  // Lança: estocadas longas + varredura
  spear: {
    steps: [
      S('thrust', 1, 0.48, { lunge: 0.8, knockback: 3 }),
      S('thrust', 1.15, 0.48, { lunge: 0.9, knockback: 3.5, speed: 1.1 }),
      S('slash1', 1.5, 0.48, { rangeMul: 0.85, arcMul: 4.5, knockback: 7.5, poiseMul: 2, finisher: true }),
    ],
    window: 0.45,
    cancelAt: 0.62,
  },
  // Cajado (corpo a corpo, usado quando há inimigo colado; à distância o cajado dispara)
  staff: {
    steps: [S('staffStrike', 1.1, 0.5, { knockback: 6, poiseMul: 1.6 }), S('slash2', 1.2, 0.46, { knockback: 7, poiseMul: 1.8, finisher: true })],
    window: 0.4,
    cancelAt: 0.6,
  },
  // Manopla: socos rápidos (estocadas curtas)
  techno: {
    steps: [
      S('thrust', 0.9, 0.46, { speed: 1.3, arcMul: 1.2, lunge: 0.5 }),
      S('thrust', 0.9, 0.46, { speed: 1.35, arcMul: 1.2, lunge: 0.5 }),
      S('staffStrike', 1.5, 0.5, { speed: 1.1, knockback: 8, poiseMul: 2.2, finisher: true }),
    ],
    window: 0.4,
    cancelAt: 0.55,
  },
  // Artefato: golpe arcano curto (raramente usado; o artefato prefere disparar)
  artifact: {
    steps: [S('staffStrike', 1, 0.5, { knockback: 6, finisher: true })],
    window: 0.4,
    cancelAt: 0.6,
  },
};

/** Ataque carregado (segurar o botão de ataque). */
export const HEAVY_ATTACK = {
  /** Segurar por mais que isso inicia a carga (s). */
  holdThreshold: 0.28,
  /** Tempo para a carga completa (s, contado após o limiar). */
  maxCharge: 1.0,
  /** Multiplicador de dano: sem carga → carga completa. */
  damageMulMin: 1.8,
  damageMulMax: 3.0,
  anim: 'heavySlash' as PlayerAnim,
  impact: 0.62,
  speed: 1.25,
  rangeMul: 1.25,
  arcMul: 1.35,
  knockback: 10,
  poiseMul: 3.5,
  energyCost: 10,
  /** Velocidade de deslocamento durante a carga (multiplicador aplicado via lockMovement em pulsos). */
  hitStop: 0.11,
};

/** Disparo arcano do cajado (ataque básico do mago à distância; também no voo). */
export const STAFF_SHOT = {
  /** Se houver inimigo hostil a menos disso à frente, o cajado golpeia em vez de disparar (m). */
  meleeRange: 2.6,
  /** Cone (graus) da verificação de inimigo próximo. */
  meleeConeDeg: 70,
  speed: 44,
  range: 65,
  radius: 0.28,
  damageMul: 1,
  anim: 'cast' as PlayerAnim,
  /** Fração da animação em que o projétil sai. */
  impact: 0.36,
  animSpeed: 1.5,
  /** Intervalo mínimo entre disparos (s, dividido pela velocidade da arma). */
  interval: 0.38,
  /** Disparo carregado (segurar com cajado/artefato). */
  chargedDamageMulMin: 2,
  chargedDamageMulMax: 3.6,
  chargedExplodeRadius: 3.2,
  chargedAnim: 'castHeavy' as PlayerAnim,
  chargedImpact: 0.55,
  chargedAnimSpeed: 1.3,
  /** Sem cajado (espada etc.), o mago ainda dispara um raio fraco da mão no voo. */
  handShotDamage: 8,
};

/** Bloqueio e parry (botão direito). */
export const BLOCK = {
  /** Janela de parry (s) a partir do início do bloqueio. */
  parryWindow: 0.22,
  /** Repetir o bloqueio rápido demais não renova o parry (anti-spam, s). */
  parryCooldown: 0.5,
  /** Energia gasta por ponto de dano bloqueado. */
  energyPerDamage: 0.4,
  /** Sem energia, a guarda quebra: atordoa o jogador (s). */
  guardBreakStagger: 0.9,
  /** Depois de um parry, o próximo golpe em até N s é crítico e mais forte. */
  riposteWindow: 1.6,
  riposteDamageMul: 1.5,
  /** Carga Arcana ganha num parry. */
  parryUltimateCharge: 8,
  /** Energia devolvida num parry. */
  parryEnergy: 10,
  hitStop: 0.09,
};

/** Aprimoramento (ferreiro): +dano por nível. */
export const WEAPON_UPGRADE = {
  maxLevel: 5,
  damagePerLevel: 0.12,
  /** Custo em ouro para ir ao próximo nível (índice = nível atual). */
  goldCost: [80, 180, 360, 700, 1200],
};

export function upgradeMultiplier(level: number): number {
  const l = Math.max(0, Math.min(WEAPON_UPGRADE.maxLevel, Math.floor(level || 0)));
  return 1 + l * WEAPON_UPGRADE.damagePerLevel;
}

/** Hit-stop por tipo de golpe (s). */
export const HIT_STOP = {
  light: 0.035,
  finisher: 0.075,
  crit: 0.06,
};

/** Roubo de vida base do jogador (progression.lifeSteal) aplica-se a golpes corpo a corpo. */
export const MELEE_GENERAL = {
  /** Tolerância vertical do golpe (m). */
  verticalReach: 2.2,
  /** Máximo de alvos por golpe. */
  maxTargets: 6,
  /** Energia devolvida por golpe corpo a corpo que acerta. */
  energyOnHit: 1.5,
};
