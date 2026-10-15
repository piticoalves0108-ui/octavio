import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RARITIES, type WeaponDef } from '../data/weapons';

/**
 * Modelos procedurais de armas (sem assets): espada, adaga, lança, cajado, manopla e artefato,
 * com variações de forma por arma e acabamento/brilho por raridade.
 * Convenção do encaixe da mão do jogador: +Y ao longo da arma, empunhadura na origem.
 * Cada modelo tem 2 malhas: corpo (MeshStandard com cores por vértice) e brilho (Basic aditivo),
 * e `userData.tip` com a ponta (usada por Player.getWeaponTipWorldPosition).
 */

export interface WeaponModel {
  root: THREE.Group;
  /** Material do brilho (próprio desta arma — comportamentos modulam a intensidade/cor). */
  glowMat: THREE.MeshBasicMaterial;
  baseGlow: THREE.Color;
  baseIntensity: number;
  /** Ponta e base da lâmina (espaço local) — rastro do golpe entre os dois. */
  tip: THREE.Vector3;
  base: THREE.Vector3;
  /** Intensidade (multiplica o brilho base) e cor opcional. */
  setGlow(intensity: number, color?: number): void;
}

type Part = { geo: THREE.BufferGeometry; color: number };

const cache = new Map<string, WeaponModel>();

function tint(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g.getAttribute('uv')) g.deleteAttribute('uv');
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function stripForGlow(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  return g;
}

/** Lâmina com seção em losango, afinando até a ponta. `curve` entorta para o lado. */
function bladeGeo(len: number, width: number, thick: number, curve = 0, tipFrac = 0.18): THREE.BufferGeometry {
  // 4 segmentos radiais: vértices nos eixos X (gumes) e Z (espessura) → seção em losango
  const g = new THREE.CylinderGeometry(0.004, width / 2, len, 4, 6, false);
  g.scale(1, 1, thick / width);
  g.translate(0, len / 2, 0);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    const t = y / len;
    let x = p.getX(i);
    // ponta em formato de "folha": estreita só no último trecho
    const taper = t < 1 - tipFrac ? 1 : Math.max(0.05, (1 - t) / tipFrac);
    const keep = (width / 2) * taper;
    const r0 = (width / 2) * (1 - t) + 0.004 * t;
    if (Math.abs(x) > 1e-5 && r0 > 1e-5) x = (x / r0) * keep;
    x += curve * t * t * len;
    p.setX(i, x);
    p.setZ(i, (p.getZ(i) / Math.max(1e-5, r0)) * keep);
  }
  g.computeVertexNormals();
  return g;
}

function cyl(rTop: number, rBot: number, h: number, y: number, seg = 10): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  g.translate(0, y, 0);
  return g;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, rz = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

