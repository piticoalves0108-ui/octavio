import type { GeoBuilder } from './builder';
import { P } from './builder';
import type { SiteKit } from './kit';
import type { GateSystem } from './gates';
import { GeoBuilder as GB } from './builder';
import { LAYER } from '../textures';
import { RNG } from '../../core/rng';
import { VILLAGE, VILLAGE_BUILDINGS, VILLAGE_STREETS, VILLAGE_FIELDS, VILLAGE_PENS, type BuildingDef } from '../../data/places';
import { COL, EMIT, house, windowPiece, doorPiece, lampPost, fence, barrel, crate, bench, roundTable, stool, bookshelf, column, crystal, brazier, type RGB } from './parts';

/**
 * Vila de Brumafria: muralha poligonal com torres e portões leste/sul, praça com
 * poço e mercado, taverna com interior, forja, arquivo, santuário, casa da Anciã,
 * torre de cristal adormecida, casas variadas, lampiões, plantações e cercados.
 * Plantas e posições vêm de src/data/places.ts (as âncoras batem com a geometria).
 */
export function buildVillage(kit: SiteKit, gates: GateSystem) {
  const VX = VILLAGE.x;
  const VZ = VILLAGE.z;

  // Ruas de terra batida (antes do upload dos mapas).
  for (const st of VILLAGE_STREETS) kit.maps.addRoad(st.points.map(([x, z]) => [VX + x, VZ + z] as [number, number]), st.width, 0.95);

  plaza(kit);
  for (const b of VILLAGE_BUILDINGS) building(kit, b);
  walls(kit, gates);
  streetLamps(kit);
  fields(kit);
  pens(kit);
}

/** Quadro de um prédio: centro no mundo, piso = chão mais alto sob a pegada + 0,25. */
function frameFor(kit: SiteKit, b: GeoBuilder, def: { x: number; z: number; w: number; d: number; yaw: number }) {
  const wx = VILLAGE.x + def.x;
  const wz = VILLAGE.z + def.z;
  const [mn, mx] = kit.groundRange(wx, wz, def.w + 0.6, def.d + 0.6, def.yaw);
  const floor = mx + 0.25;
  b.frame(wx, floor, wz, def.yaw);
  return { floor, depth: floor - mn + 0.6 };
}

function building(kit: SiteKit, def: BuildingDef) {
  const group =
    def.kind === 'stall' ? 'vila_mercado' : def.kind === 'crystal_tower' ? 'vila_torre_cristal' : def.kind === 'house' || def.kind === 'elder' || def.kind === 'guardpost' ? 'vila_casas' : 'vila_centro';
  const b = def.kind === 'stall' ? kit.g(group, 260) : kit.g(group);
  const { depth } = frameFor(kit, b, def);
  switch (def.kind) {
    case 'house':
      house(b, kit, { w: def.w, d: def.d, floors: def.floors, style: def.style, thatch: def.style % 4 === 3, stoneBase: def.style % 3 === 1, seed: def.style * 13 + 5 }, depth);
      break;
    case 'elder':
      elderHouse(kit, b, def, depth);
      break;
    case 'tavern':
      tavern(kit, b, def, depth);
      break;
    case 'archive':
      archive(kit, b, def, depth);
      break;
    case 'forge':
      forge(kit, b, def, depth);
      break;
    case 'shrine':
      shrine(kit, b, def, depth);
      break;
    case 'crystal_tower':
      crystalTower(kit, b, def, depth);
      break;
    case 'guardpost':
      guardpost(kit, b, def, depth);
      break;
    case 'stall':
      stall(kit, b, def);
      break;
  }
}

// ---------------------------------------------------------------------------
// Praça, poço, bancos e mercado
// ---------------------------------------------------------------------------

function plaza(kit: SiteKit) {
  const b = kit.g('vila_praca');
  b.frame(VILLAGE.x, 0, VILLAGE.z, 0);
  const R = VILLAGE.plazaRadius;
  terrainDisc(kit, b, 0, 0, R, P(LAYER.COBBLE, [0.95, 0.92, 0.88]), 0.06);
  kit.disc(b, 0, 0, R + 0.5, 0.6);
  kit.surface(b, 'stone', 0, 0, R * 2, R * 2, -100, 400, 0, 'praca');
  // meio-fio
  const ringN = 36;
  for (let i = 0; i < ringN; i++) {
    const a0 = (i / ringN) * Math.PI * 2;
    const a1 = ((i + 1) / ringN) * Math.PI * 2;
    const x0 = Math.cos(a0) * R;
    const z0 = Math.sin(a0) * R;
    const x1 = Math.cos(a1) * R;
    const z1 = Math.sin(a1) * R;
    const y = Math.min(kit.h(VILLAGE.x + x0, VILLAGE.z + z0), kit.h(VILLAGE.x + x1, VILLAGE.z + z1));
    b.beam(x0, z0, x1, z1, y - 0.2, y + 0.14, 0.35, P(LAYER.STONE, COL.stone));
  }
  // poço
  const wy = kit.h(VILLAGE.x, VILLAGE.z) + 0.06;
  const wr = VILLAGE.wellRadius;
  b.cylinder(0, wy - 0.3, 0, wr, wr, 1.2, 14, P(LAYER.STONE, COL.stone), false);
  b.ring(0, wy + 0.9, 0, wr - 0.35, wr + 0.05, 14, P(LAYER.STONE, COL.stoneWarm));
  b.cylinder(0, wy + 0.2, 0, wr - 0.35, wr - 0.35, 0.7, 14, P(LAYER.STONE, COL.stoneDark), false);
  b.disc(0, wy + 0.25, 0, wr - 0.35, 14, P(LAYER.PLAIN, [0.05, 0.12, 0.16]));
  const wood = P(LAYER.WOOD, COL.timber);
  b.box(-wr + 0.15, wy + 2.0, 0, 0.18, 2.3, 0.18, wood);
  b.box(wr - 0.15, wy + 2.0, 0, 0.18, 2.3, 0.18, wood);
  b.box(0, wy + 2.4, 0, wr * 2 + 0.2, 0.14, 0.14, wood);
  b.gableRoof(0, wy + 3.0, 0, wr * 2 + 0.8, 2.4, 0.9, P(LAYER.ROOF, COL.roof[1]));
  b.cylinder(0.2, wy + 1.4, 0, 0.22, 0.18, 0.35, 8, P(LAYER.WOOD, COL.woodLight), false, true);
  b.box(0.2, wy + 2.05, 0, 0.02, 0.9, 0.02, P(LAYER.PLAIN, [0.5, 0.45, 0.4]));
  kit.cyl(b, 0, wy - 0.3, 0, wr + 0.05, 1.2, 'prop', { walkable: true, surface: 'stone' });
  // bancos (âncoras praca_banco_N)
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2 + Math.PI / 8;
    const x = Math.cos(a) * 12.6;
    const z = Math.sin(a) * 12.6;
    bench(b, kit, x, kit.h(VILLAGE.x + x, VILLAGE.z + z) + 0.06, z, Math.atan2(-Math.cos(a), -Math.sin(a)), 2.0);
  }
  // lampiões da praça
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2 - Math.PI / 8;
    const x = Math.cos(a) * 13.8;
    const z = Math.sin(a) * 13.8;
    b.push(x, kit.h(VILLAGE.x + x, VILLAGE.z + z) + 0.06, z, -a);
    lampPost(b, kit, 0, 0, 3.6);
    b.pop();
  }
  // canteiros de flores
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const x = Math.cos(a) * 4.2;
    const z = Math.sin(a) * 4.2;
    const y = kit.h(VILLAGE.x + x, VILLAGE.z + z);
    b.box(x, y + 0.2, z, 1.4, 0.4, 1.4, P(LAYER.STONE, COL.stoneWarm), a);
    b.box(x, y + 0.42, z, 1.15, 0.1, 1.15, P(LAYER.MOSS, [0.75, 0.85, 0.5]), a);
    for (let k = 0; k < 5; k++) {
      const fx = x + Math.cos(k * 1.3) * 0.35;
      const fz = z + Math.sin(k * 1.3) * 0.35;
      b.box(fx, y + 0.55, fz, 0.16, 0.16, 0.16, P(LAYER.PLAIN, [[0.9, 0.3, 0.4], [0.95, 0.85, 0.3], [0.6, 0.4, 0.9]][k % 3] as unknown as RGB));
    }
    kit.box(b, x, y + 0.25, z, 1.4, 0.5, 1.4, 'prop', {}, a);
  }
}

