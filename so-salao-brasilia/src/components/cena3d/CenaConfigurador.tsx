"use client";

/**
 * Cena do configurador: a peça escolhida num "estúdio" com sombras acumuladas
 * (AccumulativeShadows no desktop, ContactShadows no celular). A câmera se reenquadra
 * a cada troca de modelo, e a peça nova entra com uma descida curta.
 * Fica em frameloop "demand": só renderiza quando algo muda.
 */
import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AccumulativeShadows, ContactShadows, RandomizedLight } from "@react-three/drei";
import * as THREE from "three";
import { corPorId, type AcabamentoId, type ModeloId, type TecidoId } from "@/content/catalogo";
import { useQualidade } from "@/lib/qualidade";
import { Acordar, Giratorio, PalcoCanvas } from "./base";
import { Estudio } from "./Estudio";
import { ProvedorDeMateriais } from "./materiais";
import { enquadramentos, Modelo } from "./modelos";
import type { ControleGiro } from "./giro";

export const FUNDO_CONFIGURADOR = "#ece5df";
const ELEVACAO = 0.17;

type Props = {
  visivel: boolean;
  controle: React.RefObject<ControleGiro>;
  modelo: ModeloId;
  tecido: TecidoId;
  cor: string;
  acabamento: AcabamentoId;
  aoPrimeiroQuadro?: () => void;
  captura?: boolean;
  fundo?: string;
};

export default function CenaConfigurador({
  visivel,
  controle,
  modelo,
  tecido,
  cor,
  acabamento,
  aoPrimeiroQuadro,
  captura = false,
  fundo = FUNDO_CONFIGURADOR,
}: Props) {
  const nivel = useQualidade((s) => s.nivel);
  const desktop = nivel === "alto" || captura;
  const e = enquadramentos[modelo];

  return (
    <PalcoCanvas
      visivel={visivel}
      efeitos={false}
      sombras={desktop}
      camera={{ position: [0, e.alvo[1] + 1, e.distancia], fov: 30 }}
      fundo={fundo}
      aoPrimeiroQuadro={aoPrimeiroQuadro}
      captura={captura}
    >
      <CameraEnquadrada modelo={modelo} imediato={captura} />
      <Estudio />
      <ProvedorDeMateriais tecido={tecido} cor={corPorId(cor).hex} acabamento={acabamento} imediato={captura}>
        <Giratorio controle={controle}>
          <Entrada key={modelo} imediato={captura}>
            <Modelo modelo={modelo} detalhe={nivel === "alto" || captura ? "alto" : "baixo"} />
          </Entrada>
          {desktop ? (
            <AccumulativeShadows
              key={`sombra-${modelo}`}
              temporal={!captura}
              frames={captura ? 80 : 50}
              alphaTest={0.85}
              opacity={0.9}
              scale={4.5}
              color="#3e3029"
              colorBlend={2}
              position={[0, 0.001, 0]}
            >
              <RandomizedLight
                amount={8}
                radius={2.6}
                ambient={0.35}
                position={[0.5, 5, -1.2]}
                bias={0.0008}
                mapSize={1024}
                size={4}
              />
            </AccumulativeShadows>
          ) : (
            <ContactShadows
              key={`sombra-${modelo}`}
              position={[0, 0.001, 0]}
              scale={3.6}
              resolution={256}
              blur={2.4}
              far={1.2}
              opacity={0.55}
              frames={50}
              color="#3a2c26"
            />
          )}
        </Giratorio>
        <Acordar chave={modelo} quadros={captura ? 90 : 60} />
      </ProvedorDeMateriais>
    </PalcoCanvas>
  );
}

/** Leva a câmera até o enquadramento da peça (com amortecimento). */
function CameraEnquadrada({ modelo, imediato }: { modelo: ModeloId; imediato: boolean }) {
  const camera = useThree((s) => s.camera);
  const tamanho = useThree((s) => s.size);
  const alvoAtual = useRef(new THREE.Vector3(...enquadramentos[modelo].alvo));
  const destinoPos = useRef(new THREE.Vector3());
  const destinoAlvo = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    const e = enquadramentos[modelo];
    const aspecto = tamanho.width / Math.max(1, tamanho.height);
    // Em telas em pé (celular), afasta a câmera para a peça caber na largura.
    const distancia = e.distancia * (aspecto < 1 ? 1 / Math.pow(aspecto, 0.72) : 1);
    destinoAlvo.current.set(...e.alvo);
    destinoPos.current.set(
      e.alvo[0],
      e.alvo[1] + Math.sin(ELEVACAO) * distancia,
      e.alvo[2] + Math.cos(ELEVACAO) * distancia,
    );
    const k = imediato ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 5);
    camera.position.lerp(destinoPos.current, k);
    alvoAtual.current.lerp(destinoAlvo.current, k);
    camera.lookAt(alvoAtual.current);
    if (camera.position.distanceTo(destinoPos.current) > 1e-3) state.invalidate();
  });
  return null;
}

/** Entrada da peça: desce alguns centímetros e assenta, como colocada no estúdio. */
function Entrada({ children, imediato }: { children: React.ReactNode; imediato: boolean }) {
  const grupo = useRef<THREE.Group>(null);
  const t = useRef(imediato ? 1 : 0);
  useFrame((state, dt) => {
    if (!grupo.current) return;
    if (t.current < 1) {
      t.current = Math.min(1, t.current + Math.min(dt, 0.05) / 0.55);
      state.invalidate();
    }
    const p = 1 - Math.pow(1 - t.current, 3);
    grupo.current.position.y = (1 - p) * 0.22;
    grupo.current.scale.setScalar(0.96 + 0.04 * p);
  });
  return <group ref={grupo}>{children}</group>;
}
