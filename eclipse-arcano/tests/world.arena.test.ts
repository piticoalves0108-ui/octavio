import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Heightfield } from '../src/world/heightfield';
import { CollisionWorld } from '../src/world/Collision';
import { WorldMaps } from '../src/world/maps';
import { SiteKit } from '../src/world/structures/kit';
import { GateSystem } from '../src/world/structures/gates';
import type { GeoBuilder } from '../src/world/structures/builder';
import { buildArena } from '../src/world/structures/ruins';
import { ARENA } from '../src/data/places';

/** Portões sem malha (o material das estruturas precisa de canvas/DOM); os colisores são os reais. */
class HeadlessGates extends GateSystem {
  override addPart(id: string, _b: GeoBuilder) {
    this.gate(id);
  }
}

/** Relevo plano na altura do planalto da arena (sem gerar o relevo real, que é caro). */
function flatHeightfield(h: number) {
  const hf = new Heightfield();
  hf.data.fill(h);
  return hf;
}

describe('Câmara do Guardião (arena do chefe)', () => {
  const hf = flatHeightfield(ARENA.y);
  const phys = new CollisionWorld(hf);
  const kit = new SiteKit(phys, hf, new WorldMaps(hf));
  const gates = new HeadlessGates(phys);
  buildArena(kit, gates);

  /** Anda em linha reta do raio 30 m para fora (cápsula do jogador) e devolve o raio final. */
  const walkOut = (ang: number) => {
    const p = new THREE.Vector3(ARENA.x + Math.cos(ang) * 30, ARENA.floorY, ARENA.z + Math.sin(ang) * 30);
    p.y = phys.groundHeight(p.x, p.z, p.y + 1);
    for (let i = 0; i < 400; i++) {
      p.x += Math.cos(ang) * 0.1;
      p.z += Math.sin(ang) * 0.1;
      const st = phys.groundHeight(p.x, p.z, p.y, 0.55, 0.9);
      if (st > p.y && st - p.y <= 0.55) p.y = st;
      phys.resolveCapsule(p, 0.45, 1.85);
      p.y = phys.groundHeight(p.x, p.z, p.y + 0.05, 0.05, 0.9);
    }
    return Math.hypot(p.x - ARENA.x, p.z - ARENA.z);
  };

  it('com o portão fechado não há saída a pé em nenhuma direção', () => {
    gates.set('arena_guardiao', false, true);
    const escapes: number[] = [];
    for (let da = -Math.PI; da < Math.PI; da += 0.01) if (walkOut(ARENA.entranceAngle + da) > 40) escapes.push(+da.toFixed(2));
    expect(escapes).toEqual([]);
  });

  it('com o portão aberto sai-se pelo corredor de entrada', () => {
    gates.set('arena_guardiao', true, true);
    expect(walkOut(ARENA.entranceAngle)).toBeGreaterThan(50); // até o portão selado (portao_ruinas)
    gates.set('arena_guardiao', false, true);
    expect(walkOut(ARENA.entranceAngle)).toBeLessThan(39);
  });
});
