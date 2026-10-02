"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";
import { criarGeometriasPneu, criarGeometriasRoda } from "./geometria";
import {
  TexturaFlanco,
  criarTexturaCarcaca,
  criarTexturaCinta,
  criarTexturaFlancoInterno,
  criarTexturasBanda,
} from "./texturas";

export type Qualidade = "alta" | "media" | "baixa";

/**
 * Geometrias, texturas e materiais da roda, criados uma vez e compartilhados
 * (o pneu principal e as duas rodas do alinhamento usam os mesmos).
 */
export function useRecursosRoda(qualidade: Qualidade) {
  const recursos = useMemo(() => {
    const q = qualidade === "baixa" ? "baixa" : "alta";
    const segs = qualidade === "baixa" ? 84 : 128;
    const pneu = criarGeometriasPneu(segs);
    const roda = criarGeometriasRoda(segs);
    const banda = criarTexturasBanda(q);
    const flanco = new TexturaFlanco(q);

    const borracha = {
      color: new THREE.Color("#1a1b1e"),
      roughness: 0.8,
      metalness: 0,
      sheen: 0.55,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color("#3d3f45"),
    };

    const mat = {
      banda: new THREE.MeshPhysicalMaterial({
        ...borracha,
        normalMap: banda.normalMap,
        normalScale: new THREE.Vector2(1.1, 1.1),
        emissive: new THREE.Color("#ffc400"),
        emissiveIntensity: 0,
      }),
      flancoB: new THREE.MeshPhysicalMaterial({
        ...borracha,
        color: new THREE.Color("#ffffff"),
        map: flanco.cor,
        roughness: 0.74,
        emissive: new THREE.Color("#ffc400"),
        emissiveMap: flanco.emissivo,
        emissiveIntensity: 0,
      }),
      flancoA: new THREE.MeshPhysicalMaterial({
        ...borracha,
        color: new THREE.Color("#ffffff"),
        map: criarTexturaFlancoInterno(),
        emissive: new THREE.Color("#ffc400"),
        emissiveIntensity: 0,
      }),
      tambor: new THREE.MeshStandardMaterial({
        color: "#8e9297",
        metalness: 1,
        roughness: 0.42,
        side: THREE.DoubleSide,
      }),
      face: new THREE.MeshPhysicalMaterial({
        color: "#cfd3d8",
        metalness: 1,
        roughness: 0.3,
        // escovado na direção U: ao longo dos braços e em círculos no cubo
        anisotropy: qualidade === "baixa" ? 0 : 0.65,
        clearcoat: 0.35,
        clearcoatRoughness: 0.18,
      }),
      cubo: new THREE.MeshStandardMaterial({ color: "#1f2023", metalness: 0.7, roughness: 0.32 }),
      sinal: new THREE.MeshStandardMaterial({
        color: "#ffc400",
        emissive: "#ffc400",
        emissiveIntensity: 0.6,
        roughness: 0.4,
      }),
      porca: new THREE.MeshStandardMaterial({ color: "#c4c7cb", metalness: 1, roughness: 0.22 }),
      valvula: new THREE.MeshStandardMaterial({ color: "#111214", roughness: 0.6 }),
      cinta: new THREE.MeshStandardMaterial({
        map: criarTexturaCinta(),
        metalness: 0.85,
        roughness: 0.38,
        side: THREE.DoubleSide,
        emissive: new THREE.Color("#ffc400"),
        emissiveIntensity: 0,
      }),
      carcaca: new THREE.MeshStandardMaterial({
        map: criarTexturaCarcaca(),
        roughness: 0.9,
        side: THREE.DoubleSide,
        emissive: new THREE.Color("#ffc400"),
        emissiveIntensity: 0,
      }),
      talao: new THREE.MeshStandardMaterial({
        color: "#c9ccd0",
        metalness: 1,
        roughness: 0.28,
        emissive: new THREE.Color("#ffc400"),
        emissiveIntensity: 0,
      }),
    };

    return { pneu, roda, banda, flanco, mat };
  }, [qualidade]);

  useEffect(() => {
    return () => {
      Object.values(recursos.pneu).forEach((g) => g.dispose());
      Object.values(recursos.roda).forEach((g) => g.dispose());
      Object.values(recursos.mat).forEach((m) => {
        const mm = m as THREE.MeshStandardMaterial;
        mm.map?.dispose();
        mm.normalMap?.dispose();
        mm.emissiveMap?.dispose();
        m.dispose();
      });
      recursos.banda.pegada.dispose();
    };
  }, [recursos]);

  return recursos;
}

