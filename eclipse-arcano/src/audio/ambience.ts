/**
 * Ambiência procedural: camadas contínuas (vento, uivo, chuva, água, pântano,
 * zumbido elétrico, corrupção, burburinho da vila, grilos, cripta, vento do voo)
 * e sons pontuais (pássaros, corujas, sapos, bolhas, martelo da forja, faíscas,
 * uivos, gotas, rajadas). Os alvos vêm de ambienceLogic.ts (puro); aqui só se
 * aplicam rampas suaves e se ligam/desligam fontes (camada calada há alguns
 * segundos tem a fonte parada, para economizar CPU).
 */
import type { GameContext } from '../core/context';
import type { SfxId } from './Audio';
import type { AudioEngine } from './engine';
import { AMBIENCE, REVERB_SPACES } from './data';
import { ambienceTargets, emptyTargets, nextInterval, proximity, type AmbienceInputs, type AmbienceTargets } from './ambienceLogic';
import { clamp01 } from './audioMath';
import { EPS } from './synth';
import { riverDistance } from '../world/heightfield';
import { LOCATIONS, WATER_LEVEL } from '../data/world';
import { PLACES } from '../data/places';
import { GLOBAL_UNIFORMS } from '../core/uniforms';

interface Built {
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  /** Filtro principal (modulável). */
  f?: BiquadFilterNode;
  f2?: BiquadFilterNode;
}

type Builder = (e: AudioEngine, out: GainNode) => Built;

/** Camada contínua com fonte que dorme quando calada. */
class Layer {
  readonly out: GainNode;
  built: Built | null = null;
  target = 0;
  private sent = -1;
  private quiet = 0;
  constructor(
    readonly name: string,
    private e: AudioEngine,
    private build: Builder,
    private trim: number,
    dest: AudioNode,
  ) {
    this.out = e.ac.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
  }

  get running() {
    return this.built !== null;
  }

  /** Define o nível-alvo (0..1). `dt` = tempo desde a última chamada. */
  set(level: number, dt: number, tau: number) {
    this.target = level;
    const ac = this.e.ac;
    if (level > 0.002) {
      this.quiet = 0;
      if (!this.built) {
        this.built = this.build(this.e, this.out);
        this.sent = -1;
      }
    } else if (this.built) {
      this.quiet += dt;
      if (this.quiet > AMBIENCE.sleepAfter) {
        this.stop();
        return;
      }
    }
    const v = level * this.trim;
    if (Math.abs(v - this.sent) > 0.002) {
      this.out.gain.setTargetAtTime(v, ac.currentTime, tau);
      this.sent = v;
    }
  }

  stop() {
    const b = this.built;
    if (!b) return;
    const t = this.e.ac.currentTime;
    for (const s of b.sources) {
      try {
        s.stop(t + 0.05);
      } catch {
        /* já parada */
      }
    }
    for (const n of b.nodes) n.disconnect();
    this.built = null;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(0, t);
    this.sent = 0;
  }
}

// ------------------------------------------------------------------ construtores das camadas

function loopNoise(e: AudioEngine, buf: AudioBuffer, out: AudioNode, rate = 1): AudioBufferSourceNode {
  const s = e.ac.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.playbackRate.value = rate;
  s.connect(out);
  s.start(e.ac.currentTime, e.rand() * buf.duration);
  return s;
}

function lfo(e: AudioEngine, freq: number, depth: number, target: AudioParam, type: OscillatorType = 'sine'): [OscillatorNode, GainNode] {
  const o = e.ac.createOscillator();
  o.type = type;
  o.frequency.value = freq;
  const g = e.ac.createGain();
  g.gain.value = depth;
  o.connect(g);
  g.connect(target);
  o.start();
  return [o, g];
}

function biquad(e: AudioEngine, type: BiquadFilterType, f: number, q: number): BiquadFilterNode {
  const b = e.ac.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}

