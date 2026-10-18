import { describe, it, expect } from 'vitest';
import { makeCtx } from './rpg.helpers';
import { ITEMS } from '../src/data/items';
import { SaveSystem, memoryStorage } from '../src/save/SaveSystem';

describe('Inventário: kit inicial e pilhas', () => {
  it('novo jogo: Cajado Ancestral equipado + 2 poções menores', () => {
    const { inventory } = makeCtx();
    expect(inventory.equippedWeaponDefId()).toBe('cajado_ancestral');
    expect(inventory.count('pocao_vida_menor')).toBe(2);
    expect(inventory.gold).toBe(0);
  });

  it('empilha até o máximo e cria nova pilha depois', () => {
    const { inventory } = makeCtx();
    const max = ITEMS.minerio_ferroluz.maxStack;
    expect(inventory.add('minerio_ferroluz', max + 5, { silent: true })).toBe(true);
    const stacks = inventory.items.filter((s) => s.defId === 'minerio_ferroluz');
    expect(stacks.length).toBe(2);
    expect(stacks[0].qty).toBe(max);
    expect(stacks[1].qty).toBe(5);
    expect(inventory.count('minerio_ferroluz')).toBe(max + 5);
  });

  it('armas não empilham e cada uma tem uid único', () => {
    const { inventory } = makeCtx();
    inventory.add('espada_ferro', 3, { silent: true });
    const swords = inventory.items.filter((s) => s.defId === 'espada_ferro');
    expect(swords.length).toBe(3);
    expect(new Set(swords.map((s) => s.uid)).size).toBe(3);
    expect(new Set(inventory.items.map((s) => s.uid)).size).toBe(inventory.items.length);
  });

  it('capacidade: excesso cai no chão; itens de missão e equipados não ocupam espaço', () => {
    const { inventory } = makeCtx();
    inventory.capacity = 5;
    // usados: poções (1 pilha); o cajado está equipado
    expect(inventory.usedSlots()).toBe(1);
    inventory.add('espada_ferro', 6, { silent: true });
    expect(inventory.usedSlots()).toBe(5);
    expect(inventory.items.filter((s) => s.defId === 'espada_ferro').length).toBe(4);
    expect(inventory.loot.pickups.activeCount()).toBe(1); // 2 espadas → 1 item solto (qty 2)? cada espada é 1 slot solto
    expect(inventory.stats.overflowDrops).toBe(2);
    // missão entra mesmo cheio
    expect(inventory.isFull()).toBe(true);
    inventory.add('cristal_chave', 1, { silent: true });
    expect(inventory.has('cristal_chave')).toBe(true);
    // tryAdd não derruba
    expect(inventory.tryAdd('lanca_guarda', 1)).toBe(0);
  });

  it('uniqueId: só recebe uma vez', () => {
    const { inventory } = makeCtx();
    expect(inventory.add('fragmento_memoria', 1, { uniqueId: 'frag_cripta' })).toBe(true);
    expect(inventory.add('fragmento_memoria', 1, { uniqueId: 'frag_cripta' })).toBe(false);
    expect(inventory.count('fragmento_memoria')).toBe(1);
    expect(inventory.collectedUniques.has('frag_cripta')).toBe(true);
  });

  it('remove por defId preserva o item equipado', () => {
    const { inventory } = makeCtx();
    inventory.add('espada_ferro', 2, { silent: true });
    const [a] = inventory.items.filter((s) => s.defId === 'espada_ferro');
    inventory.equip(a.uid);
    expect(inventory.remove('espada_ferro', 1)).toBe(true);
    expect(inventory.get(a.uid)).toBeDefined();
    expect(inventory.equipped.weapon).toBe(a.uid);
    expect(inventory.remove('espada_ferro', 5)).toBe(false); // tudo ou nada
  });
});

