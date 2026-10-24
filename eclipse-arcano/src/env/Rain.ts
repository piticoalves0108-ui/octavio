/**
 * Chuva na GPU: gotas (riscos) numa caixa que acompanha a câmera mas ficam fixas no
 * mundo (posição = semente + deslocamento do vento, com módulo pela caixa), inclinadas
 * pela velocidade do vento, com largura mínima de ~1 px (sem cintilar ao longe).
 * A quantidade desenhada é `instanceCount` = q.rainDrops × intensidade (1 draw call).
 *
 * Respingos: pool pequeno no chão perto do jogador (anel na água/poças + coroa de
 * gotículas), reposicionado na CPU só quando cada respingo termina (1 draw call).
 */
import * as THREE from 'three';
import { RAIN } from '../data/weather';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { WATER_LEVEL } from '../data/world';

/** Marcador de respingo inativo (nascimento muito antigo → invisível no shader). */
const DEAD = -1e4;

export class Rain {
  readonly drops: THREE.Mesh;
  readonly splashes: THREE.Mesh;
  readonly dropUniforms = {
    uBox: { value: new THREE.Vector2(RAIN.boxWidth, RAIN.boxHeight) },
    uRainTime: { value: 0 },
    uWindOff: { value: new THREE.Vector2() },
    uWindVel: { value: new THREE.Vector2() },
    uFall: { value: RAIN.fallSpeed },
    uLen: { value: RAIN.dropLength },
    uWidth: { value: RAIN.dropWidth },
    uPixelAngle: { value: 0.001 },
    uOpacity: { value: 0.3 },
    uColor: { value: new THREE.Color(0.7, 0.75, 0.82) },
    /** 0 = chuva, 1 = neve (flocos lentos, redondos, balançando). */
    uSnow: GLOBAL_UNIFORMS.uSnow,
  };
  readonly splashUniforms = {
    uSplashTime: { value: 0 },
    uLife: { value: RAIN.splashLife },
    uColor: this.dropUniforms.uColor,
    uOpacity: { value: 0.5 },
  };
  private dropGeo = new THREE.InstancedBufferGeometry();
  private splashGeo = new THREE.InstancedBufferGeometry();
  private capacity = 0;
  private splashCap = 0;
  private splashPos!: THREE.InstancedBufferAttribute;
  private splashData!: THREE.InstancedBufferAttribute;
  private rainTime = 0;
  private splashTime = 0;
  private windOffX = 0;
  private windOffZ = 0;
  /** Gotas desenhadas no último quadro. */
  activeDrops = 0;
  activeSplashes = 0;

