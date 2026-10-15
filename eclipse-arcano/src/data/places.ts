/**
 * Layout das estruturas construídas pelo módulo world/ e ÂNCORAS NOMEADAS do mundo.
 *
 * - Os construtores de estruturas (src/world/structures/*) leem as plantas daqui,
 *   então as âncoras abaixo batem com a geometria e os colisores reais.
 * - Coordenadas em metros (mundo). `y` só é definido quando a altura não é a do chão
 *   (ilhas, sacadas, topo de torres). Sem `y`, use World.placePosition(id), que aplica
 *   physics.groundHeight.
 * - Convenção de rotação = three.js: `yaw` gira o eixo local; o lado local +Z de um
 *   prédio (a porta) aponta para (sin(yaw), 0, cos(yaw)). yaw 0 = porta para o sul (+Z).
 *
 * Use `place(id)`, `placesWithTag(tag)` e `PATROL_ROUTES` nos módulos de NPCs, IA e missões.
 */
import { BOSS_ARENAS, FLOATING_ISLANDS, LOCATION_BY_ID } from './world';

// ---------------------------------------------------------------------------
// Utilitários geométricos (puros)
// ---------------------------------------------------------------------------

/** Gira (lx, lz) pelo yaw (mesma convenção do Object3D.rotation.y). */
export function rotYaw(yaw: number, lx: number, lz: number): [number, number] {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [lx * c + lz * s, -lx * s + lz * c];
}

/** Ponto local de um prédio → coordenadas do sítio (ou do mundo, se bx/bz forem do mundo). */
export function buildingToSite(b: { x: number; z: number; yaw: number }, lx: number, lz: number): [number, number] {
  const [rx, rz] = rotYaw(b.yaw, lx, lz);
  return [b.x + rx, b.z + rz];
}

// ---------------------------------------------------------------------------
// Vila de Brumafria
// ---------------------------------------------------------------------------

export const VILLAGE = {
  ...pick(LOCATION_BY_ID['vila_brumafria']),
  /** Altura do chão aplainado. */
  y: LOCATION_BY_ID['vila_brumafria'].flattenTo!,
  /** Raio (circunscrito) do polígono da muralha. */
  wallRadius: 74,
  wallSides: 20,
  wallHeight: 6.5,
  wallThickness: 1.6,
  gateWidth: 7,
  plazaRadius: 15,
  wellRadius: 1.7,
};

export type BuildingKind = 'tavern' | 'house' | 'elder' | 'forge' | 'archive' | 'shrine' | 'crystal_tower' | 'guardpost' | 'stall';

export interface BuildingDef {
  id: string;
  kind: BuildingKind;
  name: string;
  /** Centro (relativo ao centro da vila). */
  x: number;
  z: number;
  /** Porta no lado local +Z. */
  yaw: number;
  /** Largura (eixo local X) e profundidade (eixo local Z), m. */
  w: number;
  d: number;
  floors: 1 | 2;
  /** Variação visual (cores, telhado, enxaimel...). */
  style: number;
  /** Interior acessível (porta com vão + piso + mobília). */
  interior?: boolean;
}

const PI = Math.PI;

export const VILLAGE_BUILDINGS: BuildingDef[] = [
  { id: 'taverna', kind: 'tavern', name: 'Taverna do Javali Rúnico', x: -25, z: -23, yaw: PI / 4, w: 18, d: 12, floors: 2, style: 0, interior: true },
  { id: 'forja', kind: 'forge', name: 'Forja de Brumafria', x: 32, z: -15, yaw: 0, w: 12, d: 9, floors: 1, style: 0 },
  { id: 'arquivo', kind: 'archive', name: 'Arquivo de Brumafria', x: 16, z: -42, yaw: -PI / 2, w: 10, d: 12, floors: 1, style: 1, interior: true },
  { id: 'santuario_vila', kind: 'shrine', name: 'Santuário da Aurora', x: -42, z: -12, yaw: 0, w: 7, d: 6, floors: 1, style: 0 },
  { id: 'torre_cristal', kind: 'crystal_tower', name: 'Torre de Cristal Adormecida', x: 0, z: -60, yaw: 0, w: 11, d: 11, floors: 1, style: 0 },
  { id: 'casa_ancia', kind: 'elder', name: 'Casa da Anciã', x: -48, z: 16, yaw: PI, w: 9, d: 8, floors: 1, style: 2 },
  { id: 'guarita_leste', kind: 'guardpost', name: 'Guarita Leste', x: 64, z: -9, yaw: 0, w: 3.2, d: 3.2, floors: 1, style: 0 },
  { id: 'guarita_sul', kind: 'guardpost', name: 'Guarita Sul', x: 9, z: 64, yaw: -PI / 2, w: 3.2, d: 3.2, floors: 1, style: 0 },
  // Barracas do mercado (a frente/balcão fica no lado local +Z).
  { id: 'barraca_1', kind: 'stall', name: 'Barraca de Frutas', x: 7.8, z: -7.8, yaw: -PI / 4, w: 4, d: 2.6, floors: 1, style: 0 },
  { id: 'barraca_2', kind: 'stall', name: 'Barraca de Tecidos', x: 7.8, z: 7.8, yaw: (-3 * PI) / 4, w: 4, d: 2.6, floors: 1, style: 1 },
  { id: 'barraca_3', kind: 'stall', name: 'Barraca de Ervas', x: -7.8, z: 7.8, yaw: (3 * PI) / 4, w: 4, d: 2.6, floors: 1, style: 2 },
  { id: 'barraca_4', kind: 'stall', name: 'Barraca de Ferramentas', x: 20, z: -7, yaw: 0, w: 4, d: 2.6, floors: 1, style: 3 },
  { id: 'barraca_5', kind: 'stall', name: 'Barraca de Pães', x: 20, z: 7, yaw: PI, w: 4, d: 2.6, floors: 1, style: 4 },
  // Casas
  { id: 'casa_1', kind: 'house', name: 'Casa do Moleiro', x: 36, z: 14, yaw: PI, w: 10, d: 8, floors: 2, style: 0 },
  { id: 'casa_2', kind: 'house', name: 'Casa do Tecelão', x: 52, z: 15, yaw: PI, w: 8, d: 8, floors: 1, style: 1 },
  { id: 'casa_3', kind: 'house', name: 'Casa do Curtidor', x: 14, z: 32, yaw: -PI / 2, w: 9, d: 8, floors: 1, style: 2 },
  { id: 'casa_4', kind: 'house', name: 'Casa dos Lavradores', x: 15, z: 50, yaw: -PI / 2, w: 8, d: 9, floors: 2, style: 3 },
  { id: 'casa_5', kind: 'house', name: 'Casa do Carpinteiro', x: 38, z: 38, yaw: (-3 * PI) / 4, w: 9, d: 8, floors: 1, style: 4 },
  { id: 'casa_6', kind: 'house', name: 'Casa da Parteira', x: -15, z: 30, yaw: PI / 2, w: 9, d: 8, floors: 2, style: 5 },
  { id: 'casa_7', kind: 'house', name: 'Casa do Pastor', x: -16, z: 50, yaw: PI / 2, w: 10, d: 8, floors: 1, style: 6 },
  { id: 'casa_8', kind: 'house', name: 'Casa do Padeiro', x: -28, z: 14, yaw: PI, w: 9, d: 8, floors: 2, style: 7 },
  { id: 'casa_9', kind: 'house', name: 'Casa do Caçador', x: -38, z: 40, yaw: PI / 2, w: 8, d: 8, floors: 1, style: 8 },
  { id: 'casa_10', kind: 'house', name: 'Casa do Ferreiro', x: 52, z: -18, yaw: 0, w: 9, d: 8, floors: 2, style: 9 },
  { id: 'casa_11', kind: 'house', name: 'Casa do Guarda', x: 36, z: -36, yaw: PI / 2, w: 9, d: 8, floors: 1, style: 10 },
  { id: 'casa_12', kind: 'house', name: 'Casa da Costureira', x: 52, z: -34, yaw: -PI / 2, w: 8, d: 8, floors: 1, style: 11 },
  { id: 'casa_13', kind: 'house', name: 'Casa do Escriba', x: -16, z: -46, yaw: PI / 2, w: 9, d: 8, floors: 2, style: 12 },
  { id: 'casa_14', kind: 'house', name: 'Casa do Apicultor', x: -40, z: -38, yaw: PI / 4, w: 8, d: 8, floors: 1, style: 13 },
];

