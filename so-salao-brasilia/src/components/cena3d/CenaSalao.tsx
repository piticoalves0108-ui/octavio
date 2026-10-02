"use client";

/**
 * "Monte seu salão": maquete isométrica de um salão vazio que, conforme a rolagem,
 * recebe as peças uma a uma (cadeiras e espelhos, lavatórios, bancada de manicure e
 * recepção). Cada peça desce suavemente e a sombra no chão cresce até ela assentar.
 *
 * A animação é guiada pelo progresso da rolagem (ScrollTrigger com scrub), então é
 * reversível e determinística. Por isso não usamos física (Rapier) aqui.
 */
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { corPorId, type AcabamentoId, type ModeloId, type TecidoId } from "@/content/catalogo";
import { PalcoCanvas } from "./base";
import { Estudio } from "./Estudio";
import { ProvedorDeMateriais } from "./materiais";
import { Modelo } from "./modelos";

export type ControleProgresso = { valor: number; invalidar?: () => void };

export const FUNDO_SALAO = "#e9e1d9";
export const PASSOS_SALAO = 4;

type Peca = {
  modelo: ModeloId;
  posicao: [number, number, number];
  rotacao: number;
  passo: number;
  atraso: number;
  /** Tamanho da sombra no chão (largura, profundidade). */
  sombra: [number, number];
};

const PECAS: Peca[] = [
  { modelo: "espelho", posicao: [-3.38, 0, -1.25], rotacao: Math.PI / 2, passo: 0, atraso: 0, sombra: [0.5, 1.0] },
  { modelo: "cadeira", posicao: [-2.4, 0, -1.25], rotacao: -Math.PI / 2, passo: 0, atraso: 0.12, sombra: [0.9, 0.9] },
  { modelo: "espelho", posicao: [-3.38, 0, 0.55], rotacao: Math.PI / 2, passo: 0, atraso: 0.24, sombra: [0.5, 1.0] },
  { modelo: "cadeira", posicao: [-2.4, 0, 0.55], rotacao: -Math.PI / 2, passo: 0, atraso: 0.36, sombra: [0.9, 0.9] },
  { modelo: "lavatorio", posicao: [0.1, 0, -1.85], rotacao: 0, passo: 1, atraso: 0, sombra: [0.8, 1.5] },
  { modelo: "lavatorio", posicao: [1.15, 0, -1.85], rotacao: 0, passo: 1, atraso: 0.18, sombra: [0.8, 1.5] },
  { modelo: "manicure", posicao: [2.6, 0, -0.1], rotacao: Math.PI / 2, passo: 2, atraso: 0, sombra: [0.8, 1.3] },
  { modelo: "recepcao", posicao: [1.45, 0, 1.7], rotacao: Math.PI / 4, passo: 3, atraso: 0, sombra: [1.6, 0.9] },
];

type Props = {
  visivel: boolean;
  progresso: React.RefObject<ControleProgresso>;
  tecido: TecidoId;
  cor: string;
  acabamento: AcabamentoId;
  aoPrimeiroQuadro?: () => void;
  captura?: boolean;
};

export default function CenaSalao({
  visivel,
  progresso,
  tecido,
  cor,
  acabamento,
  aoPrimeiroQuadro,
  captura = false,
}: Props) {
  return (
    <PalcoCanvas
      visivel={visivel}
      ortografica
      camera={{ position: [10, 8.6, 10], zoom: 60 }}
      fundo={FUNDO_SALAO}
      aoPrimeiroQuadro={aoPrimeiroQuadro}
      captura={captura}
    >
      <CameraIsometrica />
      <Estudio intensidade={0.95} />
      <Sala />
      <ProvedorDeMateriais tecido={tecido} cor={corPorId(cor).hex} acabamento={acabamento} imediato={captura}>
        {PECAS.map((p, i) => (
          <PecaCaindo key={i} peca={p} progresso={progresso} />
        ))}
      </ProvedorDeMateriais>
      <LigarProgresso progresso={progresso} />
    </PalcoCanvas>
  );
}

function LigarProgresso({ progresso }: { progresso: React.RefObject<ControleProgresso> }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const controle = progresso.current;
    controle.invalidar = invalidate;
    invalidate();
    return () => {
      controle.invalidar = undefined;
    };
  }, [progresso, invalidate]);
  return null;
}

/** Enquadra a maquete inteira em qualquer proporção de tela. */
function CameraIsometrica() {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const tamanho = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    camera.zoom = Math.min(tamanho.width / 10.4, tamanho.height / 8.4);
    camera.lookAt(0.05, 0.75, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, tamanho, invalidate]);
  return null;
}

/* ------------------------------------------------------------------ */

function texturaPiso() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  const n = 8;
  const passo = 512 / n;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const v = 228 + (Math.round(Math.sin(i * 12.9898 + j * 78.233) * 43758.5453) % 5);
      ctx.fillStyle = `rgb(${v + 6}, ${v - 2}, ${v - 10})`;
      ctx.fillRect(i * passo, j * passo, passo, passo);
    }
  }
  ctx.strokeStyle = "rgba(160, 138, 120, 0.45)";
  ctx.lineWidth = 2;
  for (let k = 0; k <= n; k++) {
    ctx.beginPath();
    ctx.moveTo(k * passo, 0);
    ctx.lineTo(k * passo, 512);
    ctx.moveTo(0, k * passo);
    ctx.lineTo(512, k * passo);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(7 / 4.8, 5.6 / 4.8);
  t.anisotropy = 4;
  return t;
}

