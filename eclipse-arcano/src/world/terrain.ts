import * as THREE from 'three';
import { STYLE } from '../data/graphics';
import { addDefines } from '../env/stylize';
import type { Heightfield } from './heightfield';
import type { WorldMaps } from './maps';
import { MAPS_GLSL } from './maps';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { Simplex2 } from '../core/noise';
import { clamp, smoothstep } from '../core/math';
import { TERRAIN, WORLD_HALF } from '../data/world';
import { WEATHER_FX } from '../data/weather';
import type { QualityPreset } from '../data/quality';

/**
 * Terreno em quadtree com LOD na GPU.
 *
 * Todos os nós (64/128/256/512 m) usam a MESMA grade 33×33 (+ saias) e são desenhados
 * numa única chamada instanciada: cada instância carrega (x0, z0, tamanho, saia) e o
 * vertex shader lê a altura exata do mapa R32F. A seleção de nós (distância 3D até a
 * caixa do nó × lodBias + frustum culling) roda na CPU a cada quadro sem alocar nada.
 *
 * As saias (borda duplicada empurrada para baixo) escondem as rachaduras em T entre
 * nós de níveis diferentes. A iluminação usa um mapa de normais por pixel, então o
 * relevo distante continua detalhado mesmo com poucos vértices.
 */

const LEVELS = 4; // 0 = 64 m … 3 = 512 m
const MAX_INSTANCES = 640;

export class Terrain {
  readonly mesh: THREE.Mesh;
  readonly horizon: THREE.Mesh;
  readonly material: THREE.MeshStandardMaterial;
  /** Nós desenhados no último quadro (debug/medição). */
  drawnNodes = 0;
  readonly levelCounts = [0, 0, 0, 0];

  // Quadtree estático em arrays (sem objetos por nó).
  private nX0: Float32Array;
  private nZ0: Float32Array;
  private nSize: Float32Array;
  private nLevel: Uint8Array;
  private nMinY: Float32Array;
  private nMaxY: Float32Array;
  private nChild: Int32Array;
  private roots: number[] = [];
  private nodeAttr: THREE.InstancedBufferAttribute;
  private geo: THREE.InstancedBufferGeometry;
  private frustum = new THREE.Frustum();
  private projScreen = new THREE.Matrix4();
  private box = new THREE.Box3();
  private splitDist = new Float32Array(LEVELS);
  private maxDist = 0;
  private count = 0;
  private cx = 0;
  private cy = 0;
  private cz = 0;

  constructor(
    private hf: Heightfield,
    maps: WorldMaps,
    detailTex: THREE.Texture,
  ) {
    // --- quadtree ---
    let total = 0;
    const rootsPerSide = Math.round((WORLD_HALF * 2) / TERRAIN.rootSize);
    for (let l = 0; l < LEVELS; l++) total += rootsPerSide * rootsPerSide * 4 ** (LEVELS - 1 - l);
    this.nX0 = new Float32Array(total);
    this.nZ0 = new Float32Array(total);
    this.nSize = new Float32Array(total);
    this.nLevel = new Uint8Array(total);
    this.nMinY = new Float32Array(total);
    this.nMaxY = new Float32Array(total);
    this.nChild = new Int32Array(total).fill(-1);
    let next = 0;
    const getNext = () => next;
    const setNext = (v: number) => (next = v);
    // Raízes primeiro (índices 0..15); filhos em blocos de 4 consecutivos.
    for (let k = 0; k < rootsPerSide * rootsPerSide; k++) this.roots.push(next++);
    for (let j = 0; j < rootsPerSide; j++) {
      for (let i = 0; i < rootsPerSide; i++) {
        const id = this.roots[j * rootsPerSide + i];
        this.buildAt(id, -WORLD_HALF + i * TERRAIN.rootSize, -WORLD_HALF + j * TERRAIN.rootSize, TERRAIN.rootSize, LEVELS - 1, getNext, setNext);
      }
    }

    // --- malha compartilhada ---
    this.geo = buildNodeGeometry(TERRAIN.nodeSegments);
    this.nodeAttr = new THREE.InstancedBufferAttribute(new Float32Array(MAX_INSTANCES * 4), 4);
    this.nodeAttr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aNode', this.nodeAttr);
    this.geo.instanceCount = 0;

    this.material = createTerrainMaterial(maps, detailTex);
    this.mesh = new THREE.Mesh(this.geo, this.material);
    this.mesh.name = 'terreno';
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.matrixAutoUpdate = false;

    this.horizon = buildHorizon(hf);
  }

