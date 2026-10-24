import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { GameContext } from '../core/context';
import { Entity } from '../core/Entity';
import type { DamageInfo } from './Health';
import type { ProjectileSpec } from './Combat';
import type { VfxKind } from './VFX';
import type { SfxId } from '../audio/Audio';
import type { ColliderTag } from '../world/Collision';
import type { TrailHandle, LightHandle } from './VFX';
import { segmentVsCapsule, type SegHit } from './combatMath';

/**
 * Projéteis: entidades em pool (kind 'projectile', não consultáveis no grid) simuladas pelo
 * sistema de combate. Colisão por segmento (sem atravessar alvos em alta velocidade):
 * cenário via raycast e entidades via distância segmento × cápsula. Suporta gravidade,
 * perseguição, perfuração, explosão, reflexão (Escudo Mágico) e `onHit`.
 * Visual: núcleos (billboards), malhas instanciadas (flechas, estilhaços, lâminas, ondas),
 * rastros e partículas pelo VFX.
 */

type MeshKind = 'arrow' | 'shard' | 'blade' | 'wave';

interface ProjectileVisual {
  core: number;
  coreSize: number;
  mesh?: MeshKind;
  meshScale?: number;
  trail?: { color: number; width: number; life: number; alpha?: number };
  /** Partículas por segundo ao longo do caminho. */
  emitRate: number;
  emitColor: number;
  emitSize: number;
  /** Fumaça ao longo do caminho (fogo). */
  smoke?: boolean;
  light?: { color: number; intensity: number };
  impact: VfxKind;
  impactScale: number;
  impactEntity?: VfxKind;
  explodeOnExpire?: boolean;
  sound: SfxId;
}

const VIS: Record<string, ProjectileVisual> = {
  arcaneBolt: { core: 0x7fe8ff, coreSize: 0.6, trail: { color: 0x58d8ff, width: 0.13, life: 0.2 }, emitRate: 26, emitColor: 0x58d8ff, emitSize: 0.12, impact: 'arcaneSpark', impactScale: 1.2, impactEntity: 'impact', sound: 'hit_magic' },
  chargedBolt: { core: 0xa8f4ff, coreSize: 1.25, trail: { color: 0x58d8ff, width: 0.32, life: 0.3 }, emitRate: 60, emitColor: 0x7fe8ff, emitSize: 0.2, light: { color: 0x58d8ff, intensity: 22 }, impact: 'arcaneBurst', impactScale: 1.1, sound: 'explosion' },
  arcaneOrb: { core: 0x58d8ff, coreSize: 1.15, trail: { color: 0x3fb8ff, width: 0.32, life: 0.34 }, emitRate: 50, emitColor: 0x8a6bff, emitSize: 0.2, light: { color: 0x58c8ff, intensity: 20 }, impact: 'arcaneBurst', impactScale: 1.25, sound: 'explosion' },
  voidBolt: { core: 0xc080ff, coreSize: 0.7, trail: { color: 0x7a30ff, width: 0.17, life: 0.3 }, emitRate: 30, emitColor: 0x9b4dff, emitSize: 0.15, smoke: true, impact: 'void', impactScale: 0.55, sound: 'hit_magic' },
  fireball: { core: 0xffb050, coreSize: 1.1, trail: { color: 0xff6a1a, width: 0.3, life: 0.28 }, emitRate: 50, emitColor: 0xff8a30, emitSize: 0.25, smoke: true, light: { color: 0xff7a2a, intensity: 20 }, impact: 'fire', impactScale: 1.4, explodeOnExpire: true, sound: 'explosion' },
  arrow: { core: 0xffffff, coreSize: 0, mesh: 'arrow', trail: { color: 0xd8d0c0, width: 0.025, life: 0.14, alpha: 0.35 }, emitRate: 0, emitColor: 0, emitSize: 0, impact: 'dust', impactScale: 0.35, impactEntity: 'impact', sound: 'hit_flesh' },
  enemyOrb: { core: 0xe060ff, coreSize: 0.85, trail: { color: 0xa020ff, width: 0.2, life: 0.3 }, emitRate: 28, emitColor: 0xd040ff, emitSize: 0.14, impact: 'corruption', impactScale: 0.8, impactEntity: 'void', sound: 'hit_magic' },
  crystalShard: { core: 0x7fe8ff, coreSize: 0.3, mesh: 'shard', trail: { color: 0x7fe8ff, width: 0.07, life: 0.18 }, emitRate: 14, emitColor: 0x9ff0ff, emitSize: 0.08, impact: 'crystalShatter', impactScale: 0.55, sound: 'hit_metal' },
  etherealBlade: { core: 0xd0f8ff, coreSize: 0.45, mesh: 'blade', trail: { color: 0xa8e8ff, width: 0.11, life: 0.3 }, emitRate: 20, emitColor: 0xb8f0ff, emitSize: 0.09, impact: 'arcaneSpark', impactScale: 1.3, impactEntity: 'impact', sound: 'hit_magic' },
  energyWave: { core: 0x7ff8ff, coreSize: 0.5, mesh: 'wave', meshScale: 1.6, emitRate: 40, emitColor: 0x4ff0ff, emitSize: 0.14, impact: 'lightning', impactScale: 0.6, sound: 'hit_magic' },
  eclipseOrb: { core: 0xff6a90, coreSize: 0.65, trail: { color: 0xff4f7a, width: 0.13, life: 0.3 }, emitRate: 24, emitColor: 0x9b4dff, emitSize: 0.12, impact: 'void', impactScale: 0.5, sound: 'hit_magic' },
  lightningBolt: { core: 0xd8f0ff, coreSize: 0.7, trail: { color: 0x9fd8ff, width: 0.12, life: 0.15 }, emitRate: 40, emitColor: 0xbfe4ff, emitSize: 0.1, impact: 'lightning', impactScale: 0.6, sound: 'hit_magic' },
};
const FALLBACK: ProjectileVisual = { core: 0xffffff, coreSize: 0.6, trail: { color: 0xffffff, width: 0.12, life: 0.2 }, emitRate: 15, emitColor: 0xffffff, emitSize: 0.1, impact: 'impact', impactScale: 0.8, sound: 'hit_magic' };