describe('Inventário: equipar, comparar, usar, descartar', () => {
  it('equipar com requisito de nível e troca de arma emitindo equip:changed', () => {
    const { inventory, events, progression } = makeCtx();
    const seen: (string | null)[] = [];
    events.on('equip:changed', (e) => seen.push(e.defId));
    inventory.add('lamina_vampirica', 1, { silent: true }); // nível 5
    const blade = inventory.items.find((s) => s.defId === 'lamina_vampirica')!;
    expect(inventory.equip(blade.uid)).toBe(false);
    expect(inventory.canEquip(blade.uid).reason).toContain('nível 5');
    progression.addXp(5000, 'teste');
    expect(progression.level).toBeGreaterThanOrEqual(5);
    expect(inventory.equip(blade.uid)).toBe(true);
    expect(inventory.equippedWeaponDefId()).toBe('lamina_vampirica');
    expect(seen).toContain('lamina_vampirica');
  });

  it('amuleto aplica atributos via progression.getStat', () => {
    const { inventory, progression } = makeCtx();
    const before = progression.getStat('spellPower');
    progression.addXp(1000, 'teste'); // nível 3+ para o anel
    const lvl = progression.getStat('spellPower');
    inventory.add('anel_runico', 1, { silent: true });
    const ring = inventory.items.find((s) => s.defId === 'anel_runico')!;
    expect(inventory.equip(ring.uid)).toBe(true);
    expect(progression.getStat('spellPower')).toBeCloseTo(lvl + 0.12, 5);
    expect(lvl).toBeGreaterThan(before);
    inventory.unequip('amulet');
    expect(progression.getStat('spellPower')).toBeCloseTo(lvl, 5);
  });

  it('compare: deltas de arma (dano/dps) e de atributos', () => {
    const { inventory } = makeCtx();
    inventory.add('espada_ferro', 1, { silent: true });
    const sword = inventory.items.find((s) => s.defId === 'espada_ferro')!;
    const d = inventory.compare(sword.uid);
    const dmg = d.find((x) => x.stat === 'damage')!;
    expect(dmg.current).toBe(12); // cajado
    expect(dmg.candidate).toBe(16);
    expect(dmg.better).toBe(true);
    inventory.add('talisma_viajante', 1, { silent: true });
    const tal = inventory.items.find((s) => s.defId === 'talisma_viajante')!;
    const td = inventory.compare(tal.uid);
    const fc = td.find((x) => x.stat === 'flightCost')!;
    expect(fc.delta).toBeCloseTo(-0.15);
    expect(fc.better).toBe(true); // custo menor é melhor
  });

  it('usar poção cura, consome, entra em recarga; poção rápida escolhe a adequada', () => {
    const { inventory, health, ctx } = makeCtx();
    health.current = 90;
    expect(inventory.quickUsePotion()).toBe(true);
    expect(health.current).toBe(100);
    expect(inventory.count('pocao_vida_menor')).toBe(1);
    expect(inventory.cooldownRemaining('potion')).toBeGreaterThan(0);
    health.current = 20;
    expect(inventory.quickUsePotion()).toBe(false); // recarga
    inventory.update(5, ctx);
    inventory.add('pocao_vida_maior', 1, { silent: true });
    // falta 80: a menor (40) não cobre, a maior cobre
    expect(inventory.quickUsePotion()).toBe(true);
    expect(inventory.count('pocao_vida_maior')).toBe(0);
    expect(inventory.count('pocao_vida_menor')).toBe(1);
    // vida cheia: não gasta
    inventory.update(5, ctx);
    expect(inventory.quickUsePotion()).toBe(false);
    expect(inventory.count('pocao_vida_menor')).toBe(1);
  });

  it('elixir aplica efeito temporário que expira', () => {
    const { inventory, progression } = makeCtx();
    inventory.add('elixir_furia', 1, { silent: true });
    const base = progression.getStat('meleePower');
    const el = inventory.items.find((s) => s.defId === 'elixir_furia')!;
    expect(inventory.use(el.uid)).toBe(true);
    expect(progression.getStat('meleePower')).toBeCloseTo(base + 0.25);
    progression.update(31);
    expect(progression.getStat('meleePower')).toBeCloseTo(base);
  });

  it('descartar: itens de missão e o cajado vinculado não podem', () => {
    const { inventory } = makeCtx();
    inventory.add('martelo_doran', 1, { silent: true });
    const hammer = inventory.items.find((s) => s.defId === 'martelo_doran')!;
    expect(inventory.discard(hammer.uid)).toBe(false);
    const staff = inventory.items.find((s) => s.defId === 'cajado_ancestral')!;
    expect(inventory.discard(staff.uid)).toBe(false);
    const pot = inventory.items.find((s) => s.defId === 'pocao_vida_menor')!;
    expect(inventory.discard(pot.uid, 1)).toBe(true);
    expect(inventory.count('pocao_vida_menor')).toBe(1);
  });

  it('baú pessoal: mover para/de, preservando aprimoramento', () => {
    const { inventory } = makeCtx();
    inventory.add('espada_runica', 1, { silent: true, upgrade: 2 });
    const sw = inventory.items.find((s) => s.defId === 'espada_runica')!;
    expect(sw.upgrade).toBe(2);
    expect(inventory.moveToStash(sw.uid)).toBe(true);
    expect(inventory.get(sw.uid)).toBeUndefined();
    expect(inventory.getStashed(sw.uid)?.upgrade).toBe(2);
    expect(inventory.moveFromStash(sw.uid)).toBe(true);
    expect(inventory.get(sw.uid)?.upgrade).toBe(2);
    inventory.add('erva_lumen', 10, { silent: true });
    const herb = inventory.items.find((s) => s.defId === 'erva_lumen')!;
    expect(inventory.moveToStash(herb.uid, 4)).toBe(true);
    expect(inventory.count('erva_lumen')).toBe(6);
    expect(inventory.stash.find((s) => s.defId === 'erva_lumen')?.qty).toBe(4);
    inventory.add('cristal_chave', 1, { silent: true });
    expect(inventory.moveToStash(inventory.items.find((s) => s.defId === 'cristal_chave')!.uid)).toBe(false);
  });
});