/** Disco que acompanha o relevo (piso de praça/arena). Quadro com y = 0 (alturas absolutas). */
export function terrainDisc(kit: SiteKit, b: GeoBuilder, cx: number, cz: number, r: number, mat: ReturnType<typeof P>, lift: number, rings = 0) {
  const nr = rings || Math.max(4, Math.ceil(r / 1.6));
  const ns = Math.max(16, Math.ceil((2 * Math.PI * r) / 1.8));
  const pt = (ri: number, si: number): [number, number, number] => {
    const rr = (ri / nr) * r;
    const a = (si / ns) * Math.PI * 2;
    const x = cx + Math.cos(a) * rr;
    const z = cz + Math.sin(a) * rr;
    const [wx, , wz] = b.toWorld(x, 0, z);
    return [x, kit.h(wx, wz) + lift, z];
  };
  for (let ri = 0; ri < nr; ri++) {
    for (let si = 0; si < ns; si++) {
      const p00 = pt(ri, si);
      const p01 = pt(ri, si + 1);
      const p10 = pt(ri + 1, si);
      const p11 = pt(ri + 1, si + 1);
      if (ri === 0) b.tri(p00, p11, p10, mat);
      else b.quad(p00, p01, p11, p10, mat);
    }
  }
}

/** Retângulo que acompanha o relevo (pisos de pátios). Coordenadas locais do quadro (y absoluto). */
export function terrainRect(kit: SiteKit, b: GeoBuilder, cx: number, cz: number, w: number, d: number, mat: ReturnType<typeof P>, lift: number, cell = 2) {
  const nx = Math.max(1, Math.ceil(w / cell));
  const nz = Math.max(1, Math.ceil(d / cell));
  const pt = (i: number, j: number): [number, number, number] => {
    const x = cx - w / 2 + (w * i) / nx;
    const z = cz - d / 2 + (d * j) / nz;
    const [wx, , wz] = b.toWorld(x, 0, z);
    return [x, kit.h(wx, wz) + lift, z];
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) b.quad(pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j), pt(i, j), mat);
}

const STALL_COLORS: RGB[] = [
  [0.85, 0.25, 0.22],
  [0.25, 0.45, 0.8],
  [0.35, 0.65, 0.3],
  [0.85, 0.6, 0.2],
  [0.6, 0.3, 0.7],
];

function stall(kit: SiteKit, b: GeoBuilder, def: BuildingDef) {
  const wx = VILLAGE.x + def.x;
  const wz = VILLAGE.z + def.z;
  const y = kit.h(wx, wz) + 0.05;
  b.frame(wx, y, wz, def.yaw);
  const { w, d } = def;
  const wood = P(LAYER.WOOD, COL.timber);
  for (const sx of [-1, 1]) {
    b.box((sx * (w - 0.2)) / 2, 1.3, -d / 2 + 0.1, 0.14, 2.6, 0.14, wood);
    b.box((sx * (w - 0.2)) / 2, 1.1, d / 2 - 0.1, 0.14, 2.2, 0.14, wood);
    kit.cyl(b, (sx * (w - 0.2)) / 2, 0, -d / 2 + 0.1, 0.12, 2.6, 'prop');
    kit.cyl(b, (sx * (w - 0.2)) / 2, 0, d / 2 - 0.1, 0.12, 2.2, 'prop');
  }
  // toldo listrado (inclinado para a frente) — dupla face
  const c = STALL_COLORS[def.style % STALL_COLORS.length];
  const fab = P(LAYER.FABRIC, c);
  b.quad([-w / 2 - 0.2, 2.15, d / 2 + 0.5], [w / 2 + 0.2, 2.15, d / 2 + 0.5], [w / 2 + 0.2, 2.7, -d / 2 - 0.1], [-w / 2 - 0.2, 2.7, -d / 2 - 0.1], fab);
  b.quad([-w / 2 - 0.2, 2.68, -d / 2 - 0.1], [w / 2 + 0.2, 2.68, -d / 2 - 0.1], [w / 2 + 0.2, 2.13, d / 2 + 0.5], [-w / 2 - 0.2, 2.13, d / 2 + 0.5], P(LAYER.FABRIC, [c[0] * 0.7, c[1] * 0.7, c[2] * 0.7]));
  // franja
  for (let i = 0; i < 8; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / 8;
    b.tri([x - 0.25, 2.15, d / 2 + 0.5], [x + 0.25, 2.15, d / 2 + 0.5], [x, 1.9, d / 2 + 0.5], P(LAYER.FABRIC, i % 2 ? c : COL.white));
  }
  // balcão
  b.box(0, 0.5, d / 2 - 0.35, w - 0.3, 1.0, 0.6, P(LAYER.WOOD, COL.woodLight));
  b.box(0, 1.02, d / 2 - 0.3, w - 0.1, 0.06, 0.75, P(LAYER.WOOD, COL.timber));
  kit.box(b, 0, 0.5, d / 2 - 0.35, w - 0.3, 1.0, 0.6, 'prop');
  goods(b, def.style, w, d);
  crate(b, kit, -w / 2 + 0.6, 0, -d / 2 + 0.6, 0.7, 0.3);
  barrel(b, null, w / 2 - 0.5, 0, -d / 2 + 0.5, 0.8);
  kit.footprint(b, 0, 0, w, d, 0, 0.6, 0.4);
}

function goods(b: GeoBuilder, style: number, w: number, d: number) {
  const rng = new RNG(style * 77 + 1);
  const y = 1.05;
  const z = d / 2 - 0.3;
  for (let i = 0; i < 14; i++) {
    const x = -w / 2 + 0.3 + (i / 13) * (w - 0.6);
    const zz = z + (rng.next() - 0.5) * 0.4;
    switch (style % 5) {
      case 0: {
        const col: RGB = ([[0.85, 0.15, 0.1], [0.95, 0.75, 0.15], [0.5, 0.8, 0.2]] as RGB[])[i % 3];
        b.cylinder(x, y, zz, 0.11, 0.11, 0.2, 7, P(LAYER.PLAIN, col), true);
        break;
      }
      case 1:
        b.cylinder(x, y + 0.12, zz, 0.12, 0.12, 0.6, 8, P(LAYER.FABRIC, STALL_COLORS[i % 5]), true, true);
        break;
      case 2:
        b.box(x, y + 0.12, zz, 0.18, 0.24, 0.18, P(LAYER.MOSS, [0.4 + rng.next() * 0.3, 0.7, 0.35]));
        break;
      case 3:
        b.box(x, y + 0.04, zz, 0.08, 0.06, 0.55, P(LAYER.METAL, COL.iron), rng.next());
        break;
      default:
        b.cylinder(x, y, zz, 0.14, 0.12, 0.14, 7, P(LAYER.PLAIN, [0.75, 0.5, 0.25]), true);
    }
  }
}

