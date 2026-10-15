import * as THREE from 'three';
import type { WorldMaps } from '../maps';
import { MAPS_GLSL } from '../maps';
import { GLOBAL_UNIFORMS } from '../../core/uniforms';
import { RNG } from '../../core/rng';
import { damp } from '../../core/math';
import { VEGETATION } from '../../data/world';
import type { BiomeId } from '../../data/world';
import type { QualityPreset } from '../../data/quality';

/**
 * Partículas ambientes em volta do jogador num ÚNICO sistema de pontos:
 * folhas (floresta), poeira (desfiladeiro/ruínas/vila de dia), vagalumes (à noite
 * em campos/floresta/pântano) e esporos (pântano/terra corrompida).
 * Posições calculadas no vertex shader (caixa que acompanha a câmera, com
 * "wrap" e altura do relevo), então a CPU só mistura os pesos por bioma.
 */
export class AmbientParticles {
  readonly points: THREE.Points;
  private uniforms: Record<string, THREE.IUniform>;
  /** Pesos atuais: folhas, poeira, vagalumes, esporos. */
  private w = new THREE.Vector4(0, 0, 0, 0);
  private target = new THREE.Vector4();
  private count = 0;

  constructor(maps: WorldMaps) {
    this.uniforms = {
      ...maps.uniforms(),
      uCenter: { value: new THREE.Vector3() },
      uBox: { value: 46 },
      uMix: { value: this.w },
      uTime: GLOBAL_UNIFORMS.uTime,
      uWindDir: GLOBAL_UNIFORMS.uWindDir,
      uWindStrength: GLOBAL_UNIFORMS.uWindStrength,
      uNight: GLOBAL_UNIFORMS.uNight,
      uScale: { value: 300 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]),
      transparent: true,
      depthWrite: false,
      fog: true,
      vertexShader: /* glsl */ `
        #include <common>
        #include <fog_pars_vertex>
        ${MAPS_GLSL}
        attribute vec4 aSeed;
        uniform vec3 uCenter;
        uniform float uBox;
        uniform vec4 uMix;
        uniform float uTime;
        uniform vec2 uWindDir;
        uniform float uWindStrength;
        uniform float uNight;
        uniform float uScale;
        varying vec4 vCol;
        varying float vType;
        varying float vRot;
        void main() {
          // escolhe o tipo pela fração da semente contra os pesos acumulados
          float total = uMix.x + uMix.y + uMix.z + uMix.w;
          float s = aSeed.w * max(total, 1.0);
          float type = s < uMix.x ? 0.0 : s < uMix.x + uMix.y ? 1.0 : s < uMix.x + uMix.y + uMix.z ? 2.0 : s < total ? 3.0 : 4.0;
          vType = type;
          float t = uTime;
          vec3 drift;
          float hRange;
          float size;
          if (type < 0.5) { drift = vec3(uWindDir.x, 0.0, uWindDir.y) * (0.6 + uWindStrength * 1.6); hRange = 9.0; size = 0.22; }
          else if (type < 1.5) { drift = vec3(uWindDir.x, 0.05, uWindDir.y) * (0.25 + uWindStrength); hRange = 5.0; size = 0.12; }
          else if (type < 2.5) { drift = vec3(0.0); hRange = 3.0; size = 0.16; }
          else { drift = vec3(uWindDir.x * 0.2, 0.18, uWindDir.y * 0.2); hRange = 6.0; size = 0.14; }
          vec3 p = aSeed.xyz * uBox;
          p.xz += drift.xz * t + vec2(sin(t * 0.7 + aSeed.y * 30.0), cos(t * 0.6 + aSeed.x * 25.0)) * (type > 1.5 && type < 2.5 ? 1.6 : 0.4);
          vec2 xz = mod(p.xz - uCenter.xz + uBox * 0.5, uBox) + uCenter.xz - uBox * 0.5;
          float ground = worldHeight(xz);
          float yy;
          if (type < 0.5) yy = hRange - mod(aSeed.y * hRange + t * (0.5 + aSeed.x * 0.4), hRange);
          else if (type > 2.5) yy = mod(aSeed.y * hRange + t * 0.25, hRange);
          else yy = 0.4 + aSeed.y * hRange + sin(t * 1.3 + aSeed.z * 40.0) * 0.4;
          vec3 wp = vec3(xz.x, max(ground, 4.0) + yy, xz.y);
          // folhas tremulam
          if (type < 0.5) wp.xz += vec2(sin(t * 3.0 + aSeed.z * 50.0), cos(t * 2.6 + aSeed.x * 40.0)) * 0.35;
          vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float distFade = 1.0 - smoothstep(uBox * 0.32, uBox * 0.5, length(xz - uCenter.xz));
          float hidden = type > 3.5 ? 0.0 : 1.0;
          gl_PointSize = size * uScale / max(-mvPosition.z, 0.5) * hidden * distFade;
          vec3 c;
          float a;
          if (type < 0.5) { c = mix(vec3(0.75, 0.42, 0.12), vec3(0.45, 0.6, 0.18), aSeed.z); a = 0.9; }
          else if (type < 1.5) { c = vec3(0.85, 0.78, 0.62) * (1.0 - uNight * 0.7); a = 0.35; }
          else { float blink = 0.5 + 0.5 * sin(t * (2.0 + aSeed.x * 3.0) + aSeed.z * 60.0); c = (type < 2.5 ? vec3(1.6, 1.8, 0.6) : vec3(0.7, 1.2, 1.6)) * (0.4 + blink); a = (type < 2.5 ? uNight : 0.6 + 0.4 * uNight) * (0.3 + 0.7 * blink); }
          vCol = vec4(c, a * distFade);
          vRot = aSeed.x * 6.28 + t * (type < 0.5 ? 2.0 : 0.0);
          #include <fog_vertex>
        }
      `,
      fragmentShader: /* glsl */ `
        #include <common>
        #include <fog_pars_fragment>
        varying vec4 vCol;
        varying float vType;
        varying float vRot;
        void main() {
          vec2 q = gl_PointCoord - 0.5;
          float a;
          if (vType < 0.5) {
            // folha: elipse girada com nervura
            float c = cos(vRot), s = sin(vRot);
            vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
            float e = length(vec2(r.x * 2.2, r.y));
            a = smoothstep(0.5, 0.42, e);
          } else {
            float d = length(q);
            a = vType < 1.5 ? smoothstep(0.5, 0.1, d) : smoothstep(0.5, 0.0, d) * smoothstep(0.5, 0.15, d) * 1.4;
          }
          float alpha = a * vCol.a;
          if (alpha < 0.02) discard;
          gl_FragColor = vec4(vCol.rgb, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });
    Object.assign(mat.uniforms, this.uniforms);
    this.points = new THREE.Points(new THREE.BufferGeometry(), mat);
    this.points.name = 'particulas_ambiente';
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.points.matrixAutoUpdate = false;
  }

  configure(q: QualityPreset) {
    const n = Math.round(VEGETATION.ambientParticles * Math.min(2, q.maxParticles / 1500));
    if (n === this.count) return;
    this.count = n;
    const rng = new RNG(31337);
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) seeds[i] = rng.next();
    const g = new THREE.BufferGeometry();
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.points.geometry.dispose();
    this.points.geometry = g;
  }

  /** Mistura os pesos pelo bioma e hora; centraliza a caixa no jogador. */
  update(dt: number, x: number, y: number, z: number, biome: BiomeId, night: number, height: number) {
    (this.uniforms.uCenter.value as THREE.Vector3).set(x, y, z);
    const t = this.target;
    const day = 1 - night;
    switch (biome) {
      case 'forest':
        t.set(0.55, 0.05, 0.45 * night + 0.05, 0.08);
        break;
      case 'swamp':
      case 'corrupted':
        t.set(0.03, 0.05, 0.25 * night, 0.6);
        break;
      case 'rocky':
      case 'ruins':
        t.set(0.03, 0.6 * day + 0.15, 0.1 * night, biome === 'ruins' ? 0.1 : 0);
        break;
      case 'meadow':
        t.set(0.06, 0.12 * day, 0.6 * night, 0.03);
        break;
      case 'village':
        t.set(0.04, 0.25 * day, 0.25 * night, 0);
        break;
      default:
        t.set(0.04, 0.12, 0.2 * night, 0.02);
    }
    // pouco acima do chão (voando alto, some)
    const k = 1 - Math.min(1, Math.max(0, height - 25) / 40);
    t.multiplyScalar(k);
    const w = this.w;
    w.x = damp(w.x, t.x, 0.6, dt);
    w.y = damp(w.y, t.y, 0.6, dt);
    w.z = damp(w.z, t.z, 0.6, dt);
    w.w = damp(w.w, t.w, 0.6, dt);
    this.points.visible = w.x + w.y + w.z + w.w > 0.01;
  }

  setPixelScale(heightPx: number) {
    this.uniforms.uScale.value = heightPx * 0.5;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
