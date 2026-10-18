/**
 * Ganchos do áudio no EventBus: cada evento de jogo vira som (impactos por tipo
 * de dano e alvo, magias, movimentos do jogador, recompensas, missões, trovões
 * com atraso pela distância, sinos da vila, portas, menus...) e ajustes da
 * música (ducking, vitória, dicas de intensidade). Também dá som aos botões da
 * interface (cliques/hover delegados no uiRoot).
 *
 * Vários módulos já tocam o som do próprio golpe/magia diretamente; o motor
 * deduplica o mesmo id/família no mesmo lugar e instante, então os ganchos podem
 * reforçar sem dobrar o volume.
 */
import type { GameContext } from '../core/context';
import type { SfxId, AudioSystem } from './Audio';
import type { Vector3 } from 'three';
import { ABILITIES, ULTIMATE_ID, isAbilityId } from '../data/abilities';
import { LOCATIONS } from '../data/world';
import { AMBIENCE, MIX } from './data';
import { clamp, thunderDelaySec } from './audioMath';

const VILLAGE = LOCATIONS.find((l) => l.id === 'vila_brumafria');

interface PlayOpts {
  position?: Vector3 | { x: number; y: number; z: number };
  volume?: number;
  pitch?: number;
  surface?: string;
  variant?: string;
  running?: boolean;
  delay?: number;
}

export class AudioHooks {
  private offs: (() => void)[] = [];
  private o: PlayOpts = {};
  private lastGold = -1;
  private lastCharge = 0;
  private hurtT = -1;
  private failT = -1;
  private hoverT = -1;
  private hoverEl: Element | null = null;
  private bellPos = { x: 0, y: 0, z: 0 };
  private thunderPos = { x: 0, y: 0, z: 0 };
  private domOff: (() => void) | null = null;

  constructor(
    private sys: AudioSystem,
    private ctx: GameContext,
  ) {}

  /** Toca com opções reaproveitadas (sem alocar por evento). */
  private p(id: SfxId, pos?: PlayOpts['position'], volume = 1, pitch = 1, variant = '', delay = 0) {
    const o = this.o;
    o.position = pos;
    o.volume = volume;
    o.pitch = pitch;
    o.variant = variant;
    o.surface = undefined;
    o.running = undefined;
    o.delay = delay;
    this.sys.playEx(id, o);
  }

  private now() {
    return this.ctx.elapsed;
  }

