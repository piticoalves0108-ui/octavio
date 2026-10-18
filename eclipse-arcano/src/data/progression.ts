/**
 * Progressão do personagem: curva de experiência, ganhos por nível, atributos base,
 * limites dos atributos agregados, XP por fonte (descoberta de locais) e custos de
 * redistribuição de talentos. Tudo que é número de gameplay da progressão fica aqui.
 * Implementação em rpg/Progression.ts.
 */

/** Atributos agregados do personagem (base + nível + talentos + equipamentos + efeitos). */
export type StatId =
  | 'maxHealth'
  | 'maxEnergy'
  | 'energyRegen'
  | 'healthRegen'
  | 'spellPower' // multiplicador de dano mágico (1 = base)
  | 'meleePower' // multiplicador de dano físico (1 = base)
  | 'critChance' // 0..1
  | 'critMultiplier'
  | 'cooldownReduction' // 0..0.5
  | 'damageReduction' // 0..0.6
  | 'moveSpeed' // multiplicador
  | 'flightSpeed' // multiplicador
  | 'flightCost' // multiplicador do custo de energia do voo
  | 'dodgeCost'
  | 'shieldPower' // multiplicador do Escudo Mágico
  | 'lifeSteal'; // fração do dano corpo a corpo convertida em vida

export const STAT_IDS: StatId[] = [
  'maxHealth',
  'maxEnergy',
  'energyRegen',
  'healthRegen',
  'spellPower',
  'meleePower',
  'critChance',
  'critMultiplier',
  'cooldownReduction',
  'damageReduction',
  'moveSpeed',
  'flightSpeed',
  'flightCost',
  'dodgeCost',
  'shieldPower',
  'lifeSteal',
];

/** Modificadores aditivos de atributo (ex.: { spellPower: 0.1 } = +10% de poder mágico). */
export type StatMods = Partial<Record<StatId, number>>;

/** Valores base no nível 1, sem equipamentos nem talentos. */
export const BASE_STATS: Record<StatId, number> = {
  maxHealth: 100,
  maxEnergy: 100,
  energyRegen: 8,
  healthRegen: 0.5,
  spellPower: 1,
  meleePower: 1,
  critChance: 0.05,
  critMultiplier: 1.5,
  cooldownReduction: 0,
  damageReduction: 0,
  moveSpeed: 1,
  flightSpeed: 1,
  flightCost: 1,
  dodgeCost: 1,
  shieldPower: 1,
  lifeSteal: 0,
};

/** Ganho por nível acima do 1 (somado ao base). */
export const PER_LEVEL_STATS: StatMods = {
  maxHealth: 12,
  maxEnergy: 6,
  energyRegen: 0.25,
  healthRegen: 0.05,
  spellPower: 0.03,
  meleePower: 0.03,
};

/** Limites [mín, máx] do valor final de cada atributo. */
export const STAT_LIMITS: Record<StatId, [number, number]> = {
  maxHealth: [1, 5000],
  maxEnergy: [10, 2000],
  energyRegen: [0, 100],
  healthRegen: [0, 50],
  spellPower: [0.1, 10],
  meleePower: [0.1, 10],
  critChance: [0, 0.75],
  critMultiplier: [1, 5],
  cooldownReduction: [0, 0.5],
  damageReduction: [0, 0.6],
  moveSpeed: [0.5, 1.6],
  flightSpeed: [0.5, 2],
  flightCost: [0.3, 3],
  dodgeCost: [0.2, 3],
  shieldPower: [0.2, 5],
  lifeSteal: [0, 0.3],
};

/** Nomes e formato de exibição dos atributos (UI: comparação e ficha). */
export const STAT_INFO: Record<StatId, { name: string; format: 'int' | 'pct' | 'mul' | 'dec'; /** true = valor menor é melhor */ lowerIsBetter?: boolean }> = {
  maxHealth: { name: 'Vida máxima', format: 'int' },
  maxEnergy: { name: 'Energia máxima', format: 'int' },
  energyRegen: { name: 'Regeneração de energia', format: 'dec' },
  healthRegen: { name: 'Regeneração de vida', format: 'dec' },
  spellPower: { name: 'Poder mágico', format: 'pct' },
  meleePower: { name: 'Poder físico', format: 'pct' },
  critChance: { name: 'Chance de crítico', format: 'pct' },
  critMultiplier: { name: 'Dano crítico', format: 'pct' },
  cooldownReduction: { name: 'Redução de recarga', format: 'pct' },
  damageReduction: { name: 'Redução de dano', format: 'pct' },
  moveSpeed: { name: 'Velocidade', format: 'pct' },
  flightSpeed: { name: 'Velocidade de voo', format: 'pct' },
  flightCost: { name: 'Custo do voo', format: 'pct', lowerIsBetter: true },
  dodgeCost: { name: 'Custo da esquiva', format: 'pct', lowerIsBetter: true },
  shieldPower: { name: 'Força do escudo', format: 'pct' },
  lifeSteal: { name: 'Roubo de vida', format: 'pct' },
};

