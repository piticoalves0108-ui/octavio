import * as THREE from 'three';
import type { Heightfield } from './heightfield';
import type { WorldMaps } from './maps';
import { MAPS_GLSL } from './maps';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { RIVERS, WATER, WATER_LEVEL, WORLD_HALF } from '../data/world';

/**
 * Água (lago, rio e pântano) no WATER_LEVEL. A malha só existe onde o relevo fica
 * abaixo da linha d'água (grade de 8 m), dividida em blocos de 256 m para culling.
 * Shader: ondas leves, normais animadas (fluxo do rio), fresnel com o céu,
 * cor por profundidade (lida da altura exata do relevo), espuma nas margens,
 * água turva no pântano e reflexo especular do sol.
 */
export class Water {
  readonly group = new THREE.Group();
  readonly material: THREE.ShaderMaterial;

  constructor(hf: Heightfield, maps: WorldMaps, normalTex: THREE.Texture) {
    this.group.name = 'agua';
    this.material = createWaterMaterial(maps, normalTex);
    const cell = WATER.cell;
    const block = WATER.block;
    const n = Math.round((WORLD_HALF * 2) / cell);
    const perBlock = Math.round(block / cell);
    const wet = new Uint8Array(n * n);
    // célula com água: algum canto (amostra a cada 2 m) abaixo do nível
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x0 = -WORLD_HALF + i * cell;
        const z0 = -WORLD_HALF + j * cell;
        let mn = Infinity;
        for (let dz = 0; dz <= cell; dz += 2) for (let dx = 0; dx <= cell; dx += 2) mn = Math.min(mn, hf.heightAt(x0 + dx, z0 + dz));
        if (mn < WATER_LEVEL + 0.05) wet[j * n + i] = 1;
      }
    }
    const blocks = Math.ceil(n / perBlock);
    for (let bj = 0; bj < blocks; bj++) {
      for (let bi = 0; bi < blocks; bi++) {
        const pos: number[] = [];
        const flow: number[] = [];
        const idx: number[] = [];
        const vmap = new Map<number, number>();
        const vert = (i: number, j: number) => {
          const key = j * (n + 1) + i;
          let v = vmap.get(key);
          if (v !== undefined) return v;
          const x = -WORLD_HALF + i * cell;
          const z = -WORLD_HALF + j * cell;
          v = pos.length / 3;
          pos.push(x, WATER_LEVEL, z);
          const f = riverFlow(x, z);
          flow.push(f[0], f[1]);
          vmap.set(key, v);
          return v;
        };
        for (let j = bj * perBlock; j < Math.min(n, (bj + 1) * perBlock); j++) {
          for (let i = bi * perBlock; i < Math.min(n, (bi + 1) * perBlock); i++) {
            if (!wet[j * n + i]) continue;
            const a = vert(i, j);
            const b = vert(i + 1, j);
            const c = vert(i, j + 1);
            const d = vert(i + 1, j + 1);
            idx.push(a, c, b, b, c, d);
          }
        }
        if (!idx.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 2));
        g.setIndex(idx);
        g.computeBoundingSphere();
        g.computeBoundingBox();
        const m = new THREE.Mesh(g, this.material);
        m.name = 'agua_bloco';
        m.matrixAutoUpdate = false;
        m.renderOrder = 1;
        this.group.add(m);
      }
    }
  }

  dispose() {
    for (const c of this.group.children) (c as THREE.Mesh).geometry.dispose();
    this.material.dispose();
  }
}

/** Direção × velocidade da correnteza perto do rio (tangente da polilinha). */
export function riverFlow(x: number, z: number): [number, number] {
  let best = Infinity;
  let fx = 0;
  let fz = 0;
  for (const r of RIVERS) {
    for (let i = 0; i < r.points.length - 1; i++) {
      const [ax, az] = r.points[i];
      const [bx, bz] = r.points[i + 1];
      const abx = bx - ax;
      const abz = bz - az;
      const L2 = abx * abx + abz * abz;
      const t = Math.max(0, Math.min(1, ((x - ax) * abx + (z - az) * abz) / L2));
      const px = ax + abx * t - x;
      const pz = az + abz * t - z;
      const d = Math.sqrt(px * px + pz * pz) - r.width * 0.5;
      if (d < best) {
        best = d;
        const L = Math.sqrt(L2);
        fx = abx / L;
        fz = abz / L;
      }
    }
  }
  const k = best < 6 ? 1 : best < 30 ? 1 - (best - 6) / 24 : 0;
  return [fx * k * 1.4, fz * k * 1.4];
}

