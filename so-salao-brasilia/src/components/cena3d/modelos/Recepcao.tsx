"use client";

/**
 * Balcão de recepção curvo (geometria procedural) com frente em gomos estofados.
 * Estofado: gomos da frente. Acabamento: friso superior e rodapé.
 */
import { useEffect, useMemo } from "react";
import { RoundedBox } from "@react-three/drei";
import { useMateriais } from "../materiais";
import { liberar, segmentos, setorCurvo, type Detalhe } from "./formas";

const RAIO = 1.5;
const ABERTURA = 0.42; // metade do ângulo do arco, em radianos

export function Recepcao({ detalhe = "alto" }: { detalhe?: Detalhe }) {
  const m = useMateriais();
  const suave = segmentos(detalhe, 4, 2);
  const gomos = detalhe === "alto" ? 11 : 7;

  const g = useMemo(() => {
    const rodape = setorCurvo(RAIO, RAIO - 0.1, RAIO - 0.03, ABERTURA + 0.02, 0.05, detalhe);
    const friso = setorCurvo(RAIO, RAIO - 0.1, RAIO + 0.012, ABERTURA + 0.03, 0.03, detalhe);
    const tampo = setorCurvo(RAIO, RAIO - 0.42, RAIO + 0.05, ABERTURA + 0.05, 0.04, detalhe);
    const fundo = setorCurvo(RAIO, RAIO - 0.11, RAIO - 0.06, ABERTURA, 0.92, detalhe);
    const mesa = setorCurvo(RAIO, RAIO - 0.7, RAIO - 0.1, ABERTURA - 0.04, 0.03, detalhe);
    return { rodape, friso, tampo, fundo, mesa };
  }, [detalhe]);

  useEffect(() => () => liberar(g), [g]);

  const largura = ((2 * ABERTURA * RAIO) / gomos) * 0.96;

  return (
    <group position={[0, 0, 0.2]}>
      <mesh geometry={g.rodape} material={m.acabamento} receiveShadow castShadow />
      <mesh geometry={g.fundo} position={[0, 0.05, 0]} material={m.laca} castShadow receiveShadow />

      {/* Gomos estofados na frente */}
      {Array.from({ length: gomos }, (_, i) => {
        const a = -ABERTURA + ((i + 0.5) * 2 * ABERTURA) / gomos;
        const r = RAIO - 0.035;
        return (
          <RoundedBox
            key={i}
            args={[largura, 0.9, 0.07]}
            radius={0.032}
            smoothness={suave}
            position={[r * Math.sin(a), 0.505, r * Math.cos(a) - RAIO]}
            rotation={[0, a, 0]}
            material={m.estofado}
            castShadow
            receiveShadow
          />
        );
      })}

      <mesh geometry={g.friso} position={[0, 0.955, 0]} material={m.acabamento} castShadow />
      <mesh geometry={g.tampo} position={[0, 0.985, 0]} material={m.laca} castShadow receiveShadow />
      <mesh geometry={g.mesa} position={[0, 0.74, 0]} material={m.laca} receiveShadow />
    </group>
  );
}
