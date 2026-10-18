/**
 * Receitas de efeitos sonoros: cada SfxId vira uma pequena síntese (osciladores,
 * ruído filtrado, envelopes). As receitas recebem o instante de início e a saída
 * (o "VCA" da voz) e retornam a duração em segundos. Nada de arquivos externos.
 */
import type { SfxId } from './Audio';
import { EPS, VOWELS, adsr, filter, formants, gain, noise, osc, partials, perc, shaper, sweep, thump, tick, whoosh, type SynthHost } from './synth';

export interface RecipeParams {
  /** Multiplicador de afinação (já com a variação aleatória). */
  pitch: number;
  /** Intensidade pedida pelo chamador (opts.volume) — muda timbre, não só volume. */
  intensity: number;
  /** Superfície (passos). */
  surface: string;
  /** Variante livre (tipo de dano, espécie...). */
  variant: string;
  /** Distância até o ouvinte (m). */
  distance: number;
  /** Correndo (passos). */
  running: boolean;
}

export type Recipe = (h: SynthHost, t: number, out: AudioNode, p: RecipeParams) => number;

const r = (h: SynthHost, a: number, b: number) => a + (b - a) * h.rand();

// ------------------------------------------------------------------ interface

const uiClick: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.7, 0.001, 0.05);
  const o = osc(h, 'triangle', 1900 * p.pitch, t, 0.06, g);
  o.frequency.exponentialRampToValueAtTime(1150 * p.pitch, t + 0.04);
  tick(h, t, 4000, 0.012, 0.25, out);
  return 0.08;
};

const uiHover: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.35, 0.004, 0.035);
  osc(h, 'sine', 2600 * p.pitch, t, 0.045, g);
  return 0.05;
};

/** Duas notas com brilho (abrir/fechar). */
function twoTone(h: SynthHost, t: number, out: AudioNode, f0: number, f1: number, p: RecipeParams) {
  for (let i = 0; i < 2; i++) {
    const tt = t + i * 0.06;
    const g = gain(h, 0, out);
    perc(g.gain, tt, 0.45, 0.004, 0.18);
    osc(h, 'sine', (i ? f1 : f0) * p.pitch, tt, 0.2, g);
    osc(h, 'triangle', (i ? f1 : f0) * 2 * p.pitch, tt, 0.12, g, 7);
  }
  const s = gain(h, 0, out);
  perc(s.gain, t, 0.08, 0.02, 0.25);
  const f = filter(h, 'highpass', 6000, 0.7, s);
  noise(h, h.white, t, 0.3, f);
  return 0.35;
}
const uiOpen: Recipe = (h, t, out, p) => twoTone(h, t, out, 660, 990, p);
const uiClose: Recipe = (h, t, out, p) => twoTone(h, t, out, 880, 587, p);

const uiError: Recipe = (h, t, out, p) => {
  for (let i = 0; i < 2; i++) {
    const tt = t + i * 0.11;
    const g = gain(h, 0, out);
    perc(g.gain, tt, 0.5, 0.003, 0.08);
    const f = filter(h, 'lowpass', 1400, 1, g);
    osc(h, 'square', 165 * p.pitch, tt, 0.09, f);
    osc(h, 'sawtooth', 171 * p.pitch, tt, 0.09, f);
  }
  return 0.25;
};

/** Arpejo de sinos (missões, descoberta, nível). */
function bellArp(h: SynthHost, t: number, out: AudioNode, notes: readonly number[], step: number, decay: number, amp: number) {
  for (let i = 0; i < notes.length; i++) {
    const f = 440 * Math.pow(2, (notes[i] - 69) / 12);
    partials(h, t + i * step, f, [1, 2.0, 3.01, 4.2], [amp, amp * 0.35, amp * 0.18, amp * 0.08], [decay, decay * 0.6, decay * 0.4, decay * 0.25], out);
  }
}

function softPad(h: SynthHost, t: number, out: AudioNode, notes: readonly number[], dur: number, amp: number, cutoff = 1800) {
  const g = gain(h, 0, out);
  adsr(g.gain, t, amp, dur * 0.3, dur * 0.2, 0.7, dur * 0.2, dur * 0.4);
  const f = filter(h, 'lowpass', cutoff, 0.6, g);
  for (const n of notes) {
    const fr = 440 * Math.pow(2, (n - 69) / 12);
    osc(h, 'sawtooth', fr, t, dur + 0.1, f, -6);
    osc(h, 'sawtooth', fr, t, dur + 0.1, f, 6);
  }
}

const questStart: Recipe = (h, t, out) => {
  bellArp(h, t, out, [74, 81, 86], 0.11, 1.1, 0.35);
  softPad(h, t, out, [62, 69], 1.2, 0.08);
  return 1.5;
};

const questComplete: Recipe = (h, t, out) => {
  bellArp(h, t, out, [74, 78, 81, 86], 0.1, 1.4, 0.32);
  softPad(h, t + 0.05, out, [62, 66, 69, 74], 1.8, 0.09, 2400);
  thump(h, t, 110, 55, 0.5, 0.35, out);
  return 2.2;
};

const levelUp: Recipe = (h, t, out) => {
  // varredura brilhante subindo
  const g = gain(h, 0, out);
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(0.25, t + 0.7);
  g.gain.exponentialRampToValueAtTime(EPS, t + 1.5);
  const f = filter(h, 'bandpass', 400, 4, g);
  sweep(f.frequency, t, 400, 7000, 1.2);
  noise(h, h.white, t, 1.6, f);
  bellArp(h, t + 0.2, out, [69, 74, 78, 81, 86, 90], 0.08, 1.6, 0.26);
  softPad(h, t + 0.3, out, [62, 69, 74, 78], 2.2, 0.1, 2600);
  thump(h, t + 0.2, 90, 40, 0.8, 0.4, out);
  return 2.8;
};

const discovery: Recipe = (h, t, out) => {
  bellArp(h, t, out, [69, 76, 81], 0.18, 1.8, 0.28);
  softPad(h, t, out, [57, 64, 69], 2.4, 0.09, 1500);
  return 2.8;
};