// ---------------------------------------------------------------------------
// Prédios especiais
// ---------------------------------------------------------------------------

function tavern(kit: SiteKit, b: GeoBuilder, def: BuildingDef, depth: number) {
  house(b, kit, { w: def.w, d: def.d, floors: 2, style: 0, interior: true, interiorId: 'taverna', stoneBase: true, seed: 3 }, depth);
  const { w, d } = def;
  const t = 0.35;
  const wood = P(LAYER.WOOD, [0.7, 0.52, 0.36]);
  const dark = P(LAYER.WOOD, COL.timberDark);
  // balcão (âncoras taverna_balcao / taverna_balcao_cliente)
  b.box(4.6, 0.52, -3.1, 6.0, 1.04, 0.7, wood);
  b.box(4.6, 1.08, -3.05, 6.3, 0.08, 0.85, dark);
  kit.box(b, 4.6, 0.55, -3.1, 6.0, 1.1, 0.7, 'prop', { walkable: false });
  // canecas sobre o balcão
  for (let i = 0; i < 5; i++) b.cylinder(2.4 + i * 1.1, 1.12, -3.0, 0.07, 0.06, 0.16, 7, P(LAYER.METAL, [0.7, 0.6, 0.45]), true);
  // prateleiras com garrafas no fundo
  const bz = -d / 2 + t + 0.22;
  for (let s = 0; s < 3; s++) {
    b.box(4.6, 1.3 + s * 0.6, bz, 5.6, 0.06, 0.4, dark);
    for (let i = 0; i < 12; i++) {
      const col: RGB = ([[0.25, 0.5, 0.25], [0.5, 0.2, 0.15], [0.7, 0.55, 0.2], [0.3, 0.35, 0.6]] as RGB[])[(i + s) % 4];
      b.cylinder(2.1 + i * 0.45, 1.33 + s * 0.6, bz, 0.07, 0.05, 0.32, 6, P(LAYER.CRYSTAL, col), true);
    }
  }
  // barris atrás do balcão
  barrel(b, kit, 8.0, 0, -3.8, 0.95);
  barrel(b, null, 8.0, 0.95, -3.8, 0.85);
  // lareira na parede esquerda (âncora taverna_lareira)
  const fx = -w / 2 + t;
  const stone = P(LAYER.STONE, COL.stoneWarm);
  b.box(fx + 0.5, 0.65, -2.6, 1.0, 1.3, 0.5, stone);
  b.box(fx + 0.5, 0.65, -0.4, 1.0, 1.3, 0.5, stone);
  b.box(fx + 0.55, 1.45, -1.5, 1.1, 0.3, 2.7, P(LAYER.STONE, COL.stone));
  b.box(fx + 0.35, 2.3, -1.5, 0.7, 1.4, 2.0, stone);
  b.box(fx + 0.2, 0.06, -1.5, 0.4, 0.12, 1.7, P(LAYER.PLAIN, [0.3, 0.1, 0.05], EMIT.embers));
  b.cone(fx + 0.45, 0.1, -1.7, 0.35, 0.9, 5, P(LAYER.PLAIN, [1, 0.6, 0.2], EMIT.fire));
  b.cone(fx + 0.45, 0.1, -1.25, 0.28, 0.7, 5, P(LAYER.PLAIN, [1, 0.75, 0.3], EMIT.fire), false, 0.5);
  b.box(fx + 1.2, 0.05, -1.5, 0.5, 0.1, 2.6, P(LAYER.STONE, COL.stoneDark));
  kit.box(b, fx + 0.5, 0.75, -1.5, 1.0, 1.5, 2.8, 'prop', { walkable: false });
  kit.light(b, fx + 1.3, 1.0, -1.5, 0xff8a3a, 30, 14, 'flicker');
  // mesas com bancos (âncoras taverna_mesa_N)
  const tables: [number, number][] = [
    [-3.2, 2.2],
    [0.8, 2.6],
    [-2.6, -2.4],
    [1.2, -1.4],
  ];
  for (const [tx, tz] of tables) {
    roundTable(b, kit, tx, 0, tz, 0.72, true);
    stool(b, tx - 1.15, 0, tz);
    stool(b, tx + 1.15, 0, tz);
  }
  // palco do bardo
  b.box(-7.3, 0.1, 3.9, 2.4, 0.2, 2.6, P(LAYER.WOOD, COL.woodLight));
  kit.box(b, -7.3, 0.1, 3.9, 2.4, 0.2, 2.6, 'platform', { surface: 'wood' });
  stool(b, -7.4, 0.2, 4.4);
  // canto de descanso (cama + cortina)
  b.box(8.05, 0.28, 3.7, 1.1, 0.56, 2.1, P(LAYER.WOOD, COL.timber));
  b.box(8.05, 0.6, 3.7, 1.0, 0.12, 2.0, P(LAYER.FABRIC, [0.75, 0.25, 0.22]));
  b.box(8.05, 0.68, 4.45, 0.8, 0.14, 0.4, P(LAYER.FABRIC, [0.95, 0.92, 0.85]));
  kit.box(b, 8.05, 0.3, 3.7, 1.1, 0.6, 2.1, 'prop');
  b.box(6.6, 1.5, 4.3, 0.05, 2.6, 2.4, P(LAYER.FABRIC, [0.55, 0.2, 0.25]));
  // lanternas penduradas
  for (const [lx, lz] of [
    [-3, 0],
    [1.5, 0.6],
    [5, -1],
    [-6, 2],
  ]) {
    b.box(lx, 2.95, lz, 0.03, 0.4, 0.03, P(LAYER.METAL, COL.iron));
    b.box(lx, 2.6, lz, 0.26, 0.32, 0.26, P(LAYER.PLAIN, [1, 0.8, 0.5], EMIT.candle));
  }
  // placa do Javali Rúnico (pendurada na fachada)
  b.box(-3.2, 3.0, d / 2 + 0.75, 0.08, 0.08, 1.5, P(LAYER.METAL, COL.iron));
  b.box(-3.2, 2.45, d / 2 + 1.3, 1.3, 0.85, 0.08, P(LAYER.WOOD, [0.6, 0.42, 0.28]));
  b.box(-3.2, 2.45, d / 2 + 1.35, 0.6, 0.4, 0.03, P(LAYER.RUNE, [0.9, 0.9, 1.0], EMIT.rune));
  // quadro de missões (âncora quadro_missoes_brumafria)
  b.box(3.6, 1.55, d / 2 + 0.12, 1.5, 1.1, 0.1, P(LAYER.WOOD, COL.timber));
  b.box(3.6, 2.15, d / 2 + 0.2, 1.7, 0.12, 0.22, P(LAYER.ROOF, COL.roof[1]));
  const rng = new RNG(5);
  for (let i = 0; i < 6; i++) b.box(3.05 + (i % 3) * 0.55, 1.3 + Math.floor(i / 3) * 0.48, d / 2 + 0.18, 0.36, 0.42, 0.02, P(LAYER.PLAIN, [0.95, 0.9, 0.75 - rng.next() * 0.2]), (rng.next() - 0.5) * 0.15);
}

