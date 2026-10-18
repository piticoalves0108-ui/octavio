/**
 * Música adaptativa gerativa. O diretor mantém uma faixa atual (e as que estão
 * saindo em crossfade), agenda as notas com antecedência (lookahead) no relógio
 * do WebAudio e troca de estado sempre numa fronteira de compasso (ou de batida,
 * para combate/chefe), com entrada e saída cruzadas — sem cortes bruscos.
 * Cada faixa compõe na hora: progressão sorteada por frase, melodia por
 * caminhada aleatória (musicLogic.planLead), arpejos, baixo, bateria e camadas
 * que entram com a intensidade (número de inimigos / fase do chefe).
 */
import type { MusicState } from '../core/EventBus';
import type { AudioEngine } from './engine';
import { MUSIC } from './data';
import { MUSIC_STYLES, stepSeconds, stepsPerBar, type MusicStyle } from './musicStyles';
import { Rng, clamp01 } from './audioMath';
import { bassToneIndex, chordTones, degreeToMidi, hitVelocity, nextBoundary, planLead, voiceChord } from './musicLogic';
import { arpNote, bassNote, choirNote, drum, glassBell, leadNote, padNote, stab, startDrone } from './musicInstruments';
import { EPS, VOWELS, formants, makeNoiseBuffer, makeShaperCurve } from './synth';

/** Uma faixa (um estado musical tocando a partir de `t0`). */
class Track {
  readonly out: GainNode;
  private level: GainNode;
  private padF: BiquadFilterNode | null = null;
  private padG: GainNode | null = null;
  private choirIn: GainNode | null = null;
  private choirOut: GainNode | null = null;
  private drone: { stop: (at: number) => void } | null = null;
  readonly stepDur: number;
  readonly spb: number;
  readonly beatSec: number;
  private step = 0;
  private nextT: number;
  /** Para de agendar notas a partir daqui. */
  endAt = Infinity;
  /** Descarta os nós a partir daqui (depois das caudas). */
  disposeAt = Infinity;
  private bar = -1;
  private chordDeg = 0;
  private prog: readonly number[] | null = null;
  private rng: Rng;
  private prevLeadDeg = NaN;
  private leadNotes: Float32Array;
  private leadLens: Uint8Array;
  private bellPlan: Float32Array;
  private arpIdx = 0;
  private tones: number[] = [];
  private arpTones: number[] = [];
  private bassShift = 0;
  intensity = 0;
  disposed = false;

  constructor(
    private dir: MusicDirector,
    readonly style: MusicStyle,
    readonly t0: number,
    seed: number,
  ) {
    const e = dir.e;
    const ac = e.ac;
    this.rng = new Rng(seed);
    this.stepDur = stepSeconds(style);
    this.spb = stepsPerBar(style);
    this.beatSec = 60 / style.bpm;
    this.nextT = t0;
    this.leadNotes = new Float32Array(this.spb);
    this.leadLens = new Uint8Array(this.spb);
    this.bellPlan = new Float32Array(this.spb).fill(NaN);
    this.out = ac.createGain();
    this.out.gain.value = 0;
    this.out.connect(dir.out);
    this.level = ac.createGain();
    this.level.gain.value = style.gain;
    this.level.connect(this.out);
    if (style.pad) {
      this.padG = ac.createGain();
      this.padG.gain.value = style.pad.gain;
      this.padG.connect(this.level);
      this.padF = ac.createBiquadFilter();
      this.padF.type = 'lowpass';
      this.padF.frequency.value = style.pad.cutoff;
      this.padF.Q.value = 0.7;
      this.padF.connect(this.padG);
    }
    if (style.choir) {
      this.choirOut = ac.createGain();
      this.choirOut.gain.value = style.choir.gain;
      this.choirOut.connect(this.level);
      this.choirIn = ac.createGain();
      this.choirIn.gain.value = 1;
      formants(e, this.choirIn, this.choirOut, VOWELS[style.choir.vowel], 7, 3);
    }
    if (style.drone) {
      const d = style.drone;
      const base = style.root + 12 * d.octave;
      const midis = d.degrees.map((g) => degreeToMidi(base, style.mode, g));
      this.drone = startDrone(e, t0, midis, d.wave, d.cutoff, d.gain, this.level);
    }
  }

