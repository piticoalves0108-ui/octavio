import * as THREE from 'three';
import type { Entity, EntityKind, UpdateTier } from './Entity';
import type { GameContext } from './context';
import type { DamageInfo } from '../combat/Health';

const CELL = 16;
const cellKeyOf = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

export interface TierConfig {
  /** Até esta distância (m) do foco: tier 0 (todo frame). */
  near: number;
  /** Até esta distância: tier 1 (a cada `midEvery` frames). */
  mid: number;
  /** Até esta distância: tier 2 (farUpdate a cada `farEvery` frames). Além disso: tier 3 (dorme, invisível). */
  far: number;
  midEvery: number;
  farEvery: number;
}

/**
 * Registro de entidades + grid espacial + atualização escalonada por distância.
 * Mantém o custo de IA/animação proporcional ao que está perto do jogador.
 */
export class EntityManager {
  readonly all: Entity[] = [];
  private byId = new Map<number, Entity>();
  private grid = new Map<string, Set<Entity>>();
  private toRemove: Entity[] = [];
  private frame = 0;
  private dotBuffer: DamageInfo[] = [];
  /** Ponto de foco (normalmente o jogador). */
  readonly focus = new THREE.Vector3();
  tiers: TierConfig = { near: 70, mid: 160, far: 320, midEvery: 3, farEvery: 15 };
  /** Estatísticas para o monitor de desempenho. */
  stats = { total: 0, tier0: 0, tier1: 0, tier2: 0, tier3: 0 };
  /** Erros isolados em update/farUpdate de entidades (a entidade com erro não derruba as outras). */
  errorCount = 0;
  private lastErrorLog = -1e9;

  constructor(private ctx: GameContext) {}

  add<T extends Entity>(e: T): T {
    if (this.byId.has(e.id)) return e;
    this.all.push(e);
    this.byId.set(e.id, e);
    if (!e.object3d.parent) this.ctx.scene.add(e.object3d);
    this.rehash(e);
    e.onAdded(this.ctx);
    return e;
  }

  /** Remoção adiada para o fim do frame (seguro chamar durante update). */
  remove(e: Entity) {
    if (e.removed) return;
    e.removed = true;
    this.toRemove.push(e);
  }

  get(id: number) {
    return this.byId.get(id);
  }

  ofKind(kind: EntityKind, out: Entity[] = []): Entity[] {
    out.length = 0;
    for (const e of this.all) if (e.kind === kind && !e.removed) out.push(e);
    return out;
  }

  private rehash(e: Entity) {
    const key = e.queryable ? cellKeyOf(e.position.x, e.position.z) : '';
    if (key === e.cellKey) return;
    if (e.cellKey) this.grid.get(e.cellKey)?.delete(e);
    e.cellKey = key;
    if (!key) return;
    let set = this.grid.get(key);
    if (!set) {
      set = new Set();
      this.grid.set(key, set);
    }
    set.add(e);
  }

