/**
 * Objetos físicos do mundo: barris, caixotes, pedregulhos, potes e barris de pólvora rúnica.
 *
 * Física simples e estável (sem engine): corpo = esfera para o chão/encostas + cilindro de
 * colisão (o jogador esbarra, sobe em cima, projéteis acertam). Rolam ladeira abaixo,
 * escorregam, quicam, boiam, são empurrados pelo jogador, voam com golpes e explosões,
 * atropelam inimigos, pegam fogo, quebram e soltam saque. A Estase Temporal congela um
 * objeto: os golpes acumulam força e, no fim, ele dispara.
 *
 * Render: um InstancedMesh por tipo. Sem alocação por quadro.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GameContext } from '../core/context';
import type { WorldStrike } from '../core/EventBus';
import type { Entity } from '../core/Entity';
import type { CylinderCollider } from '../world/Collision';
import { WATER_LEVEL } from '../data/world';
import { POWDER, PROPS, PROP_PHYSICS as PH, STASIS, type PropKind } from '../data/interactive';
import type { Flames } from './flames';

export const PROP_KINDS: PropKind[] = ['barrel', 'crate', 'boulder', 'jar', 'powder'];

export interface PropBody {
  id: number;
  kind: PropKind;
  /** Base (centro do fundo) no mundo. */
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  yaw: number;
  home: THREE.Vector3;
  homeYaw: number;
  hp: number;
  sleeping: boolean;
  still: number;
  /** Tempo pegando fogo (s); <0 = apagado. */
  burn: number;
  /** Pavio da pólvora (s); <0 = apagado. */
  fuse: number;
  broken: boolean;
  respawnAt: number;
  /** Estase restante (s) e força acumulada. */
  stasis: number;
  stasisImp: THREE.Vector3;
  collider: CylinderCollider | null;
  /** Quem empurrou/acertou por último (crédito do dano ao atropelar). */
  lastHitter: Entity | null;
  crushT: number;
  /** Índice dentro do InstancedMesh do tipo. */
  slot: number;
  /** Objeto está dentro da área ativa. */
  active: boolean;
  onGround: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _n = { x: 0, y: 1, z: 0 };
