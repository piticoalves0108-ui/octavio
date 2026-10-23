/**
 * Enquadramentos das imagens geradas por `npm run assets`.
 * Cada "shot" monta uma cena com o mesmo 3D do site e posiciona a câmera.
 */
import { Group, Mesh, PlaneGeometry, ShaderMaterial, type PerspectiveCamera, type Scene } from 'three'
import { burgerHero, cardapio } from '../data/site'
import { createBurger, type Recipe } from '../three/burger'
import { friesCone, onionRings } from '../three/extras'
import { bacon, bunBottom, bunTop, cheese, lettuce, patty, sauce, tomato, type BuildCtx } from '../three/layers'
import { rng } from '../three/noise'
import { createEmbers, createSmoke } from '../three/particles'
import { QUALITY } from '../three/quality'
import { createChapa } from '../three/scenery'

export interface ShotCtx {
  scene: Scene
  camera: PerspectiveCamera
  /** pixels por unidade a 1 de distância (para as partículas) */
  pxPerUnit: number
}

export interface Shot {
  id: string
  pasta: 'cardapio' | 'ingredientes' | 'galeria' | 'hero'
  w: number
  h: number
  transparent: boolean
  /** larguras finais geradas (srcset) */
  sizes: number[]
  build: (ctx: ShotCtx) => void
}

const Q = 'high' as const

function look(camera: PerspectiveCamera, pos: [number, number, number], target: [number, number, number], fov = 30) {
  camera.fov = fov
  camera.position.set(...pos)
  camera.lookAt(...target)
  camera.updateProjectionMatrix()
}

