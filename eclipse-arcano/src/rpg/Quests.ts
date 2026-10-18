import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { Entity } from '../core/Entity';
import { QUESTS, QUEST_OFFERS, QUEST_RULES, BOSS_CARDS, QUEST_POINT_BY_ID } from '../data/quests';
import { PLACES } from '../data/places';
import { LOCATION_BY_ID } from '../data/world';
import { NPC_BY_ID } from '../data/npcs';
import { ITEMS } from '../data/items';
import { WEAPONS } from '../data/weapons';
import { evalAll, type QuestStatusName } from './dialogue/script';
import { QuestEngine, objectiveTarget, type MarkerRef, type ObjectiveDef, type QuestDef, type QuestHost, type QuestRewards, type StageDef } from './quests/engine';
import { NarrativeBridge, type BridgeOwner } from './quests/bridge';
import { CinematicPlayer } from './quests/cinematics';
import { QuestPoints } from './quests/points';
import { HUNTER_IDS, ensureDeer, runQuestScript, uniqueEnemy, type ScriptHost } from './quests/scripts';
import { surrender } from '../ai/enemySpecials';

export type QuestStatus = 'inactive' | 'active' | 'completed' | 'failed';

export interface JournalObjective {
  text: string;
  done: boolean;
  progress?: number;
  target?: number;
  optional?: boolean;
}

export interface JournalEntry {
  id: string;
  title: string;
  /** 'main' | 'side' | 'contract' | 'personal' | 'mystery' */
  category: string;
  status: QuestStatus;
  description: string;
  /** Dica do próximo passo. */
  nextStep: string;
  objectives: JournalObjective[];
  /** Log de acontecimentos (entradas do diário). */
  log: string[];
  rewardsText?: string;
}

export interface QuestMarker {
  questId: string;
  label: string;
  position: THREE.Vector3;
  /** Raio da área (quando o objetivo é uma região e não um ponto). */
  radius?: number;
  main: boolean;
}

const V = new THREE.Vector3();

/**
 * Missões orientadas a dados (src/data/quests.ts): estágios, objetivos (falar,
 * alcançar, matar, chefe, coletar, interagir, flag, horário), ramificações,
 * recompensas, falha, diário com log, marcadores com posições reais, missão
 * rastreada, pontos de interação de missão, inimigos de missão e cinemáticas leves.
 * Motor puro em quests/engine.ts; efeitos/condições em quests/bridge.ts.
 */
export class Quests implements GameSystem, Saveable, BridgeOwner, ScriptHost {
  readonly name = 'quests';
  readonly saveKey = 'quests';
  protected _ctx!: GameContext;
  engine!: QuestEngine;
  /** Condições/efeitos narrativos compartilhados (diálogos e NPCs usam). */
  narrative!: NarrativeBridge;
  cine!: CinematicPlayer;
  points!: QuestPoints;
  /** Pontos de interação `once` já usados. */
  readonly usedPoints = new Set<string>();
  deer: Entity | null = null;
  huntersShooting = false;
  private tickT = 0;
  private shotT = 0;
  private markerT = 0;
  private markers: QuestMarker[] = [];
  private markerPool: THREE.Vector3[] = [];
  private ravenaAutoTalk = false;
  private pendingSeen: string[] | null = null;
  /** Estatísticas (testes). */
  readonly stats = { ticks: 0, spawns: 0, scripts: 0 };

  get ctx(): GameContext {
    return this._ctx;
  }
  get bridge(): NarrativeBridge {
    return this.narrative;
  }

  /** Missão rastreada no HUD. */
  get tracked(): string | null {
    return this.engine ? this.engine.tracked : null;
  }
  set tracked(id: string | null) {
    if (this.engine) this.engine.tracked = id;
  }