export const VILLAGE_BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(VILLAGE_BUILDINGS.map((b) => [b.id, b]));

/** Ruas internas (relativas ao centro da vila). Largura em m. Pintadas como terra batida. */
export const VILLAGE_STREETS: { id: string; width: number; points: [number, number][] }[] = [
  { id: 'rua_leste', width: 7, points: [[13, 0], [96, 0]] },
  { id: 'rua_sul', width: 7, points: [[0, 13], [0, 96]] },
  { id: 'rua_oeste', width: 6, points: [[-13, 0], [-58, 0]] },
  { id: 'rua_norte', width: 6, points: [[0, -13], [0, -53]] },
  { id: 'viela_nordeste', width: 4, points: [[44, -3], [44, -38]] },
  { id: 'viela_sudeste', width: 4, points: [[26, 3], [26, 24], [33, 33]] },
  { id: 'viela_sudoeste', width: 4, points: [[-3, 40], [-33, 40]] },
  { id: 'viela_noroeste', width: 3.5, points: [[-35, -3], [-36.5, -14], [-40, -24], [-37.5, -34]] },
];

/** Plantações (fora dos muros). Retângulos relativos ao centro da vila; fileiras no eixo local Z. */
export const VILLAGE_FIELDS: { id: string; x: number; z: number; w: number; d: number; yaw: number; crop: 'trigo' | 'repolho' | 'abobora' | 'vinha' }[] = [
  { id: 'plantacao_trigo', x: -100, z: -22, w: 22, d: 34, yaw: 0.12, crop: 'trigo' },
  { id: 'plantacao_repolho', x: -96, z: 30, w: 20, d: 24, yaw: -0.2, crop: 'repolho' },
  { id: 'plantacao_abobora', x: -42, z: -104, w: 30, d: 18, yaw: 0.3, crop: 'abobora' },
  { id: 'plantacao_vinha', x: 30, z: -102, w: 26, d: 16, yaw: -0.15, crop: 'vinha' },
];

/** Cercados de animais (fora dos muros), com cerca de madeira e porteira no lado local +Z. */
export const VILLAGE_PENS: { id: string; x: number; z: number; w: number; d: number; yaw: number }[] = [
  { id: 'cercado_ovelhas', x: 58, z: 92, w: 20, d: 14, yaw: -0.5 },
  { id: 'cercado_galinhas', x: -62, z: 88, w: 12, d: 10, yaw: 0.6 },
];

// ---------------------------------------------------------------------------
// Outros sítios (centros em coordenadas do mundo)
// ---------------------------------------------------------------------------

export const CRYPT = {
  ...pick(LOCATION_BY_ID['cripta_despertar']),
  y: LOCATION_BY_ID['cripta_despertar'].flattenTo!,
  /** Pátio a céu aberto (local): x ∈ [-11, 11], z ∈ [-16, 2]. Saída no muro norte (z = -16). */
  court: { x0: -11, x1: 11, z0: -16, z1: 2, exitWidth: 4.5 },
  /** Mausoléu (local): x ∈ [-8, 8], z ∈ [2, 16]; porta no muro norte (z = 2). */
  tomb: { x0: -8, x1: 8, z0: 2, z1: 16, doorWidth: 2.6, doorHeight: 3.2 },
};

