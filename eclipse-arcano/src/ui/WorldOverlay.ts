/**
 * Elementos da interface presos a pontos do mundo 3D: barras de vida dos inimigos,
 * mira do alvo travado, botão de interação, objetivo de missão rastreado (com a
 * distância, preso à borda da tela quando fora de vista), marcadores avulsos,
 * números de dano e a barra grande do chefe.
 */
import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import { el, htmlEl, setText, setStyle, show, toggleClass, projectToScreen, placeAt, keyLabel, fmtDistance } from './dom';
import { questDiamond } from './icons';

const S = { x: 0, y: 0, z: 0 };
const MAX_BARS = 14;
const MAX_NUMBERS = 28;

interface BarEls {
  root: HTMLElement;
  name: HTMLElement;
  fill: HTMLElement;
  ghost: HTMLElement;
  entity: Entity | null;
  ghostV: number;
}

interface DmgNum {
  el: HTMLElement;
  pos: THREE.Vector3;
  vy: number;
  t: number;
  life: number;
  active: boolean;
}

interface Marker {
  el: HTMLElement;
  pos: THREE.Vector3;
}

export class WorldOverlay {
  readonly root: HTMLElement;
  private bars: BarEls[] = [];
  private barList: Entity[] = [];
  private lock: HTMLElement;
  private prompt: HTMLElement;
  private promptText: HTMLElement;
  private promptKey: HTMLElement;
  private promptLabel: string | null = null;
  private beacon: HTMLElement;
  private beaconDist: HTMLElement;
  private beaconLabel: HTMLElement;
  private nums: DmgNum[] = [];
  private markers = new Map<string, Marker>();
  // chefe
  private boss: HTMLElement;
  private bossName: HTMLElement;
  private bossFill: HTMLElement;
  private bossGhost: HTMLElement;
  private bossPhase: HTMLElement;
  private bossEntity: Entity | null = null;
  private bossGhostV = 1;
  private tmp = new THREE.Vector3();

  constructor(private ctx: GameContext, parent: HTMLElement) {
    this.root = el('div', 'ui-world', parent);
    for (let i = 0; i < MAX_BARS; i++) {
      const root = el('div', 'ui-ebar', this.root);
      const name = el('div', 'ui-ebar-name', root);
      const track = el('div', 'ui-ebar-track', root);
      const ghost = el('div', 'ui-ebar-ghost', track);
      const fill = el('div', 'ui-ebar-fill', track);
      show(root, false);
      this.bars.push({ root, name, fill, ghost, entity: null, ghostV: 1 });
    }
    this.lock = el('div', 'ui-lock', this.root);
    this.lock.innerHTML = '<span></span><span></span><span></span><span></span>';
    this.beacon = el('div', 'ui-beacon', this.root);
    htmlEl('ui-beacon-icon', questDiamond(true), this.beacon);
    this.beaconDist = el('div', 'ui-beacon-dist', this.beacon);
    this.beaconLabel = el('div', 'ui-beacon-label', this.beacon);
    this.prompt = el('div', 'ui-prompt', this.root);
    this.promptKey = el('span', 'ui-key', this.prompt);
    this.promptText = el('span', 'ui-prompt-text', this.prompt);
    for (let i = 0; i < MAX_NUMBERS; i++) {
      const e = el('div', 'ui-dmg', this.root);
      show(e, false);
      this.nums.push({ el: e, pos: new THREE.Vector3(), vy: 0, t: 0, life: 1, active: false });
    }

    this.boss = el('div', 'ui-boss', parent);
    this.bossName = el('div', 'ui-boss-name', this.boss);
    const bt = el('div', 'ui-boss-track', this.boss);
    this.bossGhost = el('div', 'ui-boss-ghost', bt);
    this.bossFill = el('div', 'ui-boss-fill', bt);
    el('div', 'ui-boss-tick t1', bt);
    el('div', 'ui-boss-tick t2', bt);
    this.bossPhase = el('div', 'ui-boss-phase', this.boss);

    ctx.events.on('damage', ({ target, info, result }) => this.onDamage(target, info.source ?? null, result, info.crit, info.weakPoint));
  }

  // ---------------------------------------------------------------------------
  // API usada pela UI
  // ---------------------------------------------------------------------------

  setPrompt(text: string | null) {
    this.promptLabel = text;
  }

  setBoss(name: string | null, entity: Entity | null) {
    this.bossEntity = name ? entity ?? null : null;
    if (name) {
      setText(this.bossName, name);
      this.bossGhostV = 1;
      this.boss.classList.add('in');
    } else this.boss.classList.remove('in');
  }

  marker(id: string, position: THREE.Vector3 | null, label?: string) {
    let m = this.markers.get(id);
    if (!position) {
      if (m) {
        m.el.remove();
        this.markers.delete(id);
      }
      return;
    }
    if (!m) {
      m = { el: el('div', 'ui-wmark', this.root), pos: new THREE.Vector3() };
      this.markers.set(id, m);
    }
    m.pos.copy(position);
    m.el.textContent = label ?? '!';
  }

