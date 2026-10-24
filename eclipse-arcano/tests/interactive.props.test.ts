import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CollisionWorld } from '../src/world/Collision';
import { PropSystem } from '../src/interactive/props';
import { POWDER, PROPS, STASIS } from '../src/data/interactive';
import type { GameContext } from '../src/core/context';

/** Relevo falso: plano inclinado (desce para +x) acima da água. */
function fakeWorld(slope = 0.25) {
  const hf = {
    heightAt: (x: number) => 40 - slope * x,
    normalAt: (_x: number, _z: number, out = { x: 0, y: 1, z: 0 }) => {
      const l = Math.hypot(slope, 1);
      out.x = slope / l;
      out.y = 1 / l;
      out.z = 0;
      return out;
    },
  };
  const physics = new CollisionWorld(hf as never);
  const explosions: { center: THREE.Vector3; radius: number; amount: number }[] = [];
  const noop = () => {};
  const ctx = {
    physics,
    heightfield: hf,
    entities: { queryRadius: () => [] },
    sys: {
      player: { entity: { position: new THREE.Vector3(0, 40, 0) }, state: 'air', wishDir: new THREE.Vector3() },
      audio: { play: noop },
      vfx: { burst: noop, spark: noop, puff: noop, ring: noop, flash: noop },
      camera: { shake: noop },
      combat: {
        applyDamage: noop,
        explode: (center: THREE.Vector3, radius: number, info: { amount: number }) => explosions.push({ center: center.clone(), radius, amount: info.amount }),
      },
    },
  } as unknown as GameContext;
  return { ctx, explosions };
}

const flames = { push: () => {} } as never;

function run(ps: PropSystem, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 30) ps.update(1 / 30, flames, 0);
}

describe('objetos físicos', () => {
  it('pedregulho rola ladeira abaixo; caixote fica parado na mesma encosta', () => {
    const { ctx } = fakeWorld(0.25);
    const ps = new PropSystem(ctx);
    const boulder = ps.add('boulder', 0, 40, 0, 0);
    const crate = ps.add('crate', 0, 40, 10, 0);
    run(ps, 0.1);
    ps.wake(boulder);
    ps.wake(crate);
    run(ps, 3);
    expect(boulder.pos.x).toBeGreaterThan(3);
    expect(Math.abs(crate.pos.x)).toBeLessThan(0.3);
    // sempre sobre o chão
    expect(boulder.pos.y).toBeGreaterThanOrEqual(40 - 0.25 * boulder.pos.x - 0.05);
  });

  it('estase: congela, acumula a força dos golpes e dispara no fim', () => {
    const { ctx } = fakeWorld(0);
    const ps = new PropSystem(ctx);
    const b = ps.add('crate', 0, 40, 0, 0);
    run(ps, 0.1);
    ps.freeze(b);
    for (let i = 0; i < 3; i++) {
      ps.onStrike({ shape: 'arc', origin: new THREE.Vector3(-1.2, 40, 0), dir: new THREE.Vector3(1, 0, 0), radius: 2.4, arcDeg: 120, info: { amount: 10, type: 'physical', knockback: 5 }, source: null });
    }
    expect(b.stasisImp.x).toBeGreaterThan(10);
    run(ps, 1);
    expect(Math.abs(b.pos.x)).toBeLessThan(0.01); // congelado
    run(ps, STASIS.duration);
    expect(ps.stats.launched).toBe(1);
    expect(b.pos.x).toBeGreaterThan(3);
  });

  it('caixote quebra com dano e avisa (para soltar o saque)', () => {
    const { ctx } = fakeWorld(0);
    const ps = new PropSystem(ctx);
    const b = ps.add('crate', 0, 40, 0, 0);
    let broke = '';
    ps.onBreak = (_b, cause) => (broke = cause);
    run(ps, 0.1);
    ps.damage(b, PROPS.crate.hp + 1, 'golpe');
    expect(b.broken).toBe(true);
    expect(broke).toBe('golpe');
    // pedregulho não quebra
    const r = ps.add('boulder', 5, 40, 0, 0);
    ps.damage(r, 9999, 'golpe');
    expect(r.broken).toBe(false);
  });

  it('pólvora: pegou fogo → pavio → explosão (uma vez)', () => {
    const { ctx, explosions } = fakeWorld(0);
    const ps = new PropSystem(ctx);
    const b = ps.add('powder', 0, 40, 0, 0);
    run(ps, 0.1);
    ps.ignite(b);
    run(ps, POWDER.fuse * 0.5);
    expect(explosions.length).toBe(0);
    run(ps, POWDER.fuse);
    expect(explosions.length).toBe(1);
    expect(explosions[0].radius).toBe(POWDER.radius);
    expect(b.broken).toBe(true);
  });

  it('explosão perto empurra os objetos para longe', () => {
    const { ctx } = fakeWorld(0);
    const ps = new PropSystem(ctx);
    const b = ps.add('barrel', 3, 40, 0, 0);
    run(ps, 0.1);
    ps.onStrike({ shape: 'sphere', origin: new THREE.Vector3(0, 40.5, 0), radius: 5, info: { amount: 50, type: 'physical', knockback: 9 }, source: null });
    run(ps, 1);
    expect(b.pos.x).toBeGreaterThan(4);
  });
});