  constructor() {
    // quad base: x ∈ {-1, 1} (lado), y ∈ {0, 1} (cauda → cabeça)
    this.dropGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
    this.dropGeo.setIndex([0, 1, 2, 2, 1, 3]);
    const dropMat = new THREE.ShaderMaterial({
      name: 'chuva',
      uniforms: this.dropUniforms,
      vertexShader: DROP_VERT,
      fragmentShader: DROP_FRAG,
      transparent: true,
      // o quad é orientado no vertex shader: sem culling (a ordem dos vértices não importa)
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    this.drops = new THREE.Mesh(this.dropGeo, dropMat);
    this.drops.name = 'chuva';
    this.drops.frustumCulled = false;
    this.drops.renderOrder = 20;
    this.drops.visible = false;

    // respingo: quad deitado (anel) + quad em pé (coroa); aKind no z da posição
    const sp: number[] = [];
    for (const [x, z] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      sp.push(x, z, 0);
    for (const [x, y] of [
      [-1, 0],
      [1, 0],
      [-1, 1],
      [1, 1],
    ])
      sp.push(x, y, 1);
    this.splashGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.splashGeo.setIndex([0, 1, 2, 2, 1, 3, 4, 5, 6, 6, 5, 7]);
    const splashMat = new THREE.ShaderMaterial({
      name: 'respingos',
      uniforms: this.splashUniforms,
      vertexShader: SPLASH_VERT,
      fragmentShader: SPLASH_FRAG,
      transparent: true,
      // anel deitado (visto de cima) e coroa em pé: sem culling
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    });
    this.splashes = new THREE.Mesh(this.splashGeo, splashMat);
    this.splashes.name = 'respingos';
    this.splashes.frustumCulled = false;
    this.splashes.renderOrder = 19;
    this.splashes.visible = false;
  }

  /** (Re)aloca os buffers para o preset (só ao mudar a qualidade). */
  configure(maxDrops: number, splashScale: number) {
    const cap = Math.max(0, Math.floor(maxDrops));
    if (cap !== this.capacity) {
      this.capacity = cap;
      const seeds = new Float32Array(Math.max(1, cap) * 4);
      // semente determinística (mesma chuva a cada sessão; sem custo por quadro)
      let s = 0x9e3779b9;
      const rnd = () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      for (let i = 0; i < seeds.length; i++) seeds[i] = rnd();
      this.dropGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 4));
      this.dropGeo.instanceCount = 0;
    }
    const sc = Math.max(8, Math.round(RAIN.splashes * splashScale));
    if (sc !== this.splashCap) {
      this.splashCap = sc;
      this.splashPos = new THREE.InstancedBufferAttribute(new Float32Array(sc * 3), 3);
      this.splashData = new THREE.InstancedBufferAttribute(new Float32Array(sc * 2).fill(DEAD), 2);
      this.splashPos.setUsage(THREE.DynamicDrawUsage);
      this.splashData.setUsage(THREE.DynamicDrawUsage);
      this.splashGeo.setAttribute('aPos', this.splashPos);
      this.splashGeo.setAttribute('aData', this.splashData);
      this.splashGeo.instanceCount = sc;
    }
  }

  /**
   * @param intensity 0..1 (já com o fator de interior)
   * @param windX/windZ vento em m/s
   * @param pixelAngle tamanho angular de 1 pixel (rad) — largura mínima das gotas
   */
  update(dt: number, intensity: number, windX: number, windZ: number, pixelAngle: number) {
    const u = this.dropUniforms;
    const count = Math.min(this.capacity, Math.round(this.capacity * intensity));
    this.activeDrops = count;
    this.drops.visible = count > 8;
    this.dropGeo.instanceCount = count;
    if (!this.drops.visible) return;
    // relógio próprio com volta (precisão de float32 no shader)
    this.rainTime = (this.rainTime + dt) % 600;
    const W = RAIN.boxWidth;
    this.windOffX = (((this.windOffX + windX * dt) % W) + W) % W;
    this.windOffZ = (((this.windOffZ + windZ * dt) % W) + W) % W;
    u.uRainTime.value = this.rainTime;
    u.uWindOff.value.set(this.windOffX, this.windOffZ);
    u.uWindVel.value.set(windX, windZ);
    u.uPixelAngle.value = pixelAngle;
    u.uOpacity.value = 0.2 + 0.26 * intensity;
  }

  /**
   * Respingos em volta de (cx, cz). `ground(x, z)` retorna a altura do chão ou NaN
   * para não respingar ali (interior, fora do mundo).
   */
  updateSplashes(dt: number, intensity: number, cx: number, cz: number, ground: (x: number, z: number) => number, rnd: () => number) {
    this.splashTime = (this.splashTime + dt) % 1000;
    const t = this.splashTime;
    this.splashUniforms.uSplashTime.value = t;
    const dat = this.splashData.array as Float32Array;
    const wasVisible = this.splashes.visible;
    this.splashes.visible = intensity > 0.05;
    if (!this.splashes.visible) {
      if (wasVisible) {
        // marca todos como mortos (evita ambiguidade da volta do relógio ao reaparecer)
        for (let i = 0; i < this.splashCap; i++) dat[i * 2] = DEAD;
        this.splashData.needsUpdate = true;
      }
      this.activeSplashes = 0;
      return;
    }
    const life = RAIN.splashLife;
    const pos = this.splashPos.array as Float32Array;
    let changed = false;
    let active = 0;
    const R = RAIN.splashRadius;
    for (let i = 0; i < this.splashCap; i++) {
      const born = dat[i * 2];
      if (born > DEAD * 0.5) {
        let age = t - born;
        if (age < -500) age += 1000; // volta do relógio
        if (age < life) {
          active++;
          continue;
        }
        dat[i * 2] = DEAD;
        changed = true;
      }
      // terminou: talvez renasça (mais respingos com chuva forte)
      if (rnd() > intensity * 0.9 + 0.05) continue;
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * R;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r;
      const h = ground(x, z);
      if (Number.isNaN(h)) continue;
      pos[i * 3] = x;
      pos[i * 3 + 1] = Math.max(h, WATER_LEVEL) + 0.03;
      pos[i * 3 + 2] = z;
      dat[i * 2] = t + rnd() * 0.25; // nasce com pequeno atraso (sem sincronia)
      dat[i * 2 + 1] = h < WATER_LEVEL - 0.1 ? 1 : 0.55 + rnd() * 0.45; // água → anel maior
      changed = true;
      active++;
    }
    this.activeSplashes = active;
    this.splashUniforms.uOpacity.value = 0.25 + 0.35 * intensity;
    if (changed) {
      this.splashPos.needsUpdate = true;
      this.splashData.needsUpdate = true;
    }
  }

  dispose() {
    this.dropGeo.dispose();
    this.splashGeo.dispose();
    (this.drops.material as THREE.Material).dispose();
    (this.splashes.material as THREE.Material).dispose();
  }
}

const DROP_VERT = /* glsl */ `
attribute vec4 aSeed;
uniform vec2 uBox;
uniform float uRainTime;
uniform vec2 uWindOff;
uniform vec2 uWindVel;
uniform float uFall;
uniform float uLen;
uniform float uWidth;
uniform float uPixelAngle;
uniform float uSnow;
varying float vAlpha;
varying vec2 vUv;
void main() {
  float W = uBox.x;
  float H = uBox.y;
  // neve: cai devagar (≈1,1 m/s) e o vento a leva mais
  float speed = mix(uFall * (0.82 + 0.36 * aSeed.w), 0.8 + 0.6 * aSeed.w, uSnow);
  float y = mod(aSeed.y * H - uRainTime * speed, H);
  vec2 xz = aSeed.xz * W + uWindOff * (1.0 + uSnow * 0.6);
  // flocos balançam
  xz += uSnow * vec2(sin(uRainTime * (0.9 + aSeed.w) + aSeed.y * 40.0), cos(uRainTime * (0.7 + aSeed.x) + aSeed.z * 40.0)) * 0.6;
  vec2 rel = mod(xz - cameraPosition.xz + 0.5 * W, W) - 0.5 * W;
  vec3 p = vec3(cameraPosition.x + rel.x, cameraPosition.y - H * 0.42 + y, cameraPosition.z + rel.y);
  vec3 vel = vec3(uWindVel.x, -speed, uWindVel.y);
  vec3 axis = normalize(vel);
  vec3 toCam = cameraPosition - p;
  float dist = length(toCam);
  vec3 side = normalize(cross(axis, toCam / max(dist, 1e-3)));
  // neve: quadradinho virado para a câmera (floco redondo no fragment)
  vec3 camUp = normalize(cross(side, toCam / max(dist, 1e-3)));
  axis = normalize(mix(axis, -camUp, uSnow));
  // largura mínima de ~1,2 px: ao longe a gota fica mais larga e mais transparente
  float w = max(mix(uWidth, 0.035 + 0.025 * aSeed.x, uSnow), dist * uPixelAngle * 0.6);
  float len = mix(uLen * (0.7 + 0.6 * aSeed.w) * (speed / uFall), w * 2.0, uSnow);
  vec3 wp = p - axis * len * position.y + side * position.x * w;
  vAlpha = (uWidth / w)
    * smoothstep(W * 0.5, W * 0.3, length(rel))
    * smoothstep(0.6, 2.2, dist)
    * smoothstep(0.0, 2.0, y) * smoothstep(H, H - 3.0, y);
  vUv = position.xy;
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const DROP_FRAG = /* glsl */ `
uniform float uOpacity;
uniform vec3 uColor;
uniform float uSnow;
varying float vAlpha;
varying vec2 vUv;
void main() {
  float a = (1.0 - abs(vUv.x)) * smoothstep(0.0, 0.35, vUv.y) * (0.55 + 0.45 * vUv.y);
  // floco: disco macio e mais opaco
  float flake = smoothstep(1.0, 0.25, length(vec2(vUv.x, vUv.y * 2.0 - 1.0))) * 2.4;
  a = mix(a, flake, uSnow);
  a *= vAlpha * uOpacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(mix(uColor, vec3(0.96, 0.97, 1.0), uSnow), min(1.0, a));
  #include <colorspace_fragment>
}
`;

const SPLASH_VERT = /* glsl */ `
attribute vec3 aPos;
attribute vec2 aData;
uniform float uSplashTime;
uniform float uLife;
varying vec2 vUv;
varying float vAge;
varying float vKind;
void main() {
  float age = uSplashTime - aData.x;
  if (age < -500.0) age += 1000.0;
  float t = age / uLife;
  vAge = t;
  vKind = position.z;
  vUv = position.xy;
  if (t < 0.0 || t > 1.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  vec3 wp;
  if (position.z < 0.5) {
    // anel deitado no chão / na água
    float s = 0.08 + 0.32 * aData.y;
    wp = aPos + vec3(position.x * s, 0.0, position.y * s);
  } else {
    // coroa: billboard em pé
    vec3 toCam = normalize(cameraPosition - aPos);
    vec3 right = normalize(vec3(toCam.z, 0.0, -toCam.x) + vec3(1e-4, 0.0, 0.0));
    float s = 0.07 + 0.05 * aData.y;
    wp = aPos + right * position.x * s + vec3(0.0, position.y * s * 1.6, 0.0);
  }
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
}
`;

const SPLASH_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vUv;
varying float vAge;
varying float vKind;
void main() {
  float a;
  if (vKind < 0.5) {
    float r = length(vUv);
    float ring = exp(-pow((r - (0.25 + 0.75 * vAge)) / 0.09, 2.0));
    a = ring * (1.0 - vAge) * step(r, 1.0);
  } else {
    // três gotículas em parábola
    a = 0.0;
    for (int i = 0; i < 3; i++) {
      float fi = float(i) - 1.0;
      vec2 c = vec2(fi * 0.55 * vAge, (4.0 * vAge * (1.0 - vAge)) * (0.75 + 0.2 * abs(fi)) * 0.9);
      a = max(a, smoothstep(0.2, 0.05, length(vUv - c)));
    }
    a *= 1.0 - vAge * 0.6;
  }
  a *= uOpacity;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * 1.15, a);
  #include <colorspace_fragment>
}
`;
