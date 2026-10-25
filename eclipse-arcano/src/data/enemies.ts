/**
 * Inimigos: TODOS os números de gameplay da IA de combate (vida, dano, alcance, tempos de
 * antecipação/impacto/recuperação, percepção, defesa, recompensas).
 *
 * Contrato C1 (ai → rpg): cada entrada tem `xp`, `gold: [mín, máx]` e `drops`.
 * O rpg ouve 'enemy:killed' (typeId) e concede as recompensas; a IA NÃO concede nada.
 * Contrato C2: os typeIds abaixo são usados pela narrativa (spawnEnemy).
 */
import type { DamageType, StatusApply, StatusId } from '../combat/Health';
import type { Faction } from '../core/Entity';

/** Esqueleto/modelo procedural. */
export type RigKind = 'humanoid' | 'construct' | 'golem' | 'wolf' | 'flyer' | 'pillar';

/** Personalidade de combate (decide posicionamento, recuo, uso de cobertura...). */
export type Archetype = 'duelist' | 'archer' | 'pack' | 'brute' | 'caster' | 'assassin' | 'flyer' | 'knight' | 'ravena' | 'static';

/** Animações de ataque procedurais (src/ai/rigs/poses.ts). */
export type AttackAnim =
  | 'slash'
  | 'slash2'
  | 'overhead'
  | 'thrust'
  | 'shieldBash'
  | 'spin'
  | 'bow'
  | 'cast'
  | 'castUp'
  | 'bite'
  | 'pounce'
  | 'howl'
  | 'smash'
  | 'slam'
  | 'sweep'
  | 'dive'
  | 'volley'
  | 'dualSlash'
  | 'dualCross'
  | 'smoke'
  | 'backstab'
  | 'teleport';

export interface ProjectileUse {
  /** Tipo visual/comportamental de Projectiles ('arrow', 'enemyOrb', 'crystalShard', 'fireball'...). */
  kind: string;
  speed: number;
  gravity?: number;
  count?: number;
  /** Abertura entre projéteis (graus). */
  spread?: number;
  radius?: number;
  explode?: number;
  /** Força de perseguição (0 = reto). */
  homing?: number;
  range?: number;
}

export interface AttackDef {
  id: string;
  anim: AttackAnim;
  /** melee: arco à frente; projectile; aoe: área em volta/à frente; leap/charge/dive: deslocamento com dano. */
  kind: 'melee' | 'projectile' | 'aoe' | 'leap' | 'charge' | 'dive' | 'buff' | 'special';
  damage: number;
  type: DamageType;
  /** Distância (m) ao alvo em que o ataque pode ser escolhido. */
  minRange: number;
  maxRange: number;
  /** Alcance do golpe (melee) ou raio (aoe). */
  reach: number;
  /** Arco do golpe (graus). */
  arc: number;
  /** Antecipação (s): postura + brilho; o jogador pode reagir. */
  windup: number;
  /** Duração da janela de impacto (s). */
  active: number;
  /** Recuperação (s): janela de abertura para o jogador. */
  recovery: number;
  cooldown: number;
  /** Peso na escolha ponderada. */
  weight: number;
  poise?: number;
  knockback?: number;
  /** Imbloqueável (telegraph vermelho). */
  unblockable?: boolean;
  /** Quebra-guarda: dano de postura alto contra quem bloqueia. */
  guardBreak?: boolean;
  /** Ataque forte: brilho + telegraph no chão. */
  heavy?: boolean;
  telegraph?: 'cone' | 'circle' | 'line' | 'ring';
  /** Avanço (m) durante o golpe. */
  lunge?: number;
  /** Combo: próximo ataque e chance de encadear. */
  next?: string;
  comboChance?: number;
  projectile?: ProjectileUse;
  statuses?: StatusApply[];
  /** Precisa de token de ataque corpo a corpo (padrão: melee/leap/charge). */
  token?: boolean;
  /** Só usado como contra-ataque (após bloqueio/aparo/esquiva). */
  counterOnly?: boolean;
  /** Só usado na sequência de um combo. */
  comboOnly?: boolean;
}

export interface DropDef {
  itemId: string;
  chance: number;
  qty?: [number, number];
}

export interface PerceptionDef {
  /** Distância de visão (m) e abertura do cone (graus). */
  sight: number;
  fov: number;
  /** Raio (m) em que "sente" o jogador mesmo sem vê-lo. */
  awareness: number;
  /** Multiplicador do raio dos sons. */
  hearing: number;
  /** Segundos lembrando a última posição antes de desistir. */
  memory: number;
  /** Distância máxima da origem antes de desistir da perseguição. */
  leash: number;
  /** Tempo (s) de reação ao detectar (alerta). */
  alertDelay: number;
  /** Raio (m) em que chama aliados ao entrar em alerta. */
  callAllies: number;
}

export interface DefenseDef {
  /** Chance de esquivar de um golpe corpo a corpo anunciado. */
  dodge: number;
  /** Chance de esquivar de um projétil que vai acertar. */
  dodgeProjectile: number;
  dodgeCooldown: number;
  dodgeDistance: number;
  /** Chance de levantar a guarda contra um golpe. */
  block: number;
  /** Chance de aparar (parry) em vez de só bloquear. */
  parry?: number;
  /** Chance de contra-atacar após bloquear/aparar com sucesso. */
  counter: number;
  /** Redução do bloqueio (0..1). */
  blockReduction?: number;
}

