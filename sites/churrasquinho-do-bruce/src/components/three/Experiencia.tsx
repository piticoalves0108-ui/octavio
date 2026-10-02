"use client";

/**
 * Raiz do WebGL. Carregada com next/dynamic (ssr: false) só quando o hero
 * está visível, o motor de animação já rodou e o aparelho aguenta (ver Palco).
 *
 * - dpr limitado a [1, 1.75]; PerformanceMonitor baixa a qualidade sozinho
 *   e, se não adiantar, troca o Canvas pelo vídeo (onFallback).
 * - frameloop "demand": só renderiza quando o Motorista pede (seção com 3D na
 *   tela). Fora da tela, zero frames.
 * - Mobile: menos partículas e sem pós-processamento.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { aoPedirFrame, cena } from "@/lib/cena";
import type { PecaEspeto } from "@/content/cardapio";
import { Churrasqueira } from "./Churrasqueira";
import { Efeitos } from "./Efeitos";
import { Espeto, criarPedaco } from "./Espeto";
import { CamadasHamburguer, Hamburguer3D, useCamadasHamburguer } from "./Hamburguer3D";
import { dirigir, objetos } from "./diretor";
import { relogio } from "./tempo";

export type Captura =
  | { tipo: "hero"; tempo: number }
  | { tipo: "peca"; peca: PecaEspeto }
  | { tipo: "hamburguer" };

export type PropsExperiencia = {
  mobile: boolean;
  onPronto?: () => void;
  onFallback?: () => void;
  captura?: Captura;
};

const DPR_POR_NIVEL = [1, 1.3, 1.75];

export default function Experiencia({ mobile, onPronto, onFallback, captura }: PropsExperiencia) {
  const [nivel, setNivel] = useState(mobile ? 0 : 2);
  const vitrine = captura && captura.tipo !== "hero";
  const pos = !mobile && nivel >= 1 && !vitrine;

  return (
    <Canvas
      aria-hidden
      dpr={captura ? 1 : [1, mobile ? 1.5 : DPR_POR_NIVEL[nivel]]}
      frameloop={captura ? "never" : "demand"}
      flat={false}
      gl={{
        antialias: mobile || Boolean(vitrine),
        alpha: Boolean(vitrine),
        powerPreference: "high-performance",
        stencil: false,
        preserveDrawingBuffer: Boolean(captura),
      }}
      camera={{ fov: 32, near: 0.1, far: 60, position: [0, 3, 9] }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        if (!vitrine) scene.background = new THREE.Color("#121212");
      }}
    >
      <PerformanceMonitor
        flipflops={3}
        onIncline={() => setNivel((n) => Math.min(mobile ? 0 : 2, n + 1))}
        onDecline={() => setNivel((n) => Math.max(0, n - 1))}
        onFallback={() => onFallback?.()}
      >
        <Estudio />
        {vitrine ? (
          <Vitrine captura={captura} />
        ) : (
          <>
            <fog attach="fog" args={["#121212", 10, 24]} />
            <Churrasqueira qtdCarvao={mobile ? 70 : 150} qtdFaiscas={mobile ? 70 : 220} qtdFumaca={mobile ? 4 : 7} />
            <Espeto />
            <Hamburguer3D sombra={!mobile && nivel >= 1} />
            <Diretor captura={Boolean(captura)} />
          </>
        )}
        {pos && <Efeitos nivel={nivel} />}
        <Motorista onPronto={onPronto} captura={Boolean(captura)} />
      </PerformanceMonitor>
    </Canvas>
  );
}

/** Iluminação de estúdio leve: Environment com Lightformers (renderizado uma vez), sem HDR externo. */
function Estudio() {
  return (
    <>
      <hemisphereLight args={["#3a2a22", "#000000", 0.35]} />
      <directionalLight ref={(l) => void (objetos.luzChave = l)} color="#ffc48a" intensity={1.7} />
      <directionalLight ref={(l) => void (objetos.luzRecorte = l)} color="#c9d4ff" intensity={0.45} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ff6a2a" position={[0, -3, 0]} rotation-x={-Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#f2ede4" position={[0, 4, -3]} rotation-x={Math.PI / 2.5} scale={[6, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffb347" position={[-4, 1, 2]} scale={2} />
      </Environment>
    </>
  );
}

function Diretor({ captura }: { captura: boolean }) {
  useFrame((state, delta) => dirigir(state, delta, { captura }));
  return null;
}

/**
 * Motorista do render (frameloop "demand"): pede um frame a cada rAF só se
 * alguma seção com 3D estiver na tela e a aba estiver visível. Avisa quando os
 * primeiros frames saíram (o pôster some com fade).
 */
function Motorista({ onPronto, captura }: { onPronto?: () => void; captura: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const advance = useThree((s) => s.advance);
  const quadros = useRef(0);

  useEffect(() => {
    if (captura) {
      (window as unknown as { __captura: unknown }).__captura = {
        quadro(tempo: number, intro = 1) {
          relogio.fixo = tempo;
          cena.intro = intro;
          advance(performance.now());
          advance(performance.now() + 16);
        },
      };
      return;
    }
    let raf = 0;
    const loop = () => {
      const ativa = Object.values(cena.secoes).some(Boolean) || cena.abanar > 0;
      if (ativa && !document.hidden) invalidate();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const parar = aoPedirFrame(() => invalidate());
    return () => {
      cancelAnimationFrame(raf);
      parar();
    };
  }, [invalidate, advance, captura]);

  useFrame(() => {
    quadros.current += 1;
    if (quadros.current === 3) onPronto?.();
  });
  return null;
}

/** Modo captura: um pedaço ou o hambúrguer sozinho, fundo transparente (miniaturas sem WebGL). */
function Vitrine({ captura }: { captura: Captura }) {
  const camera = useThree((s) => s.camera);
  const camadas = useCamadasHamburguer();
  const grupo = useRef<THREE.Group>(null);
  const peca = captura.tipo === "peca" ? criarPedaco(captura.peca) : null;

  useEffect(() => {
    if (captura.tipo === "hamburguer") {
      camera.position.set(0, 2.4, 5.4);
      camera.lookAt(0, 0.62, 0);
    } else {
      camera.position.set(0, 0.9, 2.6);
      camera.lookAt(0, 0, 0);
    }
    objetos.luzChave?.position.set(-3, -2, 4);
    objetos.luzRecorte?.position.set(3, 4, -3);
  }, [camera, captura]);

  useFrame(() => {
    if (grupo.current) grupo.current.rotation.y = captura.tipo === "peca" ? 0.6 : -0.35;
  });

  return (
    <group ref={grupo}>
      <pointLight position={[0, -1.4, 1.2]} color="#ff6326" intensity={3.5} distance={8} decay={1.6} />
      <directionalLight position={[1.5, 3, 4]} color="#fff1df" intensity={1.6} />
      {peca && <mesh geometry={peca.geometria} material={peca.material} rotation={[0.25, 0, 0.1]} />}
      {captura.tipo === "hamburguer" && (
        <group>
          <CamadasHamburguer camadas={camadas} />
        </group>
      )}
    </group>
  );
}

