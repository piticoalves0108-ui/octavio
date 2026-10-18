/**
 * Instrumentos sintetizados da música (cada nota é um punhado de nós de curta
 * duração, criados no instante do agendamento e liberados sozinhos ao parar).
 * Timbres originais: harpa/alaúde dedilhados, flauta, rabeca, metais, sinos de
 * vidro, pulso "cyber", coro por formantes e percussão (bumbo, caixa, chimbal,
 * chocalho, tom, bodhrán, taiko e metal).
 */
import type { DrumKind, LeadInstrument, ArpInstrument } from './musicStyles';
import { EPS, adsr, filter, gain, noise, osc, perc, sweep, thump, tick, type SynthHost } from './synth';
import { midiToHz } from './musicLogic';

/** Dedilhado (alaúde/harpa): triângulo + harmônico senoidal, ataque rápido e decaimento. */
export function pluck(h: SynthHost, t: number, midi: number, vel: number, decay: number, out: AudioNode, bright = 1) {
  const f = midiToHz(midi);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.5 * vel, 0.003, decay);
  osc(h, 'triangle', f, t, decay + 0.05, g);
  const g2 = gain(h, 0, out);
  perc(g2.gain, t, 0.18 * vel * bright, 0.002, decay * 0.35);
  osc(h, 'sine', f * 2, t, decay * 0.4 + 0.05, g2);
  return decay;
}

/** Pulso quadrado curto filtrado (arpejo "cyber" do combate). */
export function pulse(h: SynthHost, t: number, midi: number, vel: number, decay: number, out: AudioNode) {
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.4 * vel, 0.002, decay);
  const lp = filter(h, 'lowpass', 2600, 2, g);
  osc(h, 'square', midiToHz(midi), t, decay + 0.03, lp);
  return decay;
}

/** Sino de vidro: parciais quase harmônicos com decaimentos independentes. */
export function glassBell(h: SynthHost, t: number, midi: number, vel: number, decay: number, out: AudioNode) {
  const f = midiToHz(midi);
  const ratios = [1, 2.0, 3.01];
  const amps = [0.35, 0.12, 0.06];
  for (let i = 0; i < ratios.length; i++) {
    const g = gain(h, 0, out);
    const d = decay * (1 - i * 0.28);
    perc(g.gain, t, amps[i] * vel, 0.002, d);
    osc(h, 'sine', f * ratios[i], t, d + 0.05, g);
  }
  return decay;
}

/** Vibrato senoidal numa frequência (nota longa). */
function vibrato(h: SynthHost, o: OscillatorNode, t: number, dur: number, rate: number, depthHz: number) {
  const l = h.ac.createOscillator();
  l.frequency.value = rate;
  const lg = h.ac.createGain();
  lg.gain.setValueAtTime(0, t);
  lg.gain.linearRampToValueAtTime(depthHz, t + Math.min(0.4, dur * 0.5));
  l.connect(lg);
  lg.connect(o.frequency);
  l.start(t);
  l.stop(t + dur + 0.05);
  h.nodes += 2;
}

/** Voz solista. Retorna a duração efetiva (s). */
export function leadNote(h: SynthHost, inst: LeadInstrument, t: number, midi: number, dur: number, vel: number, out: AudioNode): number {
  const f = midiToHz(midi);
  switch (inst) {
    case 'flute': {
      const g = gain(h, 0, out);
      adsr(g.gain, t, 0.45 * vel, 0.07, 0.1, 0.75, Math.max(0, dur - 0.17), 0.25);
      const o = osc(h, 'sine', f, t, dur + 0.3, g);
      const g2 = gain(h, 0.12, g);
      osc(h, 'triangle', f * 2, t, dur + 0.3, g2);
      if (dur > 0.35) vibrato(h, o, t, dur + 0.3, 5.2, f * 0.006);
      return dur + 0.3;
    }
    case 'fiddle': {
      const g = gain(h, 0, out);
      adsr(g.gain, t, 0.4 * vel, 0.03, 0.08, 0.7, Math.max(0, dur - 0.11), 0.12);
      const bp = filter(h, 'bandpass', f * 2.6, 0.9, g);
      const o = osc(h, 'sawtooth', f, t, dur + 0.15, bp);
      if (dur > 0.3) vibrato(h, o, t, dur + 0.15, 6, f * 0.008);
      return dur + 0.15;
    }
    case 'bell':
      return glassBell(h, t, midi, vel, Math.max(1.2, dur * 1.5), out);
    case 'brass': {
      const g = gain(h, 0, out);
      adsr(g.gain, t, 0.38 * vel, 0.04, 0.12, 0.7, Math.max(0, dur - 0.16), 0.18);
      const lp = filter(h, 'lowpass', f * 1.5, 1.2, g);
      lp.frequency.setValueAtTime(f * 1.5, t);
      lp.frequency.linearRampToValueAtTime(f * 6, t + 0.06);
      lp.frequency.exponentialRampToValueAtTime(f * 3.2, t + 0.3);
      osc(h, 'sawtooth', f, t, dur + 0.2, lp, -6);
      osc(h, 'sawtooth', f, t, dur + 0.2, lp, 6);
      return dur + 0.2;
    }
  }
}

