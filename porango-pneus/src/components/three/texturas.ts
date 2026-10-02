import * as THREE from "three";
import { A_OMBRO, LARGURA_BANDA, R_OMBRO, R_TALAO, R_TEXTO, SULCOS } from "./geometria";

/**
 * TEXTURAS GERADAS EM CANVAS (nada baixado, nada de licença de terceiros).
 * - Banda: mapa de altura -> normal map (blocos em V e lamelas).
 * - Pegada: o mesmo desenho, usado para carimbar a marca no asfalto.
 * - Flanco: letras da medida e da marca + mapa emissivo para o destaque.
 */

/** Quantas vezes o ladrilho da banda se repete na volta do pneu. */
export const REPETICOES_BANDA = 12;
/** Comprimento (em unidades de mundo) de um ladrilho da banda no chão. */
export const COMPRIMENTO_LADRILHO = (Math.PI * 2) / REPETICOES_BANDA;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** Desenha o padrão da banda (branco = borracha, preto = corte). */
function desenharPadraoBanda(ctx: CanvasRenderingContext2D, w: number, h: number, comSulcos: boolean) {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#000";
  const passos = 4;
  const passo = w / passos;
  const vSulco = SULCOS.map((a) => (a + A_OMBRO) / LARGURA_BANDA);
  const larguraSulco = (0.032 / LARGURA_BANDA) * h;

  for (let k = -1; k <= passos; k++) {
    const x0 = k * passo;
    // Ombros: cortes laterais inclinados, em V (direcional)
    for (const lado of [0, 1]) {
      const s = lado === 0 ? 1 : -1;
      const vIni = lado === 0 ? 0 : 1;
      const vFim = lado === 0 ? vSulco[0] - 0.035 : vSulco[3] + 0.035;
      ctx.beginPath();
      ctx.moveTo(x0, vIni * h);
      ctx.lineTo(x0 + passo * 0.16, vIni * h);
      ctx.lineTo(x0 + passo * 0.16 + s * 0 + passo * 0.28, vFim * h);
      ctx.lineTo(x0 + passo * 0.28, vFim * h);
      ctx.closePath();
      ctx.fill();
    }
    // Nervuras intermediárias: cortes diagonais parciais
    for (const [a, b, dir] of [
      [vSulco[0] + 0.04, vSulco[1] - 0.04, 1],
      [vSulco[2] + 0.04, vSulco[3] - 0.04, -1],
    ] as const) {
      ctx.beginPath();
      const xa = x0 + passo * 0.5;
      ctx.moveTo(xa, (dir > 0 ? a : b) * h);
      ctx.lineTo(xa + passo * 0.11, (dir > 0 ? a : b) * h);
      ctx.lineTo(xa + passo * 0.36, (dir > 0 ? b : a) * h);
      ctx.lineTo(xa + passo * 0.25, (dir > 0 ? b : a) * h);
      ctx.closePath();
      ctx.fill();
    }
    // Nervura central: lamelas finas em zigue-zague
    ctx.lineWidth = Math.max(1.5, h * 0.008);
    ctx.strokeStyle = "#000";
    for (const off of [0.15, 0.65]) {
      const xs = x0 + passo * off;
      ctx.beginPath();
      ctx.moveTo(xs, (vSulco[1] + 0.03) * h);
      ctx.lineTo(xs + passo * 0.06, 0.5 * h);
      ctx.lineTo(xs, (vSulco[2] - 0.03) * h);
      ctx.stroke();
    }
  }
  if (comSulcos) {
    for (const v of vSulco) ctx.fillRect(0, v * h - larguraSulco / 2, w, larguraSulco);
  }
}

/** Converte altura (canal R) em normal map por Sobel, com repetição horizontal. */
function alturaParaNormal(origem: ImageData, forca: number): ImageData {
  const { width: w, height: h, data } = origem;
  const alt = new Float32Array(w * h);
  // leve desfoque 3x3 para a borda do corte ficar arredondada
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let soma = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = (x + dx + w) % w;
          soma += data[(yy * w + xx) * 4];
        }
      }
      alt[y * w + x] = soma / (9 * 255);
    }
  }
  const saida = new ImageData(w, h);
  const A = (x: number, y: number) => alt[Math.min(h - 1, Math.max(0, y)) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const gx = A(x + 1, y - 1) + 2 * A(x + 1, y) + A(x + 1, y + 1) - A(x - 1, y - 1) - 2 * A(x - 1, y) - A(x - 1, y + 1);
      const gy = A(x - 1, y + 1) + 2 * A(x, y + 1) + A(x + 1, y + 1) - A(x - 1, y - 1) - 2 * A(x, y - 1) - A(x + 1, y - 1);
      let nx = -gx * forca;
      let ny = -gy * forca;
      let nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l;
      ny /= l;
      nz /= l;
      const i = (y * w + x) * 4;
      saida.data[i] = (nx * 0.5 + 0.5) * 255;
      saida.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      saida.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      saida.data[i + 3] = 255;
    }
  }
  return saida;
}

