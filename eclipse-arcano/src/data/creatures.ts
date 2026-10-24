/**
 * Criaturas (fauna e seres ambientes): temperamento, velocidades, percepção, condições de
 * aparição e (opcionalmente) recompensas — o rpg pode ouvir 'creature:killed'.
 * Montaria/domar: NÃO implementado (pendente).
 */
import type { DamageType } from '../combat/Health';
import type { DropDef } from './enemies';

export type CreatureRig = 'deer' | 'rabbit' | 'horse' | 'sheep' | 'chicken' | 'griffin' | 'phoenix' | 'dragon' | 'serpent' | 'spirit' | 'bird';

/**
 * skittish: foge de ameaças; neutral: ignora/observa, foge se atacado;
 * territorial: avisa e ataca quem invade o território; hostile: ataca à vista;
 * ambient: só decoração (sem colisão/vida), ex.: dragão distante.
 */
export type Temperament = 'skittish' | 'neutral' | 'territorial' | 'hostile' | 'ambient';

export interface CreatureAttack {
  damage: number;
  type: DamageType;
  reach: number;
  windup: number;
  recovery: number;
  cooldown: number;
  knockback?: number;
  /** Mergulho (voadores) ou mordida. */
  style: 'bite' | 'dive' | 'spit';
}

export interface CreatureDef {
  id: string;
  name: string;
  rig: CreatureRig;
  temperament: Temperament;
  scale: number;
  hp: number;
  radius: number;
  height: number;
  walk: number;
  run: number;
  /** Distância (m) em que nota o jogador. */
  notice: number;
  /** Distância (m) em que foge (skittish) ou ataca (territorial). */
  flee: number;
  /** Raio de vagar em torno do ponto de origem. */
  wander: number;
  /** Fração do tempo pastando/descansando. */
  idleBias: number;
  /** Voa (altura média acima do chão). */
  flyHeight?: number;
  /** Brilha (emissivo) — cervo luminoso, fênix, espíritos. */
  glow?: number;
  attack?: CreatureAttack;
  xp: number;
  gold: [number, number];
  drops: DropDef[];
  description: string;
}

