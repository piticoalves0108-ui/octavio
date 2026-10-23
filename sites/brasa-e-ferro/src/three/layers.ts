/**
 * Camadas do hambúrguer, todas modeladas no código.
 *
 * Cada função devolve um Object3D com a origem na BASE da camada (y = 0) e a
 * altura que ela ocupa na pilha. O raio de referência do pão é ~1.
 */
import {
  CapsuleGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Object3D,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector2,
  Vector3,
  BoxGeometry,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  type Material,
  type MeshPhysicalMaterialParameters,
} from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { foodMaterial } from './materials'
import { fbm3, rng, simplex3 } from './noise'
import { deform, lathe, polarDisc, smoothNormals, smoothstep } from './geometry'
import type { Quality, QualitySettings } from './quality'

export interface BuildCtx {
  q: Quality
  s: QualitySettings
  seed: number
  rand: () => number
  /** Raio útil da camada de baixo (para o queijo e o molho escorrerem). */
  below: number
}

export interface BuiltLayer {
  object: Object3D
  height: number
  radius: number
}

const TAU = Math.PI * 2

// ---------------------------------------------------------------------------
// Pães
// ---------------------------------------------------------------------------

export type BunStyle = 'gergelim' | 'brioche' | 'australiano'

const BUN_LOOK: Record<BunStyle, { colors: string[]; height: number; m: number; physical: MeshPhysicalMaterialParameters; dust: number; heel: number }> = {
  gergelim: {
    colors: ['#7c3a0d', '#c9873a', '#e6c48a', '#a3602a'],
    height: 0.68,
    m: 2.5,
    physical: { roughness: 0.5, clearcoat: 0.22, clearcoatRoughness: 0.45 },
    dust: 0,
    heel: 0.25,
  },
  brioche: {
    colors: ['#5e2606', '#a85e1c', '#ecc88a', '#9a5a22'],
    height: 0.74,
    m: 2.2,
    physical: { roughness: 0.34, clearcoat: 0.65, clearcoatRoughness: 0.32 },
    dust: 0,
    heel: 0.27,
  },
  australiano: {
    colors: ['#331a0d', '#57301c', '#6b4630', '#4a2c1a'],
    height: 0.64,
    m: 2.6,
    physical: { roughness: 0.62, sheen: 0.45, sheenColor: new Color('#c89070') },
    dust: 1,
    heel: 0.24,
  },
}

function bunMaterial(style: BunStyle, ctx: BuildCtx) {
  const look = BUN_LOOK[style]
  return foodMaterial('bun', ctx.q, {
    colors: look.colors,
    params: [0, 0, look.dust, 0],
    seed: ctx.seed * 0.37,
    physical: look.physical,
  })
}

/** Parte de cima do pão (copa), com gergelim opcional. */
export function bunTop(style: BunStyle, ctx: BuildCtx): BuiltLayer {
  const look = BUN_LOOK[style]
  const R = 1.03
  const y0 = 0.12
  const H = look.height
  const pts: Vector2[] = []
  const surf: [number, number][] = []

  // Face de corte (miolo), do centro para a borda.
  const cut = 9
  for (let k = 0; k < cut; k++) {
    const t = k / cut
    pts.push(new Vector2(0.95 * (1 - (1 - t) * (1 - t)), 0))
    surf.push([0, 0])
  }
  // Borda arredondada de baixo.
  const edge = 6
  for (let k = 0; k <= edge; k++) {
    const phi = (k / edge) * (Math.PI / 2)
    pts.push(new Vector2(0.95 + (R - 0.95) * Math.sin(phi), y0 - y0 * Math.cos(phi)))
    surf.push([smoothstep(0, 1, k / edge), 0])
  }
  // Cúpula (superelipse).
  const dome = 26
  for (let k = 1; k <= dome; k++) {
    const s = k / dome
    const th = s * (Math.PI / 2)
    const c = Math.pow(Math.cos(th), 2 / look.m)
    const sn = Math.pow(Math.sin(th), 2 / look.m)
    pts.push(new Vector2(k === dome ? 0 : R * c, y0 + (H - y0) * sn))
    surf.push([1, s])
  }

  const geo = lathe(pts, ctx.s.radial, (j) => surf[j])
  const seed = ctx.seed
  deform(geo, (v) => {
    const r = Math.hypot(v.x, v.z)
    if (r < 1e-5 && v.y < 1e-4) return
    const n = fbm3(v.x * 1.8 + seed, v.y * 1.8, v.z * 1.8, 3)
    const k = 1 + n * 0.035
    v.x *= k * 1.012
    v.z *= k * 0.99
    if (v.y > 0.005) v.y += fbm3(v.x * 2.4, v.y * 2 + seed, v.z * 2.4, 2) * 0.03 * smoothstep(0.05, 0.4, v.y)
  })
  smoothNormals(geo)

  const mat = bunMaterial(style, ctx)
  const mesh = new Mesh(geo, mat)
  const group = new Group()
  group.add(mesh)

  if (style === 'gergelim' && ctx.s.sesame > 0) group.add(sesameSeeds(geo, ctx))

  return { object: group, height: H, radius: R }
}