export function criarTexturasBanda(qualidade: "alta" | "baixa") {
  const w = qualidade === "alta" ? 512 : 256;
  const h = w / 2;
  const c = canvas(w, h);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  desenharPadraoBanda(ctx, w, h, false);
  const normal = alturaParaNormal(ctx.getImageData(0, 0, w, h), 2.2);
  ctx.putImageData(normal, 0, 0);
  const normalMap = new THREE.CanvasTexture(c);
  normalMap.flipY = false;
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.ClampToEdgeWrapping;
  normalMap.repeat.set(REPETICOES_BANDA, 1);
  normalMap.anisotropy = 8;
  normalMap.colorSpace = THREE.NoColorSpace;

  // Pegada para o carimbo no asfalto (com sulcos e bordas suaves)
  const cp = canvas(256, 128);
  const cpx = cp.getContext("2d")!;
  desenharPadraoBanda(cpx, 256, 128, true);
  const grad = cpx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.08, "rgba(0,0,0,0)");
  grad.addColorStop(0.92, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,1)");
  cpx.fillStyle = grad;
  cpx.fillRect(0, 0, 256, 128);
  const pegada = new THREE.CanvasTexture(cp);
  pegada.flipY = false;
  pegada.wrapS = THREE.RepeatWrapping;
  pegada.colorSpace = THREE.NoColorSpace;

  return { normalMap, pegada };
}

/* -------------------------------------------------------------------------- */
/* FLANCO                                                                      */
/* -------------------------------------------------------------------------- */

export type ParteTexto = { texto: string; destaque: number | null };

/** Fonte do título (next/font gera um nome próprio; lemos da variável CSS). */
function familiaTitulo() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-chakra").trim();
  return v || "sans-serif";
}

/**
 * Texturas do flanco de fora (lado B). Canvas em "faixa desenrolada":
 * x = volta do pneu (u), y = raio (topo = ombro). Assim o texto escrito reto
 * no canvas vira texto curvo acompanhando o pneu.
 */
export class TexturaFlanco {
  readonly cor: THREE.CanvasTexture;
  readonly emissivo: THREE.CanvasTexture;
  private ctxCor: CanvasRenderingContext2D;
  private ctxEmi: CanvasRenderingContext2D;
  private w: number;
  private h: number;
  /** u (0..1) do centro do texto da medida. */
  uCentro = 0.25;
  private ultimo = "";

  constructor(qualidade: "alta" | "baixa") {
    this.w = qualidade === "alta" ? 4096 : 2048;
    this.h = this.w / 8;
    const c1 = canvas(this.w, this.h);
    const c2 = canvas(this.w, this.h);
    this.ctxCor = c1.getContext("2d")!;
    this.ctxEmi = c2.getContext("2d")!;
    this.cor = new THREE.CanvasTexture(c1);
    this.emissivo = new THREE.CanvasTexture(c2);
    for (const t of [this.cor, this.emissivo]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.wrapS = THREE.RepeatWrapping;
    }
  }

  /** y do canvas para um raio do flanco. */
  private y(r: number) {
    return (1 - (r - R_TALAO) / (R_OMBRO - R_TALAO)) * this.h;
  }
  /** Compensa a distorção u/v para a letra não sair esticada. */
  private escalaX(r: number) {
    const pxU = this.w / (2 * Math.PI * r);
    const pxV = this.h / (R_OMBRO - R_TALAO);
    return pxU / pxV;
  }

