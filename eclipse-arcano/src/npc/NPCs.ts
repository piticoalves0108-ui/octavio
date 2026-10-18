import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { Entity } from '../core/Entity';
import { NPCS, NPC_BY_ID, NPC_RULES } from '../data/npcs';
import { BARK_RULES, type BarkSituation } from '../data/barks';
import { VILLAGE } from '../data/places';
import { factionsHostile } from '../data/factions';
import { clampAttitude, type NarrativeEnv } from '../rpg/dialogue/script';
import { BarkPicker } from './barkPicker';
import { NpcEntity } from './NpcEntity';
import type { Enemy } from '../ai/Enemy';

export type NpcMemoryValue = string | number | boolean;


/**
 * Habitantes de Brumafria: rotinas por horário (âncoras + grafo de navegação da
 * vila), reações contextuais (magia em público, ataques e monstros, chuva, noite,
 * voo por cima, acontecimentos da história), falas curtas com anti-repetição,
 * memória por NPC (conversas, ajuda, atitude) e guardas que patrulham, advertem e
 * enfrentam ameaças. NPCs distantes rodam simulação barata (pulam para o ponto da
 * rotina); só os `q.maxActiveNpcs` mais próximos têm IA/animação completas.
 */
export class NPCs implements GameSystem, Saveable {
  readonly name = 'npcs';
  readonly saveKey = 'npcs';
  protected ctx!: GameContext;
  /** Memória por NPC (ex.: vezes que conversou, se o jogador ajudou, atitude). */
  protected memories = new Map<string, Record<string, NpcMemoryValue>>();
  private byId = new Map<string, NpcEntity>();
  private list: NpcEntity[] = [];
  private ranked: NpcEntity[] = [];
  private dist2 = new Map<NpcEntity, number>();
  readonly picker = new BarkPicker();
  private t = 0;
  private rankT = 0;
  private scanT = 0;
  private markT = 0;
  private ambientT = 2;
  private magicT = 0;
  private flyCd = 0;
  private greetGlobalCd = 0;
  private warnCd = 0;
  private hostileOutside = 0;
  private enemiesTmp: Enemy[] = [];
  /** Estatísticas (testes/desempenho). */
  readonly stats = { barks: 0, startles: 0, flees: 0, engages: 0, magicWarnings: 0, knocks: 0, updateMs: 0 };

  get context(): GameContext {
    return this.ctx;
  }

  init(ctx: GameContext) {
    this.ctx = ctx;
    for (const def of NPCS) {
      const n = new NpcEntity(def, this);
      this.byId.set(def.id, n);
      this.list.push(n);
      this.ranked.push(n);
      ctx.entities.add(n);
      ctx.sys.interaction.register(n.interactable);
      if (n.doorInteract) ctx.sys.interaction.register(n.doorInteract);
    }
    this.snapAll();
    const ev = ctx.events;
    ev.on('ability:cast', (p) => {
      if (p.caster?.kind === 'player') this.onMagic(p.position);
    });
    ev.on('npc:alarm', (p) => this.onAlarm(p.position, p.radius, p.reason));
    ev.on('weather:changed', () => {
      for (const n of this.list) if (n.mode === 'routine') n.evalSchedule(false);
    });
    ev.on('time:hour', (p) => {
      // de manhã, o susto da véspera passou
      if (p.hour === 6) for (const m of this.memories.values()) if (m.assustado) m.assustado = false;
    });
    ev.on('dialogue:start', (p) => this.byId.get(p.npcId)?.beginTalk());
    ev.on('dialogue:end', (p) => this.byId.get(p.npcId)?.endTalk());
    const refreshOverrides = () => {
      for (const n of this.list) if (n.def.overrides && n.mode === 'routine') n.evalSchedule(false);
    };
    ev.on('quest:updated', refreshOverrides);
    ev.on('quest:started', refreshOverrides);
    ev.on('quest:completed', refreshOverrides);
    ev.on('story:flag', refreshOverrides);
    ev.on('game:loaded', () => this.snapAll());
  }

  /** Condições narrativas (do sistema de missões, quando disponível). */
  env(): NarrativeEnv | null {
    return ((this.ctx?.sys.quests as unknown as { narrative?: { env: NarrativeEnv } })?.narrative?.env) ?? null;
  }

