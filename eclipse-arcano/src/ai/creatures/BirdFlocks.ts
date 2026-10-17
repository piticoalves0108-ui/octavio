import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import { BIRD_FLOCK } from '../../data/creatures';
import { WATER_LEVEL } from '../../data/world';
import { rand } from '../shared';

/**
 * Bandos de pássaros baratos: UMA InstancedMesh para todos os pássaros do mundo.
 * No chão ciscam; quando o jogador chega perto (ou há barulho) levantam voo juntos
 * (boids simplificados: coesão, alinhamento, separação + alvo de voo) e pousam
 * em outro ponto da zona depois de alguns segundos. O bater de asas é a escala Y
 * da instância oscilando (geometria em "V").
 */
const CAP = 96;
const N = BIRD_FLOCK.size;

interface Flock {
  key: string;
  center: THREE.Vector3;
  radius: number;
  /** Posições/velocidades (x,y,z) de cada pássaro. */
  pos: Float32Array;
  vel: Float32Array;
  phase: Float32Array;
  ground: Float32Array;
  flying: boolean;
  t: number;
  flightTime: number;
  readonly land: THREE.Vector3;
  readonly target: THREE.Vector3;
  base: number;
  visible: boolean;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

export class BirdFlocks {
  readonly mesh: THREE.InstancedMesh;
  private flocks = new Map<string, Flock>();
  private free: number[] = [];
  private dirty = false;
  stats = { flocks: 0, birds: 0, scares: 0 };

  constructor(scene: THREE.Scene) {
    // corpo + asas em V (vértices das asas sobem com |x|)
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([
      // asa esquerda
      0, 0, 0.08, 0.26, 0.12, -0.02, 0, 0, -0.08,
      // asa direita
      0, 0, 0.08, 0, 0, -0.08, -0.26, 0.12, -0.02,
      // corpo (losango fino)
      0, 0.02, 0.14, 0.03, 0, -0.04, -0.03, 0, -0.04,
      0, -0.02, 0.14, -0.03, 0, -0.04, 0.03, 0, -0.04,
      // cauda
      0, 0, -0.04, 0.05, 0, -0.16, -0.05, 0, -0.16,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ color: 0x2a2622, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(g, mat, CAP);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.name = 'bird-flocks';
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    for (let i = CAP - 1; i >= 0; i--) this.free.push(i);
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < CAP; i++) this.mesh.setMatrixAt(i, _m);
  }

  add(key: string, center: THREE.Vector3, radius: number, ctx: GameContext): boolean {
    if (this.flocks.has(key)) return true;
    if (this.free.length < N) return false;
    // ocupa um bloco contíguo do fim (simples: N índices livres)
    const idx: number[] = [];
    for (let i = 0; i < N; i++) idx.push(this.free.pop()!);
    const f: Flock = {
      key,
      center: center.clone(),
      radius,
      pos: new Float32Array(N * 3),
      vel: new Float32Array(N * 3),
      phase: new Float32Array(N),
      ground: new Float32Array(N),
      flying: false,
      t: 0,
      flightTime: 0,
      land: new THREE.Vector3(),
      target: new THREE.Vector3(),
      base: idx[0],
      visible: true,
    };
    (f as Flock & { idx: number[] }).idx = idx;
    this.pickLand(f, ctx);
    for (let i = 0; i < N; i++) {
      const x = f.land.x + rand(-BIRD_FLOCK.landRadius, BIRD_FLOCK.landRadius);
      const z = f.land.z + rand(-BIRD_FLOCK.landRadius, BIRD_FLOCK.landRadius);
      f.pos[i * 3] = x;
      f.pos[i * 3 + 1] = ctx.heightfield.heightAt(x, z);
      f.pos[i * 3 + 2] = z;
      f.phase[i] = Math.random() * 10;
    }
    this.flocks.set(key, f);
    this.mesh.count = CAP;
    return true;
  }

  remove(key: string) {
    const f = this.flocks.get(key) as (Flock & { idx: number[] }) | undefined;
    if (!f) return;
    _m.makeScale(0, 0, 0);
    for (const i of f.idx) {
      this.mesh.setMatrixAt(i, _m);
      this.free.push(i);
    }
    this.flocks.delete(key);
    this.dirty = true;
  }

  clear() {
    for (const k of [...this.flocks.keys()]) this.remove(k);
  }

  private pickLand(f: Flock, ctx: GameContext) {
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * f.radius;
      const x = f.center.x + Math.cos(a) * r;
      const z = f.center.z + Math.sin(a) * r;
      if (ctx.heightfield.heightAt(x, z) > WATER_LEVEL + 0.3) {
        f.land.set(x, ctx.heightfield.heightAt(x, z), z);
        return;
      }
    }
    f.land.copy(f.center);
  }

