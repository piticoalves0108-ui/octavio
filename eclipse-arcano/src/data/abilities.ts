/**
 * Habilidades mágicas do Mago Ancestral: as 10 do design, com custo, recarga, tempo de
 * conjuração, alcance, dano, raio, estados aplicados, nível de desbloqueio e escala por rank (1–3).
 * Também ficam aqui a Carga Arcana/Forma Ascendente e as combinações entre magias.
 * Implementação em combat/Abilities.ts + combat/abilityEffects.ts.
 */
import type { DamageType } from '../combat/Health';
import type { PlayerAnim } from '../player/Player';
import type { SfxId } from '../audio/Audio';

export type AbilityId =
  | 'arcaneOrb'
  | 'energyLance'
  | 'runicBlast'
  | 'arcaneChains'
  | 'magicShield'
  | 'blink'
  | 'lightningStorm'
  | 'etherealBlades'
  | 'dimensionalRift'
  | 'ascendantForm';

export type AbilityCategory = 'projétil' | 'feixe' | 'área' | 'controle' | 'defesa' | 'mobilidade' | 'zona' | 'invocação' | 'suprema';

export interface AbilityDef {
  id: AbilityId;
  name: string;
  description: string;
  /** Id de ícone para a UI desenhar (procedural). */
  icon: string;
  /** Caractere simples usado como ícone de texto. */
  glyph: string;
  /** Cor tema (UI e efeitos). */
  color: number;
  category: AbilityCategory;
  damageType: DamageType;
  /** Energia gasta ao conjurar. */
  cost: number;
  /** Recarga (s), antes de reduções. */
  cooldown: number;
  /** Tempo de conjuração até o efeito (s) — sincronizado com a animação. */
  castTime: number;
  anim: PlayerAnim;
  /** Alcance máximo (m). 0 = ao redor do mago. */
  range: number;
  /** Dano base (antes de spellPower e rank). */
  damage: number;
  /** Raio de efeito (m). */
  radius: number;
  /** Duração do efeito (s). */
  duration: number;
  /** Estados aplicados (texto para tooltip). */
  statusText: string;
  /** Nível do personagem para desbloquear. */
  unlockLevel: number;
  /** Pode ser usada voando. */
  canFly: boolean;
  /** Exige postura firme (não nadando/escalando). */
  heavy: boolean;
  sfx: SfxId;
  /** Parâmetros específicos (números de gameplay). */
  params: Record<string, number>;
  /** Valores por rank (1, 2, 3) que sobrescrevem campos/params com o mesmo nome. */
  perRank: Record<string, [number, number, number]>;
  /** O que cada rank acrescenta (texto). */
  rankNotes: [string, string, string];
}

export const MAX_RANK = 3;