const pickup: Recipe = (h, t, out, p) => {
  for (let i = 0; i < 2; i++) {
    const g = gain(h, 0, out);
    perc(g.gain, t + i * 0.055, 0.45, 0.002, 0.11);
    osc(h, 'sine', (i ? 1760 : 1175) * p.pitch, t + i * 0.055, 0.13, g);
  }
  return 0.22;
};

const goldCoins: Recipe = (h, t, out, p) => {
  const n = 2 + Math.floor(h.rand() * 3);
  let tt = t;
  for (let i = 0; i < n; i++) {
    const f0 = r(h, 2200, 2900) * p.pitch;
    partials(h, tt, f0, [1, 1.53, 2.31, 3.1], [0.22, 0.16, 0.1, 0.05], [0.16, 0.12, 0.08, 0.05], out);
    tt += r(h, 0.035, 0.07);
  }
  return tt - t + 0.2;
};

const equip: Recipe = (h, t, out, p) => {
  tick(h, t, 1500, 0.06, 0.4, out, 'bandpass', h.pink);
  thump(h, t, 160 * p.pitch, 90, 0.08, 0.35, out);
  partials(h, t + 0.03, 1100 * p.pitch, [1, 2.4, 3.8], [0.18, 0.1, 0.05], [0.18, 0.12, 0.07], out);
  return 0.3;
};

const potion: Recipe = (h, t, out, p) => {
  // rolha + goles (bolhas subindo)
  tick(h, t, 1200, 0.03, 0.4, out, 'bandpass');
  for (let i = 0; i < 4; i++) {
    const tt = t + 0.12 + i * r(h, 0.08, 0.13);
    const g = gain(h, 0, out);
    perc(g.gain, tt, 0.35, 0.004, 0.07);
    const o = osc(h, 'sine', r(h, 260, 380) * p.pitch, tt, 0.08, g);
    o.frequency.exponentialRampToValueAtTime(r(h, 600, 900) * p.pitch, tt + 0.06);
  }
  // brilho mágico do efeito
  const s = gain(h, 0, out);
  adsr(s.gain, t + 0.5, 0.08, 0.1, 0.1, 0.6, 0.2, 0.4);
  osc(h, 'sine', 1568 * p.pitch, t + 0.5, 0.85, s);
  osc(h, 'sine', 2093 * p.pitch, t + 0.5, 0.85, s, 5);
  return 1.4;
};

const death: Recipe = (h, t, out) => {
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.3, 0.3, 0.6, 0.6, 1.0, 1.4);
  const f = filter(h, 'lowpass', 900, 0.8, g);
  const o1 = osc(h, 'sawtooth', 110, t, 3.4, f, -8);
  const o2 = osc(h, 'sawtooth', 110 * 1.189, t, 3.4, f, 8);
  o1.frequency.exponentialRampToValueAtTime(55, t + 3);
  o2.frequency.exponentialRampToValueAtTime(55 * 1.189, t + 3);
  partials(h, t + 0.1, 146.8, [0.5, 1, 1.18, 1.5, 2, 2.5], [0.2, 0.3, 0.15, 0.12, 0.1, 0.05], [3, 2.6, 2, 1.6, 1.2, 0.8], out);
  return 3.6;
};

const respawn: Recipe = (h, t, out) => {
  const g = gain(h, 0, out);
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.8);
  g.gain.exponentialRampToValueAtTime(EPS, t + 2);
  const f = filter(h, 'bandpass', 300, 3, g);
  sweep(f.frequency, t, 300, 3200, 1.5);
  noise(h, h.pink, t, 2, f);
  bellArp(h, t + 0.6, out, [62, 69, 74], 0.14, 1.4, 0.22);
  return 2.4;
};

const heartbeat: Recipe = (h, t, out) => {
  thump(h, t, 70, 42, 0.14, 0.8, out);
  thump(h, t + 0.2, 62, 40, 0.16, 0.55, out);
  return 0.45;
};

/** Atualização de missão: carrilhão curto de duas notas. */
const questUpdate: Recipe = (h, t, out) => {
  bellArp(h, t, out, [81, 86], 0.09, 0.8, 0.22);
  return 1;
};

// ------------------------------------------------------------------ jogador

const footstep: Recipe = (h, t, out, p) => {
  const k = p.pitch;
  const v = p.running ? 1 : 0.75;
  switch (p.surface) {
    case 'water': {
      whoosh(h, t, 0.2, 700 * k, 2600 * k, 1200 * k, 1.1, 0.7 * v, out, h.white);
      for (let i = 0; i < 2; i++) {
        const tt = t + 0.03 + i * 0.05;
        const g = gain(h, 0, out);
        perc(g.gain, tt, 0.25 * v, 0.003, 0.05);
        const o = osc(h, 'sine', r(h, 450, 650), tt, 0.06, g);
        o.frequency.exponentialRampToValueAtTime(r(h, 1000, 1400), tt + 0.05);
      }
      return 0.25;
    }
    case 'mud': {
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.8 * v, 0.01, 0.16);
      const f = filter(h, 'lowpass', 1400 * k, 3, g);
      sweep(f.frequency, t, 1400 * k, 260, 0.16);
      noise(h, h.brown, t, 0.2, f);
      thump(h, t, 85 * k, 50, 0.09, 0.35 * v, out);
      return 0.22;
    }
    case 'sand': {
      for (let i = 0; i < 3; i++) tick(h, t + i * r(h, 0.012, 0.022), 3000 * k, 0.03, 0.3 * v, out, 'bandpass');
      thump(h, t, 100 * k, 70, 0.05, 0.2 * v, out);
      return 0.12;
    }
    case 'stone': {
      tick(h, t, 2200 * k, 0.025, 0.55 * v, out);
      thump(h, t, 190 * k, 120, 0.045, 0.35 * v, out);
      tick(h, t + 0.008, 900 * k, 0.04, 0.2 * v, out, 'bandpass', h.pink);
      return 0.09;
    }
    case 'wood': {
      thump(h, t, 230 * k, 170, 0.1, 0.6 * v, out);
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.35 * v, 0.002, 0.07);
      const f = filter(h, 'bandpass', 650 * k, 5, g);
      noise(h, h.pink, t, 0.08, f);
      tick(h, t, 3200, 0.012, 0.15 * v, out);
      return 0.14;
    }
    case 'metal': {
      partials(h, t, 420 * k, [1, 2.31, 3.87, 5.1], [0.22, 0.17, 0.11, 0.06], [0.28, 0.2, 0.13, 0.08], out);
      tick(h, t, 3000, 0.02, 0.3 * v, out);
      return 0.32;
    }
    case 'dirt': {
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.75 * v, 0.003, 0.07);
      const f = filter(h, 'lowpass', 950 * k, 0.9, g);
      noise(h, h.brown, t, 0.09, f);
      tick(h, t + 0.005, 1900 * k, 0.03, 0.15 * v, out, 'bandpass');
      thump(h, t, 110 * k, 70, 0.05, 0.28 * v, out);
      return 0.11;
    }
    default: {
      // grama
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.55 * v, 0.006, 0.09);
      const f = filter(h, 'bandpass', 2600 * k, 0.9, g);
      noise(h, h.white, t, 0.11, f);
      thump(h, t, 95 * k, 60, 0.06, 0.22 * v, out);
      return 0.12;
    }
  }
};

