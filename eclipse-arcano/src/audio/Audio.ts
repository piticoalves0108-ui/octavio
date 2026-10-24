import type * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import type { GameStateName, MusicState } from '../core/EventBus';
import { AudioEngine, type EnginePlay } from './engine';
import { Ambience } from './ambience';
import { MusicDirector, renderMusicOffline } from './music';
import { AudioHooks } from './hooks';
import { chooseMusicState, type MusicInputs } from './musicLogic';
import { LOW_HEALTH, MUSIC, MUSIC_INTENSITY, MUSIC_NOTE_LIMIT, SFX_DEFS, VOICE_LIMIT } from './data';
import { clamp01, sliderToGain } from './audioMath';

/** Ids de efeitos sonoros (sintetizados proceduralmente pelo módulo de áudio). */
export type SfxId =
  | 'ui_click'
  | 'ui_hover'
  | 'ui_open'
  | 'ui_close'
  | 'ui_error'
  | 'quest_start'
  | 'quest_complete'
  | 'level_up'
  | 'pickup'
  | 'gold'
  | 'equip'
  | 'potion'
  | 'footstep'
  | 'jump'
  | 'land'
  | 'dodge'
  | 'flight_start'
  | 'flight_loop'
  | 'flight_end'
  | 'swing'
  | 'swing_heavy'
  | 'hit_flesh'
  | 'hit_metal'
  | 'hit_magic'
  | 'block'
  | 'parry'
  | 'cast_arcane'
  | 'cast_lance'
  | 'cast_explosion'
  | 'cast_chains'
  | 'cast_shield'
  | 'cast_teleport'
  | 'cast_lightning'
  | 'cast_blades'
  | 'cast_rift'
  | 'cast_ascend'
  | 'explosion'
  | 'thunder'
  | 'enemy_alert'
  | 'enemy_death'
  | 'boss_roar'
  | 'boss_slam'
  | 'boss_laser'
  | 'creature_call'
  | 'door'
  | 'chest_open'
  | 'death'
  // acrescentados pelo módulo de áudio
  | 'quest_update'
  | 'discovery'
  | 'respawn'
  | 'heartbeat'
  | 'hurt'
  | 'page'
  | 'combo'
  | 'gate'
  | 'village_bell'
  | 'amb_bird'
  | 'amb_cricket'
  | 'amb_owl'
  | 'amb_frog'
  | 'amb_bubble'
  | 'amb_hammer'
  | 'amb_crackle'
  | 'amb_howl'
  | 'amb_drip'
  | 'amb_gust'
  // mundo interativo
  | 'fire_ignite'
  | 'wood_break'
  | 'grass_cut'
  | 'stasis'
  | 'cook';

export interface PlayOptions {
  position?: THREE.Vector3;
  volume?: number;
  /** Variação de pitch (1 = normal). */
  pitch?: number;
  /** Para passos: superfície. */
  surface?: string;
  /** Variante de timbre (ex.: tipo de dano em 'hit_magic': 'fire' | 'frost' | 'lightning' | 'void' | 'time'). */
  variant?: string;
  /** Passos: correndo (mais forte). */
  running?: boolean;
  /** Atraso (s) a partir de agora. */
  delay?: number;
}

/** Posição genérica (Vector3 ou {x,y,z}). */
type Vec3 = { x: number; y: number; z: number };

const EMPTY: EnginePlay = {};

/**
 * Áudio procedural (WebAudio): efeitos sintetizados com áudio posicional e
 * pool de vozes, ambiência por bioma/horário/clima e música adaptativa gerativa.
 * Tudo é criado depois do primeiro gesto do usuário (unlock), respeitando a
 * política de autoplay; antes disso, play() é ignorado e o estado musical
 * continua sendo calculado (campo `music`).
 */
export class AudioSystem implements GameSystem {
  readonly name = 'audio';
  alwaysUpdate = true;
  /** Estado musical decidido agora (o que está tocando ou entrando no próximo compasso). */
  music: MusicState = 'silence';
  protected ctx!: GameContext;

  /** Motor (null até o unlock). */
  engine: AudioEngine | null = null;
  ambience: Ambience | null = null;
  director: MusicDirector | null = null;
  /** WebAudio indisponível: o jogo segue mudo. */
  failed = false;
  /** Fase do chefe atual (1..3) — intensidade da música do chefe. */
  bossPhase = 1;

