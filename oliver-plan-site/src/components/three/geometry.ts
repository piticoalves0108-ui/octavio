import * as THREE from "three";

/**
 * Caixa com UV em metros (mapeamento planar por face).
 * Assim a mesma textura serve para uma frente de 30 cm ou um painel de 6 m.
 * `grain: "h"` gira o veio para a horizontal nas faces verticais.
 */
const boxes = new Map<string, THREE.BoxGeometry>();

export function worldBox(w: number, h: number, d: number, grain: "v" | "h" = "v") {
  const key = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${grain}`;
  const hit = boxes.get(key);
  if (hit) return hit;

  const geo = new THREE.BoxGeometry(w, h, d);
  const pos = geo.attributes.position;
  const nor = geo.attributes.normal;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + w / 2;
    const y = pos.getY(i) + h / 2;
    const z = pos.getZ(i) + d / 2;
    const nx = Math.abs(nor.getX(i));
    const ny = Math.abs(nor.getY(i));
    let u: number;
    let v: number;
    if (ny > 0.5) {
      u = x;
      v = z;
    } else if (nx > 0.5) {
      u = z;
      v = y;
    } else {
      u = x;
      v = y;
    }
    if (grain === "h" && ny <= 0.5) [u, v] = [v, u];
    uv.setXY(i, u, v);
  }
  uv.needsUpdate = true;
  boxes.set(key, geo);
  return geo;
}

/** Perfil de vaso para LatheGeometry */
export function vaseProfile(h: number, r: number, neck = 0.45, belly = 0.55) {
  const pts: THREE.Vector2[] = [];
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * h;
    const shape = Math.sin(Math.PI * Math.min(1, t / belly) * 0.5) * (1 - Math.pow(Math.max(0, t - belly) / (1 - belly), 1.6) * (1 - neck));
    pts.push(new THREE.Vector2(Math.max(0.004, r * (0.55 + shape * 0.45)), y));
  }
  return pts;
}
