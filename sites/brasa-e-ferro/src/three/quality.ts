/**
 * Níveis de qualidade do 3D ("LOD por aparelho").
 * O nível define a densidade das malhas, o número de partículas, sombras,
 * oitavas de ruído nos shaders e a resolução do canvas.
 */
export type Quality = 'high' | 'medium' | 'low'

export interface QualitySettings {
  /** Segmentos ao redor das peças torneadas (pão, carne). */
  radial: number
  /** Subdivisões de queijo, alface, bacon. */
  grid: number
  sesame: number
  smoke: number
  embers: number
  shadows: boolean
  shadowMapSize: number
  maxDpr: number
  antialias: boolean
}

export const QUALITY: Record<Quality, QualitySettings> = {
  high: { radial: 112, grid: 56, sesame: 190, smoke: 120, embers: 110, shadows: true, shadowMapSize: 2048, maxDpr: 2, antialias: true },
  medium: { radial: 72, grid: 40, sesame: 130, smoke: 70, embers: 60, shadows: true, shadowMapSize: 1024, maxDpr: 1.5, antialias: true },
  low: { radial: 44, grid: 24, sesame: 70, smoke: 32, embers: 28, shadows: false, shadowMapSize: 512, maxDpr: 1.25, antialias: false },
}

/** Escolhe o nível pelo aparelho. Dá para forçar com ?qualidade=low|medium|high na URL. */
export function detectQuality(): Quality {
  const forced = new URLSearchParams(location.search).get('qualidade')
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return 'low'
  const cores = nav.hardwareConcurrency || 4
  const memory = nav.deviceMemory ?? 4
  const coarse = matchMedia('(pointer: coarse)').matches
  const small = Math.min(innerWidth, innerHeight) < 600

  if (coarse || small) return cores >= 8 && memory >= 6 ? 'medium' : 'low'
  if (cores <= 4 || memory <= 4) return 'medium'
  return 'high'
}

/**
 * Testa se o navegador tem WebGL2 com aceleração de hardware.
 * Sem GPU (SwiftShader, llvmpipe), compilar os shaders trava a página por
 * vários segundos: nesse caso o hero usa a imagem estática.
 * ?qualidade=... na URL força o 3D mesmo assim (útil para testes).
 */
export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2')
    if (!gl) return false
    if (new URLSearchParams(location.search).has('qualidade')) return true
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer)
  } catch {
    return false
  }
}