/** Nota de arpejo. */
export function arpNote(h: SynthHost, inst: ArpInstrument, t: number, midi: number, vel: number, decay: number, out: AudioNode): number {
  switch (inst) {
    case 'pluck':
      return pluck(h, t, midi, vel, decay, out);
    case 'harp':
      return pluck(h, t, midi, vel, decay, out, 1.6);
    case 'pulse':
      return pulse(h, t, midi, vel, decay, out);
    case 'bell':
      return glassBell(h, t, midi, vel, decay, out);
  }
}

/** Nota de pad (dois osciladores desafinados com envelope lento) — vai para o filtro do pad. */
export function padNote(h: SynthHost, wave: OscillatorType, t: number, midi: number, dur: number, vel: number, attack: number, release: number, out: AudioNode): number {
  const f = midiToHz(midi);
  const g = gain(h, 0, out);
  const a = Math.min(attack, dur * 0.6);
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(0.3 * vel, t + a);
  g.gain.setValueAtTime(0.3 * vel, t + dur);
  g.gain.exponentialRampToValueAtTime(EPS, t + dur + release);
  osc(h, wave, f, t, dur + release, g, -7);
  osc(h, wave, f, t, dur + release, g, 7);
  return dur + release;
}

/** Voz de coro (dois serrotes) — vai para o banco de formantes da faixa. */
export function choirNote(h: SynthHost, t: number, midi: number, dur: number, vel: number, out: AudioNode): number {
  const f = midiToHz(midi);
  const g = gain(h, 0, out);
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(0.3 * vel, t + 0.25);
  g.gain.setValueAtTime(0.3 * vel, t + dur);
  g.gain.exponentialRampToValueAtTime(EPS, t + dur + 0.5);
  osc(h, 'sawtooth', f, t, dur + 0.5, g, -9);
  osc(h, 'sawtooth', f, t, dur + 0.5, g, 11);
  return dur + 0.5;
}

/** Baixo: oscilador com passa-baixas de envelope (dedilhado ou ostinato). */
export function bassNote(h: SynthHost, wave: OscillatorType, t: number, midi: number, vel: number, decay: number, cutoff: number, out: AudioNode): number {
  const f = midiToHz(midi);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.55 * vel, 0.004, decay);
  const lp = filter(h, 'lowpass', cutoff, 2.5, g);
  sweep(lp.frequency, t, cutoff * 2.2, cutoff * 0.6, decay);
  osc(h, wave, f, t, decay + 0.05, lp);
  return decay;
}

/** Acorde curto de metais (fundamental, quinta, oitava). */
export function stab(h: SynthHost, t: number, midi: number, vel: number, out: AudioNode): number {
  const f = midiToHz(midi);
  const g = gain(h, 0, out);
  perc(g.gain, t, 0.35 * vel, 0.01, 0.28);
  const lp = filter(h, 'lowpass', f * 6, 1.4, g);
  sweep(lp.frequency, t, f * 8, f * 2, 0.25);
  osc(h, 'sawtooth', f, t, 0.32, lp);
  osc(h, 'sawtooth', f * 1.4983, t, 0.32, lp, 4);
  osc(h, 'sawtooth', f * 2, t, 0.32, lp, -4);
  return 0.32;
}

