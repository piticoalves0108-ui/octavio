"use client";

import { useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import { SceneLights } from "./Lights";
import { AssemblyProvider } from "./Assemble";
import { SlotContext, defaultSlots } from "./materials";
import { KitchenFurniture, KitchenRoom } from "./scenes/Kitchen";
import type { V3 } from "./kit";
import { Projector } from "./Projector";
import { heroLabels } from "./heroLabels";

/**
 * Hero: a cozinha em maquete. A câmera faz um travelling conforme o scroll (progress 0→1)
 * e reage ao mouse com um parallax sutil. As cotas aparecem na segunda metade do scroll.
 */

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const mix = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

function Rig({ progress, reduced }: { progress: RefObject<number>; reduced: boolean }) {
  const look = useRef(new THREE.Vector3(-0.8, 0.9, -0.6));
  const tmp = useRef(new THREE.Vector3());
  const size = useThree((s) => s.size);

  useFrame((state, delta) => {
    const p = ease(Math.min(1, Math.max(0, progress.current ?? 0)));
    const wide = size.width / size.height > 1.15;
    const from: V3 = wide ? [6.6, 4.7, 8.8] : [5.6, 6.2, 12.5];
    const to: V3 = wide ? [3.7, 2.05, 5.0] : [3.0, 2.3, 7.0];
    const lookFrom: V3 = wide ? [-1.0, 0.85, -0.7] : [-0.3, -2.4, -0.5];
    const lookTo: V3 = wide ? [-1.0, 1.0, -1.2] : [-0.5, -0.4, -1.2];
    const pos = mix(from, to, p);
    const par = reduced ? 0 : 1;
    tmp.current.set(pos[0] + state.pointer.x * 0.55 * par, pos[1] + state.pointer.y * 0.3 * par, pos[2]);
    easing.damp3(state.camera.position, tmp.current, reduced ? 0.0001 : 0.45, delta);
    easing.damp3(look.current, mix(lookFrom, lookTo, p), reduced ? 0.0001 : 0.45, delta);
    state.camera.lookAt(look.current);
  });
  return null;
}

export default function HeroCanvas({
  progress,
  active,
  visible,
  reduced,
  lowPower,
  labelRefs,
}: {
  labelRefs: RefObject<(HTMLElement | null)[]>;
  progress: RefObject<number>;
  active: boolean;
  visible: boolean;
  reduced: boolean;
  lowPower: boolean;
}) {
  return (
    <Canvas
      shadows={lowPower ? false : "percentage"}
      dpr={lowPower ? [1, 1.25] : [1, 1.75]}
      frameloop={visible ? "always" : "never"}
      camera={{ fov: 32, position: [6.6, 4.7, 8.8], near: 0.1, far: 80 }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMappingExposure: 1.05 }}
      aria-hidden
    >
      <color attach="background" args={["#f4efe9"]} />
      <fog attach="fog" args={["#f4efe9", 16, 34]} />
      <SceneLights shadows={!lowPower} />
      <SlotContext.Provider value={{ ...defaultSlots, wood: "freijo", glass: "canelado" }}>
        <AssemblyProvider active={active} instant={reduced}>
          <KitchenRoom />
          <KitchenFurniture />
        </AssemblyProvider>
      </SlotContext.Provider>
      <ContactShadows position={[0, -0.18, 0]} scale={16} blur={2.6} opacity={0.32} far={2} resolution={512} frames={1} color="#5b4630" />
      <Rig progress={progress} reduced={reduced} />
      <Projector
        points={heroLabels.map((l) => l.pos)}
        targets={labelRefs}
        apply={(el, info, i) => {
          const p = progress.current ?? 0;
          const o = Math.min(1, Math.max(0, ((p - 0.45) / 0.2) * 1.4 - i * 0.15));
          el.style.opacity = String(info.inFront ? o : 0);
        }}
      />
    </Canvas>
  );
}