function createWaterMaterial(maps: WorldMaps, normalTex: THREE.Texture) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      tWaterNormal: { value: null },
      uDeep: { value: new THREE.Color(0x0b2a3c) },
      uShallow: { value: new THREE.Color(0x2f7f86) },
      uSwamp: { value: new THREE.Color(0x1c2414) },
    },
  ]);
  // texturas/uniforms globais compartilhados (por referência, sem clonar)
  Object.assign(uniforms, maps.uniforms(), {
    tWaterNormal: { value: normalTex },
    uTime: GLOBAL_UNIFORMS.uTime,
    uSunDir: GLOBAL_UNIFORMS.uSunDir,
    uSunColor: GLOBAL_UNIFORMS.uSunColor,
    uFogColor: GLOBAL_UNIFORMS.uFogColor,
    uNight: GLOBAL_UNIFORMS.uNight,
    uWetness: GLOBAL_UNIFORMS.uWetness,
    uWindStrength: GLOBAL_UNIFORMS.uWindStrength,
  });
  return new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: true,
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>
      attribute vec2 aFlow;
      uniform float uTime;
      uniform float uWindStrength;
      varying vec3 vWorld;
      varying vec2 vFlow;
      void main() {
        vec3 p = position;
        float w = 0.04 + 0.05 * uWindStrength;
        p.y += sin(p.x * 0.35 + uTime * 1.3) * w + cos(p.z * 0.29 + uTime * 1.1) * w;
        vWorld = p;
        vFlow = aFlow;
        vec4 mvPosition = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      ${MAPS_GLSL}
      uniform sampler2D tWaterNormal;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSwamp;
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uFogColor;
      uniform float uNight;
      uniform float uWetness;
      uniform float uWindStrength;
      varying vec3 vWorld;
      varying vec2 vFlow;
      vec3 sampleN(vec2 uv) { return texture(tWaterNormal, uv).xyz * 2.0 - 1.0; }
      float vhash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(vhash(i), vhash(i + vec2(1.0, 0.0)), f.x), mix(vhash(i + vec2(0.0, 1.0)), vhash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 xz = vWorld.xz;
        float ground = worldHeight(xz);
        float depth = max(0.0, ${WATER_LEVEL.toFixed(2)} - ground);
        vec4 wdat = texture(tWorldData, worldMapUv(xz));
        float swamp = smoothstep(0.08, 0.35, wdat.g);
        // normais: duas camadas que se movem + correnteza do rio (fluxo em duas fases)
        float spd = 0.02 + 0.03 * uWindStrength;
        vec2 uvA = xz * 0.045 + vec2(uTime * spd, uTime * spd * 0.6);
        vec2 uvB = xz * 0.11 + vec2(-uTime * spd * 1.3, uTime * spd * 0.9);
        float ph0 = fract(uTime * 0.25);
        float ph1 = fract(uTime * 0.25 + 0.5);
        float fw = abs(ph0 - 0.5) * 2.0;
        vec3 nf = mix(sampleN(xz * 0.08 - vFlow * ph0 * 2.0), sampleN(xz * 0.08 + 0.37 - vFlow * ph1 * 2.0), fw);
        vec3 n = sampleN(uvA) + sampleN(uvB) * 0.6 + nf * length(vFlow) * 0.9;
        float rough = mix(0.35, 0.12, swamp);
        n = normalize(vec3(n.x * rough, 1.0, n.y * rough));
        vec3 V = normalize(cameraPosition - vWorld);
        float ndv = max(dot(n, V), 0.0);
        float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
        vec3 R = reflect(-V, n);
        // céu aproximado: horizonte (névoa) → zênite azul, escurecendo à noite
        vec3 zen = mix(vec3(0.22, 0.42, 0.72), vec3(0.02, 0.03, 0.08), uNight);
        vec3 sky = mix(uFogColor, zen, smoothstep(0.0, 0.6, R.y));
        float dayK = 1.0 - 0.82 * uNight;
        vec3 body = mix(uShallow, uDeep, smoothstep(0.2, 6.0, depth));
        body = mix(body, uSwamp, swamp);
        body *= dayK * (0.55 + 0.45 * max(uSunDir.y, 0.0));
        vec3 col = mix(body, sky, fres * mix(0.85, 0.5, swamp));
        // pântano: lentilhas-d'água/limo boiando em manchas (paradas, só ondulam)
        float scumN = vnoise(xz * 0.09 + vec2(uTime * 0.01, 0.0)) * 0.7 + vnoise(xz * 0.37) * 0.3;
        float scum = smoothstep(0.58, 0.72, scumN) * swamp;
        col = mix(col, vec3(0.16, 0.22, 0.08) * dayK * (0.6 + 0.4 * max(uSunDir.y, 0.0)), scum * 0.85);
        // brilho do sol
        float sp = pow(max(dot(R, normalize(uSunDir)), 0.0), mix(220.0, 60.0, swamp));
        col += uSunColor * sp * 2.2 * (1.0 - uNight) * (1.0 - swamp * 0.6);
        // espuma nas margens (rio corrente → mais espuma)
        float foamN = texture(tWaterNormal, xz * 0.21 + uTime * 0.03).z;
        float edge = 1.0 - smoothstep(0.0, 0.55 + length(vFlow) * 0.4, depth);
        float foam = smoothstep(0.45, 0.8, foamN + edge * 0.6) * edge * (1.0 - swamp * 0.92);
        col = mix(col, vec3(0.85, 0.9, 0.92) * dayK, foam * 0.55);
        // chuva: superfície mais rugosa e escura
        col *= 1.0 - uWetness * 0.12;
        float alpha = mix(0.35, 0.93, smoothstep(0.0, 2.2, depth));
        alpha = max(alpha, fres * 0.9);
        alpha = mix(alpha, 0.97, swamp * 0.8);
        alpha = max(alpha, foam * 0.85);
        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}
