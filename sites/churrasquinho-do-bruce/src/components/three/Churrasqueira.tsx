"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { GLSL_RUIDO } from "./ruido";
import { barrasGrelha, pedraCarvao, posicoesCarvao } from "./geometrias";
import { materialCamaBrasa, materialCarvao } from "./materiais";
import { objetos } from "./diretor";
import { aleatorio, PERIODO } from "./tempo";

/**
 * Churrasqueira: caixa de aço, grelha, carvão em brasa (shader emissivo),
 * cama de brasa, luz quente de baixo, faíscas e fumaça. Tudo dentro do "rig",
 * que o diretor move com o scroll (hero) ou prende ao rodapé.
 */
export function Churrasqueira({ qtdCarvao, qtdFaiscas, qtdFumaca }: { qtdCarvao: number; qtdFaiscas: number; qtdFumaca: number }) {
  const aco = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2b2826", metalness: 0.82, roughness: 0.48 }), []);
  const acoGrelha = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a3532", metalness: 0.9, roughness: 0.36 }), []);
  const carvaoGeo = useMemo(() => pedraCarvao(), []);
  const carvaoMat = useMemo(() => materialCarvao(), []);
  const camaMat = useMemo(() => materialCamaBrasa(), []);
  const barras = useMemo(() => barrasGrelha(24, 2.94), []);
  const barraGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 1.78, 6).rotateX(Math.PI / 2), []);
  const pedras = useMemo(() => posicoesCarvao(qtdCarvao), [qtdCarvao]);

  return (
    <group ref={(g) => void (objetos.rig = g)}>
      {/* Caixa: fundo, frente, trás e laterais */}
      <mesh material={aco} position={[0, -0.6, 0]}>
        <boxGeometry args={[3.2, 0.05, 1.8]} />
      </mesh>
      <mesh material={aco} position={[0, -0.3, 0.9]}>
        <boxGeometry args={[3.2, 0.62, 0.05]} />
      </mesh>
      <mesh material={aco} position={[0, -0.3, -0.9]}>
        <boxGeometry args={[3.2, 0.62, 0.05]} />
      </mesh>
      <mesh material={aco} position={[-1.6, -0.3, 0]}>
        <boxGeometry args={[0.05, 0.62, 1.85]} />
      </mesh>
      <mesh material={aco} position={[1.6, -0.3, 0]}>
        <boxGeometry args={[0.05, 0.62, 1.85]} />
      </mesh>
      {/* Pés */}
      {[-1.45, 1.45].map((x) =>
        [-0.75, 0.75].map((z) => (
          <mesh key={`${x}${z}`} material={aco} position={[x, -1.3, z]}>
            <boxGeometry args={[0.06, 1.35, 0.06]} />
          </mesh>
        )),
      )}

      {/* Grelha */}
      <instancedMesh
        args={[barraGeo, acoGrelha, barras.length]}
        ref={(m) => {
          if (!m) return;
          barras.forEach((b, i) => m.setMatrixAt(i, b));
          m.instanceMatrix.needsUpdate = true;
        }}
      />
      {[-0.86, 0.86].map((z) => (
        <mesh key={z} material={acoGrelha} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, 3.1, 8]} />
        </mesh>
      ))}

      {/* Carvão em brasa */}
      <instancedMesh
        args={[carvaoGeo, carvaoMat, pedras.length]}
        ref={(m) => {
          if (!m) return;
          pedras.forEach((p, i) => m.setMatrixAt(i, p));
          m.instanceMatrix.needsUpdate = true;
        }}
      />
      <mesh material={camaMat} position={[0, -0.56, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.1, 1.75]} />
      </mesh>

      {/* Luz quente vindo de baixo */}
      <pointLight ref={(l) => void (objetos.luzBrasa = l)} position={[0, -0.12, 0.2]} color="#ff6326" intensity={9} distance={7} decay={1.6} />

      <Faiscas qtd={qtdFaiscas} />
      <Fumaca qtd={qtdFumaca} />
    </group>
  );
}

