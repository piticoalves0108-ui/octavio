/**
 * Geometrias e materiais COMPARTILHADOS do saque no mundo (baús, itens soltos, ervas).
 * Criados uma única vez (lazy) e nunca descartados por instância.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const CHEST_W = 1.0;
export const CHEST_H = 0.55;
export const CHEST_D = 0.66;

interface ChestKit {
  inner: THREE.BufferGeometry;
  innerMat: THREE.Material;
  body: THREE.BufferGeometry;
  bands: THREE.BufferGeometry;
  lid: THREE.BufferGeometry;
  lidBands: THREE.BufferGeometry;
  rune: THREE.BufferGeometry;
  wood: THREE.Material;
  stone: THREE.Material;
  iron: THREE.Material;
  bronze: THREE.Material;
  glowCyan: THREE.MeshBasicMaterial;
  glowGold: THREE.MeshBasicMaterial;
  glowDim: THREE.MeshBasicMaterial;
}

let chestKit: ChestKit | null = null;

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}

/** Kit de geometrias do baú: corpo com fundo em y=0, frente para +Z; tampa com pivô na aresta de trás. */
export function getChestKit(): ChestKit {
  if (chestKit) return chestKit;
  const W = CHEST_W;
  const H = CHEST_H;
  const D = CHEST_D;
  const body = box(W, H, D, 0, H / 2, 0);
  const bands = mergeGeometries([
    box(0.07, H + 0.02, D + 0.03, -W * 0.32, H / 2, 0),
    box(0.07, H + 0.02, D + 0.03, W * 0.32, H / 2, 0),
    box(W + 0.03, 0.06, D + 0.03, 0, 0.05, 0),
    // fechadura (frente)
    box(0.16, 0.2, 0.05, 0, H - 0.1, D / 2 + 0.02),
  ])!;
  // tampa: meio cilindro deitado (eixo X), com a aresta de trás no pivô (z = 0 local)
  const lidCyl = new THREE.CylinderGeometry(D / 2, D / 2, W, 14, 1, false, 0, Math.PI);
  // girar em Z leva a metade x>=0 (theta 0..PI) para y>=0: calota para cima, eixo em X
  lidCyl.rotateZ(Math.PI / 2);
  lidCyl.translate(0, 0, D / 2);
  // tampo de baixo da tampa (fecha a calota: visível com o baú aberto)
  const lid = mergeGeometries([lidCyl.toNonIndexed(), box(W, 0.03, D, 0, 0.015, D / 2).toNonIndexed()])!;
  const lidBands = mergeGeometries([
    (() => {
      const g = new THREE.CylinderGeometry(D / 2 + 0.015, D / 2 + 0.015, 0.07, 14, 1, false, 0, Math.PI);
      g.rotateZ(Math.PI / 2);
      g.translate(-W * 0.32, 0, D / 2);
      return g;
    })(),
    (() => {
      const g = new THREE.CylinderGeometry(D / 2 + 0.015, D / 2 + 0.015, 0.07, 14, 1, false, 0, Math.PI);
      g.rotateZ(Math.PI / 2);
      g.translate(W * 0.32, 0, D / 2);
      return g;
    })(),
  ])!;
  // runa luminosa: faixa fina na frente do corpo
  const rune = box(W * 0.5, 0.045, 0.012, 0, H * 0.45, D / 2 + 0.008);
  // interior escuro (aparece com a tampa aberta)
  const inner = box(W - 0.1, 0.012, D - 0.1, 0, H + 0.004, 0);
  chestKit = {
    inner,
    innerMat: new THREE.MeshBasicMaterial({ color: 0x120d08 }),
    body,
    bands,
    lid,
    lidBands,
    rune,
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85, metalness: 0.02 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x6f7480, roughness: 0.72, metalness: 0.1 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.45, metalness: 0.7 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x9a7240, roughness: 0.4, metalness: 0.75 }),
    glowCyan: new THREE.MeshBasicMaterial({ color: 0x66e6ff, toneMapped: false }),
    glowGold: new THREE.MeshBasicMaterial({ color: 0xffd36a, toneMapped: false }),
    glowDim: new THREE.MeshBasicMaterial({ color: 0x40505a }),
  };
  return chestKit;
}

