/**
 * Mundo interativo (estilo aventura em mundo aberto): fogo que se espalha pela grama,
 * grama e arbustos que podem ser cortados, objetos com física (barris, caixotes,
 * pedregulhos, potes e barris de pólvora rúnica), Estase Temporal, Centelha,
 * fogueiras para cozinhar e receitas. Implementação em src/interactive/*.
 */
/** Grade local de chão (grama cortada, queimada, em chamas) em volta do jogador. */
export const GROUND_GRID = {
  /** Células por lado. */
  res: 128,
  /** Tamanho da célula (m). A grade cobre res × cell metros. */
  cell: 0.75,
  /** Recentraliza quando o jogador se afasta tanto do centro (m). */
  recenter: 20,
  /** Envio da textura para a GPU (vezes por segundo, no máximo). */
  uploadHz: 12,
};

/** Fogo na grama. */
export const FIRE = {
  /** Passos de simulação por segundo. */
  tickHz: 10,
  /** Quanto tempo uma célula queima (s). */
  burnTime: [3, 5] as const,
  /** Chance por segundo de passar para cada vizinha (× densidade da grama). */
  spreadRate: 0.42,
  /** Grama mínima na célula para pegar fogo. */
  minGrass: 0.12,
  /** Quanto o vento empurra o fogo (multiplica a chance na direção do vento). */
  windBias: 1.6,
  /** Umidade a partir da qual o fogo não pega (0..1). */
  wetBlock: 0.55,
  /** Chuva apaga: segundos de queima a menos por segundo, × intensidade da chuva. */
  rainQuench: 3.5,
  /** Limite de células queimando ao mesmo tempo. */
  maxBurning: 1400,
  /** Dano por segundo a quem está dentro do fogo (e estado de queimadura). */
  dps: 10,
  burnStatus: { dps: 4, duration: 2.5 },
  /** Intervalo entre os danos (s). */
  damageInterval: 0.5,
  /** Grama queimada volta depois de (s). */
  regrowBurnt: 300,
  /** Corrente de ar quente: aceleração para cima (m/s²) e altura máxima acima do fogo (m). */
  updraft: 26,
  updraftHeight: 34,
  /** Chamas desenhadas no máximo (instâncias). */
  maxFlames: 900,
  /** Raio de ignição de uma faísca pequena (m). */
  sparkRadius: 0.9,
  /** Raio que um raio (relâmpago) incendeia quando o chão está seco (m) e a chance. */
  lightningRadius: 1.6,
  lightningChance: 0.45,
};

/** Grama cortada por golpes. */
export const CUT = {
  /** Grama cortada volta depois de (s). */
  regrow: 150,
  /** Golpe alcança um pouco além da arma (m). */
  extraReach: 0.4,
  /** Chances por célula cortada (no máximo 1 achado por golpe). */
  goldChance: 0.02,
  gold: [1, 3] as const,
  mushroomChance: 0.012,
};

/** Arbustos que podem ser cortados/queimados e árvores que soltam frutas. */
export const BUSHES = {
  regrow: 420,
  /** Alcance extra do golpe até o arbusto (m). */
  reach: 0.9,
  berryChance: 0.4,
  goldChance: 0.15,
  gold: [2, 6] as const,
  /** Árvore (carvalho) sacudida por golpe: chance de cair maçã e tempo até poder de novo (s). */
  appleChance: 0.55,
  appleCooldown: 240,
  treeReach: 1.2,
};

export type PropKind = 'barrel' | 'crate' | 'boulder' | 'jar' | 'powder';

export interface PropDef {
  name: string;
  /** Raio (m) do corpo (esfera para a física, cilindro para a colisão). */
  radius: number;
  /** Altura do colisor (m). */
  height: number;
  /** Massa relativa (1 = caixote). Mais massa = mais difícil de empurrar. */
  mass: number;
  /** Rola ladeira abaixo. */
  round: boolean;
  /** Vida (0 = indestrutível). */
  hp: number;
  /** Pega fogo e queima até quebrar. */
  flammable: boolean;
  /** Explode ao pegar fogo (ou com dano). */
  explosive: boolean;
  /** Flutua na água. */
  floats: boolean;
  /** Saque ao quebrar: ouro e itens com chance. */
  gold?: [number, number];
  drops?: { itemId: string; chance: number; qty?: [number, number] }[];
}