  init(ctx: GameContext) {
    this._ctx = ctx;
    this.narrative = new NarrativeBridge(ctx, this);
    const self = this;
    const host: QuestHost = {
      env: this.narrative.env,
      apply: (e, npc) => this.narrative.apply(e, npc),
      day: () => ctx.clock.day,
      notify: (text, kind) => ctx.sys.ui.notify(text, kind),
      emit: (kind, questId) => {
        ctx.events.emit(`quest:${kind}` as 'quest:started', { questId });
      },
      isAt: (o) => self.isAt(o),
      countDefeated: (prefix) => {
        let n = 0;
        const set = ctx.sys.ai?.defeatedUniques;
        if (set) for (const u of set) if (u.startsWith(prefix)) n++;
        return n;
      },
      grantRewards: (r, q) => self.grantRewards(r, q),
      onStageEnter: () => self.ensureSpawns(),
      itemName: (id) => ITEMS[id]?.name ?? (WEAPONS as Record<string, { name?: string }>)[id]?.name ?? id,
    };
    this.engine = new QuestEngine(QUESTS, host);
    this.cine = new CinematicPlayer(ctx, this.narrative);
    this.points = new QuestPoints(ctx, { bridge: this.narrative, onPointUsed: (id, via) => this.onPointUsed(id, via), startDialogue: (d, o) => this.startDialogue(d, o) }, this.usedPoints);

    const ev = ctx.events;
    ev.on('game:newGame', () => {
      this.start('q_prologo');
    });
    ev.on('enemy:killed', (p) => {
      const uid = (p.entity as Entity & { uniqueId?: string }).uniqueId;
      if (p.typeId === 'ravena' || uid === 'ravena') ctx.sys.story.set('ravena_morta', true);
      this.engine.onKill(p.typeId, uid);
    });
    ev.on('creature:killed', (p) => {
      if (p.typeId === 'cervo_luminoso' && this.engine.status('q_cervo') === 'active') ctx.sys.story.set('cervo_morto', true);
      if (p.entity === this.deer) this.deer = null;
    });
    ev.on('boss:start', (p) => {
      const card = BOSS_CARDS[p.bossId];
      if (card) this.cine.title(card.title, card.subtitle, QUEST_RULES.bossCardSeconds);
    });
    ev.on('boss:defeated', (p) => this.engine.onBoss(p.bossId));
    ev.on('dialogue:end', (p) => {
      this.engine.onTalk(p.npcId, p.dialogueId);
      if (QUEST_POINT_BY_ID[p.npcId]) this.engine.onInteract(p.npcId);
    });
    ev.on('quest:started', () => this.refreshMarkersSoon());
    ev.on('quest:updated', () => this.refreshMarkersSoon());
    ev.on('quest:completed', () => this.refreshMarkersSoon());
  }

  // =====================================================================
  // API pública (contrato)
  // =====================================================================
  start(id: string): boolean {
    return this.engine.start(id);
  }
  complete(id: string) {
    this.engine.complete(id);
  }
  fail(id: string) {
    this.engine.fail(id);
  }
  status(id: string): QuestStatus {
    return this.engine.status(id);
  }
  /** Estágio atual (id) de uma missão ativa. */
  stage(id: string): string | null {
    return this.engine.stage(id);
  }
  setTracked(id: string | null) {
    if (id !== null && this.engine.status(id) !== 'active') return;
    this.engine.tracked = id;
    this.ctx.events.emit('quest:tracked', { questId: id });
    this.refreshMarkersSoon();
  }
  getJournal(): JournalEntry[] {
    return this.engine.journal();
  }
  getMarkers(): QuestMarker[] {
    if (this.markerT <= 0) this.rebuildMarkers();
    return this.markers;
  }

