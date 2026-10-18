/**
 * Lógica pura da música adaptativa (sem WebAudio): escolha do estado musical,
 * teoria (graus → MIDI, acordes, condução de vozes), padrões rítmicos,
 * composição gerativa da melodia e quantização das transições ao compasso.
 * Testado em tests/audio.music.test.ts.
 */
import type { GameStateName, MusicState } from '../core/EventBus';
import type { MusicStyle } from './musicStyles';
import type { Rng } from './audioMath';

// ------------------------------------------------------------------ escolha do estado

export interface MusicInputs {
  gameState: GameStateName;
  /** Estado forçado por setMusic() (ou null). */
  forced: MusicState | null;
  /** Dica de 'music:intensity' ainda válida (ou null). */
  hint: MusicState | null;
  inCombat: boolean;
  bossActive: boolean;
  /** Segundos restantes da vinheta de vitória (≤ 0 = nenhuma). */
  victoryLeft: number;
  /** Segundos restantes da "persistência" do combate depois do último inimigo. */
  combatLinger: number;
  /** Tipo do local atual (LocationDef.kind) ou null. */
  locationKind: string | null;
  /** Dentro da taverna (sempre folk). */
  tavern: boolean;
  /** 0 = dia pleno, 1 = noite plena. */
  night: number;
}

/** Locais "misteriosos" (cripta, ruínas, arena vazia): usam o estilo esparso. */
const MYSTERY_KINDS = new Set(['dungeon', 'ruins', 'arena', 'secret']);

/**
 * Decide o estado musical. `current` dá a histerese da noite (entra com 0,65,
 * sai com 0,4) para não alternar no crepúsculo.
 */
export function chooseMusicState(i: MusicInputs, current: MusicState): MusicState {
  const gs = i.gameState;
  if (gs === 'boot' || gs === 'loading') return 'silence';
  if (gs === 'menu') return 'menu';
  if (i.forced) return i.forced;
  if (gs === 'dead') return 'silence';
  if (i.victoryLeft > 0) return 'victory';
  if (i.bossActive || i.hint === 'boss') return 'boss';
  if (i.inCombat || i.combatLinger > 0 || i.hint === 'combat') return 'combat';
  if (i.hint === 'silence' || i.hint === 'night' || i.hint === 'village') return i.hint;
  if (i.tavern) return 'village';
  const nightNow = current === 'night' ? i.night > 0.4 : i.night > 0.65;
  if (i.locationKind === 'settlement') return nightNow && i.night > 0.8 ? 'night' : 'village';
  if (i.locationKind && MYSTERY_KINDS.has(i.locationKind)) return 'night';
  if (nightNow) return 'night';
  return 'explore';
}

// ------------------------------------------------------------------ teoria

export const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** Grau (base 0, pode passar de 7 ou ser negativo) → nota MIDI no modo. */
export function degreeToMidi(root: number, mode: readonly number[], degree: number): number {
  const n = mode.length;
  const oct = Math.floor(degree / n);
  const idx = degree - oct * n;
  return root + 12 * oct + mode[idx];
}

/** Notas (MIDI) do acorde empilhado em terças sobre `degree`. */
export function chordTones(root: number, mode: readonly number[], degree: number, size: number, out: number[] = []): number[] {
  out.length = 0;
  for (let k = 0; k < size; k++) out.push(degreeToMidi(root, mode, degree + 2 * k));
  return out;
}

/**
 * Condução de vozes: dobra cada nota para dentro de [lo, lo+12) e ordena —
 * acordes vizinhos ficam próximos (sem saltos de oitava no pad).
 */
export function voiceChord(tones: number[], lo: number): number[] {
  for (let k = 0; k < tones.length; k++) {
    let m = tones[k];
    while (m < lo) m += 12;
    while (m >= lo + 12) m -= 12;
    tones[k] = m;
  }
  tones.sort((a, b) => a - b);
  return tones;
}

/** Grau → é nota do acorde de `chordDeg` (tríade)? */
export function isChordDegree(deg: number, chordDeg: number, n = 7): boolean {
  const d = (((deg - chordDeg) % n) + n) % n;
  return d === 0 || d === 2 || d === 4;
}

// ------------------------------------------------------------------ padrões

/** Velocidade (0..1) do caractere de padrão rítmico. */
export function hitVelocity(ch: string): number {
  return ch === 'x' ? 1 : ch === 'o' ? 0.65 : 0;
}

/** Índice de nota do acorde para um caractere do baixo (−1 = pausa). Ver musicStyles.ts. */
export function bassToneIndex(ch: string): number {
  switch (ch) {
    case '1':
      return 0;
    case '3':
      return 1;
    case '5':
      return 2;
    case '7':
      return 3;
    case '8':
      return 4;
    default:
      return -1;
  }
}