/** Visual registrado de um tipo de projétil (FALLBACK se desconhecido). */
export function projectileVisual(kind: string): ProjectileVisual {
  return VIS[kind] ?? FALLBACK;
}

/**
 * Registra (ou substitui) o visual de um tipo de projétil — para outros módulos (ex.: IA)
 * criarem projéteis próprios: `registerProjectileVisual('poisonSpit', { core: 0x80ff40, ... })`.
 * Também disponível como `ctx.sys.combat.projectiles.registerVisual(...)`.
 */
export function registerProjectileVisual(kind: string, vis: ProjectileVisual): void {
  VIS[kind] = vis;
}

export type { ProjectileVisual };

const TREE_TAGS: ColliderTag[] = ['tree'];
const MAX_PROJECTILES = 128;

export class Projectile extends Entity {
  active = false;
  owner: Entity | null = null;
  readonly vel = new THREE.Vector3();
  speed = 0;
  range = 0;
  traveled = 0;
  age = 0;
  maxAge = 5;
  pradius = 0.2;
  damage!: DamageInfo;
  explodeRadius = 0;
  pierce = 0;
  pierceFalloff = 0;
  hits = 0;
  homingTarget: Entity | null = null;
  homingStrength = 0;
  homingDelay = 0;
  retarget = false;
  gravity = 0;
  color: number | undefined;
  ignoreTrees = true;
  onHit: ProjectileSpec['onHit'];
  readonly hitSet = new Set<number>();
  vis: ProjectileVisual = FALLBACK;
  trail: TrailHandle | null = null;
  light: LightHandle | null = null;
  emitAcc = 0;
  reflected = false;
  /** Escala do visual (núcleo, rastro, malha). */
  visualScale = 1;

  constructor() {
    super('projectile', 'neutral');
    this.queryable = false;
    this.solid = false;
    this.alwaysActive = true;
    this.radius = 0.2;
    this.height = 0.2;
  }

