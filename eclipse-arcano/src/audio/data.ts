/**
 * Números ajustáveis do áudio procedural: barramentos, vozes, prioridades e
 * distâncias por efeito, ambiência e mixagem. (Os estilos musicais ficam em
 * musicStyles.ts.) Tudo aqui é dado puro — sem WebAudio — para poder ser testado.
 */
import type { SfxId } from './Audio';
import type { QualityLevel } from '../data/quality';

export type BusId = 'music' | 'sfx' | 'ambient' | 'ui';

export interface SfxDef {
  bus: BusId;
  /** 0..10: maior = mais importante (roubo de vozes). */
  priority: number;
  /** Ganho base (antes de volume/distância). */
  gain: number;
  /** Instâncias simultâneas máximas deste id. */
  maxInstances: number;
  /** Posicional (PannerNode + atenuação). Falso = 2D (interface, sons do próprio jogador). */
  positional: boolean;
  /** Distância de referência (ganho 1 até aqui), m. */
  ref: number;
  /** Distância máxima audível, m. */
  max: number;
  /** Fator de queda (modelo inverso). */
  rolloff: number;
  /** Envio para o reverb (0..1). */
  reverb: number;
  /** Variação aleatória de afinação (± semitons). */
  pitchVar: number;
  /** Família para deduplicação (o mesmo golpe chegando por evento e por chamada direta). */
  family?: string;
}

const D = (bus: BusId, priority: number, gain: number, maxInstances: number, positional: boolean, ref: number, max: number, reverb: number, pitchVar: number, family?: string, rolloff = 1): SfxDef => ({
  bus,
  priority,
  gain,
  maxInstances,
  positional,
  ref,
  max,
  rolloff,
  reverb,
  pitchVar,
  family,
});

