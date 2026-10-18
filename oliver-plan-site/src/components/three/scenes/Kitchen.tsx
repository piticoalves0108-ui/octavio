"use client";

/**
 * Cozinha Jacarandá em maquete: torres em nogueira, bases grafite com gola,
 * tampo e backsplash em Calacatta, ilha com cascata, ripado e pendentes.
 * Cômodo: 7,0 × 5,6 m, pé-direito 2,8 m. Parede do fundo em z = -2,8.
 */

import { Assemble } from "../Assemble";
import { Box, Cabinet, Countertop, Led, Room, SlatPanel } from "../kit";
import { Branches, FruitBowl, Pendant, Plant, Stool, Vase, Books } from "../decor";
import { useMaterial, utilMaterial } from "../materials";

export const KITCHEN_ROOM = { width: 7, depth: 5.6, height: 2.8 };
const BACK = -KITCHEN_ROOM.depth / 2;
const ISLAND_Z = 0.15;

export function KitchenRoom({ closed = false }: { closed?: boolean }) {
  return (
    <Room
      {...KITCHEN_ROOM}
      floor="piso-carvalho"
      walls={{
        back: true,
        left: { at: -0.4, width: 2, sill: 0.95, height: 1.45 },
        right: closed,
        front: closed,
      }}
      ceiling={closed}
      slab={!closed}
    />
  );
}

/** Marcas de obra: o "antes" do comparador (fita no piso, caixas de tomada, pontos hidráulicos). */
export function KitchenEmptyMarks() {
  const tape = utilMaterial("terracotta");
  const white = utilMaterial("white");
  const pipe = utilMaterial("ceramic");
  const line = (w: number, d: number, x: number, z: number, key: string) => <Box key={key} size={[w, 0.003, d]} position={[x, 0.002, z]} material={tape} shadows={false} />;
  // Contornos da futura marcenaria
  const runs = [
    // torres + bancada da parede (x de -3,45 a 2,65)
    [6.1, 0.62, -0.4, BACK + 0.31],
    // ilha
    [3.2, 1.1, 0.1, ISLAND_Z + 0.15],
  ];
  return (
    <group>
      {runs.map(([w, d, x, z], i) => (
        <group key={i}>
          {line(w, 0.025, x, z - d / 2, `a${i}`)}
          {line(w, 0.025, x, z + d / 2, `b${i}`)}
          {line(0.025, d, x - w / 2, z, `c${i}`)}
          {line(0.025, d, x + w / 2, z, `d${i}`)}
        </group>
      ))}
      {[
        [-1.5, 1.1],
        [0.6, 1.1],
        [1.6, 0.3],
        [-2.4, 0.3],
        [-2.4, 2.0],
      ].map(([x, y], i) => (
        <Box key={i} size={[0.1, 0.1, 0.02]} position={[x, y, BACK + 0.01]} material={white} />
      ))}
      {[-1.15, -0.85].map((x) => (
        <mesh key={x} position={[x, 0.5, BACK + 0.05]} rotation={[Math.PI / 2, 0, 0]} material={pipe}>
          <cylinderGeometry args={[0.02, 0.02, 0.1, 12]} />
        </mesh>
      ))}
      {/* Escada de pintor */}
      <group position={[2.2, 0, 0.9]} rotation={[0, -0.6, 0]}>
        <Box size={[0.04, 1.6, 0.06]} position={[-0.22, 0.8, 0.12]} rotation={[0.18, 0, 0]} material={pipe} />
        <Box size={[0.04, 1.6, 0.06]} position={[0.22, 0.8, 0.12]} rotation={[0.18, 0, 0]} material={pipe} />
        <Box size={[0.04, 1.6, 0.06]} position={[-0.22, 0.8, -0.12]} rotation={[-0.18, 0, 0]} material={pipe} />
        <Box size={[0.04, 1.6, 0.06]} position={[0.22, 0.8, -0.12]} rotation={[-0.18, 0, 0]} material={pipe} />
        {[0.4, 0.8, 1.2].map((y) => (
          <Box key={y} size={[0.48, 0.03, 0.12]} position={[0, y, 0.12 - y * 0.03]} material={pipe} />
        ))}
      </group>
      <mesh position={[2.9, 0.15, 1.4]} material={white} castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.3, 24]} />
      </mesh>
    </group>
  );
}