  /** Entrada: ~potência constante (0 → 0,7 na metade → 1). */
  fadeIn(at: number, dur: number) {
    const g = this.out.gain;
    const d = Math.max(0.05, dur);
    g.setValueAtTime(0, at);
    g.linearRampToValueAtTime(0.7, at + d * 0.5);
    g.linearRampToValueAtTime(1, at + d);
  }

  /** Saída a partir de `at` em `dur` s; depois disso a faixa para de compor. */
  fadeOut(at: number, dur: number) {
    const g = this.out.gain;
    const now = this.dir.e.ac.currentTime;
    const t = Math.max(at, now);
    if (typeof g.cancelAndHoldAtTime === 'function') g.cancelAndHoldAtTime(t);
    else {
      const v = g.value;
      g.cancelScheduledValues(now);
      g.setValueAtTime(v, now);
      g.setValueAtTime(v, t);
    }
    g.linearRampToValueAtTime(0, t + Math.max(0.05, dur));
    this.endAt = Math.min(this.endAt, t + dur);
    this.disposeAt = t + dur + 3.5;
    this.drone?.stop(t + dur * 0.5);
    this.drone = null;
  }

  /** Agenda todos os passos até `tEnd`. */
  schedule(tEnd: number, now: number) {
    // realinha depois de travadas (aba oculta, carregamento): não toca o atrasado
    if (this.nextT < now - 0.08) {
      const k = Math.ceil((now - this.t0) / this.stepDur);
      if (k > this.step) this.step = k;
      this.nextT = this.t0 + this.step * this.stepDur;
    }
    while (this.nextT < tEnd && this.nextT < this.endAt) {
      this.doStep(this.step, this.nextT);
      this.step++;
      this.nextT = this.t0 + this.step * this.stepDur;
    }
  }

  private ok(min: number | undefined) {
    return !min || this.intensity >= min;
  }

  private doStep(step: number, t: number) {
    const s = this.style;
    const e = this.dir.e;
    const spb = this.spb;
    const bar = Math.floor(step / spb);
    const i = step - bar * spb;
    if (s.oneShotBars && bar >= s.oneShotBars) {
      // vinheta terminou: para de compor e libera os nós depois das caudas
      this.endAt = t;
      this.disposeAt = Math.min(this.disposeAt, t + 4);
      return;
    }
    if (bar !== this.bar) {
      this.bar = bar;
      this.onBar(bar, t, i);
    }
    let tt = t;
    if (s.swing && i & 1) tt += s.swing * this.stepDur;
    const rng = this.rng;
    const dir = this.dir;
    // bateria
    if (s.drums) {
      for (const d of s.drums) {
        if (!this.ok(d.minIntensity)) continue;
        const v = hitVelocity(d.pattern[i]);
        if (v > 0 && dir.voice(tt, tt + 0.5)) drum(e, d.kind, tt, v * d.gain * (0.9 + 0.2 * rng.next()), this.level);
      }
    }
    // baixo
    const B = s.bass;
    if (B && this.ok(B.minIntensity)) {
      const k = bassToneIndex(B.pattern[i]);
      if (k >= 0 && dir.voice(tt, tt + B.decay)) {
        const deg = this.chordDeg + (k === 4 ? 7 : 2 * k);
        const m = degreeToMidi(s.root + 12 * B.octave, s.mode, deg) + this.bassShift;
        bassNote(e, B.wave, tt, m, B.gain * (i === 0 ? 1 : 0.85), B.decay, B.cutoff, this.level);
      }
    }
    // arpejo
    const A = s.arp;
    if (A && this.ok(A.minIntensity) && this.arpTones.length) {
      const v = hitVelocity(A.pattern[i]);
      if (v > 0 && dir.voice(tt, tt + A.decay)) arpNote(e, A.instrument, tt, this.nextArp(), v * A.gain, A.decay, this.level);
    }
    // acordes curtos de metais
    const S = s.stabs;
    if (S && this.ok(S.minIntensity)) {
      const v = hitVelocity(S.pattern[i]);
      if (v > 0 && dir.voice(tt, tt + 0.35)) stab(e, tt, degreeToMidi(s.root + 12 * S.octave, s.mode, this.chordDeg), v * S.gain, this.level);
    }
    // melodia
    const L = s.lead;
    const ln = this.leadNotes[i];
    if (L && ln === ln) {
      const dur = Math.max(1, this.leadLens[i]) * this.stepDur * 0.92;
      if (dir.voice(tt, tt + dur + 0.3)) leadNote(e, L.instrument, tt, degreeToMidi(s.root + 12 * L.octave, s.mode, ln), dur, L.gain * (0.85 + 0.15 * rng.next()), this.level);
    }
    // sinos
    const bn = this.bellPlan[i];
    if (s.bells && bn === bn && dir.voice(tt, tt + 2.5)) glassBell(e, tt, bn, s.bells.gain, 2.6, this.level);
  }