export interface EnemyDef {
  id: string;
  name: string;
  /** Descrição curta (bestiário/diário). */
  description: string;
  faction: Faction;
  rig: RigKind;
  /** Variante visual (src/ai/rigs/looks.ts). */
  look: string;
  scale: number;
  archetype: Archetype;
  level: number;
  elite?: boolean;
  /** Só criado por script/missão (não entra em zonas por padrão). */
  scripted?: boolean;
  hp: number;
  armor: number;
  resist: Partial<Record<DamageType, number>>;
  poise: number;
  poiseRegen: number;
  staggerTime: number;
  statusImmune?: StatusId[];
  radius: number;
  height: number;
  walk: number;
  run: number;
  strafe: number;
  /** Giro (rad/s). */
  turn: number;
  perception: PerceptionDef;
  /** Distância preferida de luta [mín, máx]. */
  preferredRange: [number, number];
  attacks: AttackDef[];
  defense: DefenseDef;
  /** Abaixo desta fração de vida tende a recuar/fugir. */
  retreatBelow?: number;
  /** Ponto fraco: golpes nas costas ('back') ou na frente ('front') multiplicam o dano. */
  weakPoint?: { side: 'back' | 'front'; mul: number };
  /** Superaquecimento (constructos): após N ataques pesados fica vulnerável. */
  overheat?: { after: number; duration: number; damageMul: number };
  /** Voa (altura preferida acima do chão). */
  flyHeight?: number;
  /** Regras especiais por tipo. */
  special?: {
    /** Uivo do alfa: chama/fortalece a matilha. */
    howl?: { cooldown: number; radius: number; empowered: number; duration: number; summon: number };
    /** Mago: teleporta quando cercado, escuda aliados. */
    teleportWhenSurrounded?: { count: number; radius: number; cooldown: number; distance: number };
    shieldAlly?: { amount: number; cooldown: number; radius: number };
    /** Espreitador/Ravena: furtividade (aproxima-se escondido). */
    stealth?: { opacity: number; revealRange: number };
    /** Ravena: bomba de fumaça, reforços e rendição. */
    smoke?: { cooldown: number; vanish: number; belowFraction: number };
    reinforcements?: { atFraction: number; types: string[] };
    surrenderAt?: number;
  };
  xp: number;
  gold: [number, number];
  drops: DropDef[];
}

// ---------------------------------------------------------------------------
// Percepção e defesa padrão (cópias ajustadas por tipo)
// ---------------------------------------------------------------------------
const PERC_HUMAN: PerceptionDef = { sight: 34, fov: 130, awareness: 4, hearing: 1, memory: 9, leash: 70, alertDelay: 0.45, callAllies: 22 };
const PERC_BEAST: PerceptionDef = { sight: 30, fov: 160, awareness: 7, hearing: 1.4, memory: 12, leash: 85, alertDelay: 0.3, callAllies: 30 };
const PERC_CONSTRUCT: PerceptionDef = { sight: 30, fov: 110, awareness: 3.5, hearing: 0.8, memory: 14, leash: 55, alertDelay: 0.7, callAllies: 26 };

const NO_DEF: DefenseDef = { dodge: 0, dodgeProjectile: 0, dodgeCooldown: 99, dodgeDistance: 0, block: 0, counter: 0 };

