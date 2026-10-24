import * as THREE from 'three';
import type { Heightfield } from '../heightfield';
import type { WorldMaps } from '../maps';
import type { CollisionWorld, Collider } from '../Collision';
import { hash2 } from '../../core/rng';
import { Simplex2 } from '../../core/noise';
import { clamp, smoothstep } from '../../core/math';
import { BIOME_INFO, LOCATION_BY_ID, TERRAIN, VEGETATION, WATER_LEVEL, WORLD_HALF, type BiomeId } from '../../data/world';
import type { QualityPreset } from '../../data/quality';
import { speciesModels, vegetationMaterial, type SpeciesId } from './models';

/**
 * Dispersão de árvores, arbustos e pedras por chunk (128 m), com streaming em
 * volta da câmera (≤ VEGETATION.scatterPerFrame chunks por quadro), LOD por
 * árvore perto da câmera (malha completa / simplificada), raleamento ao longe e
 * colisores de troncos/pedras grandes apenas para chunks perto do jogador.
 *
 * Renderização: um InstancedMesh por (espécie × LOD) para o mundo inteiro;
 * as matrizes de cada chunk ficam prontas em Float32Array e só são copiadas
 * (Float32Array.set) quando a seleção muda — sem alocar por quadro.
 */

const TREE_SPECIES: SpeciesId[] = ['oak', 'pine', 'lumen', 'dead', 'crystal'];
const ALL: SpeciesId[] = [...TREE_SPECIES, 'bush', 'rock'];
const SP_INDEX: Record<SpeciesId, number> = { oak: 0, pine: 1, lumen: 2, dead: 3, crystal: 4, bush: 5, rock: 6 };

interface TypeData {
  count: number;
  mats: Float32Array;
  cols: Float32Array;
  /** x, z por instância (para LOD por distância). */
  xz: Float32Array;
}

interface Chunk {
  i: number;
  j: number;
  cx: number;
  cz: number;
  types: TypeData[];
  /** Especificação de colisores: [x, z, raio, y0, y1, tipo(0 árvore / 1 pedra)]. */
  colSpec: Float32Array;
  colliders: Collider[] | null;
}

interface Pool {
  mesh: THREE.InstancedMesh;
  capacity: number;
  count: number;
}

const LUMEN = LOCATION_BY_ID['floresta_lumen'];

export class Scatter {
  readonly group = new THREE.Group();
  private chunks = new Map<number, Chunk>();
  private pools: Pool[][] = []; // [species][lod]
  private material = vegetationMaterial();
  private noise = new Simplex2(777);
  private queue: number[] = [];
  private dirty = true;
  private lastAX = 1e9;
  private lastAZ = 1e9;
  private assembleTimer = 0;
  private chunksPerSide = Math.round((WORLD_HALF * 2) / TERRAIN.chunkSize);
  private propDensity = 1;
  private qKey = '';
  private lastCellKey = -1;
  private lastRadius = 0;
  private maintTimer = 0;
  /** Arbustos cortados/queimados: chave da célula → instante (s) em que voltam a crescer. */
  private cutUntil = new Map<number, number>();
  /** Relógio dos arbustos (s), posto pelo mundo interativo. */
  now = 0;
  private treeHit = { species: 'oak' as SpeciesId, x: 0, y: 0, z: 0, s: 1 };
  /** Estatísticas (debug). */
  stats = { chunks: 0, colliderChunks: 0, instances: 0, built: 0, peakBuildMs: 0, peakAssembleMs: 0, lastAssembleMs: 0 };

  constructor(
    private hf: Heightfield,
    private maps: WorldMaps,
    private physics: CollisionWorld,
  ) {
    this.group.name = 'vegetacao';
    const models = speciesModels();
    for (const sp of ALL) {
      const m = models[sp];
      const lods: Pool[] = [];
      lods.push(this.makePool(m.full, 256, sp, 0));
      if (m.far) lods.push(this.makePool(m.far, 1024, sp, 1));
      this.pools.push(lods);
    }
  }

  private makePool(geo: THREE.BufferGeometry, capacity: number, sp: SpeciesId, lod: number): Pool {
    const mesh = new THREE.InstancedMesh(geo, this.material, capacity);
    mesh.name = `veg:${sp}:${lod}`;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = lod === 0 && sp !== 'rock';
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    this.group.add(mesh);
    return { mesh, capacity, count: 0 };
  }

