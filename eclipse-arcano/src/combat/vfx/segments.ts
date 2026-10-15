import * as THREE from 'three';

/**
 * Segmentos de energia (feixes, raios, correntes): cada segmento é um quad orientado
 * ao longo do eixo A→B e virado para a câmera no vertex shader. Um único draw call.
 * Os segmentos temporários vivem num buffer circular; os sustentados (lasers contínuos)
 * ocupam slots reservados no fim do buffer e são atualizados por handle.
 */

export const enum SegStyle {
  Beam = 0,
  Lightning = 1,
  Chain = 2,
}

const STRIDE = 16;

const VERT = /* glsl */ `
attribute vec4 iA; // a.xyz, t0
attribute vec4 iB; // b.xyz, duração (<0 = sustentado)
attribute vec4 iC; // cor.rgb, largura
attribute vec4 iD; // estilo, semente, intensidade, afinamento
uniform float uTime;
varying vec2 vUv;
varying vec3 vColor;
varying float vFade;
varying float vStyle;
varying float vSeed;
varying float vLen;
void main() {
  float age = uTime - iA.w;
  float dur = iB.w;
  if (age < 0.0 || (dur > 0.0 && age > dur) || iD.z <= 0.0) {
    gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
    vFade = 0.0;
    return;
  }
  vec3 a = iA.xyz;
  vec3 b = iB.xyz;
  vec3 p = mix(a, b, position.y);
  vec3 axis = b - a;
  vec3 toCam = cameraPosition - p;
  vec3 side = cross(axis, toCam);
  float sl = length(side);
  side = sl > 1e-5 ? side / sl : vec3(1.0, 0.0, 0.0);
  float w = iC.w * (1.0 - iD.w * position.y);
  p += side * (position.x * w);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  vUv = vec2(position.x * 2.0, position.y);
  vColor = iC.rgb;
  float k = dur > 0.0 ? age / dur : 0.0;
  vFade = iD.z * (dur > 0.0 ? (1.0 - smoothstep(0.45, 1.0, k)) * smoothstep(0.0, 0.04, age + 0.02) : 1.0);
  vStyle = iD.x;
  vSeed = iD.y;
  vLen = length(axis);
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vColor;
varying float vFade;
varying float vStyle;
varying float vSeed;
varying float vLen;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  if (vFade <= 0.0) discard;
  float x = abs(vUv.x);
  float core = exp(-x * x * 22.0);
  float glow = exp(-x * x * 3.5) * 0.55;
  float st = floor(vStyle + 0.5);
  float mod1 = 1.0;
  if (st < 0.5) {
    // feixe: energia correndo ao longo do eixo
    float flow = sin(vUv.y * vLen * 2.2 - uTime * 38.0 + vSeed * 10.0);
    mod1 = 0.78 + 0.22 * flow;
    core *= 1.1;
  } else if (st < 1.5) {
    // raio: cintilação aleatória em degraus
    float f = hash(floor(uTime * 34.0) + vSeed * 17.0);
    mod1 = 0.35 + 0.95 * step(0.28, f);
  } else {
    // corrente: elos
    float link = abs(fract(vUv.y * vLen * 3.0) - 0.5) * 2.0;
    mod1 = 0.45 + 0.75 * smoothstep(0.2, 0.8, link);
  }
  float a = (core + glow) * mod1 * vFade;
  if (a < 0.004) discard;
  vec3 col = mix(vColor, vec3(1.0), core * 0.75);
  gl_FragColor = vec4(col, min(a, 1.5));
}
`;

export interface SustainedSegment {
  /** Atualiza as pontas (chamar a cada quadro enquanto o feixe dura). */
  set(a: THREE.Vector3, b: THREE.Vector3): void;
  setColor(color: number): void;
  setWidth(width: number): void;
  setIntensity(v: number): void;
  cancel(): void;
  readonly active: boolean;
}

export class SegmentRenderer {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  readonly reserved: number;
  private data: Float32Array;
  private buffer: THREE.InstancedInterleavedBuffer;
  private head = 0;
  private dirty = false;
  private uTime: { value: number };
  private busyUntil = 0;
  private sustainedUsed: boolean[];
  private sustainedCount = 0;
  private tmpColor = new THREE.Color();

