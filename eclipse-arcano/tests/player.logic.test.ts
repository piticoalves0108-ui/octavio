import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { JumpAssist, accelerateXZ, approach, bankFromTurn, fallDamage, flightEnergyCost, pickLockTarget, wrapAngle } from '../src/player/locomotion';
import { FALL_DAMAGE, FLIGHT, JUMP, ANIM_DURATION } from '../src/data/player';
import { CollisionWorld } from '../src/world/Collision';
import { sphereCast, pointInCollider, colliderAt, ceilingAbove, colliderTop } from '../src/player/probe';

/** Heightfield falso e plano (evita gerar o relevo inteiro no teste). */
function flatWorld(h = 0) {
  const hf = {
    heightAt: () => h,
    normalAt: (_x: number, _z: number, out = { x: 0, y: 1, z: 0 }) => {
      out.x = 0;
      out.y = 1;
      out.z = 0;
      return out;
    },
  };
  return new CollisionWorld(hf as never);
}

describe('locomoção: aceleração', () => {
  it('approach não ultrapassa o alvo', () => {
    expect(approach(0, 10, 3)).toBe(3);
    expect(approach(9, 10, 3)).toBe(10);
    expect(approach(5, -1, 2)).toBe(3);
  });

  it('accelerateXZ converge para a velocidade alvo e freia até parar', () => {
    const v = { x: 0, z: 0 };
    for (let i = 0; i < 60; i++) accelerateXZ(v, 0, 1, 5.4, 38, 30, 1 / 60);
    expect(v.z).toBeCloseTo(5.4, 3);
    expect(Math.abs(v.x)).toBeLessThan(1e-6);
    // leva cerca de 0,14 s para atingir a velocidade (responsivo)
    const w = { x: 0, z: 0 };
    let t = 0;
    while (w.z < 5.3 && t < 2) {
      accelerateXZ(w, 0, 1, 5.4, 38, 30, 1 / 120);
      t += 1 / 120;
    }
    expect(t).toBeLessThan(0.2);
    for (let i = 0; i < 60; i++) accelerateXZ(v, 0, 0, 0, 38, 30, 1 / 60);
    expect(Math.hypot(v.x, v.z)).toBeLessThan(1e-6);
  });

  it('inversão de direção é mais rápida que a frenagem simples', () => {
    const a = { x: 0, z: 5 };
    const b = { x: 0, z: 5 };
    accelerateXZ(a, 0, -1, 5, 38, 30, 0.05); // inverte
    accelerateXZ(b, 0, 0, 0, 38, 30, 0.05); // só solta
    expect(5 - a.z).toBeGreaterThan(5 - b.z);
  });
});

describe('locomoção: pulo, queda e voo', () => {
  it('coyote time: pula logo depois de sair da borda, mas não depois do limite', () => {
    const j = new JumpAssist();
    j.tick(0.016, true, false);
    j.tick(JUMP.coyoteTime * 0.5, false, true);
    expect(j.consume()).toBe(true);
    const k = new JumpAssist();
    k.tick(0.016, true, false);
    k.tick(JUMP.coyoteTime + 0.05, false, false);
    k.tick(0.01, false, true);
    expect(k.consume()).toBe(false);
  });

  it('buffer: pulo apertado pouco antes de tocar o chão vale ao aterrissar', () => {
    const j = new JumpAssist();
    j.tick(0.016, false, true); // apertou no ar
    j.tick(JUMP.bufferTime * 0.5, true, false); // tocou o chão
    expect(j.consume()).toBe(true);
    expect(j.consume()).toBe(false); // consumido uma vez só
  });

  it('dano de queda: zero abaixo do limite, moderado e nunca letal', () => {
    expect(fallDamage(FALL_DAMAGE.minSpeed - 1, 100, 100)).toBe(0);
    const d = fallDamage(FALL_DAMAGE.minSpeed + 5, 100, 100);
    expect(d).toBeCloseTo(5 * FALL_DAMAGE.perSpeed, 5);
    expect(fallDamage(200, 100, 100)).toBeLessThanOrEqual(100 * FALL_DAMAGE.maxFraction);
    expect(fallDamage(200, 100, 10)).toBe(9);
  });

  it('custo de energia do voo: pairar < cruzeiro < turbo, escala com o multiplicador', () => {
    const hover = flightEnergyCost(1, false, false, false, 1);
    const cruise = flightEnergyCost(1, true, false, false, 1);
    const boost = flightEnergyCost(1, true, true, false, 1);
    expect(hover).toBeCloseTo(FLIGHT.costHover);
    expect(cruise).toBeGreaterThan(hover);
    expect(boost).toBeGreaterThan(cruise);
    expect(flightEnergyCost(1, true, false, true, 0.5)).toBeCloseTo((FLIGHT.costCruise + FLIGHT.costClimb) * 0.5);
    // 100 de energia dura mais de um minuto em cruzeiro
    expect(100 / cruise).toBeGreaterThan(60);
  });

  it('inclinação nas curvas é limitada e inclina para dentro da curva', () => {
    const max = (FLIGHT.bankMaxDeg * Math.PI) / 180;
    expect(bankFromTurn(10, 30, max)).toBeCloseTo(-max);
    expect(bankFromTurn(-10, 30, max)).toBeCloseTo(max);
    expect(bankFromTurn(0, 30, max)).toBeCloseTo(0);
  });

  it('wrapAngle normaliza para [-PI, PI]', () => {
    expect(wrapAngle(Math.PI * 3 - 0.5)).toBeCloseTo(Math.PI - 0.5);
    expect(wrapAngle(-Math.PI * 2.5)).toBeCloseTo(-Math.PI / 2);
  });

  it('durações das animações de ação são positivas', () => {
    for (const v of Object.values(ANIM_DURATION)) expect(v).toBeGreaterThan(0);
  });
});