/** Jogador ferido: baque no corpo + expiração curta por formantes. */
const hurt: Recipe = (h, t, out, p) => {
  thump(h, t, 120 * p.pitch, 55, 0.16, 0.8, out);
  const env = gain(h, 0, out);
  adsr(env.gain, t + 0.01, 0.4 * Math.min(1.4, p.intensity), 0.015, 0.05, 0.5, 0.05, 0.13);
  const src = gain(h, 0.6);
  formants(h, src, env, VOWELS.a, 6, 2);
  noise(h, h.pink, t, 0.3, src);
  const o = osc(h, 'sawtooth', 150 * p.pitch, t + 0.01, 0.25, src);
  o.frequency.exponentialRampToValueAtTime(95 * p.pitch, t + 0.22);
  return 0.32;
};

/** Papel/pergaminho (ler placas, livros, cartas). */
const page: Recipe = (h, t, out, p) => {
  for (let i = 0; i < 2; i++) {
    const tt = t + i * r(h, 0.07, 0.12);
    const g = gain(h, 0, out);
    g.gain.setValueAtTime(EPS, tt);
    g.gain.linearRampToValueAtTime(0.45, tt + 0.03);
    g.gain.exponentialRampToValueAtTime(EPS, tt + 0.16);
    const f = filter(h, 'bandpass', r(h, 2800, 4200) * p.pitch, 1.4, g);
    noise(h, h.white, tt, 0.18, f);
  }
  thump(h, t, 180, 120, 0.05, 0.12, out);
  return 0.32;
};

const jump: Recipe = (h, t, out, p) => {
  whoosh(h, t, 0.2, 500 * p.pitch, 1800 * p.pitch, 900, 1.3, 0.5, out);
  tick(h, t, 900, 0.05, 0.2, out, 'lowpass', h.pink);
  return 0.22;
};

const land: Recipe = (h, t, out, p) => {
  const k = Math.min(1.6, 0.5 + p.intensity);
  thump(h, t, 95 * p.pitch, 38, 0.18 + k * 0.1, 0.75 * k, out);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.5 * k, 0.004, 0.22);
  const f = filter(h, 'lowpass', 1300, 0.7, g);
  noise(h, h.brown, t, 0.25, f);
  return 0.4;
};

const dodge: Recipe = (h, t, out, p) => {
  whoosh(h, t, 0.26, 600 * p.pitch, 3000 * p.pitch, 800, 1.4, 0.65, out);
  const g = gain(h, 0, out);
  perc(g.gain, t + 0.02, 0.07, 0.03, 0.2);
  const o = osc(h, 'sine', 1800 * p.pitch, t, 0.25, g);
  o.frequency.exponentialRampToValueAtTime(3600 * p.pitch, t + 0.2);
  return 0.3;
};

const flightStart: Recipe = (h, t, out, p) => {
  whoosh(h, t, 0.8, 300, 2400, 1200, 0.9, 0.6, out);
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.22, 0.25, 0.2, 0.5, 0.1, 0.4);
  const f = filter(h, 'lowpass', 300, 4, g);
  sweep(f.frequency, t, 300, 2800, 0.6);
  osc(h, 'sawtooth', 110 * p.pitch, t, 1, f, -10);
  osc(h, 'sawtooth', 165 * p.pitch, t, 1, f, 10);
  return 1.05;
};

const flightEnd: Recipe = (h, t, out, p) => {
  whoosh(h, t, 0.6, 1800, 900, 250, 0.9, 0.5, out);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.14, 0.02, 0.5);
  const o = osc(h, 'triangle', 660 * p.pitch, t, 0.55, g);
  o.frequency.exponentialRampToValueAtTime(220 * p.pitch, t + 0.5);
  return 0.7;
};

// ------------------------------------------------------------------ combate

const swing: Recipe = (h, t, out, p) => {
  whoosh(h, t, 0.17, 500 * p.pitch, 2600 * p.pitch, 1000 * p.pitch, 2.2, 0.7, out);
  return 0.19;
};

const swingHeavy: Recipe = (h, t, out, p) => {
  whoosh(h, t, 0.32, 280 * p.pitch, 1500 * p.pitch, 500 * p.pitch, 1.6, 0.8, out);
  thump(h, t + 0.05, 120 * p.pitch, 55, 0.2, 0.3, out);
  return 0.36;
};

const hitFlesh: Recipe = (h, t, out, p) => {
  thump(h, t, 140 * p.pitch, 50, 0.12, 0.9, out);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.6, 0.002, 0.07);
  const f = filter(h, 'lowpass', 1700 * p.pitch, 1.2, g);
  noise(h, h.pink, t, 0.08, f);
  tick(h, t, 2500, 0.02, 0.25, out, 'bandpass');
  return 0.16;
};

