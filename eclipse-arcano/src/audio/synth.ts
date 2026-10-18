/**
 * Kit de síntese: geração de buffers (ruídos, respostas de impulso, curvas de
 * distorção) e ajudantes para criar osciladores/ruídos/filtros com envelopes.
 * Funciona com qualquer BaseAudioContext (tempo real ou offline, para testes).
 */

/** Recursos compartilhados que as receitas usam (criados uma vez). */
export interface SynthHost {
  ac: BaseAudioContext;
  white: AudioBuffer;
  pink: AudioBuffer;
  brown: AudioBuffer;
  /** Curva de saturação suave (WaveShaper). */
  softClip: Float32Array<ArrayBuffer>;
  /** Curva de distorção pesada. */
  hardClip: Float32Array<ArrayBuffer>;
  /** Contador de nós criados (estatística). */
  nodes: number;
  /** Aleatório [0,1). */
  rand(): number;
}

/** Mínimo para rampas exponenciais (não podem chegar a 0). */
export const EPS = 0.0001;

// ------------------------------------------------------------------ buffers

/** Ruído branco/rosa/marrom mono de `seconds` s. Determinístico pela semente. */
export function makeNoiseBuffer(ac: BaseAudioContext, kind: 'white' | 'pink' | 'brown', seconds: number, seed = 1): AudioBuffer {
  const len = Math.max(1, Math.floor(ac.sampleRate * seconds));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
  if (kind === 'white') {
    for (let i = 0; i < len; i++) d[i] = rnd() * 0.9;
  } else if (kind === 'pink') {
    // filtro de Paul Kellet (aprox.)
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = rnd();
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * rnd()) / 1.02;
      d[i] = last * 3.2;
    }
  }
  // emenda suave para laços sem clique
  const fade = Math.min(256, len >> 2);
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    d[i] = d[i] * t + d[len - fade + i] * (1 - t);
  }
  return buf;
}

/**
 * Resposta de impulso estéreo gerada: ruído com decaimento exponencial,
 * reflexões iniciais esparsas e agudos que caem mais rápido (absorção).
 */
export function makeImpulse(ac: BaseAudioContext, seconds: number, decay: number, preDelay = 0.012, seed = 7): AudioBuffer {
  const sr = ac.sampleRate;
  const len = Math.max(1, Math.floor(sr * seconds));
  const buf = ac.createBuffer(2, len, sr);
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
  const pre = Math.floor(preDelay * sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = pre; i < len; i++) {
      const t = (i - pre) / (len - pre);
      const env = Math.pow(1 - t, decay);
      // passa-baixas de 1 polo cujo coeficiente cresce com o tempo (agudos somem antes)
      const a = 0.15 + 0.8 * t;
      lp = lp + (rnd() - lp) * (1 - a);
      d[i] = lp * env;
    }
    // reflexões iniciais
    for (let k = 0; k < 10; k++) {
      const at = pre + Math.floor((0.004 + k * 0.009 + rnd() * 0.004) * sr * (seconds / 2));
      if (at < len) d[at] += (0.55 - k * 0.04) * (rnd() > 0 ? 1 : -1);
    }
  }
  // normaliza energia
  let e = 0;
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) e += d[i] * d[i];
  }
  const g = 1 / Math.sqrt(Math.max(e, 1e-9) / 6);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] *= g;
  }
  return buf;
}

/** Curva de saturação para WaveShaperNode. */
export function makeShaperCurve(amount: number, n = 1024): Float32Array<ArrayBuffer> {
  const c = new Float32Array(new ArrayBuffer(n * 4));
  const k = Math.max(0.01, amount);
  const norm = Math.tanh(k);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / norm;
  }
  return c;
}

// ------------------------------------------------------------------ nós

/** Ganho; `out` pode ser um nó ou um parâmetro (modulação: LFO → frequência/ganho). */
export function gain(h: SynthHost, value: number, out?: AudioNode | AudioParam): GainNode {
  const g = h.ac.createGain();
  g.gain.value = value;
  // connect() aceita nó ou parâmetro em tempo de execução (sobrecargas separadas no TS)
  if (out) g.connect(out as AudioNode);
  h.nodes++;
  return g;
}

export function filter(h: SynthHost, type: BiquadFilterType, freq: number, q: number, out?: AudioNode): BiquadFilterNode {
  const f = h.ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  if (out) f.connect(out);
  h.nodes++;
  return f;
}

export function osc(h: SynthHost, type: OscillatorType, freq: number, t: number, dur: number, out: AudioNode, detune = 0): OscillatorNode {
  const o = h.ac.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (detune) o.detune.value = detune;
  o.connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
  h.nodes++;
  return o;
}

