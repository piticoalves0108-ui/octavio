"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { ContactShadows } from "@react-three/drei";
import type { Camada } from "@/lib/cena";
import { discoCarne, fatiaQueijo, folhaAlface, pao, posicoesGergelim } from "./geometrias";
import { materialComida } from "./materiais";
import { ALTURA_CAMADA, objetos } from "./diretor";

/** Hambúrguer procedural, camada por camada. Posição e escala de cada camada vêm da timeline do GSAP. */
export function useCamadasHamburguer() {
  return useMemo(() => {
    const paoMat = (corte: { y: number; acima: boolean }) =>
      materialComida({ cor1: "#b9722c", cor2: "#d8963f", queimado: "#6b3a12", listras: 0, escala: 3, aspereza: 0.5, corte: { cor: "#f0d7a0", ...corte } });
    return {
      paoBase: { geometria: pao(false), material: paoMat({ y: 0.28, acima: true }) },
      carne: {
        geometria: discoCarne(),
        material: materialComida({ cor1: "#3a1d10", cor2: "#55301a", queimado: "#120805", listras: 0.9, frequencia: 18, escala: 7, aspereza: 0.45 }),
      },
      queijo: {
        geometria: fatiaQueijo(),
        material: materialComida({ cor1: "#f0a92e", cor2: "#f7c04a", queimado: "#d8891c", listras: 0, escala: 2, aspereza: 0.35, ladoDuplo: true }),
      },
      tomate: {
        geometria: new THREE.CylinderGeometry(0.62, 0.62, 0.07, 40),
        material: materialComida({ cor1: "#b8261a", cor2: "#d9442a", queimado: "#8c1a10", listras: 0, escala: 5, aspereza: 0.3 }),
      },
      alface: {
        geometria: folhaAlface(),
        material: materialComida({ cor1: "#4f8f2e", cor2: "#7cb342", queimado: "#3b6e22", listras: 0, escala: 4, aspereza: 0.55, ladoDuplo: true }),
      },
      paoTopo: { geometria: pao(true), material: paoMat({ y: 0.02, acima: false }) },
    } satisfies Record<Camada, { geometria: THREE.BufferGeometry; material: THREE.Material }>;
  }, []);
}

export function Hamburguer3D({ sombra }: { sombra: boolean }) {
  const camadas = useCamadasHamburguer();
  return (
    <group ref={(g) => void (objetos.hamburguer = g)} visible={false}>
      <CamadasHamburguer camadas={camadas} registrar />
      {sombra && <ContactShadows position={[0, -0.02, 0]} scale={4} blur={2.4} opacity={0.65} far={2} resolution={256} color="#000000" />}
    </group>
  );
}

export function CamadasHamburguer({ camadas, registrar = false }: { camadas: ReturnType<typeof useCamadasHamburguer>; registrar?: boolean }) {
  const gergelim = useMemo(() => posicoesGergelim(70), []);
  const gergelimGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const gergelimMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f3e3c0", roughness: 0.6 }), []);

  // Na timeline, o diretor posiciona as camadas; na vitrine (captura), já montado.
  const reg = (c: Camada) => (o: THREE.Object3D | null) => {
    if (!o) return;
    if (registrar) objetos.camadas[c] = o;
    else o.position.y = ALTURA_CAMADA[c];
  };

  return (
    <>
      <mesh ref={reg("paoBase")} geometry={camadas.paoBase.geometria} material={camadas.paoBase.material} />
      <mesh ref={reg("carne")} geometry={camadas.carne.geometria} material={camadas.carne.material} />
      <mesh ref={reg("queijo")} geometry={camadas.queijo.geometria} material={camadas.queijo.material} />
      <group ref={reg("tomate")}>
        <mesh geometry={camadas.tomate.geometria} material={camadas.tomate.material} position={[-0.32, 0, 0.1]} />
        <mesh geometry={camadas.tomate.geometria} material={camadas.tomate.material} position={[0.36, 0.01, -0.12]} />
      </group>
      <mesh ref={reg("alface")} geometry={camadas.alface.geometria} material={camadas.alface.material} />
      <group ref={reg("paoTopo")}>
        <mesh geometry={camadas.paoTopo.geometria} material={camadas.paoTopo.material} />
        <instancedMesh
          args={[gergelimGeo, gergelimMat, gergelim.length]}
          ref={(m) => {
            if (!m) return;
            gergelim.forEach((g, i) => m.setMatrixAt(i, g));
            m.instanceMatrix.needsUpdate = true;
          }}
        />
      </group>
    </>
  );
}
