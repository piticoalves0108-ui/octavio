import * as THREE from 'three';

/**
 * Tecido por integração de Verlet (capa e tabardo do mago).
 * - Simulado em espaço do MUNDO: a inércia do corpo (correr, voar, girar) faz a capa
 *   reagir naturalmente; vento e arrasto aerodinâmico vêm da velocidade relativa do ar.
 * - Linha superior presa a um osso; colisão com esferas presas a ossos e com o chão.
 * - Passo fixo (60 Hz) com acumulador; zero alocação por frame.
 */

export interface ClothSphere {
  bone: THREE.Object3D;
  offset: THREE.Vector3;
  radius: number;
}

export interface ClothConfig {
  cols: number;
  rows: number;
  /** Comprimento total (m) de cima até a bainha. */
  length: number;
  /** Alargamento da largura na bainha (0.5 = 50% mais larga embaixo). */
  flare: number;
  /** Osso ao qual a linha superior está presa. */
  anchor: THREE.Object3D;
  /** Pontos da linha superior no espaço do osso (cols pontos, em ordem). */
  anchorPoints: THREE.Vector3[];
  /** Direção "para fora do corpo" no espaço do osso, usada no layout de repouso. */
  restOut: THREE.Vector3;
  spheres: ClothSphere[];
  /** Faixa de U das UVs (para escalar padrões em peças estreitas). */
  uRange?: [number, number];
  /** Gravidade (m/s²) e coeficiente de arrasto do ar (1/s). */
  gravity?: number;
  drag?: number;
  /** Rigidez das restrições de dobra (0..1). */
  bendStiffness?: number;
  iterations?: number;
}

const STEP = 1 / 60;
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

export class Cloth {
  readonly mesh: THREE.Mesh;
  readonly geometry: THREE.BufferGeometry;
  private n: number;
  private p: Float32Array;
  private prev: Float32Array;
  private pinned: Uint8Array;
  private cA: Uint16Array;
  private cB: Uint16Array;
  private cRest: Float32Array;
  private cStiff: Float32Array;
  private sphereW: Float32Array;
  private posAttr: THREE.BufferAttribute;
  private nrmAttr: THREE.BufferAttribute;
  private acc = 0;
  private time = 0;
  private lastAnchor = new THREE.Vector3();
  private needsReset = true;
  /** Âncoras no mundo no frame anterior e no atual (interpoladas entre subpassos). */
  private anchorPrev: Float32Array;
  private anchorCur: Float32Array;
  /** Fração do deslocamento das âncoras "carregada" pelo tecido inteiro (reduz estiramento em alta velocidade). */
  carry = 0.75;
  /** Velocidade do ar (vento do mundo) em m/s — definida pelo dono a cada frame. */
  readonly wind = new THREE.Vector3();
  /** Altura do chão sob o personagem (impede a capa de atravessar o terreno). */
  groundY = -Infinity;
  /** Agitação extra (0..1), ex.: voo em alta velocidade. */
  flutter = 0;

