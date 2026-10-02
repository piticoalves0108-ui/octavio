"use client";

/**
 * Cena do hero: a cadeira gira sobre um pedestal com sombra de contato, em luz de estúdio.
 * Carregada com next/dynamic (ssr: false) só quando o hero está visível.
 */
import { ContactShadows, Sparkles } from "@react-three/drei";
import { useConfiguracao } from "@/lib/configuracao";
import { useQualidade } from "@/lib/qualidade";
import { corPorId } from "@/content/catalogo";
import { Giratorio, MirarCamera, PalcoCanvas } from "./base";
import { Estudio } from "./Estudio";
import { ProvedorDeMateriais } from "./materiais";
import { Cadeira } from "./modelos/Cadeira";
import type { ControleGiro } from "./giro";

export const FUNDO_HERO = "#ece5df";
export const CAMERA_HERO = { position: [0, 1.24, 4.4] as [number, number, number], fov: 24 };

type Props = {
  visivel: boolean;
  controle: React.RefObject<ControleGiro>;
  autoGiro: boolean;
  aoPrimeiroQuadro?: () => void;
  captura?: boolean;
};

export default function CenaHero({ visivel, controle, autoGiro, aoPrimeiroQuadro, captura = false }: Props) {
  const tecido = useConfiguracao((s) => s.tecido);
  const cor = useConfiguracao((s) => s.cor);
  const acabamento = useConfiguracao((s) => s.acabamento);
  const nivel = useQualidade((s) => s.nivel);
  const leve = nivel !== "alto";

  return (
    <PalcoCanvas
      visivel={visivel}
      continuo={autoGiro}
      monitorar
      efeitos={{ foco: [0, 0.65, 0] }}
      camera={CAMERA_HERO}
      fundo={FUNDO_HERO}
      aoPrimeiroQuadro={aoPrimeiroQuadro}
      captura={captura}
    >
      <MirarCamera alvo={[0, 0.6, 0]} />
      <Estudio />
      <ProvedorDeMateriais tecido={tecido} cor={corPorId(cor).hex} acabamento={acabamento} imediato={captura}>
        {/* Pedestal */}
        <mesh position={[0, 0.07, 0]} receiveShadow>
          <cylinderGeometry args={[0.64, 0.66, 0.14, leve ? 48 : 96]} />
          <meshPhysicalMaterial color="#d3bcaa" roughness={0.42} clearcoat={0.35} clearcoatRoughness={0.3} />
        </mesh>
        <mesh position={[0, 0.141, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.64, 0.006, 8, leve ? 64 : 128]} />
          <meshPhysicalMaterial color="#d7b98a" metalness={1} roughness={0.25} />
        </mesh>
        <ContactShadows
          position={[0, 0.142, 0]}
          scale={1.3}
          resolution={leve ? 256 : 512}
          blur={2.4}
          far={0.8}
          opacity={0.9}
          color="#3a2c26"
        />
        <ContactShadows
          position={[0, 0.001, 0]}
          scale={3}
          resolution={256}
          blur={2.6}
          far={0.5}
          opacity={0.5}
          frames={1}
          color="#3a2c26"
        />

        <group position={[0, 0.142, 0]}>
          <Giratorio controle={controle} autoGiro={autoGiro} velocidade={0.32}>
            <Cadeira detalhe={leve ? "baixo" : "alto"} />
          </Giratorio>
        </group>
      </ProvedorDeMateriais>
      {!captura && (
        <Sparkles
          count={leve ? 10 : 28}
          scale={[3.2, 2.2, 2]}
          position={[0, 1.2, 0]}
          size={leve ? 2 : 2.6}
          speed={0.25}
          opacity={0.45}
          color="#d9bf93"
        />
      )}
    </PalcoCanvas>
  );
}
