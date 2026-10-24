/**
 * Fogueiras de acampamento: anel de pedras, lenha e (acesas) chamas, brasa, fumaça, luz e
 * estalos. [E] acende (apagada) ou abre a panela para cozinhar (acesa). Fogo de magia
 * (Centelha, armas de fogo) também acende. A chuva forte apaga as que estão ao ar livre.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GameContext } from '../core/context';
import type { Interactable } from '../core/Interaction';
import type { LightHandle } from '../combat/VFX';
import { CAMPFIRE, CAMPFIRES, type CampfireSpot } from '../data/interactive';
import { WATER_LEVEL } from '../data/world';
import type { Flames } from './flames';

export interface Campfire {
  spot: CampfireSpot;
  pos: THREE.Vector3;
  lit: boolean;
  /** Já foi acesa alguma vez (o jogador "descobriu"). */
  found: boolean;
  interactable: Interactable;
  light: LightHandle | null;
  smokeT: number;
  crackleT: number;
  hurtT: number;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _v = new THREE.Vector3();

export class Campfires {
  readonly list: Campfire[] = [];
  private mesh: THREE.InstancedMesh | null = null;
  private embers: THREE.InstancedMesh | null = null;
  private emberMat = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
  /** Abre a panela (posta pelo sistema: abre o menu de cozinhar). */
  onCook: ((c: Campfire) => void) | null = null;

  constructor(private ctx: GameContext) {}