  /** Constrói um nó num índice já reservado (filhos ficam em blocos de 4 consecutivos). */
  private buildAt(id: number, x0: number, z0: number, size: number, level: number, getNext: () => number, setNext: (v: number) => void) {
    this.nX0[id] = x0;
    this.nZ0[id] = z0;
    this.nSize[id] = size;
    this.nLevel[id] = level;
    if (level === 0) {
      this.computeLeafBounds(id);
      return;
    }
    const c0 = getNext();
    setNext(c0 + 4);
    this.nChild[id] = c0;
    const h = size / 2;
    this.buildAt(c0, x0, z0, h, level - 1, getNext, setNext);
    this.buildAt(c0 + 1, x0 + h, z0, h, level - 1, getNext, setNext);
    this.buildAt(c0 + 2, x0, z0 + h, h, level - 1, getNext, setNext);
    this.buildAt(c0 + 3, x0 + h, z0 + h, h, level - 1, getNext, setNext);
    let mn = Infinity;
    let mx = -Infinity;
    for (let k = 0; k < 4; k++) {
      mn = Math.min(mn, this.nMinY[c0 + k]);
      mx = Math.max(mx, this.nMaxY[c0 + k]);
    }
    this.nMinY[id] = mn;
    this.nMaxY[id] = mx;
  }

  private computeLeafBounds(id: number) {
    const hf = this.hf;
    const i0 = Math.round((this.nX0[id] + WORLD_HALF) / hf.spacing);
    const j0 = Math.round((this.nZ0[id] + WORLD_HALF) / hf.spacing);
    const n = Math.round(this.nSize[id] / hf.spacing);
    let mn = Infinity;
    let mx = -Infinity;
    for (let j = j0; j <= Math.min(hf.res - 1, j0 + n); j++) {
      for (let i = i0; i <= Math.min(hf.res - 1, i0 + n); i++) {
        const h = hf.data[j * hf.res + i];
        if (h < mn) mn = h;
        if (h > mx) mx = h;
      }
    }
    this.nMinY[id] = mn - TERRAIN.skirtDepth[0];
    this.nMaxY[id] = mx;
  }

  /** Seleciona os nós visíveis e atualiza o buffer de instâncias. Sem alocação. */
  update(camera: THREE.Camera, q: QualityPreset) {
    const d = TERRAIN.lodDistances;
    // splitDist[l] = distância abaixo da qual um nó de nível l se divide em filhos.
    this.splitDist[0] = 0;
    this.splitDist[1] = d[0] * q.lodBias;
    this.splitDist[2] = d[1] * q.lodBias;
    this.splitDist[3] = d[2] * q.lodBias;
    this.maxDist = q.viewDistance + TERRAIN.viewMargin;
    camera.updateMatrixWorld();
    this.projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreen);
    const p = camera.matrixWorld.elements;
    this.cx = p[12];
    this.cy = p[13];
    this.cz = p[14];
    this.count = 0;
    this.levelCounts[0] = this.levelCounts[1] = this.levelCounts[2] = this.levelCounts[3] = 0;
    for (let r = 0; r < this.roots.length; r++) this.select(this.roots[r]);
    this.geo.instanceCount = this.count;
    this.nodeAttr.needsUpdate = true;
    this.nodeAttr.clearUpdateRanges();
    this.nodeAttr.addUpdateRange(0, this.count * 4);
    this.drawnNodes = this.count;
  }

  private select(id: number) {
    const x0 = this.nX0[id];
    const z0 = this.nZ0[id];
    const s = this.nSize[id];
    this.box.min.set(x0, this.nMinY[id] - 20, z0);
    this.box.max.set(x0 + s, this.nMaxY[id] + 2, z0 + s);
    if (!this.frustum.intersectsBox(this.box)) return;
    const dx = Math.max(x0 - this.cx, 0, this.cx - (x0 + s));
    const dz = Math.max(z0 - this.cz, 0, this.cz - (z0 + s));
    const dy = Math.max(this.nMinY[id] - this.cy, 0, this.cy - this.nMaxY[id]);
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > this.maxDist) return;
    const level = this.nLevel[id];
    if (level > 0 && dist < this.splitDist[level]) {
      const c = this.nChild[id];
      this.select(c);
      this.select(c + 1);
      this.select(c + 2);
      this.select(c + 3);
      return;
    }
    if (this.count >= MAX_INSTANCES) return;
    const a = this.nodeAttr.array as Float32Array;
    const o = this.count * 4;
    a[o] = x0;
    a[o + 1] = z0;
    a[o + 2] = s;
    a[o + 3] = TERRAIN.skirtDepth[level];
    this.count++;
    this.levelCounts[level]++;
  }

  dispose() {
    this.geo.dispose();
    this.material.dispose();
    this.horizon.geometry.dispose();
    (this.horizon.material as THREE.Material).dispose();
  }
}