  // =====================================================================
  // Extras
  // =====================================================================
  questStatus(id: string): QuestStatusName {
    return this.engine.status(id);
  }
  questStage(id: string): string | null {
    return this.engine.stage(id);
  }
  setStage(id: string, stage: string): boolean {
    return this.engine.setStage(id, stage);
  }
  signal(id: string) {
    this.engine.onSignal(id);
  }
  log(id: string, text: string) {
    this.engine.log(id, text);
  }
  runScript(id: string) {
    this.stats.scripts++;
    runQuestScript(id, this);
  }
  /** Toca uma cinemática por id (data/quests.ts CINEMATICS). */
  playCinematic(id: string): boolean {
    return this.cine.play(id);
  }
  get cinematicPlaying(): boolean {
    return this.cine.playing;
  }
  /** Definição de uma missão. */
  def(id: string): QuestDef | undefined {
    return QUESTS[id];
  }
  /** Ids das missões ativas. */
  activeIds(): string[] {
    return this.engine.active().map((q) => q.id);
  }

  /** Marcador sobre a cabeça do NPC: '?' (falar para avançar) / '!' (tem missão a oferecer). */
  npcMark(npcId: string): '' | '!' | '?' {
    for (const q of this.engine.active()) {
      for (const o of this.engine.currentObjectives(q.id)) {
        if (o.kind === 'talk' && o.npc === npcId && !this.engine.isObjectiveDone(q.id, o)) return '?';
      }
    }
    for (const [qid, off] of Object.entries(QUEST_OFFERS)) {
      if (off.npc !== npcId || this.engine.status(qid) !== 'inactive') continue;
      if (evalAll(off.when, this.narrative.env, npcId)) return '!';
    }
    return '';
  }

  /** Missões que podem ser oferecidas agora (marcadores "!" no mapa/HUD). */
  getOfferMarkers(): QuestMarker[] {
    const out: QuestMarker[] = [];
    for (const [qid, off] of Object.entries(QUEST_OFFERS)) {
      if (this.engine.status(qid) !== 'inactive' || !evalAll(off.when, this.narrative.env, off.npc)) continue;
      const pos = new THREE.Vector3();
      let ok = false;
      if (off.npc) ok = !!(this.ctx.sys.npcs as unknown as { markerPosition?: (id: string, out: THREE.Vector3) => THREE.Vector3 | null }).markerPosition?.(off.npc, pos);
      else if (off.point) ok = !!this.points.byId.get(off.point)?.resolve(pos);
      if (ok) out.push({ questId: qid, label: `! ${QUESTS[qid].title}`, position: pos, main: false });
    }
    return out;
  }

  // =====================================================================
  // Host do motor
  // =====================================================================
  private isAt(o: ObjectiveDef): boolean {
    const p = this.ctx.sys.player.entity.position;
    let x: number;
    let z: number;
    let r = o.radius ?? QUEST_RULES.reachRadius;
    if (o.place) {
      const pl = PLACES[o.place];
      if (!pl) return false;
      x = pl.x;
      z = pl.z;
    } else if (o.location) {
      const l = LOCATION_BY_ID[o.location];
      if (!l) return false;
      x = l.x;
      z = l.z;
      r = o.radius ?? l.radius;
    } else if (o.pos) {
      x = o.pos[0];
      z = o.pos[1];
    } else return false;
    return (p.x - x) ** 2 + (p.z - z) ** 2 <= r * r;
  }

  private grantRewards(r: QuestRewards, q: QuestDef) {
    const sys = this.ctx.sys;
    if (r.xp) sys.progression.addXp(r.xp, `missão: ${q.title}`);
    if (r.gold) sys.inventory.addGold(r.gold);
    for (const [id, qty] of r.items ?? []) sys.inventory.add(id, qty, { dropAt: sys.player.entity.position.clone() });
    if (r.skillPoints) sys.progression.addSkillPoints(r.skillPoints, q.title);
    if (r.effects) this.narrative.applyAll(r.effects);
  }