  private hooks: AudioHooks | null = null;
  private forced: MusicState | null = null;
  private forcedLeft = 0;
  private hint: MusicState | null = null;
  private hintLeft = 0;
  private victoryLeft = 0;
  private combatLinger = 0;
  private evalT = 0;
  private intensity = 0;
  private heartbeatT = 0;
  private muffled = false;
  private ambMaster = 1;
  private unlocks = 0;
  private lastAcT = 0;
  private gateT = 0;
  private gateState = new Map<string, boolean>();
  private gatePos = { x: 0, y: 0, z: 0 };
  /** Última porta aberta por interação (evita dobrar com o som do portão). */
  lastDoorT = -10;
  readonly lastDoorPos = { x: 0, y: 0, z: 0 };
  private gestureOff: (() => void) | null = null;
  private readonly inputs: MusicInputs = {
    gameState: 'boot',
    forced: null,
    hint: null,
    inCombat: false,
    bossActive: false,
    victoryLeft: 0,
    combatLinger: 0,
    locationKind: null,
    tavern: false,
    night: 0,
  };
  private warned = new Set<string>();

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.hooks = new AudioHooks(this, ctx);
    this.hooks.attach();
    // gestos posteriores retomam o contexto se o navegador o suspender
    const resume = () => {
      if (this.engine && this.engine.ac.state !== 'running') this.resume();
    };
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('keydown', resume, { passive: true });
    this.gestureOff = () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }

  /** Deve ser chamado após um gesto do usuário (política de autoplay). */
  unlock() {
    if (this.failed) return;
    this.unlocks++;
    if (this.engine) {
      this.resume();
      return;
    }
    try {
      const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) {
        this.failed = true;
        console.warn('[Audio] WebAudio indisponível — jogo sem som');
        return;
      }
      const ac = new AC({ latencyHint: 'interactive' });
      this.engine = new AudioEngine(ac);
      this.ambience = new Ambience(this.engine, this.ctx);
      this.director = new MusicDirector(this.engine);
      this.applySettings();
      this.resume();
    } catch (err) {
      this.failed = true;
      this.engine = null;
      this.ambience = null;
      this.director = null;
      console.warn('[Audio] falha ao iniciar o WebAudio — jogo sem som', err);
    }
  }

  private resume() {
    const ac = this.engine?.ac;
    if (!ac || ac.state === 'running' || ac.state === 'closed') return;
    ac.resume().catch(() => {
      /* sem gesto válido: tenta de novo no próximo */
    });
  }

  /** O contexto está tocando? */
  get running(): boolean {
    return !!this.engine && this.engine.ac.state === 'running';
  }

  play(id: SfxId, opts?: PlayOptions) {
    this.playEx(id, (opts as EnginePlay | undefined) ?? EMPTY);
  }

  /** Versão interna/estendida (variante, atraso, posição {x,y,z}). Retorna se tocou. */
  playEx(id: SfxId, o: EnginePlay): boolean {
    const e = this.engine;
    if (!e || e.ac.state !== 'running') return false;
    if (!SFX_DEFS[id]) {
      if (!this.warned.has(id)) {
        this.warned.add(id);
        console.warn(`[Audio] efeito desconhecido: ${String(id)}`);
      }
      return false;
    }
    return e.play(id, o);
  }

  /**
   * Força um estado musical (cinemáticas, momentos de roteiro). `holdSeconds`
   * (padrão: até clearMusicOverride/novo jogo/menu). 'victory' toca a vinheta e volta sozinho.
   */
  setMusic(state: MusicState, holdSeconds = Infinity) {
    if (state === 'victory') {
      this.forced = null;
      this.startVictory();
    } else {
      this.forced = state;
      this.forcedLeft = holdSeconds;
    }
    this.evalT = 0;
  }

  /** Solta o estado forçado por setMusic (a música volta a ser adaptativa). */
  clearMusicOverride() {
    this.forced = null;
    this.evalT = 0;
  }

  /** Vinheta de vitória (chefe derrotado etc.). */
  startVictory() {
    this.victoryLeft = MUSIC.victorySeconds;
    this.hint = null;
    this.combatLinger = 0;
    this.evalT = 0;
  }

  /** Dica de 'music:intensity' (a IA emite combat/boss/victory/explore). */
  onMusicHint(state: MusicState) {
    if (state === 'victory') return this.startVictory();
    if (state === 'explore') {
      this.hint = null;
      this.hintLeft = 0;
    } else {
      this.hint = state;
      this.hintLeft = MUSIC.hintSeconds;
    }
    this.evalT = 0;
  }

  /** Volumes e limites de vozes a partir das configurações. */
  applySettings() {
    const e = this.engine;
    if (!e) return;
    const d = this.ctx.settings.data;
    e.setMasterVolume(sliderToGain(d.masterVolume));
    e.setBusVolume('music', sliderToGain(d.musicVolume));
    e.setBusVolume('sfx', sliderToGain(d.sfxVolume));
    e.setBusVolume('ui', sliderToGain(d.sfxVolume));
    e.setBusVolume('ambient', sliderToGain(d.ambientVolume));
    e.setMaxVoices(VOICE_LIMIT[d.quality] ?? VOICE_LIMIT.medium);
    this.director?.setMaxNotes(MUSIC_NOTE_LIMIT[d.quality] ?? MUSIC_NOTE_LIMIT.medium);
  }

  /** Renderiza um estilo musical offline e mede (testes no navegador). */
  renderMusicOffline(state: Exclude<MusicState, 'silence'>, seconds = 12, intensity = 0.5, seed = 1) {
    return renderMusicOffline(state, seconds, intensity, seed);
  }

  /** Todos os ids de efeito conhecidos (testes/ferramentas). */
  sfxIds(): SfxId[] {
    return Object.keys(SFX_DEFS) as SfxId[];
  }

  /** Posição do ouvinte (câmera). */
  listenerPosition(): Vec3 {
    return this.engine ? this.engine.listener : this.ctx.camera.position;
  }

  lateUpdate(dt: number, ctx: GameContext) {
    const e = this.engine;
    const running = !!e && e.ac.state === 'running';
    // temporizadores da música/ambiência em tempo real do relógio de áudio (o dt
    // do jogo é limitado a 0,1 s por quadro e atrasaria vinhetas em quadros lentos)
    let rdt = dt;
    if (running) {
      const t = e!.ac.currentTime;
      if (this.lastAcT > 0) rdt = Math.min(0.5, Math.max(0, t - this.lastAcT));
      this.lastAcT = t;
    } else this.lastAcT = 0;
    this.updateMusicLogic(rdt, ctx);
    if (!running) return;
    const cam = ctx.camera;
    cam.updateMatrixWorld();
    e!.updateListener(cam.matrixWorld.elements);
    e!.update();
    this.updateMix(ctx);
    this.ambience?.update(rdt);
    this.director?.update(this.music, this.intensity, rdt);
    this.updateHeartbeat(rdt, ctx);
    this.pollGates(rdt, ctx);
  }

  /** Portões do mundo que abrem/fecham (arena do chefe, portões selados): rangido pesado. */
  private pollGates(dt: number, ctx: GameContext) {
    this.gateT -= dt;
    if (this.gateT > 0) return;
    this.gateT = 0.3;
    const gs = (ctx.sys.world as unknown as { gates?: { gates?: Map<string, { open: boolean; parts?: { bx: number; by: number; bz: number }[] }> } }).gates?.gates;
    if (!gs) return;
    const playing = ctx.state === 'playing' || ctx.state === 'cinematic' || ctx.state === 'dialogue';
    for (const [id, g] of gs) {
      const prev = this.gateState.get(id);
      this.gateState.set(id, g.open);
      if (prev === undefined || prev === g.open || !playing) continue;
      const part = g.parts?.[0];
      if (!part) continue;
      const P = this.gatePos;
      P.x = part.bx;
      P.y = part.by;
      P.z = part.bz;
      const D = this.lastDoorPos;
      if (ctx.elapsed - this.lastDoorT < 1.5 && Math.hypot(P.x - D.x, P.z - D.z) < 12) continue;
      this.playEx('gate', { position: P, pitch: g.open ? 1 : 0.9 });
    }
  }

  /** Decide o estado musical (barato; reavaliado a cada 0,25 s ou quando algo muda). */
  private updateMusicLogic(dt: number, ctx: GameContext) {
    if (this.victoryLeft > 0) this.victoryLeft -= dt;
    if (this.hintLeft > 0) {
      this.hintLeft -= dt;
      if (this.hintLeft <= 0) this.hint = null;
    }
    if (this.forced && this.forcedLeft !== Infinity) {
      this.forcedLeft -= dt;
      if (this.forcedLeft <= 0) this.forced = null;
    }
    if (this.combatLinger > 0) this.combatLinger -= dt;
    this.evalT -= dt;
    if (this.evalT > 0) return;
    this.evalT = MUSIC_INTENSITY.evalInterval;

    const i = this.inputs;
    const ai = ctx.sys.ai;
    const inGame = ctx.state !== 'menu' && ctx.state !== 'boot' && ctx.state !== 'loading';
    let boss = false;
    let combat = false;
    let engaged = 0;
    if (inGame && ai) {
      try {
        boss = !!ai.activeBoss?.();
        combat = !!ai.inCombat?.();
        const list = (ai as unknown as { enemies?: Iterable<{ engaged?: boolean; deadT?: number }> }).enemies;
        if (combat && list) for (const en of list) if (en.engaged && (en.deadT ?? -1) < 0) engaged++;
      } catch {
        /* IA ainda não pronta */
      }
    }
    if (combat) this.combatLinger = MUSIC.combatLinger;
    const pl = ctx.sys.player;
    let tavern = false;
    if (inGame && pl) {
      const id = ctx.sys.world?.indoorId?.(pl.position);
      tavern = id === 'taverna';
    }
    i.gameState = ctx.state as GameStateName;
    i.forced = this.forced;
    i.hint = this.hint;
    i.inCombat = combat;
    i.bossActive = boss;
    i.victoryLeft = this.victoryLeft;
    i.combatLinger = this.combatLinger;
    i.locationKind = inGame ? (ctx.sys.world?.currentLocation?.kind ?? null) : null;
    i.tavern = tavern;
    const env = ctx.sys.env;
    i.night = typeof env?.night === 'number' ? env.night : ctx.clock.isNight() ? 1 : 0;
    const next = chooseMusicState(i, this.music);
    this.music = next;

    // intensidade: fase do chefe ou número de inimigos (+ vida baixa)
    let k = 0;
    if (next === 'boss') k = clamp01(this.bossPhase / 3);
    else if (next === 'combat') {
      k = MUSIC_INTENSITY.combatBase + MUSIC_INTENSITY.perEnemy * Math.max(0, engaged - 1);
      const h = pl?.health;
      if (h && h.max > 0 && h.current / h.max < LOW_HEALTH.threshold) k += MUSIC_INTENSITY.lowHealthBonus;
    }
    this.intensity = clamp01(k);
  }

  /** Abafamento (pausa/morte) e nível da ambiência por estado. */
  private updateMix(ctx: GameContext) {
    const st = ctx.state;
    const muffle = st === 'paused' || st === 'dead';
    if (muffle !== this.muffled) {
      this.muffled = muffle;
      this.engine!.setMuffled(muffle);
    }
    const amb = st === 'dead' ? 0.35 : st === 'cinematic' ? 0.7 : st === 'loading' || st === 'boot' ? 0 : 1;
    if (amb !== this.ambMaster && this.ambience) {
      this.ambMaster = amb;
      this.ambience.master = amb;
    }
  }

  /** Batimento cardíaco com vida baixa. */
  private updateHeartbeat(dt: number, ctx: GameContext) {
    if (ctx.state !== 'playing') return;
    const pl = ctx.sys.player;
    const h = pl?.health;
    if (!h || !(h.max > 0) || !pl.entity.alive) return;
    const f = h.current / h.max;
    if (f >= LOW_HEALTH.threshold) {
      this.heartbeatT = 0;
      return;
    }
    this.heartbeatT -= dt;
    if (this.heartbeatT <= 0) {
      // mais rápido quanto menor a vida
      this.heartbeatT = LOW_HEALTH.interval * (0.7 + 0.3 * (f / LOW_HEALTH.threshold));
      this.playEx('heartbeat', EMPTY);
    }
  }

  onStateChange(from: GameStateName, to: GameStateName) {
    if (to === 'menu') {
      this.forced = null;
      this.hint = null;
      this.victoryLeft = 0;
      this.combatLinger = 0;
    }
    if (from === 'dead' && to === 'playing') this.heartbeatT = 0;
    this.evalT = 0;
  }

  onNewGame() {
    this.gateState.clear();
    this.forced = null;
    this.hint = null;
    this.victoryLeft = 0;
    this.combatLinger = 0;
    this.bossPhase = 1;
    this.heartbeatT = 0;
    this.engine?.stopAll();
    this.director?.setDuckBase(1);
    this.evalT = 0;
  }

  /** Esquece estados observados do mundo (portões) — depois de carregar um save. */
  resetWorldTracking() {
    this.gateState.clear();
  }

  /** Estatísticas para depuração/testes automatizados (window.__game.sys.audio.debugStats()). */
  debugStats() {
    const e = this.engine;
    return {
      unlocked: !!e,
      unlocks: this.unlocks,
      failed: this.failed,
      contextState: e?.ac.state ?? 'none',
      sampleRate: e?.ac.sampleRate ?? 0,
      music: this.music,
      musicPlaying: this.director?.state ?? 'silence',
      intensity: +this.intensity.toFixed(2),
      forced: this.forced,
      hint: this.hint,
      victoryLeft: +Math.max(0, this.victoryLeft).toFixed(2),
      combatLinger: +Math.max(0, this.combatLinger).toFixed(2),
      voices: e ? e.activeVoiceCount() : 0,
      voiceSlots: e ? e.slotCount() : 0,
      sfx: e ? { ...e.stats, perId: { ...e.stats.perId } } : null,
      nodesCreated: e?.nodes ?? 0,
      director: this.director?.debug() ?? null,
      ambience: this.ambience?.debug() ?? null,
    };
  }

  dispose() {
    this.hooks?.detach();
    this.gestureOff?.();
    this.ambience?.stopAll();
    this.director?.stopAll(0.05);
    const ac = this.engine?.ac;
    if (ac && ac.state !== 'closed') void ac.close().catch(() => undefined);
    this.engine = null;
    this.ambience = null;
    this.director = null;
  }
}
