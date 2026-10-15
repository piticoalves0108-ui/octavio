/**
 * Esqueleto do mago e representação de poses.
 *
 * O modelo olha para +Z, com +X à ESQUERDA do personagem (o lado esquerdo dele).
 * Membros pendem em -Y. Convenções de rotação (radianos):
 *  - rotation.x NEGATIVA leva um membro que pende para FRENTE (coxa, braço);
 *  - antebraço com x negativo dobra o cotovelo para frente; canela com x positivo dobra o joelho;
 *  - braço esquerdo: z positivo abre para fora; braço direito: z negativo abre para fora.
 *
 * Uma pose é um Float32Array: 3 canais (x,y,z) por osso + 5 canais da raiz
 * (deslocamento x,y,z do pivô do quadril, inclinação para frente e rolagem lateral).
 */

export const BONES = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'shoulderL',
  'upperArmL',
  'foreArmL',
  'handL',
  'shoulderR',
  'upperArmR',
  'foreArmR',
  'handR',
  'thighL',
  'shinL',
  'footL',
  'thighR',
  'shinR',
  'footR',
] as const;

export type BoneName = (typeof BONES)[number];
export const BONE_COUNT = BONES.length;

export const B = Object.fromEntries(BONES.map((n, i) => [n, i])) as Record<BoneName, number>;

/** Pai de cada osso (null = raiz do esqueleto). */
export const BONE_PARENT: Record<BoneName, BoneName | null> = {
  hips: null,
  spine: 'hips',
  chest: 'spine',
  neck: 'chest',
  head: 'neck',
  shoulderL: 'chest',
  upperArmL: 'shoulderL',
  foreArmL: 'upperArmL',
  handL: 'foreArmL',
  shoulderR: 'chest',
  upperArmR: 'shoulderR',
  foreArmR: 'upperArmR',
  handR: 'foreArmR',
  thighL: 'hips',
  shinL: 'thighL',
  footL: 'shinL',
  thighR: 'hips',
  shinR: 'thighR',
  footR: 'shinR',
};

/** Posição de repouso de cada osso relativa ao pai (m). Altura total ≈ 1,85 m com capuz. */
export const BONE_OFFSET: Record<BoneName, [number, number, number]> = {
  hips: [0, 0.98, 0],
  spine: [0, 0.1, 0],
  chest: [0, 0.2, 0],
  neck: [0, 0.27, 0.0],
  head: [0, 0.09, 0.01],
  shoulderL: [0.06, 0.2, -0.01],
  upperArmL: [0.15, -0.01, 0],
  foreArmL: [0, -0.29, 0],
  handL: [0, -0.26, 0],
  shoulderR: [-0.06, 0.2, -0.01],
  upperArmR: [-0.15, -0.01, 0],
  foreArmR: [0, -0.29, 0],
  handR: [0, -0.26, 0],
  thighL: [0.1, -0.04, 0],
  shinL: [0, -0.44, 0],
  footL: [0, -0.42, 0],
  thighR: [-0.1, -0.04, 0],
  shinR: [0, -0.44, 0],
  footR: [0, -0.42, 0],
};

/** Altura do pivô de inclinação/rolagem do corpo (centro de massa aproximado). */
export const PIVOT_HEIGHT = 1.0;

/** Índices dos canais da raiz dentro da pose. */
export const ROOT = BONE_COUNT * 3;
export const R_OFFX = ROOT;
export const R_OFFY = ROOT + 1;
export const R_OFFZ = ROOT + 2;
export const R_PITCH = ROOT + 3;
export const R_ROLL = ROOT + 4;
export const POSE_SIZE = ROOT + 5;

export type Pose = Float32Array;

export function createPose(): Pose {
  return new Float32Array(POSE_SIZE);
}

export function poseClear(p: Pose): Pose {
  p.fill(0);
  return p;
}

export function poseCopy(dst: Pose, src: Pose): Pose {
  dst.set(src);
  return dst;
}

/** dst = dst + src * w (acúmulo para mistura ponderada). */
export function poseAddScaled(dst: Pose, src: Pose, w: number): Pose {
  if (w === 0) return dst;
  for (let i = 0; i < POSE_SIZE; i++) dst[i] += src[i] * w;
  return dst;
}

/** dst = lerp(dst, src, w * mask[i]) por canal. */
export function poseBlendMasked(dst: Pose, src: Pose, w: number, mask: Float32Array): Pose {
  if (w <= 0) return dst;
  for (let i = 0; i < POSE_SIZE; i++) {
    const k = w * mask[i];
    if (k !== 0) dst[i] += (src[i] - dst[i]) * k;
  }
  return dst;
}

/** dst = lerp(a, b, t). */
export function poseLerp(dst: Pose, a: Pose, b: Pose, t: number): Pose {
  for (let i = 0; i < POSE_SIZE; i++) dst[i] = a[i] + (b[i] - a[i]) * t;
  return dst;
}

export function setBone(p: Pose, bone: number, x: number, y: number, z: number) {
  const o = bone * 3;
  p[o] = x;
  p[o + 1] = y;
  p[o + 2] = z;
}

export function addBone(p: Pose, bone: number, x: number, y: number, z: number) {
  const o = bone * 3;
  p[o] += x;
  p[o + 1] += y;
  p[o + 2] += z;
}

export type MaskName = 'full' | 'upper' | 'arms' | 'lower' | 'armR' | 'armL' | 'torso';

const UPPER: BoneName[] = ['spine', 'chest', 'neck', 'head', 'shoulderL', 'upperArmL', 'foreArmL', 'handL', 'shoulderR', 'upperArmR', 'foreArmR', 'handR'];
const ARMS: BoneName[] = ['shoulderL', 'upperArmL', 'foreArmL', 'handL', 'shoulderR', 'upperArmR', 'foreArmR', 'handR'];
const LOWER: BoneName[] = ['hips', 'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];

function buildMask(bones: BoneName[], root: boolean, partial: Partial<Record<BoneName, number>> = {}): Float32Array {
  const m = new Float32Array(POSE_SIZE);
  for (const b of bones) {
    const w = partial[b] ?? 1;
    const o = B[b] * 3;
    m[o] = m[o + 1] = m[o + 2] = w;
  }
  if (root) for (let i = ROOT; i < POSE_SIZE; i++) m[i] = 1;
  return m;
}

/** Máscaras de mistura por canal (1 = substitui, 0 = mantém a base). */
export const MASKS: Record<MaskName, Float32Array> = {
  full: buildMask([...BONES], true),
  // a coluna mistura parcialmente: conserva um pouco da inclinação da corrida
  upper: buildMask(UPPER, false, { spine: 0.75 }),
  arms: buildMask(ARMS, false),
  lower: buildMask(LOWER, true),
  armR: buildMask(['shoulderR', 'upperArmR', 'foreArmR', 'handR'], false),
  armL: buildMask(['shoulderL', 'upperArmL', 'foreArmL', 'handL'], false),
  torso: buildMask(['spine', 'chest', 'neck', 'head'], false),
};
