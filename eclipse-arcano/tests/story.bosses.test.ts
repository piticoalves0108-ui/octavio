import { describe, expect, it } from 'vitest';
import { STORY_BOSSES, SKY_CITADEL } from '../src/data/storyBosses';
import { BOSSES } from '../src/data/bosses';
import { ITEMS } from '../src/data/items';
import { ENEMIES } from '../src/data/enemies';
import { LOCATION_BY_ID } from '../src/data/world';
import { HUMANOID_LOOKS } from '../src/ai/rigs/looks';
import { FLYER_LOOKS } from '../src/ai/rigs/flyer';
import { projectileVisual } from '../src/combat/Projectiles';
import { StoryBoss } from '../src/ai/bosses/StoryBoss';

const FALLBACK_CORE = projectileVisual('__nao_existe__').core;

describe('chefes da história (Atos II a IV)', () => {
  const list = Object.values(STORY_BOSSES);

  it('são 7, todos registrados nas recompensas (BOSSES)', () => {
    expect(list.length).toBe(7);
    for (const b of list) expect(BOSSES[b.id], b.id).toBe(b);
  });

  it('fases, limiares e ataques coerentes (cada fase tem variedade)', () => {
    for (const b of list) {
      expect([2, 3]).toContain(b.phases);
      expect(b.phaseAt[0], b.id).toBeGreaterThan(0);
      expect(b.phaseAt[0], b.id).toBeLessThan(1);
      if (b.phases === 3) expect(b.phaseAt[1], b.id).toBeLessThan(b.phaseAt[0]);
      for (let ph = 1; ph <= b.phases; ph++) {
        const kinds = new Set(b.attacks.filter((a) => a.phases.includes(ph)).map((a) => a.kind));
        expect(kinds.size, `${b.id} fase ${ph}`).toBeGreaterThanOrEqual(3);
      }
      for (const a of b.attacks) {
        for (const ph of a.phases) expect(ph >= 1 && ph <= b.phases, `${b.id}/${a.kind}`).toBe(true);
        expect(a.windup, `${b.id}/${a.kind}`).toBeGreaterThan(0.3);
        expect(a.range[0]).toBeLessThanOrEqual(a.range[1]);
        if (a.kind === 'volley') expect(projectileVisual(a.projectile ?? 'enemyOrb').core, `${b.id} projétil ${a.projectile}`).not.toBe(FALLBACK_CORE);
        if (a.kind === 'summon') expect(ENEMIES[a.enemy ?? ''], `${b.id} invoca ${a.enemy}`).toBeDefined();
      }
      for (const ev of Object.values(b.phaseEvents ?? {})) if (ev?.summon) expect(ENEMIES[ev.summon.enemy], `${b.id} invoca ${ev.summon.enemy}`).toBeDefined();
    }
  });

  it('recompensas, visuais e arenas existem', () => {
    for (const b of list) {
      for (const d of b.drops) expect(ITEMS[d.itemId], `${b.id} solta ${d.itemId}`).toBeDefined();
      if (b.rig.kind === 'humanoid') expect(HUMANOID_LOOKS[b.rig.look], b.rig.look).toBeDefined();
      if (b.rig.kind === 'dragon') expect(FLYER_LOOKS[b.rig.look], b.rig.look).toBeDefined();
      if (b.arena.locationId) {
        const l = LOCATION_BY_ID[b.arena.locationId];
        expect(l, b.arena.locationId).toBeDefined();
        expect(Math.hypot(l.x - b.arena.x, l.z - b.arena.z), `${b.id} arena dentro do local`).toBeLessThan(l.radius + 30);
      }
      expect(b.when.length, `${b.id} só aparece no estágio certo`).toBeGreaterThan(0);
    }
    expect(STORY_BOSSES.rei_aldric.arena.y).toBe(SKY_CITADEL.y);
  });

  it('o motor monta cada chefe (rig, vida e fases) sem WebGL', () => {
    for (const b of list) {
      const e = new StoryBoss(b);
      expect(e.health.max, b.id).toBe(b.hp);
      expect(e.phaseCount).toBe(b.phases);
      expect(e.rig.meshes.length, b.id).toBeGreaterThan(0);
      expect(e.kind).toBe('boss');
      e.dispose();
    }
  });
});
