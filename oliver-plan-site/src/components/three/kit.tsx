"use client";

/**
 * Kit de marcenaria procedural: caixas, módulos com frentes reais (folgas de 3 mm entre portas),
 * tampos em cascata, painéis ripados, perfis de LED e a "maquete" do cômodo.
 * Unidades em metros. Os módulos são posicionados pelo centro da base, rente à parede (z = 0 local).
 */

import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { worldBox } from "./geometry";
import { useMaterial, utilMaterial, type Slot } from "./materials";

export type V3 = [number, number, number];

const GAP = 0.003;
const T = 0.019;

export function Box({
  size,
  position = [0, 0, 0],
  rotation,
  material,
  grain = "v",
  shadows = true,
}: {
  size: V3;
  position?: V3;
  rotation?: V3;
  material: THREE.Material;
  grain?: "v" | "h";
  shadows?: boolean;
}) {
  return (
    <mesh
      geometry={worldBox(size[0], size[1], size[2], grain)}
      material={material}
      position={position}
      rotation={rotation}
      castShadow={shadows}
      receiveShadow={shadows}
    />
  );
}

// ——— Módulo de marcenaria ———

export type RowKind = "door" | "drawer" | "oven" | "open" | "glass" | "panel";

export interface Row {
  kind: RowKind;
  /** Peso relativo da altura da linha */
  w?: number;
  cols?: number;
}

export interface CabinetProps {
  position: V3;
  rotationY?: number;
  width: number;
  height: number;
  depth?: number;
  rows?: Row[];
  front?: Slot | string;
  carcass?: Slot | string;
  handle?: "push" | "gola" | "bar";
  plinth?: number;
  led?: boolean;
  children?: ReactNode;
}

export function Cabinet({
  position,
  rotationY = 0,
  width,
  height,
  depth = 0.6,
  rows = [{ kind: "door" }],
  front = "front",
  carcass = "carcass",
  handle = "push",
  plinth = 0,
  led = true,
  children,
}: CabinetProps) {
  const frontMat = useMaterial(front);
  const carcassMat = useMaterial(carcass);
  const glassMat = useMaterial("glass");
  const metalMat = useMaterial("metal");
  const black = utilMaterial("black");
  const darkGlass = utilMaterial("glassDark");
  const ledMat = utilMaterial("led");

  const hasOpen = rows.some((r) => r.kind === "open" || r.kind === "glass");
  const bodyH = height - plinth;
  const totalW = rows.reduce((s, r) => s + (r.w ?? 1), 0);

  // Calcula a faixa vertical de cada linha
  let cursor = height;
  const bands = rows.map((r) => {
    const h = (bodyH * (r.w ?? 1)) / totalW;
    const top = cursor;
    cursor -= h;
    return { ...r, top, bottom: cursor, h };
  });

  const zFront = depth - T / 2;
  const parts: ReactNode[] = [];

  bands.forEach((band, bi) => {
    const golaH = handle === "gola" && band.kind !== "open" && band.kind !== "glass" ? 0.032 : 0;
    const fh = band.h - GAP * 2 - golaH;
    const cy = band.bottom + GAP + fh / 2;
    const cols = band.cols ?? (band.kind === "drawer" ? (width > 1.1 ? 2 : 1) : band.kind === "door" || band.kind === "glass" ? Math.max(1, Math.round(width / 0.6)) : 1);
    const cw = width / cols;

    if (golaH) {
      parts.push(<Box key={`g${bi}`} size={[width, golaH, 0.02]} position={[0, band.top - golaH / 2 - GAP, depth - 0.03]} material={black} shadows={false} />);
    }

    if (band.kind === "open" || band.kind === "glass") {
      // Prateleira na base da faixa + LED embaixo da prateleira de cima
      parts.push(<Box key={`s${bi}`} size={[width - T * 2, T, depth - T]} position={[0, band.bottom + T / 2, (depth - T) / 2]} material={carcassMat} />);
      if (led) parts.push(<Box key={`l${bi}`} size={[width - T * 2 - 0.02, 0.006, 0.012]} position={[0, band.top - T - 0.004, depth - 0.06]} material={ledMat} shadows={false} />);
      if (band.kind === "glass") {
        for (let c = 0; c < cols; c++) {
          parts.push(
            <Box key={`gl${bi}${c}`} size={[cw - GAP * 2, fh, 0.008]} position={[-width / 2 + cw * (c + 0.5), cy, depth - 0.006]} material={glassMat} shadows={false} />,
          );
          parts.push(<Box key={`gf${bi}${c}`} size={[0.012, fh, 0.02]} position={[-width / 2 + cw * c + (c % 2 ? 0.01 : cw - 0.01), cy, depth - 0.01]} material={metalMat} />);
        }
      }
      return;
    }

    if (band.kind === "oven") {
      parts.push(<Box key={`of${bi}`} size={[width - GAP * 2, fh, T]} position={[0, cy, zFront]} material={frontMat} />);
      parts.push(<Box key={`og${bi}`} size={[width - 0.07, fh - 0.08, 0.012]} position={[0, cy, depth + 0.002]} material={darkGlass} />);
      parts.push(<Box key={`oh${bi}`} size={[width - 0.2, 0.012, 0.025]} position={[0, cy + fh / 2 - 0.06, depth + 0.02]} material={metalMat} />);
      return;
    }

    for (let c = 0; c < cols; c++) {
      const x = -width / 2 + cw * (c + 0.5);
      parts.push(<Box key={`f${bi}${c}`} size={[cw - GAP * 2, fh, T]} position={[x, cy, zFront]} material={frontMat} />);
      if (handle === "bar") {
        if (band.kind === "drawer") {
          parts.push(<Box key={`h${bi}${c}`} size={[Math.min(0.3, cw * 0.5), 0.012, 0.022]} position={[x, cy + fh / 2 - 0.05, depth + 0.012]} material={metalMat} />);
        } else {
          const side = c % 2 === 0 ? 1 : -1;
          const hx = cols === 1 ? x + cw / 2 - 0.05 : x + side * (cw / 2 - 0.05);
          parts.push(<Box key={`h${bi}${c}`} size={[0.012, Math.min(0.32, fh * 0.4), 0.022]} position={[hx, band.bottom + (band.top - band.bottom > 1 ? 1.0 : fh * 0.75), depth + 0.012]} material={metalMat} />);
        }
      }
    }
  });

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {plinth > 0 && <Box size={[width - 0.01, plinth, depth - 0.07]} position={[0, plinth / 2, (depth - 0.07) / 2]} material={black} />}
      {hasOpen ? (
        <>
          <Box size={[T, bodyH, depth - T]} position={[-width / 2 + T / 2, plinth + bodyH / 2, (depth - T) / 2]} material={carcassMat} />
          <Box size={[T, bodyH, depth - T]} position={[width / 2 - T / 2, plinth + bodyH / 2, (depth - T) / 2]} material={carcassMat} />
          <Box size={[width, T, depth - T]} position={[0, height - T / 2, (depth - T) / 2]} material={carcassMat} />
          <Box size={[width, T, depth - T]} position={[0, plinth + T / 2, (depth - T) / 2]} material={carcassMat} />
          <Box size={[width - T * 2, bodyH, 0.008]} position={[0, plinth + bodyH / 2, 0.004]} material={carcassMat} />
        </>
      ) : (
        <Box size={[width, bodyH, depth - T]} position={[0, plinth + bodyH / 2, (depth - T) / 2]} material={carcassMat} />
      )}
      {parts}
      {children}
    </group>
  );
}

