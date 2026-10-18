"use client";

/**
 * Closet Âmbar: parede de 4,4 m em nogueira com portas de vidro bronze, cabideiros duplos,
 * prateleiras com LED, sapateira inclinada, espelho e ilha central com tampo de vidro.
 * Cômodo: 4,6 × 3,8 m, pé-direito 2,7 m. Parede do fundo em z = -1,9.
 */

import { Assemble } from "../Assemble";
import { Box, Cabinet, Countertop, Led, Room } from "../kit";
import { FoldedStack, HangingClothes, Mirror, Pendant, Rug, Shoes, Vase } from "../decor";
import { useMaterial, utilMaterial } from "../materials";

export const CLOSET_ROOM = { width: 4.6, depth: 3.8, height: 2.7 };
const BACK = -CLOSET_ROOM.depth / 2;
const H = 2.6;
const D = 0.6;
const T = 0.025;

type BayType = "long" | "double" | "shelves" | "drawers";
const bays: { type: BayType; glass: boolean }[] = [
  { type: "long", glass: true },
  { type: "double", glass: true },
  { type: "shelves", glass: false },
  { type: "double", glass: true },
  { type: "drawers", glass: false },
];

function Bay({ x, width, type, glass, index }: { x: number; width: number; type: BayType; glass: boolean; index: number }) {
  const wood = useMaterial("front");
  const glassMat = useMaterial("glass");
  const metal = useMaterial("metal");
  const inner = width - T;
  const z = BACK + D / 2;

  return (
    <group>
      <Led position={[x, H - T - 0.006, BACK + D - 0.08]} size={[inner - 0.04, 0.006, 0.012]} />
      {type === "long" && (
        <>
          <HangingClothes position={[x, 2.2, z]} width={inner - 0.06} length={1.45} seed={index + 1} />
          <Box size={[inner, T, D - 0.02]} position={[x, 2.32, z]} material={wood} />
          <FoldedStack position={[x - 0.12, 2.335, z]} count={4} seed={index + 3} />
        </>
      )}
      {type === "double" && (
        <>
          <HangingClothes position={[x, 2.25, z]} width={inner - 0.06} length={0.9} seed={index + 2} />
          <HangingClothes position={[x, 1.18, z]} width={inner - 0.06} length={0.85} seed={index + 5} />
          <Box size={[inner, T, D - 0.02]} position={[x, 1.24, z]} material={wood} />
        </>
      )}
      {type === "shelves" &&
        [0.42, 0.8, 1.18, 1.56, 1.94, 2.3].map((y, i) => (
          <group key={y}>
            <Box size={[inner, T, D - 0.02]} position={[x, y, z]} material={wood} />
            <Led position={[x, y - T / 2 - 0.004, BACK + D - 0.06]} size={[inner - 0.04, 0.005, 0.01]} />
            <FoldedStack position={[x - 0.18, y + T / 2, z]} count={3 + (i % 3)} seed={i + 7} />
            <FoldedStack position={[x + 0.18, y + T / 2, z]} count={2 + ((i + 1) % 3)} seed={i + 11} />
          </group>
        ))}
      {type === "drawers" && (
        <>
          <Cabinet position={[x, 0, BACK]} width={inner} height={0.95} depth={D} plinth={0.08} front="front" carcass="front" rows={[{ kind: "drawer" }, { kind: "drawer" }, { kind: "drawer" }, { kind: "drawer" }]} handle="bar" />
          {[1.35, 1.85, 2.3].map((y, i) => (
            <group key={y}>
              <Box size={[inner, T, D - 0.02]} position={[x, y, z]} material={wood} />
              <Box size={[0.3, 0.24, 0.16]} position={[x - 0.15, y + T / 2 + 0.12, z]} material={utilMaterial(i === 1 ? "terracotta" : "ceramic")} />
              <Vase position={[x + 0.2, y + T / 2, z]} height={0.2} radius={0.06} color="black" />
            </group>
          ))}
        </>
      )}
      {glass && (
        <group>
          <Box size={[width / 2 - 0.006, H - 0.12, 0.008]} position={[x - width / 4, H / 2 + 0.03, BACK + D + 0.006]} material={glassMat} shadows={false} />
          <Box size={[width / 2 - 0.006, H - 0.12, 0.008]} position={[x + width / 4, H / 2 + 0.03, BACK + D + 0.006]} material={glassMat} shadows={false} />
          <Box size={[0.014, 0.5, 0.025]} position={[x - 0.025, 1.15, BACK + D + 0.025]} material={metal} />
          <Box size={[0.014, 0.5, 0.025]} position={[x + 0.025, 1.15, BACK + D + 0.025]} material={metal} />
        </group>
      )}
    </group>
  );
}

export function ClosetRoom({ closed = false }: { closed?: boolean }) {
  return (
    <Room
      {...CLOSET_ROOM}
      floor="piso-carvalho"
      walls={{ back: true, left: true, right: closed ? { at: 0.7, width: 1.2, sill: 1.0, height: 1.4 } : false, front: closed }}
      ceiling={closed}
      slab={!closed}
    />
  );
}