const LIST: AbilityDef[] = [
  {
    id: 'arcaneOrb',
    name: 'Bola Arcana',
    description: 'Uma esfera de Éter concentrado que explode no impacto, ferindo tudo ao redor.',
    icon: 'orb',
    glyph: '✦',
    color: 0x58d8ff,
    category: 'projétil',
    damageType: 'arcane',
    cost: 10,
    cooldown: 1.1,
    castTime: 0.2,
    anim: 'cast',
    range: 60,
    damage: 26,
    radius: 3,
    duration: 0,
    statusText: 'Empurra levemente.',
    unlockLevel: 1,
    canFly: true,
    heavy: false,
    sfx: 'cast_arcane',
    params: { speed: 34, projectileRadius: 0.35, knockback: 4, poise: 18, animSpeed: 1.25 },
    perRank: { damage: [26, 34, 44], radius: [3, 3.5, 4.2], cooldown: [1.1, 1.0, 0.85] },
    rankNotes: ['Explosão de 3 m.', '+30% de dano e raio de 3,5 m.', '+70% de dano, raio de 4,2 m e recarga menor.'],
  },
  {
    id: 'energyLance',
    name: 'Lança de Energia',
    description: 'Segure para carregar e solte: um feixe perfurante atravessa tudo em linha reta até bater numa parede.',
    icon: 'lance',
    glyph: '➹',
    color: 0x7fe8ff,
    category: 'feixe',
    damageType: 'arcane',
    cost: 16,
    cooldown: 6,
    castTime: 0.12,
    anim: 'castChannel',
    range: 45,
    damage: 30,
    radius: 0.6,
    duration: 0,
    statusText: 'Perfura todos os alvos. Em alvos enraizados: Estilhaçar.',
    unlockLevel: 3,
    canFly: true,
    heavy: false,
    sfx: 'cast_lance',
    params: { chargeTime: 1.1, minCharge: 0.25, chargedDamageMul: 2.4, extraCostCharged: 10, poise: 30, knockback: 5, maxHold: 2.5 },
    perRank: { damage: [30, 40, 52], range: [45, 52, 60], cooldown: [6, 5.5, 4.5] },
    rankNotes: ['Feixe de 45 m.', '+33% de dano e 52 m de alcance.', '+73% de dano, 60 m e recarga de 4,5 s.'],
  },
  {
    id: 'runicBlast',
    name: 'Explosão Rúnica',
    description: 'Um círculo de runas detona ao redor do mago, ferindo e repelindo inimigos. As runas ficam gravadas nos alvos por alguns segundos.',
    icon: 'blast',
    glyph: '✺',
    color: 0xa070ff,
    category: 'área',
    damageType: 'arcane',
    cost: 22,
    cooldown: 8,
    castTime: 0.5,
    anim: 'castHeavy',
    range: 0,
    damage: 34,
    radius: 5.5,
    duration: 6,
    statusText: 'Repele forte. Marca rúnica (6 s): a Tempestade de Raios causa Sobrecarga.',
    unlockLevel: 2,
    canFly: true,
    heavy: true,
    sfx: 'cast_explosion',
    params: { knockback: 13, poise: 40, animSpeed: 1 },
    perRank: { damage: [34, 44, 56], radius: [5.5, 6.3, 7.2], knockback: [13, 15, 18] },
    rankNotes: ['Raio de 5,5 m.', '+30% de dano, raio de 6,3 m.', '+65% de dano, raio de 7,2 m e repulsão maior.'],
  },
  {
    id: 'arcaneChains',
    name: 'Correntes Arcanas',
    description: 'Correntes de luz prendem os inimigos à frente ao chão. Chefes não podem ser presos: ficam lentos.',
    icon: 'chains',
    glyph: '∞',
    color: 0x6fffd0,
    category: 'controle',
    damageType: 'arcane',
    cost: 18,
    cooldown: 12,
    castTime: 0.22,
    anim: 'cast',
    range: 20,
    damage: 10,
    radius: 0,
    duration: 3,
    statusText: 'Enraíza (chefes: lentidão de 50%).',
    unlockLevel: 5,
    canFly: true,
    heavy: false,
    sfx: 'cast_chains',
    params: { coneDeg: 50, bossSlow: 0.5, animSpeed: 1.1 },
    perRank: { targets: [3, 4, 5], duration: [3, 3.6, 4.2], damage: [10, 14, 18] },
    rankNotes: ['Até 3 alvos por 3 s.', 'Até 4 alvos por 3,6 s.', 'Até 5 alvos por 4,2 s.'],
  },
  {
    id: 'magicShield',
    name: 'Escudo Mágico',
    description: 'Uma esfera de runas absorve o dano recebido por alguns segundos. No rank 3, devolve projéteis inimigos.',
    icon: 'shield',
    glyph: '◈',
    color: 0x58b0ff,
    category: 'defesa',
    damageType: 'arcane',
    cost: 25,
    cooldown: 18,
    castTime: 0.15,
    anim: 'cast',
    range: 0,
    damage: 0,
    radius: 1.4,
    duration: 6,
    statusText: 'Absorve dano. Rank 3: reflete projéteis.',
    unlockLevel: 6,
    canFly: true,
    heavy: false,
    sfx: 'cast_shield',
    params: { animSpeed: 1.4 },
    perRank: { absorb: [45, 70, 100], duration: [6, 7, 8], reflect: [0, 0, 1] },
    rankNotes: ['Absorve 45 de dano por 6 s.', 'Absorve 70 por 7 s.', 'Absorve 100 por 8 s e reflete projéteis.'],
  },
  {
    id: 'blink',
    name: 'Teleporte Curto',
    description: 'Dobra o espaço e reaparece alguns metros adiante, intocável por um instante. Nunca atravessa paredes.',
    icon: 'blink',
    glyph: '⇝',
    color: 0xc080ff,
    category: 'mobilidade',
    damageType: 'arcane',
    cost: 15,
    cooldown: 5,
    castTime: 0,
    anim: 'cast',
    range: 11,
    damage: 0,
    radius: 0,
    duration: 0,
    statusText: 'Invulnerável por 0,45 s.',
    unlockLevel: 4,
    canFly: true,
    heavy: false,
    sfx: 'cast_teleport',
    params: { iframes: 0.45, wallMargin: 0.8, maxStepUp: 2.5, animSpeed: 2 },
    perRank: { range: [11, 14, 17], cooldown: [5, 4.2, 3.4] },
    rankNotes: ['11 m.', '14 m e recarga de 4,2 s.', '17 m e recarga de 3,4 s.'],
  },
  {
    id: 'lightningStorm',
    name: 'Tempestade de Raios',
    description: 'Invoca uma nuvem carregada sobre a área mirada. Raios caem sobre vários inimigos ao longo do tempo. Na chuva ou em alvos molhados, o estrago é maior.',
    icon: 'storm',
    glyph: 'ϟ',
    color: 0x9fd8ff,
    category: 'zona',
    damageType: 'lightning',
    cost: 35,
    cooldown: 16,
    castTime: 0.45,
    anim: 'castHeavy',
    range: 35,
    damage: 18,
    radius: 8,
    duration: 4.5,
    statusText: 'Choque. Molhados: +50% de dano. Marcados pela Explosão Rúnica: Sobrecarga (raio em cadeia).',
    unlockLevel: 7,
    canFly: true,
    heavy: true,
    sfx: 'cast_lightning',
    params: { interval: 0.45, strikesPerTick: 2, rainExtraStrikes: 1, shockDps: 3, shockDuration: 1.5, poise: 14, animSpeed: 1.1 },
    perRank: { damage: [18, 24, 31], duration: [4.5, 5, 6], strikesPerTick: [2, 2, 3] },
    rankNotes: ['2 raios a cada 0,45 s por 4,5 s.', '+33% de dano e 5 s.', '+72% de dano, 3 raios por pulso e 6 s.'],
  },
  {
    id: 'etherealBlades',
    name: 'Lâminas Etéreas',
    description: 'Lâminas fantasmagóricas orbitam o mago e então caçam inimigos próximos, deixando-os vulneráveis.',
    icon: 'blades',
    glyph: '⟡',
    color: 0xb8f0ff,
    category: 'invocação',
    damageType: 'arcane',
    cost: 24,
    cooldown: 10,
    castTime: 0.2,
    anim: 'cast',
    range: 30,
    damage: 16,
    radius: 0,
    duration: 5,
    statusText: 'Vulnerável (+25% de dano recebido por 5 s).',
    unlockLevel: 8,
    canFly: true,
    heavy: false,
    sfx: 'cast_blades',
    params: { speed: 24, homing: 7, vulnerable: 0.25, orbitTime: 0.45, animSpeed: 1.2 },
    perRank: { count: [3, 4, 5], damage: [16, 19, 23] },
    rankNotes: ['3 lâminas.', '4 lâminas, +19% de dano.', '5 lâminas, +44% de dano.'],
  },
  {
    id: 'dimensionalRift',
    name: 'Fenda Dimensional',
    description: 'Rasga o espaço no ponto mirado: a fenda puxa os inimigos, fere continuamente e implode. Uma Explosão Rúnica dentro dela causa um Colapso Dimensional.',
    icon: 'rift',
    glyph: '◉',
    color: 0x9b4dff,
    category: 'zona',
    damageType: 'void',
    cost: 40,
    cooldown: 28,
    castTime: 0.5,
    anim: 'castHeavy',
    range: 30,
    damage: 8,
    radius: 7,
    duration: 4,
    statusText: 'Puxa, dano contínuo e implosão final.',
    unlockLevel: 9,
    canFly: true,
    heavy: true,
    sfx: 'cast_rift',
    params: { tick: 0.5, pull: 9, bossPullMul: 0.15, implodeDamage: 60, implodeKnockback: 6, animSpeed: 1 },
    perRank: { damage: [8, 11, 14], implodeDamage: [60, 80, 105], radius: [7, 8, 9], cooldown: [28, 25, 22] },
    rankNotes: ['Raio de 7 m, implosão de 60.', 'Raio de 8 m, implosão de 80.', 'Raio de 9 m, implosão de 105 e recarga de 22 s.'],
  },
  {
    id: 'ascendantForm',
    name: 'Forma Ascendente',
    description: 'Kaelen libera o poder que tinha em Aeternum: mais poder mágico, regeneração, recargas menores e voo sem custo. Exige Carga Arcana cheia, acumulada causando dano.',
    icon: 'ascend',
    glyph: '✶',
    color: 0xffc040,
    category: 'suprema',
    damageType: 'arcane',
    cost: 0,
    cooldown: 45,
    castTime: 0.4,
    anim: 'ascend',
    range: 0,
    damage: 40,
    radius: 7,
    duration: 15,
    statusText: 'Poder mágico +40%, regeneração, recargas -50%, voo sem custo.',
    unlockLevel: 10,
    canFly: true,
    heavy: false,
    sfx: 'cast_ascend',
    params: { spellPowerBonus: 0.4, regenPerSecond: 0.025, cooldownMul: 0.5, energyRegen: 30, knockback: 14 },
    perRank: { duration: [15, 17, 20], spellPowerBonus: [0.4, 0.5, 0.6] },
    rankNotes: ['15 s, +40% de poder mágico.', '17 s, +50% de poder mágico.', '20 s, +60% de poder mágico.'],
  },
];

