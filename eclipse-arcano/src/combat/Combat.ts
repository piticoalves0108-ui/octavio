import * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import type { Entity } from '../core/Entity';
import type { DamageInfo, DamageResult } from './Health';
import { factionsHostile } from '../data/factions';
import { SPELL_COMBOS } from '../data/abilities';
import { Projectiles } from './Projectiles';
import { segmentVsCapsule, type SegHit } from './combatMath';
import type { ColliderTag } from '../world/Collision';
import { TrainingDummy, type DummyOptions } from './TrainingDummy';

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
  /** Redução de dano por alvo perfurado (0.15 = −15% a cada alvo). */
  pierceFalloff?: number;
  /** Segundos voando reto antes de começar a perseguir. */
  homingDelay?: number;
  /** Escolhe um novo alvo hostil próximo se o atual morrer. */
  retarget?: boolean;
  /** Atravessa árvores (padrão: true, exceto flechas). */
  ignoreTrees?: boolean;
  /** Escala do visual (núcleo/rastro/malha). */
  visualScale?: number;
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
  /**
   * Ajuste por alvo logo antes do dano, numa cópia própria de `info` (crítico condicional,
   * bônus contra um tipo de inimigo, estados extras...). Pode alterar amount/crit/statuses.
   */
  modify?: (e: Entity, info: DamageInfo) => void;
}

export interface BeamOptions {
  /** true (padrão) = atravessa todos; false = para no primeiro; número = alvos extras. */
  pierce?: boolean | number;
  /** Ids já atingidos (lasers contínuos que só devem acertar uma vez por varredura). */
  alreadyHit?: Set<number>;
  /** Para em paredes/terreno (padrão true). */
  stopAtWalls?: boolean;
  /** Desenha o feixe (padrão true). Lasers contínuos usam vfx.sustainedBeam e passam false. */
  visual?: boolean;
  color?: number;
  /** Duração do feixe desenhado (s). */
  visualDuration?: number;
  filter?: (e: Entity) => boolean;
  /** Chamado para cada alvo atingido (após o dano). */
  onHit?: (e: Entity, result: DamageResult, point: THREE.Vector3) => void;
}

export interface BeamResult {
  hits: Entity[];
  /** Onde o feixe terminou (parede, alvo ou alcance). */
  end: THREE.Vector3;
  /** Bateu em cenário antes do alcance. */
  blocked: boolean;
}

const TREE: ColliderTag[] = ['tree'];

/**
 * Regras centrais de combate: hostilidade, aplicação de dano (roteamento único),
 * golpes corpo a corpo em arco, explosões em área, feixes e projéteis.
 * Todo dano do jogo deve passar por `applyDamage` para gerar eventos
 * (números de dano, sons, missões, XP, reações de IA).
 *
 * API para a IA (inimigos/chefes):
 * - `meleeSweep(attacker, origem, frente, alcance, arcoGraus, dano, { alreadyHit })`: golpe em arco com
 *   linha de visão (não acerta atrás de paredes).
 * - `spawnProjectile({ kind: 'arrow'|'enemyOrb'|'fireball'|'crystalShard', ... })`: projétil em pool.
 * - `explode(centro, raio, dano, fonte, { falloff })`: dano em área.
 * - `beamAttack(fonte, origem, direção, comprimento, largura, dano, opções)`: feixe (laser) que para em
 *   paredes; para lasers contínuos chame a cada "tick" com `visual: false` e desenhe com `vfx.sustainedBeam`.
 * - `ctx.sys.vfx.telegraph(...)`: anunciar o ataque no chão antes do golpe.
 */
