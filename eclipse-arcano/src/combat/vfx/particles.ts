import * as THREE from 'three';

/**
 * Pool de partículas na GPU: cada partícula é uma instância de um quad (billboard) cujo
 * movimento (velocidade, arrasto, gravidade, chão) é calculado no vertex shader a partir do
 * instante de nascimento. A CPU só escreve as partículas NOVAS num buffer circular
 * (upload por faixa) — nenhum custo por partícula viva por quadro.
 */

/** Formatos desenhados no fragment shader. */
export const enum PShape {
  Glow = 0,
  Spark = 1,
  Smoke = 2,
  Shard = 3,
  Ring = 4,
  Star = 5,
}

/** Partícula a emitir (objeto de rascunho reutilizado — preencha e chame `emit`). */
export interface ParticleSpec {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  r: number;
  g: number;
  b: number;
  a: number;
  size0: number;
  size1: number;
  /** Gravidade (m/s², positivo = cai; negativo = sobe). */
  gravity: number;
  /** Arrasto (1/s). */
  drag: number;
  shape: PShape;
  /** Chão mínimo (y) — a partícula não desce abaixo disso. */
  floorY: number;
  /** Rotação (rad/s) para formatos não esticados. */
  spin: number;
  /** > 0: estica na direção da velocidade (faíscas). */
  stretch: number;
  /** Atraso (s) para nascer. */
  delay: number;
}

const STRIDE = 20;

const VERT = /* glsl */ `
attribute vec4 iA; // pos.xyz, t0
attribute vec4 iB; // vel.xyz, vida
attribute vec4 iC; // cor.rgb, alfa
attribute vec4 iD; // tam0, tam1, gravidade, arrasto
attribute vec4 iE; // formato, chão, giro, esticar
uniform float uTime;
varying vec2 vUv;
varying vec4 vColor;
varying float vK;
varying float vShape;
void main() {
  float age = uTime - iA.w;
  float life = max(iB.w, 0.001);
  float k = age / life;
  if (age < 0.0 || k >= 1.0) {
    gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
    vColor = vec4(0.0);
    vUv = vec2(0.0);
    vK = 1.0;
    vShape = 0.0;
    return;
  }
  float drag = iD.w;
  float f = drag > 0.001 ? (1.0 - exp(-drag * age)) / drag : age;
  vec3 p = iA.xyz + iB.xyz * f;
  p.y -= 0.5 * iD.z * age * age;
  p.y = max(p.y, iE.y);
  float size = mix(iD.x, iD.y, k);
  vec4 mv = viewMatrix * vec4(p, 1.0);
  vec2 c = position.xy;
  if (iE.w > 0.0) {
    vec3 vel = iB.xyz * exp(-drag * age);
    vel.y -= iD.z * age;
    vec3 vv = (viewMatrix * vec4(vel, 0.0)).xyz;
    float l = length(vv.xy);
    vec2 dir = l > 0.0001 ? vv.xy / l : vec2(0.0, 1.0);
    vec2 side = vec2(-dir.y, dir.x);
    float len = size + l * iE.w;
    mv.xy += dir * (c.y * len) + side * (c.x * size);
  } else {
    float a = iE.z * age + iA.w * 7.0;
    float s = sin(a);
    float co = cos(a);
    mv.xy += vec2(c.x * co - c.y * s, c.x * s + c.y * co) * size;
  }
  gl_Position = projectionMatrix * mv;
  vUv = c * 2.0;
  vColor = iC;
  vK = k;
  vShape = iE.x;
}
`;

