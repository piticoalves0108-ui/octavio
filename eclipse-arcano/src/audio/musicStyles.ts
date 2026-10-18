/**
 * Estilos da música adaptativa (dados puros, sem WebAudio). Cada estado musical
 * é uma "receita gerativa": andamento, modo, progressões de acordes, padrões
 * rítmicos e camadas. As melodias são compostas na hora (musicLogic.planLead),
 * então nada aqui é uma partitura fixa — exceto o motivo curto da vitória.
 *
 * Padrões (strings com um caractere por passo do compasso):
 *  - bateria/arpejo/acordes curtos: 'x' = acento, 'o' = normal, '.' = pausa;
 *  - baixo: '1' fundamental, '3' terça, '5' quinta, '7' sétima, '8' fundamental
 *    uma oitava acima, '.' = pausa.
 */
import type { MusicState } from '../core/EventBus';

/** Modos (intervalos em semitons a partir da tônica). */
export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  phrygianDominant: [0, 1, 4, 5, 7, 8, 10],
} as const;

export type DrumKind = 'kick' | 'snare' | 'hat' | 'shaker' | 'tom' | 'frame' | 'taiko' | 'clank';
export type LeadInstrument = 'flute' | 'fiddle' | 'bell' | 'brass';
export type ArpInstrument = 'pluck' | 'harp' | 'pulse' | 'bell';
export type VowelId = 'a' | 'o' | 'u';

export interface DrumLane {
  kind: DrumKind;
  pattern: string;
  gain: number;
  /** Só toca com intensidade ≥ este valor (0..1). */
  minIntensity?: number;
}

export interface MusicStyle {
  id: MusicState;
  /** Batidas por minuto (em 6/8, a batida é a semínima pontuada). */
  bpm: number;
  /** Passos por batida (4 = semicolcheias; 3 = colcheias em 6/8). */
  stepsPerBeat: number;
  beatsPerBar: number;
  /** Tônica (MIDI) da harmonia — a oitava de cada camada é relativa a ela. */
  root: number;
  mode: readonly number[];
  /** Progressões (graus da escala, base 0); uma é sorteada a cada frase. */
  progressions: readonly (readonly number[])[];
  /** Compassos por acorde. */
  barsPerChord: number;
  /** Compassos por frase (troca de progressão). */
  phraseBars: number;
  /** Ganho geral do estilo. */
  gain: number;
  /** Entrada (s) quando este estilo assume. */
  fadeIn: number;
  /** Saída (s) do estilo anterior quando este assume (crossfade). */
  xfade: number;
  /** Transição na próxima batida (e não só no compasso) se o compasso estiver longe. */
  urgent?: boolean;
  /** Atraso (fração do passo) dos passos pares — balanço. */
  swing?: number;
  /** Vinheta: termina sozinha depois de N compassos. */
  oneShotBars?: number;
  pad?: { octave: number; voices: number; gain: number; attack: number; release: number; cutoff: number; wave: OscillatorType; minIntensity?: number };
  /** Bordão contínuo (graus fixos sobre a tônica). */
  drone?: { degrees: readonly number[]; octave: number; gain: number; cutoff: number; wave: OscillatorType };
  bass?: { pattern: string; octave: number; gain: number; wave: OscillatorType; decay: number; cutoff: number; minIntensity?: number };
  arp?: { pattern: string; order: 'up' | 'down' | 'updown' | 'random'; octave: number; gain: number; decay: number; instrument: ArpInstrument; minIntensity?: number };
  lead?: {
    instrument: LeadInstrument;
    octave: number;
    gain: number;
    /** Probabilidade de cada posição rítmica virar nota. */
    density: number;
    /** Probabilidade de um compasso inteiro de pausa (respiro). */
    restChance: number;
    /** Ritmos possíveis (um por compasso). */
    rhythms: readonly string[];
    /** Faixa de graus (relativa à tônica da oitava do lead). */
    range: [number, number];
    minIntensity?: number;
  };
  /** Motivo fixo (passo, grau, duração em passos) — vinheta de vitória. */
  motif?: readonly (readonly [number, number, number])[];
  stabs?: { pattern: string; octave: number; gain: number; minIntensity?: number };
  choir?: { vowel: VowelId; octave: number; gain: number; minIntensity?: number };
  bells?: { chance: number; octave: number; gain: number };
  drums?: readonly DrumLane[];
}

