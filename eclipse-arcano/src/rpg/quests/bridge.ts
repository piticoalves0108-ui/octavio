import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import type { StoryValue } from '../../core/EventBus';
import { clampAttitude, type Effect, type EffectSink, type MemoryValue, type NarrativeEnv, type QuestStatusName } from '../dialogue/script';
import { PLACES } from '../../data/places';

/**
 * Ponte entre a "linguagem" de dados da narrativa (condições/efeitos de
 * src/rpg/dialogue/script.ts) e os sistemas reais do jogo. Compartilhada pelo
 * sistema de missões, pelos diálogos, pelos pontos de interação e pelos NPCs.
 */
export interface BridgeOwner {
  questStatus(id: string): QuestStatusName;
  questStage(id: string): string | null;
  start(id: string): boolean;
  complete(id: string): void;
  fail(id: string): void;
  setStage(id: string, stage: string): boolean;
  signal(id: string): void;
  log(id: string, text: string): void;
  runScript(id: string): void;
}

const V = new THREE.Vector3();

export class NarrativeBridge implements EffectSink {
  readonly env: NarrativeEnv;
  /** Efeitos aplicados (diagnóstico/testes). */
  applied = 0;

  constructor(
    private ctx: GameContext,
    private owner: BridgeOwner,
  ) {
    const c = ctx;
    this.env = {
      flag: (k) => c.sys.story.get(k),
      questStatus: (id) => owner.questStatus(id),
      questStage: (id) => owner.questStage(id),
      itemCount: (id) => c.sys.inventory?.count(id) ?? 0,
      gold: () => c.sys.inventory?.gold ?? 0,
      level: () => c.sys.progression?.level ?? 1,
      hour: () => c.clock.hours,
      raining: () => !!c.sys.env?.isRaining?.(),
      memory: (npc) => c.sys.npcs.memory(npc) as Record<string, MemoryValue>,
      defeated: (uid) => !!c.sys.ai?.defeatedUniques?.has(uid),
      bossDefeated: (id) => !!c.sys.ai?.defeatedBosses?.has(id),
    };
  }

  apply(e: Effect, npc?: string): void {
    const c = this.ctx;
    const sys = c.sys;
    this.applied++;
    if ('set' in e) return sys.story.set(e.set, (e.value ?? true) as StoryValue);
    if ('choose' in e) return sys.story.choose(e.choose, e.value);
    if ('startQuest' in e) {
      this.owner.start(e.startQuest);
      return;
    }
    if ('stage' in e) {
      this.owner.setStage(e.stage[0], e.stage[1]);
      return;
    }
    if ('completeQuest' in e) return this.owner.complete(e.completeQuest);
    if ('failQuest' in e) return this.owner.fail(e.failQuest);
    if ('signal' in e) return this.owner.signal(e.signal);
    if ('give' in e) {
      const qty = e.qty ?? 1;
      const pos = sys.player?.entity.position;
      sys.inventory.add(e.give, qty, pos ? { dropAt: pos.clone() } : undefined);
      return;
    }
    if ('take' in e) {
      const qty = Math.min(e.qty ?? 1, sys.inventory.count(e.take));
      if (qty > 0) sys.inventory.remove(e.take, qty);
      return;
    }
    if ('gold' in e) {
      if (e.gold >= 0) sys.inventory.addGold(e.gold);
      else sys.inventory.spendGold(-e.gold);
      return;
    }
    if ('xp' in e) return sys.progression.addXp(e.xp, 'história');
    if ('skillPoints' in e) return sys.progression.addSkillPoints(e.skillPoints, 'história');
    if ('shop' in e) {
      sys.inventory.openShop(e.shop);
      return;
    }
    if ('rest' in e) return this.rest(e.rest, e.checkpoint);
    if ('unlockAbility' in e) {
      sys.abilities.unlock(e.unlockAbility);
      return;
    }
    if ('gate' in e) return sys.world.setGateOpen(e.gate, e.open);
    if ('spawn' in e) {
      if (sys.world.placePosition(e.at, V)) sys.ai.spawnEnemy(e.spawn, V.clone(), { uniqueId: e.uniqueId, aggro: e.aggro });
      return;
    }
    if ('attitude' in e) {
      const id = e.npc ?? npc;
      if (!id) return;
      const m = sys.npcs.memory(id);
      m.attitude = clampAttitude((typeof m.attitude === 'number' ? m.attitude : 0) + e.attitude);
      return;
    }
    if ('mem' in e) {
      const id = e.npc ?? npc;
      if (!id) return;
      const m = sys.npcs.memory(id);
      if (e.inc !== undefined) m[e.mem] = (typeof m[e.mem] === 'number' ? (m[e.mem] as number) : 0) + e.inc;
      else m[e.mem] = e.value ?? true;
      return;
    }
    if ('notify' in e) return sys.ui.notify(e.notify, e.kind ?? 'info');
    if ('log' in e) return this.owner.log(e.quest, e.log);
    if ('script' in e) return this.owner.runScript(e.script);
    if ('freeUpgrade' in e) {
      sys.inventory.freeUpgrades = (sys.inventory.freeUpgrades ?? 0) + e.freeUpgrade;
      sys.ui.notify(`Doran fará ${e.freeUpgrade > 1 ? `${e.freeUpgrade} aprimoramentos` : 'um aprimoramento'} de graça na forja.`, 'info');
      return;
    }
    if ('checkpoint' in e) return this.checkpoint(e.checkpoint);
    if ('statMod' in e) return sys.progression.setExternalMod(e.statMod, e.mods);
    if ('subtitle' in e) return sys.ui.showSubtitle(e.subtitle, e.duration ?? 4);
  }

  applyAll(list: readonly Effect[] | undefined, npc?: string) {
    if (list) for (const e of list) this.apply(e, npc);
  }

  checkpoint(placeId: string) {
    const p = PLACES[placeId];
    if (!p) return;
    this.ctx.sys.player.setCheckpoint(p.x, p.z, p.yaw ?? this.ctx.sys.player.entity.yaw);
  }

  /** Descansar: escurece, avança o relógio, cura, marca checkpoint e reposiciona os NPCs. */
  rest(until: 'morning' | 'night' | number, checkpoint?: string) {
    const c = this.ctx;
    const h = c.clock.hours;
    let hours: number;
    if (until === 'morning') hours = (7 - h + 24) % 24 || 24;
    else if (until === 'night') hours = (21 - h + 24) % 24 || 24;
    else hours = Math.max(0.5, until);
    const finish = () => {
      c.clock.advance(hours);
      const ph = c.sys.player.health;
      if (ph) ph.current = ph.max;
      c.sys.player.restoreEnergy(9999);
      if (checkpoint) this.checkpoint(checkpoint);
      (c.sys.npcs as unknown as { snapAll?: () => void }).snapAll?.();
      const hh = Math.floor(c.clock.hours);
      const mm = Math.floor((c.clock.hours - hh) * 60);
      c.sys.ui.notify(`Você descansou. Dia ${c.clock.day}, ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}.`, 'info');
      void c.sys.ui.fadeIn(0.8);
    };
    const p = c.sys.ui.fadeOut(0.6);
    if (p && typeof (p as Promise<void>).then === 'function') (p as Promise<void>).then(finish, finish);
    else finish();
  }
}
