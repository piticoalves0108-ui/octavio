/**
 * Pós-processamento (só com q.bloom): RenderPass (HDR, half-float, MSAA opcional)
 * → UnrealBloomPass (meia resolução) → passe final único que faz tone mapping ACES,
 * conversão sRGB e gradação leve (saturação/contraste, vinheta, tinta noturna,
 * tinta roxa da corrupção e clarão do relâmpago). 3 etapas, custo controlado.
 * O tamanho é conferido a cada quadro com o drawing buffer do renderer (pega
 * resize e mudança de pixel ratio sem depender da ordem dos listeners).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { POST } from '../data/weather';

/** Passe final: tone mapping + sRGB + gradação. */
class GradePass extends Pass {
  readonly uniforms = {
    tDiffuse: { value: null as THREE.Texture | null },
    toneMappingExposure: { value: 1 },
    uVignette: { value: POST.vignette },
    uSaturation: { value: POST.saturation },
    uContrast: { value: POST.contrast },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uCorruption: { value: 0 },
    uCorruptTint: { value: new THREE.Color(POST.corruptionTint) },
    uFlash: { value: 0 },
  };
  readonly material: THREE.RawShaderMaterial;
  private quad: FullScreenQuad;

  constructor(toneMapping: THREE.ToneMapping) {
    super();
    const defines: Record<string, string> = { SRGB_TRANSFER: '' };
    if (toneMapping === THREE.ACESFilmicToneMapping) defines.ACES_FILMIC_TONE_MAPPING = '';
    else if (toneMapping === THREE.AgXToneMapping) defines.AGX_TONE_MAPPING = '';
    else if (toneMapping === THREE.NeutralToneMapping) defines.NEUTRAL_TONE_MAPPING = '';
    else if (toneMapping === THREE.ReinhardToneMapping) defines.REINHARD_TONE_MAPPING = '';
    this.material = new THREE.RawShaderMaterial({
      name: 'gradacao',
      uniforms: this.uniforms,
      defines,
      vertexShader: GRADE_VERT,
      fragmentShader: GRADE_FRAG,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.uniforms.toneMappingExposure.value = renderer.toneMappingExposure;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }

  override dispose() {
    this.material.dispose();
    this.quad.dispose();
  }
}

export interface PostParams {
  bloomStrength: number;
  vignette: number;
  saturation: number;
  contrast: number;
  /** Tinta multiplicativa (linear). */
  tint: THREE.Color;
  corruption: number;
  flash: number;
}

export class PostFX {
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: GradePass;
  private size = new THREE.Vector2();
  private lastW = 0;
  private lastH = 0;
  readonly samples: number;

  constructor(
    private renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    msaa: boolean,
  ) {
    renderer.getDrawingBufferSize(this.size);
    const w = Math.max(1, this.size.x);
    const h = Math.max(1, this.size.y);
    this.samples = msaa && renderer.capabilities.isWebGL2 ? POST.msaaSamples : 0;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: this.samples });
    rt.texture.name = 'pos_hdr';
    this.composer = new EffectComposer(renderer, rt);
    // o composer trabalha em pixels do drawing buffer: pixel ratio 1
    this.composer.setPixelRatio(1);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), POST.bloomStrength, POST.bloomRadius, POST.bloomThreshold);
    this.composer.addPass(this.bloom);
    this.grade = new GradePass(renderer.toneMapping);
    this.composer.addPass(this.grade);
    this.composer.setSize(w, h);
    this.lastW = w;
    this.lastH = h;
  }

  setParams(p: PostParams) {
    this.bloom.strength = p.bloomStrength;
    const u = this.grade.uniforms;
    u.uVignette.value = p.vignette;
    u.uSaturation.value = p.saturation;
    u.uContrast.value = p.contrast;
    u.uTint.value.copy(p.tint);
    u.uCorruption.value = p.corruption;
    u.uFlash.value = p.flash;
  }

  render() {
    this.renderer.getDrawingBufferSize(this.size);
    if (this.size.x !== this.lastW || this.size.y !== this.lastH) {
      this.lastW = this.size.x;
      this.lastH = this.size.y;
      this.composer.setSize(Math.max(1, this.lastW), Math.max(1, this.lastH));
    }
    // vários renderer.render() por quadro: soma as estatísticas (draw calls/triângulos)
    // de todos os passes em vez de ficar só com o último (o monitor de desempenho lê info)
    const info = this.renderer.info;
    const auto = info.autoReset;
    info.autoReset = false;
    info.reset();
    this.composer.render();
    info.autoReset = auto;
  }

  dispose() {
    this.composer.renderTarget1.dispose();
    this.composer.renderTarget2.dispose();
    this.bloom.dispose();
    this.grade.dispose();
  }
}

const GRADE_VERT = /* glsl */ `
precision highp float;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GRADE_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uVignette;
uniform float uSaturation;
uniform float uContrast;
uniform vec3 uTint;
uniform float uCorruption;
uniform vec3 uCorruptTint;
uniform float uFlash;
#include <tonemapping_pars_fragment>
#include <colorspace_pars_fragment>
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  c += vec3(0.75, 0.82, 1.0) * uFlash * 0.18;
  c *= uTint;
  #if defined( ACES_FILMIC_TONE_MAPPING )
    c = ACESFilmicToneMapping(c);
  #elif defined( AGX_TONE_MAPPING )
    c = AgXToneMapping(c);
  #elif defined( NEUTRAL_TONE_MAPPING )
    c = NeutralToneMapping(c);
  #elif defined( REINHARD_TONE_MAPPING )
    c = ReinhardToneMapping(c);
  #endif
  // gradação em espaço de exibição (linear 0..1 após o tone mapping)
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSaturation);
  c = clamp((c - 0.5) * uContrast + 0.5, 0.0, 1.0);
  vec2 q = vUv - 0.5;
  float r = dot(q, q) * 2.0;
  float vig = smoothstep(0.15, 1.0, r);
  c *= 1.0 - vig * uVignette;
  // corrupção: bordas tingidas de roxo, pulsando de leve
  c = mix(c, c * uCorruptTint * 1.6, vig * uCorruption * ${POST.corruptionVignette.toFixed(2)} + uCorruption * ${POST.corruptionTintAmount.toFixed(2)});
  gl_FragColor = sRGBTransferOETF(vec4(c, 1.0));
}
`;