export const RUINS = {
  ...pick(LOCATION_BY_ID['ruinas_aeternum']),
  y: LOCATION_BY_ID['ruinas_aeternum'].flattenTo!,
};

const ARENA_DEF = BOSS_ARENAS['guardiao_mecanico'];
/** Ângulo (atan2 em XZ) da entrada da arena: virada para o centro das ruínas. */
const ARENA_ENTRANCE_ANGLE = Math.atan2(RUINS.z - ARENA_DEF.z, RUINS.x - ARENA_DEF.x);

export const ARENA = {
  x: ARENA_DEF.x,
  z: ARENA_DEF.z,
  y: LOCATION_BY_ID['camara_guardiao'].flattenTo!,
  /** Altura do piso metálico da arena (acima do relevo aplainado). */
  floorY: LOCATION_BY_ID['camara_guardiao'].flattenTo! + 0.45,
  /** Raio do piso de luta. */
  radius: ARENA_DEF.radius,
  /** Muro interno (raio) e altura. */
  wallRadius: 38,
  wallHeight: 10,
  entranceAngle: ARENA_ENTRANCE_ANGLE,
  entranceWidth: 7,
  /** Corredor de entrada (dromos) entre o portão selado e a arena. */
  corridorLength: 18,
  socketRadius: 23,
  ventRadius: 14,
};

export const CAMP = {
  ...pick(LOCATION_BY_ID['acampamento_corvos']),
  y: LOCATION_BY_ID['acampamento_corvos'].flattenTo!,
  palisadeRadius: 26,
  /** Ângulo (atan2 XZ) da abertura da paliçada — virada para a estrada. */
  gateAngle: Math.atan2(-55.7, 36.5),
  gateWidth: 6,
};

export const TOWER = {
  ...pick(LOCATION_BY_ID['torre_observador']),
  y: LOCATION_BY_ID['torre_observador'].flattenTo!,
  /** Piso do térreo (sobre o plinto). */
  floorY: LOCATION_BY_ID['torre_observador'].flattenTo! + 0.6,
  radius: 7,
  height: 44,
  /** Altura da sacada acima do chão. */
  balconyHeight: 37,
  balconyRadius: 10.5,
  /** Porta virada para o oeste (trilha). */
  doorYaw: -PI / 2,
};

export const FERROLUZ = {
  ...pick(LOCATION_BY_ID['posto_ferroluz']),
  y: LOCATION_BY_ID['posto_ferroluz'].flattenTo!,
  half: 48,
  wallHeight: 13,
  wallThickness: 3,
  /** Portão no muro oeste (local x = -half). */
  gateWidth: 8,
};

export const LAB = { ...pick(LOCATION_BY_ID['laboratorio_abandonado']), y: LOCATION_BY_ID['laboratorio_abandonado'].flattenTo!, yaw: 0.35 };
export const CRYSTAL_SHRINE = { ...pick(LOCATION_BY_ID['santuario_cristal']), y: LOCATION_BY_ID['santuario_cristal'].flattenTo!, radius: 12 };
export const CANYON = pick(LOCATION_BY_ID['desfiladeiro_cinzas']);

/** Ninho do grifo: platô rochoso nas montanhas do norte. */
export const GRIFFIN_NEST = { x: 236, z: -872 };

function pick(l: { x: number; z: number }) {
  return { x: l.x, z: l.z };
}

// ---------------------------------------------------------------------------
// Âncoras
// ---------------------------------------------------------------------------

export type PlaceKind =
  | 'npc_home'
  | 'npc_work'
  | 'npc_leisure'
  | 'door'
  | 'gate'
  | 'chest'
  | 'item'
  | 'quest'
  | 'enemy_spawn'
  | 'boss'
  | 'creature'
  | 'island'
  | 'poi'
  | 'sign';

export interface Place {
  id: string;
  kind: PlaceKind;
  x: number;
  z: number;
  /** Altura absoluta, quando não é o chão (ilhas, sacadas, interiores elevados). */
  y?: number;
  /** Direção para onde a pessoa/objeto deve olhar (yaw three.js). */
  yaw?: number;
  label?: string;
  tags: string[];
}

const P: Place[] = [];

function add(id: string, kind: PlaceKind, x: number, z: number, opts: { y?: number; yaw?: number; label?: string; tags?: string[] } = {}) {
  P.push({ id, kind, x: round(x), z: round(z), y: opts.y === undefined ? undefined : round(opts.y), yaw: opts.yaw === undefined ? undefined : round(opts.yaw, 3), label: opts.label, tags: opts.tags ?? [] });
}