/** Formata um modificador de atributo para tooltip ("+12% Poder mágico", "+15 Vida máxima"). */
export function formatStatMod(stat: StatId, value: number): string {
  const info = STAT_INFO[stat];
  const sign = value >= 0 ? '+' : '−';
  const abs = Math.abs(value);
  let num: string;
  switch (info.format) {
    case 'int':
      num = String(Math.round(abs));
      break;
    case 'dec':
      num = abs.toFixed(abs < 1 ? 2 : 1).replace('.', ',');
      break;
    default:
      num = `${Math.round(abs * 1000) / 10}`.replace('.', ',') + '%';
  }
  return `${sign}${num} ${info.name}`;
}

// ---------------------------------------------------------------------------
// Nível e experiência
// ---------------------------------------------------------------------------

export const LEVELING = {
  maxLevel: 20,
  /** XP para ir do nível L ao L+1 = round(base · L^exponent). */
  xpBase: 80,
  xpExponent: 1.3,
  /** Pontos de talento ganhos a cada nível. */
  talentPointsPerLevel: 1,
  /** Pontos extras nestes níveis (marcos). */
  bonusTalentPointLevels: [5, 10, 15, 20],
  /** Subir de nível cura vida e energia por completo. */
  fullHealOnLevelUp: true,
  /** XP máximo aceito numa única concessão (proteção contra valores absurdos). */
  maxSingleGrant: 100000,
};

/** XP necessário para ir do nível `level` ao seguinte (0 no nível máximo). */
export function xpToNextLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  if (l >= LEVELING.maxLevel) return 0;
  return Math.round(LEVELING.xpBase * Math.pow(l, LEVELING.xpExponent));
}

/** XP total acumulado necessário para chegar a `level` desde o nível 1. */
export function totalXpForLevel(level: number): number {
  let s = 0;
  for (let l = 1; l < Math.min(level, LEVELING.maxLevel); l++) s += xpToNextLevel(l);
  return s;
}

/** Pontos de talento concedidos ao alcançar exatamente `level` (> 1). */
export function talentPointsForLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVELING.talentPointsPerLevel + (LEVELING.bonusTalentPointLevels.includes(level) ? 1 : 0);
}

/** Total de pontos de talento ganhos por nível até `level` (sem bônus de história). */
export function totalTalentPointsAt(level: number): number {
  let s = 0;
  for (let l = 2; l <= Math.min(level, LEVELING.maxLevel); l++) s += talentPointsForLevel(l);
  return s;
}

/**
 * Aplica `amount` de XP a (level, xp) e devolve o novo estado e quantos níveis subiu.
 * Pura (testável). No nível máximo a barra fica cheia e o excedente é descartado.
 */
export function applyXp(level: number, xp: number, amount: number): { level: number; xp: number; levelsGained: number } {
  let l = Math.max(1, Math.min(LEVELING.maxLevel, Math.floor(level)));
  let x = Math.max(0, xp) + Math.max(0, Math.min(LEVELING.maxSingleGrant, amount));
  let gained = 0;
  while (l < LEVELING.maxLevel) {
    const need = xpToNextLevel(l);
    if (x < need) break;
    x -= need;
    l++;
    gained++;
  }
  if (l >= LEVELING.maxLevel) x = 0;
  return { level: l, xp: x, levelsGained: gained };
}

/** XP por descobrir um local, conforme o tipo (data/world.ts LocationKind). */
export const DISCOVERY_XP: Record<string, number> = {
  settlement: 40,
  dungeon: 50,
  ruins: 60,
  landmark: 40,
  camp: 50,
  tower: 60,
  region: 30,
  secret: 120,
  arena: 50,
};

/** Recompensas de XP fora de combate (fontes do próprio rpg). */
export const MISC_XP = {
  /** Abrir um baú do mundo pela primeira vez. */
  chestOpened: 10,
  /** Colher uma erva. */
  herbHarvested: 2,
};

// ---------------------------------------------------------------------------
// Talentos: redistribuição (santuário)
// ---------------------------------------------------------------------------

export const RESPEC = {
  /** Custo em ouro = base + porNível · nível. */
  baseCost: 60,
  perLevel: 30,
  /** Âncora (data/places.ts) onde o santuário oferece a redistribuição. */
  shrineAnchor: 'santuario_vila_oracao',
  /** Distância máxima da âncora para a redistribuição ficar disponível pelo santuário. */
  shrineRange: 6,
};

export function respecCost(level: number): number {
  return RESPEC.baseCost + RESPEC.perLevel * Math.max(1, Math.floor(level));
}
