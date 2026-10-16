import * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import { GpuParticles } from './vfx/particles';
import { SegmentRenderer, SegStyle, type SustainedSegment } from './vfx/segments';
import { RingRenderer, RingStyle } from './vfx/rings';
import { LightPool, type LightHandle } from './vfx/lights';
import { Telegraphs } from './vfx/telegraphs';
import { TrailRenderer, type TrailHandle, type TrailPointSource } from './vfx/trails';
import { DissolveManager } from './vfx/dissolve';
import { DynamicSprites } from './vfx/sprites';
import { PShape } from './vfx/particles';
import { emitPreset, type PresetTargets } from './vfx/presets';
import { lightningPoints, mulberry32 } from './combatMath';

export type VfxKind =
  | 'arcaneBurst'
  | 'arcaneSpark'
  | 'lightning'
  | 'fire'
  | 'smoke'
  | 'dust'
  | 'impact'
  | 'metalSpark'
  | 'heal'
  | 'levelUp'
  | 'teleport'
  | 'shockwave'
  | 'crystalShatter'
  | 'void'
  | 'time'
  | 'splash'
  | 'leaves'
  | 'pickupGlow'
  | 'corruption'
  | 'blockSpark'
  | 'deathDissolve';

export interface BurstOptions {
  count?: number;
  color?: number;
  scale?: number;
  direction?: THREE.Vector3;
  speed?: number;
  lifetime?: number;
}

export interface TelegraphShape {
  type: 'circle' | 'cone' | 'line' | 'ring';
  position: THREE.Vector3;
  radius?: number;
  innerRadius?: number;
  /** Abertura do cone (graus). */
  angle?: number;
  yaw?: number;
  length?: number;
  width?: number;
  /** Duração até o golpe (s) — o preenchimento anima até o momento do impacto. */
  duration: number;
  color?: number;
}

export interface VfxHandle {
  cancel(): void;
}

export type { SustainedSegment, LightHandle, TrailHandle, TrailPointSource };

/** Estilo de um feixe sustentado. */
export type BeamStyle = 'beam' | 'lightning' | 'chain';

const STYLE_ID: Record<BeamStyle, SegStyle> = { beam: SegStyle.Beam, lightning: SegStyle.Lightning, chain: SegStyle.Chain };

/**
 * Efeitos visuais do jogo:
 * - partículas na GPU (2 pools: aditivo e fumaça), limitadas por `q.maxParticles`;
 * - luzes pontuais temporárias em pool (`q.maxDynamicLights`);
 * - anéis/ondas de choque/círculos rúnicos e cascas esféricas;
 * - feixes, correntes e raios (segmentos irregulares com ramificações e cintilação);
 * - telegraphs de ataques no chão (círculo, cone, linha, anel) que seguem o terreno;
 * - rastros (fitas) para projéteis e armas;
 * - dissolução de modelos na morte.
 * Todos os efeitos usam o relógio do jogo (respeitam pausa, hit-stop e câmera lenta).
 */
export class VFX implements GameSystem {
  readonly name = 'vfx';
  protected ctx!: GameContext;
  /** Relógio dos shaders de efeito (s de jogo). */
  readonly uTime = { value: 0 };
  private add!: GpuParticles;
  private smokePool!: GpuParticles;
  private segments!: SegmentRenderer;
  private rings!: RingRenderer;
  private lights!: LightPool;
  private telegraphs!: Telegraphs;
  private trails!: TrailRenderer;
  private dissolves = new DissolveManager();
  private sprites!: DynamicSprites;
  private targets!: PresetTargets;
  private root = new THREE.Group();
  private rng = mulberry32(1234);
  private pts: number[] = [];
  private bpts: number[] = [];
  private tA = new THREE.Vector3();
  private tB = new THREE.Vector3();
  private tC = new THREE.Vector3();
  private tmpColor = new THREE.Color();
  /** Contadores para diagnóstico. */
  readonly counters = { bursts: 0, lightning: 0, beams: 0, telegraphsCreated: 0, rings: 0 };

