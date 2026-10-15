import * as THREE from 'three';

/**
 * Anéis no chão (ondas de choque, círculos rúnicos, clarões) e cascas esféricas
 * (explosões, implosões). Instâncias animadas inteiramente no shader a partir do
 * instante de nascimento — a CPU só escreve ao criar.
 */

export const enum RingStyle {
  /** Onda de choque: anel fino que expande e some. */
  Shock = 0,
  /** Círculo rúnico: raio fixo, glifos girando, entra e sai suave. */
  Rune = 1,
  /** Disco de clarão macio. */
  Flash = 2,
}

const RSTRIDE = 16;

const RING_VERT = /* glsl */ `
attribute vec4 iA; // centro.xyz, t0
attribute vec4 iB; // r0, r1, duração, espessura
attribute vec4 iC; // cor.rgb, alfa
attribute vec4 iD; // estilo, giro, semente, -
uniform float uTime;
varying vec2 vUv;
varying vec4 vColor;
varying float vK;
varying float vStyle;
varying float vSpin;
varying float vThick;
void main() {
  float age = uTime - iA.w;
  float k = age / max(iB.z, 0.001);
  if (age < 0.0 || k >= 1.0) {
    gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
    vColor = vec4(0.0);
    return;
  }
  float st = floor(iD.x + 0.5);
  float e = st < 0.5 ? 1.0 - pow(1.0 - k, 3.0) : (st < 1.5 ? smoothstep(0.0, 0.18, k) : 1.0 - pow(1.0 - k, 2.0));
  float r = mix(iB.x, iB.y, e);
  vec3 p = iA.xyz + vec3(position.x * r, 0.0, position.y * r);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  vUv = position.xy;
  vColor = iC;
  vK = k;
  vStyle = st;
  vSpin = iD.y * age + iD.z * 6.283;
  vThick = iB.w;
}
`;

const RING_FRAG = /* glsl */ `
varying vec2 vUv;
varying vec4 vColor;
varying float vK;
varying float vStyle;
varying float vSpin;
varying float vThick;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float a;
  if (vStyle < 0.5) {
    float t = max(vThick, 0.02);
    float band = smoothstep(1.0 - t, 1.0 - t * 0.35, r) * (1.0 - smoothstep(0.96, 1.0, r));
    a = (band + 0.12 * smoothstep(0.2, 1.0, r)) * (1.0 - vK) * (1.0 - vK);
  } else if (vStyle < 1.5) {
    float ang = atan(vUv.y, vUv.x) + vSpin;
    float outer = smoothstep(0.9, 0.93, r) * (1.0 - smoothstep(0.97, 1.0, r));
    float inner = smoothstep(0.62, 0.645, r) * (1.0 - smoothstep(0.665, 0.69, r));
    float band = step(0.7, r) * step(r, 0.88);
    float glyph = step(0.55, fract(ang * 3.8197)) * step(0.3, fract(ang * 11.459 + 0.25)) * band;
    float ticks = step(0.92, fract(ang * 1.9099)) * band;
    float star = 0.0;
    for (int i = 0; i < 3; i++) {
      float aa = ang * 1.0 + float(i) * 2.094;
      vec2 d = vec2(cos(aa), sin(aa));
      star += (1.0 - smoothstep(0.0, 0.02, abs(dot(vUv, vec2(-d.y, d.x))))) * step(r, 0.62);
    }
    a = (outer + inner + glyph * 0.8 + ticks + star * 0.6);
    a *= smoothstep(0.0, 0.12, vK) * (1.0 - smoothstep(0.75, 1.0, vK));
  } else {
    float g = 1.0 - r;
    a = g * g * (1.0 - vK);
  }
  a *= vColor.a;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor.rgb, a);
}
`;

const SSTRIDE = 12;

const SHELL_VERT = /* glsl */ `
attribute vec4 iA; // centro.xyz, t0
attribute vec4 iB; // r0, r1, duração, estilo
attribute vec4 iC; // cor.rgb, alfa
uniform float uTime;
varying vec3 vN;
varying vec3 vV;
varying vec4 vColor;
varying float vK;
varying float vY;
void main() {
  float age = uTime - iA.w;
  float k = age / max(iB.z, 0.001);
  if (age < 0.0 || k >= 1.0) {
    gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
    vColor = vec4(0.0);
    return;
  }
  float e = 1.0 - pow(1.0 - k, 2.5);
  float r = mix(iB.x, iB.y, e);
  vec4 mv = viewMatrix * vec4(iA.xyz + position * r, 1.0);
  gl_Position = projectionMatrix * mv;
  vN = normalize(mat3(viewMatrix) * normal);
  vV = normalize(-mv.xyz);
  vColor = iC;
  vK = k;
  vY = position.y;
}
`;

