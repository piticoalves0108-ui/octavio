/**
 * Ciclo dia/noite (lógica pura, sem cena): direção do sol e da lua a partir da hora,
 * fator noite, níveis de luz e paleta do céu interpolada por quadros-chave.
 */
import * as THREE from 'three';
import { clamp, smoothstep } from '../core/math';
import { DAY_CYCLE, ECLIPSE, SKY_KEYS, TIME_OF_DAY_LABELS } from '../data/weather';

export interface Vec3Out {
  x: number;
  y: number;
  z: number;
}

/**
 * Direção (normalizada, aponta PARA o astro) de um corpo que nasce às `rise` h e se
 * põe às `set` h, nascendo a leste (+X), culminando inclinado para o sul (+Z)
 * e se pondo a oeste (-X). A outra metade do ciclo fica abaixo do horizonte.
 */
export function orbitDirection(hours: number, rise: number, set: number, tiltSouth: number, out: Vec3Out): Vec3Out {
  const dayLen = set - rise;
  const h = (((hours - rise) % 24) + 24) % 24; // horas desde o nascer
  const a = h <= dayLen ? (h / dayLen) * Math.PI : Math.PI + ((h - dayLen) / (24 - dayLen)) * Math.PI;
  const s = Math.sin(a);
  out.x = Math.cos(a);
  out.y = s * Math.cos(tiltSouth);
  out.z = s * Math.sin(tiltSouth);
  return out;
}

export function sunDirection(hours: number, out: Vec3Out): Vec3Out {
  return orbitDirection(hours, DAY_CYCLE.sunrise, DAY_CYCLE.sunset, DAY_CYCLE.sunTiltSouth, out);
}

/**
 * Lua: nasce depois do pôr do sol e atrasa um pouco a cada dia (fases contínuas,
 * sem saltos à meia-noite).
 */
export function moonDirection(hours: number, day: number, out: Vec3Out): Vec3Out {
  const offset = 12 + DAY_CYCLE.moonLagHours + (Math.max(1, day) - 1 + hours / 24) * DAY_CYCLE.moonDriftPerDay;
  return orbitDirection(hours - offset, DAY_CYCLE.sunrise, DAY_CYCLE.sunset, DAY_CYCLE.moonTiltSouth, out);
}

/** Fase iluminada da lua (0 = nova, 1 = cheia) a partir do ângulo sol–lua. */
export function moonPhase(sun: Vec3Out, moon: Vec3Out): number {
  return clamp(0.5 - 0.5 * (sun.x * moon.x + sun.y * moon.y + sun.z * moon.z), 0, 1);
}

/** 0 = dia pleno, 1 = noite (crepúsculo no meio). */
export function nightFactor(sunY: number): number {
  return smoothstep(0.06, -0.18, sunY);
}

export interface LightLevels {
  /** Intensidade relativa (0..1) da luz do sol. */
  sun: number;
  /** Intensidade relativa (0..1) da luz da lua. */
  moon: number;
  /** A luz direcional deve seguir a lua (sol abaixo do horizonte). */
  useMoon: boolean;
}

/**
 * Níveis das luzes. As duas ficam ~0 na janela em que a luz direcional troca de
 * astro, então a troca de direção (e das sombras) nunca é visível.
 */
export function lightLevels(sunY: number, moonY: number, phase: number, out: LightLevels): LightLevels {
  out.sun = smoothstep(-0.03, 0.22, sunY);
  out.moon = smoothstep(-0.045, -0.16, sunY) * smoothstep(-0.02, 0.2, moonY) * (0.35 + 0.65 * phase);
  out.useMoon = sunY < -0.036;
  return out;
}

/** Paleta interpolada (cores no espaço linear). */
export interface SkySample {
  zenith: THREE.Color;
  horizon: THREE.Color;
  fog: THREE.Color;
  sun: THREE.Color;
  glow: THREE.Color;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiIntensity: number;
  exposure: number;
}

export function createSkySample(): SkySample {
  return {
    zenith: new THREE.Color(),
    horizon: new THREE.Color(),
    fog: new THREE.Color(),
    sun: new THREE.Color(),
    glow: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    hemiIntensity: 1,
    exposure: 1,
  };
}

type ColorKey = 'zenith' | 'horizon' | 'fog' | 'sun' | 'glow' | 'hemiSky' | 'hemiGround';
const COLOR_KEYS: ColorKey[] = ['zenith', 'horizon', 'fog', 'sun', 'glow', 'hemiSky', 'hemiGround'];

/** Quadros-chave convertidos para cores lineares uma única vez. */
const KEYS = SKY_KEYS.map((k) => {
  const colors = {} as Record<ColorKey, THREE.Color>;
  for (const c of COLOR_KEYS) colors[c] = new THREE.Color(k[c]);
  return { hour: k.hour, colors, hemiIntensity: k.hemiIntensity, exposure: k.exposure };
});

/** Interpola a paleta em ciclo de 24 h (sem alocação). */
export function sampleSky(hours: number, out: SkySample): SkySample {
  const h = ((hours % 24) + 24) % 24;
  const n = KEYS.length;
  let i = n - 1;
  for (let k = 0; k < n; k++) {
    if (KEYS[k].hour <= h) i = k;
    else break;
  }
  const a = KEYS[i];
  const b = KEYS[(i + 1) % n];
  const span = (b.hour - a.hour + 24) % 24 || 24;
  const t = clamp(((h - a.hour + 24) % 24) / span, 0, 1);
  // suaviza a entrada/saída de cada trecho (sem "quinas" na transição)
  const s = t * t * (3 - 2 * t);
  for (const c of COLOR_KEYS) out[c].copy(a.colors[c]).lerp(b.colors[c], s);
  out.hemiIntensity = a.hemiIntensity + (b.hemiIntensity - a.hemiIntensity) * s;
  out.exposure = a.exposure + (b.exposure - a.exposure) * s;
  return out;
}

/** Direção do Eclipse Arcano (norte, oscilando devagar ao longo do dia). */
export function eclipseDirection(hours: number, out: Vec3Out): Vec3Out {
  const az = ((ECLIPSE.azimuthDeg + Math.sin((hours / 24) * Math.PI * 2) * ECLIPSE.wobbleDeg) * Math.PI) / 180;
  const el = (ECLIPSE.elevationDeg * Math.PI) / 180;
  // azimute 0 = norte (-Z), 90 = leste (+X)
  out.x = Math.sin(az) * Math.cos(el);
  out.y = Math.sin(el);
  out.z = -Math.cos(az) * Math.cos(el);
  return out;
}

/** Rótulo do período do dia (pt-BR). */
export function timeOfDayLabel(hours: number): string {
  const h = ((hours % 24) + 24) % 24;
  for (const e of TIME_OF_DAY_LABELS) if (h < e.until) return e.label;
  return TIME_OF_DAY_LABELS[TIME_OF_DAY_LABELS.length - 1].label;
}
