import * as THREE from 'three';

export const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};

/** Suavização exponencial independente de framerate. `lambda` ~ "velocidade" (maior = mais rápido). */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const dampVec3 = (current: THREE.Vector3, target: THREE.Vector3, lambda: number, dt: number) =>
  current.lerp(target, 1 - Math.exp(-lambda * dt));

/** Diferença angular normalizada para [-PI, PI]. */
export const angleDiff = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export const dampAngle = (current: number, target: number, lambda: number, dt: number) =>
  current + angleDiff(current, target) * (1 - Math.exp(-lambda * dt));

export const distXZ = (a: THREE.Vector3, b: THREE.Vector3) => Math.hypot(a.x - b.x, a.z - b.z);
export const distXZSq = (a: THREE.Vector3, b: THREE.Vector3) => {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
};

/** Ângulo (yaw) apontando de `from` para `to` no plano XZ, convenção do three (yaw 0 = +Z). */
export const yawTo = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);

export const forwardFromYaw = (yaw: number, out = new THREE.Vector3()) => out.set(Math.sin(yaw), 0, Math.cos(yaw));

// Vetores temporários reutilizáveis (evitar alocação por frame). Não guardar referências!
export const TMP = {
  v1: new THREE.Vector3(),
  v2: new THREE.Vector3(),
  v3: new THREE.Vector3(),
  v4: new THREE.Vector3(),
  q1: new THREE.Quaternion(),
  m1: new THREE.Matrix4(),
  c1: new THREE.Color(),
};