export type RecursosRoda = ReturnType<typeof useRecursosRoda>;

/** Referências das camadas, para a vista explodida mexer em cada uma. */
export type CamadasRef = {
  banda: THREE.Group | null;
  cinta: THREE.Group | null;
  carcaca: THREE.Group | null;
  flanco: THREE.Group | null;
  talao: THREE.Group | null;
  aro: THREE.Group | null;
};

const LATHE_PARA_Z: [number, number, number] = [Math.PI / 2, 0, 0];

/** Posição e rotação dos 5 raios, do cubo até o aro, inclinados para a face ficar côncava. */
const RAIOS = (() => {
  const lista: { pos: [number, number, number]; rot: THREE.Euler }[] = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + Math.PI / 2;
    const inclinacao = Math.atan2(0.2 - 0.145, 0.42);
    lista.push({ pos: [Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.2], rot: new THREE.Euler(0, inclinacao, a, "ZYX") });
  }
  return lista;
})();

/**
 * Pneu montado na roda. O grupo raiz gira em Z (eixo da roda).
 * Com `camadas`, inclui as partes internas (cintas, carcaça, talão) para a vista explodida.
 */
export const Roda = forwardRef<THREE.Group, { recursos: RecursosRoda; camadas?: CamadasRef; comInternas?: boolean }>(
  function Roda({ recursos, camadas, comInternas = false }, ref) {
    const { pneu, roda, mat } = recursos;
    const porcas = [0, 1, 2, 3].map((k) => (k / 4) * Math.PI * 2 + Math.PI / 4);

    return (
      <group ref={ref}>
        {/* Banda de rodagem */}
        <group ref={(g) => void (camadas && (camadas.banda = g))}>
          <mesh geometry={pneu.banda} material={mat.banda} rotation={LATHE_PARA_Z} />
        </group>

        {/* Flancos */}
        <group ref={(g) => void (camadas && (camadas.flanco = g))}>
          <mesh geometry={pneu.flancoB} material={mat.flancoB} rotation={LATHE_PARA_Z} />
          <mesh geometry={pneu.flancoA} material={mat.flancoA} rotation={LATHE_PARA_Z} />
        </group>

        {comInternas && (
          <>
            <group ref={(g) => void (camadas && (camadas.cinta = g))} visible={false}>
              <mesh geometry={pneu.cinta} material={mat.cinta} rotation={LATHE_PARA_Z} />
            </group>
            <group ref={(g) => void (camadas && (camadas.carcaca = g))} visible={false}>
              <mesh geometry={pneu.carcaca} material={mat.carcaca} rotation={LATHE_PARA_Z} />
            </group>
            <group ref={(g) => void (camadas && (camadas.talao = g))} visible={false}>
              <mesh geometry={pneu.talao} material={mat.talao} position={[0, 0, 0.24]} />
              <mesh geometry={pneu.talao} material={mat.talao} position={[0, 0, -0.24]} />
            </group>
          </>
        )}

        {/* Roda de liga: tambor torneado, cubo e 5 raios duplos em V */}
        <group ref={(g) => void (camadas && (camadas.aro = g))}>
          <mesh geometry={roda.tambor} material={mat.tambor} rotation={LATHE_PARA_Z} />
          <mesh geometry={roda.cuboFace} material={mat.face} position={[0, 0, 0.2]} rotation={LATHE_PARA_Z} />
          {RAIOS.map((r, i) => (
            <mesh key={i} geometry={roda.raio} material={mat.face} position={r.pos} rotation={r.rot} />
          ))}
          <mesh geometry={roda.cubo} material={mat.cubo} position={[0, 0, 0.215]} rotation={LATHE_PARA_Z} />
          <mesh geometry={roda.aneis} material={mat.sinal} position={[0, 0, 0.236]} />
          {porcas.map((a) => (
            <mesh
              key={a}
              geometry={roda.porca}
              material={mat.porca}
              position={[Math.cos(a) * 0.125, Math.sin(a) * 0.125, 0.212]}
              rotation={LATHE_PARA_Z}
            />
          ))}
          <mesh
            geometry={roda.valvula}
            material={mat.valvula}
            position={[Math.cos(-0.5) * 0.57, Math.sin(-0.5) * 0.57, 0.17]}
            rotation={LATHE_PARA_Z}
          />
        </group>
      </group>
    );
  },
);