  init(ctx: GameContext) {
    this.ctx = ctx;
    const q = ctx.settings.q;
    this.root.name = 'vfx';
    ctx.scene.add(this.root);
    const maxP = Math.max(200, q.maxParticles);
    this.add = new GpuParticles(Math.floor(maxP * 0.72), true, this.uTime);
    this.smokePool = new GpuParticles(Math.floor(maxP * 0.28), false, this.uTime);
    this.segments = new SegmentRenderer(maxP >= 3000 ? 768 : maxP >= 1500 ? 512 : 320, 10, this.uTime);
    this.rings = new RingRenderer(maxP >= 1500 ? 64 : 40, 24, this.uTime);
    this.lights = new LightPool(Math.max(0, q.maxDynamicLights), this.root);
    this.telegraphs = new Telegraphs(14, this.uTime);
    this.trails = new TrailRenderer(maxP >= 1500 ? 40 : 24);
    this.sprites = new DynamicSprites(192, this.uTime);
    this.root.add(this.smokePool.mesh, this.add.mesh, this.segments.mesh, this.rings.rings, this.rings.shells, this.telegraphs.group, this.trails.mesh, this.sprites.mesh);
    this.targets = { add: this.add, smoke: this.smokePool, rings: this.rings, lights: this.lights, countMul: Math.max(0.4, Math.min(1.6, maxP / 1500)) };
    ctx.events.on('settings:changed', () => this.applyQuality());
  }

  /**
   * Troca de qualidade em tempo real: reduz (ou restaura, até o alocado no início) o limite de
   * partículas e a densidade dos presets. Luzes e demais pools mantêm o tamanho do início
   * (mudar o número de luzes recompilaria todos os shaders da cena).
   */
  applyQuality() {
    if (!this.targets) return;
    const maxP = Math.max(200, this.ctx.settings.q.maxParticles);
    this.add.setLimit(maxP * 0.72);
    this.smokePool.setLimit(maxP * 0.28);
    this.targets.countMul = Math.max(0.4, Math.min(1.6, maxP / 1500));
  }

  update(dt: number, ctx: GameContext) {
    if (dt <= 0) return;
    this.uTime.value += dt;
    this.lights.update(dt);
    this.telegraphs.update(dt);
    this.trails.update(dt, ctx.camera);
    this.dissolves.update(dt);
    this.add.flush();
    this.smokePool.flush();
    this.segments.flush();
    this.rings.flush();
    this.sprites.flush();
  }

  onNewGame() {
    this.clear();
  }

  // =====================================================================
  // API básica (contrato)
  // =====================================================================
  /** Explosão de partículas de um tipo (com anéis/luz conforme o tipo). */
  burst(kind: VfxKind, position: THREE.Vector3, opts?: BurstOptions): void {
    if (!this.targets || !isFinite(position.x + position.y + position.z)) return;
    this.counters.bursts++;
    emitPreset(this.targets, kind, position, opts);
  }

  /** Onda de choque no chão (anel que expande até `radius`). */
  ring(position: THREE.Vector3, radius: number, color: number, duration: number): void {
    if (!this.rings) return;
    this.counters.rings++;
    this.rings.ring(position.x, position.y + 0.08, position.z, Math.min(0.3, radius * 0.1), radius, duration, color, 1, RingStyle.Shock, 0.16);
  }

  /** Feixe reto temporário (lasers, Lança de Energia). */
  beam(from: THREE.Vector3, to: THREE.Vector3, color: number, width: number, duration: number): void {
    if (!this.segments) return;
    this.counters.beams++;
    this.segments.add(from.x, from.y, from.z, to.x, to.y, to.z, color, width, duration, SegStyle.Beam);
    // núcleo mais fino e brilhante + halo largo
    this.segments.add(from.x, from.y, from.z, to.x, to.y, to.z, 0xffffff, width * 0.35, duration * 0.8, SegStyle.Beam, Math.random(), 0.8);
    this.segments.add(from.x, from.y, from.z, to.x, to.y, to.z, color, width * 2.6, duration * 0.6, SegStyle.Beam, Math.random(), 0.25);
  }