const buildWind: Builder = (e, out) => {
  const f = biquad(e, 'bandpass', 500, 0.6);
  const lp = biquad(e, 'lowpass', 2200, 0.5);
  f.connect(lp);
  lp.connect(out);
  const s = loopNoise(e, e.pink, f);
  return { sources: [s], nodes: [f, lp], f };
};

const buildHowl: Builder = (e, out) => {
  const f = biquad(e, 'bandpass', 700, 14);
  const f2 = biquad(e, 'bandpass', 1150, 18);
  const g = e.ac.createGain();
  g.gain.value = 2.4;
  f.connect(g);
  f2.connect(g);
  g.connect(out);
  const s = loopNoise(e, e.white, f);
  s.connect(f2);
  return { sources: [s], nodes: [f, f2, g], f, f2 };
};

const buildRain: Builder = (e, out) => {
  const hp = biquad(e, 'highpass', 700, 0.5);
  const lp = biquad(e, 'lowpass', 5200, 0.4);
  hp.connect(lp);
  lp.connect(out);
  const s = loopNoise(e, e.white, hp);
  // camada grave das gotas no chão
  const lp2 = biquad(e, 'bandpass', 1400, 0.6);
  const g2 = e.ac.createGain();
  g2.gain.value = 0.6;
  lp2.connect(g2);
  g2.connect(out);
  const s2 = loopNoise(e, e.pink, lp2, 0.9);
  return { sources: [s, s2], nodes: [hp, lp, lp2, g2], f: lp };
};

const buildRainMuffled: Builder = (e, out) => {
  const lp = biquad(e, 'lowpass', 650, 0.6);
  lp.connect(out);
  const s = loopNoise(e, e.pink, lp);
  return { sources: [s], nodes: [lp], f: lp };
};

const buildWater: Builder = (e, out) => {
  const lp = biquad(e, 'lowpass', 750, 0.7);
  const bp = biquad(e, 'bandpass', 1800, 1.2);
  const vg = e.ac.createGain();
  vg.gain.value = 0.7;
  lp.connect(vg);
  bp.connect(vg);
  vg.connect(out);
  const s = loopNoise(e, e.brown, lp, 1.1);
  const s2 = loopNoise(e, e.pink, bp, 1);
  const bpg = e.ac.createGain();
  bpg.gain.value = 0.25;
  // marulho: LFOs lentos no ganho e no filtro
  const [o1, g1] = lfo(e, 0.23, 0.3, vg.gain);
  const [o2, g2] = lfo(e, 0.37, 600, bp.frequency);
  return { sources: [s, s2, o1, o2], nodes: [lp, bp, vg, bpg, g1, g2], f: lp };
};

const buildSwamp: Builder = (e, out) => {
  const bp = biquad(e, 'bandpass', 140, 2.2);
  bp.connect(out);
  const s = loopNoise(e, e.brown, bp, 0.8);
  const o = e.ac.createOscillator();
  o.type = 'sine';
  o.frequency.value = 49;
  const og = e.ac.createGain();
  og.gain.value = 0.18;
  o.connect(og);
  og.connect(out);
  o.start();
  const [l1, lg] = lfo(e, 0.07, 40, bp.frequency);
  return { sources: [s, o, l1], nodes: [bp, og, lg], f: bp };
};

const buildHum: Builder = (e, out) => {
  const bp = biquad(e, 'bandpass', 160, 1.3);
  const trem = e.ac.createGain();
  trem.gain.value = 0.7;
  bp.connect(trem);
  trem.connect(out);
  const o1 = e.ac.createOscillator();
  o1.type = 'sawtooth';
  o1.frequency.value = 50;
  const o2 = e.ac.createOscillator();
  o2.type = 'square';
  o2.frequency.value = 100.6;
  const g2 = e.ac.createGain();
  g2.gain.value = 0.3;
  o1.connect(bp);
  o2.connect(g2);
  g2.connect(bp);
  o1.start();
  o2.start();
  const [l, lg] = lfo(e, 3.1, 0.25, trem.gain);
  // chiado elétrico agudo
  const hp = biquad(e, 'highpass', 6000, 0.7);
  const hg = e.ac.createGain();
  hg.gain.value = 0.05;
  hp.connect(hg);
  hg.connect(out);
  const s = loopNoise(e, e.white, hp);
  return { sources: [o1, o2, l, s], nodes: [bp, trem, g2, lg, hp, hg], f: bp };
};