describe('trava de alvo', () => {
  it('escolhe o alvo mais centralizado no cone, dentro do alcance', () => {
    const c = [
      { x: 0, z: 40 }, // longe demais
      { x: 10, z: 10 }, // 45°
      { x: 1, z: 15 }, // quase à frente
      { x: 0, z: -5 }, // atrás
    ];
    expect(pickLockTarget(c, 0, 0, 0, 1, 30, 70)).toBe(2);
    expect(pickLockTarget([{ x: 0, z: -5 }], 0, 0, 0, 1, 30, 70)).toBe(-1);
    // muito perto vale mesmo fora do cone
    expect(pickLockTarget([{ x: 0, z: -1.5 }], 0, 0, 0, 1, 30, 70)).toBe(0);
  });

  it('chefes têm prioridade com bias', () => {
    const c = [
      { x: 0, z: 10 },
      { x: 3, z: 12, bias: 0.5 },
    ];
    expect(pickLockTarget(c, 0, 0, 0, 1, 30, 70)).toBe(1);
  });
});

describe('consultas de colisão sem alocação (probe)', () => {
  it('pointInCollider/colliderAt com caixa rotacionada e cilindro', () => {
    const w = flatWorld();
    const box = w.addBox(10, 2, 0, 1, 2, 3, Math.PI / 2, 'climbable');
    const cyl = w.addCylinder(-10, 0, 2, 0, 5, 'rock');
    // caixa girada 90°: hx agora se estende em Z
    expect(pointInCollider(box, 10, 2, 0.9)).toBe(true);
    expect(pointInCollider(box, 12.5, 2, 0)).toBe(true);
    expect(pointInCollider(box, 10, 4.5, 0)).toBe(false);
    expect(pointInCollider(cyl, -10, 4, 1.9)).toBe(true);
    expect(colliderAt(w, 10, 1, 0, 0, true)).toBe(box);
    expect(colliderAt(w, -10, 1, 0, 0, true)).toBe(null);
    expect(colliderTop(box)).toBe(4);
  });

  it('ceilingAbove encontra a base de uma ilha acima', () => {
    const w = flatWorld();
    w.addCylinder(0, 0, 8, 30, 40, 'island');
    expect(ceilingAbove(w, 2, 2, 10, 0.4)).toBe(30);
    expect(ceilingAbove(w, 20, 0, 10, 0.4)).toBe(Infinity);
    expect(ceilingAbove(w, 0, 0, 35, 0.4)).toBe(Infinity);
  });

  it('sphereCast para no terreno e em paredes (câmera)', () => {
    const w = flatWorld(0);
    const o = new THREE.Vector3(0, 2, 0);
    const down = new THREE.Vector3(0, -1, 0);
    expect(sphereCast(w, o, down, 10, 0.25)).toBeCloseTo(1.75, 1);
    w.addBox(0, 2, 5, 3, 3, 0.5, 0, 'wall');
    const fwd = new THREE.Vector3(0, 0, 1);
    expect(sphereCast(w, o, fwd, 10, 0.25)).toBeCloseTo(4.25, 2);
    // árvores ignoradas quando pedido
    const w2 = flatWorld(0);
    w2.addCylinder(0, 5, 0.5, 0, 6, 'tree');
    expect(sphereCast(w2, o, fwd, 10, 0.25, { ignoreTrees: true })).toBe(10);
    expect(sphereCast(w2, o, fwd, 10, 0.25)).toBeCloseTo(4.25, 2);
  });
});