const LIST: CreatureDef[] = [
  { id: 'cervo', name: 'Cervo', rig: 'deer', temperament: 'skittish', scale: 1, hp: 40, radius: 0.5, height: 1.6, walk: 1.4, run: 9, notice: 26, flee: 16, wander: 30, idleBias: 0.55, xp: 5, gold: [0, 0], drops: [{ itemId: 'couro_lobo', chance: 0.3 }, { itemId: 'carne_crua', chance: 0.85, qty: [1, 2] }], description: 'Pasta nas campinas e foge ao menor ruído.' },
  { id: 'cervo_luminoso', name: 'Cervo Luminoso', rig: 'deer', temperament: 'neutral', scale: 1.15, hp: 120, radius: 0.55, height: 1.9, walk: 1.2, run: 8, notice: 18, flee: 6, wander: 14, idleBias: 0.7, glow: 1.4, xp: 0, gold: [0, 0], drops: [], description: 'Espírito da Floresta de Lúmen em forma de cervo. Só aparece à noite, na clareira.' },
  { id: 'coelho', name: 'Coelho', rig: 'rabbit', temperament: 'skittish', scale: 1, hp: 8, radius: 0.2, height: 0.35, walk: 1.2, run: 7, notice: 12, flee: 8, wander: 14, idleBias: 0.6, xp: 1, gold: [0, 0], drops: [{ itemId: 'carne_crua', chance: 0.6 }], description: 'Saltita entre as moitas.' },
  { id: 'passaro', name: 'Pássaro', rig: 'bird', temperament: 'skittish', scale: 1, hp: 2, radius: 0.15, height: 0.2, walk: 1, run: 9, notice: 14, flee: 10, wander: 20, idleBias: 0.6, flyHeight: 18, xp: 0, gold: [0, 0], drops: [], description: 'Bandos que levantam voo quando alguém se aproxima.' },
  { id: 'cavalo', name: 'Cavalo', rig: 'horse', temperament: 'neutral', scale: 1, hp: 90, radius: 0.6, height: 1.8, walk: 1.3, run: 9.5, notice: 10, flee: 4, wander: 16, idleBias: 0.7, xp: 0, gold: [0, 0], drops: [], description: 'Cavalos de tração de Brumafria. (Montaria: ainda não disponível.)' },
  { id: 'ovelha', name: 'Ovelha', rig: 'sheep', temperament: 'neutral', scale: 1, hp: 25, radius: 0.45, height: 0.95, walk: 0.8, run: 4.5, notice: 8, flee: 3, wander: 6, idleBias: 0.75, xp: 0, gold: [0, 0], drops: [], description: 'Rebanho do cercado da vila.' },
  { id: 'galinha', name: 'Galinha', rig: 'chicken', temperament: 'skittish', scale: 1, hp: 6, radius: 0.2, height: 0.45, walk: 0.9, run: 4, notice: 5, flee: 2.6, wander: 4, idleBias: 0.5, xp: 0, gold: [0, 0], drops: [], description: 'Cisca o dia inteiro no galinheiro.' },
  {
    id: 'grifo', name: 'Grifo', rig: 'griffin', temperament: 'territorial', scale: 1.6, hp: 320, radius: 1.2, height: 2.2, walk: 2, run: 15, notice: 70, flee: 34, wander: 40, idleBias: 0.2, flyHeight: 45,
    attack: { damage: 18, type: 'physical', reach: 2.6, windup: 0.8, recovery: 1.4, cooldown: 4.5, knockback: 9, style: 'dive' },
    xp: 150, gold: [0, 0], drops: [{ itemId: 'fragmento_eter', chance: 1, qty: [2, 3] }], description: 'Guarda o ninho nas montanhas do norte. Mergulha sobre quem se aproxima voando.',
  },
  { id: 'fenix', name: 'Fênix', rig: 'phoenix', temperament: 'neutral', scale: 1.4, hp: 400, radius: 1, height: 1.6, walk: 3, run: 14, notice: 40, flee: 18, wander: 30, idleBias: 0.4, flyHeight: 22, glow: 2, xp: 0, gold: [0, 0], drops: [], description: 'Rara. Pousa no Santuário de Cristal ao amanhecer e parte quando o sol se firma.' },
  { id: 'dragao_distante', name: 'Dragão Distante', rig: 'dragon', temperament: 'ambient', scale: 6, hp: 1, radius: 0, height: 0, walk: 0, run: 34, notice: 0, flee: 0, wander: 0, idleBias: 0, flyHeight: 190, xp: 0, gold: [0, 0], drops: [], description: 'Uma silhueta colossal cruza o céu, longe demais para ser alcançada.' },
  {
    id: 'serpente_lago', name: 'Serpente do Lago', rig: 'serpent', temperament: 'hostile', scale: 1.4, hp: 260, radius: 1, height: 2.4, walk: 2, run: 6, notice: 16, flee: 0, wander: 18, idleBias: 0.5,
    attack: { damage: 16, type: 'physical', reach: 4.2, windup: 0.9, recovery: 1.1, cooldown: 3.2, knockback: 6, style: 'bite' },
    xp: 110, gold: [0, 0], drops: [{ itemId: 'cristal_arcano', chance: 0.6 }, { itemId: 'fragmento_eter', chance: 0.6 }], description: 'Rara e hostil. Emerge do Lago Espelhado quando alguém se aproxima da margem.',
  },
  { id: 'espirito_floresta', name: 'Espírito da Floresta', rig: 'spirit', temperament: 'neutral', scale: 1, hp: 30, radius: 0.3, height: 1.2, walk: 1.2, run: 4, notice: 12, flee: 3, wander: 18, idleBias: 0.3, flyHeight: 1.6, glow: 2.2, xp: 0, gold: [0, 0], drops: [], description: 'Luzes curiosas que flutuam pela floresta à noite. Seguem o viajante a uma distância respeitosa.' },
];

export const CREATURES: Record<string, CreatureDef> = Object.fromEntries(LIST.map((c) => [c.id, c]));
export const CREATURE_IDS: string[] = LIST.map((c) => c.id);

/** Regras de bandos de pássaros (boids instanciados). */
export const BIRD_FLOCK = {
  /** Pássaros por bando. */
  size: 9,
  /** Distância do jogador que faz o bando levantar voo. */
  scareRadius: 11,
  /** Tempo (s) voando antes de pousar de novo em outro ponto. */
  flightTime: [9, 16] as [number, number],
  /** Velocidade de voo (m/s). */
  speed: 9,
  /** Pesos dos boids. */
  cohesion: 0.9,
  alignment: 1.2,
  separation: 2.2,
  separationDist: 1.2,
  /** Raio de pouso em torno do ponto escolhido. */
  landRadius: 5,
};

/** Evento ambiente: dragão distante. */
export const DISTANT_DRAGON = {
  /** Chance por hora de jogo de cruzar o céu. */
  chancePerHour: 0.08,
  /** Distância horizontal (m) mínima do jogador na passagem. */
  minDistance: 320,
  altitude: 190,
  speed: 34,
  /** Duração máxima (s). */
  duration: 45,
};
