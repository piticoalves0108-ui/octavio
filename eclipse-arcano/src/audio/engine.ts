/**
 * Motor de áudio (WebAudio): grafo master → compressor → limitador, barramentos
 * música/efeitos/ambiente/interface (com filtro de "abafar" e volume), reverb por
 * convolução com respostas geradas (sala curta + salão longo), pool fixo de vozes
 * posicionais (PannerNode reaproveitado) com prioridade/roubo/limite por id e
 * deduplicação de sons idênticos simultâneos.
 */
import type { SfxId } from './Audio';
import { SFX_DEFS, MIX, DEDUPE, type BusId } from './data';
import { RECIPES, type RecipeParams } from './sfxRecipes';
import { makeImpulse, makeNoiseBuffer, makeShaperCurve, type SynthHost } from './synth';
import { Rng, airCutoff, chooseVoice, distanceGain, distanceWet, pitchJitter, type VoiceSlotInfo } from './audioMath';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EnginePlay {
  position?: Vec3;
  volume?: number;
  pitch?: number;
  surface?: string;
  variant?: string;
  running?: boolean;
  /** Atraso (s) a partir de agora (trovão, sequências). */
  delay?: number;
}

interface Bus {
  input: GainNode;
  filter: BiquadFilterNode;
  vol: GainNode;
  /** Entrada do reverb deste barramento (escalada pelo mesmo volume). */
  verbIn: GainNode;
}

interface Slot extends VoiceSlotInfo {
  lp: BiquadFilterNode;
  panner: PannerNode;
  out: GainNode;
  send: GainNode;
  vca: GainNode | null;
  bus: BusId | null;
  positional: boolean;
}

const BUS_IDS: BusId[] = ['music', 'sfx', 'ambient', 'ui'];
const RECENT = 32;
const GRAVE = 64;

export class AudioEngine implements SynthHost {
  readonly ac: AudioContext;
  white: AudioBuffer;
  pink: AudioBuffer;
  brown: AudioBuffer;
  softClip = makeShaperCurve(1.5);
  hardClip = makeShaperCurve(5);
  nodes = 0;
  private rng = new Rng((Math.random() * 0xffffffff) >>> 0);
  readonly rand = () => this.rng.next();

  readonly master: GainNode;
  readonly comp: DynamicsCompressorNode;
  readonly limiter: DynamicsCompressorNode;
  readonly analyser: AnalyserNode;
  readonly buses: Record<BusId, Bus>;
  /** Envio de reverb ambiental (sala / salão) — quantidade muda com o espaço. */
  readonly envRoom: GainNode;
  readonly envHall: GainNode;
  /** Envio fixo da música para o salão. */
  readonly musicVerb: GainNode;
  readonly roomVerb: ConvolverNode;
  readonly hallVerb: ConvolverNode;

  readonly listener = { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1 };
  private slots: Slot[] = [];
  private maxVoices = 28;

  // deduplicação (anel fixo, sem alocação)
  private recentT = new Float64Array(RECENT).fill(-1);
  private recentX = new Float32Array(RECENT);
  private recentY = new Float32Array(RECENT);
  private recentZ = new Float32Array(RECENT);
  private recentKey: string[] = new Array(RECENT).fill('');
  private recentFam: string[] = new Array(RECENT).fill('');
  private recentPos = new Uint8Array(RECENT);
  private recentI = 0;

  // vozes roubadas aguardando desconexão
  private graveNode: (GainNode | null)[] = new Array(GRAVE).fill(null);
  private graveT = new Float64Array(GRAVE);
  private graveI = 0;

  private params: RecipeParams = { pitch: 1, intensity: 1, surface: '', variant: '', distance: 0, running: false };

  readonly stats = { played: 0, culled: 0, dropped: 0, deduped: 0, stolen: 0, active: 0, peak: 0, perId: {} as Record<string, number> };

