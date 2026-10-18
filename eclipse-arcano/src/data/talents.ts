/**
 * Árvore de talentos: 4 ramos com 6 talentos cada (ranks, pré-requisitos, efeitos).
 * Efeitos = modificadores aditivos de atributo por rank (data/progression.ts StatMods)
 * e/ou melhoria de uma habilidade (cada rank: desbloqueia se ainda bloqueada, senão +1 rank).
 * Regras puras de pré-requisito em `checkTalent` (testáveis). Implementação em rpg/Progression.ts.
 */
import type { AbilityId } from './abilities';
import type { StatMods } from './progression';

export type TalentBranchId = 'arcano' | 'lamina' | 'egide' | 'ceus';

export interface TalentBranch {
  id: TalentBranchId;
  name: string;
  /** Arquétipo/papel (UI). */
  role: string;
  description: string;
  /** Cor tema (CSS). */
  color: string;
  glyph: string;
}

export interface TalentDef {
  id: string;
  branch: TalentBranchId;
  name: string;
  description: string;
  /** Linha na árvore (0 = topo). Define quantos pontos no ramo são exigidos (TIER_POINTS). */
  tier: number;
  maxRank: number;
  /** Modificadores por rank (multiplicados pelo rank atual). */
  perRank?: StatMods;
  /** Habilidade melhorada a cada rank (desbloqueia se bloqueada, senão sobe 1 rank). */
  ability?: AbilityId;
  /** Talento que precisa ter pelo menos 1 rank (além dos pontos no ramo). */
  requires?: string;
  /** Nível mínimo do personagem. */
  levelReq?: number;
  glyph: string;
}

/** Pontos gastos no ramo exigidos para cada linha (tier). */
export const TIER_POINTS = [0, 2, 3, 5, 7, 9];

export const TALENT_BRANCHES: TalentBranch[] = [
  {
    id: 'arcano',
    name: 'Arcano Ofensivo',
    role: 'Mago ofensivo',
    description: 'Dano mágico, críticos e magias de destruição. Para quem resolve tudo à distância.',
    color: '#58d8ff',
    glyph: '✦',
  },
  {
    id: 'lamina',
    name: 'Lâmina Rúnica',
    role: 'Combatente com espada',
    description: 'Golpes físicos, roubo de vida e resistência na linha de frente.',
    color: '#ff9a4a',
    glyph: '†',
  },
  {
    id: 'egide',
    name: 'Égide',
    role: 'Conjurador defensivo',
    description: 'Vida, escudos, regeneração e controle. Sobreviver para vencer.',
    color: '#7dff9a',
    glyph: '⛨',
  },
  {
    id: 'ceus',
    name: 'Errante dos Céus',
    role: 'Mobilidade e voo',
    description: 'Voo mais longo e rápido, esquivas baratas e saltos dimensionais.',
    color: '#c8a8ff',
    glyph: '➶',
  },
];

