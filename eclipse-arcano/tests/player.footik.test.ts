import { describe, expect, it } from 'vitest';
import { FootIK } from '../src/player/footIk';
import { B, BONE_OFFSET, R_OFFY, createPose } from '../src/player/rig';
import type { GameContext } from '../src/core/context';

const THIGH = Math.abs(BONE_OFFSET.shinL[1]);
const SHIN = Math.abs(BONE_OFFSET.footL[1]);

/** Contexto mínimo: chão definido por uma função (x, z) → altura. */
function fakeCtx(ground: (x: number, z: number) => number): GameContext {
  return {
    physics: { groundHeight: (x: number, z: number) => ground(x, z), terrainHeight: (x: number, z: number) => ground(x, z) },
    heightfield: {
      normalAt: (_x: number, _z: number, out = { x: 0, y: 1, z: 0 }) => {
        out.x = 0;
        out.y = 1;
        out.z = 0;
        return out;
      },
    },
  } as unknown as GameContext;
}

/** Queda vertical do quadril até o pé (m) na pose. */
function legDrop(pose: Float32Array, thigh: number, shin: number) {
  const at = pose[thigh * 3];
  const as = pose[shin * 3];
  return Math.cos(at) * THIGH + Math.cos(at + as) * SHIN;
}

function settle(ik: FootIK, ctx: GameContext, weight = 1) {
  let pose = createPose();
  for (let i = 0; i < 60; i++) {
    pose = createPose();
    ik.apply(pose, ctx, 0, 0, 0, 0, weight, 0.05);
  }
  return pose;
}

describe('pés no chão (IK)', () => {
  it('chão plano: pernas e quadril ficam como a animação', () => {
    const pose = settle(new FootIK(), fakeCtx(() => 0));
    expect(pose[R_OFFY]).toBeCloseTo(0, 3);
    expect(legDrop(pose, B.thighL, B.shinL)).toBeCloseTo(THIGH + SHIN, 2);
    expect(legDrop(pose, B.thighR, B.shinR)).toBeCloseTo(THIGH + SHIN, 2);
  });

  it('um pé num degrau: a perna desse lado encolhe e o quadril não desce', () => {
    // pé esquerdo (+X local, com yaw 0 → +X no mundo) sobre um degrau de 0,3 m
    const pose = settle(new FootIK(), fakeCtx((x) => (x > 0 ? 0.3 : 0)));
    expect(pose[R_OFFY]).toBeCloseTo(0, 2);
    expect(legDrop(pose, B.thighL, B.shinL)).toBeCloseTo(THIGH + SHIN - 0.3, 1);
    expect(legDrop(pose, B.thighR, B.shinR)).toBeCloseTo(THIGH + SHIN, 2);
    // joelho dobra para frente (canela positiva) e o pé do degrau não fica para trás
    expect(pose[B.shinL * 3]).toBeGreaterThan(0.3);
  });

  it('um pé num buraco: o quadril desce até ele alcançar', () => {
    const pose = settle(new FootIK(), fakeCtx((x) => (x < 0 ? -0.25 : 0)));
    expect(pose[R_OFFY]).toBeCloseTo(-0.25, 1);
    // a outra perna encolhe para não atravessar o chão
    expect(legDrop(pose, B.thighL, B.shinL)).toBeCloseTo(THIGH + SHIN - 0.25, 1);
  });

  it('peso zero (no ar): não mexe na pose', () => {
    const pose = settle(new FootIK(), fakeCtx((x) => (x > 0 ? 0.3 : 0)), 0);
    expect(pose[R_OFFY]).toBe(0);
    expect(pose[B.thighL * 3]).toBe(0);
    expect(pose[B.shinL * 3]).toBe(0);
  });
});