/** Bordão contínuo: retorna os nós para a faixa parar/desconectar no fim. */
export function startDrone(h: SynthHost, t: number, midis: readonly number[], wave: OscillatorType, cutoff: number, level: number, out: AudioNode): { stop: (at: number) => void } {
  const lp = filter(h, 'lowpass', cutoff, 0.8, out);
  const g = gain(h, 0, lp);
  g.gain.setValueAtTime(EPS, t);
  g.gain.linearRampToValueAtTime(level, t + 2.5);
  const oscs: OscillatorNode[] = [];
  for (const m of midis) {
    const f = midiToHz(m);
    for (const det of [-5, 5]) {
      const o = h.ac.createOscillator();
      o.type = wave;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(g);
      o.start(t);
      oscs.push(o);
      h.nodes++;
    }
  }
  // respiração lenta do filtro
  const l = h.ac.createOscillator();
  l.frequency.value = 0.07;
  const lg = h.ac.createGain();
  lg.gain.value = cutoff * 0.35;
  l.connect(lg);
  lg.connect(lp.frequency);
  l.start(t);
  h.nodes += 2;
  return {
    stop(at: number) {
      g.gain.cancelScheduledValues(at);
      g.gain.setTargetAtTime(0, at, 0.4);
      for (const o of oscs) o.stop(at + 2);
      l.stop(at + 2);
      l.onended = () => {
        lp.disconnect();
        g.disconnect();
        lg.disconnect();
      };
    },
  };
}

/** Parciais do metal (razão, amplitude, decaimento). */
const CLANK = [
  [1, 0.22, 0.25],
  [2.76, 0.12, 0.15],
] as const;

/** Percussão. Retorna a duração (s). */
export function drum(h: SynthHost, kind: DrumKind, t: number, vel: number, out: AudioNode): number {
  switch (kind) {
    case 'kick':
      thump(h, t, 150, 42, 0.32, 0.9 * vel, out);
      tick(h, t, 3000, 0.01, 0.12 * vel, out);
      return 0.35;
    case 'snare': {
      const g = gain(h, 0, out);
      perc(g.gain, t, 0.55 * vel, 0.001, 0.16);
      const bp = filter(h, 'bandpass', 2200, 0.7, g);
      noise(h, h.white, t, 0.18, bp);
      thump(h, t, 210, 160, 0.08, 0.3 * vel, out);
      return 0.2;
    }
    case 'hat':
      tick(h, t, 7500, 0.035 + vel * 0.02, 0.35 * vel, out);
      return 0.07;
    case 'shaker': {
      const g = gain(h, 0, out);
      g.gain.setValueAtTime(EPS, t);
      g.gain.linearRampToValueAtTime(0.35 * vel, t + 0.03);
      g.gain.exponentialRampToValueAtTime(EPS, t + 0.11);
      const bp = filter(h, 'bandpass', 6500, 1.2, g);
      noise(h, h.white, t, 0.12, bp);
      return 0.12;
    }
    case 'tom':
      thump(h, t, 140, 85, 0.3, 0.8 * vel, out);
      return 0.32;
    case 'frame':
      thump(h, t, 95, 62, 0.25, 0.85 * vel, out);
      tick(h, t, 700, 0.05, 0.18 * vel, out, 'lowpass', h.pink);
      return 0.28;
    case 'taiko':
      thump(h, t, 75, 36, 0.65, 1 * vel, out);
      tick(h, t, 450, 0.18, 0.35 * vel, out, 'lowpass', h.brown);
      return 0.7;
    case 'clank': {
      // metal "cyber": duas parciais inarmônicas e um estalo
      const f = 520;
      for (const [ratio, amp, d] of CLANK) {
        const g = gain(h, 0, out);
        perc(g.gain, t, amp * vel, 0.001, d);
        osc(h, 'square', f * ratio, t, d + 0.03, g);
      }
      tick(h, t, 4000, 0.02, 0.25 * vel, out);
      return 0.3;
    }
  }
}
