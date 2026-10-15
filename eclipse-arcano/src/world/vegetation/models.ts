import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RNG } from '../../core/rng';
import { Simplex2 } from '../../core/noise';
import { GLOBAL_UNIFORMS } from '../../core/uniforms';

/**
 * Modelos procedurais de vegetação (originais): carvalho, pinheiro, árvore
 * luminosa (Floresta de Lúmen), árvore morta do pântano com musgo, árvore de
 * cristal (ruínas), arbusto e pedras. Cada espécie tem malha completa (perto) e
 * simplificada (longe). Peças geradas com primitivas do three, deformadas e
 * mescladas com BufferGeometryUtils.mergeGeometries.
 *
 * Atributos: position, normal, color, aWind (x = curvatura do vento,
 * y = tremulação das folhas, z = empurrão do jogador), aGlow (emissão).
 */

export type SpeciesId = 'oak' | 'pine' | 'lumen' | 'dead' | 'crystal' | 'bush' | 'rock';

export interface SpeciesModel {
  id: SpeciesId;
  full: THREE.BufferGeometry;
  far: THREE.BufferGeometry | null;
  /** Raio do tronco (m, escala 1) para colisor. */
  trunkRadius: number;
  /** Altura do colisor (m, escala 1). */
  colliderHeight: number;
  height: number;
}

type ColorFn = (p: THREE.Vector3, n: THREE.Vector3) => [number, number, number];
type WindFn = (p: THREE.Vector3) => [number, number, number];

const noise = new Simplex2(2121);
const _p = new THREE.Vector3();
const _n = new THREE.Vector3();

/** Prepara uma peça: não indexada, sem UV, com cor/vento/brilho por vértice. */
function part(geo: THREE.BufferGeometry, m: THREE.Matrix4, color: ColorFn, wind: WindFn, glow = 0, fluffyCenter?: THREE.Vector3, fluff = 0): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  g.applyMatrix4(m);
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nrm = g.getAttribute('normal') as THREE.BufferAttribute;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const wnd = new Float32Array(n * 3);
  const glw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    _p.fromBufferAttribute(pos, i);
    _n.fromBufferAttribute(nrm, i);
    if (fluffyCenter && fluff > 0) {
      const d = _p.clone().sub(fluffyCenter).normalize();
      _n.lerp(d, fluff).normalize();
      nrm.setXYZ(i, _n.x, _n.y, _n.z);
    }
    const c = color(_p, _n);
    col.set(c, i * 3);
    wnd.set(wind(_p), i * 3);
    glw[i] = glow;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aWind', new THREE.BufferAttribute(wnd, 3));
  g.setAttribute('aGlow', new THREE.BufferAttribute(glw, 1));
  if (g === geo) g = g.clone();
  return g;
}

/** Desloca os vértices com ruído (formas orgânicas). */
function wobble(geo: THREE.BufferGeometry, amount: number, freq: number, seed: number) {
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 1 + noise.noise(x * freq + seed, z * freq + y * freq * 0.7) * amount;
    pos.setXYZ(i, x * k, y * (1 + (k - 1) * 0.6), z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

const M = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

/** Galho/tronco: cilindro afunilado de a até b. */
function limb(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, sides: number, color: ColorFn, wind: WindFn, segs = 1): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const geo = new THREE.CylinderGeometry(r1, r0, len, sides, segs, true);
  geo.translate(0, len / 2, 0);
  const dir = b.clone().sub(a).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const m = new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1));
  return part(geo, m, color, wind);
}

const bark = (r: number, g: number, b: number): ColorFn => (p) => {
  const v = 0.82 + 0.25 * noise.noise(p.x * 3, p.y * 1.5 + p.z * 3);
  return [r * v, g * v, b * v];
};

const leafColor = (base: [number, number, number], center: THREE.Vector3, size: number, hueVar = 0.08): ColorFn => (p, n) => {
  // AO: mais escuro embaixo e no miolo; topo iluminado mais claro
  const rel = (p.y - center.y) / size;
  const inner = Math.min(1, p.clone().sub(center).length() / size);
  const v = (0.62 + 0.38 * THREE.MathUtils.smoothstep(rel, -0.8, 0.8)) * (0.7 + 0.3 * inner) * (0.92 + 0.16 * n.y);
  const h = noise.noise(p.x * 0.7, p.z * 0.7) * hueVar;
  return [base[0] * v * (1 + h), base[1] * v, base[2] * v * (1 - h)];
};

