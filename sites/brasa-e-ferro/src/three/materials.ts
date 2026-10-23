/**
 * Materiais procedurais dos ingredientes.
 *
 * Cada material é um MeshPhysicalMaterial do Three.js com um trecho GLSL
 * injetado (onBeforeCompile) que calcula, por pixel, a cor, a rugosidade, o
 * relevo (bump) e a emissão. Nada de textura para baixar: o hambúrguer inteiro
 * pesa 0 KB de imagem e fica nítido em qualquer resolução.
 */
import {
  Color,
  DoubleSide,
  FrontSide,
  MeshPhysicalMaterial,
  Vector4,
  type MeshPhysicalMaterialParameters,
  type Side,
} from 'three'
import { NOISE_GLSL, PERTURB_GLSL } from './glsl'
import type { Quality } from './quality'

export type FoodKind =
  | 'bun'
  | 'patty'
  | 'cheese'
  | 'bacon'
  | 'lettuce'
  | 'tomatoSkin'
  | 'tomatoFlesh'
  | 'onion'
  | 'pickle'
  | 'jalapeno'
  | 'eggWhite'
  | 'yolk'
  | 'sauce'
  | 'sesame'
  | 'iron'
  | 'fries'
  | 'batter'
  | 'paper'
  | 'ham'
  | 'sausage'
  | 'pineapple'
  | 'corn'
  | 'generic'

export interface FoodOptions {
  colors?: string[]
  params?: [number, number, number, number]
  seed?: number
  bump?: number
  physical?: MeshPhysicalMaterialParameters
  side?: Side
}

/** Relógio compartilhado por todos os materiais (brilho da chapa, etc.). */
export const sharedTime = { value: 0 }

/**
 * Corpo da função `foodSurface` de cada ingrediente.
 * Entradas: vObjPos (posição no objeto), vObjNormal, vUv0, vSurf (atributo
 * extra de cada geometria), vInst (deslocamento da instância), uC1..uC4, uP, uSeed.
 * Saídas: col (cor linear), rough (multiplicador da rugosidade), h (altura do
 * relevo, adimensional) e emis (emissão).
 */