const _col = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class PropSystem {
  readonly group = new THREE.Group();
  readonly bodies: PropBody[] = [];
  private meshes: Partial<Record<PropKind, THREE.InstancedMesh>> = {};
  private counts: Record<PropKind, number> = { barrel: 0, crate: 0, boulder: 0, jar: 0, powder: 0 };
  private material: THREE.MeshStandardMaterial;
  private nextId = 1;
  private list: Entity[] = [];
  private acc = 0;
  private time = 0;
  /** Estatísticas (testes). */
  readonly stats = { broken: 0, exploded: 0, crushed: 0, launched: 0, pushed: 0 };
  /** Chamado quando um objeto quebra (para o mundo soltar saque etc.). */
  onBreak: ((b: PropBody, cause: string) => void) | null = null;
  /** Chamado quando a pólvora explode (o mundo incendeia a grama). */
  onExplode: ((pos: THREE.Vector3) => void) | null = null;
  /** Chamado com objetos queimando (o mundo põe fogo na grama embaixo). */
  onBurning: ((b: PropBody) => void) | null = null;

  constructor(private ctx: GameContext) {
    this.group.name = 'objetos-fisicos';
    this.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
    // cor de instância acima de 1 vira brilho (estase dourada, pavio aceso)
    this.material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
totalEmissiveRadiance += max( vColor.rgb - vec3( 1.0 ), vec3( 0.0 ) ) * 1.6;
#endif`,
      );
    };
    this.material.customProgramCacheKey = () => 'props-v1';
  }

  /** Cria um objeto (antes de `build`). */
  add(kind: PropKind, x: number, y: number, z: number, yaw: number): PropBody {
    const def = PROPS[kind];
    const b: PropBody = {
      id: this.nextId++,
      kind,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(),
      quat: new THREE.Quaternion().setFromAxisAngle(UP, yaw),
      yaw,
      home: new THREE.Vector3(x, y, z),
      homeYaw: yaw,
      hp: def.hp,
      sleeping: true,
      still: 0,
      burn: -1,
      fuse: -1,
      broken: false,
      respawnAt: 0,
      stasis: 0,
      stasisImp: new THREE.Vector3(),
      collider: null,
      lastHitter: null,
      crushT: 0,
      slot: this.counts[kind]++,
      active: false,
      onGround: true,
    };
    this.bodies.push(b);
    return b;
  }

  /** Monta as malhas instanciadas (depois de todos os `add`). */
  build() {
    const geos = propGeometries();
    for (const k of PROP_KINDS) {
      const n = this.counts[k];
      if (!n) continue;
      const mesh = new THREE.InstancedMesh(geos[k], this.material, n);
      mesh.name = `objeto:${k}`;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      this.meshes[k] = mesh;
      this.group.add(mesh);
    }
    for (const b of this.bodies) this.writeInstance(b);
  }

  /** Centro do corpo (para mira, dano e efeitos). */
  center(b: PropBody, out: THREE.Vector3) {
    return out.set(b.pos.x, b.pos.y + PROPS[b.kind].height * 0.5, b.pos.z);
  }

  private ensureCollider(b: PropBody) {
    if (b.collider || b.broken) return;
    const d = PROPS[b.kind];
    b.collider = this.ctx.physics.addCylinder(b.pos.x, b.pos.z, d.radius, b.pos.y, b.pos.y + d.height, 'prop', { walkable: true, blocksSight: d.radius > 0.6, surface: b.kind === 'boulder' || b.kind === 'jar' ? 'stone' : 'wood' });
  }

  private dropCollider(b: PropBody) {
    if (!b.collider) return;
    this.ctx.physics.remove(b.collider);
    b.collider = null;
  }

  /** Acorda (sai do repouso). */
  wake(b: PropBody) {
    b.sleeping = false;
    b.still = 0;
  }

  /** Empurra com uma velocidade (m/s), respeitando a estase. */
  impulse(b: PropBody, dx: number, dy: number, dz: number, hitter: Entity | null) {
    if (b.broken) return;
    if (hitter) b.lastHitter = hitter;
    if (b.stasis > 0) {
      b.stasisImp.x += dx;
      b.stasisImp.y += dy;
      b.stasisImp.z += dz;
      return;
    }
    b.vel.x += dx;
    b.vel.y += dy;
    b.vel.z += dz;
    this.wake(b);
  }

  /** Dano direto (golpes, explosões, fogo). */
  damage(b: PropBody, amount: number, cause: string) {
    const def = PROPS[b.kind];
    if (b.broken || def.hp <= 0 || amount <= 0) return;
    if (b.stasis > 0) return; // congelado no tempo: nada o afeta até soltar
    b.hp -= amount;
    if (b.hp <= 0) {
      if (def.explosive) this.explode(b);
      else this.breakBody(b, cause);
    }
  }

  /** Pega fogo (objetos inflamáveis) ou acende o pavio (pólvora). */
  ignite(b: PropBody) {
    const def = PROPS[b.kind];
    if (b.broken || b.stasis > 0) return;
    if (def.explosive) {
      if (b.fuse < 0) {
        b.fuse = POWDER.fuse;
        this.ctx.sys.audio.play('fire_ignite', { position: b.pos, volume: 0.8 });
      }
      return;
    }
    if (def.flammable && b.burn < 0) {
      b.burn = 0;
      this.ctx.sys.audio.play('fire_ignite', { position: b.pos, volume: 0.6 });
    }
  }

  /** Congela no tempo (Estase Temporal). */
  freeze(b: PropBody) {
    b.stasis = STASIS.duration;
    b.stasisImp.set(0, 0, 0);
    b.vel.set(0, 0, 0);
    b.sleeping = true;
  }

  breakBody(b: PropBody, cause: string) {
    if (b.broken) return;
    const { vfx, audio } = this.ctx.sys;
    const c = this.center(b, _v);
    b.broken = true;
    b.respawnAt = this.time + PH.respawn;
    b.burn = -1;
    b.fuse = -1;
    b.stasis = 0;
    this.dropCollider(b);
    this.stats.broken++;
    const wood = b.kind !== 'jar';
    vfx.burst('dust', c, { scale: 0.9, count: 10 });
    for (let i = 0; i < 12; i++) {
      vfx.spark(c, wood ? 0x8a6440 : 0xb07a5a, 0.09, 0.9, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, 14, 0);
    }
    audio.play(wood ? 'wood_break' : 'hit_metal', { position: c, volume: 0.9, pitch: wood ? 1 : 1.6 });
    this.writeInstance(b);
    this.onBreak?.(b, cause);
  }

  explode(b: PropBody) {
    if (b.broken) return;
    const ctx = this.ctx;
    const c = this.center(b, new THREE.Vector3());
    b.broken = true;
    b.respawnAt = this.time + PH.respawn;
    b.fuse = -1;
    b.burn = -1;
    this.dropCollider(b);
    this.writeInstance(b);
    this.stats.exploded++;
    this.stats.broken++;
    const { vfx, audio, combat, camera } = ctx.sys;
    vfx.burst('fire', c, { scale: 2.4, count: 40 });
    vfx.burst('smoke', c, { scale: 2 });
    vfx.ring(c, POWDER.radius, 0xff8a3a, 0.5);
    vfx.flash(c, 0xff8a3a, 60, 0.4);
    audio.play('explosion', { position: c, volume: 1 });
    const d = c.distanceTo(ctx.sys.player.entity.position);
    if (d < 30) camera.shake(Math.min(0.8, 0.9 * (1 - d / 30)), 0.45);
    // fere todos (inclusive o jogador): é uma explosão, não um feitiço
    combat.explode(c, POWDER.radius, { amount: POWDER.damage, type: 'fire', knockback: POWDER.knockback, poiseDamage: 60, statuses: [{ id: 'burn', duration: 3, magnitude: 4 }], tag: 'powder', source: b.lastHitter }, null, { falloff: true });
    this.onExplode?.(c);
  }

  /** Reação a um golpe/explosão/feixe/projétil. */
  onStrike(s: WorldStrike) {
    const info = s.info;
    const fire = info.type === 'fire';
    const shock = info.type === 'lightning';
    for (const b of this.bodies) {
      if (b.broken || !b.active) continue;
      const def = PROPS[b.kind];
      const c = this.center(b, _v);
      let dirX = 0;
      let dirY = 0;
      let dirZ = 0;
      let k = 1;
      if (s.shape === 'sphere') {
        const dx = c.x - s.origin.x;
        const dy = c.y - s.origin.y;
        const dz = c.z - s.origin.z;
        const d = Math.hypot(dx, dy, dz);
        const reach = s.radius + def.radius;
        if (d > reach) continue;
        k = 1 - 0.5 * Math.min(1, d / Math.max(0.01, reach));
        if (d > 1e-3) {
          dirX = dx / d;
          dirY = dy / d;
          dirZ = dz / d;
        } else if (info.direction) {
          dirX = info.direction.x;
          dirZ = info.direction.z;
        }
        dirY = Math.max(dirY, 0) + 0.35;
      } else if (s.shape === 'arc') {
        const dx = c.x - s.origin.x;
        const dz = c.z - s.origin.z;
        const d = Math.hypot(dx, dz) - def.radius;
        if (d > s.radius || Math.abs(c.y - s.origin.y - 0.9) > def.height * 0.5 + 1.6) continue;
        const f = s.dir!;
        if (d > 0.4 && (s.arcDeg ?? 360) < 360) {
          const cosHalf = Math.cos((((s.arcDeg ?? 360) * Math.PI) / 180) * 0.5);
          if ((dx * f.x + dz * f.z) / Math.max(1e-3, Math.hypot(dx, dz)) < cosHalf) continue;
        }
        dirX = f.x;
        dirZ = f.z;
        dirY = 0.3;
      } else {
        // feixe: distância do centro à linha
        const o = s.origin;
        const f = s.dir!;
        _v2.set(c.x - o.x, c.y - o.y, c.z - o.z);
        const t = _v2.dot(f);
        if (t < 0 || t > (s.length ?? 0) + def.radius) continue;
        _v2.addScaledVector(f, -t);
        if (_v2.length() > s.radius + def.radius) continue;
        dirX = f.x;
        dirY = f.y + 0.2;
        dirZ = f.z;
      }
      const amount = info.amount ?? 0;
      const kb = info.knockback ?? 3;
      const blast = s.shape === 'sphere' && s.radius > 1.5;
      let mag = (kb * PH.hitImpulse + (blast ? amount * PH.blastImpulse : amount * 0.03)) * k;
      if (b.stasis > 0) mag = kb * STASIS.perHit + amount * STASIS.perDamage;
      else mag /= def.mass;
      this.impulse(b, dirX * mag, dirY * mag, dirZ * mag, s.source);
      if (fire) this.ignite(b);
      if (shock && def.explosive) this.ignite(b);
      this.damage(b, amount * k, info.tag ?? 'golpe');
    }
  }

  /** Objeto mais próximo da mira (raio da câmera) dentro do alcance. */
  pick(origin: THREE.Vector3, dir: THREE.Vector3, range: number, maxDeg: number): PropBody | null {
    const cosMax = Math.cos((maxDeg * Math.PI) / 180);
    let best: PropBody | null = null;
    let bestScore = -Infinity;
    for (const b of this.bodies) {
      if (b.broken || !b.active) continue;
      const c = this.center(b, _v);
      _v2.subVectors(c, origin);
      const d = _v2.length();
      if (d > range || d < 0.5) continue;
      const cos = _v2.dot(dir) / d;
      // objetos grandes perto toleram mais desvio
      const tol = Math.atan(PROPS[b.kind].radius / d);
      if (Math.acos(Math.min(1, cos)) > Math.acos(cosMax) + tol) continue;
      const score = cos * 4 - d * 0.02;
      if (score > bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return best;
  }

  /** Simulação: passos fixos de 1/60 s (até 3 por quadro). */
  update(dt: number, flames: Flames, wetness: number) {
    this.time += dt;
    const pp = this.ctx.sys.player.entity.position;
    const R = PH.activeRadius;
    // ativa/desativa por distância e reaparece objetos quebrados longe do jogador
    for (const b of this.bodies) {
      const dist = Math.hypot(b.pos.x - pp.x, b.pos.z - pp.z);
      if (b.broken) {
        if (this.time >= b.respawnAt && Math.hypot(b.home.x - pp.x, b.home.z - pp.z) > 60) this.respawn(b);
        continue;
      }
      const want = dist < R;
      if (want && !b.active) {
        b.active = true;
        this.ensureCollider(b);
      } else if (!want && b.active && dist > R + 20) {
        b.active = false;
        b.sleeping = true;
        b.vel.set(0, 0, 0);
        this.dropCollider(b);
      }
    }
    this.acc += dt;
    const step = 1 / 60;
    let n = 0;
    while (this.acc >= step && n < 3) {
      this.acc -= step;
      n++;
      this.step(step, wetness);
    }
    if (n === 3) this.acc = 0;
    this.pushByPlayer(dt);
    // fogo, pavio, estase e desenho
    for (const b of this.bodies) {
      if (b.broken || !b.active) continue;
      if (b.stasis > 0) {
        b.stasis -= dt;
        if (b.stasis <= 0) this.release(b);
      }
      if (b.fuse >= 0) {
        b.fuse -= dt;
        if (Math.random() < dt * 30) this.ctx.sys.vfx.spark(this.center(b, _v).setY(b.pos.y + PROPS[b.kind].height + 0.05), 0xffc060, 0.07, 0.35, (Math.random() - 0.5) * 2, 2.5, (Math.random() - 0.5) * 2, 6, 0);
        if (b.fuse <= 0) {
          this.explode(b);
          continue;
        }
      }
      if (b.burn >= 0) {
        // chuva apaga
        if (wetness > 0.6 && Math.random() < dt * 0.6) b.burn = -1;
        else {
          b.burn += dt;
          const d = PROPS[b.kind];
          flames.push(b.pos.x, b.pos.y + d.height * 0.35, b.pos.z, d.radius * 1.5);
          if (Math.random() < dt * 3) this.ctx.sys.vfx.puff(this.center(b, _v).setY(b.pos.y + d.height + 0.4), 0x302a28, 0.9, 1.6, 0.35, 1.4);
          this.onBurning?.(b);
          if (b.burn > 4.5) this.breakBody(b, 'fogo');
        }
      }
      if (b.crushT > 0) b.crushT -= dt;
      if (!b.sleeping || b.stasis > 0 || b.burn >= 0 || b.fuse >= 0) this.writeInstance(b);
    }
    for (const k of PROP_KINDS) {
      const m = this.meshes[k];
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  private release(b: PropBody) {
    b.stasis = 0;
    const L = b.stasisImp.length();
    if (L > 0.01) {
      if (L > STASIS.maxLaunch) b.stasisImp.multiplyScalar(STASIS.maxLaunch / L);
      b.vel.copy(b.stasisImp);
      this.stats.launched++;
      this.ctx.sys.audio.play('cast_teleport', { position: b.pos, volume: 0.7, pitch: 1.3 });
    }
    b.stasisImp.set(0, 0, 0);
    this.wake(b);
  }

  private respawn(b: PropBody) {
    b.broken = false;
    b.hp = PROPS[b.kind].hp;
    b.pos.copy(b.home);
    b.yaw = b.homeYaw;
    b.quat.setFromAxisAngle(UP, b.yaw);
    b.vel.set(0, 0, 0);
    b.burn = -1;
    b.fuse = -1;
    b.stasis = 0;
    b.sleeping = true;
    b.active = false;
    this.writeInstance(b);
  }

  private step(dt: number, wetness: number) {
    const phys = this.ctx.physics;
    const hf = this.ctx.heightfield;
    for (const b of this.bodies) {
      if (b.broken || !b.active || b.sleeping || b.stasis > 0) continue;
      const d = PROPS[b.kind];
      const col = b.collider;
      if (col) phys.setEnabled(col, false);
      const v = b.vel;
      v.y -= PH.gravity * dt;
      // água
      const ground = phys.groundHeight(b.pos.x, b.pos.z, b.pos.y + 0.4, 0.5, d.radius * 0.6);
      const inWater = ground < WATER_LEVEL && b.pos.y < WATER_LEVEL;
      if (inWater) {
        const sub = Math.min(1, (WATER_LEVEL - b.pos.y) / d.height);
        if (d.floats) v.y += PH.buoyancy * sub * dt;
        const drag = Math.exp(-PH.waterDrag * dt);
        v.x *= drag;
        v.z *= drag;
        v.y *= d.floats ? drag : Math.exp(-PH.waterDrag * 2 * dt);
      }
      const sp = v.length();
      if (sp > PH.maxSpeed) v.multiplyScalar(PH.maxSpeed / sp);
      b.pos.addScaledVector(v, dt);
      // chão (relevo + topos caminháveis)
      const gy = phys.groundHeight(b.pos.x, b.pos.z, b.pos.y + 0.4, 0.5, d.radius * 0.6);
      b.onGround = false;
      if (b.pos.y <= gy + 0.02) {
        const onTerrain = Math.abs(gy - phys.terrainHeight(b.pos.x, b.pos.z)) < 0.05;
        if (onTerrain) hf.normalAt(b.pos.x, b.pos.z, _n);
        else {
          _n.x = 0;
          _n.y = 1;
          _n.z = 0;
        }
        b.pos.y = gy;
        b.onGround = true;
        const vn = v.x * _n.x + v.y * _n.y + v.z * _n.z;
        if (vn < 0) {
          const impact = -vn;
          const k = impact > 3 ? 1 + PH.bounce : 1;
          v.x -= _n.x * vn * k;
          v.y -= _n.y * vn * k;
          v.z -= _n.z * vn * k;
          if (impact > PH.breakSpeed && d.hp > 0) this.damage(b, impact * 3, 'queda');
          if (impact > 4) this.ctx.sys.audio.play(b.kind === 'boulder' ? 'boss_slam' : 'land', { position: b.pos, volume: Math.min(0.8, impact / 18), pitch: b.kind === 'boulder' ? 1.6 : 1.2 });
        }
        // gravidade ao longo da encosta
        const slopeDeg = (Math.acos(Math.min(1, _n.y)) * 180) / Math.PI;
        const g = PH.gravity * (d.round ? 5 / 7 : 1);
        if (d.round || slopeDeg > PH.slideSlopeDeg) {
          v.x += g * _n.x * _n.y * dt;
          v.z += g * _n.z * _n.y * dt;
        }
        // atrito (chão molhado: menos)
        const mu = (d.round ? PH.rollFriction : PH.slideFriction) * (1 - 0.3 * wetness);
        const fr = Math.exp(-mu * dt);
        v.x *= fr;
        v.z *= fr;
        // caixas param de vez quando lentas num chão pouco inclinado
        if (!d.round && slopeDeg < PH.slideSlopeDeg && Math.hypot(v.x, v.z) < 0.25) {
          v.x = 0;
          v.z = 0;
        }
        // rolar: gira em torno do eixo n × v
        if (d.round) {
          const hv = Math.hypot(v.x, v.z);
          if (hv > 0.02) {
            _axis.set(v.z, 0, -v.x).normalize();
            _q.setFromAxisAngle(_axis, (hv * dt) / d.radius);
            b.quat.premultiply(_q);
          }
        } else {
          // caixas: giram em Y conforme deslizam (pouco)
          b.yaw += (v.x * 0.05 - v.z * 0.03) * dt;
          b.quat.setFromAxisAngle(UP, b.yaw);
        }
      } else if (!d.round) {
        // no ar, caixas tombam um pouco
        _axis.set(v.z, 0, -v.x);
        if (_axis.lengthSq() > 1e-4) {
          _axis.normalize();
          _q.setFromAxisAngle(_axis, dt * 3);
          b.quat.premultiply(_q);
        }
      }
      // colisores estáticos (paredes, árvores, outras coisas)
      _v2.copy(b.pos);
      const push = phys.resolveCapsule(_v2, d.radius, d.height);
      if (push.collided) {
        const N = push.normal;
        const vn = v.x * N.x + v.z * N.z;
        if (vn < 0) {
          const impact = -vn;
          v.x -= N.x * vn * (1 + PH.bounce);
          v.z -= N.z * vn * (1 + PH.bounce);
          if (impact > PH.breakSpeed && d.hp > 0) this.damage(b, impact * 3, 'batida');
          if (impact > 5) this.ctx.sys.audio.play('land', { position: b.pos, volume: Math.min(0.7, impact / 16) });
        }
        b.pos.x = _v2.x;
        b.pos.z = _v2.z;
      }
      // atropelar quem estiver no caminho
      const hsp = Math.hypot(v.x, v.y, v.z);
      if (hsp > PH.crushSpeed && b.crushT <= 0) this.crush(b, hsp);
      // repouso
      if (hsp < 0.08 && b.onGround) {
        b.still += dt;
        if (b.still > PH.sleepAfter) {
          b.sleeping = true;
          v.set(0, 0, 0);
        }
      } else b.still = 0;
      if (col) {
        phys.setEnabled(col, true);
        this.moveCollider(b);
      }
    }
    this.collidePairs();
  }

  private moveCollider(b: PropBody) {
    const c = b.collider;
    if (!c) return;
    const d = PROPS[b.kind];
    if (Math.abs(c.x - b.pos.x) < 0.01 && Math.abs(c.z - b.pos.z) < 0.01 && Math.abs(c.y0 - b.pos.y) < 0.01) return;
    // muda de célula do grid só quando precisa (recria o colisor)
    if (Math.floor(c.x / 16) !== Math.floor(b.pos.x / 16) || Math.floor(c.z / 16) !== Math.floor(b.pos.z / 16) || Math.floor((c.x + d.radius) / 16) !== Math.floor((b.pos.x + d.radius) / 16) || Math.floor((c.z + d.radius) / 16) !== Math.floor((b.pos.z + d.radius) / 16) || Math.floor((c.x - d.radius) / 16) !== Math.floor((b.pos.x - d.radius) / 16) || Math.floor((c.z - d.radius) / 16) !== Math.floor((b.pos.z - d.radius) / 16)) {
      this.dropCollider(b);
      this.ensureCollider(b);
      return;
    }
    c.x = b.pos.x;
    c.z = b.pos.z;
    c.y0 = b.pos.y;
    c.y1 = b.pos.y + d.height;
  }

  /** Objetos acordados se empurram entre si (e acordam os vizinhos). */
  private collidePairs() {
    const B = this.bodies;
    for (let i = 0; i < B.length; i++) {
      const a = B[i];
      if (a.broken || !a.active || a.sleeping || a.stasis > 0) continue;
      const da = PROPS[a.kind];
      for (let j = 0; j < B.length; j++) {
        if (j === i) continue;
        const b = B[j];
        if (b.broken || !b.active) continue;
        const db = PROPS[b.kind];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const r = da.radius + db.radius;
        if (Math.abs(dx) > r || Math.abs(dz) > r) continue;
        if (a.pos.y > b.pos.y + db.height || b.pos.y > a.pos.y + da.height) continue;
        const d = Math.hypot(dx, dz);
        if (d >= r || d < 1e-4) continue;
        const nx = dx / d;
        const nz = dz / d;
        const pen = r - d;
        const frozen = b.stasis > 0;
        const wa = frozen ? 1 : db.mass / (da.mass + db.mass);
        a.pos.x -= nx * pen * wa;
        a.pos.z -= nz * pen * wa;
        if (!frozen) {
          b.pos.x += nx * pen * (1 - wa);
          b.pos.z += nz * pen * (1 - wa);
        }
        // troca de velocidade ao longo da normal (choque)
        const rel = (a.vel.x - b.vel.x) * nx + (a.vel.z - b.vel.z) * nz;
        if (rel > 0) {
          const imp = (rel * (1 + PH.bounce)) / (1 / da.mass + (frozen ? 0 : 1 / db.mass));
          a.vel.x -= (imp / da.mass) * nx;
          a.vel.z -= (imp / da.mass) * nz;
          if (!frozen) {
            b.vel.x += (imp / db.mass) * nx;
            b.vel.z += (imp / db.mass) * nz;
            this.wake(b);
            b.lastHitter = a.lastHitter;
            if (rel > PH.breakSpeed * 0.8) this.damage(b, rel * 2, 'batida');
          }
        }
      }
    }
  }

  /** Jogador andando contra o objeto empurra. */
  private pushByPlayer(dt: number) {
    const pl = this.ctx.sys.player;
    if (pl.state !== 'ground') return;
    const pp = pl.entity.position;
    const wish = pl.wishDir;
    const wl = Math.hypot(wish.x, wish.z);
    if (wl < 0.2) return;
    for (const b of this.bodies) {
      if (b.broken || !b.active || b.stasis > 0) continue;
      const d = PROPS[b.kind];
      const dx = b.pos.x - pp.x;
      const dz = b.pos.z - pp.z;
      const dist = Math.hypot(dx, dz);
      if (dist > d.radius + 0.62 || dist < 1e-3) continue;
      if (pp.y > b.pos.y + d.height - 0.2 || pp.y + 1.6 < b.pos.y) continue;
      const toward = (wish.x * dx + wish.z * dz) / (wl * dist);
      if (toward < 0.5) continue;
      const nx = dx / dist;
      const nz = dz / dist;
      const target = 2.4 / Math.sqrt(d.mass);
      const along = b.vel.x * nx + b.vel.z * nz;
      if (along < target) {
        const a = (PH.pushAccel / d.mass) * dt;
        b.vel.x += nx * a;
        b.vel.z += nz * a;
        b.lastHitter = pl.entity;
        this.wake(b);
        this.stats.pushed++;
      }
    }
  }

  private crush(b: PropBody, speed: number) {
    const d = PROPS[b.kind];
    const c = this.center(b, _v);
    const list = this.ctx.entities.queryRadius(c, d.radius + 1.2, this.list);
    for (const e of list) {
      if (!e.health || !e.alive || e.kind === 'projectile' || e.kind === 'pickup') continue;
      const dx = e.position.x - c.x;
      const dz = e.position.z - c.z;
      if (Math.hypot(dx, dz) > d.radius + e.radius + 0.1) continue;
      if (e.position.y > b.pos.y + d.height || e.position.y + e.height < b.pos.y) continue;
      // quem empurra devagar não se machuca com o próprio caixote
      if (e === b.lastHitter && speed < PH.crushSpeed * 1.5) continue;
      _v2.copy(b.vel).setY(0);
      if (_v2.lengthSq() < 1e-4) _v2.set(dx, 0, dz);
      _v2.normalize();
      this.ctx.sys.combat.applyDamage(e, {
        amount: d.mass * speed * PH.crushDamage,
        type: 'physical',
        knockback: Math.min(12, speed * 0.7),
        poiseDamage: d.mass * speed * 2,
        direction: _v2.clone(),
        source: b.lastHitter,
        tag: 'atropelado',
      });
      b.crushT = 0.5;
      this.stats.crushed++;
      // pedregulho perde pouco; caixa leve quase para
      b.vel.multiplyScalar(d.mass > 3 ? 0.85 : 0.4);
    }
  }

  private writeInstance(b: PropBody) {
    const mesh = this.meshes[b.kind];
    if (!mesh) return;
    if (b.broken) {
      mesh.setMatrixAt(b.slot, ZERO);
      return;
    }
    const d = PROPS[b.kind];
    // corpos redondos giram em torno do centro
    _s.set(1, 1, 1);
    if (d.round) {
      _v.set(0, d.height * 0.5, 0).applyQuaternion(b.quat);
      _v2.set(b.pos.x - _v.x, b.pos.y + d.height * 0.5 - _v.y, b.pos.z - _v.z);
      _m.compose(_v2, b.quat, _s);
    } else _m.compose(b.pos, b.quat, _s);
    mesh.setMatrixAt(b.slot, _m);
    // cor: estase dourada pulsando, pavio vermelho piscando, fogo escurece
    _col.setRGB(1, 1, 1);
    if (b.stasis > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * (b.stasis < 1.5 ? 18 : 6));
      const heat = Math.min(1, b.stasisImp.length() / STASIS.maxLaunch);
      _col.setRGB(1.5 + 0.3 * pulse + heat * 0.6, 1.25 + 0.2 * pulse - heat * 0.6, 0.45 - heat * 0.3);
    } else if (b.fuse >= 0) {
      const on = Math.sin(this.time * (b.fuse < 0.6 ? 40 : 16)) > 0;
      if (on) _col.setRGB(1.9, 0.5, 0.3);
    } else if (b.burn >= 0) {
      const k = Math.min(1, b.burn / 4);
      _col.setRGB(1 - 0.7 * k, 1 - 0.75 * k, 1 - 0.8 * k);
    }
    mesh.setColorAt(b.slot, _col);
  }

  reset() {
    for (const b of this.bodies) {
      this.dropCollider(b);
      b.respawnAt = 0;
      this.respawn(b);
    }
  }

  dispose() {
    for (const b of this.bodies) this.dropCollider(b);
    for (const k of PROP_KINDS) this.meshes[k]?.dispose();
    this.material.dispose();
  }
}

// ---------------------------------------------------------------------------
// Geometrias procedurais (fundo em y = 0; cores por vértice)
// ---------------------------------------------------------------------------

function paint(g: THREE.BufferGeometry, fn: (x: number, y: number, z: number) => [number, number, number]) {
  const p = g.getAttribute('position');
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const [r, gg, b] = fn(p.getX(i), p.getY(i), p.getZ(i));
    c[i * 3] = r;
    c[i * 3 + 1] = gg;
    c[i * 3 + 2] = b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

function hash3(x: number, y: number, z: number) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

let cachedGeos: Record<PropKind, THREE.BufferGeometry> | null = null;

export function propGeometries(): Record<PropKind, THREE.BufferGeometry> {
  if (cachedGeos) return cachedGeos;
  const barrelBody = (r: number, h: number, wood: [number, number, number], hoop: [number, number, number]) => {
    const prof: THREE.Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      prof.push(new THREE.Vector2(r * (0.84 + 0.16 * Math.sin(t * Math.PI)), t * h));
    }
    const lathe = new THREE.LatheGeometry(prof, 16).toNonIndexed();
    const top = new THREE.CircleGeometry(r * 0.84, 16).rotateX(-Math.PI / 2).translate(0, h, 0).toNonIndexed();
    const bottom = new THREE.CircleGeometry(r * 0.84, 16).rotateX(Math.PI / 2).toNonIndexed();
    const g = mergeGeometries([lathe, top, bottom])!;
    return paint(g, (x, y, z) => {
      const t = y / h;
      const isHoop = Math.abs(t - 0.14) < 0.04 || Math.abs(t - 0.86) < 0.04 || Math.abs(t - 0.5) < 0.025;
      if (isHoop) return hoop;
      const ang = Math.atan2(z, x);
      const stave = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 16);
      const v = 0.85 + 0.25 * hash3(stave, 1, 2);
      return [wood[0] * v, wood[1] * v, wood[2] * v];
    });
  };
  const barrel = barrelBody(PROPS.barrel.radius, PROPS.barrel.height, [0.55, 0.36, 0.2], [0.25, 0.24, 0.26]);
  // pólvora: barril vermelho com runas brilhantes (cor > 1 brilha)
  const powder = barrelBody(PROPS.powder.radius, PROPS.powder.height, [0.62, 0.16, 0.12], [0.2, 0.18, 0.2]);
  {
    const c = powder.getAttribute('color') as THREE.BufferAttribute;
    const p = powder.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const t = p.getY(i) / PROPS.powder.height;
      const ang = Math.atan2(p.getZ(i), p.getX(i));
      if (Math.abs(t - 0.5) < 0.12 && Math.sin(ang * 4) > 0.55) c.setXYZ(i, 1.9, 1.35, 0.4);
    }
  }
  // caixote: tábuas e travessas
  const S = PROPS.crate.radius * 1.5;
  const crateParts: THREE.BufferGeometry[] = [new THREE.BoxGeometry(S, S, S).translate(0, S / 2, 0).toNonIndexed()];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) crateParts.push(new THREE.BoxGeometry(0.1, S + 0.02, 0.1).translate((sx * S) / 2, S / 2, (sz * S) / 2).toNonIndexed());
  crateParts.push(new THREE.BoxGeometry(S + 0.04, 0.08, 0.08).rotateZ(Math.PI / 4).scale(1, 1, 1).translate(0, S / 2, S / 2 + 0.02).toNonIndexed());
  crateParts.push(new THREE.BoxGeometry(S + 0.04, 0.08, 0.08).rotateZ(Math.PI / 4).translate(0, S / 2, -S / 2 - 0.02).toNonIndexed());
  const crate = paint(mergeGeometries(crateParts)!, (x, y, z) => {
    const edge = Math.abs(Math.abs(x) - S / 2) < 0.06 && Math.abs(Math.abs(z) - S / 2) < 0.06;
    if (edge) return [0.36, 0.24, 0.14];
    const plank = Math.floor((y / S) * 4);
    const v = 0.8 + 0.3 * hash3(plank, Math.sign(x), Math.sign(z));
    return [0.68 * v, 0.5 * v, 0.3 * v];
  });
  // pedregulho: icosaedro deformado
  const R = PROPS.boulder.radius;
  const bo = new THREE.IcosahedronGeometry(R, 2);
  {
    const p = bo.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      _v.set(p.getX(i), p.getY(i), p.getZ(i));
      const n = 0.85 + 0.22 * hash3(Math.round(_v.x * 3), Math.round(_v.y * 3), Math.round(_v.z * 3));
      _v.multiplyScalar(n);
      p.setXYZ(i, _v.x, _v.y * 0.92 + R * 0.92, _v.z);
    }
    bo.computeVertexNormals();
  }
  const boulder = paint(bo.index ? bo.toNonIndexed() : bo, (x, y, z) => {
    const v = 0.75 + 0.3 * hash3(Math.round(x * 4), Math.round(y * 4), Math.round(z * 4));
    const moss = y > R * 1.4 ? 0.25 : 0;
    return [0.5 * v * (1 - moss) + 0.3 * moss, 0.48 * v * (1 - moss) + 0.42 * moss, 0.45 * v * (1 - moss) + 0.2 * moss];
  });
  boulder.computeVertexNormals();
  // pote de barro
  const jr = PROPS.jar.radius;
  const jh = PROPS.jar.height;
  const jp: THREE.Vector2[] = [];
  const pts: [number, number][] = [[0.55, 0], [0.9, 0.12], [1, 0.35], [0.9, 0.62], [0.5, 0.82], [0.45, 0.9], [0.62, 1]];
  for (const [rr, yy] of pts) jp.push(new THREE.Vector2(jr * rr, jh * yy));
  const jar = paint(new THREE.LatheGeometry(jp, 14).toNonIndexed(), (_x, y) => {
    const t = y / jh;
    if (Math.abs(t - 0.45) < 0.05) return [0.3, 0.2, 0.5];
    return [0.72, 0.42, 0.28];
  });
  for (const g of [barrel, powder, crate, boulder, jar]) g.computeVertexNormals();
  cachedGeos = { barrel, crate, boulder, jar, powder };
  return cachedGeos;
}