export const TALENTS: TalentDef[] = [
  // ---------------- Arcano Ofensivo ----------------
  { id: 'arc_canalizacao', branch: 'arcano', tier: 0, maxRank: 3, name: 'Canalização Arcana', description: '+6% de poder mágico por rank.', perRank: { spellPower: 0.06 }, glyph: '✦' },
  { id: 'arc_foco', branch: 'arcano', tier: 1, maxRank: 3, name: 'Foco Cristalino', description: '+3% de chance de crítico por rank.', perRank: { critChance: 0.03 }, glyph: '◈' },
  { id: 'arc_lanca', branch: 'arcano', tier: 2, maxRank: 2, name: 'Lança Aprimorada', description: 'Aprende ou aprimora a Lança de Energia (+1 rank por rank) e +3% de poder mágico.', ability: 'energyLance', perRank: { spellPower: 0.03 }, glyph: '➹' },
  { id: 'arc_eco', branch: 'arcano', tier: 3, maxRank: 2, name: 'Eco Rúnico', description: 'Aprende ou aprimora a Explosão Rúnica e reduz recargas em 4% por rank.', ability: 'runicBlast', perRank: { cooldownReduction: 0.04 }, glyph: '✺' },
  { id: 'arc_sobrecarga', branch: 'arcano', tier: 4, maxRank: 3, name: 'Sobrecarga de Éter', description: '+5% de poder mágico e +10% de dano crítico por rank.', perRank: { spellPower: 0.05, critMultiplier: 0.1 }, glyph: '⚡' },
  { id: 'arc_tempestade', branch: 'arcano', tier: 5, maxRank: 1, name: 'Senhor da Tempestade', description: 'Aprende ou aprimora a Tempestade de Raios e +8% de poder mágico.', ability: 'lightningStorm', perRank: { spellPower: 0.08 }, requires: 'arc_sobrecarga', glyph: '☈' },

  // ---------------- Lâmina Rúnica ----------------
  { id: 'lam_empunhadura', branch: 'lamina', tier: 0, maxRank: 3, name: 'Empunhadura Ancestral', description: '+7% de poder físico por rank.', perRank: { meleePower: 0.07 }, glyph: '†' },
  { id: 'lam_sede', branch: 'lamina', tier: 1, maxRank: 2, name: 'Sede Rúnica', description: '+4% de roubo de vida nos golpes corpo a corpo por rank.', perRank: { lifeSteal: 0.04 }, glyph: '♦' },
  { id: 'lam_postura', branch: 'lamina', tier: 2, maxRank: 3, name: 'Postura de Duelista', description: '+3% de redução de dano e +10 de vida máxima por rank.', perRank: { damageReduction: 0.03, maxHealth: 10 }, glyph: '⚔' },
  { id: 'lam_preciso', branch: 'lamina', tier: 3, maxRank: 3, name: 'Golpe Preciso', description: '+3% de chance de crítico e +15% de dano crítico por rank.', perRank: { critChance: 0.03, critMultiplier: 0.15 }, glyph: '✕' },
  { id: 'lam_laminas', branch: 'lamina', tier: 4, maxRank: 2, name: 'Lâminas Etéreas', description: 'Aprende ou aprimora as Lâminas Etéreas e +5% de poder físico por rank.', ability: 'etherealBlades', perRank: { meleePower: 0.05 }, glyph: '⚚' },
  { id: 'lam_mestre', branch: 'lamina', tier: 5, maxRank: 1, name: 'Mestre da Lâmina Rúnica', description: '+12% de poder físico, +4% de roubo de vida e esquivas 15% mais baratas.', perRank: { meleePower: 0.12, lifeSteal: 0.04, dodgeCost: -0.15 }, requires: 'lam_preciso', glyph: '♛' },

  // ---------------- Égide ----------------
  { id: 'egi_vigor', branch: 'egide', tier: 0, maxRank: 3, name: 'Vigor do Selo', description: '+15 de vida máxima por rank.', perRank: { maxHealth: 15 }, glyph: '♥' },
  { id: 'egi_escudo', branch: 'egide', tier: 1, maxRank: 2, name: 'Escudo Aprimorado', description: 'Aprende ou aprimora o Escudo Mágico e +15% de força do escudo por rank.', ability: 'magicShield', perRank: { shieldPower: 0.15 }, glyph: '⛨' },
  { id: 'egi_fluxo', branch: 'egide', tier: 2, maxRank: 3, name: 'Fluxo Vital', description: '+0,6 de regeneração de vida e +0,8 de energia por rank.', perRank: { healthRegen: 0.6, energyRegen: 0.8 }, glyph: '❦' },
  { id: 'egi_correntes', branch: 'egide', tier: 3, maxRank: 2, name: 'Correntes Vinculantes', description: 'Aprende ou aprimora as Correntes Arcanas e reduz recargas em 3% por rank.', ability: 'arcaneChains', perRank: { cooldownReduction: 0.03 }, glyph: '⛓' },
  { id: 'egi_baluarte', branch: 'egide', tier: 4, maxRank: 3, name: 'Baluarte Arcano', description: '+4% de redução de dano e +10% de força do escudo por rank.', perRank: { damageReduction: 0.04, shieldPower: 0.1 }, glyph: '▣' },
  { id: 'egi_eterno', branch: 'egide', tier: 5, maxRank: 1, name: 'Guardião Eterno', description: '+40 de vida, +20 de energia e +5% de redução de dano.', perRank: { maxHealth: 40, maxEnergy: 20, damageReduction: 0.05 }, requires: 'egi_baluarte', glyph: '⌛' },

  // ---------------- Errante dos Céus ----------------
  { id: 'ceu_asas', branch: 'ceus', tier: 0, maxRank: 3, name: 'Asas de Éter', description: 'Voo 10% mais barato e 5% mais rápido por rank.', perRank: { flightCost: -0.1, flightSpeed: 0.05 }, glyph: '➶' },
  { id: 'ceu_passo', branch: 'ceus', tier: 1, maxRank: 3, name: 'Passo Leve', description: '+4% de velocidade e esquivas 10% mais baratas por rank.', perRank: { moveSpeed: 0.04, dodgeCost: -0.1 }, glyph: '≫' },
  { id: 'ceu_salto', branch: 'ceus', tier: 2, maxRank: 2, name: 'Salto Dimensional', description: 'Aprende ou aprimora o Teleporte Curto e reduz recargas em 2% por rank.', ability: 'blink', perRank: { cooldownReduction: 0.02 }, glyph: '⇝' },
  { id: 'ceu_reservas', branch: 'ceus', tier: 3, maxRank: 3, name: 'Reservas Celestes', description: '+12 de energia máxima e +0,6 de regeneração de energia por rank.', perRank: { maxEnergy: 12, energyRegen: 0.6 }, glyph: '✧' },
  { id: 'ceu_correntes_ar', branch: 'ceus', tier: 4, maxRank: 2, name: 'Correntes de Ar', description: 'Voo 10% mais rápido e 10% mais barato por rank.', perRank: { flightSpeed: 0.1, flightCost: -0.1 }, glyph: '〰' },
  { id: 'ceu_fenda', branch: 'ceus', tier: 5, maxRank: 1, name: 'Viajante das Fendas', description: 'Aprende ou aprimora a Fenda Dimensional, +5% de velocidade e voo 10% mais barato.', ability: 'dimensionalRift', perRank: { moveSpeed: 0.05, flightCost: -0.1 }, requires: 'ceu_correntes_ar', glyph: '◌' },
];