  build() {
    const hf = this.ctx.heightfield;
    for (const spot of CAMPFIRES) {
      const p = findFlatSpot(this.ctx, spot.x, spot.z, 18);
      const c: Campfire = {
        spot,
        pos: new THREE.Vector3(p.x, hf.heightAt(p.x, p.z), p.z),
        lit: !!spot.lit,
        found: !!spot.lit,
        interactable: null as unknown as Interactable,
        light: null,
        smokeT: Math.random(),
        crackleT: Math.random() * 2,
        hurtT: 0,
      };
      c.interactable = {
        id: `fogueira:${spot.id}`,
        kind: 'use',
        prompt: '',
        position: c.pos,
        range: CAMPFIRE.interactRange,
        enabled: true,
        priority: 2,
        interact: () => this.use(c),
      };
      this.refreshPrompt(c);
      this.ctx.sys.interaction.register(c.interactable);
      this.list.push(c);
    }
    const geo = campfireGeometry();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.list.length);
    this.mesh.name = 'fogueiras';
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.embers = new THREE.InstancedMesh(new THREE.CircleGeometry(0.42, 10).rotateX(-Math.PI / 2).translate(0, 0.05, 0), this.emberMat, this.list.length);
    this.embers.name = 'brasas';
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      _q.setFromAxisAngle(_v.set(0, 1, 0), i * 1.7);
      _m.compose(c.pos, _q, _s);
      this.mesh.setMatrixAt(i, _m);
    }
    this.writeEmbers();
    this.ctx.scene.add(this.mesh, this.embers);
  }

  private writeEmbers() {
    if (!this.embers) return;
    for (let i = 0; i < this.list.length; i++) {
      const c = this.list[i];
      _m.compose(c.pos, _q.identity(), _s.setScalar(c.lit ? 1 : 0));
      this.embers.setMatrixAt(i, _m);
    }
    _s.set(1, 1, 1);
    this.embers.instanceMatrix.needsUpdate = true;
  }

  private refreshPrompt(c: Campfire) {
    c.interactable.prompt = c.lit ? 'Cozinhar na fogueira' : 'Acender a fogueira';
  }

  private use(c: Campfire) {
    if (!c.lit) {
      if (this.ctx.sys.env.rainIntensity > 0.45 && !this.ctx.sys.env.indoors) {
        this.ctx.sys.ui.notify('A lenha está encharcada. Espere a chuva passar.', 'warning');
        this.ctx.sys.audio.play('ui_error');
        return;
      }
      this.light(c);
      return;
    }
    this.onCook?.(c);
  }

  light(c: Campfire) {
    if (c.lit) return false;
    c.lit = true;
    c.found = true;
    this.refreshPrompt(c);
    this.writeEmbers();
    this.ctx.sys.audio.play('fire_ignite', { position: c.pos });
    this.ctx.sys.vfx.burst('fire', _v.copy(c.pos).setY(c.pos.y + 0.4), { scale: 0.8, count: 16 });
    this.ctx.events.emit('campfire:lit', { id: c.spot.id });
    return true;
  }

  extinguish(c: Campfire) {
    if (!c.lit) return;
    c.lit = false;
    this.refreshPrompt(c);
    this.writeEmbers();
    this.releaseLight(c);
    this.ctx.sys.vfx.puff(_v.copy(c.pos).setY(c.pos.y + 0.6), 0x8a8a8a, 1.4, 2.2, 0.5, 1);
  }

  /** Fogueira a até `r` m de um ponto. */
  near(x: number, z: number, r: number): Campfire | null {
    for (const c of this.list) if (Math.hypot(c.pos.x - x, c.pos.z - z) <= r) return c;
    return null;
  }

  private releaseLight(c: Campfire) {
    c.light?.cancel();
    c.light = null;
  }

  update(dt: number, flames: Flames, rain: number) {
    const ctx = this.ctx;
    const pp = ctx.sys.player.entity.position;
    const t = ctx.elapsed;
    for (const c of this.list) {
      const d = Math.hypot(c.pos.x - pp.x, c.pos.z - pp.z);
      if (!c.lit) continue;
      // chuva forte apaga aos poucos
      if (rain > 0.75 && Math.random() < dt * 0.02) {
        this.extinguish(c);
        continue;
      }
      if (d > 140) {
        this.releaseLight(c);
        continue;
      }
      // chamas (3 línguas) e luz tremulando
      const fl = 0.85 + 0.15 * Math.sin(t * 9 + c.pos.x) * Math.sin(t * 5.3 + c.pos.z);
      flames.push(c.pos.x, c.pos.y + 0.05, c.pos.z, 0.55 * fl);
      flames.push(c.pos.x + 0.16, c.pos.y + 0.05, c.pos.z - 0.1, 0.38 * fl);
      flames.push(c.pos.x - 0.14, c.pos.y + 0.05, c.pos.z + 0.12, 0.42 * fl);
      if (d < 45) {
        if (!c.light) c.light = ctx.sys.vfx.sustainedLight(_v.copy(c.pos).setY(c.pos.y + 0.9), CAMPFIRE.light.color, CAMPFIRE.light.intensity, 1e6, null, CAMPFIRE.light.distance);
        c.light?.setIntensity(CAMPFIRE.light.intensity * fl);
      } else this.releaseLight(c);
      c.smokeT -= dt;
      if (c.smokeT <= 0 && d < 80) {
        c.smokeT = 0.5 + Math.random() * 0.4;
        ctx.sys.vfx.puff(_v.copy(c.pos).setY(c.pos.y + 1.2), 0x3a3634, 0.8, 3, 0.25, 1.1);
      }
      c.crackleT -= dt;
      if (c.crackleT <= 0 && d < 25) {
        c.crackleT = 0.6 + Math.random() * 1.6;
        ctx.sys.audio.play('amb_crackle', { position: c.pos, volume: 0.6 });
      }
      // pisar no fogo queima
      c.hurtT -= dt;
      if (c.hurtT <= 0 && d < CAMPFIRE.hurtRadius && Math.abs(pp.y - c.pos.y) < 1) {
        c.hurtT = 0.5;
        ctx.sys.combat.applyDamage(ctx.sys.player.entity, { amount: 4, type: 'fire', statuses: [{ id: 'burn', duration: 1.5, magnitude: 3 }], tag: 'fogueira', source: null });
      }
    }
  }

  serialize() {
    return this.list.filter((c) => c.lit !== !!c.spot.lit || c.found).map((c) => ({ id: c.spot.id, lit: c.lit, found: c.found }));
  }

  deserialize(data: unknown) {
    this.reset();
    if (!Array.isArray(data)) return;
    for (const raw of data) {
      if (!raw || typeof raw !== 'object') continue;
      const r = raw as { id?: unknown; lit?: unknown; found?: unknown };
      const c = this.list.find((x) => x.spot.id === r.id);
      if (!c) continue;
      c.lit = !!r.lit;
      c.found = !!r.found;
      this.refreshPrompt(c);
    }
    this.writeEmbers();
  }

  reset() {
    for (const c of this.list) {
      this.releaseLight(c);
      c.lit = !!c.spot.lit;
      c.found = !!c.spot.lit;
      this.refreshPrompt(c);
    }
    this.writeEmbers();
  }
}

