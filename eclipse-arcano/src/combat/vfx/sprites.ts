import * as THREE from 'three';

/**
 * Billboards dinâmicos reenviados a cada quadro (núcleos brilhantes de projéteis, orbes,
 * pontas de arma carregando). Um draw call; a CPU escreve só os sprites submetidos no quadro.
 */
const STRIDE = 8;

const VERT = /* glsl */ `
attribute vec4 iP; // pos.xyz, tamanho
attribute vec4 iC; // cor.rgb, alfa
uniform float uTime;
varying vec2 vUv;
varying vec4 vColor;
varying float vSeed;
void main() {
  vec4 mv = viewMatrix * vec4(iP.xyz, 1.0);
  float pulse = 1.0 + 0.08 * sin(uTime * 23.0 + iP.x * 3.1 + iP.z * 1.7);
  mv.xy += position.xy * iP.w * pulse;
  gl_Position = projectionMatrix * mv;
  vUv = position.xy * 2.0;
  vColor = iC;
  vSeed = iP.x + iP.z;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec4 vColor;
varying float vSeed;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float core = exp(-r * r * 14.0);
  float halo = pow(max(0.0, 1.0 - r), 2.2);
  float ang = atan(vUv.y, vUv.x);
  float swirl = 0.85 + 0.15 * sin(ang * 5.0 + uTime * 9.0 + vSeed);
  float a = (core * 1.2 + halo * 0.75 * swirl) * vColor.a;
  vec3 col = mix(vColor.rgb, vec3(1.0), clamp(core * 0.9, 0.0, 1.0));
  gl_FragColor = vec4(col, a);
}
`;

export class DynamicSprites {
  readonly mesh: THREE.Mesh;
  private data: Float32Array;
  private buffer: THREE.InstancedInterleavedBuffer;
  private geo: THREE.InstancedBufferGeometry;
  private n = 0;
  private c = new THREE.Color();

  constructor(readonly capacity: number, uTime: { value: number }) {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.data = new Float32Array(capacity * STRIDE);
    this.buffer = new THREE.InstancedInterleavedBuffer(this.data, STRIDE, 1);
    this.buffer.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('iP', new THREE.InterleavedBufferAttribute(this.buffer, 4, 0));
    geo.setAttribute('iC', new THREE.InterleavedBufferAttribute(this.buffer, 4, 4));
    geo.instanceCount = 0;
    this.geo = geo;
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uTime },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 14;
    this.mesh.name = 'vfx-nucleos';
    this.mesh.visible = false;
  }

  /** Submete um sprite para ESTE quadro. */
  push(x: number, y: number, z: number, size: number, color: number, alpha = 1) {
    if (this.n >= this.capacity) return;
    const o = this.n * STRIDE;
    const d = this.data;
    this.c.setHex(color);
    d[o] = x;
    d[o + 1] = y;
    d[o + 2] = z;
    d[o + 3] = size;
    d[o + 4] = this.c.r;
    d[o + 5] = this.c.g;
    d[o + 6] = this.c.b;
    d[o + 7] = alpha;
    this.n++;
  }

  /** Envia os sprites do quadro e zera para o próximo. */
  flush() {
    this.geo.instanceCount = this.n;
    this.mesh.visible = this.n > 0;
    if (this.n > 0) {
      this.buffer.clearUpdateRanges();
      this.buffer.addUpdateRange(0, this.n * STRIDE);
      this.buffer.needsUpdate = true;
    }
    this.n = 0;
  }
}