const hitMetal: Recipe = (h, t, out, p) => {
  const f0 = r(h, 300, 380) * p.pitch;
  partials(h, t, f0, [1, 2.76, 5.4, 8.93], [0.3, 0.22, 0.13, 0.07], [0.7, 0.5, 0.32, 0.18], out);
  tick(h, t, 3500, 0.03, 0.6, out);
  thump(h, t, 160 * p.pitch, 80, 0.07, 0.35, out);
  return 0.75;
};

const hitMagic: Recipe = (h, t, out, p) => {
  const k = p.pitch;
  switch (p.variant) {
    case 'fire': {
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.7, 0.005, 0.3);
      const f = filter(h, 'lowpass', 2400, 0.8, g);
      noise(h, h.brown, t, 0.35, f, 1.4);
      for (let i = 0; i < 5; i++) tick(h, t + r(h, 0, 0.25), r(h, 2000, 5000), 0.012, 0.25, out);
      thump(h, t, 110 * k, 50, 0.15, 0.5, out);
      return 0.4;
    }
    case 'frost': {
      partials(h, t, 1900 * k, [1, 1.41, 2.13, 2.97], [0.16, 0.13, 0.1, 0.06], [0.5, 0.4, 0.3, 0.2], out);
      tick(h, t, 5000, 0.05, 0.5, out);
      return 0.55;
    }
    case 'lightning': {
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.5, 0.001, 0.2);
      const f = filter(h, 'bandpass', 1800, 0.6, g);
      osc(h, 'square', 62 * k, t, 0.22, f);
      osc(h, 'sawtooth', 93 * k, t, 0.22, f);
      tick(h, t, 4000, 0.06, 0.6, out);
      return 0.25;
    }
    case 'void': {
      thump(h, t, 90 * k, 30, 0.35, 0.8, out);
      const g = gain(h, 0, out);
      adsr(g.gain, t, 0.3, 0.02, 0.1, 0.4, 0.05, 0.25);
      const f = filter(h, 'lowpass', 700, 6, g);
      sweep(f.frequency, t, 1600, 200, 0.4);
      osc(h, 'sawtooth', 55 * k, t, 0.45, f);
      return 0.45;
    }
    case 'time': {
      for (let i = 0; i < 3; i++) tick(h, t + i * 0.07, 3000 - i * 600, 0.015, 0.4, out, 'bandpass');
      partials(h, t, 1320 * k, [1, 2.0, 3.0], [0.15, 0.08, 0.04], [0.6, 0.4, 0.2], out);
      return 0.6;
    }
    default: {
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.5, 0.002, 0.18);
      const f = filter(h, 'bandpass', 1800 * k, 2, g);
      sweep(f.frequency, t, 2400 * k, 400 * k, 0.18);
      const o = osc(h, 'sawtooth', 900 * k, t, 0.2, f);
      o.frequency.exponentialRampToValueAtTime(220 * k, t + 0.18);
      tick(h, t, 6000, 0.08, 0.3, out);
      thump(h, t, 120 * k, 60, 0.1, 0.4, out);
      return 0.25;
    }
  }
};

const block: Recipe = (h, t, out, p) => {
  thump(h, t, 130 * p.pitch, 70, 0.14, 0.8, out);
  partials(h, t, 260 * p.pitch, [1, 2.3, 3.6], [0.25, 0.15, 0.08], [0.3, 0.2, 0.12], out);
  tick(h, t, 1800, 0.05, 0.5, out, 'bandpass', h.pink);
  return 0.35;
};

const parry: Recipe = (h, t, out, p) => {
  partials(h, t, 1400 * p.pitch, [1, 2.41, 3.93, 5.2], [0.3, 0.2, 0.12, 0.07], [0.9, 0.6, 0.4, 0.25], out);
  tick(h, t, 5000, 0.05, 0.7, out);
  whoosh(h, t, 0.25, 3000, 7000, 4000, 2, 0.25, out, h.white);
  return 0.95;
};

const combo: Recipe = (h, t, out, p) => {
  thump(h, t, 80, 30, 0.6, 0.7, out);
  bellArp(h, t + 0.02, out, [74 + 12 * (p.pitch - 1), 81, 86, 93], 0.05, 0.9, 0.22);
  whoosh(h, t, 0.6, 400, 5000, 1500, 1.5, 0.35, out, h.white);
  return 1.1;
};

// ------------------------------------------------------------------ magias

const castArcane: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.45, 0.01, 0.3);
  const o1 = osc(h, 'sine', 320 * p.pitch, t, 0.32, g, -12);
  const o2 = osc(h, 'triangle', 320 * p.pitch, t, 0.32, g, 12);
  o1.frequency.exponentialRampToValueAtTime(980 * p.pitch, t + 0.22);
  o2.frequency.exponentialRampToValueAtTime(980 * p.pitch, t + 0.22);
  whoosh(h, t, 0.3, 1500, 6000, 3000, 2, 0.25, out, h.white);
  return 0.35;
};

const castLance: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.5, 0.02, 0.1, 0.6, 0.15, 0.25);
  const f = filter(h, 'bandpass', 3000, 3, g);
  sweep(f.frequency, t, 3200, 600, 0.5);
  osc(h, 'sawtooth', 110 * p.pitch, t, 0.55, f);
  osc(h, 'sawtooth', 165.5 * p.pitch, t, 0.55, f);
  tick(h, t, 4000, 0.08, 0.6, out);
  thump(h, t, 140, 50, 0.2, 0.4, out);
  return 0.6;
};

const castExplosion: Recipe = (h, t, out, p) => {
  thump(h, t, 85 * p.pitch, 28, 1.1, 1, out);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.8, 0.005, 1.1);
  const f = filter(h, 'lowpass', 3200, 0.7, g);
  sweep(f.frequency, t, 3200, 180, 1.0);
  noise(h, h.brown, t, 1.2, f, 0.9);
  bellArp(h, t + 0.04, out, [69, 76], 0.03, 0.8, 0.12);
  return 1.3;
};