/** Sementes de gergelim espalhadas pela cúpula (InstancedMesh). */
function sesameSeeds(bunGeo: BufferGeometry, ctx: BuildCtx) {
  // Recorta só os triângulos da cúpula para sortear posições sobre ela.
  const pos = bunGeo.attributes.position
  const surf = bunGeo.attributes.aSurf
  const index = bunGeo.index!
  const tri: number[] = []
  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2)
    const ok = [a, b, c].every((k) => surf.getX(k) > 0.95 && surf.getY(k) > 0.14)
    if (!ok) continue
    for (const k of [a, b, c]) tri.push(pos.getX(k), pos.getY(k), pos.getZ(k))
  }
  const domeGeo = new BufferGeometry()
  domeGeo.setAttribute('position', new Float32BufferAttribute(tri, 3))
  domeGeo.computeVertexNormals()
  const sampler = new MeshSurfaceSampler(new Mesh(domeGeo))
  // A tipagem não traz setRandomGenerator, mas ele existe: semente fixa = mesmo pão sempre.
  ;(sampler as unknown as { setRandomGenerator: (f: () => number) => void }).setRandomGenerator(rng(ctx.seed + 99))
  sampler.build()

  const seedGeo = ctx.q === 'low' ? new SphereGeometry(1, 6, 4) : new SphereGeometry(1, 10, 6)
  const mat = foodMaterial('sesame', ctx.q)
  const mesh = new InstancedMesh(seedGeo, mat, ctx.s.sesame)
  const p = new Vector3()
  const n = new Vector3()
  const up = new Vector3(0, 1, 0)
  const q = new Quaternion()
  const spin = new Quaternion()
  const m = new Matrix4()
  const sc = new Vector3()
  const r = rng(ctx.seed + 7)
  for (let i = 0; i < ctx.s.sesame; i++) {
    sampler.sample(p, n)
    q.setFromUnitVectors(up, n)
    spin.setFromAxisAngle(up, r() * TAU)
    q.multiply(spin)
    const s = 0.85 + r() * 0.35
    sc.set(0.03 * s, 0.009 * s, 0.017 * s)
    p.addScaledVector(n, 0.004)
    m.compose(p, q, sc)
    mesh.setMatrixAt(i, m)
  }
  mesh.instanceMatrix.needsUpdate = true
  domeGeo.dispose()
  return mesh
}

/** Base do pão. */
export function bunBottom(style: BunStyle, ctx: BuildCtx): BuiltLayer {
  const look = BUN_LOOK[style]
  const H = look.heel
  const pts: Vector2[] = []
  const surf: [number, number][] = []
  // Fundo (crosta), do centro para fora.
  const bottom = 8
  for (let k = 0; k < bottom; k++) {
    const t = k / bottom
    pts.push(new Vector2(0.9 * (1 - (1 - t) * (1 - t)), 0))
    surf.push([1, 0.55])
  }
  // Lateral arredondada.
  const side = 14
  for (let k = 0; k <= side; k++) {
    const phi = (k / side) * Math.PI
    const x = 0.9 + 0.12 * Math.sin(phi)
    const y = (H * 0.5) * (1 - Math.cos(phi))
    pts.push(new Vector2(x, y * 0.94))
    surf.push([1, 0.25 * (1 - Math.sin(phi))])
  }
  // Face de corte (miolo tostado), da borda para o centro.
  const top = 9
  for (let k = 1; k <= top; k++) {
    const t = k / top
    pts.push(new Vector2(0.9 * (1 - t * t) + (k === top ? 0 : 0), H * 0.94 + 0.012 * Math.sin(t * Math.PI)))
    surf.push([k <= 1 ? 0.5 : 0, 0])
  }
  const geo = lathe(pts, ctx.s.radial, (j) => surf[j])
  const seed = ctx.seed + 3
  deform(geo, (v) => {
    const r = Math.hypot(v.x, v.z)
    if (r < 1e-5) return
    const k = 1 + fbm3(v.x * 1.8 + seed, v.y * 2, v.z * 1.8, 3) * 0.03
    v.x *= k * 1.01
    v.z *= k * 0.992
  })
  smoothNormals(geo)
  const mesh = new Mesh(geo, bunMaterial(style, ctx))
  return { object: mesh, height: H * 0.94, radius: 1.02 }
}