/** Monta um baú (Group) com a tampa num Group-pivô acessível. */
export function buildChestModel(style: 'wood' | 'arcane'): { root: THREE.Group; lidPivot: THREE.Group; rune: THREE.Mesh } {
  const k = getChestKit();
  const root = new THREE.Group();
  root.name = 'bau';
  const bodyMat = style === 'arcane' ? k.stone : k.wood;
  const bandMat = style === 'arcane' ? k.bronze : k.iron;
  const body = new THREE.Mesh(k.body, bodyMat);
  const bands = new THREE.Mesh(k.bands, bandMat);
  body.castShadow = bands.castShadow = true;
  body.receiveShadow = true;
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, CHEST_H, -CHEST_D / 2);
  const lid = new THREE.Mesh(k.lid, bodyMat);
  lid.castShadow = true;
  const lidBands = new THREE.Mesh(k.lidBands, bandMat);
  lidPivot.add(lid, lidBands);
  const rune = new THREE.Mesh(k.rune, style === 'arcane' ? k.glowCyan : k.glowGold);
  const inner = new THREE.Mesh(k.inner, k.innerMat);
  root.add(body, bands, inner, lidPivot, rune);
  return { root, lidPivot, rune };
}

// ---------------------------------------------------------------------------
// Itens soltos (gema/bolsa brilhante) e moedas
// ---------------------------------------------------------------------------

let pickupGeo: { gem: THREE.BufferGeometry; coin: THREE.BufferGeometry; mat: THREE.MeshBasicMaterial; coinMat: THREE.MeshStandardMaterial } | null = null;

export function getPickupKit() {
  if (pickupGeo) return pickupGeo;
  const gem = new THREE.OctahedronGeometry(0.17, 0);
  gem.scale(1, 1.45, 1);
  const coin = mergeGeometries([
    (() => {
      const g = new THREE.CylinderGeometry(0.14, 0.14, 0.035, 14);
      g.rotateX(Math.PI / 2);
      g.translate(-0.06, 0, 0);
      return g;
    })(),
    (() => {
      const g = new THREE.CylinderGeometry(0.14, 0.14, 0.035, 14);
      g.rotateX(Math.PI / 2);
      g.rotateY(0.6);
      g.translate(0.08, 0.05, 0.03);
      return g;
    })(),
  ])!;
  pickupGeo = {
    gem,
    coin,
    mat: new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
    coinMat: new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: 0.3, metalness: 0.9, emissive: 0x6a4a10, emissiveIntensity: 0.6 }),
  };
  return pickupGeo;
}

// ---------------------------------------------------------------------------
// Erva-lúmen (folhas + bulbo luminoso)
// ---------------------------------------------------------------------------

let herbGeo: { leaves: THREE.BufferGeometry; bulbs: THREE.BufferGeometry; leafMat: THREE.MeshStandardMaterial; bulbMat: THREE.MeshBasicMaterial } | null = null;

export function getHerbKit() {
  if (herbGeo) return herbGeo;
  const leafParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.PlaneGeometry(0.12, 0.42, 1, 2);
    // curva leve da folha
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      pos.setZ(v, (y + 0.21) * (y + 0.21) * 0.6);
    }
    g.translate(0, 0.21, 0);
    g.rotateX(-0.35);
    g.rotateY((i / 5) * Math.PI * 2);
    leafParts.push(g);
  }
  const leaves = mergeGeometries(leafParts)!;
  leaves.computeVertexNormals();
  const bulbParts: THREE.BufferGeometry[] = [];
  const spots: [number, number, number][] = [
    [0, 0.5, 0],
    [0.09, 0.38, 0.05],
    [-0.08, 0.42, -0.06],
  ];
  for (const [x, y, z] of spots) {
    const g = new THREE.IcosahedronGeometry(0.055, 0);
    g.translate(x, y, z);
    bulbParts.push(g);
  }
  const bulbs = mergeGeometries(bulbParts)!;
  herbGeo = {
    leaves,
    bulbs,
    leafMat: new THREE.MeshStandardMaterial({ color: 0x3f8a4a, roughness: 0.8, side: THREE.DoubleSide }),
    bulbMat: new THREE.MeshBasicMaterial({ color: 0x9bff8a, toneMapped: false }),
  };
  return herbGeo;
}