  // =====================================================================
  // API pública (contrato)
  // =====================================================================
  /** NPC nomeado pelo id de dados (ex.: 'maren'). */
  get(npcId: string): Entity | undefined {
    return this.byId.get(npcId);
  }
  all(): Entity[] {
    return this.list;
  }
  /** Memória mutável do NPC. */
  memory(npcId: string): Record<string, NpcMemoryValue> {
    let m = this.memories.get(npcId);
    if (!m) {
      m = {};
      this.memories.set(npcId, m);
    }
    return m;
  }
  /** Faz o NPC dizer uma fala curta contextual (balão/legenda). */
  bark(npcId: string, situation: string): void {
    const n = this.byId.get(npcId);
    if (n) this.barkAt(n, situation as BarkSituation, true);
  }

  // =====================================================================
  // Extras
  // =====================================================================
  npc(npcId: string): NpcEntity | undefined {
    return this.byId.get(npcId);
  }
  npcs(): readonly NpcEntity[] {
    return this.list;
  }

  /** Muda a atitude (−5..5) do NPC para com Kaelen. */
  addAttitude(npcId: string, delta: number) {
    const m = this.memory(npcId);
    m.attitude = clampAttitude((typeof m.attitude === 'number' ? m.attitude : 0) + delta);
  }

  /** Reposiciona todos no ponto atual da rotina (novo jogo, carregar, descansar). */
  snapAll() {
    for (const n of this.list) {
      n.setMode('routine');
      n.awakened = false;
      n.evalSchedule(true, true);
    }
  }

  /** Fala de um NPC (respeita recarga; `force` ignora a recarga do NPC). */
  barkAt(n: NpcEntity, situation: BarkSituation, force = false): boolean {
    if (!this.ctx || n.hidden) return false;
    if (!force && n.barkCd > 0) return false;
    const pl = this.ctx.sys.player.entity.position;
    const d2 = pl.distanceToSquared(n.position);
    if (d2 > BARK_RULES.hearRange * BARK_RULES.hearRange) return false;
    const b = this.picker.pick({ id: n.def.id, role: n.def.role, faction: n.def.faction }, situation, this.env());
    if (!b) return false;
    n.barkCd = BARK_RULES.npcCooldown;
    const dur = this.picker.duration(b.text);
    n.say(b.text, dur);
    this.stats.barks++;
    this.ctx.events.emit('npc:bark', { npcId: n.def.id, name: n.def.name, text: b.text, position: n.position, situation });
    if (situation === 'magic_guard' || situation === 'hostile' || (situation === 'magic' && n.def.id === 'calen')) this.ctx.sys.ui.showSubtitle(`${n.def.name}: ${b.text}`, dur);
    return true;
  }

  /** "Bater à porta" de um NPC da história que está dormindo. */
  knock(n: NpcEntity) {
    if (!this.ctx || !n.hidden) return;
    this.stats.knocks++;
    n.awakened = true;
    this.memory(n.def.id).acordada = true;
    n.beginTalk();
    this.ctx.sys.dialogue.talkTo(n.def.id);
    if (!this.ctx.sys.dialogue.active) {
      n.endTalk();
      this.memory(n.def.id).acordada = false;
    }
  }

  insideVillage(p: THREE.Vector3, margin = 6): boolean {
    const dx = p.x - VILLAGE.x;
    const dz = p.z - VILLAGE.z;
    return dx * dx + dz * dz < (VILLAGE.wallRadius + margin) ** 2;
  }