export const ABILITIES: Record<AbilityId, AbilityDef> = Object.fromEntries(LIST.map((a) => [a.id, a])) as Record<AbilityId, AbilityDef>;
export const ABILITY_IDS: AbilityId[] = LIST.map((a) => a.id);
export const ULTIMATE_ID: AbilityId = 'ascendantForm';
/** Habilidade disponível desde o início. */
export const STARTING_ABILITY: AbilityId = 'arcaneOrb';

export function isAbilityId(id: unknown): id is AbilityId {
  return typeof id === 'string' && id in ABILITIES;
}

/**
 * Valor de um campo/parâmetro para um rank (1..3): `perRank` tem prioridade,
 * depois `params`, depois o campo numérico da definição.
 */
export function abilityValue(def: AbilityDef, key: string, rank: number): number {
  const r = Math.max(1, Math.min(MAX_RANK, Math.floor(rank) || 1));
  const pr = def.perRank[key];
  if (pr) return pr[r - 1];
  if (key in def.params) return def.params[key];
  const v = (def as unknown as Record<string, unknown>)[key];
  return typeof v === 'number' ? v : 0;
}

/** Carga Arcana e Forma Ascendente. */
export const ULTIMATE = {
  max: 100,
  /** Carga por ponto de dano causado pelo jogador. */
  perDamage: 0.12,
  /** Carga extra por inimigo abatido. */
  perKill: 3,
  /** Carga ganha por segundo fora de combate (0 = não ganha). */
  passivePerSecond: 0,
};

