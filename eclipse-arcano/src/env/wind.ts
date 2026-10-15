/**
 * Vento (lógica pura): direção que deriva devagar, força base que acompanha o clima
 * com suavização e rajadas por ruído. Sem alocação por quadro.
 */
import { Simplex2 } from '../core/noise';
import { clamp, damp } from '../core/math';
import { WIND } from '../data/weather';

export class WindModel {
  /** Ângulo central (rad) no plano XZ; a direção oscila em volta dele. */
  angle: number;
  /** Força base (sem rajadas). */
  base = 0.35;
  /** Força final 0..2 (com rajadas). */
  strength = 0.35;
  /** 0..1 rajada atual (para áudio/partículas). */
  gust = 0;
  /** Direção atual normalizada (x, z). */
  readonly dir = { x: 1, z: 0 };
  private noise: Simplex2;
  private t = 0;

  constructor(seed = 4242, angle = 0.3) {
    this.noise = new Simplex2(seed);
    this.angle = angle;
    this.dir.x = Math.cos(angle);
    this.dir.z = Math.sin(angle);
  }

  /** Força imediata, sem suavização (carregar save / novo jogo). */
  snap(base: number) {
    this.base = base;
    this.strength = base;
  }

  update(dt: number, targetBase: number, gustAmp: number) {
    this.t += dt;
    const t = this.t;
    this.base = damp(this.base, targetBase, WIND.baseLambda, dt);
    // deriva lenta da direção (±~75°) + turbulência proporcional à força
    const wander = this.noise.noise(t * WIND.dirWanderFreq, 1.7) * WIND.dirWander;
    const turb = this.noise.noise(t * 0.35, 9.1) * 0.12 * Math.min(1, this.base);
    const a = this.angle + wander + turb;
    this.dir.x = Math.cos(a);
    this.dir.z = Math.sin(a);
    // rajadas: picos esparsos de ruído (> 0) + tremulação fina
    const g0 = this.noise.noise(t * WIND.gustFreq, 3.3);
    const g1 = this.noise.noise(t * WIND.gustFreq * 3.1, 5.9) * 0.35;
    const g = Math.max(0, g0 + g1);
    this.gust = clamp(g * 1.4, 0, 1);
    this.strength = clamp(this.base * (1 + gustAmp * this.gust * 1.5), 0, WIND.max);
  }
}