let texturaSombra: THREE.CanvasTexture | null = null;
function sombraRadial() {
  if (texturaSombra) return texturaSombra;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(58, 44, 38, 0.85)");
  g.addColorStop(0.45, "rgba(58, 44, 38, 0.45)");
  g.addColorStop(1, "rgba(58, 44, 38, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  texturaSombra = new THREE.CanvasTexture(c);
  texturaSombra.colorSpace = THREE.SRGBColorSpace;
  return texturaSombra;
}

function Sala() {
  const piso = useMemo(() => texturaPiso(), []);
  useEffect(() => () => piso.dispose(), [piso]);
  const parede = "#f4efea";
  const topo = "#3a3a40";
  return (
    <group>
      {/* Piso */}
      <mesh position={[0, -0.07, 0]} receiveShadow>
        <boxGeometry args={[7.2, 0.14, 5.8]} />
        <meshStandardMaterial map={piso} roughness={0.55} />
      </mesh>
      {/* Parede do fundo, com painel rosé atrás dos lavatórios */}
      <mesh position={[0, 1.35, -2.96]}>
        <boxGeometry args={[7.2, 2.84, 0.12]} />
        <meshStandardMaterial color={parede} roughness={0.9} />
      </mesh>
      <mesh position={[0.62, 1.2, -2.895]}>
        <boxGeometry args={[2.6, 2.3, 0.01]} />
        <meshStandardMaterial color="#e8c5bd" roughness={0.85} />
      </mesh>
      {/* Parede lateral dos espelhos */}
      <mesh position={[-3.66, 1.35, 0]}>
        <boxGeometry args={[0.12, 2.84, 5.8]} />
        <meshStandardMaterial color={parede} roughness={0.9} />
      </mesh>
      {/* Corte das paredes (linha grafite, como numa maquete) */}
      <mesh position={[0, 2.775, -2.96]}>
        <boxGeometry args={[7.21, 0.012, 0.121]} />
        <meshBasicMaterial color={topo} />
      </mesh>
      <mesh position={[-3.66, 2.775, 0]}>
        <boxGeometry args={[0.121, 0.012, 5.81]} />
        <meshBasicMaterial color={topo} />
      </mesh>
      {/* Rodapés champanhe */}
      <mesh position={[0, 0.05, -2.895]}>
        <boxGeometry args={[7.2, 0.1, 0.02]} />
        <meshStandardMaterial color="#cbb089" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[-3.595, 0.05, 0]}>
        <boxGeometry args={[0.02, 0.1, 5.8]} />
        <meshStandardMaterial color="#cbb089" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Plantas nos cantos */}
      <Planta posicao={[-3.15, 0, -2.45]} />
      <Planta posicao={[3.05, 0, -2.45]} escala={0.85} />
    </group>
  );
}

function Planta({ posicao, escala = 1 }: { posicao: [number, number, number]; escala?: number }) {
  return (
    <group position={posicao} scale={escala}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.2, 0.16, 0.5, 20]} />
        <meshStandardMaterial color="#2a2a2e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <icosahedronGeometry args={[0.42, 1]} />
        <meshStandardMaterial color="#7f8f74" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.12, 1.2, 0.05]}>
        <icosahedronGeometry args={[0.26, 1]} />
        <meshStandardMaterial color="#8e9c86" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

const ALTURA_QUEDA = 2.6;

function PecaCaindo({ peca, progresso }: { peca: Peca; progresso: React.RefObject<ControleProgresso> }) {
  const grupo = useRef<THREE.Group>(null);
  const sombra = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: sombraRadial(), transparent: true, depthWrite: false, opacity: 0 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const p = progresso.current.valor * PASSOS_SALAO;
    const t = THREE.MathUtils.clamp((p - peca.passo - peca.atraso) / 0.55, 0, 1);
    // Queda suave: desacelera ao chegar e assenta com um quique mínimo.
    const e = t < 1 ? 1 - Math.pow(1 - t, 3) + Math.sin(t * Math.PI) * 0.035 * (1 - t) : 1;
    if (grupo.current) {
      grupo.current.visible = t > 0;
      grupo.current.position.y = (1 - e) * ALTURA_QUEDA;
      const s = Math.min(1, 0.65 + t * 1.2);
      grupo.current.scale.setScalar(s);
    }
    if (sombra.current) {
      sombra.current.visible = t > 0;
      const s = 0.55 + 0.45 * e;
      sombra.current.scale.set(peca.sombra[0] * 1.5 * s, peca.sombra[1] * 1.5 * s, 1);
    }
    material.opacity = 0.6 * e;
  });

  return (
    <group position={peca.posicao} rotation={[0, peca.rotacao, 0]}>
      <mesh ref={sombra} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} material={material} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <group ref={grupo}>
        <Modelo modelo={peca.modelo} detalhe="baixo" />
      </group>
    </group>
  );
}
