import * as THREE from 'three';

/**
 * Montador de malha procedural: junta várias primitivas (caixas, cilindros,
 * esferas...) numa única BufferGeometry com cor por vértice, tipo de brilho
 * (aGlow) e pesos de pele. Assim o corpo inteiro do mago é UMA chamada de desenho.
 * Uso apenas na construção (aloca à vontade); nada aqui roda por frame.
 */

export interface SkinInfluence {
  /** Até 4 pares (osso, peso). Pesos são normalizados no fim. */
  bones: number[];
  weights: number[];
}

export interface PartOptions {
  /** Osso dono da peça (espaço local onde a transformação é aplicada). */
  bone?: number;
  color: number;
  /** Tipo de brilho (ver GLOW em runeMaterial). */
  glow?: number;
  metal?: boolean;
  /** Escala das UVs (glifos por volta, faixas por altura). */
  uvScale?: [number, number];
  uvOffset?: [number, number];
  /** Inverte a face (para forros internos de peças abertas). */
  flip?: boolean;
  /** Pesos de pele por vértice, recebendo a posição no espaço do modelo (pose de ligação). */
  skin?: (p: THREE.Vector3) => SkinInfluence;
  /** Variação aleatória de brilho da cor (0..1) por peça, para quebrar a uniformidade. */
  tint?: number;
}

const _p = new THREE.Vector3();
const _n = new THREE.Vector3();
const _c = new THREE.Color();
const _nm = new THREE.Matrix3();

export class MeshBuilder {
  private pos: number[] = [];
  private nrm: number[] = [];
  private uv: number[] = [];
  private col: number[] = [];
  private glow: number[] = [];
  private skinIdx: number[] = [];
  private skinW: number[] = [];
  private idx: number[] = [];

  /** `boneBind[i]` = matriz mundo (espaço do modelo) do osso i na pose de ligação. */
  constructor(private boneBind: THREE.Matrix4[] = [new THREE.Matrix4()]) {}

  get vertexCount() {
    return this.pos.length / 3;
  }

  /** Adiciona uma geometria transformada por `local` (no espaço do osso). Consome a geometria. */
  add(geo: THREE.BufferGeometry, local: THREE.Matrix4, o: PartOptions): this {
    const bone = o.bone ?? 0;
    const m = new THREE.Matrix4().multiplyMatrices(this.boneBind[bone] ?? this.boneBind[0], local);
    _nm.getNormalMatrix(m);
    const pa = geo.getAttribute('position') as THREE.BufferAttribute;
    const na = geo.getAttribute('normal') as THREE.BufferAttribute | undefined;
    const ua = geo.getAttribute('uv') as THREE.BufferAttribute | undefined;
    const base = this.vertexCount;
    _c.set(o.color);
    if (o.tint) {
      const k = 1 + (Math.random() - 0.5) * o.tint;
      _c.multiplyScalar(k);
    }
    const su = o.uvScale?.[0] ?? 1;
    const sv = o.uvScale?.[1] ?? 1;
    const ou = o.uvOffset?.[0] ?? 0;
    const ov = o.uvOffset?.[1] ?? 0;
    const flip = o.flip ? -1 : 1;
    for (let i = 0; i < pa.count; i++) {
      _p.fromBufferAttribute(pa, i).applyMatrix4(m);
      this.pos.push(_p.x, _p.y, _p.z);
      if (na) {
        _n.fromBufferAttribute(na, i).applyMatrix3(_nm).normalize().multiplyScalar(flip);
        this.nrm.push(_n.x, _n.y, _n.z);
      } else this.nrm.push(0, 1, 0);
      if (ua) this.uv.push(ua.getX(i) * su + ou, ua.getY(i) * sv + ov);
      else this.uv.push(0, 0);
      this.col.push(_c.r, _c.g, _c.b);
      this.glow.push(o.glow ?? 0, o.metal ? 1 : 0);
      if (o.skin) {
        const inf = o.skin(_p);
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += inf.weights[k] ?? 0;
        for (let k = 0; k < 4; k++) {
          this.skinIdx.push(inf.bones[k] ?? 0);
          this.skinW.push(sum > 0 ? (inf.weights[k] ?? 0) / sum : k === 0 ? 1 : 0);
        }
      } else {
        this.skinIdx.push(bone, 0, 0, 0);
        this.skinW.push(1, 0, 0, 0);
      }
    }
    const index = geo.getIndex();
    const triCount = index ? index.count : pa.count;
    for (let t = 0; t < triCount; t += 3) {
      const a = index ? index.getX(t) : t;
      const b = index ? index.getX(t + 1) : t + 1;
      const c = index ? index.getX(t + 2) : t + 2;
      if (o.flip) this.idx.push(base + a, base + c, base + b);
      else this.idx.push(base + a, base + b, base + c);
    }
    geo.dispose();
    return this;
  }

  /** Caixa/cilindro esticado entre dois pontos (no espaço do osso). */
  addBetween(geo: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3, o: PartOptions): this {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, len, 1));
    return this.add(geo, m, o);
  }

  build(skinned: boolean): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glow, 2));
    if (skinned) {
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinIdx, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinW, 4));
    }
    const vc = this.vertexCount;
    g.setIndex(vc > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Matriz de transformação compacta: posição, rotação (Euler XYZ) e escala. */
export function T(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.Matrix4 {
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}

/** Cilindro cujo topo fica na origem e que desce `h` metros (membros pendurados no osso). */
export function hanging(rTop: number, rBottom: number, h: number, seg = 10, open = false, thetaStart = 0, thetaLength = Math.PI * 2, hSeg = 1) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, seg, hSeg, open, thetaStart, thetaLength);
  g.translate(0, -h / 2, 0);
  return g;
}
