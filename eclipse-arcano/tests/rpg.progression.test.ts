import { describe, it, expect } from 'vitest';
import { makeCtx } from './rpg.helpers';
import { LEVELING, applyXp, xpToNextLevel, totalXpForLevel, totalTalentPointsAt, BASE_STATS, PER_LEVEL_STATS, STAT_LIMITS, respecCost } from '../src/data/progression';
import { TALENTS, TALENT_BRANCHES, TIER_POINTS, checkTalent, sanitizeTalentRanks } from '../src/data/talents';
import { ABILITY_IDS } from '../src/data/abilities';

describe('Curva de XP (data/progression.ts)', () => {
  it('é crescente e termina no nível máximo', () => {
    let prev = 0;
    for (let l = 1; l < LEVELING.maxLevel; l++) {
      const n = xpToNextLevel(l);
      expect(n).toBeGreaterThan(prev);
      prev = n;
    }
    expect(xpToNextLevel(LEVELING.maxLevel)).toBe(0);
    expect(totalXpForLevel(2)).toBe(xpToNextLevel(1));
  });

  it('applyXp sobe vários níveis de uma vez e carrega o excedente', () => {
    const need = xpToNextLevel(1) + xpToNextLevel(2);
    const r = applyXp(1, 0, need + 7);
    expect(r.level).toBe(3);
    expect(r.xp).toBe(7);
    expect(r.levelsGained).toBe(2);
    const top = applyXp(1, 0, 1e9);
    expect(top.level).toBeLessThanOrEqual(LEVELING.maxLevel);
    expect(applyXp(5, 10, -100).level).toBe(5);
  });

  it('ritmo: ~nível 5 com ~1100 XP e o chefe (800 XP) vale mais de um nível no início', () => {
    expect(totalXpForLevel(5)).toBeGreaterThan(900);
    expect(totalXpForLevel(5)).toBeLessThan(1400);
    expect(xpToNextLevel(5)).toBeLessThan(800);
  });
});

describe('Progressão: níveis, pontos e atributos', () => {
  it('addXp emite level:up, dá pontos de talento (com marcos) e cura por completo', () => {
    const { progression, events, health, player } = makeCtx();
    const levels: number[] = [];
    events.on('level:up', (e) => levels.push(e.level));
    health.current = 10;
    progression.addXp(totalXpForLevel(5), 'teste');
    expect(progression.level).toBe(5);
    expect(levels).toEqual([2, 3, 4, 5]);
    expect(progression.skillPoints).toBe(totalTalentPointsAt(5));
    expect(progression.skillPoints).toBe(5); // 4 níveis + marco do 5
    expect(health.current).toBe(health.max);
    expect(health.max).toBe(BASE_STATS.maxHealth + PER_LEVEL_STATS.maxHealth! * 4);
    expect(player.refreshCount).toBeGreaterThan(0);
  });

  it('descobrir local dá XP pelo tipo', () => {
    const { progression, events } = makeCtx();
    events.emit('location:discovered', { locationId: 'ilhas_elyra', name: 'Ilhas' });
    expect(progression.totalXp).toBe(120);
  });

  it('getStat agrega base + nível + talentos + equipamento + efeitos, com limites', () => {
    const { progression, inventory } = makeCtx();
    progression.addXp(totalXpForLevel(6), 'teste');
    const lvl = progression.getStat('maxHealth');
    expect(lvl).toBe(100 + 12 * 5);
    progression.skillPoints = 10;
    expect(progression.unlockTalent('egi_vigor')).toBe(true);
    expect(progression.unlockTalent('egi_vigor')).toBe(true);
    expect(progression.getStat('maxHealth')).toBe(lvl + 30);
    inventory.add('amuleto_guardiao', 1, { silent: true });
    inventory.equip(inventory.items.find((s) => s.defId === 'amuleto_guardiao')!.uid);
    expect(progression.getStat('maxHealth')).toBe(lvl + 60);
    progression.addBuff('teste', 'Teste', 5, { damageReduction: 5 });
    expect(progression.getStat('damageReduction')).toBe(STAT_LIMITS.damageReduction[1]);
    const b = progression.statBreakdown('maxHealth');
    expect(b.talents).toBe(30);
    expect(b.equipment).toBe(30);
    expect(b.total).toBe(lvl + 60);
  });

  it('bônus externo (história) entra e sai do cálculo', () => {
    const { progression } = makeCtx();
    progression.setExternalMod('nucleo_guardiao', { spellPower: 0.15 });
    expect(progression.getStat('spellPower')).toBeCloseTo(1.15);
    progression.setExternalMod('nucleo_guardiao', null);
    expect(progression.getStat('spellPower')).toBeCloseTo(1);
  });
});

