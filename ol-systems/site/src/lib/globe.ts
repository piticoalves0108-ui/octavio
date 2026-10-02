/**
 * Geometria do globo do logo (wireframe de paralelos e meridianos).
 * Usada tanto pelo SVG (pôster e versão leve) quanto pela cena 3D, para os
 * dois terem exatamente o mesmo enquadramento.
 */

/** Inclinação do eixo em direção à câmera: o polo norte aparece, como no logo. */
export const TILT = 0.42;
/** Latitudes dos paralelos (graus). */
export const PARALLELS = [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75];
/** Meridianos: 12 círculos máximos = 24 linhas de longitude. */
export const MERIDIANS = Array.from({ length: 12 }, (_, i) => i * 15);
/** Raio do globo dentro do viewBox (-1.12..1.12). */
export const VIEW = 1.12;

const rad = (d: number) => (d * Math.PI) / 180;

export type Ellipse = { cx: number; cy: number; rx: number; ry: number; rot: number };

/** Paralelo na latitude `lat`: elipse horizontal (projeção ortográfica). */
export function parallelEllipse(lat: number, tilt = TILT): Ellipse {
  const p = rad(lat);
  return {
    cx: 0,
    cy: -Math.sin(p) * Math.cos(tilt),
    rx: Math.cos(p),
    ry: Math.cos(p) * Math.sin(tilt),
    rot: 0,
  };
}

/** Meridiano (círculo máximo) na longitude `lon` + giro `spin` (rad). */
export function meridianEllipse(lon: number, spin = 0, tilt = TILT): Ellipse {
  const l = rad(lon) + spin;
  // Eixo maior na direção (-sin l · sin t, cos l); y do SVG cresce para baixo.
  const rot = (Math.atan2(-Math.cos(l), -Math.sin(l) * Math.sin(tilt)) * 180) / Math.PI;
  return { cx: 0, cy: 0, rx: 1, ry: Math.abs(Math.sin(l) * Math.cos(tilt)), rot };
}

/** Velocidade do giro (rad/ms), igual no SVG e no 3D. */
export const SPIN_SPEED = 0.00009;
/** Instante zero do giro, compartilhado para a troca SVG → 3D não dar salto. */
export const spinAt = (now: number) => now * SPIN_SPEED;

/** Pontos fixos na superfície (negócios "no ar"), com semente estável. */
export function surfacePoints(count: number, seed = 7) {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return Array.from({ length: count }, () => {
    const lat = Math.asin(rnd() * 1.6 - 0.8);
    const lon = rnd() * Math.PI * 2;
    return { lat, lon, phase: rnd() };
  });
}
