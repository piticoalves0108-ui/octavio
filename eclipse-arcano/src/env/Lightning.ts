/**
 * Raio visível ao longe: fitas voltadas para a câmera (expandidas no vertex shader),
 * com largura que cresce com a distância (continua visível a 1 km) e brilho HDR para
 * o bloom. Os buffers são pré-alocados; um raio novo só reescreve os vértices.
 */
import * as THREE from 'three';
import { LIGHTNING } from '../data/weather';
import { buildBoltSegments } from './envMath';

const STRIDE = 8;

export class LightningBolt {
  readonly mesh: THREE.Mesh;
  readonly uniforms = {
    uAlpha: { value: 0 },
    uColor: { value: new THREE.Color(LIGHTNING.color) },
    uWidthPerM: { value: LIGHTNING.widthPerKm / 1000 },
    uMinWidth: { value: LIGHTNING.minWidth },
  };
  private geo = new THREE.BufferGeometry();
  private maxSeg: number;
  private segs: Float32Array;
  private pos: THREE.BufferAttribute;
  private other: THREE.BufferAttribute;
  private info: THREE.BufferAttribute;
  /** Segmentos do último raio. */
  segmentCount = 0;

  constructor() {
    this.maxSeg = LIGHTNING.segments + LIGHTNING.branches * 7;
    this.segs = new Float32Array(this.maxSeg * STRIDE);
    const v = this.maxSeg * 4;
    this.pos = new THREE.BufferAttribute(new Float32Array(v * 3), 3);
    this.other = new THREE.BufferAttribute(new Float32Array(v * 3), 3);
    this.info = new THREE.BufferAttribute(new Float32Array(v * 3), 3); // lado, largura, brilho
    this.pos.setUsage(THREE.DynamicDrawUsage);
    this.other.setUsage(THREE.DynamicDrawUsage);
    this.info.setUsage(THREE.DynamicDrawUsage);
    const idx = new Uint16Array(this.maxSeg * 6);
    for (let s = 0; s < this.maxSeg; s++) {
      const b = s * 4;
      idx.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], s * 6);
    }
    this.geo.setAttribute('position', this.pos);
    this.geo.setAttribute('aOther', this.other);
    this.geo.setAttribute('aInfo', this.info);
    this.geo.setIndex(new THREE.BufferAttribute(idx, 1));
    this.geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      name: 'raio',
      uniforms: this.uniforms,
      vertexShader: BOLT_VERT,
      fragmentShader: BOLT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.name = 'raio';
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 30;
  }

  /** Gera um raio novo de `top` até `bottom`. */
  strike(top: THREE.Vector3, bottom: THREE.Vector3, rnd: () => number) {
    const n = buildBoltSegments(top, bottom, LIGHTNING.segments, LIGHTNING.branches, rnd, this.segs, this.maxSeg);
    const P = this.pos.array as Float32Array;
    const O = this.other.array as Float32Array;
    const I = this.info.array as Float32Array;
    for (let s = 0; s < n; s++) {
      const o = s * STRIDE;
      const ax = this.segs[o];
      const ay = this.segs[o + 1];
      const az = this.segs[o + 2];
      const bx = this.segs[o + 3];
      const by = this.segs[o + 4];
      const bz = this.segs[o + 5];
      const w = this.segs[o + 6];
      const br = this.segs[o + 7];
      for (let k = 0; k < 4; k++) {
        const v = (s * 4 + k) * 3;
        const atB = k >= 2;
        P[v] = atB ? bx : ax;
        P[v + 1] = atB ? by : ay;
        P[v + 2] = atB ? bz : az;
        O[v] = atB ? ax : bx;
        O[v + 1] = atB ? ay : by;
        O[v + 2] = atB ? az : bz;
        // nas pontas B a direção do segmento se inverte no shader: compensa o lado
        I[v] = (k % 2 === 0 ? -1 : 1) * (atB ? -1 : 1);
        I[v + 1] = w;
        I[v + 2] = br;
      }
    }
    this.segmentCount = n;
    this.pos.needsUpdate = true;
    this.other.needsUpdate = true;
    this.info.needsUpdate = true;
    this.geo.setDrawRange(0, n * 6);
  }

  /** Intensidade atual (0 esconde). */
  setAlpha(a: number) {
    this.uniforms.uAlpha.value = a;
    this.mesh.visible = a > 0.01 && this.segmentCount > 0;
  }

  dispose() {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const BOLT_VERT = /* glsl */ `
attribute vec3 aOther;
attribute vec3 aInfo;
uniform float uWidthPerM;
uniform float uMinWidth;
varying float vSide;
varying float vBright;
void main() {
  vec3 dir = normalize(aOther - position);
  vec3 toCam = cameraPosition - position;
  float dist = length(toCam);
  vec3 side = normalize(cross(dir, toCam / max(dist, 1e-3)));
  float w = max(uMinWidth, dist * uWidthPerM) * aInfo.y;
  vec3 p = position + side * aInfo.x * w;
  vSide = aInfo.x;
  vBright = aInfo.z;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const BOLT_FRAG = /* glsl */ `
uniform float uAlpha;
uniform vec3 uColor;
varying float vSide;
varying float vBright;
void main() {
  float core = exp(-vSide * vSide * 9.0);
  float glow = 1.0 - abs(vSide);
  vec3 c = (vec3(1.0) * core * 5.0 + uColor * glow * 1.6) * vBright * uAlpha;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;
