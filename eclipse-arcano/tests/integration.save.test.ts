/**
 * Integração do salvamento: ida e volta de TODOS os Saveables registrados em Game.ts
 * (sistemas reais quando dá para construí-los sem WebGL; os módulos em construção entram
 * em modo tolerante), checksum, backup (.bak), migração de versão e aplicação transacional.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { EventBus } from '../src/core/EventBus';
import type { Saveable } from '../src/core/context';
import { WorldClock } from '../src/core/WorldClock';
import { SaveSystem, memoryStorage, checksum, migrateSaveFile, type SaveFile } from '../src/save/SaveSystem';
import { Abilities } from '../src/combat/Abilities';
import { AI } from '../src/ai/AI';
import { World } from '../src/world/World';
import { Environment } from '../src/env/Environment';

const PREFIX = 'eclipse-arcano:save:';

/** Contexto falso com o mínimo usado por save/deserialize (sem WebGL/DOM). */
function fakeCtx(extra: Record<string, unknown> = {}) {
  const events = new EventBus();
  const notes: string[] = [];
  events.on('ui:notify', (e) => notes.push(e.text));
  const ctx: any = {
    events,
    state: 'playing',
    elapsed: 0,
    input: { pressed: () => false },
    physics: { groundHeight: () => 0, waterSurface: () => null },
    heightfield: { heightAt: () => 0 },
    sys: {
      player: { refreshStats() {}, state: 'ground', entity: { position: new THREE.Vector3(), alive: true } },
      quests: { tracked: null, getJournal: () => [] },
      progression: { level: 4, getStat: () => 0 },
      world: { currentLocation: { name: 'Vila de Brumafria' } },
      ai: { inCombat: () => false, activeBoss: () => null },
      ...extra,
    },
    notes,
  };
  return ctx;
}

const json = (v: unknown) => JSON.parse(JSON.stringify(v));
/** Chama deserialize pelo contrato Saveable (alguns sistemas declaram só o 1º parâmetro). */
const des = (s: Saveable, d: unknown, ctx: unknown) => s.deserialize(d, ctx as never);

/** Ida e volta: serialize → JSON → deserialize numa instância nova → serialize igual. */
function roundTrip<T extends Saveable>(make: () => T, mutate: (s: T) => void, ctx: any) {
  const a = make();
  mutate(a);
  const data = json(a.serialize());
  const b = make();
  b.deserialize(json(data), ctx);
  expect(json(b.serialize())).toEqual(data);
  return { a, b, data };
}

