import * as THREE from 'three';
// luz estilizada: altera os trechos de shader antes de qualquer material compilar
import '../env/stylize';
import { InteractiveWorld } from '../interactive/InteractiveWorld';
import { Mounts } from '../mount/Mounts';
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
import { NPCs } from '../npc/NPCs';
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
  /** Próximo quadro descarta o dt acumulado (volta de aba oculta / pausa automática). */
  private resetDt = false;
  /** Transição de jogo em andamento (novo jogo / continuar): ignora pedidos repetidos. */
  private transitioning = false;
  private wasPointerLocked = false;
  /** Sistemas cujo init falhou (o jogo segue sem eles). */
  readonly failedInit: string[] = [];
  /** Diagnóstico de robustez (e2e/testes). */
  readonly robustness = { autoPauses: 0, renderErrors: 0, entityErrors: 0, initErrors: 0, ignoredTransitions: 0, lastAutoPause: '' as '' | 'blur' | 'hidden' | 'pointerlock' | 'context', contextLost: 0 };

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
    // diagnóstico do núcleo (robustez, sistemas com init falho) para testes automatizados
    (window as any).__gameCore = this;
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
      npcs: new NPCs(),
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
      interactive: new InteractiveWorld(),
      mounts: new Mounts(),
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
      sys.npcs,
      sys.interactive,
      sys.mounts,
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
      // a montaria move o cavalo e põe o mago na sela antes da atualização do jogador
      sys.mounts,
      sys.player,
      sys.abilities,
      sys.ai,
      sys.npcs,
      sys.combat,
      sys.interactive,
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
    for (const s of [clock, sys.story, sys.progression, sys.inventory, sys.abilities, sys.world, sys.env, sys.ai, sys.npcs, sys.quests, sys.player, sys.interactive, sys.mounts]) sys.save.register(s);

    for (let i = 0; i < this.all.length; i++) {
      const s = this.all[i];
      ui.showLoading(0.45 + (i / this.all.length) * 0.55, `Carregando ${s.name}…`);
      const ts = performance.now();
      try {
        await s.init?.(ctx);
      } catch (err) {
        // Isola falhas de init: o jogo continua com os outros sistemas (o erro fica no log).
        this.failedInit.push(s.name);
        this.robustness.initErrors++;
        console.error(`[Boot] falha no init de ${s.name}`, err);
      }
      const ms = performance.now() - ts;
      if (ms > 30) console.info(`[Boot] ${s.name} init ${ms.toFixed(0)} ms`);
    }

    window.addEventListener('resize', () => this.applyRenderSettings());
    events.on('settings:changed', () => this.applyRenderSettings());
    this.applyRenderSettings();
    this.installFocusHandlers();
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

  /**
   * Pausa automática ao perder o foco (blur), ao ocultar a aba (visibilitychange) e ao perder o
   * pointer lock sem menu aberto (ex.: Esc do navegador). Ao voltar, o primeiro quadro não carrega
   * o tempo em que a aba ficou parada (sem salto de dt).
   */
  private installFocusHandlers() {
    const ctx = this.ctx;
    window.addEventListener('blur', () => this.autoPause('blur'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.autoPause('hidden');
      this.resetDt = true;
    });
    window.addEventListener('focus', () => (this.resetDt = true));
    document.addEventListener('pointerlockchange', () => {
      const locked = document.pointerLockElement === this.canvas;
      if (this.wasPointerLocked && !locked && this.state === 'playing' && !ctx.sys.ui.isMenuOpen()) this.autoPause('pointerlock');
      this.wasPointerLocked = locked;
    });
    // GPU reiniciada / driver: o three.js restaura o contexto; o jogo pausa e volta sem salto de dt
    this.canvas.addEventListener('webglcontextlost', () => {
      this.robustness.contextLost++;
      console.warn('[Game] contexto WebGL perdido — jogo pausado até a restauração');
      this.autoPause('context');
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      console.info('[Game] contexto WebGL restaurado');
      this.resetDt = true;
      this.applyRenderSettings();
    });
  }

  /** Entra em pausa por perda de foco (só a partir de 'playing'; respeita a configuração). */
  autoPause(reason: 'blur' | 'hidden' | 'pointerlock' | 'context') {
    const ctx = this.ctx;
    // solta teclas presas (o keyup não chega com a janela sem foco)
    ctx.input.releaseAll();
    this.resetDt = true;
    if (this.state !== 'playing' || ctx.settings.data.pauseOnFocusLoss === false) return;
    this.robustness.autoPauses++;
    this.robustness.lastAutoPause = reason;
    this.setState('paused');
  }

  applyRenderSettings() {
    const { renderer, camera, settings, input } = this.ctx;
    // janela minimizada / contêiner sem tamanho: não gera aspecto NaN na câmera
    if (innerWidth <= 0 || innerHeight <= 0) return;
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
    if (this.transitioning) {
      this.robustness.ignoredTransitions++;
      return;
    }
    this.transitioning = true;
    try {
      await sys.ui.fadeOut(0.6);
      if (sys.ui.isMenuOpen()) sys.ui.closeMenu();
      this.resetAll();
      this.setState('playing');
      events.emit('game:newGame', {});
      sys.player.refreshStats();
      this.resetDt = true;
    } finally {
      this.transitioning = false;
    }
    await sys.ui.fadeIn(1.2);
  }

  async continueGame(slot?: string): Promise<boolean> {
    const { sys } = this.ctx;
    if (this.transitioning) {
      this.robustness.ignoredTransitions++;
      return false;
    }
    const target = slot ?? sys.save.latestSlot();
    if (!target) return false;
    // save ilegível (checksum/versão): avisa e NÃO derruba o jogo em andamento
    if (!sys.save.isLoadable(target)) {
      sys.ui.notify('Não há um salvamento válido para carregar.', 'warning');
      return false;
    }
    const inGame = this.state !== 'menu' && this.state !== 'boot';
    // em jogo (F9): guarda o estado atual para voltar a ele se o save for rejeitado
    const before = inGame ? sys.save.serializeAll() : null;
    this.transitioning = true;
    let ok = false;
    try {
      await sys.ui.fadeOut(0.4);
      if (sys.ui.isMenuOpen()) sys.ui.closeMenu();
      this.resetAll();
      ok = sys.save.load(target);
      this.resetDt = true;
      if (ok) this.setState('playing');
    } finally {
      this.transitioning = false;
    }
    if (!ok) {
      sys.ui.notify(`Falha ao carregar: ${sys.save.lastError ?? 'erro desconhecido'}`, 'warning');
      if (inGame && before) {
        // save rejeitado por algum sistema: restaura o jogo de antes do F9 e continua jogando
        sys.save.restoreSnapshot(before);
        this.setState('playing');
      } else {
        this.setState('menu');
        sys.ui.showMainMenu();
      }
      await sys.ui.fadeIn(0.3);
      return false;
    }
    await sys.ui.fadeIn(0.6);
    return true;
  }

  quitToMenu() {
    // durante novo jogo/continuar (fade), sair agora deixaria o menu aberto com o jogo rodando
    if (this.transitioning) {
      this.robustness.ignoredTransitions++;
      return;
    }
    this.ctx.timeScale = 1;
    this.ctx.input.releaseAll();
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
      this.logThrottled(s.name, `[Game] erro em ${s.name}.${fn}`, err);
    }
    this.measure(s.name, performance.now() - t);
  }

  /** Mede o custo de um sistema; o próprio monitor de desempenho não pode derrubar o loop. */
  private measure(name: string, ms: number) {
    try {
      this.ctx.sys.perf.measure(name, ms);
    } catch (err) {
      this.logThrottled('perf', '[Game] erro em perf.measure', err);
    }
  }

  /** Registra o erro no máximo uma vez a cada 5 s por chave (evita inundar o console). */
  private logThrottled(key: string, msg: string, err: unknown) {
    const now = performance.now();
    const last = this.errorThrottle.get(key) ?? -1e9;
    if (now - last > 5000) {
      console.error(msg, err);
      this.errorThrottle.set(key, now);
    }
  }

  private loop = (now: number) => {
    requestAnimationFrame(this.loop);
    const ctx = this.ctx;
    if (this.resetDt) {
      // volta de aba oculta/pausa automática: descarta o tempo parado
      this.resetDt = false;
      this.lastTime = now - 1000 / 60;
      this.accumForLimit = 0;
    }
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
    // clamp: nenhum quadro simula mais que 0,1 s (travadas, depurador, aba em segundo plano)
    realDt = realDt > 0 ? Math.min(realDt, 0.1) : 0;
    this.elapsed += realDt;
    this.frame++;

    const perf = ctx.sys.perf;
    try {
      perf.beginFrame();
    } catch (err) {
      this.logThrottled('perf', '[Game] erro em perf.beginFrame', err);
    }
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
        this.logThrottled('entities', '[Game] erro em entities.update', err);
      }
      this.measure('entities', performance.now() - t);
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
      try {
        ctx.render();
      } catch (err) {
        // pipeline de pós com erro: registra e cai para o render direto (o jogo continua visível)
        this.robustness.renderErrors++;
        this.logThrottled('render', '[Game] erro em render', err);
        try {
          ctx.renderer.render(ctx.scene, ctx.camera);
        } catch {
          /* sem contexto WebGL: nada a fazer neste quadro */
        }
      }
      this.measure('render', performance.now() - t);
    }
    try {
      perf.endFrame();
    } catch (err) {
      this.logThrottled('perf', '[Game] erro em perf.endFrame', err);
    }
    // sempre limpa as bordas de entrada (senão um 'pressed' se repetiria em todo quadro)
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
