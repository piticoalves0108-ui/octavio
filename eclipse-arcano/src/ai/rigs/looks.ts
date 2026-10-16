/**
 * Variantes visuais (procedurais) dos modelos humanoides/constructos.
 * Só aparência — números de gameplay ficam em src/data/enemies.ts.
 */
export type BuildId = 'normal' | 'slim' | 'heavy' | 'golem' | 'colossus';
export type RightHand = 'sword' | 'dagger' | 'staff' | 'longsword' | 'blade' | 'fist' | 'hammer' | 'none';
export type LeftHand = 'shield' | 'bow' | 'dagger' | 'blade' | 'fist' | 'cannon' | 'none';

export interface HumanoidLook {
  build: BuildId;
  skin: number;
  torso: number;
  trim: number;
  legs: number;
  boots: number;
  sleeves?: number;
  hood?: number;
  cape?: number;
  robe?: number;
  head: 'crow' | 'visor' | 'hood' | 'hat' | 'hair' | 'construct' | 'stone' | 'guardian';
  eyes?: number;
  right: RightHand;
  left: LeftHand;
  quiver?: boolean;
  pauldrons?: number;
  /** Núcleo brilhante nas costas (ponto fraco). */
  core?: number;
  /** Linhas rúnicas brilhantes. */
  runes?: number;
  feathers?: number;
  sash?: number;
  metal?: boolean;
  stone?: boolean;
  /** Cristais brilhantes (golem). */
  crystals?: number;
}

const IRON = 0xa8adb5;
const WOOD = 0x6b4a2b;

export const HUMANOID_LOOKS: Record<string, HumanoidLook> = {
  saqueador: { build: 'normal', skin: 0xc49a7a, torso: 0x5a3a26, trim: 0x2b1d17, legs: 0x3b3128, boots: 0x231a14, sleeves: 0x4a3020, hood: 0x1f1a1e, head: 'crow', right: 'sword', left: 'shield', sash: 0x7a1f1f },
  arqueira: { build: 'slim', skin: 0xd2a684, torso: 0x6a4a30, trim: 0x2b1d17, legs: 0x3e3328, boots: 0x2a2018, hood: 0x26222a, head: 'crow', right: 'none', left: 'bow', quiver: true, sash: 0x7a1f1f },
  cacador: { build: 'normal', skin: 0xb88a68, torso: 0x4a5a32, trim: 0x3a2a1a, legs: 0x4a3c2a, boots: 0x2a2016, cape: 0x3c4a2a, head: 'hat', right: 'dagger', left: 'bow', quiver: true },
  mago: { build: 'slim', skin: 0x8a7a8a, torso: 0x3a1f4a, trim: 0x1a0e22, legs: 0x2a1832, boots: 0x140a18, robe: 0x2e183c, hood: 0x24122e, head: 'hood', eyes: 0xd040ff, right: 'staff', left: 'none', runes: 0xb030ff },
  cavaleiro: { build: 'normal', skin: 0x8a8f9a, torso: 0x8d939e, trim: 0x4c5260, legs: 0x7a808c, boots: 0x5a606c, sleeves: 0x80868f, head: 'visor', eyes: 0x60e8ff, right: 'longsword', left: 'fist', pauldrons: 0x9aa0aa, runes: 0x40d8ff, metal: true, cape: 0x26324a },
  espreitador: { build: 'slim', skin: 0x3a2e40, torso: 0x1e1824, trim: 0x0e0a12, legs: 0x1a1420, boots: 0x0c080e, hood: 0x140f18, cape: 0x18121e, head: 'hood', eyes: 0xff40c0, right: 'dagger', left: 'dagger', runes: 0x9a2aff },
  ravena: { build: 'slim', skin: 0xd8b08e, torso: 0x1c1a20, trim: 0x0c0b0e, legs: 0x24202a, boots: 0x121014, sleeves: 0x2a2630, head: 'hair', right: 'blade', left: 'blade', feathers: 0x15131a, sash: 0xa8222a, pauldrons: 0x18161c },
  sentinela: { build: 'heavy', skin: 0x8a6a3a, torso: 0x9a7642, trim: 0x5a4024, legs: 0x7a5c34, boots: 0x4a3620, head: 'construct', eyes: 0x5fe8ff, right: 'fist', left: 'fist', core: 0x58d8ff, runes: 0x48c8ff, metal: true, pauldrons: 0xa88450 },
  errante: { build: 'heavy', skin: 0x5a5450, torso: 0x6a5e56, trim: 0x2e2a28, legs: 0x4e4844, boots: 0x2a2624, head: 'construct', eyes: 0xff8a30, right: 'hammer', left: 'cannon', core: 0xff9a40, runes: 0xff7a20, metal: true, pauldrons: 0x7a6a5e },
  golem: { build: 'golem', skin: 0x6f6a62, torso: 0x77726a, trim: 0x4a5a3a, legs: 0x66615a, boots: 0x55514b, head: 'stone', eyes: 0x7ff0ff, right: 'fist', left: 'fist', core: 0x7ff0ff, crystals: 0x6fe0ff, stone: true },
  guardiao: { build: 'colossus', skin: 0x7c7f88, torso: 0x8a8e98, trim: 0x3a3e48, legs: 0x6c7078, boots: 0x44484f, head: 'guardian', eyes: 0x6ff6ff, right: 'fist', left: 'fist', core: 0x7ff8ff, runes: 0x48d8ff, metal: true, pauldrons: 0x9a9ea8 },
};

export const COLORS = { IRON, WOOD };