function buildParts(def: WeaponDef): { body: Part[]; glow: THREE.BufferGeometry[]; tip: THREE.Vector3; base: THREE.Vector3 } {
  const m = def.model;
  const body: Part[] = [];
  const glow: THREE.BufferGeometry[] = [];
  const rare = RARITIES[def.rarity];
  const tip = new THREE.Vector3();
  const base = new THREE.Vector3();
  const leather = 0x3a2a1e;
  const v = m.variant ?? 'plain';

  if (def.type === 'sword' || def.type === 'dagger') {
    const L = m.length;
    const W = m.width;
    const hl = def.type === 'dagger' ? 0.1 : 0.2;
    // empunhadura, pomo e guarda
    body.push({ geo: cyl(0.017, 0.019, hl, 0, 8), color: leather });
    body.push({ geo: new THREE.SphereGeometry(0.03, 8, 6).translate(0, -hl / 2 - 0.02, 0), color: m.accent });
    const gy = hl / 2 + 0.018;
    if (v === 'tech') {
      body.push({ geo: box(W * 3.4, 0.035, 0.06, 0, gy, 0), color: m.accent });
      body.push({ geo: box(W * 1.4, 0.07, 0.07, 0, gy + 0.02, 0), color: m.primary });
      glow.push(box(W * 0.9, 0.02, 0.075, 0, gy + 0.03, 0));
    } else if (v === 'solar') {
      body.push({ geo: new THREE.TorusGeometry(0.06, 0.012, 6, 16).translate(0, gy + 0.02, 0), color: m.accent });
      glow.push(new THREE.SphereGeometry(0.03, 10, 8).translate(0, gy + 0.02, 0));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        body.push({ geo: box(0.012, 0.05, 0.012, Math.cos(a) * 0.08, gy + 0.02 + Math.sin(a) * 0.08, 0, a - Math.PI / 2), color: m.accent });
      }
    } else if (v === 'temporal') {
      body.push({ geo: new THREE.TorusGeometry(0.065, 0.01, 6, 20).rotateX(Math.PI / 2).translate(0, gy, 0), color: m.accent });
      body.push({ geo: box(W * 2.8, 0.03, 0.05, 0, gy, 0), color: m.primary });
      glow.push(new THREE.TorusGeometry(0.05, 0.004, 4, 20).rotateX(Math.PI / 2).translate(0, gy + 0.01, 0));
    } else if (v === 'curved') {
      body.push({ geo: box(W * 2.2, 0.025, 0.04, 0, gy, 0, 0.25), color: m.accent });
    } else {
      body.push({ geo: box(W * (def.type === 'dagger' ? 2.4 : 3.2), 0.03, 0.05, 0, gy, 0), color: m.accent });
    }
    const by = gy + 0.02;
    const curve = v === 'curved' ? 0.12 : 0;
    body.push({ geo: bladeGeo(L, W, W * 0.24, curve).translate(0, by, 0), color: m.primary });
    if (v === 'serrated') {
      for (let i = 1; i < 7; i++) {
        const y = by + (i / 7) * L * 0.8;
        for (const s of [1, -1]) body.push({ geo: new THREE.ConeGeometry(0.012, 0.045, 4).rotateZ((-s * Math.PI) / 2).translate((s * W) / 2 + s * 0.012, y, 0), color: m.primary });
        glow.push(box(0.006, 0.03, 0.02, 0, y, 0));
      }
    }
    // brilho: fio central (sulco) e runas
    if (rare.glow > 0) {
      glow.push(box(W * 0.12, L * 0.7, W * 0.3, curve * L * 0.15, by + L * 0.38, 0));
      if (v === 'runic' || v === 'temporal' || v === 'solar' || v === 'tech') {
        for (let i = 0; i < 5; i++) glow.push(box(W * 0.35, 0.012, W * 0.3, 0, by + 0.08 + i * L * 0.13, 0));
      }
    }
    if (rare.order >= 3) {
      // gume energizado nas raridades altas
      for (const s of [1, -1]) glow.push(box(0.005, L * 0.78, 0.006, (s * W) / 2.1 + curve * L * 0.2, by + L * 0.4, 0));
    }
    tip.set(curve * L, by + L, 0);
    base.set(0, by + 0.05, 0);
  } else if (def.type === 'spear') {
    const L = m.length;
    const W = m.width;
    body.push({ geo: cyl(0.018, 0.021, L, L / 2 - 0.55, 8), color: m.primary });
    body.push({ geo: cyl(0.025, 0.025, 0.2, 0, 8), color: leather });
    body.push({ geo: new THREE.ConeGeometry(0.024, 0.08, 6).rotateX(Math.PI).translate(0, -0.6, 0), color: m.accent });
    const hy = L - 0.55;
    body.push({ geo: cyl(0.03, 0.025, 0.06, hy, 8), color: m.accent });
    if (v === 'crystal') {
      const c = new THREE.OctahedronGeometry(W * 0.75, 0);
      c.scale(0.8, 3.2, 0.5);
      c.translate(0, hy + W * 2.4, 0);
      glow.push(c);
      body.push({ geo: new THREE.TorusGeometry(0.04, 0.008, 5, 12).rotateX(Math.PI / 2).translate(0, hy + 0.05, 0), color: m.accent });
      tip.set(0, hy + W * 4.8, 0);
    } else {
      body.push({ geo: bladeGeo(0.32, W * 1.3, W * 0.3, 0, 0.5).translate(0, hy + 0.03, 0), color: m.accent });
      for (const s of [1, -1]) body.push({ geo: box(0.08, 0.012, 0.012, s * 0.04, hy + 0.035, 0, s * 0.5), color: m.accent });
      tip.set(0, hy + 0.35, 0);
    }
    base.set(0, hy - 0.3, 0);
  } else if (def.type === 'staff') {
    const L = m.length;
    body.push({ geo: cyl(0.02, 0.026, L, L / 2 - 0.75, 8), color: m.primary });
    body.push({ geo: cyl(0.027, 0.027, 0.22, 0, 8), color: leather });
    for (const y of [-0.5, 0.35, L - 0.95]) body.push({ geo: cyl(0.031, 0.031, 0.035, y, 10), color: m.accent });
    const hy = L - 0.75;
    if (v === 'void') {
      body.push({ geo: new THREE.TorusGeometry(0.11, 0.012, 6, 18).translate(0, hy + 0.12, 0), color: m.accent });
      body.push({ geo: new THREE.TorusGeometry(0.09, 0.009, 6, 18).rotateY(Math.PI / 2).translate(0, hy + 0.12, 0), color: m.accent });
      body.push({ geo: new THREE.SphereGeometry(0.06, 12, 10).translate(0, hy + 0.12, 0), color: 0x08040e });
      glow.push(new THREE.TorusGeometry(0.075, 0.006, 4, 24).rotateX(Math.PI / 2).translate(0, hy + 0.12, 0));
      tip.set(0, hy + 0.12, 0);
    } else if (v === 'dragon') {
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const horn = new THREE.ConeGeometry(0.022, 0.26, 6);
        horn.translate(0, 0.13, 0);
        horn.rotateZ(-0.55);
        horn.rotateY(a);
        horn.translate(Math.cos(a) * 0.03, hy + 0.02, -Math.sin(a) * 0.03);
        body.push({ geo: horn, color: m.accent });
      }
      const c = new THREE.OctahedronGeometry(0.06, 1);
      c.scale(1, 1.5, 1);
      c.translate(0, hy + 0.12, 0);
      glow.push(c);
      body.push({ geo: cyl(0.04, 0.03, 0.06, hy, 8), color: m.accent });
      tip.set(0, hy + 0.14, 0);
    } else {
      const c = new THREE.OctahedronGeometry(0.055, 0);
      c.scale(1, 1.7, 1);
      c.translate(0, hy + 0.1, 0);
      glow.push(c);
      body.push({ geo: cyl(0.045, 0.026, 0.07, hy, 10), color: m.accent });
      tip.set(0, hy + 0.12, 0);
    }
    base.set(0, hy - 0.4, 0);
  } else if (def.type === 'techno') {
    // manopla: punho blindado em volta da mão
    body.push({ geo: box(0.11, 0.1, 0.12, 0, 0.02, 0.01), color: m.primary });
    body.push({ geo: box(0.13, 0.05, 0.13, 0, 0.085, 0.01), color: m.accent });
    for (let i = 0; i < 4; i++) body.push({ geo: box(0.022, 0.03, 0.03, -0.045 + i * 0.03, 0.12, 0.05), color: m.primary });
    body.push({ geo: cyl(0.06, 0.07, 0.14, -0.08, 10), color: m.primary });
    for (const y of [-0.05, -0.11]) glow.push(cyl(0.072, 0.072, 0.012, y, 14));
    glow.push(box(0.05, 0.02, 0.02, 0, 0.09, 0.075));
    glow.push(new THREE.SphereGeometry(0.025, 8, 6).translate(0, 0.02, 0.07));
    tip.set(0, 0.14, 0.05);
    base.set(0, -0.05, 0);
  } else {
    // artefato: orbe preso numa gaiola de bronze
    body.push({ geo: cyl(0.02, 0.025, 0.12, -0.02, 8), color: m.accent });
    body.push({ geo: new THREE.TorusGeometry(0.1, 0.008, 6, 20).translate(0, 0.14, 0), color: m.accent });
    body.push({ geo: new THREE.TorusGeometry(0.1, 0.008, 6, 20).rotateY(Math.PI / 2).translate(0, 0.14, 0), color: m.accent });
    body.push({ geo: new THREE.SphereGeometry(0.075, 14, 12).translate(0, 0.14, 0), color: m.primary });
    glow.push(new THREE.TorusGeometry(0.082, 0.007, 4, 24).rotateX(Math.PI / 2).translate(0, 0.14, 0));
    glow.push(new THREE.SphereGeometry(0.035, 10, 8).translate(0, 0.14, 0));
    tip.set(0, 0.14, 0);
    base.set(0, 0.0, 0);
  }
  return { body, glow, tip, base };
}

