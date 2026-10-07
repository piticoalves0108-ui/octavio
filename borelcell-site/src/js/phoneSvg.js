import { mix, luminance, escapeHTML } from './utils.js';
import { GLYPH_B } from './brand.js';

let uid = 0;

/*
 * Desenha um celular em SVG, no tom da cor escolhida.
 * estilo: plateau3 | bar1 | pill2 | diag2 | float3 | float5 | square3 | square4
 * view: "back" (câmeras) ou "front" (tela)
 */
export function phoneSVG(hex = '#8a8a94', style = 'float3', { title = '', view = 'back', logo = false } = {}) {
  const id = `ph${++uid}`;
  const lum = luminance(hex);
  const light = mix(hex, '#ffffff', lum > 0.75 ? 0.5 : 0.36);
  const dark = mix(hex, '#000000', lum > 0.7 ? 0.2 : 0.42);
  const frameA = mix(hex, '#ffffff', 0.6);
  const frameB = mix(hex, '#000000', lum > 0.7 ? 0.28 : 0.4);
  const moduleTone = mix(hex, lum > 0.55 ? '#000000' : '#ffffff', lum > 0.55 ? 0.07 : 0.1);
  const ring = lum > 0.6 ? mix(hex, '#000000', 0.3) : mix(hex, '#ffffff', 0.22);

  const defs = `
    <defs>
      <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${light}"/><stop offset=".48" stop-color="${hex}"/><stop offset="1" stop-color="${dark}"/>
      </linearGradient>
      <linearGradient id="${id}f" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${frameB}"/><stop offset=".12" stop-color="${frameA}"/><stop offset=".5" stop-color="${frameB}"/><stop offset=".88" stop-color="${frameA}"/><stop offset="1" stop-color="${frameB}"/>
      </linearGradient>
      <radialGradient id="${id}l" cx=".38" cy=".34" r=".72">
        <stop offset="0" stop-color="#3d4377"/><stop offset=".32" stop-color="#151830"/><stop offset=".78" stop-color="#05060c"/><stop offset="1" stop-color="#000"/>
      </radialGradient>
      <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/>
      </linearGradient>
      <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${mix(moduleTone, '#ffffff', 0.18)}"/><stop offset="1" stop-color="${mix(moduleTone, '#000000', 0.12)}"/>
      </linearGradient>
      <clipPath id="${id}c"><rect x="24" y="20" width="172" height="400" rx="33"/></clipPath>
      <linearGradient id="${id}w" x1="0" y1="0" x2=".6" y2="1">
        <stop offset="0" stop-color="${mix(hex, '#ffffff', 0.1)}"/><stop offset=".45" stop-color="#24345f"/><stop offset="1" stop-color="#07070b"/>
      </linearGradient>
    </defs>`;

  const lens = (cx, cy, r) => `
    <circle cx="${cx}" cy="${cy}" r="${r + 5.5}" fill="${ring}"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 5.5}" fill="url(#${id}s)"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 1.2}" fill="#050507"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id}l)"/>
    <circle cx="${cx}" cy="${cy}" r="${(r * 0.46).toFixed(1)}" fill="none" stroke="#9ea3ad" stroke-opacity=".38" stroke-width="1.4"/>
    <circle cx="${(cx - r * 0.34).toFixed(1)}" cy="${(cy - r * 0.36).toFixed(1)}" r="${(r * 0.17).toFixed(1)}" fill="#fff" opacity=".6"/>`;
  const flash = (cx, cy, r = 6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#e9e1c8"/><circle cx="${cx}" cy="${cy}" r="${(r * 0.6).toFixed(1)}" fill="#fffbea"/>`;
  const dot = (cx, cy, r = 3) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#0b0b0f" opacity=".75"/>`;
  const box = (x, y, w, h, rx) => `
    <rect x="${x}" y="${y + 3}" width="${w}" height="${h}" rx="${rx}" fill="#000" opacity=".18"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#${id}m)" stroke="rgba(255,255,255,.22)" stroke-width="1"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="url(#${id}s)" opacity=".7"/>`;

  const cameras = {
    plateau3: () => box(26, 22, 168, 128, 30) + lens(66, 60, 21) + lens(66, 112, 21) + lens(112, 86, 21) + flash(160, 58, 7) + dot(160, 112),
    bar1: () => box(26, 26, 168, 64, 32) + lens(60, 58, 20) + flash(150, 58, 6) + dot(176, 58),
    pill2: () => box(34, 26, 60, 124, 30) + lens(64, 58, 20) + lens(64, 118, 20) + flash(114, 52, 6) + dot(114, 76),
    diag2: () => box(30, 24, 104, 104, 28) + lens(60, 54, 19) + lens(104, 98, 19) + flash(106, 52, 6) + dot(60, 100),
    float3: () => lens(58, 50, 18) + lens(58, 98, 18) + lens(58, 146, 18) + flash(98, 48, 5),
    float5: () => lens(58, 52, 20) + lens(58, 104, 20) + lens(58, 156, 20) + lens(104, 80, 13) + flash(104, 46, 5) + dot(104, 114, 4),
    square3: () => box(30, 24, 112, 112, 30) + lens(62, 56, 20) + lens(62, 104, 20) + lens(110, 56, 15) + flash(110, 104, 6),
    square4: () => box(30, 24, 120, 120, 34) + lens(64, 58, 20) + lens(116, 58, 20) + lens(64, 110, 20) + flash(116, 110, 7)
  };

  const frame = `
    <rect x="9" y="104" width="8" height="34" rx="3" fill="url(#${id}f)"/>
    <rect x="9" y="146" width="8" height="34" rx="3" fill="url(#${id}f)"/>
    <rect x="203" y="124" width="8" height="58" rx="3" fill="url(#${id}f)"/>
    <rect x="14" y="10" width="192" height="420" rx="42" fill="url(#${id}f)"/>`;

  let body;
  if (view === 'front') {
    body = `
      <rect x="18" y="14" width="184" height="412" rx="38" fill="#050507"/>
      <rect x="24" y="20" width="172" height="400" rx="33" fill="url(#${id}w)"/>
      <g clip-path="url(#${id}c)">
        <circle cx="160" cy="120" r="70" fill="${hex}" opacity=".55"/>
        <circle cx="60" cy="300" r="90" fill="#3d5afe" opacity=".35"/>
      </g>
      <rect x="24" y="20" width="172" height="400" rx="33" fill="url(#${id}s)" opacity=".8"/>
      <rect x="82" y="32" width="56" height="17" rx="8.5" fill="#000"/>
      <text x="110" y="122" text-anchor="middle" font-family="Unbounded, Arial Black, sans-serif" font-weight="700" font-size="44" fill="#fff" letter-spacing="-2">9:41</text>
      <rect x="80" y="404" width="60" height="4" rx="2" fill="#fff" opacity=".7"/>`;
  } else {
    body = `
      <rect x="18" y="14" width="184" height="412" rx="38" fill="url(#${id}b)"/>
      <rect x="18" y="14" width="184" height="412" rx="38" fill="url(#${id}s)" opacity=".85"/>
      ${logo ? `<path fill-rule="evenodd" transform="translate(91 254) scale(.32)" fill="${lum > 0.6 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.28)'}" d="${GLYPH_B.d}"/>` : ''}
      ${(cameras[style] || cameras.float3)()}`;
  }

  return `<svg viewBox="0 0 220 440" xmlns="http://www.w3.org/2000/svg" ${title ? `role="img" aria-label="${escapeHTML(title)}"` : 'aria-hidden="true"'}>${defs}${frame}${body}</svg>`;
}