function archive(kit: SiteKit, b: GeoBuilder, def: BuildingDef, depth: number) {
  house(b, kit, { w: def.w, d: def.d, floors: 1, style: 4, interior: true, interiorId: 'arquivo', stoneBase: true, seed: 11 }, depth);
  const { w, d } = def;
  const t = 0.35;
  // estantes nas paredes laterais (âncora arquivo_estante)
  for (const z of [-3.8, -1.6, 0.6]) {
    bookshelf(b, kit, -w / 2 + t + 0.25, 0, z, Math.PI / 2, 2.0, 2.6, 17 + Math.round(z * 10));
    bookshelf(b, kit, w / 2 - t - 0.25, 0, z, -Math.PI / 2, 2.0, 2.6, 41 + Math.round(z * 10));
  }
  bookshelf(b, kit, 0, 0, -d / 2 + t + 0.25, 0, 3.4, 2.6, 99);
  // mesa do arquivista
  const wood = P(LAYER.WOOD, [0.6, 0.42, 0.3]);
  b.box(0, 0.78, -2.6 + 0.9, 2.2, 0.08, 1.0, wood);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 1.0, 0.38, -1.7 + sz * 0.4, 0.08, 0.76, 0.08, P(LAYER.WOOD, COL.timber));
  kit.box(b, 0, 0.4, -1.7, 2.2, 0.82, 1.0, 'prop');
  b.box(-0.5, 0.84, -1.6, 0.6, 0.03, 0.45, P(LAYER.PLAIN, [0.95, 0.9, 0.75]));
  b.box(0.4, 0.86, -1.7, 0.4, 0.08, 0.3, P(LAYER.FABRIC, [0.5, 0.15, 0.12]));
  b.cylinder(0.85, 0.82, -1.9, 0.04, 0.04, 0.2, 6, P(LAYER.PLAIN, [0.95, 0.92, 0.8]), true);
  b.box(0.85, 1.05, -1.9, 0.05, 0.08, 0.05, P(LAYER.PLAIN, [1, 0.8, 0.4], EMIT.candle));
  stool(b, 0, 0, -2.75);
  // banco de leitura (âncora arquivo_leitura)
  bench(b, kit, 2.6, 0, 2.2, -Math.PI / 2, 1.6);
  // globo rúnico
  b.cylinder(-2.4, 0, 3.4, 0.25, 0.2, 0.9, 6, P(LAYER.WOOD, COL.timber), false);
  b.cylinder(-2.4, 0.9, 3.4, 0.32, 0.32, 0.5, 10, P(LAYER.RUNE, [0.8, 0.85, 1], EMIT.rune), true, true);
  kit.cyl(b, -2.4, 0, 3.4, 0.35, 1.4, 'prop');
  kit.light(b, 0, 2.4, 0, 0xffc47a, 12, 10, 'always');
}

function elderHouse(kit: SiteKit, b: GeoBuilder, def: BuildingDef, depth: number) {
  house(b, kit, { w: def.w, d: def.d, floors: 1, style: def.style, thatch: true, seed: 23 }, depth);
  const { d } = def;
  // varanda com banco (âncora casa_ancia_varanda)
  bench(b, kit, -2.5, 0, d / 2 + 1.6, Math.PI, 1.6);
  // jardim de ervas atrás (âncora casa_ancia_jardim): canteiros elevados + círculo de pedras rúnicas
  const gz = -d / 2 - 6;
  for (let i = 0; i < 3; i++) {
    const x = -3 + i * 3;
    b.box(x, 0.2, gz, 2.2, 0.4, 1.4, P(LAYER.WOOD, COL.timber));
    b.box(x, 0.42, gz, 2.0, 0.08, 1.2, P(LAYER.MOSS, [0.55, 0.75, 0.4]));
    for (let k = 0; k < 6; k++) b.box(x - 0.8 + k * 0.32, 0.6, gz + (k % 2 ? 0.3 : -0.3), 0.18, 0.3, 0.18, P(LAYER.MOSS, [0.35 + (k % 3) * 0.15, 0.7, 0.35]));
    kit.box(b, x, 0.25, gz, 2.2, 0.5, 1.4, 'prop');
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 3.2;
    const z = gz - 4 + Math.sin(a) * 2.4;
    b.box(x, 0.55, z, 0.45, 1.1, 0.3, P(LAYER.RUNE, [0.8, 0.85, 0.9], EMIT.rune), a);
    kit.box(b, x, 0.55, z, 0.45, 1.1, 0.3, 'prop', {}, a);
  }
  b.cylinder(0, 0, gz - 4, 0.4, 0.3, 0.7, 6, P(LAYER.STONE, COL.stone), true);
  crystal(b, 0, 0.7, gz - 4, 0.18, 0.8, [0.7, 0.9, 1], EMIT.crystalBlue);
  kit.cyl(b, 0, 0, gz - 4, 0.45, 1.4, 'prop');
  // cerca baixa do jardim
  fence(b, kit, [
    [-5, gz + 1.4],
    [-5, gz - 7.5],
    [5, gz - 7.5],
    [5, gz + 1.4],
  ], () => 0, 0.8);
  kit.footprint(b, 0, gz - 3, 11, 10, 0, 0.5, 0.15);
}

