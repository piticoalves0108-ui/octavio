/**
 * Zonas de população ambiente (inimigos e criaturas). O spawner (src/ai/Spawner.ts):
 * - ativa uma zona quando o jogador chega a `activateRange` do centro e a desativa (removendo
 *   quem não está em combate) além de `activateRange + 80`;
 * - nunca cria inimigos à vista do jogador (fora do cone da câmera ou sem linha de visão, ou longe);
 * - respeita `ctx.settings.q.maxActiveEnemies`;
 * - não recria `uniqueId` derrotados (ai.defeatedUniques);
 * - renasce mortos após `respawnHours` horas de jogo.
 * Inimigos de missão são criados pela narrativa (ai.spawnEnemy) e não estão aqui (contrato C5).
 *
 * Únicos ambientes (a narrativa NÃO precisa criá-los): 'alfa_lobos_toca' (Alfa da toca, contrato
 * q_lobos), 'automato_errante_lab' (contrato q_automato / Laboratório), 'cavaleiro_torre'.
 */

export type SpawnTime = 'any' | 'day' | 'night' | 'dawn';

export interface SpawnEntry {
  typeId: string;
  count: number;
  /** Âncoras (ids de src/data/places.ts) usadas em ordem; sem âncoras: ponto aleatório no raio. */
  anchors?: string[];
  /** Rota de patrulha (PATROL_ROUTES). */
  patrol?: string;
  /** Inimigo único (não renasce depois de derrotado). */
  uniqueId?: string;
  /** Fica no posto (ex.: arqueira no alto da torre de vigia): não persegue, só atira. */
  perched?: boolean;
  /** Guarda o posto: volta à âncora em vez de vagar. */
  guard?: boolean;
  time?: SpawnTime;
  /** Chance (0..1) de o grupo existir a cada ativação da zona. */
  chance?: number;
}

export interface SpawnZone {
  id: string;
  /** Nome da região (debug/diário). */
  name: string;
  /** Centro: âncora de places.ts ou coordenadas. */
  place?: string;
  x?: number;
  z?: number;
  radius: number;
  entries: SpawnEntry[];
  /** Horas de jogo até um morto renascer. */
  respawnHours: number;
  /** Distância (m) do jogador ao centro para ativar a zona. */
  activateRange: number;
}

// ---------------------------------------------------------------------------
// Inimigos
// ---------------------------------------------------------------------------
export const ENEMY_ZONES: SpawnZone[] = [
  {
    id: 'acampamento_corvos',
    name: 'Acampamento dos Corvos',
    place: 'corvos_fogueira',
    radius: 26,
    respawnHours: 24,
    activateRange: 170,
    entries: [
      { typeId: 'corvo_saqueador', count: 3, anchors: ['corvos_spawn_1', 'corvos_spawn_3', 'corvos_spawn_5'], guard: true },
      { typeId: 'corvo_saqueador', count: 1, anchors: ['corvos_spawn_2'], patrol: 'corvos_acampamento' },
      { typeId: 'corva_arqueira', count: 1, anchors: ['corvos_torre_vigia'], perched: true },
      { typeId: 'corva_arqueira', count: 1, anchors: ['corvos_spawn_6'], guard: true },
    ],
  },
  {
    id: 'estrada_corvos',
    name: 'Estrada do acampamento (patrulha)',
    x: 290,
    z: 490,
    radius: 40,
    respawnHours: 10,
    activateRange: 150,
    entries: [
      { typeId: 'corvo_saqueador', count: 2, patrol: 'corvos_estrada', chance: 0.6 },
      { typeId: 'cacador_furtivo', count: 1, patrol: 'corvos_estrada', chance: 0.4 },
    ],
  },
  {
    id: 'desfiladeiro',
    name: 'Emboscada no Desfiladeiro das Cinzas',
    place: 'desfiladeiro_emboscada',
    radius: 22,
    respawnHours: 30,
    activateRange: 150,
    entries: [
      { typeId: 'corvo_saqueador', count: 2, guard: true },
      { typeId: 'corva_arqueira', count: 1, guard: true },
    ],
  },
  {
    id: 'toca_lobos',
    name: 'Toca dos Lobos Sombrios',
    place: 'toca_lobos',
    radius: 22,
    respawnHours: 24,
    activateRange: 160,
    entries: [
      { typeId: 'alfa_lobo', count: 1, uniqueId: 'alfa_lobos_toca', guard: true },
      { typeId: 'lobo_sombrio', count: 2, guard: true },
      { typeId: 'lobo_sombrio', count: 2, patrol: 'lobos_floresta' },
    ],
  },
  {
    id: 'floresta_noite',
    name: 'Floresta de Lúmen (matilha noturna)',
    x: 60,
    z: 150,
    radius: 40,
    respawnHours: 12,
    activateRange: 140,
    entries: [{ typeId: 'lobo_sombrio', count: 2, time: 'night' }],
  },
  {
    id: 'floresta_cacadores',
    name: 'Floresta de Lúmen (caçadores furtivos)',
    x: -150,
    z: 90,
    radius: 26,
    respawnHours: 20,
    activateRange: 130,
    entries: [{ typeId: 'cacador_furtivo', count: 2, time: 'day', chance: 0.55 }],
  },
  {
    id: 'ruinas_aeternum',
    name: 'Ruínas de Aeternum',
    place: 'ruinas_praca',
    radius: 60,
    respawnHours: 24,
    activateRange: 190,
    entries: [
      { typeId: 'automato_sentinela', count: 2, anchors: ['ruinas_spawn_1', 'ruinas_spawn_3'], guard: true },
      { typeId: 'automato_sentinela', count: 1, anchors: ['ruinas_spawn_2'], patrol: 'ruinas_circuito' },
      { typeId: 'golem_ruinas', count: 1, anchors: ['ruinas_spawn_4'], guard: true },
      { typeId: 'corvo_cristal', count: 3, anchors: ['ruinas_spawn_5', 'ruinas_praca', 'ruinas_spawn_5'] },
    ],
  },
  {
    id: 'laboratorio',
    name: 'Laboratório Abandonado',
    place: 'laboratorio_entrada',
    radius: 18,
    respawnHours: 36,
    activateRange: 150,
    entries: [
      { typeId: 'automato_errante', count: 1, uniqueId: 'automato_errante_lab', guard: true },
      { typeId: 'automato_sentinela', count: 1, guard: true },
    ],
  },
  {
    id: 'torre_observador',
    name: 'Torre do Observador',
    place: 'porta_torre',
    radius: 10,
    respawnHours: 48,
    activateRange: 140,
    entries: [{ typeId: 'cavaleiro_encantado', count: 1, uniqueId: 'cavaleiro_torre', guard: true }],
  },
  {
    id: 'pantano_borda',
    name: 'Borda do Pântano Sombrio',
    place: 'pantano_borda',
    radius: 34,
    respawnHours: 18,
    activateRange: 160,
    entries: [
      { typeId: 'mago_corrompido', count: 1, guard: true },
      { typeId: 'espreitador', count: 1 },
      { typeId: 'espreitador', count: 1, time: 'night' },
    ],
  },
  {
    id: 'pantano_ninho',
    name: 'Coração do Pântano',
    place: 'pantano_ninho',
    radius: 40,
    respawnHours: 18,
    activateRange: 170,
    entries: [
      { typeId: 'mago_corrompido', count: 2, guard: true },
      { typeId: 'espreitador', count: 1, patrol: 'pantano_circuito' },
      { typeId: 'espreitador', count: 1 },
    ],
  },
];