export const MUSIC_STYLES: Record<Exclude<MusicState, 'silence'>, MusicStyle> = {
  // Tema do menu: "o eclipse sobre Brumafria" — lento, majestoso, melancólico.
  menu: {
    id: 'menu',
    bpm: 66,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    root: 50, // Ré
    mode: MODES.aeolian,
    progressions: [
      [0, 5, 2, 6],
      [0, 3, 5, 4],
      [5, 3, 0, 6],
    ],
    barsPerChord: 1,
    phraseBars: 4,
    gain: 0.8,
    fadeIn: 3,
    xfade: 2.5,
    pad: { octave: 0, voices: 4, gain: 0.16, attack: 1.2, release: 2.2, cutoff: 1300, wave: 'sawtooth' },
    drone: { degrees: [0, 4], octave: -1, gain: 0.1, cutoff: 500, wave: 'sawtooth' },
    arp: { pattern: 'x.o.o.o.x.o.o.o.', order: 'updown', octave: 1, gain: 0.16, decay: 1.1, instrument: 'harp' },
    lead: {
      instrument: 'flute',
      octave: 1,
      gain: 0.15,
      density: 0.55,
      restChance: 0.3,
      rhythms: ['x.......x...x...', 'x...x.......x...', 'x.....x.x.......', 'x...........x...', 'x...............'],
      range: [2, 11],
    },
    bells: { chance: 0.35, octave: 2, gain: 0.07 },
  },

  // Exploração: calma, modal (Sol dórico), harpa e flauta, sem bateria pesada.
  explore: {
    id: 'explore',
    bpm: 76,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    root: 55, // Sol
    mode: MODES.dorian,
    progressions: [
      [0, 3, 0, 6],
      [0, 6, 3, 4],
      [3, 0, 6, 0],
      [5, 6, 0, 0],
    ],
    barsPerChord: 1,
    phraseBars: 4,
    gain: 1.05,
    fadeIn: 4,
    xfade: 3,
    swing: 0.12,
    pad: { octave: -1, voices: 3, gain: 0.12, attack: 1.5, release: 2.5, cutoff: 1100, wave: 'triangle' },
    bass: { pattern: '1.......5.......', octave: -2, gain: 0.2, wave: 'triangle', decay: 1.4, cutoff: 600 },
    arp: { pattern: 'x..o..o.x..o..o.', order: 'up', octave: 0, gain: 0.15, decay: 0.9, instrument: 'pluck' },
    lead: {
      instrument: 'flute',
      octave: 1,
      gain: 0.13,
      density: 0.5,
      restChance: 0.4,
      rhythms: ['x.....x.x.......', 'x...x...x...x...', 'x.......x.x.....', 'x...........x.x.', 'x.x.x...........'],
      range: [0, 9],
    },
    drums: [{ kind: 'shaker', pattern: '..o...o...o...o.', gain: 0.05 }],
  },

  // Vila: folk acolhedor em 6/8 (Ré mixolídio), rabeca, alaúde, bordão de gaita e bodhrán.
  village: {
    id: 'village',
    bpm: 100,
    stepsPerBeat: 3,
    beatsPerBar: 2,
    root: 50, // Ré
    mode: MODES.mixolydian,
    progressions: [
      [0, 0, 6, 0],
      [0, 3, 6, 4],
      [3, 0, 4, 0],
      [0, 6, 3, 0],
    ],
    barsPerChord: 1,
    phraseBars: 4,
    gain: 0.9,
    fadeIn: 3,
    xfade: 2.5,
    drone: { degrees: [0, 4], octave: -1, gain: 0.07, cutoff: 900, wave: 'sawtooth' },
    bass: { pattern: '1..5..', octave: -2, gain: 0.2, wave: 'triangle', decay: 0.5, cutoff: 700 },
    arp: { pattern: 'x.ox.o', order: 'updown', octave: 0, gain: 0.13, decay: 0.45, instrument: 'pluck' },
    lead: {
      instrument: 'fiddle',
      octave: 1,
      gain: 0.12,
      density: 0.8,
      restChance: 0.15,
      rhythms: ['xxxxxx', 'x.xx.x', 'x..x..', 'xx.x.x', 'x.xxx.', 'x.....'],
      range: [0, 9],
    },
    drums: [
      { kind: 'frame', pattern: 'x..o..', gain: 0.22 },
      { kind: 'shaker', pattern: '.o..oo', gain: 0.05 },
    ],
  },

  // Noite: esparsa e misteriosa (Mi frígio), bordão grave e sinos de vidro raros.
  night: {
    id: 'night',
    bpm: 54,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    root: 52, // Mi
    mode: MODES.phrygian,
    progressions: [
      [0, 0, 1, 0],
      [0, 5, 1, 0],
      [0, 3, 5, 1],
    ],
    barsPerChord: 2,
    phraseBars: 8,
    gain: 0.75,
    fadeIn: 5,
    xfade: 3.5,
    pad: { octave: -1, voices: 3, gain: 0.09, attack: 2.5, release: 3.5, cutoff: 700, wave: 'sawtooth' },
    drone: { degrees: [0], octave: -2, gain: 0.14, cutoff: 260, wave: 'sawtooth' },
    lead: {
      instrument: 'bell',
      octave: 1,
      gain: 0.1,
      density: 0.35,
      restChance: 0.5,
      rhythms: ['x.......x.......', 'x...........x...', '....x...........', 'x.....x.........'],
      range: [0, 9],
    },
    bells: { chance: 0.4, octave: 2, gain: 0.05 },
  },

  // Combate: Ré menor harmônica, ostinato de baixo em semicolcheias e percussão.
  combat: {
    id: 'combat',
    bpm: 132,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    root: 50, // Ré
    mode: MODES.harmonicMinor,
    progressions: [
      [0, 0, 5, 4],
      [0, 5, 3, 4],
      [0, 3, 0, 4],
    ],
    barsPerChord: 1,
    phraseBars: 4,
    gain: 1.1,
    fadeIn: 0.6,
    xfade: 1.2,
    urgent: true,
    pad: { octave: -1, voices: 3, gain: 0.07, attack: 0.3, release: 0.8, cutoff: 900, wave: 'sawtooth' },
    bass: { pattern: '1.11.11.1.11.5.8', octave: -2, gain: 0.26, wave: 'sawtooth', decay: 0.16, cutoff: 900 },
    stabs: { pattern: 'x.......x.....x.', octave: 0, gain: 0.1, minIntensity: 0.3 },
    arp: { pattern: 'xooxooxoxooxooxo', order: 'up', octave: 1, gain: 0.06, decay: 0.12, instrument: 'pulse', minIntensity: 0.55 },
    lead: {
      instrument: 'brass',
      octave: 0,
      gain: 0.1,
      density: 0.7,
      restChance: 0.35,
      rhythms: ['x..x..x.x.......', 'x.......x..x..x.', 'x..x..x...x.....', 'x...x...x.x.x...'],
      range: [0, 7],
      minIntensity: 0.6,
    },
    drums: [
      { kind: 'kick', pattern: 'x.....x...x.....', gain: 0.5 },
      { kind: 'snare', pattern: '....x.......x...', gain: 0.3 },
      { kind: 'hat', pattern: '..o...o...o...o.', gain: 0.1 },
      { kind: 'tom', pattern: '............x.ox', gain: 0.3, minIntensity: 0.5 },
      { kind: 'clank', pattern: '......x.......x.', gain: 0.07, minIntensity: 0.4 },
    ],
  },

  // Chefe: Dó frígio dominante, mais rápido, coro sintetizado, taikos e metal (cyber).
  boss: {
    id: 'boss',
    bpm: 150,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    root: 48, // Dó
    mode: MODES.phrygianDominant,
    progressions: [
      [0, 1, 0, 6],
      [0, 5, 1, 0],
      [0, 1, 5, 6],
    ],
    barsPerChord: 1,
    phraseBars: 4,
    gain: 0.85,
    fadeIn: 0.5,
    xfade: 1,
    urgent: true,
    choir: { vowel: 'a', octave: 0, gain: 0.07 },
    bass: { pattern: '11.11.1.11.15.18', octave: -2, gain: 0.28, wave: 'sawtooth', decay: 0.13, cutoff: 1000 },
    stabs: { pattern: 'x..x..x...x..x..', octave: 0, gain: 0.1, minIntensity: 0.5 },
    arp: { pattern: 'xoooxoooxoooxooo', order: 'updown', octave: 1, gain: 0.06, decay: 0.1, instrument: 'pulse', minIntensity: 0.5 },
    lead: {
      instrument: 'brass',
      octave: 0,
      gain: 0.11,
      density: 0.75,
      restChance: 0.25,
      rhythms: ['x..x..x.x.x.x...', 'x.x.x...x..x..x.', 'x.......x..x..x.', 'x..x..x.....x.x.'],
      range: [0, 8],
      minIntensity: 0.3,
    },
    drums: [
      { kind: 'taiko', pattern: 'x.....x.x.......', gain: 0.5 },
      { kind: 'kick', pattern: 'x..x..x...x.x...', gain: 0.45 },
      { kind: 'snare', pattern: '....x.......x..o', gain: 0.3 },
      { kind: 'clank', pattern: '..x...x...x...x.', gain: 0.08 },
      { kind: 'hat', pattern: 'xoooxoooxoooxooo', gain: 0.08, minIntensity: 0.65 },
      { kind: 'tom', pattern: '........x.o.x.oo', gain: 0.3, minIntensity: 0.65 },
    ],
  },

  // Vitória: vinheta curta em Ré maior (fanfarra de metais e sinos), termina sozinha.
  victory: {
    id: 'victory',
    bpm: 92,
    stepsPerBeat: 4,
    beatsPerBar: 4,
    root: 50,
    mode: MODES.ionian,
    progressions: [[0, 3, 4, 0]],
    barsPerChord: 1,
    phraseBars: 4,
    gain: 1.05,
    fadeIn: 0.3,
    xfade: 1.2,
    urgent: true,
    oneShotBars: 4,
    pad: { octave: -1, voices: 4, gain: 0.12, attack: 0.4, release: 2.5, cutoff: 1800, wave: 'sawtooth' },
    bass: { pattern: '1.......5.......', octave: -2, gain: 0.2, wave: 'triangle', decay: 1.2, cutoff: 700 },
    motif: [
      [0, 0, 2],
      [2, 2, 2],
      [4, 4, 4],
      [8, 7, 8],
      [16, 5, 2],
      [18, 6, 2],
      [20, 7, 4],
      [24, 8, 4],
      [28, 9, 4],
      [32, 8, 6],
      [38, 7, 2],
      [40, 6, 8],
      [48, 7, 16],
    ],
    lead: { instrument: 'brass', octave: 0, gain: 0.13, density: 1, restChance: 0, rhythms: ['x...............'], range: [0, 10] },
    bells: { chance: 1, octave: 2, gain: 0.07 },
    drums: [{ kind: 'taiko', pattern: 'x...........x.x.', gain: 0.4 }],
  },
};

/** Passos por compasso de um estilo. */
export const stepsPerBar = (s: MusicStyle) => s.stepsPerBeat * s.beatsPerBar;
/** Duração (s) de um passo. */
export const stepSeconds = (s: MusicStyle) => 60 / s.bpm / s.stepsPerBeat;
/** Duração (s) de um compasso. */
export const barSeconds = (s: MusicStyle) => (60 / s.bpm) * s.beatsPerBar;