/**
 * Grade (n+1)² no quadrado unitário [0,1]² + saias. position.y = 1 marca vértices de
 * saia (o shader os rebaixa por aNode.w).
 */
function buildNodeGeometry(n: number): THREE.InstancedBufferGeometry {
  const verts: number[] = [];
  const idx: number[] = [];
  const v = (i: number, j: number) => j * (n + 1) + i;
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) verts.push(i / n, 0, j / n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = v(i, j);
      const b = v(i + 1, j);
      const c = v(i, j + 1);
      const d = v(i + 1, j + 1);
      // alterna a diagonal (padrão em losango, menos serrilhado)
      if ((i + j) % 2 === 0) idx.push(a, c, b, b, c, d);
      else idx.push(a, c, d, a, d, b);
    }
  }
  // Saias: para cada borda, duplica os vértices com y = 1.
  let base = verts.length / 3;
  const edge = (pts: number[], outwardFlip: boolean) => {
    const start = base;
    for (const p of pts) {
      verts.push(verts[p * 3], 1, verts[p * 3 + 2]);
      base++;
    }
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k];
      const b = pts[k + 1];
      const sa = start + k;
      const sb = start + k + 1;
      if (outwardFlip) idx.push(a, b, sa, b, sb, sa);
      else idx.push(a, sa, b, b, sa, sb);
    }
  };
  const top: number[] = [];
  const bottom: number[] = [];
  const left: number[] = [];
  const right: number[] = [];
  for (let i = 0; i <= n; i++) {
    top.push(v(i, 0));
    bottom.push(v(i, n));
    left.push(v(0, i));
    right.push(v(n, i));
  }
  edge(top, true);
  edge(bottom, false);
  edge(left, false);
  edge(right, true);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6);
  return g;
}