function round(v: number, d = 2) {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

/** Âncora relativa a um prédio da vila (lx, lz no espaço local do prédio). */
function addB(id: string, kind: PlaceKind, b: BuildingDef, lx: number, lz: number, opts: { y?: number; yawLocal?: number; label?: string; tags?: string[] } = {}) {
  const [sx, sz] = buildingToSite(b, lx, lz);
  add(id, kind, VILLAGE.x + sx, VILLAGE.z + sz, { y: opts.y, yaw: opts.yawLocal === undefined ? undefined : b.yaw + opts.yawLocal, label: opts.label, tags: opts.tags });
}

/** Âncora relativa ao centro da vila. */
function addV(id: string, kind: PlaceKind, x: number, z: number, opts: { y?: number; yaw?: number; label?: string; tags?: string[] } = {}) {
  add(id, kind, VILLAGE.x + x, VILLAGE.z + z, opts);
}

/** Âncora relativa a um centro de sítio (sem rotação). */
function addS(site: { x: number; z: number }, id: string, kind: PlaceKind, x: number, z: number, opts: { y?: number; yaw?: number; label?: string; tags?: string[] } = {}) {
  add(id, kind, site.x + x, site.z + z, opts);
}

/** Ponto polar em torno de um centro. */
function polar(c: { x: number; z: number }, r: number, ang: number): [number, number] {
  return [c.x + Math.cos(ang) * r, c.z + Math.sin(ang) * r];
}

/** yaw que olha de (x,z) para (tx,tz). */
function yawTowards(x: number, z: number, tx: number, tz: number) {
  return Math.atan2(tx - x, tz - z);
}

// --- Vila: casas (porta externa = "lar" do NPC) ---
for (const b of VILLAGE_BUILDINGS) {
  if (b.kind === 'house' || b.kind === 'elder') {
    addB(`${b.id}_porta`, 'npc_home', b, 0, b.d / 2 + 1.4, { yawLocal: PI, label: b.name, tags: ['vila', 'casa', 'lar', b.id] });
    addB(`${b.id}_quintal`, 'npc_leisure', b, b.w / 2 - 1.5, b.d / 2 + 3.2, { yawLocal: PI, label: `Quintal — ${b.name}`, tags: ['vila', 'lazer', b.id] });
  }
}

const B = VILLAGE_BUILDING_BY_ID;
// --- Taverna (interior acessível; porta no lado local +Z) ---
{
  const t = B['taverna'];
  addB('taverna_porta', 'door', t, 0, t.d / 2 + 1.5, { yawLocal: PI, label: 'Porta da taverna', tags: ['vila', 'taverna', 'porta'] });
  addB('taverna_entrada', 'npc_leisure', t, 0, t.d / 2 - 1.4, { yawLocal: PI, label: 'Entrada da taverna (dentro)', tags: ['vila', 'taverna', 'interior'] });
  addB('taverna_balcao', 'npc_work', t, 4.5, -4.4, { yawLocal: 0, label: 'Atrás do balcão (taverneiro)', tags: ['vila', 'taverna', 'trabalho', 'interior', 'taverneiro'] });
  addB('taverna_balcao_cliente', 'npc_leisure', t, 4.5, -1.8, { yawLocal: PI, label: 'Diante do balcão', tags: ['vila', 'taverna', 'lazer', 'interior'] });
  addB('taverna_lareira', 'npc_leisure', t, -6.6, -1.5, { yawLocal: -PI / 2, label: 'Junto à lareira', tags: ['vila', 'taverna', 'lazer', 'interior'] });
  addB('taverna_bardo', 'npc_work', t, -6.2, 3.6, { yawLocal: PI / 2, label: 'Canto do bardo', tags: ['vila', 'taverna', 'trabalho', 'interior', 'bardo'] });
  addB('taverna_descanso', 'quest', t, 7.4, 3.8, { yawLocal: -PI / 2, label: 'Quarto para alugar (descanso)', tags: ['vila', 'taverna', 'descanso', 'interior'] });
  addB('quadro_missoes_brumafria', 'quest', t, 3.6, t.d / 2 + 0.55, { yawLocal: 0, label: 'Quadro de missões', tags: ['vila', 'missao', 'quadro'] });
  const tables: [number, number][] = [
    [-3.2, 2.2],
    [0.8, 2.6],
    [-2.6, -2.4],
    [1.2, -1.4],
  ];
  tables.forEach(([lx, lz], i) => {
    addB(`taverna_mesa_${i + 1}`, 'npc_leisure', t, lx, lz, { label: `Mesa ${i + 1} da taverna`, tags: ['vila', 'taverna', 'mesa', 'interior'] });
    addB(`taverna_mesa_${i + 1}_assento_a`, 'npc_leisure', t, lx - 1.15, lz, { yawLocal: PI / 2, label: `Mesa ${i + 1}, assento A`, tags: ['vila', 'taverna', 'assento', 'interior'] });
    addB(`taverna_mesa_${i + 1}_assento_b`, 'npc_leisure', t, lx + 1.15, lz, { yawLocal: -PI / 2, label: `Mesa ${i + 1}, assento B`, tags: ['vila', 'taverna', 'assento', 'interior'] });
  });
}
// --- Forja ---
{
  const f = B['forja'];
  addB('forja_bigorna', 'npc_work', f, 0.6, 0.4, { yawLocal: PI / 2, label: 'Bigorna', tags: ['vila', 'forja', 'trabalho', 'ferreiro'] });
  addB('forja_fornalha', 'npc_work', f, -3.4, -1.6, { yawLocal: PI, label: 'Fornalha', tags: ['vila', 'forja', 'trabalho'] });
  addB('forja_balcao', 'npc_work', f, 3.2, 3.1, { yawLocal: 0, label: 'Balcão da forja (loja)', tags: ['vila', 'forja', 'loja', 'trabalho', 'ferreiro'] });
  addB('forja_cliente', 'npc_leisure', f, 3.2, f.d / 2 + 1.6, { yawLocal: PI, label: 'Cliente da forja', tags: ['vila', 'forja', 'lazer'] });
}
// --- Arquivo ---
{
  const a = B['arquivo'];
  addB('arquivo_porta', 'door', a, 0, a.d / 2 + 1.5, { yawLocal: PI, label: 'Porta do arquivo', tags: ['vila', 'arquivo', 'porta'] });
  addB('arquivo_mesa', 'npc_work', a, 0, -2.6, { yawLocal: 0, label: 'Mesa do arquivista', tags: ['vila', 'arquivo', 'trabalho', 'interior', 'arquivista'] });
  addB('arquivo_estante', 'quest', a, -3.2, -0.5, { yawLocal: -PI / 2, label: 'Estante de crônicas antigas', tags: ['vila', 'arquivo', 'leitura', 'interior'] });
  addB('arquivo_leitura', 'npc_leisure', a, 2.6, 2.2, { yawLocal: PI / 2, label: 'Banco de leitura', tags: ['vila', 'arquivo', 'lazer', 'interior'] });
}
// --- Santuário da vila, casa da anciã, torre de cristal, guaritas, barracas ---
{
  const s = B['santuario_vila'];
  addB('santuario_vila_altar', 'npc_work', s, 0, -1.2, { yawLocal: 0, label: 'Altar da Aurora', tags: ['vila', 'santuario', 'trabalho', 'sacerdote'] });
  addB('santuario_vila_oracao', 'npc_leisure', s, 0, 1.8, { yawLocal: PI, label: 'Banco de oração', tags: ['vila', 'santuario', 'lazer'] });
  const e = B['casa_ancia'];
  addB('casa_ancia_jardim', 'npc_work', e, 0, -e.d / 2 - 6, { yawLocal: 0, label: 'Jardim de ervas da Anciã', tags: ['vila', 'ancia', 'trabalho', 'jardim'] });
  addB('casa_ancia_varanda', 'npc_leisure', e, -2.5, e.d / 2 + 1.6, { yawLocal: 0, label: 'Banco na frente da casa da Anciã', tags: ['vila', 'ancia', 'lazer'] });
  const tc = B['torre_cristal'];
  addB('torre_cristal_porta', 'quest', tc, 0, tc.d / 2 + 1.6, { yawLocal: PI, label: 'Porta selada da torre de cristal', tags: ['vila', 'torre_cristal', 'missao'] });
  addB('torre_cristal_topo', 'poi', tc, 0, 0, { y: VILLAGE.y + 31, label: 'Cristal adormecido (topo)', tags: ['vila', 'torre_cristal'] });
  for (const id of ['guarita_leste', 'guarita_sul']) {
    const g = B[id];
    addB(`${id}_posto`, 'npc_work', g, 0, g.d / 2 + 0.9, { yawLocal: 0, label: g.name, tags: ['vila', 'guarda', 'trabalho', 'guarita'] });
  }
  for (const b of VILLAGE_BUILDINGS.filter((x) => x.kind === 'stall')) {
    addB(`${b.id}_vendedor`, 'npc_work', b, 0, -0.5, { yawLocal: 0, label: b.name, tags: ['vila', 'mercado', 'trabalho', 'vendedor'] });
    addB(`${b.id}_cliente`, 'npc_leisure', b, 0, b.d / 2 + 1.2, { yawLocal: PI, label: `Cliente — ${b.name}`, tags: ['vila', 'mercado', 'lazer'] });
  }
}
// --- Praça, poço, portões e muralha ---
addV('praca_centro', 'npc_leisure', 0, 4.6, { yaw: PI, label: 'Praça de Brumafria (junto ao poço)', tags: ['vila', 'praca', 'lazer'] });
addV('poco', 'npc_leisure', 0, VILLAGE.wellRadius + 0.9, { yaw: PI, label: 'Poço da praça', tags: ['vila', 'praca', 'lazer', 'poco'] });
for (let i = 0; i < 4; i++) {
  const a = PI / 4 + (i * PI) / 2 + PI / 8;
  addV(`praca_banco_${i + 1}`, 'npc_leisure', Math.cos(a) * 12.6, Math.sin(a) * 12.6, { yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), label: `Banco da praça ${i + 1}`, tags: ['vila', 'praca', 'lazer', 'banco'] });
}
addV('portao_leste_dentro', 'gate', VILLAGE.wallRadius - 8, 0, { yaw: PI / 2, label: 'Portão leste (dentro)', tags: ['vila', 'portao', 'guarda'] });
addV('portao_leste_fora', 'gate', VILLAGE.wallRadius + 8, 0, { yaw: -PI / 2, label: 'Portão leste (fora)', tags: ['vila', 'portao'] });
addV('portao_sul_dentro', 'gate', 0, VILLAGE.wallRadius - 8, { yaw: 0, label: 'Portão sul (dentro)', tags: ['vila', 'portao', 'guarda'] });
addV('portao_sul_fora', 'gate', 0, VILLAGE.wallRadius + 8, { yaw: PI, label: 'Portão sul (fora)', tags: ['vila', 'portao'] });
for (const f of VILLAGE_FIELDS) {
  addV(f.id, 'npc_work', f.x, f.z, { yaw: f.yaw, label: `Plantação (${f.crop})`, tags: ['vila', 'plantacao', 'trabalho', 'campo'] });
  const [ex, ez] = rotYaw(f.yaw, 0, f.d / 2 + 1.5);
  addV(`${f.id}_borda`, 'npc_work', f.x + ex, f.z + ez, { yaw: f.yaw + PI, label: `Borda da plantação (${f.crop})`, tags: ['vila', 'plantacao', 'trabalho'] });
}
for (const p of VILLAGE_PENS) {
  addV(p.id, 'creature', p.x, p.z, { yaw: p.yaw, label: 'Cercado de animais', tags: ['vila', 'cercado', 'animais'] });
  const [ex, ez] = rotYaw(p.yaw, 0, p.d / 2 + 1.4);
  addV(`${p.id}_porteira`, 'npc_work', p.x + ex, p.z + ez, { yaw: p.yaw + PI, label: 'Porteira do cercado', tags: ['vila', 'cercado', 'trabalho'] });
}
addV('lampiao_praca', 'poi', 11, -11, { label: 'Lampião da praça', tags: ['vila', 'lampiao'] });
addV('vila_patrulha_centro', 'npc_work', 0, 20, { tags: ['vila', 'guarda', 'patrulha'] });

