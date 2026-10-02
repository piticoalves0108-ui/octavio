"use client";

import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { assinar, palco } from "@/lib/palco";
import { usePalco } from "@/lib/usePalco";
import { Alinhamento3D } from "./Alinhamento3D";
import { Asfalto } from "./Asfalto";
import { Diretor } from "./Diretor";
import { Efeitos } from "./Efeitos";
import { criarPercurso } from "./percurso";
import { Poeira } from "./Poeira";
import { useRecursosRoda, type Qualidade } from "./Roda";

/**
 * CENA 3D (chunk separado, carregado com next/dynamic e ssr: false).
 *
 * - frameloop "demand": só desenha quando algo muda (rolagem, mouse, animação).
 * - dpr limitado a [1, 1.75] e qualidade ajustada pelo PerformanceMonitor.
 * - Celular: sem pós-processamento, menos partículas, texturas menores.
 */

type Props = {
  layout: "desktop" | "mobile";
  pularIntro: boolean;
  /** Chamado se o aparelho não aguentar nem a qualidade baixa. */
  aoFalhar: () => void;
};

function Conteudo({ layout, pularIntro, qualidade }: Omit<Props, "aoFalhar"> & { qualidade: Qualidade }) {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const recursos = useRecursosRoda(qualidade);
  const percurso = useMemo(() => criarPercurso(), []);
  const quadros = useRef(0);

  // DOM mudou (rolagem, ponteiro, seletor) -> desenha de novo
  useEffect(() => assinar(() => invalidate()), [invalidate]);

  // Redesenha as letras do flanco quando a fonte do site terminar de carregar
  useEffect(() => {
    document.fonts?.ready.then(() => invalidate());
  }, [invalidate]);

  // Avisa que a cena está pronta depois de dois quadros desenhados
  useFrame(() => {
    if (quadros.current > 2) return;
    quadros.current++;
    if (quadros.current === 2) {
      document.documentElement.dataset.cena = "pronta";
      window.dispatchEvent(new Event("porango:cena-pronta"));
    }
    invalidate();
  });

  const camera = useThree((s) => s.camera);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.05;
    // Com alpha:false o three limpa com alpha 1; a sombra de contato precisa de 0
    // nos render targets para ficar transparente fora da sombra. O fundo da cena
    // continua opaco (scene.background).
    gl.setClearColor("#0f1012", 0);
    camera.layers.enable(1); // poeira
  }, [gl, camera]);

  const efeitos = layout === "desktop" && qualidade !== "baixa";

  return (
    <>
      <color attach="background" args={["#0f1012"]} />
      <ambientLight intensity={0.12} />
      <Environment resolution={qualidade === "alta" ? 256 : 128} frames={1} environmentIntensity={0.7}>
        {/* estúdio feito de softboxes: reflexo limpo no metal escovado */}
        <Lightformer form="rect" intensity={2.2} position={[0, 6, -1]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={3.2} position={[-6, 2, 2]} rotation-y={Math.PI / 2} scale={[1.6, 7, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[6, 2.5, -2]} rotation-y={-Math.PI / 2} scale={[1.2, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 2.5, 7]} scale={[10, 3, 1]} />
      </Environment>
      <Diretor recursos={recursos} percurso={percurso} layout={layout} pularIntro={pularIntro} />
      <Alinhamento3D recursos={recursos} layout={layout} />
      <Asfalto percurso={percurso} qualidade={qualidade === "baixa" ? "baixa" : "alta"} pegada={recursos.banda.pegada} />
      <Poeira quantidade={layout === "mobile" || qualidade === "baixa" ? 50 : 180} />
      {efeitos && <Efeitos dof={qualidade === "alta"} />}
    </>
  );
}

export default function Cena({ layout, pularIntro, aoFalhar }: Props) {
  const [qualidade, setQualidade] = useState<Qualidade>(layout === "mobile" ? "media" : "alta");
  const [dpr, setDpr] = useState(layout === "mobile" ? 1.5 : 1.75);
  // Com frameloop "demand" a cena para quando nada muda, e o PerformanceMonitor
  // leria essas pausas como FPS baixo. Por isso ele só mede onde a animação é
  // contínua: no hero (balanço do pneu) e no alinhamento (rodas girando).
  const medindo = usePalco(() => palco.heroP < 0.6 || (palco.alinhamentoVisivel && !palco.principalVisivel));

  // Se o arraste/visibilidade mudar enquanto a aba está oculta, nada roda (rAF pausa sozinho).
  useEffect(() => {
    palco.layout = layout;
  }, [layout]);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, dpr]}
      gl={{
        antialias: layout === "mobile",
        alpha: false,
        stencil: false,
        powerPreference: "high-performance",
      }}
      camera={{ fov: 30, near: 0.05, far: 60, position: [0, 1.5, 8] }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
      tabIndex={-1}
    >
      {medindo && (
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => {
          if (palco.captura) return;
          setDpr((d) => Math.max(1, d - 0.25));
          setQualidade((q) => (q === "alta" ? "media" : "baixa"));
        }}
        onIncline={() => !palco.captura && setDpr((d) => Math.min(layout === "mobile" ? 1.5 : 1.75, d + 0.25))}
        onFallback={() => {
          if (palco.captura) return;
          // Nem a qualidade baixa segurou: troca o Canvas pelo vídeo gravado da cena.
          if (qualidade === "baixa") aoFalhar();
          setQualidade("baixa");
          setDpr(1);
        }}
      />
      )}
      <Conteudo layout={layout} pularIntro={pularIntro} qualidade={qualidade} />
    </Canvas>
  );
}