  /** Raio: polilinha irregular com ramificações e cintilação. */
  lightning(from: THREE.Vector3, to: THREE.Vector3, opts?: { color?: number; branches?: number; duration?: number; width?: number }): void {
    if (!this.segments) return;
    this.counters.lightning++;
    const color = opts?.color ?? 0xbfe4ff;
    const dur = opts?.duration ?? 0.28;
    const width = opts?.width ?? 0.14;
    const branches = opts?.branches ?? 2;
    const len = from.distanceTo(to);
    const segs = Math.max(5, Math.min(18, Math.round(len / 1.1)));
    this.rng = mulberry32((Math.random() * 1e9) | 0);
    // 2 variantes defasadas (cintilação) do traço principal
    for (let v = 0; v < 2; v++) {
      const n = lightningPoints(from, to, segs, 0.11, this.rng, this.pts);
      const delay = v * dur * 0.3;
      const d = dur * (v === 0 ? 1 : 0.65);
      const P = this.pts;
      for (let i = 0; i < n - 1; i++) {
        const o = i * 3;
        this.segments.add(P[o], P[o + 1], P[o + 2], P[o + 3], P[o + 4], P[o + 5], color, width * (v === 0 ? 1 : 0.7), d, SegStyle.Lightning, this.rng(), 1.2, 0, delay);
      }
      if (v === 0) {
        // ramificações saindo de pontos do traço principal
        for (let b = 0; b < branches; b++) {
          const k = 1 + Math.floor(this.rng() * Math.max(1, n - 3));
          const o = k * 3;
          this.tA.set(P[o], P[o + 1], P[o + 2]);
          this.tC.subVectors(to, from).normalize();
          const rem = len * (1 - k / n) * (0.3 + this.rng() * 0.35);
          this.tB.set(this.rng() * 2 - 1, this.rng() * 2 - 1, this.rng() * 2 - 1).normalize().multiplyScalar(0.8).add(this.tC).normalize();
          this.tB.multiplyScalar(Math.max(0.8, rem)).add(this.tA);
          const bn = lightningPoints(this.tA, this.tB, Math.max(3, Math.round(segs * 0.4)), 0.16, this.rng, this.bpts);
          const B = this.bpts;
          for (let i = 0; i < bn - 1; i++) {
            const q = i * 3;
            this.segments.add(B[q], B[q + 1], B[q + 2], B[q + 3], B[q + 4], B[q + 5], color, width * 0.55, dur * 0.7, SegStyle.Lightning, this.rng(), 0.9, 0.3);
          }
        }
      }
    }
    this.lights.flash(to, color, 70, Math.min(0.3, dur), 18);
  }

  /** Clarão de luz pontual (pool). */
  flash(position: THREE.Vector3, color: number, intensity: number, duration: number): void {
    this.lights?.flash(position, color, intensity, duration);
  }

  /**
   * Marcação de ataque no chão (círculo/cone/linha/anel) com preenchimento animado até o golpe.
   * Uso pela IA: `const h = vfx.telegraph({ type: 'cone', position, yaw, radius: 6, angle: 70, duration: 0.9 })`
   * e `h.cancel()` se o ataque for interrompido. Vermelho (padrão) = imbloqueável; laranja = bloqueável.
   */
  telegraph(shape: TelegraphShape): VfxHandle {
    if (!this.telegraphs) return { cancel() {} };
    this.counters.telegraphsCreated++;
    return this.telegraphs.create(shape, this.ctx.physics);
  }

  /** Rastro contínuo preso a um objeto (armas, projéteis, voo). */
  attachTrail(object: THREE.Object3D, color: number, width = 0.25): VfxHandle {
    if (!this.trails) return { cancel() {} };
    return this.trails.ribbon(object, color, width, 0.32);
  }

  // =====================================================================
  // API estendida (combate, habilidades, IA)
  // =====================================================================
  /** Casca esférica (explosões: r0 < r1; implosões: r0 > r1). */
  shell(position: THREE.Vector3, r0: number, r1: number, color: number, duration: number, alpha = 0.8): void {
    this.rings?.shell(position.x, position.y, position.z, r0, r1, duration, color, alpha);
  }

  /** Círculo rúnico fixo no chão (enraizamento, conjuração, zonas). */
  runeCircle(position: THREE.Vector3, radius: number, color: number, duration: number, spin = 1.2, alpha = 0.9): void {
    this.rings?.ring(position.x, position.y + 0.07, position.z, radius, radius, duration, color, alpha, RingStyle.Rune, 0.2, spin);
  }

  /** Disco de clarão no chão. */
  groundFlash(position: THREE.Vector3, radius: number, color: number, duration: number): void {
    this.rings?.ring(position.x, position.y + 0.06, position.z, radius * 0.6, radius, duration, color, 0.8, RingStyle.Flash, 0.2);
  }

  /** Corrente de luz (elos) entre dois pontos. */
  chain(from: THREE.Vector3, to: THREE.Vector3, color: number, duration: number, width = 0.12): void {
    this.segments?.add(from.x, from.y, from.z, to.x, to.y, to.z, color, width, duration, SegStyle.Chain);
  }

  /** Feixe sustentado (laser de chefe, canalização). Atualize com `set(a,b)` e encerre com `cancel()`. */
  sustainedBeam(color: number, width: number, style: BeamStyle = 'beam'): SustainedSegment | null {
    return this.segments ? this.segments.sustained(color, width, STYLE_ID[style]) : null;
  }

  /** Rastro entre dois pontos (base/ponta da arma) fornecidos a cada quadro pelo callback. */
  bladeTrail(source: TrailPointSource, color: number, life = 0.16, alpha = 0.85): TrailHandle {
    return this.trails ? this.trails.blade(source, color, life, alpha) : { cancel() {}, setEmitting() {}, setColor() {} };
  }

