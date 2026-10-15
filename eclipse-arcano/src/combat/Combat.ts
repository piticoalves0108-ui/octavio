import * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import type { Entity } from '../core/Entity';
import type { DamageInfo, DamageResult } from './Health';
import { factionsHostile } from '../data/factions';

export interface ProjectileSpec {
  /** Id visual/comportamental: 'arcaneBolt', 'energyLance', 'voidBolt', 'arrow', 'fireball', 'enemyOrb'... */
  kind: string;
  source: Entity;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  /** Alcance máximo (m). */
  range: number;
  /** Raio de colisão do projétil. */
  radius: number;
  damage: DamageInfo;
  /** Raio de explosão ao impactar (0 = sem explosão). */
  explodeRadius?: number;
  /** Atravessa alvos (Cajado do Vazio): número de alvos extras. */
  pierce?: number;
  /** Persegue alvo (Lâminas Etéreas). */
  homingTarget?: Entity | null;
  homingStrength?: number;
  /** Gravidade aplicada (flechas). */
  gravity?: number;
  color?: number;
  /** Chamado ao atingir algo (entidade ou cenário). */
  onHit?: (hit: { entity?: Entity; point: THREE.Vector3 }, ctx: GameContext) => void;
}

export interface SweepOptions {
  /** Máximo de alvos atingidos. */
  maxTargets?: number;
  /** Ids já atingidos neste golpe (evita acertar 2x o mesmo alvo num swing). */
  alreadyHit?: Set<number>;
  /** Tolerância vertical (m). */
  verticalReach?: number;
  /** Filtro extra. */
  filter?: (e: Entity) => boolean;
}

/**
 * Regras centrais de combate: hostilidade, aplicação de dano (roteamento único),
 * golpes corpo a corpo em arco, explosões em área e projéteis.
 * Todo dano do jogo deve passar por `applyDamage` para gerar eventos
 * (números de dano, sons, missões, XP, reações de IA).
 */
export class Combat implements GameSystem {
  readonly name = 'combat';
  private ctx!: GameContext;
  private hitStopTimer = 0;
  private list: Entity[] = [];
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  isHostile(a: Entity, b: Entity): boolean {
    if (a === b) return false;
    // Guardas ficam hostis ao jogador se ele atacou civis (flag de história).
    if (this.ctx.sys.story.is('guardas_hostis')) {
      if ((a.faction === 'player' && b.faction === 'guard') || (a.faction === 'guard' && b.faction === 'player')) return true;
    }
    // Entidades provocadas (ex.: animal neutro atacado) ficam hostis a quem as atacou.
    if (a.tags.has(`aggro:${b.id}`) || b.tags.has(`aggro:${a.id}`)) return true;
    return factionsHostile(a.faction, b.faction);
  }

  /**
   * Aplica dano a um alvo. Calcula direção a partir da fonte se faltar,
   * respeita bloqueio/esquiva/escudo, aplica knockback, emite eventos e trata morte.
   */
  applyDamage(target: Entity, info: DamageInfo): DamageResult | null {
    const h = target.health;
    if (!h || !target.alive || target.removed) return null;

    if (!info.direction && info.source) {
      info.direction = new THREE.Vector3().subVectors(target.position, info.source.position).setY(0);
      if (info.direction.lengthSq() > 0) info.direction.normalize();
    }
    if (!info.point) info.point = target.getCenter(new THREE.Vector3());

    const facing = target.getForward(this.tmp);
    const result = h.applyDamage(info, facing);
    if (result.immune) return result;

    // Knockback
    if (info.knockback && info.direction && !result.blocked) {
      const kb = info.knockback * (target.kind === 'boss' ? 0.1 : 1);
      target.velocity.x += info.direction.x * kb;
      target.velocity.z += info.direction.z * kb;
    }

    // Parry: atordoa o atacante.
    if (result.parried && info.source?.health) {
      info.source.health.staggerTimer = Math.max(info.source.health.staggerTimer, 1.4);
    }

    // Provocação: alvo neutro atacado passa a ser hostil ao atacante.
    if (info.source && target.faction === 'neutral') target.tags.add(`aggro:${info.source.id}`);

    target.onDamaged(info, result, this.ctx);
    this.ctx.events.emit('damage', { target, info, result });

    // Hit-stop curto em golpes fortes do jogador (sensação de impacto).
    if (info.source?.kind === 'player' && result.dealt > 0 && info.tag === 'melee') this.hitStop(result.staggered ? 0.08 : 0.04);

    if (result.killed) this.kill(target, info);
    return result;
  }

