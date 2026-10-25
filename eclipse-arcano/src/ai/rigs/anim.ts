import type { AttackAnim } from '../../data/enemies';

/**
 * Entrada de animação procedural compartilhada pelos rigs (preenchida pela IA a cada quadro).
 * Nada aqui aloca: cada entidade mantém o seu próprio objeto.
 */
export type ExtraAnim = AttackAnim | 'roar' | 'charge' | 'beam' | 'slump' | 'block' | 'none';

export interface AnimInput {
  /** Tempo acumulado (s). */
  time: number;
  /** Velocidade horizontal (m/s). */
  speed: number;
  /** Direção do movimento relativa à frente (local X = esquerda+, Z = frente+), normalizada. */
  localX: number;
  localZ: number;
  /** 0 = andando, 1 = correndo. */
  run: number;
  /** Postura de combate (guarda). */
  combat: boolean;
  /** Animação de ação atual e fase: 0 antecipação, 1 impacto, 2 recuperação. */
  action: ExtraAnim;
  phase: 0 | 1 | 2;
  /** Progresso 0..1 dentro da fase. */
  phaseT: number;
  /** Multiplicador de velocidade de animação (lentidão temporal). */
  timeScale: number;
  block: boolean;
  /** Esquiva: progresso 0..1 (0 = sem esquiva) e direção local. */
  dodge: number;
  dodgeX: number;
  dodgeZ: number;
  /** Reação a dano (1 → 0). */
  hit: number;
  stagger: boolean;
  /** Morte: progresso 0..1 (0 = vivo). */
  dead: number;
  /** Rendição (ajoelhada). */
  kneel: boolean;
  /** Cabeça olhando para o alvo (yaw relativo, pitch). */
  lookYaw: number;
  lookPitch: number;
  /** Voadores: batendo asas / mergulhando / pousado. */
  flying: boolean;
  dive: number;
  /** Comendo/pastando (criaturas), descansando. */
  graze: boolean;
  rest: boolean;
  /** Superaquecido (constructos): ombros caídos, vapor. */
  overheat: boolean;
  /** Cavalo: empinar (> 0, 0..1) ou escoicear (< 0, 0..-1). */
  rear: number;
}

export function makeAnimInput(): AnimInput {
  return {
    time: Math.random() * 100,
    speed: 0,
    localX: 0,
    localZ: 1,
    run: 0,
    combat: false,
    action: 'none',
    phase: 0,
    phaseT: 0,
    timeScale: 1,
    block: false,
    dodge: 0,
    dodgeX: 0,
    dodgeZ: -1,
    hit: 0,
    stagger: false,
    dead: 0,
    kneel: false,
    lookYaw: 0,
    lookPitch: 0,
    flying: false,
    dive: 0,
    graze: false,
    rest: false,
    overheat: false,
    rear: 0,
  };
}

export interface Rig {
  readonly root: import('three').Group;
  readonly meshes: import('three').Mesh[];
  /** Aplica a pose do quadro. */
  update(dt: number, a: AnimInput): void;
  /** Ponto de origem de projéteis/ataques (mundo). */
  muzzle(out: import('three').Vector3): import('three').Vector3;
  /** Liga/desliga sombras (qualidade). */
  setShadows(on: boolean): void;
  /** Libera recursos por instância (ex.: textura de ossos da malha fundida). Opcional. */
  dispose?(): void;
}

export const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
export const easeIn = (t: number) => t * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