  // ---------------------------------------------------------------------------

  private onDamage(target: Entity, source: Entity | null, result: { dealt: number; blocked: boolean; parried: boolean; immune: boolean; killed: boolean }, crit?: boolean, weak?: boolean) {
    const ctx = this.ctx;
    if (!ctx.settings.data.showDamageNumbers) return;
    const player = ctx.sys.player.entity;
    if (target === player) return;
    if (source !== player) return;
    const n = this.nums.find((x) => !x.active) ?? this.nums.reduce((a, b) => (a.t > b.t ? a : b));
    n.active = true;
    n.t = 0;
    n.life = crit ? 1.25 : 0.95;
    n.vy = 1.6;
    target.getCenter(n.pos);
    n.pos.y += target.height * 0.45;
    n.pos.x += (Math.random() - 0.5) * 0.8;
    n.pos.z += (Math.random() - 0.5) * 0.8;
    let text: string;
    let cls = 'ui-dmg';
    if (result.immune) {
      text = 'Imune';
      cls += ' info';
    } else if (result.parried) {
      text = 'Aparado';
      cls += ' info';
    } else if (result.blocked && result.dealt < 1) {
      text = 'Bloqueado';
      cls += ' info';
    } else {
      text = String(Math.max(1, Math.round(result.dealt)));
      if (crit) cls += ' crit';
      if (weak) cls += ' weak';
      if (result.blocked) cls += ' blocked';
    }
    n.el.className = cls;
    n.el.textContent = text;
    show(n.el, true);
  }

  update(dt: number) {
    const ctx = this.ctx;
    const playing = ctx.state === 'playing' || ctx.state === 'dead';
    show(this.root, playing);
    this.updateBoss(dt);
    if (!playing) return;
    const cam = ctx.camera;
    this.updateBars(dt, cam);
    this.updateLock(cam);
    this.updatePrompt(cam);
    this.updateBeacon(cam);
    this.updateNumbers(dt, cam);
    for (const m of this.markers.values()) {
      if (projectToScreen(cam, m.pos.x, m.pos.y, m.pos.z, S)) {
        show(m.el, true);
        placeAt(m.el, S.x, S.y);
      } else show(m.el, false);
    }
  }

  private updateBars(dt: number, cam: THREE.Camera) {
    const list = this.ctx.sys.ai.visibleBars(this.barList);
    const lockT = this.ctx.sys.player.lockTarget;
    let used = 0;
    for (let i = 0; i < list.length && used < MAX_BARS; i++) {
      const e = list[i];
      if (e === this.bossEntity || !e.health) continue;
      const p = e.position;
      const bh = (e as unknown as { barHeight?: number }).barHeight ?? e.height + 0.4;
      if (!projectToScreen(cam, p.x, p.y + bh, p.z, S)) continue;
      const b = this.bars[used++];
      if (b.entity !== e) {
        b.entity = e;
        b.ghostV = e.health.current / Math.max(1, e.health.max);
        const lv = (e as unknown as { level?: number }).level;
        const elite = (e as unknown as { elite?: boolean }).elite;
        b.name.textContent = `${elite ? '★ ' : ''}${e.name || ''}${lv ? `  ·  Nv ${lv}` : ''}`;
        toggleClass(b.root, 'elite', !!elite);
      }
      const frac = Math.max(0, e.health.current / Math.max(1, e.health.max));
      if (b.ghostV > frac) b.ghostV = Math.max(frac, b.ghostV - dt * 0.6);
      else b.ghostV = frac;
      setStyle(b.fill, 'width', `${(frac * 100).toFixed(1)}%`);
      setStyle(b.ghost, 'width', `${(b.ghostV * 100).toFixed(1)}%`);
      toggleClass(b.root, 'locked', e === lockT);
      // encolhe com a distância
      const dist = cam.position.distanceTo(p);
      const k = Math.max(0.6, Math.min(1.1, 14 / Math.max(1, dist)));
      show(b.root, true);
      placeAt(b.root, S.x, S.y, ` scale(${k.toFixed(2)})`);
    }
    for (let i = used; i < MAX_BARS; i++) {
      if (this.bars[i].entity) {
        this.bars[i].entity = null;
        show(this.bars[i].root, false);
      }
    }
  }

  private updateLock(cam: THREE.Camera) {
    const t = this.ctx.sys.player.lockTarget;
    if (!t || !t.alive) {
      show(this.lock, false);
      return;
    }
    t.getCenter(this.tmp);
    if (!projectToScreen(cam, this.tmp.x, this.tmp.y, this.tmp.z, S)) {
      show(this.lock, false);
      return;
    }
    show(this.lock, true);
    const dist = cam.position.distanceTo(this.tmp);
    const size = Math.max(34, Math.min(110, (t.height * 900) / Math.max(1, dist)));
    setStyle(this.lock, '--size', `${size.toFixed(0)}px`);
    placeAt(this.lock, S.x, S.y);
  }