  constructor(ac: AudioContext) {
    this.ac = ac;
    this.white = makeNoiseBuffer(ac, 'white', 2, 11);
    this.pink = makeNoiseBuffer(ac, 'pink', 3, 23);
    this.brown = makeNoiseBuffer(ac, 'brown', 4, 37);

    this.master = ac.createGain();
    this.comp = ac.createDynamicsCompressor();
    this.limiter = ac.createDynamicsCompressor();
    this.analyser = ac.createAnalyser();
    this.analyser.fftSize = 1024;
    const c = MIX.comp;
    this.comp.threshold.value = c.threshold;
    this.comp.knee.value = c.knee;
    this.comp.ratio.value = c.ratio;
    this.comp.attack.value = c.attack;
    this.comp.release.value = c.release;
    const l = MIX.limiter;
    this.limiter.threshold.value = l.threshold;
    this.limiter.knee.value = l.knee;
    this.limiter.ratio.value = l.ratio;
    this.limiter.attack.value = l.attack;
    this.limiter.release.value = l.release;
    this.master.connect(this.comp);
    this.comp.connect(this.limiter);
    this.limiter.connect(ac.destination);
    this.limiter.connect(this.analyser);

    this.roomVerb = ac.createConvolver();
    this.hallVerb = ac.createConvolver();
    this.roomVerb.buffer = makeImpulse(ac, MIX.roomSeconds, 3.2, 0.006, 5);
    this.hallVerb.buffer = makeImpulse(ac, MIX.hallSeconds, 2.4, 0.02, 9);
    this.roomVerb.connect(this.master);
    this.hallVerb.connect(this.master);
    this.envRoom = ac.createGain();
    this.envHall = ac.createGain();
    this.envRoom.gain.value = 0.1;
    this.envHall.gain.value = 0.06;
    this.envRoom.connect(this.roomVerb);
    this.envHall.connect(this.hallVerb);
    this.musicVerb = ac.createGain();
    this.musicVerb.gain.value = 0.32;
    this.musicVerb.connect(this.hallVerb);

    const buses = {} as Record<BusId, Bus>;
    for (const id of BUS_IDS) {
      const input = ac.createGain();
      input.gain.value = MIX.busTrim[id];
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 20000;
      filter.Q.value = 0.5;
      const vol = ac.createGain();
      input.connect(filter);
      filter.connect(vol);
      vol.connect(this.master);
      const verbIn = ac.createGain();
      verbIn.gain.value = 1;
      if (id === 'music') verbIn.connect(this.musicVerb);
      else if (id !== 'ui') {
        verbIn.connect(this.envRoom);
        verbIn.connect(this.envHall);
      }
      buses[id] = { input, filter, vol, verbIn };
    }
    this.buses = buses;
    // a música manda o próprio sinal (pós-volume) ao reverb
    buses.music.vol.connect(buses.music.verbIn);
    buses.music.verbIn.gain.value = 1;
    this.nodes = 0;
  }

  // ------------------------------------------------------------------ mixagem

  setMasterVolume(v: number) {
    this.master.gain.setTargetAtTime(v, this.ac.currentTime, 0.05);
  }

  /** Volume de um barramento (o reverb do barramento acompanha). */
  setBusVolume(bus: BusId, v: number) {
    const t = this.ac.currentTime;
    const b = this.buses[bus];
    b.vol.gain.setTargetAtTime(v, t, 0.05);
    if (bus !== 'music') b.verbIn.gain.setTargetAtTime(v, t, 0.05);
  }

  /** Abafa (passa-baixas) os barramentos de mundo — pausa/menus. */
  setMuffled(muffled: boolean, cutoff = MIX.muffledCutoff) {
    const t = this.ac.currentTime;
    for (const id of ['sfx', 'ambient'] as BusId[]) this.buses[id].filter.frequency.setTargetAtTime(muffled ? cutoff : 20000, t, 0.12);
  }

