import * as THREE from 'three';
import type { CollisionWorld } from '../../world/Collision';
import type { TelegraphShape, VfxHandle } from '../VFX';

/**
 * Marcações de ataque no chão (telegraphs): círculo, cone, linha e anel, com preenchimento
 * animado até o instante do golpe. A malha é uma grade que acompanha a altura do terreno
 * (e o topo de plataformas no centro), recalculada só ao ativar.
 */

const VERT = /* glsl */ `
attribute vec2 aLocal;
varying vec2 vL;
void main() {
  vL = aLocal;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uShape;
uniform float uProgress;
uniform float uAlpha;
uniform float uTime;
uniform vec3 uColor;
uniform vec4 uP; // raio, raio interno, meio-ângulo (rad), largura
uniform float uLen;
uniform float uOverlay;
varying vec2 vL;
void main() {
  float d = length(vL);
  float R = uP.x;
  float inside = 0.0;
  float edge = 0.0;
  float fill = 0.0;
  float front = 0.0;
  float ew = 0.12 + R * 0.012;
  if (uShape < 0.5) {
    inside = 1.0 - smoothstep(R - 0.03, R, d);
    edge = smoothstep(R - ew * 2.0, R - ew * 0.5, d) * inside;
    float fr = R * uProgress;
    fill = 1.0 - smoothstep(fr - 0.05, fr, d);
    front = smoothstep(fr - ew * 2.5, fr, d) * fill;
  } else if (uShape < 1.5) {
    float halfAng = uP.z;
    float ang = atan(vL.x, vL.y);
    float inAng = 1.0 - smoothstep(halfAng - 0.01, halfAng, abs(ang));
    inside = inAng * (1.0 - smoothstep(R - 0.03, R, d));
    float sideDist = d * sin(max(0.0, halfAng - abs(ang)));
    edge = max(smoothstep(R - ew * 2.0, R - ew * 0.5, d), 1.0 - smoothstep(ew * 0.5, ew * 2.0, sideDist)) * inside;
    float fr = R * uProgress;
    fill = 1.0 - smoothstep(fr - 0.05, fr, d);
    front = smoothstep(fr - ew * 2.5, fr, d) * fill;
  } else if (uShape < 2.5) {
    float hw = uP.w * 0.5;
    inside = (1.0 - smoothstep(hw - 0.03, hw, abs(vL.x))) * step(0.0, vL.y) * (1.0 - smoothstep(uLen - 0.03, uLen, vL.y));
    edge = max(smoothstep(hw - ew * 2.0, hw - ew * 0.5, abs(vL.x)), max(1.0 - smoothstep(ew * 0.5, ew * 2.0, vL.y), smoothstep(uLen - ew * 2.0, uLen - ew * 0.5, vL.y))) * inside;
    float fl = uLen * uProgress;
    fill = 1.0 - smoothstep(fl - 0.05, fl, vL.y);
    front = smoothstep(fl - ew * 3.0, fl, vL.y) * fill;
  } else {
    float ri = uP.y;
    inside = smoothstep(ri, ri + 0.03, d) * (1.0 - smoothstep(R - 0.03, R, d));
    edge = max(smoothstep(R - ew * 2.0, R - ew * 0.5, d), 1.0 - smoothstep(ri + ew * 0.5, ri + ew * 2.0, d)) * inside;
    float fr = ri + (R - ri) * uProgress;
    fill = 1.0 - smoothstep(fr - 0.05, fr, d);
    front = smoothstep(fr - ew * 2.5, fr, d) * fill;
  }
  if (inside < 0.01) discard;
  float pulse = 0.85 + 0.15 * sin(uTime * 14.0);
  float stripes = 0.5 + 0.5 * sin((vL.x + vL.y) * 4.0 - uTime * 6.0);
  float a = inside * (0.16 + 0.1 * stripes + 0.34 * fill + 0.55 * front) + edge * 0.85 * pulse;
  // camada "raio-x" (sem teste de profundidade): só contorno e frente, fraca — legível através da grama
  if (uOverlay > 0.5) a = (edge * 0.42 * pulse + front * 0.22 + inside * 0.05);
  a *= uAlpha;
  if (a < 0.004) discard;
  vec3 col = mix(uColor, vec3(1.0, 0.95, 0.85), front * 0.5 + edge * 0.15);
  gl_FragColor = vec4(col * 1.4, min(a, 0.95));
}
`;

