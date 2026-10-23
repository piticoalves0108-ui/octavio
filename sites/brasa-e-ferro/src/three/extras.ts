/**
 * Acompanhamentos usados só nas imagens da galeria: batata no cone e onion rings.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  Object3D,
  TorusGeometry,
} from 'three'
import { deform, smoothNormals } from './geometry'
import { foodMaterial } from './materials'
import { fbm3, rng } from './noise'
import type { Quality } from './quality'

/** Cone de papel com batatas rústicas. */
export function friesCone(q: Quality) {
  const group = new Group()
  const cone = new Mesh(new CylinderGeometry(0.72, 0.42, 1.5, 64, 1, true), foodMaterial('paper', q))
  cone.position.y = 0.75
  group.add(cone)
  const bottom = new Mesh(new CylinderGeometry(0.42, 0.42, 0.02, 48), foodMaterial('paper', q))
  bottom.position.y = 0.01
  group.add(bottom)

  const count = 46
  const len = 1.25
  const geo = new BoxGeometry(0.1, len, 0.1, 1, 6, 1)
  deform(geo, (v) => {
    v.x *= 1 + fbm3(v.y * 2, 1, 0) * 0.15
    v.z *= 1 + fbm3(v.y * 2, 2, 0) * 0.15
  })
  smoothNormals(geo)
  const mesh = new InstancedMesh(geo, foodMaterial('fries', q, { params: [len / 2, 0, 0, 0] }), count)
  const o = new Object3D()
  const r = rng(5)
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.5
    o.position.set(Math.cos(a) * d, 1.45 + r() * 0.35, Math.sin(a) * d)
    o.rotation.set((r() - 0.5) * 0.6 + Math.sin(a) * d * 0.5, r() * Math.PI, (r() - 0.5) * 0.6 - Math.cos(a) * d * 0.5)
    o.scale.set(1, 0.75 + r() * 0.45, 1)
    o.updateMatrix()
    mesh.setMatrixAt(i, o.matrix)
  }
  group.add(mesh)
  group.traverse((m) => {
    m.castShadow = true
    m.receiveShadow = true
  })
  return group
}

/** Pilha de anéis de cebola empanados. */
export function onionRings(q: Quality) {
  const group = new Group()
  const mat = foodMaterial('batter', q, { seed: 4 })
  const r = rng(9)
  for (let i = 0; i < 5; i++) {
    const R = 0.5 + r() * 0.12
    const geo = new TorusGeometry(R, 0.16, 24, 96)
    geo.rotateX(Math.PI / 2)
    const seed = i * 3.3
    deform(geo, (v) => {
      const n = fbm3(v.x * 4 + seed, v.y * 4, v.z * 4, 3)
      v.multiplyScalar(1 + n * 0.035)
      v.y *= 0.82
    })
    smoothNormals(geo)
    const ring = new Mesh(geo, mat)
    ring.position.set((r() - 0.5) * 0.35, 0.14 + i * 0.25, (r() - 0.5) * 0.35)
    ring.rotation.set((r() - 0.5) * 0.35, r() * Math.PI, (r() - 0.5) * 0.35)
    ring.castShadow = true
    ring.receiveShadow = true
    group.add(ring)
  }
  return group
}
