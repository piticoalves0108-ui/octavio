import * as THREE from 'three';
import type { CollisionWorld, Collider } from '../Collision';
import type { GeoBuilder } from './builder';
import { structureMaterial } from './material';
import { GATES } from '../../data/world';

/** Movimento de uma peça de portão entre fechado (t=0) e aberto (t=1). */
export type GateMotion = { kind: 'swing'; angle: number } | { kind: 'slide'; dx: number; dy: number; dz: number };

interface GatePart {
  obj: THREE.Mesh;
  baseYaw: number;
  bx: number;
  by: number;
  bz: number;
  motion: GateMotion;
}

/**
 * Portão/porta animado com colisor. Fechado = colisor ativo. A animação é
 * suavizada (ease in-out) e o colisor só é liberado depois de meio caminho aberto.
 */
export class Gate {
  open: boolean;
  /** 0 = fechado, 1 = aberto. */
  t: number;
  readonly parts: GatePart[] = [];
  readonly colliders: Collider[] = [];
  /** Posição de referência (centro do vão) para áudio/efeitos. */
  readonly center = new THREE.Vector3();

  constructor(
    readonly id: string,
    readonly name: string,
    open: boolean,
    /** Duração da animação (s). */
    readonly duration = 2.2,
  ) {
    this.open = open;
    this.t = open ? 1 : 0;
  }

  get moving() {
    return this.t !== (this.open ? 1 : 0);
  }

  apply() {
    const e = this.t * this.t * (3 - 2 * this.t);
    for (const p of this.parts) {
      if (p.motion.kind === 'swing') {
        p.obj.rotation.y = p.baseYaw + p.motion.angle * e;
        p.obj.position.set(p.bx, p.by, p.bz);
      } else {
        p.obj.rotation.y = p.baseYaw;
        p.obj.position.set(p.bx + p.motion.dx * e, p.by + p.motion.dy * e, p.bz + p.motion.dz * e);
      }
      p.obj.updateMatrix();
    }
    const blocking = this.open ? this.t < 0.5 : true;
    for (const c of this.colliders) c.enabled = blocking;
  }

  update(dt: number): boolean {
    const target = this.open ? 1 : 0;
    if (this.t === target) return false;
    const step = dt / this.duration;
    this.t = target > this.t ? Math.min(target, this.t + step) : Math.max(target, this.t - step);
    this.apply();
    return true;
  }
}

/** Registro de portões do mundo (ids documentados em GATES, src/data/world.ts). */
export class GateSystem {
  readonly gates = new Map<string, Gate>();
  readonly root = new THREE.Group();

  constructor(private physics: CollisionWorld) {
    this.root.name = 'portoes';
  }

  /** Obtém (ou cria) o portão `id` com o estado inicial padrão de GATES. */
  gate(id: string): Gate {
    let g = this.gates.get(id);
    if (!g) {
      const def = GATES.find((d) => d.id === id);
      g = new Gate(id, def?.name ?? id, def?.defaultOpen ?? false);
      this.gates.set(id, g);
    }
    return g;
  }

  /**
   * Acrescenta uma peça móvel: geometria do construtor `b` (em coordenadas locais
   * com origem na dobradiça/base), posicionada no mundo em (x,y,z) com yaw.
   */
  addPart(id: string, b: GeoBuilder, x: number, y: number, z: number, yaw: number, motion: GateMotion) {
    const g = this.gate(id);
    const mesh = new THREE.Mesh(b.toGeometry(), structureMaterial());
    mesh.name = `portao:${id}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    this.root.add(mesh);
    g.parts.push({ obj: mesh, baseYaw: yaw, bx: x, by: y, bz: z, motion });
    g.apply();
  }

  /** Colisor que bloqueia o vão quando fechado (caixa no mundo). */
  addBlocker(id: string, x: number, y: number, z: number, hx: number, hy: number, hz: number, yaw: number) {
    const g = this.gate(id);
    const c = this.physics.addBox(x, y, z, hx, hy, hz, yaw, 'gate', { walkable: false });
    g.colliders.push(c);
    g.center.set(x, y, z);
    g.apply();
  }

  set(id: string, open: boolean, instant = false): boolean {
    const g = this.gates.get(id);
    if (!g) return false;
    g.open = open;
    if (instant) {
      g.t = open ? 1 : 0;
      g.apply();
    }
    return true;
  }

  reset() {
    for (const g of this.gates.values()) {
      const def = GATES.find((d) => d.id === g.id);
      this.set(g.id, def?.defaultOpen ?? false, true);
    }
  }

  update(dt: number) {
    for (const g of this.gates.values()) g.update(dt);
  }
}
