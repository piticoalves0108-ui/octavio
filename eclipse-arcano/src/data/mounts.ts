/**
 * Montaria (cavalos): marchas, esporas, pulo, domar, assobio e cavaleiro.
 * Lógica pura em src/mount/ride.ts; sistema em src/mount/Mounts.ts.
 */

/** Marchas do cavalo (velocidade-alvo em m/s). Galope só com esporas. */
export const HORSE_GEARS = [
  { id: 'parado', name: 'Parado', speed: 0 },
  { id: 'passo', name: 'Passo', speed: 2.2 },
  { id: 'trote', name: 'Trote', speed: 5.4 },
  { id: 'meio_galope', name: 'Meio-galope', speed: 9.2 },
  { id: 'galope', name: 'Galope', speed: 14.5 },
] as const;

export const HORSE = {
  /** Aceleração e frenagem (m/s²). */
  accel: 5.5,
  brake: 11,
  /** Marcha à ré (m/s). */
  reverseSpeed: 1.6,
  /** Tempo (s) segurando "frente" para subir uma marcha (passo → trote → meio-galope). */
  gearUpHold: 0.9,
  /** Giro (rad/s) parado/no passo e no galope (curvas mais abertas em velocidade). */
  turnSlow: 2.6,
  turnFast: 1.15,
  /** Esporas: cargas, recarga (s por carga) e quanto tempo (s) cada uma sustenta o galope. */
  spurs: 4,
  spurRegen: 3.4,
  spurGallop: 2.8,
  /** Pulo: velocidade vertical (m/s), velocidade mínima para pular, gravidade e recarga. */
  jumpSpeed: 6.4,
  jumpMinSpeed: 2.5,
  gravity: 22,
  jumpCooldown: 0.7,
  /** Inclinação máxima (graus) que o cavalo sobe; acima disso ele empaca. */
  maxSlopeDeg: 38,
  /** Distância (m) olhada à frente e queda (m) que o faz recusar (beira de penhasco). */
  lookahead: 2.6,
  cliffDrop: 3.2,
  /** Profundidade (m) de água que o cavalo recusa. */
  deepWater: 1.05,
  /** Corpo para colisão (m). */
  radius: 0.75,
  height: 1.8,
  /** Bater de frente em velocidade acima disso (m/s) faz o cavalo tropeçar e parar. */
  bumpSpeed: 7,
  /** Altura (m) do quadril do cavaleiro acima do chão, e recuo (m) da sela. */
  seatHeight: 1.52,
  seatBack: -0.05,
  /** Alcance (m) do prompt "Montar". */
  mountRange: 2.8,
  /** Desmontar: distância (m) para o lado. */
  dismountSide: 1.3,
};

/** Domar um cavalo selvagem: ele empina e escoiceia enquanto o cavaleiro gasta energia. */
export const TAMING = {
  /** Duração (s) da luta para domar. */
  seconds: 3.4,
  /** Energia gasta por segundo segurando firme. */
  energyPerSecond: 24,
  /** Energia mínima para tentar (abaixo disso o cavalo derruba na hora). */
  minEnergy: 20,
  /** Empurrão (m/s) ao ser derrubado. */
  throwForce: 7,
  /** Dano ao ser derrubado. */
  throwDamage: 6,
};

/** Assobio: chama o seu cavalo. */
export const WHISTLE = {
  /** Até esta distância (m) o cavalo vem correndo de onde está. */
  range: 140,
  /** Mais longe: ele aparece galopando a esta distância (m), fora da vista. */
  arriveFrom: 55,
  /** Para a esta distância (m) do jogador. */
  stopAt: 3.5,
  /** Recarga (s). */
  cooldown: 2,
};

/** Nomes sorteados para o cavalo domado. */
export const HORSE_NAMES = ['Brisa', 'Trovão', 'Estrela', 'Ventania', 'Cometa', 'Aurora', 'Faísca', 'Neblina', 'Relâmpago', 'Canela'];

/** Câmera montado. */
export const RIDE_CAMERA = {
  /** Distância mínima (m) e extra por m/s de velocidade. */
  distance: 6.8,
  distancePerSpeed: 0.09,
  /** Altura extra (m) do foco acima do jogador montado. */
  extraHeight: 0.55,
  /** FOV extra no galope (graus). */
  gallopFov: 7,
};