/** Valida um estilo: todos os padrões com o comprimento do compasso etc. (lista de problemas). */
export function validateStyle(s: MusicStyle): string[] {
  const errs: string[] = [];
  const spb = s.stepsPerBeat * s.beatsPerBar;
  const check = (name: string, p: string | undefined) => {
    if (p !== undefined && p.length !== spb) errs.push(`${s.id}.${name}: ${p.length} passos (esperado ${spb})`);
  };
  check('bass', s.bass?.pattern);
  check('arp', s.arp?.pattern);
  check('stabs', s.stabs?.pattern);
  for (const d of s.drums ?? []) check(`drums.${d.kind}`, d.pattern);
  for (const r of s.lead?.rhythms ?? []) check('lead.rhythm', r);
  if (!(s.bpm >= 30 && s.bpm <= 220)) errs.push(`${s.id}: bpm fora da faixa`);
  if (!s.progressions.length) errs.push(`${s.id}: sem progressões`);
  for (const p of s.progressions) for (const d of p) if (!(d >= 0 && d < s.mode.length)) errs.push(`${s.id}: grau ${d} fora do modo`);
  if (s.mode.length !== 7) errs.push(`${s.id}: modo deve ter 7 notas`);
  if (s.motif) for (const [st] of s.motif) if (st >= spb * (s.oneShotBars ?? 4)) errs.push(`${s.id}: motivo além da vinheta`);
  return errs;
}

// ------------------------------------------------------------------ melodia gerativa

/**
 * Compõe um compasso de melodia. Preenche `notes` (grau relativo à tônica da
 * oitava do lead, ou NaN = sem nota) e `lens` (duração em passos) por passo.
 * Caminhada aleatória por graus conjuntos, com as notas em tempos fortes
 * atraídas para o acorde. Retorna o último grau (continuidade entre compassos).
 */
export function planLead(style: MusicStyle, rng: Rng, chordDeg: number, prevDeg: number, notes: Float32Array, lens: Uint8Array): number {
  const L = style.lead;
  notes.fill(NaN);
  lens.fill(0);
  if (!L) return prevDeg;
  if (rng.chance(L.restChance)) return prevDeg;
  const rhythm = rng.pick(L.rhythms);
  const spb = rhythm.length;
  const [lo, hi] = L.range;
  let deg = Number.isFinite(prevDeg) ? prevDeg : chordDeg;
  let lastStep = -1;
  for (let s = 0; s < spb; s++) {
    if (rhythm[s] !== 'x') continue;
    if (s > 0 && !rng.chance(L.density)) continue;
    // passo: −2..+2 com preferência por graus conjuntos
    const u = rng.next();
    const step = u < 0.3 ? -1 : u < 0.6 ? 1 : u < 0.72 ? -2 : u < 0.84 ? 2 : 0;
    deg += step;
    const strong = s % style.stepsPerBeat === 0;
    if (strong && !isChordDegree(deg, chordDeg)) {
      // aproxima para a nota do acorde mais próxima (prefere na direção do movimento)
      const dir = step >= 0 ? 1 : -1;
      if (isChordDegree(deg + dir, chordDeg)) deg += dir;
      else if (isChordDegree(deg - dir, chordDeg)) deg -= dir;
    }
    // reflete nos limites
    while (deg < lo || deg > hi) {
      if (deg < lo) deg = lo + (lo - deg);
      if (deg > hi) deg = hi - (deg - hi);
    }
    notes[s] = deg;
    if (lastStep >= 0) lens[lastStep] = s - lastStep;
    lastStep = s;
  }
  if (lastStep >= 0) lens[lastStep] = Math.max(1, Math.min(spb - lastStep + 2, spb));
  return deg;
}

// ------------------------------------------------------------------ quantização

/**
 * Instante da próxima fronteira de compasso (a partir de `t`) de uma grade que
 * começou em `t0`. Se ela estiver a mais de `maxWait` s e `allowBeat`, usa a
 * próxima batida.
 */
export function nextBoundary(t: number, t0: number, beatSec: number, beatsPerBar: number, maxWait: number, allowBeat: boolean): number {
  const bar = beatSec * beatsPerBar;
  if (!(bar > 0)) return t;
  const rel = Math.max(0, t - t0);
  const nBar = Math.ceil(rel / bar - 1e-9);
  const tb = t0 + nBar * bar;
  if (tb - t <= maxWait || !allowBeat) return tb;
  const nBeat = Math.ceil(rel / beatSec - 1e-9);
  return t0 + nBeat * beatSec;
}

/** Duração do crossfade entre dois estados (s). */
export function crossfadeSeconds(toStyle: MusicStyle | null, silenceFade: number): number {
  return toStyle ? toStyle.xfade : silenceFade;
}
