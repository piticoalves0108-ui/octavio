import { describe, it, expect } from 'vitest';
import { ENEMIES, ENEMY_IDS, AI_RULES } from '../src/data/enemies';
import { GUARDIAN, BOSSES, BOSS_GATES } from '../src/data/bosses';
import { CREATURES, CREATURE_IDS } from '../src/data/creatures';
import { ENEMY_ZONES, CREATURE_ZONES, DAWN_HOURS } from '../src/data/spawns';
import { PLACES, PATROL_ROUTES } from '../src/data/places';
import { WEAPON_IDS } from '../src/data/weapons';

/** Contrato C2: typeIds usados pela narrativa. */
const C2_ENEMIES = ['corvo_saqueador', 'corva_arqueira', 'lobo_sombrio', 'alfa_lobo', 'automato_sentinela', 'automato_errante', 'mago_corrompido', 'cavaleiro_encantado', 'espreitador', 'corvo_cristal', 'golem_ruinas', 'cacador_furtivo', 'ravena'];
const C2_CREATURES = ['cervo', 'cervo_luminoso', 'coelho', 'passaro', 'cavalo', 'ovelha', 'galinha', 'grifo', 'fenix', 'dragao_distante', 'serpente_lago', 'espirito_floresta'];
/** Contrato C6: ids de itens (armas = WEAPONS). */
const C6_ITEMS = new Set([
  ...WEAPON_IDS,
  'pocao_vida_menor',
  'pocao_vida',
  'pocao_vida_maior',
  'pocao_energia',
  'elixir_furia',
  'fragmento_eter',
  'minerio_ferroluz',
  'cristal_arcano',
  'erva_lumen',
  'couro_lobo',
  'nucleo_automato',
  'engrenagem_antiga',
  'cristal_chave',
  'martelo_doran',
  'inscricao_elyra',
  'fragmento_memoria',
  'carta_barao',
  'amuleto_floresta',
  'talisma_viajante',
  'anel_runico',
  'amuleto_guardiao',
]);

function checkDrops(id: string, xp: number, gold: [number, number], drops: { itemId: string; chance: number; qty?: [number, number] }[]) {
  expect(xp, id).toBeGreaterThanOrEqual(0);
  expect(gold[0], id).toBeGreaterThanOrEqual(0);
  expect(gold[1], id).toBeGreaterThanOrEqual(gold[0]);
  for (const d of drops) {
    expect(C6_ITEMS.has(d.itemId), `${id}: item desconhecido ${d.itemId}`).toBe(true);
    expect(d.chance, id).toBeGreaterThan(0);
    expect(d.chance, id).toBeLessThanOrEqual(1);
    if (d.qty) expect(d.qty[1]).toBeGreaterThanOrEqual(d.qty[0]);
  }
}