const buildCorruption: Builder = (e, out) => {
  const lp = biquad(e, 'lowpass', 420, 3);
  lp.connect(out);
  const a = e.ac.createOscillator();
  a.type = 'sawtooth';
  a.frequency.value = 55;
  const b = e.ac.createOscillator();
  b.type = 'sawtooth';
  b.frequency.value = 58.3; // segunda menor: dissonância lenta
  a.connect(lp);
  b.connect(lp);
  a.start();
  b.start();
  const [l, lg] = lfo(e, 0.11, 180, lp.frequency);
  return { sources: [a, b, l], nodes: [lp, lg], f: lp };
};

const buildCrowd: Builder = (e, out) => {
  // "falatório" ininteligível: ruído rosa por formantes que deslizam
  const sum = e.ac.createGain();
  sum.gain.value = 1.6;
  sum.connect(out);
  const nodes: AudioNode[] = [sum];
  const sources: AudioScheduledSourceNode[] = [];
  const freqs = [520, 1250, 2300];
  for (let i = 0; i < freqs.length; i++) {
    const bp = biquad(e, 'bandpass', freqs[i], 5);
    const g = e.ac.createGain();
    g.gain.value = [1, 0.6, 0.3][i];
    bp.connect(g);
    g.connect(sum);
    sources.push(loopNoise(e, e.pink, bp, 1));
    const [o, lg] = lfo(e, 1.7 + i * 1.3, freqs[i] * 0.25, bp.frequency, 'triangle');
    const [o2, lg2] = lfo(e, 2.3 + i * 0.9, 0.5, g.gain);
    sources.push(o, o2);
    nodes.push(bp, g, lg, lg2);
  }
  return { sources, nodes };
};

const buildCrickets: Builder = (e, out) => {
  const g = e.ac.createGain();
  g.gain.value = 0;
  g.connect(out);
  const c1 = e.ac.createOscillator();
  c1.frequency.value = 4300;
  const c2 = e.ac.createOscillator();
  c2.frequency.value = 4790;
  const g2 = e.ac.createGain();
  g2.gain.value = 0.6;
  c1.connect(g);
  c2.connect(g2);
  g2.connect(g);
  c1.start();
  c2.start();
  // trem de pulsos (~30 Hz) "portado" por um LFO lento
  const [p, pg] = lfo(e, 29, 0.18, g.gain, 'square');
  const gate = e.ac.createGain();
  gate.gain.value = 0;
  pg.disconnect();
  pg.connect(gate);
  gate.connect(g.gain);
  const [slow, sg] = lfo(e, 1.4, 1, gate.gain, 'square');
  return { sources: [c1, c2, p, slow], nodes: [g, g2, pg, gate, sg] };
};

const buildCave: Builder = (e, out) => {
  const lp = biquad(e, 'lowpass', 180, 1.5);
  lp.connect(out);
  const s = loopNoise(e, e.brown, lp, 0.6);
  const [l, lg] = lfo(e, 0.05, 60, lp.frequency);
  return { sources: [s, l], nodes: [lp, lg], f: lp };
};

const buildFlight: Builder = (e, out) => {
  const bp = biquad(e, 'bandpass', 600, 0.8);
  const lp = biquad(e, 'lowpass', 2500, 0.5);
  bp.connect(lp);
  lp.connect(out);
  const s = loopNoise(e, e.pink, bp);
  // zumbido arcano grave da levitação
  const o = e.ac.createOscillator();
  o.type = 'sine';
  o.frequency.value = 82;
  const og = e.ac.createGain();
  og.gain.value = 0.12;
  o.connect(og);
  og.connect(out);
  o.start();
  return { sources: [s, o], nodes: [bp, lp, og], f: bp, f2: lp };
};

