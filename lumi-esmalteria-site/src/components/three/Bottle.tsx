"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, RoundedBox, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { Finish } from "@/data/colors";

/**
 * Frasco de esmalte procedural: vidro espesso com transmissão real, esmalte brilhante dentro,
 * gargalo dourado, tampa longa laqueada e o nome "Lumi" gravado no vidro.
 * A cor muda com transição suave e o acabamento (cremoso, perolado, metálico, glitter)
 * troca as propriedades físicas do material do líquido.
 */

/** Textura do rótulo gravado, desenhada em canvas com a fonte do site */
function useLabelTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-cormorant").trim() || "Georgia";
    ctx.clearRect(0, 0, 512, 256);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.textAlign = "center";
    ctx.font = `italic 400 132px ${family}, Georgia, serif`;
    ctx.fillText("Lumi", 256, 140);
    ctx.font = `600 24px ${family}, Georgia, serif`;
    ctx.fillText("ESMALTERIA · 9 ml", 256, 196);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, []);
}

export interface BottleProps {
  color: string;
  finish: Finish;
  /** Tampa dourada em vez de preta */
  goldCap?: boolean;
  /** Inclina o líquido conforme o movimento (efeito de "balanço") */
  slosh?: boolean;
}

export function Bottle({ color, finish, goldCap = false, slosh = true }: BottleProps) {
  const label = useLabelTexture();
  const liquidMat = useRef<THREE.MeshPhysicalMaterial>(null);
  const liquid = useRef<THREE.Group>(null);
  const target = useMemo(() => new THREE.Color(color), [color]);
  const lastRot = useRef(0);

  const glass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transmission: 1,
        thickness: 0.35,
        roughness: 0.03,
        ior: 1.52,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        envMapIntensity: 1.1,
        specularIntensity: 1,
        attenuationColor: new THREE.Color("#fff6f4"),
        attenuationDistance: 2.5,
      }),
    [],
  );

  const cap = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial(
        goldCap
          ? { color: "#c8a27a", metalness: 1, roughness: 0.22, clearcoat: 0.6, envMapIntensity: 1.6 }
          : { color: "#121212", metalness: 0.1, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.3 },
      ),
    [goldCap],
  );
  const gold = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d4b08a", metalness: 1, roughness: 0.25, envMapIntensity: 1.5 }), []);

  // Propriedades físicas por acabamento
  useEffect(() => {
    const m = liquidMat.current;
    if (!m) return;
    m.metalness = finish === "metalico" ? 0.85 : 0;
    m.roughness = finish === "metalico" ? 0.22 : finish === "glitter" ? 0.28 : 0.18;
    m.iridescence = finish === "perolado" ? 1 : 0;
    m.iridescenceIOR = 1.35;
    m.sheen = finish === "perolado" ? 1 : 0;
    m.sheenColor = new THREE.Color("#ffe6f0");
    m.clearcoat = 1;
    m.clearcoatRoughness = 0.04;
    m.needsUpdate = true;
  }, [finish]);

  useFrame((state, delta) => {
    const m = liquidMat.current;
    if (m) m.color.lerp(target, 1 - Math.pow(0.002, delta));
    // Balanço: o líquido "atrasa" em relação à rotação do frasco
    if (slosh && liquid.current) {
      const parent = liquid.current.parent;
      const rot = parent ? parent.rotation.z + parent.rotation.y * 0.3 : 0;
      const vel = (rot - lastRot.current) / Math.max(delta, 0.001);
      lastRot.current = rot;
      liquid.current.rotation.z = THREE.MathUtils.damp(liquid.current.rotation.z, THREE.MathUtils.clamp(-vel * 0.05, -0.12, 0.12), 4, delta);
    }
  });

  return (
    <group>
      {/* Esmalte (opaco, para ser visto através do vidro com transmissão) */}
      <group ref={liquid} position={[0, -0.02, 0]}>
        <RoundedBox args={[0.96, 0.98, 0.56]} radius={0.12} smoothness={6} position={[0, -0.02, 0]}>
          <meshPhysicalMaterial ref={liquidMat} color={color} roughness={0.18} clearcoat={1} clearcoatRoughness={0.04} envMapIntensity={1.2} />
        </RoundedBox>
        {finish === "glitter" && <Sparkles count={70} scale={[0.85, 0.88, 0.45]} size={2.2} speed={0.25} color="#fff4e6" opacity={0.9} />}
      </group>

      {/* Vidro grosso */}
      <RoundedBox args={[1.12, 1.12, 0.72]} radius={0.16} smoothness={8} material={glass} />

      {/* Rótulo gravado na frente do vidro */}
      {label && (
        <mesh position={[0, -0.05, 0.362]}>
          <planeGeometry args={[0.8, 0.4]} />
          <meshBasicMaterial map={label} transparent opacity={0.85} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Gargalo e anel dourado */}
      <mesh position={[0, 0.62, 0]} material={gold}>
        <cylinderGeometry args={[0.2, 0.22, 0.12, 48]} />
      </mesh>

      {/* Tampa longa laqueada */}
      <group position={[0, 1.24, 0]}>
        <mesh material={cap} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 1.12, 64]} />
        </mesh>
        <mesh position={[0, 0.56, 0]} material={cap}>
          <sphereGeometry args={[0.22, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <mesh position={[0, -0.5, 0]} material={gold}>
          <torusGeometry args={[0.24, 0.012, 12, 64]} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Estúdio de luz: softboxes e um aro rosado geram os reflexos do vidro e do esmalte.
 * Com `followPointer`, as luzes acompanham o mouse e o brilho "corre" pela superfície.
 * Tudo é gerado localmente (sem baixar mapas HDR).
 */
export function StudioEnvironment({ followPointer = false, accent = "#ff9aa8" }: { followPointer?: boolean; accent?: string }) {
  const scene = useThree((s) => s.scene);
  // O mapa de ambiente é renderizado uma vez; os reflexos "correm" girando o ambiente com o mouse
  useFrame((state, delta) => {
    if (!followPointer) return;
    const r = scene.environmentRotation;
    r.y = THREE.MathUtils.damp(r.y, state.pointer.x * 0.9, 3, delta);
    r.x = THREE.MathUtils.damp(r.x, -state.pointer.y * 0.35, 3, delta);
  });
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#1f1719"]} />
      <Lightformer form="rect" intensity={5} color="#ffffff" position={[-3, 2, 3]} scale={[2.2, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={3} color="#fff4ef" position={[3.2, 1, 2]} scale={[1.2, 4, 1]} target={[0, 0, 0]} />
      <Lightformer form="ring" intensity={2.5} color={accent} position={[0, 3, -3]} scale={2.5} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.5} color="#ffe2dc" position={[0, -3, 2]} rotation-x={Math.PI / 2} scale={[6, 6, 1]} />
    </Environment>
  );
}