  constructor(private cfg: ClothConfig, material: THREE.Material) {
    const { cols, rows } = cfg;
    this.n = cols * rows;
    this.p = new Float32Array(this.n * 3);
    this.prev = new Float32Array(this.n * 3);
    this.pinned = new Uint8Array(this.n);
    for (let c = 0; c < cols; c++) this.pinned[c] = 1;
    this.sphereW = new Float32Array(cfg.spheres.length * 3);
    this.anchorPrev = new Float32Array(cols * 3);
    this.anchorCur = new Float32Array(cols * 3);

    // Restrições: estruturais (horizontal/vertical), cisalhamento e dobra (pula um).
    const a: number[] = [];
    const b: number[] = [];
    const rest: number[] = [];
    const stiff: number[] = [];
    const seg = cfg.length / (rows - 1);
    const topW: number[] = [];
    for (let c = 0; c < cols - 1; c++) topW.push(cfg.anchorPoints[c].distanceTo(cfg.anchorPoints[c + 1]));
    const hLen = (r: number, c: number) => topW[c] * (1 + (cfg.flare * r) / (rows - 1));
    const bend = cfg.bendStiffness ?? 0.35;
    const id = (r: number, c: number) => r * cols + c;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (c < cols - 1) {
          a.push(id(r, c));
          b.push(id(r, c + 1));
          rest.push(hLen(r, c));
          stiff.push(1);
        }
        if (r < rows - 1) {
          a.push(id(r, c));
          b.push(id(r + 1, c));
          rest.push(seg);
          stiff.push(1);
        }
        if (r < rows - 1 && c < cols - 1) {
          const d = Math.hypot(seg, (hLen(r, c) + hLen(r + 1, c)) * 0.5);
          a.push(id(r, c));
          b.push(id(r + 1, c + 1));
          rest.push(d);
          stiff.push(0.5);
          a.push(id(r, c + 1));
          b.push(id(r + 1, c));
          rest.push(d);
          stiff.push(0.5);
        }
        if (r < rows - 2) {
          a.push(id(r, c));
          b.push(id(r + 2, c));
          rest.push(seg * 2);
          stiff.push(bend);
        }
        if (c < cols - 2) {
          a.push(id(r, c));
          b.push(id(r, c + 2));
          rest.push(hLen(r, c) + hLen(r, c + 1));
          stiff.push(bend);
        }
      }
    }
    this.cA = new Uint16Array(a);
    this.cB = new Uint16Array(b);
    this.cRest = new Float32Array(rest);
    this.cStiff = new Float32Array(stiff);

    // Geometria: grade com UVs; posições em espaço do mundo (malha na raiz da cena).
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(new Float32Array(this.n * 3), 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    this.nrmAttr = new THREE.BufferAttribute(new Float32Array(this.n * 3), 3);
    this.nrmAttr.setUsage(THREE.DynamicDrawUsage);
    const uv = new Float32Array(this.n * 2);
    const [u0, u1] = cfg.uRange ?? [0, 1];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        uv[id(r, c) * 2] = u0 + (u1 - u0) * (c / (cols - 1));
        uv[id(r, c) * 2 + 1] = r / (rows - 1);
      }
    const idx: number[] = [];
    for (let r = 0; r < rows - 1; r++)
      for (let c = 0; c < cols - 1; c++) {
        // ordem escolhida para que a face "de fora" (cross(dCol, dRow)) seja a frontal
        idx.push(id(r, c), id(r, c + 1), id(r + 1, c));
        idx.push(id(r, c + 1), id(r + 1, c + 1), id(r + 1, c));
      }
    g.setAttribute('position', this.posAttr);
    g.setAttribute('normal', this.nrmAttr);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    this.geometry = g;
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.matrixAutoUpdate = false;
    this.mesh.name = 'tecido';
  }

  /** Recoloca o tecido na pose de repouso (após teleporte/renascimento). */
  reset() {
    this.needsReset = true;
  }

  private doReset() {
    const { cols, rows, anchor, anchorPoints, restOut, length } = this.cfg;
    anchor.updateWorldMatrix(true, false);
    const seg = length / (rows - 1);
    const down = _w.set(0, -1, 0);
    const out = new THREE.Vector3().copy(restOut).transformDirection(anchor.matrixWorld);
    for (let c = 0; c < cols; c++) {
      _v.copy(anchorPoints[c]).applyMatrix4(anchor.matrixWorld);
      this.anchorPrev[c * 3] = this.anchorCur[c * 3] = _v.x;
      this.anchorPrev[c * 3 + 1] = this.anchorCur[c * 3 + 1] = _v.y;
      this.anchorPrev[c * 3 + 2] = this.anchorCur[c * 3 + 2] = _v.z;
      for (let r = 0; r < rows; r++) {
        const i = (r * cols + c) * 3;
        this.p[i] = _v.x + down.x * r * seg + out.x * r * seg * 0.15;
        this.p[i + 1] = _v.y + down.y * r * seg;
        this.p[i + 2] = _v.z + down.z * r * seg + out.z * r * seg * 0.15;
        this.prev[i] = this.p[i];
        this.prev[i + 1] = this.p[i + 1];
        this.prev[i + 2] = this.p[i + 2];
      }
    }
    _v.setFromMatrixPosition(anchor.matrixWorld);
    this.lastAnchor.copy(_v);
    this.needsReset = false;
    this.acc = 0;
  }

  /** Avança a simulação. Chamar depois de posicionar os ossos (matrizes do mundo atualizadas). */
  update(dt: number) {
    const cfg = this.cfg;
    _v.setFromMatrixPosition(cfg.anchor.matrixWorld);
    if (this.needsReset || _v.distanceToSquared(this.lastAnchor) > 25) this.doReset();
    this.lastAnchor.copy(_v);

    // Âncoras deste frame
    const am = cfg.anchor.matrixWorld;
    for (let c = 0; c < cfg.cols; c++) {
      this.anchorPrev[c * 3] = this.anchorCur[c * 3];
      this.anchorPrev[c * 3 + 1] = this.anchorCur[c * 3 + 1];
      this.anchorPrev[c * 3 + 2] = this.anchorCur[c * 3 + 2];
      _w.copy(cfg.anchorPoints[c]).applyMatrix4(am);
      this.anchorCur[c * 3] = _w.x;
      this.anchorCur[c * 3 + 1] = _w.y;
      this.anchorCur[c * 3 + 2] = _w.z;
    }
    this.acc = Math.min(this.acc + dt, STEP * 4);
    const steps = Math.floor(this.acc / STEP);
    for (let s = 1; s <= steps; s++) {
      this.acc -= STEP;
      this.step(STEP, s / steps, 1 / steps);
    }
    if (steps > 0) this.writeGeometry();
  }

  private step(h: number, alpha: number, frac: number) {
    const cfg = this.cfg;
    const { cols } = cfg;
    const p = this.p;
    const prev = this.prev;
    const grav = cfg.gravity ?? 11;
    const drag = cfg.drag ?? 2.2;
    const damp = 0.985;
    this.time += h;
    const t = this.time;
    const flutter = this.flutter;
    const wx = this.wind.x;
    const wy = this.wind.y;
    const wz = this.wind.z;

    // Âncoras (linha superior) seguem o osso, interpoladas entre o frame anterior e o atual.
    const ap = this.anchorPrev;
    const ac = this.anchorCur;
    for (let c = 0; c < cols; c++) {
      const i = c * 3;
      prev[i] = p[i];
      prev[i + 1] = p[i + 1];
      prev[i + 2] = p[i + 2];
      p[i] = ap[i] + (ac[i] - ap[i]) * alpha;
      p[i + 1] = ap[i + 1] + (ac[i + 1] - ap[i + 1]) * alpha;
      p[i + 2] = ap[i + 2] + (ac[i + 2] - ap[i + 2]) * alpha;
    }
    // Deslocamento "carregado" (referencial que acompanha o corpo).
    const mid = (cols >> 1) * 3;
    const carry = this.carry;
    const cx = (ac[mid] - ap[mid]) * frac * carry;
    const cy = (ac[mid + 1] - ap[mid + 1]) * frac * carry;
    const cz = (ac[mid + 2] - ap[mid + 2]) * frac * carry;
    // Esferas de colisão no mundo.
    const sw = this.sphereW;
    for (let s = 0; s < cfg.spheres.length; s++) {
      const sp = cfg.spheres[s];
      _w.copy(sp.offset).applyMatrix4(sp.bone.matrixWorld);
      sw[s * 3] = _w.x;
      sw[s * 3 + 1] = _w.y;
      sw[s * 3 + 2] = _w.z;
    }

    // Integração de Verlet com gravidade, arrasto relativo ao ar e tremulação.
    const h2 = h * h;
    for (let k = cols; k < this.n; k++) {
      const i = k * 3;
      const vx = (p[i] - prev[i]) * damp;
      const vy = (p[i + 1] - prev[i + 1]) * damp;
      const vz = (p[i + 2] - prev[i + 2]) * damp;
      const row = (k / cols) | 0;
      const col = k - row * cols;
      const fl = flutter * (Math.sin(t * 17 + row * 1.3 + col * 0.9) + Math.sin(t * 23.7 + row * 2.1)) * 6;
      // velocidade real = própria + carregada
      const ax = (wx - (vx + cx) / h) * drag + fl;
      const ay = (wy - (vy + cy) / h) * drag * 0.6 - grav + fl * 0.6;
      const az = (wz - (vz + cz) / h) * drag - fl;
      prev[i] = p[i] + cx;
      prev[i + 1] = p[i + 1] + cy;
      prev[i + 2] = p[i + 2] + cz;
      p[i] += vx + ax * h2 + cx;
      p[i + 1] += vy + ay * h2 + cy;
      p[i + 2] += vz + az * h2 + cz;
    }

    // Restrições de distância + colisões.
    const iters = cfg.iterations ?? 4;
    const cA = this.cA;
    const cB = this.cB;
    const rest = this.cRest;
    const stiff = this.cStiff;
    const pin = this.pinned;
    for (let it = 0; it < iters; it++) {
      for (let j = 0; j < cA.length; j++) {
        const a = cA[j];
        const b = cB[j];
        const ia = a * 3;
        const ib = b * 3;
        const dx = p[ib] - p[ia];
        const dy = p[ib + 1] - p[ia + 1];
        const dz = p[ib + 2] - p[ia + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = ((d - rest[j]) / d) * stiff[j];
        const wa = pin[a] ? 0 : 1;
        const wb = pin[b] ? 0 : 1;
        const ws = wa + wb;
        if (ws === 0) continue;
        const ka = (diff * wa) / ws;
        const kb = (diff * wb) / ws;
        p[ia] += dx * ka;
        p[ia + 1] += dy * ka;
        p[ia + 2] += dz * ka;
        p[ib] -= dx * kb;
        p[ib + 1] -= dy * kb;
        p[ib + 2] -= dz * kb;
      }
      this.collide();
    }
  }

  private collide() {
    const cfg = this.cfg;
    const p = this.p;
    const sw = this.sphereW;
    const ns = cfg.spheres.length;
    const gy = this.groundY + 0.03;
    for (let k = cfg.cols; k < this.n; k++) {
      const i = k * 3;
      for (let s = 0; s < ns; s++) {
        const r = cfg.spheres[s].radius;
        const dx = p[i] - sw[s * 3];
        const dy = p[i + 1] - sw[s * 3 + 1];
        const dz = p[i + 2] - sw[s * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r * r) {
          const d = Math.sqrt(d2) || 1e-6;
          const k2 = (r - d) / d;
          p[i] += dx * k2;
          p[i + 1] += dy * k2;
          p[i + 2] += dz * k2;
        }
      }
      if (p[i + 1] < gy) p[i + 1] = gy;
    }
  }

  private writeGeometry() {
    const { cols, rows } = this.cfg;
    const p = this.p;
    const pos = this.posAttr.array as Float32Array;
    pos.set(p);
    const nrm = this.nrmAttr.array as Float32Array;
    for (let r = 0; r < rows; r++) {
      const r0 = r > 0 ? r - 1 : r;
      const r1 = r < rows - 1 ? r + 1 : r;
      for (let c = 0; c < cols; c++) {
        const c0 = c > 0 ? c - 1 : c;
        const c1 = c < cols - 1 ? c + 1 : c;
        const ia = (r * cols + c0) * 3;
        const ib = (r * cols + c1) * 3;
        const ic = (r0 * cols + c) * 3;
        const id = (r1 * cols + c) * 3;
        // dCol × dRow = normal da face externa
        const ux = p[ib] - p[ia];
        const uy = p[ib + 1] - p[ia + 1];
        const uz = p[ib + 2] - p[ia + 2];
        const vx = p[id] - p[ic];
        const vy = p[id + 1] - p[ic + 1];
        const vz = p[id + 2] - p[ic + 2];
        let nx = uy * vz - uz * vy;
        let ny = uz * vx - ux * vz;
        let nz = ux * vy - uy * vx;
        const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        nx /= l;
        ny /= l;
        nz /= l;
        const o = (r * cols + c) * 3;
        nrm[o] = nx;
        nrm[o + 1] = ny;
        nrm[o + 2] = nz;
      }
    }
    this.posAttr.needsUpdate = true;
    this.nrmAttr.needsUpdate = true;
  }

  /** Posição de uma partícula (testes / efeitos). */
  particle(r: number, c: number, out: THREE.Vector3): THREE.Vector3 {
    const i = (r * this.cfg.cols + c) * 3;
    return out.set(this.p[i], this.p[i + 1], this.p[i + 2]);
  }

  /** Maior estiramento relativo das restrições estruturais (diagnóstico/testes). */
  maxStretch(): number {
    let m = 0;
    for (let j = 0; j < this.cA.length; j++) {
      if (this.cStiff[j] < 1) continue;
      const ia = this.cA[j] * 3;
      const ib = this.cB[j] * 3;
      const d = Math.hypot(this.p[ib] - this.p[ia], this.p[ib + 1] - this.p[ia + 1], this.p[ib + 2] - this.p[ia + 2]);
      m = Math.max(m, Math.abs(d - this.cRest[j]) / this.cRest[j]);
    }
    return m;
  }

  dispose() {
    this.geometry.dispose();
    this.mesh.removeFromParent();
  }
}