/** Combinações entre magias. */
export const SPELL_COMBOS = {
  /** Correntes + Lança: Estilhaçar (alvo enraizado atingido pela Lança). */
  shatter: { damageMul: 1.6, poiseDamage: 999, bonusStun: 1.2, name: 'Estilhaçar' },
  /** Tempestade em alvo com Marca Rúnica: Sobrecarga (raio em cadeia). */
  overload: { jumps: 3, range: 8, damageMul: 0.6, name: 'Sobrecarga' },
  /** Explosão Rúnica dentro da Fenda: Colapso Dimensional. */
  riftCollapse: { damageMul: 1.8, radiusMul: 1.3, stun: 1.4, name: 'Colapso Dimensional' },
  /** Dano elétrico em alvos molhados (chuva ou na água). */
  wetLightningMul: 1.5,
  /** Duração da Marca Rúnica (s) — usada também pela Explosão Rúnica. */
  runeMarkDuration: 6,
};

/** Falhas de conjuração exibidas ao jogador. */
export const ABILITY_FAIL_TEXT: Record<'cooldown' | 'energy' | 'locked' | 'state', string> = {
  cooldown: 'Ainda em recarga.',
  energy: 'Energia insuficiente.',
  locked: 'Habilidade ainda não aprendida.',
  state: 'Não é possível conjurar agora.',
};
