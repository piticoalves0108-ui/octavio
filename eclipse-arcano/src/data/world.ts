/**
 * Layout do mundo — fonte única de verdade para posições de regiões, cidades,
 * pontos de interesse, rios e estradas. Coordenadas em metros.
 * Convenção do mapa: -Z = norte (topo do mapa), +X = leste.
 *
 * Região jogável da fatia vertical: "Vale de Brumafria" (2048 m x 2048 m).
 * Vila de Brumafria e Posto Avançado de Ferroluz ficam a ~1,2 km de distância
 * (≈3,5 min a pé / ≈1 min voando), para a viagem ser uma jornada.
 */

export const WORLD_SIZE = 2048;
export const WORLD_HALF = WORLD_SIZE / 2;
/** Limite jogável (além disso há montanhas intransponíveis + barreira). */
export const PLAYABLE_HALF = 960;
/** Altitude máxima de voo acima do nível 0. */
export const MAX_FLIGHT_ALTITUDE = 420;
/** Nível da água (lagos, rios, pântano). */
export const WATER_LEVEL = 4;
/** Resolução da grade de altura (amostras por lado). Espaçamento = WORLD_SIZE/(N-1) = 2 m. */
export const HEIGHTFIELD_RES = 1025;

export type BiomeId = 'meadow' | 'forest' | 'swamp' | 'ruins' | 'mountain' | 'shore' | 'village' | 'rocky' | 'corrupted';

export const BIOME_INFO: Record<BiomeId, { name: string; grass: number; trees: number; color: [number, number, number]; surface: 'grass' | 'dirt' | 'stone' | 'mud' | 'sand' }> = {
  meadow: { name: 'Campos', grass: 1.0, trees: 0.08, color: [0.36, 0.55, 0.22], surface: 'grass' },
  forest: { name: 'Floresta', grass: 0.7, trees: 1.0, color: [0.2, 0.4, 0.18], surface: 'grass' },
  swamp: { name: 'Pântano', grass: 0.5, trees: 0.35, color: [0.25, 0.3, 0.18], surface: 'mud' },
  ruins: { name: 'Ruínas', grass: 0.35, trees: 0.05, color: [0.45, 0.45, 0.35], surface: 'stone' },
  mountain: { name: 'Montanhas', grass: 0.1, trees: 0.04, color: [0.42, 0.42, 0.4], surface: 'stone' },
  shore: { name: 'Margem', grass: 0.3, trees: 0.02, color: [0.62, 0.58, 0.42], surface: 'sand' },
  village: { name: 'Vila', grass: 0.4, trees: 0.03, color: [0.42, 0.52, 0.25], surface: 'dirt' },
  rocky: { name: 'Desfiladeiro', grass: 0.15, trees: 0.02, color: [0.55, 0.4, 0.3], surface: 'stone' },
  corrupted: { name: 'Terra Corrompida', grass: 0.25, trees: 0.15, color: [0.3, 0.2, 0.32], surface: 'dirt' },
};

export type LocationKind = 'settlement' | 'dungeon' | 'ruins' | 'landmark' | 'camp' | 'tower' | 'region' | 'secret' | 'arena';

export interface LocationDef {
  id: string;
  name: string;
  kind: LocationKind;
  x: number;
  z: number;
  /** Raio de influência (m). */
  radius: number;
  /** Se definido, o terreno é aplainado para esta altura dentro do raio. */
  flattenTo?: number;
  /** Raio para "descobrir" o local (marca no mapa + XP). */
  discoverRadius: number;
  biome?: BiomeId;
  description: string;
  /** Visível no mapa antes de descoberto. */
  knownAtStart?: boolean;
}