const FRAG = /* glsl */ `
varying vec2 vUv;
varying vec4 vColor;
varying float vK;
varying float vShape;
uniform float uAdditive;
void main() {
  float r = length(vUv);
  float m;
  float sh = floor(vShape + 0.5);
  if (sh < 0.5) {
    float g = max(0.0, 1.0 - r);
    m = g * g;
  } else if (sh < 1.5) {
    float g = max(0.0, 1.0 - r);
    m = g * (1.0 - abs(vUv.x));
  } else if (sh < 2.5) {
    // fumaça: disco macio com bordas irregulares
    float ang = atan(vUv.y, vUv.x);
    float edge = 0.78 + 0.12 * sin(ang * 5.0 + vShape * 31.0) + 0.06 * sin(ang * 11.0 - vK * 6.0);
    m = 1.0 - smoothstep(edge * 0.35, edge, r);
    m *= 0.85 + 0.15 * sin(vUv.x * 9.0 + vUv.y * 7.0);
  } else if (sh < 3.5) {
    float d = abs(vUv.x) * 1.7 + abs(vUv.y);
    m = 1.0 - smoothstep(0.7, 1.0, d);
    m *= 0.65 + 0.35 * step(0.0, vUv.x);
  } else if (sh < 4.5) {
    m = smoothstep(0.55, 0.75, r) * (1.0 - smoothstep(0.82, 1.0, r));
  } else {
    float core = max(0.0, 1.0 - r * 1.6);
    float rays = max(0.0, 1.0 - abs(vUv.x) * 9.0) * max(0.0, 1.0 - abs(vUv.y)) + max(0.0, 1.0 - abs(vUv.y) * 9.0) * max(0.0, 1.0 - abs(vUv.x));
    m = core * core + rays * 0.8;
  }
  float fade = smoothstep(0.0, 0.07, vK) * (1.0 - vK);
  if (sh > 1.5 && sh < 2.5) fade = smoothstep(0.0, 0.18, vK) * (1.0 - vK) * (1.0 - vK * 0.3);
  float a = m * fade * vColor.a;
  if (a < 0.004) discard;
  vec3 col = vColor.rgb;
  if (uAdditive > 0.5) col = mix(col, vec3(1.0), clamp(m * m * 0.45, 0.0, 1.0));
  gl_FragColor = vec4(col, a);
}
`;

