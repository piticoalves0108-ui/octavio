"use client";

/**
 * Lavatório (geometria procedural): poltrona reclinada + coluna com cuba de louça.
 * Estofado: assento, encosto e laterais. Acabamento: rodapé, misturador e frisos.
 */
import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { useMateriais } from "../materiais";
import { liberar, segmentos, torno, tubo, type Detalhe } from "./formas";

export function Lavatorio({ detalhe = "alto" }: { detalhe?: Detalhe }) {
  const m = useMateriais();
  const suave = segmentos(detalhe, 5, 2);

  const g = useMemo(() => {
    const cuba = torno(
      [
        [0.0, -0.13],
        [0.09, -0.128],
        [0.17, -0.105],
        [0.215, -0.06],
        [0.235, -0.005],
        [0.24, 0.02],
        [0.262, 0.028],
        [0.268, 0.02],
        [0.258, -0.01],
      ],
      detalhe,
      56,
    );
    const misturador = tubo(
      [
        [0, 0.8, -0.99],
        [0, 0.96, -0.99],
        [0, 1.01, -0.93],
        [0, 0.985, -0.86],
      ],
      0.014,
      detalhe,
    );
    return { cuba, misturador };
  }, [detalhe]);

  useEffect(() => () => liberar(g), [g]);

  return (
    <group position={[0, 0, 0.12]}>
      {/* Rodapé metálico */}
      <RoundedBox
        args={[0.5, 0.04, 1.36]}
        radius={0.012}
        smoothness={suave}
        position={[0, 0.02, -0.32]}
        material={m.acabamento}
        castShadow
        receiveShadow
      />

      {/* Corpo da poltrona em laca */}
      <RoundedBox
        args={[0.58, 0.34, 0.62]}
        radius={0.04}
        smoothness={suave}
        position={[0, 0.21, 0.06]}
        material={m.laca}
        castShadow
        receiveShadow
      />

      <RoundedBox
        args={[0.46, 0.3, 0.46]}
        radius={0.03}
        smoothness={suave}
        position={[0, 0.19, -0.44]}
        material={m.laca}
        castShadow
      />

      {/* Assento e laterais estofados */}
      <RoundedBox
        args={[0.5, 0.11, 0.5]}
        radius={0.045}
        smoothness={suave}
        position={[0, 0.43, 0.1]}
        material={m.estofado}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[0.07, 0.24, 0.6]}
        radius={0.03}
        smoothness={suave}
        position={[0.29, 0.47, 0.05]}
        material={m.estofado}
        castShadow
      />
      <RoundedBox
        args={[0.07, 0.24, 0.6]}
        radius={0.03}
        smoothness={suave}
        position={[-0.29, 0.47, 0.05]}
        material={m.estofado}
        castShadow
      />

      {/* Encosto reclinado em direção à cuba */}
      <RoundedBox
        args={[0.5, 0.6, 0.11]}
        radius={0.05}
        smoothness={suave}
        position={[0, 0.66, -0.3]}
        rotation={[-0.62, 0, 0]}
        material={m.estofado}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[0.52, 0.54, 0.08]}
        radius={0.03}
        smoothness={suave}
        position={[0, 0.6, -0.36]}
        rotation={[-0.62, 0, 0]}
        material={m.laca}
        castShadow
      />

      {/* Coluna e cuba */}
      <RoundedBox
        args={[0.46, 0.7, 0.36]}
        radius={0.04}
        smoothness={suave}
        position={[0, 0.39, -0.84]}
        material={m.laca}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[0.47, 0.025, 0.37]}
        radius={0.01}
        smoothness={suave}
        position={[0, 0.74, -0.84]}
        material={m.acabamento}
        castShadow
      />
      <group position={[0, 0.9, -0.8]} rotation={[0.28, 0, 0]} scale={[1.12, 1, 1]}>
        <mesh geometry={g.cuba} material={m.louca} castShadow receiveShadow />
      </group>
      <mesh geometry={g.misturador} material={m.acabamento} castShadow />
      <mesh position={[0.07, 0.93, -0.99]} rotation={[0, 0, Math.PI / 2]} material={m.acabamento}>
        <cylinderGeometry args={[0.012, 0.012, 0.1, 12]} />
      </mesh>
    </group>
  );
}