  attach() {
    const ev = this.ctx.events;
    const ctx = this.ctx;
    const sys = this.sys;
    const on: typeof ev.on = (type, h) => {
      const off = ev.on(type, h);
      this.offs.push(off);
      return off;
    };

    // ------------------------------------------------------------ combate
    on('damage', ({ target, info, result }) => {
      if (result.immune) return;
      const pos = info.point ?? target.position;
      const dot = info.tag === 'dot';
      if (result.parried) return this.p('parry', pos);
      if (result.blocked) return this.p('block', pos, clamp(0.6 + result.absorbed / 40, 0.6, 1.2));
      if (!(result.dealt > 0) && !(result.absorbed > 0)) return;
      const vol = dot ? 0.3 : clamp(0.55 + result.dealt / 60, 0.55, 1.25) * (info.crit ? 1.15 : 1);
      const pitch = info.crit ? 0.86 : 1;
      if (result.absorbed > 0 && !(result.dealt > 0)) this.p('hit_magic', pos, 0.6, 1.5, 'arcane');
      else if (info.type === 'physical') {
        const metal = target.faction === 'construct' || target.kind === 'boss' || target.tags.has('metal');
        this.p(metal ? 'hit_metal' : 'hit_flesh', pos, vol, pitch);
      } else this.p('hit_magic', pos, vol, pitch, info.type);
      if (target.kind === 'player' && !dot && result.dealt > 0) {
        const t = this.now();
        if (t - this.hurtT > 0.25) {
          this.hurtT = t;
          this.p('hurt', undefined, clamp(result.dealt / 25, 0.6, 1.4), 0.95 + Math.random() * 0.1);
        }
      }
    });
    on('combat:parry', ({ defender }) => this.p('parry', defender.position));
    on('combat:combo', ({ position }) => {
      this.p('combo', position);
      sys.director?.duck(0.7, 0.5);
    });
    on('enemy:killed', ({ entity }) => this.p('enemy_death', entity.position));
    on('creature:killed', ({ entity }) => this.p('enemy_death', entity.position, 0.6, 1.4));
    on('boss:start', ({ entity }) => {
      sys.bossPhase = 1;
      this.p('boss_roar', entity.position);
      sys.director?.duck(0.45, 1.4, 0.8);
    });
    on('boss:phase', ({ phase }) => {
      sys.bossPhase = phase;
      const b = ctx.sys.ai?.activeBoss?.();
      this.p('boss_roar', b ? b.position : undefined, 1, 0.85);
      sys.director?.duck(0.5, 1.2, 0.8);
    });
    on('boss:defeated', ({ entity }) => {
      this.p('boss_roar', entity.position, 1, 0.6);
      sys.startVictory();
    });

    // ------------------------------------------------------------ jogador
    const pl = () => ctx.sys.player?.position;
    on('player:flightStart', () => this.p('flight_start', pl()));
    on('player:flightEnd', () => this.p('flight_end', pl()));
    on('player:dodge', () => this.p('dodge', pl()));
    on('player:jump', () => this.p('jump', pl()));
    on('player:landed', ({ impactSpeed }) => this.p('land', pl(), clamp(impactSpeed / 14, 0.3, 1.5)));
    on('player:footstep', ({ surface, running }) => {
      const o = this.o;
      o.position = pl();
      o.volume = running ? 1 : 0.8;
      o.pitch = 1;
      o.variant = '';
      o.surface = surface;
      o.running = running;
      o.delay = 0;
      sys.playEx('footstep', o);
    });
    on('player:attack', ({ heavy }) => this.p(heavy ? 'swing_heavy' : 'swing', pl()));
    on('player:death', () => this.p('death'));
    on('player:respawn', () => this.p('respawn'));
    on('player:lockOn', ({ target }) => {
      if (target) this.p('ui_hover', undefined, 0.9, 0.7);
    });

    // ------------------------------------------------------------ magias
    on('ability:cast', ({ abilityId, position }) => {
      const def = isAbilityId(abilityId) ? ABILITIES[abilityId] : undefined;
      if (def) this.p(def.sfx, position);
      if (abilityId === ULTIMATE_ID) sys.director?.duck(0.4, 1.6, 1);
    });
    on('ability:fail', ({ reason }) => {
      if (reason !== 'cooldown' && reason !== 'energy') return;
      const t = this.now();
      if (t - this.failT < 0.4) return;
      this.failT = t;
      this.p('ui_error', undefined, 0.5, reason === 'energy' ? 0.8 : 1);
    });
    on('ability:unlocked', () => this.p('discovery'));
    on('ultimate:charge', ({ value, max }) => {
      if (value >= max && this.lastCharge < max) this.p('quest_update', undefined, 0.8, 1.25);
      this.lastCharge = value;
    });

    // ------------------------------------------------------------ itens e progresso
    on('item:pickup', () => this.p('pickup'));
    on('herb:harvested', () => this.p('pickup', undefined, 0.8, 0.8));
    on('gold:changed', ({ gold }) => {
      const prev = this.lastGold;
      this.lastGold = gold;
      if (prev < 0 || gold === prev) return;
      if (gold > prev) this.p('gold', undefined, clamp(0.6 + (gold - prev) / 200, 0.6, 1.2));
      else this.p('gold', undefined, 0.6, 0.8);
    });
    on('equip:changed', () => this.p('equip'));
    on('chest:opened', ({ position }) => this.p('chest_open', position));
    on('level:up', () => {
      this.p('level_up');
      sys.director?.duck(0.4, 2.4, 1);
    });
    on('talent:unlocked', () => this.p('equip', undefined, 0.9, 1.3));
    on('quest:started', () => {
      this.p('quest_start');
      sys.director?.duck(0.6, 1.2);
    });
    on('quest:updated', () => this.p('quest_update'));
    on('quest:completed', () => {
      this.p('quest_complete');
      sys.director?.duck(0.5, 2, 1);
    });
    on('quest:failed', () => this.p('ui_error', undefined, 0.8, 0.7));
    on('location:discovered', () => {
      this.p('discovery');
      sys.director?.duck(0.6, 2, 1);
    });
    on('dialogue:start', () => sys.director?.setDuckBase(MIX.dialogueDuck));
    on('dialogue:end', () => sys.director?.setDuckBase(1));

    // ------------------------------------------------------------ mundo
    on('interact', ({ id, kind }) => {
      const it = ctx.sys.interaction?.get?.(id);
      const pos = it?.position;
      switch (kind) {
        case 'door':
          sys.lastDoorT = ctx.elapsed;
          if (pos) {
            sys.lastDoorPos.x = pos.x;
            sys.lastDoorPos.y = pos.y;
            sys.lastDoorPos.z = pos.z;
          }
          return this.p('door', pos);
        case 'lever':
          return this.p('gate', pos, 0.8, 1.2);
        case 'read':
        case 'board':
          return this.p('page', pos);
        case 'loot':
          return this.p('chest_open', pos);
        case 'stash':
          return this.p('chest_open', pos, 0.7, 1.15);
        case 'pickup':
          return this.p('pickup');
      }
    });
    on('time:hour', ({ hour }) => this.bell(hour));
    on('lightning', ({ position }) => this.thunder(position));
    on('weather:changed', ({ weather }) => {
      if (weather === 'storm') {
        // trovão distante anunciando a tempestade
        const c = ctx.camera.position;
        const a = Math.random() * Math.PI * 2;
        const tp = this.thunderPos;
        tp.x = c.x + Math.cos(a) * 1500;
        tp.y = c.y + 200;
        tp.z = c.z + Math.sin(a) * 1500;
        this.p('thunder', tp, 0.7, 0.9, '', 1.5);
      } else if (weather === 'rain' || weather === 'cloudy') this.p('amb_gust', undefined, 0.6);
    });

    // ------------------------------------------------------------ interface e estado
    on('ui:menu', ({ menu }) => this.p(menu ? 'ui_open' : 'ui_close'));
    on('settings:changed', () => sys.applySettings());
    on('music:intensity', ({ state }) => sys.onMusicHint(state));
    on('game:newGame', () => this.reset());
    on('game:loaded', () => {
      this.reset();
      sys.resetWorldTracking();
    });

    this.attachDom();
  }