function forge(kit: SiteKit, b: GeoBuilder, def: BuildingDef, depth: number) {
  const { w, d } = def;
  const stone = P(LAYER.STONE, COL.stoneDark);
  const wood = P(LAYER.WOOD, COL.timber);
  b.box(0, -depth / 2 - 0.02, 0, w + 0.4, depth, d + 0.4, P(LAYER.STONE, COL.stoneDark), 0, 63 - 8);
  terrainRectFlat(b, w, d, P(LAYER.COBBLE, [0.7, 0.68, 0.66]));
  kit.footprint(b, 0, 0, w + 1, d + 1, 0, 1, 0.5);
  kit.surface(b, 'stone', 0, 0, w, d, -100, 400);
  // parede dos fundos e metade das laterais (oficina aberta)
  b.box(0, 1.7, -d / 2 + 0.25, w, 3.4, 0.5, stone);
  kit.box(b, 0, 1.7, -d / 2 + 0.25, w, 3.4, 0.5, 'building', { walkable: false });
  for (const sx of [-1, 1]) {
    b.box((sx * (w - 0.5)) / 2, 1.7, -d / 4, 0.5, 3.4, d / 2, stone);
    kit.box(b, (sx * (w - 0.5)) / 2, 1.7, -d / 4, 0.5, 3.4, d / 2, 'building', { walkable: false });
    // pilares da frente
    b.box((sx * (w - 0.4)) / 2, 1.7, d / 2 - 0.3, 0.4, 3.4, 0.4, wood);
    kit.cyl(b, (sx * (w - 0.4)) / 2, 0, d / 2 - 0.3, 0.25, 3.4, 'prop');
  }
  b.box(0, 3.45, d / 2 - 0.3, w, 0.3, 0.3, wood);
  b.gableRoof(0, 3.6, 0, w + 1.2, d + 1.2, 2.6, P(LAYER.ROOF, COL.roof[2]), P(LAYER.WOOD, COL.timberDark));
  kit.box(b, 0, 4.6, 0, w + 1, 2.0, d + 1, 'building', { walkable: true });
  // fornalha (âncora forja_fornalha em -3.4,-1.6)
  b.box(-3.4, 0.7, -3.1, 2.6, 1.4, 1.8, P(LAYER.STONE, COL.stone));
  b.box(-3.4, 1.0, -2.2, 1.3, 0.7, 0.05, P(LAYER.PLAIN, [0.6, 0.2, 0.05], EMIT.fire));
  b.box(-3.4, 1.42, -3.1, 2.2, 0.06, 1.4, P(LAYER.PLAIN, [0.5, 0.15, 0.03], EMIT.embers));
  b.box(-3.4, 4.0, -3.4, 1.4, 5.6, 1.2, P(LAYER.STONE, COL.stoneDark));
  b.box(-3.4, 6.9, -3.4, 1.6, 0.25, 1.4, P(LAYER.STONE, COL.stone));
  kit.box(b, -3.4, 0.75, -3.1, 2.6, 1.5, 1.8, 'prop', { walkable: false });
  kit.light(b, -3.4, 1.6, -1.6, 0xff7a2a, 26, 13, 'flicker');
  // fole
  b.box(-1.6, 0.9, -3.3, 0.9, 0.35, 0.8, P(LAYER.FABRIC, [0.45, 0.3, 0.2]));
  // bigorna (âncora forja_bigorna)
  const iron = P(LAYER.METAL, [0.4, 0.4, 0.44]);
  b.box(0.6, 0.35, 0.4, 0.5, 0.7, 0.5, P(LAYER.LOG, [0.6, 0.5, 0.4]));
  b.box(0.6, 0.8, 0.4, 0.4, 0.22, 1.0, iron);
  b.cone(0.6, 0.72, 1.05, 0.12, 0.35, 4, iron);
  kit.box(b, 0.6, 0.45, 0.4, 0.5, 0.9, 1.0, 'prop');
  // tina d'água e suporte de armas
  b.box(-1.0, 0.35, 1.8, 1.3, 0.7, 0.7, P(LAYER.WOOD, COL.woodLight));
  b.box(-1.0, 0.65, 1.8, 1.15, 0.04, 0.55, P(LAYER.PLAIN, [0.1, 0.2, 0.25]));
  kit.box(b, -1.0, 0.35, 1.8, 1.3, 0.7, 0.7, 'prop');
  b.box(3.4, 1.2, -d / 2 + 0.6, 2.4, 0.1, 0.2, wood);
  for (let i = 0; i < 5; i++) b.box(2.5 + i * 0.45, 1.3, -d / 2 + 0.7, 0.07, 1.6, 0.03, P(LAYER.METAL, [0.75, 0.76, 0.8]), (i - 2) * 0.05);
  // balcão de venda (âncora forja_balcao)
  b.box(3.2, 0.5, 3.1, 2.4, 1.0, 0.7, P(LAYER.WOOD, COL.woodLight));
  kit.box(b, 3.2, 0.5, 3.1, 2.4, 1.0, 0.7, 'prop');
  for (let i = 0; i < 3; i++) b.box(2.5 + i * 0.6, 1.04, 3.1, 0.35, 0.08, 0.5, iron, 0.3 * i);
  barrel(b, kit, w / 2 + 0.7, 0, 1.0, 0.9);
  crate(b, kit, w / 2 + 0.8, 0, -1.2, 0.85, 0.4);
  // placa
  b.box(w / 2 - 0.2, 2.6, d / 2 + 0.6, 0.06, 0.06, 1.2, iron);
  b.box(w / 2 - 0.2, 2.15, d / 2 + 1.1, 0.06, 0.6, 0.8, P(LAYER.WOOD, [0.55, 0.4, 0.28]));
}

/** Piso plano (y=0 no quadro) com textura. */
function terrainRectFlat(b: GeoBuilder, w: number, d: number, mat: ReturnType<typeof P>) {
  b.box(0, -0.05, 0, w, 0.1, d, mat, 0, 4);
}

function shrine(kit: SiteKit, b: GeoBuilder, def: BuildingDef, depth: number) {
  const { w, d } = def;
  const stone = P(LAYER.STONE, COL.stoneWarm);
  b.box(0, -depth / 2 + 0.3, 0, w + 1, depth + 0.6, d + 1, stone);
  b.box(0, 0.62, 0, w, 0.24, d, P(LAYER.COBBLE, COL.stone));
  kit.box(b, 0, (-depth + 0.74) / 2, 0, w + 1, depth + 0.74, d + 1, 'platform', { surface: 'stone' });
  // degraus na frente
  b.box(0, 0.12, d / 2 + 0.95, 3, 0.24, 0.5, stone);
  b.box(0, 0.37, d / 2 + 0.6, 3, 0.25, 0.4, stone);
  kit.box(b, 0, 0.12, d / 2 + 0.95, 3, 0.24, 0.5, 'platform', { surface: 'stone' });
  kit.box(b, 0, 0.245, d / 2 + 0.6, 3, 0.49, 0.4, 'platform', { surface: 'stone' });
  kit.footprint(b, 0, 0, w + 2, d + 3, 0, 1, 0.2);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      column(b, (sx * (w - 1)) / 2, 0.74, (sz * (d - 1)) / 2, 0.3, 3.6, P(LAYER.STONE, COL.stone));
      kit.cyl(b, (sx * (w - 1)) / 2, 0.74, (sz * (d - 1)) / 2, 0.38, 3.6, 'prop');
    }
  }
  b.box(0, 4.45, 0, w + 0.2, 0.3, d + 0.2, stone);
  b.pyramid(0, 4.6, 0, w + 0.6, d + 0.6, 2.2, P(LAYER.ROOF, [0.85, 0.75, 0.45]));
  crystal(b, 0, 6.8, 0, 0.18, 0.9, [1, 0.85, 0.5], EMIT.gold);
  kit.box(b, 0, 5.2, 0, w + 0.2, 1.4, d + 0.2, 'building', { walkable: true });
  // altar do sol (âncora santuario_vila_altar)
  b.box(0, 1.15, -1.2, 1.6, 0.9, 0.8, P(LAYER.RUNE, [1, 0.95, 0.85], EMIT.gold));
  b.disc(0, 1.61, -1.2, 0.35, 10, P(LAYER.CRYSTAL, [1, 0.85, 0.4], EMIT.gold));
  kit.box(b, 0, 1.15, -1.2, 1.6, 0.9, 0.8, 'prop');
  brazier(b, null, -2.0, 0.74, 1.6, EMIT.fire);
  brazier(b, null, 2.0, 0.74, 1.6, EMIT.fire);
}

