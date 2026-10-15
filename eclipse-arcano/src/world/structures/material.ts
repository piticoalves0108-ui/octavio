import * as THREE from 'three';
import { GLOBAL_UNIFORMS } from '../../core/uniforms';
import { LAYER_COUNT, LAYER_PBR, structureLayersTexture } from '../textures';

/**
 * Material ÚNICO de todas as estruturas: MeshStandardMaterial cuja cor, rugosidade,
 * metalicidade e máscara de emissão vêm de uma DataArrayTexture (uma camada por
 * material: pedra, madeira, telha, reboco, metal com circuitos, cristal...).
 * A camada vem do atributo `aLayer`; a emissão de `aEmit` (rgb, modo):
 *   0 = fixa, 1 = só à noite (lampiões, janelas), 2 = pulsante (cristais, circuitos),
 *   3 = noite + chama tremulante (lareiras, tochas).
 * Assim a arquitetura inteira compartilha um único programa de shader.
 */
let shared: THREE.MeshStandardMaterial | null = null;
let layers: THREE.DataArrayTexture | null = null;

export function structureMaterial(): THREE.MeshStandardMaterial {
  if (shared) return shared;
  layers = structureLayersTexture();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const uniforms = {
    tLayers: { value: layers },
    uLayerRough: { value: LAYER_PBR.map((l) => l.rough) },
    uLayerMetal: { value: LAYER_PBR.map((l) => l.metal) },
    uTime: GLOBAL_UNIFORMS.uTime,
    uNight: GLOBAL_UNIFORMS.uNight,
    uWetness: GLOBAL_UNIFORMS.uWetness,
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute float aLayer;
attribute vec4 aEmit;
varying float vLayer;
varying vec4 vEmit;
varying vec2 vSUv;
varying vec3 vSWorld;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vLayer = aLayer;
vEmit = aEmit;
vSUv = uv;
vSWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform highp sampler2DArray tLayers;
uniform float uLayerRough[${LAYER_COUNT}];
uniform float uLayerMetal[${LAYER_COUNT}];
uniform float uTime;
uniform float uNight;
uniform float uWetness;
varying float vLayer;
varying vec4 vEmit;
varying vec2 vSUv;
varying vec3 vSWorld;`,
      )
      .replace(
        '#include <map_fragment>',
        `int sLi = int(vLayer + 0.5);
vec4 sTex = texture(tLayers, vec3(vSUv, float(sLi)));
diffuseColor.rgb *= sTex.rgb;
float sWet = uWetness * 0.85;
diffuseColor.rgb *= 1.0 - 0.3 * sWet;`,
      )
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = uLayerRough[sLi] * (1.0 - 0.55 * sWet);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = uLayerMetal[sLi];')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
{
  float m = vEmit.w;
  float k = 1.0;
  if (m > 0.5 && m < 1.5) k = smoothstep(0.15, 0.6, uNight);
  else if (m > 1.5 && m < 2.5) k = 0.65 + 0.35 * sin(uTime * 1.6 + vSWorld.x * 0.11 + vSWorld.y * 0.23 + vSWorld.z * 0.07);
  else if (m > 2.5) k = (0.55 + 0.45 * smoothstep(0.1, 0.6, uNight)) * (0.8 + 0.2 * sin(uTime * 11.0 + vSWorld.x * 3.0) * sin(uTime * 7.3 + vSWorld.z * 2.0));
  totalEmissiveRadiance += vEmit.rgb * sTex.a * k;
}`,
      );
  };
  mat.customProgramCacheKey = () => 'structure-v1';
  shared = mat;
  return mat;
}

export function disposeStructureMaterial() {
  shared?.dispose();
  layers?.dispose();
  shared = null;
  layers = null;
}
