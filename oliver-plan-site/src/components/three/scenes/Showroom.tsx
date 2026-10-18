"use client";

/**
 * Showroom: um galpão de 12 × 10 m com três vinhetas montadas (cozinha, closet e living)
 * e uma parede de amostras com os acabamentos do catálogo.
 */

import { Box, Room } from "../kit";
import { createFinishMaterial } from "../materials";
import { catalogFinishes as finishes } from "@/data/finishes";
import { KitchenFurniture } from "./Kitchen";
import { ClosetFurniture } from "./Closet";
import { LivingFurniture } from "./Living";
import { Plant } from "../decor";

export const SHOWROOM_ROOM = { width: 12, depth: 10, height: 3.2 };

function SampleWall() {
  const boards = finishes.filter((f) => f.kind !== "tecido");
  const cols = 8;
  return (
    <group position={[-SHOWROOM_ROOM.width / 2, 0, 2.2]} rotation={[0, Math.PI / 2, 0]}>
      <Box size={[4.2, 2.4, 0.04]} position={[0, 1.5, 0.02]} material={createFinishMaterial(finishes.find((f) => f.id === "grafite")!)} />
      {boards.map((f, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return <Box key={f.id} size={[0.4, 0.56, 0.025]} position={[-1.75 + c * 0.5, 2.25 - r * 0.7, 0.06]} material={createFinishMaterial(f)} />;
      })}
    </group>
  );
}

export function ShowroomRoom() {
  return (
    <Room
      {...SHOWROOM_ROOM}
      floor="concreto"
      walls={{ back: true, front: true, left: true, right: { at: 0, width: 6, sill: 0.3, height: 2.5 } }}
      ceiling
      slab={false}
    />
  );
}

export function ShowroomFurniture() {
  return (
    <group>
      <group position={[-2.5, 0, -2.2]}>
        <KitchenFurniture />
      </group>
      <group position={[3.4, 0, -3.1]}>
        <ClosetFurniture />
      </group>
      <group position={[0, 0, 2.4]} rotation={[0, Math.PI, 0]}>
        <LivingFurniture />
      </group>
      <SampleWall />
      <Plant position={[5.3, 0, 4.4]} scale={1.4} />
      {[-3, 0, 3].map((x) => (
        <pointLight key={x} position={[x, 3, 0]} intensity={2.2} distance={8} color="#ffe7c7" />
      ))}
    </group>
  );
}
