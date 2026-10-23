/**
 * Números ajustáveis do protagonista: locomoção, pulo, esquiva, escalada, natação,
 * voo, dano de queda, energia e câmera. Unidades em metros, segundos e radianos
 * (ângulos marcados com "Deg" estão em graus).
 */
import type { PlayerAnim } from '../player/Player';

/** Corpo físico (cápsula vertical). */
export const PLAYER_BODY = {
  radius: 0.42,
  height: 1.85,
  /** Altura máxima de degrau que o jogador sobe sem pular. */
  stepHeight: 0.55,
  /** Inclinação máxima caminhável do terreno (graus). */
  maxSlopeDeg: 47,
};

export const LOCOMOTION = {
  walkSpeed: 2.3,
  runSpeed: 5.4,
  sprintSpeed: 8.6,
  /** Aceleração no chão (m/s²) ao ganhar velocidade. */
  accel: 38,
  /** Desaceleração no chão (m/s²) ao soltar o direcional. */
  decel: 30,
  /** "Velocidade" (lambda) do giro do corpo para a direção do movimento. */
  turnLambda: 14,
  /** Multiplicador de velocidade com a defesa ativa (bloqueando). */
  blockingSpeedMul: 0.42,
  /** Multiplicador de velocidade em água rasa (andando dentro d'água). */
  wadeSpeedMul: 0.72,
  /** Aceleração extra (m/s²) ao escorregar em encostas íngremes demais. */
  slopeSlideAccel: 14,
  /** Distância de passada (m) por meio ciclo — sincroniza passos e animação. */
  strideWalk: 0.78,
  strideRun: 1.25,
  strideSprint: 1.6,
};

export const JUMP = {
  gravity: 24,
  /** Velocidade vertical inicial do pulo (≈1,4 m de altura). */
  speed: 8.2,
  /** Tempo de tolerância para pular depois de sair de uma borda. */
  coyoteTime: 0.13,
  /** Pulo pressionado pouco antes de tocar o chão ainda vale. */
  bufferTime: 0.16,
  /** Aceleração horizontal no ar (controle aéreo, m/s²). */
  airAccel: 9,
  /** Velocidade terminal de queda (m/s). */
  terminalSpeed: 42,
  /** Velocidade de impacto a partir da qual a aterrissagem é "pesada" (animação + tremor). */
  hardLandingSpeed: 11,
};

export const FALL_DAMAGE = {
  /** Abaixo desta velocidade de impacto (m/s) não há dano (≈6 m de queda). */
  minSpeed: 17,
  /** Dano por m/s acima do mínimo. */
  perSpeed: 3,
  /** Dano máximo como fração da vida máxima (queda nunca mata: deixa ao menos 1 de vida). */
  maxFraction: 0.45,
};

export const DODGE = {
  distance: 5.4,
  duration: 0.42,
  /** Janela de invulnerabilidade (i-frames). */
  iframes: 0.32,
  energyCost: 12,
  /** Intervalo mínimo entre esquivas. */
  cooldown: 0.18,
  /** Esquiva aérea: só uma por salto. */
  airDodges: 1,
  /** Investida lateral no voo (esquiva durante o voo). */
  flightDashSpeed: 26,
  flightDashDuration: 0.35,
};

export const CLIMB = {
  speed: 2.1,
  /** Distância (m) até a parede para agarrar. */
  grabDistance: 0.25,
  /** Produto escalar mínimo entre direção do movimento e a parede para agarrar. */
  grabDot: 0.55,
  /** Tempo da animação de transpor a borda no topo. */
  mantleDuration: 0.6,
  /** Impulso ao saltar da parede (para trás e para cima). */
  wallJumpBack: 4.5,
  wallJumpUp: 6.5,
  /** Energia por segundo escalando em movimento (parado não gasta, mas também não recupera). */
  energyPerSecond: 4.5,
  /** Salto na parede (Espaço segurando uma direção): custo, distância e duração. */
  climbJumpCost: 12,
  climbJumpDistance: 1.8,
  climbJumpTime: 0.38,
  /** Encostas do relevo: inclinação mínima (graus) para agarrar e inclinação do topo para transpor. */
  terrainGrabDeg: 50,
  terrainTopDeg: 40,
  /** Velocidade relativa escalando o relevo (pedra irregular). */
  terrainSpeedMul: 0.9,
  /** Chuva: com o mundo molhado acima disto, a parede escorrega de tempos em tempos. */
  slipWetness: 0.45,
  slipIntervalMin: 2.2,
  slipIntervalMax: 4.2,
  slipDistance: 1.3,
  slipTime: 0.35,
  /** Tempo (s) sem poder agarrar de novo depois de cair por cansaço. */
  regrabDelay: 0.7,
};

/** Pés no chão (IK das pernas em degraus e rampas). */
export const FOOT_IK = {
  /** Maior desnível (m) que um pé compensa. */
  maxStep: 0.45,
  /** Suavização das alturas medidas (1/s). */
  lambda: 18,
  /** Suavização do peso ao começar/parar (pular, voar). */
  blendLambda: 8,
  /** Quanto o pé gira para ficar plano no chão (0..1). */
  footAlign: 0.7,
  /** Peso restante correndo (o ciclo de passada já tira os pés do chão). */
  runWeight: 0.3,
};

export const SWIM = {
  /** Profundidade (m) a partir da qual o jogador nada. */
  depthToSwim: 1.25,
  /** Profundidade para sair do nado (histerese). */
  depthToWade: 1.05,
  speed: 2.6,
  fastSpeed: 4.0,
  accel: 6,
  /** Altura do corpo abaixo da superfície (o peito fica na linha d'água). */
  floatDepth: 1.3,
};

