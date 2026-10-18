import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { SurfaceType } from '../core/EventBus';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { damp } from '../core/math';
import { LOCATIONS, LOCATION_BY_ID, BIOME_INFO, GATES, PLAYABLE_HALF, WATER_LEVEL, LOCATION_CHECKPOINTS, type BiomeId, type LocationDef } from '../data/world';
import { PLACES } from '../data/places';
import { WorldMaps } from './maps';
import { Terrain } from './terrain';
import { Water } from './water';
import { GrassField } from './grass';
import { terrainDetailTexture, waterNormalTexture } from './textures';
import { Scatter } from './vegetation/scatter';
import { AmbientParticles } from './vegetation/particles';
import { SiteKit, inZone, type LightSpec } from './structures/kit';
import { GateSystem } from './structures/gates';
import { buildVillage } from './structures/village';
import { buildCrypt } from './structures/crypt';
import { buildRuins, buildArena } from './structures/ruins';
import { buildCamp, buildTower, buildFerroluz } from './structures/outposts';
import { buildIslands } from './structures/sky';
import { buildLab, buildCrystalShrine, buildCanyonArches, buildBridges, buildSigns, buildSwampProps } from './structures/landmarks';
import { findPath as navFindPath, villageNav } from './nav';
import { yieldFrame } from './maps';

/** Quantas luzes pontuais reais o mundo usa (posicionadas nas fontes mais próximas). */
const LIGHT_SLOTS = 2;

/**
 * Mundo aberto: terreno em quadtree com LOD na GPU (1 draw call), água animada,
 * grama/flores interativas na GPU, árvores/arbustos/pedras por chunk com
 * streaming e LOD, partículas ambientes, estruturas procedurais com colisores,
 * portões animados, zonas de superfície/interior, âncoras e navegação da vila.
 *
 * Portões (setGateOpen): ver GATES em src/data/world.ts —
 * 'portao_brumafria_leste', 'portao_brumafria_sul', 'porta_cripta',
 * 'portao_ruinas', 'arena_guardiao', 'porta_torre', 'portao_ferroluz', 'portao_corvos'.
 */
export class World implements GameSystem, Saveable {
  readonly name = 'world';
  readonly saveKey = 'world';
  /** Locais já descobertos (ids). */
  discovered = new Set<string>();
  /** Local em que o jogador está agora (ou null). */
  currentLocation: LocationDef | null = null;
  protected ctx!: GameContext;

  /** Mapas do mundo (cor, dados, altura, normais) — úteis para outros módulos (minimapa, IA). */
  maps!: WorldMaps;
  terrain!: Terrain;
  water!: Water;
  grass!: GrassField;
  scatter!: Scatter;
  particles!: AmbientParticles;
  gates!: GateSystem;
  /** Raiz de tudo que o mundo adiciona na cena. */
  readonly root = new THREE.Group();
  /** Atalho para os uniforms globais (depuração/automação: window.__game.sys.world.uniforms). */
  readonly uniforms = GLOBAL_UNIFORMS;
  private structureMeshes: THREE.Mesh[] = [];
  private kit!: SiteKit;
  private lightSpecs: LightSpec[] = [];
  private lightSlots: THREE.PointLight[] = [];
  private barrier!: THREE.Mesh;
  private barrierUniforms = { uPlayer: { value: new THREE.Vector3() }, uTime: GLOBAL_UNIFORMS.uTime, uHalf: { value: PLAYABLE_HALF } };
  private hookFn: ((...a: unknown[]) => void) | null = null;
  private lastPreFrame = -1;
  private lastPreTime = 0;
  private corruption = 0;
  private tmpV = new THREE.Vector3();
  private surfaceCache: SurfaceType = 'grass';
  /** Pico do tempo (ms) do pré-render do mundo (medição de travadas do streaming). */
  peakPreMs = 0;

