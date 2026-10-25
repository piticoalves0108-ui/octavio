import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import type { Entity } from '../../core/Entity';
import { CINEMATICS, ECLIPSE_STORY, QUEST_RULES } from '../../data/quests';
import type { StoryBoss } from '../../ai/bosses/StoryBoss';
import { PLACES } from '../../data/places';
import type { CinematicPlayer } from './cinematics';
import type { NarrativeBridge } from './bridge';

/**
 * Roteiros nomeados (efeito `{ script: id }`): cinemáticas e lógica de mundo das
 * missões — destino de Ravena, tenda dos Corvos, núcleo do Guardião, caçadores e
 * Cervo de Luz, bênção do Irmão Calen, Forja Celeste, Barão, Darian e os finais.
 */
export interface ScriptHost {
  readonly ctx: GameContext;
  readonly bridge: NarrativeBridge;
  readonly cine: CinematicPlayer;
  log(questId: string, text: string): void;
  /** Cervo de Luz da missão (se existir). */
  deer: Entity | null;
  /** Caçadores atirando no cervo. */
  huntersShooting: boolean;
}

const V = new THREE.Vector3();
const V2 = new THREE.Vector3();

/** Darian (chefe da história rendido), se ainda estiver no mundo. */
function darianEntity(ctx: GameContext): StoryBoss | null {
  const b = ctx.sys.ai?.storyBoss;
  return b && !b.removed && b.bossId === 'cavaleiro_eclipse' ? b : null;
}

/** Clarão do final, no Coração do Eclipse: coluna de luz, anel e tremor. */
function endingBurst(h: ScriptHost, color: number, kind: 'time' | 'void') {
  const sys = h.ctx.sys;
  if (!sys.world.placePosition('cidadela_coracao', V)) V.copy(sys.player.entity.position);
  V.y += 1.2;
  sys.vfx.burst(kind, V, { count: 70, scale: 2.6, color });
  sys.vfx.burst('shockwave', V, { scale: 4, color });
  sys.vfx.beam(V, V2.copy(V).setY(V.y + 120), color, 1.2, 3);
  sys.vfx.runeCircle(V, 8, color, 4, 0.8);
  sys.vfx.sustainedLight(V, color, 8, 6, null, 40);
  sys.audio.play('cast_ascend', { position: V, volume: 1 });
  sys.camera.shake(0.7, 2);
}

/** Inimigo único vivo (ou null). */
export function uniqueEnemy(ctx: GameContext, uid: string): (Entity & { sp?: { standDown: boolean }; setState?: (s: string) => void; fleeT?: number; engage?: (t: Entity, c: boolean, d?: number) => void; cancelAction?: () => void }) | null {
  return (ctx.sys.ai?.findUnique?.(uid) as never) ?? null;
}

export const HUNTER_IDS = ['cervo_cacador_1', 'cervo_cacador_2', 'cervo_cacador_3'];

/** Faz um inimigo de missão debandar (some quando longe da vista). */
function disperse(e: NonNullable<ReturnType<typeof uniqueEnemy>>) {
  e.faction = 'neutral';
  if (e.sp) e.sp.standDown = true;
  e.cancelAction?.();
  if (typeof e.fleeT === 'number') e.fleeT = 2;
  e.setState?.('flee');
}

/** Procura (ou cria) o Cervo Luminoso perto da clareira. */
export function ensureDeer(h: ScriptHost): Entity | null {
  const ctx = h.ctx;
  if (h.deer && h.deer.alive && !h.deer.removed) return h.deer;
  const anchor = PLACES['clareira_cervo_luminoso'];
  if (!anchor) return null;
  const list = (ctx.sys.ai as unknown as { creatures?: Entity[] }).creatures ?? [];
  for (const c of list) {
    if (c.typeId === 'cervo_luminoso' && c.alive && !c.removed && (c.position.x - anchor.x) ** 2 + (c.position.z - anchor.z) ** 2 < 60 * 60) {
      h.deer = c;
      return c;
    }
  }
  if (ctx.sys.world.placePosition('clareira_cervo_luminoso', V)) {
    const c = ctx.sys.ai.spawnCreature('cervo_luminoso', V.clone());
    h.deer = c;
    return c;
  }
  return null;
}

