/**
 * Monta um hambúrguer a partir de uma receita (camadas de baixo para cima)
 * e controla a vista explodida.
 */
import { Group, Mesh, type Object3D } from 'three'
import type { Camada, Pao } from '../data/site'
import {
  bacon,
  bunBottom,
  corn,
  ham,
  onionRingsLayer,
  pineapple,
  plantain,
  sausageSlices,
  shreddedBeef,
  sticks,
  bunTop,
  cheese,
  egg,
  jalapenos,
  lettuce,
  onion,
  patty,
  pickles,
  sauce,
  tomato,
  type BuildCtx,
  type BuiltLayer,
} from './layers'
import { rng } from './noise'
import { QUALITY, type Quality } from './quality'

export type CamadaExtra = Camada

export interface Recipe {
  pao: Pao
  camadas: CamadaExtra[]
  molho?: string
}

export interface StackLayer {
  camada: CamadaExtra | 'pao-base' | 'pao-topo'
  object: Object3D
  baseY: number
  height: number
  radius: number
  /** rotação base (para o giro da vista explodida) */
  rotY: number
}

export interface Burger {
  group: Group
  layers: StackLayer[]
  height: number
  /** Espaço entre camadas na vista explodida. */
  gap: number
  /** 0 = montado, 1 = totalmente explodido. */
  explode: (t: number) => void
  dispose: () => void
}

/** Espaço entre camadas na vista explodida (diminui quando há muitas camadas). */
const gapFor = (layers: number) => Math.max(0.24, Math.min(0.36, 4.2 / Math.max(1, layers - 1)))

export function createBurger(recipe: Recipe, quality: Quality, seed = 1): Burger {
  const s = QUALITY[quality]
  const rand = rng(seed * 7919)
  const ctx: BuildCtx = { q: quality, s, seed, rand, below: 1 }

  const built: { camada: StackLayer['camada']; layer: BuiltLayer }[] = []
  const add = (camada: StackLayer['camada'], layer: BuiltLayer) => {
    built.push({ camada, layer })
    ctx.below = Math.max(0.6, layer.radius)
    ctx.seed += 1.37
  }

  add('pao-base', bunBottom(recipe.pao, ctx))
  for (const c of recipe.camadas) {
    switch (c) {
      case 'carne':
      case 'costela':
      case 'smash':
      case 'veggie':
        add(c, patty(c, ctx))
        break
      case 'queijo':
      case 'mussarela':
      case 'queijo-branco':
        add(c, cheese(c, ctx))
        break
      case 'creme-queijo':
        add(c, sauce('creme-queijo', ctx))
        break
      case 'presunto':
        add(c, ham(ctx))
        break
      case 'salsicha':
      case 'calabresa':
        add(c, sausageSlices(c, ctx))
        break
      case 'carne-seca':
        add(c, shreddedBeef(ctx))
        break
      case 'batata-palha':
      case 'cebola-crispy':
        add(c, sticks(c, ctx))
        break
      case 'aneis-cebola':
        add(c, onionRingsLayer(ctx))
        break
      case 'abacaxi':
      case 'abacaxi-mel':
        add(c, pineapple(ctx, c === 'abacaxi-mel'))
        break
      case 'milho':
        add(c, corn(ctx))
        break
      case 'banana-terra':
        add(c, plantain(ctx))
        break
      case 'bacon':
        add(c, bacon(ctx))
        break
      case 'alface':
        add(c, lettuce(ctx))
        break
      case 'tomate':
        add(c, tomato(ctx))
        break
      case 'cebola':
      case 'cebola-roxa':
        add(c, onion(c, ctx))
        break
      case 'picles':
        add(c, pickles(ctx))
        break
      case 'jalapeno':
        add(c, jalapenos(ctx))
        break
      case 'ovo':
        add(c, egg(ctx))
        break
      case 'molho':
        add(c, sauce(recipe.molho ?? 'casa', ctx))
        break
      default:
        break
    }
  }
  add('pao-topo', bunTop(recipe.pao, ctx))

  // Empilha as camadas com uma leve sobreposição (o pão "aperta" o recheio).
  const group = new Group()
  const stack = new Group()
  group.add(stack)
  const layers: StackLayer[] = []
  let y = 0
  for (const { camada, layer } of built) {
    const holder = new Group()
    holder.add(layer.object)
    holder.position.y = y
    stack.add(holder)
    layers.push({ camada, object: holder, baseY: y, height: layer.height, radius: layer.radius, rotY: 0 })
    y += layer.height - 0.006
  }
  const height = y
  stack.position.y = -height / 2

  group.traverse((o) => {
    if ((o as Mesh).isMesh) {
      o.castShadow = s.shadows
      o.receiveShadow = s.shadows
    }
  })

  const GAP = gapFor(layers.length)
  const explode = (t: number) => {
    const n = layers.length
    const e = t * t * (3 - 2 * t)
    layers.forEach((l, i) => {
      l.object.position.y = l.baseY + i * GAP * e
      l.object.rotation.y = l.rotY + e * (i % 2 ? 0.35 : -0.35) * (1 - i / n)
      l.object.rotation.z = e * 0.04 * (i % 2 ? 1 : -1)
    })
    stack.position.y = -(height + (n - 1) * GAP * e) / 2
  }

  const dispose = () => {
    group.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      m.geometry.dispose()
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      mats.forEach((mat) => mat.dispose())
    })
  }

  return { group, layers, height, gap: GAP, explode, dispose }
}

/** Altura total do hambúrguer explodido (para enquadrar a câmera). */
export function explodedHeight(b: Burger) {
  return b.height + (b.layers.length - 1) * b.gap
}