/** Faíscas: partículas instanciadas que sobem com turbulência (tudo no vertex shader). */
function Faiscas({ qtd }: { qtd: number }) {
  const { geometria, material } = useMemo(() => {
    const rnd = aleatorio(31);
    const g = new THREE.InstancedBufferGeometry();
    const plano = new THREE.PlaneGeometry(1, 1);
    g.index = plano.index;
    g.setAttribute("position", plano.attributes.position);
    g.setAttribute("uv", plano.attributes.uv);
    const sementes = new Float32Array(qtd * 4);
    const extra = new Float32Array(qtd);
    for (let i = 0; i < qtd; i++) {
      sementes.set([rnd(), rnd(), rnd(), rnd()], i * 4);
      extra[i] = rnd();
    }
    g.setAttribute("aSemente", new THREE.InstancedBufferAttribute(sementes, 4));
    g.setAttribute("aExtra", new THREE.InstancedBufferAttribute(extra, 1));
    g.instanceCount = qtd;

    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTempo: { value: 0 },
        uPeriodo: { value: PERIODO },
        uCalor: { value: 1 },
        uAbanar: { value: 0 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aSemente;
        attribute float aExtra;
        uniform float uTempo; uniform float uPeriodo; uniform float uCalor; uniform float uAbanar;
        varying float vAlfa; varying float vVida; varying vec2 vUv;
        vec3 caminho(float vida, vec4 s) {
          float altura = 1.3 + s.y * 1.9 + uAbanar * 0.9;
          vec3 p = vec3((s.z - 0.5) * 2.7, -0.3 + vida * altura, (s.w - 0.5) * 1.5);
          float f = s.x * 40.0;
          p.x += sin(vida * 8.0 + f) * 0.24 * vida + sin(vida * 21.0 + f * 1.7) * 0.05 * vida;
          p.z += cos(vida * 6.5 + f) * 0.18 * vida;
          return p;
        }
        void main() {
          vUv = uv;
          float k = 1.0 + floor(aSemente.y * 3.0);
          float vida = fract(uTempo / uPeriodo * k + aSemente.x);
          vec4 mv = modelViewMatrix * vec4(caminho(vida, aSemente), 1.0);
          vec4 mv2 = modelViewMatrix * vec4(caminho(vida + 0.012, aSemente), 1.0);
          vec2 dir = mv2.xy - mv.xy;
          float comp = length(dir);
          dir = comp > 1e-5 ? dir / comp : vec2(0.0, 1.0);
          vec2 perp = vec2(-dir.y, dir.x);
          float ativa = step(aExtra, 0.55 + uAbanar * 0.45) * uCalor;
          float tamanho = (0.011 + aSemente.y * 0.013) * (1.0 - vida * 0.5);
          mv.xy += dir * position.y * (tamanho + comp * 2.4) * 2.0 + perp * position.x * tamanho;
          vAlfa = smoothstep(0.0, 0.05, vida) * (1.0 - smoothstep(0.5, 1.0, vida)) * ativa;
          vVida = vida;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlfa; varying float vVida; varying vec2 vUv;
        void main() {
          vec2 c = vUv - 0.5;
          float d = 1.0 - smoothstep(0.0, 0.5, length(c * vec2(2.0, 1.0)));
          vec3 cor = mix(vec3(1.0, 0.82, 0.45), vec3(1.0, 0.28, 0.04), smoothstep(0.0, 0.7, vVida)) * 5.0;
          gl_FragColor = vec4(cor * d * vAlfa, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    return { geometria: g, material: m };
  }, [qtd]);

  return (
    <mesh
      geometry={geometria}
      material={material}
      frustumCulled={false}
      ref={(m) => void (objetos.faiscas = m ? material : null)}
    />
  );
}

/** Fumaça: planos com ruído (fbm + domain warp) que se abrem em volta do cursor. */
function Fumaca({ qtd }: { qtd: number }) {
  const materiais = useMemo(
    () =>
      Array.from(
        { length: qtd },
        (_, i) =>
          new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
              uTempo: { value: 0 },
              uPeriodo: { value: PERIODO },
              uSemente: { value: i * 3.17 },
              uOpacidade: { value: 0 },
              uCalor: { value: 1 },
              uForca: { value: 0 },
              uPonteiro: { value: new THREE.Vector2(-9, -9) },
            },
            vertexShader: /* glsl */ `
              varying vec2 vUv;
              void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: /* glsl */ `
              varying vec2 vUv;
              uniform float uTempo; uniform float uPeriodo; uniform float uSemente; uniform float uOpacidade;
              uniform float uCalor; uniform float uForca; uniform vec2 uPonteiro;
              ${GLSL_RUIDO}
              void main() {
                vec2 uv = vUv;
                vec2 d = uv - uPonteiro;
                float infl = exp(-dot(d, d) / 0.02) * uForca;
                uv += normalize(d + 1e-4) * infl * 0.16;
                float a = uTempo * 6.2831853 / uPeriodo;
                vec3 q = vec3(uv * vec2(2.2, 1.7), uSemente) + vec3(cos(a), sin(a), 0.0) * 0.22;
                float w = fbm(q * 0.8 + vec3(0.0, 0.0, uSemente * 2.0));
                float n = fbm(q + vec3(w * 0.9, w * 0.6, 0.0)) * 0.5 + 0.5;
                vec2 c = vUv - 0.5;
                float mascara = smoothstep(0.5, 0.1, length(c * vec2(1.0, 0.85)));
                float dens = smoothstep(0.42, 0.88, n) * mascara * (1.0 - 0.8 * infl);
                vec3 cor = mix(vec3(0.25, 0.235, 0.22), vec3(0.85, 0.24, 0.05), smoothstep(0.65, 0.0, vUv.y) * 0.5 * uCalor);
                gl_FragColor = vec4(cor, dens * uOpacidade);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
              }`,
          }),
      ),
    [qtd],
  );

  return (
    <group>
      {materiais.map((m, i) => (
        <mesh key={i} material={m} renderOrder={10 + i} ref={(malha) => void (objetos.fumaca[i] = malha)}>
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}