// ---------------------------------------------------------------------------
// Carnes
// ---------------------------------------------------------------------------

type PattyStyle = 'carne' | 'smash' | 'veggie'

const PATTY_LOOK: Record<PattyStyle, { R: number; T: number; colors: string[]; params: [number, number, number, number]; lace: number }> = {
  carne: { R: 1.07, T: 0.27, colors: ['#5e3a24', '#3b2213', '#140a05', '#7c4727'], params: [1, 9.5, 0, 0], lace: 0 },
  smash: { R: 1.16, T: 0.11, colors: ['#563320', '#311a0c', '#120803', '#8a4f26'], params: [0, 0, 0, 1], lace: 1 },
  veggie: { R: 1.0, T: 0.24, colors: ['#9a6a2c', '#6a4318', '#24160a', '#b8853a'], params: [1, 9.5, 1, 0], lace: 0 },
}

export function patty(style: PattyStyle, ctx: BuildCtx): BuiltLayer {
  const look = PATTY_LOOK[style]
  const { R, T } = look
  const pts: Vector2[] = []
  const flat = 18
  const edgeR = Math.min(0.1, T * 0.5)
  for (let k = 0; k < flat; k++) pts.push(new Vector2((R - edgeR) * (k / flat), 0))
  const edge = 14
  for (let k = 0; k <= edge; k++) {
    const phi = (k / edge) * Math.PI
    pts.push(new Vector2(R - edgeR + edgeR * Math.sin(phi), (T / 2) * (1 - Math.cos(phi))))
  }
  for (let k = 1; k <= flat; k++) pts.push(new Vector2((R - edgeR) * (1 - k / flat), T))

  const geo = lathe(pts, ctx.s.radial)
  const seed = ctx.seed * 1.7 + (style === 'smash' ? 11 : 0)
  deform(geo, (v) => {
    const r = Math.hypot(v.x, v.z)
    const cx = r > 1e-5 ? v.x / r : 1
    const cz = r > 1e-5 ? v.z / r : 0
    const rn = r / R
    // Borda irregular (grande) + renda crocante (pequena, só no smash).
    let k = 1 + fbm3(cx * 1.6 + seed, v.y * 3, cz * 1.6, 3) * 0.055 * smoothstep(0.5, 1, rn)
    if (look.lace) k += fbm3(cx * 7 + seed, v.y * 8, cz * 7, 3) * 0.09 * smoothstep(0.85, 1, rn)
    v.x *= k
    v.z *= k
    // Superfície com relevo de carne moída e leve abaulado no centro.
    const bump = fbm3(v.x * 2.6 + seed, v.y * 3, v.z * 2.6, 3) * 0.02 + simplex3(v.x * 7, v.y * 7, v.z * 7 + seed) * 0.006
    if (v.y > T * 0.55) v.y += bump + 0.022 * (1 - rn * rn) * (T / 0.27)
    else if (v.y < T * 0.45) v.y -= Math.abs(bump) * 0.5
  })
  smoothNormals(geo)
  const mat = foodMaterial('patty', ctx.q, { colors: look.colors, params: look.params, seed: seed * 0.1 })
  return { object: new Mesh(geo, mat), height: T + 0.02, radius: R }
}

// ---------------------------------------------------------------------------
// Queijos
// ---------------------------------------------------------------------------