const windBy = (H: number, flutter = 0, push = 0): WindFn => (p) => [Math.pow(Math.max(0, p.y) / H, 1.5), flutter * Math.min(1, Math.max(0, p.y) / H + 0.2), push];

function finish(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const g = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  g.computeBoundingSphere();
  return g;
}

// ---------------------------------------------------------------------------

function oak(lod: 0 | 1): THREE.BufferGeometry {
  const rng = new RNG(11);
  const H = 9;
  const parts: THREE.BufferGeometry[] = [];
  const bk = bark(0.36, 0.27, 0.19);
  const w = windBy(H);
  const top = new THREE.Vector3(0.3, 4.2, 0.1);
  parts.push(limb(new THREE.Vector3(0, -0.5, 0), top, 0.55, 0.32, lod ? 5 : 8, bk, w, lod ? 1 : 3));
  const canopyC = new THREE.Vector3(0.2, 6.2, 0);
  const blobs = lod ? 2 : 7;
  if (!lod) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const end = new THREE.Vector3(Math.cos(a) * 2.4, 5.6 + rng.next(), Math.sin(a) * 2.4);
      parts.push(limb(top, end, 0.22, 0.08, 5, bk, w));
    }
  }
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rng.next();
    const r = lod ? 0.9 : 1.6 + rng.next() * 0.8;
    const c = lod ? new THREE.Vector3(Math.cos(a) * 0.8, 6.3 + i * 0.4, Math.sin(a) * 0.8) : new THREE.Vector3(Math.cos(a) * r, 5.6 + rng.next() * 2.2, Math.sin(a) * r);
    const s = lod ? 3.2 : 1.8 + rng.next() * 0.9;
    const geo = wobble(new THREE.IcosahedronGeometry(1, lod ? 0 : 1), 0.22, 1.7, i * 3.1);
    const g = part(geo, M(c.x, c.y, c.z, s * 1.1, s * 0.85, s), leafColor([0.22, 0.4, 0.15], canopyC, 3.4), windBy(H, 1), 0, canopyC, 0.65);
    parts.push(g);
  }
  if (!lod) {
    const geo = wobble(new THREE.IcosahedronGeometry(1, 1), 0.2, 1.5, 9);
    parts.push(part(geo, M(0.2, 7.6, 0, 2.2, 1.6, 2.2), leafColor([0.25, 0.44, 0.16], canopyC, 3.4), windBy(H, 1), 0, canopyC, 0.65));
  }
  return finish(parts);
}

function pine(lod: 0 | 1): THREE.BufferGeometry {
  const H = 12;
  const parts: THREE.BufferGeometry[] = [];
  const bk = bark(0.34, 0.24, 0.17);
  const w = windBy(H);
  parts.push(limb(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 10.5, 0), 0.38, 0.12, lod ? 5 : 7, bk, w));
  const tiers = lod ? 2 : 5;
  const center = new THREE.Vector3(0, 6.5, 0);
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const y0 = lod ? 2.6 + i * 4 : 2.3 + i * 1.7;
    const r = lod ? 3.0 - i * 1.2 : 3.0 - t * 2.2;
    const h = lod ? 5.5 : 3.0 - t * 0.6;
    const geo = new THREE.ConeGeometry(r, h, lod ? 6 : 9, 1, true);
    // borda serrilhada
    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      if (pos.getY(k) < 0) {
        const ang = Math.atan2(pos.getZ(k), pos.getX(k));
        const j = 1 + 0.18 * Math.sin(ang * 9 + i);
        pos.setXYZ(k, pos.getX(k) * j, pos.getY(k) - 0.25 * (j - 1) * 5, pos.getZ(k) * j);
      }
    }
    geo.computeVertexNormals();
    parts.push(part(geo, M(0, y0 + h / 2, 0, 1, 1, 1, 0, i * 0.7, 0), leafColor([0.14, 0.32, 0.2], center, 5, 0.04), windBy(H, 0.6), 0, center, 0.35));
    if (!lod) {
      // fundo da camada (sombra interna)
      const disc = new THREE.CircleGeometry(r * 0.95, 9);
      disc.rotateX(Math.PI / 2);
      parts.push(part(disc, M(0, y0 + 0.05, 0), () => [0.06, 0.13, 0.08], windBy(H, 0.3)));
    }
  }
  return finish(parts);
}