  /** Cria os inimigos/criaturas de missão do estágio atual (se ainda não existirem). */
  ensureSpawns() {
    const ctx = this.ctx;
    const ai = ctx.sys.ai;
    if (!ai) return;
    const pl = ctx.sys.player.entity.position;
    for (const q of this.engine.active()) {
      const sd = this.engine.stageDef(q.id);
      if (!sd?.spawns) continue;
      for (const sp of sd.spawns) {
        if (ai.defeatedUniques.has(sp.uniqueId) || ai.findUnique(sp.uniqueId)) continue;
        if (!evalAll(sp.when, this.narrative.env)) continue;
        const a = PLACES[sp.at];
        if (!a) continue;
        if (sp.near !== undefined && (pl.x - a.x) ** 2 + (pl.z - a.z) ** 2 > sp.near * sp.near) continue;
        if (!ctx.sys.world.placePosition(sp.at, V)) continue;
        if (sp.offset) {
          V.x += sp.offset[0];
          V.z += sp.offset[1];
          V.y = ctx.physics.groundHeight(V.x, V.z, ctx.heightfield.heightAt(V.x, V.z) + 1.6);
        }
        const e = sp.creature ? ai.spawnCreature(sp.typeId, V.clone()) : ai.spawnEnemy(sp.typeId, V.clone(), { uniqueId: sp.uniqueId, aggro: sp.aggro });
        if (e) this.stats.spawns++;
      }
    }
  }

  // =====================================================================
  // Pontos de interação / diálogos
  // =====================================================================
  private startDialogue(dialogueId: string, ownerId: string): boolean {
    const d = this.ctx.sys.dialogue;
    d.start(dialogueId, ownerId);
    return d.active;
  }

  private onPointUsed(id: string, viaDialogue: boolean) {
    // com diálogo, o objetivo conta quando a leitura termina ('dialogue:end')
    if (!viaDialogue) this.engine.onInteract(id);
    this.refreshMarkersSoon();
  }

