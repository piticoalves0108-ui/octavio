/**
 * Acompanhamento usado só na imagem da galeria: pilha de anéis de cebola.
 */
import { Group, Mesh, TorusGeometry } from 'three'
import { deform, smoothNormals } from './geometry'
import { foodMaterial } from './materials'
import { fbm3, rng } from './noise'
import type { Quality } from './quality'

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