// ------------------------------------------------------------------ ambiência

/** Pontos (x,z) de ruínas tecnológicas (zumbido elétrico). */
const TECH_SITES = LOCATIONS.filter((l) => ['ruinas_aeternum', 'camara_guardiao', 'laboratorio_abandonado', 'posto_ferroluz', 'torre_observador', 'santuario_cristal'].includes(l.id));
const VILLAGE = LOCATIONS.find((l) => l.id === 'vila_brumafria')!;
const SWAMP = LOCATIONS.find((l) => l.id === 'pantano_sombrio')!;
const FORGE = PLACES['forja_bigorna'] ?? { x: VILLAGE.x, z: VILLAGE.z };

type Spawn = 'bird' | 'owl' | 'frog' | 'bubble' | 'hammer' | 'crackle' | 'howl' | 'drip' | 'gust';
const SPAWNS: Spawn[] = ['bird', 'owl', 'frog', 'bubble', 'hammer', 'crackle', 'howl', 'drip', 'gust'];

export class Ambience {
  readonly layers: Layer[];
  private wind: Layer;
  private howl: Layer;
  private rain: Layer;
  private rainIn: Layer;
  private water: Layer;
  private swamp: Layer;
  private hum: Layer;
  private corruption: Layer;
  private crowd: Layer;
  private crickets: Layer;
  private cave: Layer;
  readonly flight: Layer;

  readonly inputs: AmbienceInputs = {
    biome: 'meadow',
    altitude: 0,
    height: 0,
    night: 0,
    hour: 12,
    rain: 0,
    wind: 0.4,
    gust: 0,
    indoors: false,
    crypt: false,
    tavern: false,
    water: 0,
    village: 0,
    forge: 0,
    ruins: 0,
    swamp: 0,
    corruption: 0,
    flying: false,
    menu: false,
  };
  readonly targets: AmbienceTargets = emptyTargets();
  private evalT = 0;
  private sinceEval = 0;
  private next: Record<Spawn, number> = { bird: 1, owl: 5, frog: 1, bubble: 1, hammer: 1, crackle: 1, howl: 20, drip: 1, gust: 5 };
  private flightT = 0;
  private flightLevel = 0;
  private lastSpace = '';
  private pos = { x: 0, y: 0, z: 0 };
  private tmp = { x: 0, y: 0, z: 0 };
  /** Fator geral (0 = sem ambiência, ex.: tela de morte/cinemática). */
  master = 1;
  readonly stats = { spawned: 0, layersRunning: 0 };

  constructor(
    private e: AudioEngine,
    private ctx: GameContext,
  ) {
    const dest = e.buses.ambient.input;
    this.wind = new Layer('vento', e, buildWind, 0.55, dest);
    this.howl = new Layer('uivo', e, buildHowl, 0.22, dest);
    this.rain = new Layer('chuva', e, buildRain, 0.5, dest);
    this.rainIn = new Layer('chuva_telhado', e, buildRainMuffled, 0.55, dest);
    this.water = new Layer('agua', e, buildWater, 0.5, dest);
    this.swamp = new Layer('pantano', e, buildSwamp, 0.45, dest);
    this.hum = new Layer('zumbido', e, buildHum, 0.18, dest);
    this.corruption = new Layer('corrupcao', e, buildCorruption, 0.12, dest);
    this.crowd = new Layer('vila', e, buildCrowd, 0.16, dest);
    this.crickets = new Layer('grilos', e, buildCrickets, 0.12, dest);
    this.cave = new Layer('cripta', e, buildCave, 0.6, dest);
    // o vento do voo vai no barramento de efeitos (é do jogador)
    this.flight = new Layer('voo', e, buildFlight, 0.5, e.buses.sfx.input);
    this.layers = [this.wind, this.howl, this.rain, this.rainIn, this.water, this.swamp, this.hum, this.corruption, this.crowd, this.crickets, this.cave, this.flight];
  }

