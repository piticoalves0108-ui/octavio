import * as THREE from 'three';

/**
 * Visuais persistentes das habilidades (shaders procedurais, sem texturas):
 * bolha do Escudo Mágico, Fenda Dimensional (rasgo + espiral no chão) e nuvem da
 * Tempestade de Raios. Cada um é uma malha única reaproveitada (pool pequeno).
 */

const SHIELD_VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  vP = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const SHIELD_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uHit;
uniform vec3 uColor;
varying vec3 vN;
varying vec3 vV;
varying vec3 vP;
void main() {
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float rim = pow(f, 2.5);
  // padrão hexagonal aproximado (3 famílias de faixas)
  vec3 p = vP * 7.0;
  float h1 = abs(fract(p.x + p.y * 0.577) - 0.5);
  float h2 = abs(fract(p.x - p.y * 0.577) - 0.5);
  float h3 = abs(fract(p.y * 1.155 + p.z * 0.5) - 0.5);
  float hex = 1.0 - smoothstep(0.0, 0.06, min(min(h1, h2), h3));
  float scan = 0.5 + 0.5 * sin(vP.y * 9.0 - uTime * 4.0);
  float runes = step(0.93, fract(sin(dot(floor(p.xz * 0.6), vec2(12.9898, 78.233))) * 43758.5453)) * step(0.45, scan);
  float a = rim * 0.85 + hex * (0.12 + 0.35 * uHit) + runes * 0.25 + 0.03;
  a *= uAlpha;
  vec3 col = mix(uColor, vec3(1.0), rim * 0.35 + uHit * 0.4);
  gl_FragColor = vec4(col, a);
}
`;

export class ShieldBubble {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private alpha = 0;
  private hit = 0;
  active = false;

  constructor(uTime: { value: number }) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: SHIELD_VERT,
      fragmentShader: SHIELD_FRAG,
      uniforms: { uTime, uAlpha: { value: 0 }, uHit: { value: 0 }, uColor: { value: new THREE.Color(0x58b0ff) } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), this.mat);
    this.mesh.name = 'escudo-magico';
    this.mesh.visible = false;
    this.mesh.renderOrder = 15;
    this.mesh.frustumCulled = false;
  }

  setColor(hex: number) {
    this.mat.uniforms.uColor.value.setHex(hex);
  }

  pulse() {
    this.hit = 1;
  }

  update(dt: number, center: THREE.Vector3, fraction: number) {
    const target = this.active ? 0.55 + 0.45 * fraction : 0;
    this.alpha += (target - this.alpha) * Math.min(1, dt * 10);
    this.hit = Math.max(0, this.hit - dt * 4);
    this.mat.uniforms.uAlpha.value = this.alpha;
    this.mat.uniforms.uHit.value = this.hit;
    this.mesh.visible = this.alpha > 0.01;
    if (this.mesh.visible) {
      this.mesh.position.copy(center);
      this.mesh.scale.set(1.15, 1.35, 1.15);
      this.mesh.rotation.y += dt * 0.4;
    }
  }
}

// ---------------------------------------------------------------------
const RIFT_CORE_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uScale;
varying vec2 vUv;
void main() {
  vec2 c = vUv * 2.0 - 1.0;
  c.x *= 1.6;
  float r = length(c);
  float ang = atan(c.y, c.x);
  float spiral = sin(ang * 3.0 + r * 9.0 - uTime * 7.0) * 0.5 + 0.5;
  float tear = 1.0 - smoothstep(0.62, 0.98, r + 0.1 * sin(ang * 5.0 + uTime * 3.0) + 0.05 * sin(ang * 13.0 - uTime * 5.0));
  float rim = smoothstep(0.3, 0.7, r) * tear;
  float core = 1.0 - smoothstep(0.0, 0.62, r);
  // núcleo escuro com estrelas distantes; borda roxa em espiral
  float stars = step(0.985, fract(sin(dot(floor(c * 22.0 + uTime * 0.5), vec2(12.9898, 78.233))) * 43758.5453)) * core;
  vec3 col = mix(vec3(0.015, 0.0, 0.04), vec3(0.75, 0.3, 1.0) * 2.4, rim * (0.55 + 0.45 * spiral));
  col += vec3(1.0, 0.65, 1.0) * pow(rim, 3.0) * 2.0 + vec3(0.8, 0.7, 1.0) * stars;
  float a = clamp(max(core * 0.97, rim) * tear, 0.0, 1.0) * uAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
`;

