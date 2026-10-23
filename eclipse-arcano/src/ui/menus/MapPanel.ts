/**
 * Mapa em tela cheia, no estilo dos mapas do Zelda:
 *  - arrastar para mover, roda do mouse/botões/teclas para zoom;
 *  - névoa sobre o que ainda não foi explorado (some ao andar; voando revela mais);
 *  - ícones dos locais descobertos com nome e descrição; nomes das regiões;
 *  - objetivos de missão, missões disponíveis, marcadores do jogador (carimbos);
 *  - viagem rápida para locais descobertos;
 *  - clique no mapa coloca o carimbo escolhido; clique num carimbo o remove.
 * Teclado: setas/WASD movem, +/- zoom, C centraliza no jogador.
 */
import type { GameContext } from '../../core/context';
import { LOCATIONS, LOCATION_BY_ID, WORLD_HALF, WORLD_SIZE, PLAYABLE_HALF, type LocationDef, type LocationKind } from '../../data/world';
import { PIN_COLORS, PIN_ICONS, type PinIcon } from '../../world/exploration';
import { el, htmlEl, fmtTime, fmtDistance } from '../dom';
import { locationIcon, pinIcon, questDiamond, playerArrow, weatherIcon } from '../icons';
import { MAP_M_PER_PX, type MapBaseRenderer, type FogRenderer } from '../mapRender';
import { isTravelPoint, travelBlockReason } from '../fastTravel';
import { button, escapeHtml, type Panel } from './widgets';

const KIND_NAMES: Record<LocationKind, string> = {
  settlement: 'Povoado',
  dungeon: 'Masmorra',
  ruins: 'Ruínas',
  landmark: 'Marco',
  camp: 'Acampamento',
  tower: 'Torre',
  region: 'Região',
  secret: 'Segredo',
  arena: 'Arena',
};
const KIND_COLORS: Record<LocationKind, string> = {
  settlement: '#ffe8b0',
  dungeon: '#e0c8ff',
  ruins: '#b8e8ff',
  landmark: '#fff4c8',
  camp: '#ffb8a0',
  tower: '#e8f0ff',
  region: '#d8f0c8',
  secret: '#ffd36a',
  arena: '#ff8a8a',
};

const MIN_SCALE = 0.32;
const MAX_SCALE = 4;

interface Icon {
  el: HTMLElement;
  x: number;
  z: number;
}

export class MapPanel implements Panel {
  readonly el: HTMLElement;
  private view: HTMLElement;
  private canvas: HTMLCanvasElement;
  private g: CanvasRenderingContext2D;
  private layer: HTMLElement;
  private regionLayer: HTMLElement;
  private side: HTMLElement;
  private card: HTMLElement;
  private stampsEl: HTMLElement;
  private infoEl: HTMLElement;
  private icons: Icon[] = [];
  private playerEl: HTMLElement;
  /** Centro da vista (mundo, m) e escala (px por metro). */
  private cx = 0;
  private cz = 0;
  private scale = 1;
  private dirty = true;
  private drag: { x: number; y: number; cx: number; cz: number; moved: boolean } | null = null;
  private stamp: PinIcon = 'pin';
  private stampColor = PIN_COLORS[0];
  private stampMode = true;
  private selectedLoc: string | null = null;
  private dpr = 1;
  private fogVersion = -1;
  private keys = new Set<string>();
  /** Viagem pedida (a UI faz a transição). */
  onTravel: ((locationId: string) => void) | null = null;