  // =====================================================================
  // Reações
  // =====================================================================
  /** Magia lançada pelo jogador em `pos`. */
  onMagic(pos: THREE.Vector3) {
    if (!this.ctx || this.magicT > 0) return;
    this.magicT = 1.2;
    const R = NPC_RULES.magicRange;
    const inVillage = this.insideVillage(pos);
    let barks = 0;
    let nearestGuard: NpcEntity | null = null;
    let ngd = Infinity;
    for (const n of this.list) {
      if (!n.reactive) continue;
      const d2 = n.position.distanceToSquared(pos);
      if (n.def.faction === 'guard') {
        if (d2 < ngd && d2 < (R * 1.6) ** 2) {
          ngd = d2;
          nearestGuard = n;
        }
        continue;
      }
      if (d2 > R * R) continue;
      n.startle(pos);
      this.stats.startles++;
      const mem = this.memory(n.def.id);
      if (!mem.assustado) {
        mem.assustado = true;
        this.addAttitude(n.def.id, NPC_RULES.attitudeMagic);
      }
      // Irmão Calen sempre repreende; os outros comentam (no máximo 2 falas)
      if (n.def.id === 'calen') {
        if (this.barkAt(n, 'magic', true)) this.memory('calen').repreensoes = ((this.memory('calen').repreensoes as number) || 0) + 1;
      } else if (barks < 2 && this.barkAt(n, 'magic')) barks++;
    }
    if (inVillage && nearestGuard && this.warnCd <= 0) {
      this.warnCd = 15;
      nearestGuard.startle(pos);
      this.barkAt(nearestGuard, 'magic_guard', true);
      this.stats.magicWarnings++;
      const bran = this.memory('bran');
      const n = ((bran.avisos_magia as number) || 0) + 1;
      bran.avisos_magia = n;
      if (n >= NPC_RULES.magicWarnings && !bran.multa_pendente) {
        bran.multa_pendente = true;
        this.ctx.sys.ui.notify('O Capitão Bran quer falar com você sobre as luzes dentro dos muros.', 'warning');
      }
    }
  }

  /** Alarme (IA/combate/monstro). */
  onAlarm(pos: THREE.Vector3, radius: number, reason: 'magic' | 'combat' | 'monster') {
    if (!this.ctx) return;
    if (reason === 'magic') {
      this.onMagic(pos);
      return;
    }
    const threat = this.nearestThreat(pos, radius + 12);
    const r2 = (radius * 1.3) ** 2;
    for (const n of this.list) {
      if (!n.reactive) continue;
      const d2 = n.position.distanceToSquared(pos);
      if (n.def.faction === 'guard') {
        if (threat && d2 < (Math.max(radius, NPC_RULES.guardAttack.engageRadius) + 10) ** 2) {
          n.engage(threat);
          this.stats.engages++;
        }
      } else if (d2 < r2) {
        if (n.mode !== 'flee' && n.mode !== 'hide' && n.mode !== 'cower') this.stats.flees++;
        n.flee(threat ? threat.position : pos, threat);
      }
    }
  }