function crystalTower(kit: SiteKit, b: GeoBuilder, def: BuildingDef, depth: number) {
  const stone = P(LAYER.STONE, COL.stoneDark);
  const metal = P(LAYER.METAL, [0.75, 0.78, 0.85], EMIT.circuitDim);
  const R = def.w / 2;
  b.cylinder(0, -depth, 0, R + 0.6, R + 0.6, depth + 0.3, 8, P(LAYER.STONE, COL.stone), true, false, false, Math.PI / 8);
  b.cylinder(0, 0.3, 0, R, R - 0.3, 8, 8, stone, false, false, false, Math.PI / 8);
  b.cylinder(0, 8.3, 0, R + 0.3, R + 0.3, 0.5, 8, P(LAYER.STONE, COL.stone), true, true, false, Math.PI / 8);
  kit.cyl(b, 0, -1, 0, R + 0.6, 9.5, 'building', { walkable: true, surface: 'stone' });
  // fuste afunilado com nervuras metálicas e painéis de circuito
  b.cylinder(0, 8.8, 0, R - 1.3, R - 2.3, 13, 8, P(LAYER.STONE, COL.stone), false, false, false, Math.PI / 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.strut([Math.sin(a) * (R - 1.0), 8.8, Math.cos(a) * (R - 1.0)], [Math.sin(a) * (R - 2.0), 21.8, Math.cos(a) * (R - 2.0)], 0.35, P(LAYER.METAL, [0.7, 0.72, 0.8]));
    b.push(Math.sin(a + Math.PI / 8) * (R - 1.55), 0, Math.cos(a + Math.PI / 8) * (R - 1.55), a + Math.PI / 8);
    b.box(0, 12 + (i % 2) * 3, 0.1, 1.2, 2.4, 0.12, metal);
    b.pop();
  }
  kit.cyl(b, 0, 8.8, 0, R - 1.3, 13, 'building', { walkable: false, climbable: true });
  // coroa: anel metálico e garras segurando o cristal adormecido (âncora torre_cristal_topo)
  b.cylinder(0, 21.8, 0, R - 1.6, R - 1.2, 0.8, 12, P(LAYER.METAL, [0.6, 0.62, 0.7], EMIT.circuit), true, true);
  kit.cyl(b, 0, 8.8, 0, R - 1.2, 13.8, 'platform', { surface: 'metal' });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    b.strut([Math.sin(a) * (R - 1.5), 22.6, Math.cos(a) * (R - 1.5)], [Math.sin(a) * (R - 1.0), 26, Math.cos(a) * (R - 1.0)], 0.3, P(LAYER.METAL, [0.55, 0.58, 0.66]));
    b.strut([Math.sin(a) * (R - 1.0), 26, Math.cos(a) * (R - 1.0)], [Math.sin(a) * 1.2, 29.5, Math.cos(a) * 1.2], 0.25, P(LAYER.METAL, [0.55, 0.58, 0.66]));
  }
  crystal(b, 0, 22.6, 0, 1.4, 8.2, [0.6, 0.55, 0.95], EMIT.crystalDim);
  crystal(b, 0.9, 22.6, 0.4, 0.5, 3.0, [0.55, 0.5, 0.9], EMIT.crystalDim, 0.15, 0.05);
  crystal(b, -0.8, 22.6, -0.5, 0.45, 2.6, [0.55, 0.5, 0.9], EMIT.crystalDim, -0.15, -0.08);
  // porta selada com selo rúnico (âncora torre_cristal_porta)
  b.push(0, 0.3, R - 0.15, 0);
  b.box(0, 1.6, 0.1, 2.2, 3.2, 0.3, P(LAYER.METAL, [0.5, 0.52, 0.6], EMIT.circuitDim));
  b.disc(0, 1.7, 0.27, 0.6, 12, P(LAYER.RUNE, [0.8, 0.8, 1], EMIT.rune));
  b.pop();
  // janelas em seteira
  for (let i = 0; i < 8; i++) {
    if (i === 0) continue;
    const a = (i / 8) * Math.PI * 2;
    b.push(Math.sin(a) * (R - 0.2), 0, Math.cos(a) * (R - 0.2), a);
    b.box(0, 4.5, 0.05, 0.4, 1.4, 0.1, P(LAYER.PLAIN, COL.glass, EMIT.windowNight));
    b.pop();
  }
  kit.footprint(b, 0, 0, def.w + 2, def.d + 2, 0, 1, 0.3);
}

function guardpost(kit: SiteKit, b: GeoBuilder, def: BuildingDef, depth: number) {
  const { w, d } = def;
  const wood = P(LAYER.WOOD, COL.timber);
  b.box(0, -depth / 2 + 0.1, 0, w + 0.3, depth + 0.2, d + 0.3, P(LAYER.STONE, COL.stoneDark));
  b.box(0, 0.05, 0, w, 0.1, d, P(LAYER.WOOD, COL.woodLight), 0, 4);
  b.box(0, 1.4, -d / 2 + 0.08, w, 2.8, 0.16, wood);
  b.box(-w / 2 + 0.08, 1.4, 0, 0.16, 2.8, d, wood);
  b.box(w / 2 - 0.08, 1.4, 0, 0.16, 2.8, d, wood);
  b.box(-w / 2 + 0.2, 1.4, d / 2 - 0.1, 0.2, 2.8, 0.2, wood);
  b.box(w / 2 - 0.2, 1.4, d / 2 - 0.1, 0.2, 2.8, 0.2, wood);
  b.pyramid(0, 2.8, 0, w + 0.8, d + 0.8, 1.6, P(LAYER.ROOF, COL.roof[0]));
  b.box(0, 2.2, d / 2 + 0.02, 0.28, 0.32, 0.12, P(LAYER.PLAIN, [1, 0.85, 0.55], EMIT.lampNight));
  kit.box(b, 0, 1.4, -d / 2 + 0.08, w, 2.8, 0.2, 'building', { walkable: false });
  kit.box(b, -w / 2 + 0.08, 1.4, 0, 0.2, 2.8, d, 'building', { walkable: false });
  kit.box(b, w / 2 - 0.08, 1.4, 0, 0.2, 2.8, d, 'building', { walkable: false });
  kit.box(b, 0, 3.3, 0, w + 0.6, 1.0, d + 0.6, 'building', { walkable: true });
  kit.surface(b, 'wood', 0, 0, w, d, -100, 400);
  kit.footprint(b, 0, 0, w, d, 0, 0.6, 0.3);
  // lança e escudo encostados
  b.strut([w / 2 + 0.3, 0, d / 2 - 0.3], [w / 2 + 0.15, 2.6, d / 2 - 0.2], 0.06, P(LAYER.WOOD, COL.woodLight));
  b.cone(w / 2 + 0.15, 2.6, d / 2 - 0.2, 0.06, 0.3, 4, P(LAYER.METAL, [0.8, 0.8, 0.85]));
}

// ---------------------------------------------------------------------------
// Muralha, torres e portões
// ---------------------------------------------------------------------------