/** Material do terreno: MeshStandardMaterial com deslocamento e mistura de camadas no shader. */
function createTerrainMaterial(maps: WorldMaps, detailTex: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
  // relevo: sombreamento estilizado mais suave que o das estruturas (colinas sem faixas duras)
  addDefines(mat, { STYL_CEL: STYLE.terrainCel.toFixed(3) });
  const uniforms = {
    ...maps.uniforms(),
    tDetail: { value: detailTex },
    uTime: GLOBAL_UNIFORMS.uTime,
    uWetness: GLOBAL_UNIFORMS.uWetness,
    uNight: GLOBAL_UNIFORMS.uNight,
    uRain: GLOBAL_UNIFORMS.uRain,
    uSnow: GLOBAL_UNIFORMS.uSnow,
    uFogColorP: GLOBAL_UNIFORMS.uFogColor,
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec4 aNode;
varying vec3 vTerrainPos;
${MAPS_GLSL}`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `vec2 wxz = aNode.xy + position.xz * aNode.z;
vec3 objectNormal = worldNormalLod(wxz).xyz;`,
      )
      .replace(
        '#include <begin_vertex>',
        `vec3 transformed = vec3(wxz.x, worldHeight(wxz) - position.y * aNode.w, wxz.y);
vTerrainPos = transformed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vTerrainPos;
uniform sampler2D tDetail;
uniform float uTime;
uniform float uWetness;
uniform float uNight;
uniform float uRain;
uniform float uSnow;
uniform vec3 uFogColorP;
${MAPS_GLSL}
${RIPPLE_GLSL}`,
      )
      .replace('#include <map_fragment>', TERRAIN_ALBEDO_GLSL.replaceAll('PUDDLE_WET', WEATHER_FX.puddleWetness.toFixed(3)))
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = tRough;')
      .replace(
        '#include <normal_fragment_begin>',
        `#include <normal_fragment_begin>
normal = normalize((viewMatrix * vec4(tN, 0.0)).xyz);
nonPerturbedNormal = normal;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
// poças refletem o céu (mais na beirada rasante)
float pFres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
totalEmissiveRadiance += uFogColorP * tPuddle * (0.04 + 0.32 * pFres) * (1.0 - 0.75 * uNight);
totalEmissiveRadiance += vec3(0.55, 0.12, 0.95) * tVein * (0.04 + 0.96 * uNight) * (0.65 + 0.35 * sin(uTime * 1.3 + vTerrainPos.x * 0.07 + vTerrainPos.z * 0.05));`,
      );
  };
  mat.customProgramCacheKey = () => 'terrain-v3';
  return mat;
}

/** Ondinhas de chuva nas poças: anéis que se abrem em células sorteadas (duas camadas). */
const RIPPLE_GLSL = /* glsl */ `
float rHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 rippleLayer(vec2 p, float t, float seed) {
  vec2 c = floor(p);
  vec2 f = fract(p) - 0.5;
  float h = rHash(c + seed);
  vec2 o = vec2(rHash(c + seed + 3.7), rHash(c + seed + 9.1)) - 0.5;
  vec2 d = f - o * 0.3;
  float ph = fract(t * (0.9 + 0.4 * h) + h);
  float r = length(d);
  float R = ph * 0.34;
  float ring = sin((r - R) * 48.0) * smoothstep(0.07, 0.0, abs(r - R)) * (1.0 - ph);
  return d / max(r, 1e-3) * ring;
}
vec2 rainRipples(vec2 p, float t) {
  return rippleLayer(p * 2.3, t, 0.0) + rippleLayer(p * 3.4 + 17.3, t * 1.13, 41.0) * 0.7;
}
`;

/** Composição do albedo do terreno (biomas, solo, estradas, rocha por inclinação, neve, corrupção, umidade). */
const TERRAIN_ALBEDO_GLSL = /* glsl */ `
vec2 wxz = vTerrainPos.xz;
vec4 wn = worldNormal(wxz);
vec2 muv = worldMapUv(wxz);
vec3 base = texture(tWorldColor, muv).rgb;
vec4 wdat = texture(tWorldData, muv);
vec4 d1 = texture(tDetail, wxz * (1.0 / 7.0));
vec4 d2 = texture(tDetail, wxz * (1.0 / 43.0) + 0.37);
float camDist = length(vViewPosition);
float farF = smoothstep(50.0, 320.0, camDist);
// relevo fino (perturbação leve da normal com o detalhe; some ao longe)
vec3 tN = normalize(wn.xyz + vec3(d1.b - 0.5, 0.0, d1.r - 0.5) * 0.22 * (1.0 - farF));
float slope = 1.0 - tN.y;
float fineV = mix(d1.r, 0.5, farF * 0.6);
vec3 col = base * (0.8 + 0.42 * fineV) * (0.9 + 0.22 * d2.b);
// solo exposto onde há pouca grama (só em biomas verdes)
float greenish = smoothstep(0.0, 0.08, base.g - base.r);
float soilW = smoothstep(0.5, 0.05, wdat.b + (d2.r - 0.5) * 0.3) * 0.55 * greenish;
vec3 soil = vec3(0.25, 0.2, 0.14) * (0.8 + 0.4 * d1.b);
col = mix(col, soil, soilW);
// estradas de terra batida com pedriscos
float road = smoothstep(0.18, 0.62, wdat.r + (d1.b - 0.5) * 0.35);
vec3 roadCol = mix(vec3(0.42, 0.34, 0.24), vec3(0.55, 0.5, 0.43), smoothstep(0.3, 0.8, d1.a)) * (0.82 + 0.32 * d2.r);
col = mix(col, roadCol, road);
// rocha nas encostas: projeção triplanar (sem costura nem esticamento), fendas
// suaves em duas escalas e estratos horizontais (não pode parecer calçamento)
float rockW = smoothstep(0.24, 0.42, slope + (d2.b - 0.5) * 0.2);
vec3 tw = pow(abs(tN), vec3(4.0));
tw /= tw.x + tw.y + tw.z;
vec4 r1 = texture(tDetail, vTerrainPos.zy * (1.0 / 11.0)) * tw.x + texture(tDetail, vTerrainPos.xy * (1.0 / 11.0)) * tw.z + texture(tDetail, wxz * (1.0 / 11.0) + 0.21) * tw.y;
vec2 ruv = abs(tN.x) > abs(tN.z) ? vTerrainPos.zy : vTerrainPos.xy;
vec4 r2 = texture(tDetail, ruv * (1.0 / 37.0) + 0.5);
float crackM = smoothstep(0.0, 0.32, r1.g) * 0.7 + smoothstep(0.0, 0.25, r2.g) * 0.3;
float strata = 1.0 - 0.08 * (1.0 - farF) * (0.5 + 0.5 * sin(vTerrainPos.y * 1.1 + r2.b * 5.0)); // some ao longe (evita moiré)
vec3 rockCol = mix(vec3(0.38, 0.36, 0.33), vec3(0.6, 0.57, 0.52), r2.b * 0.75 + r1.b * 0.25) * (0.76 + 0.26 * crackM) * (0.9 + 0.2 * r1.r) * strata;
rockCol *= mix(vec3(1.0), clamp(base * 2.3, vec3(0.55), vec3(1.45)), 0.4);
col = mix(col, rockCol, rockW);
// neve nos picos
float snowStart = mix(160.0, 132.0, uSnow); // nevando: a neve desce pela montanha
float snow = smoothstep(snowStart, snowStart + 55.0, vTerrainPos.y + (d2.r - 0.5) * 45.0) * smoothstep(0.62, 0.3, slope);
col = mix(col, vec3(0.86, 0.89, 0.95) * (0.92 + 0.08 * d1.r), snow);
// terra corrompida: tons arroxeados em manchas (multiplicativos — um acréscimo
// fixo saturava demais o solo escuro) e veios em rede só em parte do chão
float corr = wdat.g;
float corrPatch = 0.55 + 0.45 * smoothstep(0.25, 0.75, d2.r);
col = mix(col, col * vec3(0.86, 0.74, 0.96), corr * 0.8 * corrPatch);
col = mix(col, vec3(0.1, 0.08, 0.09), corr * 0.18);
float tVein = smoothstep(0.12, 0.02, d1.g) * smoothstep(0.45, 0.9, corr) * smoothstep(0.5, 0.72, d2.b + d2.r * 0.3) * (1.0 - farF * 0.8);
col = mix(col, vec3(0.1, 0.03, 0.13), tVein * 0.5);
// cavidade (vales mais escuros)
col *= mix(0.82, 1.05, smoothstep(0.25, 0.62, wn.w));
// umidade: escurece e deixa mais liso
float wet = uWetness * (0.55 + 0.45 * tN.y) * (1.0 - snow);
col *= 1.0 - 0.4 * wet;
float tRough = mix(0.97, 0.38, wet);
tRough = mix(tRough, 0.82, rockW * (1.0 - wet));
// poças: chão plano e baixo (vales, estradas) quando o mundo está molhado
// manchas raras (~10% do chão plano), mais comuns em estradas e baixadas
float pudN = texture(tDetail, wxz * (1.0 / 23.0) + 0.73).b + road * 0.06 + clamp((0.45 - wn.w) * 0.3, -0.05, 0.06);
float tPuddle = smoothstep(0.665, 0.69, pudN) * smoothstep(0.975, 0.995, wn.y)
  * smoothstep(PUDDLE_WET, PUDDLE_WET + 0.25, uWetness) * (1.0 - snow) * (1.0 - rockW) * (1.0 - farF * 0.7);
tPuddle *= 1.0 - smoothstep(0.55, 0.8, d1.a); // pedriscos furam a lâmina d'água
col *= 1.0 - 0.5 * tPuddle;
tRough = mix(tRough, 0.06, tPuddle);
// ondinhas da chuva (só perto: some ao longe)
vec2 rip = rainRipples(wxz, uTime) * uRain * (1.0 - uSnow) * (1.0 - smoothstep(12.0, 35.0, camDist));
tN = normalize(mix(tN, normalize(vec3(rip.x * 0.35, 1.0, rip.y * 0.35)), tPuddle));
diffuseColor.rgb *= col;
`;

/** Anel de montanhas fora do mapa (horizonte), com cores por vértice. Construído uma vez. */
function buildHorizon(hf: Heightfield): THREE.Mesh {
  const E = TERRAIN.horizonExtent;
  const cell = TERRAIN.horizonCell;
  const n = Math.round((E * 2) / cell);
  const noise = new Simplex2(991);
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const heightAt = (x: number, z: number) => {
    const cxl = clamp(x, -WORLD_HALF, WORLD_HALF);
    const czl = clamp(z, -WORLD_HALF, WORLD_HALF);
    const edgeH = hf.heightAt(cxl, czl);
    const o = Math.max(Math.abs(x), Math.abs(z)) - WORLD_HALF;
    if (o <= 0) return edgeH;
    const rise = smoothstep(0, 500, o);
    const ridges = noise.ridged(x / 520, z / 520, 4) * 260 + noise.fbm(x / 220, z / 220, 3) * 40;
    return edgeH * (1 - rise * 0.4) + rise * (90 + ridges) + o * 0.05;
  };
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = -E + i * cell;
      const z = -E + j * cell;
      pos.push(x, heightAt(x, z), z);
    }
  }
  const inner = (x: number, z: number) => Math.abs(x) < WORLD_HALF - 1 && Math.abs(z) < WORLD_HALF - 1;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x0 = -E + i * cell;
      const z0 = -E + j * cell;
      // pula células inteiramente dentro do mapa
      if (inner(x0 + 1, z0 + 1) && inner(x0 + cell - 1, z0 + cell - 1)) continue;
      const a = j * (n + 1) + i;
      const b = a + 1;
      const c = a + n + 1;
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let k = 0; k < pos.length / 3; k++) {
    const y = pos[k * 3 + 1];
    const ny = nrm.getY(k);
    const v = noise.noise(pos[k * 3] / 90, pos[k * 3 + 2] / 90) * 0.5 + 0.5;
    let r = 0.36 + v * 0.08;
    let gg = 0.34 + v * 0.07;
    let b = 0.31 + v * 0.06;
    // floresta escura nas encostas baixas e suaves
    const forest = smoothstep(130, 70, y) * smoothstep(0.75, 0.9, ny);
    r = r * (1 - forest) + 0.13 * forest;
    gg = gg * (1 - forest) + 0.21 * forest;
    b = b * (1 - forest) + 0.12 * forest;
    const snow = smoothstep(170, 240, y + v * 40) * smoothstep(0.55, 0.8, ny);
    r = r * (1 - snow) + 0.86 * snow;
    gg = gg * (1 - snow) + 0.89 * snow;
    b = b * (1 - snow) + 0.95 * snow;
    col.push(r, gg, b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }));
  m.name = 'horizonte';
  m.matrixAutoUpdate = false;
  m.receiveShadow = false;
  m.castShadow = false;
  return m;
}