  async init(ctx: GameContext) {
    this.ctx = ctx;
    const hf = ctx.heightfield;
    const ui = ctx.sys.ui as unknown as { showLoading?: (f: number, t: string) => void };
    const progress = (f: number, t: string) => ui.showLoading?.(0.45 + f * 0.3, t);
    this.root.name = 'mundo';
    this.root.matrixAutoUpdate = false;
    ctx.scene.add(this.root);

    progress(0.0, 'Pintando os biomas…');
    this.maps = new WorldMaps(hf);
    await this.maps.generate((f) => progress(f * 0.35, 'Pintando os biomas…'));

    // Estruturas primeiro: registram pegadas/ruas nos mapas antes do upload.
    progress(0.4, 'Erguendo a Vila de Brumafria…');
    await yieldFrame();
    this.kit = new SiteKit(ctx.physics, hf, this.maps);
    this.gates = new GateSystem(ctx.physics);
    buildVillage(this.kit, this.gates);
    progress(0.55, 'Despertando a cripta e as ruínas…');
    await yieldFrame();
    buildCrypt(this.kit, this.gates);
    buildRuins(this.kit, this.gates);
    buildArena(this.kit, this.gates);
    progress(0.65, 'Fortificando Ferroluz…');
    await yieldFrame();
    buildCamp(this.kit, this.gates);
    buildTower(this.kit, this.gates);
    buildFerroluz(this.kit, this.gates);
    buildIslands(this.kit);
    buildLab(this.kit);
    buildCrystalShrine(this.kit);
    buildCanyonArches(this.kit);
    buildBridges(this.kit);
    buildSwampProps(this.kit);
    const signs = buildSigns(this.kit, this.root);
    this.structureMeshes.push(signs);
    progress(0.75, 'Assentando o relevo…');
    await yieldFrame();
    this.maps.upload();
    this.kit.finish(this.root);
    this.structureMeshes.push(...this.kit.meshes);
    this.root.add(this.gates.root);
    this.lightSpecs = this.kit.lights;

    const detail = terrainDetailTexture();
    this.terrain = new Terrain(hf, this.maps, detail);
    this.root.add(this.terrain.mesh, this.terrain.horizon);
    progress(0.85, 'Enchendo rios e lagos…');
    await yieldFrame();
    this.water = new Water(hf, this.maps, waterNormalTexture());
    this.root.add(this.water.group);
    this.grass = new GrassField(this.maps);
    this.root.add(this.grass.mesh, this.grass.flowers);
    this.scatter = new Scatter(hf, this.maps, ctx.physics);
    this.root.add(this.scatter.group);
    this.particles = new AmbientParticles(this.maps);
    this.root.add(this.particles.points);
    this.barrier = this.createBarrier();
    this.root.add(this.barrier);
    for (let i = 0; i < LIGHT_SLOTS; i++) {
      const l = new THREE.PointLight(0xffa060, 0, 12, 2);
      l.castShadow = false;
      l.name = `luz_mundo_${i}`;
      this.lightSlots.push(l);
      this.root.add(l);
    }
    villageNav(); // grafo da vila pronto antes do primeiro pedido dos NPCs
    this.applySettings();
    ctx.events.on('settings:changed', () => this.applySettings());
    this.installHook();
    progress(1, 'Mundo pronto');
  }

  private applySettings() {
    const q = this.ctx.settings.q;
    this.grass.configure(q);
    this.scatter.configure(q);
    this.particles.configure(q);
    this.particles.setPixelScale(this.ctx.renderer.domElement.height || innerHeight);
    this.lightSlots.forEach((l, i) => (l.visible = i < Math.max(1, Math.min(LIGHT_SLOTS, q.maxDynamicLights - 1))));
  }

  /** Encadeia o pré-render da cena (seleção de LOD com a câmera já posicionada no quadro). */
  private installHook() {
    const scene = this.ctx.scene as unknown as { onBeforeRender: (...a: unknown[]) => void };
    if (this.hookFn && scene.onBeforeRender === this.hookFn) return;
    const prev = scene.onBeforeRender;
    const fn = (...a: unknown[]) => {
      prev.apply(scene, a);
      this.preRender(a[2] as THREE.Camera);
    };
    this.hookFn = fn;
    scene.onBeforeRender = fn;
  }

