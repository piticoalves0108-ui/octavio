"use client";

import { useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float } from "@react-three/drei";
import * as THREE from "three";
import { Bottle, StudioEnvironment } from "./Bottle";
import type { Finish } from "@/data/colors";

/**
 * Hero: o frasco flutua, gira suavemente com o scroll e acompanha o mouse; os reflexos do
 * estúdio seguem o ponteiro e "escorrem" pelo vidro e pelo esmalte. Gotas da mesma cor
 * flutuam ao redor.
 */

function Drops({ color }: { color: string }) {
  const group = useRef<THREE.Group>(null);
  // Um único material para todas as gotas; a cor desliza até o novo esmalte
  const mat = useMemo(() => new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.3 }), []); // eslint-disable-line react-hooks/exhaustive-deps
  const target = useMemo(() => new THREE.Color(color), [color]);
  const drops: [number, number, number, number][] = [
    [-1.25, 0.9, -0.4, 0.11],
    [1.15, 1.55, 0.2, 0.07],
    [1.35, -0.35, 0.5, 0.13],
    [-1.05, -0.55, 0.7, 0.06],
    [0.7, 2.05, -0.8, 0.09],
  ];
  useFrame(({ clock }, delta) => {
    mat.color.lerp(target, 1 - Math.pow(0.003, delta));
    group.current?.children.forEach((c, i) => {
      c.position.y = drops[i][1] + Math.sin(clock.elapsedTime * 0.8 + i * 1.7) * 0.08;
    });
  });
  return (
    <group ref={group}>
      {drops.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} scale={[r, r * 1.12, r]} material={mat}>
          <sphereGeometry args={[1, 48, 48]} />
        </mesh>
      ))}
    </group>
  );
}

function Rig({ progress, reduced, children }: { progress: RefObject<number>; reduced: boolean; children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const size = useThree((s) => s.size);
  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const p = progress.current ?? 0;
    const wide = size.width / size.height > 1.05;
    const px = reduced ? 0 : state.pointer.x;
    const py = reduced ? 0 : state.pointer.y;
    const t = state.clock.elapsedTime;
    g.position.x = THREE.MathUtils.damp(g.position.x, (wide ? 1.15 : 0) - p * (wide ? 0.6 : 0), 3, delta);
    g.position.y = THREE.MathUtils.damp(g.position.y, (wide ? -0.72 : -0.25) - p * 0.4, 3, delta);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.35 + px * 0.55 + p * Math.PI * 0.9 + (reduced ? 0 : Math.sin(t * 0.25) * 0.12), 3, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -py * 0.12 + 0.05, 3, delta);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -px * 0.08 + p * 0.25, 3, delta);
    const s = wide ? 1 : 0.78;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 3, delta));
  });
  return <group ref={ref}>{children}</group>;
}

export default function HeroBottleCanvas({
  color,
  finish,
  progress,
  visible,
  reduced,
}: {
  color: string;
  finish: Finish;
  progress: RefObject<number>;
  visible: boolean;
  reduced: boolean;
}) {
  return (
    <Canvas dpr={[1, 1.5]} onCreated={({ gl }) => ((gl as unknown as { transmissionResolutionScale: number }).transmissionResolutionScale = 0.6)} frameloop={visible ? "always" : "never"} gl={{ alpha: true, antialias: true, toneMappingExposure: 1.05 }} camera={{ position: [0, 0.35, 6.3], fov: 30 }} aria-hidden>
      <StudioEnvironment followPointer={!reduced} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <Rig progress={progress} reduced={reduced}>
        <Float speed={reduced ? 0 : 1.3} rotationIntensity={0.12} floatIntensity={0.35}>
          <Bottle color={color} finish={finish} />
        </Float>
        <Drops color={color} />
        <ContactShadows position={[0, -0.6, 0]} opacity={0.38} blur={2.6} scale={5} far={1.6} color="#8b2942" frames={reduced ? 1 : Infinity} resolution={256} />
      </Rig>
    </Canvas>
  );
}
