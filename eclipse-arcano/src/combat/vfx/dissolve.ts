import * as THREE from 'three';

/**
 * Dissolução na morte: troca temporariamente os materiais de um objeto por cópias com
 * descarte por ruído + borda brilhante. As cópias compartilham o programa (cache key), e os
 * materiais originais (possivelmente compartilhados com outras entidades) não são tocados.
 * Materiais sem suporte (ShaderMaterial próprios) apenas encolhem/somem.
 */

interface Entry {
  mesh: THREE.Mesh;
  original: THREE.Material | THREE.Material[];
  clones: THREE.Material[];
}

export interface DissolveJob {
  object: THREE.Object3D;
  entries: Entry[];
  uniform: { value: number };
  color: { value: THREE.Color };
  t: number;
  duration: number;
  baseScale: THREE.Vector3;
  fallbackShrink: boolean;
  done: boolean;
  onDone?: () => void;
}

const INJECT_VERT_DECL = 'varying vec3 vDissolvePos;\n';
const INJECT_FRAG_DECL = 'uniform float uDissolve;\nuniform vec3 uDissolveColor;\nvarying vec3 vDissolvePos;\n' +
  'float dsHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n' +
  'float dsNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);\n' +
  ' return mix(mix(mix(dsHash(i), dsHash(i + vec3(1,0,0)), f.x), mix(dsHash(i + vec3(0,1,0)), dsHash(i + vec3(1,1,0)), f.x), f.y),\n' +
  '            mix(mix(dsHash(i + vec3(0,0,1)), dsHash(i + vec3(1,0,1)), f.x), mix(dsHash(i + vec3(0,1,1)), dsHash(i + vec3(1,1,1)), f.x), f.y), f.z); }\n';

function supports(m: THREE.Material): boolean {
  return (m as THREE.MeshStandardMaterial).isMeshStandardMaterial === true || (m as THREE.MeshBasicMaterial).isMeshBasicMaterial === true || (m as THREE.MeshLambertMaterial).isMeshLambertMaterial === true || (m as THREE.MeshPhongMaterial).isMeshPhongMaterial === true;
}

function makeClone(src: THREE.Material, uniform: { value: number }, color: { value: THREE.Color }): THREE.Material {
  const m = src.clone();
  const prevCompile = src.onBeforeCompile;
  const prevKey = src.customProgramCacheKey.bind(src);
  m.onBeforeCompile = (shader, renderer) => {
    prevCompile.call(src, shader, renderer);
    shader.uniforms.uDissolve = uniform;
    shader.uniforms.uDissolveColor = color;
    shader.vertexShader = INJECT_VERT_DECL + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vDissolvePos = transformed;');
    shader.fragmentShader =
      INJECT_FRAG_DECL +
      shader.fragmentShader
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n  float dsN = dsNoise(vDissolvePos * 4.5) * 0.7 + dsNoise(vDissolvePos * 11.0) * 0.3;\n  float dsY = clamp(vDissolvePos.y * 0.18, 0.0, 0.35);\n  float dsV = dsN * 0.75 + dsY;\n  if (dsV < uDissolve) discard;')
        .replace('#include <opaque_fragment>', '#include <opaque_fragment>\n  gl_FragColor.rgb += uDissolveColor * (1.0 - smoothstep(0.0, 0.07, dsV - uDissolve)) * step(0.001, uDissolve) * 4.0;');
  };
  m.customProgramCacheKey = () => prevKey() + '|dissolve';
  return m;
}

export class DissolveManager {
  private jobs: DissolveJob[] = [];

  start(object: THREE.Object3D, duration: number, color: number, onDone?: () => void): DissolveJob {
    const uniform = { value: 0 };
    const col = { value: new THREE.Color(color) };
    const entries: Entry[] = [];
    let unsupported = 0;
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (!mats.every(supports)) {
        unsupported++;
        return;
      }
      const clones = mats.map((m) => makeClone(m, uniform, col));
      entries.push({ mesh, original: mesh.material, clones });
      mesh.material = Array.isArray(mesh.material) ? clones : clones[0];
    });
    const job: DissolveJob = {
      object,
      entries,
      uniform,
      color: col,
      t: 0,
      duration: Math.max(0.1, duration),
      baseScale: object.scale.clone(),
      fallbackShrink: unsupported > 0,
      done: false,
      onDone,
    };
    this.jobs.push(job);
    return job;
  }

  /** Cancela: restaura materiais e escala. */
  cancel(job: DissolveJob) {
    if (job.done) return;
    this.finish(job, true);
    const i = this.jobs.indexOf(job);
    if (i >= 0) this.jobs.splice(i, 1);
  }

  private finish(job: DissolveJob, restore: boolean) {
    job.done = true;
    for (const e of job.entries) {
      e.mesh.material = e.original;
      for (const c of e.clones) c.dispose();
    }
    if (restore) job.object.scale.copy(job.baseScale);
    else job.object.visible = false;
  }

  update(dt: number) {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i];
      j.t += dt;
      const k = Math.min(1, j.t / j.duration);
      j.uniform.value = k * 1.08;
      if (j.fallbackShrink) {
        const s = 1 - k * k;
        j.object.scale.set(j.baseScale.x * (1 + k * 0.15), j.baseScale.y * Math.max(0.02, s), j.baseScale.z * (1 + k * 0.15));
      }
      if (k >= 1) {
        this.finish(j, true);
        j.object.visible = false;
        this.jobs.splice(i, 1);
        j.onDone?.();
      }
    }
  }

  get count() {
    return this.jobs.length;
  }

  clear() {
    for (const j of this.jobs) this.finish(j, true);
    this.jobs.length = 0;
  }
}

/**
 * Variante "dissolução" de um material (gera o MESMO programa de shader das cópias usadas na
 * morte). Usada pelo pré-aquecimento de shaders (src/perf/ShaderWarmup.ts): uma cópia mantida
 * viva impede que o programa seja descartado (e recompilado) quando a última dissolução termina.
 */
export function dissolveVariant(src: THREE.Material): THREE.Material {
  return makeClone(src, { value: 0 }, { value: new THREE.Color(0x9fd8ff) });
}
