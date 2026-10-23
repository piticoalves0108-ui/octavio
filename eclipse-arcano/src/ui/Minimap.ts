/**
 * Minimapa circular (canto inferior direito): gira com a câmera, mostra o mapa base
 * com a névoa de exploração, locais descobertos, objetivos de missão (presos à borda
 * quando longe), marcadores do jogador, inimigos alertas e o norte. Acima dele ficam
 * a hora, o clima e o nome do lugar.
 */
import * as THREE from 'three';
import type { GameContext } from '../core/context';
import { LOCATIONS, WORLD_HALF, WORLD_SIZE, type LocationKind } from '../data/world';
import { el, setText, show, fmtTime } from './dom';
import { locationIcon, pinIcon, questDiamond, weatherIcon, playerArrow } from './icons';
import { MapBaseRenderer, FogRenderer, MAP_M_PER_PX, FOG_PX, svgToImage } from './mapRender';

/** Raio mostrado no minimapa (m). */
const RANGE = 140;
const SIZE = 188;

const LOC_COLORS: Record<LocationKind, string> = {
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

export class Minimap {
  readonly root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private g!: CanvasRenderingContext2D;
  private dpr = 1;
  private clockEl: HTMLElement;
  private weatherEl: HTMLElement;
  private weatherKey = '';
  private placeEl: HTMLElement;
  private northEl: HTMLElement;
  private locImgs = new Map<string, HTMLImageElement>();
  private pinImgs = new Map<string, HTMLImageElement>();
  private questImg = { main: svgToImage(questDiamond(true)), side: svgToImage(questDiamond(false)) };
  private arrowImg = svgToImage(playerArrow());
  private fwd = new THREE.Vector3();
  private timer = 0;

  constructor(private ctx: GameContext, parent: HTMLElement, private base: MapBaseRenderer, private fog: FogRenderer) {
    this.root = el('div', 'hud-minimap', parent);
    const info = el('div', 'hud-mm-info', this.root);
    this.weatherEl = el('div', 'hud-mm-weather', info);
    this.clockEl = el('div', 'hud-mm-clock', info);
    const ring = el('div', 'hud-mm-ring', this.root);
    this.canvas = el('canvas', 'hud-mm-canvas', ring);
    this.northEl = el('div', 'hud-mm-north', ring, 'N');
    this.placeEl = el('div', 'hud-mm-place', this.root);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  private resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(SIZE * this.dpr);
    this.canvas.height = Math.round(SIZE * this.dpr);
    this.g = this.canvas.getContext('2d')!;
  }

  private locImg(kind: LocationKind): HTMLImageElement {
    let img = this.locImgs.get(kind);
    if (!img) {
      img = svgToImage(locationIcon(kind), LOC_COLORS[kind]);
      this.locImgs.set(kind, img);
    }
    return img;
  }

  private pinImg(icon: string, color: string): HTMLImageElement {
    const k = `${icon}|${color}`;
    let img = this.pinImgs.get(k);
    if (!img) {
      img = svgToImage(pinIcon(icon as 'pin'), color);
      this.pinImgs.set(k, img);
    }
    return img;
  }

  update(dt: number) {
    const ctx = this.ctx;
    const visible = ctx.settings.data.showMinimap && (ctx.state === 'playing' || ctx.state === 'dead');
    show(this.root, visible);
    if (!visible) return;
    // 30 quadros/s bastam para o minimapa
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 1 / 30;
    this.updateInfo();
    this.draw();
  }

  private updateInfo() {
    const { sys, clock } = this.ctx;
    setText(this.clockEl, fmtTime(clock.hours));
    const night = clock.isNight();
    const wk = `${sys.env.weather}|${night}`;
    if (wk !== this.weatherKey) {
      this.weatherKey = wk;
      this.weatherEl.innerHTML = weatherIcon(sys.env.weather, night);
      this.weatherEl.title = sys.env.weatherLabel();
    }
    const loc = sys.world.currentLocation;
    setText(this.placeEl, loc ? loc.name : (BIOME_NAME[sys.world.biomeAt(sys.player.position.x, sys.player.position.z)] ?? ''));
  }

  private draw() {
    const { sys } = this.ctx;
    const g = this.g;
    const W = this.canvas.width;
    const cx = W / 2;
    const scale = (W / 2) / RANGE; // px do canvas por metro
    const p = sys.player.entity.position;
    sys.camera.getForward(this.fwd);
    const theta = Math.atan2(this.fwd.x, -this.fwd.z);

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, W);
    g.save();
    g.beginPath();
    g.arc(cx, cx, cx, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#16192a';
    g.fillRect(0, 0, W, W);

    g.translate(cx, cx);
    g.rotate(-theta);
    if (this.base.ready) {
      const k = scale * MAP_M_PER_PX;
      g.imageSmoothingEnabled = true;
      g.drawImage(this.base.canvas, -(p.x + WORLD_HALF) * scale, -(p.z + WORLD_HALF) * scale, this.base.canvas.width * k, this.base.canvas.height * k);
      this.fog.refresh();
      const fk = (scale * WORLD_SIZE) / FOG_PX;
      g.drawImage(this.fog.canvas, -(p.x + WORLD_HALF) * scale, -(p.z + WORLD_HALF) * scale, this.fog.canvas.width * fk, this.fog.canvas.height * fk);
    }
    g.restore();

    const cos = Math.cos(-theta);
    const sin = Math.sin(-theta);
    const r = cx - 6 * this.dpr;
    const toScreen = (x: number, z: number, clampEdge: boolean): [number, number, boolean] => {
      const dx = (x - p.x) * scale;
      const dz = (z - p.z) * scale;
      let sx = dx * cos - dz * sin;
      let sy = dx * sin + dz * cos;
      const d = Math.hypot(sx, sy);
      let inside = d <= r;
      if (!inside && clampEdge) {
        sx = (sx / d) * r;
        sy = (sy / d) * r;
        inside = true;
      }
      return [cx + sx, cx + sy, inside];
    };
    const icon = (img: HTMLImageElement, x: number, y: number, size: number, alpha = 1) => {
      if (!img.complete || !img.naturalWidth) return;
      g.globalAlpha = alpha;
      g.drawImage(img, x - size / 2, y - size / 2, size, size);
      g.globalAlpha = 1;
    };

    const s = 18 * this.dpr;
    // locais descobertos
    for (const l of LOCATIONS) {
      if (l.kind === 'region' || !(sys.world.discovered.has(l.id) || l.knownAtStart)) continue;
      const [x, y, ok] = toScreen(l.x, l.z, false);
      if (ok) icon(this.locImg(l.kind), x, y, s, 0.95);
    }
    // marcadores do jogador
    for (const pin of sys.world.exploration.pins) {
      const [x, y, ok] = toScreen(pin.x, pin.z, true);
      if (ok) icon(this.pinImg(pin.icon, pin.color), x, y - s * 0.3, s * 0.9);
    }
    // inimigos alertas por perto
    g.fillStyle = '#ff4a4a';
    for (const e of sys.ai.enemies) {
      if (!e.alive || (e.state !== 'combat' && e.state !== 'alert' && e.state !== 'search')) continue;
      const [x, y, ok] = toScreen(e.position.x, e.position.z, false);
      if (!ok) continue;
      g.beginPath();
      g.arc(x, y, 3.2 * this.dpr, 0, Math.PI * 2);
      g.fill();
    }
    // objetivos de missão
    if (this.ctx.settings.data.questMarkers) {
      const tracked = sys.quests.tracked;
      for (const m of sys.quests.getMarkers()) {
        const [x, y] = toScreen(m.position.x, m.position.z, m.questId === tracked);
        const d = Math.hypot(x - cx, y - cx);
        if (d > r + 1) continue;
        icon(m.main ? this.questImg.main : this.questImg.side, x, y, s * (m.questId === tracked ? 1 : 0.8));
      }
      for (const m of sys.quests.getOfferMarkers()) {
        const [x, y, ok] = toScreen(m.position.x, m.position.z, false);
        if (!ok) continue;
        g.font = `bold ${14 * this.dpr}px Manrope, sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.lineWidth = 3 * this.dpr;
        g.strokeStyle = '#0b0a14';
        g.strokeText('!', x, y);
        g.fillStyle = '#ffd36a';
        g.fillText('!', x, y);
      }
    }
    // jogador (seta para onde ele olha, relativa à câmera)
    const yaw = sys.player.entity.yaw;
    const phi = Math.atan2(Math.sin(yaw), -Math.cos(yaw));
    if (this.arrowImg.complete) {
      g.save();
      g.translate(cx, cx);
      g.rotate(phi - theta);
      g.drawImage(this.arrowImg, -9 * this.dpr, -10 * this.dpr, 18 * this.dpr, 18 * this.dpr);
      g.restore();
    }
    // cone de visão
    g.save();
    g.translate(cx, cx);
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, 60 * this.dpr);
    grad.addColorStop(0, 'rgba(255,255,255,0.18)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, 60 * this.dpr, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    g.closePath();
    g.fill();
    g.restore();

    // norte
    const nx = Math.sin(-theta);
    const ny = -Math.cos(-theta);
    const R = SIZE / 2 - 2;
    this.northEl.style.transform = `translate(${(SIZE / 2 + nx * R).toFixed(1)}px, ${(SIZE / 2 + ny * R).toFixed(1)}px) translate(-50%, -50%)`;
  }
}

const BIOME_NAME: Record<string, string> = {
  meadow: 'Campos',
  forest: 'Floresta',
  swamp: 'Pântano',
  ruins: 'Ruínas',
  mountain: 'Montanhas',
  shore: 'Margem',
  village: 'Vila',
  rocky: 'Desfiladeiro',
  corrupted: 'Terra Corrompida',
};