export const FLIGHT = {
  /** Energia mínima para levantar voo. */
  minEnergyToStart: 8,
  /** Custo fixo da decolagem. */
  takeoffCost: 5,
  /** Impulso vertical da decolagem (m/s). */
  takeoffImpulse: 11,
  takeoffDuration: 0.55,
  /** Velocidade de cruzeiro horizontal (m/s). */
  cruiseSpeed: 18,
  /** Velocidade com turbo (Shift). */
  boostSpeed: 36,
  /** Velocidade vertical (Espaço / C). */
  verticalSpeed: 9,
  /** Aceleração de cruzeiro (m/s²). */
  accel: 24,
  /** Aceleração do turbo (m/s²). */
  boostAccel: 32,
  /** Frenagem sem entrada (m/s²) — inércia perceptível sem "deslizar". */
  brake: 14,
  /** Custo de energia por segundo pairando / em cruzeiro / em turbo / subindo (extra). */
  costHover: 0.8,
  costCruise: 1.4,
  costBoost: 4.5,
  costClimb: 1.5,
  /** Sem energia: desce planando a esta velocidade (m/s). */
  glideSinkSpeed: 3.2,
  /** Velocidade horizontal máxima planando sem energia. */
  glideSpeed: 12,
  /** Altura sobre o chão em que o pouso automático acontece (descendo devagar). */
  autoLandHeight: 1.1,
  /** Velocidade horizontal máxima para o pouso automático. */
  autoLandMaxSpeed: 12,
  /** Altura mínima sobre o terreno ao rasante (m). */
  minClearance: 0.35,
  /** Inclinação máxima nas curvas (graus). */
  bankMaxDeg: 38,
  /** Inclinação do corpo para frente: cruzeiro / turbo (graus). */
  pitchCruiseDeg: 42,
  pitchBoostDeg: 64,
  /** Aumento de FOV (graus) na velocidade máxima. */
  fovBoost: 11,
  /** Distância da borda do mapa para mostrar aviso (m). */
  edgeWarnDistance: 45,
  /** Margem abaixo do teto de voo para começar a frear a subida (m). */
  ceilingMargin: 25,
  /** No turbo, a câmera inclina a rota (mergulhar/subir olhando). Zona morta em radianos. */
  boostPitchDeadZone: 0.12,
  boostPitchFactor: 0.85,
};

export const ENERGY = {
  /** Atraso (s) da regeneração de energia após gastar. */
  regenDelay: 0.7,
};

export const CAMERA = {
  distance: 5.2,
  minDistance: 1.8,
  maxDistance: 12,
  zoomStep: 0.65,
  /** Altura do ponto de foco acima dos pés. */
  targetHeight: 1.55,
  /** Deslocamento lateral do ombro (m, positivo = à direita). */
  shoulderOffset: 0.55,
  pitchMin: -0.95,
  pitchMax: 1.25,
  defaultPitch: 0.22,
  /** Suavização do seguimento (lambda) horizontal / vertical. */
  followLambda: 14,
  followLambdaY: 9,
  /** Raio da "esfera" da câmera nas colisões. */
  collisionRadius: 0.28,
  /** Distância máxima em interiores (teto detectado acima do jogador). */
  indoorDistance: 3.2,
  combatDistance: 6.2,
  bossDistance: 8.8,
  flightDistance: 5.8,
  /** Distância extra por m/s de velocidade no voo. */
  flightDistancePerSpeed: 0.035,
  dialogueDistance: 2.6,
  /** Trava de alvo: alcance, cone (graus) e distância em que solta. */
  lockOnRange: 30,
  lockOnConeDeg: 70,
  lockOnBreakRange: 38,
  /** Tempo sem linha de visão até soltar o alvo (s). */
  lockOnLosTimeout: 2.0,
  sprintFovBoost: 4,
  /** Escala máxima do tremor (rad / m). */
  shakeRotation: 0.035,
  shakeOffset: 0.18,
};

/**
 * Duração base (s) de cada animação de ação (antes do multiplicador `speed`).
 * O combate usa o retorno de playAnimation para sincronizar o quadro de impacto.
 */
export const ANIM_DURATION: Record<PlayerAnim, number> = {
  cast: 0.45,
  castHeavy: 0.95,
  castChannel: 1.2,
  slash1: 0.5,
  slash2: 0.5,
  slash3: 0.72,
  thrust: 0.5,
  heavySlash: 1.0,
  staffStrike: 0.62,
  block: 0.6,
  hit: 0.38,
  dodge: 0.42,
  land: 0.4,
  ascend: 1.5,
  interact: 0.7,
  drink: 1.0,
};

/**
 * Fração da animação até a qual ela não pode ser interrompida (isBusy).
 * 0 = sempre interrompível (combos leves, reações).
 */
export const ANIM_COMMIT: Partial<Record<PlayerAnim, number>> = {
  castHeavy: 0.75,
  heavySlash: 0.8,
  slash3: 0.6,
  ascend: 0.95,
  drink: 0.85,
  interact: 0.6,
};

/** Tempo de morte até o estado de jogo 'dead' (tela de derrota). */
export const DEATH_DELAY = 2.0;

/** Partículas próprias do personagem (centelhas e rastros de vento). */
export const PLAYER_FX = {
  /** Capacidade do pool por preset (baixo / médio / alto+). */
  capacityLow: 96,
  capacityMedium: 192,
  capacityHigh: 320,
  /** Centelhas por segundo no voo (escala com a velocidade e o turbo). */
  flightSparkRate: 26,
  /** Rastros de vento por segundo na velocidade máxima. */
  windRate: 55,
  /** Centelhas por segundo nas mãos com aura máxima (conjurando). */
  handRate: 30,
  /** Centelhas subindo do corpo na Forma Ascendente. */
  ascendRate: 18,
};