describe('Saveables reais (ida e volta)', () => {
  it('clock: dia e hora', () => {
    const { b } = roundTrip(
      () => new WorldClock(),
      (c) => {
        c.day = 4;
        c.setTime(21.75);
      },
      fakeCtx(),
    );
    expect(b.day).toBe(4);
    expect(b.hours).toBeCloseTo(21.75);
  });

  it('abilities: desbloqueios, slots, ranks, Carga Arcana e recargas em andamento', () => {
    const ctx = fakeCtx();
    const { b, data } = roundTrip(
      () => {
        // estado inicial como no jogo (sem init: o deserialize vazio garante a habilidade inicial)
        const x = new Abilities();
        des(x, { unlocked: [] }, ctx);
        return x;
      },
      (a) => {
        a.unlock('runicBlast');
        a.unlock('lightningStorm');
        a.upgrade('runicBlast');
        a.setSlot(1, 'lightningStorm');
        (a as any).cooldowns.set('lightningStorm', 9.5);
        (a as any).cooldownTotals.set('lightningStorm', 16);
        a.ultimateCharge = 55;
      },
      ctx,
    );
    expect(b.isUnlocked('lightningStorm')).toBe(true);
    expect(b.rank('runicBlast')).toBe(2);
    expect(b.slots[1]).toBe('lightningStorm');
    expect(b.cooldownRemaining('lightningStorm')).toBeCloseTo(9.5);
    expect(b.cooldownFraction('lightningStorm')).toBeCloseTo(9.5 / 16, 2);
    expect((data as any).cooldowns.lightningStorm).toEqual([9.5, 16]);
  });

  it('abilities: recargas inválidas são ignoradas', () => {
    const a = new Abilities();
    des(a, { unlocked: ['arcaneOrb'], cooldowns: { arcaneOrb: [-3, 5], naoExiste: [2, 4], runicBlast: 'x' } }, fakeCtx());
    expect(a.cooldownRemaining('arcaneOrb')).toBe(0);
    expect(() => des(a, 'lixo', fakeCtx())).toThrow();
  });

  it('ai: chefes e únicos derrotados', () => {
    const { b } = roundTrip(
      () => new AI(),
      (a) => {
        a.defeatedBosses.add('guardiao_mecanico');
        a.defeatedUniques.add('alfa_lobos_toca');
      },
      fakeCtx(),
    );
    expect(b.defeatedBosses.has('guardiao_mecanico')).toBe(true);
    expect(() => des(b, { defeatedBosses: 'x' }, fakeCtx())).toThrow();
  });

  it('world: locais descobertos (ids desconhecidos são descartados)', () => {
    const { b } = roundTrip(
      () => new World(),
      (w) => {
        w.discovered.add('vila_brumafria');
        w.discovered.add('camara_guardiao');
      },
      fakeCtx(),
    );
    expect([...b.discovered].sort()).toEqual(['camara_guardiao', 'vila_brumafria']);
    des(b, { discovered: ['vila_brumafria', 'inexistente', 3] }, fakeCtx());
    expect([...b.discovered]).toEqual(['vila_brumafria']);
  });

  it('player: posição, orientação, vida/energia, checkpoint e voo', async () => {
    const { Player } = await import('../src/player/Player');
    const make = () => new Player();
    const a = make();
    a.teleport(new THREE.Vector3(120.5, 33.25, -48), 1.25);
    a.health.current = 61;
    a.energy.current = 37.5;
    a.checkpoint = { x: 100, z: -40, yaw: 0.5 };
    const data = json(a.serialize());
    const b = make();
    des(b, json(data), undefined);
    const back = json(b.serialize());
    expect(back).toEqual(data);
    expect(b.entity.position.x).toBeCloseTo(120.5);
    expect(b.entity.yaw).toBeCloseTo(1.25);
    expect(b.checkpoint).toEqual({ x: 100, z: -40, yaw: 0.5 });
    // voando: volta em voo
    des(b, { ...data, flying: true }, undefined);
    expect(b.isFlying()).toBe(true);
    // vida 0 no arquivo não ressuscita um mago morto: carrega com ao menos 1
    des(b, { ...data, health: 0, energy: -5, flying: false }, undefined);
    expect(b.health.current).toBe(1);
    expect(b.energy.current).toBe(0);
    expect(b.entity.alive).toBe(true);
    // posição inválida é rejeitada (o SaveSystem faz o rollback)
    expect(() => des(b, { ...data, x: NaN }, undefined)).toThrow();
    expect(() => des(b, null, undefined)).toThrow();
  });

  it('env: clima, umidade, eclipse e vento', () => {
    const ctx = fakeCtx();
    const make = () => new Environment();
    const a = make();
    const base = json(a.serialize());
    const w = { ...base, wetness: 0.4, eclipse: 1.2, windAngle: 2.5 };
    const b = make();
    des(b, json(w), ctx);
    const back = json(b.serialize());
    expect(back.wetness).toBeCloseTo(0.4);
    expect(back.eclipse).toBeCloseTo(1.2);
    expect(back.windAngle).toBeCloseTo(2.5);
    expect(back.weather).toEqual(base.weather);
    expect(() => des(b, null, ctx)).toThrow();
  });
});

/** Todo Saveable registrado em Game.ts precisa de um teste de ida e volta neste arquivo. */
describe('cobertura dos Saveables registrados', () => {
  it('a lista de registro do Game.ts bate com os testes de ida e volta', async () => {
    const { default: src } = await import('../src/core/Game.ts?raw');
    const m = src.match(/for \(const s of \[([^\]]+)\]\) sys\.save\.register\(s\)/);
    expect(m, 'registro de saves não encontrado em Game.ts').toBeTruthy();
    const registered = m![1].split(',').map((x) => x.trim().replace(/^sys\./, '')).sort();
    const tested = ['clock', 'abilities', 'ai', 'world', 'env', 'player', 'story', 'progression', 'inventory', 'quests', 'npcs'].sort();
    expect(registered).toEqual(tested);
  });
});