let glowTexture: THREE.Texture | null = null;
function auraTexture(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const s = 64;
  const data = new Uint8Array(s * s * 4);
  for (let y = 0; y < s; y++)
    for (let x = 0; x < s; x++) {
      const dx = (x + 0.5) / s - 0.5;
      const dy = (y + 0.5) / s - 0.5;
      const r = Math.min(1, Math.sqrt(dx * dx + dy * dy) * 2);
      const a = Math.pow(1 - r, 2.2);
      const i = (y * s + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  const t = new THREE.DataTexture(data, s, s, THREE.RGBAFormat);
  t.needsUpdate = true;
  glowTexture = t;
  return t;
}

/** Cria (ou reaproveita do cache) o modelo da arma. */
export function getWeaponModel(def: WeaponDef): WeaponModel {
  const hit = cache.get(def.id);
  if (hit) return hit;
  const { body, glow, tip, base } = buildParts(def);
  const root = new THREE.Group();
  root.name = `arma-${def.id}`;
  const bodyGeo = mergeGeometries(body.map((p) => tint(p.geo, p.color)))!;
  bodyGeo.computeBoundingSphere();
  const rare = RARITIES[def.rarity];
  // metalness moderada: sem mapa de ambiente, metal "puro" fica preto
  const bodyMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: def.type === 'staff' ? 0.1 : 0.35,
    roughness: def.type === 'staff' ? 0.6 : 0.38 - rare.order * 0.03,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  root.add(bodyMesh);
  const glowColor = new THREE.Color(def.model.glow);
  const baseIntensity = 0.6 + rare.glow * 1.6;
  const glowMat = new THREE.MeshBasicMaterial({ color: glowColor.clone().multiplyScalar(baseIntensity), toneMapped: false });
  if (glow.length) {
    const gg = mergeGeometries(glow.map(stripForGlow))!;
    const gm = new THREE.Mesh(gg, glowMat);
    gm.name = 'brilho';
    root.add(gm);
  }
  // aura nas raridades lendária/mítica
  if (rare.order >= 4) {
    const sm = new THREE.SpriteMaterial({ map: auraTexture(), color: glowColor, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
    const sp = new THREE.Sprite(sm);
    sp.position.copy(tip).lerp(base, 0.35);
    sp.scale.setScalar(def.type === 'sword' ? 0.55 : 0.4);
    sp.name = 'aura';
    root.add(sp);
  }
  root.userData.tip = { x: tip.x, y: tip.y, z: tip.z };
  root.userData.weaponId = def.id;
  const model: WeaponModel = {
    root,
    glowMat,
    baseGlow: glowColor,
    baseIntensity,
    tip,
    base,
    setGlow(intensity: number, color?: number) {
      if (color !== undefined) glowMat.color.setHex(color);
      else glowMat.color.copy(glowColor);
      glowMat.color.multiplyScalar(baseIntensity * Math.max(0, intensity));
    },
  };
  cache.set(def.id, model);
  return model;
}