describe('Inventário: lojas e ferreiro', () => {
  it('comprar, vender (preço de revenda), recompra e estoque por dia', () => {
    const { inventory, ctx, menus } = makeCtx();
    inventory.addGold(500);
    expect(inventory.openShop('taverna_hilda')).toBe(true);
    expect(menus).toContain('shop');
    expect(inventory.activeShop?.id).toBe('taverna_hilda');
    const entry = inventory.activeShop!.stock.find((e) => e.itemId === 'pocao_vida')!;
    const startQty = entry.qty;
    expect(inventory.buy('pocao_vida', 2)).toBe(true);
    expect(inventory.gold).toBe(500 - entry.price * 2);
    expect(inventory.count('pocao_vida')).toBe(2);
    expect(entry.qty).toBe(startQty - 2);
    // venda: Hilda não compra armas
    inventory.add('espada_ferro', 1, { silent: true });
    const sword = inventory.items.find((s) => s.defId === 'espada_ferro')!;
    expect(inventory.sell(sword.uid)).toBe(false);
    const pot = inventory.items.find((s) => s.defId === 'pocao_vida')!;
    const gold0 = inventory.gold;
    const price = inventory.sellPrice(pot.uid);
    expect(price).toBe(Math.floor(60 * 0.3));
    expect(inventory.sell(pot.uid, 1)).toBe(true);
    expect(inventory.gold).toBe(gold0 + price);
    expect(inventory.activeShop!.buyback.length).toBe(1);
    expect(inventory.buyback(0)).toBe(true);
    expect(inventory.count('pocao_vida')).toBe(2);
    // novo dia renova o estoque
    inventory.closeShop();
    expect(inventory.activeShop).toBeNull();
    ctx.clock.day = 2;
    inventory.openShop('taverna_hilda');
    expect(inventory.activeShop!.stock.find((e) => e.itemId === 'pocao_vida')!.qty).toBe(startQty);
  });

  it('ferreiro: aprimorar com ouro+materiais até +5, custo crescente', () => {
    const { inventory } = makeCtx();
    inventory.add('espada_ferro', 1, { silent: true });
    const sw = inventory.items.find((s) => s.defId === 'espada_ferro')!;
    // fora do ferreiro não pode
    expect(inventory.upgradeWeapon(sw.uid)).toBe(false);
    inventory.openShop('forja_doran');
    const c1 = inventory.upgradeCost(sw.uid)!;
    expect(c1.from).toBe(0);
    expect(inventory.canUpgrade(sw.uid).ok).toBe(false); // sem ouro
    inventory.addGold(10000);
    for (const id of ['minerio_ferroluz', 'fragmento_eter', 'engrenagem_antiga', 'cristal_arcano', 'nucleo_automato']) inventory.add(id, 20, { silent: true });
    let lastGold = 0;
    for (let i = 1; i <= 5; i++) {
      const c = inventory.upgradeCost(sw.uid)!;
      expect(c.gold).toBeGreaterThan(lastGold);
      lastGold = c.gold;
      expect(inventory.upgradeWeapon(sw.uid)).toBe(true);
      expect(sw.upgrade).toBe(i);
    }
    expect(inventory.upgradeCost(sw.uid)).toBeNull();
    expect(inventory.upgradeWeapon(sw.uid)).toBe(false);
    // revenda considera o aprimoramento
    expect(inventory.sellPrice(sw.uid)).toBe(Math.floor(45 * 0.4 * (1 + 0.25 * 5)));
  });

  it('aprimoramento gratuito (recompensa) não cobra', () => {
    const { inventory } = makeCtx();
    inventory.grantFreeUpgrade(1);
    inventory.openShop('forja_doran');
    const staff = inventory.items.find((s) => s.defId === 'cajado_ancestral')!;
    expect(inventory.upgradeWeapon(staff.uid)).toBe(true);
    expect(staff.upgrade).toBe(1);
    expect(inventory.freeUpgrades).toBe(0);
    expect(inventory.gold).toBe(0);
  });
});

