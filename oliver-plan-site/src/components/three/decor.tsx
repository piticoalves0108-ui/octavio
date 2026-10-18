"use client";

/** Objetos de cena: banquetas, pendentes, vasos, livros, sofá, cama, roupas... tudo procedural. */

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import { Box, type V3 } from "./kit";
import { vaseProfile } from "./geometry";
import { useMaterial, utilMaterial } from "./materials";

export function Stool({ position, rotationY = 0, height = 0.66 }: { position: V3; rotationY?: number; height?: number }) {
  const seat = useMaterial("wood");
  const metal = useMaterial("metal");
  const legs = [
    [0.15, 0.15],
    [-0.15, 0.15],
    [0.15, -0.15],
    [-0.15, -0.15],
  ];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height - 0.025, 0]} material={seat} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.19, 0.05, 40]} />
      </mesh>
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x * 0.85, (height - 0.05) / 2, z * 0.85]} rotation={[z * 0.18, 0, -x * 0.18]} material={metal} castShadow>
          <cylinderGeometry args={[0.011, 0.011, height - 0.04, 10]} />
        </mesh>
      ))}
      <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]} material={metal} castShadow>
        <torusGeometry args={[0.15, 0.008, 8, 40]} />
      </mesh>
    </group>
  );
}

export function Pendant({ position, drop = 0.9, light = true }: { position: V3; drop?: number; light?: boolean }) {
  const metal = useMaterial("metal");
  const led = utilMaterial("led");
  return (
    <group position={position}>
      <mesh position={[0, drop / 2, 0]} material={utilMaterial("cable")}>
        <cylinderGeometry args={[0.003, 0.003, drop, 6]} />
      </mesh>
      <mesh material={metal} castShadow>
        <cylinderGeometry args={[0.07, 0.16, 0.24, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 0.12, 0]} material={metal}>
        <cylinderGeometry args={[0.07, 0.07, 0.01, 30]} />
      </mesh>
      <mesh position={[0, -0.11, 0]} rotation={[-Math.PI / 2, 0, 0]} material={led}>
        <circleGeometry args={[0.15, 40]} />
      </mesh>
      {light && <pointLight position={[0, -0.25, 0]} intensity={1.6} distance={2.6} decay={2} color="#ffcf96" />}
    </group>
  );
}

export function Vase({ position, height = 0.32, radius = 0.09, color = "ceramic" as "ceramic" | "terracotta" | "black" }: { position: V3; height?: number; radius?: number; color?: "ceramic" | "terracotta" | "black" }) {
  const geo = useMemo(() => new THREE.LatheGeometry(vaseProfile(height, radius), 40), [height, radius]);
  return <mesh position={position} geometry={geo} material={utilMaterial(color)} castShadow receiveShadow />;
}