  constructor(private ctx: GameContext, private base: MapBaseRenderer, private fog: FogRenderer) {
    this.el = el('div', 'ui-panel ui-map');
    this.view = el('div', 'ui-map-view', this.el);
    this.canvas = el('canvas', 'ui-map-canvas', this.view);
    this.g = this.canvas.getContext('2d')!;
    this.regionLayer = el('div', 'ui-map-regions', this.view);
    this.layer = el('div', 'ui-map-layer', this.view);
    this.playerEl = htmlEl('ui-map-player', playerArrow(), this.layer);
    this.card = el('div', 'ui-map-card', this.view);
    this.card.style.display = 'none';
    const zoom = el('div', 'ui-map-zoom', this.view);
    button(zoom, '+', () => this.zoomAt(1.4, innerWidth / 2, innerHeight / 2), 'icon');
    button(zoom, '−', () => this.zoomAt(1 / 1.4, innerWidth / 2, innerHeight / 2), 'icon');
    button(zoom, '◎', () => this.centerOnPlayer(), 'icon');

    this.side = el('div', 'ui-map-side', this.el);
    this.infoEl = el('div', 'ui-map-info', this.side);
    el('h3', 'ui-heading', this.side, 'Carimbos');
    this.stampsEl = el('div', 'ui-stamps', this.side);
    el('p', 'ui-hint', this.side, 'Clique no mapa para marcar. Clique num carimbo para apagar. Arraste para mover, use a roda do mouse para o zoom.');
    this.buildStamps();
    this.bindPointer();
    addEventListener('resize', () => (this.dirty = true));
  }

  // ---------------------------------------------------------------------------

  onOpen() {
    this.centerOnPlayer();
    if (this.scale === 1) this.scale = 1.1;
    this.selectedLoc = null;
    this.card.style.display = 'none';
    this.rebuildIcons();
    void this.base.build().then(() => (this.dirty = true));
  }

  onClose() {
    this.keys.clear();
    this.drag = null;
  }

  /** Centraliza num ponto (ex.: objetivo de uma missão). */
  focus(x: number, z: number, scale = 1.6) {
    this.cx = x;
    this.cz = z;
    this.scale = scale;
    this.dirty = true;
  }

  focusQuest(questId: string) {
    const m = this.ctx.sys.quests.getMarkers().find((q) => q.questId === questId);
    if (m) this.focus(m.position.x, m.position.z);
  }

  private centerOnPlayer() {
    const p = this.ctx.sys.player.entity.position;
    this.cx = p.x;
    this.cz = p.z;
    this.dirty = true;
  }

  // ---------------------------------------------------------------------------

  private buildStamps() {
    this.stampsEl.innerHTML = '';
    const row1 = el('div', 'ui-stamp-row', this.stampsEl);
    for (const ic of PIN_ICONS) {
      const b = htmlEl(`ui-stamp${ic === this.stamp ? ' on' : ''}`, pinIcon(ic), row1, 'button');
      b.style.color = this.stampColor;
      b.addEventListener('click', () => {
        this.stamp = ic;
        this.stampMode = true;
        this.buildStamps();
      });
    }
    const row2 = el('div', 'ui-stamp-row', this.stampsEl);
    for (const c of PIN_COLORS) {
      const b = el('button', `ui-swatch${c === this.stampColor ? ' on' : ''}`, row2);
      b.style.background = c;
      b.addEventListener('click', () => {
        this.stampColor = c;
        this.buildStamps();
      });
    }
    const n = this.ctx.sys.world.exploration.pins.length;
    if (n) button(this.stampsEl, `Apagar todos (${n})`, () => {
      for (const p of this.ctx.sys.world.exploration.pins.slice()) this.ctx.sys.world.exploration.removePin(p.id);
      this.rebuildIcons();
      this.buildStamps();
    }, 'ghost small');
  }

