/**
 * Funções puras do ambiente (testáveis sem cena): densidade de névoa, curva do
 * clarão do relâmpago, trajetória do raio e estabilização da câmera de sombra.
 */
import { clamp, smoothstep } from '../core/math';
import type { BiomeId } from '../data/world';
import { FOG, GROUND_FOG } from '../data/weather';
import { morningFogFactor } from './weatherMachine';

// ---------------------------------------------------------------------------
// Névoa
// ---------------------------------------------------------------------------

/** Densidade FogExp2 que deixa ~95% de névoa na distância de visão. */
export function baseFogDensity(viewDistance: number): number {
  return FOG.k / Math.max(100, viewDistance);
}

/** Névoa local extra (densidade) do bioma em que o jogador está, conforme a hora. */
export function biomeFogExtra(biome: BiomeId, hours: number, night: number): number {
  const m = morningFogFactor(hours);
  return (FOG.biomeExtra[biome] ?? 0) + (FOG.morningExtra[biome] ?? 0) * m + (FOG.nightExtra[biome] ?? 0) * night;
}

export interface FogInputs {
  viewDistance: number;
  /** Multiplicador e extra do clima atual (mistura). */
  weatherFog: number;
  weatherFogExtra: number;
  /** Extra local suavizado (biomeFogExtra). */
  localExtra: number;
  /** Altura da câmera acima do chão (m). */
  altitude: number;
  indoor: boolean;
}

/**
 * Densidade final. A névoa de distância nunca fica abaixo da base (borda do terreno
 * sempre escondida); a névoa local/do clima diminui ao subir (voando acima da camada).
 */
export function fogDensity(i: FogInputs): number {
  const base = baseFogDensity(i.viewDistance) * Math.max(1, i.weatherFog);
  const relief = 1 - (1 - FOG.altitudeRelief) * smoothstep(40, 300, i.altitude);
  const layer = smoothstep(260, 30, i.altitude); // névoa rasteira some acima da camada
  let d = base * relief + (i.weatherFogExtra * (0.45 + 0.55 * layer) + i.localExtra * layer);
  if (i.indoor) d *= FOG.indoorFactor;
  return Math.max(baseFogDensity(i.viewDistance) * FOG.altitudeRelief * (i.indoor ? FOG.indoorFactor : 1), d);
}

/** Visibilidade aproximada (m) em que a névoa chega a 90% com FogExp2. */
export function fogVisibility(density: number): number {
  return Math.sqrt(-Math.log(0.1)) / Math.max(1e-6, density);
}

/** Peso 0..1 de névoa rasteira numa célula do bioma, conforme a hora e o clima. */
export function groundFogWeight(biome: BiomeId, hours: number, weatherFogExtra: number): number {
  const m = morningFogFactor(hours);
  const w = (GROUND_FOG.biome[biome] ?? 0) + (GROUND_FOG.morningBiome[biome] ?? 0) * m;
  const weatherBoost = biome === 'village' || biome === 'mountain' ? 0 : clamp(weatherFogExtra / 0.01, 0, 1) * 0.45;
  return clamp(w + weatherBoost, 0, 1);
}

// ---------------------------------------------------------------------------
// Relâmpago
// ---------------------------------------------------------------------------

/** Pulsos do clarão (tempo s, amplitude): um raio real pisca 2–3 vezes. */
const FLASH_PULSES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0.09, 0.75],
  [0.21, 0.5],
];

/** Intensidade 0..1 do clarão `t` segundos depois do raio. */
export function flashCurve(t: number): number {
  if (t < 0) return 0;
  let f = 0;
  for (const [t0, a] of FLASH_PULSES) {
    if (t < t0) break;
    const v = a * Math.exp(-(t - t0) * 22);
    if (v > f) f = v;
  }
  // brilho residual das nuvens
  f = Math.max(f, 0.22 * Math.exp(-t * 5));
  return t > 1.2 ? 0 : f;
}

/** Atraso (s) do som do trovão. */
export function thunderDelay(distance: number, soundSpeed = 343): number {
  return Math.max(0, distance) / soundSpeed;
}

/**
 * Trajetória do raio por deslocamento aleatório: escreve segmentos em `out`
 * (ax, ay, az, bx, by, bz, largura relativa, brilho) e retorna quantos foram escritos.
 * O tronco vai de `top` até `bottom`; ramos saem de pontos do tronco e se apagam.
 */