const RIFT_DISK_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
varying vec2 vUv;
void main() {
  vec2 c = vUv * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  float ang = atan(c.y, c.x);
  float arms = pow(0.5 + 0.5 * sin(ang * 4.0 + log(r + 0.05) * 6.0 + uTime * 5.0), 3.0);
  float a = arms * (1.0 - r) * smoothstep(0.0, 0.15, r) * uAlpha + (1.0 - smoothstep(0.92, 1.0, r)) * smoothstep(0.86, 0.92, r) * 0.6 * uAlpha;
  gl_FragColor = vec4(vec3(0.6, 0.25, 1.0) * 1.6, a);
}
`;

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export class RiftVisual {
  readonly group = new THREE.Group();
  private core: THREE.Mesh;
  private disk: THREE.Mesh;
  private coreMat: THREE.ShaderMaterial;
  private diskMat: THREE.ShaderMaterial;
  private alpha = 0;
  active = false;
  private camPos = new THREE.Vector3();

  constructor(uTime: { value: number }) {
    this.coreMat = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: RIFT_CORE_FRAG,
      uniforms: { uTime, uAlpha: { value: 0 }, uScale: { value: 1 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.diskMat = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: RIFT_DISK_FRAG,
      uniforms: { uTime, uAlpha: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    this.core = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.coreMat);
    this.disk = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.diskMat);
    this.disk.rotation.x = -Math.PI / 2;
    this.core.renderOrder = 16;
    this.disk.renderOrder = 9;
    this.group.add(this.core, this.disk);
    this.group.name = 'fenda-dimensional';
    this.group.visible = false;
    for (const m of [this.core, this.disk]) m.frustumCulled = false;
  }

  update(dt: number, center: THREE.Vector3, groundY: number, radius: number, intensity: number, camera: THREE.Camera) {
    const target = this.active ? intensity : 0;
    this.alpha += (target - this.alpha) * Math.min(1, dt * 6);
    this.coreMat.uniforms.uAlpha.value = this.alpha;
    this.diskMat.uniforms.uAlpha.value = this.alpha * 0.8;
    this.group.visible = this.alpha > 0.01;
    if (!this.group.visible) return;
    this.core.position.copy(center);
    camera.getWorldPosition(this.camPos);
    this.core.lookAt(this.camPos.x, center.y, this.camPos.z);
    const s = 2.2 + radius * 0.3;
    this.core.scale.set(s * 1.15, s * 1.8, 1);
    this.disk.position.set(center.x, groundY + 0.08, center.z);
    this.disk.scale.setScalar(radius);
  }
}

// ---------------------------------------------------------------------
const CLOUD_FRAG = /* glsl */ `
uniform float uTime;
uniform float uAlpha;
uniform float uFlash;
varying vec2 vUv;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main() {
  vec2 c = vUv * 2.0 - 1.0;
  float r = length(c);
  if (r > 1.0) discard;
  vec2 p = c * 3.0;
  float ang = uTime * 0.25;
  p = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p;
  float v = n(p) * 0.5 + n(p * 2.1 + uTime * 0.3) * 0.3 + n(p * 4.3 - uTime * 0.5) * 0.2;
  float a = smoothstep(0.25, 0.75, v) * (1.0 - smoothstep(0.55, 1.0, r)) * uAlpha;
  vec3 col = mix(vec3(0.08, 0.09, 0.13), vec3(0.6, 0.75, 1.0), uFlash * v);
  gl_FragColor = vec4(col, a * 0.92);
}
`;

export class StormCloud {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;
  private alpha = 0;
  private flash = 0;
  active = false;

  constructor(uTime: { value: number }) {
    this.mat = new THREE.ShaderMaterial({
      vertexShader: BILLBOARD_VERT,
      fragmentShader: CLOUD_FRAG,
      uniforms: { uTime, uAlpha: { value: 0 }, uFlash: { value: 0 } },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.name = 'nuvem-tempestade';
    this.mesh.visible = false;
    this.mesh.renderOrder = 8;
    this.mesh.frustumCulled = false;
  }

  strike() {
    this.flash = 1;
  }

  update(dt: number, center: THREE.Vector3, radius: number) {
    const target = this.active ? 1 : 0;
    this.alpha += (target - this.alpha) * Math.min(1, dt * 3);
    this.flash = Math.max(0, this.flash - dt * 6);
    this.mat.uniforms.uAlpha.value = this.alpha;
    this.mat.uniforms.uFlash.value = this.flash;
    this.mesh.visible = this.alpha > 0.01;
    if (this.mesh.visible) {
      this.mesh.position.copy(center);
      this.mesh.scale.setScalar(radius * 1.35);
    }
  }
}