export const TALENT_BY_ID: Record<string, TalentDef> = Object.fromEntries(TALENTS.map((t) => [t.id, t]));

export function isTalentId(id: unknown): id is string {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(TALENT_BY_ID, id);
}

/** Pontos gastos num ramo. */
export function branchPoints(ranks: ReadonlyMap<string, number>, branch: TalentBranchId): number {
  let s = 0;
  for (const [id, r] of ranks) if (TALENT_BY_ID[id]?.branch === branch) s += r;
  return s;
}

/** Total de pontos gastos. */
export function spentPoints(ranks: ReadonlyMap<string, number>): number {
  let s = 0;
  for (const [id, r] of ranks) if (TALENT_BY_ID[id]) s += r;
  return s;
}

export type TalentBlockReason = 'unknown' | 'maxRank' | 'noPoints' | 'branchPoints' | 'requires' | 'level';

/**
 * Pode comprar mais 1 rank do talento? Pura. Retorna null se pode, ou o motivo.
 * Os pontos do ramo contam o que já foi gasto no ramo (exceto o próprio talento não importa:
 * os ranks do próprio talento não destravam a linha dele).
 */
export function checkTalent(id: string, ranks: ReadonlyMap<string, number>, freePoints: number, level: number): TalentBlockReason | null {
  const t = TALENT_BY_ID[id];
  if (!t) return 'unknown';
  const cur = ranks.get(id) ?? 0;
  if (cur >= t.maxRank) return 'maxRank';
  if (freePoints <= 0) return 'noPoints';
  if (t.levelReq && level < t.levelReq) return 'level';
  const need = TIER_POINTS[Math.min(t.tier, TIER_POINTS.length - 1)];
  if (branchPoints(ranks, t.branch) - cur < need) return 'branchPoints';
  if (t.requires && (ranks.get(t.requires) ?? 0) < 1) return 'requires';
  return null;
}

export const TALENT_BLOCK_TEXT: Record<TalentBlockReason, string> = {
  unknown: 'Talento desconhecido.',
  maxRank: 'Rank máximo alcançado.',
  noPoints: 'Sem pontos de talento.',
  branchPoints: 'Gaste mais pontos neste ramo.',
  requires: 'Requer o talento anterior.',
  level: 'Nível insuficiente.',
};

/** Soma os modificadores de todos os talentos (ranks × perRank) em `out`. */
export function talentMods(ranks: ReadonlyMap<string, number>, out: Record<string, number>): Record<string, number> {
  for (const [id, r] of ranks) {
    const t = TALENT_BY_ID[id];
    if (!t?.perRank || r <= 0) continue;
    for (const k in t.perRank) out[k] = (out[k] ?? 0) + (t.perRank as Record<string, number>)[k] * r;
  }
  return out;
}

/**
 * Valida/limpa ranks vindos de um save: remove ids desconhecidos, limita ao máximo e
 * descarta talentos cujos pré-requisitos não fecham (em ordem de linha).
 */
export function sanitizeTalentRanks(raw: Record<string, unknown>): Map<string, number> {
  const out = new Map<string, number>();
  const sorted = TALENTS.slice().sort((a, b) => a.tier - b.tier);
  for (const t of sorted) {
    const v = raw[t.id];
    if (typeof v !== 'number' || !isFinite(v)) continue;
    const r = Math.max(0, Math.min(t.maxRank, Math.floor(v)));
    if (r <= 0) continue;
    const need = TIER_POINTS[Math.min(t.tier, TIER_POINTS.length - 1)];
    if (branchPoints(out, t.branch) < need) continue;
    if (t.requires && (out.get(t.requires) ?? 0) < 1) continue;
    out.set(t.id, r);
  }
  return out;
}