export const PROPS: Record<PropKind, PropDef> = {
  barrel: { name: 'Barril', radius: 0.45, height: 1.05, mass: 1.6, round: true, hp: 40, flammable: true, explosive: false, floats: true, gold: [0, 4], drops: [{ itemId: 'maca', chance: 0.35, qty: [1, 3] }, { itemId: 'carne_crua', chance: 0.15 }] },
  crate: { name: 'Caixote', radius: 0.5, height: 1.0, mass: 1, round: false, hp: 25, flammable: true, explosive: false, floats: true, gold: [1, 8], drops: [{ itemId: 'pocao_vida_menor', chance: 0.2 }, { itemId: 'minerio_ferroluz', chance: 0.25 }, { itemId: 'cogumelo', chance: 0.2 }] },
  boulder: { name: 'Pedregulho', radius: 0.95, height: 1.8, mass: 6, round: true, hp: 0, flammable: false, explosive: false, floats: false },
  jar: { name: 'Pote', radius: 0.32, height: 0.7, mass: 0.6, round: true, hp: 1, flammable: false, explosive: false, floats: false, gold: [2, 10], drops: [{ itemId: 'pocao_energia', chance: 0.15 }, { itemId: 'fragmento_eter', chance: 0.12 }] },
  powder: { name: 'Barril de pólvora rúnica', radius: 0.45, height: 1.05, mass: 1.6, round: true, hp: 10, flammable: true, explosive: true, floats: true },
};

/** Física dos objetos. */
export const PROP_PHYSICS = {
  gravity: 22,
  /** Atrito ao rolar (round) e ao deslizar (caixas), por segundo. */
  rollFriction: 0.35,
  slideFriction: 4.5,
  /** Inclinação (graus) a partir da qual caixas escorregam sozinhas. */
  slideSlopeDeg: 34,
  bounce: 0.25,
  /** Empurrão do jogador andando contra o objeto (m/s², dividido pela massa). */
  pushAccel: 16,
  /** Impulso de um golpe: knockback × este fator / massa (m/s). */
  hitImpulse: 0.55,
  /** Impulso de explosões (m/s por unidade de dano, / massa). */
  blastImpulse: 0.22,
  maxSpeed: 40,
  /** Velocidade a partir da qual o objeto machuca quem atropela (m/s) e dano por (massa × m/s). */
  crushSpeed: 6,
  crushDamage: 1.6,
  /** Impacto que quebra objetos frágeis (m/s). */
  breakSpeed: 11,
  /** Dorme parado depois de (s). */
  sleepAfter: 0.8,
  /** Só simula objetos até esta distância do jogador (m). */
  activeRadius: 110,
  /** Volta a aparecer depois de quebrado (s). */
  respawn: 600,
  /** Água: flutuação e arrasto. */
  buoyancy: 30,
  waterDrag: 2.2,
};

/** Barril de pólvora rúnica. */
export const POWDER = {
  fuse: 1.6,
  radius: 5,
  damage: 55,
  knockback: 9,
  igniteRadius: 3.5,
};

/** Estase Temporal: congela um objeto no tempo; golpes acumulam força; ao fim ele dispara. */
export const STASIS = {
  energy: 20,
  cooldown: 10,
  duration: 6.5,
  range: 28,
  /** Ângulo máximo (graus) entre a mira e o objeto. */
  aimDeg: 9,
  /** Força acumulada por golpe: knockback/dano × fator (m/s). */
  perHit: 1.1,
  perDamage: 0.12,
  maxLaunch: 38,
};

/** Centelha: faísca de fogo que acende grama, fogueiras e objetos. */
export const SPARK = {
  energy: 6,
  cooldown: 0.9,
  speed: 26,
  range: 22,
  damage: 6,
  burn: { dps: 3, duration: 2 },
};

/** Fogueiras de acampamento (cozinhar). */
export const CAMPFIRE = {
  interactRange: 2.6,
  /** Raio que esquenta/acende objetos e fere quem pisa (m). */
  hurtRadius: 0.75,
  light: { color: 0xff8a3a, intensity: 9, distance: 14 },
};

export interface CampfireSpot {
  id: string;
  name: string;
  x: number;
  z: number;
  /** Já começa acesa. */
  lit?: boolean;
}

/** Posições aproximadas: o jogo procura chão plano e livre num raio de 18 m. */
export const CAMPFIRES: CampfireSpot[] = [
  { id: 'fogueira_vila', name: 'Fogueira da Vila', x: -395, z: 370, lit: true },
  { id: 'fogueira_cripta', name: 'Fogueira da Estrada da Cripta', x: -470, z: 500 },
  { id: 'fogueira_floresta', name: 'Fogueira da Floresta', x: -90, z: 240 },
  { id: 'fogueira_lago', name: 'Fogueira do Lago', x: -130, z: -130 },
  { id: 'fogueira_desfiladeiro', name: 'Fogueira do Desfiladeiro', x: 190, z: 70 },
  { id: 'fogueira_ruinas', name: 'Fogueira das Ruínas', x: 350, z: -210 },
  { id: 'fogueira_torre', name: 'Fogueira da Torre', x: 590, z: 280 },
  { id: 'fogueira_ferroluz', name: 'Fogueira de Ferroluz', x: 650, z: 690, lit: true },
  { id: 'fogueira_pantano', name: 'Fogueira do Pântano', x: -560, z: -380 },
  { id: 'fogueira_santuario', name: 'Fogueira do Santuário', x: -770, z: 110 },
];

