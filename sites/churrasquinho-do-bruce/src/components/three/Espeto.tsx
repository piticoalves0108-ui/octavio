"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { PECAS } from "@/lib/cena";
import type { PecaEspeto } from "@/content/cardapio";
import { materialComida } from "./materiais";
import { pedacoIrregular, pedacoLinguica } from "./geometrias";
import { objetos } from "./diretor";

/** Os quatro pedaços do espeto + a vareta. O diretor posiciona tudo a cada frame. */
export function criarPedaco(peca: PecaEspeto) {
  switch (peca) {
    case "carne":
      return {
        geometria: pedacoIrregular(0.48, 0.42, 0.44, 0.08, 0.035, 1.3),
        material: materialComida({ cor1: "#4a2416", cor2: "#6e3d24", queimado: "#1a0c07", listras: 0.9, escala: 6, aspereza: 0.5 }),
      };
    case "frango":
      return {
        geometria: pedacoIrregular(0.46, 0.4, 0.42, 0.14, 0.05, 4.7),
        material: materialComida({ cor1: "#b8743a", cor2: "#d9a05a", queimado: "#4a230e", listras: 0.85, escala: 5, aspereza: 0.48 }),
      };
    case "linguica":
      return {
        geometria: pedacoLinguica(),
        material: materialComida({ cor1: "#6e2416", cor2: "#933a22", queimado: "#260b05", listras: 0.7, frequencia: 30, escala: 7, aspereza: 0.32 }),
      };
    case "queijo":
      return {
        geometria: pedacoIrregular(0.52, 0.3, 0.3, 0.05, 0.012, 8.1, 8),
        material: materialComida({ cor1: "#efd9a4", cor2: "#f6e6bb", queimado: "#b8732a", listras: 1, frequencia: 22, escala: 4, aspereza: 0.62 }),
      };
  }
}

export function Espeto() {
  const pedacos = useMemo(() => PECAS.map((p) => criarPedaco(p)), []);
  const madeira = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c79b62", roughness: 0.7 }), []);

  return (
    <group>
      {pedacos.map((p, i) => (
        <mesh key={PECAS[i]} geometry={p.geometria} material={p.material} ref={(m) => void (objetos.espeto[i] = m)} />
      ))}
      <group ref={(g) => void (objetos.vareta = g)}>
        <mesh material={madeira} position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.021, 0.021, 2.95, 10]} />
        </mesh>
        <mesh material={madeira} position={[-1.52, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.021, 0.16, 10]} />
        </mesh>
      </group>
    </group>
  );
}