export function cheese(style: 'queijo' | 'queijo-branco', ctx: BuildCtx): BuiltLayer {
  const white = style === 'queijo-branco'
  const size = white ? 1.82 : 2.0
  const thick = white ? 0.055 : 0.034
  const g = ctx.s.grid
  const geo = new BoxGeometry(size, thick, size, g, 1, g)
  geo.translate(0, thick / 2, 0)
  const Rp = ctx.below * (white ? 0.98 : 0.8)
  const rot = (ctx.rand() - 0.5) * 0.9 + Math.PI / 4
  const cr = Math.cos(rot)
  const sr = Math.sin(rot)
  const seed = ctx.seed + 21
  const droop = white ? 0.35 : 1

  const corner = size * 0.6
  const shape = (v: Vector3) => {
    // gira o quadrado para os cantos não ficarem alinhados com a câmera
    const x = v.x * cr - v.z * sr
    const z = v.x * sr + v.z * cr
    v.x = x
    v.z = z
    // arredonda os cantos da fatia
    const r0 = Math.hypot(v.x, v.z)
    if (r0 > corner) {
      v.x *= corner / r0
      v.z *= corner / r0
    }
    const r = Math.hypot(v.x, v.z)
    const over = Math.max(0, r - Rp)
    const sag = Math.min(0.4, 0.55 * over + 1.1 * over * over) * droop
    const pull = 1 - over * 0.16 * droop
    v.x *= pull
    v.z *= pull
    v.y -= sag
    v.y += simplex3(v.x * 2.5 + seed, 0, v.z * 2.5) * 0.008
  }
  deform(geo, shape)
  smoothNormals(geo)

  const mat = foodMaterial('cheese', ctx.q, white
    ? { colors: ['#f2e3bd', '#a8773a'], params: [0.55, 1, 0, 0], seed: ctx.seed, physical: { roughness: 0.55, clearcoat: 0.15 } }
    : { colors: ['#f0a020', '#c97a10'], params: [0.12, 0, 0, 0], seed: ctx.seed })
  const group = new Group()
  group.add(new Mesh(geo, mat))

  // Gotas de queijo escorrendo nos cantos (só o cheddar).
  if (!white) {
    const corners = [[1, 1], [-1, 1], [1, -1], [-1, -1]].filter(() => ctx.rand() > 0.35)
    for (const [cx, cz] of corners) {
      const tip = new Vector3(cx * size * 0.46, 0, cz * size * 0.46)
      shape(tip)
      const len = 0.06 + ctx.rand() * 0.1
      const drip = new Mesh(new CapsuleGeometry(0.028, len, 4, 10), mat)
      drip.position.set(tip.x * 0.985, tip.y - len * 0.5, tip.z * 0.985)
      drip.scale.set(1, 1, 0.75)
      group.add(drip)
    }
  }
  return { object: group, height: thick, radius: Rp }
}

// ---------------------------------------------------------------------------
// Bacon
// ---------------------------------------------------------------------------

export function bacon(ctx: BuildCtx): BuiltLayer {
  const group = new Group()
  const mat = foodMaterial('bacon', ctx.q, { seed: ctx.seed * 0.3 })
  const strips = 2
  for (let s = 0; s < strips; s++) {
    const L = 2.45 + ctx.rand() * 0.15
    const W = 0.3 + ctx.rand() * 0.05
    const geo = new BoxGeometry(L, 0.026, W, Math.round(ctx.s.grid * 1.6), 1, 5)
    const ph = ctx.rand() * TAU
    const ph2 = ctx.rand() * TAU
    deform(geo, (v) => {
      const x = v.x
      const ax = Math.abs(x) / (L / 2)
      const wave = Math.sin(x * 4.4 + ph) * 0.045 + Math.sin(x * 9.3 + ph2) * 0.015
      v.y += wave + 0.07 * smoothstep(0.8, 1.05, ax) - 0.1 * smoothstep(0.86, 1.0, ax) * (Math.sin(ph) > 0 ? 1 : 0.4)
      v.z *= 1 + 0.12 * simplex3(x * 2, ph, 0)
      v.z += Math.sin(x * 1.6 + ph2) * 0.05
      // torção leve
      const tw = Math.sin(x * 2.2 + ph) * 0.12
      const y = v.y
      v.y = y + v.z * tw * 0.3
    })
    smoothNormals(geo)
    const mesh = new Mesh(geo, mat)
    mesh.position.set(0, 0.045 + s * 0.012, (s - 0.5) * 0.36)
    mesh.rotation.y = (ctx.rand() - 0.5) * 0.35
    group.add(mesh)
  }
  group.rotation.y = ctx.rand() * TAU
  return { object: group, height: 0.075, radius: 1.1 }
}

