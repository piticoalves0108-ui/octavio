/**
 * Funções puras do áudio (sem WebAudio): atenuação por distância, absorção do ar,
 * conversões, variação de afinação, suavização e alocação de vozes.
 */

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth01 = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/**
 * Ganho por distância: modelo inverso com distância de referência, e um
 * desvanecimento suave nos últimos 30% até `max` (0 em `max` e além).
 */
export function distanceGain(d: number, ref: number, max: number, rolloff = 1): number {
  if (!(d < max)) return 0;
  const r = Math.max(1e-3, ref);
  const dd = d > r ? d : r;
  const inv = r / (r + rolloff * (dd - r));
  const fadeStart = max * 0.7;
  if (d <= fadeStart) return inv;
  const f = 1 - (d - fadeStart) / (max - fadeStart);
  return inv * f * f;
}

/** Frequência de corte (Hz) do passa-baixas de "ar": sons distantes perdem agudos. */
export function airCutoff(d: number): number {
  return clamp(20000 / (1 + d / 45), 700, 20000);
}

/** Envio de reverb extra por distância (sons longe soam mais "molhados"). */
export function distanceWet(d: number, ref: number): number {
  return clamp01((d - ref) / (ref * 8 + 20)) * 0.5;
}

export const dbToGain = (db: number) => Math.pow(10, db / 20);
export const gainToDb = (g: number) => (g <= 1e-6 ? -120 : 20 * Math.log10(g));

/** Curva perceptual do controle de volume (0..1 → ganho). */
export const sliderToGain = (v: number) => {
  const c = clamp01(v);
  return c * c;
};

/** Multiplicador de afinação aleatório de ±`semitones` (rand em [0,1)). */
export const pitchJitter = (rand: number, semitones: number) => Math.pow(2, ((rand * 2 - 1) * semitones) / 12);

/** Atraso (s) entre clarão e trovão (velocidade do som ~343 m/s). */
export const thunderDelaySec = (distance: number, speed = 343) => Math.max(0, distance) / speed;

/** Aproximação exponencial independente do dt (constante de tempo `tau` s). */
export function approach(current: number, target: number, dt: number, tau: number): number {
  if (tau <= 0) return target;
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

/** Crossfade de potência constante: x=0 → [1,0], x=1 → [0,1]. */
export function equalPower(x: number): [number, number] {
  const t = clamp01(x) * Math.PI * 0.5;
  return [Math.cos(t), Math.sin(t)];
}

/** Gerador pseudoaleatório determinístico (mulberry32). Estado em número para não alocar. */
export class Rng {
  private s: number;
  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }
  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number) {
    return a + (b - a) * this.next();
  }
  int(a: number, bInclusive: number) {
    return a + Math.floor(this.next() * (bInclusive - a + 1));
  }
  chance(p: number) {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length) % arr.length];
  }
}

// ------------------------------------------------------------------ vozes

/** Estado mínimo de uma voz para a decisão de alocação. */
export interface VoiceSlotInfo {
  busy: boolean;
  /** Termina em (s, relógio do áudio). */
  end: number;
  start: number;
  priority: number;
  /** Ganho efetivo (após distância). */
  gain: number;
  id: string;
}

/** Pontuação de importância: prioridade + audibilidade − idade. */
export function voiceScore(priority: number, gain: number, age: number): number {
  return priority + 2 * clamp01(gain) - Math.min(Math.max(age, 0), 4) * 0.25;
}

/**
 * Escolhe a voz para um novo som. Retorna o índice (livre ou a ser roubada) ou -1
 * se o som deve ser descartado (pool cheio de sons mais importantes).
 * Regras: (1) limite de instâncias do mesmo id → rouba a instância mais antiga do id;
 * (2) slot livre; (3) rouba a voz de menor pontuação se for menor que a do novo som.
 */
export function chooseVoice(slots: readonly VoiceSlotInfo[], now: number, id: string, priority: number, gain: number, maxInstances: number): number {
  let sameCount = 0;
  let sameOldest = -1;
  let free = -1;
  let victim = -1;
  let victimScore = Infinity;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const alive = s.busy && s.end > now;
    if (!alive) {
      if (free < 0) free = i;
      continue;
    }
    if (s.id === id) {
      sameCount++;
      if (sameOldest < 0 || s.start < slots[sameOldest].start) sameOldest = i;
    }
    const sc = voiceScore(s.priority, s.gain, now - s.start);
    if (sc < victimScore) {
      victimScore = sc;
      victim = i;
    }
  }
  if (sameCount >= maxInstances && sameOldest >= 0) return sameOldest;
  if (free >= 0) return free;
  if (victim >= 0 && victimScore < voiceScore(priority, gain, 0)) return victim;
  return -1;
}

/** Contagem de vozes vivas. */
export function activeVoices(slots: readonly VoiceSlotInfo[], now: number): number {
  let n = 0;
  for (const s of slots) if (s.busy && s.end > now) n++;
  return n;
}
