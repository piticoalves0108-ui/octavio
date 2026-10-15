import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CLIPS, CLIP_DEFS, sampleClip } from '../src/player/animClips';
import { Animator, createLocoParams, type LocoMode } from '../src/player/Animator';
import { B, BONES, POSE_SIZE, R_PITCH, R_ROLL, R_OFFY, createPose } from '../src/player/rig';
import { ANIM_DURATION, ANIM_COMMIT } from '../src/data/player';
import { Cloth } from '../src/player/Cloth';
import { PlayerModel } from '../src/player/PlayerModel';
import { QUALITY_PRESETS } from '../src/data/quality';
import type { PlayerAnim } from '../src/player/Player';

const ANIMS = Object.keys(ANIM_DURATION) as PlayerAnim[];

function finite(p: Float32Array) {
  for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) return false;
  return true;
}
function maxAbs(p: Float32Array) {
  let m = 0;
  for (let i = 0; i < p.length; i++) m = Math.max(m, Math.abs(p[i]));
  return m;
}

describe('clipes de ação', () => {
  it('toda PlayerAnim tem clipe, duração e chaves em ordem', () => {
    expect(ANIMS.length).toBe(16);
    for (const a of ANIMS) {
      const def = CLIP_DEFS[a];
      expect(def, a).toBeDefined();
      let prev = 0;
      for (const k of def.keys) {
        expect(k.t).toBeGreaterThan(prev - 1e-9);
        expect(k.t).toBeLessThanOrEqual(1);
        prev = k.t;
      }
      expect(CLIPS[a].mask.some((v) => v > 0), a).toBe(true);
    }
    for (const [k, v] of Object.entries(ANIM_COMMIT)) {
      expect(ANIMS).toContain(k);
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('sampleClip interpola entre as chaves e prende nas pontas', () => {
    const c = CLIPS.slash1;
    const out = createPose();
    sampleClip(c, 0, out);
    expect(Array.from(out)).toEqual(Array.from(c.poses[0]));
    sampleClip(c, 1, out);
    expect(Array.from(out)).toEqual(Array.from(c.poses[c.poses.length - 1]));
    const mid = (c.times[0] + c.times[1]) / 2;
    sampleClip(c, mid, out);
    const i = B.upperArmR * 3 + 2;
    const lo = Math.min(c.poses[0][i], c.poses[1][i]);
    const hi = Math.max(c.poses[0][i], c.poses[1][i]);
    expect(out[i]).toBeGreaterThanOrEqual(lo - 1e-6);
    expect(out[i]).toBeLessThanOrEqual(hi + 1e-6);
  });
});

describe('Animator', () => {
  it('pose finita em todos os modos e com todas as ações, inclusive com dt grande', () => {
    const an = new Animator();
    const p = createLocoParams();
    const modes: LocoMode[] = ['ground', 'air', 'flight', 'climb', 'swim', 'dodge', 'dead'];
    for (const m of modes) {
      p.mode = m;
      p.speed = m === 'ground' ? 6 : 10;
      p.dodgeT = m === 'dodge' ? 0.4 : -1;
      for (const a of ANIMS) {
        an.play(a, ANIM_DURATION[a]);
        for (let i = 0; i < 8; i++) an.update(i % 2 ? 0.1 : 1 / 60, p);
        expect(finite(an.pose), `${m}/${a}`).toBe(true);
      }
    }
  });

  it('mola da aterrissagem é estável mesmo a 10 FPS', () => {
    const an = new Animator();
    const p = createLocoParams();
    an.landed(1);
    for (let i = 0; i < 200; i++) an.update(0.1, p);
    expect(finite(an.pose)).toBe(true);
    expect(Math.abs(an.pose[R_OFFY])).toBeLessThan(0.1);
    expect(maxAbs(an.pose)).toBeLessThan(Math.PI * 1.5);
  });

  it('rolamento termina sem "desgirar" (2π volta a 0)', () => {
    const an = new Animator();
    const p = createLocoParams();
    p.mode = 'dodge';
    p.dodgeT = 0;
    let maxPitch = 0;
    for (let i = 0; i <= 25; i++) {
      p.dodgeT = i / 25;
      an.update(1 / 60, p);
      maxPitch = Math.max(maxPitch, an.pose[R_PITCH]);
    }
    expect(maxPitch).toBeGreaterThan(Math.PI); // girou de verdade
    p.mode = 'ground';
    p.dodgeT = -1;
    for (let i = 0; i < 30; i++) an.update(1 / 60, p);
    expect(Math.abs(an.pose[R_PITCH])).toBeLessThan(0.3);
  });

  it('passos são sinalizados ao correr e a fase avança com a distância', () => {
    const an = new Animator();
    const p = createLocoParams();
    p.mode = 'ground';
    p.speed = 5.4;
    let steps = 0;
    for (let i = 0; i < 120; i++) {
      an.update(1 / 60, p);
      if (an.footstep) steps++;
    }
    // 2 s a 5,4 m/s com passada de 1,25 m ≈ 8,6 passos (um por meio ciclo)
    expect(steps).toBeGreaterThanOrEqual(7);
    expect(steps).toBeLessThanOrEqual(10);
  });

  it('ação com faceAim e aura nas mãos ao conjurar; morte segura a pose final', () => {
    const an = new Animator();
    const p = createLocoParams();
    an.play('cast', 0.45);
    for (let i = 0; i < 12; i++) an.update(1 / 60, p);
    expect(an.faceAim).toBe(true);
    expect(an.aura[0]).toBeGreaterThan(0.2);
    expect(an.activeActionName()).toBe('cast');
    for (let i = 0; i < 60; i++) an.update(1 / 60, p);
    expect(an.activeActionName()).toBe(null);
    p.mode = 'dead';
    an.play('death', 1.6);
    for (let i = 0; i < 200; i++) an.update(1 / 60, p);
    // deitado de costas (inclinação forte para trás)
    expect(an.pose[R_PITCH]).toBeLessThan(-1.0);
    expect(Math.abs(an.pose[R_ROLL])).toBeLessThan(0.5);
  });

  it('inclinação no voo segue os parâmetros (pitch/bank)', () => {
    const an = new Animator();
    const p = createLocoParams();
    p.mode = 'flight';
    p.flightPitch = 0.7;
    p.flightBank = -0.4;
    p.hover = 0;
    for (let i = 0; i < 120; i++) an.update(1 / 60, p);
    expect(an.pose[R_PITCH]).toBeCloseTo(0.7, 1);
    expect(an.pose[R_ROLL]).toBeCloseTo(-0.4, 1);
  });
});

describe('Cloth (capa Verlet)', () => {
  it('pende sob a gravidade sem esticar demais e acompanha a âncora', () => {
    const anchor = new THREE.Object3D();
    anchor.position.set(0, 2, 0);
    anchor.updateMatrixWorld(true);
    const pts = [new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.2, 0, 0)];
    const cloth = new Cloth({ cols: 3, rows: 8, length: 1.2, flare: 0.3, anchor, anchorPoints: pts, restOut: new THREE.Vector3(0, 0, -1), spheres: [], iterations: 4 }, new THREE.MeshBasicMaterial());
    for (let i = 0; i < 180; i++) cloth.update(1 / 60);
    const bottom = cloth.particle(7, 1, new THREE.Vector3());
    expect(bottom.y).toBeLessThan(2 - 1.0);
    expect(cloth.maxStretch()).toBeLessThan(0.12);
    // anda 3 m: o tecido vem junto (sem resetar)
    for (let i = 0; i < 60; i++) {
      anchor.position.x += 0.05;
      anchor.updateMatrixWorld(true);
      cloth.update(1 / 60);
    }
    const b2 = cloth.particle(7, 1, new THREE.Vector3());
    expect(b2.x).toBeGreaterThan(2.0);
    // vento lateral empurra a bainha
    cloth.wind.set(0, 0, 8);
    for (let i = 0; i < 120; i++) cloth.update(1 / 60);
    expect(cloth.particle(7, 1, new THREE.Vector3()).z).toBeGreaterThan(0.2);
  });
});

describe('PlayerModel (procedural)', () => {
  it('constrói esqueleto, malha única do corpo, capa e cajado', () => {
    const m = new PlayerModel(QUALITY_PRESETS.medium);
    expect(m.bones.length).toBe(BONES.length);
    const g = m.body.geometry;
    expect(g.getAttribute('skinIndex')).toBeDefined();
    expect(g.getAttribute('aGlow')).toBeDefined();
    expect(g.getAttribute('position').count).toBeGreaterThan(2000);
    expect(m.cape).toBeDefined();
    expect(m.tabard).not.toBeNull();
    expect(POSE_SIZE).toBe(BONES.length * 3 + 5);
  });

  it('mãos e ponta do cajado em posições plausíveis; troca de arma', () => {
    const m = new PlayerModel(QUALITY_PRESETS.low);
    expect(m.tabard).toBeNull(); // qualidade baixa: sem tabardo
    const pose = createPose();
    m.applyPose(pose);
    m.root.updateMatrixWorld(true);
    const h = m.getHandWorld('right', new THREE.Vector3());
    expect(h.y).toBeGreaterThan(0.6);
    expect(h.y).toBeLessThan(1.3);
    const tip = m.getTipWorld(new THREE.Vector3());
    expect(tip.distanceTo(h)).toBeGreaterThan(0.8);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.9, 0.02).translate(0, 0.45, 0), new THREE.MeshBasicMaterial());
    m.setWeapon(sword, 'sword');
    m.root.updateMatrixWorld(true);
    const t2 = m.getTipWorld(new THREE.Vector3());
    expect(t2.distanceTo(h)).toBeLessThan(1.1);
    expect(m.defaultStaff.visible).toBe(false);
    m.setWeapon(null);
    expect(m.defaultStaff.visible).toBe(true);
  });
});