/** Fonte de ruído com início aleatório no buffer. */
export function noise(h: SynthHost, buf: AudioBuffer, t: number, dur: number, out: AudioNode, rate = 1, loop = false): AudioBufferSourceNode {
  const s = h.ac.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = rate;
  s.loop = loop || dur > buf.duration * 0.8;
  s.connect(out);
  const off = h.rand() * Math.max(0, buf.duration - Math.min(dur, buf.duration * 0.5));
  s.start(t, off);
  s.stop(t + dur + 0.02);
  h.nodes++;
  return s;
}

export function shaper(h: SynthHost, curve: Float32Array<ArrayBuffer>, out?: AudioNode): WaveShaperNode {
  const w = h.ac.createWaveShaper();
  w.curve = curve;
  w.oversample = 'none';
  if (out) w.connect(out);
  h.nodes++;
  return w;
}

// ------------------------------------------------------------------ envelopes

/** Percussivo: ataque linear até `peak` e decaimento exponencial até ~0. */
export function perc(p: AudioParam, t: number, peak: number, attack: number, decay: number) {
  p.cancelScheduledValues(t);
  p.setValueAtTime(EPS, t);
  p.linearRampToValueAtTime(peak, t + Math.max(0.001, attack));
  p.exponentialRampToValueAtTime(EPS, t + Math.max(0.001, attack) + Math.max(0.005, decay));
}

/** ADSR com duração de sustentação `hold` (s). */
export function adsr(p: AudioParam, t: number, peak: number, a: number, d: number, sus: number, hold: number, r: number) {
  const s = Math.max(EPS, peak * sus);
  p.cancelScheduledValues(t);
  p.setValueAtTime(EPS, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.exponentialRampToValueAtTime(s, t + a + d);
  p.setValueAtTime(s, t + a + d + Math.max(0, hold));
  p.exponentialRampToValueAtTime(EPS, t + a + d + Math.max(0, hold) + r);
}

/** Varredura (exponencial por padrão) de `from` a `to` em `dur` s. */
export function sweep(p: AudioParam, t: number, from: number, to: number, dur: number, exp = true) {
  p.setValueAtTime(from, t);
  if (exp && from > 0 && to > 0) p.exponentialRampToValueAtTime(to, t + Math.max(0.001, dur));
  else p.linearRampToValueAtTime(to, t + Math.max(0.001, dur));
}

// ------------------------------------------------------------------ blocos prontos

/** Sino/metal: parciais (múltiplos da fundamental) com decaimentos independentes. */
export function partials(h: SynthHost, t: number, f0: number, ratios: readonly number[], amps: readonly number[], decays: readonly number[], out: AudioNode, type: OscillatorType = 'sine') {
  for (let i = 0; i < ratios.length; i++) {
    const g = gain(h, 0, out);
    perc(g.gain, t, amps[i] ?? 0.2, 0.002, decays[i] ?? 0.5);
    osc(h, type, f0 * ratios[i], t, (decays[i] ?? 0.5) + 0.05, g);
  }
}

/** Sopro de ruído filtrado (whoosh) com varredura do centro do passa-faixa. */
export function whoosh(h: SynthHost, t: number, dur: number, f0: number, fPeak: number, f1: number, q: number, peak: number, out: AudioNode, buf = h.pink) {
  const g = gain(h, 0, out);
  const f = filter(h, 'bandpass', f0, q, g);
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, fPeak), t + dur * 0.45);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
  g.gain.exponentialRampToValueAtTime(EPS, t + dur);
  noise(h, buf, t, dur, f);
}

/** Baque grave: senoide com queda de afinação. */
export function thump(h: SynthHost, t: number, f0: number, f1: number, dur: number, peak: number, out: AudioNode) {
  const g = gain(h, 0, out);
  perc(g.gain, t, peak, 0.002, dur);
  const o = osc(h, 'sine', f0, t, dur, g);
  o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur * 0.7);
}

/** Estalo de ruído curto (transiente). */
export function tick(h: SynthHost, t: number, freq: number, dur: number, peak: number, out: AudioNode, type: BiquadFilterType = 'highpass', buf = h.white) {
  const g = gain(h, 0, out);
  perc(g.gain, t, peak, 0.0008, dur);
  const f = filter(h, type, freq, 0.8, g);
  noise(h, buf, t, dur + 0.01, f);
}

/** Vogais (formantes F1, F2, F3 em Hz) para coro/grunhidos. */
export const VOWELS = {
  a: [800, 1150, 2900],
  o: [450, 800, 2830],
  u: [325, 700, 2530],
  e: [400, 1700, 2600],
  i: [300, 2100, 3000],
} as const;

/** Conecta `src` a um banco de formantes paralelos e retorna o ganho de saída. */
export function formants(h: SynthHost, src: AudioNode, out: AudioNode, vowel: readonly number[], q = 9, count = 2): GainNode {
  const g = gain(h, 1, out);
  const amps = [1, 0.55, 0.3];
  for (let i = 0; i < Math.min(count, vowel.length); i++) {
    const fg = gain(h, amps[i], g);
    const f = filter(h, 'bandpass', vowel[i], q, fg);
    src.connect(f);
  }
  return g;
}
