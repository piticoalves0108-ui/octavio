import * as THREE from 'three';
import type { GameContext, GameSystem, Systems } from './context';
import { EventBus, type GameStateName } from './EventBus';
import { Input } from './Input';
import { EntityManager } from './EntityManager';
import { WorldClock } from './WorldClock';
import { Settings } from './Settings';
import { InteractionSystem } from './Interaction';
import { Heightfield } from '../world/heightfield';
import { CollisionWorld } from '../world/Collision';
import { World } from '../world/World';
import { Environment } from '../env/Environment';
import { Player } from '../player/Player';
import { CameraRig } from '../player/CameraRig';
import { Combat } from '../combat/Combat';
import { Abilities } from '../combat/Abilities';
import { VFX } from '../combat/VFX';
import { AI } from '../ai/AI';
import { Inventory } from '../rpg/Inventory';
import { Progression } from '../rpg/Progression';
import { Quests } from '../rpg/Quests';
import { Dialogue } from '../rpg/Dialogue';
import { Story } from '../rpg/Story';
import { UI } from '../ui/UI';
import { AudioSystem } from '../audio/Audio';
import { SaveSystem } from '../save/SaveSystem';
import { PerfMonitor } from '../perf/PerfMonitor';
import { LOCATION_BY_ID } from '../data/world';

/** Estados em que a simulação do mundo avança. */
const SIM_STATES: GameStateName[] = ['playing', 'dialogue', 'cinematic', 'dead'];

/**
 * Orquestrador: cria renderer/cena/câmera, instancia os sistemas, roda o loop
 * (com ordem fixa de atualização, isolamento de erros por sistema e limite de FPS)
 * e controla a máquina de estados do jogo.
 */
export class Game {
  ctx!: GameContext;
  private updateOrder: GameSystem[] = [];
  private lateOrder: GameSystem[] = [];
  private all: GameSystem[] = [];
  private state: GameStateName = 'boot';
  private lastTime = 0;
  private accumForLimit = 0;
  private elapsed = 0;
  private frame = 0;
  private errorThrottle = new Map<string, number>();
  private menuOrbit = 0;

  constructor(private canvas: HTMLCanvasElement, private uiRoot: HTMLElement) {}