function lumen(lod: 0 | 1): THREE.BufferGeometry {
  const rng = new RNG(33);
  const H = 10;
  const parts: THREE.BufferGeometry[] = [];
  const bk = bark(0.62, 0.64, 0.66);
  const w = windBy(H);
  // tronco claro e torcido
  const pts = [new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0.5, 2, 0.2), new THREE.Vector3(-0.2, 4, -0.3), new THREE.Vector3(0.3, 5.6, 0)];
  for (let i = 0; i < pts.length - 1; i++) parts.push(limb(pts[i], pts[i + 1], 0.5 - i * 0.12, 0.38 - i * 0.12, lod ? 5 : 7, bk, w));
  const canopyC = new THREE.Vector3(0.3, 7, 0);
  const blobs = lod ? 2 : 6;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2;
    const c = new THREE.Vector3(Math.cos(a) * (lod ? 0.6 : 1.9), 6.6 + rng.next() * 1.6, Math.sin(a) * (lod ? 0.6 : 1.9));
    const s = lod ? 3 : 1.6 + rng.next() * 0.7;
    const geo = wobble(new THREE.IcosahedronGeometry(1, lod ? 0 : 1), 0.25, 1.4, i * 7.7);
    parts.push(part(geo, M(c.x, c.y, c.z, s, s * 0.8, s), leafColor([0.18, 0.44, 0.36], canopyC, 3.2, 0.15), windBy(H, 1), 0.08, canopyC, 0.6));
  }
  // frutos/orbes luminosos pendurados
  const orbs = lod ? 3 : 10;
  for (let i = 0; i < orbs; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = 1.2 + rng.next() * 2.2;
    const y = 5.0 + rng.next() * 1.4;
    const s = 0.16 + rng.next() * 0.12;
    const gold = i % 3 === 0;
    const geo = new THREE.IcosahedronGeometry(1, 0);
    parts.push(part(geo, M(Math.cos(a) * r, y, Math.sin(a) * r, s, s * 1.3, s), () => (gold ? [1, 0.8, 0.35] : [0.45, 0.95, 1]), windBy(H, 1.5), 1.6));
    if (!lod) parts.push(limb(new THREE.Vector3(Math.cos(a) * r, y + s, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r * 0.95, y + 0.9, Math.sin(a) * r * 0.95), 0.015, 0.015, 3, () => [0.5, 0.7, 0.6], windBy(H, 1.5)));
  }
  return finish(parts);
}

function dead(lod: 0 | 1): THREE.BufferGeometry {
  const rng = new RNG(44);
  const H = 7.5;
  const parts: THREE.BufferGeometry[] = [];
  const bk = bark(0.22, 0.2, 0.18);
  const w = windBy(H * 2);
  const pts = [new THREE.Vector3(0, -0.6, 0), new THREE.Vector3(0.3, 2.4, 0.2), new THREE.Vector3(-0.3, 4.6, 0.1), new THREE.Vector3(0.2, 6.8, -0.3)];
  for (let i = 0; i < pts.length - 1; i++) parts.push(limb(pts[i], pts[i + 1], 0.45 - i * 0.12, 0.33 - i * 0.11, lod ? 5 : 6, bk, w));
  const branches = lod ? 3 : 7;
  for (let i = 0; i < branches; i++) {
    const a = (i / branches) * Math.PI * 2 + rng.next();
    const base = pts[1 + (i % 3)].clone();
    const end = base.clone().add(new THREE.Vector3(Math.cos(a) * (1.8 + rng.next() * 1.6), 0.6 + rng.next() * 1.6, Math.sin(a) * (1.8 + rng.next() * 1.6)));
    parts.push(limb(base, end, 0.16, 0.04, 4, bk, w));
    if (!lod) {
      const end2 = end.clone().add(new THREE.Vector3(Math.cos(a + 0.8) * 0.9, 0.5 + rng.next() * 0.6, Math.sin(a + 0.8) * 0.9));
      parts.push(limb(end, end2, 0.05, 0.02, 3, bk, w));
      // musgo pendente (fitas)
      for (let k = 0; k < 2; k++) {
        const t = 0.5 + k * 0.3;
        const p = base.clone().lerp(end, t);
        const len = 1.0 + rng.next() * 1.4;
        const strip = new THREE.PlaneGeometry(0.22, len, 1, 3);
        strip.translate(0, -len / 2, 0);
        parts.push(part(strip, M(p.x, p.y, p.z, 1, 1, 1, 0, rng.next() * 3, 0), (q) => {
          const v = 0.8 + 0.2 * Math.sin(q.y * 4);
          return [0.36 * v, 0.42 * v, 0.28 * v];
        }, () => [0.6, 1.6, 0]));
      }
    }
  }
  return finish(parts);
}