export function ClosetFurniture() {
  const wood = useMaterial("front");
  const black = utilMaterial("black");
  const glassMat = useMaterial("glass");
  const linen = useMaterial("linho");
  const width = 4.4;
  const bw = width / bays.length;

  return (
    <group>
      <Assemble delay={0} from="floor">
        {/* Estrutura: rodapé, base, topo, fundo e montantes */}
        <Box size={[width, 0.08, D - 0.06]} position={[0, 0.04, BACK + (D - 0.06) / 2]} material={black} />
        <Box size={[width, T, D]} position={[0, 0.08 + T / 2, BACK + D / 2]} material={wood} />
        <Box size={[width, T, D]} position={[0, H - T / 2, BACK + D / 2]} material={wood} />
        <Box size={[width, H, 0.012]} position={[0, H / 2, BACK + 0.006]} material={wood} />
        {Array.from({ length: bays.length + 1 }, (_, i) => (
          <Box key={i} size={[T, H, D]} position={[-width / 2 + i * bw + (i === 0 ? T / 2 : i === bays.length ? -T / 2 : 0), H / 2, BACK + D / 2]} material={wood} />
        ))}
      </Assemble>

      <Assemble delay={0.35} from="fade">
        {bays.map((b, i) => (
          <Bay key={i} index={i} x={-width / 2 + bw * (i + 0.5)} width={bw} type={b.type} glass={b.glass} />
        ))}
      </Assemble>

      {/* Sapateira inclinada na parede esquerda */}
      <Assemble delay={0.6} from="wall">
        <group position={[-CLOSET_ROOM.width / 2, 0, -0.75]} rotation={[0, Math.PI / 2, 0]}>
          <Box size={[1.3, 2.3, 0.012]} position={[0, 1.15, 0.006]} material={wood} />
          <Box size={[T, 2.3, 0.36]} position={[-0.65, 1.15, 0.18]} material={wood} />
          <Box size={[T, 2.3, 0.36]} position={[0.65, 1.15, 0.18]} material={wood} />
          {[0.25, 0.6, 0.95, 1.3, 1.65, 2.0].map((y) => (
            <group key={y} position={[0, y, 0.18]} rotation={[0.22, 0, 0]}>
              <Box size={[1.28, 0.018, 0.34]} material={wood} />
              <Shoes position={[0, 0.01, 0]} count={6} />
            </group>
          ))}
          <Led position={[0, 2.28, 0.32]} size={[1.2, 0.006, 0.01]} />
        </group>
        <Mirror position={[-CLOSET_ROOM.width / 2 + 0.01, 1.15, 0.55]} size={[0.62, 1.9]} rotationY={Math.PI / 2} />
      </Assemble>

      {/* Ilha central com tampo de vidro */}
      <Assemble delay={0.8} from="floor">
        <Cabinet position={[0, 0, 0.1]} width={1.6} height={0.86} depth={0.3} plinth={0.06} front="front" carcass="front" rows={[{ kind: "drawer", cols: 2 }, { kind: "drawer", cols: 2 }, { kind: "drawer", cols: 2 }]} handle="bar" />
        <Cabinet position={[0, 0, 0.1]} rotationY={Math.PI} width={1.6} height={0.86} depth={0.3} plinth={0.06} front="front" carcass="front" rows={[{ kind: "drawer", cols: 2 }, { kind: "drawer", cols: 2 }, { kind: "drawer", cols: 2 }]} handle="bar" />
        <Box size={[1.56, 0.02, 0.56]} position={[0, 0.87, 0.1]} material={linen} />
        {[-0.5, -0.3, -0.1, 0.1, 0.3, 0.5].map((x) => (
          <mesh key={x} position={[x, 0.885, 0.1]} material={utilMaterial("black")}>
            <cylinderGeometry args={[0.03, 0.03, 0.012, 24]} />
          </mesh>
        ))}
        <Box size={[1.64, 0.012, 0.64]} position={[0, 0.906, 0.1]} material={glassMat} shadows={false} />
      </Assemble>

      {/* Penteadeira na parede direita */}
      <Assemble delay={0.95} from="wall">
        <Cabinet position={[CLOSET_ROOM.width / 2, 0, -0.85]} rotationY={-Math.PI / 2} width={1.3} height={0.78} depth={0.5} plinth={0.06} front="front" carcass="front" rows={[{ kind: "drawer", cols: 2 }, { kind: "drawer", cols: 2 }]} handle="bar" />
        <Countertop position={[CLOSET_ROOM.width / 2 - 0.25, 0.8, -0.85]} size={[1.32, 0.02, 0.52]} rotationY={-Math.PI / 2} />
        <Mirror position={[CLOSET_ROOM.width / 2 - 0.01, 1.45, -0.85]} size={[1.0, 0.9]} rotationY={-Math.PI / 2} />
        <Vase position={[CLOSET_ROOM.width / 2 - 0.25, 0.8, -1.3]} height={0.22} radius={0.06} color="terracotta" />
      </Assemble>

      <Assemble delay={1.05} from="fade">
        <Rug position={[0, 0.006, 0.1]} size={[2.6, 1.8]} />
      </Assemble>
      <Assemble delay={1.1} from="ceiling">
        <Pendant position={[0, 1.95, 0.1]} drop={CLOSET_ROOM.height - 1.95} />
      </Assemble>
    </group>
  );
}