describe('Talentos', () => {
  it('4 ramos com 6 talentos cada, ids únicos, habilidades válidas', () => {
    expect(TALENT_BRANCHES.length).toBe(4);
    for (const b of TALENT_BRANCHES) {
      const list = TALENTS.filter((t) => t.branch === b.id);
      expect(list.length).toBe(6);
      expect(new Set(list.map((t) => t.tier)).size).toBe(6);
    }
    expect(new Set(TALENTS.map((t) => t.id)).size).toBe(TALENTS.length);
    for (const t of TALENTS) {
      if (t.ability) expect(ABILITY_IDS).toContain(t.ability);
      if (t.requires) expect(TALENTS.find((x) => x.id === t.requires)?.branch).toBe(t.branch);
      expect(t.tier).toBeLessThan(TIER_POINTS.length);
    }
  });

  it('pré-requisitos: pontos no ramo e talento anterior', () => {
    const ranks = new Map<string, number>();
    expect(checkTalent('arc_foco', ranks, 5, 10)).toBe('branchPoints');
    ranks.set('arc_canalizacao', 2);
    expect(checkTalent('arc_foco', ranks, 5, 10)).toBeNull();
    expect(checkTalent('arc_canalizacao', ranks, 0, 10)).toBe('noPoints');
    ranks.set('arc_canalizacao', 3);
    expect(checkTalent('arc_canalizacao', ranks, 5, 10)).toBe('maxRank');
    // linha final exige o talento anterior mesmo com pontos
    const r2 = new Map<string, number>([['arc_canalizacao', 3], ['arc_foco', 3], ['arc_lanca', 2], ['arc_eco', 1]]);
    expect(checkTalent('arc_tempestade', r2, 5, 10)).toBe('requires');
  });

  it('builds viáveis: cada ramo completo cabe em pontos do nível máximo', () => {
    const total = totalTalentPointsAt(LEVELING.maxLevel);
    for (const b of TALENT_BRANCHES) {
      const cost = TALENTS.filter((t) => t.branch === b.id).reduce((s, t) => s + t.maxRank, 0);
      expect(cost).toBeLessThanOrEqual(total);
      // um ramo inteiro não consome tudo: sobra para outro ramo
      expect(total - cost).toBeGreaterThanOrEqual(5);
    }
  });

  it('talento de habilidade desbloqueia cedo e aprimora; redistribuição desfaz e cobra ouro', () => {
    const { progression, abilities, inventory } = makeCtx();
    progression.skillPoints = 20;
    // Égide: precisa de 2 pontos no ramo para o Escudo
    expect(progression.unlockTalent('egi_escudo')).toBe(false);
    progression.unlockTalent('egi_vigor');
    progression.unlockTalent('egi_vigor');
    expect(progression.unlockTalent('egi_escudo')).toBe(true);
    expect(abilities.isUnlocked('magicShield')).toBe(true); // nível 1 < 6: desbloqueio antecipado
    expect(progression.unlockTalent('egi_escudo')).toBe(true);
    expect(abilities.rank('magicShield')).toBe(2);
    expect(progression.spentTalentPoints()).toBe(4);
    // redistribuição: sem ouro falha
    expect(progression.respec(true)).toBe(false);
    inventory.addGold(respecCost(progression.level));
    expect(progression.respec(true)).toBe(true);
    expect(inventory.gold).toBe(0);
    expect(progression.skillPoints).toBe(20);
    expect(progression.spentTalentPoints()).toBe(0);
    expect(abilities.isUnlocked('magicShield')).toBe(false);
    expect(abilities.slots).not.toContain('magicShield');
    expect(progression.getStat('maxHealth')).toBe(100);
  });

  it('redistribuição sem anywhere exige o santuário', () => {
    const { progression, inventory } = makeCtx();
    progression.skillPoints = 1;
    progression.unlockTalent('ceu_asas');
    inventory.addGold(9999);
    expect(progression.nearShrine()).toBe(false);
    expect(progression.respec()).toBe(false);
  });

  it('save/load da progressão valida talentos e buffs', () => {
    const a = makeCtx();
    a.progression.addXp(totalXpForLevel(4) + 5, 'teste');
    a.progression.skillPoints += 3;
    a.progression.unlockTalent('lam_empunhadura');
    a.progression.unlockTalent('lam_empunhadura');
    a.progression.addBuff('furia', 'Fúria', 20, { meleePower: 0.25 });
    const data = JSON.parse(JSON.stringify(a.progression.serialize()));
    const b = makeCtx();
    b.progression.deserialize(data);
    expect(b.progression.level).toBe(4);
    expect(b.progression.xp).toBe(5);
    expect(b.progression.talentRank('lam_empunhadura')).toBe(2);
    expect(b.progression.getStat('meleePower')).toBeCloseTo(a.progression.getStat('meleePower'));
    // ranks inválidos: talento sem pré-requisito é descartado, ranks limitados
    const clean = sanitizeTalentRanks({ arc_tempestade: 1, egi_vigor: 99, nada: 3 });
    expect(clean.get('egi_vigor')).toBe(3);
    expect(clean.has('arc_tempestade')).toBe(false);
    expect(clean.has('nada')).toBe(false);
    expect(() => b.progression.deserialize(null)).toThrow();
  });
});
