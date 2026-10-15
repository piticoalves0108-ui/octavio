import * as THREE from 'three';
import type { CollisionWorld, Collider, ColliderOptions, ColliderTag } from '../Collision';
import type { Heightfield } from '../heightfield';
import type { WorldMaps } from '../maps';
import type { SurfaceType } from '../../core/EventBus';
import { GeoBuilder } from './builder';
import { structureMaterial } from './material';

/** Zona orientada (OBB no plano XZ + faixa de altura) usada para superfícies e interiores. */
export interface Zone {
  id: string;
  x: number;
  z: number;
  hx: number;
  hz: number;
  cos: number;
  sin: number;
  y0: number;
  y1: number;
}

export interface SurfaceZone extends Zone {
  surface: SurfaceType;
}

/** Grupo de geometria = uma malha final (um draw call). */
interface Group {
  name: string;
  builder: GeoBuilder;
  /** Distância máxima de desenho (m); Infinity = sempre. */
  maxDist: number;
  castShadow: boolean;
}

export interface LightSpec {
  x: number;
  y: number;
  z: number;
  color: number;
  intensity: number;
  distance: number;
  /** 'night' acende à noite; 'always' sempre; 'flicker' chama tremulante sempre acesa. */
  mode: 'night' | 'always' | 'flicker';
}

/**
 * Kit de construção de sítios: grupos de geometria mesclada, colisores coerentes
 * com a geometria (mesmo quadro/yaw), pegadas no mapa (sem grama/árvores),
 * zonas de superfície/interior e luzes reais (poucas).
 */
export class SiteKit {
  readonly groups = new Map<string, Group>();
  readonly surfaces: SurfaceZone[] = [];
  readonly indoors: Zone[] = [];
  readonly lights: LightSpec[] = [];
  readonly colliders: Collider[] = [];
  /** Malhas finais (depois de finish). */
  readonly meshes: THREE.Mesh[] = [];

  constructor(
    readonly physics: CollisionWorld,
    readonly hf: Heightfield,
    readonly maps: WorldMaps,
  ) {}

  /** Grupo de geometria (cria se não existir). */
  g(name: string, maxDist = Infinity, castShadow = true): GeoBuilder {
    let gr = this.groups.get(name);
    if (!gr) {
      gr = { name, builder: new GeoBuilder(), maxDist, castShadow };
      this.groups.set(name, gr);
    }
    return gr.builder;
  }

  /** Altura do terreno. */
  h(x: number, z: number) {
    return this.hf.heightAt(x, z);
  }

