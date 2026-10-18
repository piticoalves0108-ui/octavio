"use client";

import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { V3 } from "./kit";

export type ProjectedInfo = { x: number; y: number; inFront: boolean; facing: number };

/**
 * Projeta pontos 3D na tela e posiciona elementos DOM comuns (rótulos, botões de hotspot)
 * que vivem fora do <Canvas>. Assim os elementos continuam acessíveis e no fluxo do React.
 */
export function Projector({
  points,
  targets,
  apply,
}: {
  points: V3[];
  targets: RefObject<(HTMLElement | null)[]>;
  apply?: (el: HTMLElement, info: ProjectedInfo, index: number) => void;
}) {
  const v = useRef(new THREE.Vector3());
  const dir = useRef(new THREE.Vector3());
  const camDir = useRef(new THREE.Vector3());

  useFrame(({ camera, size }) => {
    camera.getWorldDirection(camDir.current);
    points.forEach((p, i) => {
      const el = targets.current?.[i];
      if (!el) return;
      v.current.set(p[0], p[1], p[2]);
      dir.current.copy(v.current).sub(camera.position).normalize();
      const facing = camDir.current.dot(dir.current);
      v.current.project(camera);
      const x = ((v.current.x + 1) / 2) * size.width;
      const y = ((1 - v.current.y) / 2) * size.height;
      const inFront = facing > 0 && v.current.z < 1;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (apply) apply(el, { x, y, inFront, facing }, i);
      else el.style.visibility = inFront ? "visible" : "hidden";
    });
  });

  return null;
}