const castChains: Recipe = (h, t, out, p) => {
  for (let i = 0; i < 6; i++) {
    const tt = t + i * r(h, 0.04, 0.08);
    partials(h, tt, r(h, 900, 1500) * p.pitch, [1, 2.7, 4.6], [0.12, 0.08, 0.04], [0.12, 0.08, 0.05], out);
    tick(h, tt, 2500, 0.015, 0.2, out, 'bandpass');
  }
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.2, 0.05, 0.2, 0.5, 0.2, 0.3);
  const f = filter(h, 'lowpass', 900, 3, g);
  osc(h, 'sawtooth', 73.4 * p.pitch, t, 0.8, f);
  return 0.85;
};

const castShield: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.28, 0.15, 0.2, 0.6, 0.3, 0.4);
  for (const n of [57, 64, 69]) {
    const fr = 440 * Math.pow(2, (n - 69) / 12) * p.pitch;
    osc(h, 'sine', fr, t, 1.1, g, -5);
    osc(h, 'sine', fr * 2, t, 1.1, g, 5);
  }
  whoosh(h, t, 0.9, 2000, 8000, 5000, 3, 0.12, out, h.white);
  return 1.1;
};

const castTeleport: Recipe = (h, t, out, p) => {
  // aspiração (sobe) + estalo
  const g = gain(h, 0, out);
  g.gain.setValueAtTime(EPS, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.18);
  g.gain.exponentialRampToValueAtTime(EPS, t + 0.22);
  const f = filter(h, 'highpass', 600, 1, g);
  sweep(f.frequency, t, 600, 6000, 0.2);
  noise(h, h.white, t, 0.24, f);
  const z = gain(h, 0, out);
  perc(z.gain, t + 0.18, 0.5, 0.001, 0.15);
  const o = osc(h, 'sine', 2200 * p.pitch, t + 0.18, 0.16, z);
  o.frequency.exponentialRampToValueAtTime(180 * p.pitch, t + 0.32);
  return 0.4;
};

/** Estalo elétrico com cintilação. */
function crack(h: SynthHost, t: number, out: AudioNode, dur: number, amp: number) {
  const g = gain(h, 0, out);
  g.gain.setValueAtTime(EPS, t);
  let tt = t;
  while (tt < t + dur) {
    g.gain.setValueAtTime(amp * r(h, 0.3, 1), tt);
    tt += r(h, 0.008, 0.03);
  }
  g.gain.setValueAtTime(amp * 0.4, tt);
  g.gain.exponentialRampToValueAtTime(EPS, tt + 0.15);
  const f = filter(h, 'highpass', 1200, 0.7, g);
  noise(h, h.white, t, dur + 0.2, f);
  return tt + 0.15 - t;
}

const castLightning: Recipe = (h, t, out, p) => {
  const d = crack(h, t, out, 0.35, 0.7);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.35, 0.002, 0.6);
  const f = filter(h, 'lowpass', 1600, 2, g);
  osc(h, 'sawtooth', 58 * p.pitch, t, 0.65, f);
  osc(h, 'square', 87 * p.pitch, t, 0.65, f);
  thump(h, t + 0.05, 80, 30, 0.6, 0.6, out);
  return Math.max(d, 0.7);
};

const castBlades: Recipe = (h, t, out, p) => {
  for (let i = 0; i < 3; i++) whoosh(h, t + i * 0.07, 0.18, 800, 4200 * p.pitch, 1500, 2.5, 0.45, out);
  partials(h, t, 1700 * p.pitch, [1, 1.5, 2.25], [0.14, 0.1, 0.06], [0.6, 0.4, 0.3], out);
  return 0.65;
};

const castRift: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.6, 0.3, 0.4, 0.6, 0.4, 0.6);
  const f = filter(h, 'lowpass', 400, 5, g);
  const lfo = osc(h, 'sine', 5, t, 1.8, gain(h, 25, f.frequency));
  void lfo;
  const o = osc(h, 'sawtooth', 65 * p.pitch, t, 1.8, f);
  o.frequency.exponentialRampToValueAtTime(32 * p.pitch, t + 1.6);
  osc(h, 'sine', 41 * p.pitch, t, 1.8, g);
  whoosh(h, t, 1.6, 2000, 300, 120, 1.2, 0.4, out, h.brown);
  return 1.8;
};

const castAscend: Recipe = (h, t, out, p) => {
  // coro sintetizado subindo + varredura + baque
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.35, 0.8, 0.4, 0.7, 0.6, 1);
  const src = gain(h, 1);
  for (const n of [50, 57, 62, 66]) {
    const fr = 440 * Math.pow(2, (n - 69) / 12) * p.pitch;
    const o = osc(h, 'sawtooth', fr * 0.5, t, 2.9, src, (h.rand() - 0.5) * 18);
    o.frequency.exponentialRampToValueAtTime(fr, t + 1.6);
  }
  formants(h, src, g, VOWELS.a, 8, 2);
  whoosh(h, t, 2, 200, 6000, 3000, 1.2, 0.35, out, h.white);
  thump(h, t + 1.4, 70, 25, 1, 0.9, out);
  return 2.9;
};

const explosion: Recipe = (h, t, out, p) => {
  const k = p.pitch;
  thump(h, t, 70 * k, 22, 1.3, 1, out);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.9, 0.003, 1.4);
  const f = filter(h, 'lowpass', 4000 * k, 0.7, g);
  sweep(f.frequency, t, 4000 * k, 150, 1.3);
  noise(h, h.brown, t, 1.5, f, 0.8);
  tick(h, t, 2500, 0.08, 0.5, out);
  return 1.5;
};

const thunder: Recipe = (h, t, out, p) => {
  const near = p.distance < 260;
  let dur = 0;
  if (near) dur = crack(h, t, out, 0.25 + h.rand() * 0.2, 0.9 * (1 - p.distance / 300));
  const len = 3.5 + h.rand() * 3 + Math.min(3, p.distance / 400);
  const g = gain(h, 0, out);
  // estrondo com "rolagem" (vários picos)
  g.gain.setValueAtTime(EPS, t);
  let tt = t + (near ? 0.05 : 0.2);
  g.gain.linearRampToValueAtTime(near ? 0.9 : 0.6, tt);
  const rolls = 3 + Math.floor(h.rand() * 4);
  for (let i = 0; i < rolls; i++) {
    tt += (len / rolls) * r(h, 0.5, 1);
    g.gain.linearRampToValueAtTime(r(h, 0.25, 0.75) * (1 - i / (rolls + 1)), tt);
  }
  g.gain.exponentialRampToValueAtTime(EPS, t + len);
  const f = filter(h, 'lowpass', near ? 900 : Math.max(180, 600 - p.distance * 0.3), 0.8, g);
  sweep(f.frequency, t, near ? 1400 : 500, 160, len);
  noise(h, h.brown, t, len, f, 0.7);
  thump(h, t, 60, 25, 1.5, near ? 0.6 : 0.35, out);
  return Math.max(dur, len);
};