  private grow(p: Pool, need: number) {
    const cap = Math.max(need, Math.ceil(p.capacity * 1.6));
    const old = p.mesh;
    const mesh = new THREE.InstancedMesh(old.geometry, this.material, cap);
    // preserva o que já foi copiado neste quadro
    (mesh.instanceMatrix.array as Float32Array).set((old.instanceMatrix.array as Float32Array).subarray(0, p.count * 16));
    mesh.name = old.name;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    (mesh.instanceColor.array as Float32Array).set((old.instanceColor!.array as Float32Array).subarray(0, p.count * 3));
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = old.castShadow;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.count = 0;
    this.group.remove(old);
    old.dispose();
    this.group.add(mesh);
    p.mesh = mesh;
    p.capacity = cap;
  }

  /** Reconfigura pelo preset (densidade muda a dispersão → refaz os chunks). */
  configure(q: QualityPreset) {
    const key = `${q.propDensity}`;
    if (key === this.qKey) return;
    this.qKey = key;
    this.propDensity = q.propDensity;
    for (const c of this.chunks.values()) this.dropColliders(c);
    this.chunks.clear();
    this.dirty = true;
  }

  private key(i: number, j: number) {
    return j * this.chunksPerSide + i;
  }

  /**
   * Streaming + LOD. `cam` = posição da câmera, `player` = posição do jogador
   * (colisores). Constrói no máximo `scatterPerFrame` chunks dentro do orçamento.
   */
  update(dt: number, camX: number, camZ: number, playerX: number, playerZ: number, q: QualityPreset) {
    const cs = TERRAIN.chunkSize;
    const radius = Math.min(VEGETATION.scatterRadius, q.viewDistance * 0.85);
    // 1) quais chunks deveriam existir
    const n = this.chunksPerSide;
    const ci = Math.floor((camX + WORLD_HALF) / cs);
    const cj = Math.floor((camZ + WORLD_HALF) / cs);
    const span = Math.ceil(radius / cs) + 1;
    // só refaz a lista de pendentes quando a câmera muda de chunk (ou ainda há pendentes)
    const cellKey = cj * n + ci;
    const rescan = cellKey !== this.lastCellKey || radius !== this.lastRadius || this.queue.length > 0;
    this.lastCellKey = cellKey;
    this.lastRadius = radius;
    if (rescan) this.queue.length = 0;
    if (rescan) for (let j = Math.max(0, cj - span); j <= Math.min(n - 1, cj + span); j++) {
      for (let i = Math.max(0, ci - span); i <= Math.min(n - 1, ci + span); i++) {
        const cx = -WORLD_HALF + (i + 0.5) * cs;
        const cz = -WORLD_HALF + (j + 0.5) * cs;
        const d = Math.hypot(cx - camX, cz - camZ) - cs * 0.7;
        if (d > radius) continue;
        const k = this.key(i, j);
        if (!this.chunks.has(k)) this.queue.push(k);
      }
    }
    // mais perto primeiro
    if (this.queue.length > 1) {
      this.queue.sort((a, b) => {
        const ax = (a % n) - ci;
        const az = Math.floor(a / n) - cj;
        const bx = (b % n) - ci;
        const bz = Math.floor(b / n) - cj;
        return ax * ax + az * az - (bx * bx + bz * bz);
      });
    }
    const t0 = performance.now();
    let built = 0;
    for (const k of this.queue) {
      if (built >= VEGETATION.scatterPerFrame || performance.now() - t0 > 3) break;
      this.chunks.set(k, this.buildChunk(k % n, Math.floor(k / n)));
      built++;
      this.dirty = true;
    }
    if (built) {
      const ms = performance.now() - t0;
      this.stats.built += built;
      if (ms > this.stats.peakBuildMs) this.stats.peakBuildMs = ms;
    }
    // 2) descarrega chunks longe demais (com histerese) e gerencia colisores (5×/s)
    this.maintTimer -= dt;
    const unloadR = radius + cs * 1.2;
    const physR = VEGETATION.physicsRadius;
    let colChunks = 0;
    if (this.maintTimer <= 0 || built > 0) for (const [k, c] of this.chunks) {
      const d = Math.hypot(c.cx - camX, c.cz - camZ);
      if (d > unloadR) {
        this.dropColliders(c);
        this.chunks.delete(k);
        this.dirty = true;
        continue;
      }
      const dp = Math.hypot(c.cx - playerX, c.cz - playerZ);
      if (dp < physR && !c.colliders) this.addColliders(c);
      else if (dp > physR + 40 && c.colliders) this.dropColliders(c);
      if (c.colliders) colChunks++;
    }
    if (this.maintTimer <= 0 || built > 0) {
      this.maintTimer = 0.2;
      this.stats.chunks = this.chunks.size;
      this.stats.colliderChunks = colChunks;
    }
    // 3) remonta as instâncias quando a câmera anda ou o conjunto muda
    this.assembleTimer -= dt;
    const moved = Math.hypot(camX - this.lastAX, camZ - this.lastAZ);
    if (this.dirty || (moved > 4 && this.assembleTimer <= 0)) {
      const ta = performance.now();
      this.assemble(camX, camZ, q);
      this.stats.lastAssembleMs = performance.now() - ta;
      if (this.stats.lastAssembleMs > this.stats.peakAssembleMs) this.stats.peakAssembleMs = this.stats.lastAssembleMs;
      this.lastAX = camX;
      this.lastAZ = camZ;
      this.assembleTimer = 0.25;
      this.dirty = false;
    }
  }

