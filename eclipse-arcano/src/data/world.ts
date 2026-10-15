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
    x: 230,
    z: 470,
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
      [80, 245],
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
      [80, 245],
      [190, 420],
      [400, 560],
      [560, 690],
      [640, 735],
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

/** Ponto de início de um novo jogo (saída da cripta). */
export const PLAYER_START = { x: -520, z: 548, yaw: Math.PI }; // olhando para o norte (vila)

/** Área da arena do chefe (usada para travar a luta, câmera de combate e música). */
export const BOSS_ARENAS: Record<string, { x: number; z: number; radius: number; locationId: string }> = {
  guardiao_mecanico: { x: 500, z: -380, radius: 36, locationId: 'camara_guardiao' },
};