// ------------------------------------------------------------------ inimigos/criaturas

const enemyAlert: Recipe = (h, t, out, p) => {
  const src = gain(h, 0);
  adsr(src.gain, t, 0.6, 0.03, 0.1, 0.6, 0.08, 0.12);
  const o = osc(h, 'sawtooth', 190 * p.pitch, t, 0.35, src);
  o.frequency.linearRampToValueAtTime(290 * p.pitch, t + 0.12);
  o.frequency.linearRampToValueAtTime(220 * p.pitch, t + 0.3);
  formants(h, src, out, VOWELS.a, 7, 2);
  partials(h, t, 1250 * p.pitch, [1, 2.7], [0.1, 0.05], [0.3, 0.2], out, 'square');
  return 0.4;
};

const enemyDeath: Recipe = (h, t, out, p) => {
  const src = gain(h, 0);
  adsr(src.gain, t, 0.55, 0.02, 0.15, 0.6, 0.3, 0.4);
  const o = osc(h, 'sawtooth', 210 * p.pitch, t, 0.9, src);
  o.frequency.exponentialRampToValueAtTime(60 * p.pitch, t + 0.8);
  formants(h, src, out, VOWELS.o, 6, 2);
  // dissipação (corrupção se desfazendo)
  const g = gain(h, 0, out);
  adsr(g.gain, t + 0.2, 0.15, 0.2, 0.3, 0.5, 0.2, 0.5);
  const f = filter(h, 'bandpass', 3000, 2, g);
  sweep(f.frequency, t + 0.2, 3000, 800, 1);
  noise(h, h.white, t + 0.2, 1.1, f);
  return 1.35;
};

const bossRoar: Recipe = (h, t, out, p) => {
  const dur = 1.9;
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.55, 0.12, 0.4, 0.75, 0.7, 0.6);
  const sh = shaper(h, h.hardClip, g);
  const f = filter(h, 'bandpass', 500, 1.2, sh);
  sweep(f.frequency, t, 300, 1100, 0.6);
  f.frequency.exponentialRampToValueAtTime(350, t + dur);
  for (const m of [1, 1.5, 2.01]) {
    const o = osc(h, 'sawtooth', 55 * m * p.pitch, t, dur, f, (h.rand() - 0.5) * 30);
    o.frequency.linearRampToValueAtTime(48 * m * p.pitch, t + dur);
  }
  // rangido mecânico
  const gn = gain(h, 0, out);
  adsr(gn.gain, t, 0.3, 0.1, 0.3, 0.6, 0.8, 0.5);
  const fn = filter(h, 'bandpass', 2400, 4, gn);
  noise(h, h.pink, t, dur, fn, 0.6);
  thump(h, t, 60, 28, 1.2, 0.7, out);
  return dur + 0.2;
};

const bossSlam: Recipe = (h, t, out, p) => {
  thump(h, t, 55 * p.pitch, 20, 1.3, 1, out);
  partials(h, t, 150 * p.pitch, [1, 2.76, 5.4], [0.3, 0.18, 0.08], [1, 0.6, 0.35], out);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.8, 0.003, 1.1);
  const f = filter(h, 'lowpass', 2500, 0.7, g);
  sweep(f.frequency, t, 2500, 120, 1.1);
  noise(h, h.brown, t, 1.2, f);
  return 1.4;
};

const bossLaser: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.45, 0.4, 0.1, 0.8, 0.5, 0.3);
  const f = filter(h, 'bandpass', 900, 2, g);
  sweep(f.frequency, t, 600, 3500, 0.8);
  const o = osc(h, 'sawtooth', 180 * p.pitch, t, 1.35, f);
  o.frequency.exponentialRampToValueAtTime(1150 * p.pitch, t + 0.8);
  const am = gain(h, 0.5, g.gain);
  osc(h, 'square', 32, t, 1.35, am);
  osc(h, 'square', 360 * p.pitch, t + 0.8, 0.5, gain(h, 0.12, g));
  return 1.4;
};

/**
 * Voz animal paramétrica pela afinação pedida: >1,6 cacarejo/pio; 1,1–1,6 balido
 * de cervo; 0,7–1,1 latido/uivo curto; <0,7 rugido de fera grande (grifo, dragão).
 */
const creatureCall: Recipe = (h, t, out, p) => {
  const k = p.pitch;
  if (k >= 1.6) {
    const n = 2 + Math.floor(h.rand() * 3);
    for (let i = 0; i < n; i++) {
      const tt = t + i * r(h, 0.09, 0.14);
      const src = gain(h, 0);
      perc(src.gain, tt, 0.5, 0.004, 0.07);
      const o = osc(h, 'sawtooth', 380 * k, tt, 0.08, src);
      o.frequency.exponentialRampToValueAtTime(260 * k, tt + 0.07);
      formants(h, src, out, VOWELS.a, 5, 2);
    }
    return n * 0.14 + 0.1;
  }
  if (k >= 1.1) {
    const src = gain(h, 0);
    adsr(src.gain, t, 0.5, 0.04, 0.1, 0.7, 0.25, 0.15);
    const o = osc(h, 'sawtooth', 300 * k, t, 0.6, src);
    o.frequency.linearRampToValueAtTime(380 * k, t + 0.15);
    o.frequency.linearRampToValueAtTime(280 * k, t + 0.5);
    const vib = gain(h, 14 * k, o.frequency);
    osc(h, 'sine', 7, t, 0.6, vib);
    formants(h, src, out, VOWELS.e, 6, 2);
    return 0.65;
  }
  const big = k < 0.7;
  const dur = big ? 1.6 : 0.7;
  const src = gain(h, 0);
  adsr(src.gain, t, 0.6, big ? 0.15 : 0.03, 0.2, 0.7, dur * 0.4, dur * 0.4);
  const base = (big ? 160 : 260) * k;
  for (const m of big ? [1, 1.49] : [1]) {
    const o = osc(h, 'sawtooth', base * m, t, dur, src, (h.rand() - 0.5) * 20);
    o.frequency.linearRampToValueAtTime(base * m * 1.25, t + dur * 0.3);
    o.frequency.linearRampToValueAtTime(base * m * 0.8, t + dur);
  }
  // aspereza (rosnado) por modulação de amplitude
  const am = gain(h, 0.35, src.gain);
  osc(h, 'sine', big ? 28 : 38, t, dur, am);
  const sink = big ? shaper(h, h.softClip, out) : out;
  formants(h, src, sink, big ? VOWELS.a : VOWELS.o, 5, 2);
  return dur + 0.1;
};

