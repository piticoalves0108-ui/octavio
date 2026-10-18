import { describe, it, expect } from 'vitest';
import { effectiveSchedule, entryAt, entryKey, hoursUntilChange, isIndoorAnchor, seeksShelterFromRain, hashPick } from '../src/npc/schedule';
import { BarkPicker } from '../src/npc/barkPicker';
import { NPC_BY_ID } from '../src/data/npcs';
import type { BarkDef } from '../src/data/barks';
import type { NarrativeEnv } from '../src/rpg/dialogue/script';

function env(over: Partial<NarrativeEnv> = {}): NarrativeEnv {
  return {
    flag: () => undefined,
    questStatus: () => 'inactive',
    questStage: () => null,
    itemCount: () => 0,
    gold: () => 0,
    level: () => 1,
    hour: () => 10,
    raining: () => false,
    memory: () => ({}),
    defeated: () => false,
    bossDefeated: () => false,
    ...over,
  };
}

describe('rotinas dos NPCs', () => {
  it('Doran: forja de dia, taverna à tarde, casa à noite (volta da meia-noite)', () => {
    const d = NPC_BY_ID['doran'];
    expect(entryAt(d.schedule, 9).act).toBe('hammer');
    expect(entryAt(d.schedule, 12.5).at).toBe('taverna_mesa_2_assento_a');
    expect(entryAt(d.schedule, 19).at).toBe('taverna_balcao_cliente');
    expect(entryAt(d.schedule, 23).act).toBe('sleep');
    expect(entryAt(d.schedule, 2).act).toBe('sleep');
    expect(hoursUntilChange(entryAt(d.schedule, 23), 23)).toBe(6);
    expect(entryKey(entryAt(d.schedule, 9))).not.toBe(entryKey(entryAt(d.schedule, 14)));
  });

  it('Bran espera do lado de fora do portão sul enquanto Kaelen não chegou (substituição por estágio)', () => {
    const b = NPC_BY_ID['bran'];
    const before = effectiveSchedule(b, env({ questStatus: () => 'active', questStage: () => 'portao' }));
    expect(entryAt(before, 3).at).toBe('portao_sul_fora');
    const after = effectiveSchedule(b, env({ questStatus: () => 'completed', questStage: () => null }));
    expect(entryAt(after, 3).act).toBe('sleep');
    expect(entryAt(after, 14).act).toBe('patrol');
  });

  it('chuva: moradores ao ar livre procuram abrigo; guardas e quem está coberto ficam', () => {
    const lia = NPC_BY_ID['lia'];
    expect(seeksShelterFromRain(lia, entryAt(lia.schedule, 9))).toBe(true);
    const hilda = NPC_BY_ID['hilda'];
    expect(seeksShelterFromRain(hilda, entryAt(hilda.schedule, 10))).toBe(false); // balcão da taverna
    const wen = NPC_BY_ID['wen'];
    expect(seeksShelterFromRain(wen, entryAt(wen.schedule, 9))).toBe(false);
    expect(isIndoorAnchor('taverna_balcao')).toBe(true);
    expect(isIndoorAnchor('forja_bigorna')).toBe(false);
  });

  it('hashPick é determinístico e cobre o intervalo', () => {
    const seen = new Set<number>();
    for (let k = 0; k < 200; k++) {
      const i = hashPick('nina', k, 5);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(5);
      seen.add(i);
    }
    expect(seen.size).toBe(5);
    expect(hashPick('a', 3, 7)).toBe(hashPick('a', 3, 7));
  });
});

describe('falas curtas (anti-repetição)', () => {
  const barks: BarkDef[] = [
    { situation: 'greet', text: 'A' },
    { situation: 'greet', text: 'B' },
    { situation: 'greet', text: 'C' },
    { situation: 'greet', text: 'Só guarda', faction: 'guard' },
    { situation: 'greet', text: 'Só Doran', npc: 'doran' },
    { situation: 'greet', text: 'Com flag', when: [{ flag: 'x' }] },
    { situation: 'magic', text: 'M' },
  ];
  const rules = { npcCooldown: 9, globalAmbientCooldown: 3, npcMemory: 2, globalMemory: 3, secondsPerChar: 0.05, minSeconds: 2, maxSeconds: 5, ambientChance: 0.2, hearRange: 22 };

  it('filtra por situação, facção, NPC e condição', () => {
    const p = new BarkPicker(barks, rules);
    const v = { id: 'tomas', role: 'villager' as const, faction: 'villager' as const };
    expect(p.eligible(v, 'greet', env()).map((b) => b.text)).toEqual(['A', 'B', 'C']);
    expect(p.eligible(v, 'greet', env({ flag: (k) => (k === 'x' ? true : undefined) })).map((b) => b.text)).toContain('Com flag');
    expect(p.eligible({ id: 'doran', role: 'smith', faction: 'villager' }, 'greet', env()).map((b) => b.text)).toContain('Só Doran');
    expect(p.eligible({ id: 'wen', role: 'guard', faction: 'guard' }, 'greet', env()).map((b) => b.text)).toContain('Só guarda');
    expect(p.pick(v, 'cower', env())).toBeNull();
  });

  it('não repete a mesma fala seguida para o mesmo NPC', () => {
    const p = new BarkPicker(barks, rules);
    const v = { id: 'tomas', role: 'villager' as const, faction: 'villager' as const };
    let seq = '';
    // rand fixo no meio: sem anti-repetição sairia sempre "B"
    for (let i = 0; i < 6; i++) seq += p.pick(v, 'greet', env(), () => 0.5)!.text;
    expect(seq).not.toMatch(/(.)\1/);
    expect(new Set(seq).size).toBe(3);
  });

  it('duração proporcional ao texto, com limites', () => {
    const p = new BarkPicker(barks, rules);
    expect(p.duration('oi')).toBe(2);
    expect(p.duration('x'.repeat(500))).toBe(5);
  });
});