function walls(kit: SiteKit, gates: GateSystem) {
  const b = kit.g('vila_muralha');
  const R = VILLAGE.wallRadius;
  const N = VILLAGE.wallSides;
  const H = VILLAGE.wallHeight;
  const T = VILLAGE.wallThickness;
  const gw = VILLAGE.gateWidth;
  const stone = P(LAYER.STONE, COL.stone);
  const top = P(LAYER.STONE, COL.stoneWarm);
  const verts: [number, number][] = [];
  for (let k = 0; k < N; k++) {
    const a = Math.PI / N + (k * 2 * Math.PI) / N;
    verts.push([VILLAGE.x + Math.cos(a) * R, VILLAGE.z + Math.sin(a) * R]);
  }
  const base = (x: number, z: number) => kit.h(x, z) - 1.2;
  const gateAngles: Record<string, number> = { portao_brumafria_leste: 0, portao_brumafria_sul: Math.PI / 2 };
  const isGateSeg = (k: number): string | null => {
    const mid = Math.PI / N + ((k + 0.5) * 2 * Math.PI) / N;
    for (const [id, a] of Object.entries(gateAngles)) {
      let d = Math.abs(mid - a) % (Math.PI * 2);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (d < 0.01) return id;
    }
    return null;
  };
  b.frame(0, 0, 0, 0);
  const wallSeg = (ax: number, az: number, bx: number, bz: number) => {
    const y0 = Math.min(base(ax, az), base(bx, bz));
    const yTop = Math.max(kit.h(ax, az), kit.h(bx, bz)) + H;
    b.beam(ax, az, bx, bz, y0, yTop, T, stone);
    // ameias no lado de fora + passadiço
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    // normal para fora (vértices em ordem anti-horária vista de cima: fora = (uz, -ux))
    const ox = uz;
    const oz = -ux;
    const n = Math.floor(len / 1.6);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const cx = ax + (bx - ax) * t + ox * (T / 2 - 0.25);
      const cz = az + (bz - az) * t + oz * (T / 2 - 0.25);
      b.box(cx, yTop + 0.45, cz, 0.5, 0.9, 0.8, top, Math.atan2(ux, uz));
    }
    b.beam(ax, az, bx, bz, yTop - 0.05, yTop + 0.08, T + 0.25, top, 4 | 1 | 2);
    kit.wall(b, ax, az, bx, bz, y0, yTop + 0.9, T, 'wall', { walkable: true, surface: 'stone' });
    kit.maps.addFootprint((ax + bx) / 2, (az + bz) / 2, T + 1, len, Math.atan2(bx - ax, bz - az), 1, 0.15);
  };
  for (let k = 0; k < N; k++) {
    const [ax, az] = verts[k];
    const [bx, bz] = verts[(k + 1) % N];
    const gid = isGateSeg(k);
    if (!gid) {
      wallSeg(ax, az, bx, bz);
      continue;
    }
    const len = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / len;
    const uz = (bz - az) / len;
    const half = gw / 2 + 2.2; // vão + torres
    const mx = (ax + bx) / 2;
    const mz = (az + bz) / 2;
    wallSeg(ax, az, mx - ux * half, mz - uz * half);
    wallSeg(mx + ux * half, mz + uz * half, bx, bz);
    gatehouse(kit, b, gates, gid, mx, mz, Math.atan2(ux, uz));
  }
  // torres redondas em alguns vértices (longe dos portões)
  for (let k = 0; k < N; k++) {
    if (k % 3 !== 1) continue;
    const [x, z] = verts[k];
    const y0 = kit.h(x, z) - 1.2;
    const tr = 2.8;
    const th = H + 3.2;
    b.cylinder(x, y0, z, tr + 0.2, tr, th + 1.2, 12, stone, false);
    b.cylinder(x, y0 + th + 1.2, z, tr + 0.35, tr + 0.35, 0.5, 12, top, true, false);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      b.box(x + Math.sin(a) * (tr + 0.1), y0 + th + 2.1, z + Math.cos(a) * (tr + 0.1), 0.6, 0.9, 0.5, top, a);
    }
    b.cone(x, y0 + th + 2.6, z, tr + 0.5, 3.6, 12, P(LAYER.ROOF, COL.roof[2]));
    // seteiras
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + k;
      b.push(x + Math.sin(a) * (tr + 0.02), y0, z + Math.cos(a) * (tr + 0.02), a);
      b.box(0, 5.5, 0, 0.25, 1.1, 0.1, P(LAYER.PLAIN, [0.05, 0.05, 0.06]));
      b.pop();
    }
    kit.cyl(b, x, y0, z, tr + 0.3, th + 2.6, 'wall', { walkable: true, surface: 'stone' });
    kit.maps.addDisc(x, z, tr + 1.2, 0.2);
  }
}

/** Torres + arco + duas folhas de madeira que abrem para dentro. `yaw` alinha X local com a muralha. */
function gatehouse(kit: SiteKit, b: GeoBuilder, gates: GateSystem, id: string, x: number, z: number, wallYaw: number) {
  const gw = VILLAGE.gateWidth;
  const H = VILLAGE.wallHeight;
  const y = kit.h(x, z);
  // wallYaw alinha o +Z local com a muralha; girando +90° o X local segue a muralha e o +Z aponta para fora.
  const yaw = wallYaw + Math.PI / 2;
  b.push(x, y, z, yaw);
  const stone = P(LAYER.STONE, COL.stone);
  const dark = P(LAYER.STONE, COL.stoneDark);
  const tw = 4.4;
  for (const s of [-1, 1]) {
    const tx = s * (gw / 2 + tw / 2);
    b.box(tx, (H + 3) / 2 - 1.2, 0, tw, H + 4.2, tw, stone);
    b.box(tx, H + 3.2, 0, tw + 0.4, 0.4, tw + 0.4, P(LAYER.STONE, COL.stoneWarm));
    b.pyramid(tx, H + 3.4, 0, tw + 0.6, tw + 0.6, 3.2, P(LAYER.ROOF, COL.roof[1]));
    kit.box(b, tx, (H + 3) / 2 - 1.2, 0, tw, H + 4.2, tw, 'wall', { walkable: true, surface: 'stone' });
    // estandarte azul da vila
    b.box(tx, H - 0.6, tw / 2 + 0.06, 1.2, 2.6, 0.04, P(LAYER.FABRIC, [0.25, 0.4, 0.75]));
    b.box(tx, H - 0.6, tw / 2 + 0.09, 0.5, 0.5, 0.02, P(LAYER.FABRIC, [0.95, 0.85, 0.4]));
    // tocha
    b.box(s * (gw / 2 + 0.25), 3.6, 0.9, 0.22, 0.3, 0.22, P(LAYER.PLAIN, [1, 0.7, 0.3], EMIT.fire));
  }
  // arco e passadiço sobre o portão
  b.arch(0, 4.6, 0, gw, 1.6, 0.6, 2.0, 8, dark);
  b.box(0, H + 0.4, 0, gw + 0.2, 1.6, 2.4, stone);
  kit.box(b, 0, H + 0.4, 0, gw, 1.6, 2.4, 'wall', { walkable: true, surface: 'stone' });
  kit.box(b, 0, 5.6, 0, gw, 1.6, 1.2, 'wall', { walkable: false });
  // folhas do portão (abrem para dentro = -Z local)
  const leafW = gw / 2;
  const lh = 4.8;
  for (const s of [-1, 1]) {
    const lb = new GB();
    lb.frame(0, 0, 0, 0);
    const wood = P(LAYER.WOOD, [0.55, 0.38, 0.25]);
    const iron = P(LAYER.METAL, COL.iron);
    // folha se estende da dobradiça (x=0) para o centro (x = -s*leafW)
    lb.box((-s * leafW) / 2, lh / 2, 0, leafW - 0.05, lh, 0.22, wood);
    for (const yy of [0.8, 2.4, 4.0]) lb.box((-s * leafW) / 2, yy, 0.13, leafW - 0.1, 0.16, 0.05, iron);
    lb.box(-s * (leafW - 0.5), 2.2, 0.17, 0.12, 0.4, 0.06, iron);
    const [hx, hy, hz] = b.toWorld(s * (gw / 2), 0, -0.4);
    gates.addPart(id, lb, hx, hy, hz, yaw, { kind: 'swing', angle: -s * 1.75 });
  }
  const [cx, cy, cz] = b.toWorld(0, lh / 2, -0.4);
  gates.addBlocker(id, cx, cy, cz, gw / 2, lh / 2, 0.3, yaw);
  kit.surface(b, 'stone', 0, 0, gw + 2, 4, -100, 400);
  b.pop();
}

function streetLamps(kit: SiteKit) {
  const b = kit.g('vila_lampioes');
  b.frame(VILLAGE.x, 0, VILLAGE.z, 0);
  const spots: [number, number, number][] = [
    [24, 4.6, Math.PI],
    [44, -4.6, 0],
    [60, 4.6, Math.PI],
    [4.6, 26, -Math.PI / 2],
    [-4.6, 44, Math.PI / 2],
    [4.6, 60, -Math.PI / 2],
    [-26, 4.2, Math.PI],
    [-46, -4.2, 0],
    [4.2, -28, -Math.PI / 2],
    [-4.2, -46, Math.PI / 2],
  ];
  for (const [x, z, yaw] of spots) {
    b.push(x, kit.h(VILLAGE.x + x, VILLAGE.z + z), z, yaw);
    lampPost(b, kit, 0, 0, 3.4);
    b.pop();
  }
  // lampiões fora dos portões
  for (const [x, z, yaw] of [
    [VILLAGE.wallRadius + 6, -5, 0],
    [VILLAGE.wallRadius + 6, 5, Math.PI],
    [-5, VILLAGE.wallRadius + 6, Math.PI / 2],
    [5, VILLAGE.wallRadius + 6, -Math.PI / 2],
  ] as [number, number, number][]) {
    b.push(x, kit.h(VILLAGE.x + x, VILLAGE.z + z), z, yaw);
    lampPost(b, kit, 0, 0, 3.4);
    b.pop();
  }
}