/** Fração de bloqueio padrão do Health (0,7). */
export const DEFAULT_BLOCK_REDUCTION = 0.7;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
const LIST: EnemyDef[] = [
  {
    id: 'corvo_saqueador',
    name: 'Corvo Saqueador',
    description: 'Saqueador dos Corvos com espada curta e escudo de tábuas. Bloqueia e devolve o golpe.',
    faction: 'bandit',
    rig: 'humanoid',
    look: 'saqueador',
    scale: 1,
    archetype: 'duelist',
    level: 2,
    hp: 90,
    armor: 2,
    resist: { arcane: -0.1 },
    poise: 34,
    poiseRegen: 14,
    staggerTime: 0.9,
    radius: 0.42,
    height: 1.8,
    walk: 1.7,
    run: 4.6,
    strafe: 2.1,
    turn: 7,
    perception: PERC_HUMAN,
    preferredRange: [2.2, 3.4],
    attacks: [
      { id: 'corte', anim: 'slash', kind: 'melee', damage: 9, type: 'physical', minRange: 0, maxRange: 2.9, reach: 2.4, arc: 100, windup: 0.42, active: 0.12, recovery: 0.55, cooldown: 1.2, weight: 3, poise: 12, knockback: 2, lunge: 0.6, next: 'corte2', comboChance: 0.45 },
      { id: 'corte2', anim: 'slash2', kind: 'melee', damage: 10, type: 'physical', minRange: 0, maxRange: 2.9, reach: 2.4, arc: 110, windup: 0.3, active: 0.12, recovery: 0.7, cooldown: 1.2, weight: 0, poise: 14, knockback: 2.5, lunge: 0.5, comboOnly: true },
      { id: 'pancada_escudo', anim: 'shieldBash', kind: 'melee', damage: 6, type: 'physical', minRange: 0, maxRange: 2.2, reach: 1.9, arc: 80, windup: 0.5, active: 0.1, recovery: 0.5, cooldown: 5, weight: 1, poise: 26, knockback: 6, guardBreak: true, lunge: 0.8 },
      { id: 'golpe_pesado', anim: 'overhead', kind: 'melee', damage: 16, type: 'physical', minRange: 0, maxRange: 3, reach: 2.6, arc: 60, windup: 0.85, active: 0.12, recovery: 0.85, cooldown: 6, weight: 1, poise: 24, knockback: 4, heavy: true, telegraph: 'cone', lunge: 0.9 },
      { id: 'riposta', anim: 'thrust', kind: 'melee', damage: 11, type: 'physical', minRange: 0, maxRange: 2.6, reach: 2.4, arc: 60, windup: 0.18, active: 0.1, recovery: 0.5, cooldown: 0, weight: 0, poise: 14, knockback: 2, lunge: 0.7, counterOnly: true, token: false },
    ],
    defense: { dodge: 0.15, dodgeProjectile: 0.15, dodgeCooldown: 3.5, dodgeDistance: 3, block: 0.5, counter: 0.6, blockReduction: 0.75 },
    retreatBelow: 0.2,
    xp: 25,
    gold: [4, 12],
    drops: [
      { itemId: 'pocao_vida_menor', chance: 0.18 },
      { itemId: 'minerio_ferroluz', chance: 0.15, qty: [1, 2] },
      { itemId: 'espada_ferro', chance: 0.03 },
    ],
  },
  {
    id: 'corva_arqueira',
    name: 'Corva Arqueira',
    description: 'Atiradora dos Corvos. Mantém distância, usa cobertura e dispara flechas em arco.',
    faction: 'bandit',
    rig: 'humanoid',
    look: 'arqueira',
    scale: 0.96,
    archetype: 'archer',
    level: 2,
    hp: 60,
    armor: 0,
    resist: {},
    poise: 22,
    poiseRegen: 12,
    staggerTime: 1,
    radius: 0.4,
    height: 1.74,
    walk: 1.8,
    run: 5,
    strafe: 2.6,
    turn: 8,
    perception: { ...PERC_HUMAN, sight: 46, fov: 140 },
    preferredRange: [12, 24],
    attacks: [
      { id: 'flecha', anim: 'bow', kind: 'projectile', damage: 8, type: 'physical', minRange: 4, maxRange: 42, reach: 0, arc: 0, windup: 0.75, active: 0.05, recovery: 0.45, cooldown: 1.6, weight: 3, poise: 8, projectile: { kind: 'arrow', speed: 34, gravity: 9, radius: 0.12, range: 70 }, token: false },
      { id: 'saraivada', anim: 'bow', kind: 'projectile', damage: 6, type: 'physical', minRange: 6, maxRange: 34, reach: 0, arc: 0, windup: 1.05, active: 0.05, recovery: 0.7, cooldown: 8, weight: 1, poise: 6, heavy: true, projectile: { kind: 'arrow', speed: 30, gravity: 9, count: 3, spread: 9, radius: 0.12, range: 60 }, token: false },
      { id: 'chute', anim: 'shieldBash', kind: 'melee', damage: 5, type: 'physical', minRange: 0, maxRange: 2, reach: 1.8, arc: 90, windup: 0.3, active: 0.1, recovery: 0.35, cooldown: 4, weight: 2, poise: 18, knockback: 7 },
    ],
    defense: { dodge: 0.35, dodgeProjectile: 0.3, dodgeCooldown: 3, dodgeDistance: 4, block: 0, counter: 0 },
    retreatBelow: 0.35,
    xp: 22,
    gold: [3, 10],
    drops: [
      { itemId: 'pocao_vida_menor', chance: 0.15 },
      { itemId: 'erva_lumen', chance: 0.2, qty: [1, 2] },
    ],
  },
  {
    id: 'lobo_sombrio',
    name: 'Lobo Sombrio',
    description: 'Fera de pelagem fumacenta tocada pela corrupção. Caça em matilha, flanqueia e recua ferido.',
    faction: 'wild',
    rig: 'wolf',
    look: 'lobo',
    scale: 1,
    archetype: 'pack',
    level: 2,
    hp: 55,
    armor: 0,
    resist: { void: 0.2, fire: -0.25 },
    poise: 20,
    poiseRegen: 14,
    staggerTime: 0.8,
    radius: 0.55,
    height: 1.0,
    walk: 2.2,
    run: 7.4,
    strafe: 4,
    turn: 9,
    perception: PERC_BEAST,
    preferredRange: [3.5, 6],
    attacks: [
      { id: 'mordida', anim: 'bite', kind: 'melee', damage: 7, type: 'physical', minRange: 0, maxRange: 2.4, reach: 2, arc: 70, windup: 0.32, active: 0.1, recovery: 0.45, cooldown: 1.4, weight: 3, poise: 8, knockback: 1, lunge: 0.9, statuses: [{ id: 'bleed', duration: 3, magnitude: 2, chance: 0.25 }] },
      { id: 'investida', anim: 'pounce', kind: 'leap', damage: 11, type: 'physical', minRange: 4, maxRange: 9, reach: 1.8, arc: 90, windup: 0.55, active: 0.45, recovery: 0.75, cooldown: 5, weight: 2, poise: 22, knockback: 5, heavy: true, telegraph: 'line' },
    ],
    defense: { dodge: 0.3, dodgeProjectile: 0.25, dodgeCooldown: 2.5, dodgeDistance: 3.5, block: 0, counter: 0 },
    retreatBelow: 0.3,
    xp: 18,
    gold: [0, 0],
    drops: [{ itemId: 'couro_lobo', chance: 0.6, qty: [1, 2] }, { itemId: 'carne_crua', chance: 0.45 }],
  },
  {
    id: 'alfa_lobo',
    name: 'Alfa dos Lobos Sombrios',
    description: 'Líder da matilha da toca. O uivo chama e fortalece os lobos ao redor.',
    faction: 'wild',
    rig: 'wolf',
    look: 'alfa',
    scale: 1.45,
    archetype: 'pack',
    level: 4,
    elite: true,
    hp: 230,
    armor: 2,
    resist: { void: 0.3, fire: -0.2 },
    poise: 60,
    poiseRegen: 16,
    staggerTime: 1,
    radius: 0.8,
    height: 1.45,
    walk: 2.4,
    run: 7.8,
    strafe: 4,
    turn: 7,
    perception: { ...PERC_BEAST, sight: 38, callAllies: 50 },
    preferredRange: [3, 6],
    attacks: [
      { id: 'mordida_alfa', anim: 'bite', kind: 'melee', damage: 13, type: 'physical', minRange: 0, maxRange: 3, reach: 2.6, arc: 80, windup: 0.4, active: 0.12, recovery: 0.5, cooldown: 1.6, weight: 3, poise: 16, knockback: 2, lunge: 1, next: 'mordida_dupla', comboChance: 0.4, statuses: [{ id: 'bleed', duration: 4, magnitude: 3, chance: 0.4 }] },
      { id: 'mordida_dupla', anim: 'bite', kind: 'melee', damage: 10, type: 'physical', minRange: 0, maxRange: 3, reach: 2.6, arc: 80, windup: 0.22, active: 0.12, recovery: 0.7, cooldown: 1.6, weight: 0, poise: 14, knockback: 2, lunge: 0.8, comboOnly: true },
      { id: 'salto_alfa', anim: 'pounce', kind: 'leap', damage: 18, type: 'physical', minRange: 4, maxRange: 11, reach: 2.4, arc: 100, windup: 0.7, active: 0.5, recovery: 0.9, cooldown: 6, weight: 2, poise: 34, knockback: 7, heavy: true, unblockable: true, telegraph: 'line' },
      { id: 'uivo', anim: 'howl', kind: 'buff', damage: 0, type: 'physical', minRange: 0, maxRange: 30, reach: 0, arc: 0, windup: 0.6, active: 1.2, recovery: 0.4, cooldown: 22, weight: 2, token: false },
    ],
    defense: { dodge: 0.25, dodgeProjectile: 0.2, dodgeCooldown: 3, dodgeDistance: 4, block: 0, counter: 0 },
    special: { howl: { cooldown: 22, radius: 50, empowered: 0.3, duration: 12, summon: 2 } },
    xp: 120,
    gold: [10, 25],
    drops: [
      { itemId: 'couro_lobo', chance: 1, qty: [2, 4] },
      { itemId: 'carne_crua', chance: 1, qty: [1, 2] },
      { itemId: 'fragmento_eter', chance: 0.5, qty: [1, 2] },
      { itemId: 'amuleto_floresta', chance: 0.08 },
    ],
  },
  {
    id: 'automato_sentinela',
    name: 'Autômato Sentinela',
    description: 'Guardião de bronze rúnico. Lento e pesado; a armadura resiste a golpes físicos, mas o raio o desarranja. O núcleo fica nas costas.',
    faction: 'construct',
    rig: 'construct',
    look: 'sentinela',
    scale: 1.15,
    archetype: 'brute',
    level: 3,
    hp: 260,
    armor: 4,
    resist: { physical: 0.35, lightning: -0.5, fire: 0.2, frost: -0.1 },
    poise: 70,
    poiseRegen: 12,
    staggerTime: 1.4,
    statusImmune: ['bleed'],
    radius: 0.62,
    height: 2.3,
    walk: 1.3,
    run: 3.2,
    strafe: 1.3,
    turn: 3.2,
    perception: PERC_CONSTRUCT,
    preferredRange: [2.4, 3.6],
    attacks: [
      { id: 'martelada', anim: 'smash', kind: 'melee', damage: 18, type: 'physical', minRange: 0, maxRange: 3.4, reach: 3, arc: 70, windup: 0.95, active: 0.15, recovery: 1.0, cooldown: 2.4, weight: 3, poise: 30, knockback: 5, heavy: true, telegraph: 'cone', lunge: 0.4 },
      { id: 'varredura', anim: 'sweep', kind: 'melee', damage: 14, type: 'physical', minRange: 0, maxRange: 3.6, reach: 3.3, arc: 200, windup: 1.1, active: 0.2, recovery: 1.1, cooldown: 6, weight: 1.5, poise: 26, knockback: 6, heavy: true, unblockable: true, telegraph: 'cone' },
      { id: 'pisao', anim: 'slam', kind: 'aoe', damage: 20, type: 'physical', minRange: 0, maxRange: 3.2, reach: 3.6, arc: 360, windup: 1.2, active: 0.15, recovery: 1.3, cooldown: 9, weight: 1, poise: 34, knockback: 7, heavy: true, unblockable: true, telegraph: 'circle' },
    ],
    defense: { ...NO_DEF },
    weakPoint: { side: 'back', mul: 1.5 },
    overheat: { after: 3, duration: 3.2, damageMul: 1.35 },
    xp: 45,
    gold: [6, 16],
    drops: [
      { itemId: 'engrenagem_antiga', chance: 0.7, qty: [1, 3] },
      { itemId: 'nucleo_automato', chance: 0.2 },
      { itemId: 'fragmento_eter', chance: 0.25 },
    ],
  },
  {
    id: 'automato_errante',
    name: 'Autômato Errante',
    description: 'Constructo de guerra desgarrado, alvo de contrato. Combina marteladas, um disparo rúnico e um avanço esmagador.',
    faction: 'construct',
    rig: 'construct',
    look: 'errante',
    scale: 1.4,
    archetype: 'brute',
    level: 5,
    elite: true,
    hp: 540,
    armor: 6,
    resist: { physical: 0.35, lightning: -0.45, fire: 0.25, arcane: 0.1 },
    poise: 120,
    poiseRegen: 14,
    staggerTime: 1.6,
    statusImmune: ['bleed'],
    radius: 0.8,
    height: 2.8,
    walk: 1.5,
    run: 3.8,
    strafe: 1.5,
    turn: 3.4,
    perception: { ...PERC_CONSTRUCT, sight: 38, leash: 70 },
    preferredRange: [2.6, 4],
    attacks: [
      { id: 'martelada_errante', anim: 'smash', kind: 'melee', damage: 24, type: 'physical', minRange: 0, maxRange: 3.8, reach: 3.4, arc: 80, windup: 0.85, active: 0.15, recovery: 0.85, cooldown: 2.2, weight: 3, poise: 36, knockback: 6, heavy: true, telegraph: 'cone', lunge: 0.5, next: 'varredura_errante', comboChance: 0.35 },
      { id: 'varredura_errante', anim: 'sweep', kind: 'melee', damage: 18, type: 'physical', minRange: 0, maxRange: 4, reach: 3.6, arc: 220, windup: 0.75, active: 0.2, recovery: 1.1, cooldown: 5, weight: 1, poise: 30, knockback: 7, heavy: true, unblockable: true, telegraph: 'cone' },
      { id: 'disparo_runico', anim: 'cast', kind: 'projectile', damage: 16, type: 'lightning', minRange: 6, maxRange: 30, reach: 0, arc: 0, windup: 0.9, active: 0.05, recovery: 0.6, cooldown: 5, weight: 2, poise: 14, heavy: true, projectile: { kind: 'lightningBolt', speed: 24, radius: 0.3, range: 40, homing: 1.2 }, token: false },
      { id: 'avanco', anim: 'smash', kind: 'charge', damage: 22, type: 'physical', minRange: 7, maxRange: 18, reach: 2, arc: 120, windup: 0.9, active: 1.0, recovery: 1.2, cooldown: 9, weight: 1.5, poise: 40, knockback: 9, heavy: true, unblockable: true, telegraph: 'line' },
    ],
    defense: { ...NO_DEF },
    weakPoint: { side: 'back', mul: 1.5 },
    overheat: { after: 3, duration: 3.5, damageMul: 1.4 },
    xp: 200,
    gold: [30, 60],
    drops: [
      { itemId: 'nucleo_automato', chance: 1 },
      { itemId: 'engrenagem_antiga', chance: 1, qty: [2, 4] },
      { itemId: 'cristal_arcano', chance: 0.4 },
    ],
  },
  {
    id: 'mago_corrompido',
    name: 'Mago Corrompido',
    description: 'Conjurador tomado pela corrupção do pântano. Lança orbes, escapa por teleporte quando cercado e protege aliados com escudos.',
    faction: 'corrupted',
    rig: 'humanoid',
    look: 'mago',
    scale: 1,
    archetype: 'caster',
    level: 3,
    hp: 85,
    armor: 0,
    resist: { void: 0.4, arcane: 0.15, physical: -0.1, fire: -0.15 },
    poise: 24,
    poiseRegen: 12,
    staggerTime: 1,
    radius: 0.4,
    height: 1.82,
    walk: 1.6,
    run: 4.2,
    strafe: 2.2,
    turn: 7,
    perception: { ...PERC_HUMAN, sight: 40 },
    preferredRange: [10, 18],
    attacks: [
      { id: 'orbe', anim: 'cast', kind: 'projectile', damage: 10, type: 'void', minRange: 3, maxRange: 32, reach: 0, arc: 0, windup: 0.6, active: 0.05, recovery: 0.5, cooldown: 1.8, weight: 3, poise: 8, projectile: { kind: 'enemyOrb', speed: 17, radius: 0.32, range: 40, homing: 1.4 }, token: false },
      { id: 'orbes_triplos', anim: 'castUp', kind: 'projectile', damage: 8, type: 'void', minRange: 4, maxRange: 28, reach: 0, arc: 0, windup: 1.0, active: 0.05, recovery: 0.8, cooldown: 7, weight: 1.5, poise: 6, heavy: true, projectile: { kind: 'enemyOrb', speed: 15, count: 3, spread: 18, radius: 0.3, range: 36, homing: 0.8 }, token: false },
      { id: 'pulso_corrompido', anim: 'castUp', kind: 'aoe', damage: 12, type: 'void', minRange: 0, maxRange: 3.5, reach: 4, arc: 360, windup: 0.9, active: 0.1, recovery: 0.8, cooldown: 7, weight: 2, poise: 20, knockback: 8, heavy: true, unblockable: true, telegraph: 'circle', statuses: [{ id: 'slow', duration: 2, magnitude: 0.4 }] },
      { id: 'teleporte', anim: 'teleport', kind: 'special', damage: 0, type: 'void', minRange: 0, maxRange: 6, reach: 0, arc: 0, windup: 0.35, active: 0.1, recovery: 0.3, cooldown: 9, weight: 0, token: false },
    ],
    defense: { dodge: 0.1, dodgeProjectile: 0.2, dodgeCooldown: 4, dodgeDistance: 3, block: 0, counter: 0 },
    retreatBelow: 0.4,
    special: {
      teleportWhenSurrounded: { count: 1, radius: 4, cooldown: 8, distance: 11 },
      shieldAlly: { amount: 40, cooldown: 12, radius: 18 },
    },
    xp: 40,
    gold: [6, 18],
    drops: [
      { itemId: 'pocao_energia', chance: 0.2 },
      { itemId: 'fragmento_eter', chance: 0.35, qty: [1, 2] },
      { itemId: 'cristal_arcano', chance: 0.1 },
    ],
  },
  {
    id: 'cavaleiro_encantado',
    name: 'Cavaleiro Encantado',
    description: 'Armadura vazia animada por runas antigas. Guarda alta, apara golpes e encadeia três cortes.',
    faction: 'construct',
    rig: 'humanoid',
    look: 'cavaleiro',
    scale: 1.12,
    archetype: 'knight',
    level: 5,
    elite: true,
    hp: 420,
    armor: 5,
    resist: { physical: 0.25, arcane: 0.2, lightning: -0.3, void: 0.1 },
    poise: 90,
    poiseRegen: 18,
    staggerTime: 1.2,
    statusImmune: ['bleed'],
    radius: 0.48,
    height: 2.05,
    walk: 1.6,
    run: 4.4,
    strafe: 2,
    turn: 6,
    perception: { ...PERC_HUMAN, sight: 36, leash: 55 },
    preferredRange: [2.4, 3.6],
    attacks: [
      { id: 'corte_1', anim: 'slash', kind: 'melee', damage: 12, type: 'physical', minRange: 0, maxRange: 3.2, reach: 2.9, arc: 100, windup: 0.45, active: 0.12, recovery: 0.4, cooldown: 2, weight: 3, poise: 16, knockback: 2, lunge: 0.8, next: 'corte_2', comboChance: 0.85 },
      { id: 'corte_2', anim: 'slash2', kind: 'melee', damage: 13, type: 'physical', minRange: 0, maxRange: 3.2, reach: 2.9, arc: 110, windup: 0.32, active: 0.12, recovery: 0.4, cooldown: 2, weight: 0, poise: 16, knockback: 2, lunge: 0.7, next: 'corte_3', comboChance: 0.75, comboOnly: true },
      { id: 'corte_3', anim: 'overhead', kind: 'melee', damage: 20, type: 'physical', minRange: 0, maxRange: 3.4, reach: 3.1, arc: 60, windup: 0.55, active: 0.14, recovery: 1.1, cooldown: 2, weight: 0, poise: 30, knockback: 5, heavy: true, telegraph: 'cone', lunge: 1, comboOnly: true },
      { id: 'estocada_runica', anim: 'thrust', kind: 'melee', damage: 18, type: 'arcane', minRange: 2.5, maxRange: 6, reach: 5.2, arc: 30, windup: 0.8, active: 0.15, recovery: 0.9, cooldown: 7, weight: 1.5, poise: 26, knockback: 4, heavy: true, unblockable: true, telegraph: 'line', lunge: 2.6 },
      { id: 'contragolpe', anim: 'slash2', kind: 'melee', damage: 16, type: 'physical', minRange: 0, maxRange: 3, reach: 2.8, arc: 120, windup: 0.16, active: 0.12, recovery: 0.6, cooldown: 0, weight: 0, poise: 22, knockback: 3, lunge: 0.6, counterOnly: true, token: false },
    ],
    defense: { dodge: 0.05, dodgeProjectile: 0.1, dodgeCooldown: 5, dodgeDistance: 2.5, block: 0.6, parry: 0.4, counter: 0.85, blockReduction: 0.85 },
    xp: 160,
    gold: [25, 50],
    drops: [
      { itemId: 'cristal_arcano', chance: 0.6, qty: [1, 2] },
      { itemId: 'lanca_guarda', chance: 0.15 },
      { itemId: 'anel_runico', chance: 0.12 },
      { itemId: 'pocao_vida', chance: 0.4 },
    ],
  },
  {
    id: 'espreitador',
    name: 'Espreitador',
    description: 'Assassino corrompido que se aproxima envolto em sombras, golpeia pelas costas e some de novo.',
    faction: 'corrupted',
    rig: 'humanoid',
    look: 'espreitador',
    scale: 0.95,
    archetype: 'assassin',
    level: 3,
    hp: 70,
    armor: 0,
    resist: { void: 0.35, arcane: -0.2 },
    poise: 22,
    poiseRegen: 16,
    staggerTime: 0.8,
    radius: 0.38,
    height: 1.72,
    walk: 2,
    run: 6.4,
    strafe: 3.4,
    turn: 10,
    perception: { ...PERC_HUMAN, sight: 32, fov: 150 },
    preferredRange: [5, 8],
    attacks: [
      { id: 'golpe_rapido', anim: 'dualSlash', kind: 'melee', damage: 8, type: 'physical', minRange: 0, maxRange: 2.4, reach: 2.1, arc: 90, windup: 0.26, active: 0.1, recovery: 0.35, cooldown: 1.2, weight: 3, poise: 8, knockback: 1, lunge: 0.8, next: 'golpe_rapido_2', comboChance: 0.6 },
      { id: 'golpe_rapido_2', anim: 'dualCross', kind: 'melee', damage: 9, type: 'physical', minRange: 0, maxRange: 2.4, reach: 2.1, arc: 100, windup: 0.2, active: 0.1, recovery: 0.6, cooldown: 1.2, weight: 0, poise: 8, knockback: 1.5, lunge: 0.6, comboOnly: true, statuses: [{ id: 'bleed', duration: 3, magnitude: 2.5, chance: 0.5 }] },
      { id: 'apunhalada', anim: 'backstab', kind: 'melee', damage: 18, type: 'physical', minRange: 0, maxRange: 2.6, reach: 2.2, arc: 70, windup: 0.4, active: 0.1, recovery: 0.5, cooldown: 6, weight: 2, poise: 20, knockback: 2, lunge: 1.2 },
      { id: 'salto_sombrio', anim: 'pounce', kind: 'leap', damage: 12, type: 'void', minRange: 4, maxRange: 9, reach: 1.8, arc: 90, windup: 0.45, active: 0.4, recovery: 0.6, cooldown: 5, weight: 1.5, poise: 14, knockback: 3, telegraph: 'line' },
    ],
    defense: { dodge: 0.45, dodgeProjectile: 0.4, dodgeCooldown: 2.2, dodgeDistance: 4.5, block: 0, counter: 0.5 },
    retreatBelow: 0.3,
    special: { stealth: { opacity: 0.22, revealRange: 6 } },
    xp: 35,
    gold: [4, 14],
    drops: [
      { itemId: 'pocao_vida_menor', chance: 0.2 },
      { itemId: 'fragmento_eter', chance: 0.25 },
    ],
  },
  {
    id: 'corvo_cristal',
    name: 'Corvo de Cristal',
    description: 'Ave de penas cristalinas que guarda as ruínas. Mergulha sobre quem voa e dispara estilhaços.',
    faction: 'construct',
    rig: 'flyer',
    look: 'corvo_cristal',
    scale: 1,
    archetype: 'flyer',
    level: 3,
    hp: 45,
    armor: 0,
    resist: { physical: 0.15, lightning: -0.4, arcane: -0.1 },
    poise: 14,
    poiseRegen: 10,
    staggerTime: 0.8,
    radius: 0.6,
    height: 0.8,
    walk: 6,
    run: 12,
    strafe: 7,
    turn: 5,
    perception: { ...PERC_BEAST, sight: 44, fov: 300, leash: 90 },
    preferredRange: [8, 14],
    flyHeight: 9,
    attacks: [
      { id: 'mergulho', anim: 'dive', kind: 'dive', damage: 11, type: 'physical', minRange: 3, maxRange: 26, reach: 1.6, arc: 360, windup: 0.6, active: 1.4, recovery: 1.2, cooldown: 4, weight: 3, poise: 16, knockback: 5, heavy: true, token: false },
      { id: 'estilhacos', anim: 'volley', kind: 'projectile', damage: 6, type: 'physical', minRange: 5, maxRange: 30, reach: 0, arc: 0, windup: 0.55, active: 0.05, recovery: 0.6, cooldown: 3.5, weight: 2, poise: 6, projectile: { kind: 'crystalShard', speed: 26, count: 3, spread: 12, radius: 0.15, range: 40 }, token: false },
    ],
    defense: { dodge: 0, dodgeProjectile: 0.35, dodgeCooldown: 2.5, dodgeDistance: 4, block: 0, counter: 0 },
    xp: 20,
    gold: [0, 4],
    drops: [{ itemId: 'cristal_arcano', chance: 0.18 }, { itemId: 'fragmento_eter', chance: 0.25 }],
  },
  {
    id: 'golem_ruinas',
    name: 'Golem das Ruínas',
    description: 'Colosso de pedra e éter adormecido sob as ruínas. Muito lento, mas cada golpe abala o chão.',
    faction: 'construct',
    rig: 'golem',
    look: 'golem',
    scale: 1.6,
    archetype: 'brute',
    level: 4,
    hp: 620,
    armor: 8,
    resist: { physical: 0.4, fire: 0.3, frost: 0.2, lightning: -0.2, arcane: -0.25 },
    poise: 160,
    poiseRegen: 10,
    staggerTime: 1.8,
    statusImmune: ['bleed', 'burn'],
    radius: 1.1,
    height: 3.6,
    walk: 1.1,
    run: 2.4,
    strafe: 1,
    turn: 2.2,
    perception: { ...PERC_CONSTRUCT, sight: 28, fov: 120, leash: 45 },
    preferredRange: [3, 5],
    attacks: [
      { id: 'socao', anim: 'smash', kind: 'melee', damage: 26, type: 'physical', minRange: 0, maxRange: 4.6, reach: 4.2, arc: 70, windup: 1.2, active: 0.15, recovery: 1.2, cooldown: 2.8, weight: 3, poise: 40, knockback: 8, heavy: true, telegraph: 'cone', lunge: 0.4 },
      { id: 'terremoto', anim: 'slam', kind: 'aoe', damage: 30, type: 'physical', minRange: 0, maxRange: 6, reach: 7, arc: 360, windup: 1.5, active: 0.2, recovery: 1.6, cooldown: 8, weight: 2, poise: 50, knockback: 10, heavy: true, unblockable: true, telegraph: 'circle' },
      { id: 'pedregulho', anim: 'castUp', kind: 'projectile', damage: 22, type: 'physical', minRange: 8, maxRange: 30, reach: 0, arc: 0, windup: 1.3, active: 0.05, recovery: 1.0, cooldown: 7, weight: 1.5, poise: 30, heavy: true, projectile: { kind: 'boulder', speed: 18, gravity: 7, radius: 0.7, explode: 3.2, range: 40 }, token: false },
    ],
    defense: { ...NO_DEF },
    weakPoint: { side: 'back', mul: 1.5 },
    xp: 90,
    gold: [12, 30],
    drops: [
      { itemId: 'cristal_arcano', chance: 0.5, qty: [1, 2] },
      { itemId: 'minerio_ferroluz', chance: 0.6, qty: [2, 4] },
      { itemId: 'fragmento_eter', chance: 0.5 },
    ],
  },
  {
    id: 'cacador_furtivo',
    name: 'Caçador Furtivo',
    description: 'Caçador ilegal da Floresta de Lúmen. Atira de longe e foge quando encurralado.',
    faction: 'bandit',
    rig: 'humanoid',
    look: 'cacador',
    scale: 1,
    archetype: 'archer',
    level: 2,
    hp: 70,
    armor: 1,
    resist: {},
    poise: 26,
    poiseRegen: 12,
    staggerTime: 1,
    radius: 0.42,
    height: 1.8,
    walk: 1.7,
    run: 4.8,
    strafe: 2.4,
    turn: 7,
    perception: { ...PERC_HUMAN, sight: 44 },
    preferredRange: [10, 22],
    attacks: [
      { id: 'flecha_cacador', anim: 'bow', kind: 'projectile', damage: 10, type: 'physical', minRange: 4, maxRange: 40, reach: 0, arc: 0, windup: 0.85, active: 0.05, recovery: 0.5, cooldown: 1.8, weight: 3, poise: 10, projectile: { kind: 'arrow', speed: 36, gravity: 9, radius: 0.12, range: 70 }, token: false },
      { id: 'flecha_presa', anim: 'bow', kind: 'projectile', damage: 7, type: 'physical', minRange: 5, maxRange: 30, reach: 0, arc: 0, windup: 1.1, active: 0.05, recovery: 0.6, cooldown: 9, weight: 1, poise: 6, heavy: true, projectile: { kind: 'arrow', speed: 32, gravity: 9, radius: 0.12, range: 60 }, statuses: [{ id: 'slow', duration: 3, magnitude: 0.45 }], token: false },
      { id: 'faca', anim: 'thrust', kind: 'melee', damage: 8, type: 'physical', minRange: 0, maxRange: 2.2, reach: 2, arc: 70, windup: 0.35, active: 0.1, recovery: 0.45, cooldown: 2, weight: 2, poise: 10, knockback: 2, lunge: 0.5 },
    ],
    defense: { dodge: 0.3, dodgeProjectile: 0.25, dodgeCooldown: 3, dodgeDistance: 4, block: 0, counter: 0 },
    retreatBelow: 0.35,
    xp: 28,
    gold: [6, 18],
    drops: [
      { itemId: 'couro_lobo', chance: 0.4, qty: [1, 2] },
      { itemId: 'pocao_vida_menor', chance: 0.2 },
    ],
  },
  {
    id: 'ravena',
    name: 'Ravena, a Corva',
    description: 'Líder dos Corvos. Duas lâminas, reflexos de sobrevivente, bombas de fumaça e reforços sempre por perto.',
    faction: 'bandit',
    rig: 'humanoid',
    look: 'ravena',
    scale: 1,
    archetype: 'ravena',
    level: 5,
    elite: true,
    scripted: true,
    hp: 650,
    armor: 2,
    resist: { physical: 0.1, void: 0.1 },
    poise: 70,
    poiseRegen: 22,
    staggerTime: 0.9,
    radius: 0.42,
    height: 1.78,
    walk: 2,
    run: 6,
    strafe: 3.6,
    turn: 11,
    perception: { ...PERC_HUMAN, sight: 40, leash: 60, callAllies: 40 },
    preferredRange: [2.4, 4.5],
    attacks: [
      { id: 'lamina_1', anim: 'dualSlash', kind: 'melee', damage: 9, type: 'physical', minRange: 0, maxRange: 2.8, reach: 2.4, arc: 110, windup: 0.3, active: 0.1, recovery: 0.3, cooldown: 1.1, weight: 3, poise: 10, knockback: 1, lunge: 0.8, next: 'lamina_2', comboChance: 0.75 },
      { id: 'lamina_2', anim: 'dualCross', kind: 'melee', damage: 10, type: 'physical', minRange: 0, maxRange: 2.8, reach: 2.4, arc: 120, windup: 0.22, active: 0.1, recovery: 0.3, cooldown: 1.1, weight: 0, poise: 10, knockback: 1.5, lunge: 0.7, next: 'lamina_3', comboChance: 0.55, comboOnly: true },
      { id: 'lamina_3', anim: 'spin', kind: 'melee', damage: 14, type: 'physical', minRange: 0, maxRange: 2.8, reach: 2.6, arc: 360, windup: 0.5, active: 0.16, recovery: 0.8, cooldown: 1.1, weight: 0, poise: 18, knockback: 4, heavy: true, telegraph: 'circle', comboOnly: true },
      { id: 'estocada_corva', anim: 'thrust', kind: 'melee', damage: 15, type: 'physical', minRange: 3, maxRange: 7, reach: 6, arc: 40, windup: 0.6, active: 0.15, recovery: 0.7, cooldown: 6, weight: 1.5, poise: 20, knockback: 3, heavy: true, unblockable: true, telegraph: 'line', lunge: 3.5 },
      { id: 'adagas', anim: 'volley', kind: 'projectile', damage: 7, type: 'physical', minRange: 6, maxRange: 22, reach: 0, arc: 0, windup: 0.45, active: 0.05, recovery: 0.5, cooldown: 5, weight: 1.5, poise: 6, projectile: { kind: 'crystalShard', speed: 30, count: 3, spread: 10, radius: 0.12, range: 30 }, token: false },
      { id: 'contra_corva', anim: 'dualCross', kind: 'melee', damage: 13, type: 'physical', minRange: 0, maxRange: 2.8, reach: 2.5, arc: 120, windup: 0.14, active: 0.1, recovery: 0.45, cooldown: 0, weight: 0, poise: 16, knockback: 2, lunge: 0.8, counterOnly: true, token: false },
      { id: 'fumaca', anim: 'smoke', kind: 'special', damage: 0, type: 'physical', minRange: 0, maxRange: 40, reach: 0, arc: 0, windup: 0.3, active: 0.1, recovery: 0.2, cooldown: 14, weight: 0, token: false },
    ],
    defense: { dodge: 0.55, dodgeProjectile: 0.5, dodgeCooldown: 1.6, dodgeDistance: 4.5, block: 0.35, parry: 0.3, counter: 0.8, blockReduction: 0.8 },
    special: {
      smoke: { cooldown: 14, vanish: 2.2, belowFraction: 0.85 },
      reinforcements: { atFraction: 0.5, types: ['corvo_saqueador', 'corvo_saqueador', 'corva_arqueira'] },
      surrenderAt: 0.15,
    },
    xp: 300,
    gold: [40, 80],
    drops: [{ itemId: 'pocao_vida', chance: 0.5 }],
  },
  {
    // Pilar de cristal da fase 2 do Guardião (criado pela luta do chefe).
    id: 'pilar_cristal',
    name: 'Pilar de Cristal',
    description: 'Pilar rúnico que alimenta o escudo do Guardião. Fraco a raios.',
    faction: 'construct',
    rig: 'pillar',
    look: 'pilar',
    scale: 1,
    archetype: 'static',
    level: 5,
    scripted: true,
    hp: 140,
    armor: 0,
    resist: { physical: 0.2, lightning: -0.75, arcane: -0.1, void: 0.3, fire: 0.3 },
    poise: 9999,
    poiseRegen: 0,
    staggerTime: 0,
    statusImmune: ['stun', 'root', 'slow', 'timeSlow', 'bleed', 'burn'],
    radius: 1.2,
    height: 5,
    walk: 0,
    run: 0,
    strafe: 0,
    turn: 0,
    perception: { ...PERC_CONSTRUCT, sight: 0, fov: 0, awareness: 0, callAllies: 0 },
    preferredRange: [0, 0],
    attacks: [],
    defense: { ...NO_DEF },
    xp: 10,
    gold: [0, 0],
    drops: [{ itemId: 'cristal_arcano', chance: 0.3 }],
  },
];

