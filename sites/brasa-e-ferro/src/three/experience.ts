/**
 * Cena 3D do hero.
 *
 * - Hambúrguer procedural girando devagar, flutuando sobre a chapa.
 * - Reage ao mouse (rotação + parallax) e ao scroll (gira, aproxima e explode
 *   em camadas).
 * - Fumaça e brasas em partículas WebGL.
 * - Para de renderizar fora da tela e com a aba oculta; baixa a resolução se
 *   o FPS cair.
 */
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  MathUtils,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three'
import { createBurger, explodedHeight, type Burger, type Recipe } from './burger'
import { sharedTime } from './materials'
import { createEmbers, createSmoke, type ParticleSystem } from './particles'
import { QUALITY, type Quality, type QualitySettings } from './quality'
import { applyEnvironment, createRig, type Rig } from './scenery'

export interface LayerAnchor {
  camada: string
  /** centro da camada na tela (px, relativo ao container) */
  x: number
  y: number
  /** raio aparente da camada na tela (px) */
  r: number
}

export interface ExperienceOptions {
  quality: Quality
  reducedMotion: boolean
  recipe: Recipe
  onFrame?: (anchors: LayerAnchor[], explode: number) => void
}

const damp = (a: number, b: number, lambda: number, dt: number) => MathUtils.damp(a, b, lambda, dt)

export class BurgerExperience {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly camera = new PerspectiveCamera(30, 1, 0.1, 60)

  private q: QualitySettings
  private burger: Burger
  private holder = new Group()
  private shadow: Mesh<PlaneGeometry, MeshBasicMaterial>
  private smoke: ParticleSystem
  private embers: ParticleSystem
  private rig: Rig
  private last = 0
  private running = false
  private disposed = false
  private ro: ResizeObserver
  private io: IntersectionObserver
  private visible = true

  // Estado alvo (entrada) e estado atual (suavizado)
  private pointer = { x: 0, y: 0, cx: 0, cy: 0 }
  private scroll = { target: 0, current: 0 }
  private intro = { target: 0, current: 0 }
  private spin = 0
  private dpr = 1
  private fps = { frames: 0, time: 0 }
  private tmp = new Vector3()
  private tmp2 = new Vector3()
  private size = { w: 1, h: 1 }
  private dist = 9

  constructor(
    private container: HTMLElement,
    private opts: ExperienceOptions,
  ) {
    this.q = QUALITY[opts.quality]
    this.renderer = new WebGLRenderer({
      antialias: this.q.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = this.q.shadows
    this.renderer.shadowMap.type = PCFShadowMap
    this.renderer.setClearColor(0x000000, 0)
    this.dpr = Math.min(window.devicePixelRatio || 1, this.q.maxDpr)
    this.renderer.setPixelRatio(this.dpr)
    const canvas = this.renderer.domElement
    canvas.setAttribute('aria-hidden', 'true')
    canvas.className = 'block h-full w-full'
    container.appendChild(canvas)

    applyEnvironment(this.renderer, this.scene, 0.3)

    this.rig = createRig(this.q)
    this.scene.add(this.rig.group)

    this.burger = createBurger(opts.recipe, opts.quality, 3)
    this.holder.add(this.burger.group)
    this.scene.add(this.holder)
    this.rig.key.target = this.holder

    // Sombra suave sob o hambúrguer (mais barata e mais elegante que um chão).
    this.shadow = createBlobShadow()
    this.scene.add(this.shadow)

    this.smoke = createSmoke(this.q.smoke, { radius: 0.6, height: 2.8, size: 1.0 })
    this.scene.add(this.smoke.points)
    this.embers = createEmbers(this.q.embers, { radius: 2.3, height: 4.2 })
    this.scene.add(this.embers.points)

    this.camera.position.set(0, 1.1, 9)

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting
      this.updateLoop()
    })
    this.io.observe(container)
    document.addEventListener('visibilitychange', this.updateLoop)
    this.resize()
  }

  /** Compila os shaders antes de mostrar (evita travadinha no primeiro frame). */
  async warmup() {
    this.update(0.016)
    try {
      await this.renderer.compileAsync(this.scene, this.camera)
    } catch {
      /* navegadores sem KHR_parallel_shader_compile compilam no primeiro render */
    }
    this.renderer.render(this.scene, this.camera)
  }