export function KitchenFurniture() {
  const metal = useMaterial("metal");
  const wood = useMaterial("wood");
  const stone = useMaterial("stone");
  const black = utilMaterial("black");

  return (
    <group>
      {/* ——— Torres em nogueira ——— */}
      <Assemble delay={0} from="floor">
        <Cabinet position={[-3.1, 0, BACK]} width={0.7} height={2.62} depth={0.62} plinth={0.08} rows={[{ kind: "door", cols: 1 }]} />
        <Cabinet
          position={[-2.4, 0, BACK]}
          width={0.7}
          height={2.62}
          depth={0.62}
          plinth={0.08}
          rows={[{ kind: "door", w: 0.95, cols: 1 }, { kind: "oven", w: 0.6 }, { kind: "oven", w: 0.42 }, { kind: "drawer", w: 0.5 }, { kind: "drawer", w: 0.5 }]}
        />
      </Assemble>

      {/* ——— Bases grafite com gola ——— */}
      <Assemble delay={0.15} from="floor">
        <Cabinet position={[-1.75, 0, BACK]} width={0.6} height={0.88} depth={0.62} plinth={0.1} front="base" handle="gola" rows={[{ kind: "drawer" }, { kind: "drawer" }, { kind: "drawer", w: 1.4 }]} />
        <Cabinet position={[-1.0, 0, BACK]} width={0.9} height={0.88} depth={0.62} plinth={0.1} front="base" handle="gola" rows={[{ kind: "door", cols: 2 }]} />
        <Cabinet position={[-0.25, 0, BACK]} width={0.6} height={0.88} depth={0.62} plinth={0.1} front="base" handle="gola" rows={[{ kind: "panel" }]} />
        <Cabinet position={[0.5, 0, BACK]} width={0.9} height={0.88} depth={0.62} plinth={0.1} front="base" handle="gola" rows={[{ kind: "drawer" }, { kind: "drawer" }]} />
        <Cabinet position={[1.45, 0, BACK]} width={1.0} height={0.88} depth={0.62} plinth={0.1} front="base" handle="gola" rows={[{ kind: "door", cols: 2 }]} />
      </Assemble>

      {/* ——— Torre da geladeira ——— */}
      <Assemble delay={0.3} from="floor">
        <Cabinet position={[2.3, 0, BACK]} width={0.7} height={2.62} depth={0.62} plinth={0.08} rows={[{ kind: "door", w: 1.6, cols: 1 }, { kind: "door", w: 1, cols: 1 }]} />
      </Assemble>

      {/* ——— Tampo, backsplash, cuba e torneira ——— */}
      <Assemble delay={0.45} from="ceiling">
        <Countertop position={[-0.05, 0.92, BACK + 0.32]} size={[4.0, 0.04, 0.64]} />
        <Box size={[4.0, 0.58, 0.02]} position={[-0.05, 1.21, BACK + 0.01]} material={stone} />
        <Box size={[0.62, 0.006, 0.42]} position={[-1.0, 0.922, BACK + 0.3]} material={black} shadows={false} />
        <group position={[-1.0, 0.92, BACK + 0.1]}>
          <mesh position={[0, 0.17, 0]} material={metal} castShadow>
            <cylinderGeometry args={[0.014, 0.016, 0.34, 16]} />
          </mesh>
          <mesh position={[0, 0.34, 0.1]} rotation={[Math.PI / 2, 0, 0]} material={metal} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.22, 16]} />
          </mesh>
        </group>
      </Assemble>

      {/* ——— Prateleira flutuante com LED ——— */}
      <Assemble delay={0.6} from="wall">
        <Box size={[1.95, 0.045, 0.28]} position={[-1.05, 1.62, BACK + 0.14]} material={wood} grain="h" />
        <Led position={[-1.05, 1.594, BACK + 0.24]} size={[1.85, 0.006, 0.012]} />
        <Vase position={[-1.75, 1.643, BACK + 0.14]} height={0.3} radius={0.07} />
        <Vase position={[-1.55, 1.643, BACK + 0.14]} height={0.18} radius={0.06} color="terracotta" />
        <Books position={[-0.6, 1.643, BACK + 0.13]} count={9} seed={2} />
        <Vase position={[-0.25, 1.643, BACK + 0.14]} height={0.22} radius={0.08} color="black" />
      </Assemble>

      {/* ——— Aéreos com vidro e LED ——— */}
      <Assemble delay={0.7} from="wall">
        <Cabinet position={[1.05, 1.62, BACK]} width={1.8} height={0.8} depth={0.36} front="front" carcass="front" rows={[{ kind: "glass", cols: 3 }]} />
        <Led position={[1.05, 1.6, BACK + 0.3]} size={[1.7, 0.006, 0.012]} />
      </Assemble>

      {/* ——— Ilha ——— */}
      <Assemble delay={0.85} from="floor">
        <Cabinet position={[0.1, 0, ISLAND_Z + 0.375]} rotationY={Math.PI} width={3.06} height={0.88} depth={0.75} plinth={0.1} front="base" handle="gola" rows={[{ kind: "drawer", cols: 4 }, { kind: "drawer", cols: 4, w: 1.5 }]} />
        <SlatPanel position={[0.1, 0.06, ISLAND_Z + 0.375]} width={3.06} height={0.82} material="wood" backing="base" />
        <Countertop position={[0.1, 0.92, ISLAND_Z + 0.15]} size={[3.2, 0.04, 1.1]} waterfall="both" />
        <Box size={[0.76, 0.006, 0.5]} position={[0.1, 0.923, ISLAND_Z - 0.12]} material={utilMaterial("glassDark")} shadows={false} />
      </Assemble>

      <Assemble delay={1.05} from="fade">
        <FruitBowl position={[1.0, 0.92, ISLAND_Z + 0.25]} />
        <Vase position={[-0.95, 0.92, ISLAND_Z + 0.3]} height={0.34} radius={0.09} />
        <Branches position={[-0.95, 1.2, ISLAND_Z + 0.3]} height={0.5} />
      </Assemble>

      {/* ——— Banquetas ——— */}
      <Assemble delay={1.15} from="fade">
        {[-0.85, 0.1, 1.05].map((x, i) => (
          <Stool key={x} position={[x, 0, ISLAND_Z + 1.05]} rotationY={i * 0.4} />
        ))}
      </Assemble>

      {/* ——— Pendentes ——— */}
      <Assemble delay={1.25} from="ceiling">
        {[-0.95, 0.1, 1.15].map((x) => (
          <Pendant key={x} position={[x, 1.78, ISLAND_Z + 0.12]} drop={2.8 - 1.78} light={x === 0.1} />
        ))}
      </Assemble>

      <Assemble delay={1.3} from="fade">
        <Plant position={[3.05, 0, BACK + 0.55]} scale={1.15} />
      </Assemble>
    </group>
  );
}
