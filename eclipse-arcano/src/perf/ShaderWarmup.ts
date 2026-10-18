import * as THREE from 'three';
import type { GameContext } from '../core/context';
import { createEnemyRig } from '../ai/rigs/factory';
import { createRigMaterial } from '../ai/rigs/material';
import { dissolveVariant } from '../combat/vfx/dissolve';

/**
 * Pré-aquecimento de shaders (desempenho: elimina travadas de compilação no meio do jogo).
 *
 * Problema medido (bench combate/stress/chefe): cada programa de shader novo que aparece durante
 * o jogo trava o quadro em que surge (no SwiftShader ~0,7–1,4 s; em GPU real, dezenas a centenas
 * de ms no Windows/ANGLE). Os casos encontrados:
 *  1. materiais já presentes na cena, mas invisíveis (pools de VFX/projéteis/saque), que só
 *     compilam no primeiro uso;
 *  2. variantes dinâmicas: rig fundido (SkinnedMesh) do primeiro inimigo, inimigo furtivo
 *     (material transparente), dissolução na morte;
 *  3. programas DESCARTADOS e recompilados: o three apaga o programa quando o último material que
 *     o usa é descartado — ao morrer o último inimigo, ou ao terminar cada dissolução.
 *
 * Solução: `renderer.compile(cena)` (percorre também objetos invisíveis) nos momentos de carga
 * (menu, novo jogo/continuar, troca de qualidade) + um grupo de "guardiões" fora da cena com uma
 * amostra de cada variante dinâmica. Os guardiões nunca são descartados, então os programas
 * dessas variantes ficam vivos o jogo inteiro (usedTimes ≥ 1).
 *
 * Desligar (comparação antes/depois): `?prewarm=0`.
 */
export interface WarmupReport {
  reason: string;
  /** Tempo de CPU da chamada (ms) — a compilação em si pode seguir em paralelo no driver. */
  ms: number;
  programsBefore: number;
  programsAfter: number;
  materials: number;
  keepers: number;
  postTarget: boolean;
}

export class ShaderWarmup {
  enabled = true;
  /** Últimos aquecimentos (diagnóstico; no máximo 12). */
  readonly history: WarmupReport[] = [];
  private keepers: THREE.Group | null = null;
  private keeperMaterials: THREE.Material[] = [];
  private keeperFailed = false;
  private rt: THREE.WebGLRenderTarget | null = null;

  /** Monta (uma vez) as amostras das variantes dinâmicas. Nunca são descartadas. */
  private buildKeepers(): THREE.Group | null {
    if (this.keepers || this.keeperFailed) return this.keepers;
    const g = new THREE.Group();
    g.name = 'perf-guardioes-de-shader';
    try {
      // 1) rig fundido (SkinnedMesh) opaco; 2) o mesmo transparente (furtividade: Enemy.setStealth);
      // 3) rig sem fusão (malhas simples: pilar, chefe, criaturas especiais)
      const variants: { kind: 'humanoid' | 'pillar'; look: string; transparent: boolean }[] = [
        { kind: 'humanoid', look: 'saqueador', transparent: false },
        { kind: 'humanoid', look: 'saqueador', transparent: true },
        { kind: 'pillar', look: 'pilar', transparent: false },
      ];
      for (const v of variants) {
        const mat = createRigMaterial();
        if (v.transparent) {
          mat.transparent = true;
          mat.opacity = 0.25;
          mat.depthWrite = false;
        }
        this.keeperMaterials.push(mat);
        const rig = createEnemyRig(v.kind, v.look, mat);
        g.add(rig.root);
        // 4) dissolução na morte, para cada variante (mesma malha, material da dissolução)
        const meshes = rig.meshes;
        const n = meshes.length;
        for (let i = 0; i < n && i < 2; i++) {
          const m = meshes[i];
          const d = m.clone();
          const dm = dissolveVariant(m.material as THREE.Material);
          this.keeperMaterials.push(dm);
          d.material = dm;
          m.parent?.add(d);
        }
      }
    } catch (err) {
      // rigs indisponíveis: segue só com a compilação da cena
      this.keeperFailed = true;
      console.warn('[Perf] pré-aquecimento: sem guardiões de shader', err);
      return null;
    }
    // fora da cena, nunca renderizado (só compilado)
    g.visible = false;
    g.updateMatrixWorld(true);
    this.keepers = g;
    return g;
  }

  /**
   * Compila os programas da cena inteira (inclusive objetos invisíveis) e dos guardiões.
   * Chame fora do caminho quente (carga, menu, troca de qualidade).
   */
  warm(ctx: GameContext, reason: string): WarmupReport | null {
    if (!this.enabled) return null;
    const r = ctx.renderer;
    const info = r.info;
    const t0 = performance.now();
    const before = info.programs?.length ?? 0;
    // com pós-processamento, a cena é desenhada num alvo intermediário (sem tone mapping na
    // saída do material): compila no mesmo tipo de alvo para gerar os MESMOS programas
    const post = !!(ctx.sys.env as { postEnabled?: boolean } | undefined)?.postEnabled;
    const prev = r.getRenderTarget();
    let materials = 0;
    try {
      if (post) {
        if (!this.rt) this.rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
        r.setRenderTarget(this.rt);
      }
      materials += r.compile(ctx.scene, ctx.camera).size;
      const k = this.buildKeepers();
      if (k) materials += r.compile(k, ctx.camera, ctx.scene).size;
    } catch (err) {
      console.warn('[Perf] pré-aquecimento falhou', err);
    } finally {
      if (post) r.setRenderTarget(prev);
    }
    const rep: WarmupReport = {
      reason,
      ms: Math.round((performance.now() - t0) * 100) / 100,
      programsBefore: before,
      programsAfter: info.programs?.length ?? 0,
      materials,
      keepers: this.keeperMaterials.length,
      postTarget: post,
    };
    this.history.push(rep);
    if (this.history.length > 12) this.history.shift();
    return rep;
  }
}
