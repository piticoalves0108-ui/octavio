"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Percurso } from "./percurso";
import { COMPRIMENTO_LADRILHO } from "./texturas";
import { estadoCena } from "./estado";

/**
 * ASFALTO + MARCA DE PNEU EM TEMPO REAL.
 *
 * O chão é um plano com shader próprio (grão de asfalto, pedrinhas, faixa amarela
 * gasta, poça de luz sob o pneu e névoa até a cor de fundo da página).
 *
 * A marca é um render target em coordenadas do chão. A cada quadro, o trecho que o
 * pneu rolou (de s_anterior até s_atual) é carimbado com a pegada da banda, alinhada
 * ao comprimento de arco: o desenho continua sem emenda e voltar a rolagem não duplica
 * nada (blending MAX).
 */

const LARGURA_PEGADA = 0.42;

const vertCarimbo = /* glsl */ `
  uniform vec2 uA;
  uniform vec2 uB;
  uniform float uLargura;
  uniform vec4 uRet;
  varying vec2 vUv;
  void main() {
    vec2 d = uB - uA;
    float len = length(d);
    vec2 t = len > 1e-5 ? d / len : vec2(1.0, 0.0);
    vec2 n = vec2(-t.y, t.x);
    float ao = position.x + 0.5;
    vec2 p = mix(uA - t * 0.004, uB + t * 0.004, ao) + n * position.y * uLargura;
    vUv = vec2(ao, position.y + 0.5);
    vec2 clip = (p - uRet.xy) / uRet.zw * 2.0 - 1.0;
    gl_Position = vec4(clip, 0.0, 1.0);
  }
`;

const fragCarimbo = /* glsl */ `
  uniform sampler2D uPegada;
  uniform float uSa;
  uniform float uSb;
  uniform float uComp;
  uniform float uForca;
  varying vec2 vUv;
  void main() {
    float s = mix(uSa, uSb, vUv.x);
    float h = texture2D(uPegada, vec2(s / uComp, vUv.y)).r;
    gl_FragColor = vec4(h * uForca, 0.0, 0.0, 1.0);
  }
`;

const vertChao = /* glsl */ `
  varying vec3 vMundo;
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    gl_Position = projectionMatrix * viewMatrix * m;
  }
`;