  private dropColliders(c: Chunk) {
    if (!c.colliders) return;
    for (const col of c.colliders) this.physics.remove(col);
    c.colliders = null;
  }

  private addColliders(c: Chunk) {
    const s = c.colSpec;
    const list: Collider[] = [];
    for (let k = 0; k < s.length; k += 6) {
      const isRock = s[k + 5] === 1;
      list.push(this.physics.addCylinder(s[k], s[k + 1], s[k + 2], s[k + 3], s[k + 4], isRock ? 'rock' : 'tree', isRock ? { walkable: true, surface: 'stone' } : { walkable: false, blocksSight: false }));
    }
    c.colliders = list;
  }

  /** Copia as instâncias dos chunks carregados para os pools (LOD por distância). */
  private assemble(camX: number, camZ: number, q: QualityPreset) {
    const full = VEGETATION.treeFullDistance * q.lodBias;
    const bushD = VEGETATION.bushDistance * q.lodBias;
    const rockD = VEGETATION.rockDistance * q.lodBias;
    const half = TERRAIN.chunkSize * 0.71;
    for (const lods of this.pools) for (const p of lods) p.count = 0;
    // garante capacidade
    const need = new Int32Array(ALL.length * 2);
    for (const c of this.chunks.values()) for (let t = 0; t < ALL.length; t++) {
      need[t * 2] += c.types[t].count;
      need[t * 2 + 1] += c.types[t].count;
    }
    for (let t = 0; t < ALL.length; t++) {
      const lods = this.pools[t];
      for (let l = 0; l < lods.length; l++) {
        const cap = l === 0 && lods.length > 1 ? Math.min(need[t * 2], 1 << 14) : need[t * 2 + l];
        if (cap > lods[l].capacity) this.grow(lods[l], cap);
      }
    }
    let total = 0;
    for (const c of this.chunks.values()) {
      const dc = Math.hypot(c.cx - camX, c.cz - camZ);
      for (let t = 0; t < ALL.length; t++) {
        const td = c.types[t];
        if (!td.count) continue;
        const lods = this.pools[t];
        const isTree = lods.length > 1;
        if (isTree) {
          if (dc - half > full) {
            // chunk inteiro longe: malha simplificada, raleada com a distância
            const keep = clamp(1 - (dc - 300) / 700, 0.35, 1);
            const m = Math.ceil(td.count * keep);
            total += this.copy(lods[1], td, 0, m);
          } else {
            for (let k = 0; k < td.count; k++) {
              const d = Math.hypot(td.xz[k * 2] - camX, td.xz[k * 2 + 1] - camZ);
              total += this.copy(d < full ? lods[0] : lods[1], td, k, k + 1);
            }
          }
        } else if (t === SP_INDEX.bush) {
          if (dc - half > bushD) continue;
          for (let k = 0; k < td.count; k++) {
            const d = Math.hypot(td.xz[k * 2] - camX, td.xz[k * 2 + 1] - camZ);
            if (d < bushD) total += this.copy(lods[0], td, k, k + 1);
          }
        } else {
          if (dc - half > rockD) continue;
          // pedras ordenadas por tamanho (maiores primeiro): longe, só as grandes
          const keep = dc < 200 ? 1 : clamp(1 - (dc - 200) / 260, 0.25, 1);
          total += this.copy(lods[0], td, 0, Math.ceil(td.count * keep));
        }
      }
    }
    for (const lods of this.pools) {
      for (const p of lods) {
        p.mesh.count = p.count;
        p.mesh.instanceMatrix.clearUpdateRanges();
        p.mesh.instanceMatrix.addUpdateRange(0, p.count * 16);
        p.mesh.instanceMatrix.needsUpdate = true;
        if (p.mesh.instanceColor) {
          p.mesh.instanceColor.clearUpdateRanges();
          p.mesh.instanceColor.addUpdateRange(0, p.count * 3);
          p.mesh.instanceColor.needsUpdate = true;
        }
        p.mesh.visible = p.count > 0;
      }
    }
    this.stats.instances = total;
  }