  /** Início de compasso: acorde, pad/coro, plano da melodia e dos sinos. */
  private onBar(bar: number, t: number, offset: number) {
    const s = this.style;
    const e = this.dir.e;
    const rng = this.rng;
    const pb = bar % s.phraseBars;
    if (pb === 0 || !this.prog) this.prog = bar === 0 ? s.progressions[0] : rng.pick(s.progressions);
    const prog = this.prog;
    this.chordDeg = prog[Math.floor(pb / s.barsPerChord) % prog.length];
    // baixo: fundamental nunca acima de uma quinta da tônica do baixo
    this.bassShift = s.mode[this.chordDeg % 7] > 7 ? -12 : 0;
    const chordStart = pb % s.barsPerChord === 0 || offset > 0;
    const barDur = this.spb * this.stepDur;
    const remain = barDur * (s.barsPerChord - (pb % s.barsPerChord)) - offset * this.stepDur;
    // pad
    const P = s.pad;
    if (P && this.padF && chordStart && this.ok(P.minIntensity)) {
      const lo = s.root + 12 * P.octave - 2;
      voiceChord(chordTones(s.root + 12 * P.octave, s.mode, this.chordDeg, P.voices, this.tones), lo);
      const dur = remain + 0.06;
      for (const m of this.tones) if (this.dir.voice(t, t + dur + P.release)) padNote(e, P.wave, t, m, dur, 1, P.attack, P.release, this.padF);
    }
    // coro
    const C = s.choir;
    if (C && this.choirIn && chordStart && this.ok(C.minIntensity)) {
      const lo = s.root + 12 * C.octave + 3;
      voiceChord(chordTones(s.root + 12 * C.octave, s.mode, this.chordDeg, 3, this.tones), lo);
      const dur = remain + 0.05;
      for (const m of this.tones) if (this.dir.voice(t, t + dur + 0.5)) choirNote(e, t, m, dur, 1, this.choirIn);
    }
    // arpejo: notas do acorde na oitava do arpejo (+ a fundamental acima)
    if (s.arp) {
      const base = s.root + 12 * s.arp.octave;
      voiceChord(chordTones(base, s.mode, this.chordDeg, 3, this.arpTones), base - 2);
      this.arpTones.push(this.arpTones[0] + 12);
    }
    // melodia (motivo fixo da vinheta ou composição gerativa)
    if (s.motif) {
      this.leadNotes.fill(NaN);
      this.leadLens.fill(0);
      for (const [st, deg, len] of s.motif) {
        if (Math.floor(st / this.spb) !== bar) continue;
        const k = st % this.spb;
        if (k < offset) continue;
        this.leadNotes[k] = deg;
        this.leadLens[k] = len;
      }
    } else if (s.lead && this.ok(s.lead.minIntensity)) {
      this.prevLeadDeg = planLead(s, rng, this.chordDeg, this.prevLeadDeg, this.leadNotes, this.leadLens);
      for (let k = 0; k < offset; k++) this.leadNotes[k] = NaN;
    } else this.leadNotes.fill(NaN);
    // sinos esparsos
    this.bellPlan.fill(NaN);
    const Bl = s.bells;
    if (Bl && rng.chance(Bl.chance)) {
      const n = 1 + rng.int(0, 1);
      for (let k = 0; k < n; k++) {
        const st = s.oneShotBars ? 0 : rng.int(offset, this.spb - 1);
        this.bellPlan[st] = degreeToMidi(s.root + 12 * Bl.octave, s.mode, this.chordDeg + 2 * rng.int(0, 2));
      }
    }
  }

  private nextArp(): number {
    const A = this.style.arp!;
    const n = this.arpTones.length;
    const k = this.arpIdx++;
    switch (A.order) {
      case 'up':
        return this.arpTones[k % n];
      case 'down':
        return this.arpTones[n - 1 - (k % n)];
      case 'updown': {
        const p = Math.max(1, 2 * n - 2);
        const j = k % p;
        return this.arpTones[j < n ? j : p - j];
      }
      case 'random':
        return this.arpTones[this.rng.int(0, n - 1)];
    }
  }

