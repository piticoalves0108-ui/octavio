/**
 * Utilitários de geometria procedural.
 */
import { BufferGeometry, Float32BufferAttribute, LatheGeometry, Vector2, Vector3 } from 'three'

export type SurfFn = (j: number, count: number) => [number, number]

/**
 * Torno (lathe) com o atributo extra `aSurf` por ponto do perfil.
 * O perfil deve ir no sentido anti-horário (normais para fora).
 */
export function lathe(points: Vector2[], segments: number, surf?: SurfFn) {
  const geo = new LatheGeometry(points, segments)
  const n = points.length
  const arr = new Float32Array(geo.attributes.position.count * 2)
  if (surf) {
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j < n; j++) {
        const [a, b] = surf(j, n)
        const idx = (i * n + j) * 2
        arr[idx] = a
        arr[idx + 1] = b
      }
    }
  }
  geo.setAttribute('aSurf', new Float32BufferAttribute(arr, 2))
  return geo
}

/** Aplica uma deformação a cada vértice. */
export function deform(geo: BufferGeometry, fn: (v: Vector3, i: number) => void) {
  const pos = geo.attributes.position
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    fn(v, i)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  pos.needsUpdate = true
  return geo
}

/**
 * Recalcula normais suaves somando as normais de vértices na mesma posição.
 * Evita a "costura" visível do torno e de malhas com vértices duplicados.
 */
export function smoothNormals(geo: BufferGeometry, precision = 1e4) {
  geo.computeVertexNormals()
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  const acc = new Map<string, [number, number, number]>()
  const key = (i: number) =>
    `${Math.round(pos.getX(i) * precision)}_${Math.round(pos.getY(i) * precision)}_${Math.round(pos.getZ(i) * precision)}`
  for (let i = 0; i < pos.count; i++) {
    const k = key(i)
    const a = acc.get(k)
    if (a) {
      a[0] += nor.getX(i)
      a[1] += nor.getY(i)
      a[2] += nor.getZ(i)
    } else acc.set(k, [nor.getX(i), nor.getY(i), nor.getZ(i)])
  }
  for (let i = 0; i < pos.count; i++) {
    const a = acc.get(key(i))!
    const l = Math.hypot(a[0], a[1], a[2]) || 1
    nor.setXYZ(i, a[0] / l, a[1] / l, a[2] / l)
  }
  nor.needsUpdate = true
  return geo
}

/**
 * Disco polar (folha de alface, clara do ovo, molho).
 * `radius(theta)` dá a borda; `height(theta, t, r)` dá a altura (t: 0 centro, 1 borda).
 * aSurf.x = t.
 */
export function polarDisc(
  rings: number,
  segments: number,
  radius: (theta: number) => number,
  height: (theta: number, t: number, r: number) => number,
) {
  const positions: number[] = []
  const surf: number[] = []
  const uvs: number[] = []
  const index: number[] = []

  // Centro
  positions.push(0, height(0, 0, 0), 0)
  surf.push(0, 0)
  uvs.push(0.5, 0.5)

  for (let r = 1; r <= rings; r++) {
    const t = r / rings
    for (let s = 0; s < segments; s++) {
      const theta = (s / segments) * Math.PI * 2
      const R = radius(theta) * t
      const x = Math.cos(theta) * R
      const z = Math.sin(theta) * R
      positions.push(x, height(theta, t, R), z)
      surf.push(t, 0)
      uvs.push(0.5 + Math.cos(theta) * t * 0.5, 0.5 + Math.sin(theta) * t * 0.5)
    }
  }

  const ring = (r: number, s: number) => 1 + (r - 1) * segments + (s % segments)
  for (let s = 0; s < segments; s++) index.push(0, ring(1, s + 1), ring(1, s))
  for (let r = 1; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = ring(r, s)
      const b = ring(r, s + 1)
      const c = ring(r + 1, s)
      const d = ring(r + 1, s + 1)
      index.push(a, b, c, b, d, c)
    }
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geo.setAttribute('aSurf', new Float32BufferAttribute(surf, 2))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}

/** Pontos de uma curva amostrada a partir de pontos de controle (Catmull-Rom 2D simples). */
export function sampleProfile(ctrl: [number, number][], count: number) {
  const out: Vector2[] = []
  const n = ctrl.length - 1
  for (let k = 0; k <= count; k++) {
    const u = (k / count) * n
    const i = Math.min(Math.floor(u), n - 1)
    const t = u - i
    const p0 = ctrl[Math.max(i - 1, 0)]
    const p1 = ctrl[i]
    const p2 = ctrl[i + 1]
    const p3 = ctrl[Math.min(i + 2, n)]
    const t2 = t * t
    const t3 = t2 * t
    const f = (a: number, b: number, c: number, d: number) =>
      0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
    out.push(new Vector2(Math.max(0, f(p0[0], p1[0], p2[0], p3[0])), f(p0[1], p1[1], p2[1], p3[1])))
  }
  return out
}

export const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}