  private updatePrompt(cam: THREE.Camera) {
    const cur = this.ctx.sys.interaction.current;
    if (!this.promptLabel || !cur || this.ctx.state !== 'playing') {
      show(this.prompt, false);
      return;
    }
    const p = cur.position;
    if (!projectToScreen(cam, p.x, p.y + 0.6, p.z, S)) {
      show(this.prompt, false);
      return;
    }
    setText(this.promptKey, keyLabel(this.ctx.input.bindings.interact[0]));
    setText(this.promptText, this.promptLabel);
    show(this.prompt, true, 'flex');
    // um pouco à direita do objeto, preso dentro da tela
    const x = Math.min(innerWidth - 160, Math.max(20, S.x + 40));
    const y = Math.min(innerHeight - 140, Math.max(60, S.y));
    this.prompt.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translateY(-50%)`;
  }

  private updateBeacon(cam: THREE.Camera) {
    const { sys, settings } = this.ctx;
    const tracked = sys.quests.tracked;
    if (!settings.data.questMarkers || !tracked) {
      show(this.beacon, false);
      return;
    }
    const m = sys.quests.getMarkers().find((x) => x.questId === tracked);
    if (!m) {
      show(this.beacon, false);
      return;
    }
    const pl = sys.player.entity.position;
    const d = Math.hypot(m.position.x - pl.x, m.position.z - pl.z);
    if (d < (m.radius ?? 6) * 0.6) {
      show(this.beacon, false);
      return;
    }
    const y = Math.max(m.position.y, this.ctx.heightfield.heightAt(m.position.x, m.position.z)) + 2.2;
    // área segura: fora das barras de vida (topo), do minimapa e da barra de magias (embaixo)
    const L = 60;
    const R = innerWidth - 230;
    const T = 90;
    const B = innerHeight - 140;
    const front = projectToScreen(cam, m.position.x, y, m.position.z, S);
    let x = S.x;
    let yy = S.y;
    let edge = false;
    if (!front || x < L || x > R || yy < T || yy > B) {
      // direção na tela a partir do centro
      this.tmp.set(m.position.x, y, m.position.z).applyMatrix4(cam.matrixWorldInverse);
      let dx = this.tmp.x;
      let dy = -this.tmp.y;
      // atrás da câmera: fica embaixo, do lado certo (x da câmera já é esquerda/direita)
      if (this.tmp.z > 0) dy = Math.abs(dy) + Math.abs(dx) * 0.3 + 0.2;
      const cx = (L + R) / 2;
      const cy = (T + B) / 2;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;
      const tx = dx > 0 ? (R - cx) / dx : dx < 0 ? (L - cx) / dx : Infinity;
      const ty = dy > 0 ? (B - cy) / dy : dy < 0 ? (T - cy) / dy : Infinity;
      const t = Math.min(tx, ty);
      x = cx + dx * t;
      yy = cy + dy * t;
      edge = true;
    }
    show(this.beacon, true);
    toggleClass(this.beacon, 'edge', edge);
    toggleClass(this.beacon, 'side', !m.main);
    setText(this.beaconDist, fmtDistance(d));
    setText(this.beaconLabel, m.label);
    placeAt(this.beacon, x, yy);
  }

  private updateNumbers(dt: number, cam: THREE.Camera) {
    for (const n of this.nums) {
      if (!n.active) continue;
      n.t += dt;
      if (n.t >= n.life) {
        n.active = false;
        show(n.el, false);
        continue;
      }
      n.pos.y += n.vy * dt;
      n.vy = Math.max(0.2, n.vy - dt * 2.5);
      if (!projectToScreen(cam, n.pos.x, n.pos.y, n.pos.z, S)) {
        show(n.el, false);
        continue;
      }
      show(n.el, true);
      const a = n.t < 0.1 ? n.t / 0.1 : 1 - Math.max(0, (n.t - n.life * 0.6) / (n.life * 0.4));
      const pop = n.t < 0.12 ? 1.35 - n.t * 2.9 : 1;
      n.el.style.opacity = a.toFixed(2);
      placeAt(n.el, S.x, S.y, ` scale(${pop.toFixed(2)})`);
    }
  }

  private updateBoss(dt: number) {
    const b = this.bossEntity;
    if (!b || !b.health) return;
    const frac = Math.max(0, b.health.current / Math.max(1, b.health.max));
    if (this.bossGhostV > frac) this.bossGhostV = Math.max(frac, this.bossGhostV - dt * 0.3);
    else this.bossGhostV = frac;
    setStyle(this.bossFill, 'width', `${(frac * 100).toFixed(2)}%`);
    setStyle(this.bossGhost, 'width', `${(this.bossGhostV * 100).toFixed(2)}%`);
    const phase = (b as unknown as { phase?: number }).phase;
    setText(this.bossPhase, phase ? `Fase ${phase} de 3` : '');
    show(this.boss, this.ctx.state === 'playing' || this.ctx.state === 'dead' || this.ctx.state === 'cinematic');
  }
}