// --- Cripta do Despertar ---
addS(CRYPT, 'cripta_inicio', 'poi', 0, -7, { yaw: PI, label: 'Despertar do mago', tags: ['cripta', 'inicio'] });
addS(CRYPT, 'altar_cripta', 'quest', 0, 11.2, { yaw: PI, label: 'Altar do Despertar', tags: ['cripta', 'missao', 'altar', 'interior'] });
addS(CRYPT, 'sarcofago_cripta', 'poi', 0, 8.6, { label: 'Sarcófago do mago', tags: ['cripta', 'interior'] });
addS(CRYPT, 'bau_cripta', 'chest', 5.2, 13.4, { yaw: PI, label: 'Baú da cripta', tags: ['cripta', 'bau', 'interior'] });
addS(CRYPT, 'porta_cripta', 'door', 0, CRYPT.tomb.z0 - 1.4, { yaw: 0, label: 'Porta do mausoléu', tags: ['cripta', 'porta'] });
addS(CRYPT, 'cripta_saida', 'poi', 0, CRYPT.court.z0 - 3, { yaw: PI, label: 'Saída do pátio da cripta', tags: ['cripta'] });
addS(CRYPT, 'cripta_mural', 'quest', -6.4, 9, { yaw: PI / 2, label: 'Mural rúnico', tags: ['cripta', 'leitura', 'interior'] });