  private nearestThreat(pos: THREE.Vector3, radius: number): Entity | null {
    const list = this.ctx.sys.ai?.enemiesNear?.(pos, radius, this.enemiesTmp);
    if (!list || !list.length) return null;
    let best: Entity | null = null;
    let bd = Infinity;
    for (const e of list) {
      if (!factionsHostile(e.faction, 'villager') && !factionsHostile(e.faction, 'guard')) continue;
      const d = e.position.distanceToSquared(pos);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** Um NPC tomou dano. */
  onNpcDamaged(n: NpcEntity, src: Entity | null, ctx: GameContext) {
    if (!src) return;
    if (src.kind === 'player') {
      this.addAttitude(n.def.id, NPC_RULES.attitudeAttack);
      if (!ctx.sys.story.is('guardas_hostis')) {
        ctx.sys.story.set('guardas_hostis', true);
        ctx.sys.ui.notify('Você atacou um morador! A guarda de Brumafria está hostil.', 'warning');
      }
      this.hostileOutside = 0;
      for (const o of this.list) {
        if (!o.reactive) continue;
        const d2 = o.position.distanceToSquared(n.position);
        if (o.def.faction === 'guard' && d2 < 60 * 60) o.engage(src);
        else if (o !== n && d2 < 25 * 25) o.flee(src.position, src);
      }
      if (n.def.faction !== 'guard' && n.mode !== 'knocked') n.flee(src.position, src);
      return;
    }
    if (n.mode === 'knocked') return;
    if (n.def.faction === 'guard') n.engage(src);
    else n.flee(src.position, src);
  }

  // =====================================================================
  // Atualização
  // =====================================================================
  update(dt: number, ctx: GameContext) {
    const t0 = performance.now();
    this.t += dt;
    this.magicT -= dt;
    this.flyCd -= dt;
    this.greetGlobalCd -= dt;
    this.warnCd -= dt;
    this.ambientT -= dt;
    const pl = ctx.sys.player.entity.position;

    // ranking por distância → limite de NPCs com IA/animação completas
    this.rankT -= dt;
    if (this.rankT <= 0) {
      this.rankT = 0.5;
      for (const n of this.list) this.dist2.set(n, n.position.distanceToSquared(pl));
      this.ranked.sort((a, b) => this.dist2.get(a)! - this.dist2.get(b)!);
      const maxFull = ctx.settings.q.maxActiveNpcs ?? 12;
      let k = 0;
      for (const n of this.ranked) {
        n.full = !n.hidden && k < maxFull;
        if (!n.hidden) k++;
      }
    }

    // placas de nome e marcadores de missão
    this.markT -= dt;
    const refreshMarks = this.markT <= 0;
    if (refreshMarks) this.markT = 1;
    const plateR2 = NPC_RULES.nameplateRange ** 2;
    const hostile = ctx.sys.story.is('guardas_hostis');
    for (const n of this.list) {
      if (refreshMarks) n.questMark = (ctx.sys.quests as unknown as { npcMark?: (id: string) => '' | '!' | '?' }).npcMark?.(n.def.id) ?? '';
      const d2 = n.position.distanceToSquared(pl);
      n.updatePlate(d2 < plateR2 || (n.questMark !== '' && d2 < 40 * 40), hostile && n.def.faction === 'guard');
    }

    // varreduras periódicas
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.5;
      this.scanThreats(ctx);
      this.scanPlayer(ctx, pl);
      if (hostile) this.guardHostility(ctx, pl, 0.5);
    }
    this.stats.updateMs = performance.now() - t0;
  }

  /** Monstros/inimigos perto de moradores: fuga e guardas em ação. */
  private scanThreats(ctx: GameContext) {
    const ai = ctx.sys.ai;
    const enemies = (ai as unknown as { enemies?: Entity[] }).enemies;
    if (!enemies || !enemies.length) return;
    const engageR = NPC_RULES.guardAttack.engageRadius;
    for (const e of enemies) {
      if (!e.alive || e.removed) continue;
      if (!factionsHostile(e.faction, 'villager')) continue;
      for (const n of this.list) {
        if (!n.reactive) continue;
        const d2 = n.position.distanceToSquared(e.position);
        if (n.def.faction === 'guard') {
          if (d2 < engageR * engageR && n.mode !== 'engage') {
            n.engage(e);
            this.stats.engages++;
          }
        } else if (d2 < 20 * 20 && n.mode !== 'flee' && n.mode !== 'hide' && n.mode !== 'cower') {
          this.stats.flees++;
          n.flee(e.position, e);
        }
      }
    }
  }

  /** Cumprimentos, voo por cima e comentários ambientes. */
  private scanPlayer(ctx: GameContext, pl: THREE.Vector3) {
    if (ctx.state !== 'playing') return;
    const player = ctx.sys.player;
    // voo por cima
    if (this.flyCd <= 0 && player.isFlying()) {
      let best: NpcEntity | null = null;
      let bd = Infinity;
      const R = NPC_RULES.flyOverRange;
      for (const n of this.list) {
        if (!n.reactive || n.mode !== 'routine') continue;
        const dx = n.position.x - pl.x;
        const dz = n.position.z - pl.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > R * R || pl.y - n.position.y < NPC_RULES.flyOverMinHeight) continue;
        if (d2 < bd) {
          bd = d2;
          best = n;
        }
      }
      if (best) {
        this.flyCd = 22;
        best.lookUp(pl);
        this.barkAt(best, 'flyover', true);
        // outros por perto também olham
        for (const n of this.list) if (n !== best && n.reactive && n.position.distanceToSquared(best.position) < 12 * 12) n.lookUp(pl);
      }
    }
    // cumprimento
    if (this.greetGlobalCd <= 0) {
      const R = NPC_RULES.greetRange;
      for (const n of this.list) {
        if (!n.full || !n.reactive || n.mode !== 'routine' || n.greetCd > 0) continue;
        if (n.position.distanceToSquared(pl) > R * R) continue;
        n.greetCd = 120;
        if (this.barkAt(n, 'greet')) {
          this.greetGlobalCd = 4;
          break;
        }
      }
    }
    // comentário ambiente / trabalho / história
    if (this.ambientT <= 0) {
      this.ambientT = BARK_RULES.globalAmbientCooldown * (1 + Math.random());
      if (Math.random() < BARK_RULES.ambientChance * 2.5) {
        const H = BARK_RULES.hearRange;
        const cand: NpcEntity[] = [];
        for (const n of this.list) if (n.full && n.reactive && n.mode === 'routine' && n.barkCd <= 0 && n.position.distanceToSquared(pl) < H * H) cand.push(n);
        if (cand.length) {
          const n = cand[Math.floor(Math.random() * cand.length)];
          const busy = n.activity === 'hammer' || n.activity === 'sweep' || n.activity === 'harvest' || n.activity === 'work';
          const r = Math.random();
          const sit: BarkSituation = busy && r < 0.5 ? 'work' : r < 0.55 ? 'story' : 'ambient';
          if (!this.barkAt(n, sit)) this.barkAt(n, 'ambient');
        }
      }
    }
  }