export class GpuParticles {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  /** Limite efetivo (≤ capacity): o buffer circular só usa os primeiros `limit` slots (qualidade em tempo real). */
  private limit: number;
  /** Rascunho reutilizável para `emit`. */
  readonly p: ParticleSpec = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 1, r: 1, g: 1, b: 1, a: 1,
    size0: 0.2, size1: 0.1, gravity: 0, drag: 0, shape: PShape.Glow, floorY: -1e5, spin: 0, stretch: 0, delay: 0,
  };
  private data: Float32Array;
  private buffer: THREE.InstancedInterleavedBuffer;
  private head = 0;
  private dirtyFrom = -1;
  private dirtyCount = 0;
  private uTime: { value: number };
  /** Instante (relógio do VFX) em que a última partícula termina — para esconder o mesh ocioso. */
  private busyUntil = 0;
  /** Partículas emitidas (estatística). */
  emitted = 0;

  constructor(capacity: number, additive: boolean, uTime: { value: number }) {
    this.capacity = Math.max(16, Math.floor(capacity));
    this.limit = this.capacity;
    this.uTime = uTime;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.data = new Float32Array(this.capacity * STRIDE);
    // nasce "morta": t0 muito no passado
    for (let i = 0; i < this.capacity; i++) {
      this.data[i * STRIDE + 3] = -1e6;
      this.data[i * STRIDE + 7] = 0.001;
    }
    this.buffer = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.buffer.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iA', new THREE.InterleavedBufferAttribute(this.buffer, 4, 0));
    geo.setAttribute('iB', new THREE.InterleavedBufferAttribute(this.buffer, 4, 4));
    geo.setAttribute('iC', new THREE.InterleavedBufferAttribute(this.buffer, 4, 8));
    geo.setAttribute('iD', new THREE.InterleavedBufferAttribute(this.buffer, 4, 12));
    geo.setAttribute('iE', new THREE.InterleavedBufferAttribute(this.buffer, 4, 16));
    geo.instanceCount = this.capacity;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uTime, uAdditive: { value: additive ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 12 : 11;
    this.mesh.name = additive ? 'vfx-particulas-aditivas' : 'vfx-particulas-fumaca';
    this.mesh.visible = false;
  }

  /** Emite a partícula descrita em `this.p` (não aloca). */
  emit() {
    const p = this.p;
    const i = this.head;
    this.head = (this.head + 1) % this.limit;
    const o = i * STRIDE;
    const d = this.data;
    const t0 = this.uTime.value + p.delay;
    d[o] = p.x;
    d[o + 1] = p.y;
    d[o + 2] = p.z;
    d[o + 3] = t0;
    d[o + 4] = p.vx;
    d[o + 5] = p.vy;
    d[o + 6] = p.vz;
    d[o + 7] = p.life;
    d[o + 8] = p.r;
    d[o + 9] = p.g;
    d[o + 10] = p.b;
    d[o + 11] = p.a;
    d[o + 12] = p.size0;
    d[o + 13] = p.size1;
    d[o + 14] = p.gravity;
    d[o + 15] = p.drag;
    d[o + 16] = p.shape;
    d[o + 17] = p.floorY;
    d[o + 18] = p.spin;
    d[o + 19] = p.stretch;
    if (this.dirtyFrom < 0) {
      this.dirtyFrom = i;
      this.dirtyCount = 1;
    } else if (this.dirtyCount < this.limit) {
      this.dirtyCount++;
    }
    const end = t0 + p.life;
    if (end > this.busyUntil) this.busyUntil = end;
    this.emitted++;
  }

  /** Reseta o rascunho para padrões (chamar antes de preencher uma nova família de partículas). */
  reset(): ParticleSpec {
    const p = this.p;
    p.vx = p.vy = p.vz = 0;
    p.life = 1;
    p.r = p.g = p.b = p.a = 1;
    p.size0 = 0.2;
    p.size1 = 0.1;
    p.gravity = 0;
    p.drag = 0;
    p.shape = PShape.Glow;
    p.floorY = -1e5;
    p.spin = 0;
    p.stretch = 0;
    p.delay = 0;
    return p;
  }

  /** Envia ao GPU só a faixa escrita neste quadro. */
  flush() {
    this.mesh.visible = this.busyUntil > this.uTime.value;
    if (this.dirtyFrom < 0) return;
    const b = this.buffer;
    b.clearUpdateRanges();
    const lim = this.limit;
    if (this.dirtyCount >= lim) {
      b.addUpdateRange(0, lim * STRIDE);
    } else {
      const start = this.dirtyFrom;
      const end = start + this.dirtyCount;
      if (end <= lim) b.addUpdateRange(start * STRIDE, this.dirtyCount * STRIDE);
      else {
        b.addUpdateRange(start * STRIDE, (lim - start) * STRIDE);
        b.addUpdateRange(0, (end - lim) * STRIDE);
      }
    }
    b.needsUpdate = true;
    this.dirtyFrom = -1;
    this.dirtyCount = 0;
  }

  /**
   * Muda o limite efetivo em tempo real (troca de qualidade). Só reduz/restaura até a
   * capacidade alocada no início; não realoca buffers.
   */
  setLimit(n: number) {
    const lim = Math.max(16, Math.min(this.capacity, Math.floor(n)));
    if (lim === this.limit) return;
    this.limit = lim;
    if (this.head >= lim) this.head = 0;
    (this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount = lim;
    // a faixa suja pendente pode passar do novo limite: reenvia tudo o que está em uso
    if (this.dirtyFrom >= 0) {
      this.dirtyFrom = 0;
      this.dirtyCount = lim;
    }
  }

  get effectiveLimit() {
    return this.limit;
  }

  /** Mata todas as partículas (novo jogo / teleporte de cena). */
  clear() {
    for (let i = 0; i < this.capacity; i++) this.data[i * STRIDE + 3] = -1e6;
    this.buffer.clearUpdateRanges();
    this.buffer.addUpdateRange(0, this.capacity * STRIDE);
    this.buffer.needsUpdate = true;
    this.busyUntil = 0;
    this.dirtyFrom = -1;
    this.dirtyCount = 0;
  }

  /** Partículas vivas (estimativa por amostragem — só para diagnóstico). */
  countAlive(): number {
    const t = this.uTime.value;
    let n = 0;
    for (let i = 0; i < this.capacity; i++) {
      const o = i * STRIDE;
      const age = t - this.data[o + 3];
      if (age >= 0 && age < this.data[o + 7]) n++;
    }
    return n;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.removeFromParent();
  }
}
