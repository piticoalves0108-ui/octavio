"use client";

/**
 * Materiais da cena 3D.
 * - Estofado: MeshPhysicalMaterial com sheen (veludo) ou clearcoat (corino) e mapa
 *   normal procedural (grão de couro / pelo do veludo), gerado no próprio navegador.
 * - Acabamento: cromado, preto fosco ou dourado.
 * - Laca, louça e espelho: peças fixas das linhas.
 *
 * As trocas de cor e tecido são interpoladas suavemente (useFrame + invalidate),
 * então funcionam com frameloop="demand" sem renderizar quando nada muda.
 */

import { createContext, useContext, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AcabamentoId, TecidoId } from "@/content/catalogo";

/* ------------------------------------------------------------------ */
/* Texturas procedurais (sem arquivos externos)                        */
/* ------------------------------------------------------------------ */

function hash(x: number, y: number, semente: number) {
  let h = x * 374761393 + y * 668265263 + semente * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}

/** Ruído de valor que fecha nas bordas (textura repete sem emenda). */
function ruido(x: number, y: number, periodo: number, semente: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const p = (n: number) => ((n % periodo) + periodo) % periodo;
  const a = hash(p(xi), p(yi), semente);
  const b = hash(p(xi + 1), p(yi), semente);
  const c = hash(p(xi), p(yi + 1), semente);
  const d = hash(p(xi + 1), p(yi + 1), semente);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

type TipoTextura = "couro" | "veludo";

const cacheTexturas = new Map<TipoTextura, THREE.DataTexture>();

function alturaCouro(x: number, y: number) {
  // Grão "pebble" do corino: ruído em crista + variação suave.
  let h = 0;
  h += (1 - Math.abs(ruido(x * 24, y * 24, 24, 1) * 2 - 1)) * 0.6;
  h += (1 - Math.abs(ruido(x * 48, y * 48, 48, 2) * 2 - 1)) * 0.3;
  h += ruido(x * 6, y * 6, 6, 3) * 0.25;
  return h;
}

function alturaVeludo(x: number, y: number) {
  // Pelo fino do veludo, levemente "penteado" na vertical.
  return ruido(x * 96, y * 32, 96, 4) * 0.45 + ruido(x * 160, y * 160, 160, 5) * 0.55;
}

export function texturaNormal(tipo: TipoTextura): THREE.DataTexture {
  const existente = cacheTexturas.get(tipo);
  if (existente) return existente;

  const tamanho = 256;
  const altura = new Float32Array(tamanho * tamanho);
  const fn = tipo === "couro" ? alturaCouro : alturaVeludo;
  for (let j = 0; j < tamanho; j++) {
    for (let i = 0; i < tamanho; i++) {
      altura[j * tamanho + i] = fn(i / tamanho, j / tamanho);
    }
  }
  const dados = new Uint8Array(tamanho * tamanho * 4);
  const forca = tipo === "couro" ? 2.2 : 1.4;
  const at = (i: number, j: number) => altura[((j + tamanho) % tamanho) * tamanho + ((i + tamanho) % tamanho)];
  for (let j = 0; j < tamanho; j++) {
    for (let i = 0; i < tamanho; i++) {
      const dx = (at(i + 1, j) - at(i - 1, j)) * forca;
      const dy = (at(i, j + 1) - at(i, j - 1)) * forca;
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const k = (j * tamanho + i) * 4;
      dados[k] = (-dx * inv * 0.5 + 0.5) * 255;
      dados[k + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      dados[k + 2] = (inv * 0.5 + 0.5) * 255;
      dados[k + 3] = 255;
    }
  }
  const textura = new THREE.DataTexture(dados, tamanho, tamanho, THREE.RGBAFormat);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.repeat.set(tipo === "couro" ? 3 : 4, tipo === "couro" ? 3 : 4);
  textura.magFilter = THREE.LinearFilter;
  textura.minFilter = THREE.LinearMipmapLinearFilter;
  textura.generateMipmaps = true;
  textura.anisotropy = 4;
  textura.needsUpdate = true;
  cacheTexturas.set(tipo, textura);
  return textura;
}

/* ------------------------------------------------------------------ */
/* Parâmetros de cada tecido e acabamento                              */
/* ------------------------------------------------------------------ */

type ParamTecido = {
  roughness: number;
  sheen: number;
  sheenRoughness: number;
  /** Quanto o brilho do sheen puxa para o branco (veludo fica com reflexo claro). */
  sheenClareia: number;
  clearcoat: number;
  clearcoatRoughness: number;
  normalScale: number;
  textura: TipoTextura;
};

const PARAM_TECIDO: Record<TecidoId, ParamTecido> = {
  corino: {
    roughness: 0.42,
    sheen: 0.2,
    sheenRoughness: 0.5,
    sheenClareia: 0.6,
    clearcoat: 0.45,
    clearcoatRoughness: 0.32,
    normalScale: 0.32,
    textura: "couro",
  },
  veludo: {
    roughness: 0.95,
    sheen: 1,
    sheenRoughness: 0.3,
    sheenClareia: 0.5,
    clearcoat: 0,
    clearcoatRoughness: 1,
    normalScale: 0.18,
    textura: "veludo",
  },
};

type ParamMetal = { cor: string; metalness: number; roughness: number };

const PARAM_ACABAMENTO: Record<AcabamentoId, ParamMetal> = {
  cromado: { cor: "#f4f5f7", metalness: 1, roughness: 0.08 },
  "preto-fosco": { cor: "#232327", metalness: 0.45, roughness: 0.55 },
  dourado: { cor: "#e2c588", metalness: 1, roughness: 0.2 },
};

/* ------------------------------------------------------------------ */
/* Conjunto de materiais + contexto                                    */
/* ------------------------------------------------------------------ */

export type Materiais = {
  estofado: THREE.MeshPhysicalMaterial;
  acabamento: THREE.MeshPhysicalMaterial;
  laca: THREE.MeshPhysicalMaterial;
  louca: THREE.MeshPhysicalMaterial;
  espelho: THREE.MeshPhysicalMaterial;
  estrutura: THREE.MeshStandardMaterial;
};

const MateriaisContext = createContext<Materiais | null>(null);

export function useMateriais(): Materiais {
  const m = useContext(MateriaisContext);
  if (!m) throw new Error("useMateriais precisa estar dentro de <ProvedorDeMateriais>");
  return m;
}

const BRANCO = new THREE.Color("#ffffff");

function aproximar(atual: number, alvo: number, k: number) {
  return Math.abs(atual - alvo) < 1e-3 ? alvo : atual + (alvo - atual) * k;
}

function aproximarCor(atual: THREE.Color, alvo: THREE.Color, k: number) {
  const d = Math.abs(atual.r - alvo.r) + Math.abs(atual.g - alvo.g) + Math.abs(atual.b - alvo.b);
  if (d < 1e-3) {
    atual.copy(alvo);
    return false;
  }
  atual.lerp(alvo, k);
  return true;
}

type PropsProvedor = {
  tecido: TecidoId;
  cor: string;
  acabamento: AcabamentoId;
  /** Sem transição (usado nas capturas de pôster). */
  imediato?: boolean;
  children: React.ReactNode;
};

export function ProvedorDeMateriais({ tecido, cor, acabamento, imediato = false, children }: PropsProvedor) {
  const materiais = useMemo<Materiais>(() => {
    const p = PARAM_TECIDO[tecido];
    const m = PARAM_ACABAMENTO[acabamento];
    const corEstofado = new THREE.Color(cor);
    return {
      estofado: new THREE.MeshPhysicalMaterial({
        color: corEstofado,
        roughness: p.roughness,
        sheen: p.sheen,
        sheenRoughness: p.sheenRoughness,
        sheenColor: corEstofado.clone().lerp(BRANCO, p.sheenClareia),
        clearcoat: p.clearcoat,
        clearcoatRoughness: p.clearcoatRoughness,
        normalMap: texturaNormal(p.textura),
        normalScale: new THREE.Vector2(p.normalScale, p.normalScale),
      }),
      acabamento: new THREE.MeshPhysicalMaterial({
        color: m.cor,
        metalness: m.metalness,
        roughness: m.roughness,
        clearcoat: 0.2,
        clearcoatRoughness: 0.2,
      }),
      laca: new THREE.MeshPhysicalMaterial({
        color: "#f3efea",
        roughness: 0.32,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
      }),
      louca: new THREE.MeshPhysicalMaterial({
        color: "#f6f4f1",
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        side: THREE.DoubleSide,
      }),
      espelho: new THREE.MeshPhysicalMaterial({
        color: "#d9dee2",
        metalness: 1,
        roughness: 0.03,
      }),
      estrutura: new THREE.MeshStandardMaterial({ color: "#2b2b2f", roughness: 0.7, metalness: 0.2 }),
    };
    // Os materiais são criados uma vez; as trocas seguintes são interpoladas abaixo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      Object.values(materiais).forEach((mat) => mat.dispose());
    };
  }, [materiais]);

  const alvo = useMemo(() => {
    const p = PARAM_TECIDO[tecido];
    const m = PARAM_ACABAMENTO[acabamento];
    const corEstofado = new THREE.Color(cor);
    return {
      tecido: p,
      cor: corEstofado,
      sheenColor: corEstofado.clone().lerp(BRANCO, p.sheenClareia),
      metal: m,
      corMetal: new THREE.Color(m.cor),
    };
  }, [tecido, cor, acabamento]);

  // O mapa normal troca na hora (a diferença é sutil); o resto é interpolado.
  useEffect(() => {
    const est = materiais.estofado;
    est.normalMap = texturaNormal(alvo.tecido.textura);
    est.needsUpdate = true;
  }, [alvo, materiais]);

  useFrame((state, dt) => {
    const k = imediato ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * 9);
    const est = materiais.estofado;
    const met = materiais.acabamento;
    let mudando = false;
    mudando = aproximarCor(est.color, alvo.cor, k) || mudando;
    mudando = aproximarCor(est.sheenColor, alvo.sheenColor, k) || mudando;
    mudando = aproximarCor(met.color, alvo.corMetal, k) || mudando;

    const pares: [
      THREE.MeshPhysicalMaterial,
      "roughness" | "sheen" | "sheenRoughness" | "clearcoat" | "clearcoatRoughness" | "metalness",
      number,
    ][] = [
      [est, "roughness", alvo.tecido.roughness],
      [est, "sheen", alvo.tecido.sheen],
      [est, "sheenRoughness", alvo.tecido.sheenRoughness],
      [est, "clearcoat", alvo.tecido.clearcoat],
      [est, "clearcoatRoughness", alvo.tecido.clearcoatRoughness],
      [met, "metalness", alvo.metal.metalness],
      [met, "roughness", alvo.metal.roughness],
    ];
    for (const [mat, prop, valor] of pares) {
      const novo = aproximar(mat[prop], valor, k);
      if (novo !== mat[prop]) {
        mat[prop] = novo;
        mudando = true;
      }
    }
    const ns = aproximar(est.normalScale.x, alvo.tecido.normalScale, k);
    if (ns !== est.normalScale.x) {
      est.normalScale.set(ns, ns);
      mudando = true;
    }
    if (mudando) state.invalidate();
  });

  return <MateriaisContext.Provider value={materiais}>{children}</MateriaisContext.Provider>;
}

/* Esmaltes da bancada de manicure (vidro colorido). Criados uma vez e reaproveitados. */
let esmaltes: THREE.MeshPhysicalMaterial[] | null = null;
export function materiaisDeEsmalte() {
  if (!esmaltes) {
    esmaltes = ["#c23b4b", "#e8a3a8", "#d9c3b0", "#7a1f35", "#cbb089", "#f1d6d0", "#2a2a2e", "#b0526a"].map(
      (cor) => new THREE.MeshPhysicalMaterial({ color: cor, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }),
    );
  }
  return esmaltes;
}
