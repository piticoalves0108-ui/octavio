import type * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import { isDeepWater } from './shared';

/**
 * Busca de cobertura (arqueiros): usa colisores próximos (rochas, muros, prédios, objetos)
 * como escudo — o ponto fica atrás do colisor em relação ao alvo, dentro da distância
 * preferida de tiro e não muito longe do atirador.
 */
export function findCover(ctx: GameContext, self: Entity, target: Entity, rMin: number, rMax: number, out: THREE.Vector3): boolean {
  const p = self.position;
  const tp = target.position;
  let best = -Infinity;
  let found = false;
  const mid = (rMin + rMax) * 0.5;
  for (const c of ctx.physics.near(p.x, p.z, 16)) {
    if (c.tag !== 'rock' && c.tag !== 'wall' && c.tag !== 'building' && c.tag !== 'prop' && c.tag !== 'tree') continue;
    let cx: number;
    let cz: number;
    let r: number;
    let top: number;
    if (c.type === 'cylinder') {
      cx = c.x;
      cz = c.z;
      r = c.radius;
      top = c.y1;
      if (c.tag === 'tree' && r < 0.45) continue; // troncos finos não cobrem
    } else {
      cx = c.x;
      cz = c.z;
      r = Math.min(c.hx, c.hz) * 0.5 + Math.max(c.hx, c.hz) * 0.5;
      top = c.y + c.hy;
    }
    if (r < 0.35 || r > 6) continue;
    const g = ctx.heightfield.heightAt(cx, cz);
    if (top - g < 1.3) continue; // baixo demais para cobrir
    const dx = cx - tp.x;
    const dz = cz - tp.z;
    const d = Math.hypot(dx, dz);
    if (d < 1) continue;
    const off = r + self.radius + 0.5;
    const px = cx + (dx / d) * off;
    const pz = cz + (dz / d) * off;
    const dt = d + off;
    if (dt < rMin * 0.8 || dt > rMax + 4) continue;
    const ds = Math.hypot(px - p.x, pz - p.z);
    if (ds > 18) continue;
    if (isDeepWater(ctx, px, pz)) continue;
    const score = -ds - Math.abs(dt - mid) * 0.35 + (c.tag === 'tree' ? -2 : 0);
    if (score > best) {
      best = score;
      out.set(px, p.y, pz);
      found = true;
    }
  }
  return found;
}