  /** Mata imediatamente (usado por applyDamage e por scripts). */
  kill(target: Entity, info?: DamageInfo) {
    if (!target.alive) return;
    target.alive = false;
    if (target.health) target.health.current = 0;
    target.onDeath(info, this.ctx);
    this.ctx.events.emit('entity:death', { entity: target, info });
    if (target.kind === 'enemy' || target.kind === 'boss') {
      this.ctx.events.emit('enemy:killed', { entity: target, typeId: target.typeId, killer: info?.source ?? undefined });
    } else if (target.kind === 'creature') {
      this.ctx.events.emit('creature:killed', { entity: target, typeId: target.typeId });
    }
  }

  /**
   * Golpe em arco (corpo a corpo). Retorna os alvos atingidos.
   * `forward` deve estar no plano XZ e normalizado.
   */
  meleeSweep(attacker: Entity, origin: THREE.Vector3, forward: THREE.Vector3, range: number, arcDeg: number, info: DamageInfo, opts: SweepOptions = {}): Entity[] {
    const hits: Entity[] = [];
    const cosHalf = Math.cos(((arcDeg * Math.PI) / 180) * 0.5);
    const vReach = opts.verticalReach ?? 2.2;
    const candidates = this.ctx.entities.queryRadius(origin, range + 1.5, this.list);
    // ordena por distância (mais perto primeiro)
    candidates.sort((a, b) => a.position.distanceToSquared(origin) - b.position.distanceToSquared(origin));
    for (const e of candidates) {
      if (e === attacker || !e.health || !e.alive) continue;
      if (opts.alreadyHit?.has(e.id)) continue;
      if (!this.isHostile(attacker, e) && !opts.filter) continue;
      if (opts.filter && !opts.filter(e)) continue;
      const to = this.tmp2.subVectors(e.position, origin);
      const dy = to.y;
      // alvo pode ser alto: compara com a faixa vertical do corpo
      if (dy > vReach || dy + e.height < -vReach) continue;
      to.y = 0;
      const dist = to.length() - e.radius;
      if (dist > range) continue;
      if (dist > 0.6) {
        to.normalize();
        if (to.dot(forward) < cosHalf) continue;
      }
      // Não acerta através de paredes
      const eye = this.tmp.copy(origin).setY(origin.y + 1.0);
      const tc = e.getCenter(new THREE.Vector3());
      if (!this.ctx.physics.lineOfSight(eye, tc)) continue;
      const res = this.applyDamage(e, { ...info, statuses: info.statuses?.slice(), direction: forward.clone() });
      if (res) {
        hits.push(e);
        opts.alreadyHit?.add(e.id);
        if (opts.maxTargets && hits.length >= opts.maxTargets) break;
      }
    }
    return hits;
  }

  /** Dano em área com queda linear opcional. */
  explode(center: THREE.Vector3, radius: number, info: DamageInfo, source: Entity | null, opts: { falloff?: boolean; hitSource?: boolean; filter?: (e: Entity) => boolean } = {}): Entity[] {
    const hits: Entity[] = [];
    const candidates = this.ctx.entities.queryRadius(center, radius, this.list);
    for (const e of candidates.slice()) {
      if (!e.health || !e.alive) continue;
      if (e === source && !opts.hitSource) continue;
      if (source && !this.isHostile(source, e) && !(opts.hitSource && e === source)) continue;
      if (opts.filter && !opts.filter(e)) continue;
      const c = e.getCenter(this.tmp);
      const d = c.distanceTo(center);
      if (d > radius + e.radius) continue;
      const f = opts.falloff ? Math.max(0.35, 1 - d / (radius + e.radius)) : 1;
      const dir = new THREE.Vector3().subVectors(e.position, center).setY(0);
      if (dir.lengthSq() > 0.0001) dir.normalize();
      const res = this.applyDamage(e, { ...info, amount: info.amount * f, direction: dir, source: source ?? info.source, statuses: info.statuses?.slice() });
      if (res) hits.push(e);
    }
    return hits;
  }

  /**
   * Cria um projétil. Implementação concreta em combat/Projectiles (registrada pelo módulo de combate).
   * Retorna a entidade criada (ou null se o limite de projéteis foi atingido).
   */
  spawnProjectile(spec: ProjectileSpec): Entity | null {
    return this.projectileFactory ? this.projectileFactory(spec, this.ctx) : null;
  }
  /** Definido pelo módulo de projéteis. */
  projectileFactory: ((spec: ProjectileSpec, ctx: GameContext) => Entity | null) | null = null;

  /** Congela brevemente o gameplay para dar peso ao impacto. */
  hitStop(duration: number) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  update(dt: number, ctx: GameContext) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt / Math.max(0.05, ctx.timeScale);
      ctx.timeScale = this.hitStopTimer > 0 ? 0.05 : 1;
    }
  }
}
