import { describe, it, expect } from 'vitest';
import { generateHeight, Heightfield } from '../src/world/heightfield';
import { CollisionWorld } from '../src/world/Collision';
import { Gate } from '../src/world/structures/gates';
import { inZone } from '../src/world/structures/kit';
import { GeoBuilder, P } from '../src/world/structures/builder';
import { LAYER } from '../src/world/textures';
import { riverFlow } from '../src/world/water';
import { LOCATIONS, LOCATION_BY_ID, RIVERS, WORLD_HALF } from '../src/data/world';
import { rotYaw } from '../src/data/places';
import { PLAYER_BODY } from '../src/data/player';

/** Inclinação máxima (graus) ao longo de um raio que sai do centro de um local aplainado. */
function maxSlopeAlong(x: number, z: number, ang: number, r0: number, r1: number) {
  let maxS = 0;
  const dx = Math.cos(ang);
  const dz = Math.sin(ang);
  let prev = generateHeight(x + dx * r0, z + dz * r0);
  for (let r = r0 + 1; r <= r1; r += 1) {
    const h = generateHeight(x + dx * r, z + dz * r);
    maxS = Math.max(maxS, (Math.atan(Math.abs(h - prev)) * 180) / Math.PI);
    prev = h;
  }
  return maxS;
}

/** Heightfield sintético (sem gerar o relevo real, que é caro): h = f(x, z). */
function syntheticHeightfield(f: (x: number, z: number) => number) {
  const hf = new Heightfield();
  for (let j = 0; j < hf.res; j++) {
    for (let i = 0; i < hf.res; i++) hf.data[j * hf.res + i] = f(-WORLD_HALF + i * hf.spacing, -WORLD_HALF + j * hf.spacing);
  }
  return hf;
}

describe('relevo: locais aplainados acessíveis a pé', () => {
  const flat = LOCATIONS.filter((l) => l.flattenTo !== undefined);

  it('todo local aplainado tem ao menos uma encosta caminhável (≤ maxSlopeDeg do jogador)', () => {
    for (const l of flat) {
      const outer = (l.flattenOuter ?? l.radius * 1.5) + 6;
      let walkable = 0;
      for (let k = 0; k < 12; k++) if (maxSlopeAlong(l.x, l.z, (k / 12) * Math.PI * 2, l.radius * 0.8, outer) < PLAYER_BODY.maxSlopeDeg - 3) walkable++;
      expect(walkable, l.id).toBeGreaterThan(0);
    }
  });

  it('a Torre do Observador fica numa colina suave (sem paredão em volta)', () => {
    const t = LOCATION_BY_ID['torre_observador'];
    let walkable = 0;
    for (let k = 0; k < 12; k++) if (maxSlopeAlong(t.x, t.z, (k / 12) * Math.PI * 2, t.radius * 0.8, t.flattenOuter! + 6) < 40) walkable++;
    expect(walkable).toBeGreaterThanOrEqual(10);
    // o miolo continua plano na altura pedida
    expect(Math.abs(generateHeight(t.x + 5, t.z - 4) - t.flattenTo!)).toBeLessThan(0.6);
  });

  it('o leito do rio fica abaixo da linha d’água', () => {
    for (const r of RIVERS) {
      for (let i = 1; i < r.points.length - 1; i++) {
        const [x, z] = r.points[i];
        if (Math.max(Math.abs(x), Math.abs(z)) > 900) continue;
        expect(generateHeight(x, z), `${r.id} #${i}`).toBeLessThan(4);
      }
    }
  });
});

describe('Heightfield: LOD grosso e afundamento (lodSag)', () => {
  it('num plano inclinado o LOD grosso coincide com o relevo (sag ≈ 0)', () => {
    const hf = syntheticHeightfield((x, z) => 10 + 0.1 * x - 0.05 * z);
    for (const [x, z] of [
      [3.3, -7.1],
      [100.5, 200.25],
      [-511, 13],
    ]) {
      expect(hf.coarseHeightAt(x, z, 16)).toBeCloseTo(hf.heightAt(x, z), 4);
      expect(hf.lodSag(x, z)).toBeLessThan(1e-3);
    }
  });

  it('numa crista aguda o relevo real fica acima do LOD grosso', () => {
    // crista em x = 6 (fora da grade de 4/8/16 m, que passa por múltiplos de 4 a partir de -1024)
    const hf = syntheticHeightfield((x) => 50 - 2 * Math.abs(x - 6));
    expect(hf.lodSag(6, 0)).toBeGreaterThan(3);
    // longe da crista (plano) não há afundamento
    expect(hf.lodSag(60, 0)).toBeLessThan(1e-3);
  });

  it('coarseHeightAt bate com heightAt nos nós da grade grossa', () => {
    const hf = syntheticHeightfield((x, z) => Math.sin(x * 0.05) * 8 + Math.cos(z * 0.07) * 5);
    for (const [x, z] of [
      [-1024 + 16 * 10, -1024 + 16 * 33],
      [0, 0],
      [-1024 + 8 * 101, -1024 + 8 * 7],
    ]) {
      // os três pontos ficam em nós da grade de 8 m; os dois primeiros também na de 16 m
      expect(hf.coarseHeightAt(x, z, 8)).toBeCloseTo(hf.heightAt(x, z), 4);
      if ((x + 1024) % 16 === 0 && (z + 1024) % 16 === 0) expect(hf.coarseHeightAt(x, z, 16)).toBeCloseTo(hf.heightAt(x, z), 4);
    }
  });
});