// ---------------------------------------------------------------------------
// Plantações e cercados (fora dos muros)
// ---------------------------------------------------------------------------

function fields(kit: SiteKit) {
  const b = kit.g('vila_plantacoes', 320, false);
  const rng = new RNG(808);
  for (const f of VILLAGE_FIELDS) {
    const cx = VILLAGE.x + f.x;
    const cz = VILLAGE.z + f.z;
    b.frame(cx, 0, cz, f.yaw);
    const ground = (lx: number, lz: number) => {
      const [wx, , wz] = b.toWorld(lx, 0, lz);
      return kit.h(wx, wz);
    };
    kit.maps.addFootprint(cx, cz, f.w, f.d, f.yaw, 0.8, 0.85);
    const rows = Math.floor(f.w / 1.6);
    for (let r = 0; r < rows; r++) {
      const x = -f.w / 2 + 0.8 + r * 1.6;
      if (f.crop === 'trigo') {
        // trigo em trechos contínuos (menos triângulos que planta a planta)
        const segs = Math.ceil(f.d / 2.8);
        for (let k = 0; k < segs; k++) {
          const z0 = -f.d / 2 + k * (f.d / segs);
          const z1 = z0 + f.d / segs - 0.2;
          const y = ground(x, (z0 + z1) / 2);
          const hh = 0.95 + rng.next() * 0.25;
          b.box(x, y + hh / 2, (z0 + z1) / 2, 0.7, hh, z1 - z0, P(LAYER.THATCH, [1.15, 1.0, 0.55]), 0, 1 | 2 | 4 | 16 | 32);
          b.box(x, y + hh + 0.06, (z0 + z1) / 2, 0.55, 0.12, z1 - z0 - 0.2, P(LAYER.THATCH, [1.2, 0.95, 0.5]), 0, 1 | 2 | 4);
        }
        continue;
      }
      const step = f.crop === 'repolho' ? 1.1 : 1.3;
      const plants = Math.floor(f.d / step);
      for (let k = 0; k < plants; k++) {
        const z = -f.d / 2 + step / 2 + k * step;
        const y = ground(x, z);
        const j = (rng.next() - 0.5) * 0.15;
        switch (f.crop) {
          case 'repolho':
            b.cylinder(x + j, y, z, 0.32, 0.24, 0.32, 6, P(LAYER.MOSS, [0.6, 0.95, 0.55]), true);
            break;
          case 'abobora':
            if (k % 2 === 0) b.cylinder(x + j, y, z, 0.34, 0.3, 0.34, 7, P(LAYER.PLAIN, [0.95, 0.5, 0.12]), true);
            b.box(x, y + 0.08, z + 0.5, 0.25, 0.12, 0.7, P(LAYER.MOSS, [0.55, 0.8, 0.4]), 0, 1 | 2 | 4);
            break;
          default:
            if (k % 2 === 0) {
              b.box(x, y + 0.75, z, 0.1, 1.5, 0.1, P(LAYER.WOOD, COL.timber), 0, 1 | 2 | 16 | 32);
              b.box(x, y + 1.05, z + 0.6, 0.45, 0.7, 1.3, P(LAYER.MOSS, [0.45, 0.7, 0.35]), 0, 1 | 2 | 4 | 16 | 32);
              b.box(x + 0.25, y + 0.85, z + 0.4, 0.16, 0.22, 0.16, P(LAYER.PLAIN, [0.45, 0.2, 0.5]));
            }
        }
      }
    }
    // cerca em volta com abertura na frente
    const hw = f.w / 2 + 0.6;
    const hd = f.d / 2 + 0.6;
    fence(b, kit, [
      [-1.5, hd],
      [-hw, hd],
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [1.5, hd],
    ], ground, 1.0);
    // espantalho
    const sx = 0;
    const sz = 0;
    const sy = ground(sx, sz);
    b.box(sx, sy + 1.1, sz, 0.12, 2.2, 0.12, P(LAYER.WOOD, COL.timber));
    b.box(sx, sy + 1.6, sz, 1.6, 0.1, 0.1, P(LAYER.WOOD, COL.timber));
    b.box(sx, sy + 1.4, sz, 0.6, 0.7, 0.3, P(LAYER.FABRIC, [0.5, 0.35, 0.3]));
    b.cylinder(sx, sy + 1.8, sz, 0.18, 0.18, 0.32, 7, P(LAYER.THATCH, COL.white), true);
    b.cone(sx, sy + 2.1, sz, 0.42, 0.4, 8, P(LAYER.THATCH, [0.7, 0.55, 0.3]), true);
  }
}

function pens(kit: SiteKit) {
  const b = kit.g('vila_cercados', 320, true);
  for (const p of VILLAGE_PENS) {
    const cx = VILLAGE.x + p.x;
    const cz = VILLAGE.z + p.z;
    b.frame(cx, 0, cz, p.yaw);
    const ground = (lx: number, lz: number) => {
      const [wx, , wz] = b.toWorld(lx, 0, lz);
      return kit.h(wx, wz);
    };
    kit.maps.addFootprint(cx, cz, p.w, p.d, p.yaw, 0.3, 0.5);
    const hw = p.w / 2;
    const hd = p.d / 2;
    fence(b, kit, [
      [-1.4, hd],
      [-hw, hd],
      [-hw, -hd],
      [hw, -hd],
      [hw, hd],
      [1.4, hd],
    ], ground, 1.2);
    // abrigo de palha + cocho + feno
    const ay = ground(-hw + 2, -hd + 1.6);
    b.push(-hw + 2.2, ay, -hd + 1.8, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(sx * 1.6, 1.1, sz * 1.1, 0.16, 2.2, 0.16, P(LAYER.WOOD, COL.timber));
    b.gableRoof(0, 2.2, 0, 4.0, 3.0, 1.0, P(LAYER.THATCH, COL.white));
    kit.box(b, 0, 2.6, 0, 4.0, 0.8, 3.0, 'building', { walkable: true });
    b.pop();
    const ty = ground(hw - 2, 0);
    b.box(hw - 2, ty + 0.3, 0, 0.7, 0.5, 2.2, P(LAYER.WOOD, COL.woodLight));
    b.box(hw - 2, ty + 0.52, 0, 0.55, 0.04, 2.0, P(LAYER.PLAIN, [0.15, 0.25, 0.3]));
    kit.box(b, hw - 2, ty + 0.3, 0, 0.7, 0.6, 2.2, 'prop');
    for (let i = 0; i < 3; i++) {
      const hx = -hw + 1.2 + i * 1.3;
      const hz = hd - 1.4;
      const hy = ground(hx, hz);
      b.box(hx, hy + 0.4, hz, 1.1, 0.8, 0.8, P(LAYER.THATCH, [1.1, 1.0, 0.7]), i * 0.3);
      kit.box(b, hx, hy + 0.4, hz, 1.1, 0.8, 0.8, 'prop', {}, i * 0.3);
    }
  }
}

// mantém o import usado em builds que não referenciam todas as peças
void windowPiece;
void doorPiece;
