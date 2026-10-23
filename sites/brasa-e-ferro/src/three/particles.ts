/**
 * Partículas WebGL: fumaça saindo do hambúrguer e brasas subindo da chapa.
 * Toda a animação roda no shader (a CPU só atualiza o tempo).
 */
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  NormalBlending,
  Points,
  ShaderMaterial,
} from 'three'
import { NOISE_GLSL } from './glsl'
import { rng } from './noise'

export interface ParticleSystem {
  points: Points
  material: ShaderMaterial
  /** pixels por unidade de mundo a 1 unidade de distância (depende do viewport). */
  setScale: (pxPerUnit: number) => void
  setOpacity: (o: number) => void
  dispose: () => void
}

const sharedVertexHead = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uHeight;
  attribute vec4 aSeed;
`

/** Fumaça: puffs suaves com ruído, que sobem, abrem e somem. */
export function createSmoke(count: number, opts: { radius?: number; height?: number; size?: number; color?: string } = {}): ParticleSystem {
  const r = rng(2024)
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count * 4)
  const radius = opts.radius ?? 0.55
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * radius
    pos[i * 3] = Math.cos(a) * d
    pos[i * 3 + 1] = r() * 0.1
    pos[i * 3 + 2] = Math.sin(a) * d
    seed[i * 4] = 0.6 + r() * 0.8
    seed[i * 4 + 1] = r()
    seed[i * 4 + 2] = r()
    seed[i * 4 + 3] = r()
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 4))

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 500 },
      uSize: { value: opts.size ?? 0.9 },
      uHeight: { value: opts.height ?? 2.6 },
      uOpacity: { value: 1 },
      uColor: { value: new Color(opts.color ?? '#d9cfc2') },
    },
    vertexShader: /* glsl */ `
      ${sharedVertexHead}
      varying float vAlpha;
      varying float vRot;
      varying float vSeed;
      void main() {
        float life = fract(uTime * aSeed.x * 0.055 + aSeed.y);
        vec3 p = position;
        p.y += life * uHeight;
        float t = uTime * 0.35;
        p.x += sin(t + aSeed.z * 6.2831 + life * 3.2) * 0.32 * life;
        p.z += cos(t * 0.8 + aSeed.w * 6.2831 + life * 2.6) * 0.32 * life;
        p.xz *= 1.0 + life * 0.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = uSize * (0.3 + life * 1.25) * (0.7 + aSeed.z * 0.6);
        gl_PointSize = size * uScale / -mv.z;
        vAlpha = smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.4, 1.0, life));
        vRot = aSeed.w * 6.2831 + uTime * 0.25 * (aSeed.x - 1.0);
        vSeed = aSeed.y;
      }
    `,
    fragmentShader: /* glsl */ `
      #define FBM_OCT 2
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying float vAlpha;
      varying float vRot;
      varying float vSeed;
      ${NOISE_GLSL}
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float c = cos(vRot), s = sin(vRot);
        uv = mat2(c, -s, s, c) * uv;
        float d = length(uv);
        float soft = smoothstep(0.5, 0.0, d);
        float n = fbm(vec3(uv * 3.2, vSeed * 13.0 + uTime * 0.12)) * 0.5 + 0.5;
        float a = soft * soft * smoothstep(0.25, 0.75, n) * vAlpha * uOpacity * 0.33;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  })

  const points = new Points(geo, material)
  points.frustumCulled = false
  points.renderOrder = 10
  return {
    points,
    material,
    setScale: (px) => (material.uniforms.uScale.value = px),
    setOpacity: (o) => (material.uniforms.uOpacity.value = o),
    dispose: () => {
      geo.dispose()
      material.dispose()
    },
  }
}

/** Brasas: fagulhas laranja que sobem tremendo e esfriam. */
export function createEmbers(count: number, opts: { radius?: number; height?: number } = {}): ParticleSystem {
  const r = rng(77)
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count * 4)
  const radius = opts.radius ?? 2.4
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2
    const d = 0.3 + Math.sqrt(r()) * radius
    pos[i * 3] = Math.cos(a) * d
    pos[i * 3 + 1] = r() * 0.3
    pos[i * 3 + 2] = Math.sin(a) * d * 0.6
    seed[i * 4] = 0.5 + r()
    seed[i * 4 + 1] = r()
    seed[i * 4 + 2] = r()
    seed[i * 4 + 3] = r()
  }
  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new Float32BufferAttribute(seed, 4))

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 500 },
      uSize: { value: 0.045 },
      uHeight: { value: opts.height ?? 4 },
      uOpacity: { value: 1 },
    },
    vertexShader: /* glsl */ `
      ${sharedVertexHead}
      varying float vAlpha;
      varying float vHeat;
      void main() {
        float life = fract(uTime * aSeed.x * 0.09 + aSeed.y);
        vec3 p = position;
        p.y += life * uHeight * (0.6 + aSeed.w * 0.6);
        p.x += sin(uTime * 1.3 + aSeed.z * 40.0) * 0.18 * life + sin(uTime * 5.0 + aSeed.y * 30.0) * 0.02;
        p.z += cos(uTime * 1.1 + aSeed.w * 40.0) * 0.12 * life;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float size = uSize * (1.0 - life * 0.55) * (0.5 + aSeed.w);
        gl_PointSize = max(1.5, size * uScale / -mv.z);
        float flicker = 0.55 + 0.45 * sin(uTime * (9.0 + aSeed.z * 8.0) + aSeed.y * 50.0);
        vAlpha = smoothstep(0.0, 0.06, life) * (1.0 - smoothstep(0.55, 1.0, life)) * flicker;
        vHeat = 1.0 - life;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying float vAlpha;
      varying float vHeat;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float core = smoothstep(0.5, 0.0, d);
        vec3 hot = vec3(1.0, 0.78, 0.42);
        vec3 cool = vec3(0.95, 0.22, 0.05);
        vec3 col = mix(cool, hot, core * core * vHeat);
        float a = core * core * vAlpha * uOpacity;
        gl_FragColor = vec4(col * a, a);
      }
    `,
  })
  const points = new Points(geo, material)
  points.frustumCulled = false
  points.renderOrder = 11
  return {
    points,
    material,
    setScale: (px) => (material.uniforms.uScale.value = px),
    setOpacity: (o) => (material.uniforms.uOpacity.value = o),
    dispose: () => {
      geo.dispose()
      material.dispose()
    },
  }
}