// --- Ruínas de Aeternum + Câmara do Guardião ---
{
  const [ex, ez] = polar(ARENA, ARENA.wallRadius + 1, ARENA.entranceAngle);
  const [gx, gz] = polar(ARENA, ARENA.wallRadius + ARENA.corridorLength, ARENA.entranceAngle);
  const [px, pz] = polar(ARENA, ARENA.wallRadius + ARENA.corridorLength + 9, ARENA.entranceAngle);
  const toArena = yawTowards(gx, gz, ARENA.x, ARENA.z);
  add('pedestal_cristal_ruinas', 'quest', px, pz, { y: undefined, yaw: toArena, label: 'Pedestal do cristal (abre o portão selado)', tags: ['ruinas', 'missao', 'pedestal'] });
  add('portao_ruinas', 'gate', gx, gz, { yaw: toArena, label: 'Portão selado de Aeternum', tags: ['ruinas', 'portao'] });
  add('arena_entrada', 'boss', ex, ez, { yaw: toArena, label: 'Entrada da Câmara do Guardião', tags: ['ruinas', 'arena', 'portao'] });
  add('arena_centro', 'boss', ARENA.x, ARENA.z, { y: ARENA.floorY + 0.3, label: 'Centro da arena (estrado)', tags: ['ruinas', 'arena', 'chefe'] });
  // Jogador entra pela entrada; o chefe desperta no centro, olhando para a entrada.
  add('arena_chefe_inicio', 'boss', ARENA.x, ARENA.z, { y: ARENA.floorY + 0.3, yaw: yawTowards(ARENA.x, ARENA.z, ex, ez), label: 'Guardião (posição inicial)', tags: ['ruinas', 'arena', 'chefe'] });
  for (let i = 0; i < 4; i++) {
    const a = ARENA.entranceAngle + PI / 4 + (i * PI) / 2;
    const [sx, sz] = polar(ARENA, ARENA.socketRadius, a);
    add(`arena_soquete_${i + 1}`, 'boss', sx, sz, { y: ARENA.floorY, label: `Soquete de pilar ${i + 1} (fase 2)`, tags: ['ruinas', 'arena', 'soquete'] });
  }
  for (let i = 0; i < 6; i++) {
    const a = ARENA.entranceAngle + PI / 6 + (i * PI) / 3;
    const [vx, vz] = polar(ARENA, ARENA.ventRadius, a);
    add(`arena_respiradouro_${i + 1}`, 'boss', vx, vz, { y: ARENA.floorY, label: `Respiradouro ${i + 1} (fase 3)`, tags: ['ruinas', 'arena', 'respiradouro'] });
  }
}
addS(RUINS, 'ruinas_entrada', 'poi', -46, 58, { yaw: yawTowards(RUINS.x - 46, RUINS.z + 58, RUINS.x, RUINS.z), label: 'Entrada das ruínas (fim da estrada)', tags: ['ruinas'] });
addS(RUINS, 'ruinas_praca', 'poi', 0, 0, { label: 'Praça das colunas', tags: ['ruinas'] });
addS(RUINS, 'bau_ruinas_1', 'chest', -38, -26, { yaw: 0.5, label: 'Baú sob a coluna caída', tags: ['ruinas', 'bau'] });
addS(RUINS, 'bau_ruinas_2', 'chest', 42, 30, { yaw: -2.2, label: 'Baú no salão desabado', tags: ['ruinas', 'bau'] });
addS(RUINS, 'bau_ruinas_3', 'chest', -8, -62, { y: RUINS.y + 6.4, yaw: 0, label: 'Baú no alto do muro (escalada)', tags: ['ruinas', 'bau', 'escalada'] });
addS(RUINS, 'ruinas_terminal', 'quest', 18, -14, { yaw: -2.4, label: 'Pilar tecnológico ativo', tags: ['ruinas', 'missao', 'terminal'] });
addS(RUINS, 'ruinas_muro_escalavel', 'poi', -8, -58, { label: 'Muro escalável', tags: ['ruinas', 'escalada'] });
for (let i = 0; i < 5; i++) {
  const a = (i / 5) * PI * 2 + 0.4;
  addS(RUINS, `ruinas_spawn_${i + 1}`, 'enemy_spawn', Math.cos(a) * 52, Math.sin(a) * 52, { tags: ['ruinas', 'inimigo', 'constructo'] });
}