  /** Fita seguindo um objeto, com controle de emissão. */
  ribbonTrail(object: THREE.Object3D, color: number, width = 0.25, life = 0.32, alpha = 0.9): TrailHandle {
    return this.trails ? this.trails.ribbon(object, color, width, life, alpha) : { cancel() {}, setEmitting() {}, setColor() {} };
  }

  /** Luz sustentada (com handle para mover/encerrar). Pode seguir um objeto. */
  sustainedLight(position: THREE.Vector3, color: number, intensity: number, duration: number, follow: THREE.Object3D | null = null, distance = 14): LightHandle | null {
    return this.lights ? this.lights.sustained(position, color, intensity, duration, distance, follow) : null;
  }

  /**
   * Dissolve um modelo (morte): descarte por ruído com borda brilhante + brasas subindo.
   * Os materiais originais (compartilhados) não são alterados. Ao terminar o objeto fica
   * invisível e `onDone` é chamado (ex.: remover a entidade).
   */
  dissolve(object: THREE.Object3D, opts: { duration?: number; color?: number; height?: number; onDone?: () => void } = {}): VfxHandle {
    const color = opts.color ?? 0x9fd8ff;
    const job = this.dissolves.start(object, opts.duration ?? 1.6, color, opts.onDone);
    object.getWorldPosition(this.tA);
    this.burst('deathDissolve', this.tA, { color, scale: (opts.height ?? 1.8) / 1.8 });
    const mgr = this.dissolves;
    return { cancel: () => mgr.cancel(job) };
  }

  /**
   * Núcleo brilhante (billboard) válido só para ESTE quadro — chame a cada quadro
   * (projéteis, orbes, ponta de arma carregando). Não aloca.
   */
  sprite(position: THREE.Vector3, size: number, color: number, alpha = 1): void {
    this.sprites?.push(position.x, position.y, position.z, size, color, alpha);
  }

  /** Uma única partícula aditiva (rastros de projéteis, centelhas contínuas). Não aloca. */
  spark(position: THREE.Vector3, color: number, size: number, life: number, vx = 0, vy = 0, vz = 0, gravity = 0, stretch = 0): void {
    if (!this.add) return;
    const p = this.add.reset();
    p.x = position.x;
    p.y = position.y;
    p.z = position.z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.gravity = gravity;
    p.drag = 1.5;
    p.life = life;
    p.size0 = size;
    p.size1 = size * 0.15;
    p.shape = stretch > 0 ? PShape.Spark : PShape.Glow;
    p.stretch = stretch;
    this.tmpColor.setHex(color);
    p.r = this.tmpColor.r;
    p.g = this.tmpColor.g;
    p.b = this.tmpColor.b;
    this.add.emit();
  }

  /** Uma baforada de fumaça (pool não aditivo). Não aloca. */
  puff(position: THREE.Vector3, color: number, size: number, life: number, alpha = 0.4, vy = 0.6): void {
    if (!this.smokePool) return;
    const p = this.smokePool.reset();
    p.x = position.x;
    p.y = position.y;
    p.z = position.z;
    p.vx = (Math.random() - 0.5) * 0.4;
    p.vy = vy;
    p.vz = (Math.random() - 0.5) * 0.4;
    p.drag = 0.8;
    p.life = life;
    p.size0 = size * 0.5;
    p.size1 = size * 1.6;
    p.a = alpha;
    p.shape = PShape.Smoke;
    p.spin = (Math.random() - 0.5) * 1.2;
    this.tmpColor.setHex(color);
    p.r = this.tmpColor.r;
    p.g = this.tmpColor.g;
    p.b = this.tmpColor.b;
    this.smokePool.emit();
  }

  /** Remove todos os efeitos ativos (novo jogo/carregamento). */
  clear() {
    if (!this.add) return;
    this.add.clear();
    this.smokePool.clear();
    this.segments.clear();
    this.rings.clear();
    this.lights.clear();
    this.telegraphs.clear();
    this.trails.clear();
    this.dissolves.clear();
  }

  /** Diagnóstico (testes/benchmark). */
  stats() {
    return {
      particlesAdd: this.add?.countAlive() ?? 0,
      particlesSmoke: this.smokePool?.countAlive() ?? 0,
      particleCapacity: (this.add?.effectiveLimit ?? 0) + (this.smokePool?.effectiveLimit ?? 0),
      lights: this.lights?.active() ?? 0,
      lightCapacity: this.lights?.count ?? 0,
      telegraphs: this.telegraphs?.activeCount() ?? 0,
      trails: this.trails?.activeCount() ?? 0,
      dissolves: this.dissolves.count,
      ...this.counters,
    };
  }
}
