import { describe, it, expect } from 'vitest';
import { ITEMS, ITEM_IDS, CATEGORY_ORDER } from '../src/data/items';
import { WEAPON_IDS, WEAPONS, RARITIES } from '../src/data/weapons';
import { ENEMIES } from '../src/data/enemies';
import { BOSSES } from '../src/data/bosses';
import { CREATURES } from '../src/data/creatures';
import { CHESTS, HERB_SPOTS, rollDrops, rollGold, rollQty } from '../src/data/loot';
import { SHOPS, weaponUpgradeCost, buyPrice, sellPrice } from '../src/data/shops';
import { PLACES, placesWithTag } from '../src/data/places';
import { STAT_IDS } from '../src/data/progression';

const C6 = [
  'pocao_vida_menor', 'pocao_vida', 'pocao_vida_maior', 'pocao_energia', 'elixir_furia',
  'fragmento_eter', 'minerio_ferroluz', 'cristal_arcano', 'erva_lumen', 'couro_lobo', 'nucleo_automato', 'engrenagem_antiga',
  'cristal_chave', 'martelo_doran', 'inscricao_elyra', 'fragmento_memoria', 'carta_barao',
  'amuleto_floresta', 'talisma_viajante', 'anel_runico', 'amuleto_guardiao',
];

