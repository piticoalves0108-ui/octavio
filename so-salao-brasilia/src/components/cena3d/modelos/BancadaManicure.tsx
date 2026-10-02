"use client";

/**
 * Bancada de manicure (geometria procedural).
 * Estofado: almofada de apoio das mãos. Acabamento: pés, puxadores e suportes da prateleira.
 */
import { useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { materiaisDeEsmalte, useMateriais } from "../materiais";
import { segmentos, type Detalhe } from "./formas";

export function BancadaManicure({ detalhe = "alto" }: { detalhe?: Detalhe }) {
  const m = useMateriais();
  const suave = segmentos(detalhe, 5, 2);
  const esmaltes = useMemo(() => (detalhe === "alto" ? materiaisDeEsmalte() : []), [detalhe]);

  return (
    <group>
      {/* Tampo */}
      <RoundedBox
        args={[1.02, 0.036, 0.48]}
        radius={0.014}
        smoothness={suave}
        position={[0, 0.762, 0]}
        material={m.laca}
        castShadow
        receiveShadow
      />
      <RoundedBox
        args={[1.0, 0.012, 0.46]}
        radius={0.004}
        smoothness={suave}
        position={[0, 0.738, 0]}
        material={m.acabamento}
      />

      {/* Gaveteiro com três gavetas */}
      <RoundedBox
        args={[0.38, 0.72, 0.44]}
        radius={0.018}
        smoothness={suave}
        position={[0.3, 0.37, 0]}
        material={m.laca}
        castShadow
        receiveShadow
      />
      {[0.15, 0.37, 0.59].map((y) => (
        <group key={y}>
          <RoundedBox
            args={[0.355, 0.2, 0.014]}
            radius={0.006}
            smoothness={suave}
            position={[0.3, y, 0.225]}
            material={m.laca}
            castShadow
          />
          <mesh position={[0.3, y + 0.05, 0.238]} rotation={[0, 0, Math.PI / 2]} material={m.acabamento} castShadow>
            <cylinderGeometry args={[0.006, 0.006, 0.13, 10]} />
          </mesh>
        </group>
      ))}
      {/* Rodapé do gaveteiro */}
      <RoundedBox
        args={[0.36, 0.03, 0.42]}
        radius={0.008}
        smoothness={suave}
        position={[0.3, 0.015, 0]}
        material={m.acabamento}
      />

      {/* Pés do lado da cliente */}
      {[-0.19, 0.19].map((z) => (
        <mesh key={z} position={[-0.47, 0.37, z]} material={m.acabamento} castShadow>
          <cylinderGeometry args={[0.014, 0.016, 0.74, 16]} />
        </mesh>
      ))}
      <mesh position={[-0.47, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.acabamento} castShadow>
        <cylinderGeometry args={[0.01, 0.01, 0.38, 10]} />
      </mesh>

      {/* Almofada de apoio das mãos (estofado) */}
      <RoundedBox
        args={[0.3, 0.035, 0.16]}
        radius={0.012}
        smoothness={suave}
        position={[-0.12, 0.797, 0.11]}
        material={m.estofado}
        castShadow
      />
      <mesh position={[-0.12, 0.84, 0.11]} rotation={[0, 0, Math.PI / 2]} material={m.estofado} castShadow>
        <capsuleGeometry args={[0.042, 0.2, 8, 24]} />
      </mesh>

      {/* Prateleira de esmaltes ao fundo */}
      <RoundedBox
        args={[0.74, 0.014, 0.1]}
        radius={0.004}
        smoothness={suave}
        position={[0, 0.93, -0.17]}
        material={m.laca}
        castShadow
      />
      {[-0.34, 0.34].map((x) => (
        <mesh key={x} position={[x, 0.855, -0.17]} material={m.acabamento} castShadow>
          <cylinderGeometry args={[0.007, 0.007, 0.15, 10]} />
        </mesh>
      ))}
      {esmaltes.map((mat, i) => {
        const x = -0.3 + i * 0.086;
        return (
          <group key={i} position={[x, 0.937, -0.17]}>
            <mesh position={[0, 0.025, 0]} material={mat} castShadow>
              <cylinderGeometry args={[0.017, 0.019, 0.05, 16]} />
            </mesh>
            <mesh position={[0, 0.067, 0]} material={i % 3 === 0 ? m.acabamento : m.estrutura}>
              <cylinderGeometry args={[0.008, 0.009, 0.034, 12]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
