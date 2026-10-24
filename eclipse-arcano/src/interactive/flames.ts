/**
 * Chamas instanciadas (uma draw call): cada instância é um par de planos cruzados virados
 * para a câmera com uma língua de fogo animada no shader (ruído que sobe, núcleo amarelo,
 * pontas laranja/vermelho), mistura aditiva. Usadas pelo fogo na grama, objetos em
 * chamas e fogueiras.
 */
import * as THREE from 'three';
import { GLOBAL_UNIFORMS } from '../core/uniforms';

export class Flames {
  readonly mesh: THREE.Mesh;
  private geo = new THREE.InstancedBufferGeometry();
  /** x, y, z, tamanho (0 = invisível). */
  private data: Float32Array;
  private attr: THREE.InstancedBufferAttribute;
  private seeds: Float32Array;
  count = 0;

  constructor(readonly capacity: number) {
    // quad de base no chão, altura 1 (o shader faz o billboard em torno do eixo Y)
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    this.geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.data = new Float32Array(capacity * 4);
    this.attr = new THREE.InstancedBufferAttribute(this.data, 4);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aFlame', this.attr);
    this.seeds = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) this.seeds[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    this.geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(this.seeds, 1));
    this.geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      name: 'chamas',
      uniforms: { uTime: GLOBAL_UNIFORMS.uTime, uWindDir: GLOBAL_UNIFORMS.uWindDir, uWindStrength: GLOBAL_UNIFORMS.uWindStrength },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.name = 'chamas';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 12;
    this.mesh.visible = false;
  }

  /** Começa a escrever as chamas deste quadro. */
  begin() {
    this.count = 0;
  }

  push(x: number, y: number, z: number, size: number) {
    if (this.count >= this.capacity || size <= 0.01) return;
    const o = this.count * 4;
    this.data[o] = x;
    this.data[o + 1] = y;
    this.data[o + 2] = z;
    this.data[o + 3] = size;
    this.count++;
  }

  end() {
    this.geo.instanceCount = this.count;
    this.mesh.visible = this.count > 0;
    if (this.count) {
      this.attr.clearUpdateRanges();
      this.attr.addUpdateRange(0, this.count * 4);
      this.attr.needsUpdate = true;
    }
  }

  dispose() {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const VERT = /* glsl */ `
attribute vec4 aFlame;
attribute float aSeed;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
varying vec2 vUv;
varying float vSeed;
varying float vSize;
void main() {
  vUv = uv;
  vSeed = aSeed;
  vSize = aFlame.w;
  vec3 base = aFlame.xyz;
  // billboard cilíndrico (gira só em Y para a câmera)
  vec3 toCam = cameraPosition - base;
  toCam.y = 0.0;
  vec3 side = normalize(vec3(toCam.z, 0.0, -toCam.x) + vec3(1e-4, 0.0, 0.0));
  float h = position.y;
  float w = aFlame.w * (0.8 + 0.3 * fract(aSeed * 7.0));
  float flick = 0.85 + 0.15 * sin(uTime * 9.0 + aSeed * 31.0);
  vec3 p = base + side * position.x * w + vec3(0.0, h * aFlame.w * (1.15 + 0.5 * fract(aSeed * 3.0)) * flick, 0.0);
  // a ponta dança e inclina com o vento
  float sway = sin(uTime * 7.0 + aSeed * 40.0) * 0.12 + sin(uTime * 13.0 + aSeed * 17.0) * 0.06;
  p.xz += (uWindDir * (0.25 + uWindStrength * 0.35) + side.xz * sway) * h * h * aFlame.w;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vSeed;
varying float vSize;
float fHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float fNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(fHash(i), fHash(i + vec2(1.0, 0.0)), f.x), mix(fHash(i + vec2(0.0, 1.0)), fHash(i + 1.0), f.x), f.y);
}
void main() {
  vec2 uv = vUv;
  float t = uTime * 2.2 + vSeed * 13.0;
  float n1 = fNoise(vec2(uv.x * 3.0 + vSeed * 9.0, uv.y * 2.5 - t));
  float n2 = fNoise(vec2(uv.x * 7.0 - vSeed * 3.0, uv.y * 5.0 - t * 1.6));
  float n = n1 * 0.65 + n2 * 0.35;
  // corpo em gota: largo embaixo, ponta fina que tremula mais em cima
  float y = uv.y;
  float x = (uv.x - 0.5) * 2.0 + (n - 0.5) * 0.55 * y;
  float w = (1.0 - pow(y, 0.85)) * (0.78 + 0.4 * n) + 0.04;
  float body = 1.0 - smoothstep(w * 0.35, w, abs(x));
  body *= smoothstep(0.0, 0.14, y);
  body *= 1.0 - smoothstep(0.45, 1.0, y + (n - 0.5) * 0.4);
  if (body < 0.01) discard;
  float core = smoothstep(0.5, 1.0, body) * (1.0 - y);
  vec3 col = mix(vec3(0.8, 0.1, 0.015), vec3(1.0, 0.42, 0.06), body);
  col = mix(col, vec3(1.0, 0.72, 0.3), core * 0.8);
  gl_FragColor = vec4(col * body * 0.8, 1.0);
}
`;
