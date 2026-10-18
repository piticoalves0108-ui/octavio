"use client";

import { useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import { SceneLights } from "./Lights";
import { SlotContext, defaultSlots } from "./materials";
import { KitchenEmptyMarks, KitchenFurniture, KitchenRoom } from "./scenes/Kitchen";

/**
 * Antes e depois em 3D: a mesma câmera renderiza a cena duas vezes por quadro, com scissor.
 * À esquerda do divisor, o cômodo vazio com marcações de obra; à direita, a marcenaria instalada.
 */
function SplitRenderer({ split, furniture, marks }: { split: RefObject<number>; furniture: RefObject<THREE.Group | null>; marks: RefObject<THREE.Group | null> }) {
  const look = useRef(new THREE.Vector3(-0.4, 1.0, -1.2));
  const target = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const { gl, scene, camera, size, pointer } = state;
    target.current.set(0.5 + pointer.x * 0.35, 1.95 + pointer.y * 0.18, 6.4);
    easing.damp3(camera.position, target.current, 0.5, delta);
    camera.lookAt(look.current);

    const x = Math.round(size.width * Math.min(1, Math.max(0, split.current ?? 0.5)));
    gl.autoClear = false;
    gl.setScissorTest(true);

    // Antes
    if (furniture.current) furniture.current.visible = false;
    if (marks.current) marks.current.visible = true;
    gl.setScissor(0, 0, x, size.height);
    gl.clear();
    gl.render(scene, camera);

    // Depois
    if (furniture.current) furniture.current.visible = true;
    if (marks.current) marks.current.visible = false;
    gl.setScissor(x, 0, size.width - x, size.height);
    gl.clear();
    gl.render(scene, camera);

    gl.setScissorTest(false);
  }, 1);

  return null;
}

export default function BeforeAfterCanvas({ split, visible }: { split: RefObject<number>; visible: boolean }) {
  const furniture = useRef<THREE.Group>(null);
  const marks = useRef<THREE.Group>(null);
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      frameloop={visible ? "always" : "never"}
      camera={{ fov: 30, position: [0.5, 1.95, 6.4], near: 0.1, far: 60 }}
      gl={{ antialias: true }}
      aria-hidden
    >
      <color attach="background" args={["#e8e0d5"]} />
      <SceneLights />
      <SlotContext.Provider value={{ ...defaultSlots, wood: "freijo", glass: "canelado" }}>
        <KitchenRoom />
        <group ref={marks}>
          <KitchenEmptyMarks />
        </group>
        <group ref={furniture}>
          <KitchenFurniture />
        </group>
      </SlotContext.Provider>
      <SplitRenderer split={split} furniture={furniture} marks={marks} />
    </Canvas>
  );
}