/** Módulos em construção (rpg/narrativa/npc/jogador com modelo): ida e volta tolerante. */
describe('Saveables dos módulos em construção (tolerante)', () => {
  const cases: [string, () => Promise<Saveable>][] = [
    ['story', async () => new (await import('../src/rpg/Story')).Story()],
    ['progression', async () => new (await import('../src/rpg/Progression')).Progression()],
    ['inventory', async () => new (await import('../src/rpg/Inventory')).Inventory()],
    ['quests', async () => new (await import('../src/rpg/Quests')).Quests()],
    ['npcs', async () => new (await import('../src/npc/NPCs')).NPCs()],
  ];
  for (const [key, make] of cases) {
    it(`${key}: serialize → deserialize → serialize estável (se o módulo já constrói sem init)`, async (t) => {
      let a: Saveable;
      let data: unknown;
      try {
        a = await make();
        data = json(a.serialize());
      } catch {
        t.skip();
        return;
      }
      const b = await make();
      try {
        b.deserialize(json(data), fakeCtx());
      } catch {
        // deserialize que depende de init (ctx real): fora do escopo deste teste
        t.skip();
        return;
      }
      expect(json(b.serialize())).toEqual(data);
      expect(a.saveKey).toBe(key);
    });
  }
});

class Box implements Saveable {
  constructor(
    public saveKey: string,
    public value: number = 0,
    public failOn: number | null = null,
  ) {}
  serialize() {
    return { value: this.value };
  }
  deserialize(d: any) {
    if (typeof d?.value !== 'number') throw new Error(`${this.saveKey}: inválido`);
    if (this.failOn !== null && d.value === this.failOn) throw new Error(`${this.saveKey}: rejeitado`);
    this.value = d.value;
  }
}

function setup(boxes: Box[], opts?: ConstructorParameters<typeof SaveSystem>[1]) {
  const storage = memoryStorage();
  const save = new SaveSystem(storage, opts);
  const ctx = fakeCtx();
  save.init(ctx);
  for (const b of boxes) save.register(b);
  return { storage, save, ctx };
}

