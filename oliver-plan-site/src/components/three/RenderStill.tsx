"use client";

import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { SceneLights } from "./Lights";
import { AssemblyProvider } from "./Assemble";
import { SlotContext, defaultSlots, type SlotMap } from "./materials";
import { KitchenEmptyMarks, KitchenFurniture, KitchenRoom } from "./scenes/Kitchen";
import { ClosetFurniture, ClosetRoom } from "./scenes/Closet";
import { LivingFurniture, LivingRoom } from "./scenes/Living";
import type { V3 } from "./kit";

/**
 * Gera imagens estáticas ("renders do projeto") a partir das cenas procedurais.
 * Usado só em desenvolvimento por scripts/render-stills.mjs para preencher /public/renders.
 */

type Still = { camera: V3; look: V3; slots: Partial<SlotMap>; scene: "kitchen" | "kitchen-empty" | "closet" | "living"; fov?: number };

export const stills: Record<string, Still> = {
  "cozinha-jacaranda": { scene: "kitchen", camera: [3.6, 1.85, 4.6], look: [-0.9, 1.0, -1.4], slots: { wood: "freijo", glass: "canelado" } },
  "cozinha-oliva": { scene: "kitchen", camera: [-0.4, 1.7, 4.4], look: [0.4, 1.0, -1.6], slots: { front: "carvalho", base: "oliva", stone: "nero", wood: "carvalho", glass: "canelado", metal: "champagne" } },
  "cozinha-vazia": { scene: "kitchen-empty", camera: [3.6, 1.85, 4.6], look: [-0.9, 1.0, -1.4], slots: {} },
  "closet-ambar": { scene: "closet", camera: [2.0, 1.7, 3.1], look: [-0.7, 1.15, -1.1], slots: { front: "nogueira", glass: "bronze", metal: "champagne", stone: "travertino" }, fov: 40 },
  "closet-linho": { scene: "closet", camera: [-1.2, 1.65, 3.0], look: [0.6, 1.2, -1.4], slots: { front: "areia", glass: "canelado", metal: "champagne", stone: "calacatta" }, fov: 40 },
  "living-ripado": { scene: "living", camera: [3.4, 1.6, 4.4], look: [-0.6, 1.1, -1.6], slots: { wood: "freijo", base: "grafite", front: "carvalho" } },
  "living-grafite": { scene: "living", camera: [-2.4, 1.5, 4.2], look: [0.6, 1.1, -1.8], slots: { wood: "nogueira", base: "grafite", front: "nogueira", stone: "nero" } },
};

function Camera({ position, look, onReady }: { position: V3; look: V3; onReady: () => void }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...look);
    camera.updateProjectionMatrix();
    const t = setTimeout(onReady, 1500);
    return () => clearTimeout(t);
  }, [camera, position, look, onReady]);
  return null;
}

export default function RenderStill({ id }: { id: string }) {
  const still = stills[id] ?? stills["cozinha-jacaranda"];
  const [ready, setReady] = useState(false);
  const sun: V3 = still.scene === "closet" ? [7, 6, 4] : still.scene === "living" ? [8, 6, 2] : [-8, 6, 2.5];

  return (
    <div className="fixed inset-0 z-[200] bg-linen" data-ready={ready ? "1" : "0"} id="render-still">
      <Canvas shadows="percentage" dpr={1} camera={{ fov: still.fov ?? 36, near: 0.05, far: 60 }} gl={{ antialias: true, preserveDrawingBuffer: true, toneMappingExposure: 1.08 }}>
        <color attach="background" args={["#efe8de"]} />
        <fog attach="fog" args={["#efe8de", 14, 30]} />
        <SceneLights sun={sun} shadowSize={6} intensity={3} />
        <SlotContext.Provider value={{ ...defaultSlots, ...still.slots }}>
          <AssemblyProvider active instant>
            {still.scene.startsWith("kitchen") && <KitchenRoom />}
            {still.scene === "kitchen" && <KitchenFurniture />}
            {still.scene === "kitchen-empty" && <KitchenEmptyMarks />}
            {still.scene === "closet" && (
              <>
                <ClosetRoom />
                <ClosetFurniture />
              </>
            )}
            {still.scene === "living" && (
              <>
                <LivingRoom />
                <LivingFurniture />
              </>
            )}
          </AssemblyProvider>
        </SlotContext.Provider>
        <ContactShadows position={[0, -0.18, 0]} scale={16} blur={2.6} opacity={0.3} far={2} frames={1} color="#5b4630" />
        <Camera position={still.camera} look={still.look} onReady={() => setReady(true)} />
      </Canvas>
    </div>
  );
}
