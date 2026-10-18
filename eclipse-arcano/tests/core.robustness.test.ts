/**
 * Robustez do núcleo (lógica pura, sem WebGL): isolamento de erros por entidade,
 * contagem de listeners, entrada (soltar teclas ao perder o foco, F5/F9 fora do gameplay)
 * e configurações novas com valor padrão.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import { EventBus } from '../src/core/EventBus';
import { Entity } from '../src/core/Entity';
import { EntityManager } from '../src/core/EntityManager';
import { DEFAULT_SETTINGS } from '../src/core/Settings';
import { LOCATION_CHECKPOINTS, LOCATION_BY_ID } from '../src/data/world';
import { PLACES } from '../src/data/places';

describe('EntityManager: isolamento de erros', () => {
  it('uma entidade que lança no update não impede as outras nem a remoção adiada', () => {
    const ctx: any = { scene: new THREE.Scene(), sys: { combat: { applyDamage() {} } } };
    const em = new EntityManager(ctx);
    const bad = new Entity('enemy', 'bandit');
    const good = new Entity('enemy', 'bandit');
    const gone = new Entity('pickup', 'neutral');
    let goodUpdates = 0;
    bad.update = () => {
      throw new Error('quebrada');
    };
    good.update = () => void goodUpdates++;
    for (const e of [bad, good, gone]) em.add(e);
    em.remove(gone);
    const orig = console.error;
    const logs: unknown[] = [];
    console.error = (...a: unknown[]) => void logs.push(a);
    try {
      for (let i = 0; i < 10; i++) em.update(1 / 60);
    } finally {
      console.error = orig;
    }
    expect(goodUpdates).toBe(10);
    expect(em.all.includes(gone)).toBe(false);
    expect(em.errorCount).toBe(10);
    expect(logs.length).toBe(1); // registro limitado (sem inundar o console)
  });

  it('clear() mantém só as persistentes e tira os objetos da cena', () => {
    const scene = new THREE.Scene();
    const em = new EntityManager({ scene, sys: { combat: { applyDamage() {} } } } as any);
    const keep = new Entity('npc', 'villager');
    keep.persistent = true;
    const drop = new Entity('enemy', 'bandit');
    em.add(keep);
    em.add(drop);
    em.clear((e) => e.persistent);
    expect(em.all).toEqual([keep]);
    expect(scene.children.includes(drop.object3d)).toBe(false);
    expect(scene.children.includes(keep.object3d)).toBe(true);
  });
});

describe('EventBus: diagnóstico de listeners', () => {
  it('listenerCount soma inscrições e acompanha off/once', () => {
    const bus = new EventBus();
    const off = bus.on('player:jump', () => {});
    bus.on('player:dodge', () => {});
    bus.once('player:dodge', () => {});
    expect(bus.listenerCount()).toBe(3);
    expect(bus.listenerCount('player:dodge')).toBe(2);
    bus.emit('player:dodge', {});
    expect(bus.listenerCount('player:dodge')).toBe(1);
    off();
    expect(bus.listenerCount()).toBe(1);
  });

  it('handler com erro não impede os outros', () => {
    const bus = new EventBus();
    let ok = 0;
    bus.on('player:jump', () => {
      throw new Error('x');
    });
    bus.on('player:jump', () => void ok++);
    const orig = console.error;
    console.error = () => {};
    try {
      bus.emit('player:jump', {});
    } finally {
      console.error = orig;
    }
    expect(ok).toBe(1);
  });
});

describe('Input: foco e ações fora do gameplay', () => {
  let Input: typeof import('../src/core/Input').Input;
  const listeners = new Map<string, (e: any) => void>();
  beforeAll(async () => {
    // DOM mínimo para construir o Input em Node
    const target = () => ({ addEventListener: (t: string, f: (e: any) => void) => listeners.set(t, f), removeEventListener() {} });
    (globalThis as any).window = target();
    (globalThis as any).document = { ...target(), pointerLockElement: null, exitPointerLock() {} };
    Input = (await import('../src/core/Input')).Input;
  });

  it('releaseAll solta teclas presas (blur) e gera "released"', () => {
    const canvas: any = { addEventListener() {}, requestPointerLock() {} };
    const inp = new Input(canvas);
    inp.simulate('KeyW', true);
    expect(inp.down('forward')).toBe(true);
    inp.endFrame();
    inp.releaseAll();
    expect(inp.down('forward')).toBe(false);
    expect(inp.released('forward')).toBe(true);
    inp.endFrame();
    expect(inp.released('forward')).toBe(false);
  });

  it('F5/F9 continuam lidos com o gameplay desligado (pausa/derrota); ataque não', () => {
    const canvas: any = { addEventListener() {}, requestPointerLock() {} };
    const inp = new Input(canvas);
    inp.gameplayEnabled = false;
    inp.simulate('F9', true);
    inp.simulate('F5', true);
    inp.simulate('Mouse0', true);
    expect(inp.pressed('quickload')).toBe(true);
    expect(inp.pressed('quicksave')).toBe(true);
    expect(inp.pressed('attack')).toBe(false);
  });
});

describe('Configurações e checkpoints', () => {
  it('pauseOnFocusLoss existe e vem ligado por padrão', () => {
    expect(DEFAULT_SETTINGS.pauseOnFocusLoss).toBe(true);
  });

  it('todo checkpoint automático aponta para um local e uma âncora existentes', () => {
    for (const [loc, anchor] of Object.entries(LOCATION_CHECKPOINTS)) {
      expect(LOCATION_BY_ID[loc], loc).toBeTruthy();
      expect(PLACES[anchor], anchor).toBeTruthy();
    }
  });

  it('o checkpoint da Câmara do Guardião fica fora da arena', async () => {
    const { BOSS_ARENAS } = await import('../src/data/world');
    const a = BOSS_ARENAS.guardiao_mecanico;
    const p = PLACES[LOCATION_CHECKPOINTS.camara_guardiao];
    expect(Math.hypot(p.x - a.x, p.z - a.z)).toBeGreaterThan(a.radius + 10);
  });
});