export class Combat implements GameSystem {
  readonly name = 'combat';
  private ctx!: GameContext;
  private hitStopTimer = 0;
  private list: Entity[] = [];
  private beamList: Entity[] = [];
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmp3 = new THREE.Vector3();
  private tmpDir = new THREE.Vector3();
  private sh: SegHit = { dist2: 0, s: 0, t: 0 };
  /** Relógio interno (s de jogo) para marcas. */
  private time = 0;
  /** Marcas temporárias por entidade (ex.: 'runeMark', 'wet', 'chained'). id → (chave → expira em). */
  private marks = new Map<number, Map<string, number>>();
  private markSweep = 0;
  /** Projéteis (pool + simulação). */
  projectiles!: Projectiles;
  /** Entidades que refletem projéteis hostis (Escudo Mágico rank 3). */
  readonly reflectors = new Set<Entity>();
  /** Estatísticas (testes/diagnóstico). */
  stats = { damageEvents: 0, kills: 0, beams: 0, sweeps: 0, explosions: 0 };

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.projectiles = new Projectiles(ctx);
    this.projectileFactory = (spec) => this.projectiles.spawn(spec);
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
   * Regras extras: dano elétrico em alvos molhados (×1,5), 'empowered' na fonte,
   * redução de dano do jogador (progression.damageReduction).
   */
  applyDamage(target: Entity, info: DamageInfo): DamageResult | null {
    const h = target.health;
    if (!h || !target.alive || target.removed) return null;
    if (!(info.amount >= 0)) info.amount = 0;

    if (!info.direction && info.source) {
      info.direction = new THREE.Vector3().subVectors(target.position, info.source.position).setY(0);
      if (info.direction.lengthSq() > 0) info.direction.normalize();
    }
    if (!info.point) info.point = target.getCenter(new THREE.Vector3());

    // Modificadores
    if (info.type === 'lightning' && this.isWet(target)) info.amount *= SPELL_COMBOS.wetLightningMul;
    const emp = info.source?.health?.statuses.get('empowered');
    if (emp) info.amount *= 1 + (emp.magnitude || 0.25);
    if (target.kind === 'player') {
      const dr = this.ctx.sys.progression.getStat('damageReduction');
      if (dr > 0) info.amount *= 1 - Math.min(0.6, dr);
    }

    const facing = target.getForward(this.tmp);
    const result = h.applyDamage(info, facing);
    if (result.immune) return result;
    this.stats.damageEvents++;

    // Knockback
    if (info.knockback && info.direction && !result.blocked) {
      const kb = info.knockback * (target.kind === 'boss' ? 0.1 : 1);
      target.velocity.x += info.direction.x * kb;
      target.velocity.z += info.direction.z * kb;
    }

    // Parry: atordoa o atacante.
    if (result.parried) {
      if (info.source?.health) info.source.health.staggerTimer = Math.max(info.source.health.staggerTimer, 1.4);
      this.ctx.events.emit('combat:parry', { defender: target, attacker: info.source ?? undefined });
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
    this.stats.kills++;
    this.marks.delete(target.id);
    this.reflectors.delete(target);
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
   * `forward` deve estar no plano XZ e normalizado. Não acerta através de paredes.
   */
  meleeSweep(attacker: Entity, origin: THREE.Vector3, forward: THREE.Vector3, range: number, arcDeg: number, info: DamageInfo, opts: SweepOptions = {}): Entity[] {
    const hits: Entity[] = [];
    this.stats.sweeps++;
    const cosHalf = Math.cos(((Math.min(360, arcDeg) * Math.PI) / 180) * 0.5);
    const vReach = opts.verticalReach ?? 2.2;
    const candidates = this.ctx.entities.queryRadius(origin, range + 1.5, this.list);
    // ordena por distância (mais perto primeiro)
    candidates.sort((a, b) => a.position.distanceToSquared(origin) - b.position.distanceToSquared(origin));
    const eye = this.tmp3.copy(origin).setY(origin.y + 1.0);
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
      if (dist > 0.6 && arcDeg < 360) {
        to.normalize();
        if (to.dot(forward) < cosHalf) continue;
      }
      // Não acerta através de paredes
      const tc = e.getCenter(this.tmp);
      if (!this.ctx.physics.lineOfSight(eye, tc)) continue;
      const hitInfo: DamageInfo = { ...info, statuses: info.statuses?.slice(), direction: forward.clone(), point: info.point ? info.point.clone() : undefined };
      opts.modify?.(e, hitInfo);
      const res = this.applyDamage(e, hitInfo);
      if (res) {
        hits.push(e);
        opts.alreadyHit?.add(e.id);
        if (opts.maxTargets && hits.length >= opts.maxTargets) break;
      }
    }
    return hits;
  }

  /** Dano em área com queda linear opcional. Não atravessa paredes grossas (linha de visão do centro). */
  explode(center: THREE.Vector3, radius: number, info: DamageInfo, source: Entity | null, opts: { falloff?: boolean; hitSource?: boolean; filter?: (e: Entity) => boolean; ignoreWalls?: boolean } = {}): Entity[] {
    const hits: Entity[] = [];
    this.stats.explosions++;
    const candidates = this.ctx.entities.queryRadius(center, radius, this.list).slice();
    const c0 = this.tmp3.copy(center);
    c0.y += 0.3;
    for (const e of candidates) {
      if (!e.health || !e.alive) continue;
      if (e === source && !opts.hitSource) continue;
      if (source && !this.isHostile(source, e) && !(opts.hitSource && e === source)) continue;
      if (opts.filter && !opts.filter(e)) continue;
      const c = e.getCenter(this.tmp);
      // distância ao corpo (cápsula), não só ao centro
      const dy = Math.max(e.position.y - center.y, 0, center.y - (e.position.y + e.height));
      const dxz = Math.max(0, Math.hypot(e.position.x - center.x, e.position.z - center.z) - e.radius);
      const d = Math.hypot(dxz, dy);
      if (d > radius) continue;
      if (!opts.ignoreWalls && d > 1 && !this.ctx.physics.lineOfSight(c0, c)) continue;
      const f = opts.falloff ? Math.max(0.4, 1 - d / Math.max(0.01, radius)) : 1;
      const dir = new THREE.Vector3().subVectors(e.position, center).setY(0);
      if (dir.lengthSq() > 0.0001) dir.normalize();
      else dir.set(0, 0, 1);
      const res = this.applyDamage(e, { ...info, amount: info.amount * f, direction: dir, source: source ?? info.source, statuses: info.statuses?.slice(), point: c.clone() });
      if (res) hits.push(e);
    }
    return hits;
  }

  /**
   * Feixe reto (laser/lança): para na primeira parede (ignora árvores), atinge entidades cujo
   * corpo (cápsula) esteja a até `width` da linha. Perfura por padrão.
   */
  beamAttack(source: Entity | null, origin: THREE.Vector3, direction: THREE.Vector3, length: number, width: number, info: DamageInfo, opts: BeamOptions = {}): BeamResult {
    this.stats.beams++;
    const dir = this.tmpDir.copy(direction);
    const dl = dir.length();
    const end = new THREE.Vector3().copy(origin);
    if (!(dl > 1e-6) || !(length > 0)) return { hits: [], end, blocked: false };
    dir.multiplyScalar(1 / dl);
    let maxLen = length;
    let blocked = false;
    if (opts.stopAtWalls !== false) {
      const hit = this.ctx.physics.raycast(origin, dir, length, { ignoreTags: TREE });
      if (hit) {
        maxLen = hit.distance;
        blocked = true;
      }
    }
    end.copy(origin).addScaledVector(dir, maxLen);
    // candidatos ao longo do segmento
    const mid = this.tmp.copy(origin).add(end).multiplyScalar(0.5);
    const cands = this.ctx.entities.queryRadius(mid, maxLen * 0.5 + width + 2, this.beamList);
    const found: { e: Entity; s: number }[] = [];
    for (const e of cands) {
      if (e === source || !e.health || !e.alive) continue;
      if (opts.alreadyHit?.has(e.id)) continue;
      if (source && !this.isHostile(source, e) && !opts.filter) continue;
      if (opts.filter && !opts.filter(e)) continue;
      segmentVsCapsule(origin, end, e.position, e.height, this.sh);
      const r = width + e.radius;
      if (this.sh.dist2 <= r * r) found.push({ e, s: this.sh.s });
    }
    found.sort((a, b) => a.s - b.s);
    const pierce = opts.pierce === undefined || opts.pierce === true ? Infinity : opts.pierce === false ? 0 : Math.max(0, opts.pierce);
    const hits: Entity[] = [];
    const flatDir = new THREE.Vector3(dir.x, 0, dir.z);
    if (flatDir.lengthSq() > 1e-6) flatDir.normalize();
    for (const f of found) {
      const point = new THREE.Vector3().copy(origin).addScaledVector(dir, f.s * maxLen);
      const res = this.applyDamage(f.e, { ...info, source: source ?? info.source, direction: flatDir.clone(), point, statuses: info.statuses?.slice() });
      if (!res) continue;
      hits.push(f.e);
      opts.alreadyHit?.add(f.e.id);
      opts.onHit?.(f.e, res, point);
      if (hits.length > pierce) {
        end.copy(point);
        blocked = true;
        break;
      }
    }
    if (opts.visual !== false) {
      const vfx = this.ctx.sys.vfx;
      const col = opts.color ?? 0x7fe8ff;
      vfx.beam(origin, end, col, Math.max(0.12, width * 0.7), opts.visualDuration ?? 0.22);
      if (blocked) vfx.burst('arcaneSpark', end, { color: col, scale: 1.2, direction: this.tmp2.copy(dir).negate() });
    }
    return { hits, end, blocked };
  }

  /**
   * Raio em cadeia: salta de `from` para até `jumps` inimigos hostis a `source` (cada salto até
   * `range` m do anterior, com linha de visão), aplicando `info` (tipo elétrico recomendado).
   * Retorna os atingidos (sem contar `from`).
   */
  chainLightning(source: Entity, from: Entity, jumps: number, range: number, info: DamageInfo, exclude?: Set<number>, color = 0xbfe4ff): Entity[] {
    const hit = exclude ?? new Set<number>();
    hit.add(from.id);
    const out: Entity[] = [];
    let cur = from;
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (let j = 0; j < jumps; j++) {
      cur.getCenter(a);
      let best: Entity | null = null;
      let bestD = Infinity;
      for (const e of this.ctx.entities.queryRadius(cur.position, range, this.list)) {
        if (e === source || hit.has(e.id) || !e.health || !e.alive || !this.isHostile(source, e)) continue;
        const d = e.position.distanceToSquared(cur.position);
        if (d < bestD && this.ctx.physics.lineOfSight(a, e.getCenter(b))) {
          bestD = d;
          best = e;
        }
      }
      if (!best) break;
      best.getCenter(b);
      this.ctx.sys.vfx.lightning(a, b, { color, branches: 1, duration: 0.22, width: 0.1 });
      this.ctx.sys.vfx.burst('lightning', b, { scale: 0.5, count: 8, color });
      hit.add(best.id);
      this.applyDamage(best, { ...info, source, point: b.clone(), statuses: info.statuses?.slice(), direction: undefined });
      out.push(best);
      cur = best;
    }
    return out;
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

  /**
   * Cria um boneco de treino (inimigo de teste com vida e facção, opcionalmente atacando
   * com telegraph + golpe/projétil/feixe). Útil em arenas de treino e testes automatizados.
   */
  spawnTrainingDummy(position: THREE.Vector3, opts?: DummyOptions): TrainingDummy {
    const d = new TrainingDummy(opts);
    d.position.copy(position);
    this.ctx.entities.add(d);
    return d;
  }

  /** Congela brevemente o gameplay para dar peso ao impacto. */
  hitStop(duration: number) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  // =====================================================================
  // Marcas e condições (combinações entre magias)
  // =====================================================================
  /** Marca temporária numa entidade (ex.: 'runeMark' da Explosão Rúnica, 'wet'). */
  mark(e: Entity, key: string, duration: number) {
    let m = this.marks.get(e.id);
    if (!m) {
      m = new Map();
      this.marks.set(e.id, m);
    }
    m.set(key, Math.max(m.get(key) ?? 0, this.time + duration));
  }
  hasMark(e: Entity, key: string): boolean {
    const t = this.marks.get(e.id)?.get(key);
    return t !== undefined && t > this.time;
  }
  clearMark(e: Entity, key: string) {
    this.marks.get(e.id)?.delete(key);
  }

  /** Molhado: chuva (ao ar livre), dentro d'água ou marcado como 'wet'. */
  isWet(e: Entity): boolean {
    if (this.hasMark(e, 'wet')) return true;
    const env = this.ctx.sys.env;
    if (env?.isRaining?.()) return true;
    const ws = this.ctx.physics.waterSurface(e.position.x, e.position.z);
    return ws !== null && e.position.y < ws + 0.4;
  }

  update(dt: number, ctx: GameContext) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt / Math.max(0.05, ctx.timeScale);
      ctx.timeScale = this.hitStopTimer > 0 ? 0.05 : 1;
    }
    this.time += dt;
    this.projectiles.update(dt);
    // limpeza periódica das marcas vencidas
    this.markSweep -= dt;
    if (this.markSweep <= 0) {
      this.markSweep = 2;
      for (const [id, m] of this.marks) {
        for (const [k, t] of m) if (t <= this.time) m.delete(k);
        if (m.size === 0) this.marks.delete(id);
      }
    }
  }

  onNewGame() {
    this.projectiles?.clear();
    this.marks.clear();
    this.reflectors.clear();
    this.hitStopTimer = 0;
  }
}