  /** Projéteis são simulados pelo sistema de combate (Projectiles.update). */
  override update(): void {}
}

/** Malhas instanciadas por tipo visual. */
class ProjectileMeshes {
  readonly meshes = new Map<MeshKind, THREE.InstancedMesh>();
  private counts = new Map<MeshKind, number>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private s = new THREE.Vector3();
  private fwd = new THREE.Vector3(0, 0, 1);

  constructor(scene: THREE.Object3D) {
    const cap = 64;
    const add = (kind: MeshKind, geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const im = new THREE.InstancedMesh(geo, mat, cap);
      im.count = 0;
      im.frustumCulled = false;
      im.name = `projeteis-${kind}`;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(im);
      this.meshes.set(kind, im);
      this.counts.set(kind, 0);
    };
    add('arrow', arrowGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.2 }));
    const shard = new THREE.OctahedronGeometry(0.11, 0);
    shard.scale(0.55, 0.55, 2.6);
    add('shard', shard, new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2fa8ff, emissiveIntensity: 1.4, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 }));
    add('blade', bladeGeometry(), new THREE.MeshBasicMaterial({ color: 0xbff2ff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    add('wave', waveGeometry(), new THREE.MeshBasicMaterial({ color: 0x5ff0ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  }

  begin() {
    for (const k of this.counts.keys()) this.counts.set(k, 0);
  }

  put(kind: MeshKind, pos: THREE.Vector3, dir: THREE.Vector3, scale: number, roll: number) {
    const im = this.meshes.get(kind)!;
    const n = this.counts.get(kind)!;
    if (n >= im.instanceMatrix.count) return;
    this.q.setFromUnitVectors(this.fwd, dir);
    if (roll) {
      const qr = _qr.setFromAxisAngle(this.fwd, roll);
      this.q.multiply(qr);
    }
    this.s.setScalar(scale);
    this.m.compose(pos, this.q, this.s);
    im.setMatrixAt(n, this.m);
    this.counts.set(kind, n + 1);
  }

  end() {
    for (const [k, im] of this.meshes) {
      const n = this.counts.get(k)!;
      im.count = n;
      im.visible = n > 0;
      if (n > 0) im.instanceMatrix.needsUpdate = true;
    }
  }
}
const _qr = new THREE.Quaternion();

function colored(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const c = new THREE.Color(hex);
  const n = g.getAttribute('position').count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  g.deleteAttribute('uv');
  return g;
}

function arrowGeometry(): THREE.BufferGeometry {
  const shaft = new THREE.CylinderGeometry(0.012, 0.012, 0.78, 5);
  shaft.rotateX(Math.PI / 2);
  const head = new THREE.ConeGeometry(0.032, 0.13, 5);
  head.rotateX(Math.PI / 2);
  head.translate(0, 0, 0.45);
  const f1 = new THREE.BoxGeometry(0.004, 0.06, 0.14);
  f1.translate(0, 0.025, -0.33);
  const f2 = new THREE.BoxGeometry(0.06, 0.004, 0.14);
  f2.translate(0.025, 0, -0.33);
  const f3 = f1.clone();
  f3.translate(0, -0.05, 0);
  const g = mergeGeometries([colored(shaft, 0x7a5a38), colored(head, 0x8a9098), colored(f1, 0xd8d0c0), colored(f2, 0xb8302a), colored(f3, 0xd8d0c0)])!;
  return g;
}

function bladeGeometry(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, -0.28);
  s.lineTo(0.07, -0.05);
  s.lineTo(0.03, 0.42);
  s.lineTo(0, 0.5);
  s.lineTo(-0.03, 0.42);
  s.lineTo(-0.07, -0.05);
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(Math.PI / 2); // +Y da forma → +Z (direção do voo)
  const g2 = g.clone();
  g2.rotateZ(Math.PI / 2);
  return mergeGeometries([g, g2])!;
}

function waveGeometry(): THREE.BufferGeometry {
  // crescente vertical, perpendicular ao voo, curvado para frente
  const g = new THREE.RingGeometry(0.55, 0.85, 20, 1, Math.PI * 0.15, Math.PI * 0.7);
  g.translate(0, -0.55, 0);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    pos.setXYZ(i, x, y + 0.2, -Math.abs(x) * 0.45);
  }
  g.rotateZ(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Sistema de projéteis (criado e atualizado pelo Combat). */
export class Projectiles {
  private pool: Projectile[] = [];
  readonly active: Projectile[] = [];
  private meshes: ProjectileMeshes;
  private list: Entity[] = [];
  private prev = new THREE.Vector3();
  private next = new THREE.Vector3();
  private dir = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private sh: SegHit = { dist2: 0, s: 0, t: 0 };
  /** Estatísticas (testes). */
  stats = { spawned: 0, hitsEntity: 0, hitsScenery: 0, expired: 0, reflected: 0, rejected: 0 };

  constructor(private ctx: GameContext) {
    this.meshes = new ProjectileMeshes(ctx.scene);
  }

  spawn(spec: ProjectileSpec): Projectile | null {
    let p = this.pool.find((x) => !x.active && !this.ctx.entities.get(x.id));
    if (!p) {
      if (this.pool.length >= MAX_PROJECTILES) {
        this.stats.rejected++;
        return null;
      }
      p = new Projectile();
      this.pool.push(p);
    }
    const d = spec.direction;
    const dl = d.length();
    if (!(dl > 1e-6) || !isFinite(spec.origin.x + spec.origin.y + spec.origin.z)) return null;
    p.active = true;
    p.removed = false;
    p.alive = true;
    p.owner = spec.source;
    p.faction = spec.source?.faction ?? 'neutral';
    p.typeId = spec.kind;
    p.name = spec.kind;
    p.position.copy(spec.origin);
    p.speed = Math.max(0.1, spec.speed);
    p.vel.copy(d).multiplyScalar(p.speed / dl);
    p.range = Math.max(0.5, spec.range);
    p.traveled = 0;
    p.age = 0;
    p.maxAge = p.range / p.speed + 3;
    p.pradius = Math.max(0.02, spec.radius);
    p.damage = spec.damage;
    p.explodeRadius = spec.explodeRadius ?? 0;
    p.pierce = Math.max(0, Math.floor(spec.pierce ?? 0));
    p.pierceFalloff = spec.pierceFalloff ?? 0;
    p.hits = 0;
    p.homingTarget = spec.homingTarget ?? null;
    p.homingStrength = spec.homingStrength ?? (p.homingTarget ? 4 : 0);
    p.homingDelay = spec.homingDelay ?? 0;
    p.retarget = spec.retarget ?? false;
    p.gravity = spec.gravity ?? 0;
    p.color = spec.color;
    p.ignoreTrees = spec.ignoreTrees ?? spec.kind !== 'arrow';
    p.onHit = spec.onHit;
    p.hitSet.clear();
    p.vis = projectileVisual(spec.kind);
    p.emitAcc = 0;
    p.reflected = false;
    const vfx = this.ctx.sys.vfx;
    const t = p.vis.trail;
    p.trail = t ? vfx.ribbonTrail(p.object3d, p.color ?? t.color, t.width * (spec.visualScale ?? 1), t.life, t.alpha ?? 0.9) : null;
    p.light = p.vis.light ? vfx.sustainedLight(p.position, p.color ?? p.vis.light.color, p.vis.light.intensity, p.maxAge, p.object3d, 10) : null;
    p.object3d.position.copy(p.position);
    p.object3d.updateMatrixWorld();
    p.visualScale = spec.visualScale ?? 1;
    this.ctx.entities.add(p);
    this.active.push(p);
    this.stats.spawned++;
    return p;
  }

  private release(p: Projectile) {
    p.active = false;
    p.alive = false;
    p.trail?.cancel();
    p.trail = null;
    p.light?.cancel();
    p.light = null;
    p.homingTarget = null;
    p.onHit = undefined;
    p.owner = null;
    this.ctx.entities.remove(p);
  }

  update(dt: number) {
    const arr = this.active;
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      if (p.active) this.step(p, dt);
    }
    // compacta a lista
    let w = 0;
    for (let i = 0; i < arr.length; i++) if (arr[i].active) arr[w++] = arr[i];
    arr.length = w;
    this.render(dt);
  }

  private step(p: Projectile, dt: number) {
    const ctx = this.ctx;
    p.age += dt;
    if (p.age > p.maxAge) return this.expire(p);
    // perseguição
    if (p.homingStrength > 0 && p.age >= p.homingDelay) {
      let t = p.homingTarget;
      if (t && (!t.alive || t.removed)) t = p.homingTarget = null;
      if (!t && p.retarget) t = p.homingTarget = this.findTarget(p);
      if (t) {
        t.getCenter(this.tmp).sub(p.position);
        const l = this.tmp.length();
        if (l > 1e-4) {
          this.tmp.multiplyScalar(1 / l);
          const sp = p.vel.length() || p.speed;
          this.dir.copy(p.vel).multiplyScalar(1 / sp);
          // curva mais fechada perto do alvo (evita orbitar em volta dele)
          const k = p.homingStrength * dt * (l < 5 ? 1 + (5 - l) * 0.6 : 1);
          this.dir.lerp(this.tmp, Math.min(1, k)).normalize();
          // acelera de volta à velocidade nominal depois da fase de órbita
          const ns = sp + (p.speed - sp) * Math.min(1, dt * 4);
          p.vel.copy(this.dir).multiplyScalar(ns);
        }
      }
    }
    if (p.gravity) p.vel.y -= p.gravity * dt;
    const speed = p.vel.length();
    if (speed < 1e-4) return this.expire(p);
    const L = speed * dt;
    this.prev.copy(p.position);
    this.dir.copy(p.vel).multiplyScalar(1 / speed);
    this.next.copy(p.position).addScaledVector(this.dir, L);

    // cenário
    const hit = ctx.physics.raycast(this.prev, this.dir, L + p.pradius * 0.5, { water: true, ignoreTags: p.ignoreTrees ? TREE_TAGS : undefined });
    const sceneryD = hit ? hit.distance : Infinity;

    // entidades
    let best: Entity | null = null;
    let bestD = Infinity;
    this.tmp.copy(this.prev).add(this.next).multiplyScalar(0.5);
    const cands = ctx.entities.queryRadius(this.tmp, L * 0.5 + p.pradius + 2, this.list);
    const combat = ctx.sys.combat;
    for (let i = 0; i < cands.length; i++) {
      const e = cands[i];
      if (e === p.owner || !e.health || !e.alive || p.hitSet.has(e.id)) continue;
      if (p.owner ? !combat.isHostile(p.owner, e) : false) continue;
      segmentVsCapsule(this.prev, this.next, e.position, e.height, this.sh);
      const r = p.pradius + e.radius;
      if (this.sh.dist2 <= r * r) {
        const d = this.sh.s * L;
        if (d < bestD) {
          bestD = d;
          best = e;
        }
      }
    }

    if (best && bestD <= sceneryD) {
      this.tmp2.copy(this.prev).addScaledVector(this.dir, bestD);
      p.position.copy(this.tmp2);
      this.hitEntity(p, best, this.tmp2);
      if (p.active) {
        p.position.copy(this.next);
        p.traveled += L;
      }
    } else if (hit) {
      p.position.copy(hit.point);
      this.hitScenery(p, hit.point, hit.kind === 'water');
      return;
    } else {
      p.position.copy(this.next);
      p.traveled += L;
    }
    if (!p.active) return;
    p.object3d.position.copy(p.position);
    p.object3d.updateMatrixWorld();
    // partículas ao longo do caminho
    const v = p.vis;
    if (v.emitRate > 0) {
      p.emitAcc += dt * v.emitRate;
      const vfx = ctx.sys.vfx;
      while (p.emitAcc >= 1) {
        p.emitAcc -= 1;
        const k = Math.random();
        this.tmp.copy(this.prev).lerp(p.position, k);
        vfx.spark(this.tmp, v.emitColor, v.emitSize * (0.6 + Math.random() * 0.6), 0.25 + Math.random() * 0.25, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2 + 0.4, (Math.random() - 0.5) * 1.2);
        if (v.smoke && Math.random() < 0.25) vfx.puff(this.tmp, v.core === 0xc080ff ? 0x140822 : 0x3a3430, 0.5, 0.9, 0.3, 0.4);
      }
    }
    if (p.traveled >= p.range) this.expire(p);
  }

  private findTarget(p: Projectile): Entity | null {
    if (!p.owner) return null;
    const combat = this.ctx.sys.combat;
    const owner = p.owner;
    let best: Entity | null = null;
    let bestD = Infinity;
    const list = this.ctx.entities.queryRadius(p.position, 20, this.list);
    for (const e of list) {
      if (e === owner || !e.health || !e.alive || p.hitSet.has(e.id) || !combat.isHostile(owner, e)) continue;
      const d = e.position.distanceToSquared(p.position);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  private hitEntity(p: Projectile, target: Entity, point: THREE.Vector3) {
    const ctx = this.ctx;
    const combat = ctx.sys.combat;
    // Reflexão (Escudo Mágico rank 3)
    if (!p.reflected && combat.reflectors.has(target) && p.owner && combat.isHostile(p.owner, target)) {
      this.reflect(p, target, point);
      return;
    }
    p.hitSet.add(target.id);
    if (p.explodeRadius > 0) {
      this.detonate(p, point);
      return;
    }
    const info: DamageInfo = {
      ...p.damage,
      source: p.owner,
      point: point.clone(),
      direction: this.dir.clone().setY(0).normalize(),
      tag: p.damage.tag ?? 'projectile',
      statuses: p.damage.statuses?.slice(),
    };
    if (p.hits > 0 && p.pierceFalloff > 0) info.amount *= Math.pow(1 - p.pierceFalloff, p.hits);
    combat.applyDamage(target, info);
    ctx.events.emit('world:strike', { shape: 'sphere', origin: point.clone(), radius: Math.max(0.4, p.pradius + 0.2), info, source: p.owner ?? null });
    p.hits++;
    this.stats.hitsEntity++;
    const vfx = ctx.sys.vfx;
    vfx.burst(p.vis.impactEntity ?? p.vis.impact, point, { scale: p.vis.impactScale, color: p.color ?? p.vis.core, direction: this.tmp.copy(this.dir).negate() });
    ctx.sys.audio.play(p.vis.sound, { position: point, volume: 0.7 });
    p.onHit?.({ entity: target, point }, ctx);
    if (p.hits > p.pierce) this.release(p);
    else if (!p.homingTarget && !p.gravity) {
      // perfurou: segue na horizontal (mirar no centro do 1º alvo inclina o tiro para o chão)
      const sp = p.vel.length();
      if (Math.abs(p.vel.y) < sp * 0.35) {
        p.vel.y = 0;
        p.vel.setLength(sp);
      }
    }
  }

  private hitScenery(p: Projectile, point: THREE.Vector3, water: boolean) {
    const ctx = this.ctx;
    this.stats.hitsScenery++;
    if (p.explodeRadius > 0) {
      this.detonate(p, point);
      return;
    }
    if (!water) {
      ctx.events.emit('world:strike', {
        shape: 'sphere',
        origin: point.clone(),
        radius: Math.max(0.5, p.pradius + 0.3),
        info: { ...p.damage, source: p.owner, point: point.clone(), direction: this.dir.clone(), tag: p.damage.tag ?? 'projectile' },
        source: p.owner ?? null,
      });
    }
    const vfx = ctx.sys.vfx;
    vfx.burst(water ? 'splash' : p.vis.impact, point, { scale: water ? 0.6 : p.vis.impactScale, color: water ? undefined : p.color ?? p.vis.core, direction: this.tmp.copy(this.dir).negate() });
    if (!water && p.vis.mesh !== 'arrow') vfx.burst('dust', point, { scale: 0.4, count: 4 });
    ctx.sys.audio.play(p.vis.mesh === 'arrow' ? 'hit_flesh' : p.vis.sound, { position: point, volume: 0.5 });
    p.onHit?.({ point }, ctx);
    this.release(p);
  }

  private detonate(p: Projectile, point: THREE.Vector3) {
    const ctx = this.ctx;
    const r = p.explodeRadius;
    ctx.sys.combat.explode(point, r, { ...p.damage, source: p.owner, tag: p.damage.tag ?? 'projectile', statuses: p.damage.statuses?.slice() }, p.owner, { falloff: true });
    const vfx = ctx.sys.vfx;
    vfx.burst(p.vis.impact, point, { scale: Math.max(0.6, r / 2.4) * p.vis.impactScale, color: p.color ?? p.vis.core });
    vfx.ring(point, r, p.color ?? p.vis.core, 0.5);
    if (p.vis.impact === 'fire') vfx.burst('smoke', point, { scale: r / 2.5 });
    ctx.sys.audio.play('explosion', { position: point, volume: 0.9 });
    const cam = ctx.sys.camera as unknown as { shake?: (i: number, d: number) => void };
    const pp = ctx.sys.player.entity.position;
    const dist = pp.distanceTo(point);
    if (dist < 25) cam.shake?.(Math.min(0.6, (r / 4) * (1 - dist / 25)), 0.35);
    this.stats.hitsEntity++;
    p.onHit?.({ point }, ctx);
    this.release(p);
  }

  private reflect(p: Projectile, target: Entity, point: THREE.Vector3) {
    const ctx = this.ctx;
    const prevOwner = p.owner!;
    p.reflected = true;
    p.owner = target;
    p.faction = target.faction;
    p.hitSet.clear();
    p.hitSet.add(target.id);
    p.traveled = 0;
    p.age = 0;
    p.damage = { ...p.damage, amount: p.damage.amount * 1.5, source: target };
    if (prevOwner.alive && !prevOwner.removed) {
      prevOwner.getCenter(this.tmp).sub(point).normalize();
      p.vel.copy(this.tmp).multiplyScalar(p.speed);
      p.homingTarget = prevOwner;
      p.homingStrength = Math.max(p.homingStrength, 3);
    } else p.vel.negate();
    p.gravity = 0;
    p.position.copy(point).addScaledVector(p.vel, 0.05);
    this.stats.reflected++;
    ctx.sys.vfx.burst('blockSpark', point, { color: 0x9fd8ff, scale: 1.2 });
    ctx.sys.audio.play('parry', { position: point });
  }

  private expire(p: Projectile) {
    this.stats.expired++;
    if (p.vis.explodeOnExpire && p.explodeRadius > 0) {
      this.detonate(p, p.position);
      return;
    }
    this.ctx.sys.vfx.burst('arcaneSpark', p.position, { count: 4, color: p.color ?? p.vis.core, scale: 0.6 });
    this.release(p);
  }

  /** Núcleos, malhas e luzes dos projéteis ativos (chamado após a simulação). */
  private render(_dt: number) {
    const vfx = this.ctx.sys.vfx;
    this.meshes.begin();
    for (const p of this.active) {
      const v = p.vis;
      const vs = p.visualScale;
      if (v.coreSize > 0) vfx.sprite(p.position, v.coreSize * vs, p.color ?? v.core, 1);
      if (v.mesh) {
        const sp = p.vel.length();
        if (sp > 1e-4) {
          this.dir.copy(p.vel).multiplyScalar(1 / sp);
          this.meshes.put(v.mesh, p.position, this.dir, (v.meshScale ?? 1) * vs, v.mesh === 'blade' ? p.age * 14 : 0);
        }
      }
    }
    this.meshes.end();
  }

  /** Registra o visual de um novo tipo de projétil (ver `registerProjectileVisual`). */
  registerVisual(kind: string, vis: ProjectileVisual) {
    registerProjectileVisual(kind, vis);
  }

  /** Remove todos (novo jogo). */
  clear() {
    for (const p of this.active) this.release(p);
    this.active.length = 0;
    this.meshes.begin();
    this.meshes.end();
  }

  get count() {
    return this.active.length;
  }
}