const KIND_GLSL: Record<FoodKind, string> = {
  // Pão: crosta dourada (vSurf.x = 1) e miolo tostado na chapa (vSurf.x = 0).
  bun: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    float n1 = fbm(p * 2.6);
    float n2 = snoise(p * 17.0);
    float n3 = snoise(p * 48.0);
    float region = vSurf.x;
    float t = vSurf.y;
    vec3 crust = mix(uC2, uC1, smoothstep(0.0, 0.85, t + n1 * 0.45));
    crust *= 0.9 + 0.14 * n2;
    crust = mix(crust, uC1 * 0.62, smoothstep(0.45, 0.95, n3 * 0.6 + n1 * 0.6) * 0.35 * t);
    // Farinha ou fubá polvilhado (pão australiano).
    float dust = smoothstep(0.82, 0.95, snoise(p * 60.0)) * uP.z * t;
    crust = mix(crust, vec3(0.62, 0.5, 0.36), dust);
    float toast = smoothstep(-0.35, 0.55, fbm(p * 4.2 + 7.0) + (1.0 - t) * 0.0);
    vec3 crumb = mix(uC3, uC4, toast * 0.85);
    float pores = smoothstep(0.3, 0.85, abs(snoise(p * 34.0)));
    crumb *= 1.0 - pores * 0.22;
    col = mix(crumb, crust, region);
    rough = mix(1.35, 0.85 + 0.35 * n2, region);
    h = mix(n3 * 0.45 - pores * 1.1, n2 * 0.5 + n3 * 0.2 + dust * 0.6, region);
    emis = vec3(0.0);
  `,
  // Carne: crosta selada no topo e na base, borda mais clara, caramelização e marcas de grelha.
  patty: /* glsl */ `
    vec3 p = vObjPos + vInst * 3.1 + uSeed;
    float top = abs(vObjNormal.y);
    float n1 = fbm(p * 3.6);
    float n2 = fbm(p * 14.0 + 3.3);
    float n3 = snoise(p * 52.0);
    float crumb = abs(snoise(p * 26.0));
    vec3 c = mix(uC1, uC2, smoothstep(0.1, 0.9, top + n1 * 0.35));
    c *= 0.82 + 0.3 * crumb;
    c = mix(c, uC4, smoothstep(0.15, 0.7, n2) * 0.55);
    c = mix(c, uC3, smoothstep(0.35, 0.95, n1 + n3 * 0.2) * (0.15 + 0.5 * top));
    // Ervas do burger vegetariano.
    float herb = smoothstep(0.78, 0.9, snoise(p * 38.0)) * uP.z;
    c = mix(c, vec3(0.05, 0.12, 0.02), herb);
    float grill = 0.0;
    if (uP.x > 0.5) {
      float s = sin((vObjPos.x * 0.93 + vObjPos.z * 0.37) * uP.y + n1 * 0.6);
      grill = smoothstep(0.6, 0.96, s) * smoothstep(0.55, 0.92, vObjNormal.y);
      c = mix(c, uC3 * 0.5, grill * 0.88);
    }
    // Borda rendada e crocante do smash.
    float lace = uP.w * smoothstep(0.6, 1.0, 1.0 - top) * smoothstep(0.0, 0.6, n2 + 0.3);
    c = mix(c, uC4 * 1.15, lace * 0.6);
    col = c;
    float juice = smoothstep(0.3, 0.85, n2 + n3 * 0.35);
    rough = 1.08 - juice * 0.62;
    h = n2 * 0.6 + n3 * 0.5 + crumb * 0.9 - grill * 1.2 + lace * 0.5;
    emis = vec3(0.0);
  `,
  // Queijo: brilho úmido, pontos tostados (queijo branco) e leve "subsuperfície".
  cheese: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    float n1 = fbm(p * 3.0);
    float n2 = snoise(p * 21.0);
    col = uC1 * (0.93 + 0.1 * n1);
    col = mix(col, uC2, smoothstep(0.2, 0.85, n1 + n2 * 0.25) * uP.x);
    if (uP.y > 0.5) {
      float s = sin((vObjPos.x * 0.93 + vObjPos.z * 0.37) * 9.0 + n1 * 0.5);
      col = mix(col, uC2 * 0.7, smoothstep(0.75, 0.98, s) * 0.75);
    }
    rough = 0.85 + 0.3 * n2;
    h = n1 * 0.4 + n2 * 0.25;
    emis = uC1 * 0.045;
  `,
  // Bacon: faixas de gordura e carne ao longo da tira, bordas crocantes.
  bacon: /* glsl */ `
    float u = vUv0.x;
    float v = vUv0.y;
    vec3 q = vec3(u * 7.0, v * 2.0, uSeed);
    float w = fbm(q);
    float band = sin((v + w * 0.22) * 3.14159 * 3.2 + uSeed);
    float fat = smoothstep(0.25, 0.8, band);
    vec3 meat = mix(uC1, uC2, smoothstep(-0.5, 0.6, snoise(vec3(u * 24.0, v * 7.0, uSeed))));
    vec3 c = mix(meat, uC3, fat * 0.85);
    float edge = smoothstep(0.3, 0.5, abs(v - 0.5));
    float crisp = smoothstep(0.0, 0.9, fbm(vec3(u * 11.0, v * 4.0, uSeed + 3.0)) + edge * 0.6 + 0.15);
    c = mix(c, uC4, crisp * 0.62);
    col = c;
    rough = 0.95 - fat * 0.3 + crisp * 0.15;
    h = band * 0.35 + snoise(vec3(u * 40.0, v * 12.0, uSeed)) * 0.5 + crisp * 0.3;
    emis = vec3(0.0);
  `,
  // Alface: centro claro, borda verde viva e nervuras.
  lettuce: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    float r = vSurf.x;
    vec3 c = mix(uC1, uC2, smoothstep(0.15, 0.95, r + fbm(p * 2.5) * 0.25));
    float ang = atan(vObjPos.z, vObjPos.x);
    float vein = 1.0 - smoothstep(0.0, 0.07, abs(sin(ang * 8.0 + fbm(p * 1.8) * 2.2)));
    float vein2 = 1.0 - smoothstep(0.0, 0.05, abs(snoise(p * 6.5)));
    c = mix(c, uC3, (vein * 0.35 + vein2 * 0.2) * smoothstep(0.05, 0.75, r));
    col = c * (0.92 + 0.12 * snoise(p * 25.0));
    rough = 0.95;
    h = vein * 0.7 + vein2 * 0.5 + snoise(p * 30.0) * 0.25;
    emis = uC2 * 0.035;
  `,
  tomatoSkin: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    col = uC1 * (0.92 + 0.12 * fbm(p * 4.0));
    rough = 1.0;
    h = snoise(p * 30.0) * 0.2;
    emis = vec3(0.0);
  `,
  // Corte do tomate: parede, septos, lóculos com gel e sementes.
  tomatoFlesh: /* glsl */ `
    vec2 q = vObjPos.xz / uP.x;
    float r = length(q);
    float a = atan(q.y, q.x);
    float wob = fbm(vec3(q * 3.0, uSeed)) * 0.09;
    float wall = smoothstep(0.7, 0.8, r + wob);
    float sept = 1.0 - smoothstep(0.04, 0.1, abs(sin(a * 2.5 + wob * 4.0 + uSeed)) * r);
    float core = 1.0 - smoothstep(0.16, 0.27, r + wob);
    float flesh = clamp(max(max(wall, sept), core), 0.0, 1.0);
    vec3 c = mix(uC2, uC1, flesh);
    float seeds = smoothstep(0.62, 0.82, snoise(vec3(q * 13.0, uSeed * 2.0)));
    c = mix(c, uC3, seeds * (1.0 - flesh) * 0.9);
    c = mix(c, uC1 * 1.15, smoothstep(0.93, 1.0, r) * 0.5);
    col = c;
    rough = mix(0.55, 1.2, flesh);
    h = seeds * 0.8 - (1.0 - flesh) * 0.4 + snoise(vec3(q * 25.0, 1.0)) * 0.15;
    emis = uC1 * 0.02;
  `,
  onion: /* glsl */ `
    vec3 p = vObjPos + vInst * 2.0 + uSeed;
    float n = fbm(p * 6.0);
    col = mix(uC2, uC1, clamp(uP.x * (0.65 + 0.5 * n) + (1.0 - uP.x) * smoothstep(-0.2, 0.6, n), 0.0, 1.0));
    rough = 0.9 + 0.3 * n;
    h = snoise(p * 30.0) * 0.3;
    emis = uC2 * 0.03;
  `,
  // Picles: casca verde escura, polpa clara e anel de sementes.
  pickle: /* glsl */ `
    vec2 q = (vObjPos.xz) / uP.x;
    float r = length(q);
    vec3 c = mix(uC2, uC3, smoothstep(0.15, 0.85, r));
    c = mix(c, uC1, smoothstep(0.84, 0.92, r));
    float ring = smoothstep(0.12, 0.0, abs(r - 0.48));
    float seeds = smoothstep(0.35, 0.75, snoise(vec3(q * 9.0, vInst.x * 5.0 + uSeed))) * ring;
    c = mix(c, uC2 * 1.2, seeds);
    col = c;
    rough = 0.9;
    h = seeds * 0.6 + snoise(vec3(q * 20.0, 2.0)) * 0.2;
    emis = uC3 * 0.03;
  `,
  // Jalapeño: anel de casca, polpa e miolo com sementes.
  jalapeno: /* glsl */ `
    vec2 q = (vObjPos.xz) / uP.x;
    float r = length(q);
    vec3 c = mix(uC3, uC2, smoothstep(0.35, 0.6, r));
    c = mix(c, uC1, smoothstep(0.82, 0.9, r));
    float seeds = smoothstep(0.55, 0.8, snoise(vec3(q * 10.0, vInst.z * 4.0 + uSeed))) * (1.0 - smoothstep(0.3, 0.45, r));
    c = mix(c, vec3(0.93, 0.9, 0.75), seeds);
    col = c;
    rough = 0.75;
    h = seeds * 0.7;
    emis = vec3(0.0);
  `,
  // Clara do ovo com renda dourada na borda.
  eggWhite: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    float r = vSurf.x;
    float n = fbm(p * 5.0);
    float lace = smoothstep(0.7, 1.0, r + n * 0.25);
    col = mix(uC1, uC2, lace * 0.85);
    rough = 0.9 + lace * 0.4;
    h = n * 0.4 + lace * snoise(p * 40.0) * 0.8;
    emis = uC1 * 0.02;
  `,
  yolk: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    col = uC1 * (0.95 + 0.08 * fbm(p * 5.0));
    rough = 1.0;
    h = 0.0;
    emis = uC1 * 0.08;
  `,
  sauce: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    float n = fbm(p * 6.0);
    col = uC1 * (0.92 + 0.12 * n);
    rough = 1.0;
    h = n * 0.3;
    emis = uC1 * 0.02;
  `,
  sesame: /* glsl */ `
    vec3 p = vObjPos * 40.0 + vInst * 7.0;
    col = uC1 * (0.9 + 0.12 * snoise(p));
    rough = 1.0;
    h = 0.0;
    emis = vec3(0.0);
  `,
  // Chapa de ferro: metal escuro, manchas de óleo queimado, riscos e calor na borda.
  iron: /* glsl */ `
    vec3 p = vObjPos;
    float n1 = fbm(p * 1.7 + 4.0);
    float n2 = snoise(p * 24.0);
    float scratch = snoise(vec3(p.x * 140.0, p.y * 6.0, p.z * 3.0));
    vec3 c = uC1 * (0.8 + 0.3 * n1);
    c = mix(c, uC2, smoothstep(0.15, 0.75, n1) * 0.45);
    col = c;
    rough = 0.9 + 0.35 * n1 - 0.25 * smoothstep(0.4, 0.9, n2);
    h = scratch * 0.25 + n2 * 0.35;
    float rr = length(vObjPos.xz) / uP.x;
    float rim = smoothstep(0.93, 1.0, rr);
    float spots = smoothstep(0.35, 0.85, fbm(p * 2.4 + vec3(0.0, uTime * 0.12, uTime * 0.05)));
    float pulse = 0.8 + 0.2 * sin(uTime * 1.7 + n1 * 6.0);
    emis = uC3 * uP.y * (rim * 0.28 + spots * spots * 0.12 * (1.0 - rr * 0.4)) * pulse;
  `,
  // Batata: dourada com pontas mais escuras (vObjPos.y ao longo do palito).
  fries: /* glsl */ `
    vec3 p = vObjPos + vInst * 4.0;
    float tip = smoothstep(0.55, 1.0, abs(vObjPos.y) / uP.x);
    float n = fbm(p * 9.0);
    col = mix(uC1, uC2, clamp(tip * 0.8 + smoothstep(0.2, 0.8, n) * 0.35, 0.0, 1.0));
    float salt = smoothstep(0.86, 0.95, snoise(p * 90.0));
    col = mix(col, vec3(0.95), salt * 0.6);
    rough = 0.9 + 0.2 * n;
    h = n * 0.5 + salt;
    emis = uC1 * 0.02;
  `,
  // Empanado dos anéis de cebola.
  batter: /* glsl */ `
    vec3 p = vObjPos + vInst * 3.0 + uSeed;
    float n1 = fbm(p * 7.0);
    float n2 = snoise(p * 32.0);
    col = mix(uC1, uC2, smoothstep(-0.1, 0.8, n1 + n2 * 0.2));
    rough = 0.95 + 0.2 * n2;
    h = n1 * 0.6 + n2 * 0.6;
    emis = vec3(0.0);
  `,
  // Cone de papel: listras âmbar e vermelhas sobre papel carvão.
  paper: /* glsl */ `
    float u = vUv0.x;
    float stripe = step(0.5, fract(u * 12.0));
    vec3 c = mix(uC1, uC2, stripe * 0.9);
    float band = smoothstep(0.86, 0.88, vUv0.y) * (1.0 - smoothstep(0.93, 0.95, vUv0.y));
    c = mix(c, uC3, band);
    float fiber = snoise(vec3(vUv0 * vec2(80.0, 200.0), 1.0));
    col = c * (0.93 + 0.07 * fiber);
    rough = 1.0;
    h = fiber * 0.3;
    emis = vec3(0.0);
  `,
  // Presunto: rosa com marmoreio suave e borda de gordura mais clara (vSurf.x: 0 centro, 1 borda).
  ham: /* glsl */ `
    vec3 p = vObjPos + uSeed;
    float r = vSurf.x;
    float n1 = fbm(p * 3.5);
    float marb = smoothstep(0.55, 0.9, abs(snoise(p * 6.0 + n1)));
    vec3 c = mix(uC1, uC2, smoothstep(-0.4, 0.6, n1) * 0.55);
    c = mix(c, uC3, marb * 0.3);
    c = mix(c, uC3, smoothstep(0.86, 0.97, r) * 0.65);
    col = c;
    rough = 0.85;
    h = n1 * 0.3 + snoise(p * 30.0) * 0.15;
    emis = uC1 * 0.025;
  `,
  // Salsicha e calabresa em rodelas: tripa na lateral, corte com pontos de gordura em cima.
  sausage: /* glsl */ `
    vec3 p = vObjPos + vInst * 3.0 + uSeed;
    float cut = smoothstep(0.55, 0.85, abs(vObjNormal.y));
    float n = fbm(p * 8.0);
    vec3 casing = uC1 * (0.85 + 0.25 * n);
    vec2 q = vObjPos.xz / uP.y;
    float rr = length(q);
    float specks = smoothstep(0.5, 0.8, snoise(vec3(q * 11.0, vInst.x * 7.0 + uSeed))) * uP.x;
    vec3 flesh = uC2 * (0.88 + 0.22 * n);
    flesh = mix(flesh, uC3, specks);
    flesh = mix(flesh, uC1, smoothstep(0.84, 0.97, rr));
    float chr = smoothstep(0.1, 0.9, fbm(p * 3.0)) * uP.z;
    flesh = mix(flesh, flesh * 0.45, chr * 0.6);
    col = mix(casing, flesh, cut);
    rough = mix(0.6, 0.95, cut);
    h = n * 0.4 + specks * 0.6;
    emis = vec3(0.0);
  `,
  // Abacaxi: fibras radiais, miolo mais claro, borda perto da casca; uP.y = grelhado, uP.z = mel.
  pineapple: /* glsl */ `
    vec2 q = vObjPos.xz / uP.x;
    float r = length(q);
    float a = atan(q.y, q.x);
    float n = fbm(vec3(q * 4.0, uSeed));
    float fibers = 0.5 + 0.5 * sin(a * 70.0 + n * 3.0);
    float eyes = smoothstep(0.8, 0.9, r) * (0.5 + 0.5 * sin(a * 28.0));
    vec3 c = mix(uC1, uC2, fibers * 0.3 + n * 0.15);
    c = mix(c, uC2, smoothstep(0.34, 0.22, r));
    c = mix(c, uC3, eyes * 0.45 + smoothstep(0.93, 1.0, r) * 0.55);
    float side = 1.0 - smoothstep(0.5, 0.8, abs(vObjNormal.y));
    c = mix(c, uC1 * 0.9, side * 0.4);
    float g = 0.0;
    if (uP.y > 0.5) {
      float s = sin((vObjPos.x * 0.93 + vObjPos.z * 0.37) * 11.0 + n);
      g = smoothstep(0.72, 0.97, s) * smoothstep(0.5, 0.9, vObjNormal.y);
      c = mix(c, uC3 * 0.55, g * 0.8);
    }
    c = mix(c, vec3(0.8, 0.42, 0.07), uP.z * 0.4);
    col = c;
    rough = 0.75 - uP.z * 0.45;
    h = fibers * 0.3 + n * 0.3 - g * 0.8;
    emis = uC1 * 0.04;
  `,
  // Milho: grãos amarelos brilhantes.
  corn: /* glsl */ `
    vec3 p = vObjPos * 20.0 + vInst * 13.0;
    float n = snoise(p);
    col = mix(uC1, uC2, 0.5 + 0.5 * n);
    col = mix(col, vec3(1.0, 0.95, 0.8), smoothstep(0.6, 1.0, vObjNormal.y) * 0.15);
    rough = 0.6;
    h = 0.0;
    emis = uC1 * 0.05;
  `,
  // Genérico: duas cores por ruído (uP.x escala, uP.y relevo, uP.z fibras ao longo de z, uP.w manchas uC3).
  generic: /* glsl */ `
    vec3 p = vObjPos + vInst * 3.0 + uSeed;
    float n1 = fbm(p * uP.x);
    float streak = snoise(vec3(p.x * uP.x * 3.0, p.y * uP.x * 3.0, p.z * uP.x * 0.4));
    float k = mix(n1, streak, uP.z);
    col = mix(uC1, uC2, smoothstep(-0.5, 0.6, k));
    col = mix(col, uC3, smoothstep(0.5, 0.9, fbm(p * uP.x * 0.5 + 5.0)) * uP.w);
    rough = 0.85 + 0.25 * n1;
    h = k * uP.y;
    emis = vec3(0.0);
  `,
}

const DEFAULTS: Record<FoodKind, { colors: string[]; params: [number, number, number, number]; bump: number; physical: MeshPhysicalMaterialParameters; side?: Side }> = {
  bun: {
    colors: ['#9a5317', '#d9a35b', '#f0d9a8', '#b8762e'],
    params: [0, 0, 0, 0],
    bump: 0.0035,
    physical: { roughness: 0.55, sheen: 0.22, sheenColor: new Color('#ffc880'), sheenRoughness: 0.5, clearcoat: 0.12, clearcoatRoughness: 0.5 },
  },
  patty: {
    colors: ['#6b3a22', '#3a1d10', '#140904', '#8c4a22'],
    params: [1, 9, 0, 0],
    bump: 0.016,
    physical: { roughness: 0.78, clearcoat: 0.06, clearcoatRoughness: 0.6 },
  },
  cheese: {
    colors: ['#f0a020', '#c97a10', '#000000', '#000000'],
    params: [0.15, 0, 0, 0],
    bump: 0.0015,
    physical: { roughness: 0.36, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new Color('#ffcc66') },
  },
  bacon: {
    colors: ['#8a2a1a', '#5c1a10', '#e9c39a', '#3d1608'],
    params: [0, 0, 0, 0],
    bump: 0.004,
    physical: { roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.35 },
  },
  lettuce: {
    colors: ['#b9d46c', '#3d7a1a', '#d2e59a', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0.002,
    physical: { roughness: 0.55, sheen: 0.25, sheenColor: new Color('#c8f0a0'), sheenRoughness: 0.5, clearcoat: 0.15 },
    side: DoubleSide,
  },
  tomatoSkin: {
    colors: ['#c92a1c', '#000000', '#000000', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0.001,
    physical: { roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.15 },
  },
  tomatoFlesh: {
    colors: ['#d3301f', '#ef6a3a', '#f2d27a', '#000000'],
    params: [0.46, 0, 0, 0],
    bump: 0.002,
    physical: { roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  },
  onion: {
    colors: ['#9a5a1c', '#e8d2a8', '#000000', '#000000'],
    params: [0.85, 0, 0, 0],
    bump: 0.0015,
    physical: { roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 },
  },
  pickle: {
    colors: ['#3d5a1a', '#c9c86a', '#8a9a3a', '#000000'],
    params: [0.2, 0, 0, 0],
    bump: 0.0015,
    physical: { roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  },
  jalapeno: {
    colors: ['#1f4a12', '#5f9a35', '#e8edc8', '#000000'],
    params: [0.15, 0, 0, 0],
    bump: 0.0015,
    physical: { roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 },
  },
  eggWhite: {
    colors: ['#f6f1e7', '#b07a3a', '#000000', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0.002,
    physical: { roughness: 0.45, clearcoat: 0.3, sheen: 0.3, sheenColor: new Color('#ffffff') },
  },
  yolk: {
    colors: ['#f5a00a', '#000000', '#000000', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0,
    physical: { roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 },
  },
  sauce: {
    colors: ['#e9d3a0', '#000000', '#000000', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0.001,
    physical: { roughness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.15 },
  },
  sesame: {
    colors: ['#efdfb4', '#000000', '#000000', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0,
    physical: { roughness: 0.5, sheen: 0.3, sheenColor: new Color('#fff3d0') },
  },
  iron: {
    colors: ['#1c1b1a', '#3a2416', '#ff5a14', '#000000'],
    params: [1.9, 1, 0, 0],
    bump: 0.0012,
    physical: { roughness: 0.42, metalness: 0.82, clearcoat: 0.25, clearcoatRoughness: 0.4 },
  },
  fries: {
    colors: ['#e8b04a', '#a8641e', '#000000', '#000000'],
    params: [0.5, 0, 0, 0],
    bump: 0.002,
    physical: { roughness: 0.55, sheen: 0.3, sheenColor: new Color('#ffe2a0') },
  },
  batter: {
    colors: ['#c98a3a', '#7a4a1a', '#000000', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0.005,
    physical: { roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.5 },
  },
  paper: {
    colors: ['#1a1a1a', '#e8a33d', '#c1272d', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0.0008,
    physical: { roughness: 0.85 },
    side: DoubleSide,
  },
  ham: {
    colors: ['#e3978d', '#c97670', '#f6dbd0', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0.0012,
    physical: { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.3, sheenColor: new Color('#ffd2c8') },
    side: DoubleSide,
  },
  sausage: {
    colors: ['#b4442a', '#e59b77', '#f3d6c2', '#000000'],
    params: [0, 0.12, 0.3, 0],
    bump: 0.0015,
    physical: { roughness: 0.45, clearcoat: 0.45, clearcoatRoughness: 0.25 },
  },
  pineapple: {
    colors: ['#f2c23a', '#fbe397', '#b8781e', '#000000'],
    params: [0.6, 0, 0, 0],
    bump: 0.0018,
    physical: { roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2 },
  },
  corn: {
    colors: ['#f7c724', '#e59a12', '#000000', '#000000'],
    params: [0, 0, 0, 0],
    bump: 0,
    physical: { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 },
  },
  generic: {
    colors: ['#c98a3a', '#7a4a1a', '#3a1d0a', '#000000'],
    params: [6, 0.4, 0, 0],
    bump: 0.003,
    physical: { roughness: 0.6, clearcoat: 0.2, clearcoatRoughness: 0.4 },
  },
}

const OCTAVES: Record<Quality, number> = { high: 4, medium: 3, low: 2 }

/** Cria o material de um ingrediente. */
export function foodMaterial(kind: FoodKind, quality: Quality, opts: FoodOptions = {}) {
  const def = DEFAULTS[kind]
  const colors = [...def.colors]
  opts.colors?.forEach((c, i) => (colors[i] = c))
  const params = opts.params ?? def.params

  const mat = new MeshPhysicalMaterial({
    ...def.physical,
    ...opts.physical,
    side: opts.side ?? def.side ?? FrontSide,
  })

  const uniforms = {
    uTime: sharedTime,
    uC1: { value: new Color(colors[0]) },
    uC2: { value: new Color(colors[1]) },
    uC3: { value: new Color(colors[2]) },
    uC4: { value: new Color(colors[3]) },
    uP: { value: new Vector4(...params) },
    uSeed: { value: opts.seed ?? 0 },
    uBump: { value: opts.bump ?? def.bump },
  }
  mat.userData.food = { kind, uniforms }
  const octaves = OCTAVES[quality]
  // Menos oitavas de ruído = shader mais leve em aparelhos fracos.
  mat.defines = { FBM_OCT: octaves }

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        attribute vec2 aSurf;
        varying vec3 vObjPos;
        varying vec3 vObjNormal;
        varying vec2 vUv0;
        varying vec2 vSurf;
        varying vec3 vInst;`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vObjPos = transformed;
        vObjNormal = objectNormal;
        vUv0 = uv;
        vSurf = aSurf;
        #ifdef USE_INSTANCING
          vInst = instanceMatrix[3].xyz;
        #else
          vInst = vec3(0.0);
        #endif`,
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vObjPos;
        varying vec3 vObjNormal;
        varying vec2 vUv0;
        varying vec2 vSurf;
        varying vec3 vInst;
        uniform float uTime;
        uniform vec3 uC1;
        uniform vec3 uC2;
        uniform vec3 uC3;
        uniform vec3 uC4;
        uniform vec4 uP;
        uniform float uSeed;
        uniform float uBump;
        ${NOISE_GLSL}
        ${PERTURB_GLSL}
        void foodSurface(out vec3 col, out float rough, out float h, out vec3 emis) {
          ${KIND_GLSL[kind]}
        }`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `vec3 fCol; float fRough; float fH; vec3 fEmis;
        foodSurface(fCol, fRough, fH, fEmis);
        diffuseColor.rgb = fCol;
        #include <color_fragment>`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `float roughnessFactor = clamp(roughness * fRough, 0.04, 1.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        normal = perturbProc(-vViewPosition, normal, vec2(dFdx(fH), dFdy(fH)) * uBump, faceDirection);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        totalEmissiveRadiance += fEmis;`,
      )
  }
  // Sem isso o Three.js reaproveitaria o mesmo programa para ingredientes diferentes.
  mat.customProgramCacheKey = () => `food-${kind}-${octaves}`
  return mat
}