describe('colisão + portões', () => {
  const hf = syntheticHeightfield(() => 0);
  const phys = new CollisionWorld(hf);

  it('portão fechado bloqueia; aberto libera depois de meio caminho', () => {
    const gate = new Gate('teste', 'Portão de teste', false, 1);
    const c = phys.addBox(0, 2, 0, 3, 2, 0.4, 0, 'gate', { walkable: false });
    gate.colliders.push(c);
    gate.apply();
    expect(c.enabled).toBe(true);
    const p = { x: 0, y: 0, z: -2 } as unknown as import('three').Vector3;
    const walk = () => {
      p.x = 0;
      p.y = 0;
      p.z = -2;
      for (let i = 0; i < 40; i++) {
        p.z += 0.1;
        phys.resolveCapsule(p, 0.45, 1.8);
      }
      return p.z;
    };
    expect(walk()).toBeLessThan(-0.8); // parou antes da folha
    gate.open = true;
    gate.update(0.3);
    expect(c.enabled).toBe(true); // ainda abrindo (t < 0,5)
    gate.update(0.5);
    expect(gate.t).toBeGreaterThan(0.5);
    expect(c.enabled).toBe(false);
    expect(walk()).toBeGreaterThan(1.5); // passou
    gate.update(1);
    expect(gate.t).toBe(1);
    expect(gate.moving).toBe(false);
    gate.open = false;
    gate.update(0.05);
    expect(c.enabled).toBe(true); // fechando: bloqueia de imediato
  });

  it('groundHeight sobe em plataformas caminháveis só até o degrau', () => {
    const plat = phys.addBox(20, 0.25, 20, 2, 0.25, 2, 0, 'platform');
    expect(phys.groundHeight(20, 20, 0)).toBeCloseTo(0.5, 5);
    const roof = phys.addBox(30, 5, 30, 2, 0.25, 2, 0, 'building');
    expect(phys.groundHeight(30, 30, 0)).toBe(0); // telhado alto não "teleporta"
    phys.remove(plat);
    phys.remove(roof);
    expect(phys.groundHeight(20, 20, 0)).toBe(0);
  });
});

describe('construtor de geometria e zonas', () => {
  it('toWorld usa a mesma convenção de yaw de places.rotYaw', () => {
    const b = new GeoBuilder();
    for (const yaw of [0, 0.7, Math.PI / 2, -2.2]) {
      b.frame(10, 2, -5, yaw);
      const [x, y, z] = b.toWorld(1.5, 1, 3);
      const [rx, rz] = rotYaw(yaw, 1.5, 3);
      expect(x).toBeCloseTo(10 + rx, 6);
      expect(y).toBeCloseTo(3, 6);
      expect(z).toBeCloseTo(-5 + rz, 6);
    }
  });

  it('caixa = 6 faces (24 vértices, 36 índices) com normais para fora', () => {
    const b = new GeoBuilder();
    b.frame(0, 0, 0, 0.4);
    b.box(0, 1, 0, 2, 2, 2, P(LAYER.STONE));
    expect(b.vertexCount).toBe(24);
    expect(b.idx.length).toBe(36);
    for (let v = 0; v < 24; v++) {
      const px = b.pos[v * 3];
      const py = b.pos[v * 3 + 1] - 1;
      const pz = b.pos[v * 3 + 2];
      const d = px * b.nrm[v * 3] + py * b.nrm[v * 3 + 1] + pz * b.nrm[v * 3 + 2];
      expect(d).toBeGreaterThan(0);
    }
  });

  it('inZone respeita rotação e faixa de altura', () => {
    const yaw = Math.PI / 4;
    const zn = { id: 'z', x: 0, z: 0, hx: 4, hz: 1, cos: Math.cos(yaw), sin: Math.sin(yaw), y0: 0, y1: 3 };
    const [ax, az] = rotYaw(yaw, 3.5, 0); // dentro, ao longo do eixo local X
    const [bx, bz] = rotYaw(yaw, 0, 3.5); // fora, ao longo do eixo local Z
    expect(inZone(zn, ax, 1, az)).toBe(true);
    expect(inZone(zn, bx, 1, bz)).toBe(false);
    expect(inZone(zn, ax, 3.5, az)).toBe(false);
  });
});

describe('água', () => {
  it('a correnteza segue o rio perto do leito e some longe dele', () => {
    const r = RIVERS[0];
    const [ax, az] = r.points[3];
    const [bx, bz] = r.points[4];
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    const [fx, fz] = riverFlow(mx, mz);
    const L = Math.hypot(bx - ax, bz - az);
    expect((fx * (bx - ax) + fz * (bz - az)) / L).toBeGreaterThan(1);
    const far = riverFlow(mx + 300, mz);
    expect(Math.hypot(far[0], far[1])).toBe(0);
  });
});
