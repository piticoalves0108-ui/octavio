import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { SurfaceType } from '../core/EventBus';
import { LOCATIONS, WATER_LEVEL, WORLD_SIZE, BIOME_INFO, type LocationDef } from '../data/world';

/**
 * STUB — mundo aberto. O módulo world/ substitui a implementação (terreno em chunks
 * com LOD, streaming, vegetação, estruturas, água, colisores) mantendo a API pública.
 */
export class World implements GameSystem, Saveable {
  readonly name = 'world';
  readonly saveKey = 'world';
  /** Locais já descobertos (ids). */
  discovered = new Set<string>();
  /** Local em que o jogador está agora (ou null). */
  currentLocation: LocationDef | null = null;
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
    const hf = ctx.heightfield;
    const seg = 256;
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, seg, seg);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, hf.heightAt(x, z));
      const c = BIOME_INFO[hf.biomeAt(x, z)].color;
      colors.set(c, i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    terrain.receiveShadow = true;
    ctx.scene.add(terrain);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2a5f8a, transparent: true, opacity: 0.75 }));
    water.position.y = WATER_LEVEL;
    ctx.scene.add(water);
  }

  update(_dt: number, ctx: GameContext) {
    const p = ctx.sys.player.position;
    let found: LocationDef | null = null;
    for (const l of LOCATIONS) {
      const d = Math.hypot(p.x - l.x, p.z - l.z);
      if (d < l.discoverRadius && !this.discovered.has(l.id)) this.discover(l.id);
      if (d < l.radius && l.kind !== 'region' && (!found || l.radius < found.radius)) found = l;
    }
    if (found !== this.currentLocation) {
      this.currentLocation = found;
      if (found) ctx.events.emit('location:entered', { locationId: found.id, name: found.name });
    }
  }

  discover(id: string) {
    const l = LOCATIONS.find((x) => x.id === id);
    if (!l || this.discovered.has(id)) return;
    this.discovered.add(id);
    this.ctx.events.emit('location:discovered', { locationId: id, name: l.name });
  }

  /** Tipo de superfície (passos, partículas). */
  surfaceAt(x: number, z: number): SurfaceType {
    if (this.ctx.heightfield.isWater(x, z)) return 'water';
    return BIOME_INFO[this.ctx.heightfield.biomeAt(x, z)].surface;
  }

  /** Abre/fecha portões controlados pela história (ex.: 'portao_ferroluz'). */
  setGateOpen(_gateId: string, _open: boolean) {}

  onNewGame() {
    this.discovered.clear();
    this.currentLocation = null;
  }

  serialize() {
    return { discovered: [...this.discovered] };
  }
  deserialize(data: any) {
    this.discovered = new Set(Array.isArray(data?.discovered) ? data.discovered.filter((s: unknown) => typeof s === 'string') : []);
  }
}
