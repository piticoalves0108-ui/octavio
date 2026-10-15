import * as THREE from 'three';

/**
 * Partículas leves do personagem (UMA chamada de desenho):
 * - centelhas mágicas (mãos, pés, bainha da capa, decolagem/pouso, Forma Ascendente);
 * - rastros de vento (riscos estacionários no mundo que o mago ultrapassa no voo).
 * Cada partícula é um "risco" entre dois pontos (cabeça A e cauda B) desenhado como
 * quad orientado à câmera no vertex shader; centelhas são riscos curtíssimos (pontos redondos).
 * Simulação na CPU sem alocações; buffers instanciados com contagem dinâmica.
 */

const VERT = /* glsl */ `
attribute vec2 corner;
attribute vec3 iA;
attribute vec3 iB;
attribute vec4 iP; // x = largura, y = alfa, z = mistura de cor (0 runa, 1 vento), w = brilho
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec3 vColor;
varying vec2 vQ;
varying float vAlpha;
void main() {
  vec4 a = viewMatrix * vec4(iA, 1.0);
  vec4 b = viewMatrix * vec4(iB, 1.0);
  vec2 d = b.xy - a.xy;
  float l = length(d);
  vec2 dir = l > 1e-4 ? d / l : vec2(0.0, 1.0);
  vec2 n = vec2(-dir.y, dir.x);
  float w = iP.x;
  vec4 p = mix(a, b, corner.y);
  p.xy += n * corner.x * w + dir * (corner.y * 2.0 - 1.0) * w;
  gl_Position = projectionMatrix * p;
  vColor = mix(uColorA, uColorB, iP.z) * iP.w;
  vQ = vec2(corner.x, corner.y);
  vAlpha = iP.y;
}
`;

