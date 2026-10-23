/**
 * Estúdio: renderiza um "shot" (?shot=pasta/id) e expõe o PNG em window.__STUDIO__.
 * Usado pelo scripts/render-assets.mjs; também dá para abrir no navegador em dev.
 */
import { ACESFilmicToneMapping, MathUtils, PCFShadowMap, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import { sharedTime } from '../three/materials'
import { QUALITY } from '../three/quality'
import { applyEnvironment, createRig } from '../three/scenery'
import { SHOTS } from './shots'

declare global {
  interface Window {
    __STUDIO__?: { done: boolean; png?: string; error?: string; shots: { key: string; w: number; h: number; transparent: boolean; sizes: number[] }[] }
  }
}

const shots = SHOTS.map((s) => ({ key: `${s.pasta}/${s.id}`, w: s.w, h: s.h, transparent: s.transparent, sizes: s.sizes }))
window.__STUDIO__ = { done: false, shots }

const params = new URLSearchParams(location.search)
const key = params.get('shot')
const scale = Number(params.get('escala') ?? '1')

async function run() {
  if (!key) {
    document.body.innerHTML = `<p style="padding:16px">Escolha um shot:</p><ul>${shots
      .map((s) => `<li><a style="color:#e8a33d" href="?shot=${s.key}">${s.key}</a></li>`)
      .join('')}</ul>`
    window.__STUDIO__!.done = true
    return
  }
  const shot = SHOTS.find((s) => `${s.pasta}/${s.id}` === key)
  if (!shot) throw new Error(`shot não encontrado: ${key}`)

  const w = Math.round(shot.w * scale)
  const h = Math.round(shot.h * scale)
  const renderer = new WebGLRenderer({ antialias: true, alpha: shot.transparent, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setClearColor(0x0d0d0d, shot.transparent ? 0 : 1)
  document.body.appendChild(renderer.domElement)

  const scene = new Scene()
  applyEnvironment(renderer, scene, 0.3)
  const rig = createRig(QUALITY.high)
  rig.update(1.3)
  scene.add(rig.group)
  const camera = new PerspectiveCamera(30, w / h, 0.1, 80)
  const pxPerUnit = h / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)))
  sharedTime.value = 4.2
  shot.build({ scene, camera, pxPerUnit })
  camera.aspect = w / h
  camera.updateProjectionMatrix()

  renderer.render(scene, camera)
  window.__STUDIO__!.png = renderer.domElement.toDataURL('image/png')
  window.__STUDIO__!.done = true
}

run().catch((e) => {
  console.error(e)
  window.__STUDIO__!.error = String(e?.stack ?? e)
  window.__STUDIO__!.done = true
})