describe('inimigos (data/enemies.ts)', () => {
  it('todos os typeIds do contrato C2 existem', () => {
    for (const id of C2_ENEMIES) expect(ENEMIES[id], id).toBeDefined();
    expect(ENEMY_IDS.length).toBe(new Set(ENEMY_IDS).size);
  });

  it('recompensas no formato do contrato C1 (xp, gold [mín, máx], drops com ids de C6)', () => {
    for (const e of Object.values(ENEMIES)) checkDrops(e.id, e.xp, e.gold, e.drops);
  });

  it('ataques consistentes: alcance, tempos, combos e contra-ataques', () => {
    for (const e of Object.values(ENEMIES)) {
      if (e.archetype === 'static') continue;
      expect(e.attacks.length, e.id).toBeGreaterThan(0);
      expect(e.hp, e.id).toBeGreaterThan(0);
      expect(e.run, e.id).toBeGreaterThanOrEqual(e.walk);
      expect(e.preferredRange[1], e.id).toBeGreaterThanOrEqual(e.preferredRange[0]);
      const ids = new Set(e.attacks.map((a) => a.id));
      let usable = 0;
      for (const a of e.attacks) {
        const tag = `${e.id}.${a.id}`;
        expect(a.maxRange, tag).toBeGreaterThanOrEqual(a.minRange);
        expect(a.windup, tag).toBeGreaterThan(0);
        expect(a.recovery, tag).toBeGreaterThanOrEqual(0);
        expect(a.cooldown, tag).toBeGreaterThanOrEqual(0);
        if (a.next) expect(ids.has(a.next), `${tag} → ${a.next}`).toBe(true);
        if (a.comboOnly) expect(e.attacks.some((b) => b.next === a.id), `${tag} sem origem de combo`).toBe(true);
        if (a.kind === 'projectile') expect(a.projectile, tag).toBeDefined();
        if (a.heavy || a.unblockable) expect(a.windup, `${tag}: golpe forte precisa de antecipação visível`).toBeGreaterThanOrEqual(0.5);
        if (!a.comboOnly && !a.counterOnly && a.kind !== 'buff' && a.kind !== 'special' && a.weight > 0) usable++;
      }
      expect(usable, e.id).toBeGreaterThan(0);
      if (e.defense.counter > 0 && e.defense.block > 0) expect(e.attacks.some((a) => a.counterOnly), `${e.id}: bloqueia e contra-ataca`).toBe(true);
    }
  });

  it('comportamentos pedidos: escudo bloqueia, cavaleiro apara com combo de 3, arqueiros à distância, Ravena se rende', () => {
    const corvo = ENEMIES['corvo_saqueador'];
    expect(corvo.defense.block).toBeGreaterThan(0.3);
    const cav = ENEMIES['cavaleiro_encantado'];
    expect(cav.elite).toBe(true);
    expect(cav.defense.parry ?? 0).toBeGreaterThan(0);
    const first = cav.attacks.find((a) => a.next && !a.comboOnly)!;
    const second = cav.attacks.find((a) => a.id === first.next)!;
    expect(second.next).toBeDefined();
    for (const id of ['corva_arqueira', 'cacador_furtivo']) {
      const a = ENEMIES[id];
      expect(a.archetype).toBe('archer');
      expect(a.preferredRange[0]).toBeGreaterThanOrEqual(8);
      expect(a.attacks.some((x) => x.kind === 'projectile' && (x.projectile?.gravity ?? 0) > 0), `${id}: flechas com gravidade`).toBe(true);
    }
    const rav = ENEMIES['ravena'];
    expect(rav.special?.surrenderAt).toBeCloseTo(0.15, 5);
    expect(rav.special?.reinforcements?.atFraction).toBeCloseTo(0.5, 5);
    expect(rav.special?.smoke).toBeDefined();
    expect(ENEMIES['alfa_lobo'].special?.howl).toBeDefined();
    expect(ENEMIES['mago_corrompido'].special?.teleportWhenSurrounded).toBeDefined();
    expect(ENEMIES['mago_corrompido'].special?.shieldAlly).toBeDefined();
    expect(ENEMIES['espreitador'].special?.stealth).toBeDefined();
    expect(ENEMIES['corvo_cristal'].archetype).toBe('flyer');
    expect(ENEMIES['automato_sentinela'].overheat).toBeDefined();
    expect(ENEMIES['automato_errante'].elite).toBe(true);
  });

  it('textos ao jogador em português (nome e descrição preenchidos)', () => {
    for (const e of Object.values(ENEMIES)) {
      expect(e.name.length, e.id).toBeGreaterThan(2);
      expect(e.description.length, e.id).toBeGreaterThan(10);
    }
  });

  it('regras gerais: tokens = 2, reação humana > 0', () => {
    expect(AI_RULES.meleeTokens).toBe(2);
    expect(AI_RULES.reactionDelay[0]).toBeGreaterThan(0.05);
  });
});

describe('chefe (data/bosses.ts)', () => {
  it('Guardião Mecânico: recompensas C1 e drop garantido da Espada Cyber-Rúnica (C4)', () => {
    expect(BOSSES['guardiao_mecanico']).toBe(GUARDIAN);
    checkDrops(GUARDIAN.id, GUARDIAN.xp, GUARDIAN.gold, GUARDIAN.drops);
    const sword = GUARDIAN.drops.find((d) => d.itemId === 'espada_cyber_runica');
    expect(sword?.chance).toBe(1);
    expect(BOSS_GATES[GUARDIAN.id]).toBe('arena_guardiao');
  });

  it('3 fases (66% / 33%), pilares −90%, núcleo ×2 e respiradouros válidos', () => {
    expect(GUARDIAN.phaseAt[0]).toBeCloseTo(0.66, 5);
    expect(GUARDIAN.phaseAt[1]).toBeCloseTo(0.33, 5);
    expect(GUARDIAN.pillars.shieldMul).toBeCloseTo(0.1, 5);
    expect(GUARDIAN.phase3.coreMul).toBe(2);
    expect(GUARDIAN.summon.count).toBe(2);
    expect(ENEMIES[GUARDIAN.summon.typeId]).toBeDefined();
    expect(ENEMIES['pilar_cristal']?.resist.lightning ?? 0).toBeLessThan(0); // pilares fracos a raio
    for (const p of GUARDIAN.vents.patterns) for (const i of p) expect(i).toBeLessThan(6);
    expect(GUARDIAN.slowResist).toBeGreaterThan(0);
  });

  it('âncoras da arena existem em places.ts', () => {
    for (const id of ['arena_centro', 'arena_entrada', 'arena_soquete_1', 'arena_soquete_2', 'arena_soquete_3', 'arena_soquete_4', 'arena_respiradouro_1', 'arena_respiradouro_2', 'arena_respiradouro_3', 'arena_respiradouro_4', 'arena_respiradouro_5', 'arena_respiradouro_6']) expect(PLACES[id], id).toBeDefined();
  });
});