  /** Posição de escuta da ambiência (jogador em jogo; câmera no menu). */
  private listenPos(): { x: number; y: number; z: number } {
    const ctx = this.ctx;
    const p = this.pos;
    if (ctx.state === 'menu' || ctx.state === 'boot' || !ctx.sys.player?.entity) {
      const c = ctx.camera.position;
      p.x = c.x;
      p.z = c.z;
      // a câmera do menu voa alto: ouvimos "do chão" da vila
      p.y = ctx.heightfield.heightAt(c.x, c.z) + 2;
    } else {
      const pp = ctx.sys.player.position;
      p.x = pp.x;
      p.y = pp.y;
      p.z = pp.z;
    }
    return p;
  }

  private gatherInputs() {
    const ctx = this.ctx;
    const i = this.inputs;
    const p = this.listenPos();
    const hf = ctx.heightfield;
    const ground = hf.heightAt(p.x, p.z);
    i.biome = hf.biomeAt(p.x, p.z);
    i.altitude = p.y - Math.max(ground, WATER_LEVEL);
    i.height = p.y;
    const env = ctx.sys.env;
    i.night = typeof env?.night === 'number' ? env.night : ctx.clock.isNight() ? 1 : 0;
    i.hour = ctx.clock.hours;
    i.rain = env?.rainIntensity ?? 0;
    i.wind = env?.windStrength ?? 0.4;
    i.gust = env?.gust ?? 0;
    const world = ctx.sys.world;
    const indoorId = world?.indoorId?.(p) ?? null;
    i.indoors = !!indoorId;
    i.crypt = !!indoorId && indoorId.startsWith('cripta');
    i.tavern = indoorId === 'taverna';
    // água: rio (distância analítica) + lago/mar (amostras do relevo em volta)
    let wd = Math.max(0, riverDistance(p.x, p.z));
    if (hf.isWater(p.x, p.z)) wd = 0;
    else if (wd > 10) {
      for (let k = 0; k < 8 && wd > 10; k++) {
        const a = (k / 8) * Math.PI * 2;
        for (const r of [12, 28, 45]) {
          if (r >= wd) break;
          if (hf.isWater(p.x + Math.cos(a) * r, p.z + Math.sin(a) * r)) {
            wd = r;
            break;
          }
        }
      }
    }
    if (ctx.sys.player?.isSwimming?.()) wd = 0;
    i.water = proximity(wd, AMBIENCE.waterNear, AMBIENCE.waterFar);
    const dv = Math.hypot(p.x - VILLAGE.x, p.z - VILLAGE.z);
    i.village = proximity(dv, VILLAGE.radius * 0.7, VILLAGE.radius * 1.5);
    i.forge = proximity(Math.hypot(p.x - (VILLAGE_FORGE.x), p.z - VILLAGE_FORGE.z), 10, 130);
    let ruins = 0;
    for (const l of TECH_SITES) ruins = Math.max(ruins, proximity(Math.hypot(p.x - l.x, p.z - l.z), l.radius * 0.6, l.radius * 1.6));
    i.ruins = ruins;
    i.swamp = i.biome === 'swamp' ? 1 : proximity(Math.hypot(p.x - SWAMP.x, p.z - SWAMP.z), SWAMP.radius * 0.8, SWAMP.radius * 1.3);
    i.corruption = clamp01(GLOBAL_UNIFORMS.uCorruption?.value ?? 0);
    i.flying = !!ctx.sys.player?.isFlying?.();
    i.menu = ctx.state === 'menu';
  }

