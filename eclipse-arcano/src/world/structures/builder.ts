import * as THREE from 'three';
import { LAYER_TILE_M, type LayerId } from '../textures';

/**
 * Construtor de geometria mesclada para arquitetura procedural.
 *
 * Cada peça (caixa, prisma, cilindro, telhado...) é escrita direto em arrays
 * (sem BufferGeometry intermediária), já transformada pelo "quadro" atual
 * (posição + yaw do prédio). Atributos por vértice:
 *  - position, normal, uv (em metros / tamanho do ladrilho da camada)
 *  - color   (tinta multiplicada pela textura)
 *  - aLayer  (índice da camada na DataArrayTexture de materiais)
 *  - aEmit   (rgb = cor×intensidade da emissão, w = modo: 0 fixo, 1 noite, 2 pulso, 3 noite+chama)
 * No fim vira UMA BufferGeometry por grupo (1 draw call).
 */

export interface PieceOpts {
  layer: LayerId;
  /** Tinta (rgb 0..1). */
  color?: readonly [number, number, number];
  /** Emissão (rgb × intensidade) e modo. */
  emit?: readonly [number, number, number, number];
  /** Escala extra da UV (1 = tamanho padrão do ladrilho da camada). */
  uvScale?: number;
}

const WHITE = [1, 1, 1] as const;
const NO_EMIT = [0, 0, 0, 0] as const;

