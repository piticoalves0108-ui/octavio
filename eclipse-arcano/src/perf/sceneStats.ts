import * as THREE from 'three';
import type { GameContext } from '../core/context';

/**
 * Diagnóstico de render (fora do caminho quente): atribui cada draw call do próximo quadro
 * ao "dono" do objeto (entidade, sistema ou malha nomeada), separando a passada de sombra.
 * Funciona interceptando `renderer.renderBufferDirect` (usado tanto no passe principal
 * quanto no WebGLShadowMap) só durante o quadro capturado.
 */
export interface DrawGroup {
  label: string;
  draws: number;
  shadowDraws: number;
  /** Triângulos estimados (índices/3 × instâncias) no passe principal. */
  triangles: number;
  shadowTriangles: number;
}

export interface DrawCapture {
  frames: number;
  total: number;
  shadow: number;
  triangles: number;
  groups: DrawGroup[];
}

function ownerLabel(ctx: GameContext, obj: THREE.Object3D): string {
  let o: THREE.Object3D | null = obj;
  let named = '';
  while (o) {
    const id = o.userData?.entityId as number | undefined;
    if (id !== undefined) {
      const e = ctx.entities.get(id);
      if (e) return `${e.kind}:${e.typeId || e.name || id}`;
    }
    if (!named && o.name) named = o.name;
    if (o.parent === ctx.scene || !o.parent) break;
    o = o.parent;
  }
  const top = o && o !== obj && o.name ? o.name : '';
  if (top && named && top !== named) return `${top}/${named}`;
  return named || top || `${obj.type}:${(obj as THREE.Mesh).material && !Array.isArray((obj as THREE.Mesh).material) ? ((obj as THREE.Mesh).material as THREE.Material).type : '?'}`;
}

function trianglesOf(geometry: THREE.BufferGeometry, object: THREE.Object3D, group: { count: number } | null): number {
  const idx = geometry.index;
  let count = idx ? idx.count : (geometry.attributes.position?.count ?? 0);
  const dr = geometry.drawRange;
  if (dr && Number.isFinite(dr.count)) count = Math.min(count, dr.count);
  if (group) count = Math.min(count, group.count);
  let inst = 1;
  if ((object as THREE.InstancedMesh).isInstancedMesh) inst = (object as THREE.InstancedMesh).count;
  else if ((geometry as THREE.InstancedBufferGeometry).isInstancedBufferGeometry) {
    const ic = (geometry as THREE.InstancedBufferGeometry).instanceCount;
    inst = Number.isFinite(ic) ? ic : 1;
  }
  const mode = (object as THREE.Points).isPoints ? 1 : (object as THREE.Line).isLine ? 2 : 3;
  return Math.floor(count / mode) * inst;
}

/** Captura `frames` quadros e devolve as draw calls agrupadas por dono (maiores primeiro). */
export function captureDrawCalls(ctx: GameContext, frames = 1): Promise<DrawCapture> {
  const r = ctx.renderer as unknown as { renderBufferDirect: (...a: unknown[]) => void };
  const orig = r.renderBufferDirect;
  const map = new Map<string, DrawGroup>();
  let total = 0;
  let shadow = 0;
  let tris = 0;
  r.renderBufferDirect = function (this: unknown, camera: unknown, scene: unknown, geometry: THREE.BufferGeometry, material: unknown, object: THREE.Object3D, group: { count: number } | null) {
    const isShadow = scene === null;
    const label = ownerLabel(ctx, object);
    let g = map.get(label);
    if (!g) {
      g = { label, draws: 0, shadowDraws: 0, triangles: 0, shadowTriangles: 0 };
      map.set(label, g);
    }
    const t = trianglesOf(geometry, object, group);
    if (isShadow) {
      g.shadowDraws++;
      g.shadowTriangles += t;
      shadow++;
    } else {
      g.draws++;
      g.triangles += t;
      tris += t;
    }
    total++;
    // eslint-disable-next-line prefer-rest-params
    return orig.apply(this, arguments as unknown as unknown[]);
  } as typeof orig;
  return new Promise((resolve) => {
    let left = Math.max(1, frames);
    const tick = () => {
      if (--left > 0) {
        requestAnimationFrame(tick);
        return;
      }
      // espera o render deste quadro terminar (o rAF do Game roda antes do nosso)
      requestAnimationFrame(() => {
        r.renderBufferDirect = orig;
        const n = Math.max(1, frames);
        const groups = [...map.values()]
          .map((g) => ({ ...g, draws: g.draws / n, shadowDraws: g.shadowDraws / n, triangles: Math.round(g.triangles / n), shadowTriangles: Math.round(g.shadowTriangles / n) }))
          .sort((a, b) => b.draws + b.shadowDraws - (a.draws + a.shadowDraws));
        resolve({ frames: n, total: total / n, shadow: shadow / n, triangles: Math.round(tris / n), groups });
      });
    };
    requestAnimationFrame(tick);
  });
}

/** Resumo estático da cena: malhas visíveis, sombras e instâncias por tipo de dono. */
export function sceneSummary(ctx: GameContext) {
  let meshes = 0;
  let visible = 0;
  let casters = 0;
  let instanced = 0;
  let lights = 0;
  let shadowLights = 0;
  ctx.scene.traverseVisible((o) => {
    if ((o as THREE.Light).isLight) {
      lights++;
      if ((o as THREE.Light).castShadow) shadowLights++;
    }
    if (!(o as THREE.Mesh).isMesh) return;
    meshes++;
    visible++;
    if (o.castShadow) casters++;
    if ((o as THREE.InstancedMesh).isInstancedMesh) instanced++;
  });
  return { meshes, visible, casters, instanced, lights, shadowLights };
}
