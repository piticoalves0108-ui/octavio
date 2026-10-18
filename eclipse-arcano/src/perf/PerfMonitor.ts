import type { GameContext, GameSystem } from '../core/context';
import { SampleRing, nextDynamicScale, summarize, type FrameSummary } from './stats';
import { captureDrawCalls, sceneSummary, type DrawCapture } from './sceneStats';

/** Janela do overlay/relatório (quadros). */
const WINDOW = 300;

/** Dados brutos de uma gravação (benchmark). Arrays pré-alocados; válidos em [0, frames). */
export interface PerfRecording {
  frames: number;
  /** Duração real da gravação (ms). */
  durationMs: number;
  frameMs: Float32Array;
  cpuMs: Float32Array;
  drawCalls: Float32Array;
  triangles: Float32Array;
  /** Tempo de submissão do render (ms) por quadro — a mediana estima o custo de CPU sem as esperas pela GPU. */
  renderMs: Float32Array;
  /** Soma de ms por sistema durante a gravação (divida por `frames` para ms/quadro). */
  systemSums: Map<string, number>;
  /** Maior tempo de cada sistema num único quadro (ms). */
  systemPeaks: Map<string, number>;
}

/**
 * Monitor de desempenho: FPS, tempo de quadro (total e CPU) com p50/p95/p99,
 * 1% low, custo por sistema, draw calls, triângulos, memória e contagem de entidades.
 * Overlay com F3. Opcional: ajuste dinâmico de resolução (desligado por padrão;
 * `?autoscale[=fpsAlvo]` ou `settings.data.dynamicResolution = true`).
 */
export class PerfMonitor implements GameSystem {
  readonly name = 'perf';
  alwaysUpdate = true;
  private ctx!: GameContext;
  private el: HTMLElement | null = null;
  visible = false;

  /** Janela de amostras de tempo de quadro (ms) — buffers circulares sem alocação. */
  private frameRing = new SampleRing(WINDOW);
  private cpuRing = new SampleRing(WINDOW);
  private scratch = new Float32Array(WINDOW);
  private frameStart = 0;
  private lastFrameEnd = 0;
  /** Tempo por sistema (ms, média móvel). */
  systemTimes = new Map<string, number>();
  private refresh = 0;

  fps = 0;
  avgFrameMs = 0;
  avgCpuMs = 0;
  low1Fps = 0;
  maxFrameMs = 0;
  drawCalls = 0;
  triangles = 0;
  /** Percentis do tempo de quadro (ms) na janela atual. */
  p50FrameMs = 0;
  p95FrameMs = 0;
  p99FrameMs = 0;
  p95CpuMs = 0;

  // ---- gravação (benchmark) ----
  private rec: PerfRecording | null = null;
  private recCap = 0;
  private recStart = 0;
  /** Acumulado do quadro atual por sistema (para o pico por quadro). */
  private frameSys = new Map<string, number>();
  private renderMsFrame = 0;
  /** Callback reutilizado (forEach sem alocar iteradores por quadro). */
  private foldPeak = (v: number, k: string) => {
    const r = this.rec;
    if (!r) return;
    if (v > (r.systemPeaks.get(k) ?? 0)) r.systemPeaks.set(k, v);
    this.frameSys.set(k, 0);
  };