  private copy(p: Pool, td: TypeData, from: number, to: number): number {
    const n = to - from;
    if (n <= 0) return 0;
    if (p.count + n > p.capacity) this.grow(p, p.count + n);
    const dm = p.mesh.instanceMatrix.array as Float32Array;
    const dc = p.mesh.instanceColor!.array as Float32Array;
    if (n === 1) {
      // cópia direta (sem criar views de subarray por instância)
      const so = from * 16;
      const doff = p.count * 16;
      for (let k = 0; k < 16; k++) dm[doff + k] = td.mats[so + k];
      const sc = from * 3;
      const dco = p.count * 3;
      dc[dco] = td.cols[sc];
      dc[dco + 1] = td.cols[sc + 1];
      dc[dco + 2] = td.cols[sc + 2];
    } else {
      dm.set(td.mats.subarray(from * 16, to * 16), p.count * 16);
      dc.set(td.cols.subarray(from * 3, to * 3), p.count * 3);
    }
    p.count += n;
    return n;
  }

  /** Gera (de forma determinística) as instâncias de um chunk. */
  private buildChunk(i: number, j: number): Chunk {
    const cs = TERRAIN.chunkSize;
    const x0 = -WORLD_HALF + i * cs;
    const z0 = -WORLD_HALF + j * cs;
    const lists: { x: number; y: number; z: number; yaw: number; s: number; sy: number; r: number; g: number; b: number; h: number }[][] = ALL.map(() => []);
    const cols: number[] = [];
    const hf = this.hf;
    const models = speciesModels();
    const pd = this.propDensity;
    // árvores
    const ts = VEGETATION.treeSpacing;
    for (let gz = Math.ceil(z0 / ts); gz * ts < z0 + cs; gz++) {
      for (let gx = Math.ceil(x0 / ts); gx * ts < x0 + cs; gx++) {
        const h0 = hash2(gx, gz, 1);
        const x = (gx + 0.1 + 0.8 * hash2(gx, gz, 2)) * ts;
        const z = (gz + 0.1 + 0.8 * hash2(gx, gz, 3)) * ts;
        if (x < x0 || x >= x0 + cs || z < z0 || z >= z0 + cs) continue;
        const biome = hf.biomeAt(x, z);
        const clump = smoothstep(-0.55, 0.35, this.noise.noise(x / 85, z / 85));
        const dens = BIOME_INFO[biome].trees * pd * (0.35 + 0.65 * clump);
        if (h0 > dens) continue;
        if (this.maps.blockedAt(x, z)) continue;
        const y = hf.heightAt(x, z);
        if (y < WATER_LEVEL + 0.35) continue;
        if (hf.slopeAt(x, z) > VEGETATION.treeMaxSlope) continue;
        const sp = this.pickSpecies(biome, x, z, hash2(gx, gz, 4));
        const s = 0.75 + hash2(gx, gz, 5) * 0.6;
        // cristas agudas: o relevo dos nós de LOD distantes fica abaixo do real e a
        // árvore pareceria flutuar de longe — não planta aí
        if (hf.lodSag(x, z) > 0.45 + 0.3 * s) continue;
        const tint = 0.85 + hash2(gx, gz, 6) * 0.3;
        const autumn = sp === 'oak' && this.noise.noise(x / 160 + 40, z / 160) > 0.55 ? 1 : 0;
        lists[SP_INDEX[sp]].push({ x, y: y - 0.1, z, yaw: hash2(gx, gz, 7) * Math.PI * 2, s, sy: s * (0.9 + hash2(gx, gz, 8) * 0.25), r: tint * (autumn ? 1.45 : 1), g: tint * (autumn ? 0.95 : 1), b: tint * (autumn ? 0.6 : 1), h: hash2(gx, gz, 9) });
        const m = models[sp];
        cols.push(x, z, m.trunkRadius * s, y - 1, y + m.colliderHeight * s, 0);
      }
    }
    // arbustos
    const bs = VEGETATION.bushSpacing;
    for (let gz = Math.ceil(z0 / bs); gz * bs < z0 + cs; gz++) {
      for (let gx = Math.ceil(x0 / bs); gx * bs < x0 + cs; gx++) {
        const h0 = hash2(gx, gz, 11);
        const x = (gx + 0.1 + 0.8 * hash2(gx, gz, 12)) * bs;
        const z = (gz + 0.1 + 0.8 * hash2(gx, gz, 13)) * bs;
        if (x < x0 || x >= x0 + cs || z < z0 || z >= z0 + cs) continue;
        const biome = hf.biomeAt(x, z);
        const dens = (BIOME_INFO[biome].grass * 0.25 + BIOME_INFO[biome].trees * 0.3) * pd;
        if (h0 > dens) continue;
        if (this.maps.blockedAt(x, z)) continue;
        const until = this.cutUntil.get(this.bushKey(x, z));
        if (until !== undefined && until > this.now) continue; // cortado/queimado: ainda não voltou
        const y = hf.heightAt(x, z);
        if (y < WATER_LEVEL + 0.3) continue;
        if (hf.slopeAt(x, z) > VEGETATION.bushMaxSlope) continue; // nada de arbusto grudado em paredão
        const s = 0.7 + hash2(gx, gz, 14) * 0.8;
        const [r, g, b] = biome === 'swamp' || biome === 'corrupted' ? [0.75, 0.75, 0.6] : biome === 'forest' ? [0.85, 1.0, 0.85] : [1, 1.05, 0.9];
        lists[SP_INDEX.bush].push({ x, y: y - 0.15, z, yaw: hash2(gx, gz, 15) * 6.28, s, sy: s, r, g, b, h: hash2(gx, gz, 16) });
      }
    }
    // pedras
    const rs = VEGETATION.rockSpacing;
    for (let gz = Math.ceil(z0 / rs); gz * rs < z0 + cs; gz++) {
      for (let gx = Math.ceil(x0 / rs); gx * rs < x0 + cs; gx++) {
        const h0 = hash2(gx, gz, 21);
        const x = (gx + 0.1 + 0.8 * hash2(gx, gz, 22)) * rs;
        const z = (gz + 0.1 + 0.8 * hash2(gx, gz, 23)) * rs;
        if (x < x0 || x >= x0 + cs || z < z0 || z >= z0 + cs) continue;
        const biome = hf.biomeAt(x, z);
        const base: Partial<Record<BiomeId, number>> = { mountain: 0.75, rocky: 0.8, ruins: 0.35, shore: 0.3, swamp: 0.2, corrupted: 0.25, forest: 0.18, meadow: 0.12, village: 0.04 };
        if (h0 > (base[biome] ?? 0.1) * pd) continue;
        if (this.maps.blockedAt(x, z)) continue;
        const y = hf.heightAt(x, z);
        if (hf.slopeAt(x, z) > VEGETATION.rockMaxSlope) continue;
        const big = hash2(gx, gz, 24);
        const s = 0.4 + big * big * 2.6;
        // idem para pedras (visíveis até ~380 m, sobre nós de 8–16 m)
        if (hf.lodSag(x, z) > 0.5 * s) continue;
        const tint = biome === 'rocky' ? [1.25, 0.95, 0.8] : biome === 'swamp' || biome === 'corrupted' ? [0.75, 0.72, 0.8] : biome === 'mountain' ? [1.05, 1.05, 1.05] : [1, 1, 0.95];
        lists[SP_INDEX.rock].push({ x, y: y - 0.25 * s, z, yaw: hash2(gx, gz, 25) * 6.28, s, sy: s * (0.6 + hash2(gx, gz, 26) * 0.6), r: tint[0], g: tint[1], b: tint[2], h: 1 - big });
        if (s > 1.3) cols.push(x, z, s * 0.95, y - 1, y + s * 0.55, 1);
      }
    }
    const types: TypeData[] = lists.map((l) => {
      // ordena pelo hash (raleamento estável ao longe; pedras: maiores primeiro)
      l.sort((a, b) => a.h - b.h);
      const mats = new Float32Array(l.length * 16);
      const cl = new Float32Array(l.length * 3);
      const xz = new Float32Array(l.length * 2);
      l.forEach((e, k) => {
        const c = Math.cos(e.yaw);
        const s = Math.sin(e.yaw);
        const o = k * 16;
        mats[o] = c * e.s;
        mats[o + 2] = -s * e.s;
        mats[o + 5] = e.sy;
        mats[o + 8] = s * e.s;
        mats[o + 10] = c * e.s;
        mats[o + 12] = e.x;
        mats[o + 13] = e.y;
        mats[o + 14] = e.z;
        mats[o + 15] = 1;
        cl[k * 3] = e.r;
        cl[k * 3 + 1] = e.g;
        cl[k * 3 + 2] = e.b;
        xz[k * 2] = e.x;
        xz[k * 2 + 1] = e.z;
      });
      return { count: l.length, mats, cols: cl, xz };
    });
    return { i, j, cx: x0 + cs / 2, cz: z0 + cs / 2, types, colSpec: new Float32Array(cols), colliders: null };
  }