// ---------------------------------------------------------------------------
// Criaturas
// ---------------------------------------------------------------------------
export interface CreatureEntry {
  typeId: string;
  count: number;
  time?: SpawnTime;
  chance?: number;
  /** Bandos de pássaros (instanciados): número de bandos. */
  flocks?: number;
}

export interface CreatureZone {
  id: string;
  name: string;
  place?: string;
  x?: number;
  z?: number;
  /** Altura fixa (poleiros, ninhos). */
  y?: number;
  radius: number;
  entries: CreatureEntry[];
  respawnHours: number;
  activateRange: number;
  /** Confinado ao raio (cercados). */
  confined?: boolean;
}

export const CREATURE_ZONES: CreatureZone[] = [
  { id: 'campina_cervos', name: 'Campina dos cervos', place: 'campina_cervos', radius: 34, respawnHours: 12, activateRange: 180, entries: [{ typeId: 'cervo', count: 4 }, { typeId: 'coelho', count: 3 }, { typeId: 'passaro', count: 0, flocks: 1 }] },
  { id: 'clareira_lumen', name: 'Clareira do Cervo Luminoso', place: 'clareira_cervo_luminoso', radius: 12, respawnHours: 1, activateRange: 150, entries: [{ typeId: 'cervo_luminoso', count: 1, time: 'night' }] },
  { id: 'floresta_espiritos', name: 'Floresta de Lúmen (espíritos)', x: 10, z: 190, radius: 60, respawnHours: 2, activateRange: 160, entries: [{ typeId: 'espirito_floresta', count: 5, time: 'night' }, { typeId: 'coelho', count: 3, time: 'day' }] },
  { id: 'floresta_passaros', name: 'Floresta de Lúmen (bandos)', x: -120, z: 240, radius: 40, respawnHours: 2, activateRange: 160, entries: [{ typeId: 'passaro', count: 0, flocks: 1, time: 'day' }] },
  { id: 'campos_vila', name: 'Plantações de Brumafria', place: 'plantacao_trigo', radius: 20, respawnHours: 2, activateRange: 150, entries: [{ typeId: 'passaro', count: 0, flocks: 1, time: 'day' }] },
  { id: 'cercado_ovelhas', name: 'Cercado das ovelhas', place: 'cercado_ovelhas', radius: 5.5, respawnHours: 24, activateRange: 140, confined: true, entries: [{ typeId: 'ovelha', count: 5 }] },
  { id: 'cercado_galinhas', name: 'Galinheiro', place: 'cercado_galinhas', radius: 3.5, respawnHours: 24, activateRange: 120, confined: true, entries: [{ typeId: 'galinha', count: 6 }] },
  { id: 'pasto_cavalos', name: 'Pasto dos cavalos', x: -470, z: 425, radius: 12, respawnHours: 24, activateRange: 150, confined: true, entries: [{ typeId: 'cavalo', count: 2 }] },
  { id: 'ninho_grifo', name: 'Ninho do Grifo', place: 'ninho_grifo', radius: 40, respawnHours: 48, activateRange: 420, entries: [{ typeId: 'grifo', count: 1 }] },
  { id: 'poleiro_fenix', name: 'Poleiro da Fênix', place: 'poleiro_fenix', radius: 20, respawnHours: 1, activateRange: 260, entries: [{ typeId: 'fenix', count: 1, time: 'dawn', chance: 0.4 }] },
  { id: 'lago_serpente', name: 'Lago Espelhado', place: 'lago_margem', radius: 22, respawnHours: 48, activateRange: 140, entries: [{ typeId: 'serpente_lago', count: 1, chance: 0.3 }, { typeId: 'passaro', count: 0, flocks: 1, time: 'day' }] },
];

/** Horas consideradas "amanhecer" (fênix). */
export const DAWN_HOURS: [number, number] = [5, 8.5];