  // ---- ajuste dinâmico de resolução ----
  /** Fator atual aplicado sobre o pixel ratio do preset (1 = sem redução). */
  dynamicScale = 1;
  dynamicEnabled = false;
  dynamicTargetFps = 45;
  dynamicMinScale = 0.5;
  private dynAccum = 0;
  private dynFrames = 0;
  private dynTimer = 0;

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.visible = ctx.settings.data.showFps || ctx.params.has('debug');
    const data = ctx.settings.data as unknown as { dynamicResolution?: boolean; dynamicResolutionTarget?: number };
    const p = ctx.params.get('autoscale');
    if (p !== null || data.dynamicResolution === true) {
      const t = Number(p || data.dynamicResolutionTarget || 45);
      this.setDynamicResolution(true, Number.isFinite(t) && t >= 20 ? t : 45);
    }
  }

  beginFrame() {
    this.frameStart = performance.now();
  }

  /** Mede um sistema (chamado pelo Game). */
  measure(name: string, ms: number) {
    const prev = this.systemTimes.get(name) ?? ms;
    this.systemTimes.set(name, prev * 0.95 + ms * 0.05);
    if (this.rec) {
      if (name === 'render') this.renderMsFrame += ms;
      const s = this.rec.systemSums;
      s.set(name, (s.get(name) ?? 0) + ms);
      this.frameSys.set(name, (this.frameSys.get(name) ?? 0) + ms);
    }
  }

  endFrame() {
    const now = performance.now();
    const cpu = now - this.frameStart;
    const frame = this.lastFrameEnd ? now - this.lastFrameEnd : cpu;
    this.lastFrameEnd = now;
    this.cpuRing.push(cpu);
    this.frameRing.push(frame);
    const info = this.ctx.renderer.info.render;
    this.drawCalls = info.calls;
    this.triangles = info.triangles;
    const r = this.rec;
    if (r && r.frames < this.recCap) {
      const i = r.frames++;
      r.frameMs[i] = frame;
      r.cpuMs[i] = cpu;
      r.drawCalls[i] = info.calls;
      r.triangles[i] = info.triangles;
      r.renderMs[i] = this.renderMsFrame;
      this.renderMsFrame = 0;
      this.frameSys.forEach(this.foldPeak);
    }
    if (this.dynamicEnabled) {
      this.dynAccum += frame;
      this.dynFrames++;
    }
  }

  private compute() {
    const n = this.frameRing.count;
    if (!n) return;
    const s: FrameSummary = summarize(this.frameRing.data, n, this.scratch);
    this.avgFrameMs = s.mean;
    this.fps = 1000 / Math.max(1e-3, s.mean);
    this.low1Fps = 1000 / Math.max(1e-3, s.worst1);
    this.maxFrameMs = s.max;
    this.p50FrameMs = s.p50;
    this.p95FrameMs = s.p95;
    this.p99FrameMs = s.p99;
    const c = summarize(this.cpuRing.data, this.cpuRing.count, this.scratch);
    this.avgCpuMs = c.mean;
    this.p95CpuMs = c.p95;
  }

  memoryMB(): number | null {
    const m = (performance as any).memory;
    return m ? m.usedJSHeapSize / 1048576 : null;
  }

  report() {
    this.compute();
    const info = this.ctx.renderer.info;
    return {
      fps: +this.fps.toFixed(1),
      avgFrameMs: +this.avgFrameMs.toFixed(2),
      avgCpuMs: +this.avgCpuMs.toFixed(2),
      low1Fps: +this.low1Fps.toFixed(1),
      maxFrameMs: +this.maxFrameMs.toFixed(1),
      p50FrameMs: +this.p50FrameMs.toFixed(2),
      p95FrameMs: +this.p95FrameMs.toFixed(2),
      p99FrameMs: +this.p99FrameMs.toFixed(2),
      p95CpuMs: +this.p95CpuMs.toFixed(2),
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      memoryMB: this.memoryMB(),
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      dynamicScale: this.dynamicScale,
      entities: { ...this.ctx.entities.stats },
      systems: Object.fromEntries([...this.systemTimes].map(([k, v]) => [k, +v.toFixed(3)])),
    };
  }

  resetSamples() {
    this.frameRing.clear();
    this.cpuRing.clear();
  }

  // ======================================================================
  // Gravação para benchmarks
  // ======================================================================
  /** Começa a gravar até `maxFrames` quadros (buffers alocados aqui, uma vez). */
  startRecording(maxFrames = 20000) {
    this.recCap = Math.max(1, Math.floor(maxFrames));
    this.rec = {
      frames: 0,
      durationMs: 0,
      frameMs: new Float32Array(this.recCap),
      cpuMs: new Float32Array(this.recCap),
      drawCalls: new Float32Array(this.recCap),
      triangles: new Float32Array(this.recCap),
      renderMs: new Float32Array(this.recCap),
      systemSums: new Map(),
      systemPeaks: new Map(),
    };
    this.frameSys.clear();
    this.renderMsFrame = 0;
    this.recStart = performance.now();
  }

  /** Encerra a gravação e devolve os dados (null se não estava gravando). */
  stopRecording(): PerfRecording | null {
    const r = this.rec;
    this.rec = null;
    if (r) r.durationMs = performance.now() - this.recStart;
    return r;
  }

  get recording(): boolean {
    return this.rec !== null;
  }

  /** Diagnóstico: draw calls dos próximos `frames` quadros agrupadas por dono (inclui a passada de sombra). */
  captureDrawCalls(frames = 1): Promise<DrawCapture> {
    return captureDrawCalls(this.ctx, frames);
  }

  /** Diagnóstico: contagem de malhas visíveis, projetores de sombra, instâncias e luzes. */
  sceneSummary() {
    return sceneSummary(this.ctx);
  }

  // ======================================================================
  // Ajuste dinâmico de resolução
  // ======================================================================
  /** Liga/desliga o renderScale adaptativo. Ao desligar, volta ao pixel ratio do preset. */
  setDynamicResolution(enabled: boolean, targetFps = this.dynamicTargetFps) {
    this.dynamicEnabled = enabled;
    this.dynamicTargetFps = targetFps;
    this.dynAccum = 0;
    this.dynFrames = 0;
    if (!enabled && this.dynamicScale !== 1) {
      this.dynamicScale = 1;
      this.applyPixelRatio();
    }
  }

  private basePixelRatio(): number {
    const q = this.ctx.settings.q;
    return Math.min(window.devicePixelRatio || 1, q.maxPixelRatio) * q.renderScale;
  }

  private applyPixelRatio() {
    const want = this.basePixelRatio() * this.dynamicScale;
    if (Math.abs(this.ctx.renderer.getPixelRatio() - want) > 1e-3) this.ctx.renderer.setPixelRatio(want);
  }

  private updateDynamic(dt: number, ctx: GameContext) {
    this.dynTimer += dt;
    if (this.dynTimer < 1) return;
    this.dynTimer = 0;
    const frames = this.dynFrames;
    const avg = frames ? this.dynAccum / frames : 0;
    this.dynAccum = 0;
    this.dynFrames = 0;
    // fora do jogo (menu/pausa) não ajusta; só reaplica se o Game redefiniu o pixel ratio
    if (ctx.state === 'playing' && frames >= 5) {
      this.dynamicScale = nextDynamicScale(this.dynamicScale, avg, this.dynamicTargetFps, this.dynamicMinScale);
    }
    this.applyPixelRatio();
  }

  // ======================================================================
  // Overlay
  // ======================================================================
  update(dt: number, ctx: GameContext) {
    if (ctx.input.pressed('perf')) this.visible = !this.visible;
    if (this.dynamicEnabled) this.updateDynamic(dt, ctx);
    this.refresh -= dt;
    if (this.refresh > 0) return;
    this.refresh = 0.5;
    if (!this.visible) {
      if (this.el) this.el.style.display = 'none';
      return;
    }
    if (!this.el) {
      this.el = document.createElement('pre');
      this.el.style.cssText =
        'position:fixed;top:6px;left:6px;margin:0;padding:6px 8px;font:11px/1.35 monospace;color:#b8ffcf;background:rgba(0,0,0,.55);pointer-events:none;z-index:50;white-space:pre';
      document.body.appendChild(this.el);
    }
    this.el.style.display = 'block';
    const r = this.report();
    const sys = Object.entries(r.systems)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([k, v]) => `  ${k.padEnd(13)} ${v.toFixed(2)}ms`)
      .join('\n');
    const dyn = this.dynamicEnabled ? `  resol. dinâmica ${(this.dynamicScale * 100).toFixed(0)}% (alvo ${this.dynamicTargetFps} FPS)` : '';
    this.el.textContent =
      `FPS ${r.fps.toFixed(0)}  (1% low ${r.low1Fps.toFixed(0)})\n` +
      `quadro ${r.avgFrameMs.toFixed(1)}ms  p50 ${r.p50FrameMs.toFixed(1)}  p95 ${r.p95FrameMs.toFixed(1)}  p99 ${r.p99FrameMs.toFixed(1)}  pico ${r.maxFrameMs.toFixed(0)}ms\n` +
      `cpu ${r.avgCpuMs.toFixed(1)}ms  (p95 ${r.p95CpuMs.toFixed(1)}ms)\n` +
      `draws ${r.drawCalls}  tris ${(r.triangles / 1000).toFixed(0)}k  geo ${r.geometries} tex ${r.textures} prog ${r.programs}\n` +
      `mem ${r.memoryMB ? r.memoryMB.toFixed(0) + 'MB' : 'n/d'}  entidades ${r.entities.total} (t0 ${r.entities.tier0} t1 ${r.entities.tier1} t2 ${r.entities.tier2} t3 ${r.entities.tier3})\n` +
      `qualidade ${ctx.settings.data.quality}${dyn}\n` +
      `sistemas (ms/quadro, média móvel):\n${sys}`;
  }
}
