/**
 * Mundo interativo (estilo aventura em mundo aberto). Junta:
 * - grama que se corta com golpes e fogo que se espalha pela grama (vento, chuva, umidade),
 *   com corrente de ar quente que levanta quem voa por cima;
 * - arbustos que se cortam/queimam (frutas), árvores que soltam maçãs quando golpeadas;
 * - objetos com física (barris, caixotes, pedregulhos, potes, pólvora rúnica);
 * - Centelha [G]: faísca de fogo; Estase Temporal [T]: congela um objeto no tempo;
 * - fogueiras para cozinhar e cogumelos para colher.
 *
 * Reage ao evento 'world:strike' (golpes, explosões, feixes e projéteis de qualquer um).
 * Exposto como `ctx.sys.interactive`.
 */
import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { WorldStrike } from '../core/EventBus';
import type { Entity } from '../core/Entity';
import type { LightHandle } from '../combat/VFX';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { registerProjectileVisual } from '../combat/Projectiles';
import { BOULDER_AREAS, BUSHES, CAMPFIRES, CUT, FIRE, FORAGE, MAX_INGREDIENTS, PROP_CLUSTERS, PROPS, SPARK, STASIS, type PropKind } from '../data/interactive';
import { ITEMS } from '../data/items';
import { WATER_LEVEL } from '../data/world';
import { GroundGrid, type GroundEnv } from './groundGrid';
import { Flames } from './flames';
import { PropSystem, type PropBody } from './props';
import { Campfires, type Campfire } from './campfires';
import { ForageField } from './forage';
import { cookResult, isIngredient } from './cooking';

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

/** Dicas mostradas uma vez por jogo. */
const HINTS = {
  fire: 'O fogo se espalha pela grama seca e o vento o empurra. Voe por cima das chamas para subir com o ar quente!',
  stasis: 'Estase Temporal: golpeie o objeto congelado para acumular força. Quando o tempo voltar, ele dispara na direção dos golpes!',
  cut: 'Golpes cortam a grama e os arbustos. Às vezes há moedas e frutas escondidas.',
  apple: 'Golpear um carvalho pode derrubar maçãs. Cozinhe-as numa fogueira!',
  cook: 'Ponha até 4 ingredientes na panela. Combinações diferentes dão pratos com efeitos diferentes.',
} as const;
type HintId = keyof typeof HINTS;

interface InteractiveSave {
  campfires: { id: string; lit: boolean; found: boolean }[];
  forage: [number, number][];
  hints: HintId[];
}

/** Valida/normaliza o que veio do arquivo de salvamento (descarta o que não reconhece). */
export function normalizeInteractiveSave(data: unknown): InteractiveSave {
  if (data === null || typeof data !== 'object') throw new Error('mundo interativo: dados inválidos');
  const d = data as { campfires?: unknown; forage?: unknown; hints?: unknown };
  const campfires: InteractiveSave['campfires'] = [];
  if (Array.isArray(d.campfires)) {
    for (const raw of d.campfires) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as { id?: unknown; lit?: unknown; found?: unknown };
      if (typeof r.id !== 'string' || !CAMPFIRES.some((c) => c.id === r.id)) continue;
      campfires.push({ id: r.id, lit: !!r.lit, found: !!r.found });
    }
  }
  const forage: [number, number][] = [];
  if (Array.isArray(d.forage)) {
    for (const e of d.forage) {
      if (!Array.isArray(e)) continue;
      const i = Number(e[0]);
      const day = Number(e[1]);
      if (Number.isInteger(i) && i >= 0 && i < FORAGE.spots && Number.isFinite(day) && day > 0) forage.push([i, Math.floor(day)]);
    }
  }
  const hints = Array.isArray(d.hints) ? (d.hints.filter((h) => typeof h === 'string' && h in HINTS) as HintId[]) : [];
  return { campfires, forage, hints: [...new Set(hints)] };
}