// ——— Tampo (com cascata opcional) ———

export function Countertop({
  position,
  size,
  waterfall,
  material = "stone",
  rotationY = 0,
}: {
  position: V3;
  size: V3;
  waterfall?: "left" | "right" | "both";
  material?: Slot | string;
  rotationY?: number;
}) {
  const mat = useMaterial(material);
  const [w, t, d] = size;
  const top = position[1];
  return (
    <group position={[position[0], 0, position[2]]} rotation={[0, rotationY, 0]}>
      <Box size={[w, t, d]} position={[0, top - t / 2, 0]} material={mat} />
      {(waterfall === "left" || waterfall === "both") && <Box size={[t, top - t, d]} position={[-w / 2 + t / 2, (top - t) / 2, 0]} material={mat} />}
      {(waterfall === "right" || waterfall === "both") && <Box size={[t, top - t, d]} position={[w / 2 - t / 2, (top - t) / 2, 0]} material={mat} />}
    </group>
  );
}

// ——— Painel ripado (instanciado) ———

export function SlatPanel({
  position,
  width,
  height,
  slat = 0.04,
  gap = 0.016,
  depth = 0.022,
  material = "wood",
  backing = "base",
  rotationY = 0,
}: {
  position: V3;
  width: number;
  height: number;
  slat?: number;
  gap?: number;
  depth?: number;
  material?: Slot | string;
  backing?: Slot | string;
  rotationY?: number;
}) {
  const mat = useMaterial(material);
  const back = useMaterial(backing);
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = Math.floor((width + gap) / (slat + gap));
  const used = count * slat + (count - 1) * gap;
  const geo = useMemo(() => worldBox(slat, height, depth), [slat, height, depth]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      m.makeTranslation(-used / 2 + slat / 2 + i * (slat + gap), height / 2, 0.012 + depth / 2);
      ref.current!.setMatrixAt(i, m);
    }
    ref.current!.instanceMatrix.needsUpdate = true;
    ref.current!.computeBoundingSphere();
  }, [count, used, slat, gap, height, depth]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Box size={[width, height, 0.012]} position={[0, height / 2, 0.006]} material={back} />
      <instancedMesh ref={ref} args={[geo, mat, count]} castShadow receiveShadow />
    </group>
  );
}