  /** Assusta bandos perto de um som alto. */
  scare(pos: THREE.Vector3, radius: number) {
    for (const f of this.flocks.values()) {
      if (f.flying) continue;
      const dx = f.land.x - pos.x;
      const dz = f.land.z - pos.z;
      if (dx * dx + dz * dz < radius * radius) this.takeOff(f, pos);
    }
  }

  private takeOff(f: Flock, from: THREE.Vector3) {
    f.flying = true;
    f.t = 0;
    f.flightTime = rand(BIRD_FLOCK.flightTime[0], BIRD_FLOCK.flightTime[1]);
    this.stats.scares++;
    for (let i = 0; i < N; i++) {
      const dx = f.pos[i * 3] - from.x;
      const dz = f.pos[i * 3 + 2] - from.z;
      const l = Math.hypot(dx, dz) || 1;
      f.vel[i * 3] = (dx / l) * 4 + rand(-1, 1);
      f.vel[i * 3 + 1] = rand(4, 7);
      f.vel[i * 3 + 2] = (dz / l) * 4 + rand(-1, 1);
    }
    f.target.set(f.center.x + rand(-f.radius, f.radius), f.land.y + rand(14, 24), f.center.z + rand(-f.radius, f.radius));
  }

  update(dt: number, ctx: GameContext) {
    const pl = ctx.sys.player.entity.position;
    let birds = 0;
    for (const f of this.flocks.values()) {
      const fi = f as Flock & { idx: number[] };
      const dxp = f.land.x - pl.x;
      const dzp = f.land.z - pl.z;
      const dP2 = dxp * dxp + dzp * dzp;
      const visible = dP2 < 220 * 220;
      if (!visible) {
        if (f.visible) {
          f.visible = false;
          _m.makeScale(0, 0, 0);
          for (const i of fi.idx) this.mesh.setMatrixAt(i, _m);
          this.dirty = true;
        }
        continue;
      }
      f.visible = true;
      birds += N;
      if (!f.flying) {
        // jogador perto (ou voando baixo por cima) → levanta voo
        if (dP2 < BIRD_FLOCK.scareRadius * BIRD_FLOCK.scareRadius * (ctx.sys.player.horizontalSpeed > 5 ? 2.2 : 1)) this.takeOff(f, pl);
      }
      f.t += dt;
      if (f.flying) this.simulateFlight(f, dt, ctx);
      else this.simulateGround(f, dt);
      // matrizes
      for (let i = 0; i < N; i++) {
        const x = f.pos[i * 3];
        const y = f.pos[i * 3 + 1];
        const z = f.pos[i * 3 + 2];
        const vx = f.vel[i * 3];
        const vy = f.vel[i * 3 + 1];
        const vz = f.vel[i * 3 + 2];
        const hs = Math.hypot(vx, vz);
        const yaw = hs > 0.05 ? Math.atan2(vx, vz) : f.phase[i];
        _e.set(f.flying ? -Math.atan2(vy, Math.max(0.1, hs)) * 0.6 : 0, yaw, 0);
        _q.setFromEuler(_e);
        f.phase[i] += dt * (f.flying ? 16 : 0);
        const flap = f.flying ? Math.sin(f.phase[i]) : 0.25;
        _s.set(1.3, flap * 1.6, 1.3);
        _p.set(x, y + 0.08, z);
        _m.compose(_p, _q, _s);
        this.mesh.setMatrixAt(fi.idx[i], _m);
      }
      this.dirty = true;
    }
    this.stats.flocks = this.flocks.size;
    this.stats.birds = birds;
    if (this.dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.dirty = false;
    }
  }

  private simulateGround(f: Flock, dt: number) {
    for (let i = 0; i < N; i++) {
      // pulinhos ocasionais
      if (Math.random() < dt * 0.4) {
        const a = Math.random() * Math.PI * 2;
        f.vel[i * 3] = Math.cos(a) * 0.8;
        f.vel[i * 3 + 2] = Math.sin(a) * 0.8;
        f.phase[i] = a;
      }
      f.vel[i * 3] *= Math.exp(-6 * dt);
      f.vel[i * 3 + 2] *= Math.exp(-6 * dt);
      f.vel[i * 3 + 1] = 0;
      f.pos[i * 3] += f.vel[i * 3] * dt;
      f.pos[i * 3 + 2] += f.vel[i * 3 + 2] * dt;
      // fica perto do ponto de pouso
      const dx = f.pos[i * 3] - f.land.x;
      const dz = f.pos[i * 3 + 2] - f.land.z;
      if (dx * dx + dz * dz > BIRD_FLOCK.landRadius * BIRD_FLOCK.landRadius * 2) {
        f.vel[i * 3] -= dx * dt;
        f.vel[i * 3 + 2] -= dz * dt;
      }
    }
  }