// --- Acampamento dos Corvos ---
{
  const ga = CAMP.gateAngle;
  addS(CAMP, 'corvos_fogueira', 'enemy_spawn', 0, 0, { label: 'Fogueira dos Corvos', tags: ['corvos', 'inimigo', 'fogueira'] });
  const [gx, gz] = polar({ x: 0, z: 0 }, CAMP.palisadeRadius + 2.5, ga);
  addS(CAMP, 'portao_corvos', 'gate', gx, gz, { yaw: Math.atan2(-gx, -gz), label: 'Entrada do acampamento', tags: ['corvos', 'portao'] });
  const [wx, wz] = polar({ x: 0, z: 0 }, CAMP.palisadeRadius - 5, ga + 0.42);
  addS(CAMP, 'corvos_torre_vigia', 'enemy_spawn', wx, wz, { y: CAMP.y + 6.2, label: 'Topo da torre de vigia (arqueiro)', tags: ['corvos', 'inimigo', 'arqueiro', 'vigia'] });
  const [lx, lz] = polar({ x: 0, z: 0 }, 15, ga + PI);
  addS(CAMP, 'corvos_lider', 'enemy_spawn', lx, lz, { yaw: ga, label: 'Tenda do líder', tags: ['corvos', 'inimigo', 'lider'] });
  const [cx, cz] = polar({ x: 0, z: 0 }, 14, ga + PI * 0.55);
  addS(CAMP, 'corvos_jaula', 'quest', cx, cz, { label: 'Jaula (prisioneiro)', tags: ['corvos', 'missao', 'prisioneiro', 'jaula'] });
  const [bx, bz] = polar({ x: 0, z: 0 }, 13, ga - PI * 0.6);
  addS(CAMP, 'bau_corvos', 'chest', bx, bz, { label: 'Cristais roubados', tags: ['corvos', 'bau', 'cristais'] });
  for (let i = 0; i < 6; i++) {
    const a = ga + PI / 3 + (i / 6) * PI * 1.4;
    const [tx, tz] = polar({ x: 0, z: 0 }, 9 + (i % 2) * 3, a);
    addS(CAMP, `corvos_spawn_${i + 1}`, 'enemy_spawn', tx, tz, { tags: ['corvos', 'inimigo', 'bandido'] });
  }
}

// --- Torre do Observador ---
{
  const [dx, dz] = rotYaw(TOWER.doorYaw, 0, TOWER.radius + 1.6);
  add('porta_torre', 'gate', TOWER.x + dx, TOWER.z + dz, { yaw: TOWER.doorYaw + PI, label: 'Porta da Torre do Observador (trancada)', tags: ['torre', 'porta', 'missao'] });
  addS(TOWER, 'torre_biblioteca', 'quest', 2.2, -2.2, { yaw: 0.8, label: 'Estantes proibidas (térreo)', tags: ['torre', 'leitura', 'interior', 'missao'] });
  addS(TOWER, 'torre_sacada', 'poi', TOWER.balconyRadius - 1.5, 0, { y: TOWER.floorY + TOWER.balconyHeight + 0.05, yaw: PI / 2, label: 'Sacada do Observador', tags: ['torre', 'sacada', 'voo'] });
  addS(TOWER, 'torre_telescopio', 'quest', -(TOWER.balconyRadius - 1.6), 0, { y: TOWER.floorY + TOWER.balconyHeight + 0.05, yaw: -PI / 2, label: 'Telescópio rúnico', tags: ['torre', 'sacada', 'missao'] });
  addS(TOWER, 'torre_bau_sacada', 'chest', 0, -(TOWER.balconyRadius - 1.4), { y: TOWER.floorY + TOWER.balconyHeight + 0.05, yaw: 0, label: 'Baú da sacada', tags: ['torre', 'bau', 'voo'] });
}

// --- Ferroluz ---
{
  const h = FERROLUZ.half;
  addS(FERROLUZ, 'portao_ferroluz', 'gate', -h - 3, 0, { yaw: PI / 2, label: 'Portão de Ferroluz', tags: ['ferroluz', 'portao', 'guarda'] });
  addS(FERROLUZ, 'ferroluz_guarda_portao_1', 'npc_work', -h - 4, -6, { yaw: -PI / 2, label: 'Sentinela do portão', tags: ['ferroluz', 'guarda', 'trabalho'] });
  addS(FERROLUZ, 'ferroluz_guarda_portao_2', 'npc_work', -h - 4, 6, { yaw: -PI / 2, label: 'Sentinela do portão', tags: ['ferroluz', 'guarda', 'trabalho'] });
  addS(FERROLUZ, 'ferroluz_patio', 'npc_work', -10, 0, { label: 'Pátio de Ferroluz', tags: ['ferroluz', 'trabalho', 'interior'] });
  addS(FERROLUZ, 'ferroluz_barao', 'npc_work', 14, 0, { yaw: -PI / 2, label: 'Porta da torre de comando (Barão)', tags: ['ferroluz', 'barao', 'trabalho'] });
  addS(FERROLUZ, 'ferroluz_oficina', 'npc_work', -14, -26, { yaw: 0, label: 'Oficina arcana', tags: ['ferroluz', 'trabalho', 'engenheiro'] });
}

// --- Ilhas Suspensas de Elyra + Farol Celeste ---
for (const isl of FLOATING_ISLANDS) {
  add(`${isl.id}_topo`, 'island', isl.x, isl.z, { y: isl.y, label: isl.id === 'farol_celeste' ? 'Farol Celeste' : 'Ilha suspensa', tags: ['elyra', 'ilha', 'voo'] });
  if (isl.secret) {
    const off = isl.id === 'farol_celeste' ? 4.2 : isl.radius * 0.35;
    add(isl.secret, isl.secret.startsWith('bau') ? 'chest' : 'item', isl.x + off, isl.z, { y: isl.y + (isl.id === 'farol_celeste' ? 0.0 : 0.35), yaw: -PI / 2, label: isl.secret, tags: ['elyra', 'ilha', 'voo', 'segredo'] });
  }
}

// --- Laboratório, santuário de cristal, desfiladeiro ---
addS(LAB, 'laboratorio_terminal', 'quest', ...rotYaw(LAB.yaw, -4, -3), { yaw: LAB.yaw, label: 'Terminal do laboratório', tags: ['laboratorio', 'missao', 'interior'] });
addS(LAB, 'laboratorio_bau', 'chest', ...rotYaw(LAB.yaw, 7.5, -4.5), { yaw: LAB.yaw + PI, label: 'Armário do laboratório', tags: ['laboratorio', 'bau', 'interior'] });
addS(LAB, 'laboratorio_entrada', 'poi', ...rotYaw(LAB.yaw, 0, 10.5), { yaw: LAB.yaw + PI, label: 'Entrada do laboratório', tags: ['laboratorio'] });
addS(CRYSTAL_SHRINE, 'santuario_cristal_altar', 'quest', 0, 0, { y: CRYSTAL_SHRINE.y + 0.45, label: 'Altar do Santuário de Cristal', tags: ['santuario_cristal', 'missao', 'checkpoint'] });
addS(CRYSTAL_SHRINE, 'poleiro_fenix', 'creature', 17, -6, { y: CRYSTAL_SHRINE.y + 15.2, label: 'Poleiro da Fênix', tags: ['santuario_cristal', 'criatura', 'fenix'] });
addS(CANYON, 'desfiladeiro_arco', 'poi', 0, 10, { label: 'Arco de pedra do desfiladeiro', tags: ['desfiladeiro'] });

