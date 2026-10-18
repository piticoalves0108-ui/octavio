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

describe('EntityManager: grid espacial numérico', () => {
  const mk = () => new EntityManager({ scene: new THREE.Scene(), sys: { combat: { applyDamage() {} } } } as any);
  const at = (x: number, z: number, r = 0.5) => {
    const e = new Entity('enemy', 'bandit');
    e.position.set(x, 0, z);
    e.radius = r;
    return e;
  };

  it('acha entidades nas células vizinhas e em coordenadas negativas', () => {
    const em = mk();
    const a = at(15.9, -0.1);
    const b = at(16.1, 0.1);
    const c = at(-16.2, -31.9);
    for (const e of [a, b, c]) em.add(e);
    const out: Entity[] = [];
    expect(em.queryRadius(new THREE.Vector3(16, 0, 0), 1, out).sort((x, y) => x.id - y.id)).toEqual([a, b]);
    expect(em.queryRadius(new THREE.Vector3(-16, 0, -32), 1, out)).toEqual([c]);
  });

  it('entidade grande (chefe) com o centro na célula vizinha entra na consulta', () => {
    const em = mk();
    const boss = at(36.5, 0, 6); // borda em x = 30,5; centro na célula 2
    em.add(boss);
    em.update(0);
    // consulta de 1,5 m a partir de x = 29: alcança a borda do chefe, mas o centro está fora das células [0,1]
    expect(em.queryRadius(new THREE.Vector3(29, 0, 0), 1.6)).toEqual([boss]);
    expect(em.nearest(new THREE.Vector3(29, 0, 0), 1.6)).toBe(boss);
  });

  it('acompanha o movimento, posição NaN não quebra e raio inválido/enorme funciona', () => {
    const em = mk();
    const e = at(0, 0);
    const other = at(500, 500);
    em.add(e);
    em.add(other);
    e.position.set(100, 0, 100);
    em.update(1 / 60);
    expect(em.queryRadius(new THREE.Vector3(0, 0, 0), 2)).toEqual([]);
    expect(em.queryRadius(new THREE.Vector3(100, 0, 100), 2)).toEqual([e]);
    e.position.set(NaN, 0, NaN);
    em.update(1 / 60);
    expect(em.queryRadius(new THREE.Vector3(100, 0, 100), 2)).toEqual([]);
    e.position.set(3, 0, 3);
    em.update(1 / 60);
    expect(em.queryRadius(new THREE.Vector3(3, 0, 3), 1)).toEqual([e]);
    expect(em.queryRadius(new THREE.Vector3(0, 0, 0), NaN)).toEqual([]);
    expect(em.queryRadius(new THREE.Vector3(0, 0, 0), 1e7).length).toBe(2);
  });

  it('remover limpa o grid (sem células órfãs) e não indexa entidades não consultáveis', () => {
    const em = mk();
    const list = Array.from({ length: 50 }, (_, i) => em.add(at(i * 20, -i * 20)));
    const ghost = at(0, 0);
    ghost.queryable = false;
    em.add(ghost);
    em.update(1 / 60);
    expect(em.gridStats().indexed).toBe(50);
    for (const e of list) em.remove(e);
    em.update(1 / 60);
    expect(em.gridStats()).toEqual({ cells: 0, indexed: 0 });
    expect(em.queryRadius(new THREE.Vector3(0, 0, 0), 5)).toEqual([]);
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

  it('lookDelta reutiliza o mesmo objeto (sem alocar por quadro) e zera fora do gameplay', () => {
    const input = new Input({ addEventListener() {} } as any);
    const a = input.lookDelta();
    const b = input.lookDelta();
    expect(a).toBe(b);
    input.mouseDX = 10;
    input.gameplayEnabled = false;
    expect(input.lookDelta()).toEqual({ x: 0, y: 0 });
    input.gameplayEnabled = true;
    expect(input.lookDelta().x).toBeCloseTo(0.022);
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