  /** Trabalho dependente da câmera do quadro (roda em qualquer estado, inclusive menu). */
  private preRender(camera: THREE.Camera) {
    const ctx = this.ctx;
    if (camera !== ctx.camera || this.lastPreFrame === ctx.frame) return;
    this.lastPreFrame = ctx.frame;
    const t0 = performance.now();
    const dt = Math.min(0.1, Math.max(0, ctx.elapsed - this.lastPreTime));
    this.lastPreTime = ctx.elapsed;
    const q = ctx.settings.q;
    const cam = camera.position;
    this.terrain.update(camera, q);
    this.grass.update(cam.x, cam.z);
    const pp = ctx.state === 'menu' ? cam : ctx.sys.player.position;
    this.scatter.update(dt, cam.x, cam.z, pp.x, pp.z, q);
    // culling por distância das malhas de detalhe
    for (const m of this.structureMeshes) {
      const md = m.userData.maxDist as number | undefined;
      if (md === undefined || md === Infinity || !m.geometry.boundingSphere) continue;
      const s = m.geometry.boundingSphere;
      m.visible = cam.distanceTo(s.center) - s.radius < md;
    }
    this.updateLights(cam.x, cam.y, cam.z);
    const ms = performance.now() - t0;
    if (ctx.state === 'playing' && ms > this.peakPreMs) this.peakPreMs = ms;
    ctx.sys.perf?.measure('world.render', ms);
  }

