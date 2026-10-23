/**
 * Iluminação estilizada global: altera os trechos de shader do three.js (uma vez,
 * antes de qualquer material compilar), então TODOS os materiais iluminados
 * (terreno, estruturas, vegetação, personagens, inimigos) ganham o mesmo visual:
 *  - terminador suave entre luz e sombra (meio "cel"), em vez do Lambert puro;
 *  - borda iluminada pelo sol (materiais com o define STYL_RIM);
 *  - luz atravessando folhas e grama contra o sol (define STYL_TRANSLUCENT);
 *  - gradação de cor (sombras frias, luzes quentes, pretos levantados, saturação)
 *    aplicada no tone mapping (render direto) e no pós-processamento.
 * Cada material pode ajustar com defines: STYL_CEL (0..1), STYL_RIM (força), STYL_TRANSLUCENT (força).
 */
import * as THREE from 'three';
import { STYLE } from '../data/graphics';

const f = (n: number) => n.toFixed(4);
const v3 = (a: readonly number[]) => `vec3(${a.map(f).join(', ')})`;

/** Função de gradação (GLSL) compartilhada com o pós-processamento. */
export const STYLE_GRADE_GLSL = /* glsl */ `
vec3 stylGrade( vec3 c ) {
  float stL = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  c *= mix( ${v3(STYLE.shadowTint)}, ${v3(STYLE.lightTint)}, smoothstep( 0.12, 0.7, stL ) );
  c = c * ( 1.0 - ${f(STYLE.lift)} ) + ${f(STYLE.lift)} * vec3( 0.86, 0.93, 1.0 );
  float stL2 = dot( c, vec3( 0.2126, 0.7152, 0.0722 ) );
  return clamp( mix( vec3( stL2 ), c, ${f(STYLE.saturation)} ), 0.0, 1.0 );
}
`;

let installed = false;

export function installStylizedLighting() {
  if (installed) return;
  installed = true;
  const C = THREE.ShaderChunk as unknown as Record<string, string>;

  // função de luz difusa estilizada (disponível para todos os modelos de luz)
  C.lights_pars_begin += /* glsl */ `
#ifndef STYL_CEL
#define STYL_CEL ${f(STYLE.cel)}
#endif
float stylNdotL( float x ) {
  float stSoft = smoothstep( ${f(STYLE.celFrom)}, ${f(STYLE.celTo)}, x );
  return mix( saturate( x ), stSoft, float( STYL_CEL ) );
}
`;

  const physOld = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\n\tvec3 irradiance = dotNL * directLight.color;';
  if (!C.lights_physical_pars_fragment.includes(physOld)) console.warn('[stylize] trecho físico mudou; luz estilizada parcial');
  C.lights_physical_pars_fragment = C.lights_physical_pars_fragment.replace(
    physOld,
    'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\n\tvec3 irradiance = stylNdotL( dot( geometryNormal, directLight.direction ) ) * directLight.color;',
  );
  const lambOld = 'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );\n\tvec3 irradiance = dotNL * directLight.color;';
  if (!C.lights_lambert_pars_fragment.includes(lambOld)) console.warn('[stylize] trecho Lambert mudou; luz estilizada parcial');
  C.lights_lambert_pars_fragment = C.lights_lambert_pars_fragment.replace(lambOld, 'vec3 irradiance = stylNdotL( dot( geometryNormal, directLight.direction ) ) * directLight.color;');

  // borda iluminada e translucidez (só onde o material pede)
  C.lights_fragment_end += /* glsl */ `
#if NUM_DIR_LIGHTS > 0
  #if defined( STYL_RIM )
  #ifndef STYL_RIM_MASK
  #define STYL_RIM_MASK 1.0
  #endif
  {
    float stNV = 1.0 - saturate( dot( geometryNormal, geometryViewDir ) );
    float stRim = smoothstep( ${f(STYLE.rimFrom)}, 1.0, stNV );
    float stSunSide = saturate( dot( geometryNormal, directionalLights[ 0 ].direction ) * 0.6 + 0.4 );
    reflectedLight.directDiffuse += stRim * stSunSide * directionalLights[ 0 ].color * material.diffuseColor * float( STYL_RIM ) * ( STYL_RIM_MASK );
  }
  #endif
  #if defined( STYL_TRANSLUCENT )
  #ifndef STYL_TRANSLUCENT_MASK
  #define STYL_TRANSLUCENT_MASK 1.0
  #endif
  {
    // contra a luz: o sol atrás da folha (em relação à câmera) acende as bordas finas
    float stBack = saturate( dot( -geometryViewDir, directionalLights[ 0 ].direction ) );
    float stThru = pow( stBack, 3.0 ) * ( 0.35 + 0.65 * saturate( dot( -geometryNormal, directionalLights[ 0 ].direction ) * 0.5 + 0.5 ) );
    reflectedLight.directDiffuse += stThru * directionalLights[ 0 ].color * material.diffuseColor * float( STYL_TRANSLUCENT ) * ( STYL_TRANSLUCENT_MASK );
  }
  #endif
#endif
`;

  // gradação no tone mapping do render direto (o pós-processamento chama stylGrade no passe final)
  C.tonemapping_pars_fragment += STYLE_GRADE_GLSL;
  C.tonemapping_fragment = C.tonemapping_fragment.replace(
    'gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );',
    'gl_FragColor.rgb = stylGrade( toneMapping( gl_FragColor.rgb ) );',
  );
}

type WithDefines = THREE.Material & { defines?: Record<string, string> };

/** Acrescenta defines a um material (o three os inclui na chave do programa). */
export function addDefines(m: THREE.Material, d: Record<string, string>): THREE.Material {
  const w = m as WithDefines;
  w.defines = { ...(w.defines ?? {}), ...d };
  return m;
}

/** Marca um material para receber borda iluminada (personagens, inimigos, folhagem). */
export function styleRim(m: THREE.Material, strength: number = STYLE.rim): THREE.Material {
  return addDefines(m, { STYL_RIM: f(strength) });
}

/**
 * Marca um material como folhagem/grama translúcida. `mask` (opcional) é uma expressão GLSL
 * do fragment shader (ex.: um varying) que limita o efeito às folhas.
 */
export function styleFoliage(m: THREE.Material, translucency: number = STYLE.translucency, rim = STYLE.rim * 0.5, cel = STYLE.cel, mask?: string): THREE.Material {
  const d: Record<string, string> = { STYL_TRANSLUCENT: f(translucency), STYL_RIM: f(rim), STYL_CEL: f(cel) };
  if (mask) {
    d.STYL_TRANSLUCENT_MASK = mask;
    d.STYL_RIM_MASK = mask;
  }
  return addDefines(m, d);
}

installStylizedLighting();
