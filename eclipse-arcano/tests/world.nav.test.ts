import { describe, it, expect } from 'vitest';
import { villageNav, findPath, navObstacles, segHitsObb } from '../src/world/nav';
import { PLACES, VILLAGE_BUILDINGS, VILLAGE } from '../src/data/places';

describe('grafo de navegação da vila', () => {
  const g = villageNav();

  it('tem nós e arestas suficientes', () => {
    expect(g.nodes.length).toBeGreaterThan(120);
    const edges = g.adj.reduce((n, a) => n + a.length, 0) / 2;
    expect(edges).toBeGreaterThan(g.nodes.length);
  });

  it('nenhuma aresta externa atravessa prédios ou a muralha', () => {
    const { obbs } = navObstacles();
    for (let i = 0; i < g.nodes.length; i++) {
      for (const j of g.adj[i]) {
        if (j < i) continue;
        const a = g.nodes[i];
        const b = g.nodes[j];
        // a aresta porta↔dentro atravessa o vão da porta de propósito
        if (a.inside !== b.inside) continue;
        for (const o of obbs) {
          if (a.inside && o.id === a.inside) continue;
          // obstáculos sem inflar: a aresta não pode cruzar o miolo do prédio
          const shrunk = { ...o, hx: o.hx - 0.2, hz: o.hz - 0.2 };
          expect(segHitsObb(shrunk, a.x, a.z, b.x, b.z), `${a.id} → ${b.id} cruza ${o.id}`).toBe(false);
        }
      }
    }
  });

  it('todas as âncoras externas da vila são alcançáveis a partir da praça', () => {
    const ids = Object.values(PLACES)
      .filter((p) => p.tags.includes('vila') && p.y === undefined)
      .map((p) => p.id);
    expect(ids.length).toBeGreaterThan(60);
    const unreachable = ids.filter((id) => !findPath('praca_centro', id));
    expect(unreachable).toEqual([]);
  });

  it('caminho até o balcão da taverna passa pela porta', () => {
    const path = findPath('praca_centro', 'taverna_balcao')!;
    expect(path).not.toBeNull();
    const door = PLACES['taverna_porta'];
    const nearDoor = path.some((p) => Math.hypot(p.x - door.x, p.z - door.z) < 1.5);
    expect(nearDoor).toBe(true);
  });

  it('caminho de fora do portão sul até a casa da anciã fica dentro da vila', () => {
    const path = findPath('portao_sul_fora', 'casa_ancia_porta')!;
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(2);
    // só sai do raio da muralha nos extremos (portão)
    const inside = path.slice(1, -1).every((p) => Math.hypot(p.x - VILLAGE.x, p.z - VILLAGE.z) < VILLAGE.wallRadius + 9);
    expect(inside).toBe(true);
  });

  it('aceita coordenadas do mundo', () => {
    const t = VILLAGE_BUILDINGS.find((b) => b.id === 'forja')!;
    const path = findPath({ x: VILLAGE.x + 60, z: VILLAGE.z + 3 }, { x: VILLAGE.x + t.x, z: VILLAGE.z + t.z + 7 });
    expect(path).not.toBeNull();
    expect(path![0].x).toBeCloseTo(VILLAGE.x + 60);
  });

  it('plantações fora dos muros são alcançáveis pelos portões', () => {
    expect(findPath('praca_centro', 'plantacao_trigo')).not.toBeNull();
    expect(findPath('praca_centro', 'cercado_ovelhas')).not.toBeNull();
  });
});
