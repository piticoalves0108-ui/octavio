import { describe, it, expect } from 'vitest';
import { PLACES, PLACE_LIST, place, placesWithTag, PATROL_ROUTES, ARENA, TOWER, CRYPT, VILLAGE, VILLAGE_BUILDINGS, rotYaw } from '../src/data/places';
import { BOSS_ARENAS, FLOATING_ISLANDS, GATES, LOCATION_BY_ID, PLAYER_START, PLAYABLE_HALF } from '../src/data/world';
import { bridgeProfile, roadRiverCrossings } from '../src/world/structures/landmarks';

describe('âncoras (places.ts)', () => {
  it('ids únicos e place() falha em ids desconhecidos', () => {
    expect(new Set(PLACE_LIST.map((p) => p.id)).size).toBe(PLACE_LIST.length);
    expect(() => place('nao_existe')).toThrow();
    expect(place('bau_cripta').kind).toBe('chest');
  });

  it('âncoras essenciais pedidas pelos outros módulos existem', () => {
    for (const id of [
      'bau_cripta', 'bau_ruinas_1', 'bau_ruinas_2', 'bau_ruinas_3', 'altar_cripta', 'pedestal_cristal_ruinas', 'quadro_missoes_brumafria',
      'taverna_balcao', 'forja_bigorna', 'casa_ancia_porta', 'praca_centro', 'guarita_leste_posto', 'portao_ruinas', 'porta_torre',
      'arena_centro', 'arena_entrada', 'campina_cervos', 'clareira_cervo_luminoso', 'ninho_grifo', 'poleiro_fenix', 'toca_lobos',
      'corvos_fogueira', 'corvos_jaula', 'reliquia_elyra', 'fragmento_memoria_2', 'bau_tempestade', 'torre_sacada',
    ]) expect(PLACES[id], id).toBeDefined();
  });

  it('arena: 4 soquetes e 6 respiradouros dentro do raio do chefe', () => {
    const arena = BOSS_ARENAS['guardiao_mecanico'];
    const sockets = placesWithTag('soquete');
    const vents = placesWithTag('respiradouro');
    expect(sockets.length).toBe(4);
    expect(vents.length).toBe(6);
    for (const p of [...sockets, ...vents]) {
      expect(Math.hypot(p.x - arena.x, p.z - arena.z)).toBeLessThan(arena.radius - 5);
      expect(p.y).toBeCloseTo(ARENA.floorY, 2);
    }
    const ent = place('arena_entrada');
    expect(Math.hypot(ent.x - arena.x, ent.z - arena.z)).toBeGreaterThan(arena.radius);
  });

  it('ilhas: topo e segredos nas alturas das ilhas', () => {
    for (const isl of FLOATING_ISLANDS) {
      const top = place(`${isl.id}_topo`);
      expect(top.y).toBe(isl.y);
      if (isl.secret) {
        const s = place(isl.secret);
        expect(Math.hypot(s.x - isl.x, s.z - isl.z)).toBeLessThan(isl.radius * 0.9);
      }
    }
  });

  it('sacada da torre fica no anel caminhável', () => {
    for (const id of ['torre_sacada', 'torre_telescopio', 'torre_bau_sacada']) {
      const p = place(id);
      const r = Math.hypot(p.x - TOWER.x, p.z - TOWER.z);
      expect(r).toBeGreaterThan(TOWER.radius);
      expect(r).toBeLessThan(TOWER.balconyRadius);
      expect(p.y).toBeCloseTo(TOWER.floorY + TOWER.balconyHeight + 0.05, 2);
    }
  });

  it('início do jogo fica no pátio da cripta, com saída ao norte', () => {
    const lx = PLAYER_START.x - CRYPT.x;
    const lz = PLAYER_START.z - CRYPT.z;
    expect(lx).toBeGreaterThan(CRYPT.court.x0);
    expect(lx).toBeLessThan(CRYPT.court.x1);
    expect(lz).toBeGreaterThan(CRYPT.court.z0);
    expect(lz).toBeLessThan(CRYPT.court.z1);
    expect(Math.abs(Math.sin(PLAYER_START.yaw))).toBeLessThan(1e-6); // olhando para -Z (norte)
  });

  it('prédios da vila dentro da muralha e sem sobreposição', () => {
    const apothem = VILLAGE.wallRadius * Math.cos(Math.PI / VILLAGE.wallSides);
    for (const b of VILLAGE_BUILDINGS) {
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const [rx, rz] = rotYaw(b.yaw, (sx * b.w) / 2, (sz * b.d) / 2);
        expect(Math.hypot(b.x + rx, b.z + rz), b.id).toBeLessThan(apothem - 1.5);
      }
    }
  });

  it('rotas de patrulha dentro do limite jogável', () => {
    for (const r of Object.values(PATROL_ROUTES)) {
      expect(r.points.length).toBeGreaterThan(1);
      for (const [x, z] of r.points) {
        expect(Math.abs(x)).toBeLessThan(PLAYABLE_HALF);
        expect(Math.abs(z)).toBeLessThan(PLAYABLE_HALF);
      }
    }
  });

  it('portões documentados com estado padrão', () => {
    const ids = GATES.map((g) => g.id);
    for (const id of ['portao_ferroluz', 'portao_ruinas', 'arena_guardiao', 'porta_torre', 'porta_cripta']) expect(ids).toContain(id);
    expect(GATES.find((g) => g.id === 'portao_ferroluz')!.defaultOpen).toBe(false);
    expect(GATES.find((g) => g.id === 'arena_guardiao')!.defaultOpen).toBe(true);
    expect(LOCATION_BY_ID['camara_guardiao']).toBeDefined();
  });
});

describe('pontes', () => {
  it('há pelo menos um cruzamento estrada × rio', () => {
    const c = roadRiverCrossings();
    expect(c.length).toBeGreaterThan(0);
    expect(c[0].roadId).toBe('estrada_leste');
  });

  it('perfil do tabuleiro: degraus ≤ 0,45 m e meio acima da água', () => {
    for (const [a, b, mid] of [
      [6, 9, 6.6],
      [12, 5, 6.6],
      [4.2, 4.4, 6.6],
      [9, 9, 9],
    ]) {
      const ys = bridgeProfile(a, b, mid, 19);
      for (let i = 1; i < ys.length; i++) expect(Math.abs(ys[i] - ys[i - 1])).toBeLessThanOrEqual(0.4501);
      expect(Math.max(...ys)).toBeGreaterThanOrEqual(Math.min(mid, Math.max(a, b)) - 1e-6);
      expect(ys[0]).toBeLessThanOrEqual(a + 1e-6 + 0.45 * 19);
    }
  });
});
