"use client";

/**
 * Cadeira de cabeleireiro (geometria procedural).
 * Estofado: assento, encosto e braços. Acabamento: base, coluna, braços e apoio de pés.
 */
import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { useMateriais } from "../materiais";
import { extrudar, formaEncosto, liberar, torno, tubo, segmentos, type Detalhe } from "./formas";

export function Cadeira({ detalhe = "alto" }: { detalhe?: Detalhe }) {
  const m = useMateriais();

  const g = useMemo(() => {
    const encosto = extrudar(formaEncosto(0.46, 0.54, 0.58, 0.16), 0.075, 0.032, detalhe, 32);
    const base = torno(
      [
        [0, 0],
        [0.285, 0],
        [0.3, 0.007],
        [0.302, 0.02],
        [0.27, 0.034],
        [0.17, 0.05],
        [0.09, 0.06],
        [0.07, 0.066],
        [0, 0.068],
      ],
      detalhe,
      64,
    );
    const corpoBomba = torno(
      [
        [0, 0.06],
        [0.078, 0.06],
        [0.082, 0.07],
        [0.076, 0.2],
        [0.06, 0.215],
        [0.046, 0.222],
        [0, 0.222],
      ],
      detalhe,
      40,
    );
    const pistao = torno(
      [
        [0, 0.21],
        [0.034, 0.21],
        [0.034, 0.36],
        [0.06, 0.37],
        [0.14, 0.372],
        [0.15, 0.382],
        [0, 0.382],
      ],
      detalhe,
      40,
    );
    const lado = (s: 1 | -1) => [
      tubo(
        [
          [0.235 * s, 0.4, 0.17],
          [0.29 * s, 0.44, 0.2],
          [0.312 * s, 0.53, 0.17],
          [0.315 * s, 0.6, 0.12],
        ],
        0.012,
        detalhe,
      ),
      tubo(
        [
          [0.235 * s, 0.4, -0.13],
          [0.29 * s, 0.45, -0.15],
          [0.312 * s, 0.54, -0.13],
          [0.315 * s, 0.6, -0.09],
        ],
        0.012,
        detalhe,
      ),
    ];
    const bracos = [...lado(1), ...lado(-1)];
    const suporteEncosto = tubo(
      [
        [0, 0.39, -0.1],
        [0, 0.4, -0.22],
        [0, 0.47, -0.27],
        [0, 0.62, -0.285],
      ],
      0.02,
      detalhe,
    );
    const apoioPes = [
      tubo(
        [
          [0.12, 0.38, 0.2],
          [0.13, 0.3, 0.3],
          [0.14, 0.2, 0.37],
          [0.14, 0.17, 0.4],
        ],
        0.011,
        detalhe,
      ),
      tubo(
        [
          [-0.12, 0.38, 0.2],
          [-0.13, 0.3, 0.3],
          [-0.14, 0.2, 0.37],
          [-0.14, 0.17, 0.4],
        ],
        0.011,
        detalhe,
      ),
    ];
    return { encosto, base, corpoBomba, pistao, bracos, suporteEncosto, apoioPes };
  }, [detalhe]);

  useEffect(() => () => liberar(g), [g]);

  const suave = segmentos(detalhe, 5, 2);

  // Capitonê: botões em losango na frente do encosto.
  const botoes = useMemo(() => {
    if (detalhe === "baixo") return [];
    const pts: [number, number][] = [];
    const linhas = [0.16, 0.29, 0.42];
    linhas.forEach((y, i) => {
      const cols = i % 2 === 0 ? [-0.14, 0, 0.14] : [-0.07, 0.07];
      cols.forEach((x) => pts.push([x, y]));
    });
    return pts;
  }, [detalhe]);

  return (
    <group>
      {/* Base, bomba hidráulica e pedal */}
      <mesh geometry={g.base} material={m.acabamento} castShadow receiveShadow />
      <mesh geometry={g.corpoBomba} material={m.acabamento} castShadow />
      <mesh geometry={g.pistao} material={m.acabamento} castShadow />
      <RoundedBox
        args={[0.13, 0.018, 0.05]}
        radius={0.008}
        smoothness={suave}
        position={[0.14, 0.11, 0.06]}
        rotation={[0, -0.5, -0.12]}
        material={m.acabamento}
        castShadow
      />

      {/* Assento */}
      <RoundedBox
        args={[0.48, 0.045, 0.44]}
        radius={0.015}
        smoothness={suave}
        position={[0, 0.395, 0.02]}
        material={m.estrutura}
        castShadow
      />
      <RoundedBox
        args={[0.54, 0.13, 0.5]}
        radius={0.055}
        smoothness={suave}
        position={[0, 0.475, 0.02]}
        material={m.estofado}
        castShadow
        receiveShadow
      />

      {/* Encosto inclinado com capitonê */}
      <group position={[0, 0.5, -0.215]} rotation={[-0.13, 0, 0]}>
        <mesh geometry={g.encosto} material={m.estofado} castShadow receiveShadow />
        {botoes.map(([x, y]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.069]} material={m.acabamento}>
            <sphereGeometry args={[0.011, 12, 8]} />
          </mesh>
        ))}
      </group>
      <mesh geometry={g.suporteEncosto} material={m.acabamento} castShadow />

      {/* Braços */}
      {g.bracos.map((geo, i) => (
        <mesh key={i} geometry={geo} material={m.acabamento} castShadow />
      ))}
      <RoundedBox
        args={[0.075, 0.05, 0.4]}
        radius={0.022}
        smoothness={suave}
        position={[0.316, 0.625, 0.02]}
        material={m.estofado}
        castShadow
      />
      <RoundedBox
        args={[0.075, 0.05, 0.4]}
        radius={0.022}
        smoothness={suave}
        position={[-0.316, 0.625, 0.02]}
        material={m.estofado}
        castShadow
      />

      {/* Apoio de pés */}
      {g.apoioPes.map((geo, i) => (
        <mesh key={i} geometry={geo} material={m.acabamento} castShadow />
      ))}
      <RoundedBox
        args={[0.36, 0.016, 0.085]}
        radius={0.007}
        smoothness={suave}
        position={[0, 0.175, 0.405]}
        material={m.acabamento}
        castShadow
      />
    </group>
  );
}