export const SFX_DEFS: Record<SfxId, SfxDef> = {
  // interface (2D)
  ui_click: D('ui', 9, 0.5, 3, false, 1, 1, 0, 0.6),
  ui_hover: D('ui', 3, 0.22, 2, false, 1, 1, 0, 0.8),
  ui_open: D('ui', 8, 0.5, 2, false, 1, 1, 0.1, 0.3),
  ui_close: D('ui', 8, 0.45, 2, false, 1, 1, 0.1, 0.3),
  ui_error: D('ui', 8, 0.45, 2, false, 1, 1, 0, 0.2),
  quest_start: D('ui', 10, 0.7, 1, false, 1, 1, 0.3, 0),
  quest_complete: D('ui', 10, 0.8, 1, false, 1, 1, 0.35, 0),
  quest_update: D('ui', 8, 0.45, 1, false, 1, 1, 0.3, 0),
  level_up: D('ui', 10, 0.85, 1, false, 1, 1, 0.4, 0),
  discovery: D('ui', 9, 0.6, 1, false, 1, 1, 0.4, 0),
  pickup: D('ui', 6, 0.45, 3, false, 1, 1, 0.1, 1.2),
  gold: D('ui', 6, 0.45, 3, false, 1, 1, 0.1, 1.5),
  equip: D('ui', 7, 0.55, 2, false, 1, 1, 0.1, 1),
  death: D('ui', 10, 0.8, 1, false, 1, 1, 0.5, 0),
  respawn: D('ui', 9, 0.6, 1, false, 1, 1, 0.5, 0),
  heartbeat: D('ui', 8, 0.55, 1, false, 1, 1, 0, 0.2),
  // jogador
  potion: D('sfx', 6, 0.6, 2, true, 3, 30, 0.1, 1),
  hurt: D('sfx', 8, 0.55, 2, false, 1, 1, 0.1, 1),
  page: D('sfx', 4, 0.45, 2, true, 2, 25, 0.15, 1.5),
  footstep: D('sfx', 2, 0.32, 4, true, 3, 35, 0.12, 1.6),
  jump: D('sfx', 4, 0.4, 2, true, 3, 35, 0.1, 1.2),
  land: D('sfx', 5, 0.6, 2, true, 3, 45, 0.15, 1),
  dodge: D('sfx', 5, 0.5, 2, true, 3, 40, 0.15, 1),
  flight_start: D('sfx', 6, 0.6, 1, true, 4, 60, 0.2, 0.5),
  flight_loop: D('sfx', 6, 0.5, 1, false, 1, 1, 0, 0),
  flight_end: D('sfx', 6, 0.5, 1, true, 4, 60, 0.2, 0.5),
  // combate
  swing: D('sfx', 4, 0.45, 5, true, 3, 45, 0.15, 1.5, 'swing'),
  swing_heavy: D('sfx', 5, 0.6, 4, true, 4, 55, 0.15, 1.2, 'swing'),
  hit_flesh: D('sfx', 6, 0.7, 5, true, 4, 60, 0.15, 1.5, 'hit'),
  hit_metal: D('sfx', 6, 0.6, 5, true, 4, 70, 0.25, 1.2, 'hit'),
  hit_magic: D('sfx', 6, 0.55, 5, true, 4, 70, 0.25, 1.5, 'hit'),
  block: D('sfx', 7, 0.7, 3, true, 4, 60, 0.2, 1, 'hit'),
  parry: D('sfx', 8, 0.75, 2, true, 5, 70, 0.35, 0.6, 'hit'),
  combo: D('sfx', 8, 0.7, 2, true, 6, 90, 0.4, 0.3),
  cast_arcane: D('sfx', 6, 0.5, 4, true, 5, 70, 0.3, 1),
  cast_lance: D('sfx', 7, 0.6, 3, true, 5, 80, 0.3, 0.6),
  cast_explosion: D('sfx', 8, 0.8, 2, true, 8, 140, 0.4, 0.5),
  cast_chains: D('sfx', 7, 0.6, 2, true, 5, 80, 0.3, 0.6),
  cast_shield: D('sfx', 7, 0.55, 2, true, 5, 70, 0.35, 0.4),
  cast_teleport: D('sfx', 7, 0.55, 3, true, 5, 70, 0.3, 0.8),
  cast_lightning: D('sfx', 8, 0.75, 2, true, 8, 160, 0.45, 0.6),
  cast_blades: D('sfx', 7, 0.6, 2, true, 5, 80, 0.3, 0.6),
  cast_rift: D('sfx', 8, 0.75, 2, true, 8, 140, 0.5, 0.4),
  cast_ascend: D('sfx', 9, 0.85, 1, true, 10, 200, 0.5, 0),
  explosion: D('sfx', 8, 0.8, 4, true, 8, 180, 0.4, 1.2),
  // inimigos/criaturas
  enemy_alert: D('sfx', 6, 0.55, 3, true, 5, 80, 0.2, 1.5),
  enemy_death: D('sfx', 5, 0.6, 3, true, 5, 70, 0.25, 1.5),
  boss_roar: D('sfx', 9, 0.9, 2, true, 14, 260, 0.45, 0.3),
  boss_slam: D('sfx', 9, 0.9, 3, true, 12, 220, 0.4, 0.6),
  boss_laser: D('sfx', 9, 0.8, 2, true, 12, 220, 0.35, 0.3),
  creature_call: D('sfx', 3, 0.5, 4, true, 6, 140, 0.3, 1.5),
  // mundo
  door: D('sfx', 5, 0.6, 2, true, 3, 45, 0.3, 1),
  gate: D('sfx', 6, 0.75, 2, true, 8, 160, 0.4, 0.5),
  chest_open: D('sfx', 6, 0.6, 2, true, 3, 40, 0.25, 0.6),
  thunder: D('ambient', 8, 1, 3, true, 300, 6000, 0.3, 1.5, undefined, 0.35),
  village_bell: D('ambient', 4, 0.6, 1, true, 40, 900, 0.5, 0, undefined, 0.6),
  // ambiência (disparos pontuais da ambiência; também podem ser tocados por outros módulos)
  amb_bird: D('ambient', 1, 0.28, 4, true, 6, 120, 0.25, 2),
  amb_cricket: D('ambient', 1, 0.16, 3, true, 4, 60, 0.15, 1),
  amb_owl: D('ambient', 1, 0.3, 1, true, 10, 200, 0.4, 1),
  amb_frog: D('ambient', 1, 0.28, 4, true, 5, 90, 0.2, 2),
  amb_bubble: D('ambient', 1, 0.22, 3, true, 3, 40, 0.1, 3),
  amb_hammer: D('ambient', 2, 0.5, 2, true, 8, 160, 0.35, 0.7),
  amb_crackle: D('ambient', 1, 0.3, 3, true, 5, 70, 0.2, 2),
  amb_howl: D('ambient', 2, 0.35, 1, true, 30, 600, 0.5, 1),
  amb_drip: D('ambient', 1, 0.25, 3, true, 3, 40, 0.6, 3),
  amb_gust: D('ambient', 2, 0.35, 2, false, 1, 1, 0.1, 1),
  fire_ignite: D('sfx', 5, 0.6, 3, true, 4, 60, 0.2, 1.5),
  wood_break: D('sfx', 6, 0.75, 4, true, 4, 70, 0.25, 1.2),
  grass_cut: D('sfx', 3, 0.4, 3, true, 2, 25, 0.05, 2),
  stasis: D('sfx', 7, 0.65, 2, true, 6, 60, 0.35, 0.3),
  cook: D('ui', 6, 0.6, 1, false, 1, 1, 0.1, 0.2),
  hoof: D('sfx', 2, 0.42, 6, true, 4, 60, 0.12, 0.6),
  horse_neigh: D('sfx', 5, 0.6, 2, true, 6, 120, 0.3, 0.15),
  whistle: D('sfx', 5, 0.55, 1, true, 4, 80, 0.3, 0.08),
};

