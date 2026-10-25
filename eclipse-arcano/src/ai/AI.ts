import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { Entity } from '../core/Entity';
import type { MusicState } from '../core/EventBus';
import { AI_RULES, getEnemyDef } from '../data/enemies';
import { CREATURES, DISTANT_DRAGON } from '../data/creatures';
import { GUARDIAN, BOSS_GATES } from '../data/bosses';
import { PLACES } from '../data/places';
import { BOSS_ARENAS } from '../data/world';
import { getWeaponDef } from '../data/weapons';
import { registerProjectileVisual } from '../combat/Projectiles';
import { Enemy, type EnemySpawnOptions } from './Enemy';
import { Creature, type CreatureSpawnOptions } from './creatures/Creature';
import { BirdFlocks } from './creatures/BirdFlocks';
import { Guardian } from './bosses/Guardian';
import { StoryBoss } from './bosses/StoryBoss';
import { STORY_BOSSES } from '../data/storyBosses';
import { evalAll, type NarrativeEnv } from '../rpg/dialogue/script';
import { Spawner } from './Spawner';
import { AttackTokens, PlayerStyle, closestApproach } from './logic';
import { distXZ, dist2XZ, rand } from './shared';

export interface SpawnOptions {
  /** Pontos de patrulha. */
  patrol?: THREE.Vector3[];
  /** Zona de origem (para respawn/limites). */
  zoneId?: string;
  /** Id único (inimigos de missão/elite que não renascem após mortos). */
  uniqueId?: string;
  level?: number;
  /** Começa já em alerta contra o jogador. */
  aggro?: boolean;
}

const PACK_SLOTS = [1.9, -1.9, Math.PI, 1.1, -1.1, 2.6, -2.6];
const _ca = { t: 0, d2: 0 };

/**
 * IA de inimigos, chefes e criaturas: população ambiente (Spawner), coordenação
 * (tokens de ataque, chamado de aliados, slots de matilha), audição por eventos,
 * adaptação ao estilo do jogador, luta do chefe (Guardião Mecânico), música de combate,
 * bandos de pássaros e eventos ambientes (dragão distante).
 */
export class AI implements GameSystem, Saveable {
  readonly name = 'ai';
  readonly saveKey = 'ai';
  /** Ids únicos já derrotados (elites, chefes, inimigos de missão). */
  defeatedUniques = new Set<string>();
  /** Chefes derrotados (ids). */
  defeatedBosses = new Set<string>();
  ctx!: GameContext;

  /** Inimigos registrados (vivos ou morrendo). */
  readonly enemies: Enemy[] = [];
  readonly creatures: Creature[] = [];
  readonly tokens = new AttackTokens({ melee: AI_RULES.meleeTokens, ranged: AI_RULES.rangedTokens });
  readonly style = new PlayerStyle(AI_RULES.adapt);
  spawner!: Spawner;
  flocks!: BirdFlocks;
  boss: Guardian | null = null;
  /** Chefe da história em luta (Atos II a IV). */
  storyBoss: StoryBoss | null = null;
  private storyCheckT = 0;
  /** Relógio interno (s de jogo). */
  time = 0;
  private music: MusicState | null = null;
  private combatLinger = 0;
  private victoryT = -1;
  private despawnT = 0;
  private projT = 0;
  private tokenT = 0;
  private alertSfxT = 0;
  private bossCheckT = 0;
  private selfAlarm = false;
  private readonly playerVel = new THREE.Vector3();
  private readonly prevPlayer = new THREE.Vector3();
  private hasPrev = false;
  private readonly arenaCenter = new THREE.Vector3();
  private dragon: Creature | null = null;
  /** Desliga a população ambiente (testes). */
  ambient = true;
  stats = { enemies: 0, engaged: 0, creatures: 0, tokens: 0, enemyMs: 0, spawned: 0, killed: 0 };
  /** Tempo (ms) gasto nos updates dos inimigos no quadro anterior (acumulado pelas entidades). */
  enemyAcc = 0;

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.spawner = new Spawner(this);
    this.flocks = new BirdFlocks(ctx.scene);
    const ac = PLACES['arena_centro'];
    if (ac) this.arenaCenter.set(ac.x, ac.y ?? 0, ac.z);
    // pedregulho do golem: núcleo terroso grande com fumaça
    registerProjectileVisual('boulder', { core: 0x8a7a66, coreSize: 1.8, trail: { color: 0x6a5a4a, width: 0.35, life: 0.3, alpha: 0.6 }, emitRate: 30, emitColor: 0x7a6a5a, emitSize: 0.3, smoke: true, impact: 'dust', impactScale: 2.2, explodeOnExpire: true, sound: 'explosion' });

