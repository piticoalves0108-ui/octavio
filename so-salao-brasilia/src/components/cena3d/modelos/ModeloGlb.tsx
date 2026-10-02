"use client";

/**
 * Carregador opcional de modelos .glb reais (quando a fábrica tiver fotogrametria ou
 * modelagem das peças). Espera arquivos comprimidos com Meshopt (ou Draco) e texturas KTX2:
 *
 *   npx @gltf-transform/cli optimize entrada.glb public/models/cadeira.glb \
 *     --compress meshopt --texture-compress ktx2
 *
 * Convenção de nomes no arquivo: materiais chamados "estofado" e "acabamento" recebem a cor
 * e o acabamento escolhidos no configurador. Os demais materiais ficam como vieram.
 */
import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { KTX2Loader } from "three-stdlib";
import type { GLTFLoader } from "three-stdlib";
import { useMateriais } from "../materiais";

const TRANSCODER_BASIS = "https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/libs/basis/";
let ktx2: KTX2Loader | null = null;

export function ModeloGlb({ src }: { src: string }) {
  const gl = useThree((s) => s.gl);
  const materiais = useMateriais();

  const estender = useMemo(
    () => (loader: GLTFLoader) => {
      if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath(TRANSCODER_BASIS).detectSupport(gl);
      loader.setKTX2Loader(ktx2);
    },
    [gl],
  );

  // Draco desligado (use Meshopt); Meshopt ligado.
  const { scene } = useGLTF(src, false, true, estender);
  const copia = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    copia.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const nome = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.name?.toLowerCase() ?? "";
      if (nome.includes("estofado")) mesh.material = materiais.estofado;
      else if (nome.includes("acabamento")) mesh.material = materiais.acabamento;
    });
  }, [copia, materiais]);

  return <primitive object={copia} />;
}