/** Procura chão plano, seco e livre perto de (x, z). */
export function findFlatSpot(ctx: GameContext, x: number, z: number, radius: number): { x: number; z: number } {
  const hf = ctx.heightfield;
  const maps = ctx.sys.world.maps;
  let best = { x, z };
  let bestScore = -Infinity;
  for (let r = 0; r <= radius; r += 1.5) {
    const n = r === 0 ? 1 : Math.ceil((r * Math.PI * 2) / 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      const h = hf.heightAt(px, pz);
      if (h < WATER_LEVEL + 0.4) continue;
      const slope = hf.slopeAt(px, pz);
      if (slope > 14) continue;
      if (maps?.blockedAt(px, pz)) continue;
      let clear = true;
      for (const c of ctx.physics.near(px, pz, 2.5)) {
        if (c.type === 'cylinder' ? Math.hypot(c.x - px, c.z - pz) < c.radius + 2 : Math.hypot(c.x - px, c.z - pz) < Math.max(c.hx, c.hz) + 2) {
          clear = false;
          break;
        }
      }
      if (!clear) continue;
      const score = -slope * 0.5 - r * 0.2;
      if (score > bestScore) {
        bestScore = score;
        best = { x: px, z: pz };
      }
    }
    if (bestScore > -2) break;
  }
  return best;
}

let cachedGeo: THREE.BufferGeometry | null = null;

function campfireGeometry(): THREE.BufferGeometry {
  if (cachedGeo) return cachedGeo;
  const parts: THREE.BufferGeometry[] = [];
  const color = (g: THREE.BufferGeometry, r: number, gg: number, b: number) => {
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const v = 0.85 + 0.3 * ((Math.sin(i * 12.9898) * 43758.5453) % 1);
      c[i * 3] = r * v;
      c[i * 3 + 1] = gg * v;
      c[i * 3 + 2] = b * v;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  };
  // anel de pedras
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = 0.16 + ((i * 37) % 5) * 0.025;
    const g = new THREE.DodecahedronGeometry(s, 0);
    g.scale(1.2, 0.75, 1);
    g.rotateY(a);
    g.translate(Math.cos(a) * 0.62, s * 0.4, Math.sin(a) * 0.62);
    parts.push(color(g, 0.45, 0.43, 0.41));
  }
  // lenha cruzada
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI + 0.3;
    const g = new THREE.CylinderGeometry(0.07, 0.08, 0.95, 7).toNonIndexed();
    g.rotateZ(Math.PI / 2 - 0.35);
    g.rotateY(a);
    g.translate(0, 0.2, 0);
    parts.push(color(g, 0.36, 0.24, 0.14));
  }
  // cinzas
  const ash = new THREE.CircleGeometry(0.5, 12).toNonIndexed();
  ash.rotateX(-Math.PI / 2);
  ash.translate(0, 0.02, 0);
  parts.push(color(ash, 0.12, 0.11, 0.1));
  cachedGeo = mergeGeometries(parts)!;
  cachedGeo.computeVertexNormals();
  return cachedGeo;
}