  private pickSpecies(biome: BiomeId, x: number, z: number, h: number): SpeciesId {
    switch (biome) {
      case 'forest': {
        const dl = Math.hypot(x - LUMEN.x, z - LUMEN.z);
        const lum = clamp(0.3 - dl / 700, 0.03, 0.25);
        return h < lum ? 'lumen' : h < lum + 0.4 ? 'pine' : 'oak';
      }
      case 'swamp':
        return h < 0.75 ? 'dead' : 'pine';
      case 'corrupted':
        return h < 0.85 ? 'dead' : 'crystal';
      case 'ruins':
        return h < 0.55 ? 'crystal' : 'oak';
      case 'mountain':
      case 'rocky':
        return h < 0.85 ? 'pine' : 'dead';
      case 'shore':
        return h < 0.5 ? 'oak' : 'dead';
      default:
        return h < 0.75 ? 'oak' : 'pine';
    }
  }

  private bushKey(x: number, z: number) {
    const bs = VEGETATION.bushSpacing;
    return (Math.floor(z / bs) + 4096) * 8192 + (Math.floor(x / bs) + 4096);
  }

  private chunkAt(x: number, z: number): Chunk | undefined {
    const cs = TERRAIN.chunkSize;
    const i = Math.floor((x + WORLD_HALF) / cs);
    const j = Math.floor((z + WORLD_HALF) / cs);
    if (i < 0 || j < 0 || i >= this.chunksPerSide || j >= this.chunksPerSide) return undefined;
    return this.chunks.get(this.key(i, j));
  }