export class InteractiveWorld implements GameSystem, Saveable {
  readonly name = 'interactive';
  readonly saveKey = 'interactive';
  private ctx!: GameContext;
  grid!: GroundGrid;
  flames!: Flames;
  props!: PropSystem;
  campfires!: Campfires;
  forage!: ForageField;
  private env: GroundEnv = { grassAt: () => 0, wetness: 0, rain: 0, windX: 1, windZ: 0, windStrength: 0 };
  private cutBuf = new Int32Array(96);
  private bushBuf = new Float32Array(32);
  private sparkCd = 0;
  private stasisCd = 0;
  /** Objeto em estase agora (um por vez). */
  stasisTarget: PropBody | null = null;
  private arrow!: THREE.Group;
  private arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd060, transparent: true, opacity: 0.85, depthWrite: false });
  private dmgT = 0;
  private crackleT = 0;
  private smokeT = 0;
  private igniteSfxT = 0;
  private fireLight: LightHandle | null = null;
  private treeShaken = new Map<number, number>();
  private hintsShown = new Set<HintId>();
  private bushT = 0;
  private forageT = 0;
  private time = 0;
  private list: Entity[] = [];
  /** Salvamento lido antes do init (testes, carregamento cedo). */
  private pending: InteractiveSave | null = null;
  /** Fogueira onde a panela está aberta (o menu de cozinhar usa). */
  cookingAt: Campfire | null = null;
  /** Estatísticas (testes/depuração). */
  readonly stats = { cut: 0, bushes: 0, apples: 0, ignitions: 0, sparks: 0, stasis: 0, cooked: 0, lastCooked: '' };

  init(ctx: GameContext) {
    this.ctx = ctx;
    const maps = ctx.sys.world.maps;
    const hf = ctx.heightfield;
    this.env.grassAt = (x, z) => {
      if (hf.heightAt(x, z) < WATER_LEVEL + 0.25) return 0;
      return maps ? maps.grassAt(x, z) : 0;
    };
    this.grid = new GroundGrid(this.env);
    GLOBAL_UNIFORMS.tGround.value = this.grid.texture;
    GLOBAL_UNIFORMS.uGroundRect.value = this.grid.rect;
    this.flames = new Flames(FIRE.maxFlames + 64);
    ctx.scene.add(this.flames.mesh);
    this.props = new PropSystem(ctx);
    this.placeProps();
    this.props.build();
    ctx.scene.add(this.props.group);
    this.props.onBreak = (b, cause) => this.onPropBreak(b, cause);
    this.props.onExplode = (p) => this.ignite(p.x, p.z, 3.5, true);
    this.props.onBurning = (b) => {
      if (Math.random() < 0.05) this.grid.ignite(b.pos.x, b.pos.z, 1.1);
    };
    this.campfires = new Campfires(ctx);
    this.campfires.build();
    this.campfires.onCook = (c) => this.openCooking(c);
    this.forage = new ForageField(ctx);
    this.forage.build();
    this.arrow = buildArrow(this.arrowMat);
    ctx.scene.add(this.arrow);
    registerProjectileVisual('spark', {
      core: 0xffb050,
      coreSize: 0.55,
      trail: { color: 0xff7a2a, width: 0.12, life: 0.22 },
      emitRate: 40,
      emitColor: 0xffa040,
      emitSize: 0.12,
      smoke: true,
      light: { color: 0xff8a3a, intensity: 8 },
      impact: 'fire',
      impactScale: 0.6,
      sound: 'fire_ignite',
    });
    ctx.events.on('world:strike', (s) => this.onStrike(s));
    ctx.events.on('lightning', ({ position }) => {
      if (Math.random() < FIRE.lightningChance) this.ignite(position.x, position.z, FIRE.lightningRadius);
    });
    ctx.events.on('time:hour', () => this.forage.refresh());
    if (this.pending) {
      const p = this.pending;
      this.pending = null;
      this.apply(p);
    }
  }

  // =====================================================================
  // Posicionamento dos objetos
  // =====================================================================
  private placeProps() {
    const ctx = this.ctx;
    const hf = ctx.heightfield;
    let seed = 0x7a11e;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const placed: { x: number; z: number; r: number }[] = [];
    const free = (x: number, z: number, r: number) => {
      if (hf.heightAt(x, z) < WATER_LEVEL + 0.3) return false;
      if (hf.slopeAt(x, z) > 16) return false;
      for (const p of placed) if (Math.hypot(p.x - x, p.z - z) < p.r + r + 0.15) return false;
      const ground = hf.heightAt(x, z);
      for (const c of ctx.physics.near(x, z, r + 2)) {
        if (c.type === 'cylinder') {
          if (c.y1 < ground - 0.5 || c.y0 > ground + 2) continue;
          if (Math.hypot(c.x - x, c.z - z) < c.radius + r + 0.25) return false;
        } else {
          if (c.y + c.hy < ground - 0.5 || c.y - c.hy > ground + 2) continue;
          const lx = (x - c.x) * c.cos - (z - c.z) * c.sin;
          const lz = (x - c.x) * c.sin + (z - c.z) * c.cos;
          if (Math.abs(lx) < c.hx + r + 0.25 && Math.abs(lz) < c.hz + r + 0.25) return false;
        }
      }
      return true;
    };
    const put = (kind: PropKind, x: number, z: number) => {
      const r = PROPS[kind].radius;
      placed.push({ x, z, r });
      const y = ctx.physics.groundHeight(x, z, hf.heightAt(x, z) + 0.5, 0.6, r * 0.6);
      this.props.add(kind, x, y, z, rnd() * Math.PI * 2);
    };
    for (const cl of PROP_CLUSTERS) {
      for (const [k, total] of Object.entries(cl.props) as [PropKind, number][]) {
        let left = total;
        let guard = 0;
        while (left > 0 && guard++ < 200) {
          // pilhas de 1 a 3 juntos
          const a = rnd() * Math.PI * 2;
          const d = Math.sqrt(rnd()) * cl.radius;
          const gx = cl.x + Math.cos(a) * d;
          const gz = cl.z + Math.sin(a) * d;
          const group = Math.min(left, 1 + Math.floor(rnd() * 3));
          for (let i = 0; i < group; i++) {
            const r = PROPS[k].radius;
            const ox = gx + (i === 0 ? 0 : Math.cos(a + i * 2.1) * r * 2.3);
            const oz = gz + (i === 0 ? 0 : Math.sin(a + i * 2.1) * r * 2.3);
            if (!free(ox, oz, r)) continue;
            put(k, ox, oz);
            left--;
          }
        }
      }
    }
    // pedregulhos: no alto de encostas (com descida para rolar)
    for (const area of BOULDER_AREAS) {
      let left = area.count;
      let guard = 0;
      while (left > 0 && guard++ < 600) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * area.radius;
        const x = area.x + Math.cos(a) * d;
        const z = area.z + Math.sin(a) * d;
        const h = hf.heightAt(x, z);
        const slope = hf.slopeAt(x, z);
        if (slope < 6 || slope > 16) continue;
        // precisa de descida: 12 m adiante (no sentido da encosta) bem mais baixo
        const n = hf.normalAt(x, z);
        const nl = Math.hypot(n.x, n.z) || 1;
        const down = hf.heightAt(x + (n.x / nl) * 12, z + (n.z / nl) * 12);
        if (h - down < 2.5) continue;
        if (!free(x, z, PROPS.boulder.radius)) continue;
        put('boulder', x, z);
        left--;
      }
    }
  }

  // =====================================================================
  // Reações a golpes
  // =====================================================================
  private onStrike(s: WorldStrike) {
    const ctx = this.ctx;
    this.props.onStrike(s);
    const info = s.info;
    const fire = info.type === 'fire';
    const o = s.origin;
    const byPlayer = s.source === ctx.sys.player.entity;
    if (s.shape === 'arc') {
      const f = s.dir!;
      const n = this.grid.cutArc(o.x, o.z, f.x, f.z, s.radius + CUT.extraReach, s.arcDeg ?? 120, this.cutBuf);
      if (n > 0) this.onGrassCut(n, o, f, s.radius, byPlayer);
      // arbusto ou árvore no alcance (à frente)
      const cx = o.x + f.x * s.radius * 0.6;
      const cz = o.z + f.z * s.radius * 0.6;
      const nb = ctx.sys.world.scatter.removeBushes(cx, cz, s.radius * 0.5 + BUSHES.reach, this.time + BUSHES.regrow, this.bushBuf, 2);
      for (let i = 0; i < nb; i++) this.onBushCut(i, fire);
      if (byPlayer) this.shakeTree(cx, cz, s.radius * 0.5 + BUSHES.treeReach);
      if (fire) this.ignite(cx, cz, 1.2);
    } else if (s.shape === 'sphere') {
      if (fire) this.ignite(o.x, o.z, Math.max(FIRE.sparkRadius, Math.min(4, s.radius * 0.6)));
      else if (s.radius >= 2.5) {
        // explosões achatam a grama e arrancam arbustos
        const n = this.grid.cutArc(o.x, o.z, 1, 0, s.radius * 0.7, 360, this.cutBuf);
        if (n > 0) this.stats.cut += n;
        const nb = ctx.sys.world.scatter.removeBushes(o.x, o.z, s.radius * 0.6, this.time + BUSHES.regrow, this.bushBuf, 4);
        for (let i = 0; i < nb; i++) this.onBushCut(i, false);
      }
      if (info.type === 'lightning' && Math.random() < FIRE.lightningChance * 0.5) this.ignite(o.x, o.z, 1);
    } else if (fire && s.dir) {
      const L = s.length ?? 0;
      this.ignite(o.x + s.dir.x * L, o.z + s.dir.z * L, 1.2);
    }
    if (fire) {
      const c = this.campfires.near(o.x + (s.dir?.x ?? 0) * (s.shape === 'beam' ? s.length ?? 0 : 0), o.z + (s.dir?.z ?? 0) * (s.shape === 'beam' ? s.length ?? 0 : 0), s.radius + 1.2);
      if (c) this.campfires.light(c);
    }
  }

  private onGrassCut(n: number, o: THREE.Vector3, f: THREE.Vector3, range: number, byPlayer: boolean) {
    const ctx = this.ctx;
    this.stats.cut += n;
    _v.set(o.x + f.x * range * 0.6, ctx.heightfield.heightAt(o.x + f.x * range * 0.6, o.z + f.z * range * 0.6) + 0.3, o.z + f.z * range * 0.6);
    ctx.sys.vfx.burst('leaves', _v, { count: Math.min(18, 4 + n), scale: 0.6, color: 0x7ab84a });
    ctx.sys.audio.play('grass_cut', { position: _v, volume: Math.min(1, 0.4 + n * 0.05) });
    if (!byPlayer) return;
    this.hint('cut');
    // achados (no máximo um por golpe)
    const loot = ctx.sys.inventory.loot;
    for (let i = 0; i < Math.min(n, this.cutBuf.length); i++) {
      const k = this.cutBuf[i];
      const x = this.grid.cellX(k);
      const z = this.grid.cellZ(k);
      const r = Math.random();
      if (r < CUT.goldChance) {
        const [a, b] = CUT.gold;
        loot?.pickups.spawn(null, a + Math.floor(Math.random() * (b - a + 1)), x, ctx.heightfield.heightAt(x, z) + 0.3, z);
        break;
      }
      if (r < CUT.goldChance + CUT.mushroomChance && ctx.heightfield.biomeAt(x, z) === 'forest') {
        loot?.pickups.spawn('cogumelo', 1, x, ctx.heightfield.heightAt(x, z) + 0.3, z);
        break;
      }
    }
  }

  private onBushCut(i: number, burning: boolean) {
    const ctx = this.ctx;
    const x = this.bushBuf[i * 4];
    const y = this.bushBuf[i * 4 + 1];
    const z = this.bushBuf[i * 4 + 2];
    const s = this.bushBuf[i * 4 + 3];
    this.stats.bushes++;
    _v.set(x, y + 0.6 * s, z);
    ctx.sys.vfx.burst('leaves', _v, { count: 22, scale: 1.1 * s, color: burning ? 0x3a2a1a : 0x5a9a3a });
    if (burning) {
      ctx.sys.vfx.burst('fire', _v, { scale: 1.2 * s, count: 18 });
      this.grid.ignite(x, z, 1.8, true);
      return;
    }
    ctx.sys.audio.play('grass_cut', { position: _v, pitch: 0.7, volume: 0.9 });
    const loot = ctx.sys.inventory.loot;
    if (Math.random() < BUSHES.berryChance) loot?.pickups.spawn('frutas_silvestres', 1 + (Math.random() < 0.3 ? 1 : 0), x, y + 0.4, z);
    else if (Math.random() < BUSHES.goldChance) {
      const [a, b] = BUSHES.gold;
      loot?.pickups.spawn(null, a + Math.floor(Math.random() * (b - a + 1)), x, y + 0.4, z);
    }
  }

  private shakeTree(x: number, z: number, r: number) {
    const ctx = this.ctx;
    const t = ctx.sys.world.scatter.treeNear(x, z, r);
    if (!t) return;
    const key = Math.round(t.x * 10) * 100003 + Math.round(t.z * 10);
    _v.set(t.x, t.y + 3.2 * t.s, t.z);
    ctx.sys.vfx.burst('leaves', _v, { count: 16, scale: 1.4, color: t.species === 'pine' ? 0x2a5a3a : 0x5a9a3a });
    if (t.species !== 'oak') return;
    const last = this.treeShaken.get(key);
    if (last !== undefined && this.time - last < BUSHES.appleCooldown) return;
    this.treeShaken.set(key, this.time);
    if (Math.random() > BUSHES.appleChance) return;
    const n = 1 + (Math.random() < 0.35 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      ctx.sys.inventory.loot?.pickups.spawn('maca', 1, t.x + Math.cos(a) * 1.6, t.y + 2.5 * t.s, t.z + Math.sin(a) * 1.6, { scatter: 0.6 });
    }
    this.stats.apples += n;
    this.hint('apple');
  }

  private onPropBreak(b: PropBody, _cause: string) {
    const d = PROPS[b.kind];
    if (!d.gold && !d.drops) return;
    this.props.center(b, _v);
    this.ctx.sys.inventory.loot?.dropRewards(_v, d.gold, d.drops ?? []);
  }

  /** Acende fogo na grama (e objetos inflamáveis perto). Devolve as células acesas. */
  ignite(x: number, z: number, r: number, force = false): number {
    const n = this.grid.ignite(x, z, r, force);
    // objetos no raio
    for (const b of this.props.bodies) {
      if (b.broken || !b.active) continue;
      if (Math.hypot(b.pos.x - x, b.pos.z - z) < r + PROPS[b.kind].radius) this.props.ignite(b);
    }
    if (n > 0) {
      this.stats.ignitions++;
      _v.set(x, this.ctx.heightfield.heightAt(x, z), z);
      if (this.igniteSfxT <= 0) {
        this.igniteSfxT = 0.4;
        this.ctx.sys.audio.play('fire_ignite', { position: _v, volume: 0.8 });
      }
      this.ctx.events.emit('fire:ignited', { position: _v.clone(), cells: n });
    } else if (!this.grid.canIgnite() && r > 0.5) {
      // molhado: só chia e solta vapor
      _v.set(x, this.ctx.heightfield.heightAt(x, z) + 0.3, z);
      this.ctx.sys.vfx.puff(_v, 0xbfc4c8, 0.6, 1.2, 0.4, 1.2);
    }
    return n;
  }

  // =====================================================================
  // Quadro
  // =====================================================================
  update(dt: number, ctx: GameContext) {
    this.time += dt;
    const pl = ctx.sys.player;
    const pp = pl.entity.position;
    const env = ctx.sys.env;
    const e = this.env;
    e.wetness = env.wetness;
    e.rain = env.indoors ? 0 : env.rainIntensity;
    const wd = GLOBAL_UNIFORMS.uWindDir.value;
    e.windX = wd.x;
    e.windZ = wd.y;
    e.windStrength = env.windStrength;
    this.grid.recenter(pp.x, pp.z);
    this.grid.update(dt, CUT.regrow, FIRE.regrowBurnt);
    this.handleIgnitions();
    // chamas
    const fl = this.flames;
    fl.begin();
    this.drawGrassFire();
    this.props.update(dt, fl, env.wetness);
    this.campfires.update(dt, fl, e.rain);
    fl.end();
    this.fireEffects(dt);
    // poderes
    this.sparkCd = Math.max(0, this.sparkCd - dt);
    this.stasisCd = Math.max(0, this.stasisCd - dt);
    this.igniteSfxT -= dt;
    if (ctx.state === 'playing' && ctx.input.gameplayEnabled) {
      if (ctx.input.pressed('spark')) this.castSpark();
      if (ctx.input.pressed('stasis')) this.castStasis();
    }
    this.updateArrow();
    // arbustos voltam, cogumelos renascem
    this.bushT -= dt;
    if (this.bushT <= 0) {
      this.bushT = 5;
      ctx.sys.world.scatter.regrowBushes(this.time);
    }
    this.forageT -= dt;
    if (this.forageT <= 0) {
      this.forageT = 20;
      this.forage.refresh();
    }
  }

  /** Células que acabaram de pegar fogo: queimam arbustos e objetos por cima. */
  private handleIgnitions() {
    const g = this.grid;
    if (!g.ignitedCount) return;
    const scatter = this.ctx.sys.world.scatter;
    for (let i = 0; i < g.ignitedCount; i++) {
      const k = g.ignited[i];
      const x = g.cellX(k);
      const z = g.cellZ(k);
      if (Math.random() < 0.3) {
        const nb = scatter.removeBushes(x, z, 0.8, this.time + BUSHES.regrow, this.bushBuf, 1);
        if (nb) this.onBushCut(0, true);
      }
      for (const b of this.props.bodies) {
        if (b.broken || !b.active) continue;
        if (Math.abs(b.pos.x - x) < PROPS[b.kind].radius + 0.4 && Math.abs(b.pos.z - z) < PROPS[b.kind].radius + 0.4) this.props.ignite(b);
      }
    }
    g.ignitedCount = 0;
  }

  private drawGrassFire() {
    const g = this.grid;
    const n = g.burningCount;
    if (!n) return;
    const cells = g.burningCells();
    const hf = this.ctx.heightfield;
    // ~40% das células ganham uma língua de fogo (as demais brilham na grama e no chão)
    const stride = Math.max(1, Math.ceil((n * 0.4) / FIRE.maxFlames));
    for (let i = 0; i < n; i += stride) {
      const k = cells[i];
      const h0 = Math.sin(k * 3.7719) * 9131.77;
      if (h0 - Math.floor(h0) > 0.4 * stride) continue;
      const h1 = Math.sin(k * 12.9898) * 43758.5453;
      const j1 = h1 - Math.floor(h1) - 0.5;
      const h2 = Math.sin(k * 78.233) * 12543.123;
      const j2 = h2 - Math.floor(h2) - 0.5;
      const x = g.cellX(k) + j1 * g.cell * 0.8;
      const z = g.cellZ(k) + j2 * g.cell * 0.8;
      const s = (0.35 + 0.6 * g.flameAt(k) * Math.min(1, g.grass[k] + 0.2)) * (stride > 1 ? 1.2 : 1);
      this.flames.push(x, hf.heightAt(x, z) - 0.05, z, s);
    }
  }

  private fireEffects(dt: number) {
    const ctx = this.ctx;
    const g = this.grid;
    const pl = ctx.sys.player;
    const pp = pl.entity.position;
    const n = g.burningCount;
    // corrente de ar quente
    let lift = 0;
    if (n && pl.state === 'flight') {
      const heat = g.heatAt(pp.x, pp.z, 2.6);
      const hag = pp.y - ctx.heightfield.heightAt(pp.x, pp.z);
      if (heat > 0.05 && hag < FIRE.updraftHeight) lift = FIRE.updraft * Math.min(1, heat * 2.5) * (1 - hag / FIRE.updraftHeight);
    }
    pl.externalLift = lift;
    if (!n) {
      if (this.fireLight) {
        this.fireLight.cancel();
        this.fireLight = null;
      }
      return;
    }
    const cells = g.burningCells();
    const c = g.fireCenter;
    const dist = Math.hypot(c.x - pp.x, c.z - pp.z);
    if (dist < g.fireRadius + 30) this.hint('fire');
    // luz do incêndio
    _v.set(c.x, this.ctx.heightfield.heightAt(c.x, c.z) + 1.5, c.z);
    const inten = Math.min(1, n / 40) * 34 + 6;
    if (!this.fireLight && dist < 120) this.fireLight = ctx.sys.vfx.sustainedLight(_v, 0xff7a2a, inten, 1e6, null, g.fireRadius + 14);
    if (this.fireLight) {
      this.fireLight.setPosition(_v);
      this.fireLight.setIntensity(inten * (0.85 + 0.15 * Math.sin(this.time * 11)));
    }
    // fumaça e estalos
    this.smokeT -= dt;
    if (this.smokeT <= 0) {
      this.smokeT = Math.max(0.05, 0.3 - n * 0.002);
      const k = cells[Math.floor(Math.random() * n)];
      const x = g.cellX(k);
      const z = g.cellZ(k);
      _v2.set(x, ctx.heightfield.heightAt(x, z) + 1.2, z);
      ctx.sys.vfx.puff(_v2, 0x2e2a28, 1.2 + Math.random(), 3.5, 0.3, 1.6);
      if (Math.random() < 0.5) ctx.sys.vfx.spark(_v2, 0xffa040, 0.06, 1.2, (Math.random() - 0.5) * 1.5, 3 + Math.random() * 2, (Math.random() - 0.5) * 1.5, -1, 0);
    }
    this.crackleT -= dt;
    if (this.crackleT <= 0 && dist < g.fireRadius + 40) {
      this.crackleT = Math.max(0.12, 0.5 - n * 0.004);
      const k = cells[Math.floor(Math.random() * n)];
      _v2.set(g.cellX(k), pp.y, g.cellZ(k));
      ctx.sys.audio.play('amb_crackle', { position: _v2, volume: 0.9 });
    }
    // dano a quem está no fogo (jogador, inimigos, criaturas)
    this.dmgT -= dt;
    if (this.dmgT <= 0) {
      this.dmgT = FIRE.damageInterval;
      const list = ctx.entities.queryRadius(c, g.fireRadius + 3, this.list);
      for (const ent of list) {
        if (!ent.health || !ent.alive || ent.kind === 'npc' || ent.kind === 'projectile' || ent.kind === 'pickup') continue;
        const gy = ctx.heightfield.heightAt(ent.position.x, ent.position.z);
        if (ent.position.y - gy > 1.5) continue;
        if (!g.isBurning(ent.position.x, ent.position.z) && g.heatAt(ent.position.x, ent.position.z, ent.radius + 0.3) < 0.3) continue;
        ctx.sys.combat.applyDamage(ent, {
          amount: FIRE.dps * FIRE.damageInterval,
          type: 'fire',
          statuses: [{ id: 'burn', duration: FIRE.burnStatus.duration, magnitude: FIRE.burnStatus.dps }],
          tag: 'incendio',
          source: null,
        });
      }
    }
  }

  // =====================================================================
  // Centelha e Estase
  // =====================================================================
  castSpark(): boolean {
    const ctx = this.ctx;
    const pl = ctx.sys.player;
    if (this.sparkCd > 0 || !pl.canAct() || pl.isBusy()) return false;
    if (pl.isSwimming()) {
      ctx.sys.ui.notify('Não dá para acender fogo dentro da água.', 'warning');
      return false;
    }
    if (!pl.spendEnergy(SPARK.energy)) {
      ctx.sys.ui.notify('Energia insuficiente.', 'warning');
      ctx.sys.audio.play('ui_error');
      return false;
    }
    this.sparkCd = SPARK.cooldown;
    const e = pl.entity;
    const origin = _v.copy(e.position);
    e.getForward(_v2);
    origin.addScaledVector(_v2, 0.5);
    origin.y += 1.45;
    const aim = pl.getAimPoint(SPARK.range, _v3);
    const dir = aim.sub(origin);
    if (dir.lengthSq() < 0.25) dir.copy(_v2);
    dir.normalize();
    ctx.sys.combat.spawnProjectile({
      kind: 'spark',
      source: e,
      origin: origin.clone(),
      direction: dir.clone(),
      speed: SPARK.speed,
      range: SPARK.range,
      radius: 0.15,
      gravity: 9,
      color: 0xff8a30,
      damage: { amount: SPARK.damage, type: 'fire', statuses: [{ id: 'burn', duration: SPARK.burn.duration, magnitude: SPARK.burn.dps }], tag: 'centelha', source: e },
    });
    if (!pl.isFlying()) pl.playAnimation('cast', { speed: 1.7 });
    ctx.sys.audio.play('fire_ignite', { position: origin, volume: 0.45, pitch: 1.6 });
    this.stats.sparks++;
    return true;
  }

  castStasis(): boolean {
    const ctx = this.ctx;
    const pl = ctx.sys.player;
    if (!pl.canAct()) return false;
    if (this.stasisCd > 0) {
      ctx.sys.ui.notify(`Estase em recarga (${this.stasisCd.toFixed(1).replace('.', ',')} s).`, 'warning');
      return false;
    }
    const cam = ctx.camera;
    cam.getWorldDirection(_v2);
    const camDist = cam.position.distanceTo(pl.entity.position);
    const b = this.props.pick(cam.position, _v2, STASIS.range + camDist, STASIS.aimDeg);
    if (!b) {
      ctx.sys.ui.notify('Mire num objeto (barril, caixote, pedregulho...) para congelá-lo no tempo.', 'info');
      ctx.sys.audio.play('ui_error');
      return false;
    }
    if (!pl.spendEnergy(STASIS.energy)) {
      ctx.sys.ui.notify('Energia insuficiente.', 'warning');
      ctx.sys.audio.play('ui_error');
      return false;
    }
    this.freeze(b);
    return true;
  }

  /** Congela um objeto (também usado por testes). */
  freeze(b: PropBody) {
    const ctx = this.ctx;
    const prev = this.stasisTarget;
    if (prev && prev !== b && prev.stasis > 0) prev.stasis = 0.0001;
    this.props.freeze(b);
    this.stasisTarget = b;
    this.stasisCd = STASIS.cooldown;
    this.stats.stasis++;
    const c = this.props.center(b, _v);
    ctx.sys.vfx.runeCircle(_v2.copy(c).setY(b.pos.y + 0.05), PROPS[b.kind].radius + 0.7, 0xffd060, 1.2);
    _v3.copy(ctx.sys.player.entity.position);
    _v3.y += 1.5;
    ctx.sys.vfx.beam(_v3, c, 0xffd060, 0.06, 0.25);
    ctx.sys.audio.play('stasis', { position: c });
    if (!ctx.sys.player.isFlying()) ctx.sys.player.playAnimation('cast', { speed: 1.4 });
    this.hint('stasis');
  }

  private updateArrow() {
    const b = this.stasisTarget;
    const a = this.arrow;
    if (!b || b.stasis <= 0 || b.broken) {
      a.visible = false;
      if (b && b.stasis <= 0) this.stasisTarget = null;
      return;
    }
    const L = b.stasisImp.length();
    if (L < 0.5) {
      a.visible = false;
      return;
    }
    a.visible = true;
    this.props.center(b, a.position);
    _v.copy(b.stasisImp).multiplyScalar(1 / L);
    _q.setFromUnitVectors(UP, _v);
    a.quaternion.copy(_q);
    const k = Math.min(1, L / STASIS.maxLaunch);
    const len = PROPS[b.kind].radius + 0.6 + k * 3.2;
    a.scale.set(1 + k * 0.6, len, 1 + k * 0.6);
    this.arrowMat.color.setRGB(1, 0.85 - 0.7 * k, 0.35 - 0.3 * k);
  }

  // =====================================================================
  // Cozinha
  // =====================================================================
  private openCooking(c: Campfire) {
    this.cookingAt = c;
    this.hint('cook');
    this.ctx.sys.ui.openMenu('cooking');
  }

  /** Ingredientes que o jogador tem (id → quantidade). */
  availableIngredients(): { itemId: string; qty: number }[] {
    const inv = this.ctx.sys.inventory;
    const out: { itemId: string; qty: number }[] = [];
    for (const id of Object.keys(ITEMS)) {
      if (!isIngredient(id)) continue;
      const n = inv.count(id);
      if (n > 0) out.push({ itemId: id, qty: n });
    }
    return out;
  }

  /** Cozinha (consome os ingredientes). Devolve o item feito ou null. */
  cook(ingredients: string[]): string | null {
    const ctx = this.ctx;
    const inv = ctx.sys.inventory;
    if (!ingredients.length || ingredients.length > MAX_INGREDIENTS) return null;
    const need = new Map<string, number>();
    for (const id of ingredients) {
      if (!isIngredient(id)) return null;
      need.set(id, (need.get(id) ?? 0) + 1);
    }
    for (const [id, n] of need) if (inv.count(id) < n) return null;
    const result = cookResult(ingredients);
    if (!inv.canAdd(result, 1) && !ingredients.includes(result)) {
      ctx.sys.ui.notify('Inventário cheio.', 'warning');
      return null;
    }
    for (const [id, n] of need) inv.remove(id, n);
    inv.add(result, 1, { silent: true });
    this.stats.cooked++;
    this.stats.lastCooked = result;
    ctx.sys.audio.play('cook');
    const at = this.cookingAt?.pos ?? ctx.sys.player.entity.position;
    _v.copy(at).setY(at.y + 0.8);
    ctx.sys.vfx.burst('fire', _v, { scale: 0.6, count: 12 });
    ctx.sys.vfx.puff(_v, 0xd8d0c8, 1, 1.6, 0.45, 1.2);
    ctx.sys.progression.addXp(result === 'comida_duvidosa' ? 1 : 6, 'cozinhar');
    ctx.events.emit('cooking:done', { itemId: result, ingredients: [...ingredients] });
    return result;
  }

  // =====================================================================
  // Dicas, salvamento, novo jogo
  // =====================================================================
  private hint(id: HintId) {
    if (this.hintsShown.has(id)) return;
    this.hintsShown.add(id);
    this.ctx.sys.ui.notify(HINTS[id], 'info');
  }

  onNewGame() {
    this.grid.reset();
    this.props.reset();
    this.campfires.reset();
    this.forage.reset();
    this.ctx.sys.world.scatter.resetBushes();
    this.treeShaken.clear();
    this.hintsShown.clear();
    this.stasisTarget = null;
    this.sparkCd = 0;
    this.stasisCd = 0;
    this.ctx.sys.player.externalLift = 0;
  }

  serialize(): InteractiveSave {
    if (!this.campfires) return this.pending ?? { campfires: [], forage: [], hints: [...this.hintsShown] };
    return {
      campfires: this.campfires.serialize(),
      forage: this.forage.serialize(),
      hints: [...this.hintsShown],
    };
  }

  deserialize(data: unknown) {
    const d = normalizeInteractiveSave(data);
    if (!this.campfires) {
      this.pending = d;
      this.hintsShown = new Set(d.hints);
      return;
    }
    this.apply(d);
  }

  private apply(d: InteractiveSave) {
    this.grid.reset();
    this.props.reset();
    this.campfires.deserialize(d.campfires);
    this.forage.deserialize(d.forage);
    this.hintsShown = new Set(d.hints);
    this.stasisTarget = null;
  }

  dispose() {
    this.props.dispose();
    this.flames.dispose();
  }
}

function buildArrow(mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 8).translate(0, 0.375, 0), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.25, 10).translate(0, 0.875, 0), mat);
  g.add(shaft, head);
  g.name = 'seta-estase';
  g.visible = false;
  g.renderOrder = 20;
  return g;
}