export const LOCATIONS: LocationDef[] = [
  {
    id: 'cripta_despertar',
    name: 'Cripta do Despertar',
    kind: 'dungeon',
    x: -520,
    z: 560,
    radius: 30,
    flattenTo: 22,
    discoverRadius: 40,
    description: 'Onde o mago dormiu por milênios, selado sob runas que ninguém mais sabe ler.',
    knownAtStart: true,
  },
  {
    id: 'vila_brumafria',
    name: 'Vila de Brumafria',
    kind: 'settlement',
    x: -430,
    z: 320,
    radius: 95,
    flattenTo: 18,
    discoverRadius: 110,
    biome: 'village',
    description: 'Vila murada de agricultores e ferreiros, à sombra de antigas torres de cristal apagadas.',
    knownAtStart: true,
  },
  {
    id: 'floresta_lumen',
    name: 'Floresta de Lúmen',
    kind: 'region',
    x: -20,
    z: 170,
    radius: 300,
    discoverRadius: 200,
    biome: 'forest',
    description: 'Árvores antigas, flores que brilham à noite e espíritos que observam em silêncio.',
  },
  {
    id: 'acampamento_corvos',
    name: 'Acampamento dos Corvos',
    kind: 'camp',
    x: 232,
    z: 530,
    radius: 45,
    flattenTo: 16,
    discoverRadius: 60,
    description: 'Esconderijo de saqueadores que andam roubando cristais das ruínas.',
  },
  {
    id: 'lago_espelhado',
    name: 'Lago Espelhado',
    kind: 'landmark',
    x: -180,
    z: -220,
    radius: 150,
    discoverRadius: 170,
    biome: 'shore',
    description: 'Dizem que, em noites sem lua, o lago reflete o céu de outra era.',
  },
  {
    id: 'ruinas_aeternum',
    name: 'Ruínas de Aeternum',
    kind: 'ruins',
    x: 430,
    z: -300,
    radius: 130,
    flattenTo: 26,
    discoverRadius: 140,
    biome: 'ruins',
    description: 'Restos de uma cidade do Império Arcano, onde pedra e circuitos se fundem.',
  },
  {
    id: 'camara_guardiao',
    name: 'Câmara do Guardião',
    kind: 'arena',
    x: 500,
    z: -380,
    radius: 40,
    flattenTo: 26,
    discoverRadius: 45,
    biome: 'ruins',
    description: 'Um anfiteatro de metal rúnico. Algo enorme dorme no centro.',
  },
  {
    id: 'torre_observador',
    name: 'Torre do Observador',
    kind: 'tower',
    x: 640,
    z: 220,
    radius: 26,
    flattenTo: 34,
    discoverRadius: 50,
    description: 'Torre de mago com uma biblioteca proibida. A porta só abre para quem fala a língua antiga.',
  },
  {
    id: 'ilhas_elyra',
    name: 'Ilhas Suspensas de Elyra',
    kind: 'secret',
    x: -60,
    z: -640,
    radius: 120,
    discoverRadius: 90,
    description: 'Fragmentos de terra flutuando sobre o vale. Só se chega voando.',
  },
  {
    id: 'pantano_sombrio',
    name: 'Pântano Sombrio',
    kind: 'region',
    x: -640,
    z: -470,
    radius: 230,
    discoverRadius: 180,
    biome: 'swamp',
    description: 'Névoa permanente e água negra. A corrupção começou aqui.',
  },
  {
    id: 'posto_ferroluz',
    name: 'Posto Avançado de Ferroluz',
    kind: 'settlement',
    x: 700,
    z: 760,
    radius: 80,
    flattenTo: 30,
    discoverRadius: 100,
    biome: 'village',
    description: 'Fortaleza de engenheiros-cavaleiros que estudam a tecnologia arcana. Portões fechados por ordem do Barão.',
  },
  {
    id: 'desfiladeiro_cinzas',
    name: 'Desfiladeiro das Cinzas',
    kind: 'landmark',
    x: 250,
    z: 0,
    radius: 90,
    discoverRadius: 80,
    biome: 'rocky',
    description: 'Paredes de rocha avermelhada marcadas por uma explosão de energia antiga.',
  },
  {
    id: 'laboratorio_abandonado',
    name: 'Laboratório Abandonado',
    kind: 'ruins',
    x: 780,
    z: -640,
    radius: 36,
    flattenTo: 40,
    discoverRadius: 50,
    biome: 'ruins',
    description: 'Máquinas silenciosas e tubos de cristal partidos. Alguém esteve aqui recentemente.',
  },
  {
    id: 'santuario_cristal',
    name: 'Santuário de Cristal',
    kind: 'landmark',
    x: -820,
    z: 60,
    radius: 30,
    flattenTo: 48,
    discoverRadius: 45,
    description: 'Um círculo de cristais que ainda pulsa com energia pura.',
  },
];