export const ENEMIES: Record<string, EnemyDef> = Object.fromEntries(LIST.map((e) => [e.id, e]));
export const ENEMY_IDS: string[] = LIST.map((e) => e.id);

/** Definição pelo id (undefined se não existir). */
export function getEnemyDef(id: string): EnemyDef | undefined {
  return ENEMIES[id];
}

// ---------------------------------------------------------------------------
// Regras gerais da IA de combate (números globais)
// ---------------------------------------------------------------------------
export const AI_RULES = {
  /** Máximo de inimigos atacando o MESMO alvo em corpo a corpo ao mesmo tempo. */
  meleeTokens: 2,
  /** Máximo de atiradores disparando ao mesmo tempo contra o mesmo alvo. */
  rangedTokens: 3,
  /** Token expira se não for devolvido (segurança). */
  tokenTimeout: 4,
  /** Intervalo (s) entre checagens de visão (por inimigo, escalonado). */
  sightInterval: 0.22,
  /** Intervalo (s) entre decisões táticas. */
  thinkInterval: 0.3,
  /** Sons: raio (m) base de cada evento, multiplicado por `perception.hearing`. */
  hearing: { cast: 26, damage: 18, alarm: 1, melee: 10, footstepRun: 6 },
  /** Atraso (s) de reação humana a um golpe do jogador (esquiva/bloqueio). */
  reactionDelay: [0.08, 0.2] as [number, number],
  /** Tempo de bloqueio mantido (s). */
  blockHold: 0.7,
  /** Janela de aparo (s) ao levantar a guarda. */
  parryWindow: 0.25,
  /** Esquiva: duração (s) e i-frames. */
  dodgeTime: 0.42,
  dodgeIframes: 0.25,
  /** À noite a visão cai para esta fração. */
  nightSight: 0.7,
  /** Inimigos desistem e voltam para casa regenerando vida. */
  returnRegen: 0.15,
  /** Distância (m) do jogador além da qual inimigos não únicos são removidos. */
  despawnDistance: 260,
  /** Barras de vida: distância (m) máxima de exibição e tempo após o último dano. */
  barRange: 40,
  barLinger: 6,
  /** Adaptação ao estilo do jogador: decaimento por segundo e pesos. */
  adapt: { decay: 0.015, blockGain: 0.08, rangedGain: 0.06, repeatGain: 0.2, repeatDecay: 0.05 },
  /** Separação entre inimigos (m). */
  separation: 1.3,
  /** Inimigos "circulam" (strafe) a esta velocidade relativa enquanto esperam token. */
  circleSpeed: 0.75,
};

/**
 * Navegação em campo aberto (src/ai/fieldNav.ts): A* numa grade local quando a reta até o
 * objetivo está bloqueada (rochas, ruínas, muros, água funda).
 */
export const FIELD_NAV = {
  /** Tamanho da célula (m). */
  cell: 1,
  /** Folga (m) em volta do início e do objetivo. */
  margin: 8,
  /** Lado máximo da grade (células): objetivo mais longe → caminho parcial até a borda. */
  maxCells: 72,
  /** Teto de células expandidas por busca. */
  maxExpand: 2600,
  /** Intervalo (s) entre reavaliações da rota por inimigo. */
  recheck: 1.2,
  /** Buscas por quadro (todos os inimigos). */
  perFrame: 1,
  /** Folga (m) somada ao raio do inimigo ao marcar células bloqueadas. */
  clearance: 0.15,
  /** Profundidade (m) de água que bloqueia. */
  deepWater: 1,
};