  /** Quantidade de reverb ambiental (sala curta e salão longo). */
  setSpace(room: number, hall: number, tau = 0.8) {
    const t = this.ac.currentTime;
    this.envRoom.gain.setTargetAtTime(room, t, tau);
    this.envHall.gain.setTargetAtTime(hall, t, tau);
  }

  setMaxVoices(n: number) {
    this.maxVoices = Math.max(4, Math.floor(n));
  }

  // ------------------------------------------------------------------ ouvinte

  /** Atualiza o ouvinte a partir da matriz de mundo da câmera (sem alocar). */
  updateListener(m: ArrayLike<number>) {
    const L = this.listener;
    L.x = m[12];
    L.y = m[13];
    L.z = m[14];
    L.fx = -m[8];
    L.fy = -m[9];
    L.fz = -m[10];
    const li = this.ac.listener;
    if (li.positionX) {
      li.positionX.value = L.x;
      li.positionY.value = L.y;
      li.positionZ.value = L.z;
      li.forwardX.value = L.fx;
      li.forwardY.value = L.fy;
      li.forwardZ.value = L.fz;
      li.upX.value = m[4];
      li.upY.value = m[5];
      li.upZ.value = m[6];
    } else {
      // Firefox antigo
      (li as any).setPosition?.(L.x, L.y, L.z);
      (li as any).setOrientation?.(L.fx, L.fy, L.fz, m[4], m[5], m[6]);
    }
  }

  distanceTo(p: Vec3): number {
    const L = this.listener;
    return Math.hypot(p.x - L.x, p.y - L.y, p.z - L.z);
  }

  // ------------------------------------------------------------------ vozes

  private makeSlot(): Slot {
    const ac = this.ac;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 20000;
    lp.Q.value = 0.4;
    const panner = ac.createPanner();
    panner.panningModel = 'equalpower';
    panner.distanceModel = 'linear';
    panner.refDistance = 1;
    panner.maxDistance = 100000;
    panner.rolloffFactor = 0; // a atenuação é nossa (distanceGain), o panner só posiciona
    const out = ac.createGain();
    const send = ac.createGain();
    send.gain.value = 0;
    lp.connect(panner);
    panner.connect(out);
    out.connect(send);
    return { lp, panner, out, send, vca: null, bus: null, positional: true, busy: false, end: 0, start: 0, priority: 0, gain: 0, id: '' };
  }

  /** Voz roubada: rampa curta para 0 e desconexão adiada (sem clique). */
  private retire(s: Slot, now: number) {
    const v = s.vca;
    if (!v) return;
    v.gain.cancelScheduledValues(now);
    v.gain.setValueAtTime(v.gain.value, now);
    v.gain.linearRampToValueAtTime(0, now + 0.03);
    const i = this.graveI++ % GRAVE;
    this.graveNode[i]?.disconnect();
    this.graveNode[i] = v;
    this.graveT[i] = now + 0.08;
    s.vca = null;
  }

  private isDuplicate(key: string, fam: string, p: Vec3 | undefined, now: number): boolean {
    const w = DEDUPE.window;
    const r2 = DEDUPE.radius * DEDUPE.radius;
    for (let i = 0; i < RECENT; i++) {
      const t = this.recentT[i];
      if (t < 0 || now - t > w) continue;
      if (this.recentKey[i] !== key && (!fam || this.recentFam[i] !== fam)) continue;
      if (!p || !this.recentPos[i]) return true;
      const dx = this.recentX[i] - p.x;
      const dy = this.recentY[i] - p.y;
      const dz = this.recentZ[i] - p.z;
      if (dx * dx + dy * dy + dz * dz < r2) return true;
    }
    return false;
  }