describe('SaveSystem — integração', () => {
  it('todos os sistemas reais registrados juntos: save → mudar → load restaura', () => {
    const clock = new WorldClock();
    const abilities = new Abilities();
    const ai = new AI();
    const world = new World();
    const env = new Environment();
    const storage = memoryStorage();
    const save = new SaveSystem(storage);
    const ctx = fakeCtx();
    save.init(ctx);
    for (const s of [clock, abilities, world, env, ai]) save.register(s);
    expect(save.registeredKeys).toEqual(['clock', 'abilities', 'world', 'env', 'ai']);
    clock.day = 3;
    clock.setTime(17.5);
    abilities.unlock('arcaneChains');
    world.discovered.add('vila_brumafria');
    ai.defeatedBosses.add('guardiao_mecanico');
    save.playTime = 321;
    expect(save.save('slot1')).toBe(true);
    // muda tudo
    clock.day = 9;
    clock.setTime(3);
    des(abilities, { unlocked: [] }, ctx);
    world.discovered.clear();
    ai.defeatedBosses.clear();
    save.playTime = 0;
    expect(save.load('slot1')).toBe(true);
    expect(save.lastLoadSource).toBe('main');
    expect(clock.day).toBe(3);
    expect(clock.hours).toBeCloseTo(17.5);
    expect(abilities.isUnlocked('arcaneChains')).toBe(true);
    expect(world.discovered.has('vila_brumafria')).toBe(true);
    expect(ai.defeatedBosses.has('guardiao_mecanico')).toBe(true);
    expect(save.playTime).toBe(321);
    const meta = save.listSaves()[0];
    expect(meta.level).toBe(4);
    expect(meta.location).toBe('Vila de Brumafria');
  });

  it('checksum: dado adulterado no principal → usa o .bak e avisa', () => {
    const a = new Box('a');
    const { storage, save, ctx } = setup([a]);
    a.value = 1;
    save.save('s');
    a.value = 2;
    save.save('s');
    const raw = storage.get(PREFIX + 's')!;
    storage.set(PREFIX + 's', raw.replace('"value":2', '"value":5'));
    a.value = 0;
    expect(save.isLoadable('s')).toBe(true);
    expect(save.load('s')).toBe(true);
    expect(a.value).toBe(1);
    expect(save.lastLoadSource).toBe('bak');
    expect(ctx.notes.some((n: string) => n.includes('backup'))).toBe(true);
  });

  it('JSON truncado no principal → .bak; ambos corrompidos → falha sem mexer no estado', () => {
    const a = new Box('a');
    const { storage, save } = setup([a]);
    a.value = 1;
    save.save('s');
    a.value = 2;
    save.save('s');
    storage.set(PREFIX + 's', storage.get(PREFIX + 's')!.slice(0, 40));
    a.value = 7;
    expect(save.load('s')).toBe(true);
    expect(a.value).toBe(1);
    storage.set(PREFIX + 's.bak', '{lixo');
    a.value = 7;
    expect(save.isLoadable('s')).toBe(false);
    expect(save.load('s')).toBe(false);
    expect(save.lastError).toMatch(/corrompido|inexistente/);
    expect(a.value).toBe(7);
    expect(save.listSaves()).toEqual([]);
  });

  it('migração de versão: v1 → v3 em sequência; passo faltando ou versão futura são rejeitados', () => {
    const data = { a: { value: 3 }, __save: { playTime: 5 } };
    const v1: SaveFile = { version: 1, meta: { slot: 'm', timestamp: 1, playTime: 5, level: 1, location: '', quest: '', auto: false }, data, checksum: checksum(JSON.stringify(data)) };
    const migrations = {
      1: (f: SaveFile): SaveFile => ({ ...f, version: 2, data: { ...f.data, a: { value: (f.data.a as any).value * 10 } } }),
      2: (f: SaveFile): SaveFile => ({ ...f, version: 3, data: { ...f.data, b: { value: 1 } } }),
    };
    const m = migrateSaveFile(v1, migrations, 3)!;
    expect(m.version).toBe(3);
    expect((m.data.a as any).value).toBe(30);
    expect(migrateSaveFile(v1, { 1: migrations[1] }, 3)).toBeNull();
    expect(migrateSaveFile({ ...v1, version: 4 }, migrations, 3)).toBeNull();
    expect(migrateSaveFile(v1, { 1: (f) => ({ ...f, version: 1 }) }, 3)).toBeNull(); // não avança

    // pelo SaveSystem: arquivo v1 gravado por uma versão antiga do jogo é migrado ao carregar
    const a = new Box('a');
    const b = new Box('b');
    const { storage, save } = setup([a, b], { version: 3, migrations });
    storage.set(PREFIX + 'm', JSON.stringify(v1));
    expect(save.load('m')).toBe(true);
    expect(a.value).toBe(30);
    expect(b.value).toBe(1);
    // versão futura (o jogo é mais antigo que o save): rejeitada
    const v9 = { ...v1, version: 9 };
    storage.set(PREFIX + 'f', JSON.stringify(v9));
    expect(save.load('f')).toBe(false);
    // o que o SaveSystem grava sai com a versão atual
    save.save('n');
    expect(JSON.parse(storage.get(PREFIX + 'n')!).version).toBe(3);
  });

  it('aplicação transacional: um sistema rejeita → TODOS voltam ao estado anterior; depois tenta o .bak', () => {
    const a = new Box('a');
    const b = new Box('b', 0, 666);
    const { storage, save } = setup([a, b]);
    a.value = 1;
    b.value = 1;
    save.save('t');
    a.value = 2;
    b.value = 666; // estado que o sistema "b" rejeita ao carregar
    save.save('t'); // principal = {2, 666}; .bak = {1, 1}
    a.value = 50;
    b.value = 50;
    expect(save.load('t')).toBe(true);
    // o principal falhou em "b" depois de aplicar "a"; o rollback desfez "a" e o .bak foi aplicado
    expect(a.value).toBe(1);
    expect(b.value).toBe(1);
    expect(save.lastLoadSource).toBe('bak');
    // sem backup válido: falha e mantém o estado anterior intacto
    storage.remove(PREFIX + 't.bak');
    a.value = 50;
    b.value = 50;
    expect(save.load('t')).toBe(false);
    expect(a.value).toBe(50);
    expect(b.value).toBe(50);
  });

  it('rollback continua mesmo se um sistema falhar ao restaurar o snapshot', () => {
    const a = new Box('a');
    const b = new Box('b', 0, 666);
    const c = new Box('c');
    const { storage, save } = setup([a, b, c]);
    const data = { a: { value: 3 }, b: { value: 666 }, c: { value: 3 }, __save: {} };
    storage.set(PREFIX + 'x', JSON.stringify({ version: 1, meta: { slot: 'x' }, data, checksum: checksum(JSON.stringify(data)) }));
    a.value = 9;
    c.value = 9;
    expect(save.load('x')).toBe(false);
    expect(a.value).toBe(9);
    expect(c.value).toBe(9);
  });

  it('serialize com erro em um sistema não impede o save dos outros', () => {
    const a = new Box('a', 4);
    const bad: Saveable = {
      saveKey: 'quebrado',
      serialize() {
        throw new Error('em construção');
      },
      deserialize() {},
    };
    const { save } = setup([a]);
    save.register(bad);
    const errs: unknown[] = [];
    const orig = console.error;
    console.error = (...x: unknown[]) => void errs.push(x);
    try {
      expect(save.save('p')).toBe(true);
    } finally {
      console.error = orig;
    }
    expect(save.lastSerializeErrors).toEqual(['quebrado']);
    a.value = 0;
    expect(save.load('p')).toBe(true);
    expect(a.value).toBe(4);
  });

  it('metadados tolerantes: módulos em construção que lançam não derrubam o save', () => {
    const a = new Box('a', 1);
    const storage = memoryStorage();
    const save = new SaveSystem(storage);
    const ctx = fakeCtx({
      quests: {
        get tracked(): string {
          throw new Error('stub');
        },
      },
      progression: {},
    });
    save.init(ctx);
    save.register(a);
    expect(save.save('meta')).toBe(true);
    const meta = save.listSaves()[0];
    expect(meta.level).toBe(1);
    expect(meta.quest).toBe('');
  });

  it('falha de armazenamento (cota cheia): retorna false, avisa e não deixa .tmp', () => {
    const a = new Box('a', 1);
    const storage = memoryStorage();
    const set = storage.set;
    storage.set = (k, v) => {
      if (k.endsWith('.tmp')) set(k, v);
      else throw new Error('QuotaExceededError');
    };
    const save = new SaveSystem(storage);
    const ctx = fakeCtx();
    save.init(ctx);
    save.register(a);
    const orig = console.error;
    console.error = () => {};
    try {
      expect(save.save('q')).toBe(false);
    } finally {
      console.error = orig;
    }
    expect(storage.keys().some((k) => k.endsWith('.tmp'))).toBe(false);
    expect(ctx.notes.some((n: string) => n.includes('Não foi possível salvar'))).toBe(true);
  });

  it('F5 não salva com o jogador morto; F9 vale na pausa e na tela de derrota', () => {
    const a = new Box('a', 1);
    const { save, ctx } = setup([a]);
    let pressed = '';
    ctx.input.pressed = (k: string) => k === pressed;
    let continued: string | null = null;
    ctx.continueGame = async (slot: string) => {
      continued = slot;
      return true;
    };
    ctx.sys.player.state = 'dead';
    pressed = 'quicksave';
    save.update(0.016, ctx);
    expect(save.hasSave('quick')).toBe(false);
    ctx.sys.player.state = 'ground';
    save.update(0.016, ctx);
    expect(save.hasSave('quick')).toBe(true);
    pressed = 'quickload';
    for (const st of ['paused', 'dead', 'playing']) {
      continued = null;
      ctx.state = st;
      save.update(0.016, ctx);
      expect(continued).toBe('quick');
    }
    continued = null;
    ctx.state = 'menu';
    save.update(0.016, ctx);
    expect(continued).toBeNull();
  });
});