export function Branches({ position, height = 0.55 }: { position: V3; height?: number }) {
  const leaf = utilMaterial("leaf");
  const stems = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return { a, tilt: 0.25 + (i % 3) * 0.1, h: height * (0.7 + ((i * 37) % 10) / 30) };
      }),
    [height],
  );
  return (
    <group position={position}>
      {stems.map((s, i) => (
        <group key={i} rotation={[Math.sin(s.a) * s.tilt, 0, Math.cos(s.a) * s.tilt]}>
          <mesh position={[0, s.h / 2, 0]} material={utilMaterial("cable")}>
            <cylinderGeometry args={[0.003, 0.004, s.h, 5]} />
          </mesh>
          {[0.55, 0.75, 0.92].map((k, j) => (
            <mesh key={j} position={[0, s.h * k, 0]} rotation={[0, s.a + j, 0.6]} scale={[0.05, 0.012, 0.025]} material={leaf} castShadow>
              <sphereGeometry args={[1, 10, 6]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Plant({ position, scale = 1 }: { position: V3; scale?: number }) {
  const leaf = utilMaterial("leaf");
  const leaves = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ a: i * 2.4, tilt: 0.35 + (i % 4) * 0.15, l: 0.5 + (i % 5) * 0.09 })), []);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} material={utilMaterial("terracotta")} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.4, 32]} />
      </mesh>
      {leaves.map((l, i) => (
        <group key={i} position={[0, 0.38, 0]} rotation={[0, l.a, l.tilt]}>
          <mesh position={[0, l.l / 2, 0]} scale={[0.07, l.l / 2, 0.012]} material={leaf} castShadow>
            <sphereGeometry args={[1, 12, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const bookColors = ["#2b2b2b", "#8b6f47", "#c96e4b", "#e8e0d5", "#5a6b4f", "#b8b0a5", "#6b5434", "#f4efe9"];
const bookMats = new Map<string, THREE.Material>();
const bookMat = (c: string) => {
  if (!bookMats.has(c)) bookMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
  return bookMats.get(c)!;
};

export function Books({ position, count = 7, rotationY = 0, seed = 1 }: { position: V3; count?: number; rotationY?: number; seed?: number }) {
  let x = 0;
  const items = Array.from({ length: count }, (_, i) => {
    const r = Math.abs(Math.sin((i + 1) * 12.9898 * seed));
    const w = 0.025 + r * 0.025;
    const h = 0.2 + r * 0.09;
    const item = { x: x + w / 2, w, h, d: 0.15 + r * 0.04, c: bookColors[(i * 3 + seed) % bookColors.length] };
    x += w + 0.002;
    return item;
  });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {items.map((b, i) => (
        <Box key={i} size={[b.w, b.h, b.d]} position={[b.x - x / 2, b.h / 2, 0]} material={bookMat(b.c)} />
      ))}
    </group>
  );
}

export function FruitBowl({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0]} material={utilMaterial("ceramic")} castShadow receiveShadow>
        <sphereGeometry args={[0.16, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </mesh>
      {[
        [0.03, 0.08, 0.02],
        [-0.05, 0.08, -0.02],
        [0.0, 0.11, -0.05],
        [-0.02, 0.09, 0.06],
      ].map((p, i) => (
        <mesh key={i} position={p as V3} material={utilMaterial("fruit")} castShadow>
          <sphereGeometry args={[0.04, 16, 12]} />
        </mesh>
      ))}
    </group>
  );
}

export function Sofa({ position, rotationY = 0, width = 2.6 }: { position: V3; rotationY?: number; width?: number }) {
  const fabric = useMaterial("fabric");
  const base = useMaterial("base");
  const seats = 3;
  const sw = (width - 0.3) / seats;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box size={[width, 0.08, 0.95]} position={[0, 0.06, 0]} material={base} />
      <RoundedBox args={[width, 0.24, 0.95]} radius={0.04} smoothness={3} position={[0, 0.22, 0]} material={fabric} castShadow receiveShadow />
      {Array.from({ length: seats }, (_, i) => (
        <RoundedBox key={i} args={[sw - 0.01, 0.16, 0.72]} radius={0.06} smoothness={4} position={[-width / 2 + 0.15 + sw * (i + 0.5), 0.41, 0.1]} material={fabric} castShadow receiveShadow />
      ))}
      <RoundedBox args={[width, 0.5, 0.22]} radius={0.08} smoothness={4} position={[0, 0.55, -0.36]} material={fabric} castShadow receiveShadow />
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.15, 0.42, 0.95]} radius={0.06} smoothness={3} position={[s * (width / 2 - 0.075), 0.45, 0]} material={fabric} castShadow />
      ))}
    </group>
  );
}

export function CoffeeTable({ position, radius = 0.5 }: { position: V3; radius?: number }) {
  const top = useMaterial("travertino");
  return (
    <group position={position}>
      <mesh position={[0, 0.17, 0]} material={top} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius * 0.92, 0.34, 64]} />
      </mesh>
    </group>
  );
}

export function Rug({ position, size, rotationY = 0 }: { position: V3; size: [number, number]; rotationY?: number }) {
  const mat = useMaterial("linho");
  return <Box size={[size[0], 0.012, size[1]]} position={position} rotation={[0, rotationY, 0]} material={mat} />;
}

