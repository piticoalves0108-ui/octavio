/**
 * Rajadas de vento visíveis: riscos brancos finos e curvos que atravessam o ar na
 * direção do vento (com um pequeno caracol no fim), numa caixa em volta da câmera.
 * Tudo no vertex shader (uma faixa instanciada, 1 draw call). Aparecem só com vento forte.
 */
import * as THREE from 'three';
import { GLOBAL_UNIFORMS } from '../core/uniforms';

const SEGMENTS = 24;
const BOX = 70;

export class WindStreaks {
  readonly mesh: THREE.Mesh;
  private geo = new THREE.InstancedBufferGeometry();
  readonly uniforms = {
    uTime: GLOBAL_UNIFORMS.uTime,
    uWindDir: GLOBAL_UNIFORMS.uWindDir,
    uAmount: { value: 0 },
    uBox: { value: BOX },
    uColor: { value: new THREE.Color(1, 1, 1) },
  };

  constructor(count: number) {
    const pos: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      pos.push(t, -1, 0, t, 1, 0);
      if (i < SEGMENTS) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
      }
    }
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geo.setIndex(idx);
    const seeds = new Float32Array(count * 4);
    let s = 0x2545f491;
    const rnd = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 100000) / 100000;
    };
    for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
    this.geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
    this.geo.instanceCount = count;
    const mat = new THREE.ShaderMaterial({
      name: 'rajadas',
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.name = 'rajadas';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 18;
    this.mesh.visible = false;
  }

  /** `amount` 0..1 (vento forte e ao ar livre). */
  update(amount: number) {
    this.uniforms.uAmount.value = amount;
    this.mesh.visible = amount > 0.02;
  }

  dispose() {
    this.geo.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const VERT = /* glsl */ `
attribute vec4 aSeed;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uBox;
uniform float uAmount;
varying float vA;
varying float vAcross;
void main() {
  float life = 2.6 + 1.4 * aSeed.w;
  float ph = fract(uTime / life + aSeed.x * 7.0);
  float cycle = floor(uTime / life + aSeed.x * 7.0);
  // posição sorteada a cada ciclo, numa caixa em volta da câmera, um pouco acima do chão da câmera
  vec2 cell = vec2(fract(aSeed.y * 13.7 + cycle * 0.618), fract(aSeed.z * 9.3 + cycle * 0.414));
  vec3 base = vec3(cameraPosition.x + (cell.x - 0.5) * uBox, cameraPosition.y - 3.0 + aSeed.z * 10.0, cameraPosition.z + (cell.y - 0.5) * uBox);
  vec3 dir = normalize(vec3(uWindDir.x, 0.0, uWindDir.y));
  vec3 side = normalize(cross(dir, vec3(0.0, 1.0, 0.0)));
  float L = 7.0 + 6.0 * aSeed.w;
  float t = position.x;
  // percorre a rajada: a cabeça avança, a cauda segue
  float head = ph * 1.4;
  float along = t * L + ph * 9.0;
  vec3 p = base + dir * along;
  // ondulação suave e caracol no fim
  float curl = smoothstep(0.65, 1.0, t);
  float ang = curl * 6.0;
  p += side * sin(t * 3.0 + aSeed.y * 6.0) * 0.6;
  p += (side * sin(ang) + vec3(0.0, 1.0, 0.0) * (1.0 - cos(ang))) * curl * 0.9;
  // espessura virada para a câmera
  vec3 toCam = normalize(cameraPosition - p);
  vec3 tang = dir;
  vec3 w = normalize(cross(tang, toCam));
  float width = 0.025 + 0.02 * aSeed.y;
  p += w * position.y * width;
  float window = smoothstep(head - 0.55, head - 0.25, t) * smoothstep(head + 0.02, head - 0.1, t);
  float dist = length(cameraPosition - p);
  vA = window * uAmount * smoothstep(1.5, 4.0, dist) * smoothstep(uBox * 0.55, uBox * 0.3, dist);
  vAcross = position.y;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vA;
varying float vAcross;
void main() {
  float a = vA * (1.0 - abs(vAcross)) * 0.55;
  if (a < 0.003) discard;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
`;