describe('criaturas (data/creatures.ts)', () => {
  it('todos os typeIds do contrato C2 existem, com temperamentos variados', () => {
    for (const id of C2_CREATURES) expect(CREATURES[id], id).toBeDefined();
    expect(CREATURE_IDS.length).toBe(new Set(CREATURE_IDS).size);
    const temps = new Set(Object.values(CREATURES).map((c) => c.temperament));
    for (const t of ['skittish', 'neutral', 'territorial', 'hostile', 'ambient']) expect(temps.has(t as never), t).toBe(true);
  });
  it('recompensas válidas', () => {
    for (const c of Object.values(CREATURES)) checkDrops(c.id, c.xp, c.gold, c.drops);
  });
});

describe('população (data/spawns.ts)', () => {
  it('zonas de inimigos referenciam tipos, âncoras e rotas existentes', () => {
    const ids = new Set<string>();
    for (const z of ENEMY_ZONES) {
      expect(ids.has(z.id), `zona duplicada ${z.id}`).toBe(false);
      ids.add(z.id);
      if (z.place) expect(PLACES[z.place], `${z.id}: âncora ${z.place}`).toBeDefined();
      else expect(Number.isFinite(z.x) && Number.isFinite(z.z), z.id).toBe(true);
      expect(z.activateRange).toBeGreaterThan(z.radius);
      for (const e of z.entries) {
        expect(ENEMIES[e.typeId], `${z.id}: ${e.typeId}`).toBeDefined();
        for (const a of e.anchors ?? []) expect(PLACES[a], `${z.id}: âncora ${a}`).toBeDefined();
        if (e.patrol) expect(PATROL_ROUTES[e.patrol], `${z.id}: rota ${e.patrol}`).toBeDefined();
      }
    }
  });

  it('cobre as regiões pedidas com densidade moderada', () => {
    const names = ENEMY_ZONES.map((z) => z.id).join(' ');
    for (const k of ['corvos', 'lobos', 'ruinas', 'pantano', 'estrada', 'desfiladeiro']) expect(names.includes(k), k).toBe(true);
    for (const z of ENEMY_ZONES) {
      const n = z.entries.reduce((s, e) => s + e.count, 0);
      expect(n, z.id).toBeLessThanOrEqual(8);
    }
    // arqueira na torre de vigia do acampamento
    const camp = ENEMY_ZONES.find((z) => z.id === 'acampamento_corvos')!;
    expect(camp.entries.some((e) => e.typeId === 'corva_arqueira' && e.perched && e.anchors?.includes('corvos_torre_vigia'))).toBe(true);
  });

  it('zonas de criaturas: tipos e âncoras existem; condições especiais', () => {
    for (const z of CREATURE_ZONES) {
      if (z.place) expect(PLACES[z.place], `${z.id}: âncora ${z.place}`).toBeDefined();
      for (const e of z.entries) expect(CREATURES[e.typeId], `${z.id}: ${e.typeId}`).toBeDefined();
    }
    const by = (t: string) => CREATURE_ZONES.flatMap((z) => z.entries.filter((e) => e.typeId === t));
    expect(by('cervo_luminoso').every((e) => e.time === 'night')).toBe(true);
    expect(by('espirito_floresta').every((e) => e.time === 'night')).toBe(true);
    expect(by('fenix').every((e) => e.time === 'dawn' && (e.chance ?? 1) < 1)).toBe(true);
    expect(by('serpente_lago').every((e) => (e.chance ?? 1) < 1)).toBe(true);
    expect(DAWN_HOURS[0]).toBeLessThan(DAWN_HOURS[1]);
  });
});