const FRAG = /* glsl */ `
varying vec3 vColor;
varying vec2 vQ;
varying float vAlpha;
void main() {
  float lat = 1.0 - abs(vQ.x);
  float a = lat * lat * (1.0 - vQ.y * 0.75) * vAlpha;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

export const FX_RUNE = 0;
export const FX_WIND = 1;

export class PlayerFx {
  readonly mesh: THREE.Mesh;
  readonly capacity: number;
  private geo: THREE.InstancedBufferGeometry;
  private mat: THREE.ShaderMaterial;
  private pos: Float32Array;
  private vel: Float32Array;
  private tail: Float32Array;
  private life: Float32Array;
  private maxLife: Float32Array;
  private size: Float32Array;
  private colorMix: Float32Array;
  private drag: Float32Array;
  private rise: Float32Array;
  private count = 0;
  private aA: THREE.InstancedBufferAttribute;
  private aB: THREE.InstancedBufferAttribute;
  private aP: THREE.InstancedBufferAttribute;
  /** Acumuladores de emissão contínua (partículas fracionárias). */
  readonly acc = new Float32Array(8);

  constructor(capacity: number) {
    this.capacity = capacity;
    const N = capacity;
    this.pos = new Float32Array(N * 3);
    this.vel = new Float32Array(N * 3);
    this.tail = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.maxLife = new Float32Array(N);
    this.size = new Float32Array(N);
    this.colorMix = new Float32Array(N);
    this.drag = new Float32Array(N);
    this.rise = new Float32Array(N);

    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, 0, 1, 0, -1, 1, 1, 1], 2));
    g.setIndex([0, 2, 1, 2, 3, 1]);
    this.aA = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aB = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aP = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', this.aA);
    g.setAttribute('iB', this.aB);
    g.setAttribute('iP', this.aP);
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uColorA: { value: new THREE.Color(0.35, 0.9, 1.0) },
        uColorB: { value: new THREE.Color(0.85, 0.92, 1.0) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mat.name = 'ea-mago-particulas';
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    this.mesh.name = 'mago-particulas';
  }

  get alive() {
    return this.count;
  }

  /** Cor das centelhas (segue a cor das runas). */
  setRuneColor(c: THREE.Color) {
    (this.mat.uniforms.uColorA.value as THREE.Color).copy(c);
  }

  /**
   * Emite uma partícula. (tx,ty,tz) ≠ 0 cria um risco: a cauda fica em posição − t.
   * Sem espaço livre, a partícula é descartada (nunca aloca).
   */
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, colorMix: number, tx = 0, ty = 0, tz = 0, drag = 1.5, rise = 0) {
    if (this.count >= this.capacity) return;
    const i = this.count++;
    const k = i * 3;
    this.pos[k] = x;
    this.pos[k + 1] = y;
    this.pos[k + 2] = z;
    this.vel[k] = vx;
    this.vel[k + 1] = vy;
    this.vel[k + 2] = vz;
    this.tail[k] = tx;
    this.tail[k + 1] = ty;
    this.tail[k + 2] = tz;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.size[i] = size;
    this.colorMix[i] = colorMix;
    this.drag[i] = drag;
    this.rise[i] = rise;
  }

  /** Emissão contínua: retorna quantas partículas emitir neste frame para `rate` por segundo. */
  take(slot: number, rate: number, dt: number): number {
    this.acc[slot] += rate * dt;
    const n = Math.floor(this.acc[slot]);
    this.acc[slot] -= n;
    return n;
  }

  clear() {
    this.count = 0;
    this.geo.instanceCount = 0;
  }

  update(dt: number) {
    const N = this.count;
    const p = this.pos;
    const v = this.vel;
    let w = 0;
    // simula e compacta (remove mortas trocando pela última viva)
    for (let i = 0; i < N; i++) {
      const life = this.life[i] - dt;
      if (life <= 0) continue;
      const k = i * 3;
      const d = Math.exp(-this.drag[i] * dt);
      v[k] *= d;
      v[k + 1] = v[k + 1] * d + this.rise[i] * dt;
      v[k + 2] *= d;
      const o = w * 3;
      p[o] = p[k] + v[k] * dt;
      p[o + 1] = p[k + 1] + v[k + 1] * dt;
      p[o + 2] = p[k + 2] + v[k + 2] * dt;
      v[o] = v[k];
      v[o + 1] = v[k + 1];
      v[o + 2] = v[k + 2];
      this.tail[o] = this.tail[k];
      this.tail[o + 1] = this.tail[k + 1];
      this.tail[o + 2] = this.tail[k + 2];
      this.life[w] = life;
      this.maxLife[w] = this.maxLife[i];
      this.size[w] = this.size[i];
      this.colorMix[w] = this.colorMix[i];
      this.drag[w] = this.drag[i];
      this.rise[w] = this.rise[i];
      w++;
    }
    this.count = w;
    // escreve os buffers instanciados
    const A = this.aA.array as Float32Array;
    const Bb = this.aB.array as Float32Array;
    const P = this.aP.array as Float32Array;
    for (let i = 0; i < w; i++) {
      const k = i * 3;
      const u = this.life[i] / this.maxLife[i];
      // entra rápido, sai suave
      const fade = Math.min(1, (1 - u) * 8) * Math.min(1, u * 2.2);
      A[k] = p[k];
      A[k + 1] = p[k + 1];
      A[k + 2] = p[k + 2];
      Bb[k] = p[k] - this.tail[k] - v[k] * 0.03;
      Bb[k + 1] = p[k + 1] - this.tail[k + 1] - v[k + 1] * 0.03;
      Bb[k + 2] = p[k + 2] - this.tail[k + 2] - v[k + 2] * 0.03;
      const q = i * 4;
      P[q] = this.size[i] * (0.6 + 0.4 * u);
      P[q + 1] = fade;
      P[q + 2] = this.colorMix[i];
      P[q + 3] = this.colorMix[i] > 0.5 ? 0.42 : 1.6;
    }
    this.geo.instanceCount = w;
    if (w > 0) {
      this.aA.needsUpdate = true;
      this.aB.needsUpdate = true;
      this.aP.needsUpdate = true;
      this.aA.clearUpdateRanges();
      this.aB.clearUpdateRanges();
      this.aP.clearUpdateRanges();
      this.aA.addUpdateRange(0, w * 3);
      this.aB.addUpdateRange(0, w * 3);
      this.aP.addUpdateRange(0, w * 4);
    }
    this.mesh.visible = w > 0;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
    this.mesh.removeFromParent();
  }
}