  private bindPointer() {
    const v = this.view;
    v.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('.ui-map-card, .ui-map-zoom, .ui-map-icon')) return;
      v.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY, cx: this.cx, cz: this.cz, moved: false };
    });
    v.addEventListener('pointermove', (e) => {
      if (!this.drag) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) this.drag.moved = true;
      this.cx = this.drag.cx - dx / this.scale;
      this.cz = this.drag.cz - dy / this.scale;
      this.clampView();
      this.dirty = true;
    });
    v.addEventListener('pointerup', (e) => {
      const d = this.drag;
      this.drag = null;
      if (!d || d.moved) return;
      // clique simples: carimbo ou fecha o cartão
      if (this.card.style.display !== 'none') {
        this.card.style.display = 'none';
        this.selectedLoc = null;
        return;
      }
      if (this.stampMode) this.placeStamp(e.clientX, e.clientY);
    });
    v.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY);
      },
      { passive: false },
    );
  }

  private screenToWorld(sx: number, sy: number) {
    const r = this.view.getBoundingClientRect();
    return { x: this.cx + (sx - r.left - r.width / 2) / this.scale, z: this.cz + (sy - r.top - r.height / 2) / this.scale };
  }

  private zoomAt(k: number, sx: number, sy: number) {
    const before = this.screenToWorld(sx, sy);
    this.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale * k));
    const after = this.screenToWorld(sx, sy);
    this.cx += before.x - after.x;
    this.cz += before.z - after.z;
    this.clampView();
    this.dirty = true;
  }

  private clampView() {
    this.cx = Math.max(-PLAYABLE_HALF, Math.min(PLAYABLE_HALF, this.cx));
    this.cz = Math.max(-PLAYABLE_HALF, Math.min(PLAYABLE_HALF, this.cz));
  }

  private placeStamp(sx: number, sy: number) {
    const w = this.screenToWorld(sx, sy);
    if (Math.abs(w.x) > PLAYABLE_HALF || Math.abs(w.z) > PLAYABLE_HALF) return;
    const pin = this.ctx.sys.world.exploration.addPin(w.x, w.z, this.stamp, this.stampColor);
    if (!pin) {
      this.ctx.sys.ui.notify('Limite de carimbos atingido.', 'warning');
      return;
    }
    this.ctx.sys.audio.play('ui_click');
    this.rebuildIcons();
    this.buildStamps();
  }

  // ---------------------------------------------------------------------------
  // Ícones (DOM sobre o canvas; não escalam com o zoom)
  // ---------------------------------------------------------------------------

  private rebuildIcons() {
    for (const i of this.icons) i.el.remove();
    this.icons = [];
    this.regionLayer.innerHTML = '';
    const { sys } = this.ctx;
    const ex = sys.world.exploration;
    for (const l of LOCATIONS) {
      const known = sys.world.discovered.has(l.id) || !!l.knownAtStart;
      if (l.kind === 'region') {
        if (!known && !ex.isRevealed(l.x, l.z)) continue;
        const r = el('div', 'ui-map-region', this.regionLayer, l.name);
        this.icons.push({ el: r, x: l.x, z: l.z });
        continue;
      }
      if (!known) continue;
      const travel = isTravelPoint(l) && sys.world.discovered.has(l.id);
      const ic = htmlEl(`ui-map-icon loc${travel ? ' travel' : ''}`, locationIcon(l.kind), this.layer, 'button');
      ic.style.color = KIND_COLORS[l.kind];
      ic.title = l.name;
      el('span', 'ui-map-label', ic, l.name);
      ic.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openCard(l);
      });
      this.icons.push({ el: ic, x: l.x, z: l.z });
    }
    for (const pin of ex.pins) {
      const ic = htmlEl('ui-map-icon pin', pinIcon(pin.icon), this.layer, 'button');
      ic.style.color = pin.color;
      ic.title = 'Clique para apagar';
      ic.addEventListener('click', (e) => {
        e.stopPropagation();
        ex.removePin(pin.id);
        this.ctx.sys.audio.play('ui_close');
        this.rebuildIcons();
        this.buildStamps();
      });
      this.icons.push({ el: ic, x: pin.x, z: pin.z });
    }
    const tracked = sys.quests.tracked;
    for (const m of sys.quests.getMarkers()) {
      const ic = htmlEl(`ui-map-icon quest${m.questId === tracked ? ' tracked' : ''}`, questDiamond(m.main), this.layer, 'button');
      el('span', 'ui-map-label', ic, m.label);
      ic.addEventListener('click', (e) => {
        e.stopPropagation();
        sys.quests.setTracked(m.questId);
        this.rebuildIcons();
      });
      this.icons.push({ el: ic, x: m.position.x, z: m.position.z });
    }
    for (const m of sys.quests.getOfferMarkers()) {
      const ic = el('button', 'ui-map-icon offer', this.layer, '!');
      el('span', 'ui-map-label', ic, m.label.replace(/^! /, ''));
      this.icons.push({ el: ic, x: m.position.x, z: m.position.z });
    }
    this.layer.appendChild(this.playerEl);
    this.dirty = true;
  }

  private openCard(l: LocationDef) {
    this.selectedLoc = l.id;
    const c = this.card;
    c.innerHTML = '';
    c.style.display = 'block';
    const head = el('div', 'ui-map-card-head', c);
    htmlEl('ui-map-card-icon', locationIcon(l.kind), head).style.color = KIND_COLORS[l.kind];
    const t = el('div', '', head);
    el('div', 'ui-map-card-name', t, l.name);
    const p = this.ctx.sys.player.entity.position;
    el('div', 'ui-map-card-kind', t, `${KIND_NAMES[l.kind]} · ${fmtDistance(Math.hypot(p.x - l.x, p.z - l.z))}`);
    el('p', 'ui-map-card-desc', c, l.description);
    if (isTravelPoint(l)) {
      const reason = travelBlockReason(this.ctx, l.id);
      const b = button(c, 'Viajar até aqui', () => this.onTravel?.(l.id), 'primary');
      if (reason) {
        b.disabled = true;
        el('p', 'ui-map-card-why', c, reason);
      }
    }
    this.placeCard();
  }

  private placeCard() {
    if (!this.selectedLoc) return;
    const l = LOCATION_BY_ID[this.selectedLoc];
    const r = this.view.getBoundingClientRect();
    const x = r.width / 2 + (l.x - this.cx) * this.scale;
    const y = r.height / 2 + (l.z - this.cz) * this.scale;
    this.card.style.left = `${Math.min(r.width - 300, Math.max(10, x + 24))}px`;
    this.card.style.top = `${Math.min(r.height - 220, Math.max(10, y - 30))}px`;
  }

  // ---------------------------------------------------------------------------
  // Desenho
  // ---------------------------------------------------------------------------

  update(dt: number) {
    // teclado: movimento contínuo
    const sp = (520 / this.scale) * dt;
    const k = this.keys;
    if (k.size) {
      if (k.has('ArrowLeft') || k.has('KeyA')) this.cx -= sp;
      if (k.has('ArrowRight') || k.has('KeyD')) this.cx += sp;
      if (k.has('ArrowUp') || k.has('KeyW')) this.cz -= sp;
      if (k.has('ArrowDown') || k.has('KeyS')) this.cz += sp;
      this.clampView();
      this.dirty = true;
    }
    // solta teclas que não estão mais pressionadas
    for (const code of Array.from(k)) if (!this.ctx.input.isDown(code)) k.delete(code);
    if (this.fog.refresh() || this.fogVersion !== this.ctx.sys.world.exploration.version) {
      this.fogVersion = this.ctx.sys.world.exploration.version;
      this.dirty = true;
    }
    if (this.dirty) this.draw();
  }

  private draw() {
    this.dirty = false;
    const r = this.view.getBoundingClientRect();
    if (r.width < 2) return;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(r.width * this.dpr);
    const H = Math.round(r.height * this.dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    const g = this.g;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0f1220';
    g.fillRect(0, 0, W, H);
    const s = this.scale * this.dpr;
    const ox = W / 2 - (this.cx + WORLD_HALF) * s;
    const oy = H / 2 - (this.cz + WORLD_HALF) * s;
    if (this.base.ready) {
      g.imageSmoothingEnabled = this.scale < 2.2;
      g.drawImage(this.base.canvas, ox, oy, this.base.canvas.width * MAP_M_PER_PX * s, this.base.canvas.height * MAP_M_PER_PX * s);
      g.imageSmoothingEnabled = true;
      g.drawImage(this.fog.canvas, ox, oy, WORLD_SIZE * s, WORLD_SIZE * s);
    } else {
      g.fillStyle = '#c8bfa2';
      g.font = `${18 * this.dpr}px Cinzel, serif`;
      g.textAlign = 'center';
      g.fillText('Desenhando o mapa…', W / 2, H / 2);
    }
    // borda do mundo jogável
    g.strokeStyle = 'rgba(120, 200, 255, 0.45)';
    g.lineWidth = 2 * this.dpr;
    g.setLineDash([10 * this.dpr, 8 * this.dpr]);
    g.strokeRect(ox + (WORLD_HALF - PLAYABLE_HALF) * s, oy + (WORLD_HALF - PLAYABLE_HALF) * s, PLAYABLE_HALF * 2 * s, PLAYABLE_HALF * 2 * s);
    g.setLineDash([]);
    // círculo da área do objetivo rastreado
    const tracked = this.ctx.sys.quests.tracked;
    for (const m of this.ctx.sys.quests.getMarkers()) {
      if (!m.radius || m.radius < 20) continue;
      g.fillStyle = m.questId === tracked ? 'rgba(255, 211, 106, 0.16)' : 'rgba(127, 230, 255, 0.10)';
      g.strokeStyle = m.questId === tracked ? 'rgba(255, 211, 106, 0.7)' : 'rgba(127, 230, 255, 0.45)';
      g.beginPath();
      g.arc(ox + (m.position.x + WORLD_HALF) * s, oy + (m.position.z + WORLD_HALF) * s, m.radius * s, 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }

    // ícones
    const toX = (x: number) => r.width / 2 + (x - this.cx) * this.scale;
    const toY = (z: number) => r.height / 2 + (z - this.cz) * this.scale;
    for (const i of this.icons) {
      const x = toX(i.x);
      const y = toY(i.z);
      const vis = x > -60 && y > -60 && x < r.width + 60 && y < r.height + 60;
      i.el.style.display = vis ? '' : 'none';
      if (vis) i.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)`;
    }
    this.regionLayer.classList.toggle('far', this.scale < 0.7);
    this.layer.classList.toggle('labels', this.scale >= 1.4);
    const p = this.ctx.sys.player.entity.position;
    this.playerEl.style.transform = `translate3d(${toX(p.x).toFixed(1)}px, ${toY(p.z).toFixed(1)}px, 0) translate(-50%, -50%) rotate(${(Math.atan2(Math.sin(this.ctx.sys.player.entity.yaw), -Math.cos(this.ctx.sys.player.entity.yaw)) * 180) / Math.PI}deg)`;
    this.placeCard();
    this.drawInfo();
  }

  private drawInfo() {
    const { sys, clock } = this.ctx;
    const pct = Math.round(sys.world.exploration.fraction() * 100);
    const loc = sys.world.currentLocation;
    const disc = LOCATIONS.filter((l) => l.kind !== 'region' && sys.world.discovered.has(l.id)).length;
    const total = LOCATIONS.filter((l) => l.kind !== 'region').length;
    this.infoEl.innerHTML =
      `<div class="ui-map-where">${escapeHtml(loc?.name ?? 'Terras de Brumafria')}</div>` +
      `<div class="ui-map-time"><span class="w">${weatherIcon(sys.env.weather, clock.isNight())}</span>${fmtTime(clock.hours)} · Dia ${clock.day} · ${escapeHtml(sys.env.weatherLabel())}</div>` +
      `<div class="ui-map-prog"><span>Mapa explorado</span><b>${pct}%</b></div><div class="ui-bar-thin"><i style="width:${pct}%"></i></div>` +
      `<div class="ui-map-prog"><span>Lugares descobertos</span><b>${disc} / ${total}</b></div>`;
  }

  handleKey(code: string): boolean {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].includes(code)) {
      this.keys.add(code);
      return true;
    }
    if (code === 'Equal' || code === 'NumpadAdd') {
      this.zoomAt(1.3, innerWidth / 2, innerHeight / 2);
      return true;
    }
    if (code === 'Minus' || code === 'NumpadSubtract') {
      this.zoomAt(1 / 1.3, innerWidth / 2, innerHeight / 2);
      return true;
    }
    if (code === 'KeyC') {
      this.centerOnPlayer();
      return true;
    }
    return false;
  }
}