export const LOCATION_BY_ID: Record<string, LocationDef> = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

/** Rio principal (polilinha). Desce das montanhas do norte, passa pelo Lago Espelhado e segue ao sul. */
export const RIVERS: { id: string; width: number; points: [number, number][] }[] = [
  {
    id: 'rio_prata',
    width: 16,
    points: [
      [-300, -1000],
      [-250, -640],
      [-205, -360],
      [-180, -220],
      [-110, -80],
      [40, 70],
      [92, 260],
      [118, 520],
      [70, 1000],
    ],
  },
];

/** Estradas (polilinhas). Usadas para colorir o terreno, suavizar relevo e guiar NPCs. */
export const ROADS: { id: string; width: number; points: [number, number][] }[] = [
  {
    id: 'estrada_cripta',
    width: 5,
    points: [
      [-520, 535],
      [-480, 470],
      [-430, 412],
    ],
  },
  {
    id: 'estrada_leste',
    width: 6,
    points: [
      [-338, 320],
      [-200, 290],
      [-40, 250],
      [125, 236],
      [180, 140],
      [250, 10],
      [330, -160],
      [380, -235],
    ],
  },
  {
    id: 'estrada_sul',
    width: 6,
    points: [
      [125, 236],
      [190, 420],
      [400, 560],
      [560, 690],
      [622, 748],
      [646, 760],
    ],
  },
  {
    id: 'trilha_torre',
    width: 4,
    points: [
      [180, 140],
      [400, 190],
      [620, 215],
    ],
  },
];

/** Ilhas flutuantes (exploração aérea). y = altura do topo da ilha. */
export const FLOATING_ISLANDS: { id: string; x: number; y: number; z: number; radius: number; secret?: string }[] = [
  { id: 'elyra_1', x: -60, y: 150, z: -640, radius: 26, secret: 'reliquia_elyra' },
  { id: 'elyra_2', x: 10, y: 175, z: -700, radius: 14 },
  { id: 'elyra_3', x: -130, y: 132, z: -590, radius: 16 },
  { id: 'elyra_4', x: -20, y: 205, z: -770, radius: 18, secret: 'bau_tempestade' },
  { id: 'elyra_5', x: 80, y: 160, z: -610, radius: 10 },
  { id: 'farol_celeste', x: 520, y: 190, z: -520, radius: 12, secret: 'fragmento_memoria_2' },
];

/**
 * Ponto de início de um novo jogo: pátio a céu aberto da Cripta do Despertar,
 * logo diante da porta do mausoléu, olhando para o norte (saída do pátio → estrada → vila).
 */
export const PLAYER_START = { x: -520, z: 553, yaw: Math.PI };

/** Área da arena do chefe (usada para travar a luta, câmera de combate e música). */
export const BOSS_ARENAS: Record<string, { x: number; z: number; radius: number; locationId: string }> = {
  guardiao_mecanico: { x: 500, z: -380, radius: 36, locationId: 'camara_guardiao' },
};

// ---------------------------------------------------------------------------
// Ajustes do sistema de mundo (terreno, vegetação, água, portões).
// ---------------------------------------------------------------------------