  /** Próxima fronteira de troca a partir de `t`. */
  boundary(t: number, allowBeat: boolean, maxWait: number) {
    return nextBoundary(t, this.t0, this.beatSec, this.style.beatsPerBar, maxWait, allowBeat);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.drone?.stop(this.dir.e.ac.currentTime);
    this.out.disconnect();
    this.level.disconnect();
    this.padF?.disconnect();
    this.padG?.disconnect();
    this.choirIn?.disconnect();
    this.choirOut?.disconnect();
  }
}

/** Diretor musical: estado alvo → faixas, troca no compasso, orçamento de notas e ducking. */
export class MusicDirector {
  /** Saída (ducking) → barramento de música. */
  readonly out: GainNode;
  readonly tracks: Track[] = [];
  current: Track | null = null;
  /** Estado da faixa atual ('silence' sem faixa). */
  state: MusicState = 'silence';
  /** Troca agendada (estado e instante) — null se nenhuma. */
  pending: MusicState | null = null;
  pendingAt = 0;
  intensity = 0;
  private seedBase = (Math.random() * 1e9) >>> 0;
  private ends: Float64Array;
  private maxNotes: number = MUSIC.maxNotes;
  private duckBase = 1;
  private frameEma = 1 / 60;
  readonly stats = { lookahead: 0, notes: 0, dropped: 0, switches: 0, tracks: 0, active: 0, peak: 0, lastSwitchAt: 0, history: [] as string[] };

  constructor(readonly e: AudioEngine) {
    this.out = e.ac.createGain();
    this.out.gain.value = 1;
    this.out.connect(e.buses.music.input);
    this.ends = new Float64Array(128);
  }

  setMaxNotes(n: number) {
    this.maxNotes = Math.max(8, Math.min(this.ends.length, Math.floor(n)));
  }

  /** Reserva uma "voz" musical de `t` a `end` (orçamento de notas simultâneas). */
  voice(t: number, end: number): boolean {
    const ends = this.ends;
    for (let i = 0; i < this.maxNotes; i++) {
      if (ends[i] <= t) {
        ends[i] = end;
        this.stats.notes++;
        return true;
      }
    }
    this.stats.dropped++;
    return false;
  }

  /** Notas soando agora. */
  activeNotes(): number {
    const now = this.e.ac.currentTime;
    let n = 0;
    for (let i = 0; i < this.maxNotes; i++) if (this.ends[i] > now) n++;
    return n;
  }

  /**
   * Antecedência do agendamento: o mínimo de MUSIC.lookahead, ampliado quando
   * os quadros ficam lentos (travadas, carregamento) para a música não ter buracos.
   */
  lookahead(frameDt: number): number {
    this.frameEma = this.frameEma * 0.9 + Math.min(frameDt, 1) * 0.1;
    const la = Math.max(MUSIC.lookahead, frameDt * 2.2, this.frameEma * 3);
    return la > 1.5 ? 1.5 : la;
  }