// ------------------------------------------------------------------ mundo

/** Rangido de dobradiça + baque. `heavy` = portão. */
function creak(h: SynthHost, t: number, out: AudioNode, p: RecipeParams, heavy: boolean) {
  const dur = heavy ? 2.2 : 0.8;
  const g = gain(h, 0, out);
  adsr(g.gain, t, 0.4, 0.05, 0.2, 0.7, dur * 0.5, dur * 0.3);
  const f = filter(h, 'bandpass', heavy ? 420 : 900, 9, g);
  const o = osc(h, 'sawtooth', (heavy ? 45 : 90) * p.pitch, t, dur, f);
  // "agarra e solta" da dobradiça
  let tt = t;
  while (tt < t + dur) {
    o.frequency.setValueAtTime(r(h, 0.8, 1.25) * (heavy ? 45 : 90) * p.pitch, tt);
    tt += r(h, 0.04, 0.11);
  }
  f.frequency.linearRampToValueAtTime((heavy ? 600 : 1300) * p.pitch, t + dur);
  if (heavy) {
    const gn = gain(h, 0, out);
    adsr(gn.gain, t, 0.25, 0.2, 0.3, 0.6, dur * 0.4, 0.4);
    const fn = filter(h, 'lowpass', 500, 1, gn);
    noise(h, h.brown, t, dur, fn);
  }
  thump(h, t + dur, heavy ? 70 : 140, heavy ? 30 : 70, heavy ? 0.6 : 0.18, heavy ? 0.9 : 0.6, out);
  tick(h, t + dur, 1500, 0.04, 0.3, out, 'bandpass', h.pink);
  return dur + (heavy ? 0.7 : 0.25);
}
const door: Recipe = (h, t, out, p) => creak(h, t, out, p, false);
const gate: Recipe = (h, t, out, p) => creak(h, t, out, p, true);

const chestOpen: Recipe = (h, t, out, p) => {
  tick(h, t, 2500, 0.02, 0.5, out, 'bandpass'); // trinco
  partials(h, t, 1800, [1, 2.7], [0.12, 0.06], [0.1, 0.06], out);
  const g = gain(h, 0, out);
  adsr(g.gain, t + 0.08, 0.3, 0.05, 0.1, 0.6, 0.25, 0.15);
  const f = filter(h, 'bandpass', 700, 8, g);
  const o = osc(h, 'sawtooth', 110 * p.pitch, t + 0.08, 0.5, f);
  o.frequency.linearRampToValueAtTime(150 * p.pitch, t + 0.5);
  bellArp(h, t + 0.45, out, [81, 88], 0.07, 0.6, 0.14);
  return 1.1;
};

const villageBell: Recipe = (h, t, out, p) => {
  const f0 = 196 * p.pitch;
  partials(h, t, f0, [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662], [0.25, 0.35, 0.15, 0.12, 0.12, 0.06, 0.05], [5, 4, 3, 2.6, 2, 1.4, 1.2], out);
  tick(h, t, 1500, 0.05, 0.2, out, 'bandpass', h.pink);
  return 5.2;
};

// ------------------------------------------------------------------ ambiência pontual

const ambBird: Recipe = (h, t, out, p) => {
  const k = p.pitch;
  const kind = p.variant || (h.rand() < 0.33 ? 'chirp' : h.rand() < 0.5 ? 'warble' : 'call');
  if (kind === 'warble') {
    const g = gain(h, 0, out);
    adsr(g.gain, t, 0.35, 0.02, 0.05, 0.7, 0.25, 0.08);
    const o = osc(h, 'sine', 3000 * k, t, 0.42, g);
    const fm = gain(h, 450 * k, o.frequency);
    osc(h, 'sine', r(h, 18, 30), t, 0.42, fm);
    return 0.45;
  }
  if (kind === 'call') {
    for (let i = 0; i < 2; i++) {
      const tt = t + i * 0.16;
      const g = gain(h, 0, out);
      perc(g.gain, tt, 0.35, 0.01, 0.12);
      const o = osc(h, 'sine', (i ? 2450 : 1850) * k, tt, 0.14, g);
      o.frequency.linearRampToValueAtTime((i ? 2300 : 2000) * k, tt + 0.12);
    }
    return 0.35;
  }
  const n = 2 + Math.floor(h.rand() * 3);
  for (let i = 0; i < n; i++) {
    const tt = t + i * r(h, 0.07, 0.11);
    const g = gain(h, 0, out);
    perc(g.gain, tt, 0.3, 0.003, 0.05);
    const o = osc(h, 'sine', 2600 * k, tt, 0.06, g);
    o.frequency.exponentialRampToValueAtTime(4400 * k, tt + 0.045);
  }
  return n * 0.11 + 0.06;
};