  update(dt: number) {
    const ctx = this.ctx;
    this.sinceEval += dt;
    this.evalT -= dt;
    if (this.evalT <= 0) {
      this.evalT = AMBIENCE.evalInterval;
      const edt = this.sinceEval;
      this.sinceEval = 0;
      this.gatherInputs();
      const T = ambienceTargets(this.inputs, this.targets);
      const m = this.master;
      const tau = AMBIENCE.fadeTau;
      this.wind.set(T.wind * m, edt, tau);
      this.howl.set(T.howl * m, edt, tau * 1.5);
      this.rain.set(T.rain * m, edt, tau);
      this.rainIn.set(T.rainMuffled * m, edt, tau * 0.6);
      this.water.set(T.water * m, edt, tau);
      this.swamp.set(T.swamp * m, edt, tau * 1.5);
      this.hum.set(T.hum * m, edt, tau);
      this.corruption.set(T.corruption * m, edt, tau * 2);
      this.crowd.set(T.crowd * m, edt, tau);
      this.crickets.set(T.crickets * m, edt, tau * 1.5);
      this.cave.set(T.cave * m, edt, tau);
      this.modulate();
      if (T.space !== this.lastSpace) {
        this.lastSpace = T.space;
        const s = REVERB_SPACES[T.space];
        this.e.setSpace(s.room, s.hall, 1.2);
      }
      let n = 0;
      for (const l of this.layers) if (l.running) n++;
      this.stats.layersRunning = n;
    }
    this.updateFlight(dt);
    if (ctx.state === 'playing' || ctx.state === 'menu' || ctx.state === 'dialogue') this.spawn(dt);
  }

  /** Modulações lentas (vento segue rajadas/altitude; uivo vagueia). */
  private modulate() {
    const t = this.e.ac.currentTime;
    const i = this.inputs;
    const wb = this.wind.built;
    if (wb?.f) {
      const f = 280 + 420 * Math.min(2, i.wind) + 700 * i.gust + 4 * Math.min(120, Math.max(0, i.altitude));
      wb.f.frequency.setTargetAtTime(f, t, 0.6);
    }
    const hb = this.howl.built;
    if (hb?.f && hb.f2) {
      hb.f.frequency.setTargetAtTime(450 + this.e.rand() * 650, t, 1.8);
      hb.f2.frequency.setTargetAtTime(900 + this.e.rand() * 900, t, 2.4);
    }
    const rb = this.rain.built;
    if (rb?.f) rb.f.frequency.setTargetAtTime(3800 + 3000 * i.rain, t, 1);
  }

  /** Laço do vento do voo: nível e brilho pela velocidade do jogador. */
  private updateFlight(dt: number) {
    this.flightT -= dt;
    if (this.flightT > 0) return;
    this.flightT = 1 / 15;
    const pl = this.ctx.sys.player;
    const flying = this.ctx.state === 'playing' && !!pl?.isFlying?.();
    const sp = flying ? pl.speed : 0;
    const k = flying ? clamp01(0.15 + sp / 40) : 0;
    // filtro com histerese para não encher a fila de automação
    if (Math.abs(k - this.flightLevel) > 0.01 || (k === 0 && this.flightLevel !== 0)) {
      this.flightLevel = k;
      this.flight.set(k, 1 / 15, 0.25);
      const b = this.flight.built;
      if (b?.f && b.f2) {
        const t = this.e.ac.currentTime;
        b.f.frequency.setTargetAtTime(350 + sp * 45, t, 0.2);
        b.f2.frequency.setTargetAtTime(1500 + sp * 120, t, 0.2);
      }
    } else this.flight.set(k, 1 / 15, 0.25);
  }

  /** Sons pontuais por processo de Poisson. */
  private spawn(dt: number) {
    const T = this.targets;
    const m = this.master;
    if (m <= 0.01) return;
    for (const k of SPAWNS) {
      const rate = this.rateOf(k, T) * m;
      let n = this.next[k];
      if (!(rate > 1e-5)) {
        this.next[k] = Infinity;
        continue;
      }
      if (n === Infinity) n = nextInterval(rate, this.e.rand());
      n -= dt;
      if (n <= 0) {
        this.fire(k);
        n = nextInterval(rate, this.e.rand());
      }
      this.next[k] = n;
    }
  }

