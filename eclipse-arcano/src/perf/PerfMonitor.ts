import type { GameContext, GameSystem } from '../core/context';

/**
 * Monitor de desempenho: FPS, tempo de quadro (total e CPU), 1% low,
 * draw calls, triângulos, memória e contagem de entidades.
 * Overlay com F3.
 */
export class PerfMonitor implements GameSystem {
  readonly name = 'perf';
  alwaysUpdate = true;
  private ctx!: GameContext;
  private el: HTMLElement | null = null;
  visible = false;

  /** Janela de amostras de tempo de quadro (ms). */
  private frameTimes: number[] = [];
  private cpuTimes: number[] = [];
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

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.visible = ctx.settings.data.showFps || ctx.params.has('debug');
  }

  beginFrame() {
    this.frameStart = performance.now();
  }

  /** Mede um sistema (chamado pelo Game). */
  measure(name: string, ms: number) {
    const prev = this.systemTimes.get(name) ?? ms;
    this.systemTimes.set(name, prev * 0.95 + ms * 0.05);
  }

  endFrame() {
    const now = performance.now();
    const cpu = now - this.frameStart;
    const frame = this.lastFrameEnd ? now - this.lastFrameEnd : cpu;
    this.lastFrameEnd = now;
    this.cpuTimes.push(cpu);
    this.frameTimes.push(frame);
    if (this.frameTimes.length > 300) {
      this.frameTimes.shift();
      this.cpuTimes.shift();
    }
    const info = this.ctx.renderer.info.render;
    this.drawCalls = info.calls;
    this.triangles = info.triangles;
  }

  private compute() {
    const ft = this.frameTimes;
    if (!ft.length) return;
    const sum = ft.reduce((a, b) => a + b, 0);
    this.avgFrameMs = sum / ft.length;
    this.fps = 1000 / this.avgFrameMs;
    this.avgCpuMs = this.cpuTimes.reduce((a, b) => a + b, 0) / this.cpuTimes.length;
    const sorted = ft.slice().sort((a, b) => b - a);
    const n = Math.max(1, Math.floor(sorted.length * 0.01));
    this.low1Fps = 1000 / (sorted.slice(0, n).reduce((a, b) => a + b, 0) / n);
    this.maxFrameMs = sorted[0];
  }

  memoryMB(): number | null {
    const m = (performance as any).memory;
    return m ? m.usedJSHeapSize / 1048576 : null;
  }

  report() {
    this.compute();
    return {
      fps: +this.fps.toFixed(1),
      avgFrameMs: +this.avgFrameMs.toFixed(2),
      avgCpuMs: +this.avgCpuMs.toFixed(2),
      low1Fps: +this.low1Fps.toFixed(1),
      maxFrameMs: +this.maxFrameMs.toFixed(1),
      drawCalls: this.drawCalls,
      triangles: this.triangles,
      memoryMB: this.memoryMB(),
      geometries: this.ctx.renderer.info.memory.geometries,
      textures: this.ctx.renderer.info.memory.textures,
      entities: { ...this.ctx.entities.stats },
      systems: Object.fromEntries([...this.systemTimes].map(([k, v]) => [k, +v.toFixed(3)])),
    };
  }

  resetSamples() {
    this.frameTimes.length = 0;
    this.cpuTimes.length = 0;
  }

  update(dt: number, ctx: GameContext) {
    if (ctx.input.pressed('perf')) this.visible = !this.visible;
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
      .slice(0, 6)
      .map(([k, v]) => `  ${k.padEnd(12)} ${v.toFixed(2)}ms`)
      .join('\n');
    this.el.textContent =
      `FPS ${r.fps.toFixed(0)}  (1% low ${r.low1Fps.toFixed(0)})\n` +
      `quadro ${r.avgFrameMs.toFixed(1)}ms  cpu ${r.avgCpuMs.toFixed(1)}ms  pico ${r.maxFrameMs.toFixed(0)}ms\n` +
      `draws ${r.drawCalls}  tris ${(r.triangles / 1000).toFixed(0)}k  geo ${r.geometries} tex ${r.textures}\n` +
      `mem ${r.memoryMB ? r.memoryMB.toFixed(0) + 'MB' : 'n/d'}  entidades ${r.entities.total} (t0 ${r.entities.tier0} t1 ${r.entities.tier1} t2 ${r.entities.tier2})\n` +
      `qualidade ${ctx.settings.data.quality}\n${sys}`;
  }
}