describe('Inventário: save/load robusto', () => {
  it('ida e volta sem duplicar itens; uids novos não colidem', () => {
    const a = makeCtx();
    a.inventory.addGold(321);
    a.inventory.add('espada_ferro', 1, { silent: true, upgrade: 3 });
    a.inventory.add('erva_lumen', 7, { silent: true });
    a.inventory.collectedUniques.add('bau_cripta');
    const sw = a.inventory.items.find((s) => s.defId === 'espada_ferro')!;
    a.inventory.equip(sw.uid);
    const data = JSON.parse(JSON.stringify(a.inventory.serialize()));
    const b = makeCtx();
    b.inventory.deserialize(data);
    b.inventory.deserialize(data); // carregar duas vezes não duplica
    expect(b.inventory.items.length).toBe(a.inventory.items.length);
    expect(b.inventory.count('erva_lumen')).toBe(7);
    expect(b.inventory.gold).toBe(321);
    expect(b.inventory.equippedWeaponDefId()).toBe('espada_ferro');
    expect(b.inventory.equippedItem('weapon')!.upgrade).toBe(3);
    expect(b.inventory.collectedUniques.has('bau_cripta')).toBe(true);
    b.inventory.add('espada_ferro', 1, { silent: true });
    expect(new Set(b.inventory.items.map((s) => s.uid)).size).toBe(b.inventory.items.length);
  });

  it('valida: defIds desconhecidos, quantidades absurdas, uids duplicados, equipado inválido', () => {
    const { inventory } = makeCtx();
    inventory.deserialize({
      items: [
        { uid: 'i1', defId: 'espada_ferro', qty: 5, upgrade: 99 },
        { uid: 'i1', defId: 'espada_ferro', qty: 1, upgrade: 0 }, // duplicado
        { uid: 'i2', defId: 'item_que_nao_existe', qty: 1 },
        { uid: 'i3', defId: 'pocao_vida_menor', qty: 1e9 },
        { uid: 'i4', defId: 'erva_lumen', qty: -3 },
        null,
        'lixo',
      ],
      stash: [{ uid: 'i3', defId: 'pocao_vida', qty: 2 }], // uid repetido entre mochila e baú
      gold: -50,
      equipped: { weapon: 'i3', amulet: 'nao_existe', armor: null },
      collectedUniques: ['bau_cripta', 42],
    });
    expect(inventory.items.length).toBe(2);
    const sw = inventory.items.find((s) => s.defId === 'espada_ferro')!;
    expect(sw.qty).toBe(1);
    expect(sw.upgrade).toBe(5);
    expect(inventory.count('pocao_vida_menor')).toBe(ITEMS.pocao_vida_menor.maxStack);
    expect(inventory.stash.length).toBe(0);
    expect(inventory.gold).toBe(0);
    expect(inventory.equipped.weapon).toBeNull(); // poção não vai no slot de arma
    expect(inventory.equipped.amulet).toBeNull();
    expect([...inventory.collectedUniques]).toEqual(['bau_cripta']);
    expect(() => inventory.deserialize(null)).toThrow();
    expect(() => inventory.deserialize('x')).toThrow();
  });

  it('SaveSystem: salvar e carregar restaura ouro/itens sem duplicar', () => {
    const { ctx, inventory, progression } = makeCtx();
    const save = new SaveSystem(memoryStorage());
    ctx.sys.save = save;
    ctx.sys.quests = { tracked: null, getJournal: () => [] };
    ctx.sys.world.currentLocation = null;
    save.init(ctx);
    save.register(progression);
    save.register(inventory);
    inventory.addGold(77);
    expect(save.save('slot1')).toBe(true);
    inventory.addGold(1000);
    inventory.add('erva_lumen', 3, { silent: true });
    expect(save.load('slot1')).toBe(true);
    expect(inventory.gold).toBe(77);
    expect(inventory.count('erva_lumen')).toBe(0);
    expect(inventory.count('pocao_vida_menor')).toBe(2);
  });
});