const SHELL_FRAG = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec4 vColor;
varying float vK;
varying float vY;
void main() {
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float rim = pow(f, 2.2);
  float a = (rim * 0.9 + 0.08) * (1.0 - vK) * vColor.a;
  a *= smoothstep(-0.35, 0.1, vY);
  if (a < 0.004) discard;
  gl_FragColor = vec4(mix(vColor.rgb, vec3(1.0), rim * rim * 0.4), a);
}
`;

export class RingRenderer {
  readonly rings: THREE.Mesh;
  readonly shells: THREE.Mesh;
  private rData: Float32Array;
  private sData: Float32Array;
  private rBuf: THREE.InstancedInterleavedBuffer;
  private sBuf: THREE.InstancedInterleavedBuffer;
  private rHead = 0;
  private sHead = 0;
  private rCap: number;
  private sCap: number;
  private rDirty = false;
  private sDirty = false;
  private rBusy = 0;
  private sBusy = 0;
  private c = new THREE.Color();

  constructor(ringCap: number, shellCap: number, private uTime: { value: number }) {
    this.rCap = ringCap;
    this.sCap = shellCap;
    // anéis
    const rg = new THREE.InstancedBufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3));
    rg.setIndex([0, 2, 1, 0, 3, 2]);
    this.rData = new Float32Array(ringCap * RSTRIDE);
    for (let i = 0; i < ringCap; i++) this.rData[i * RSTRIDE + 3] = -1e6;
    this.rBuf = new THREE.InstancedInterleavedBuffer(this.rData, RSTRIDE, 1);
    this.rBuf.setUsage(THREE.DynamicDrawUsage);
    rg.setAttribute('iA', new THREE.InterleavedBufferAttribute(this.rBuf, 4, 0));
    rg.setAttribute('iB', new THREE.InterleavedBufferAttribute(this.rBuf, 4, 4));
    rg.setAttribute('iC', new THREE.InterleavedBufferAttribute(this.rBuf, 4, 8));
    rg.setAttribute('iD', new THREE.InterleavedBufferAttribute(this.rBuf, 4, 12));
    rg.instanceCount = ringCap;
    this.rings = new THREE.Mesh(
      rg,
      new THREE.ShaderMaterial({
        vertexShader: RING_VERT,
        fragmentShader: RING_FRAG,
        uniforms: { uTime },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    this.rings.frustumCulled = false;
    this.rings.renderOrder = 10;
    this.rings.name = 'vfx-aneis';
    this.rings.visible = false;
    // cascas
    const base = new THREE.IcosahedronGeometry(1, 3);
    const sg = new THREE.InstancedBufferGeometry();
    sg.index = base.index;
    sg.setAttribute('position', base.getAttribute('position'));
    sg.setAttribute('normal', base.getAttribute('normal'));
    this.sData = new Float32Array(shellCap * SSTRIDE);
    for (let i = 0; i < shellCap; i++) this.sData[i * SSTRIDE + 3] = -1e6;
    this.sBuf = new THREE.InstancedInterleavedBuffer(this.sData, SSTRIDE, 1);
    this.sBuf.setUsage(THREE.DynamicDrawUsage);
    sg.setAttribute('iA', new THREE.InterleavedBufferAttribute(this.sBuf, 4, 0));
    sg.setAttribute('iB', new THREE.InterleavedBufferAttribute(this.sBuf, 4, 4));
    sg.setAttribute('iC', new THREE.InterleavedBufferAttribute(this.sBuf, 4, 8));
    sg.instanceCount = shellCap;
    this.shells = new THREE.Mesh(
      sg,
      new THREE.ShaderMaterial({
        vertexShader: SHELL_VERT,
        fragmentShader: SHELL_FRAG,
        uniforms: { uTime },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.shells.frustumCulled = false;
    this.shells.renderOrder = 12;
    this.shells.name = 'vfx-cascas';
    this.shells.visible = false;
  }

  ring(x: number, y: number, z: number, r0: number, r1: number, duration: number, color: number, alpha = 1, style: RingStyle = RingStyle.Shock, thickness = 0.18, spin = 0, delay = 0) {
    const i = this.rHead;
    this.rHead = (this.rHead + 1) % this.rCap;
    const d = this.rData;
    const o = i * RSTRIDE;
    const t0 = this.uTime.value + delay;
    this.c.setHex(color);
    d[o] = x;
    d[o + 1] = y;
    d[o + 2] = z;
    d[o + 3] = t0;
    d[o + 4] = r0;
    d[o + 5] = r1;
    d[o + 6] = Math.max(0.02, duration);
    d[o + 7] = thickness;
    d[o + 8] = this.c.r;
    d[o + 9] = this.c.g;
    d[o + 10] = this.c.b;
    d[o + 11] = alpha;
    d[o + 12] = style;
    d[o + 13] = spin;
    d[o + 14] = Math.random();
    d[o + 15] = 0;
    this.rDirty = true;
    if (t0 + duration > this.rBusy) this.rBusy = t0 + duration;
  }

  shell(x: number, y: number, z: number, r0: number, r1: number, duration: number, color: number, alpha = 1, delay = 0) {
    const i = this.sHead;
    this.sHead = (this.sHead + 1) % this.sCap;
    const d = this.sData;
    const o = i * SSTRIDE;
    const t0 = this.uTime.value + delay;
    this.c.setHex(color);
    d[o] = x;
    d[o + 1] = y;
    d[o + 2] = z;
    d[o + 3] = t0;
    d[o + 4] = r0;
    d[o + 5] = r1;
    d[o + 6] = Math.max(0.02, duration);
    d[o + 7] = 0;
    d[o + 8] = this.c.r;
    d[o + 9] = this.c.g;
    d[o + 10] = this.c.b;
    d[o + 11] = alpha;
    this.sDirty = true;
    if (t0 + duration > this.sBusy) this.sBusy = t0 + duration;
  }

  flush() {
    const t = this.uTime.value;
    this.rings.visible = this.rBusy > t;
    this.shells.visible = this.sBusy > t;
    if (this.rDirty) {
      this.rBuf.clearUpdateRanges();
      this.rBuf.needsUpdate = true;
      this.rDirty = false;
    }
    if (this.sDirty) {
      this.sBuf.clearUpdateRanges();
      this.sBuf.needsUpdate = true;
      this.sDirty = false;
    }
  }

  clear() {
    for (let i = 0; i < this.rCap; i++) this.rData[i * RSTRIDE + 3] = -1e6;
    for (let i = 0; i < this.sCap; i++) this.sData[i * SSTRIDE + 3] = -1e6;
    this.rDirty = this.sDirty = true;
    this.rBusy = this.sBusy = 0;
  }

  dispose() {
    for (const m of [this.rings, this.shells]) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.removeFromParent();
    }
  }
}
