/**
 * Materiais com shader: comida (cor variando com ruído + marcas de grelha),
 * carvão em brasa (rachaduras emissivas animadas) e cama de brasa.
 * Todos partem do MeshStandardMaterial (onBeforeCompile) para ganhar a
 * iluminação física do three.js de graça.
 */
import * as THREE from "three";
import { GLSL_RUIDO } from "./ruido";
import { PERIODO } from "./tempo";

export type OpcoesComida = {
  cor1: string;
  cor2: string;
  queimado: string;
  listras?: number;
  frequencia?: number;
  escala?: number;
  aspereza?: number;
  /** Face de corte do pão: cor clara acima (base) ou abaixo (topo) de uma altura. */
  corte?: { cor: string; y: number; acima: boolean };
  ladoDuplo?: boolean;
};

export function materialComida(o: OpcoesComida) {
  const m = new THREE.MeshStandardMaterial({
    roughness: o.aspereza ?? 0.55,
    metalness: 0,
    side: o.ladoDuplo ? THREE.DoubleSide : THREE.FrontSide,
  });
  const uniforms = {
    uCor1: { value: new THREE.Color(o.cor1) },
    uCor2: { value: new THREE.Color(o.cor2) },
    uQueimado: { value: new THREE.Color(o.queimado) },
    uListras: { value: o.listras ?? 0.8 },
    uFrequencia: { value: o.frequencia ?? 26 },
    uEscala: { value: o.escala ?? 5 },
    uCorte: { value: new THREE.Color(o.corte?.cor ?? "#000") },
    uCorteY: { value: o.corte?.y ?? 0 },
    uCorteModo: { value: o.corte ? (o.corte.acima ? 1 : -1) : 0 },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPosLocal;\nvarying vec3 vNormalLocal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPosLocal = position;\nvNormalLocal = normal;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vPosLocal;
        varying vec3 vNormalLocal;
        uniform vec3 uCor1; uniform vec3 uCor2; uniform vec3 uQueimado;
        uniform float uListras; uniform float uFrequencia; uniform float uEscala;
        uniform vec3 uCorte; uniform float uCorteY; uniform float uCorteModo;
        ${GLSL_RUIDO}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float nC = snoise(vPosLocal * uEscala) * 0.5 + 0.5;
        float nF = snoise(vPosLocal * uEscala * 3.3 + 7.0) * 0.5 + 0.5;
        vec3 baseC = mix(uCor1, uCor2, smoothstep(0.25, 0.8, nC));
        float listra = smoothstep(0.8, 0.96, sin((vPosLocal.x * 0.9 + vPosLocal.z * 0.45) * uFrequencia) * 0.5 + 0.5);
        float topo = smoothstep(-0.2, 0.6, abs(vNormalLocal.y) + abs(vNormalLocal.z) * 0.5);
        float tostado = clamp(listra * uListras * topo * (0.6 + 0.4 * nF) + pow(nF, 4.0) * 0.55, 0.0, 1.0);
        vec3 corFinal = mix(baseC, uQueimado, tostado);
        if (uCorteModo != 0.0) {
          float naFace = uCorteModo > 0.0 ? step(uCorteY, vPosLocal.y) * step(0.9, vNormalLocal.y)
                                           : step(vPosLocal.y, uCorteY) * step(0.9, -vNormalLocal.y);
          corFinal = mix(corFinal, uCorte * (0.9 + 0.2 * nF), naFace);
        }
        diffuseColor.rgb = corFinal;`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * mix(0.55, 1.25, nF) + tostado * 0.2, 0.08, 1.0);`,
      );
  };
  m.customProgramCacheKey = () => `comida-${o.corte ? 1 : 0}`;
  return m;
}

/** Uniforms compartilhados de calor (o rodapé apaga tudo de uma vez). */
export const uniformsBrasa = {
  uTempo: { value: 0 },
  uPeriodo: { value: PERIODO },
  uCalor: { value: 1 },
  uIntensidade: { value: 2.4 },
};

export function materialCarvao() {
  const m = new THREE.MeshStandardMaterial({ color: "#16110f", roughness: 0.92, metalness: 0 });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformsBrasa);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vPosBrasa;\nvarying vec3 vNormalBrasa;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vec4 pBrasa = vec4(transformed, 1.0);
        vec3 nBrasa = objectNormal;
        #ifdef USE_INSTANCING
          pBrasa = instanceMatrix * pBrasa;
          nBrasa = mat3(instanceMatrix) * nBrasa;
        #endif
        vPosBrasa = pBrasa.xyz;
        vNormalBrasa = normalize(nBrasa);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vPosBrasa; varying vec3 vNormalBrasa;
        uniform float uTempo; uniform float uPeriodo; uniform float uCalor; uniform float uIntensidade;
        ${GLSL_RUIDO}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        float cinza = (1.0 - uCalor) * smoothstep(0.2, 0.9, vNormalBrasa.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.3, 0.29), cinza * 0.55);`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float angB = uTempo * 6.2831853 / uPeriodo;
        vec3 pB = vPosBrasa * 7.0;
        float trinca = 1.0 - abs(snoise(pB + vec3(cos(angB), sin(angB), 0.0) * 0.4));
        trinca = pow(trinca, 6.0);
        float pulso = snoise(vPosBrasa * 1.8 + vec3(0.0, cos(angB) * 0.7, sin(angB) * 0.7)) * 0.5 + 0.5;
        float baixo = smoothstep(0.4, -0.7, vNormalBrasa.y);
        float brilho = (trinca * 1.25 + baixo * 0.55 + 0.08) * uCalor * (0.4 + 0.75 * pulso);
        vec3 corB = mix(vec3(0.45, 0.03, 0.0), vec3(1.0, 0.3, 0.04), smoothstep(0.15, 0.75, brilho));
        corB = mix(corB, vec3(1.0, 0.72, 0.32), smoothstep(0.85, 1.5, brilho));
        totalEmissiveRadiance += corB * brilho * uIntensidade;`,
      );
  };
  m.customProgramCacheKey = () => "carvao";
  return m;
}

/** Cama de brasa: plano no fundo da churrasqueira, brilho aditivo com ruído. */
export function materialCamaBrasa() {
  return new THREE.ShaderMaterial({
    uniforms: uniformsBrasa,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTempo; uniform float uPeriodo; uniform float uCalor; uniform float uIntensidade;
      ${GLSL_RUIDO}
      void main() {
        float a = uTempo * 6.2831853 / uPeriodo;
        vec2 p = vUv * vec2(6.0, 3.5);
        float n = fbm(vec3(p, 0.0) + vec3(cos(a), sin(a), 0.0) * 0.5) * 0.5 + 0.5;
        vec2 c = vUv - 0.5;
        float borda = smoothstep(0.5, 0.25, abs(c.x)) * smoothstep(0.5, 0.2, abs(c.y));
        float b = pow(n, 2.2) * borda * uCalor;
        vec3 cor = mix(vec3(0.6, 0.06, 0.0), vec3(1.0, 0.42, 0.08), n) * b * uIntensidade * 0.55;
        gl_FragColor = vec4(cor, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