  async boot() {
    const params = new URLSearchParams(location.search);
    const events = new EventBus();
    const settings = new Settings(events);
    const q = settings.q;

    const renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: q.antialias, powerPreference: 'high-performance', stencil: false });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = q.shadowMapSize > 0;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.info.autoReset = true;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(settings.data.fov, innerWidth / innerHeight, 0.1, q.viewDistance + 400);
    const input = new Input(this.canvas);
    input.sensitivity = settings.data.mouseSensitivity;
    input.invertY = settings.data.invertY;
    for (const [a, codes] of Object.entries(settings.data.bindings)) if (codes) input.setBinding(a as any, codes);

    const clock = new WorldClock();
    const heightfield = new Heightfield();

    // UI primeiro, para mostrar o carregamento.
    const ui = new UI();
    const self = this;
    const ctx: GameContext = {
      renderer,
      scene,
      camera,
      canvas: this.canvas,
      uiRoot: this.uiRoot,
      events,
      input,
      entities: null as unknown as EntityManager,
      clock,
      settings,
      heightfield,
      physics: null as unknown as CollisionWorld,
      sys: {} as Systems,
      get state() {
        return self.state;
      },
      setState: (s) => this.setState(s),
      get elapsed() {
        return self.elapsed;
      },
      get frame() {
        return self.frame;
      },
      timeScale: 1,
      render: () => renderer.render(scene, camera),
      params,
      newGame: () => this.newGame(),
      continueGame: (slot) => this.continueGame(slot),
      quitToMenu: () => this.quitToMenu(),
    };
    this.ctx = ctx;
    (window as any).__game = ctx;
    ctx.entities = new EntityManager(ctx);
    (ctx as any).uiRootReady = true;
    ui.showLoading(0, 'Despertando o mundo…');

    const t0 = performance.now();
    await heightfield.generateAsync((f) => ui.showLoading(f * 0.45, 'Moldando o relevo…'));
    console.info(`[Boot] heightfield em ${(performance.now() - t0).toFixed(0)} ms`);
    ctx.physics = new CollisionWorld(heightfield);

    const sys: Systems = {
      world: new World(),
      env: new Environment(),
      player: new Player(),
      camera: new CameraRig(),
      combat: new Combat(),
      abilities: new Abilities(),
      vfx: new VFX(),
      ai: new AI(),
      inventory: new Inventory(),
      progression: new Progression(),
      quests: new Quests(),
      dialogue: new Dialogue(),
      story: new Story(),
      interaction: new InteractionSystem(),
      ui,
      audio: new AudioSystem(),
      save: new SaveSystem(),
      perf: new PerfMonitor(),
    };
    ctx.sys = sys;

    // Ordem de init: UI → save → dados/estado → mundo → ator → resto.
    this.all = [
      sys.ui,
      sys.save,
      sys.perf,
      clock,
      sys.story,
      sys.progression,
      sys.inventory,
      sys.env,
      sys.world,
      sys.vfx,
      sys.combat,
      sys.player,
      sys.camera,
      sys.abilities,
      sys.ai,
      sys.quests,
      sys.dialogue,
      sys.interaction,
      sys.audio,
    ];
    // Ordem de update (simulação).
    this.updateOrder = [
      clock,
      sys.env,
      sys.world,
      sys.player,
      sys.abilities,
      sys.ai,
      sys.combat,
      sys.vfx,
      sys.interaction,
      sys.quests,
      sys.dialogue,
      sys.progression,
      sys.inventory,
      sys.story,
      sys.save,
    ];
    this.lateOrder = [sys.camera, sys.ui, sys.audio, sys.perf];

    // Registro de saves (ordem importa: progressão/inventário antes do jogador).
    for (const s of [clock, sys.story, sys.progression, sys.inventory, sys.abilities, sys.world, sys.env, sys.ai, sys.quests, sys.player]) sys.save.register(s);

    for (let i = 0; i < this.all.length; i++) {
      const s = this.all[i];
      ui.showLoading(0.45 + (i / this.all.length) * 0.55, `Carregando ${s.name}…`);
      const ts = performance.now();
      await s.init?.(ctx);
      const ms = performance.now() - ts;
      if (ms > 30) console.info(`[Boot] ${s.name} init ${ms.toFixed(0)} ms`);
    }

    window.addEventListener('resize', () => this.applyRenderSettings());
    events.on('settings:changed', () => this.applyRenderSettings());
    this.applyRenderSettings();
    // Destrava áudio no primeiro gesto do usuário.
    const unlock = () => {
      sys.audio.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);

    ui.hideLoading();
    console.info(`[Boot] pronto em ${(performance.now() - t0).toFixed(0)} ms`);
    this.setState('menu');
    ui.showMainMenu();

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);

    const bench = params.get('bench');
    if (bench) {
      const m = await import('../perf/Benchmark');
      void m.runBenchmark(ctx, bench);
    } else if (params.has('autostart')) {
      void this.newGame();
    }
  }

  applyRenderSettings() {
    const { renderer, camera, settings, input } = this.ctx;
    const q = settings.q;
    const pr = Math.min(window.devicePixelRatio || 1, q.maxPixelRatio) * q.renderScale;
    renderer.setPixelRatio(pr);
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.fov = settings.data.fov;
    camera.far = q.viewDistance + 400;
    camera.updateProjectionMatrix();
    renderer.shadowMap.enabled = q.shadowMapSize > 0;
    input.sensitivity = settings.data.mouseSensitivity;
    input.invertY = settings.data.invertY;
    this.ctx.entities.tiers.far = Math.min(q.viewDistance * 0.5, 400);
  }

  setState(to: GameStateName) {
    const from = this.state;
    if (from === to) return;
    this.state = to;
    const ctx = this.ctx;
    ctx.input.gameplayEnabled = to === 'playing';
    if (to !== 'playing') ctx.input.exitPointerLock();
    for (const s of this.all) {
      try {
        s.onStateChange?.(from, to, ctx);
      } catch (err) {
        console.error(`[Game] onStateChange de ${s.name}`, err);
      }
    }
    ctx.events.emit('game:state', { from, to });
  }

  private resetAll() {
    const ctx = this.ctx;
    ctx.timeScale = 1;
    // remove entidades não persistentes (inimigos, projéteis, itens soltos)
    ctx.entities.clear((e) => e.persistent);
    for (const s of this.all) {
      try {
        s.onNewGame?.(ctx);
      } catch (err) {
        console.error(`[Game] onNewGame de ${s.name}`, err);
      }
    }
  }

  async newGame() {
    const { sys, events } = this.ctx;
    await sys.ui.fadeOut(0.6);
    this.resetAll();
    this.setState('playing');
    events.emit('game:newGame', {});
    sys.player.refreshStats();
    await sys.ui.fadeIn(1.2);
  }

  async continueGame(slot?: string): Promise<boolean> {
    const { sys } = this.ctx;
    const target = slot ?? sys.save.latestSlot();
    if (!target) return false;
    await sys.ui.fadeOut(0.4);
    this.resetAll();
    const ok = sys.save.load(target);
    if (!ok) {
      sys.ui.notify(`Falha ao carregar: ${sys.save.lastError ?? 'erro desconhecido'}`, 'warning');
      this.setState('menu');
      sys.ui.showMainMenu();
      await sys.ui.fadeIn(0.3);
      return false;
    }
    this.setState('playing');
    await sys.ui.fadeIn(0.6);
    return true;
  }

  quitToMenu() {
    this.setState('menu');
    this.ctx.sys.ui.showMainMenu();
  }

  private runSystem(s: GameSystem, fn: 'update' | 'lateUpdate', dt: number) {
    const f = s[fn];
    if (!f) return;
    const t = performance.now();
    try {
      f.call(s, dt, this.ctx);
    } catch (err) {
      // Isola falhas: um sistema com erro não derruba o jogo inteiro.
      const now = performance.now();
      const last = this.errorThrottle.get(s.name) ?? -1e9;
      if (now - last > 5000) {
        console.error(`[Game] erro em ${s.name}.${fn}`, err);
        this.errorThrottle.set(s.name, now);
      }
    }
    this.ctx.sys.perf.measure(s.name, performance.now() - t);
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const ctx = this.ctx;
    let realDt = (now - this.lastTime) / 1000;
    const limit = ctx.settings.data.fpsLimit;
    if (limit > 0) {
      this.accumForLimit += realDt;
      this.lastTime = now;
      if (this.accumForLimit < 1 / limit - 0.002) return;
      realDt = this.accumForLimit;
      this.accumForLimit = 0;
    } else {
      this.lastTime = now;
    }
    realDt = Math.min(realDt, 0.1);
    this.elapsed += realDt;
    this.frame++;

    const perf = ctx.sys.perf;
    perf.beginFrame();
    const sim = SIM_STATES.includes(this.state);
    const dt = realDt * ctx.timeScale;

    for (const s of this.updateOrder) {
      if (sim || s.alwaysUpdate) this.runSystem(s, 'update', s.alwaysUpdate && !sim ? realDt : dt);
    }
    if (sim) {
      const t = performance.now();
      try {
        ctx.entities.update(dt);
      } catch (err) {
        console.error('[Game] erro em entities.update', err);
      }
      perf.measure('entities', performance.now() - t);
    } else if (this.state === 'menu') {
      this.updateMenuCamera(realDt);
    }
    for (const s of this.lateOrder) {
      if (sim || s.alwaysUpdate) this.runSystem(s, 'lateUpdate', realDt);
      // UI/áudio/perf também têm update "sempre"
      if (s.alwaysUpdate && s.update) this.runSystem(s, 'update', realDt);
    }

    if (this.state !== 'boot' && this.state !== 'loading') {
      const t = performance.now();
      ctx.render();
      perf.measure('render', performance.now() - t);
    }
    perf.endFrame();
    ctx.input.endFrame();
  };

  /** Câmera do menu principal: sobrevoo lento da vila. */
  private updateMenuCamera(dt: number) {
    const v = LOCATION_BY_ID['vila_brumafria'];
    this.menuOrbit += dt * 0.03;
    const r = 190;
    const cam = this.ctx.camera;
    const x = v.x + Math.sin(this.menuOrbit) * r;
    const z = v.z + Math.cos(this.menuOrbit) * r;
    cam.position.set(x, Math.max(this.ctx.heightfield.heightAt(x, z) + 45, 60), z);
    cam.lookAt(v.x, 20, v.z);
    this.ctx.entities.focus.set(v.x, 0, v.z);
  }
}