  /**
   * Remove (corta ou queima) arbustos a até `r` m de (x, z). Escreve x, y, z, escala de cada
   * um em `out` (se dado) e devolve quantos. Eles voltam em `regrowAt` (no relógio `now`).
   */
  removeBushes(x: number, z: number, r: number, regrowAt: number, out: Float32Array | null = null, max = 8): number {
    let n = 0;
    const cs = TERRAIN.chunkSize;
    const t = SP_INDEX.bush;
    const i0 = Math.floor((x - r - 2 + WORLD_HALF) / cs);
    const i1 = Math.floor((x + r + 2 + WORLD_HALF) / cs);
    const j0 = Math.floor((z - r - 2 + WORLD_HALF) / cs);
    const j1 = Math.floor((z + r + 2 + WORLD_HALF) / cs);
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (i < 0 || j < 0 || i >= this.chunksPerSide || j >= this.chunksPerSide) continue;
        const c = this.chunks.get(this.key(i, j));
        if (!c) continue;
        const td = c.types[t];
        for (let k = 0; k < td.count && n < max; k++) {
          const bx = td.xz[k * 2];
          const bz = td.xz[k * 2 + 1];
          const o = k * 16;
          if (td.mats[o + 15] === 0) continue; // já removido
          const sc = Math.hypot(td.mats[o], td.mats[o + 2]);
          if (Math.hypot(bx - x, bz - z) > r + sc * 0.6) continue;
          if (out && (n + 1) * 4 <= out.length) {
            out[n * 4] = bx;
            out[n * 4 + 1] = td.mats[o + 13];
            out[n * 4 + 2] = bz;
            out[n * 4 + 3] = sc;
          }
          td.mats.fill(0, o, o + 16);
          this.cutUntil.set(this.bushKey(bx, bz), regrowAt);
          n++;
        }
      }
    }
    if (n) this.dirty = true;
    return n;
  }

  /** Arbustos voltam a crescer: refaz os chunks onde o prazo venceu. */
  regrowBushes(now: number) {
    this.now = now;
    let any = false;
    for (const [k, until] of this.cutUntil) {
      if (until > now) continue;
      this.cutUntil.delete(k);
      const bs = VEGETATION.bushSpacing;
      const gx = (k % 8192) - 4096;
      const gz = Math.floor(k / 8192) - 4096;
      const cs = TERRAIN.chunkSize;
      const i = Math.floor(((gx + 0.5) * bs + WORLD_HALF) / cs);
      const j = Math.floor(((gz + 0.5) * bs + WORLD_HALF) / cs);
      const ck = this.key(i, j);
      const c = this.chunks.get(ck);
      if (c) {
        this.dropColliders(c);
        this.chunks.delete(ck);
        any = true;
      }
    }
    if (any) {
      this.dirty = true;
      this.lastCellKey = -1; // força a nova varredura (o chunk volta a ser construído)
    }
  }

  /** Esquece cortes (novo jogo). */
  resetBushes() {
    if (!this.cutUntil.size) return;
    const keys = [...this.cutUntil.keys()];
    for (const k of keys) this.cutUntil.set(k, -1);
    this.regrowBushes(this.now);
  }

  /** Árvore mais próxima de (x, z) até `r` m do tronco (objeto reutilizado; null se nenhuma). */
  treeNear(x: number, z: number, r: number): { species: SpeciesId; x: number; y: number; z: number; s: number } | null {
    const c = this.chunkAt(x, z);
    if (!c) return null;
    let best = -1;
    let bestT = 0;
    let bestD = r;
    for (let t = 0; t < TREE_SPECIES.length; t++) {
      const td = c.types[t];
      for (let k = 0; k < td.count; k++) {
        const d = Math.hypot(td.xz[k * 2] - x, td.xz[k * 2 + 1] - z);
        if (d < bestD) {
          bestD = d;
          best = k;
          bestT = t;
        }
      }
    }
    if (best < 0) return null;
    const td = c.types[bestT];
    const o = best * 16;
    const h = this.treeHit;
    h.species = ALL[bestT];
    h.x = td.xz[best * 2];
    h.z = td.xz[best * 2 + 1];
    h.y = td.mats[o + 13];
    h.s = td.mats[o + 5];
    return h;
  }

  /** Quantos colisores de vegetação estão ativos (debug/testes). */
  activeColliderCount() {
    let n = 0;
    for (const c of this.chunks.values()) if (c.colliders) n += c.colliders.length;
    return n;
  }

  get drawCalls() {
    let n = 0;
    for (const lods of this.pools) for (const p of lods) if (p.mesh.count > 0) n++;
    return n;
  }

  dispose() {
    for (const c of this.chunks.values()) this.dropColliders(c);
    for (const lods of this.pools) for (const p of lods) p.mesh.dispose();
    this.material.dispose();
  }
}