  private remember(key: string, fam: string, p: Vec3 | undefined, now: number) {
    const i = this.recentI++ % RECENT;
    this.recentT[i] = now;
    this.recentKey[i] = key;
    this.recentFam[i] = fam;
    this.recentPos[i] = p ? 1 : 0;
    if (p) {
      this.recentX[i] = p.x;
      this.recentY[i] = p.y;
      this.recentZ[i] = p.z;
    }
  }

  /**
   * Toca um efeito. Retorna false se foi descartado (inaudível, duplicado ou sem voz).
   * `dedupe` = false desliga a deduplicação (sequências intencionais).
   */
  play(id: SfxId, o: EnginePlay = {}, dedupe = true): boolean {
    const def = SFX_DEFS[id];
    const recipe = RECIPES[id];
    if (!def || !recipe) return false;
    const ac = this.ac;
    const now = ac.currentTime;
    const pos = def.positional ? o.position : undefined;
    const d = pos ? this.distanceTo(pos) : 0;
    const dg = pos ? distanceGain(d, def.ref, def.max, def.rolloff) : 1;
    const g = def.gain * (o.volume ?? 1) * dg;
    if (!(g > 0.002)) {
      this.stats.culled++;
      return false;
    }
    const delay = Math.max(0, o.delay ?? 0);
    if (dedupe && delay === 0) {
      const key = id + (o.surface ?? '') + (o.variant ?? '');
      if (this.isDuplicate(key, def.family ?? '', pos, now)) {
        this.stats.deduped++;
        return false;
      }
      this.remember(key, def.family ?? '', pos, now);
    }
    // garante slots até o limite atual
    if (this.slots.length < this.maxVoices) {
      let free = false;
      for (const s of this.slots) if (!s.busy || s.end <= now) free = true;
      if (!free) this.slots.push(this.makeSlot());
    }
    const n = Math.min(this.slots.length, this.maxVoices);
    const view = n === this.slots.length ? this.slots : this.slots.slice(0, n);
    const idx = chooseVoice(view, now, id, def.priority, g, def.maxInstances);
    if (idx < 0) {
      this.stats.dropped++;
      return false;
    }
    const s = this.slots[idx];
    if (s.vca) {
      if (s.busy && s.end > now) this.stats.stolen++;
      this.retire(s, now);
    }
    // roteamento do slot
    if (s.bus !== def.bus) {
      s.out.disconnect();
      s.send.disconnect();
      s.out.connect(s.send);
      s.out.connect(this.buses[def.bus].input);
      s.send.connect(this.buses[def.bus].verbIn);
      s.bus = def.bus;
    }
    const L = this.listener;
    const px = pos ? pos.x : L.x + L.fx;
    const py = pos ? pos.y : L.y + L.fy;
    const pz = pos ? pos.z : L.z + L.fz;
    const pn = s.panner;
    if (pn.positionX) {
      pn.positionX.setValueAtTime(px, now);
      pn.positionY.setValueAtTime(py, now);
      pn.positionZ.setValueAtTime(pz, now);
    } else (pn as any).setPosition?.(px, py, pz);
    s.lp.frequency.setValueAtTime(pos ? airCutoff(d) : 20000, now);
    s.send.gain.setValueAtTime(def.reverb + (pos ? distanceWet(d, def.ref) : 0), now);
    s.positional = !!pos;

    const vca = ac.createGain();
    vca.gain.value = g;
    vca.connect(s.lp);
    this.nodes++;
    const P = this.params;
    P.pitch = (o.pitch ?? 1) * pitchJitter(this.rand(), def.pitchVar);
    P.intensity = o.volume ?? 1;
    P.surface = o.surface ?? '';
    P.variant = o.variant ?? '';
    P.distance = d;
    P.running = !!o.running;
    const t = now + 0.004 + delay;
    let dur = 0.5;
    try {
      dur = recipe(this, t, vca, P);
    } catch (err) {
      console.warn(`[Audio] receita "${id}" falhou`, err);
    }
    s.vca = vca;
    s.busy = true;
    s.id = id;
    s.priority = def.priority;
    s.gain = g;
    s.start = now;
    s.end = t + dur + 0.08;
    this.stats.played++;
    this.stats.perId[id] = (this.stats.perId[id] ?? 0) + 1;
    return true;
  }