// --- Habitats de criaturas e áreas de inimigos ---
add('campina_cervos', 'creature', -250, 120, { label: 'Campina dos cervos', tags: ['criatura', 'cervo', 'campina'] });
add('clareira_cervo_luminoso', 'creature', -36, 150, { label: 'Clareira do Cervo Luminoso', tags: ['criatura', 'cervo_luminoso', 'floresta', 'lumen'] });
add('ninho_grifo', 'creature', GRIFFIN_NEST.x, GRIFFIN_NEST.z, { label: 'Ninho do Grifo', tags: ['criatura', 'grifo', 'montanha'] });
add('toca_lobos', 'enemy_spawn', 120, 40, { label: 'Toca dos lobos sombrios', tags: ['inimigo', 'lobo', 'floresta'] });
add('lago_margem', 'creature', -96, -170, { label: 'Margem do Lago Espelhado', tags: ['criatura', 'lago', 'pesca'] });
add('pantano_ninho', 'enemy_spawn', -660, -500, { label: 'Coração do pântano', tags: ['inimigo', 'pantano', 'corrompido'] });
add('pantano_borda', 'enemy_spawn', -540, -380, { label: 'Borda do pântano', tags: ['inimigo', 'pantano'] });
add('desfiladeiro_emboscada', 'enemy_spawn', 262, -30, { label: 'Emboscada no desfiladeiro', tags: ['inimigo', 'bandido', 'desfiladeiro'] });

export const PLACES: Record<string, Place> = Object.fromEntries(P.map((p) => [p.id, p]));
export const PLACE_LIST: readonly Place[] = P;

/** Âncora pelo id (lança erro se não existir — pega erros de digitação cedo). */
export function place(id: string): Place {
  const p = PLACES[id];
  if (!p) throw new Error(`[places] âncora desconhecida: ${id}`);
  return p;
}

export function placesWithTag(tag: string): Place[] {
  return P.filter((p) => p.tags.includes(tag));
}

export function placesOfKind(kind: PlaceKind): Place[] {
  return P.filter((p) => p.kind === kind);
}

// ---------------------------------------------------------------------------
// Rotas de patrulha (inimigos e guardas). Pontos no chão (use groundHeight).
// ---------------------------------------------------------------------------

export interface PatrolRoute {
  id: string;
  /** true: volta ao primeiro ponto; false: vai e volta. */
  loop: boolean;
  points: [number, number][];
  tags: string[];
}

function ring(c: { x: number; z: number }, r: number, n: number, a0 = 0): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * PI * 2;
    out.push([round(c.x + Math.cos(a) * r), round(c.z + Math.sin(a) * r)]);
  }
  return out;
}

export const PATROL_ROUTES: Record<string, PatrolRoute> = {
  guardas_muralha_brumafria: { id: 'guardas_muralha_brumafria', loop: true, points: ring(VILLAGE, VILLAGE.wallRadius - 7, 12, 0.13), tags: ['vila', 'guarda'] },
  guardas_ruas_brumafria: {
    id: 'guardas_ruas_brumafria',
    loop: true,
    points: [
      [VILLAGE.x + 60, VILLAGE.z],
      [VILLAGE.x + 16, VILLAGE.z + 2],
      [VILLAGE.x, VILLAGE.z + 18],
      [VILLAGE.x, VILLAGE.z + 60],
      [VILLAGE.x - 2, VILLAGE.z + 18],
      [VILLAGE.x - 50, VILLAGE.z + 2],
      [VILLAGE.x - 16, VILLAGE.z - 2],
      [VILLAGE.x, VILLAGE.z - 48],
      [VILLAGE.x + 2, VILLAGE.z - 16],
    ],
    tags: ['vila', 'guarda'],
  },
  corvos_acampamento: { id: 'corvos_acampamento', loop: true, points: ring(CAMP, CAMP.palisadeRadius - 5, 8, CAMP.gateAngle), tags: ['corvos', 'inimigo'] },
  corvos_estrada: {
    id: 'corvos_estrada',
    loop: false,
    points: [
      [268, 470],
      [300, 492],
      [350, 525],
      [236, 446],
    ],
    tags: ['corvos', 'inimigo', 'estrada'],
  },
  ruinas_avenida: { id: 'ruinas_avenida', loop: false, points: [[RUINS.x - 44, RUINS.z + 54], [RUINS.x - 10, RUINS.z + 12], [RUINS.x + 22, RUINS.z - 24], [RUINS.x + 40, RUINS.z - 40]], tags: ['ruinas', 'inimigo', 'constructo'] },
  ruinas_circuito: { id: 'ruinas_circuito', loop: true, points: ring(RUINS, 60, 10, 0.2), tags: ['ruinas', 'inimigo', 'constructo'] },
  lobos_floresta: { id: 'lobos_floresta', loop: true, points: ring({ x: 120, z: 40 }, 35, 7, 0), tags: ['lobo', 'floresta', 'inimigo'] },
  pantano_circuito: { id: 'pantano_circuito', loop: true, points: ring({ x: -640, z: -470 }, 110, 10, 0.3), tags: ['pantano', 'inimigo', 'corrompido'] },
  ferroluz_muralha: { id: 'ferroluz_muralha', loop: true, points: ring(FERROLUZ, FERROLUZ.half + 10, 12, PI / 12), tags: ['ferroluz', 'guarda'] },
};