const fragChao = /* glsl */ `
  uniform sampler2D uTrilha;
  uniform vec4 uRet;
  uniform vec2 uLuz;
  uniform float uLuzForca;
  uniform vec3 uCam;
  uniform vec3 uFundo;
  uniform vec2 uNevoa;
  uniform vec3 uFaixaCor;
  varying vec3 vMundo;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float ruido(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
  }

  void main() {
    vec2 p = vMundo.xz;
    float n = ruido(p * 2.3) * 0.45 + ruido(p * 9.0) * 0.3 + ruido(p * 31.0) * 0.25;
    float grao = hash(floor(p * 160.0));
    float pedra = smoothstep(0.84, 1.0, grao);
    vec3 base = vec3(0.034, 0.035, 0.039) * (0.72 + 0.56 * n) + pedra * vec3(0.03);

    // faixa amarela tracejada e gasta, paralela ao percurso
    vec2 o = vec2(4.6, -1.6);
    vec2 dir = normalize(vec2(-0.906, 0.423));
    vec2 rel = p - o;
    float ao = dot(rel, dir);
    float lado = abs(rel.x * dir.y - rel.y * dir.x);
    float faixa = smoothstep(0.075, 0.06, lado) * step(0.0, sin(ao * 1.9));
    float gasto = smoothstep(0.25, 0.75, ruido(p * 7.0) * 0.6 + ruido(p * 40.0) * 0.4);
    base = mix(base, uFaixaCor, faixa * gasto * 0.85);

    // poça de luz do estúdio sob o pneu
    float d = distance(p, uLuz);
    float poca = exp(-d * d * 0.085) * uLuzForca;
    vec3 cor = base * (0.38 + 2.3 * poca);

    // marca do pneu (borracha depositada: mais escura e lisa)
    vec2 tuv = (p - uRet.xy) / uRet.zw;
    float m = 0.0;
    if (tuv.x > 0.0 && tuv.y > 0.0 && tuv.x < 1.0 && tuv.y < 1.0) m = texture2D(uTrilha, tuv).r;
    cor = mix(cor, vec3(0.006, 0.0062, 0.007), m * 0.92);
    // brilho fosco da borracha na luz
    cor += m * poca * vec3(0.012);

    float dist = distance(vMundo, uCam);
    float nevoa = smoothstep(uNevoa.x, uNevoa.y, dist);
    cor = mix(cor, uFundo, nevoa);
    gl_FragColor = vec4(cor, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Asfalto({ percurso, qualidade, pegada }: { percurso: Percurso; qualidade: "alta" | "baixa"; pegada: THREE.Texture }) {
  const gl = useThree((s) => s.gl);

  const { rt, ret, cenaCarimbo, matCarimbo, camFalsa } = useMemo(() => {
    const caixa = percurso.caixa;
    const ret = new THREE.Vector4(caixa.min.x, caixa.min.z, caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z);
    const largura = qualidade === "alta" ? 2048 : 1024;
    const altura = Math.round((largura * ret.w) / ret.z);
    const rt = new THREE.WebGLRenderTarget(largura, altura, {
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
    const matCarimbo = new THREE.ShaderMaterial({
      vertexShader: vertCarimbo,
      fragmentShader: fragCarimbo,
      uniforms: {
        uA: { value: new THREE.Vector2() },
        uB: { value: new THREE.Vector2() },
        uLargura: { value: LARGURA_PEGADA },
        uRet: { value: ret },
        uPegada: { value: pegada },
        uSa: { value: 0 },
        uSb: { value: 0 },
        uComp: { value: COMPRIMENTO_LADRILHO },
        uForca: { value: 1 },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 1, 1), matCarimbo);
    quad.frustumCulled = false;
    const cenaCarimbo = new THREE.Scene();
    cenaCarimbo.add(quad);
    return { rt, ret, cenaCarimbo, matCarimbo, camFalsa: new THREE.Camera() };
  }, [percurso, qualidade, pegada]);

  const matChao = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertChao,
        fragmentShader: fragChao,
        uniforms: {
          uTrilha: { value: rt.texture },
          uRet: { value: ret },
          uLuz: { value: new THREE.Vector2(2, 0.3) },
          uLuzForca: { value: 1 },
          uCam: { value: new THREE.Vector3() },
          uFundo: { value: new THREE.Color("#0f1012") },
          uNevoa: { value: new THREE.Vector2(9, 24) },
          uFaixaCor: { value: new THREE.Color("#ffc400").multiplyScalar(0.32) },
        },
      }),
    [rt, ret],
  );

  // limpa o render target uma vez
  useEffect(() => {
    // limpa com preto e devolve a cor de limpeza original (a sombra de contato
    // do drei depende do alpha 0 para ficar transparente fora da sombra)
    const anterior = gl.getRenderTarget();
    const corAntes = gl.getClearColor(new THREE.Color());
    const alphaAntes = gl.getClearAlpha();
    gl.setRenderTarget(rt);
    gl.setClearColor(0x000000, 1);
    gl.clear(true, false, false);
    gl.setClearColor(corAntes, alphaAntes);
    gl.setRenderTarget(anterior);
    return () => {
      rt.dispose();
      matCarimbo.dispose();
      matChao.dispose();
    };
  }, [gl, rt, matCarimbo, matChao]);

  const sCarimbado = useRef(0);
  // render target novo (troca de qualidade): carimba o percurso de novo desde o início
  useEffect(() => {
    sCarimbado.current = 0;
  }, [rt]);
  const pos = useMemo(() => new THREE.Vector3(), []);
  const tan = useMemo(() => new THREE.Vector3(), []);
  const pos2 = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    const e = estadoCena;
    // poça de luz acompanha o pneu
    matChao.uniforms.uLuz.value.set(e.posPneu.x, e.posPneu.z);
    matChao.uniforms.uLuzForca.value = e.luzChao;
    matChao.uniforms.uCam.value.copy(camera.position);

    // carimba o trecho rolado neste quadro, em passos curtos (acompanha a curva)
    const sAlvo = e.s;
    let sA = sCarimbado.current;
    if (Math.abs(sAlvo - sA) < 1e-4) return;
    const dirSinal = Math.sign(sAlvo - sA);
    const anterior = gl.getRenderTarget();
    const autoClear = gl.autoClear;
    gl.autoClear = false;
    gl.setRenderTarget(rt);
    let guarda = 0;
    while (Math.abs(sAlvo - sA) > 1e-4 && guarda++ < 400) {
      const sB = Math.abs(sAlvo - sA) > 0.06 ? sA + dirSinal * 0.06 : sAlvo;
      percurso.amostrar(sA, pos, tan);
      percurso.amostrar(sB, pos2, tan);
      const u = matCarimbo.uniforms;
      u.uA.value.set(pos.x, pos.z);
      u.uB.value.set(pos2.x, pos2.z);
      u.uSa.value = sA;
      u.uSb.value = sB;
      gl.render(cenaCarimbo, camFalsa);
      sA = sB;
    }
    gl.setRenderTarget(anterior);
    gl.autoClear = autoClear;
    sCarimbado.current = sAlvo;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={matChao} renderOrder={-1}>
      <planeGeometry args={[90, 90, 1, 1]} />
    </mesh>
  );
}