    const ev = ctx.events;
    ev.on('damage', ({ target, info, result }) => this.onDamageEvent(target, info.source ?? null, result.blocked));
    ev.on('ability:cast', ({ abilityId, caster, position }) => this.onCast(abilityId, caster, position));
    ev.on('player:attack', ({ weaponId, heavy }) => this.onPlayerAttack(weaponId, heavy));
    ev.on('npc:alarm', ({ position, radius }) => {
      if (this.selfAlarm) return;
      this.hearAt(position, radius * AI_RULES.hearing.alarm, false, null);
    });
    ev.on('player:death', () => {
      if (this.boss && this.boss.state !== 'dead') this.resetBossFight('morte');
      if (this.storyBoss && this.storyBoss.state !== 'dead' && this.storyBoss.state !== 'yield') this.resetStoryBoss('morte');
    });
    ev.on('time:hour', () => this.maybeDragon());
  }

  // =====================================================================
  // API pública
  // =====================================================================
  /**
   * Cria um inimigo (dados em src/data/enemies.ts). Não recria uniqueIds derrotados e não
   * duplica um uniqueId vivo (retorna o existente). `extra` = opções internas do spawner.
   */
  spawnEnemy(typeId: string, position: THREE.Vector3, opts?: SpawnOptions, extra?: Partial<EnemySpawnOptions>): Enemy | null {
    if (typeId === GUARDIAN.id) return null;
    const def = getEnemyDef(typeId);
    if (!def) {
      console.warn(`[AI] tipo de inimigo desconhecido: ${typeId}`);
      return null;
    }
    const uid = opts?.uniqueId;
    if (uid) {
      if (this.defeatedUniques.has(uid)) return null;
      const ex = this.findUnique(uid);
      if (ex) return ex;
    }
    const e = new Enemy(def, { ...extra, level: opts?.level ?? extra?.level, uniqueId: uid, zoneId: opts?.zoneId ?? extra?.zoneId, patrol: opts?.patrol ?? extra?.patrol, aggro: opts?.aggro ?? extra?.aggro });
    e.position.copy(position);
    if (uid && !opts?.zoneId) e.sp.noLeash = !!opts?.aggro;
    this.ctx.entities.add(e);
    this.stats.spawned++;
    return e;
  }

  /** Cria o chefe na arena (se ainda não derrotado). Fecha o portão e mostra a barra. */
  spawnBoss(bossId: string): Entity | null {
    if (STORY_BOSSES[bossId]) return this.spawnStoryBoss(bossId);
    if (bossId !== GUARDIAN.id) {
      console.warn(`[AI] chefe desconhecido: ${bossId}`);
      return null;
    }
    if (this.defeatedBosses.has(bossId)) return null;
    if (this.boss && !this.boss.removed && this.boss.state !== 'dead') return this.boss;
    const ctx = this.ctx;
    const g = new Guardian();
    const st = PLACES['arena_chefe_inicio'] ?? PLACES['arena_centro'];
    if (st) {
      g.position.set(st.x, st.y ?? this.arenaCenter.y, st.z);
      g.yaw = st.yaw ?? 0;
    } else g.position.copy(this.arenaCenter);
    ctx.entities.add(g);
    this.boss = g;
    const gate = BOSS_GATES[bossId];
    if (gate) ctx.sys.world.setGateOpen(gate, false);
    ctx.sys.ui.showBossBar(GUARDIAN.title, g);
    ctx.events.emit('boss:start', { bossId, entity: g });
    this.setMusic('boss');
    return g;
  }

  /** Cria um chefe da história na arena (se ainda não derrotado). */
  spawnStoryBoss(bossId: string): StoryBoss | null {
    const def = STORY_BOSSES[bossId];
    if (!def || this.defeatedBosses.has(bossId)) return null;
    const cur = this.storyBoss;
    if (cur && !cur.removed && cur.state !== 'dead') return cur.bossId === bossId ? cur : null;
    const ctx = this.ctx;
    const b = new StoryBoss(def);
    const A = def.arena;
    // aparece do lado oposto da arena em relação ao jogador
    const pl = ctx.sys.player.entity.position;
    const ang = Math.atan2(A.x - pl.x, A.z - pl.z);
    const r = A.radius * 0.45;
    const x = A.x + Math.sin(ang) * r;
    const z = A.z + Math.cos(ang) * r;
    b.position.set(x, (A.y ?? ctx.physics.terrainHeight(x, z)) + 1, z);
    b.yaw = ang + Math.PI;
    ctx.entities.add(b);
    this.storyBoss = b;
    ctx.sys.ui.showBossBar(def.title, b);
    ctx.events.emit('boss:start', { bossId, entity: b });
    this.setMusic('boss');
    return b;
  }

  /** Chefe da história vencido (ou rendido: Darian). */
  onStoryBossDefeated(b: StoryBoss, yielded: boolean) {
    const ctx = this.ctx;
    this.defeatedBosses.add(b.bossId);
    ctx.sys.ui.showBossBar(null, null);
    for (const s of b.summons) if (s.alive && !s.removed) ctx.sys.vfx.dissolve(s.object3d, { duration: 1.2, color: b.def.glow, height: s.height, onDone: () => ctx.entities.remove(s) });
    b.summons.length = 0;
    ctx.events.emit('boss:defeated', { bossId: b.bossId, entity: b });
    ctx.events.emit('ui:notify', { text: yielded ? `${b.def.name} se rendeu.` : `${b.def.title} foi derrotado!`, kind: 'discovery' });
    this.setMusic('victory');
    this.victoryT = 8;
  }

  /** Reseta a luta do chefe da história (morte do jogador/fuga). */
  resetStoryBoss(_reason: string) {
    const b = this.storyBoss;
    const ctx = this.ctx;
    if (!b) return;
    b.cleanup(ctx);
    if (!b.removed) ctx.entities.remove(b);
    this.storyBoss = null;
    ctx.sys.ui.showBossBar(null, null);
    this.storyCheckT = 4;
    this.setMusic('explore');
  }

  /** NPC nomeado pelo id de dados (delegado ao sistema de NPCs — contrato C8). */
  getNpc(npcId: string): Entity | undefined {
    return this.ctx.sys.npcs?.get(npcId);
  }

  /** Alerta civis/guardas/inimigos próximos (uso de magia em público, combate, monstros). */
  alarm(position: THREE.Vector3, radius: number, reason: 'magic' | 'combat' | 'monster') {
    this.ctx.events.emit('npc:alarm', { position, radius, reason });
  }

  /** Coordenação: no máximo AI_RULES.meleeTokens atacantes corpo a corpo por alvo. */
  requestAttackToken(attacker: Entity, target: Entity): boolean {
    const ok = this.tokens.request(attacker.id, target.id, 'melee', this.time);
    return ok;
  }
  /** Atiradores simultâneos por alvo. */
  requestRangedToken(attacker: Entity, target: Entity): boolean {
    return this.tokens.request(attacker.id, target.id, 'ranged', this.time);
  }
  releaseAttackToken(attacker: Entity) {
    this.tokens.release(attacker.id);
  }

  /** Há inimigos em combate ativo com o jogador? (música/câmera/save) */
  inCombat(): boolean {
    const pl = this.ctx?.sys.player?.entity;
    if (!pl) return false;
    if (this.activeBoss()) return true;
    for (const e of this.enemies) if (e.engaged && e.target === pl && e.deadT < 0) return true;
    for (const c of this.creatures) if (c.angry || (c.def.temperament === 'hostile' && (c.state === 'attack' || c.state === 'alert'))) return true;
    return false;
  }

  /** Chefe em luta (ou null). */
  activeBoss(): Entity | null {
    const b = this.boss;
    if (b && !b.removed && b.alive && b.state !== 'dead') return b;
    const s = this.storyBoss;
    return s && !s.removed && s.alive && s.state !== 'dead' && s.state !== 'yield' ? s : null;
  }

  /** Cria uma criatura (src/data/creatures.ts). */
  spawnCreature(typeId: string, position: THREE.Vector3, opts?: CreatureSpawnOptions): Creature | null {
    const def = CREATURES[typeId];
    if (!def || def.rig === 'bird') return null;
    const c = new Creature(def, opts);
    c.position.copy(position);
    this.ctx.entities.add(c);
    return c;
  }

  /** Inimigos vivos dentro do raio (reutiliza `out`). */
  enemiesNear(pos: THREE.Vector3, radius: number, out: Enemy[] = []): Enemy[] {
    out.length = 0;
    const r2 = radius * radius;
    for (const e of this.enemies) if (e.alive && e.deadT < 0 && dist2XZ(e.position, pos) <= r2) out.push(e);
    return out;
  }

  /** Entidades com barra de vida visível neste quadro (a UI pode usar). */
  visibleBars(out: Entity[] = []): Entity[] {
    out.length = 0;
    for (const e of this.enemies) if (e.barVisible) out.push(e);
    for (const c of this.creatures) if (c.barVisible) out.push(c);
    return out;
  }

  // =====================================================================
  // Registro (chamado pelas entidades)
  // =====================================================================
  register(e: Enemy) {
    if (!this.enemies.includes(e)) this.enemies.push(e);
  }
  unregister(e: Enemy) {
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
    this.tokens.release(e.id);
    // Ravena poupada (removida pela narrativa após a rendição) também não volta
    if (e.uniqueId && e.sp.surrendered) this.defeatedUniques.add(e.uniqueId);
  }
  registerCreature(c: Creature) {
    if (!this.creatures.includes(c)) this.creatures.push(c);
  }
  unregisterCreature(c: Creature) {
    const i = this.creatures.indexOf(c);
    if (i >= 0) this.creatures.splice(i, 1);
    if (c === this.dragon) this.dragon = null;
  }

  findUnique(uid: string): Enemy | null {
    for (const e of this.enemies) if (e.uniqueId === uid && !e.removed && e.alive) return e;
    return null;
  }

  activeEnemyCount(): number {
    let n = 0;
    for (const e of this.enemies) if (e.alive && !e.removed && e.def.archetype !== 'static') n++;
    return n;
  }

  /** Velocidade estimada do alvo (antecipação de mira). */
  targetVelocity(t: Entity, out: THREE.Vector3): THREE.Vector3 {
    if (t.kind === 'player') return out.copy(this.playerVel);
    return out.set(0, 0, 0);
  }

  /** Posição de flanco (ângulo relativo à frente do alvo) para lobos sem token. */
  packSlot(e: Enemy, t: Entity): number {
    let i = 0;
    for (const o of this.enemies) {
      if (o === e) break;
      if (o.target === t && o.def.archetype === 'pack' && o.engaged) i++;
    }
    return PACK_SLOTS[i % PACK_SLOTS.length];
  }

  onEnemyAlert(e: Enemy, callAllies: boolean) {
    const t = e.target;
    if (!t) return;
    if (this.alertSfxT <= 0) {
      this.alertSfxT = 1.2;
      this.ctx.sys.audio.play(e.def.rig === 'wolf' ? 'creature_call' : 'enemy_alert', { position: e.position, volume: 0.8 });
    }
    if (callAllies) {
      const R = e.def.perception.callAllies;
      for (const o of this.enemies) {
        if (o === e || !o.alive || o.deadT >= 0 || o.engaged || o.state === 'surrender') continue;
        if (o.def.faction !== e.def.faction) continue;
        if (dist2XZ(o.position, e.position) > R * R) continue;
        o.engage(t, false, rand(0.3, 0.9));
      }
    }
    // avisa civis/guardas por perto
    this.selfAlarm = true;
    try {
      this.alarm(e.position, 30, 'monster');
    } finally {
      this.selfAlarm = false;
    }
  }

  onEnemyDeath(e: Enemy) {
    this.tokens.release(e.id);
    this.stats.killed++;
    if (e.uniqueId) this.defeatedUniques.add(e.uniqueId);
    this.spawner.onDeath(e.slot, e.zoneId, this.ctx);
  }

  onCreatureDeath(c: Creature) {
    this.spawner.onDeath(c.slot, c.zoneId, this.ctx);
  }

  onBossDefeated(g: Guardian) {
    const ctx = this.ctx;
    this.defeatedBosses.add(g.bossId);
    const gate = BOSS_GATES[g.bossId];
    if (gate) ctx.sys.world.setGateOpen(gate, true);
    ctx.sys.ui.showBossBar(null, null);
    // pilares e sentinelas restantes se desfazem
    for (const p of g.pillars) if (p.alive) ctx.sys.vfx.burst('crystalShatter', p.position, { scale: 1.5 });
    for (const s of g.summons) if (s.alive && !s.removed) ctx.sys.vfx.dissolve(s.object3d, { duration: 1.2, color: 0x58d8ff, height: s.height, onDone: () => ctx.entities.remove(s) });
    g.summons.length = 0;
    for (const p of g.pillars) if (!p.removed) ctx.entities.remove(p);
    g.pillars.length = 0;
    ctx.events.emit('boss:defeated', { bossId: g.bossId, entity: g });
    ctx.events.emit('ui:notify', { text: `${GUARDIAN.title} foi derrotado!`, kind: 'discovery' });
    this.setMusic('victory');
    this.victoryT = 8;
  }

  /** Reseta a luta do chefe (morte do jogador/fuga): vida cheia, portão aberto, sem barra. */
  resetBossFight(_reason: string) {
    const b = this.boss;
    const ctx = this.ctx;
    if (!b) return;
    b.cleanup(ctx);
    if (!b.removed) ctx.entities.remove(b);
    this.boss = null;
    const gate = BOSS_GATES[b.bossId];
    if (gate) ctx.sys.world.setGateOpen(gate, true);
    ctx.sys.ui.showBossBar(null, null);
    this.bossCheckT = 4;
    this.setMusic('explore');
  }

  // =====================================================================
  // Eventos (audição, adaptação, ameaças)
  // =====================================================================
  private onDamageEvent(target: Entity, source: Entity | null, blocked: boolean) {
    const pl = this.ctx.sys.player.entity;
    // adaptação: golpes de inimigos no jogador (bloqueados ou não)
    if (target === pl && source && (source.kind === 'enemy' || source.kind === 'boss')) this.style.onEnemyHit(blocked);
    // som de combate: inimigos próximos ouvem
    if (source === pl || target === pl) this.hearAt(target.position, AI_RULES.hearing.damage, true, source === pl ? pl : null);
  }

  private onCast(abilityId: string, caster: Entity, position: THREE.Vector3) {
    const pl = this.ctx.sys.player.entity;
    if (caster !== pl) return;
    // adaptação: distância até o inimigo engajado mais próximo
    let best = Infinity;
    for (const e of this.enemies) if (e.engaged) best = Math.min(best, distXZ(e.position, pl.position));
    if (best < Infinity) this.style.onPlayerRanged(abilityId, best, this.time);
    this.hearAt(position, AI_RULES.hearing.cast, true, pl);
    this.hearAt(pl.position, AI_RULES.hearing.cast * 0.6, true, pl);
    this.flocks.scare(position, 30);
  }

  private onPlayerAttack(weaponId: string, heavy: boolean) {
    const pl = this.ctx.sys.player.entity;
    const w = getWeaponDef(weaponId);
    this.hearAt(pl.position, AI_RULES.hearing.melee, false, null);
    if (w.type === 'staff') return; // disparos: tratados pela varredura de projéteis
    this.style.onPlayerMelee();
    const range = (w.range ?? 2.4) + 2.2 + (heavy ? 0.8 : 0);
    const fx = Math.sin(pl.yaw);
    const fz = Math.cos(pl.yaw);
    for (const e of this.enemies) {
      if (!e.engaged || e.deadT >= 0 || e.tier !== 0) continue;
      const dx = e.position.x - pl.position.x;
      const dz = e.position.z - pl.position.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.radius || (d > 1 && (dx * fx + dz * fz) / d < 0.25)) continue;
      e.threat('melee', pl.position.x, pl.position.z, heavy ? 1.15 : 1);
    }
  }

  /** Sons: inimigos e criaturas dentro do raio (× audição de cada tipo) reagem. */
  hearAt(pos: THREE.Vector3, radius: number, loud: boolean, source: Entity | null) {
    for (const e of this.enemies) {
      if (!e.alive || e.deadT >= 0) continue;
      const r = radius * e.def.perception.hearing;
      if (dist2XZ(e.position, pos) <= r * r) e.hear(pos, loud, source);
    }
    for (const c of this.creatures) {
      if (dist2XZ(c.position, pos) <= radius * radius) c.hear(pos, loud);
    }
  }

  /** Projéteis do jogador vindo na direção de inimigos engajados → chance de esquiva. */
  private scanProjectiles() {
    const ctx = this.ctx;
    const list = ctx.sys.combat.projectiles?.active;
    if (!list || list.length === 0) return;
    const pl = ctx.sys.player.entity;
    for (const p of list) {
      if (!p.active || p.owner !== pl) continue;
      const stamp = this.time - p.age;
      for (const e of this.enemies) {
        if (!e.engaged || e.deadT >= 0 || e.tier !== 0) continue;
        if (e.sawProjectile(p.id, stamp)) continue;
        const rx = p.position.x - e.position.x;
        const ry = p.position.y - (e.position.y + e.height * 0.5);
        const rz = p.position.z - e.position.z;
        if (rx * rx + rz * rz > 40 * 40) continue;
        closestApproach(rx, ry, rz, p.vel.x, p.vel.y, p.vel.z, 0.8, _ca);
        const hitR = e.radius + p.pradius + 0.35 + (p.explodeRadius > 0 ? p.explodeRadius * 0.6 : 0);
        if (_ca.d2 > hitR * hitR || _ca.t < 0.08) continue;
        e.markProjectile(p.id, stamp);
        const tag = p.damage?.tag ?? null;
        const mul = 1 + this.style.ranged * 0.8 + this.style.repeatOf(tag) * 0.7;
        e.threat('projectile', p.position.x, p.position.z, mul);
      }
    }
  }

  // =====================================================================
  // Atualização
  // =====================================================================
  update(dt: number, ctx: GameContext) {
    this.time += dt;
    this.stats.enemyMs = this.stats.enemyMs * 0.95 + this.enemyAcc * 0.05;
    this.enemyAcc = 0;
    const pl = ctx.sys.player.entity;
    // velocidade estimada do jogador (suavizada)
    if (this.hasPrev && dt > 0) {
      const k = Math.min(1, dt * 8);
      this.playerVel.x += ((pl.position.x - this.prevPlayer.x) / dt - this.playerVel.x) * k;
      this.playerVel.y += ((pl.position.y - this.prevPlayer.y) / dt - this.playerVel.y) * k;
      this.playerVel.z += ((pl.position.z - this.prevPlayer.z) / dt - this.playerVel.z) * k;
      if (this.playerVel.lengthSq() > 900) this.playerVel.setLength(30);
    }
    this.prevPlayer.copy(pl.position);
    this.hasPrev = true;
    this.style.decay(dt);
    this.alertSfxT -= dt;

    this.tokenT -= dt;
    if (this.tokenT <= 0) {
      this.tokenT = 0.5;
      this.tokens.expire(this.time, AI_RULES.tokenTimeout, (id) => {
        const e = ctx.entities.get(id);
        return !!e && e.alive && !e.removed;
      });
    }
    this.projT -= dt;
    if (this.projT <= 0) {
      this.projT = 0.06;
      this.scanProjectiles();
    }
    if (this.ambient) this.spawner.update(dt, ctx);
    this.updateBossTrigger(dt, ctx);
    this.despawnFar(dt, ctx);
    this.flocks.update(dt, ctx);
    this.updateMusic(dt);
    // estatísticas
    let engaged = 0;
    for (const e of this.enemies) if (e.engaged) engaged++;
    this.stats.enemies = this.enemies.length;
    this.stats.engaged = engaged;
    this.stats.creatures = this.creatures.length;
    this.stats.tokens = this.tokens.size;
  }

  /** Chefes da história: aparecem quando o jogador entra na arena no estágio certo da missão. */
  private updateStoryTrigger(dt: number, ctx: GameContext) {
    this.storyCheckT -= dt;
    if (this.storyCheckT > 0) return;
    this.storyCheckT = 0.3;
    const cur = this.storyBoss;
    if (cur && !cur.removed && cur.state !== 'dead') return;
    if (cur && (cur.removed || cur.state === 'dead')) this.storyBoss = null;
    const pl = ctx.sys.player.entity;
    if (!pl.alive || ctx.state !== 'playing') return;
    const env = (ctx.sys.quests as unknown as { narrative?: { env: NarrativeEnv } }).narrative?.env;
    if (!env) return;
    for (const id in STORY_BOSSES) {
      if (this.defeatedBosses.has(id)) continue;
      const d = STORY_BOSSES[id];
      const A = d.arena;
      const dx = pl.position.x - A.x;
      const dz = pl.position.z - A.z;
      const R = A.radius - 2;
      if (dx * dx + dz * dz > R * R) continue;
      const gy = A.y ?? ctx.physics.terrainHeight(A.x, A.z);
      if (Math.abs(pl.position.y - gy) > (A.y !== undefined ? 12 : 16)) continue;
      if (!evalAll(d.when, env)) continue;
      this.spawnStoryBoss(id);
      return;
    }
  }

  private updateBossTrigger(dt: number, ctx: GameContext) {
    this.updateStoryTrigger(dt, ctx);
    this.bossCheckT -= dt;
    if (this.bossCheckT > 0) return;
    this.bossCheckT = 0.25;
    const id = GUARDIAN.id;
    if (this.defeatedBosses.has(id) || (this.boss && !this.boss.removed)) return;
    const pl = ctx.sys.player.entity;
    if (!pl.alive || ctx.state !== 'playing') return;
    const R = (BOSS_ARENAS[id]?.radius ?? 36) - 3;
    if (dist2XZ(pl.position, this.arenaCenter) < R * R && Math.abs(pl.position.y - this.arenaCenter.y) < 8) this.spawnBoss(id);
  }

  private despawnFar(dt: number, ctx: GameContext) {
    this.despawnT -= dt;
    if (this.despawnT > 0) return;
    this.despawnT = 2;
    const pl = ctx.sys.player.entity.position;
    const D2 = AI_RULES.despawnDistance * AI_RULES.despawnDistance;
    for (const e of this.enemies) {
      if (e.removed || e.engaged || e.deadT >= 0) continue;
      if (dist2XZ(e.position, pl) < D2) continue;
      // únicos de missão (sem zona) ficam; únicos de zona voltam quando a zona reativar
      if (e.uniqueId && !e.zoneId) continue;
      const z = e.zoneId ? this.spawner.zones.find((x) => x.def.id === e.zoneId) : undefined;
      if (z && z.active) continue;
      ctx.entities.remove(e);
    }
  }

  private setMusic(s: MusicState) {
    if (this.music === s) return;
    this.music = s;
    this.ctx.events.emit('music:intensity', { state: s });
  }

  private updateMusic(dt: number) {
    if (this.victoryT > 0) {
      this.victoryT -= dt;
      if (this.victoryT <= 0) this.setMusic('explore');
      return;
    }
    if (this.activeBoss()) {
      this.setMusic('boss');
      return;
    }
    if (this.inCombat()) {
      this.combatLinger = 3;
      this.setMusic('combat');
    } else if (this.music === 'combat' || this.music === 'boss') {
      this.combatLinger -= dt;
      if (this.combatLinger <= 0) this.setMusic('explore');
    }
  }

  /** Evento ambiente: o dragão distante cruza o céu (raro). */
  private maybeDragon(force = false) {
    if (this.dragon || this.ctx.state !== 'playing') return;
    if (!force && Math.random() > DISTANT_DRAGON.chancePerHour) return;
    const pl = this.ctx.sys.player.entity.position;
    const a = Math.random() * Math.PI * 2;
    const heading = a + Math.PI / 2;
    const half = (DISTANT_DRAGON.speed * DISTANT_DRAGON.duration) / 2;
    const x = pl.x + Math.sin(a) * DISTANT_DRAGON.minDistance - Math.sin(heading) * half;
    const z = pl.z + Math.cos(a) * DISTANT_DRAGON.minDistance - Math.cos(heading) * half;
    const c = this.spawnCreature('dragao_distante', new THREE.Vector3(x, DISTANT_DRAGON.altitude, z), { heading });
    if (c) {
      this.dragon = c;
      this.ctx.sys.audio.play('boss_roar', { position: c.position, volume: 0.25, pitch: 0.5 });
    }
  }

  /** Força o evento do dragão (testes/depuração). */
  summonDragon() {
    this.maybeDragon(true);
    return this.dragon;
  }

  // =====================================================================
  // Ciclo de vida / save
  // =====================================================================
  onNewGame() {
    this.defeatedUniques.clear();
    this.defeatedBosses.clear();
    this.tokens.clear();
    this.style.reset();
    this.spawner?.reset();
    this.flocks?.clear();
    this.boss = null;
    this.storyBoss = null;
    this.dragon = null;
    this.enemies.length = 0;
    this.creatures.length = 0;
    this.music = null;
    this.victoryT = -1;
    this.hasPrev = false;
    this.playerVel.set(0, 0, 0);
  }

  serialize() {
    return { defeatedUniques: [...this.defeatedUniques], defeatedBosses: [...this.defeatedBosses], respawn: this.spawner?.serialize() ?? {} };
  }

  deserialize(data: any) {
    if (data !== undefined && (typeof data !== 'object' || data === null)) throw new Error('ai: dados inválidos');
    const du = data?.defeatedUniques;
    const db = data?.defeatedBosses;
    if (du !== undefined && !Array.isArray(du)) throw new Error('ai: defeatedUniques inválido');
    if (db !== undefined && !Array.isArray(db)) throw new Error('ai: defeatedBosses inválido');
    this.defeatedUniques = new Set(Array.isArray(du) ? du.filter((x: unknown) => typeof x === 'string') : []);
    this.defeatedBosses = new Set(Array.isArray(db) ? db.filter((x: unknown) => typeof x === 'string') : []);
    this.spawner?.deserialize(data?.respawn);
  }

  /** Diagnóstico (testes/depuração). */
  debugInfo() {
    return {
      enemies: this.enemies.map((e) => e.debug()),
      creatures: this.creatures.map((c) => ({ type: c.typeId, state: c.state, x: +c.position.x.toFixed(1), z: +c.position.z.toFixed(1) })),
      tokens: this.tokens.size,
      style: { block: +this.style.block.toFixed(2), ranged: +this.style.ranged.toFixed(2) },
      boss: this.boss ? this.boss.debug() : null,
      storyBoss: this.storyBoss ? this.storyBoss.debug() : null,
      music: this.music,
      zones: this.spawner.debugZones(),
      flocks: this.flocks.debug(),
      stats: { ...this.stats },
    };
  }
}
