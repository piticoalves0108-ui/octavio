/**
 * Máquina de estados do clima (lógica pura, testável): durações naturais, cadeia de
 * Markov com pesos por região e horário, transições suaves com curvas próprias
 * (as nuvens chegam antes da chuva e vão embora depois dela) e bloqueio para chefes.
 */
import { clamp, smoothstep } from '../core/math';
import type { WeatherKind } from '../core/EventBus';
import type { BiomeId } from '../data/world';
import { MORNING_FOG, REGION_WEATHER_WEIGHTS, WEATHER, WEATHER_KINDS, WEATHER_TIMING, WEATHER_TRANSITIONS, type WeatherParams } from '../data/weather';

/** Mistura atual dos parâmetros (sem a duração). */
export type WeatherMix = Omit<WeatherParams, 'durationMin'>;

const MIX_KEYS: (keyof WeatherMix)[] = ['cloudCover', 'cloudDarkness', 'rain', 'wind', 'gust', 'fog', 'fogExtra', 'lightningPerMin', 'sunDim', 'desaturate'];

export function createMix(kind: WeatherKind = 'clear'): WeatherMix {
  const m = {} as WeatherMix;
  for (const k of MIX_KEYS) m[k] = WEATHER[kind][k];
  return m;
}

export function isWeatherKind(v: unknown): v is WeatherKind {
  return typeof v === 'string' && (WEATHER_KINDS as readonly string[]).includes(v);
}

/** Fator 0..1 da manhã com névoa (sobe até o pico e desce até o fim). */
export function morningFogFactor(hours: number): number {
  const h = ((hours % 24) + 24) % 24;
  if (h < MORNING_FOG.from || h > MORNING_FOG.to) return 0;
  return h < MORNING_FOG.peak ? smoothstep(MORNING_FOG.from, MORNING_FOG.peak, h) : smoothstep(MORNING_FOG.to, MORNING_FOG.peak, h);
}

export interface WeatherSnapshot {
  current: WeatherKind;
  /** Segundos até a próxima mudança natural. */
  timeLeft: number;
  locked: boolean;
}

export class WeatherMachine {
  current: WeatherKind = 'clear';
  previous: WeatherKind = 'clear';
  /** Segundos até a próxima mudança natural. */
  timeLeft = 600;
  /** Progresso 0..1 da transição atual. */
  progress = 1;
  transitionSeconds = 1;
  /** Bloqueado (arena de chefe/cinemática): não muda sozinho. */
  locked = false;
  /** Parâmetros misturados do momento. */
  readonly mix: WeatherMix = createMix('clear');
  /** Mistura no início da transição (mudar no meio de outra transição não dá salto). */
  private from: WeatherMix = createMix('clear');
  private weights: Record<WeatherKind, number> = { clear: 0, cloudy: 0, rain: 0, storm: 0, fog: 0 };

  constructor(private random: () => number = Math.random) {}

  /** Duração natural (s) de um clima. */
  durationFor(kind: WeatherKind): number {
    const [a, b] = WEATHER[kind].durationMin;
    return (a + (b - a) * this.random()) * 60;
  }

  /** Reinicia num clima, sem transição. */
  reset(kind: WeatherKind, durationSeconds = this.durationFor(kind)) {
    this.current = kind;
    this.previous = kind;
    this.progress = 1;
    this.transitionSeconds = 1;
    this.timeLeft = Math.max(1, durationSeconds);
    this.locked = false;
    const p = WEATHER[kind];
    for (const k of MIX_KEYS) {
      this.mix[k] = p[k];
      this.from[k] = p[k];
    }
  }

  /** Muda para `kind` com transição (s). Retorna true se mudou. */
  set(kind: WeatherKind, transitionSeconds: number, durationSeconds = this.durationFor(kind)): boolean {
    this.timeLeft = Math.max(1, durationSeconds);
    if (kind === this.current && this.progress >= 1) return false;
    for (const k of MIX_KEYS) this.from[k] = this.mix[k];
    this.previous = this.current;
    this.current = kind;
    this.transitionSeconds = Math.max(0, transitionSeconds);
    this.progress = this.transitionSeconds <= 0 ? 1 : 0;
    this.blend();
    return true;
  }

  /** Pesos do próximo clima a partir do atual, do bioma do jogador e da hora. */
  nextWeights(biome: BiomeId, hours: number): Record<WeatherKind, number> {
    const base = WEATHER_TRANSITIONS[this.current];
    const region = REGION_WEATHER_WEIGHTS[biome];
    const morning = morningFogFactor(hours);
    for (const k of WEATHER_KINDS) {
      let w = k === this.current ? 0 : base[k] ?? 0;
      w *= region?.[k] ?? 1;
      if (k === 'fog') w *= 1 + (MORNING_FOG.weight - 1) * morning;
      this.weights[k] = w;
    }
    return this.weights;
  }

  pickNext(biome: BiomeId, hours: number): WeatherKind {
    const w = this.nextWeights(biome, hours);
    let total = 0;
    for (const k of WEATHER_KINDS) total += w[k];
    if (total <= 0) return this.current;
    let r = this.random() * total;
    for (const k of WEATHER_KINDS) {
      r -= w[k];
      if (r <= 0 && w[k] > 0) return k;
    }
    return this.current;
  }

  /**
   * Avança o tempo. Retorna o novo clima quando houve mudança natural (null caso contrário).
   */
  update(dt: number, biome: BiomeId, hours: number): WeatherKind | null {
    let changed: WeatherKind | null = null;
    if (!this.locked) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        const next = this.pickNext(biome, hours);
        const [t0, t1] = WEATHER_TIMING.transitionSeconds;
        if (this.set(next, t0 + (t1 - t0) * this.random())) changed = next;
      }
    }
    if (this.progress < 1) {
      this.progress = this.transitionSeconds > 0 ? Math.min(1, this.progress + dt / this.transitionSeconds) : 1;
      this.blend();
    }
    return changed;
  }

  /** Recalcula a mistura com curvas por parâmetro. */
  private blend() {
    const to = WEATHER[this.current];
    const p = this.progress;
    const base = smoothstep(0, 1, p);
    for (const k of MIX_KEYS) {
      const a = this.from[k];
      const b = to[k];
      let t = base;
      if (k === 'rain' || k === 'lightningPerMin') {
        // a chuva só começa com as nuvens formadas e para antes de o céu abrir
        t = b > a ? smoothstep(WEATHER_TIMING.rainLagIn, 1, p) : smoothstep(0, WEATHER_TIMING.rainLeadOut, p);
      } else if (k === 'cloudCover' || k === 'cloudDarkness' || k === 'sunDim') {
        t = b > a ? smoothstep(0, 0.75, p) : smoothstep(0.25, 1, p);
      }
      this.mix[k] = a + (b - a) * t;
    }
  }

  serialize(): WeatherSnapshot {
    return { current: this.current, timeLeft: Math.round(this.timeLeft * 10) / 10, locked: this.locked };
  }

  /** Restaura (sem transição). Lança erro se os dados forem inválidos. */
  restore(data: unknown) {
    const d = data as Partial<WeatherSnapshot> | null;
    if (!d || !isWeatherKind(d.current)) throw new Error('clima inválido no save');
    const tl = typeof d.timeLeft === 'number' && Number.isFinite(d.timeLeft) ? clamp(d.timeLeft, 1, 3600) : this.durationFor(d.current);
    this.reset(d.current, tl);
    this.locked = d.locked === true;
  }
}