  start() {
    this.running = true
    this.last = performance.now()
    this.updateLoop()
  }

  /** -1..1 em cada eixo. */
  setPointer(x: number, y: number) {
    this.pointer.x = x
    this.pointer.y = y
  }

  /** Progresso do scroll na seção do hero (0..1). */
  setScroll(p: number) {
    this.scroll.target = MathUtils.clamp(p, 0, 1)
  }

  /** 0 = antes da entrada, 1 = entrada concluída. */
  setIntro(t: number) {
    this.intro.target = t
  }

  private updateLoop = () => {
    if (this.disposed) return
    const should = this.running && this.visible && document.visibilityState === 'visible'
    this.renderer.setAnimationLoop(should ? this.tick : null)
    if (should) this.last = performance.now()
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.size = { w, h }
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    const pxPerUnit = h / (2 * Math.tan(MathUtils.degToRad(this.camera.fov / 2)))
    this.smoke.setScale(pxPerUnit * this.dpr)
    this.embers.setScale(pxPerUnit * this.dpr)
    if (!this.running) this.renderer.render(this.scene, this.camera)
  }

  /** Distância da câmera para caber uma altura e uma largura (em unidades de mundo). */
  private fitDistance(height: number, width: number, fillH: number, fillW: number) {
    const t = Math.tan(MathUtils.degToRad(this.camera.fov / 2))
    const dH = height / 2 / (t * fillH)
    const dW = width / 2 / (t * this.camera.aspect * fillW)
    return Math.max(dH, dW)
  }

  private tick = () => {
    const now = performance.now()
    const dt = Math.min((now - this.last) / 1000, 1 / 20)
    this.last = now
    this.update(dt)
    this.renderer.render(this.scene, this.camera)
    this.monitor(dt)
  }

