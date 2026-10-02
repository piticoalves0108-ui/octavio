"use client";

/**
 * Peças comuns a todas as cenas:
 * - <PalcoCanvas>: Canvas com dpr limitado a [1, 1.75], tone mapping neutro (cores fiéis
 *   ao tecido), PerformanceMonitor e controle de quadros.
 * - Controle de quadros: "never" fora da tela, "always" só quando há animação contínua
 *   e "demand" quando a cena está parada (renderiza só quando algo muda).
 * - <Giratorio>: aplica o giro do ref (arraste/teclado/giroscópio) com amortecimento.
 */
import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { dprPara, useQualidade } from "@/lib/qualidade";
import type { ControleGiro } from "./giro";

const Efeitos = lazy(() => import("./Efeitos"));

type PropsPalco = {
  children: ReactNode;
  visivel: boolean;
  /** Mantém o loop contínuo enquanto visível (ex.: peça girando sozinha). */
  continuo?: boolean;
  /** Mede FPS e rebaixa a qualidade (só faz sentido com loop contínuo). */
  monitorar?: boolean;
  /** Liga Bloom, DoF e Noise (só no nível "alto"). */
  efeitos?: { foco?: [number, number, number] } | false;
  camera?: { position: [number, number, number]; fov?: number; zoom?: number };
  ortografica?: boolean;
  fundo?: string;
  sombras?: boolean;
  aoPrimeiroQuadro?: () => void;
  className?: string;
  /** Para capturas: preserva o buffer e desliga o PerformanceMonitor. */
  captura?: boolean;
};

export function PalcoCanvas({
  children,
  visivel,
  continuo = false,
  monitorar = false,
  efeitos = false,
  camera = { position: [0, 1.2, 4.5], fov: 30 },
  ortografica = false,
  fundo,
  sombras = false,
  aoPrimeiroQuadro,
  className,
  captura = false,
}: PropsPalco) {
  const nivel = useQualidade((s) => s.nivel);
  const fator = useQualidade((s) => s.fator);
  const definirFator = useQualidade((s) => s.definirFator);
  const rebaixar = useQualidade((s) => s.rebaixar);
  const usarEfeitos = !!efeitos && nivel === "alto";

  return (
    <LimiteDeErro3D>
      <Canvas
        className={className}
        dpr={captura ? [1.5, 1.5] : dprPara(nivel, fator)}
        frameloop="demand"
        shadows={sombras ? "percentage" : false}
        orthographic={ortografica}
        camera={camera}
        gl={{
          antialias: !usarEfeitos,
          // alpha ligado mesmo com fundo opaco: as sombras de contato renderizam num
          // render target que precisa ser limpo com alfa 0.
          alpha: true,
          powerPreference: "high-performance",
          preserveDrawingBuffer: captura,
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1,
        }}
        // A tela não deve "roubar" a rolagem vertical no celular.
        style={{ touchAction: "pan-y" }}
        aria-hidden="true"
      >
        {fundo && <color attach="background" args={[fundo]} />}
        <ControleDeQuadros visivel={visivel} continuo={continuo} />
        {aoPrimeiroQuadro && <AvisoPrimeiroQuadro aoPrimeiroQuadro={aoPrimeiroQuadro} />}
        {monitorar && !captura ? (
          <PerformanceMonitor
            ms={400}
            iterations={8}
            onIncline={() => definirFator(1)}
            onDecline={() => definirFator(0.4)}
            onFallback={() => rebaixar()}
            flipflops={3}
          >
            {children}
          </PerformanceMonitor>
        ) : (
          children
        )}
        {usarEfeitos && (
          <Suspense fallback={null}>
            <Efeitos foco={efeitos ? efeitos.foco : undefined} />
          </Suspense>
        )}
      </Canvas>
    </LimiteDeErro3D>
  );
}

/** Se o WebGL falhar (contexto recusado, GPU bloqueada), some com o 3D e fica o pôster. */
class LimiteDeErro3D extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  componentDidCatch() {
    useQualidade.getState().definirNivel("sem-webgl");
  }
  render() {
    return this.state.erro ? null : this.props.children;
  }
}

function ControleDeQuadros({ visivel, continuo }: { visivel: boolean; continuo: boolean }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    setFrameloop(!visivel ? "never" : continuo ? "always" : "demand");
    if (visivel) invalidate();
  }, [visivel, continuo, setFrameloop, invalidate]);
  return null;
}

function AvisoPrimeiroQuadro({ aoPrimeiroQuadro }: { aoPrimeiroQuadro: () => void }) {
  const quadros = useRef(0);
  const avisado = useRef(false);
  useFrame((state) => {
    if (avisado.current) return;
    quadros.current += 1;
    // Espera alguns quadros: shaders compilados e cubemap do estúdio prontos.
    if (quadros.current >= 3) {
      avisado.current = true;
      aoPrimeiroQuadro();
    } else {
      state.invalidate();
    }
  });
  return null;
}

/** Mantém a cena renderizando por N quadros (ex.: enquanto as sombras acumulam). */
export function Acordar({ chave, quadros = 90 }: { chave: string; quadros?: number }) {
  const restante = useRef(quadros);
  useEffect(() => {
    restante.current = quadros;
  }, [chave, quadros]);
  useFrame((state) => {
    if (restante.current > 0) {
      restante.current -= 1;
      state.invalidate();
    }
  });
  return null;
}

type PropsGiratorio = {
  controle: React.RefObject<ControleGiro>;
  autoGiro?: boolean;
  velocidade?: number;
  children: ReactNode;
};

export function Giratorio({ controle, autoGiro = false, velocidade = 0.35, children }: PropsGiratorio) {
  const grupo = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const c = controle.current;
    c.invalidar = invalidate;
    return () => {
      c.invalidar = undefined;
    };
  }, [controle, invalidate]);

  useFrame((state, dt) => {
    const c = controle.current;
    const passo = Math.min(dt, 0.05);
    const ocioso = performance.now() - c.ultimoToque > 2600;
    if (autoGiro && !c.arrastando && ocioso) c.alvo += passo * velocidade;
    const destino = c.alvo + c.giroscopio;
    c.atual += (destino - c.atual) * (1 - Math.exp(-passo * 7));
    if (grupo.current) grupo.current.rotation.y = c.atual;
    if (Math.abs(destino - c.atual) > 1e-4) state.invalidate();
  });

  return <group ref={grupo}>{children}</group>;
}

/** Aponta a câmera para um ponto fixo (enquadramento de foto). */
export function MirarCamera({ alvo }: { alvo: [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const [x, y, z] = alvo;
  useLayoutEffect(() => {
    camera.lookAt(x, y, z);
    camera.updateMatrixWorld();
    invalidate();
  }, [camera, x, y, z, invalidate]);
  return null;
}