  /** Mínimo/máximo do terreno sob um retângulo orientado (amostrado a cada ~1,5 m). */
  groundRange(x: number, z: number, w: number, d: number, yaw: number): [number, number] {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    let mn = Infinity;
    let mx = -Infinity;
    const nx = Math.max(2, Math.ceil(w / 1.5));
    const nz = Math.max(2, Math.ceil(d / 1.5));
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const lx = -w / 2 + (w * i) / nx;
        const lz = -d / 2 + (d * j) / nz;
        const h = this.hf.heightAt(x + lx * c + lz * s, z - lx * s + lz * c);
        if (h < mn) mn = h;
        if (h > mx) mx = h;
      }
    }
    return [mn, mx];
  }

  /** Caixa de colisão no quadro do construtor (centro local lx,ly,lz; dimensões totais). */
  box(b: GeoBuilder, lx: number, ly: number, lz: number, w: number, h: number, d: number, tag: ColliderTag, opts: ColliderOptions = {}, yawLocal = 0): Collider {
    const [x, y, z] = b.toWorld(lx, ly, lz);
    const c = this.physics.addBox(x, y, z, w / 2, h / 2, d / 2, b.yaw + yawLocal, tag, opts);
    this.colliders.push(c);
    return c;
  }

  /** Cilindro de colisão vertical (base local ly, altura h). */
  cyl(b: GeoBuilder, lx: number, ly: number, lz: number, r: number, h: number, tag: ColliderTag, opts: ColliderOptions = {}): Collider {
    const [x, y, z] = b.toWorld(lx, ly, lz);
    const c = this.physics.addCylinder(x, z, r, y, y + h, tag, opts);
    this.colliders.push(c);
    return c;
  }

  /** Colisor de parede entre dois pontos locais (XZ) com espessura. */
  wall(b: GeoBuilder, ax: number, az: number, bx: number, bz: number, y0: number, y1: number, thick: number, tag: ColliderTag = 'wall', opts: ColliderOptions = {}): Collider | null {
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) return null;
    const yaw = Math.atan2(dx, dz);
    return this.box(b, (ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2, thick, y1 - y0, len, tag, opts, yaw);
  }

  /** Pegada no mapa (remove grama/flores e bloqueia árvores). Coordenadas locais do quadro. */
  footprint(b: GeoBuilder, lx: number, lz: number, w: number, d: number, yawLocal = 0, margin = 1, dirt = 0) {
    const [x, , z] = b.toWorld(lx, 0, lz);
    this.maps.addFootprint(x, z, w, d, b.yaw + yawLocal, margin, dirt);
  }

  disc(b: GeoBuilder, lx: number, lz: number, r: number, dirt = 0, keepGrass = 0) {
    const [x, , z] = b.toWorld(lx, 0, lz);
    this.maps.addDisc(x, z, r, dirt, keepGrass);
  }

  private zone(b: GeoBuilder, id: string, lx: number, lz: number, w: number, d: number, y0: number, y1: number, yawLocal: number): Zone {
    const [x, , z] = b.toWorld(lx, 0, lz);
    const yaw = b.yaw + yawLocal;
    return { id, x, z, hx: w / 2, hz: d / 2, cos: Math.cos(yaw), sin: Math.sin(yaw), y0, y1 };
  }

  /** Zona de superfície (passos): y0/y1 absolutos. */
  surface(b: GeoBuilder, surface: SurfaceType, lx: number, lz: number, w: number, d: number, y0: number, y1: number, yawLocal = 0, id = '') {
    this.surfaces.push({ ...this.zone(b, id, lx, lz, w, d, y0, y1, yawLocal), surface });
  }

  /** Volume interior (chuva não cai, câmera aproxima): y0/y1 absolutos. */
  indoor(b: GeoBuilder, id: string, lx: number, lz: number, w: number, d: number, y0: number, y1: number, yawLocal = 0) {
    this.indoors.push(this.zone(b, id, lx, lz, w, d, y0, y1, yawLocal));
  }

  light(b: GeoBuilder, lx: number, ly: number, lz: number, color: number, intensity: number, distance: number, mode: LightSpec['mode']) {
    const [x, y, z] = b.toWorld(lx, ly, lz);
    this.lights.push({ x, y, z, color, intensity, distance, mode });
  }

  /** Converte os grupos em malhas e adiciona à cena. */
  finish(parent: THREE.Object3D) {
    const mat = structureMaterial();
    for (const gr of this.groups.values()) {
      if (gr.builder.isEmpty()) continue;
      const mesh = new THREE.Mesh(gr.builder.toGeometry(), mat);
      mesh.name = gr.name;
      mesh.castShadow = gr.castShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.userData.maxDist = gr.maxDist;
      parent.add(mesh);
      this.meshes.push(mesh);
      // libera os arrays JS
      gr.builder = new GeoBuilder();
    }
  }
}

/** Testa se (x,y,z) está dentro de uma zona. */
export function inZone(zn: Zone, x: number, y: number, z: number): boolean {
  if (y < zn.y0 || y > zn.y1) return false;
  const rx = x - zn.x;
  const rz = z - zn.z;
  const lx = rx * zn.cos - rz * zn.sin;
  const lz = rx * zn.sin + rz * zn.cos;
  return Math.abs(lx) <= zn.hx && Math.abs(lz) <= zn.hz;
}