describe('Itens (data/items.ts)', () => {
  it('todos os ids do contrato C6 e todas as armas existem', () => {
    for (const id of [...C6, ...WEAPON_IDS]) expect(ITEMS[id], id).toBeDefined();
    expect(new Set(ITEM_IDS).size).toBe(ITEM_IDS.length);
    expect(ITEMS.inscricao_elyra.stackable).toBe(true);
    expect(ITEMS.fragmento_memoria.stackable).toBe(true);
  });

  it('definições consistentes (categoria, raridade, pilha, slot, atributos, uso)', () => {
    for (const d of Object.values(ITEMS)) {
      expect(CATEGORY_ORDER).toContain(d.category);
      expect(RARITIES[d.rarity], d.id).toBeDefined();
      expect(d.maxStack, d.id).toBeGreaterThanOrEqual(1);
      if (!d.stackable) expect(d.maxStack).toBe(1);
      expect(d.icon.glyph.length).toBeGreaterThan(0);
      expect(d.icon.color).toMatch(/^#[0-9a-f]{6}$/i);
      if (d.category === 'weapon') {
        expect(d.slot).toBe('weapon');
        expect(WEAPONS[d.weaponId!]).toBeDefined();
      }
      if (d.category === 'amulet') expect(d.slot).toBe('amulet');
      if (d.category === 'armor') expect(d.slot).toBe('armor');
      if (d.category === 'consumable') expect(d.use).toBeDefined();
      if (d.category === 'quest') expect(d.bound).toBe(true);
      for (const k of Object.keys(d.stats ?? {})) expect(STAT_IDS).toContain(k);
      expect(d.name.length).toBeGreaterThan(2);
      expect(d.description.length).toBeGreaterThan(10);
    }
  });

  it('drops de inimigos, chefes e criaturas (C1) apontam para itens existentes', () => {
    for (const e of [...Object.values(ENEMIES), ...Object.values(BOSSES), ...Object.values(CREATURES)]) {
      for (const d of e.drops) expect(ITEMS[d.itemId], `${e.id} → ${d.itemId}`).toBeDefined();
    }
    expect(BOSSES.guardiao_mecanico.drops.find((d) => d.itemId === 'espada_cyber_runica')?.chance).toBe(1);
  });
});

describe('Saque (data/loot.ts)', () => {
  it('cada âncora com tag "bau" tem um baú com conteúdo válido; âncoras existem', () => {
    const ids = new Set(CHESTS.map((c) => c.id));
    for (const p of placesWithTag('bau')) expect(ids.has(p.id), p.id).toBe(true);
    for (const c of CHESTS) {
      expect(PLACES[c.anchor], c.anchor).toBeDefined();
      for (const e of c.contents) {
        expect(ITEMS[e.itemId], `${c.id}:${e.itemId}`).toBeDefined();
        expect(e.qty).toBeGreaterThan(0);
      }
    }
    expect(ids.size).toBe(CHESTS.length);
  });

  it('armas especiais nos lugares do design', () => {
    const where = (w: string) => CHESTS.find((c) => c.contents.some((e) => e.itemId === w))?.anchor;
    expect(where('espada_raios')).toBe('torre_bau_sacada');
    expect(where('espada_solar')).toBe('farol_celeste_topo');
    expect(where('cajado_dragao')).toBe('laboratorio_bau');
    expect(PLACES[where('orbe_eclipse')!].tags).toContain('elyra');
    // armas de missão não estão em baús nem lojas
    for (const w of ['lamina_vampirica', 'lamina_temporal', 'cajado_vazio', 'manopla_tecnomagica']) {
      expect(where(w)).toBeUndefined();
      for (const s of Object.values(SHOPS)) expect(s.stock.some((e) => e.itemId === w)).toBe(false);
    }
  });

  it('ervas: pontos únicos dentro da Floresta de Lúmen', () => {
    expect(HERB_SPOTS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(HERB_SPOTS.map((h) => h.id)).size).toBe(HERB_SPOTS.length);
    for (const h of HERB_SPOTS) expect(Math.hypot(h.x - -20, h.z - 170)).toBeLessThan(300);
  });

  it('rolagens: chance, quantidade e ouro dentro dos limites', () => {
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    let hits = 0;
    for (let i = 0; i < 2000; i++) hits += rollDrops([{ itemId: 'x', chance: 0.25 }], rnd).length;
    expect(hits / 2000).toBeGreaterThan(0.2);
    expect(hits / 2000).toBeLessThan(0.3);
    for (let i = 0; i < 200; i++) {
      const q = rollQty([2, 4], rnd);
      expect(q).toBeGreaterThanOrEqual(2);
      expect(q).toBeLessThanOrEqual(4);
      const g = rollGold([5, 9], rnd);
      expect(g).toBeGreaterThanOrEqual(5);
      expect(g).toBeLessThanOrEqual(9);
    }
    expect(rollDrops([{ itemId: 'y', chance: 1, qty: [3, 3] }], rnd)).toEqual([{ itemId: 'y', qty: 3 }]);
  });
});

describe('Lojas (data/shops.ts)', () => {
  it('as três lojas do contrato C7 existem com estoque válido', () => {
    for (const id of ['loja_sabine', 'forja_doran', 'taverna_hilda']) expect(SHOPS[id]).toBeDefined();
    expect(SHOPS.forja_doran.upgrades).toBe(true);
    for (const s of Object.values(SHOPS)) {
      for (const e of s.stock) expect(ITEMS[e.itemId], `${s.id}:${e.itemId}`).toBeDefined();
      if (s.anchor) expect(PLACES[s.anchor], s.anchor).toBeDefined();
      expect(s.sellMul).toBeLessThan(s.buyMul); // sem lucro infinito comprando e vendendo
    }
  });

  it('preços: compra ≥ venda para todo item; aprimoramento cresce e termina em +5', () => {
    for (const s of Object.values(SHOPS)) {
      for (const d of Object.values(ITEMS)) if (d.value > 0) expect(buyPrice(d.value, s)).toBeGreaterThan(sellPrice(d.value, 0, s));
    }
    let last = 0;
    for (let l = 0; l < 5; l++) {
      const c = weaponUpgradeCost(l, 'rare')!;
      expect(c.to).toBe(l + 1);
      expect(c.gold).toBeGreaterThan(last);
      last = c.gold;
      for (const m of c.materials) expect(ITEMS[m.itemId]).toBeDefined();
    }
    expect(weaponUpgradeCost(5, 'rare')).toBeNull();
    expect(weaponUpgradeCost(0, 'mythic')!.gold).toBeGreaterThan(weaponUpgradeCost(0, 'common')!.gold);
  });
});