  private update(dt: number) {
    const rm = this.opts.reducedMotion
    const time = (sharedTime.value += dt)
    this.rig.update(time)
    this.smoke.material.uniforms.uTime.value = time
    this.embers.material.uniforms.uTime.value = time

    this.pointer.cx = damp(this.pointer.cx, this.pointer.x, 3.2, dt)
    this.pointer.cy = damp(this.pointer.cy, this.pointer.y, 3.2, dt)
    this.scroll.current = rm ? this.scroll.target : damp(this.scroll.current, this.scroll.target, 6, dt)
    this.intro.current = rm ? this.intro.target : damp(this.intro.current, this.intro.target, 2.4, dt)

    const p = this.scroll.current
    const intro = this.intro.current
    const portrait = this.camera.aspect < 0.9

    // Fases do scroll: aproximação (0 → 0.2), explosão (0.16 → 0.6).
    const focus = MathUtils.smoothstep(p, 0, 0.2)
    const explode = MathUtils.smoothstep(p, 0.16, 0.6)
    // Na entrada, as camadas chegam separadas e se encaixam.
    const assemble = (1 - intro) * 0.55
    this.burger.explode(Math.max(explode, assemble))

    // Rotação: giro contínuo + scroll + mouse.
    if (!rm) this.spin += dt * (0.22 * (1 - explode * 0.6))
    const rotY = this.spin + p * Math.PI * 1.25 + this.pointer.cx * 0.5 + (1 - intro) * -1.2
    const rotX = 0.16 + explode * 0.12 + this.pointer.cy * 0.12
    this.holder.rotation.set(rotX, rotY, 0)

    // Flutuação, parallax e entrada (cai de cima).
    const bob = rm ? 0 : Math.sin(time * 1.15) * 0.05
    const baseY = portrait ? 0.05 : -0.02
    // No celular, o hambúrguer explodido vai para a esquerda para os rótulos caberem à direita.
    const halfW = Math.tan(MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect * this.dist
    const shiftX = portrait ? -explode * halfW * 0.36 : 0
    this.holder.position.set(
      this.pointer.cx * 0.12 + shiftX,
      baseY + bob + (1 - intro) * 2.6 + focus * 0.05,
      0,
    )
    const scale = MathUtils.lerp(0.82, 1, intro)
    this.holder.scale.setScalar(scale)

    // Sombra no "chão" e brilho da brasa por baixo; somem na vista explodida.
    const floorY = -this.burger.height / 2 - 0.32 + baseY
    this.shadow.position.set(this.holder.position.x, floorY, 0)
    this.shadow.scale.setScalar(2.6 * (1 - bob * 1.5) * MathUtils.lerp(0.6, 1, intro))
    this.shadow.material.opacity = 0.75 * intro * (1 - explode)
    this.rig.glow.position.y = floorY - 0.3

    // Fumaça segue o topo do hambúrguer; some na vista explodida.
    this.smoke.points.position.set(this.holder.position.x, this.holder.position.y + this.burger.height * 0.35, 0)
    this.smoke.setOpacity((1 - explode) * intro * (rm ? 0.5 : 1))
    this.embers.points.position.set(0, floorY - 0.4, -0.6)
    this.embers.setOpacity(intro * (1 - explode * 0.5) * (rm ? 0.4 : 1))

    // Câmera: enquadra o hambúrguer montado ou explodido.
    const hAssembled = this.burger.height + 0.9
    const hExploded = explodedHeight(this.burger) + 0.5
    const height = MathUtils.lerp(hAssembled, hExploded, explode)
    const width = 2.5 + explode * 0.8
    const fillH = portrait ? 0.5 : MathUtils.lerp(0.52, 0.74, focus)
    const fillW = portrait ? MathUtils.lerp(0.74, 0.52, explode) : 0.5
    const dist = this.fitDistance(height, width, fillH, fillW)
    this.dist = dist
    this.camera.position.set(
      this.pointer.cx * -0.25,
      0.95 + this.pointer.cy * 0.15 - explode * 0.4,
      dist,
    )
    this.camera.lookAt(this.pointer.cx * 0.05, -explode * 0.08, 0)

    if (this.opts.onFrame) this.opts.onFrame(this.anchors(), explode)
  }

  /** Posição de cada camada na tela, para os rótulos da vista explodida. */
  private anchors(): LayerAnchor[] {
    const { w, h } = this.size
    const right = this.tmp2.set(1, 0, 0).applyQuaternion(this.camera.quaternion)
    return this.burger.layers.map((l) => {
      l.object.getWorldPosition(this.tmp)
      this.tmp.y += (l.height / 2) * this.holder.scale.y
      const cx = this.tmp.x, cy = this.tmp.y, cz = this.tmp.z
      this.tmp.project(this.camera)
      const x = (this.tmp.x * 0.5 + 0.5) * w
      const y = (-this.tmp.y * 0.5 + 0.5) * h
      this.tmp.set(cx, cy, cz).addScaledVector(right, Math.min(l.radius, 1.1) * this.holder.scale.x).project(this.camera)
      const r = Math.abs((this.tmp.x * 0.5 + 0.5) * w - x)
      return { camada: l.camada, x, y, r }
    })
  }

  /** Se o FPS ficar baixo, reduz a resolução (até 1x). */
  private monitor(dt: number) {
    this.fps.frames++
    this.fps.time += dt
    if (this.fps.time < 2) return
    const fps = this.fps.frames / this.fps.time
    this.fps.frames = 0
    this.fps.time = 0
    if (fps < 40 && this.dpr > 1) {
      this.dpr = Math.max(1, this.dpr - 0.25)
      this.renderer.setPixelRatio(this.dpr)
      this.resize()
    }
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    this.ro.disconnect()
    this.io.disconnect()
    document.removeEventListener('visibilitychange', this.updateLoop)
    this.burger.dispose()
    this.smoke.dispose()
    this.embers.dispose()
    this.shadow.geometry.dispose()
    this.shadow.material.map?.dispose()
    this.shadow.material.dispose()
    this.scene.environment?.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}

/** Sombra de contato: gradiente radial num plano deitado. */
function createBlobShadow() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.85)')
  grad.addColorStop(0.45, 'rgba(0,0,0,0.45)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  const mesh = new Mesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ map: new CanvasTexture(c), transparent: true, depthWrite: false }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = -1
  return mesh
}