const ambCricket: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  g.gain.setValueAtTime(0, t);
  let tt = t;
  for (let c = 0; c < 2; c++) {
    for (let i = 0; i < 4; i++) {
      g.gain.setValueAtTime(0, tt);
      g.gain.linearRampToValueAtTime(0.3, tt + 0.006);
      g.gain.linearRampToValueAtTime(0, tt + 0.028);
      tt += 0.04;
    }
    tt += 0.18;
  }
  osc(h, 'sine', 4300 * p.pitch, t, tt - t, g);
  return tt - t;
};

const ambOwl: Recipe = (h, t, out, p) => {
  const notes = [0, 0.55, 0.8];
  for (const d of notes) {
    const tt = t + d;
    const g = gain(h, 0, out);
    adsr(g.gain, tt, 0.4, 0.05, 0.05, 0.8, d === 0 ? 0.25 : 0.12, 0.12);
    const o = osc(h, 'sine', 390 * p.pitch, tt, 0.45, g);
    o.frequency.linearRampToValueAtTime(350 * p.pitch, tt + 0.35);
  }
  return 1.3;
};

const ambFrog: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  g.gain.setValueAtTime(0, t);
  const pulses = 4 + Math.floor(h.rand() * 4);
  let tt = t;
  for (let i = 0; i < pulses; i++) {
    g.gain.setValueAtTime(0, tt);
    g.gain.linearRampToValueAtTime(0.5, tt + 0.008);
    g.gain.linearRampToValueAtTime(0, tt + 0.03);
    tt += 0.04;
  }
  const f = filter(h, 'bandpass', 620 * p.pitch, 3, g);
  osc(h, 'sawtooth', 135 * p.pitch, t, tt - t, f);
  return tt - t + 0.02;
};

const ambBubble: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.4, 0.004, 0.06);
  const o = osc(h, 'sine', 280 * p.pitch, t, 0.08, g);
  o.frequency.exponentialRampToValueAtTime(900 * p.pitch, t + 0.06);
  return 0.09;
};

const ambHammer: Recipe = (h, t, out, p) => {
  partials(h, t, 880 * p.pitch, [1, 2.7, 4.1, 5.9], [0.3, 0.2, 0.12, 0.06], [0.8, 0.5, 0.3, 0.2], out);
  tick(h, t, 3000, 0.03, 0.5, out);
  thump(h, t, 150, 90, 0.06, 0.3, out);
  return 0.85;
};

const ambCrackle: Recipe = (h, t, out, p) => {
  const d = crack(h, t, out, r(h, 0.08, 0.3), 0.5);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.15, 0.002, d);
  const f = filter(h, 'bandpass', 1000, 2, g);
  osc(h, 'sawtooth', 100 * p.pitch, t, d, f);
  return d + 0.05;
};

const ambHowl: Recipe = (h, t, out, p) => {
  const dur = 2.6;
  const src = gain(h, 0);
  adsr(src.gain, t, 0.5, 0.4, 0.3, 0.8, 1.2, 0.7);
  const o = osc(h, 'sawtooth', 380 * p.pitch, t, dur, src);
  o.frequency.linearRampToValueAtTime(540 * p.pitch, t + 0.7);
  o.frequency.linearRampToValueAtTime(470 * p.pitch, t + 1.9);
  o.frequency.linearRampToValueAtTime(380 * p.pitch, t + dur);
  osc(h, 'sine', 5.5, t, dur, gain(h, 9, o.frequency));
  const lp = filter(h, 'lowpass', 1600, 0.7, out);
  formants(h, src, lp, VOWELS.u, 6, 2);
  return dur + 0.1;
};

const ambDrip: Recipe = (h, t, out, p) => {
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.4, 0.001, 0.05);
  const o = osc(h, 'sine', 1300 * p.pitch, t, 0.06, g);
  o.frequency.exponentialRampToValueAtTime(2600 * p.pitch, t + 0.04);
  return 0.08;
};

const ambGust: Recipe = (h, t, out, p) => {
  whoosh(h, t, 2.2, 260 * p.pitch, 900 * p.pitch, 380 * p.pitch, 0.7, 0.6, out);
  return 2.3;
};

/** Laço de voo é um laço contínuo (ver Audio.ts); como disparo pontual vira um sopro. */
const flightLoopOneShot: Recipe = (h, t, out, p) => {
  whoosh(h, t, 0.6, 400 * p.pitch, 1400 * p.pitch, 600 * p.pitch, 0.8, 0.4, out);
  return 0.65;
};

export const RECIPES: Record<SfxId, Recipe> = {
  ui_click: uiClick,
  quest_update: questUpdate,
  hurt,
  page,
  ui_hover: uiHover,
  ui_open: uiOpen,
  ui_close: uiClose,
  ui_error: uiError,
  quest_start: questStart,
  quest_complete: questComplete,
  level_up: levelUp,
  discovery,
  pickup,
  gold: goldCoins,
  equip,
  potion,
  death,
  respawn,
  heartbeat,
  footstep,
  jump,
  land,
  dodge,
  flight_start: flightStart,
  flight_loop: flightLoopOneShot,
  flight_end: flightEnd,
  swing,
  swing_heavy: swingHeavy,
  hit_flesh: hitFlesh,
  hit_metal: hitMetal,
  hit_magic: hitMagic,
  block,
  parry,
  combo,
  cast_arcane: castArcane,
  cast_lance: castLance,
  cast_explosion: castExplosion,
  cast_chains: castChains,
  cast_shield: castShield,
  cast_teleport: castTeleport,
  cast_lightning: castLightning,
  cast_blades: castBlades,
  cast_rift: castRift,
  cast_ascend: castAscend,
  explosion,
  thunder,
  enemy_alert: enemyAlert,
  enemy_death: enemyDeath,
  boss_roar: bossRoar,
  boss_slam: bossSlam,
  boss_laser: bossLaser,
  creature_call: creatureCall,
  door,
  gate,
  chest_open: chestOpen,
  village_bell: villageBell,
  amb_bird: ambBird,
  amb_cricket: ambCricket,
  amb_owl: ambOwl,
  amb_frog: ambFrog,
  amb_bubble: ambBubble,
  amb_hammer: ambHammer,
  amb_crackle: ambCrackle,
  amb_howl: ambHowl,
  amb_drip: ambDrip,
  amb_gust: ambGust,
};
