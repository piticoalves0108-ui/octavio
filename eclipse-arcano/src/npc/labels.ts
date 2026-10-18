import * as THREE from 'three';

/**
 * Placas de nome e balões de fala dos NPCs como sprites com textura de canvas
 * (desenhados só quando o texto muda). Criados sob demanda (só NPCs que o
 * jogador chega perto) e escondidos à distância.
 */
export type QuestMark = '' | '!' | '?';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function makeSprite(w: number, h: number, scaleX: number, scaleY: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: true, fog: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(scaleX, scaleY, 1);
  sprite.renderOrder = 20;
  sprite.frustumCulled = true;
  return { canvas, tex, mat, sprite, ctx: canvas.getContext('2d') };
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/** Placa de nome (nome + título + marcador de missão). */
export class NamePlate {
  readonly sprite: THREE.Sprite;
  private s: ReturnType<typeof makeSprite>;
  private mark: QuestMark | null = null;
  private hostile = false;

  constructor(
    private name: string,
    private title: string,
  ) {
    this.s = makeSprite(512, 160, 2.2, 0.6875);
    this.sprite = this.s.sprite;
    this.sprite.name = 'npc-placa';
    this.draw('', false);
  }

  /** Redesenha só se algo mudou. */
  set(mark: QuestMark, hostile: boolean) {
    if (mark === this.mark && hostile === this.hostile) return;
    this.draw(mark, hostile);
  }

  private draw(mark: QuestMark, hostile: boolean) {
    this.mark = mark;
    this.hostile = hostile;
    const g = this.s.ctx;
    if (!g) return;
    const W = this.s.canvas.width;
    g.clearRect(0, 0, W, this.s.canvas.height);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // marcador de missão
    if (mark) {
      g.font = `bold 64px ${FONT}`;
      g.lineWidth = 8;
      g.strokeStyle = 'rgba(20,14,6,0.85)';
      g.strokeText(mark, W / 2, 34);
      g.fillStyle = mark === '!' ? '#ffd24a' : '#cfe8ff';
      g.fillText(mark, W / 2, 34);
    }
    g.font = `bold 46px ${FONT}`;
    g.lineWidth = 7;
    g.strokeStyle = 'rgba(0,0,0,0.75)';
    g.strokeText(this.name, W / 2, 98);
    g.fillStyle = hostile ? '#ff7a6a' : '#f4ecd8';
    g.fillText(this.name, W / 2, 98);
    if (this.title) {
      g.font = `italic 28px ${FONT}`;
      g.lineWidth = 5;
      g.strokeText(this.title, W / 2, 138);
      g.fillStyle = '#cbbd9a';
      g.fillText(this.title, W / 2, 138);
    }
    this.s.tex.needsUpdate = true;
  }

  dispose() {
    this.s.tex.dispose();
    this.s.mat.dispose();
    this.sprite.removeFromParent();
  }
}

/** Balão de fala (texto curto quebrado em até 3 linhas). */
export class SpeechBubble {
  readonly sprite: THREE.Sprite;
  private s: ReturnType<typeof makeSprite>;
  /** Tempo restante visível (s). */
  timeLeft = 0;
  private total = 1;

  constructor() {
    this.s = makeSprite(512, 192, 2.6, 0.975);
    this.sprite = this.s.sprite;
    this.sprite.name = 'npc-balao';
    this.sprite.visible = false;
  }

  show(text: string, seconds: number) {
    const g = this.s.ctx;
    this.timeLeft = seconds;
    this.total = seconds;
    this.sprite.visible = true;
    this.s.mat.opacity = 1;
    if (!g) return;
    const W = this.s.canvas.width;
    const H = this.s.canvas.height;
    g.clearRect(0, 0, W, H);
    g.font = `30px ${FONT}`;
    // quebra de linha simples
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const tryLine = line ? `${line} ${w}` : w;
      if (g.measureText(tryLine).width > W - 60 && line) {
        lines.push(line);
        line = w;
      } else line = tryLine;
    }
    if (line) lines.push(line);
    if (lines.length > 3) {
      lines.length = 3;
      lines[2] = `${lines[2].replace(/\s*\S*$/, '')}…`;
    }
    let maxW = 0;
    for (const l of lines) maxW = Math.max(maxW, g.measureText(l).width);
    const bw = Math.min(W - 8, maxW + 44);
    const bh = lines.length * 36 + 26;
    const bx = (W - bw) / 2;
    const by = H - bh - 26;
    g.fillStyle = 'rgba(250,244,228,0.94)';
    g.strokeStyle = 'rgba(60,44,24,0.9)';
    g.lineWidth = 4;
    roundRect(g, bx, by, bw, bh, 18);
    g.fill();
    g.stroke();
    // rabicho
    g.beginPath();
    g.moveTo(W / 2 - 14, by + bh - 2);
    g.lineTo(W / 2, H - 6);
    g.lineTo(W / 2 + 14, by + bh - 2);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(W / 2 - 14, by + bh);
    g.lineTo(W / 2, H - 6);
    g.lineTo(W / 2 + 14, by + bh);
    g.stroke();
    g.fillStyle = '#2a2016';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((l, i) => g.fillText(l, W / 2, by + 13 + 18 + i * 36));
    this.s.tex.needsUpdate = true;
  }

  /** Avança o tempo; some com fade nos últimos 0,4 s. */
  update(dt: number) {
    if (this.timeLeft <= 0) return;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.sprite.visible = false;
      return;
    }
    this.s.mat.opacity = Math.min(1, this.timeLeft / 0.4, (this.total - this.timeLeft) / 0.15 + 0.2);
  }

  hide() {
    this.timeLeft = 0;
    this.sprite.visible = false;
  }

  dispose() {
    this.s.tex.dispose();
    this.s.mat.dispose();
    this.sprite.removeFromParent();
  }
}