  // =====================================================================
  // Atualização
  // =====================================================================
  update(dt: number, ctx: GameContext) {
    this.cine.update(dt);
    this.points.update(dt);
    this.markerT -= dt;
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = QUEST_RULES.tickInterval;
      this.stats.ticks++;
      this.engine.tick();
      this.ensureSpawns();
      this.questLogic(ctx);
    }
    if (this.huntersShooting) this.hunterShots(dt, ctx);
  }

  /** Regras específicas que dependem do mundo (Ravena, caçadores, retomada após carregar). */
  private questLogic(ctx: GameContext) {
    // Ravena rendida: conversa automática ao chegar perto; recria se sumiu (save no meio da rendição)
    if (this.engine.stage('q_corvos') === 'escolha') {
      let r = uniqueEnemy(ctx, 'ravena');
      if (!r && !ctx.sys.ai.defeatedUniques.has('ravena') && ctx.sys.world.placePosition('corvos_lider', V)) {
        const pl = ctx.sys.player.entity.position;
        if (pl.distanceToSquared(V) < 90 * 90) {
          const e = ctx.sys.ai.spawnEnemy('ravena', V.clone(), { uniqueId: 'ravena' });
          if (e) {
            surrender(e, ctx);
            r = e as never;
          }
        }
      }
      if (r && !this.ravenaAutoTalk && ctx.state === 'playing' && !ctx.sys.dialogue.active) {
        const d2 = r.position.distanceToSquared(ctx.sys.player.entity.position);
        if (d2 < QUEST_RULES.ravenaTalkRange ** 2) {
          this.ravenaAutoTalk = true;
          ctx.sys.dialogue.start('ravena_rendicao', 'ravena_rendida');
        }
      }
    }
    // caçadores: neutros até a decisão; hostis e atirando no ramo "proteger"
    const st = this.engine.stage('q_cervo');
    if (st === 'cacadores' && !ctx.sys.story.get('cervo_decisao')) {
      for (const uid of HUNTER_IDS) {
        const e = uniqueEnemy(ctx, uid);
        if (e && e.faction !== 'neutral') e.faction = 'neutral';
      }
      ensureDeer(this);
    } else if (st === 'proteger' && !ctx.sys.story.is('cacadores_fugiram')) {
      ensureDeer(this);
      if (!this.huntersShooting) {
        this.huntersShooting = true;
        for (const uid of HUNTER_IDS) {
          const e = uniqueEnemy(ctx, uid);
          if (e && e.faction === 'neutral') {
            e.faction = 'bandit';
            e.engage?.(ctx.sys.player.entity, true, 0.3);
          }
        }
      }
    } else if (this.huntersShooting) this.huntersShooting = false;
  }

  /** Caçadores atiram no Cervo de Luz enquanto vivos (o jogador precisa ser rápido). */
  private hunterShots(dt: number, ctx: GameContext) {
    this.shotT -= dt;
    if (this.shotT > 0) return;
    const R = QUEST_RULES.hunterShot;
    this.shotT = R.interval / 3;
    const deer = this.deer;
    if (!deer || !deer.alive || deer.removed) return;
    // um caçador por vez (intervalo total ≈ R.interval por caçador)
    const k = Math.floor(Math.random() * HUNTER_IDS.length);
    const e = uniqueEnemy(ctx, HUNTER_IDS[k]);
    if (!e || !e.alive || e.faction !== 'bandit') return;
    if (e.position.distanceToSquared(deer.position) > R.range * R.range) return;
    const from = e.getCenter(new THREE.Vector3());
    const to = deer.getCenter(new THREE.Vector3());
    ctx.sys.vfx.beam(from, to, 0xd8c8a0, 0.04, 0.18);
    ctx.sys.combat.applyDamage(deer, { amount: R.damage, type: 'physical', source: e, tag: 'cacada' });
  }

  // =====================================================================
  // Marcadores
  // =====================================================================
  private refreshMarkersSoon() {
    this.markerT = 0;
  }

  private vec(i: number): THREE.Vector3 {
    let v = this.markerPool[i];
    if (!v) {
      v = new THREE.Vector3();
      this.markerPool[i] = v;
    }
    return v;
  }

  private rebuildMarkers() {
    this.markerT = 0.25;
    const out = this.markers;
    out.length = 0;
    let n = 0;
    const tracked = this.engine.tracked;
    const quests = this.engine.active();
    quests.sort((a, b) => (a.id === tracked ? -1 : b.id === tracked ? 1 : 0));
    for (const q of quests) {
      const main = q.category === 'main';
      for (const o of this.engine.currentObjectives(q.id)) {
        if (this.engine.isObjectiveDone(q.id, o) || o.marker === false) continue;
        const refs = this.markerRefs(o);
        for (const ref of refs) {
          const v = this.vec(n);
          if (!this.resolveRef(ref, v)) continue;
          n++;
          out.push({ questId: q.id, label: ref.label ?? o.text, position: v, radius: ref.radius, main });
        }
      }
    }
  }

  private markerRefs(o: ObjectiveDef): MarkerRef[] {
    if (o.marker) return [o.marker];
    const refs: MarkerRef[] = [];
    if (o.points?.length) {
      for (const id of o.points) if (!this.usedPoints.has(id) && this.points.byId.get(id)?.active !== false) refs.push({ label: o.text, ...this.pointRef(id) });
      return refs;
    }
    switch (o.kind) {
      case 'talk':
        if (o.npc) refs.push({ npc: o.npc });
        break;
      case 'reach':
        refs.push({ place: o.place, location: o.location, pos: o.pos, radius: o.radius });
        break;
      case 'interact':
        if (o.target) refs.push(this.pointRef(o.target));
        break;
      case 'kill':
        if (o.uniqueId) refs.push({ unique: o.uniqueId });
        break;
      case 'boss':
        refs.push({ place: 'arena_centro', radius: 30 });
        break;
      default:
        break;
    }
    return refs;
  }

  private pointRef(id: string): MarkerRef {
    const d = QUEST_POINT_BY_ID[id];
    return { place: d?.place, unique: d?.unique, label: d?.prompt };
  }

  private resolveRef(ref: MarkerRef, out: THREE.Vector3): boolean {
    const sys = this.ctx.sys;
    if (ref.unique) {
      const e = sys.ai?.findUnique?.(ref.unique);
      if (e) {
        out.copy(e.position);
        return true;
      }
    }
    if (ref.npc) {
      const m = (sys.npcs as unknown as { markerPosition?: (id: string, o: THREE.Vector3) => THREE.Vector3 | null }).markerPosition?.(ref.npc, out);
      if (m) return true;
      const e = sys.npcs.get(ref.npc);
      if (e) {
        out.copy(e.position);
        return true;
      }
      const def = NPC_BY_ID[ref.npc];
      if (def && sys.world.placePosition(def.home, out)) return true;
      return false;
    }
    if (ref.place && sys.world.placePosition(ref.place, out)) return true;
    if (ref.location) {
      const l = LOCATION_BY_ID[ref.location];
      if (l) {
        out.set(l.x, this.ctx.heightfield.heightAt(l.x, l.z), l.z);
        return true;
      }
    }
    if (ref.pos) {
      out.set(ref.pos[0], this.ctx.heightfield.heightAt(ref.pos[0], ref.pos[1]), ref.pos[1]);
      return true;
    }
    return false;
  }

  // =====================================================================
  // Ciclo de vida / save
  // =====================================================================
  onNewGame() {
    this.engine.reset();
    this.usedPoints.clear();
    this.cine.reset();
    this.deer = null;
    this.huntersShooting = false;
    this.ravenaAutoTalk = false;
    this.markers.length = 0;
    this.markerT = 0;
    const d = this.ctx.sys.dialogue as unknown as { runner?: { seen: Set<string> } };
    d.runner?.seen.clear();
  }

  serialize() {
    const d = this.ctx?.sys.dialogue as unknown as { runner?: { seen: Set<string> } } | undefined;
    return {
      v: 1,
      engine: this.engine.serialize(),
      used: Array.from(this.usedPoints),
      seen: d?.runner ? Array.from(d.runner.seen) : [],
      cine: Array.from(this.cine.seen),
    };
  }

  deserialize(data: any) {
    if (!data || typeof data !== 'object') throw new Error('dados de missões inválidos');
    // compatível com saves sem o invólucro (só o motor)
    const eng = data.engine ?? (Array.isArray(data.states) ? data : { states: [] });
    this.engine.deserialize(eng);
    this.usedPoints.clear();
    if (Array.isArray(data.used)) for (const id of data.used) if (typeof id === 'string' && QUEST_POINT_BY_ID[id]) this.usedPoints.add(id);
    const seen = Array.isArray(data.seen) ? data.seen.filter((x: unknown) => typeof x === 'string') : [];
    const d = this.ctx?.sys.dialogue as unknown as { runner?: { seen: Set<string> } } | undefined;
    if (d?.runner) {
      d.runner.seen.clear();
      for (const k of seen) d.runner.seen.add(k);
    } else this.pendingSeen = seen;
    this.cine.reset();
    this.cine.seen.clear();
    if (Array.isArray(data.cine)) for (const c of data.cine) if (typeof c === 'string') this.cine.seen.add(c);
    this.deer = null;
    this.huntersShooting = false;
    this.ravenaAutoTalk = false;
    this.markerT = 0;
  }

  /** Sementes de "vistas" pendentes (diálogo inicializado depois do save). */
  takePendingSeen(): string[] | null {
    const s = this.pendingSeen;
    this.pendingSeen = null;
    return s;
  }

  /** Diagnóstico. */
  debugInfo() {
    return {
      active: this.activeIds(),
      tracked: this.tracked,
      stages: Object.fromEntries(this.activeIds().map((id) => [id, this.stage(id)])),
      cinematic: this.cine.current,
      ...this.stats,
    };
  }
}

// reexporta utilitários do motor para quem consome o sistema
export { objectiveTarget };
export type { StageDef };
