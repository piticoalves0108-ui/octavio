/**
 * Cenário compartilhado pelo site e pelo estúdio de imagens:
 * chapa de ferro, luzes de estúdio "cinematográficas" e ambiente para reflexos.
 */
import {
  AmbientLight,
  DirectionalLight,
  Group,
  Mesh,
  PMREMGenerator,
  PointLight,
  Scene,
  Vector2,
  type WebGLRenderer,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { lathe, smoothNormals } from './geometry'
import { foodMaterial } from './materials'
import type { Quality, QualitySettings } from './quality'

/** Chapa redonda de ferro fundido, com borda levemente incandescente. */
export function createChapa(quality: Quality, s: QualitySettings, radius = 1.9, heat = 1) {
  const R = radius
  const pts = [
    new Vector2(0, 0),
    new Vector2(R * 0.97, 0),
    new Vector2(R, 0.02),
    new Vector2(R * 1.01, 0.07),
    new Vector2(R * 0.995, 0.11),
    new Vector2(R * 0.975, 0.115),
    new Vector2(R * 0.955, 0.085),
    new Vector2(R * 0.5, 0.08),
    new Vector2(0, 0.08),
  ]
  const geo = lathe(pts, Math.max(64, s.radial))
  smoothNormals(geo)
  const mat = foodMaterial('iron', quality, { params: [R, heat, 0, 0] })
  const mesh = new Mesh(geo, mat)
  mesh.receiveShadow = s.shadows
  mesh.castShadow = false
  return mesh
}

export interface Rig {
  group: Group
  key: DirectionalLight
  rimAmber: DirectionalLight
  rimRed: DirectionalLight
  glow: PointLight
  /** Brilho da brasa por baixo (pisca devagar). */
  update: (time: number) => void
}

/** Luz principal quente, dois contraluzes (âmbar e vermelho) e o brilho da brasa por baixo. */
export function createRig(s: QualitySettings): Rig {
  const group = new Group()
  const ambient = new AmbientLight('#2a1f18', 0.35)
  group.add(ambient)

  const key = new DirectionalLight('#fff1de', 2.5)
  key.position.set(-3.4, 4.2, 5.2)
  key.castShadow = s.shadows
  key.shadow.mapSize.set(s.shadowMapSize, s.shadowMapSize)
  key.shadow.camera.left = -2.8
  key.shadow.camera.right = 2.8
  key.shadow.camera.top = 2.8
  key.shadow.camera.bottom = -2.8
  key.shadow.camera.near = 1
  key.shadow.camera.far = 16
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.025
  key.shadow.radius = 4
  group.add(key)
  group.add(key.target)

  const rimAmber = new DirectionalLight('#ffb347', 6.5)
  rimAmber.position.set(4.5, 2.6, -3.8)
  group.add(rimAmber)

  const rimRed = new DirectionalLight('#ff3b2a', 4)
  rimRed.position.set(-5, 1.2, -2.8)
  group.add(rimRed)

  const fill = new DirectionalLight('#ffd9b0', 0.8)
  fill.position.set(3.5, 0.6, 6.5)
  group.add(fill)

  const glow = new PointLight('#ff6a1f', 5, 6, 2)
  glow.position.set(0, -1.2, 0.6)
  group.add(glow)

  const update = (t: number) => {
    glow.intensity = 4.5 + Math.sin(t * 2.1) * 0.8 + Math.sin(t * 5.3) * 0.4
  }
  return { group, key, rimAmber, rimRed, glow, update }
}

/** Ambiente neutro (RoomEnvironment) para os reflexos de pão, queijo e ferro. */
export function applyEnvironment(renderer: WebGLRenderer, scene: Scene, intensity = 0.4) {
  const pmrem = new PMREMGenerator(renderer)
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = env
  scene.environmentIntensity = intensity
  pmrem.dispose()
  return env
}