function crystalTree(lod: 0 | 1): THREE.BufferGeometry {
  const rng = new RNG(55);
  const H = 6.5;
  const parts: THREE.BufferGeometry[] = [];
  const glass = (p: THREE.Vector3): [number, number, number] => {
    const v = 0.8 + 0.2 * Math.sin(p.y * 2.3);
    return [0.62 * v, 0.55 * v, 0.95 * v];
  };
  const trunk = new THREE.CylinderGeometry(0.28, 0.5, 4.2, 6, 1);
  parts.push(part(trunk, M(0, 1.6, 0, 1, 1, 1, 0.05, 0, 0.04), glass, () => [0, 0, 0], 0.35));
  const shards = lod ? 3 : 9;
  for (let i = 0; i < shards; i++) {
    const a = (i / shards) * Math.PI * 2 + rng.next() * 0.4;
    const tilt = 0.4 + rng.next() * 0.6;
    const len = 1.6 + rng.next() * 2.0;
    const geo = new THREE.OctahedronGeometry(1, 0);
    parts.push(part(geo, M(Math.cos(a) * 0.9, 4.0 + rng.next() * 1.5, Math.sin(a) * 0.9, 0.28, len, 0.28, Math.sin(a) * tilt, 0, -Math.cos(a) * tilt), i % 2 ? glass : () => [0.5, 0.8, 1], () => [0.15, 0, 0], 1.1));
  }
  if (!lod) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const geo = wobble(new THREE.IcosahedronGeometry(1, 0), 0.2, 2, i);
      parts.push(part(geo, M(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7, 0.6, 0.4, 0.6), () => [0.4, 0.38, 0.36], () => [0, 0, 0]));
    }
  }
  return finish(parts);
}

function bush(): THREE.BufferGeometry {
  const rng = new RNG(66);
  const parts: THREE.BufferGeometry[] = [];
  const center = new THREE.Vector3(0, 0.6, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + rng.next();
    const s = 0.5 + rng.next() * 0.35;
    const geo = wobble(new THREE.IcosahedronGeometry(1, 0), 0.2, 2.2, i * 5);
    parts.push(part(geo, M(Math.cos(a) * 0.45, 0.45 + rng.next() * 0.35, Math.sin(a) * 0.45, s * 1.15, s * 0.9, s), leafColor([0.24, 0.42, 0.16], center, 1.0, 0.1), () => [0.0, 1, 1], 0, center, 0.6));
  }
  // frutinhas
  for (let i = 0; i < 3; i++) {
    const a = rng.next() * Math.PI * 2;
    const geo = new THREE.OctahedronGeometry(1, 0);
    parts.push(part(geo, M(Math.cos(a) * 0.8, 0.6 + rng.next() * 0.5, Math.sin(a) * 0.8, 0.08, 0.08, 0.08), () => [0.75, 0.12, 0.15], () => [0, 1, 1], 0.05));
  }
  return finish(parts);
}

function rock(): THREE.BufferGeometry {
  const geo = wobble(new THREE.IcosahedronGeometry(1, 1), 0.35, 0.9, 3.3);
  const flat = geo.index ? geo.toNonIndexed() : geo;
  flat.computeVertexNormals();
  return finish([
    part(flat, M(0, 0.25, 0, 1.3, 0.75, 1.0), (p, n) => {
      const v = 0.75 + 0.25 * noise.noise(p.x * 2, p.z * 2 + p.y);
      const mossK = THREE.MathUtils.smoothstep(n.y, 0.55, 0.85);
      return [0.5 * v * (1 - mossK) + 0.3 * mossK, 0.48 * v * (1 - mossK) + 0.42 * mossK, 0.45 * v * (1 - mossK) + 0.2 * mossK];
    }, () => [0, 0, 0]),
  ]);
}