export function runQuestScript(id: string, h: ScriptHost): void {
  const ctx = h.ctx;
  const sys = ctx.sys;
  if (CINEMATICS[id]) {
    h.cine.play(id);
    return;
  }
  switch (id) {
    case 'ravena_poupar': {
      // C3: poupar → remove a entidade depois do diálogo (some numa nuvem de fumaça)
      const r = uniqueEnemy(ctx, 'ravena');
      sys.ai?.defeatedUniques?.add('ravena');
      if (r) {
        sys.vfx.burst('smoke', r.position, { count: 36, scale: 1.6 });
        ctx.entities.remove(r);
      }
      sys.ui.showSubtitle('(Uma bomba de fumaça estoura. Quando o ar limpa, Ravena sumiu.)', 4);
      break;
    }
    case 'ravena_executar': {
      // C3: executar → combat.kill
      const r = uniqueEnemy(ctx, 'ravena');
      if (r) sys.combat.kill(r);
      sys.story.set('ravena_morta', true);
      break;
    }
    case 'revistar_tenda': {
      sys.ui.notify('Num baú de fundo falso: o Cristal-Chave, pulsando em azul.', 'loot');
      if (sys.story.is('ravena_executada') && sys.inventory.count('bilhete_corvos') === 0) {
        sys.inventory.add('bilhete_corvos', 1);
        h.log('q_corvos', 'Na tenda, um bilhete pela metade: "...ouro de Ferroluz, como combinado. Mais cristais da cripta até a lua nova..." O resto foi queimado.');
      }
      break;
    }
    case 'guardiao_absorver': {
      if (sys.world.placePosition('arena_centro', V)) {
        V.y += 1;
        sys.vfx.burst('void', V, { count: 50, scale: 2 });
        sys.vfx.beam(V, sys.player.entity.getCenter(new THREE.Vector3()), 0x9a4aff, 0.35, 1.2);
      }
      sys.vfx.burst('arcaneBurst', sys.player.entity.position, { count: 40, scale: 1.4, color: 0x9a4aff });
      sys.camera.shake(0.6, 1.2);
      sys.ui.showSubtitle('Kaelen: ...Isso é meu. Sempre foi. Então por que parece roubado?', 4.5);
      sys.ui.notify('Forma Ascendente desbloqueada. +10% de poder mágico.', 'level');
      break;
    }
    case 'guardiao_libertar': {
      if (sys.world.placePosition('arena_centro', V)) {
        V.y += 1;
        sys.vfx.burst('time', V, { count: 60, scale: 2.2, color: 0x7fd8ff });
        sys.vfx.burst('heal', V, { count: 30, scale: 1.5 });
        sys.vfx.sustainedLight(V, 0x7fd8ff, 6, 4, null, 26);
        sys.vfx.beam(V, V.clone().setY(V.y + 60), 0x9fe8ff, 0.8, 2.5);
      }
      sys.ui.showSubtitle('(A luz azul sobe pela cúpula e se apaga no céu, como uma estrela indo para casa.)', 5);
      break;
    }
    case 'garantir_cervo': {
      ensureDeer(h);
      break;
    }
    case 'cacadores_atacam': {
      ensureDeer(h);
      for (const uid of HUNTER_IDS) {
        const e = uniqueEnemy(ctx, uid);
        if (!e) continue;
        e.faction = 'bandit';
        e.engage?.(sys.player.entity, true, 0.3);
      }
      h.huntersShooting = true;
      break;
    }
    case 'cacadores_cacam': {
      const deer = ensureDeer(h);
      if (deer) {
        sys.vfx.burst('leaves', deer.position, { count: 30 });
        sys.combat.kill(deer);
      }
      sys.story.set('cervo_morto', true);
      sys.inventory.addGold(QUEST_RULES.hunterBribe);
      for (const uid of HUNTER_IDS) {
        const e = uniqueEnemy(ctx, uid);
        if (e) disperse(e);
      }
      h.huntersShooting = false;
      break;
    }
    case 'cacadores_fogem': {
      for (const uid of HUNTER_IDS) {
        const e = uniqueEnemy(ctx, uid);
        if (e) disperse(e);
      }
      h.huntersShooting = false;
      break;
    }
    case 'bencao_calen': {
      const mem = sys.npcs.memory('calen');
      const ph = sys.player.health;
      if (ph) ph.current = ph.max;
      sys.vfx.burst('heal', sys.player.entity.position, { count: 30 });
      if (mem.bencao_dia !== ctx.clock.day) {
        mem.bencao_dia = ctx.clock.day;
        sys.progression.addBuff('bencao_aurora', 'Bênção da Aurora', 600, { healthRegen: 2, damageReduction: 0.05 });
        sys.ui.notify('Bênção da Aurora: regeneração de vida e −5% de dano recebido por 10 minutos.', 'info');
      }
      break;
    }
    // ------------------------------------------------ Ato II: Ferroluz
    case 'forja_acesa': {
      if (sys.world.placePosition('ferroluz_forja', V)) {
        V.y += 2;
        sys.vfx.burst('fire', V, { count: 50, scale: 2.2, color: 0x6ab8ff });
        sys.vfx.burst('arcaneBurst', V, { count: 40, scale: 1.8, color: 0x7fd8ff });
        sys.vfx.beam(V, V2.copy(V).setY(V.y + 40), 0x7fd8ff, 0.7, 2.4);
        sys.vfx.sustainedLight(V, 0x6ab8ff, 7, 8, null, 30);
        sys.audio.play('explosion', { position: V, volume: 0.8, pitch: 0.7 });
      }
      sys.camera.shake(0.5, 1.4);
      h.cine.play('memoria_forja');
      break;
    }
    case 'barao_exposto': {
      sys.story.set('ferroluz_revolta', true);
      sys.ui.showSubtitle('(Os engenheiros levam Teodric para dentro da torre. Ferroluz grita o nome dele, e não é de carinho.)', 5);
      sys.ui.notify('Ferroluz se volta contra o Barão.', 'warning');
      break;
    }
    case 'barao_convencido': {
      if (sys.world.placePosition('ferroluz_barao', V)) {
        V.y += 6;
        sys.vfx.burst('crystalShatter', V, { count: 40, scale: 1.4, color: 0xb070ff });
        sys.audio.play('hit_magic', { position: V, volume: 0.8, pitch: 0.6 });
      }
      sys.ui.notify('Ferroluz será sua aliada no Eclipse.', 'quest');
      break;
    }
    // ------------------------------------------------ Ato III: Darian
    case 'darian_redimir': {
      const b = darianEntity(ctx);
      if (b) b.depart(ctx);
      else if (sys.world.placePosition('torre_duelo', V)) sys.vfx.burst('time', V, { scale: 2, count: 50, color: 0xffd880 });
      sys.ui.notify('Darian lutará ao seu lado na batalha final.', 'quest');
      break;
    }
    case 'darian_matar': {
      const b = darianEntity(ctx);
      if (b && b.alive) {
        b.health.invulnerable = 0;
        sys.combat.kill(b);
      } else if (sys.world.placePosition('torre_duelo', V)) sys.vfx.burst('void', V, { scale: 2, count: 40 });
      sys.camera.shake(0.4, 0.8);
      break;
    }
    // ------------------------------------------------ Ato IV e finais
    case 'eclipse_avanca': {
      sys.env.setEclipse(ECLIPSE_STORY.ato4, 20);
      break;
    }
    case 'fim_reunificacao': {
      sys.env.setEclipse(ECLIPSE_STORY.reunificacao, 8);
      sys.env.lockWeather(null);
      sys.env.setWeather('clear', 6);
      endingBurst(h, 0xffd880, 'time');
      break;
    }
    case 'fim_selo': {
      sys.env.setEclipse(ECLIPSE_STORY.selo, 8);
      sys.env.lockWeather(null);
      endingBurst(h, 0x7fd8ff, 'time');
      break;
    }
    case 'fim_sombrio': {
      sys.env.setEclipse(ECLIPSE_STORY.sombrio, 6);
      endingBurst(h, 0x9a4aff, 'void');
      sys.vfx.burst('corruption', sys.player.entity.position, { count: 50, scale: 1.8 });
      break;
    }
    default:
      console.warn(`[Missões] roteiro desconhecido: ${id}`);
  }
}
