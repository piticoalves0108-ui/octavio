"use client";

import { useEffect, useRef, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { easing } from "maath";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { SceneLights } from "./Lights";
import { AssemblyProvider } from "./Assemble";
import { SlotContext, defaultSlots, type SlotMap } from "./materials";
import type { TourConfig, Viewpoint } from "./scenes/presets";
import { Projector } from "./Projector";

/**
 * Tour 3D navegável "de dentro": a câmera fica no ponto de vista e o visitante gira o olhar
 * (arrastar, setas do teclado ou giro automático). Pontos de vista e hotspots vêm do preset.
 */

export type TourCommands = {
  rotate: (dx: number, dy: number) => void;
  zoom: (delta: number) => void;
};

function Navigator({
  viewpoint,
  autoRotate,
  interactive,
  commands,
}: {
  viewpoint: Viewpoint;
  autoRotate: boolean;
  interactive: boolean;
  commands: RefObject<TourCommands | null>;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  const flying = useRef(true);
  const goal = useRef({ pos: new THREE.Vector3(), target: new THREE.Vector3() });
  const fov = useRef(58);

  useEffect(() => {
    const pos = new THREE.Vector3(...viewpoint.position);
    const dir = new THREE.Vector3(...viewpoint.target).sub(pos).normalize();
    goal.current.pos.copy(pos);
    goal.current.target.copy(pos).addScaledVector(dir, 0.08);
    flying.current = true;
  }, [viewpoint]);

  useEffect(() => {
    commands.current = {
      rotate: (dx, dy) => {
        const c = controls.current;
        if (!c) return;
        // Gira o olhar no lugar: move o alvo ao redor da câmera
        const offset = new THREE.Vector3().subVectors(c.target, camera.position);
        const sph = new THREE.Spherical().setFromVector3(offset);
        sph.theta += dx;
        sph.phi = THREE.MathUtils.clamp(sph.phi + dy, 0.6, 2.4);
        offset.setFromSpherical(sph);
        c.target.copy(camera.position).add(offset);
        c.update();
      },
      zoom: (delta) => {
        fov.current = THREE.MathUtils.clamp(fov.current + delta, 32, 75);
      },
    };
  }, [camera, commands]);

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(cam.fov - fov.current) > 0.05) {
      cam.fov = THREE.MathUtils.damp(cam.fov, fov.current, 6, delta);
      cam.updateProjectionMatrix();
    }
    if (flying.current) {
      easing.damp3(camera.position, goal.current.pos, 0.35, delta);
      easing.damp3(c.target, goal.current.target, 0.3, delta);
      c.update();
      if (camera.position.distanceTo(goal.current.pos) < 0.01) flying.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      enabled={interactive}
      enableZoom={false}
      enablePan={false}
      rotateSpeed={-0.32}
      enableDamping
      dampingFactor={0.08}
      autoRotate={autoRotate}
      autoRotateSpeed={-0.35}
      minPolarAngle={Math.PI * 0.28}
      maxPolarAngle={Math.PI * 0.72}
      onStart={() => (flying.current = false)}
    />
  );
}

export default function TourCanvas({
  config,
  slots,
  viewpoint,
  autoRotate,
  interactive,
  visible,
  hotspotRefs,
  commands,
}: {
  hotspotRefs: RefObject<(HTMLElement | null)[]>;
  config: TourConfig;
  slots: Partial<SlotMap>;
  viewpoint: Viewpoint;
  autoRotate: boolean;
  interactive: boolean;
  visible: boolean;
  commands: RefObject<TourCommands | null>;
}) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.6]}
      frameloop={visible ? "always" : "never"}
      camera={{ fov: 58, position: viewpoint.position, near: 0.05, far: 60 }}
      gl={{ antialias: true, toneMappingExposure: 1.1 }}
    >
      <color attach="background" args={["#e9e1d6"]} />
      <SceneLights closed sun={config.sun} shadowSize={config.shadowSize} intensity={3.2} />
      <pointLight position={[0, 2.4, 0]} intensity={1.4} distance={7} color="#ffe6c4" />
      <SlotContext.Provider value={{ ...defaultSlots, ...config.slots, ...slots }}>
        <AssemblyProvider active instant>
          {config.scene()}
        </AssemblyProvider>
      </SlotContext.Provider>
      <Projector
        points={config.hotspots.map((h) => h.position)}
        targets={hotspotRefs}
        apply={(el, info) => {
          // Some quando o ponto sai do campo de visão de quem olha
          const o = info.inFront ? Math.min(1, Math.max(0, (info.facing - 0.35) / 0.25)) : 0;
          el.style.opacity = String(o);
          el.style.pointerEvents = o > 0.3 ? "auto" : "none";
          el.style.visibility = o > 0.02 ? "visible" : "hidden";
        }}
      />
      <Navigator viewpoint={viewpoint} autoRotate={autoRotate} interactive={interactive} commands={commands} />
    </Canvas>
  );
}