  /** Move as poucas luzes reais para as fontes mais próximas (lareiras, forja, altar...). */
  private updateLights(x: number, y: number, z: number) {
    const night = GLOBAL_UNIFORMS.uNight.value;
    const t = this.ctx.elapsed;
    const best: [number, number][] = [];
    for (let i = 0; i < this.lightSpecs.length; i++) {
      const s = this.lightSpecs[i];
      const d = Math.hypot(s.x - x, s.y - y, s.z - z);
      if (d > 60) continue;
      best.push([d, i]);
    }
    best.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < this.lightSlots.length; k++) {
      const l = this.lightSlots[k];
      const e = best[k];
      if (!e || !l.visible) {
        l.intensity = 0;
        continue;
      }
      const s = this.lightSpecs[e[1]];
      l.position.set(s.x, s.y, s.z);
      l.color.setHex(s.color);
      l.distance = s.distance;
      const fade = 1 - Math.min(1, Math.max(0, (e[0] - 40) / 20));
      let k2 = 1;
      if (s.mode === 'night') k2 = 0.15 + 0.85 * night;
      else if (s.mode === 'flicker') k2 = 0.82 + 0.1 * Math.sin(t * 13 + k) + 0.08 * Math.sin(t * 23.7 + k * 3);
      l.intensity = s.intensity * k2 * fade;
    }
  }

  update(dt: number, ctx: GameContext) {
    this.installHook();
    this.gates.update(dt);
    const p = ctx.sys.player.position;
    let found: LocationDef | null = null;
    for (const l of LOCATIONS) {
      const d = Math.hypot(p.x - l.x, p.z - l.z);
      if (d < l.discoverRadius && !this.discovered.has(l.id)) this.discover(l.id);
      if (d < l.radius && l.kind !== 'region' && (!found || l.radius < found.radius)) found = l;
    }
    if (found !== this.currentLocation) {
      this.currentLocation = found;
      if (found) {
        ctx.events.emit('location:entered', { locationId: found.id, name: found.name });
        // checkpoint automático (ponto seguro do local) — só com o jogador vivo
        const cpId = LOCATION_CHECKPOINTS[found.id];
        const cp = cpId ? PLACES[cpId] : undefined;
        const pl = ctx.sys.player;
        if (cp && pl.state !== 'dead' && pl.entity.alive) pl.setCheckpoint(cp.x, cp.z, cp.yaw ?? pl.entity.yaw);
      }
    }
    // corrupção perto do jogador (para efeitos de tela/terreno de outros módulos)
    this.corruption = damp(this.corruption, this.maps.corruptionAt(p.x, p.z), 1.5, dt);
    GLOBAL_UNIFORMS.uCorruption.value = this.corruption;
    // partículas ambientes por bioma
    const biome = ctx.heightfield.biomeAt(p.x, p.z);
    const ground = ctx.heightfield.heightAt(p.x, p.z);
    this.particles.update(dt, p.x, p.y, p.z, this.isIndoors(p) ? 'village' : biome, GLOBAL_UNIFORMS.uNight.value, p.y - ground);
    // barreira arcana visível só perto do limite
    (this.barrierUniforms.uPlayer.value as THREE.Vector3).copy(p);
    const edge = PLAYABLE_HALF - Math.max(Math.abs(p.x), Math.abs(p.z));
    this.barrier.visible = edge < 45;
    this.surfaceCache = this.surfaceAt(p.x, p.z, p.y);
  }

  discover(id: string) {
    const l = LOCATIONS.find((x) => x.id === id);
    if (!l || this.discovered.has(id)) return;
    this.discovered.add(id);
    this.ctx.events.emit('location:discovered', { locationId: id, name: l.name });
  }

  /**
   * Tipo de superfície (passos, partículas). `y` opcional: sem ele, usa a altura
   * do jogador quando o ponto está perto dele (caso comum: passos), senão o relevo.
   */
  surfaceAt(x: number, z: number, y?: number): SurfaceType {
    const ctx = this.ctx;
    let yy = y;
    if (yy === undefined) {
      const pp = ctx.sys.player?.position;
      yy = pp && Math.abs(pp.x - x) < 3 && Math.abs(pp.z - z) < 3 ? pp.y : ctx.heightfield.heightAt(x, z);
    }
    // colisor caminhável logo abaixo (pisos, pontes, telhados) com superfície definida
    for (const c of ctx.physics.near(x, z, 0.5)) {
      if (!c.walkable || !c.surface) continue;
      const top = c.type === 'cylinder' ? c.y1 : c.y + c.hy;
      if (Math.abs(top - yy) > 0.45) continue;
      if (c.type === 'cylinder') {
        if ((x - c.x) ** 2 + (z - c.z) ** 2 > c.radius * c.radius) continue;
      } else {
        const lx = (x - c.x) * c.cos - (z - c.z) * c.sin;
        const lz = (x - c.x) * c.sin + (z - c.z) * c.cos;
        if (Math.abs(lx) > c.hx || Math.abs(lz) > c.hz) continue;
      }
      return c.surface as SurfaceType;
    }
    if (this.kit) for (const zn of this.kit.surfaces) if (inZone(zn, x, yy, z)) return zn.surface;
    const ground = ctx.heightfield.heightAt(x, z);
    if (ground < WATER_LEVEL - 0.2 && yy < WATER_LEVEL + 0.5) return 'water';
    if (this.maps && this.maps.roadAt(x, z) > 0.5 && yy < ground + 0.6) return 'dirt';
    return BIOME_INFO[ctx.heightfield.biomeAt(x, z)].surface;
  }

  /** Superfície sob o jogador no último update (barato para áudio de passos). */
  get playerSurface(): SurfaceType {
    return this.surfaceCache;
  }

  /** Está dentro de um interior coberto (taverna, arquivo, mausoléu, térreo da torre, laboratório...)? */
  isIndoors(pos: { x: number; y: number; z: number }): boolean {
    if (!this.kit) return false;
    for (const zn of this.kit.indoors) if (inZone(zn, pos.x, pos.y, pos.z)) return true;
    return false;
  }

  /** Id do interior em que a posição está (ou null). */
  indoorId(pos: { x: number; y: number; z: number }): string | null {
    if (!this.kit) return null;
    for (const zn of this.kit.indoors) if (inZone(zn, pos.x, pos.y, pos.z)) return zn.id;
    return null;
  }

  /** Bioma em (x,z). */
  biomeAt(x: number, z: number): BiomeId {
    return this.ctx.heightfield.biomeAt(x, z);
  }

  /**
   * Posição de uma âncora de src/data/places.ts. Sem `y` na âncora, aplica o chão
   * (terreno + pisos caminháveis). Retorna null se o id não existir.
   */
  placePosition(id: string, out = new THREE.Vector3()): THREE.Vector3 | null {
    const p = PLACES[id];
    if (!p) return null;
    // chão a partir do relevo (+1,6 m): pega pisos de interiores/pontes, não telhados
    const y = p.y ?? this.ctx.physics.groundHeight(p.x, p.z, this.ctx.heightfield.heightAt(p.x, p.z) + 1.6);
    return out.set(p.x, y, p.z);
  }

  /** Caminho pela vila (ruas, portas e interiores) entre âncoras/nós ou coordenadas. */
  findPath(from: string | { x: number; z: number }, to: string | { x: number; z: number }): { x: number; z: number }[] | null {
    return navFindPath(from, to);
  }

  /** Abre/fecha portões controlados pela história (ex.: 'portao_ferroluz'). Ids em GATES (data/world.ts). */
  setGateOpen(gateId: string, open: boolean) {
    if (!this.gates?.set(gateId, open)) console.warn(`[World] portão desconhecido: ${gateId}`);
  }

  isGateOpen(gateId: string): boolean {
    return this.gates?.gates.get(gateId)?.open ?? false;
  }

  /** Ids dos portões registrados. */
  gateIds(): string[] {
    return this.gates ? [...this.gates.gates.keys()] : GATES.map((g) => g.id);
  }

  /** Centro de um local por id (atalho para LOCATION_BY_ID). */
  location(id: string): LocationDef | undefined {
    return LOCATION_BY_ID[id];
  }

  /** Estatísticas de depuração (draw calls do mundo, nós de terreno, instâncias...). */
  debugStats() {
    const visibleStructures = this.structureMeshes.filter((m) => m.visible).length;
    return {
      terrainNodes: this.terrain.drawnNodes,
      terrainLevels: [...this.terrain.levelCounts],
      scatterChunks: this.scatter.stats.chunks,
      scatterInstances: this.scatter.stats.instances,
      scatterDraws: this.scatter.drawCalls,
      scatterPeakBuildMs: +this.scatter.stats.peakBuildMs.toFixed(2),
      scatterPeakAssembleMs: +this.scatter.stats.peakAssembleMs.toFixed(2),
      vegColliders: this.scatter.activeColliderCount(),
      structureMeshes: this.structureMeshes.length,
      visibleStructures,
      gates: this.gates.gates.size,
      colliders: this.ctx.physics.count,
      grassInstances: this.grass.instanceCount,
      peakPreMs: +this.peakPreMs.toFixed(2),
    };
  }

  /** Parede arcana translúcida no limite jogável (aparece só perto). */
  private createBarrier(): THREE.Mesh {
    const H = PLAYABLE_HALF;
    const g = new THREE.BufferGeometry();
    const pos: number[] = [];
    const idx: number[] = [];
    const corners: [number, number][] = [
      [-H, -H],
      [H, -H],
      [H, H],
      [-H, H],
    ];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i];
      const [bx, bz] = corners[(i + 1) % 4];
      const base = pos.length / 3;
      pos.push(ax, -50, az, bx, -50, bz, bx, 520, bz, ax, 520, az);
      idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.barrierUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vW;
        void main() { vW = position; gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uPlayer;
        uniform float uTime;
        varying vec3 vW;
        void main() {
          float d = length(vW - uPlayer);
          float near = 1.0 - smoothstep(6.0, 40.0, d);
          vec2 p = vec2(vW.x + vW.z, vW.y) * 0.45;
          vec2 g = abs(fract(p + vec2(0.0, uTime * 0.15)) - 0.5);
          float hex = smoothstep(0.46, 0.5, max(g.x, g.y));
          float rune = smoothstep(0.92, 1.0, sin(p.x * 3.1 + uTime) * sin(p.y * 2.3 - uTime * 0.7));
          float a = near * (0.12 + hex * 0.5 + rune * 0.6);
          if (a < 0.005) discard;
          gl_FragColor = vec4(vec3(0.45, 0.7, 1.0) * a, a);
        }
      `,
    });
    const m = new THREE.Mesh(g, mat);
    m.name = 'barreira_arcana';
    m.frustumCulled = false;
    m.visible = false;
    m.renderOrder = 3;
    return m;
  }

  onNewGame() {
    this.discovered.clear();
    this.currentLocation = null;
    this.gates?.reset();
  }

  serialize() {
    const gates: Record<string, boolean> = {};
    if (this.gates) for (const [id, g] of this.gates.gates) gates[id] = g.open;
    return { discovered: [...this.discovered], gates };
  }

  deserialize(data: any) {
    this.discovered = new Set(Array.isArray(data?.discovered) ? data.discovered.filter((s: unknown) => typeof s === 'string' && !!LOCATION_BY_ID[s as string]) : []);
    if (this.gates) {
      this.gates.reset();
      const gs = data?.gates;
      if (gs && typeof gs === 'object') for (const [id, open] of Object.entries(gs)) if (typeof open === 'boolean') this.gates.set(id, open, true);
    }
  }

  dispose() {
    this.terrain?.dispose();
    this.water?.dispose();
    this.grass?.dispose();
    this.scatter?.dispose();
    this.particles?.dispose();
    this.maps?.dispose();
    this.root.removeFromParent();
  }
}
