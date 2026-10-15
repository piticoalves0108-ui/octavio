import * as THREE from 'three';

/**
 * Rastros (ribbons) num único buffer/draw call:
 * - modo 'ribbon': fita virada para a câmera seguindo um ponto (projéteis, mãos, voo);
 * - modo 'blade': fita entre dois pontos (base e ponta da arma) — o "swoosh" do golpe.
 * Amostras envelhecem por tempo (comprimento visual independente do FPS).
 */

const SAMPLES = 20;
const MIN_INTERVAL = 1 / 60;

const VERT = /* glsl */ `
attribute vec4 aColor;
attribute float aSide;
varying vec4 vColor;
varying float vSide;
void main() {
  vColor = aColor;
  vSide = aSide;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
varying vec4 vColor;
varying float vSide;
void main() {
  float prof = 1.0 - vSide * vSide;
  float a = vColor.a * prof;
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(vColor.rgb, vec3(1.0), prof * prof * 0.35), a);
}
`;

export type TrailPointSource = (outA: THREE.Vector3, outB: THREE.Vector3) => boolean;

interface Slot {
  active: boolean;
  /** Ainda recebendo amostras (false = só desaparecendo). */
  attached: boolean;
  mode: 'ribbon' | 'blade';
  object: THREE.Object3D | null;
  source: TrailPointSource | null;
  color: THREE.Color;
  width: number;
  life: number;
  alpha: number;
  // amostras (anel, mais nova em head)
  ax: Float32Array;
  ay: Float32Array;
  az: Float32Array;
  bx: Float32Array;
  by: Float32Array;
  bz: Float32Array;
  age: Float32Array;
  head: number;
  count: number;
  sinceSample: number;
  gen: number;
}

export interface TrailHandle {
  cancel(): void;
  /** Liga/desliga a emissão (ex.: só durante o golpe), mantendo o slot. */
  setEmitting(on: boolean): void;
  setColor(color: number): void;
}

export class TrailRenderer {
  readonly mesh: THREE.Mesh;
  private slots: Slot[] = [];
  private pos: THREE.BufferAttribute;
  private col: THREE.BufferAttribute;
  private side: THREE.BufferAttribute;
  private tA = new THREE.Vector3();
  private tB = new THREE.Vector3();
  private camPos = new THREE.Vector3();
  private anyActive = false;

  constructor(private capacity: number) {
    const verts = capacity * SAMPLES * 2;
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(verts * 3), 3);
    this.col = new THREE.BufferAttribute(new Float32Array(verts * 4), 4);
    this.side = new THREE.BufferAttribute(new Float32Array(verts), 1);
    for (const a of [this.pos, this.col, this.side]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.pos);
    geo.setAttribute('aColor', this.col);
    geo.setAttribute('aSide', this.side);
    const idx: number[] = [];
    for (let t = 0; t < capacity; t++) {
      const base = t * SAMPLES * 2;
      for (let i = 0; i < SAMPLES - 1; i++) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 12;
    this.mesh.name = 'vfx-rastros';
    this.mesh.visible = false;
    for (let i = 0; i < capacity; i++) {
      this.slots.push({
        active: false,
        attached: false,
        mode: 'ribbon',
        object: null,
        source: null,
        color: new THREE.Color(),
        width: 0.2,
        life: 0.3,
        alpha: 1,
        ax: new Float32Array(SAMPLES),
        ay: new Float32Array(SAMPLES),
        az: new Float32Array(SAMPLES),
        bx: new Float32Array(SAMPLES),
        by: new Float32Array(SAMPLES),
        bz: new Float32Array(SAMPLES),
        age: new Float32Array(SAMPLES),
        head: 0,
        count: 0,
        sinceSample: 0,
        gen: 0,
      });
    }
  }

  private acquire(): Slot | null {
    for (const s of this.slots) if (!s.active) return s;
    // rouba o mais antigo que já está só desaparecendo
    for (const s of this.slots) if (!s.attached) return s;
    return null;
  }

  private handle(slot: Slot): TrailHandle {
    const gen = slot.gen;
    return {
      cancel() {
        if (slot.gen === gen) {
          slot.attached = false;
          slot.object = null;
          slot.source = null;
        }
      },
      setEmitting(on: boolean) {
        if (slot.gen !== gen) return;
        slot.attached = on;
        if (on) slot.active = true;
      },
      setColor(color: number) {
        if (slot.gen === gen) slot.color.setHex(color);
      },
    };
  }

  /** Fita seguindo um objeto (posição mundial). */
  ribbon(object: THREE.Object3D, color: number, width = 0.25, life = 0.3, alpha = 0.9): TrailHandle {
    const s = this.acquire();
    if (!s) return { cancel() {}, setEmitting() {}, setColor() {} };
    this.init(s, 'ribbon', color, width, life, alpha);
    s.object = object;
    return this.handle(s);
  }

  /** Fita entre dois pontos fornecidos por callback (base/ponta da arma). */
  blade(source: TrailPointSource, color: number, life = 0.18, alpha = 0.85): TrailHandle {
    const s = this.acquire();
    if (!s) return { cancel() {}, setEmitting() {}, setColor() {} };
    this.init(s, 'blade', color, 0, life, alpha);
    s.source = source;
    return this.handle(s);
  }

