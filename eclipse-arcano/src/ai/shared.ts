import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import { WATER_LEVEL } from '../data/world';

/**
 * Utilitários compartilhados da IA: vetores temporários (zero alocação por quadro),
 * ângulos, chão e água. Os temporários são de uso imediato — nunca guarde referências.
 */
export const V1 = new THREE.Vector3();
export const V2 = new THREE.Vector3();
export const V3 = new THREE.Vector3();
export const V4 = new THREE.Vector3();
export const V5 = new THREE.Vector3();
export const V6 = new THREE.Vector3();

export const TAU = Math.PI * 2;

/** Diferença angular normalizada em (-π, π]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  else if (d <= -Math.PI) d += TAU;
  return d;
}

/** Gira `from` em direção a `to` no máximo `maxStep` rad. */
export function turnTowards(from: number, to: number, maxStep: number): number {
  const d = angleDiff(from, to);
  if (Math.abs(d) <= maxStep) return to;
  return from + Math.sign(d) * maxStep;
}

/** Yaw (convenção do projeto: 0 = +Z) de a para b. */
export function yawTo(ax: number, az: number, bx: number, bz: number): number {
  return Math.atan2(bx - ax, bz - az);
}

export function distXZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function dist2XZ(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

/** Chão (terreno + pisos caminháveis) sob (x,z), sem "subir" em telhados. */
export function groundAt(ctx: GameContext, x: number, z: number, fromY: number): number {
  return ctx.physics.groundHeight(x, z, fromY);
}

/** Água funda (impede andar). */
export function isDeepWater(ctx: GameContext, x: number, z: number, depth = 1.1): boolean {
  return ctx.heightfield.heightAt(x, z) < WATER_LEVEL - depth;
}

/** Ponto de mira (centro do corpo) do alvo. */
export function aimPoint(e: Entity, out: THREE.Vector3): THREE.Vector3 {
  return out.set(e.position.x, e.position.y + e.height * 0.55, e.position.z);
}

/** Sorteio em [a, b]. */
export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

/** Horas de jogo absolutas (dia*24 + hora) — para respawn. */
export function gameHours(ctx: GameContext): number {
  return ctx.clock.day * 24 + ctx.clock.hours;
}

/** O ponto está à vista da câmera (frustum aproximado por cone + distância + linha de visão)? */
export function visibleToCamera(ctx: GameContext, p: THREE.Vector3, maxDist = 90, checkLos = true): boolean {
  const cam = ctx.camera;
  const dx = p.x - cam.position.x;
  const dy = p.y + 1 - cam.position.y;
  const dz = p.z - cam.position.z;
  const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (d > maxDist) return false;
  cam.getWorldDirection(V6);
  const cosHalf = Math.cos(THREE.MathUtils.degToRad(Math.min(85, cam.fov * 0.5 * Math.max(1, cam.aspect)) + 8));
  if (d > 0.01 && (V6.x * dx + V6.y * dy + V6.z * dz) / d < cosHalf) return false;
  if (!checkLos) return true;
  V5.set(p.x, p.y + 1, p.z);
  return ctx.physics.lineOfSight(cam.position, V5);
}