/** Fundo com brilho quente no centro e bordas carvão (só nas fotos da galeria). */
function backdrop(scene: Scene, z = -7, glow = '#4a2410') {
  const mat = new ShaderMaterial({
    depthWrite: false,
    uniforms: {},
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      void main(){
        vec2 p = vUv - vec2(0.5, 0.42);
        float d = length(p * vec2(1.0, 1.25));
        vec3 glow = vec3(${hexToVec(glow)});
        vec3 edge = vec3(0.035, 0.032, 0.03);
        vec3 c = mix(glow, edge, smoothstep(0.0, 0.62, d));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
  const plane = new Mesh(new PlaneGeometry(40, 28), mat)
  plane.position.set(0, 1, z)
  plane.renderOrder = -1
  scene.add(plane)
}

function hexToVec(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  // sRGB -> linear aproximado (o ShaderMaterial escreve direto no framebuffer sRGB)
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v / 255).toFixed(4))
  return c.join(',')
}

function burgerOnPlate(scene: Scene, recipe: Recipe, seed: number, x = 0, z = 0, rotY = 0) {
  const b = createBurger(recipe, Q, seed)
  const g = new Group()
  g.add(b.group)
  g.position.set(x, b.height / 2 + 0.08, z)
  g.rotation.y = rotY
  scene.add(g)
  return b
}

function smokeAndEmbers(ctx: ShotCtx, y: number, opts: { smoke?: number; embers?: number; time?: number } = {}) {
  const s = createSmoke(opts.smoke ?? 90, { radius: 0.55, height: 2.6, size: 1.0 })
  s.points.position.set(0, y, 0)
  s.material.uniforms.uTime.value = opts.time ?? 12
  s.setScale(ctx.pxPerUnit)
  s.setOpacity(1.4)
  ctx.scene.add(s.points)
  const e = createEmbers(opts.embers ?? 70, { radius: 2.6, height: 4 })
  e.points.position.set(0, 0, -0.8)
  e.material.uniforms.uTime.value = (opts.time ?? 12) * 1.3
  e.setScale(ctx.pxPerUnit)
  ctx.scene.add(e.points)
}

const recipeOf = (id: string): Recipe => {
  const item = cardapio.itens.find((i) => i.id === id)!
  return { pao: item.pao, camadas: item.camadas, molho: item.molho }
}

// ---------------------------------------------------------------------------

const menuShots: Shot[] = cardapio.itens.map((item, i) => ({
  id: item.id,
  pasta: 'cardapio',
  w: 1000,
  h: 1000,
  transparent: true,
  sizes: [800, 480],
  build: ({ scene, camera }) => {
    const b = createBurger(recipeOf(item.id), Q, 10 + i)
    b.group.rotation.set(0.12, -0.5 + i * 0.7, 0)
    scene.add(b.group)
    const d = 5.2 + b.height * 0.85
    look(camera, [0, 1.45, d], [0, -0.04, 0], 30)
  },
}))

/** Uma camada isolada (ou combinação) para o carrossel de ingredientes. */
function ingredient(id: string, build: (ctx: BuildCtx, root: Group) => void, cam: [number, number, number] = [0, 2.6, 5.6]): Shot {
  return {
    id,
    pasta: 'ingredientes',
    w: 900,
    h: 900,
    transparent: true,
    sizes: [720, 420],
    build: ({ scene, camera }) => {
      const ctx: BuildCtx = { q: Q, s: QUALITY[Q], seed: 21, rand: rng(id.length * 31), below: 1.07 }
      const root = new Group()
      build(ctx, root)
      root.traverse((o) => {
        o.castShadow = true
        o.receiveShadow = true
      })
      scene.add(root)
      look(camera, cam, [0, 0.12, 0], 30)
    },
  }
}

const ingredientShots: Shot[] = [
  ingredient('blend', (ctx, root) => {
    const p = patty('carne', ctx)
    p.object.rotation.set(0.05, 0.4, 0)
    root.add(p.object)
  }),
  ingredient('pao', (ctx, root) => {
    const top = bunTop('gergelim', ctx)
    top.object.position.set(0.15, 0.32, -0.1)
    top.object.rotation.set(-0.25, 0.3, 0.18)
    const bottom = bunBottom('gergelim', ctx)
    bottom.object.position.set(-0.25, -0.35, 0.25)
    root.add(top.object, bottom.object)
  }, [0, 2.2, 6.4]),
  ingredient('queijo', (ctx, root) => {
    const p = patty('carne', ctx)
    const c = cheese('queijo', ctx)
    c.object.position.y = p.height - 0.01
    root.add(p.object, c.object)
    root.position.y = -0.1
  }),
  ingredient('bacon', (ctx, root) => {
    const b = bacon(ctx)
    b.object.scale.setScalar(1.1)
    root.add(b.object)
  }, [0, 3, 5.2]),
  ingredient('folhas', (ctx, root) => {
    const l = lettuce(ctx)
    const t = tomato(ctx)
    t.object.position.y = 0.06
    t.object.scale.setScalar(0.9)
    root.add(l.object, t.object)
  }, [0, 3, 5.4]),
  ingredient('molho', (ctx, root) => {
    const p = patty('carne', ctx)
    const s = sauce('casa', ctx)
    s.object.position.y = p.height - 0.005
    root.add(p.object, s.object)
    root.position.y = -0.1
  }),
]

const galleryShots: Shot[] = [
  {
    id: 'g-classico',
    pasta: 'galeria',
    w: 960,
    h: 1280,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene)
      ctx.scene.add(createChapa(Q, QUALITY[Q], 2.6, 1))
      const b = burgerOnPlate(ctx.scene, { pao: burgerHero.pao, camadas: burgerHero.camadas }, 3, 0, 0, -0.4)
      smokeAndEmbers(ctx, b.height + 0.1)
      look(ctx.camera, [0, 0.9, 6.2], [0, 0.85, 0], 32)
    },
  },
  {
    id: 'g-chapa',
    pasta: 'galeria',
    w: 1280,
    h: 900,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene, -8, '#3a1a0a')
      ctx.scene.add(createChapa(Q, QUALITY[Q], 3.4, 1.3))
      const positions: [number, number][] = [[-1.25, 0.2], [0.95, -0.35], [0.15, 1.2]]
      positions.forEach(([x, z], i) => {
        const bctx: BuildCtx = { q: Q, s: QUALITY[Q], seed: 40 + i, rand: rng(80 + i), below: 1 }
        const p = patty('smash', bctx)
        p.object.position.set(x, 0.08, z)
        p.object.rotation.y = i * 1.7
        p.object.traverse((o) => {
          o.castShadow = true
          o.receiveShadow = true
        })
        ctx.scene.add(p.object)
      })
      smokeAndEmbers(ctx, 0.2, { smoke: 120 })
      look(ctx.camera, [0, 4.6, 5.8], [0, 0, 0.1], 34)
    },
  },
  {
    id: 'g-batata',
    pasta: 'galeria',
    w: 1000,
    h: 1000,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene, -7, '#40200c')
      ctx.scene.add(createChapa(Q, QUALITY[Q], 2.4, 0.6))
      const f = friesCone(Q)
      f.position.y = 0.08
      f.rotation.y = 0.6
      ctx.scene.add(f)
      look(ctx.camera, [0, 1.8, 6.4], [0, 1.15, 0], 32)
    },
  },
  {
    id: 'g-duplo',
    pasta: 'galeria',
    w: 960,
    h: 1280,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene, -7, '#4a1e0c')
      ctx.scene.add(createChapa(Q, QUALITY[Q], 2.6, 1))
      const b = burgerOnPlate(ctx.scene, recipeOf('duplo-ferro'), 15, 0, 0, 0.8)
      smokeAndEmbers(ctx, b.height + 0.1, { smoke: 70 })
      look(ctx.camera, [0.4, 1.3, 6.6], [0, 1.05, 0], 32)
    },
  },
  {
    id: 'g-anatomia',
    pasta: 'galeria',
    w: 960,
    h: 1280,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene, -7, '#3c1c0c')
      const b = createBurger({ pao: 'brioche', camadas: ['alface', 'tomate', 'carne', 'queijo', 'bacon'] }, Q, 8)
      b.explode(1)
      b.group.rotation.set(0.25, 0.5, 0)
      ctx.scene.add(b.group)
      const e = createEmbers(60, { radius: 2.4, height: 4 })
      e.points.position.set(0, -2.4, -1)
      e.material.uniforms.uTime.value = 18
      e.setScale(ctx.pxPerUnit)
      ctx.scene.add(e.points)
      look(ctx.camera, [0, 1.2, 11], [0, 0, 0], 30)
    },
  },
  {
    id: 'g-onion',
    pasta: 'galeria',
    w: 1000,
    h: 1000,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene, -7, '#45220c')
      ctx.scene.add(createChapa(Q, QUALITY[Q], 2.4, 0.8))
      const o = onionRings(Q)
      o.position.y = 0.08
      ctx.scene.add(o)
      smokeAndEmbers(ctx, 1.4, { smoke: 50, embers: 50 })
      look(ctx.camera, [0, 2.4, 6.0], [0, 0.65, 0], 32)
    },
  },
  {
    id: 'g-dupla',
    pasta: 'galeria',
    w: 1280,
    h: 900,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene, -9, '#43200c')
      ctx.scene.add(createChapa(Q, QUALITY[Q], 3.8, 1))
      const a = burgerOnPlate(ctx.scene, recipeOf('ferro-smash'), 21, -1.35, 0.1, 0.3)
      burgerOnPlate(ctx.scene, recipeOf('bacon-fumaca'), 22, 1.35, -0.2, -0.6)
      smokeAndEmbers(ctx, a.height + 0.1, { smoke: 60 })
      look(ctx.camera, [0, 2.0, 8.6], [0, 0.8, 0], 32)
    },
  },
  {
    id: 'g-bacon',
    pasta: 'galeria',
    w: 1000,
    h: 1000,
    transparent: false,
    sizes: [1200, 720],
    build: (ctx) => {
      backdrop(ctx.scene, -7, '#4a200e')
      ctx.scene.add(createChapa(Q, QUALITY[Q], 2.6, 1))
      const b = burgerOnPlate(ctx.scene, recipeOf('bacon-fumaca'), 31, 0, 0, 1.9)
      smokeAndEmbers(ctx, b.height + 0.1, { smoke: 70 })
      look(ctx.camera, [0, 2.1, 6.4], [0, 0.8, 0], 32)
    },
  },
]

const heroShots: Shot[] = [
  {
    id: 'poster',
    pasta: 'hero',
    w: 1200,
    h: 1200,
    transparent: true,
    sizes: [1000, 600],
    build: ({ scene, camera }) => {
      const b = createBurger({ pao: burgerHero.pao, camadas: burgerHero.camadas }, Q, 3)
      b.group.rotation.set(0.16, 0.35, 0)
      scene.add(b.group)
      look(camera, [0, 0.95, 8.4], [0, 0, 0], 30)
    },
  },
]

export const SHOTS: Shot[] = [...heroShots, ...menuShots, ...ingredientShots, ...galleryShots]