  private simulateFlight(f: Flock, dt: number, ctx: GameContext) {
    const landing = f.t > f.flightTime;
    if (landing && f.t - dt <= f.flightTime) {
      this.pickLand(f, ctx);
      f.target.copy(f.land);
    }
    if (!landing && f.t % 4 < dt) f.target.set(f.center.x + rand(-f.radius, f.radius), f.land.y + rand(14, 26), f.center.z + rand(-f.radius, f.radius));
    // centro e velocidade média
    let cx = 0;
    let cy = 0;
    let cz = 0;
    let ax = 0;
    let ay = 0;
    let az = 0;
    for (let i = 0; i < N; i++) {
      cx += f.pos[i * 3];
      cy += f.pos[i * 3 + 1];
      cz += f.pos[i * 3 + 2];
      ax += f.vel[i * 3];
      ay += f.vel[i * 3 + 1];
      az += f.vel[i * 3 + 2];
    }
    cx /= N;
    cy /= N;
    cz /= N;
    ax /= N;
    ay /= N;
    az /= N;
    const B = BIRD_FLOCK;
    let grounded = 0;
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      const px = f.pos[o];
      const py = f.pos[o + 1];
      const pz = f.pos[o + 2];
      let fx = (cx - px) * B.cohesion * 0.3 + (ax - f.vel[o]) * B.alignment * 0.5;
      let fy = (cy - py) * B.cohesion * 0.3 + (ay - f.vel[o + 1]) * B.alignment * 0.5;
      let fz = (cz - pz) * B.cohesion * 0.3 + (az - f.vel[o + 2]) * B.alignment * 0.5;
      for (let j = 0; j < N; j++) {
        if (j === i) continue;
        const dx = px - f.pos[j * 3];
        const dy = py - f.pos[j * 3 + 1];
        const dz = pz - f.pos[j * 3 + 2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < B.separationDist * B.separationDist && d2 > 1e-4) {
          const k = B.separation / d2;
          fx += dx * k;
          fy += dy * k;
          fz += dz * k;
        }
      }
      // alvo (cada um mira um ponto levemente diferente ao pousar)
      const tx = f.target.x + (landing ? Math.cos(i * 2.4) * 2.5 : 0);
      const tz = f.target.z + (landing ? Math.sin(i * 2.4) * 2.5 : 0);
      const ty = landing ? ctx.heightfield.heightAt(tx, tz) : f.target.y;
      const gx = tx - px;
      const gy = ty - py;
      const gz = tz - pz;
      const gl = Math.hypot(gx, gy, gz) || 1;
      fx += (gx / gl) * 4;
      fy += (gy / gl) * 4;
      fz += (gz / gl) * 4;
      f.vel[o] += fx * dt;
      f.vel[o + 1] += fy * dt;
      f.vel[o + 2] += fz * dt;
      const sp = Math.hypot(f.vel[o], f.vel[o + 1], f.vel[o + 2]);
      const max = landing && gl < 6 ? Math.max(1.2, gl) : B.speed;
      if (sp > max) {
        const k = max / sp;
        f.vel[o] *= k;
        f.vel[o + 1] *= k;
        f.vel[o + 2] *= k;
      }
      f.pos[o] += f.vel[o] * dt;
      f.pos[o + 1] += f.vel[o + 1] * dt;
      f.pos[o + 2] += f.vel[o + 2] * dt;
      const g = ctx.heightfield.heightAt(f.pos[o], f.pos[o + 2]);
      if (f.pos[o + 1] < g) {
        f.pos[o + 1] = g;
        if (landing) grounded++;
      } else if (landing && f.pos[o + 1] - g < 0.25) grounded++;
    }
    if (landing && (grounded >= N - 1 || f.t > f.flightTime + 12)) {
      f.flying = false;
      for (let i = 0; i < N; i++) {
        f.vel[i * 3] = f.vel[i * 3 + 1] = f.vel[i * 3 + 2] = 0;
        f.pos[i * 3 + 1] = ctx.heightfield.heightAt(f.pos[i * 3], f.pos[i * 3 + 2]);
      }
      f.land.set(cx, cy, cz);
    }
  }

  debug() {
    return [...this.flocks.values()].map((f) => ({ key: f.key, flying: f.flying, x: +f.land.x.toFixed(1), z: +f.land.z.toFixed(1) }));
  }
}
