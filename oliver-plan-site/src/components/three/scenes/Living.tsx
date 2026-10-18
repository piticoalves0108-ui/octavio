"use client";

/**
 * Living Ripado: painel ripado de parede inteira, TV embutida, rack suspenso com LED,
 * estante lateral, sofá em linho e mesa de centro em travertino.
 * Cômodo: 6,4 × 5,2 m, pé-direito 2,8 m. Parede do fundo em z = -2,6.
 */

import { Assemble } from "../Assemble";
import { Box, Cabinet, Countertop, Led, Room, SlatPanel } from "../kit";
import { Books, CoffeeTable, Plant, Rug, Sofa, TV, Vase } from "../decor";
import { useMaterial } from "../materials";

export const LIVING_ROOM = { width: 6.4, depth: 5.2, height: 2.8 };
const BACK = -LIVING_ROOM.depth / 2;

export function LivingRoom({ closed = false }: { closed?: boolean }) {
  return (
    <Room
      {...LIVING_ROOM}
      floor="piso-carvalho"
      walls={{ back: true, left: true, right: closed ? { at: 0.3, width: 2.6, sill: 0.25, height: 2.3 } : false, front: closed }}
      ceiling={closed}
      slab={!closed}
    />
  );
}

export function LivingFurniture() {
  const metal = useMaterial("metal");
  const linen = useMaterial("linho");
  return (
    <group>
      <Assemble delay={0} from="floor">
        <SlatPanel position={[0, 0, BACK]} width={LIVING_ROOM.width} height={LIVING_ROOM.height} material="wood" backing="base" />
      </Assemble>

      <Assemble delay={0.3} from="wall">
        <TV position={[0, 1.4, BACK + 0.06]} width={1.95} />
        <Cabinet position={[0, 0.32, BACK + 0.035]} width={4} height={0.4} depth={0.45} front="base" carcass="base" rows={[{ kind: "drawer", cols: 4 }]} />
        <Countertop position={[0, 0.74, BACK + 0.035 + 0.225]} size={[4.02, 0.02, 0.46]} />
        <Led position={[0, 0.315, BACK + 0.3]} size={[3.9, 0.006, 0.012]} />
        <Vase position={[-1.6, 0.74, BACK + 0.25]} height={0.32} radius={0.08} color="terracotta" />
        <Books position={[1.5, 0.74, BACK + 0.25]} count={6} seed={4} rotationY={0.1} />
      </Assemble>

      {/* Estante na parede esquerda */}
      <Assemble delay={0.5} from="wall">
        <Cabinet
          position={[-LIVING_ROOM.width / 2, 0, -0.4]}
          rotationY={Math.PI / 2}
          width={2.4}
          height={2.6}
          depth={0.38}
          front="front"
          carcass="front"
          rows={[{ kind: "open" }, { kind: "open" }, { kind: "open" }, { kind: "open" }, { kind: "open" }]}
        >
          {[0.019, 0.539, 1.059, 1.579, 2.099].map((y, i) => (
            <group key={y}>
              <Books position={[-0.55 + (i % 2) * 0.4, y + 0.0095, 0.2]} count={8 + (i % 3) * 2} seed={i + 1} />
              {i % 2 === 0 && <Vase position={[0.6, y + 0.0095, 0.2]} height={0.24} radius={0.07} color={i === 2 ? "black" : "ceramic"} />}
            </group>
          ))}
        </Cabinet>
      </Assemble>

      <Assemble delay={0.7} from="fade">
        <Rug position={[0, 0.006, 0.4]} size={[3.6, 2.6]} />
      </Assemble>
      <Assemble delay={0.8} from="floor">
        <Sofa position={[0, 0, 1.45]} rotationY={Math.PI} width={2.9} />
        <CoffeeTable position={[0, 0, 0.25]} radius={0.55} />
      </Assemble>
      <Assemble delay={0.95} from="fade">
        <Vase position={[0.15, 0.34, 0.25]} height={0.2} radius={0.07} color="black" />
        <Plant position={[2.7, 0, BACK + 0.6]} scale={1.3} />
        {/* Luminária de piso */}
        <group position={[-2.3, 0, 1.6]}>
          <mesh position={[0, 0.8, 0]} material={metal} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 1.6, 10]} />
          </mesh>
          <mesh position={[0, 1.6, 0]} material={linen} castShadow>
            <cylinderGeometry args={[0.16, 0.22, 0.28, 32, 1, true]} />
          </mesh>
          <pointLight position={[0, 1.5, 0]} intensity={1.2} distance={3} color="#ffd29a" />
          <Box size={[0.3, 0.02, 0.3]} position={[0, 0.01, 0]} material={metal} />
        </group>
      </Assemble>
    </group>
  );
}