describe('Saque no mundo', () => {
  it('baú: abre uma vez, dá conteúdo/ouro/XP e fica aberto após carregar', () => {
    const { inventory, progression } = makeCtx();
    inventory.loot.build();
    const xp0 = progression.xp + progression.level * 10000;
    expect(inventory.loot.chests.openById('bau_cripta')).toBe(true);
    expect(inventory.count('fragmento_eter')).toBe(2);
    expect(inventory.has('talisma_viajante')).toBe(true);
    expect(inventory.gold).toBe(30);
    expect(progression.xp + progression.level * 10000).toBeGreaterThan(xp0);
    expect(inventory.loot.chests.openById('bau_cripta')).toBe(false);
    const data = JSON.parse(JSON.stringify(inventory.serialize()));
    const b = makeCtx();
    b.inventory.loot.build();
    b.inventory.deserialize(data);
    expect(b.inventory.loot.chests.openById('bau_cripta')).toBe(false);
    expect(b.inventory.loot.chests.chests.find((c) => c.def.id === 'bau_cripta')!.interactable.enabled).toBe(false);
  });

  it('todas as armas especiais estão distribuídas em baús', () => {
    const { inventory } = makeCtx();
    inventory.loot.build();
    const ids = inventory.loot.chests.chests.map((c) => c.def.contents.map((e) => e.itemId)).flat();
    for (const w of ['espada_raios', 'espada_solar', 'cajado_dragao', 'orbe_eclipse']) expect(ids).toContain(w);
  });

  it('inimigo morto pelo jogador: XP + ouro/itens soltos (C1) e coleta pelo ímã', () => {
    const { inventory, events, progression, player, ctx } = makeCtx();
    inventory.loot.build();
    player.position.y = 10; // chão do contexto de teste
    const enemy = { kind: 'enemy', position: player.position.clone().setX(2), alive: false } as any;
    const xp0 = progression.totalXp;
    events.emit('enemy:killed', { entity: enemy, typeId: 'alfa_lobo', killer: player.entity });
    expect(progression.totalXp - xp0).toBe(120);
    expect(inventory.loot.pickups.activeCount()).toBeGreaterThanOrEqual(2); // ouro + couro (chance 1)
    // não recompensa duas vezes a mesma entidade
    events.emit('enemy:killed', { entity: enemy, typeId: 'alfa_lobo', killer: player.entity });
    expect(progression.totalXp - xp0).toBe(120);
    // ímã + coleta
    for (let i = 0; i < 200; i++) {
      ctx.elapsed += 0.05;
      inventory.loot.pickups.update(0.05, ctx);
    }
    expect(inventory.loot.pickups.activeCount()).toBe(0);
    expect(inventory.count('couro_lobo')).toBeGreaterThanOrEqual(2);
    expect(inventory.gold).toBeGreaterThanOrEqual(10);
  });

  it('morte sem crédito do jogador (longe, sem dano) não dá XP', () => {
    const { events, progression, player } = makeCtx();
    const enemy = { kind: 'enemy', position: player.position.clone().setX(500), alive: false } as any;
    const npc = { kind: 'npc', position: player.position.clone() } as any;
    events.emit('enemy:killed', { entity: enemy, typeId: 'corvo_saqueador', killer: npc });
    expect(progression.totalXp).toBe(0);
  });

  it('ervas: colher dá erva-lúmen e renasce no dia seguinte', () => {
    const { inventory, ctx } = makeCtx();
    inventory.loot.build();
    const h = inventory.loot.herbs.herbs.find((x) => x.valid)!;
    expect(inventory.loot.herbs.harvestById(h.spot.id)).toBe(true);
    expect(inventory.count('erva_lumen')).toBeGreaterThanOrEqual(1);
    expect(inventory.loot.herbs.harvestById(h.spot.id)).toBe(false);
    ctx.clock.day = 2;
    inventory.loot.herbs.refreshAvailability();
    expect(h.available).toBe(true);
  });
});
