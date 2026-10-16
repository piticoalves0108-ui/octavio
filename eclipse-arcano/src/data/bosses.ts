/**
 * Chefes: números da luta, fases e recompensas (contrato C1/C4).
 * O rpg lê `xp`, `gold` e `drops` ao ouvir 'enemy:killed' com o typeId do chefe.
 */
import type { DamageType } from '../combat/Health';
import type { DropDef } from './enemies';

export interface BossAttackNumbers {
  damage: number;
  type: DamageType;
  windup: number;
  recovery: number;
  cooldown: number;
  poise?: number;
  knockback?: number;
}

export interface BossDef {
  id: string;
  name: string;
  /** Título exibido na barra (ex.: "Guardião Mecânico das Ruínas"). */
  title: string;
  /** História curta (diário/bestiário). */
  lore: string;
  hp: number;
  armor: number;
  resist: Partial<Record<DamageType, number>>;
  radius: number;
  height: number;
  scale: number;
  walk: number;
  run: number;
  turn: number;
  poise: number;
  /** Frações de vida em que começam as fases 2 e 3. */
  phaseAt: [number, number];
  /** Multiplicador de lentidão recebido (sofre slow reduzido). */
  slowResist: number;
  xp: number;
  gold: [number, number];
  drops: DropDef[];
}

export const GUARDIAN: BossDef & {
  sweep: BossAttackNumbers & { radius: number; arc: number };
  stomp: BossAttackNumbers & { ringSpeed: number; ringWidth: number; maxRadius: number; jumpClear: number };
  charge: BossAttackNumbers & { length: number; width: number; speed: number; wallStun: number };
  pillars: { hp: number; shieldMul: number; riseTime: number };
  laser: BossAttackNumbers & { duration: number; turnSpeed: number; length: number; width: number; tick: number; height: number };
  summon: { count: number; typeId: string };
  vents: BossAttackNumbers & { radius: number; warn: number; interval: number; patterns: number[][] };
  phase3: { actionSpeed: number; comboLength: [number, number]; overheat: number; coreMul: number; staggerPoise: number };
  intro: number;
  transition: number;
  leashRadius: number;
} = {
  id: 'guardiao_mecanico',
  name: 'Guardião Mecânico',
  title: 'Guardião Mecânico das Ruínas',
  lore:
    'Constructo rúnico erguido por Aeternum para vigiar a Câmara do Selo. Seu núcleo de éter ainda pulsa ' +
    'com a última ordem que recebeu: ninguém passa sem a chave. Dizem que um espírito antigo dorme dentro dele.',
  hp: 2400,
  armor: 6,
  resist: { physical: 0.2, lightning: -0.25, fire: 0.25, void: 0.1 },
  radius: 2.2,
  height: 6.2,
  scale: 1,
  walk: 2.2,
  run: 5.5,
  turn: 2.4,
  poise: 400,
  phaseAt: [0.66, 0.33],
  slowResist: 0.5,
  xp: 800,
  gold: [150, 220],
  drops: [
    { itemId: 'espada_cyber_runica', chance: 1 },
    { itemId: 'nucleo_automato', chance: 1, qty: [1, 2] },
    { itemId: 'engrenagem_antiga', chance: 1, qty: [3, 5] },
    { itemId: 'amuleto_guardiao', chance: 0.35 },
  ],

  // --- Fase 1 ---
  /** Varrida de braço em cone anunciado. */
  sweep: { damage: 22, type: 'physical', windup: 1.1, recovery: 1.0, cooldown: 3, poise: 30, knockback: 8, radius: 9, arc: 130 },
  /** Pisão: onda de choque em anel que se expande (pular ou esquivar através). */
  stomp: { damage: 20, type: 'physical', windup: 1.2, recovery: 1.1, cooldown: 7, poise: 26, knockback: 7, ringSpeed: 11, ringWidth: 1.1, maxRadius: 26, jumpClear: 0.55 },
  /** Investida em linha; bater na parede/pilar o atordoa. */
  charge: { damage: 26, type: 'physical', windup: 1.1, recovery: 1.3, cooldown: 9, poise: 40, knockback: 12, length: 26, width: 4.2, speed: 17, wallStun: 2.6 },

  // --- Fase 2 ---
  /** 4 pilares de cristal nos soquetes: escudo de −90% até serem destruídos. */
  pillars: { hp: 140, shieldMul: 0.1, riseTime: 2 },
  /** Laser giratório (telegraph de linha + beamAttack por tick). */
  laser: { damage: 7, type: 'arcane', windup: 1.2, recovery: 1.4, cooldown: 12, poise: 4, duration: 6, turnSpeed: 0.95, length: 34, width: 0.55, tick: 0.25, height: 1.1 },
  /** Invoca sentinelas ao entrar na fase 2. */
  summon: { count: 2, typeId: 'automato_sentinela' },

  // --- Fase 3 ---
  /** Respiradouros explodem em padrões anunciados (índices 0..5). */
  vents: {
    damage: 18,
    type: 'fire',
    windup: 1.3,
    recovery: 0,
    cooldown: 6.5,
    poise: 20,
    knockback: 6,
    radius: 3.6,
    warn: 1.3,
    interval: 0.6,
    patterns: [
      [0, 2, 4],
      [1, 3, 5],
      [0, 1, 2, 3, 4, 5],
      [0, 3],
      [1, 4],
      [2, 5],
    ],
  },
  /** Combos mais rápidos e superaquecimento após cada combo (núcleo exposto). */
  phase3: { actionSpeed: 1.3, comboLength: [2, 3], overheat: 4, coreMul: 2, staggerPoise: 140 },

  /** Despertar (s, invulnerável) e transição entre fases (s). */
  intro: 3.2,
  transition: 2.6,
  /** Se o jogador ficar além deste raio do centro da arena por 5 s, a luta reseta. */
  leashRadius: 60,
};

export const BOSSES: Record<string, BossDef> = { [GUARDIAN.id]: GUARDIAN };

/** Id de portão travado durante a luta e id da arena (src/data/world.ts BOSS_ARENAS). */
export const BOSS_GATES: Record<string, string> = { guardiao_mecanico: 'arena_guardiao' };