  private init(s: Slot, mode: 'ribbon' | 'blade', color: number, width: number, life: number, alpha: number) {
    s.active = true;
    s.attached = true;
    s.mode = mode;
    s.object = null;
    s.source = null;
    s.color.setHex(color);
    s.width = width;
    s.life = Math.max(0.05, life);
    s.alpha = alpha;
    s.head = 0;
    s.count = 0;
    s.sinceSample = 1;
    s.gen++;
  }

  update(dt: number, camera: THREE.Camera) {
    this.anyActive = false;
    camera.getWorldPosition(this.camPos);
    const P = this.pos.array as Float32Array;
    const C = this.col.array as Float32Array;
    const SD = this.side.array as Float32Array;
    for (let t = 0; t < this.slots.length; t++) {
      const s = this.slots[t];
      const vbase = t * SAMPLES * 2;
      if (!s.active) continue;
      // envelhece
      for (let i = 0; i < s.count; i++) s.age[(s.head - i + SAMPLES) % SAMPLES] += dt;
      while (s.count > 0 && s.age[(s.head - s.count + 1 + SAMPLES) % SAMPLES] > s.life) s.count--;
      // nova amostra
      if (s.attached) {
        let ok = false;
        if (s.mode === 'ribbon' && s.object) {
          s.object.getWorldPosition(this.tA);
          ok = true;
        } else if (s.mode === 'blade' && s.source) ok = s.source(this.tA, this.tB);
        if (ok) {
          s.sinceSample += dt;
          if (s.sinceSample >= MIN_INTERVAL || s.count === 0) {
            s.sinceSample = 0;
            s.head = (s.head + 1) % SAMPLES;
            if (s.count < SAMPLES) s.count++;
          }
          // a amostra mais nova sempre acompanha a posição atual
          const h = s.head;
          s.ax[h] = this.tA.x;
          s.ay[h] = this.tA.y;
          s.az[h] = this.tA.z;
          s.bx[h] = this.tB.x;
          s.by[h] = this.tB.y;
          s.bz[h] = this.tB.z;
          if (s.sinceSample === 0) s.age[h] = 0;
        }
      } else if (s.count === 0) {
        s.active = false;
      }
      this.anyActive = this.anyActive || s.active;
      // escreve vértices (mais nova primeiro)
      const r = s.color.r;
      const g = s.color.g;
      const b = s.color.b;
      for (let i = 0; i < SAMPLES; i++) {
        const v = vbase + i * 2;
        const valid = i < s.count;
        const idx = (s.head - Math.min(i, Math.max(0, s.count - 1)) + SAMPLES) % SAMPLES;
        const k = valid ? Math.min(1, s.age[idx] / s.life) : 1;
        const a = valid ? s.alpha * (1 - k) * (1 - k) : 0;
        if (s.mode === 'ribbon') {
          // direção local da fita (para a largura virada para a câmera)
          const nIdx = (idx - 1 + SAMPLES) % SAMPLES;
          const pIdx = (idx + 1) % SAMPLES;
          const useN = i + 1 < s.count;
          const o1 = useN ? nIdx : idx;
          const o0 = i > 0 ? pIdx : idx;
          let tx = s.ax[o0] - s.ax[o1];
          let ty = s.ay[o0] - s.ay[o1];
          let tz = s.az[o0] - s.az[o1];
          const cx = this.camPos.x - s.ax[idx];
          const cy = this.camPos.y - s.ay[idx];
          const cz = this.camPos.z - s.az[idx];
          // side = t × c
          let sx = ty * cz - tz * cy;
          let sy = tz * cx - tx * cz;
          let sz = tx * cy - ty * cx;
          const sl = Math.hypot(sx, sy, sz);
          if (sl > 1e-6) {
            const w = (s.width * (1 - k * 0.7)) / sl;
            sx *= w;
            sy *= w;
            sz *= w;
          } else sx = sy = sz = 0;
          tx = ty = tz = 0;
          P[v * 3] = s.ax[idx] + sx;
          P[v * 3 + 1] = s.ay[idx] + sy;
          P[v * 3 + 2] = s.az[idx] + sz;
          P[v * 3 + 3] = s.ax[idx] - sx;
          P[v * 3 + 4] = s.ay[idx] - sy;
          P[v * 3 + 5] = s.az[idx] - sz;
          SD[v] = -1;
          SD[v + 1] = 1;
        } else {
          P[v * 3] = s.ax[idx];
          P[v * 3 + 1] = s.ay[idx];
          P[v * 3 + 2] = s.az[idx];
          P[v * 3 + 3] = s.bx[idx];
          P[v * 3 + 4] = s.by[idx];
          P[v * 3 + 5] = s.bz[idx];
          SD[v] = -1;
          SD[v + 1] = 0;
        }
        for (let q = 0; q < 2; q++) {
          const ci = (v + q) * 4;
          C[ci] = r;
          C[ci + 1] = g;
          C[ci + 2] = b;
          C[ci + 3] = a;
        }
      }
    }
    this.mesh.visible = this.anyActive;
    if (this.anyActive) {
      this.pos.needsUpdate = true;
      this.col.needsUpdate = true;
      this.side.needsUpdate = true;
    }
  }

  activeCount(): number {
    let n = 0;
    for (const s of this.slots) if (s.active) n++;
    return n;
  }

  clear() {
    for (const s of this.slots) {
      s.active = false;
      s.attached = false;
      s.count = 0;
      s.object = null;
      s.source = null;
    }
  }
}