interface Slot {
  mesh: THREE.Mesh;
  /** Mesma geometria, sem teste de profundidade (visível através da grama). */
  overlay: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  geo: THREE.BufferGeometry;
  pos: THREE.BufferAttribute;
  local: THREE.BufferAttribute;
  active: boolean;
  t: number;
  dur: number;
  /** Tempo restante do desaparecimento final. */
  out: number;
  gen: number;
}

const SHAPE_ID: Record<TelegraphShape['type'], number> = { circle: 0, cone: 1, line: 2, ring: 3 };
const GRID = 22; // vértices por lado (máx.)

export class Telegraphs {
  readonly group = new THREE.Group();
  private slots: Slot[] = [];
  private uTime: { value: number };

  constructor(count: number, uTime: { value: number }) {
    this.uTime = uTime;
    this.group.name = 'vfx-telegraphs';
    const base = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {},
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      toneMapped: false,
    });
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BufferGeometry();
      const pos = new THREE.BufferAttribute(new Float32Array(GRID * GRID * 3), 3);
      pos.setUsage(THREE.DynamicDrawUsage);
      const local = new THREE.BufferAttribute(new Float32Array(GRID * GRID * 2), 2);
      local.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', pos);
      geo.setAttribute('aLocal', local);
      const idx: number[] = [];
      for (let z = 0; z < GRID - 1; z++)
        for (let x = 0; x < GRID - 1; x++) {
          const a = z * GRID + x;
          idx.push(a, a + GRID, a + 1, a + 1, a + GRID, a + GRID + 1);
        }
      geo.setIndex(idx);
      const mat = base.clone();
      mat.uniforms = {
        uShape: { value: 0 },
        uProgress: { value: 0 },
        uAlpha: { value: 1 },
        uTime,
        uColor: { value: new THREE.Color(0xff3020) },
        uP: { value: new THREE.Vector4(3, 0, 0.5, 2) },
        uLen: { value: 5 },
        uOverlay: { value: 0 },
      };
      const omat = mat.clone();
      omat.uniforms = { ...mat.uniforms, uOverlay: { value: 1 } };
      omat.depthTest = false;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.renderOrder = 9;
      mesh.name = `telegraph-${i}`;
      const overlay = new THREE.Mesh(geo, omat);
      overlay.frustumCulled = false;
      overlay.visible = false;
      overlay.renderOrder = 17;
      overlay.name = `telegraph-${i}-sobreposicao`;
      this.group.add(mesh, overlay);
      this.slots.push({ mesh, overlay, mat, geo, pos, local, active: false, t: 0, dur: 1, out: 0, gen: 0 });
    }
    base.dispose();
  }

  /** Cria a marcação. Se o pool estiver cheio, substitui a mais antiga. */
  create(shape: TelegraphShape, physics: CollisionWorld): VfxHandle {
    let s = this.slots.find((x) => !x.active);
    if (!s) {
      s = this.slots.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
    }
    const slot = s;
    slot.active = true;
    slot.t = 0;
    slot.dur = Math.max(0.05, shape.duration);
    slot.out = 0;
    slot.gen++;
    const gen = slot.gen;
    const R = Math.max(0.3, shape.radius ?? 3);
    const type = shape.type;
    const u = slot.mat.uniforms;
    u.uShape.value = SHAPE_ID[type] ?? 0;
    u.uProgress.value = 0;
    u.uAlpha.value = 0;
    u.uColor.value.setHex(shape.color ?? 0xff3020);
    const half = ((shape.angle ?? 60) * Math.PI) / 360;
    const width = Math.max(0.3, shape.width ?? 2);
    const length = Math.max(0.5, shape.length ?? R);
    u.uP.value.set(R, Math.max(0, Math.min(R - 0.2, shape.innerRadius ?? R * 0.5)), half, width);
    u.uLen.value = length;
    // retângulo local da forma
    let x0 = -R;
    let x1 = R;
    let y0 = -R;
    let y1 = R;
    if (type === 'line') {
      x0 = -width / 2;
      x1 = width / 2;
      y0 = 0;
      y1 = length;
    } else if (type === 'cone' && half <= Math.PI / 2) {
      const sx = R * Math.sin(half);
      x0 = -sx;
      x1 = sx;
      y0 = Math.min(0, R * Math.cos(half)) - 0.2;
      y1 = R;
    }
    const nx = Math.max(4, Math.min(GRID, Math.ceil((x1 - x0) / 0.9) + 1));
    const ny = Math.max(4, Math.min(GRID, Math.ceil((y1 - y0) / 0.9) + 1));
    const yaw = shape.yaw ?? 0;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    // "direita" local (x) — a máscara é simétrica, o sinal só precisa ser consistente
    const rx = fz;
    const rz = -fx;
    const p = shape.position;
    const hf = physics.heightfield;
    // plataforma/piso de arena no centro (topo de colisor caminhável)
    const gCenter = physics.groundHeight(p.x, p.z, p.y + 1.5);
    const tCenter = hf.heightAt(p.x, p.z);
    const platform = gCenter > tCenter + 0.25 ? gCenter : -Infinity;
    const pa = slot.pos.array as Float32Array;
    const la = slot.local.array as Float32Array;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const k = j * GRID + i;
        // vértices além da resolução usada repetem a última linha/coluna (triângulos degenerados)
        const ii = Math.min(i, nx - 1) / (nx - 1);
        const jj = Math.min(j, ny - 1) / (ny - 1);
        const lx = x0 + (x1 - x0) * ii;
        const ly = y0 + (y1 - y0) * jj;
        const wx = p.x + rx * lx + fx * ly;
        const wz = p.z + rz * lx + fz * ly;
        let wy = hf.heightAt(wx, wz);
        if (platform > wy) wy = platform;
        pa[k * 3] = wx;
        pa[k * 3 + 1] = wy + 0.07;
        pa[k * 3 + 2] = wz;
        la[k * 2] = lx;
        la[k * 2 + 1] = ly;
      }
    }
    slot.pos.needsUpdate = true;
    slot.local.needsUpdate = true;
    slot.mesh.visible = true;
    slot.overlay.visible = true;
    return {
      cancel() {
        if (slot.gen === gen && slot.active && slot.out <= 0) {
          slot.t = slot.dur;
          slot.out = 0.18;
        }
      },
    };
  }

  update(dt: number) {
    for (const s of this.slots) {
      if (!s.active) continue;
      const u = s.mat.uniforms;
      if (s.t < s.dur) {
        s.t += dt;
        const k = Math.min(1, s.t / s.dur);
        u.uProgress.value = k;
        u.uAlpha.value = Math.min(1, s.t / 0.12);
        if (s.t >= s.dur) s.out = 0.3;
      } else {
        // clarão no impacto e desaparecimento
        s.out -= dt;
        u.uProgress.value = 1;
        u.uAlpha.value = Math.max(0, s.out / 0.3) * 1.3;
        if (s.out <= 0) {
          s.active = false;
          s.mesh.visible = false;
          s.overlay.visible = false;
        }
      }
    }
  }

  activeCount(): number {
    let n = 0;
    for (const s of this.slots) if (s.active) n++;
    return n;
  }

  clear() {
    for (const s of this.slots) {
      s.active = false;
      s.mesh.visible = false;
      s.overlay.visible = false;
    }
  }
}