  /**
   * Entidades dentro do raio (XZ, com tolerância do raio da entidade).
   * `out` é limpo e reutilizado para evitar alocações.
   */
  queryRadius(center: THREE.Vector3, radius: number, out: Entity[] = [], filter?: (e: Entity) => boolean): Entity[] {
    out.length = 0;
    const minX = Math.floor((center.x - radius) / CELL);
    const maxX = Math.floor((center.x + radius) / CELL);
    const minZ = Math.floor((center.z - radius) / CELL);
    const maxZ = Math.floor((center.z + radius) / CELL);
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const set = this.grid.get(`${cx},${cz}`);
        if (!set) continue;
        for (const e of set) {
          if (e.removed || !e.alive) continue;
          const dx = e.position.x - center.x;
          const dz = e.position.z - center.z;
          const r = radius + e.radius;
          if (dx * dx + dz * dz > r * r) continue;
          if (filter && !filter(e)) continue;
          out.push(e);
        }
      }
    }
    return out;
  }

  nearest(center: THREE.Vector3, radius: number, filter?: (e: Entity) => boolean): Entity | null {
    const list = this.queryRadius(center, radius, this.tmpList, filter);
    let best: Entity | null = null;
    let bestD = Infinity;
    for (const e of list) {
      const d = (e.position.x - center.x) ** 2 + (e.position.z - center.z) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }
  private tmpList: Entity[] = [];

  update(dt: number) {
    this.frame++;
    const t = this.tiers;
    const near2 = t.near * t.near;
    const mid2 = t.mid * t.mid;
    const far2 = t.far * t.far;
    const st = this.stats;
    st.total = this.all.length;
    st.tier0 = st.tier1 = st.tier2 = st.tier3 = 0;
    const combat = this.ctx.sys.combat;

    for (let i = 0; i < this.all.length; i++) {
      const e = this.all[i];
      if (e.removed) continue;
      let tier: UpdateTier = 0;
      if (!e.alwaysActive) {
        const dx = e.position.x - this.focus.x;
        const dz = e.position.z - this.focus.z;
        const d2 = dx * dx + dz * dz;
        tier = d2 < near2 ? 0 : d2 < mid2 ? 1 : d2 < far2 ? 2 : 3;
      }
      if (tier !== e.tier) {
        // Entidades dormindo ficam invisíveis (economiza draw calls).
        e.object3d.visible = tier !== 3;
        e.tier = tier;
      }
      e.pendingDt += dt;
      // Escalonamento: distribui entidades entre frames usando o id.
      if (tier === 0 || (tier === 1 && (this.frame + e.id) % t.midEvery === 0)) {
        const step = Math.min(e.pendingDt, 0.25);
        e.pendingDt = 0;
        try {
          if (e.health && e.alive) {
            this.dotBuffer.length = 0;
            e.health.update(step, this.dotBuffer);
            for (const d of this.dotBuffer) combat.applyDamage(e, d);
          }
          e.update(step, this.ctx);
        } catch (err) {
          this.entityError(e, err);
        }
        tier === 0 ? st.tier0++ : st.tier1++;
      } else if (tier === 2 && (this.frame + e.id) % t.farEvery === 0) {
        const step = Math.min(e.pendingDt, 2);
        e.pendingDt = 0;
        try {
          e.farUpdate(step, this.ctx);
        } catch (err) {
          this.entityError(e, err);
        }
        st.tier2++;
      } else if (tier === 3) {
        e.pendingDt = 0;
        st.tier3++;
      }
      this.rehash(e);
    }

    if (this.toRemove.length) {
      for (const e of this.toRemove) {
        const idx = this.all.indexOf(e);
        if (idx >= 0) this.all.splice(idx, 1);
        this.byId.delete(e.id);
        if (e.cellKey) this.grid.get(e.cellKey)?.delete(e);
        e.cellKey = '';
        e.dispose();
      }
      this.toRemove.length = 0;
    }
  }

  /** Isola o erro de uma entidade (registro limitado a 1 a cada 5 s). */
  private entityError(e: Entity, err: unknown) {
    this.errorCount++;
    const now = performance.now();
    if (now - this.lastErrorLog > 5000) {
      this.lastErrorLog = now;
      console.error(`[Entities] erro em ${e.kind}:${e.typeId || e.name || e.id}`, err);
    }
  }

  /** Remove todas as entidades (exceto as que o filtro mantiver). */
  clear(keep?: (e: Entity) => boolean) {
    for (const e of this.all) if (!keep || !keep(e)) this.remove(e);
    // processa remoção imediatamente
    for (const e of this.toRemove) {
      const idx = this.all.indexOf(e);
      if (idx >= 0) this.all.splice(idx, 1);
      this.byId.delete(e.id);
      if (e.cellKey) this.grid.get(e.cellKey)?.delete(e);
      e.cellKey = '';
      e.dispose();
    }
    this.toRemove.length = 0;
  }
}