export function Bed({ position, rotationY = 0 }: { position: V3; rotationY?: number }) {
  const fabric = useMaterial("fabric");
  const base = useMaterial("wood");
  const white = utilMaterial("white");
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box size={[1.9, 0.3, 2.05]} position={[0, 0.15, 1.05]} material={base} />
      <RoundedBox args={[1.86, 0.26, 2.0]} radius={0.06} smoothness={3} position={[0, 0.43, 1.05]} material={white} castShadow receiveShadow />
      <RoundedBox args={[1.92, 0.08, 1.35]} radius={0.04} smoothness={3} position={[0, 0.58, 1.38]} material={fabric} castShadow />
      {[-0.45, 0.45].map((x) => (
        <RoundedBox key={x} args={[0.75, 0.16, 0.38]} radius={0.07} smoothness={4} position={[x, 0.66, 0.28]} rotation={[-0.25, 0, 0]} material={white} castShadow />
      ))}
    </group>
  );
}

/** Peças penduradas num cabideiro (instanciadas, cada uma com sua cor). */
const clothPalette = ["#e8e0d5", "#2b2b2b", "#8e867b", "#c96e4b", "#f4efe9", "#5a6b4f", "#b8b0a5", "#6b5434", "#1f2a36", "#d9c8ae"];

export function HangingClothes({ position, width, length = 1.0, seed = 1 }: { position: V3; width: number; length?: number; seed?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = Math.max(3, Math.floor(width / 0.065));
  const geo = useMemo(() => new THREE.BoxGeometry(0.04, 1, 0.44), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95 }), []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const r = Math.abs(Math.sin((i + 1) * 78.233 * seed));
      const len = length * (0.55 + r * 0.45);
      p.set(-width / 2 + 0.04 + i * ((width - 0.08) / (count - 1)), -len / 2 - 0.03, 0);
      q.setFromEuler(new THREE.Euler(0, (r - 0.5) * 0.25, 0));
      s.set(0.6 + r * 0.6, len, 0.9 + r * 0.1);
      m.compose(p, q, s);
      ref.current!.setMatrixAt(i, m);
      ref.current!.setColorAt(i, c.set(clothPalette[Math.floor(r * 997 + seed) % clothPalette.length]));
    }
    ref.current!.instanceMatrix.needsUpdate = true;
    if (ref.current!.instanceColor) ref.current!.instanceColor.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [count, width, length, seed]);

  const metal = useMaterial("metal");
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={metal}>
        <cylinderGeometry args={[0.012, 0.012, width, 12]} />
      </mesh>
      <instancedMesh ref={ref} args={[geo, mat, count]} castShadow receiveShadow />
    </group>
  );
}

/** Pilha de roupas dobradas */
export function FoldedStack({ position, count = 5, seed = 1 }: { position: V3; count?: number; seed?: number }) {
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => {
        const r = Math.abs(Math.sin((i + 1) * 43.1 * seed));
        return <Box key={i} size={[0.32 + r * 0.03, 0.045, 0.3]} position={[(r - 0.5) * 0.02, 0.0225 + i * 0.047, 0]} material={bookMat(clothPalette[(i * 7 + seed) % clothPalette.length])} />;
      })}
    </group>
  );
}

export function Shoes({ position, count = 4, rotation = [0, 0, 0] as V3 }: { position: V3; count?: number; rotation?: V3 }) {
  return (
    <group position={position} rotation={rotation}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[-((count - 1) * 0.2) / 2 + i * 0.2, 0, 0]}>
          {[-0.045, 0.045].map((x) => (
            <RoundedBox key={x} args={[0.08, 0.08, 0.26]} radius={0.03} smoothness={2} position={[x, 0.04, 0]} material={bookMat(clothPalette[(i * 3 + 1) % clothPalette.length])} castShadow />
          ))}
        </group>
      ))}
    </group>
  );
}

export function Mirror({ position, size, rotationY = 0 }: { position: V3; size: [number, number]; rotationY?: number }) {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d8dde0", metalness: 1, roughness: 0.04, envMapIntensity: 1.4 }), []);
  const frame = useMaterial("metal");
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box size={[size[0] + 0.03, size[1] + 0.03, 0.02]} position={[0, 0, 0.01]} material={frame} />
      <mesh position={[0, 0, 0.022]} material={mat}>
        <planeGeometry args={size} />
      </mesh>
    </group>
  );
}

export function TV({ position, width = 1.65, rotationY = 0 }: { position: V3; width?: number; rotationY?: number }) {
  return <Box size={[width, width * 0.5625, 0.03]} position={position} rotation={[0, rotationY, 0]} material={utilMaterial("screen")} />;
}