/** Terreno em chunks com LOD (quadtree de 3 tamanhos: 512 → 256 → 128 m). */
export const TERRAIN = {
  /** Tamanho do chunk base (m). */
  chunkSize: 128,
  /**
   * Distâncias (m, antes de multiplicar por q.lodBias) a partir das quais cada nível
   * é usado: < [0] → L0 (2 m/vértice); < [1] → L1 (4 m); < [2] → L2 (nós de 256 m, 8 m);
   * além disso → L3 (nós de 512 m, 16 m).
   */
  lodDistances: [150, 340, 680] as const,
  /** Profundidade das saias (m) por nível — escondem rachaduras entre LODs. */
  skirtDepth: [2.5, 5, 10, 22] as const,
  /** Orçamento de construção de nós por quadro. */
  maxBuildsPerFrame: 2,
  buildBudgetMs: 4,
  /** Intervalo (s) entre recálculos da seleção de LOD. */
  selectInterval: 0.2,
  /** Nós fora de uso por mais que isso (s) são descartados (exceto as raízes). */
  evictAfter: 20,
  /** Anel de montanhas além da borda do mundo (horizonte). */
  horizonExtent: 2600,
  horizonCell: 64,
};

/** Vegetação e objetos espalhados. Densidades multiplicam BIOME_INFO e o preset de qualidade. */
export const VEGETATION = {
  /** Tufos de grama por m² (× q.grassDensity × densidade do bioma). */
  grassClumpsPerM2: 1.1,
  bladesPerClump: 7,
  bladeHeight: [0.38, 0.8] as const,
  /** Flores mágicas por m² nos campos/floresta (× q.grassDensity). */
  flowersPerM2: 0.035,
  /** Espaçamento base (m) das grades de dispersão por chunk. */
  treeSpacing: 8.5,
  bushSpacing: 6,
  rockSpacing: 13,
  /** Até esta distância (m × lodBias) as árvores usam a malha completa. */
  treeFullDistance: 95,
  /** Até esta distância (m) as árvores projetam sombra (limitada por q.shadowDistance). */
  treeShadowDistance: 70,
  /** Raio (m) de dispersão em volta da câmera (limitado por q.viewDistance). */
  scatterRadius: 720,
  /** Raio (m) em que troncos/pedras grandes ganham colisores. */
  physicsRadius: 200,
  /** Chunks de dispersão gerados por quadro. */
  scatterPerFrame: 2,
  /** Distância (m) máxima das plantações/objetos de detalhe das estruturas. */
  detailDistance: 140,
  /** Partículas ambientes em volta do jogador (escala com q.maxParticles). */
  ambientParticles: 700,
};

/** Água (lago, rio, pântano). */
export const WATER = {
  /** Resolução (m) da grade que decide onde há malha de água. */
  cell: 8,
  /** Blocos (m) em que a malha de água é dividida (culling). */
  block: 256,
};

export interface GateDef {
  id: string;
  name: string;
  /** Estado inicial num novo jogo. */
  defaultOpen: boolean;
}

/**
 * Portões e portas controlados por World.setGateOpen(id, aberto).
 * Fechado = colisor ativo; aberto = colisor desligado.
 */
export const GATES: GateDef[] = [
  { id: 'portao_brumafria_leste', name: 'Portão Leste de Brumafria', defaultOpen: true },
  { id: 'portao_brumafria_sul', name: 'Portão Sul de Brumafria', defaultOpen: true },
  { id: 'porta_cripta', name: 'Porta da Cripta do Despertar', defaultOpen: true },
  { id: 'portao_ruinas', name: 'Portão Selado de Aeternum', defaultOpen: false },
  { id: 'arena_guardiao', name: 'Entrada da Câmara do Guardião', defaultOpen: true },
  { id: 'porta_torre', name: 'Porta da Torre do Observador', defaultOpen: false },
  { id: 'portao_ferroluz', name: 'Portão de Ferroluz', defaultOpen: false },
  { id: 'portao_corvos', name: 'Portão do Acampamento dos Corvos', defaultOpen: true },
];