/** Limite de vozes simultâneas (efeitos + ambiência pontual) por preset de qualidade. */
export const VOICE_LIMIT: Record<QualityLevel, number> = { low: 20, medium: 28, high: 36, ultra: 44 };

/** Janela (s) de deduplicação: mesmo id/família perto (m) e quase ao mesmo tempo toca uma vez só. */
export const DEDUPE = { window: 0.07, radius: 2.5 };

/** Mixagem geral. */
export const MIX = {
  /** Ganho de cada barramento antes do volume do jogador. */
  busTrim: { music: 0.85, sfx: 0.9, ambient: 0.75, ui: 0.8 } as Record<BusId, number>,
  /** Compressor do master. */
  comp: { threshold: -16, knee: 8, ratio: 3.5, attack: 0.006, release: 0.22 },
  /** Limitador final. */
  limiter: { threshold: -2.5, knee: 0, ratio: 20, attack: 0.002, release: 0.1 },
  /** Corte do filtro dos barramentos de mundo quando pausado/menu aberto (Hz). */
  muffledCutoff: 750,
  /** Ducking da música durante diálogo (fator). */
  dialogueDuck: 0.55,
  /** Ducking curto da música em estouros (rugido do chefe, nível). */
  stingDuck: 0.5,
  /** Reverb: duração dos impulsos gerados (s). */
  roomSeconds: 1.1,
  hallSeconds: 3.2,
};

/** Envio de reverb ambiental por espaço (sala curta, salão longo). */
export const REVERB_SPACES = {
  outdoor: { room: 0.1, hall: 0.06 },
  village: { room: 0.16, hall: 0.06 },
  forest: { room: 0.12, hall: 0.1 },
  mountain: { room: 0.05, hall: 0.18 },
  indoor: { room: 0.45, hall: 0.12 },
  crypt: { room: 0.25, hall: 0.65 },
  ruins: { room: 0.18, hall: 0.28 },
};
export type ReverbSpace = keyof typeof REVERB_SPACES;

/** Ambiência: níveis e taxas (eventos/s) dos disparos pontuais. */
export const AMBIENCE = {
  /** Intervalo (s) entre recálculos dos alvos (posição, bioma, água). */
  evalInterval: 0.25,
  /** Constante de tempo (s) das transições de camadas. */
  fadeTau: 1.6,
  /** Camada silenciosa por mais que isso (s) desliga a fonte (economiza CPU). */
  sleepAfter: 4,
  /** Distância (m) para a água "encher" totalmente. */
  waterNear: 6,
  waterFar: 45,
  /** Altura sobre o chão (m) em que o vento de altitude começa / satura. */
  altitudeStart: 15,
  altitudeFull: 110,
  /** Taxas máximas (eventos/s). */
  birdRate: 0.9,
  owlRate: 0.05,
  frogRate: 1.2,
  bubbleRate: 0.7,
  hammerRate: 0.9,
  crackleRate: 0.6,
  howlRate: 0.012,
  dripRate: 0.45,
  gustRate: 0.05,
  /** Horário de trabalho da forja. */
  forgeHours: [6.5, 19] as [number, number],
  /** Horas em que o sino da vila toca. */
  bellHours: [6, 12, 18],
  /** Distância (m) máxima do centro da vila para ouvir o sino. */
  bellRange: 700,
};

/** Música: parâmetros do diretor. */
export const MUSIC = {
  /** Agendamento à frente (s). */
  lookahead: 0.3,
  /** Notas simultâneas máximas (orçamento de nós). */
  maxNotes: 56,
  /** Tempo (s) que o combate "persiste" depois do último inimigo engajado. */
  combatLinger: 4,
  /** Duração (s) da vinheta de vitória antes de voltar à exploração. */
  victorySeconds: 9,
  /** Duração padrão (s) de uma dica de 'music:intensity' que não seja combate/exploração. */
  hintSeconds: 25,
  /** Duração (s) da troca 'silence' (fade). */
  silenceFade: 3,
};

/** Notas musicais simultâneas máximas por preset de qualidade (orçamento de nós da música). */
export const MUSIC_NOTE_LIMIT: Record<QualityLevel, number> = { low: 40, medium: 56, high: 72, ultra: 88 };

/** Intensidade musical do combate: base + por inimigo engajado (0..1). */
export const MUSIC_INTENSITY = { combatBase: 0.35, perEnemy: 0.17, lowHealthBonus: 0.2, evalInterval: 0.25 };

/** Vida baixa: batimento cardíaco abaixo desta fração. */
export const LOW_HEALTH = { threshold: 0.25, interval: 0.85 };
