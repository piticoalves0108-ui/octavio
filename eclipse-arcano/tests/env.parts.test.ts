import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Rain } from '../src/env/Rain';
import { GroundFog, type GroundFogSampler } from '../src/env/GroundFog';
import { LightningBolt } from '../src/env/Lightning';
import { RNG } from '../src/core/rng';
import { GROUND_FOG, LIGHTNING, RAIN } from '../src/data/weather';
import { WATER_LEVEL, type BiomeId } from '../src/data/world';

const rnd = (seed: number) => {
  const r = new RNG(seed);
  return () => r.next();
};

describe('chuva (CPU)', () => {
  it('quads sem culling (regressão: gotas e anéis sumiam por back-face culling)', () => {
    const rain = new Rain();
    expect((rain.drops.material as THREE.Material).side).toBe(THREE.DoubleSide);
    expect((rain.splashes.material as THREE.Material).side).toBe(THREE.DoubleSide);
  });

  it('quantidade desenhada = capacidade × intensidade; invisível sem chuva', () => {
    const rain = new Rain();
    rain.configure(6000, 1);
    rain.update(1 / 60, 0, 0, 0, 0.002);
    expect(rain.drops.visible).toBe(false);
    rain.update(1 / 60, 0.5, 2, 1, 0.002);
    expect(rain.activeDrops).toBe(3000);
    expect((rain.drops.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(3000);
    expect(rain.drops.visible).toBe(true);
    // reconfigurar para um preset menor limita a quantidade
    rain.configure(1500, 0.35);
    rain.update(1 / 60, 1, 0, 0, 0.002);
    expect(rain.activeDrops).toBe(1500);
  });

  it('respingos: só no raio, no chão informado, e nunca onde o chão é NaN (interior)', () => {
    const rain = new Rain();
    rain.configure(6000, 1);
    const ground = (x: number, z: number) => (x > 0 ? NaN : 10 + z * 0);
    const r = rnd(3);
    for (let i = 0; i < 120; i++) rain.updateSplashes(1 / 30, 1, 0, 0, ground, r);
    expect(rain.activeSplashes).toBeGreaterThan(20);
    const geo = rain.splashes.geometry as THREE.InstancedBufferGeometry;
    const pos = geo.getAttribute('aPos') as THREE.InstancedBufferAttribute;
    const dat = geo.getAttribute('aData') as THREE.InstancedBufferAttribute;
    let alive = 0;
    for (let i = 0; i < pos.count; i++) {
      if (dat.getX(i) < -5000) continue;
      alive++;
      expect(pos.getX(i)).toBeLessThanOrEqual(0); // lado coberto (NaN) nunca recebe respingo
      expect(Math.hypot(pos.getX(i), pos.getZ(i))).toBeLessThanOrEqual(RAIN.splashRadius + 1e-6);
      expect(pos.getY(i)).toBeCloseTo(10.03, 4);
    }
    expect(alive).toBeGreaterThan(0);
    // água: respingo na superfície
    const water = () => WATER_LEVEL - 2;
    const rain2 = new Rain();
    rain2.configure(6000, 1);
    for (let i = 0; i < 30; i++) rain2.updateSplashes(1 / 30, 1, 0, 0, water, r);
    const p2 = (rain2.splashes.geometry as THREE.InstancedBufferGeometry).getAttribute('aPos') as THREE.InstancedBufferAttribute;
    const d2 = (rain2.splashes.geometry as THREE.InstancedBufferGeometry).getAttribute('aData') as THREE.InstancedBufferAttribute;
    for (let i = 0; i < p2.count; i++) if (d2.getX(i) > -5000) expect(p2.getY(i)).toBeCloseTo(WATER_LEVEL + 0.03, 4);
    // parar de chover esconde e zera
    rain.updateSplashes(1 / 30, 0, 0, 0, ground, r);
    expect(rain.splashes.visible).toBe(false);
    expect(rain.activeSplashes).toBe(0);
  });
});

describe('névoa rasteira (layout)', () => {
  const sampler = (biome: (x: number, z: number) => BiomeId, weight: (b: BiomeId) => number): GroundFogSampler => ({
    biomeAt: biome,
    heightAt: () => 6,
    weight,
  });

  it('pântano enche o pool; vila não recebe nada; layout só muda ao trocar de célula', () => {
    const fog = new GroundFog(new THREE.DataTexture(new Uint8Array(4), 1, 1));
    fog.configure(GROUND_FOG.count);
    fog.update(0.016, 0, 0, 1, sampler(() => 'swamp', (b) => (b === 'swamp' ? 1 : 0)));
    expect(fog.active).toBe(GROUND_FOG.count);
    expect(fog.mesh.visible).toBe(true);
    const fog2 = new GroundFog(new THREE.DataTexture(new Uint8Array(4), 1, 1));
    fog2.configure(GROUND_FOG.count);
    fog2.update(0.016, 0, 0, 1, sampler(() => 'village', () => 0));
    expect(fog2.active).toBe(0);
    expect(fog2.mesh.visible).toBe(false);
    // metade do mundo com pântano: sprites só nessa metade
    const fog3 = new GroundFog(new THREE.DataTexture(new Uint8Array(4), 1, 1));
    fog3.configure(GROUND_FOG.count);
    fog3.update(0.016, 0, 0, 1, sampler((x) => (x < 0 ? 'swamp' : 'meadow'), (b) => (b === 'swamp' ? 1 : 0)));
    const a = (fog3.mesh.geometry as THREE.InstancedBufferGeometry).getAttribute('aPos') as THREE.InstancedBufferAttribute;
    for (let i = 0; i < fog3.active; i++) {
      expect(a.getX(i)).toBeLessThan(0);
      expect(Math.hypot(a.getX(i), a.getZ(i))).toBeLessThanOrEqual(GROUND_FOG.radius);
    }
    // interior: amount 0 esconde
    fog3.update(0.016, 0, 0, 0, sampler(() => 'swamp', () => 1));
    expect(fog3.mesh.visible).toBe(false);
  });
});

describe('raio', () => {
  it('gera segmentos, aparece com alfa e some no fim', () => {
    const bolt = new LightningBolt();
    bolt.setAlpha(1);
    expect(bolt.mesh.visible).toBe(false); // sem raio ainda
    bolt.strike(new THREE.Vector3(0, 330, 0), new THREE.Vector3(20, 3, 40), rnd(5));
    expect(bolt.segmentCount).toBeGreaterThan(LIGHTNING.segments);
    expect(bolt.mesh.geometry.drawRange.count).toBe(bolt.segmentCount * 6);
    bolt.setAlpha(0.8);
    expect(bolt.mesh.visible).toBe(true);
    bolt.setAlpha(0);
    expect(bolt.mesh.visible).toBe(false);
  });
});