  /** Guardas hostis caçam o jogador; esquecem depois de horas longe da vila. */
  private guardHostility(ctx: GameContext, pl: THREE.Vector3, dt: number) {
    if (this.insideVillage(pl, 30)) this.hostileOutside = 0;
    else this.hostileOutside += dt * ctx.clock.hoursPerSecond;
    if (this.hostileOutside >= NPC_RULES.hostileForgetHours) {
      ctx.sys.story.set('guardas_hostis', false);
      this.hostileOutside = 0;
      ctx.sys.ui.notify('A guarda de Brumafria baixou as armas. Por enquanto.', 'info');
      for (const n of this.list) if (n.mode === 'engage') n.resume(false);
      return;
    }
    const player = ctx.sys.player.entity;
    for (const n of this.list) {
      if (n.def.faction !== 'guard' || !n.reactive || n.mode === 'engage') continue;
      if (n.position.distanceToSquared(pl) < 30 * 30) n.engage(player);
    }
  }

  // =====================================================================
  // Ciclo de vida / save
  // =====================================================================
  onNewGame() {
    this.memories.clear();
    this.picker.reset();
    this.hostileOutside = 0;
    for (const n of this.list) {
      n.barkCd = 0;
      n.greetCd = 0;
      if (n.health) n.health.current = n.health.max;
      n.bubble?.hide();
    }
    if (this.ctx) this.snapAll();
  }

  serialize() {
    return { v: 1, memories: Object.fromEntries(this.memories) };
  }

  deserialize(data: any) {
    if (data !== undefined && data !== null && typeof data !== 'object') throw new Error('dados de NPCs inválidos');
    this.memories.clear();
    if (data?.memories && typeof data.memories === 'object') {
      for (const [k, v] of Object.entries(data.memories)) {
        if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
        const clean: Record<string, NpcMemoryValue> = {};
        for (const [mk, mv] of Object.entries(v as Record<string, unknown>)) {
          if (typeof mv === 'string' || typeof mv === 'boolean' || (typeof mv === 'number' && Number.isFinite(mv))) clean[mk] = mv;
        }
        if (typeof clean.attitude === 'number') clean.attitude = clampAttitude(clean.attitude);
        this.memories.set(k, clean);
      }
    }
    if (this.ctx) this.snapAll();
  }

  /** Diagnóstico (testes/monitor). */
  debugInfo() {
    let hidden = 0;
    let moving = 0;
    let full = 0;
    const modes: Record<string, number> = {};
    for (const n of this.list) {
      if (n.hidden) hidden++;
      if (n.moving) moving++;
      if (n.full) full++;
      modes[n.mode] = (modes[n.mode] ?? 0) + 1;
    }
    return { total: this.list.length, hidden, moving, full, modes, ...this.stats };
  }

  /** Posição de referência de um NPC para marcadores (porta de casa se estiver dentro). */
  markerPosition(npcId: string, out: THREE.Vector3): THREE.Vector3 | null {
    const n = this.byId.get(npcId);
    if (!n) return null;
    if (n.hidden && this.ctx.sys.world.placePosition(n.def.home, out)) return out;
    return out.copy(n.position);
  }

  dispose() {
    for (const n of this.list) this.ctx?.sys.interaction.unregister(n.interactable.id);
  }
}

/** Nome de exibição de um NPC (ou o id, se desconhecido). */
export function npcDisplayName(id: string): string {
  return NPC_BY_ID[id]?.name ?? id;
}