  /** Por quadro: libera vozes terminadas, desconecta vozes roubadas, mantém 2D no ouvinte. */
  update() {
    const now = this.ac.currentTime;
    let active = 0;
    const L = this.listener;
    for (const s of this.slots) {
      if (!s.busy) continue;
      if (s.end <= now) {
        s.vca?.disconnect();
        s.vca = null;
        s.busy = false;
        s.id = '';
        continue;
      }
      active++;
      if (!s.positional) {
        const pn = s.panner;
        if (pn.positionX) {
          pn.positionX.value = L.x + L.fx;
          pn.positionY.value = L.y + L.fy;
          pn.positionZ.value = L.z + L.fz;
        }
      }
    }
    for (let i = 0; i < GRAVE; i++) {
      const v = this.graveNode[i];
      if (v && this.graveT[i] <= now) {
        v.disconnect();
        this.graveNode[i] = null;
      }
    }
    this.stats.active = active;
    if (active > this.stats.peak) this.stats.peak = active;
  }

  /** Para tudo (novo jogo / menu). */
  stopAll() {
    const now = this.ac.currentTime;
    for (const s of this.slots) {
      if (s.vca) this.retire(s, now);
      s.busy = false;
      s.end = 0;
    }
  }

  activeVoiceCount(): number {
    return this.stats.active;
  }

  slotCount(): number {
    return this.slots.length;
  }

  /** Nível de pico/RMS atual da saída (depuração/testes). */
  outputLevel(): { peak: number; rms: number } {
    const n = this.analyser.fftSize;
    const buf = new Float32Array(n);
    this.analyser.getFloatTimeDomainData(buf);
    let peak = 0;
    let e = 0;
    for (let i = 0; i < n; i++) {
      const a = Math.abs(buf[i]);
      if (a > peak) peak = a;
      e += buf[i] * buf[i];
    }
    return { peak, rms: Math.sqrt(e / n) };
  }

  /**
   * Renderiza um efeito num OfflineAudioContext e mede o resultado (testes de
   * síntese: todo SfxId deve produzir som finito, audível e sem estourar).
   */
  async renderOffline(id: SfxId, o: EnginePlay = {}, seconds = 3): Promise<{ peak: number; rms: number; dur: number; nodes: number; nan: boolean }> {
    const sr = 22050;
    const off = new OfflineAudioContext(1, Math.ceil(sr * seconds), sr);
    const rng = new Rng(1234);
    const host: SynthHost = {
      ac: off,
      white: makeNoiseBuffer(off, 'white', 2, 11),
      pink: makeNoiseBuffer(off, 'pink', 3, 23),
      brown: makeNoiseBuffer(off, 'brown', 4, 37),
      softClip: this.softClip,
      hardClip: this.hardClip,
      nodes: 0,
      rand: () => rng.next(),
    };
    const out = off.createGain();
    out.connect(off.destination);
    const p: RecipeParams = { pitch: o.pitch ?? 1, intensity: o.volume ?? 1, surface: o.surface ?? '', variant: o.variant ?? '', distance: o.position ? Math.hypot(o.position.x, o.position.y, o.position.z) : 10, running: !!o.running };
    const dur = RECIPES[id](host, 0.01, out, p);
    const buf = await off.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0;
    let e = 0;
    let nan = false;
    for (let i = 0; i < d.length; i++) {
      const a = d[i];
      if (!Number.isFinite(a)) nan = true;
      const ab = Math.abs(a);
      if (ab > peak) peak = ab;
      e += a * a;
    }
    return { peak, rms: Math.sqrt(e / d.length), dur, nodes: host.nodes, nan };
  }
}
