import { describe, it, expect } from 'vitest';
import { COMBOS, DEFAULT_WEAPON_ID, RARITIES, WEAPONS, WEAPON_IDS, getWeaponDef, upgradeMultiplier, type WeaponType } from '../src/data/weapons';
import { ABILITIES, ABILITY_IDS, MAX_RANK, SPELL_COMBOS, ULTIMATE, abilityValue } from '../src/data/abilities';
import { ANIM_DURATION } from '../src/data/player';

describe('armas (data/weapons.ts)', () => {
  it('tem ≥ 12 armas, todos os tipos e todas as raridades', () => {
    expect(WEAPON_IDS.length).toBeGreaterThanOrEqual(12);
    const types = new Set(Object.values(WEAPONS).map((w) => w.type));
    for (const t of ['sword', 'dagger', 'spear', 'staff', 'techno', 'artifact'] as WeaponType[]) expect(types.has(t)).toBe(true);
    const rar = new Set(Object.values(WEAPONS).map((w) => w.rarity));
    for (const r of Object.keys(RARITIES)) expect(rar.has(r as keyof typeof RARITIES)).toBe(true);
  });

  it('campos válidos e textos em português', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.damage).toBeGreaterThan(0);
      expect(w.speed).toBeGreaterThan(0.3);
      expect(w.range).toBeGreaterThan(1);
      expect(w.arc).toBeGreaterThan(10);
      expect(w.levelReq).toBeGreaterThanOrEqual(1);
      expect(w.value).toBeGreaterThanOrEqual(0);
      expect(w.name.length).toBeGreaterThan(3);
      expect(w.description.length).toBeGreaterThan(20);
      if (w.behavior) expect(w.special && w.special.length > 10).toBe(true);
    }
  });

  it('armas especiais do design têm comportamento próprio', () => {
    const need: Record<string, string> = {
      espada_raios: 'chainLightning',
      lamina_vampirica: 'vampiric',
      cajado_vazio: 'voidPierce',
      espada_solar: 'solar',
      lamina_temporal: 'temporal',
      cajado_dragao: 'dragonFire',
      espada_cyber_runica: 'cyberRunic',
      cajado_ancestral: 'ancestral',
    };
    for (const [id, b] of Object.entries(need)) expect(WEAPONS[id]?.behavior).toBe(b);
  });

  it('getWeaponDef cai no cajado ancestral', () => {
    expect(getWeaponDef(null).id).toBe(DEFAULT_WEAPON_ID);
    expect(getWeaponDef('nao_existe').id).toBe(DEFAULT_WEAPON_ID);
  });

  it('combos usam animações existentes e impacto dentro do clipe', () => {
    for (const c of Object.values(COMBOS)) {
      expect(c.steps.length).toBeGreaterThan(0);
      for (const s of c.steps) {
        expect(ANIM_DURATION[s.anim]).toBeGreaterThan(0);
        expect(s.impact).toBeGreaterThan(0.1);
        expect(s.impact).toBeLessThan(0.9);
      }
    }
    expect(COMBOS.sword.steps.length).toBe(3);
    expect(COMBOS.dagger.steps.length).toBe(4);
  });

  it('aprimoramento soma 12% por nível e é limitado', () => {
    expect(upgradeMultiplier(0)).toBe(1);
    expect(upgradeMultiplier(2)).toBeCloseTo(1.24, 6);
    expect(upgradeMultiplier(99)).toBeCloseTo(1.6, 6);
  });
});

describe('habilidades (data/abilities.ts)', () => {
  it('as 10 do design, com ranks 1–3', () => {
    expect(ABILITY_IDS.length).toBe(10);
    for (const id of ABILITY_IDS) {
      const a = ABILITIES[id];
      expect(a.name.length).toBeGreaterThan(3);
      expect(a.description.length).toBeGreaterThan(20);
      expect(a.rankNotes.length).toBe(MAX_RANK);
      for (const arr of Object.values(a.perRank)) expect(arr.length).toBe(3);
      expect(ANIM_DURATION[a.anim]).toBeGreaterThan(0);
      expect(a.unlockLevel).toBeGreaterThanOrEqual(1);
    }
    expect(ABILITIES.arcaneOrb.unlockLevel).toBe(1);
    expect(ABILITIES.magicShield.perRank.reflect).toEqual([0, 0, 1]);
  });

  it('abilityValue: perRank > params > campo', () => {
    expect(abilityValue(ABILITIES.arcaneOrb, 'damage', 1)).toBe(26);
    expect(abilityValue(ABILITIES.arcaneOrb, 'damage', 3)).toBe(44);
    expect(abilityValue(ABILITIES.arcaneOrb, 'speed', 2)).toBe(34);
    expect(abilityValue(ABILITIES.arcaneOrb, 'cost', 1)).toBe(10);
    expect(abilityValue(ABILITIES.arcaneOrb, 'damage', 7)).toBe(44);
    expect(abilityValue(ABILITIES.arcaneOrb, 'inexistente', 1)).toBe(0);
  });

  it('constantes de combinações e Carga Arcana', () => {
    expect(SPELL_COMBOS.wetLightningMul).toBeGreaterThan(1);
    expect(SPELL_COMBOS.shatter.damageMul).toBeGreaterThan(1);
    expect(ULTIMATE.max).toBe(100);
  });
});