// ---------------------------------------------------------------------------
// Folhas, tomate, cebola, picles, jalapeño
// ---------------------------------------------------------------------------

export function lettuce(ctx: BuildCtx): BuiltLayer {
  const group = new Group()
  const mat = foodMaterial('lettuce', ctx.q, { seed: ctx.seed * 0.21 })
  const leaves = ctx.q === 'low' ? 1 : 2
  for (let l = 0; l < leaves; l++) {
    const seed = ctx.seed + l * 13.7
    const rings = ctx.q === 'low' ? 7 : 12
    const segs = ctx.s.grid * 3
    const geo = polarDisc(
      rings,
      segs,
      (th) => 1.06 + 0.1 * fbm3(Math.cos(th) * 1.3 + seed, 0, Math.sin(th) * 1.3, 3) + 0.035 * Math.sin(th * 7 + seed),
      (th, t) => {
        const ruffle =
          0.07 * Math.pow(t, 2.4) * Math.sin(th * 15 + 3 * fbm3(Math.cos(th) + seed, t, Math.sin(th), 2)) +
          0.025 * Math.pow(t, 2) * Math.sin(th * 33 + seed)
        const sag = -0.1 * Math.pow(smoothstep(0.72, 1, t), 1.4)
        return ruffle + sag + 0.012 * simplex3(Math.cos(th) * t * 3, seed, Math.sin(th) * t * 3)
      },
    )
    smoothNormals(geo)
    const mesh = new Mesh(geo, mat)
    mesh.rotation.y = l * 1.3 + ctx.rand()
    mesh.position.y = 0.035 + l * 0.022
    mesh.scale.setScalar(1 - l * 0.07)
    group.add(mesh)
  }
  return { object: group, height: 0.07, radius: 1.15 }
}

export function tomato(ctx: BuildCtx): BuiltLayer {
  const group = new Group()
  const r = 0.47
  const h = 0.075
  const geo = new CylinderGeometry(r, r * 0.99, h, Math.max(24, Math.round(ctx.s.radial / 2)), 1)
  geo.translate(0, h / 2, 0)
  const skin = foodMaterial('tomatoSkin', ctx.q, { seed: ctx.seed })
  const slices = 3
  const base = ctx.rand() * TAU
  for (let i = 0; i < slices; i++) {
    const flesh = foodMaterial('tomatoFlesh', ctx.q, { seed: ctx.seed + i * 3.1, params: [r, 0, 0, 0] })
    const mesh = new Mesh(geo, [skin, flesh, flesh] as Material[])
    const a = base + (i / slices) * TAU
    mesh.position.set(Math.cos(a) * 0.44, i * 0.006, Math.sin(a) * 0.44)
    mesh.rotation.set((ctx.rand() - 0.5) * 0.08, ctx.rand() * TAU, (ctx.rand() - 0.5) * 0.08)
    group.add(mesh)
  }
  return { object: group, height: h + 0.01, radius: 0.92 }
}

export function onion(style: 'cebola' | 'cebola-roxa', ctx: BuildCtx): BuiltLayer {
  const red = style === 'cebola-roxa'
  const parts: BufferGeometry[] = []
  const count = red ? 8 : ctx.q === 'low' ? 12 : 22
  const m = new Matrix4()
  const r = rng(ctx.seed + 31)
  for (let i = 0; i < count; i++) {
    const R = 0.12 + r() * (red ? 0.22 : 0.16)
    const arc = red ? TAU : 1.6 + r() * 3.2
    const tube = red ? 0.02 : 0.024
    const g = new TorusGeometry(R, tube, 6, red ? 40 : 18, arc)
    g.rotateX(Math.PI / 2)
    g.scale(1, 0.65, 1)
    const d = Math.sqrt(r()) * (red ? 0.55 : 0.75)
    const a = r() * TAU
    m.makeRotationY(r() * TAU)
    m.setPosition(Math.cos(a) * d, 0.02 + r() * 0.02, Math.sin(a) * d)
    g.applyMatrix4(m)
    g.deleteAttribute('uv')
    parts.push(g)
  }
  const geo = mergeGeometries(parts)!
  parts.forEach((p) => p.dispose())
  const mat = red
    ? foodMaterial('onion', ctx.q, { colors: ['#8c2f6a', '#f4e6f0'], params: [0.0, 0, 0, 0], seed: ctx.seed })
    : foodMaterial('onion', ctx.q, { seed: ctx.seed })
  return { object: new Mesh(geo, mat), height: 0.045, radius: 0.9 }
}

