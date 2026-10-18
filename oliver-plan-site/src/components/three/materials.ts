"use client";

import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { getFinish, type Finish } from "@/data/finishes";
import { getTextureCanvas, textureWorldSize } from "@/lib/textures";

/**
 * Materiais PBR criados a partir do catálogo de acabamentos.
 * As geometrias do kit têm UV em metros, então a textura mantém a escala real
 * em qualquer tamanho de peça (um veio de madeira nunca fica "esticado").
 */

const cache = new Map<string, THREE.Material>();

function makeMap(f: Finish) {
  const tex = new THREE.CanvasTexture(getTextureCanvas(f.texture));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
  tex.anisotropy = 8;
  const [w, h] = textureWorldSize(f.texture);
  tex.repeat.set(1 / w, 1 / h);
  return tex;
}

export function createFinishMaterial(f: Finish): THREE.Material {
  const cached = cache.get(f.id);
  if (cached) return cached;

  let mat: THREE.Material;
  if (f.kind === "vidro") {
    mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(f.hex),
      map: f.texture.type === "fluted" ? makeMap(f) : null,
      roughness: f.roughness,
      metalness: f.metalness ?? 0.1,
      transparent: true,
      opacity: f.opacity ?? 0.5,
      envMapIntensity: 1.6,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      depthWrite: false,
    });
  } else if (f.kind === "pedra") {
    mat = new THREE.MeshPhysicalMaterial({
      map: makeMap(f),
      roughness: f.roughness,
      clearcoat: f.roughness < 0.3 ? 0.7 : 0.15,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.1,
    });
  } else {
    mat = new THREE.MeshStandardMaterial({
      map: makeMap(f),
      roughness: f.roughness,
      metalness: f.metalness ?? 0,
      envMapIntensity: f.kind === "metal" ? 1.4 : 0.9,
    });
  }
  mat.name = f.id;
  cache.set(f.id, mat);
  return mat;
}

/** Materiais utilitários (não fazem parte do catálogo) */
const basic = new Map<string, THREE.Material>();
export function utilMaterial(key: "wall" | "plaster" | "slab" | "glassDark" | "led" | "sky" | "white" | "ceramic" | "terracotta" | "leaf" | "black" | "cable" | "screen" | "fruit"): THREE.Material {
  const hit = basic.get(key);
  if (hit) return hit;
  let m: THREE.Material;
  switch (key) {
    case "wall":
      m = new THREE.MeshStandardMaterial({ color: "#efe8de", roughness: 0.95 });
      break;
    case "plaster":
      m = new THREE.MeshStandardMaterial({ color: "#e4dccf", roughness: 1 });
      break;
    case "slab":
      m = new THREE.MeshStandardMaterial({ color: "#d9d0c4", roughness: 0.9 });
      break;
    case "glassDark":
      m = new THREE.MeshPhysicalMaterial({ color: "#111111", roughness: 0.05, metalness: 0.2, clearcoat: 1, envMapIntensity: 2 });
      break;
    case "screen":
      m = new THREE.MeshPhysicalMaterial({ color: "#0b0b0c", roughness: 0.12, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.2 });
      break;
    case "led":
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd8a6").multiplyScalar(2.2), toneMapped: false });
      break;
    case "sky":
      m = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff6e8").multiplyScalar(1.6), toneMapped: false });
      break;
    case "white":
      m = new THREE.MeshStandardMaterial({ color: "#f7f3ec", roughness: 0.5 });
      break;
    case "ceramic":
      m = new THREE.MeshStandardMaterial({ color: "#cfc6b8", roughness: 0.75 });
      break;
    case "terracotta":
      m = new THREE.MeshStandardMaterial({ color: "#b8694a", roughness: 0.85 });
      break;
    case "leaf":
      m = new THREE.MeshStandardMaterial({ color: "#56664a", roughness: 0.7, side: THREE.DoubleSide });
      break;
    case "fruit":
      m = new THREE.MeshStandardMaterial({ color: "#d98a3d", roughness: 0.55 });
      break;
    case "cable":
      m = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.6 });
      break;
    default:
      m = new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.5, metalness: 0.6 });
  }
  basic.set(key, m);
  return m;
}

// ——— Slots: permitem trocar o acabamento de um grupo de peças em tempo real ———

export type Slot = "front" | "base" | "wood" | "stone" | "glass" | "metal" | "fabric" | "carcass";

export type SlotMap = Record<Slot, string>;

export const defaultSlots: SlotMap = {
  front: "nogueira",
  base: "grafite",
  wood: "carvalho",
  stone: "calacatta",
  glass: "bronze",
  metal: "preto-fosco",
  fabric: "linho",
  carcass: "areia",
};

export const SlotContext = createContext<SlotMap>(defaultSlots);

/** Material de um slot (ex.: "front") ou de um acabamento específico (ex.: "freijo"). */
export function useMaterial(slotOrFinish: Slot | string): THREE.Material {
  const slots = useContext(SlotContext);
  const id = (slots as Record<string, string>)[slotOrFinish] ?? slotOrFinish;
  return useMemo(() => createFinishMaterial(getFinish(id)), [id]);
}