  /** Escreve um texto centrado em u (0..1) no raio r. */
  private escrever(
    ctx: CanvasRenderingContext2D,
    partes: { texto: string; estilo: string }[],
    u: number,
    r: number,
    tamanho: number,
    espacamento = 0,
  ) {
    const fam = familiaTitulo();
    ctx.save();
    ctx.font = `700 ${tamanho}px ${fam}`;
    ctx.textBaseline = "middle";
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${espacamento}px`;
    const larguras = partes.map((p) => ctx.measureText(p.texto).width);
    const total = larguras.reduce((a, b) => a + b, 0);
    const sx = this.escalaX(r);
    const xc = u * this.w;
    const y = this.y(r);
    // desenha 3 vezes (x-w, x, x+w) para o texto atravessar a emenda da textura
    for (const desloc of [-this.w, 0, this.w]) {
      ctx.save();
      ctx.translate(xc + desloc, y);
      ctx.scale(sx, 1);
      let x = -total / 2;
      partes.forEach((p, i) => {
        if (p.estilo !== "transparent") {
          ctx.fillStyle = p.estilo;
          ctx.fillText(p.texto, x, 0);
        }
        x += larguras[i];
      });
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Redesenha o flanco. `partes` é a medida quebrada em pedaços; `destaque`
   * diz qual pedaço acende em amarelo (mapa emissivo).
   */
  desenhar(partes: string[], destaque: number | null, rotulos: number[] = [], emissivoCheio = false) {
    const chave = `${partes.join("|")}#${destaque}#${this.uCentro.toFixed(4)}#${emissivoCheio}`;
    if (chave === this.ultimo) return;
    this.ultimo = chave;
    const { ctxCor: c, ctxEmi: e, w, h } = this;

    // Base: borracha com anéis de acabamento
    c.fillStyle = "#16171a";
    c.fillRect(0, 0, w, h);
    const anel = (r0: number, r1: number, cor: string) => {
      c.fillStyle = cor;
      c.fillRect(0, this.y(r1), w, this.y(r0) - this.y(r1));
    };
    anel(0.6, 0.655, "#121315");
    anel(0.655, 0.662, "#232428");
    anel(0.93, 0.936, "#232428");
    // serrilhado fino perto do ombro
    c.fillStyle = "#1d1e22";
    for (let x = 0; x < w; x += 6) c.fillRect(x, this.y(0.97), 2, this.y(0.94) - this.y(0.97));

    e.fillStyle = emissivoCheio ? "#5a5a5a" : "#000";
    e.fillRect(0, 0, w, h);

    const u = this.uCentro;
    const tam = h * 0.2;
    const corTexto = "#c9c9c3";
    // Medida
    const pecas = partes.map((t) => ({ texto: t, estilo: corTexto }));
    this.escrever(c, pecas, u, R_TEXTO, tam, tam * 0.04);
    const pecasEmi = partes.map((t, i) => ({
      texto: t,
      estilo: rotulos.indexOf(i) === destaque ? "#ffffff" : "transparent",
    }));
    if (destaque !== null) this.escrever(e, pecasEmi, u, R_TEXTO, tam, tam * 0.04);

    // Textos de apoio (marca e construção)
    this.escrever(c, [{ texto: "PORANGO PNEUS", estilo: "#d8d8d2" }], (u + 0.5) % 1, 0.8, h * 0.26, h * 0.03);
    this.escrever(c, [{ texto: "RADIAL  TUBELESS", estilo: "#8d8e92" }], (u + 0.17) % 1, 0.735, h * 0.1, h * 0.02);
    this.escrever(c, [{ texto: "RADIAL  TUBELESS", estilo: "#8d8e92" }], (u + 0.83) % 1, 0.735, h * 0.1, h * 0.02);
    for (let k = 0; k < 6; k++) {
      this.escrever(c, [{ texto: "▲ TWI", estilo: "#6f7074" }], (u + 0.08 + k / 6) % 1, 0.9, h * 0.075, h * 0.01);
    }

    this.cor.needsUpdate = true;
    this.emissivo.needsUpdate = true;
  }
}

/** Flanco de dentro (lado A): só anéis, sem letras. */
export function criarTexturaFlancoInterno() {
  const c = canvas(512, 64);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#16171a";
  ctx.fillRect(0, 0, 512, 64);
  ctx.fillStyle = "#121315";
  ctx.fillRect(0, 54, 512, 10);
  ctx.fillStyle = "#222327";
  ctx.fillRect(0, 52, 512, 1.5);
  ctx.fillRect(0, 9, 512, 1.5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* -------------------------------------------------------------------------- */
/* RODA E CAMADAS                                                              */
/* -------------------------------------------------------------------------- */

/** Cintas de aço: trama cruzada. */
export function criarTexturaCinta() {
  const c = canvas(256, 64);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#7c8086";
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = "#c3c7cc";
  ctx.lineWidth = 1.4;
  for (let x = -64; x < 320; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 26, 64);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(60,63,68,0.7)";
  for (let x = -64; x < 320; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x + 26, 0);
    ctx.lineTo(x, 64);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(6, 1);
  return t;
}

/** Carcaça: cordonéis radiais. */
export function criarTexturaCarcaca() {
  const c = canvas(512, 32);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3a3b41";
  ctx.fillRect(0, 0, 512, 32);
  ctx.fillStyle = "#5b5d64";
  for (let x = 0; x < 512; x += 4) ctx.fillRect(x, 0, 1.6, 32);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}
