"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Bottle, StudioEnvironment } from "./Bottle";
import type { Finish } from "@/data/colors";

/** Frasco em 360°: arraste para girar (OrbitControls sem zoom), giro automático até a primeira interação. */
export default function ViewerCanvas({ color, finish, goldCap, visible, autoRotate, onInteract }: { color: string; finish: Finish; goldCap: boolean; visible: boolean; autoRotate: boolean; onInteract: () => void }) {
  return (
    <Canvas dpr={[1, 1.5]} onCreated={({ gl }) => ((gl as unknown as { transmissionResolutionScale: number }).transmissionResolutionScale = 0.6)} frameloop={visible ? "always" : "never"} gl={{ alpha: true, antialias: true }} camera={{ position: [0, 0.7, 5.4], fov: 30 }}>
      <StudioEnvironment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <group position={[0, -0.72, 0]}>
        <Bottle color={color} finish={finish} goldCap={goldCap} />
        <ContactShadows position={[0, -0.57, 0]} opacity={0.35} blur={2.4} scale={4} far={1.4} color="#8b2942" />
      </group>
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={autoRotate} autoRotateSpeed={1.6} minPolarAngle={Math.PI * 0.3} maxPolarAngle={Math.PI * 0.62} target={[0, 0.0, 0]} onStart={onInteract} />
    </Canvas>
  );
}
