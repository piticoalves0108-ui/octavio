import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import type { WeatherKind } from '../core/EventBus';
import type { QualityLevel } from '../data/quality';
import { QUALITY_PRESETS } from '../data/quality';
import { LOCATION_BY_ID } from '../data/world';
import { PLACES } from '../data/places';
import { mulberry32, round, summarize, type FrameSummary } from './stats';

/**
 * Benchmarks automatizados: `?bench=<cenário>&secs=<n>&quality=<q>[&warmup=3][&seed=1337]`.
 *
 * Cada cenário é determinístico (semente fixa no Math.random, roteiro por tempo de jogo,
 * sem depender de entrada): prepara o mundo, aquece `warmup` s, mede `secs` s e publica
 * `window.__benchResult` (lido por scripts/benchmark.mjs). Um "diretor" roda a cada quadro
 * entre o lateUpdate da câmera e o render (envolve `ctx.render`), posicionando jogador e
 * câmera pela trajetória do cenário. Se um sistema faltar, o cenário registra em `notes`
 * e segue.
 */

export const BENCH_VERSION = 4;
export const BENCH_SCENARIOS = ['vila_chuva', 'voo_floresta', 'combate', 'chefe', 'tempestade', 'stress'] as const;
export type BenchScenario = (typeof BENCH_SCENARIOS)[number];

/** Tipos reais de inimigos (src/data/enemies.ts) usados nos cenários de combate. */
const ENEMY_MIX = [
  'corvo_saqueador',
  'lobo_sombrio',
  'corva_arqueira',
  'automato_sentinela',
  'mago_corrompido',
  'corvo_saqueador',
  'cavaleiro_encantado',
  'lobo_sombrio',
  'golem_ruinas',
  'espreitador',
  'cacador_furtivo',
  'corvo_cristal',
];
/** Rotação de habilidades (src/data/abilities.ts) conjuradas pelo jogador. */
const ABILITY_ROTATION = ['arcaneOrb', 'energyLance', 'runicBlast', 'lightningStorm', 'etherealBlades', 'arcaneChains', 'dimensionalRift', 'magicShield'];

interface Director {
  /** Hora do dia fixa (relógio pausado). */
  hours: number;
  weather: WeatherKind;
  setup(ctx: GameContext, b: BenchRuntime): void | Promise<void>;
  /** Roda a cada quadro, antes do render. `t` = tempo de jogo desde o início do cenário. */
  step(dt: number, t: number, ctx: GameContext, b: BenchRuntime): void;
}

/** Estado compartilhado do cenário (vetores reutilizados, notas, inimigos do benchmark). */
class BenchRuntime {
  notes: string[] = [];
  enemies: Entity[] = [];
  center = new THREE.Vector3();
  look = new THREE.Vector3();
  v1 = new THREE.Vector3();
  v2 = new THREE.Vector3();
  v3 = new THREE.Vector3();
  boss: Entity | null = null;
  castT = 0;
  castIdx = 0;
  respawnT = 0;
  killT = 0;
  kills = 0;
  strikeT = 0;
  spawnIdx = 0;
  casts = 0;
  castFails = 0;
  spawned = 0;
  phaseHits = 0;
  private noted = new Set<string>();

