"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { estadoCena } from "./estado";

/** Partículas de poeira na luz do estúdio (hero). No celular, bem menos. */
export function Poeira({ quantidade }: { quantidade: number }) {
  const { geo, mat } = useMemo(() => {
    const pos = new Float32Array(quantidade * 3);
    const sem = new Float32Array(quantidade);
    for (let i = 0; i < quantidade; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = Math.random() * 3.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      sem[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSem", new THREE.BufferAttribute(sem, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTempo: { value: 0 },
        uCentro: { value: new THREE.Vector3() },
        uForca: { value: 1 },
        uPx: { value: Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio : 1) },
      },
      vertexShader: /* glsl */ `
        uniform float uTempo;
        uniform vec3 uCentro;
        uniform float uPx;
        attribute float aSem;
        varying float vA;
        void main() {
          vec3 p = position;
          // movimentos periódicos de 6 s: o vídeo de reserva fecha o loop sem salto
          float w = 6.2831853 / 6.0;
          p.x += sin(uTempo * w + aSem * 40.0) * 0.3;
          p.y += sin(uTempo * w * 2.0 + aSem * 17.0) * 0.18;
          p.z += cos(uTempo * w + aSem * 23.0) * 0.25;
          vec4 mv = modelViewMatrix * vec4(p + uCentro, 1.0);
          gl_Position = projectionMatrix * mv;
          float d = length(p - vec3(0.0, 1.2, 0.0));
          vA = (1.0 - smoothstep(0.6, 3.0, d)) * (0.35 + 0.65 * aSem);
          gl_PointSize = (2.0 + aSem * 3.0) * uPx * (6.0 / -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uForca;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * uForca * 0.55;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a, a);
        }
      `,
    });
    return { geo, mat };
  }, [quantidade]);

  useFrame(() => {
    mat.uniforms.uTempo.value = estadoCena.relogio;
    mat.uniforms.uCentro.value.copy(estadoCena.posPneu);
    mat.uniforms.uForca.value = estadoCena.hero;
  });

  // camada 1: fica fora do passe da sombra de contato (que só vê a camada 0)
  return <points geometry={geo} material={mat} frustumCulled={false} layers={1} />;
}
