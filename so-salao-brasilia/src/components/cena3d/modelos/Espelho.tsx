"use client";

/**
 * Espelho de chão em arco com moldura estofada (geometria procedural).
 * Estofado: moldura. Acabamento: contorno externo e base.
 */
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { useMateriais } from "../materiais";
import { caminhoArco, extrudar, formaMolduraArco, liberar, segmentos, type Detalhe } from "./formas";

const LARGURA = 0.74;
const ALTURA = 1.72;
const MOLDURA = 0.085;

export function Espelho({ detalhe = "alto" }: { detalhe?: Detalhe }) {
  const m = useMateriais();
  const arco = segmentos(detalhe, 40, 14);

  const g = useMemo(() => {
    const moldura = extrudar(formaMolduraArco(LARGURA, ALTURA, MOLDURA, arco), 0.05, 0.024, detalhe, 40);
    const contorno = extrudar(
      formaMolduraArco(LARGURA + 0.03, ALTURA + 0.015, 0.02, arco, -0.0),
      0.03,
      0.006,
      detalhe,
      40,
    );
    const vidro = new THREE.ShapeGeometry(
      new THREE.Shape(caminhoArco(LARGURA - MOLDURA * 2 + 0.01, ALTURA - MOLDURA * 2 + 0.01, arco)),
      arco,
    );
    return { moldura, contorno, vidro };
  }, [detalhe, arco]);

  useEffect(() => () => liberar(g), [g]);

  return (
    <group>
      <RoundedBox
        args={[0.82, 0.05, 0.3]}
        radius={0.016}
        smoothness={segmentos(detalhe, 4, 2)}
        position={[0, 0.025, 0]}
        material={m.acabamento}
        castShadow
        receiveShadow
      />
      <group position={[0, 0.05, -0.02]} rotation={[-0.05, 0, 0]}>
        <mesh geometry={g.contorno} position={[0, -0.005, -0.012]} material={m.acabamento} castShadow />
        <mesh geometry={g.moldura} material={m.estofado} castShadow receiveShadow />
        <mesh geometry={g.vidro} position={[0, MOLDURA - 0.005, -0.005]} material={m.espelho} />
      </group>
    </group>
  );
}