/** Onde há objetos físicos: grupos com centro, raio, quantidade por tipo. */
export interface PropCluster {
  x: number;
  z: number;
  radius: number;
  props: Partial<Record<PropKind, number>>;
}

export const PROP_CLUSTERS: PropCluster[] = [
  // vila: barris e caixotes perto das casas e do mercado
  { x: -430, z: 320, radius: 70, props: { barrel: 10, crate: 12, jar: 4 } },
  // acampamento dos Corvos: pólvora!
  { x: 232, z: 530, radius: 40, props: { powder: 7, crate: 6, barrel: 4 } },
  // posto de Ferroluz
  { x: 700, z: 760, radius: 60, props: { crate: 8, barrel: 6, powder: 2 } },
  // ruínas: potes antigos
  { x: 430, z: -300, radius: 90, props: { jar: 14, crate: 2 } },
  // cripta
  { x: -520, z: 560, radius: 28, props: { jar: 6 } },
  // laboratório abandonado
  { x: 780, z: -640, radius: 30, props: { jar: 5, powder: 3, crate: 3 } },
];

/** Pedregulhos soltos nas encostas (procurados perto destes pontos, em lugares altos com descida). */
export const BOULDER_AREAS: { x: number; z: number; radius: number; count: number }[] = [
  { x: 250, z: 0, radius: 120, count: 10 },
  { x: -300, z: 880, radius: 120, count: 6 },
  { x: 560, z: 120, radius: 120, count: 6 },
  { x: -700, z: 200, radius: 140, count: 6 },
  { x: 120, z: 360, radius: 120, count: 5 },
];

/** Cogumelos para colher (procurados nas florestas). */
export const FORAGE = {
  /** Pontos por região de floresta. */
  spots: 140,
  /** Raio de interação (m). */
  interactRange: 1.8,
  /** Renascem depois de (dias de jogo). */
  regrowDays: 1,
};

// ---------------------------------------------------------------------------
// Cozinha
// ---------------------------------------------------------------------------

export interface Recipe {
  id: string;
  /** Ingredientes exigidos (id → quantidade). */
  needs: Record<string, number>;
  /** Item resultante. */
  result: string;
  /** Prioridade quando várias receitas servem (maior ganha). */
  priority: number;
}

/** Ingredientes aceitos na panela. */
export const INGREDIENTS = ['maca', 'frutas_silvestres', 'cogumelo', 'carne_crua', 'erva_lumen', 'fragmento_eter'] as const;

export const MAX_INGREDIENTS = 4;

export const RECIPES: Recipe[] = [
  { id: 'banquete', needs: { carne_crua: 1, cogumelo: 1, maca: 1, erva_lumen: 1 }, result: 'banquete_arcano', priority: 10 },
  { id: 'prato_cacador', needs: { carne_crua: 1, cogumelo: 1 }, result: 'prato_cacador', priority: 6 },
  { id: 'cha_lumen', needs: { erva_lumen: 1, frutas_silvestres: 1 }, result: 'cha_lumen', priority: 6 },
  { id: 'elixir_eter', needs: { fragmento_eter: 1, erva_lumen: 1 }, result: 'caldo_eter', priority: 6 },
  { id: 'torta', needs: { maca: 1, frutas_silvestres: 1 }, result: 'torta_frutas', priority: 5 },
  { id: 'carne_dupla', needs: { carne_crua: 2 }, result: 'assado_farto', priority: 5 },
  { id: 'ensopado', needs: { cogumelo: 2 }, result: 'ensopado_cogumelos', priority: 4 },
  { id: 'espetinho', needs: { carne_crua: 1 }, result: 'espetinho', priority: 2 },
  { id: 'maca_assada', needs: { maca: 1 }, result: 'maca_assada', priority: 1 },
  { id: 'cogumelo_assado', needs: { cogumelo: 1 }, result: 'cogumelo_assado', priority: 1 },
  { id: 'frutas_quentes', needs: { frutas_silvestres: 1 }, result: 'frutas_quentes', priority: 1 },
];

/** Prato que sai quando nada combina (só ingredientes estranhos). */
export const DUBIOUS_FOOD = 'comida_duvidosa';