export function Led({ position, size }: { position: V3; size: V3 }) {
  return <Box size={size} position={position} material={utilMaterial("led")} shadows={false} />;
}

// ——— Cômodo em "maquete" ———

export interface WindowSpec {
  /** Posição horizontal do centro da janela ao longo da parede */
  at: number;
  width: number;
  sill: number;
  height: number;
}

function Wall({ length, height, thickness, window, material }: { length: number; height: number; thickness: number; window?: WindowSpec; material: THREE.Material }) {
  const frame = utilMaterial("black");
  const sky = utilMaterial("sky");
  if (!window) return <Box size={[length, height, thickness]} position={[0, height / 2, 0]} material={material} />;
  const { at, width, sill, height: wh } = window;
  const left = at - width / 2 + length / 2;
  const right = length / 2 - (at + width / 2);
  const top = height - sill - wh;
  return (
    <group>
      <Box size={[left, height, thickness]} position={[-length / 2 + left / 2, height / 2, 0]} material={material} />
      <Box size={[right, height, thickness]} position={[length / 2 - right / 2, height / 2, 0]} material={material} />
      <Box size={[width, sill, thickness]} position={[at, sill / 2, 0]} material={material} />
      <Box size={[width, top, thickness]} position={[at, height - top / 2, 0]} material={material} />
      {/* Caixilho em alumínio preto */}
      <Box size={[width, 0.035, 0.05]} position={[at, sill + 0.0175, 0]} material={frame} />
      <Box size={[width, 0.035, 0.05]} position={[at, sill + wh - 0.0175, 0]} material={frame} />
      <Box size={[0.035, wh, 0.05]} position={[at - width / 2 + 0.0175, sill + wh / 2, 0]} material={frame} />
      <Box size={[0.035, wh, 0.05]} position={[at + width / 2 - 0.0175, sill + wh / 2, 0]} material={frame} />
      <Box size={[0.03, wh, 0.05]} position={[at, sill + wh / 2, 0]} material={frame} />
      {/* "Céu" do lado de fora */}
      <mesh position={[at, sill + wh / 2, -thickness / 2 - 0.25]} material={sky}>
        <planeGeometry args={[width + 0.4, wh + 0.4]} />
      </mesh>
    </group>
  );
}

export interface RoomProps {
  width: number;
  depth: number;
  height: number;
  floor?: string;
  wallThickness?: number;
  walls?: { back?: boolean | WindowSpec; left?: boolean | WindowSpec; right?: boolean | WindowSpec; front?: boolean | WindowSpec };
  ceiling?: boolean;
  /** Laje de concreto aparente sob o piso (visual de maquete) */
  slab?: boolean;
}

export function Room({ width, depth, height, floor = "piso-carvalho", wallThickness = 0.14, walls = { back: true, left: true }, ceiling = false, slab = true }: RoomProps) {
  const floorMat = useMaterial(floor);
  const wall = utilMaterial("wall");
  const slabMat = utilMaterial("slab");
  const t = wallThickness;
  const spec = (v: boolean | WindowSpec | undefined) => (typeof v === "object" ? v : undefined);

  return (
    <group>
      <Box size={[width, 0.015, depth]} position={[0, -0.0075, 0]} material={floorMat} grain="h" />
      {slab && <Box size={[width + t * 2, 0.16, depth + t * 2]} position={[0, -0.095, 0]} material={slabMat} />}
      {walls.back && (
        <group position={[0, 0, -depth / 2 - t / 2]}>
          <Wall length={width + t * 2} height={height} thickness={t} window={spec(walls.back)} material={wall} />
        </group>
      )}
      {walls.front && (
        <group position={[0, 0, depth / 2 + t / 2]} rotation={[0, Math.PI, 0]}>
          <Wall length={width + t * 2} height={height} thickness={t} window={spec(walls.front)} material={wall} />
        </group>
      )}
      {walls.left && (
        <group position={[-width / 2 - t / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Wall length={depth} height={height} thickness={t} window={spec(walls.left)} material={wall} />
        </group>
      )}
      {walls.right && (
        <group position={[width / 2 + t / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <Wall length={depth} height={height} thickness={t} window={spec(walls.right)} material={wall} />
        </group>
      )}
      {ceiling && <Box size={[width + t * 2, 0.1, depth + t * 2]} position={[0, height + 0.05, 0]} material={utilMaterial("white")} />}
    </group>
  );
}