  private reset() {
    this.lastGold = -1;
    this.lastCharge = 0;
  }

  /** Sino da vila nas horas marcadas (3 badaladas ao meio-dia, 2 nas outras). */
  private bell(hour: number) {
    if (!VILLAGE || !AMBIENCE.bellHours.includes(hour)) return;
    const ctx = this.ctx;
    if (ctx.state !== 'playing' && ctx.state !== 'dialogue') return;
    const p = ctx.sys.player?.position;
    if (!p || Math.hypot(p.x - VILLAGE.x, p.z - VILLAGE.z) > AMBIENCE.bellRange) return;
    const b = this.bellPos;
    b.x = VILLAGE.x;
    b.z = VILLAGE.z;
    b.y = ctx.heightfield.heightAt(VILLAGE.x, VILLAGE.z) + 14;
    const n = hour === 12 ? 3 : 2;
    for (let i = 0; i < n; i++) this.p('village_bell', b, 1, 1, '', i * 1.7);
  }

  /** Trovão: atraso pela distância (velocidade do som) e timbre pela distância (na receita). */
  private thunder(pos: Vector3) {
    const L = this.sys.listenerPosition();
    const d = Math.hypot(pos.x - L.x, pos.y - L.y, pos.z - L.z);
    this.p('thunder', pos, 1, 1, '', thunderDelaySec(d));
  }

  /** Cliques e hover nos botões da interface (delegação no uiRoot, sem tocar no módulo de UI). */
  private attachDom() {
    const root = this.ctx.uiRoot;
    if (!root || typeof root.addEventListener !== 'function') return;
    const SEL = 'button, [role="button"], .btn, .menu-item, .slot, a[href]';
    const click = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(SEL);
      if (!el || (el as HTMLButtonElement).disabled) return;
      this.p('ui_click');
    };
    const over = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.(SEL) ?? null;
      if (el === this.hoverEl) return;
      this.hoverEl = el;
      if (!el || (el as HTMLButtonElement).disabled) return;
      const t = performance.now() / 1000;
      if (t - this.hoverT < 0.06) return;
      this.hoverT = t;
      this.p('ui_hover');
    };
    root.addEventListener('click', click, true);
    root.addEventListener('pointerover', over, true);
    this.domOff = () => {
      root.removeEventListener('click', click, true);
      root.removeEventListener('pointerover', over, true);
    };
  }

  detach() {
    for (const off of this.offs) off();
    this.offs.length = 0;
    this.domOff?.();
    this.domOff = null;
  }
}