  note(msg: string) {
    if (this.noted.has(msg)) return;
    this.noted.add(msg);
    this.notes.push(msg);
    console.warn(`[Bench] ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Utilitários de cenário
// ---------------------------------------------------------------------------

function ground(ctx: GameContext, x: number, z: number): number {
  try {
    return ctx.physics.groundHeight(x, z, ctx.heightfield.heightAt(x, z) + 1.6);
  } catch {
    return ctx.heightfield.heightAt(x, z);
  }
}

function placeOr(ctx: GameContext, id: string, fx: number, fz: number, out: THREE.Vector3): THREE.Vector3 {
  const p = ctx.sys.world?.placePosition?.(id, out);
  if (p) return p;
  return out.set(fx, ground(ctx, fx, fz), fz);
}

/** Coloca a câmera em órbita lenta em volta de `center`. */
function orbitCamera(ctx: GameContext, center: THREE.Vector3, t: number, radius: number, height: number, speed: number, lookY = 1.5) {
  const a = t * speed;
  const cam = ctx.camera;
  const x = center.x + Math.sin(a) * radius;
  const z = center.z + Math.cos(a) * radius;
  cam.position.set(x, Math.max(center.y + height, ctx.heightfield.heightAt(x, z) + 2), z);
  cam.lookAt(center.x, center.y + lookY, center.z);
  cam.updateMatrixWorld();
}

/** Mantém o jogador imortal, com energia cheia, sem recargas. */
function sustainPlayer(ctx: GameContext) {
  const p = ctx.sys.player;
  if (!p?.entity) return;
  if (p.health) p.health.immortal = true;
  p.restoreEnergy?.(1e6);
}

function unlockAbilities(ctx: GameContext, b: BenchRuntime) {
  const ab = ctx.sys.abilities;
  if (!ab?.unlock) {
    b.note('abilities indisponível: sem conjuração');
    return;
  }
  for (const id of ABILITY_ROTATION) {
    try {
      ab.unlock(id);
    } catch {
      b.note(`abilities.unlock(${id}) falhou`);
    }
  }
}

/** Conjura a próxima habilidade da rotação a cada `every` s (tempo de jogo). */
function castRotation(ctx: GameContext, b: BenchRuntime, dt: number, every: number, target: Entity | null) {
  b.castT -= dt;
  if (b.castT > 0) return;
  b.castT = every;
  const ab = ctx.sys.abilities;
  if (!ab?.tryCast) return;
  // conjuração (ou carga) em andamento: tenta de novo logo depois, sem contar falha
  if (ab.currentCast?.()) {
    b.castT = 0.15;
    return;
  }
  sustainPlayer(ctx);
  (ab as unknown as { cooldowns?: Map<string, number> }).cooldowns?.clear?.();
  if (target && target.alive) ctx.sys.camera?.setLockTarget?.(target);
  for (let k = 0; k < ABILITY_ROTATION.length; k++) {
    const id = ABILITY_ROTATION[b.castIdx % ABILITY_ROTATION.length];
    b.castIdx++;
    let ok = false;
    try {
      ok = ab.tryCast(id);
    } catch {
      b.note(`tryCast(${id}) lançou erro`);
    }
    if (ok) {
      b.casts++;
      return;
    }
    b.castFails++;
  }
}

function nearestAlive(list: Entity[], from: THREE.Vector3): Entity | null {
  let best: Entity | null = null;
  let bd = Infinity;
  for (const e of list) {
    if (!e.alive || e.removed) continue;
    const d = e.position.distanceToSquared(from);
    if (d < bd) {
      bd = d;
      best = e;
    }
  }
  return best;
}

/** Mantém `count` inimigos do benchmark vivos num anel em volta de `center` (repõe os mortos). */
function maintainEnemies(ctx: GameContext, b: BenchRuntime, dt: number, count: number, rMin: number, rMax: number) {
  b.respawnT -= dt;
  if (b.respawnT > 0) return;
  b.respawnT = 0.5;
  const ai = ctx.sys.ai;
  if (!ai?.spawnEnemy) {
    b.note('ai.spawnEnemy indisponível: sem inimigos');
    return;
  }
  let alive = 0;
  for (let i = b.enemies.length - 1; i >= 0; i--) {
    const e = b.enemies[i];
    if (e.removed || !e.alive) b.enemies.splice(i, 1);
    else alive++;
  }
  // repõe até 3 por vez (espalha o custo de criação dos rigs)
  for (let n = 0; alive < count && n < 3; n++) {
    const i = b.spawnIdx++;
    const type = ENEMY_MIX[i % ENEMY_MIX.length];
    const a = i * 2.39996; // ângulo áureo: espalha sem sobrepor
    const r = rMin + ((i * 0.618034) % 1) * (rMax - rMin);
    const x = b.center.x + Math.cos(a) * r;
    const z = b.center.z + Math.sin(a) * r;
    b.v3.set(x, ground(ctx, x, z), z);
    try {
      const e = ai.spawnEnemy(type, b.v3, { aggro: true });
      if (e) {
        b.enemies.push(e);
        b.spawned++;
        alive++;
      } else b.note(`spawnEnemy(${type}) retornou null`);
    } catch (err) {
      b.note(`spawnEnemy(${type}) lançou erro: ${(err as Error)?.message ?? err}`);
      return;
    }
  }
}

/**
 * Rotatividade do combate: a cada `every` s mata o inimigo mais antigo do benchmark (dano real via
 * combat.applyDamage → morte, dissolução, saque, XP) para que mortes e reposições entrem na medição.
 */
function killChurn(ctx: GameContext, b: BenchRuntime, dt: number, every: number) {
  b.killT -= dt;
  if (b.killT > 0) return;
  b.killT = every;
  const combat = ctx.sys.combat;
  if (!combat?.applyDamage) return;
  for (const e of b.enemies) {
    if (!e.alive || e.removed || !e.health) continue;
    if (e.health.immortal) continue;
    try {
      combat.applyDamage(e, { amount: e.health.max * 4 + 1000, type: 'arcane', source: ctx.sys.player.entity, tag: 'bench', point: e.position });
      b.kills++;
    } catch (err) {
      b.note(`applyDamage lançou erro: ${(err as Error)?.message ?? err}`);
    }
    return;
  }
}

/** Força relâmpagos periódicos (além dos naturais), em pontos pseudoaleatórios. */
function forceLightning(ctx: GameContext, b: BenchRuntime, dt: number, every: number, near: THREE.Vector3) {
  b.strikeT -= dt;
  if (b.strikeT > 0) return;
  b.strikeT = every;
  const env = ctx.sys.env;
  if (!env?.lightningFlash) return;
  const a = Math.random() * Math.PI * 2;
  const r = 60 + Math.random() * 200;
  b.v2.set(near.x + Math.cos(a) * r, 0, near.z + Math.sin(a) * r);
  b.v2.y = ctx.heightfield.heightAt(b.v2.x, b.v2.z);
  env.lightningFlash(b.v2);
}

function holdPlayerAt(ctx: GameContext, pos: THREE.Vector3, yaw: number) {
  const p = ctx.sys.player;
  if (!p?.entity) return;
  const e = p.entity;
  e.position.copy(pos);
  e.velocity.set(0, 0, 0);
  e.yaw = yaw;
  e.object3d.rotation.y = yaw;
  ctx.entities.focus.copy(pos);
}

function ensureFlight(ctx: GameContext, b: BenchRuntime) {
  const p = ctx.sys.player;
  if (!p?.isFlying || p.isFlying()) return;
  sustainPlayer(ctx);
  try {
    if (!p.startFlight(true)) b.note('player.startFlight recusou');
  } catch {
    b.note('player.startFlight lançou erro');
  }
}

// ---------------------------------------------------------------------------
// Cenários
// ---------------------------------------------------------------------------

/** Trajetória do voo: floresta de Lúmen até o Lago Espelhado (XZ). */
const FLIGHT_PATH: [number, number][] = [
  [260, 430],
  [140, 300],
  [40, 220],
  [-20, 170],
  [-70, 60],
  [-120, -60],
  [-180, -220],
];

function buildPath(): { pts: THREE.Vector2[]; cum: number[]; total: number } {
  const pts = FLIGHT_PATH.map(([x, z]) => new THREE.Vector2(x, z));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  return { pts, cum, total: cum[cum.length - 1] };
}

function makeDirector(name: BenchScenario, ctx: GameContext): Director {
  const q = ctx.settings.q;
  switch (name) {
    case 'vila_chuva':
      return {
        hours: 17.6,
        weather: 'rain',
        setup(ctx, b) {
          placeOr(ctx, 'praca_centro', LOCATION_BY_ID['vila_brumafria'].x, LOCATION_BY_ID['vila_brumafria'].z, b.center);
          ctx.sys.player.teleport(b.center, Math.PI);
          const npcs = ctx.entities.ofKind('npc').length;
          if (!npcs) b.note('sem NPCs no mundo (módulo npc ainda sem população): vila medida sem moradores');
        },
        step(_dt, t, ctx, b) {
          sustainPlayer(ctx);
          orbitCamera(ctx, b.center, t, 16, 7, 0.08);
        },
      };
    case 'voo_floresta': {
      const path = buildPath();
      const speed = 42; // m/s — entre cruzeiro e turbo
      let alt = -1;
      return {
        hours: 10.5,
        weather: 'clear',
        setup(ctx, b) {
          const [x, z] = FLIGHT_PATH[0];
          b.center.set(x, ground(ctx, x, z) + 24, z);
          ctx.sys.player.teleport(b.center, 0);
          ensureFlight(ctx, b);
        },
        step(dt, t, ctx, b) {
          sustainPlayer(ctx);
          ensureFlight(ctx, b);
          // ida e volta pela trajetória
          let s = (t * speed) % (path.total * 2);
          if (s > path.total) s = path.total * 2 - s;
          let i = 1;
          while (i < path.cum.length - 1 && path.cum[i] < s) i++;
          const a = path.pts[i - 1];
          const c = path.pts[i];
          const f = (s - path.cum[i - 1]) / Math.max(1e-6, path.cum[i] - path.cum[i - 1]);
          const x = a.x + (c.x - a.x) * f;
          const z = a.y + (c.y - a.y) * f;
          // altitude: 22 m acima do maior relevo logo à frente, suavizada
          const dx = c.x - a.x;
          const dz = c.y - a.y;
          const len = Math.hypot(dx, dz) || 1;
          const back = (t * speed) % (path.total * 2) > path.total ? -1 : 1;
          const fx = (dx / len) * back;
          const fz = (dz / len) * back;
          const gAhead = Math.max(ctx.heightfield.heightAt(x, z), ctx.heightfield.heightAt(x + fx * 40, z + fz * 40));
          const want = gAhead + 22;
          alt = alt < 0 ? want : alt + (want - alt) * Math.min(1, dt * 1.5);
          b.center.set(x, alt, z);
          holdPlayerAt(ctx, b.center, Math.atan2(fx, fz));
          const cam = ctx.camera;
          cam.position.set(x - fx * 10, alt + 3.2, z - fz * 10);
          cam.lookAt(x + fx * 25, alt - 2, z + fz * 25);
          cam.updateMatrixWorld();
        },
      };
    }
    case 'combate':
      return {
        hours: 13,
        weather: 'clear',
        setup(ctx, b) {
          placeOr(ctx, 'campina_cervos', -250, 120, b.center);
          ctx.sys.player.teleport(b.center, 0);
          unlockAbilities(ctx, b);
          b.respawnT = 0;
          maintainEnemies(ctx, b, 0, 11, 8, 16);
        },
        step(dt, t, ctx, b) {
          sustainPlayer(ctx);
          maintainEnemies(ctx, b, dt, 11, 8, 16);
          killChurn(ctx, b, dt, 1.6);
          const target = nearestAlive(b.enemies, ctx.sys.player.position);
          castRotation(ctx, b, dt, 0.6, target);
          b.look.copy(ctx.sys.player.position);
          orbitCamera(ctx, b.look, t, 14, 6, 0.1);
        },
      };
    case 'chefe':
      return {
        hours: 21,
        weather: 'storm',
        async setup(ctx, b) {
          const ent = PLACES['arena_entrada'];
          const cen = PLACES['arena_centro'];
          if (!ent || !cen) b.note('âncoras da arena ausentes');
          const ex = ent?.x ?? 500;
          const ez = ent?.z ?? -380;
          const cx = cen?.x ?? 500;
          const cz = cen?.z ?? -380;
          const px = ex + (cx - ex) * 0.6;
          const pz = ez + (cz - ez) * 0.6;
          b.center.set(px, (cen?.y ?? ground(ctx, px, pz)) + 0.1, pz);
          ctx.sys.player.teleport(b.center, Math.atan2(cx - px, cz - pz));
          unlockAbilities(ctx, b);
          try {
            b.boss = ctx.sys.ai?.spawnBoss?.('guardiao_mecanico') ?? null;
          } catch (err) {
            b.note(`spawnBoss lançou erro: ${(err as Error)?.message ?? err}`);
          }
          if (!b.boss) b.note('chefe não nasceu (spawnBoss retornou null)');
        },
        step(dt, t, ctx, b) {
          sustainPlayer(ctx);
          const boss = b.boss;
          const pp = ctx.sys.player.position;
          if (boss && boss.health) {
            boss.health.immortal = true;
            // força as fases: fase 2 em ~4 s de jogo, fase 3 em ~9 s
            const phase = (boss as unknown as { phase?: number }).phase ?? 1;
            const wantPhase = t > 9 ? 3 : t > 4 ? 2 : 1;
            if (phase < wantPhase) {
              for (let k = 0; k < 4; k++) {
                ctx.sys.combat.applyDamage(boss, { amount: 400, type: 'lightning', source: ctx.sys.player.entity, tag: 'bench', point: boss.position });
                b.phaseHits++;
              }
            }
            castRotation(ctx, b, dt, 0.8, boss);
            b.look.copy(boss.position).setY(boss.position.y + 3);
          } else b.look.copy(pp);
          // câmera atrás do jogador, enquadrando o chefe
          const cam = ctx.camera;
          b.v1.subVectors(b.look, pp).setY(0);
          if (b.v1.lengthSq() < 1e-4) b.v1.set(0, 0, 1);
          b.v1.normalize();
          const sway = Math.sin(t * 0.3) * 3;
          cam.position.set(pp.x - b.v1.x * 9 + b.v1.z * sway, pp.y + 4.5, pp.z - b.v1.z * 9 - b.v1.x * sway);
          cam.lookAt(b.look);
          cam.updateMatrixWorld();
        },
      };
    case 'tempestade':
      return {
        hours: 23.5,
        weather: 'storm',
        setup(ctx, b) {
          placeOr(ctx, 'clareira_cervo_luminoso', -36, 150, b.center);
          ctx.sys.player.teleport(b.center, 0);
          b.strikeT = 1;
        },
        step(dt, t, ctx, b) {
          sustainPlayer(ctx);
          forceLightning(ctx, b, dt, 2.5, b.center);
          orbitCamera(ctx, b.center, t, 18, 6, 0.06);
        },
      };
    case 'stress':
    default: {
      const max = Math.max(1, q.maxActiveEnemies ?? 16);
      return {
        hours: 19.2,
        weather: 'storm',
        setup(ctx, b) {
          placeOr(ctx, 'campina_cervos', -250, 120, b.center);
          b.look.copy(b.center);
          ctx.sys.player.teleport(b.center, 0);
          unlockAbilities(ctx, b);
          ensureFlight(ctx, b);
          b.respawnT = 0;
          b.strikeT = 1;
          maintainEnemies(ctx, b, 0, max, 9, 22);
        },
        step(dt, t, ctx, b) {
          sustainPlayer(ctx);
          ensureFlight(ctx, b);
          maintainEnemies(ctx, b, dt, max, 9, 22);
          killChurn(ctx, b, dt, 1.2);
          // voo em círculo baixo sobre o campo de batalha
          const a = t * 0.35;
          const x = b.look.x + Math.cos(a) * 10;
          const z = b.look.z + Math.sin(a) * 10;
          b.v1.set(x, ctx.heightfield.heightAt(x, z) + 6, z);
          holdPlayerAt(ctx, b.v1, a + Math.PI);
          const target = nearestAlive(b.enemies, b.v1);
          castRotation(ctx, b, dt, 0.45, target);
          forceLightning(ctx, b, dt, 3, b.look);
          orbitCamera(ctx, b.look, t, 24, 11, 0.07, 3);
        },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Medição de GPU (opcional: EXT_disjoint_timer_query_webgl2)
// ---------------------------------------------------------------------------

class GpuTimer {
  private gl: WebGL2RenderingContext | null = null;
  private ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null = null;
  private free: WebGLQuery[] = [];
  private pending: WebGLQuery[] = [];
  private active: WebGLQuery | null = null;
  samples = new Float32Array(20000);
  count = 0;
  recording = false;
  disjoint = 0;
  readonly enabled: boolean;

  constructor(renderer: THREE.WebGLRenderer, enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) return;
    const gl = renderer.getContext();
    if (!(gl instanceof WebGL2RenderingContext)) return;
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!ext) return;
    this.gl = gl;
    this.ext = ext as unknown as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
  }

  get available() {
    return !!this.ext;
  }

  begin() {
    const gl = this.gl;
    if (!gl || !this.ext || this.active) return;
    const q = this.free.pop() ?? gl.createQuery();
    if (!q) return;
    gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q);
    this.active = q;
  }

  end() {
    const gl = this.gl;
    if (!gl || !this.ext || !this.active) return;
    gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
    this.poll();
  }

  private poll() {
    const gl = this.gl!;
    const disjoint = gl.getParameter(this.ext!.GPU_DISJOINT_EXT);
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      const ns = gl.getQueryParameter(q, gl.QUERY_RESULT) as number;
      if (disjoint) this.disjoint++;
      else if (this.recording && this.count < this.samples.length) this.samples[this.count++] = ns / 1e6;
      this.free.push(q);
    }
  }
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

function rendererInfo(ctx: GameContext): { vendor: string; renderer: string } {
  try {
    const gl = ctx.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) return { vendor: String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)), renderer: String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) };
    return { vendor: String(gl.getParameter(gl.VENDOR)), renderer: String(gl.getParameter(gl.RENDERER)) };
  } catch {
    return { vendor: 'n/d', renderer: 'n/d' };
  }
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function fmt(s: FrameSummary) {
  return { mean: round(s.mean), p50: round(s.p50), p95: round(s.p95), p99: round(s.p99), min: round(s.min), max: round(s.max), worst1: round(s.worst1), worst01: round(s.worst01) };
}

function heap(): number | null {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  return m ? round(m.usedJSHeapSize / 1048576, 1) : null;
}

export async function runBenchmark(ctx: GameContext, scenario: string): Promise<void> {
  const w = window as unknown as Record<string, unknown>;
  w.__benchResult = undefined;
  w.__benchDone = false;
  const params = ctx.params;
  const name = (BENCH_SCENARIOS as readonly string[]).includes(scenario) ? (scenario as BenchScenario) : null;
  const secs = Math.max(1, Number(params.get('secs') ?? 10) || 10);
  const warmup = Math.max(0, Number(params.get('warmup') ?? 3) || 0);
  const seed = Number(params.get('seed') ?? 1337) || 1337;
  const b = new BenchRuntime();
  const errors: string[] = [];
  const origRandom = Math.random;
  const origRender = ctx.render;
  const origError = console.error;
  const settingsKey = 'eclipse-arcano:settings';
  let savedSettings: string | null = null;
  try {
    savedSettings = localStorage.getItem(settingsKey);
  } catch {
    /* sem armazenamento */
  }
  console.error = (...a: unknown[]) => {
    if (errors.length < 30) errors.push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(' ').slice(0, 300));
    origError.apply(console, a as []);
  };
  try {
    if (!name) throw new Error(`cenário desconhecido: ${scenario} (opções: ${BENCH_SCENARIOS.join(', ')})`);
    // qualidade pedida (o script também grava no localStorage antes do boot, por causa do antialias)
    const qp = params.get('quality') as QualityLevel | null;
    if (qp && qp in QUALITY_PRESETS && ctx.settings.data.quality !== qp) ctx.settings.set('quality', qp);
    if (ctx.settings.data.fpsLimit) b.note(`fpsLimit ${ctx.settings.data.fpsLimit} ativo (limita o FPS medido)`);

    Math.random = mulberry32(seed);
    await ctx.newGame();
    if (ctx.state !== 'playing') ctx.setState('playing');
    const ai = ctx.sys.ai;
    if (ai) ai.ambient = false; // população controlada pelo cenário (determinismo)
    const dir = makeDirector(name, ctx);
    ctx.clock.hours = dir.hours;
    ctx.clock.paused = true;
    try {
      ctx.sys.env.lockWeather(dir.weather, 0);
    } catch {
      b.note('env.lockWeather indisponível');
    }
    await dir.setup(ctx, b);

    // diretor entre a câmera (lateUpdate) e o render
    // consulta de tempo de GPU: opcional (?gputimer), pois a leitura do GPU_DISJOINT pode sincronizar a CPU com a GPU
    const gpu = new GpuTimer(ctx.renderer, params.has('gputimer'));
    // ?cpuonly: mede só a simulação (sem rasterização), isolando o custo de CPU dos sistemas do
    // ruído do SwiftShader (que rasteriza na mesma CPU). Draw calls/triângulos ficam zerados.
    const cpuOnly = params.has('cpuonly');
    if (cpuOnly) b.note('modo cpuonly: sem renderização (draw calls e FPS não são de jogo real)');
    let t = 0;
    let last = ctx.elapsed;
    let recording = false;
    let tierSum0 = 0,
      tierSum1 = 0,
      tierSum2 = 0,
      tierSum3 = 0,
      totalSum = 0,
      sampled = 0;
    let heapMax = 0;
    let particlesMax = 0;
    let projMax = 0;
    let enemiesMax = 0;
    let sampleT = 0;
    const sampleCounts = () => {
      const h = heap();
      if (h !== null && h > heapMax) heapMax = h;
      try {
        const vs = ctx.sys.vfx?.stats?.();
        if (vs) particlesMax = Math.max(particlesMax, (vs.particlesAdd ?? 0) + (vs.particlesSmoke ?? 0));
      } catch {
        /* opcional */
      }
      projMax = Math.max(projMax, ctx.sys.combat?.projectiles?.count ?? 0);
      enemiesMax = Math.max(enemiesMax, ctx.sys.ai?.activeEnemyCount?.() ?? 0);
    };
    ctx.render = () => {
      // cinemática/diálogo da narrativa não podem prender o cenário (?bench já as desliga; defensivo)
      if (ctx.state === 'cinematic') (ctx.sys.quests as unknown as { cine?: { skip?: () => void } } | undefined)?.cine?.skip?.();
      const now = ctx.elapsed;
      const dt = Math.max(0, now - last);
      last = now;
      t += dt;
      const t0 = performance.now();
      try {
        dir.step(dt, t, ctx, b);
      } catch (err) {
        b.note(`diretor: ${(err as Error)?.message ?? err}`);
      }
      if (recording) {
        const st = ctx.entities.stats;
        tierSum0 += st.tier0;
        tierSum1 += st.tier1;
        tierSum2 += st.tier2;
        tierSum3 += st.tier3;
        totalSum += st.total;
        sampled++;
        sampleT += dt;
        if (sampleT > 0.5) {
          sampleT = 0;
          sampleCounts();
        }
      }
      ctx.sys.perf.measure('bench', performance.now() - t0);
      if (cpuOnly) {
        // só CPU: atualiza matrizes e o pré-render do mundo (LOD/streaming), sem chamadas WebGL
        ctx.scene.updateMatrixWorld();
        if (!ctx.camera.parent) ctx.camera.updateMatrixWorld();
        const sc = ctx.scene as unknown as { onBeforeRender: (...a: unknown[]) => void };
        sc.onBeforeRender(ctx.renderer, ctx.scene, ctx.camera, null, null, null);
        return;
      }
      gpu.begin();
      origRender();
      gpu.end();
    };

    await wait(warmup * 1000);
    const info = ctx.renderer.info;
    const before = { geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0, heapMB: heap() };
    // programas de shader já prontos: os que surgirem durante a medição são compilações no meio do jogo (travadas)
    const progBefore = new Set<unknown>(info.programs ?? []);
    sampleCounts();
    const perf = ctx.sys.perf;
    perf.resetSamples();
    perf.startRecording(Math.ceil(secs * 400));
    gpu.recording = true;
    recording = true;
    const gameT0 = t;
    await wait(secs * 1000);
    recording = false;
    gpu.recording = false;
    const rec = perf.stopRecording();
    sampleCounts();
    // atribuição das draw calls (1 quadro, com o diretor ainda ativo)
    let drawBreakdown: unknown = null;
    if (params.has('draws')) {
      try {
        const cap = await ctx.sys.perf.captureDrawCalls(1);
        drawBreakdown = { ...cap, groups: cap.groups.slice(0, 40) };
      } catch (err) {
        b.note(`captureDrawCalls: ${(err as Error)?.message ?? err}`);
      }
    }
    ctx.render = origRender;
    const newPrograms = (info.programs ?? [])
      .filter((p) => !progBefore.has(p))
      .map((p) => {
        const pp = p as unknown as { name?: string; cacheKey?: string };
        const key = String(pp.cacheKey ?? '');
        return `${pp.name ?? '?'}${key ? ' [' + key.slice(key.lastIndexOf(',') + 1).slice(0, 40) + ']' : ''}`;
      });

    const n = rec?.frames ?? 0;
    const scratch = new Float32Array(Math.max(1, n));
    const frame = rec ? summarize(rec.frameMs, n, scratch) : null;
    const cpu = rec ? summarize(rec.cpuMs, n, scratch) : null;
    const draws = rec ? summarize(rec.drawCalls, n, scratch) : null;
    const tris = rec ? summarize(rec.triangles, n, scratch) : null;
    const renderS = rec ? summarize(rec.renderMs, n, scratch) : null;
    const gpuS = gpu.count ? summarize(gpu.samples, gpu.count, new Float32Array(gpu.count)) : null;
    const systems: Record<string, number> = {};
    const systemPeaks: Record<string, number> = {};
    if (rec && n) {
      const sorted = [...rec.systemSums].sort((a, c) => c[1] - a[1]);
      for (const [k, v] of sorted) systems[k] = round(v / n, 3);
      for (const [k, v] of rec.systemPeaks) systemPeaks[k] = round(v, 2);
    }
    const canvas = ctx.renderer.domElement;
    const fps = rec && rec.durationMs > 0 ? (n * 1000) / rec.durationMs : 0;
    const result = {
      version: BENCH_VERSION,
      ok: n > 0,
      scenario: name,
      quality: ctx.settings.data.quality,
      preset: { ...ctx.settings.q },
      secs,
      warmup,
      seed,
      frames: n,
      durationMs: round(rec?.durationMs ?? 0, 0),
      gameSeconds: round(t - gameT0, 2),
      resolution: { css: [innerWidth, innerHeight], drawingBuffer: [canvas.width, canvas.height], pixelRatio: round(ctx.renderer.getPixelRatio(), 3) },
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      renderer: rendererInfo(ctx),
      postFX: !!ctx.sys.env?.postEnabled,
      cpuOnly,
      shadows: ctx.renderer.shadowMap.enabled,
      fps: round(fps, 2),
      low1Fps: frame ? round(1000 / Math.max(1e-3, frame.worst1), 2) : 0,
      low01Fps: frame ? round(1000 / Math.max(1e-3, frame.worst01), 2) : 0,
      frameMs: frame ? fmt(frame) : null,
      cpuMs: cpu ? fmt(cpu) : null,
      gpuMs: gpuS ? fmt(gpuS) : null,
      gpuTimer: !gpu.enabled ? 'desligado' : gpu.available ? (gpu.count ? 'ok' : 'sem amostras') : 'indisponível',
      renderSubmitMs: renderS ? fmt(renderS) : null,
      systems,
      systemPeaks,
      drawCalls: draws ? { mean: round(draws.mean, 1), p95: round(draws.p95, 0), max: round(draws.max, 0) } : null,
      triangles: tris ? { mean: round(tris.mean, 0), p95: round(tris.p95, 0), max: round(tris.max, 0) } : null,
      memory: {
        before,
        after: { geometries: info.memory.geometries, textures: info.memory.textures, programs: info.programs?.length ?? 0, heapMB: heap() },
        heapMaxMB: heapMax || null,
        /** Programas de shader compilados DURANTE a medição (cada um é uma travada no quadro em que aparece). */
        programsCompiled: newPrograms.length,
        newPrograms: newPrograms.slice(0, 20),
      },
      entities: sampled
        ? { total: round(totalSum / sampled, 1), tier0: round(tierSum0 / sampled, 1), tier1: round(tierSum1 / sampled, 1), tier2: round(tierSum2 / sampled, 1), tier3: round(tierSum3 / sampled, 1) }
        : null,
      counts: {
        enemiesMax,
        particlesMax,
        projectilesMax: projMax,
        benchSpawned: b.spawned,
        casts: b.casts,
        castFails: b.castFails,
        kills: b.kills,
        bossPhase: (b.boss as unknown as { phase?: number } | null)?.phase ?? null,
        npcs: ctx.entities.ofKind('npc').length,
      },
      world: safe(() => ctx.sys.world?.debugStats?.()),
      scene: safe(() => ctx.sys.perf.sceneSummary()),
      drawBreakdown,
      env: safe(() => {
        const e = ctx.sys.env;
        return { weather: e.weather, rain: round(e.rainIntensity ?? 0, 2), night: round((e as unknown as { night?: number }).night ?? 0, 2), visibility: round(e.visibility?.() ?? 0, 0) };
      }),
      /** Pré-aquecimentos de shader feitos até aqui (src/perf/ShaderWarmup.ts; ?prewarm=0 desliga). */
      warmups: safe(() => (ctx.sys.perf.warmup.enabled ? ctx.sys.perf.warmup.history.slice() : 'desligado')),
      notes: b.notes,
      errors,
    };
    w.__benchResult = result;
    console.info(
      `[Bench] ${name} (${result.quality}): ${result.fps} FPS, quadro p50 ${result.frameMs?.p50} / p95 ${result.frameMs?.p95} / p99 ${result.frameMs?.p99} ms, CPU ${result.cpuMs?.mean} ms, draws ${result.drawCalls?.mean}, tris ${result.triangles?.mean}`,
    );
  } catch (err) {
    w.__benchResult = { version: BENCH_VERSION, ok: false, scenario, error: (err as Error)?.message ?? String(err), notes: b.notes, errors };
    origError.call(console, '[Bench] falhou', err);
  } finally {
    ctx.render = origRender;
    Math.random = origRandom;
    console.error = origError;
    // não deixa a qualidade do benchmark gravada nas configurações do jogador
    try {
      if (savedSettings !== null) localStorage.setItem(settingsKey, savedSettings);
    } catch {
      /* ignora */
    }
    w.__benchDone = true;
  }
}

function safe<T>(fn: () => T): T | null {
  try {
    return fn() ?? null;
  } catch {
    return null;
  }
}