export function buildBoltSegments(
  top: { x: number; y: number; z: number },
  bottom: { x: number; y: number; z: number },
  segments: number,
  branches: number,
  rnd: () => number,
  out: Float32Array,
  maxSegments: number,
): number {
  const STRIDE = 8;
  let n = 0;
  const len = Math.hypot(bottom.x - top.x, bottom.y - top.y, bottom.z - top.z);
  const jitter = len * 0.045;
  let px = top.x;
  let py = top.y;
  let pz = top.z;
  // pontos do tronco (guardados para os ramos)
  const trunk: number[] = TRUNK;
  trunk.length = 0;
  trunk.push(px, py, pz);
  for (let i = 1; i <= segments && n < maxSegments; i++) {
    const t = i / segments;
    const taper = i === segments ? 0 : 1;
    const nx = top.x + (bottom.x - top.x) * t + (rnd() - 0.5) * 2 * jitter * taper;
    const ny = top.y + (bottom.y - top.y) * t + (rnd() - 0.5) * jitter * 0.5 * taper;
    const nz = top.z + (bottom.z - top.z) * t + (rnd() - 0.5) * 2 * jitter * taper;
    const o = n * STRIDE;
    out[o] = px;
    out[o + 1] = py;
    out[o + 2] = pz;
    out[o + 3] = nx;
    out[o + 4] = ny;
    out[o + 5] = nz;
    out[o + 6] = 1 - t * 0.35;
    out[o + 7] = 1;
    n++;
    px = nx;
    py = ny;
    pz = nz;
    trunk.push(px, py, pz);
  }
  for (let b = 0; b < branches && n < maxSegments; b++) {
    const k = 1 + Math.floor(rnd() * Math.max(1, segments * 0.7));
    let bx = trunk[k * 3];
    let by = trunk[k * 3 + 1];
    let bz = trunk[k * 3 + 2];
    if (bx === undefined) continue;
    const ang = rnd() * Math.PI * 2;
    const dx = Math.cos(ang);
    const dz = Math.sin(ang);
    const steps = 3 + Math.floor(rnd() * 4);
    const stepLen = (len / segments) * (0.8 + rnd() * 0.5);
    for (let s = 0; s < steps && n < maxSegments; s++) {
      const fade = 1 - s / steps;
      const nx = bx + dx * stepLen * 0.7 + (rnd() - 0.5) * jitter;
      const ny = by - stepLen * (0.5 + rnd() * 0.5);
      const nz = bz + dz * stepLen * 0.7 + (rnd() - 0.5) * jitter;
      const o = n * STRIDE;
      out[o] = bx;
      out[o + 1] = by;
      out[o + 2] = bz;
      out[o + 3] = nx;
      out[o + 4] = ny;
      out[o + 5] = nz;
      out[o + 6] = 0.45 * fade;
      out[o + 7] = 0.55 * fade;
      n++;
      bx = nx;
      by = ny;
      bz = nz;
    }
  }
  return n;
}
const TRUNK: number[] = [];

// ---------------------------------------------------------------------------
// Sombras
// ---------------------------------------------------------------------------

/**
 * Estabiliza o centro da câmera de sombra: projeta o ponto na base da luz
 * (right/up perpendiculares à direção da luz), arredonda ao texel e volta ao mundo.
 * Assim, mover o jogador não faz as bordas das sombras "tremerem".
 */
export function snapShadowCenter(
  center: { x: number; y: number; z: number },
  lightDir: { x: number; y: number; z: number },
  texel: number,
  out: { x: number; y: number; z: number },
) {
  // base ortonormal: f = -lightDir (direção em que a luz olha)
  const fx = -lightDir.x;
  const fy = -lightDir.y;
  const fz = -lightDir.z;
  // up de referência: Y, ou Z quando a luz é quase vertical
  let ux = 0;
  let uy = 1;
  let uz = 0;
  if (Math.abs(fy) > 0.995) {
    uy = 0;
    uz = 1;
  }
  // right = normalize(cross(f, up))
  let rx = fy * uz - fz * uy;
  let ry = fz * ux - fx * uz;
  let rz = fx * uy - fy * ux;
  const rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl;
  ry /= rl;
  rz /= rl;
  // up' = cross(right, f)
  const vx = ry * fz - rz * fy;
  const vy = rz * fx - rx * fz;
  const vz = rx * fy - ry * fx;
  const lx = center.x * rx + center.y * ry + center.z * rz;
  const ly = center.x * vx + center.y * vy + center.z * vz;
  const lz = center.x * fx + center.y * fy + center.z * fz;
  const sx = Math.round(lx / texel) * texel;
  const sy = Math.round(ly / texel) * texel;
  out.x = rx * sx + vx * sy + fx * lz;
  out.y = ry * sx + vy * sy + fy * lz;
  out.z = rz * sx + vz * sy + fz * lz;
  return out;
}