export class GeoBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  lay: number[] = [];
  emi: number[] = [];
  idx: number[] = [];

  // quadro atual (translação + yaw)
  private fx = 0;
  private fy = 0;
  private fz = 0;
  private fc = 1;
  private fs = 0;
  private fyaw = 0;
  private stack: number[][] = [];

  get vertexCount() {
    return this.pos.length / 3;
  }

  /** Define o quadro (origem e yaw, convenção three: local +Z → (sin yaw, 0, cos yaw)). */
  frame(x: number, y: number, z: number, yaw = 0) {
    this.fx = x;
    this.fy = y;
    this.fz = z;
    this.fyaw = yaw;
    this.fc = Math.cos(yaw);
    this.fs = Math.sin(yaw);
    return this;
  }

  /** Empilha o quadro e compõe um sub-quadro relativo (local). */
  push(lx: number, ly: number, lz: number, yaw = 0) {
    this.stack.push([this.fx, this.fy, this.fz, this.fyaw]);
    const [wx, wy, wz] = this.toWorld(lx, ly, lz);
    this.frame(wx, wy, wz, this.fyaw + yaw);
    return this;
  }

  pop() {
    const s = this.stack.pop();
    if (s) this.frame(s[0], s[1], s[2], s[3]);
    return this;
  }

  get yaw() {
    return this.fyaw;
  }

  /** Converte um ponto local para o mundo. */
  toWorld(lx: number, ly: number, lz: number): [number, number, number] {
    return [this.fx + lx * this.fc + lz * this.fs, this.fy + ly, this.fz - lx * this.fs + lz * this.fc];
  }

  private dirWorld(nx: number, ny: number, nz: number): [number, number, number] {
    return [nx * this.fc + nz * this.fs, ny, -nx * this.fs + nz * this.fc];
  }

  private vert(lx: number, ly: number, lz: number, nx: number, ny: number, nz: number, u: number, v: number, o: PieceOpts) {
    const [x, y, z] = this.toWorld(lx, ly, lz);
    const [wx, wy, wz] = this.dirWorld(nx, ny, nz);
    this.pos.push(x, y, z);
    this.nrm.push(wx, wy, wz);
    const s = (o.uvScale ?? 1) / LAYER_TILE_M[o.layer];
    this.uv.push(u * s, v * s);
    const c = o.color ?? WHITE;
    this.col.push(c[0], c[1], c[2]);
    this.lay.push(o.layer);
    const e = o.emit ?? NO_EMIT;
    this.emi.push(e[0], e[1], e[2], e[3]);
    return this.pos.length / 3 - 1;
  }

  /**
   * Quadrilátero plano (pontos locais em ordem anti-horária vista de fora).
   * UV: projeção no plano do quad (eixos u = p1 - p0, v = p3 - p0), em metros.
   */
  quad(p0: V3, p1: V3, p2: V3, p3: V3, o: PieceOpts, uv0: [number, number] = [0, 0]) {
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p3[0] - p0[0];
    const vy = p3[1] - p0[1];
    const vz = p3[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const ul = Math.hypot(ux, uy, uz) || 1;
    const vl = Math.hypot(vx, vy, vz) || 1;
    const proj = (p: V3): [number, number] => {
      const dx = p[0] - p0[0];
      const dy = p[1] - p0[1];
      const dz = p[2] - p0[2];
      return [uv0[0] + (dx * ux + dy * uy + dz * uz) / ul, uv0[1] + (dx * vx + dy * vy + dz * vz) / vl];
    };
    const a = this.vert(p0[0], p0[1], p0[2], nx, ny, nz, ...proj(p0), o);
    const b = this.vert(p1[0], p1[1], p1[2], nx, ny, nz, ...proj(p1), o);
    const c = this.vert(p2[0], p2[1], p2[2], nx, ny, nz, ...proj(p2), o);
    const d = this.vert(p3[0], p3[1], p3[2], nx, ny, nz, ...proj(p3), o);
    this.idx.push(a, b, c, a, c, d);
  }

  /** Triângulo plano. */
  /**
   * Triângulo com UV planar no plano XZ local (ladrilho contínuo entre triângulos
   * vizinhos — pisos/topos irregulares) e cor opcional por vértice (multiplica a tinta).
   */
  triPlanar(p0: V3, p1: V3, p2: V3, o: PieceOpts, tints?: readonly [readonly [number, number, number], readonly [number, number, number], readonly [number, number, number]]) {
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const base = o.color ?? WHITE;
    const pts = [p0, p1, p2];
    const ids: number[] = [];
    for (let k = 0; k < 3; k++) {
      const p = pts[k];
      const t = tints?.[k];
      const oo = t ? { ...o, color: [base[0] * t[0], base[1] * t[1], base[2] * t[2]] as const } : o;
      ids.push(this.vert(p[0], p[1], p[2], nx, ny, nz, p[0], p[2], oo));
    }
    this.idx.push(ids[0], ids[1], ids[2]);
  }

  tri(p0: V3, p1: V3, p2: V3, o: PieceOpts) {
    const ux = p1[0] - p0[0];
    const uy = p1[1] - p0[1];
    const uz = p1[2] - p0[2];
    const vx = p2[0] - p0[0];
    const vy = p2[1] - p0[1];
    const vz = p2[2] - p0[2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const nl = Math.hypot(nx, ny, nz) || 1;
    nx /= nl;
    ny /= nl;
    nz /= nl;
    const ul = Math.hypot(ux, uy, uz) || 1;
    // eixo v ortogonal no plano
    const tx = ny * uz - nz * uy;
    const ty = nz * ux - nx * uz;
    const tz = nx * uy - ny * ux;
    const tl = Math.hypot(tx, ty, tz) || 1;
    const proj = (p: V3): [number, number] => {
      const dx = p[0] - p0[0];
      const dy = p[1] - p0[1];
      const dz = p[2] - p0[2];
      return [(dx * ux + dy * uy + dz * uz) / ul, (dx * tx + dy * ty + dz * tz) / tl];
    };
    const a = this.vert(p0[0], p0[1], p0[2], nx, ny, nz, ...proj(p0), o);
    const b = this.vert(p1[0], p1[1], p1[2], nx, ny, nz, ...proj(p1), o);
    const c = this.vert(p2[0], p2[1], p2[2], nx, ny, nz, ...proj(p2), o);
    this.idx.push(a, b, c);
  }

  /**
   * Caixa centrada em (cx, cy, cz) local, com yaw local opcional.
   * `faces`: máscara de faces (bits: +X 1, -X 2, +Y 4, -Y 8, +Z 16, -Z 32).
   */
  box(cx: number, cy: number, cz: number, w: number, h: number, d: number, o: PieceOpts, yaw = 0, faces = 63) {
    const hw = w / 2;
    const hh = h / 2;
    const hd = d / 2;
    if (yaw !== 0) this.push(cx, cy, cz, yaw);
    const ox = yaw !== 0 ? 0 : cx;
    const oy = yaw !== 0 ? 0 : cy;
    const oz = yaw !== 0 ? 0 : cz;
    const x0 = ox - hw;
    const x1 = ox + hw;
    const y0 = oy - hh;
    const y1 = oy + hh;
    const z0 = oz - hd;
    const z1 = oz + hd;
    // UV com origem no mundo local (texturas contínuas entre peças vizinhas)
    if (faces & 1) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], o, [-z1, y0]);
    if (faces & 2) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], o, [z0, y0]);
    if (faces & 4) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], o, [x0, -z1]);
    if (faces & 8) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], o, [x0, z0]);
    if (faces & 16) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], o, [x0, y0]);
    if (faces & 32) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], o, [-x1, y0]);
    if (yaw !== 0) this.pop();
  }

  /** Caixa entre dois pontos no plano XZ (vigas, muros, cercas). Altura de y0 a y1. */
  beam(ax: number, az: number, bx: number, bz: number, y0: number, y1: number, thick: number, o: PieceOpts, faces = 63) {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) return;
    const yaw = Math.atan2(dx, dz); // local +Z ao longo do segmento
    this.box((ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2, thick, y1 - y0, len, o, yaw, faces);
  }

  /**
   * Viga entre dois pontos 3D quaisquer (seção quadrada). Usada em treliças,
   * enxaimel diagonal, mãos-francesas e galhos.
   */
  strut(a: V3, b: V3, thick: number, o: PieceOpts) {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    if (len < 1e-4) return;
    d.divideScalar(len);
    // base ortonormal
    const up = Math.abs(d.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const s = new THREE.Vector3().crossVectors(d, up).normalize().multiplyScalar(thick / 2);
    const t = new THREE.Vector3().crossVectors(s, d).normalize().multiplyScalar(thick / 2);
    const c = (p: V3, sx: number, tx: number): V3 => [p[0] + s.x * sx + t.x * tx, p[1] + s.y * sx + t.y * tx, p[2] + s.z * sx + t.z * tx];
    const A = [c(a, -1, -1), c(a, 1, -1), c(a, 1, 1), c(a, -1, 1)];
    const B = [c(b, -1, -1), c(b, 1, -1), c(b, 1, 1), c(b, -1, 1)];
    for (let k = 0; k < 4; k++) {
      const k2 = (k + 1) % 4;
      this.quad(A[k], A[k2], B[k2], B[k], o);
    }
    this.quad(B[0], B[1], B[2], B[3], o);
    this.quad(A[3], A[2], A[1], A[0], o);
  }

  /**
   * Cilindro/prisma vertical (base em y0). rBot/rTop podem diferir (tronco de cone).
   * `capTop`/`capBot` fecham as tampas. `smooth` = normais suaves.
   */
  cylinder(cx: number, y0: number, cz: number, rBot: number, rTop: number, h: number, sides: number, o: PieceOpts, capTop = true, capBot = false, smooth = true, a0 = 0) {
    const y1 = y0 + h;
    const slope = (rBot - rTop) / h;
    const circ = 2 * Math.PI * Math.max(rBot, rTop);
    for (let i = 0; i < sides; i++) {
      const aA = a0 + (i / sides) * Math.PI * 2;
      const aB = a0 + ((i + 1) / sides) * Math.PI * 2;
      const sa = Math.sin(aA);
      const ca = Math.cos(aA);
      const sb = Math.sin(aB);
      const cb = Math.cos(aB);
      const uA = (i / sides) * circ;
      const uB = ((i + 1) / sides) * circ;
      let nA: V3;
      let nB: V3;
      if (smooth) {
        nA = norm3([sa, slope, ca]);
        nB = norm3([sb, slope, cb]);
      } else {
        const am = (aA + aB) / 2;
        nA = nB = norm3([Math.sin(am), slope, Math.cos(am)]);
      }
      const v0 = this.vert(cx + sa * rBot, y0, cz + ca * rBot, nA[0], nA[1], nA[2], uA, 0, o);
      const v1 = this.vert(cx + sb * rBot, y0, cz + cb * rBot, nB[0], nB[1], nB[2], uB, 0, o);
      const v2 = this.vert(cx + sb * rTop, y1, cz + cb * rTop, nB[0], nB[1], nB[2], uB, h, o);
      const v3 = this.vert(cx + sa * rTop, y1, cz + ca * rTop, nA[0], nA[1], nA[2], uA, h, o);
      this.idx.push(v0, v1, v2, v0, v2, v3);
    }
    if (capTop && rTop > 0.001) this.disc(cx, y1, cz, rTop, sides, o, true, a0);
    if (capBot && rBot > 0.001) this.disc(cx, y0, cz, rBot, sides, o, false, a0);
  }

  /** Disco horizontal (tampa). */
  disc(cx: number, y: number, cz: number, r: number, sides: number, o: PieceOpts, up = true, a0 = 0) {
    const ny = up ? 1 : -1;
    const c = this.vert(cx, y, cz, 0, ny, 0, cx, cz, o);
    const first = this.pos.length / 3;
    for (let i = 0; i <= sides; i++) {
      const a = a0 + (i / sides) * Math.PI * 2;
      const x = cx + Math.sin(a) * r;
      const z = cz + Math.cos(a) * r;
      this.vert(x, y, z, 0, ny, 0, x, z, o);
    }
    for (let i = 0; i < sides; i++) {
      if (up) this.idx.push(c, first + i, first + i + 1);
      else this.idx.push(c, first + i + 1, first + i);
    }
  }

  /** Anel horizontal (coroa) entre r0 e r1. */
  ring(cx: number, y: number, cz: number, r0: number, r1: number, sides: number, o: PieceOpts, up = true) {
    const ny = up ? 1 : -1;
    for (let i = 0; i < sides; i++) {
      const aA = (i / sides) * Math.PI * 2;
      const aB = ((i + 1) / sides) * Math.PI * 2;
      const p = (a: number, r: number) => [cx + Math.sin(a) * r, cz + Math.cos(a) * r];
      const [ax0, az0] = p(aA, r0);
      const [bx0, bz0] = p(aB, r0);
      const [ax1, az1] = p(aA, r1);
      const [bx1, bz1] = p(aB, r1);
      const v0 = this.vert(ax0, y, az0, 0, ny, 0, ax0, az0, o);
      const v1 = this.vert(bx0, y, bz0, 0, ny, 0, bx0, bz0, o);
      const v2 = this.vert(bx1, y, bz1, 0, ny, 0, bx1, bz1, o);
      const v3 = this.vert(ax1, y, az1, 0, ny, 0, ax1, az1, o);
      if (up) this.idx.push(v0, v2, v1, v0, v3, v2);
      else this.idx.push(v0, v1, v2, v0, v2, v3);
    }
  }

  /** Cone/pirâmide (ponta em y0+h). */
  cone(cx: number, y0: number, cz: number, r: number, h: number, sides: number, o: PieceOpts, capBot = false, a0 = 0) {
    this.cylinder(cx, y0, cz, r, 0.0001, h, sides, o, false, capBot, sides > 6, a0);
  }

  /**
   * Telhado de duas águas: cumeeira ao longo do eixo local X, base em y0,
   * largura total `w` (X, já com beiral), profundidade `d` (Z), altura `h`.
   * Inclui as empenas triangulares (camada `gable`, se dada) e a espessura da borda.
   */
  gableRoof(cx: number, y0: number, cz: number, w: number, d: number, h: number, o: PieceOpts, gable?: PieceOpts, thick = 0.18) {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    const yr = y0 + h;
    // águas (lado +Z e lado -Z)
    this.quad([x0, y0, z1], [x1, y0, z1], [x1, yr, cz], [x0, yr, cz], o);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, yr, cz], [x1, yr, cz], o);
    // espessura (faixa vertical na borda)
    this.quad([x0, y0 - thick, z1], [x1, y0 - thick, z1], [x1, y0, z1], [x0, y0, z1], o);
    this.quad([x1, y0 - thick, z0], [x0, y0 - thick, z0], [x0, y0, z0], [x1, y0, z0], o);
    // forro (por baixo do beiral)
    this.quad([x0, y0 - thick, z0], [x1, y0 - thick, z0], [x1, y0 - thick, z1], [x0, y0 - thick, z1], o);
    if (gable) {
      const gi = 0.35; // empena recuada (dentro do beiral)
      this.tri([x0 + gi, y0, z1 - gi], [x0 + gi, yr - 0.15, cz], [x0 + gi, y0, z0 + gi], gable);
      this.tri([x1 - gi, y0, z0 + gi], [x1 - gi, yr - 0.15, cz], [x1 - gi, y0, z1 - gi], gable);
    }
    // espessura das bordas inclinadas (oitões)
    this.quad([x0, y0 - thick, z1], [x0, y0, z1], [x0, yr, cz], [x0, yr - thick, cz], o);
    this.quad([x0, yr - thick, cz], [x0, yr, cz], [x0, y0, z0], [x0, y0 - thick, z0], o);
    this.quad([x1, y0, z1], [x1, y0 - thick, z1], [x1, yr - thick, cz], [x1, yr, cz], o);
    this.quad([x1, yr, cz], [x1, yr - thick, cz], [x1, y0 - thick, z0], [x1, y0, z0], o);
  }

  /** Pirâmide de base retangular (telhados de torres quadradas). */
  pyramid(cx: number, y0: number, cz: number, w: number, d: number, h: number, o: PieceOpts) {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    const top: V3 = [cx, y0 + h, cz];
    this.tri([x0, y0, z1], [x1, y0, z1], top, o);
    this.tri([x1, y0, z1], [x1, y0, z0], top, o);
    this.tri([x1, y0, z0], [x0, y0, z0], top, o);
    this.tri([x0, y0, z0], [x0, y0, z1], top, o);
  }

  /**
   * Arco semicircular no plano XY local (vão ao longo de X), espessura em Z.
   * Gera o intradorso + faces frontal/traseira em `segs` aduelas.
   */
  arch(cx: number, cy: number, cz: number, span: number, rise: number, thick: number, depth: number, segs: number, o: PieceOpts) {
    const r = span / 2;
    const z0 = cz - depth / 2;
    const z1 = cz + depth / 2;
    for (let i = 0; i < segs; i++) {
      const a0 = Math.PI - (i / segs) * Math.PI;
      const a1 = Math.PI - ((i + 1) / segs) * Math.PI;
      const ix0 = cx + Math.cos(a0) * r;
      const iy0 = cy + Math.sin(a0) * rise;
      const ix1 = cx + Math.cos(a1) * r;
      const iy1 = cy + Math.sin(a1) * rise;
      const ox0 = cx + Math.cos(a0) * (r + thick);
      const oy0 = cy + Math.sin(a0) * (rise + thick);
      const ox1 = cx + Math.cos(a1) * (r + thick);
      const oy1 = cy + Math.sin(a1) * (rise + thick);
      // frente e trás
      this.quad([ix0, iy0, z1], [ix1, iy1, z1], [ox1, oy1, z1], [ox0, oy0, z1], o);
      this.quad([ix1, iy1, z0], [ix0, iy0, z0], [ox0, oy0, z0], [ox1, oy1, z0], o);
      // intradorso (de baixo) e extradorso
      this.quad([ix1, iy1, z0], [ix1, iy1, z1], [ix0, iy0, z1], [ix0, iy0, z0], o);
      this.quad([ox0, oy0, z0], [ox0, oy0, z1], [ox1, oy1, z1], [ox1, oy1, z0], o);
    }
  }

  /** Copia uma geometria three (indexada ou não) aplicando o quadro atual + offset/escala local. */
  addGeometry(g: THREE.BufferGeometry, o: PieceOpts, lx = 0, ly = 0, lz = 0, sx = 1, sy = 1, sz = 1, yaw = 0) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const base = this.pos.length / 3;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    for (let i = 0; i < p.count; i++) {
      const x0 = p.getX(i) * sx;
      const y0 = p.getY(i) * sy;
      const z0 = p.getZ(i) * sz;
      const x = lx + x0 * c + z0 * s;
      const z = lz - x0 * s + z0 * c;
      const y = ly + y0;
      let nx = n ? n.getX(i) / sx : 0;
      let ny = n ? n.getY(i) / sy : 1;
      let nz = n ? n.getZ(i) / sz : 0;
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      const rnx = nx * c + nz * s;
      const rnz = -nx * s + nz * c;
      // UV triplanar simples pela normal dominante
      const ax = Math.abs(rnx);
      const ay = Math.abs(ny);
      const az = Math.abs(rnz);
      const u = ay >= ax && ay >= az ? x : ax >= az ? z : x;
      const v = ay >= ax && ay >= az ? z : y;
      this.vert(x, y, z, rnx, ny, rnz, u, v, o);
    }
    const index = g.getIndex();
    if (index) for (let i = 0; i < index.count; i++) this.idx.push(base + index.getX(i));
    else for (let i = 0; i < p.count; i++) this.idx.push(base + i);
  }

  /** Mescla outro construtor neste (sem transformar). */
  merge(other: GeoBuilder) {
    const base = this.pos.length / 3;
    this.pos.push(...other.pos);
    this.nrm.push(...other.nrm);
    this.uv.push(...other.uv);
    this.col.push(...other.col);
    this.lay.push(...other.lay);
    this.emi.push(...other.emi);
    for (const i of other.idx) this.idx.push(base + i);
  }

  isEmpty() {
    return this.idx.length === 0;
  }

  /** Gera a BufferGeometry final (indexada, com bounding sphere). */
  toGeometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aLayer', new THREE.Float32BufferAttribute(this.lay, 1));
    g.setAttribute('aEmit', new THREE.Float32BufferAttribute(this.emi, 4));
    const vc = this.pos.length / 3;
    g.setIndex(vc > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export type V3 = [number, number, number];

function norm3(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** Atalho para opções de peça. */
export function P(layer: LayerId, color?: readonly [number, number, number], emit?: readonly [number, number, number, number], uvScale?: number): PieceOpts {
  return { layer, color, emit, uvScale };
}