function discs(kind: 'pickle' | 'jalapeno', ctx: BuildCtx, count: number, radius: number, spread: number) {
  const geo = new CylinderGeometry(radius, radius * 0.97, 0.028, 20, 1)
  geo.translate(0, 0.014, 0)
  const mat = foodMaterial(kind, ctx.q, { params: [radius, 0, 0, 0], seed: ctx.seed })
  const mesh = new InstancedMesh(geo, mat, count)
  const o = new Object3D()
  const r = rng(ctx.seed + (kind === 'pickle' ? 41 : 43))
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU + r() * 0.5
    const d = i === 0 ? 0 : spread * (0.6 + r() * 0.4)
    o.position.set(Math.cos(a) * d, r() * 0.012, Math.sin(a) * d)
    o.rotation.set((r() - 0.5) * 0.12, r() * TAU, (r() - 0.5) * 0.12)
    o.updateMatrix()
    mesh.setMatrixAt(i, o.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

export function pickles(ctx: BuildCtx): BuiltLayer {
  return { object: discs('pickle', ctx, 5, 0.21, 0.52), height: 0.035, radius: 0.8 }
}

export function jalapenos(ctx: BuildCtx): BuiltLayer {
  return { object: discs('jalapeno', ctx, 7, 0.15, 0.55), height: 0.035, radius: 0.75 }
}

// ---------------------------------------------------------------------------
// Ovo e molho
// ---------------------------------------------------------------------------

export function egg(ctx: BuildCtx): BuiltLayer {
  const group = new Group()
  const seed = ctx.seed + 51
  const white = polarDisc(
    ctx.q === 'low' ? 6 : 10,
    ctx.s.grid * 2,
    (th) => 0.98 + 0.14 * fbm3(Math.cos(th) * 1.5 + seed, 0, Math.sin(th) * 1.5, 3),
    (th, t) => 0.05 * (1 - t * t) - 0.05 * smoothstep(0.8, 1, t) + 0.006 * simplex3(Math.cos(th) * 3, seed, Math.sin(th) * 3),
  )
  smoothNormals(white)
  group.add(new Mesh(white, foodMaterial('eggWhite', ctx.q, { seed, side: 2 })))
  const yolk = new Mesh(new SphereGeometry(0.3, 32, 16, 0, TAU, 0, Math.PI / 2), foodMaterial('yolk', ctx.q))
  yolk.scale.set(1, 0.55, 1)
  yolk.position.set(0.1, 0.035, -0.06)
  group.add(yolk)
  return { object: group, height: 0.08, radius: 1.0 }
}

const SAUCE_COLORS: Record<string, string> = {
  casa: '#e8b06a',
  barbecue: '#5a1c0c',
  paprica: '#d9662c',
  verde: '#9db55a',
  ervas: '#cfd4a0',
}

export function sauce(color: string, ctx: BuildCtx): BuiltLayer {
  const seed = ctx.seed + 61
  const R0 = ctx.below * 0.86
  const lobes = 5 + Math.floor(ctx.rand() * 3)
  const phase = ctx.rand() * TAU
  const geo = polarDisc(
    ctx.q === 'low' ? 6 : 10,
    ctx.s.grid * 2,
    (th) => R0 + 0.06 * fbm3(Math.cos(th) * 2 + seed, 0, Math.sin(th) * 2, 2) + 0.24 * Math.pow(Math.max(0, Math.sin(th * lobes + phase)), 8),
    (_th, _t, r) => 0.012 - Math.max(0, r - ctx.below * 0.92) * 1.6,
  )
  smoothNormals(geo)
  const mat = foodMaterial('sauce', ctx.q, { colors: [SAUCE_COLORS[color] ?? color], seed, side: 2 })
  return { object: new Mesh(geo, mat), height: 0.014, radius: R0 }
}
