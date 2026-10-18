import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Fusão de rigs em UMA malha com "skinning rígido" (desempenho).
 *
 * Os rigs procedurais montam uma malha por osso (≈ 7–11 draw calls por modelo, mais as
 * mesmas na passada de sombra). Aqui as malhas de cada osso viram uma única SkinnedMesh:
 * cada vértice fica preso a 1 osso (peso 1), com a geometria no espaço local do osso e
 * inversas de ligação = identidade. O resultado é idêntico (mesmo material, mesma pose,
 * mesma hierarquia de ossos animada), com 1 draw call (+1 de sombra) por modelo.
 *
 * A geometria fundida é cacheada por chave (compartilhada entre instâncias do mesmo visual).
 * Cada instância tem um Skeleton (textura de ossos 8×8 float) — chame `disposeMergedRig`
 * ao descartar o modelo.
 */

const MERGED_CACHE = new Map<string, { geo: THREE.BufferGeometry; boneCount: number } | null>();
const IDENTITY = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _m = new THREE.Matrix4();
const _s = new THREE.Sphere();
const _box = new THREE.Box3();

/** Desliga a fusão (comparação antes/depois e depuração): `?rigmerge=0`. */
export function rigMergeEnabled(): boolean {
  try {
    return typeof location === 'undefined' || new URLSearchParams(location.search).get('rigmerge') !== '0';
  } catch {
    return true;
  }
}

/**
 * Funde `meshes` (cada uma filha direta de um osso, com transformação local identidade)
 * numa SkinnedMesh presa a `root`. Remove as malhas originais dos ossos e devolve a nova
 * malha (ou null se não der para fundir — o rig continua com as malhas originais).
 */
export function mergeRigMeshes(cacheKey: string, root: THREE.Object3D, meshes: THREE.Mesh[], material: THREE.Material): THREE.SkinnedMesh | null {
  if (meshes.length < 2 || !rigMergeEnabled()) return null;
  // ossos = pais das malhas (cada um vira um "osso" do esqueleto)
  const bones: THREE.Object3D[] = [];
  const boneOf: number[] = [];
  for (const m of meshes) {
    const p = m.parent;
    const local = m.position.lengthSq() === 0 && m.quaternion.w === 1 && m.scale.x === 1 && m.scale.y === 1 && m.scale.z === 1;
    if (!p || !local || m.material !== material || (m as THREE.SkinnedMesh).isSkinnedMesh) return null;
    let i = bones.indexOf(p);
    if (i < 0) {
      i = bones.length;
      bones.push(p);
    }
    boneOf.push(i);
  }
  let entry = MERGED_CACHE.get(cacheKey);
  if (entry === undefined) {
    entry = buildMerged(meshes, boneOf, bones.length);
    MERGED_CACHE.set(cacheKey, entry);
  }
  if (!entry || entry.boneCount !== bones.length) return null;

  // esfera envolvente na pose de construção (relativa à raiz), com folga para as poses animadas
  root.updateMatrixWorld(true);
  _inv.copy(root.matrixWorld).invert();
  _box.makeEmpty();
  for (const m of meshes) {
    const g = m.geometry;
    if (!g.boundingSphere) g.computeBoundingSphere();
    _m.multiplyMatrices(_inv, m.matrixWorld);
    _s.copy(g.boundingSphere!).applyMatrix4(_m);
    _box.expandByPoint(_s.center.clone().addScalar(_s.radius));
    _box.expandByPoint(_s.center.clone().subScalar(_s.radius));
  }
  const sphere = new THREE.Sphere();
  _box.getBoundingSphere(sphere);
  sphere.radius = sphere.radius * 1.35 + 0.4;

  const sk = new THREE.SkinnedMesh(entry.geo, material);
  sk.name = 'rig-fundido';
  sk.castShadow = meshes[0].castShadow;
  sk.receiveShadow = meshes[0].receiveShadow;
  const inverses = bones.map(() => new THREE.Matrix4());
  const skeleton = new THREE.Skeleton(bones as THREE.Bone[], inverses);
  root.add(sk);
  sk.bind(skeleton, IDENTITY);
  sk.boundingSphere = sphere;
  for (const m of meshes) m.removeFromParent();
  return sk;
}

function buildMerged(meshes: THREE.Mesh[], boneOf: number[], boneCount: number): { geo: THREE.BufferGeometry; boneCount: number } | null {
  const parts: THREE.BufferGeometry[] = [];
  for (let k = 0; k < meshes.length; k++) {
    const src = meshes[k].geometry;
    const g = new THREE.BufferGeometry();
    for (const name of Object.keys(src.attributes)) g.setAttribute(name, src.attributes[name].clone());
    if (src.index) g.setIndex(src.index.clone());
    const n = g.getAttribute('position').count;
    const si = new Uint16Array(n * 4);
    const sw = new Float32Array(n * 4);
    const b = boneOf[k];
    for (let i = 0; i < n; i++) {
      si[i * 4] = b;
      sw[i * 4] = 1;
    }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    parts.push(g);
  }
  // todas as partes precisam ter os mesmos atributos (posição/normal/cor/brilho)
  const names = Object.keys(parts[0].attributes).sort().join(',');
  if (!parts.every((p) => Object.keys(p.attributes).sort().join(',') === names)) {
    for (const p of parts) p.dispose();
    return null;
  }
  const geo = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!geo) return null;
  // índices > 65535 viram Uint32 automaticamente no merge
  return { geo, boneCount };
}

/** Libera a textura de ossos da instância (a geometria fundida é compartilhada e fica no cache). */
export function disposeMergedRig(mesh: THREE.SkinnedMesh | null | undefined) {
  mesh?.skeleton?.dispose();
}

export function mergedCacheSize() {
  return MERGED_CACHE.size;
}
