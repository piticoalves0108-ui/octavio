"use client";

/**
 * Luz de estúdio fotográfico, sem baixar HDR: o <Environment> é montado com
 * Lightformers (softbox superior, rebatedores laterais e contraluz) e renderizado
 * uma única vez num cubemap de 256 px. Isso dá os reflexos do cromado e do dourado.
 */
import { Environment, Lightformer } from "@react-three/drei";

export function Estudio({ intensidade = 1 }: { intensidade?: number }) {
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={0.78 * intensidade}>
        <color attach="background" args={["#d8d2cc"]} />
        {/* Softbox superior */}
        <Lightformer form="rect" intensity={3.2} position={[0, 5, 0.5]} rotation-x={Math.PI / 2} scale={[7, 4, 1]} />
        {/* Rebatedor esquerdo (frio) e direito (quente) */}
        <Lightformer
          form="rect"
          intensity={2.2}
          color="#fff4f1"
          position={[-5, 1.6, 1.2]}
          rotation-y={Math.PI / 2}
          scale={[3, 5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#f7e6d2"
          position={[5, 1.4, 0.8]}
          rotation-y={-Math.PI / 2}
          scale={[3, 5, 1]}
        />
        {/* Faixa de recorte atrás (desenha a silhueta no metal) */}
        <Lightformer form="rect" intensity={4} position={[0, 2.2, -5]} scale={[8, 0.6, 1]} />
        {/* Luz de preenchimento frontal */}
        <Lightformer form="ring" intensity={1.4} position={[0.5, 1.8, 6]} scale={2.5} />
        {/* Chão claro rebatendo luz por baixo */}
        <Lightformer
          form="rect"
          intensity={0.6}
          color="#efe6dd"
          position={[0, -3, 0]}
          rotation-x={-Math.PI / 2}
          scale={[10, 10, 1]}
        />
      </Environment>
      <directionalLight position={[2.5, 4.5, 3.5]} intensity={1.5 * intensidade} color="#fffaf5" />
      <directionalLight position={[-3, 2.5, -2]} intensity={0.35 * intensidade} color="#f3dcd4" />
      <ambientLight intensity={0.12 * intensidade} />
    </>
  );
}