  /** Por quadro: decide a troca, agenda as faixas, descarta as que terminaram. */
  update(target: MusicState, intensity: number, frameDt = 1 / 60) {
    const now = this.e.ac.currentTime;
    const la = this.lookahead(frameDt);
    this.stats.lookahead = la;
    this.intensity = clamp01(intensity);
    if (this.pending !== null) {
      if (target === this.state) this.pending = null;
      else if (target !== this.pending) {
        this.pending = target;
        this.pendingAt = this.boundary(now, target);
      }
    } else if (target !== this.state) {
      this.pending = target;
      this.pendingAt = this.boundary(now, target);
    }
    if (this.pending !== null && now + la >= this.pendingAt) this.switchTo(this.pending, Math.max(this.pendingAt, now + 0.02));

    const horizon = now + la;
    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const tr = this.tracks[i];
      if (now >= tr.disposeAt) {
        tr.dispose();
        this.tracks.splice(i, 1);
        if (tr === this.current) this.current = null;
        continue;
      }
      if (tr === this.current) tr.intensity = this.intensity;
      tr.schedule(horizon, now);
    }
    this.stats.tracks = this.tracks.length;
    const a = this.activeNotes();
    this.stats.active = a;
    if (a > this.stats.peak) this.stats.peak = a;
  }

  private boundary(now: number, target: MusicState): number {
    const cur = this.current;
    if (!cur || cur.endAt <= now) return now + 0.05;
    const st = target === 'silence' ? null : MUSIC_STYLES[target];
    const urgent = st ? !!st.urgent : true;
    return cur.boundary(now + 0.06, urgent, urgent ? 0.8 : 4.5);
  }

  private switchTo(state: MusicState, at: number) {
    const style = state === 'silence' ? null : MUSIC_STYLES[state];
    const xf = style ? style.xfade : MUSIC.silenceFade;
    for (const tr of this.tracks) if (tr.endAt > at) tr.fadeOut(at, xf);
    this.current = null;
    if (style) {
      const tr = new Track(this, style, at, (this.seedBase + this.stats.switches * 7919) >>> 0);
      tr.intensity = this.intensity;
      tr.fadeIn(at, style.fadeIn);
      this.tracks.push(tr);
      this.current = tr;
      // limite de faixas vivas (trocas muito rápidas): descarta as mais antigas
      while (this.tracks.length > 3) this.tracks.shift()!.dispose();
    }
    this.state = state;
    this.pending = null;
    this.stats.switches++;
    this.stats.lastSwitchAt = at;
    const h = this.stats.history;
    h.push(state);
    if (h.length > 12) h.shift();
  }

  /** Abaixa a música por um instante (rugido do chefe, nível, missão). */
  duck(level: number, hold: number, release = 0.6) {
    const g = this.out.gain;
    const now = this.e.ac.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(this.duckBase * level, now, 0.04);
    g.setTargetAtTime(this.duckBase, now + hold, release);
  }

  /** Nível de base (diálogo abaixa a música enquanto dura). */
  setDuckBase(v: number) {
    if (v === this.duckBase) return;
    this.duckBase = v;
    const g = this.out.gain;
    const now = this.e.ac.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(v, now, 0.35);
  }

  /** Encerra tudo (novo jogo / descarte). */
  stopAll(fade = 0.4) {
    const now = this.e.ac.currentTime;
    for (const tr of this.tracks) if (tr.endAt > now) tr.fadeOut(now, fade);
    this.current = null;
    this.state = 'silence';
    this.pending = null;
  }

  debug() {
    return {
      state: this.state,
      pending: this.pending,
      pendingIn: this.pending ? +(this.pendingAt - this.e.ac.currentTime).toFixed(2) : 0,
      intensity: +this.intensity.toFixed(2),
      bar: this.current ? Math.floor((this.e.ac.currentTime - this.current.t0) / (this.current.spb * this.current.stepDur)) : -1,
      ...this.stats,
      tracks: this.tracks.length,
      history: this.stats.history.slice(),
    };
  }
}

void EPS;

/**
 * Renderiza `seconds` s de um estilo num OfflineAudioContext (testes no
 * navegador): mede pico/RMS da faixa (antes do barramento/master), NaN e o
 * número de notas/nós criados.
 */
export async function renderMusicOffline(state: Exclude<MusicState, 'silence'>, seconds = 12, intensity = 0.5, seed = 1) {
  const sr = 22050;
  const off = new OfflineAudioContext(2, Math.ceil(sr * seconds), sr);
  const rng = new Rng(seed);
  const input = off.createGain();
  input.connect(off.destination);
  const host = {
    ac: off,
    white: makeNoiseBuffer(off, 'white', 2, 11),
    pink: makeNoiseBuffer(off, 'pink', 3, 23),
    brown: makeNoiseBuffer(off, 'brown', 4, 37),
    softClip: makeShaperCurve(1.5),
    hardClip: makeShaperCurve(5),
    nodes: 0,
    rand: () => rng.next(),
    buses: { music: { input } },
  };
  const dir = new MusicDirector(host as unknown as AudioEngine);
  const tr = new Track(dir, MUSIC_STYLES[state], 0.05, seed);
  tr.intensity = intensity;
  tr.fadeIn(0.05, 0.05);
  tr.schedule(seconds - 0.6, 0);
  const buf = await off.startRendering();
  let peak = 0;
  let e = 0;
  let nan = false;
  let n = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const a = d[i];
      if (!Number.isFinite(a)) nan = true;
      const ab = Math.abs(a);
      if (ab > peak) peak = ab;
      e += a * a;
      n++;
    }
  }
  return { peak, rms: Math.sqrt(e / Math.max(1, n)), nan, notes: dir.stats.notes, dropped: dir.stats.dropped, nodes: host.nodes };
}