let cache: Record<SpeciesId, SpeciesModel> | null = null;

export function speciesModels(): Record<SpeciesId, SpeciesModel> {
  if (cache) return cache;
  cache = {
    oak: { id: 'oak', full: oak(0), far: oak(1), trunkRadius: 0.5, colliderHeight: 5, height: 9 },
    pine: { id: 'pine', full: pine(0), far: pine(1), trunkRadius: 0.35, colliderHeight: 6, height: 12 },
    lumen: { id: 'lumen', full: lumen(0), far: lumen(1), trunkRadius: 0.45, colliderHeight: 5, height: 10 },
    dead: { id: 'dead', full: dead(0), far: dead(1), trunkRadius: 0.4, colliderHeight: 5, height: 7.5 },
    crystal: { id: 'crystal', full: crystalTree(0), far: crystalTree(1), trunkRadius: 0.55, colliderHeight: 4, height: 6.5 },
    bush: { id: 'bush', full: bush(), far: null, trunkRadius: 0, colliderHeight: 0, height: 1.4 },
    rock: { id: 'rock', full: rock(), far: null, trunkRadius: 1, colliderHeight: 0.9, height: 1 },
  };
  return cache;
}

/**
 * Material compartilhado da vegetação instanciada: vento no vertex shader (em
 * espaço de mundo), tremulação de folhas, empurrão do jogador (arbustos) e
 * emissão (orbes/cristais) que cresce à noite.
 */
export function vegetationMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  const u = {
    uTime: GLOBAL_UNIFORMS.uTime,
    uWindDir: GLOBAL_UNIFORMS.uWindDir,
    uWindStrength: GLOBAL_UNIFORMS.uWindStrength,
    uPlayerPos: GLOBAL_UNIFORMS.uPlayerPos,
    uNight: GLOBAL_UNIFORMS.uNight,
    uWetness: GLOBAL_UNIFORMS.uWetness,
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aWind;
attribute float aGlow;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec4 uPlayerPos;
varying float vGlow;`,
      )
      .replace(
        '#include <project_vertex>',
        `vec4 vegW = vec4(transformed, 1.0);
vec3 vegRoot = vec3(0.0);
#ifdef USE_INSTANCING
vegW = instanceMatrix * vegW;
vegRoot = instanceMatrix[3].xyz;
#endif
vegW = modelMatrix * vegW;
{
  float ph = vegRoot.x * 0.13 + vegRoot.z * 0.17;
  float gust = 0.5 + 0.5 * sin(uTime * 0.7 + dot(vegRoot.xz, uWindDir) * 0.02);
  float sway = (sin(uTime * 1.1 + ph) * 0.6 + sin(uTime * 2.3 + ph * 1.7) * 0.25 + 0.45 * gust) * (0.12 + uWindStrength);
  float hgt = max(vegW.y - vegRoot.y, 0.0);
  vegW.xz += uWindDir * sway * aWind.x * 0.35 * min(hgt, 10.0) * 0.18;
  vegW.xyz += vec3(sin(uTime * 7.0 + vegW.y * 3.1 + ph), sin(uTime * 6.0 + vegW.x * 2.3) * 0.5, cos(uTime * 7.5 + vegW.z * 2.7)) * 0.035 * aWind.y * (0.3 + uWindStrength);
  vec2 dp = vegW.xz - uPlayerPos.xz;
  float dl = length(dp);
  float push = (1.0 - smoothstep(0.0, uPlayerPos.w + 0.6, dl)) * aWind.z * step(abs(vegRoot.y - uPlayerPos.y), 2.5);
  vegW.xz += dp / max(dl, 0.01) * push * 0.55 * clamp(hgt, 0.0, 1.5);
  vegW.y -= push * 0.15 * hgt;
}
vGlow = aGlow;
vec4 mvPosition = viewMatrix * vegW;
gl_Position = projectionMatrix * mvPosition;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
vec4 worldPosition = vegW;
#endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uNight;
uniform float uTime;
uniform float uWetness;
varying float vGlow;`,
      )
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 - 0.25 * uWetness;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += vColor.rgb * vGlow * (0.35 + 1.4 * uNight);`,
      );
  };
  mat.customProgramCacheKey = () => 'vegetation-v1';
  return mat;
}
