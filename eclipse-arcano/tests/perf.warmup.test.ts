import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { ShaderWarmup } from '../src/perf/ShaderWarmup';
import type { GameContext } from '../src/core/context';

/** Renderer falso: registra as chamadas de compile/setRenderTarget (sem WebGL). */
function fakeCtx(post = false) {
  const calls: { scene: THREE.Object3D; target: THREE.Object3D | null; rt: unknown }[] = [];
  const targets: unknown[] = [];
  let rt: unknown = null;
  const programs: unknown[] = [{}, {}];
  const renderer = {
    info: { programs },
    getRenderTarget: () => rt,
    setRenderTarget: (t: unknown) => {
      rt = t;
      targets.push(t);
    },
    compile(scene: THREE.Object3D, _camera: THREE.Camera, target: THREE.Object3D | null = null) {
      calls.push({ scene, target, rt });
      const mats = new Set<THREE.Material>();
      scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m && !Array.isArray(m)) mats.add(m);
      });
      programs.push({});
      return mats;
    },
  };
  const scene = new THREE.Scene();
  const hidden = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  hidden.visible = false; // pool invisível: precisa ser compilado mesmo assim
  scene.add(hidden);
  const ctx = {
    renderer,
    scene,
    camera: new THREE.PerspectiveCamera(),
    sys: { env: { postEnabled: post } },
  } as unknown as GameContext;
  return { ctx, calls, targets, hidden };
}

describe('perf/ShaderWarmup', () => {
  it('compila a cena (inclusive invisíveis) e os guardiões das variantes dinâmicas', () => {
    const { ctx, calls, hidden } = fakeCtx();
    const w = new ShaderWarmup();
    const rep = w.warm(ctx, 'teste')!;
    expect(rep).not.toBeNull();
    expect(calls.length).toBe(2);
    expect(calls[0].scene).toBe(ctx.scene);
    // guardiões compilados com as luzes da cena real (targetScene)
    expect(calls[1].target).toBe(ctx.scene);
    expect(calls[1].scene).not.toBe(ctx.scene);
    expect(rep.materials).toBeGreaterThan(1);
    expect(rep.programsAfter).toBeGreaterThan(rep.programsBefore);
    expect(hidden.visible).toBe(false);

    // variantes: rig fundido (SkinnedMesh), transparente (furtividade), malha simples e dissolução
    const keepers = calls[1].scene;
    let skinned = 0;
    let transparent = 0;
    let dissolve = 0;
    let plain = 0;
    keepers.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      if ((m as THREE.SkinnedMesh).isSkinnedMesh) skinned++;
      else plain++;
      if (mat.transparent) transparent++;
      if (mat.customProgramCacheKey().endsWith('|dissolve')) dissolve++;
    });
    expect(skinned).toBeGreaterThanOrEqual(2);
    expect(plain).toBeGreaterThanOrEqual(1);
    expect(transparent).toBeGreaterThanOrEqual(1);
    expect(dissolve).toBeGreaterThanOrEqual(2);
    // os guardiões ficam fora da cena e nunca aparecem
    expect(keepers.parent).toBeNull();
    expect(keepers.visible).toBe(false);
  });

  it('reaproveita os guardiões (não recria materiais a cada aquecimento)', () => {
    const { ctx, calls } = fakeCtx();
    const w = new ShaderWarmup();
    w.warm(ctx, 'a');
    w.warm(ctx, 'b');
    expect(calls[1].scene).toBe(calls[3].scene);
    expect(w.history.map((h) => h.reason)).toEqual(['a', 'b']);
    expect(w.history[0].keepers).toBe(w.history[1].keepers);
  });

  it('com pós-processamento compila num alvo intermediário e restaura o alvo anterior', () => {
    const { ctx, calls, targets } = fakeCtx(true);
    const w = new ShaderWarmup();
    const rep = w.warm(ctx, 'pos')!;
    expect(rep.postTarget).toBe(true);
    expect(calls.every((c) => c.rt !== null)).toBe(true);
    expect(targets[targets.length - 1]).toBeNull();
  });

  it('desligado (?prewarm=0) não faz nada', () => {
    const { ctx, calls } = fakeCtx();
    const w = new ShaderWarmup();
    w.enabled = false;
    expect(w.warm(ctx, 'x')).toBeNull();
    expect(calls.length).toBe(0);
  });
});