  constructor(capacity: number, reserved: number, uTime: { value: number }) {
    this.capacity = Math.max(32, capacity);
    this.reserved = Math.max(1, reserved);
    this.uTime = uTime;
    this.sustainedUsed = new Array(this.reserved).fill(false);
    const total = this.capacity + this.reserved;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.data = new Float32Array(total * STRIDE);
    for (let i = 0; i < total; i++) {
      this.data[i * STRIDE + 3] = -1e6;
      this.data[i * STRIDE + 7] = 0.001;
    }
    this.buffer = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.buffer.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iA', new THREE.InterleavedBufferAttribute(this.buffer, 4, 0));
    geo.setAttribute('iB', new THREE.InterleavedBufferAttribute(this.buffer, 4, 4));
    geo.setAttribute('iC', new THREE.InterleavedBufferAttribute(this.buffer, 4, 8));
    geo.setAttribute('iD', new THREE.InterleavedBufferAttribute(this.buffer, 4, 12));
    geo.instanceCount = total;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 13;
    this.mesh.name = 'vfx-feixes';
    this.mesh.visible = false;
  }

  private write(i: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, t0: number, dur: number, color: number, width: number, style: SegStyle, seed: number, intensity: number, taper: number) {
    const d = this.data;
    const o = i * STRIDE;
    const c = this.tmpColor.setHex(color);
    d[o] = ax;
    d[o + 1] = ay;
    d[o + 2] = az;
    d[o + 3] = t0;
    d[o + 4] = bx;
    d[o + 5] = by;
    d[o + 6] = bz;
    d[o + 7] = dur;
    d[o + 8] = c.r;
    d[o + 9] = c.g;
    d[o + 10] = c.b;
    d[o + 11] = width;
    d[o + 12] = style;
    d[o + 13] = seed;
    d[o + 14] = intensity;
    d[o + 15] = taper;
    this.dirty = true;
  }

  /** Segmento temporário. `delay` atrasa o nascimento (cintilação de raios). */
  add(ax: number, ay: number, az: number, bx: number, by: number, bz: number, color: number, width: number, duration: number, style: SegStyle, seed = Math.random(), intensity = 1, taper = 0, delay = 0) {
    const i = this.head;
    this.head = (this.head + 1) % this.capacity;
    const t0 = this.uTime.value + delay;
    this.write(i, ax, ay, az, bx, by, bz, t0, Math.max(0.01, duration), color, width, style, seed, intensity, taper);
    if (t0 + duration > this.busyUntil) this.busyUntil = t0 + duration;
  }

  /** Feixe sustentado (laser contínuo). Retorna null se não houver slot livre. */
  sustained(color: number, width: number, style: SegStyle = SegStyle.Beam): SustainedSegment | null {
    const slot = this.sustainedUsed.indexOf(false);
    if (slot < 0) return null;
    this.sustainedUsed[slot] = true;
    this.sustainedCount++;
    const idx = this.capacity + slot;
    const self = this;
    let col = color;
    let w = width;
    let inten = 1;
    let alive = true;
    const a0 = new THREE.Vector3();
    const b0 = new THREE.Vector3();
    const seed = Math.random();
    const push = () => self.write(idx, a0.x, a0.y, a0.z, b0.x, b0.y, b0.z, -1e5, -1, col, w, style, seed, alive ? inten : 0, 0);
    push();
    return {
      set(a: THREE.Vector3, b: THREE.Vector3) {
        if (!alive) return;
        a0.copy(a);
        b0.copy(b);
        push();
      },
      setColor(c: number) {
        col = c;
        push();
      },
      setWidth(v: number) {
        w = v;
        push();
      },
      setIntensity(v: number) {
        inten = v;
        push();
      },
      cancel() {
        if (!alive) return;
        alive = false;
        push();
        self.sustainedUsed[slot] = false;
        self.sustainedCount--;
      },
      get active() {
        return alive;
      },
    };
  }

  flush() {
    this.mesh.visible = this.sustainedCount > 0 || this.busyUntil > this.uTime.value;
    if (!this.dirty) return;
    // buffer pequeno (≈ 600 × 64 B): enviar inteiro é mais barato que rastrear faixas
    this.buffer.clearUpdateRanges();
    this.buffer.needsUpdate = true;
    this.dirty = false;
  }

  clear() {
    for (let i = 0; i < this.capacity; i++) this.data[i * STRIDE + 3] = -1e6;
    this.dirty = true;
    this.busyUntil = 0;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