  private rateOf(k: Spawn, T: AmbienceTargets): number {
    switch (k) {
      case 'bird':
        return T.birdRate;
      case 'owl':
        return T.owlRate;
      case 'frog':
        return T.frogRate;
      case 'bubble':
        return T.bubbleRate;
      case 'hammer':
        return T.hammerRate;
      case 'crackle':
        return T.crackleRate;
      case 'howl':
        return T.howlRate;
      case 'drip':
        return T.dripRate;
      case 'gust':
        return T.gustRate;
    }
  }

  /** Ponto aleatório em volta do ouvinte (distância [r0,r1], altura relativa [h0,h1]). */
  private around(r0: number, r1: number, h0: number, h1: number) {
    const p = this.pos;
    const a = this.e.rand() * Math.PI * 2;
    const r = r0 + (r1 - r0) * this.e.rand();
    const o = this.tmp;
    o.x = p.x + Math.cos(a) * r;
    o.z = p.z + Math.sin(a) * r;
    o.y = p.y + h0 + (h1 - h0) * this.e.rand();
    return o;
  }

  private fire(k: Spawn) {
    const e = this.e;
    let id: SfxId;
    let pos: { x: number; y: number; z: number } | undefined;
    let vol = 1;
    let pitch = 1;
    switch (k) {
      case 'bird':
        id = 'amb_bird';
        pos = this.around(12, 55, 4, 14);
        pitch = 0.85 + e.rand() * 0.4;
        break;
      case 'owl':
        id = 'amb_owl';
        pos = this.around(30, 90, 6, 16);
        break;
      case 'frog':
        id = 'amb_frog';
        pos = this.around(5, 30, -1, 0.5);
        pitch = 0.8 + e.rand() * 0.6;
        break;
      case 'bubble':
        id = 'amb_bubble';
        pos = this.around(3, 14, -1, 0);
        break;
      case 'hammer': {
        id = 'amb_hammer';
        const o = this.tmp;
        o.x = FORGE.x;
        o.z = FORGE.z;
        o.y = this.ctx.heightfield.heightAt(FORGE.x, FORGE.z) + 1;
        pos = o;
        // série de 2–4 marteladas
        const n = 2 + Math.floor(e.rand() * 3);
        for (let j = 0; j < n; j++) {
          if (e.play(id, { position: pos, volume: j === n - 1 ? 1 : 0.8, pitch: 1 + (e.rand() - 0.5) * 0.04, delay: j * (0.42 + e.rand() * 0.06) }, false)) this.stats.spawned++;
        }
        return;
      }
      case 'crackle':
        id = 'amb_crackle';
        pos = this.around(4, 22, 0, 4);
        break;
      case 'howl':
        id = 'amb_howl';
        pos = this.around(220, 450, 0, 20);
        pitch = 0.9 + e.rand() * 0.2;
        break;
      case 'drip':
        id = 'amb_drip';
        pos = this.around(1.5, 8, 0, 3);
        break;
      case 'gust':
        id = 'amb_gust';
        vol = 0.5 + 0.5 * this.targets.wind;
        break;
    }
    if (e.play(id, { position: pos, volume: vol, pitch })) this.stats.spawned++;
  }

  /** Para todas as camadas (descarte / suspensão). */
  stopAll() {
    for (const l of this.layers) l.stop();
  }

  /** Estado legível para depuração. */
  debug() {
    const out: Record<string, number> = {};
    for (const l of this.layers) out[l.name] = +l.target.toFixed(3);
    return { targets: out, running: this.stats.layersRunning, spawned: this.stats.spawned, space: this.lastSpace, inputs: { ...this.inputs } };
  }
}

const VILLAGE_FORGE = FORGE;
void EPS;
