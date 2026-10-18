import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import { CINEMATICS, type CineStep, type CineVec } from '../../data/quests';
import type { NarrativeBridge } from './bridge';

const V1 = new THREE.Vector3();
const V2 = new THREE.Vector3();
const OFF = new THREE.Vector3();

/**
 * Cinemáticas leves: sequência de passos (fade, legenda, cartão de título, plano de
 * câmera fixo, espera, efeitos). Põe o jogo em 'cinematic' (entrada desligada; o
 * mundo continua), aceita pular com [E]/[Esc] e enfileira pedidos simultâneos.
 */
export class CinematicPlayer {
  private queue: string[] = [];
  private steps: CineStep[] | null = null;
  current: string | null = null;
  private idx = 0;
  private waitT = 0;
  private usedShot = false;
  private faded = false;
  private skipGrace = 0;
  /** Cinemáticas já vistas (para o diário/testes). */
  readonly seen = new Set<string>();
  /** Estatísticas (testes). */
  stats = { played: 0, skipped: 0 };

  constructor(
    private ctx: GameContext,
    private bridge: NarrativeBridge,
  ) {}

  get playing() {
    return this.current !== null;
  }

  /**
   * Cinemáticas ligadas? Em automação (navegador controlado por WebDriver/Playwright),
   * benchmarks e com `?nointro` elas são resolvidas na hora (efeitos aplicados, sem
   * travar a entrada) — `?cinematics` força as cinemáticas mesmo em automação.
   */
  get enabled(): boolean {
    const p = this.ctx.params;
    if (p.has('cinematics')) return true;
    if (p.has('nointro') || p.has('bench')) return false;
    const auto = typeof navigator !== 'undefined' && (navigator as Navigator & { webdriver?: boolean }).webdriver === true;
    return !auto;
  }

  play(id: string): boolean {
    if (!CINEMATICS[id]) return false;
    if (!this.enabled) {
      // resolvida na hora: só os efeitos
      for (const s of CINEMATICS[id]) if ('effects' in s) this.bridge.applyAll(s.effects);
      this.seen.add(id);
      this.stats.skipped++;
      this.ctx.events.emit('cinematic:start', { id });
      this.ctx.events.emit('cinematic:end', { id, skipped: true });
      return true;
    }
    if (this.current) {
      if (this.current !== id && !this.queue.includes(id)) this.queue.push(id);
      return true;
    }
    this.begin(id);
    return true;
  }

  private begin(id: string) {
    const ctx = this.ctx;
    this.current = id;
    this.steps = CINEMATICS[id];
    this.idx = 0;
    this.waitT = 0;
    this.usedShot = false;
    this.faded = false;
    this.skipGrace = 0.4;
    this.stats.played++;
    this.seen.add(id);
    if (ctx.state === 'playing' || ctx.state === 'dialogue') ctx.setState('cinematic');
    ctx.events.emit('cinematic:start', { id });
    this.next();
  }

  /** Executa passos até encontrar um que espera. */
  private next() {
    while (this.steps && this.idx < this.steps.length && this.waitT <= 0) {
      const s = this.steps[this.idx++];
      this.waitT = this.exec(s);
    }
    if (this.steps && this.idx >= this.steps.length && this.waitT <= 0) this.finish(false);
  }

  private exec(s: CineStep): number {
    const ui = this.ctx.sys.ui;
    if ('fade' in s) {
      const d = s.duration ?? 0.8;
      if (s.fade === 'out') {
        this.faded = true;
        void ui.fadeOut(d);
      } else {
        this.faded = false;
        void ui.fadeIn(d);
      }
      return d;
    }
    if ('title' in s) {
      const d = s.duration ?? 3;
      this.title(s.title, s.subtitle, d);
      return d;
    }
    if ('subtitle' in s) {
      const d = s.duration ?? 4;
      ui.showSubtitle(s.subtitle, d);
      return d;
    }
    if ('shot' in s) {
      if (this.resolve(s.shot.from, s.shot.fromOffset, V1) && this.resolve(s.shot.look, s.shot.lookOffset, V2)) {
        this.ctx.sys.camera.setCinematicShot(V1, V2);
        this.usedShot = true;
      }
      return s.duration ?? 0;
    }
    if ('wait' in s) return s.wait;
    if ('effects' in s) {
      this.bridge.applyAll(s.effects);
      return 0;
    }
    return 0;
  }

  /** Cartão de título (UI dedicada, se existir; senão, legenda). */
  title(title: string, subtitle: string | undefined, duration: number) {
    const ui = this.ctx.sys.ui as unknown as { showTitleCard?: (t: string, s: string | undefined, d: number) => void };
    this.ctx.events.emit('cinematic:title', { title, subtitle, duration });
    if (typeof ui.showTitleCard === 'function') ui.showTitleCard(title, subtitle, duration);
    else this.ctx.sys.ui.showSubtitle(subtitle ? `${title} — ${subtitle}` : title, duration);
  }

  private resolve(v: CineVec, off: [number, number, number] | undefined, out: THREE.Vector3): boolean {
    if (typeof v === 'string') {
      if (!this.ctx.sys.world.placePosition(v, out)) return false;
    } else {
      out.set(v[0], v[1], v[2]);
      if (v[1] === 0) out.y = this.ctx.heightfield.heightAt(v[0], v[2]);
    }
    if (off) out.add(OFF.set(off[0], off[1], off[2]));
    return true;
  }

  update(dt: number) {
    if (!this.current) return;
    const input = this.ctx.input;
    this.skipGrace -= dt;
    if (this.skipGrace <= 0 && (input.pressed('interact') || input.pressed('pause'))) {
      this.skip();
      return;
    }
    this.waitT -= dt;
    if (this.waitT <= 0) this.next();
  }

  /** Pula o resto: aplica efeitos pendentes e restaura câmera/tela. */
  skip() {
    if (!this.steps) return;
    for (; this.idx < this.steps.length; this.idx++) {
      const s = this.steps[this.idx];
      if ('effects' in s) this.bridge.applyAll(s.effects);
    }
    this.stats.skipped++;
    this.ctx.sys.ui.showSubtitle('', 0.01);
    this.finish(true);
  }

  private finish(skipped: boolean) {
    const ctx = this.ctx;
    const id = this.current!;
    this.current = null;
    this.steps = null;
    this.waitT = 0;
    if (this.faded) void ctx.sys.ui.fadeIn(0.6);
    this.faded = false;
    if (this.usedShot) ctx.sys.camera.setMode('explore');
    ctx.events.emit('cinematic:end', { id, skipped });
    const nxt = this.queue.shift();
    if (nxt) {
      this.begin(nxt);
      return;
    }
    if (ctx.state === 'cinematic') ctx.setState('playing');
  }

  /** Interrompe tudo (novo jogo/carregar). */
  reset() {
    this.queue.length = 0;
    if (this.current) {
      this.current = null;
      this.steps = null;
      if (this.usedShot) this.ctx.sys.camera?.setMode('explore');
      if (this.ctx.state === 'cinematic') this.ctx.setState('playing');
    }
  }
}
