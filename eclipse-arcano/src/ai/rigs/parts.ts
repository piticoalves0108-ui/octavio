import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Construtor de geometria procedural com cor por vértice e brilho (atributo `glow`).
 * Cada osso de um rig vira UMA malha (primitivas fundidas), com material compartilhado
 * por inimigo — poucas chamadas de desenho por modelo.
 */
export interface PartOpts {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  /** 0..1+ — intensidade emissiva (a cor do vértice brilha). */
  glow?: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export class PartBuilder {
  private geos: THREE.BufferGeometry[] = [];

  private push(g: THREE.BufferGeometry, color: number, o: PartOpts = {}) {
    g.deleteAttribute('uv');
    _e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    _q.setFromEuler(_e);
    _p.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    const n = g.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    const glow = new Float32Array(n);
    _c.setHex(color);
    const gv = o.glow ?? 0;
    for (let i = 0; i < n; i++) {
      col[i * 3] = _c.r;
      col[i * 3 + 1] = _c.g;
      col[i * 3 + 2] = _c.b;
      glow[i] = gv;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('glow', new THREE.BufferAttribute(glow, 1));
    if (!g.index) {
      const idx = new Uint16Array(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    this.geos.push(g);
    return this;
  }

  box(w: number, h: number, d: number, color: number, o?: PartOpts) {
    return this.push(new THREE.BoxGeometry(w, h, d), color, o);
  }
  /** Cilindro vertical (eixo Y), centrado. */
  cyl(rTop: number, rBot: number, h: number, color: number, o?: PartOpts, seg = 8) {
    return this.push(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1), color, o);
  }
  sphere(r: number, color: number, o?: PartOpts, ws = 10, hs = 7) {
    return this.push(new THREE.SphereGeometry(r, ws, hs), color, o);
  }
  cone(r: number, h: number, color: number, o?: PartOpts, seg = 8) {
    return this.push(new THREE.ConeGeometry(r, h, seg, 1), color, o);
  }
  /** Octaedro (cristais, gemas). */
  gem(r: number, color: number, o?: PartOpts) {
    return this.push(new THREE.OctahedronGeometry(r, 0), color, o);
  }
  /** Toro (anéis rúnicos). */
  torus(r: number, tube: number, color: number, o?: PartOpts, seg = 16) {
    return this.push(new THREE.TorusGeometry(r, tube, 5, seg), color, o);
  }
  /** Segmento entre dois pontos (membros, cabos, ossos). */
  limb(ax: number, ay: number, az: number, bx: number, by: number, bz: number, r0: number, r1: number, color: number, glow = 0, seg = 6) {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const len = Math.hypot(dx, dy, dz) || 1e-3;
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1);
    g.translate(0, len / 2, 0);
    // alinha +Y com (dx,dy,dz)
    _p.set(dx / len, dy / len, dz / len);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _p);
    g.applyQuaternion(_q);
    g.translate(ax, ay, az);
    return this.push(g, color, { glow });
  }

  get empty() {
    return this.geos.length === 0;
  }

  /** Funde tudo numa geometria (ou null se vazio). Libera as peças. */
  build(): THREE.BufferGeometry | null {
    if (this.geos.length === 0) return null;
    const g = mergeGeometries(this.geos, false);
    for (const p of this.geos) p.dispose();
    this.geos.length = 0;
    if (!g) return null;
    g.computeBoundingSphere();
    return g;
  }
}

/** Cache global de geometrias por chave (rig/variante/osso): compartilhadas entre inimigos. */
const GEO_CACHE = new Map<string, THREE.BufferGeometry | null>();

export function cachedGeometry(key: string, make: (b: PartBuilder) => void): THREE.BufferGeometry | null {
  if (GEO_CACHE.has(key)) return GEO_CACHE.get(key)!;
  const b = new PartBuilder();
  make(b);
  const g = b.build();
  GEO_CACHE.set(key, g);
  return g;
}

export function geometryCacheSize() {
  return GEO_CACHE.size;
}
