import type * as THREE from 'three';
import { Health, type DamageInfo, type DamageResult, type StatusId } from '../combat/Health';

/**
 * Vida dos inimigos/chefes: Health + regras da IA aplicadas ANTES do cálculo base:
 * - ponto fraco por lado (núcleo nas costas dos autômatos): marca `info.weakPoint` e multiplica;
 * - núcleo exposto (superaquecimento): todo golpe conta como ponto fraco;
 * - multiplicador extra (escudo dos pilares do Guardião, −90%);
 * - piso de vida (transição de fase do chefe; Ravena não morre antes de se render);
 * - resistência a lentidão (chefes sofrem slow reduzido).
 */
export class EnemyHealth extends Health {
  weakSide: 'back' | 'front' | null = null;
  weakMul = 1;
  /** Multiplicador geral extra (0.1 = escudo de −90%). */
  extraMul = 1;
  /** > 0: núcleo exposto — todo golpe é ponto fraco com este multiplicador. */
  exposedMul = 0;
  /** Fração (0..1) de redução de lentidão/lentidão temporal. */
  slowResist = 0;
  /** Vida mínima que o dano pode deixar (0 = pode morrer). */
  floor = 0;
  /** O último golpe acertou o ponto fraco (para reações/VFX). */
  lastWeak = false;

  override applyDamage(info: DamageInfo, facing?: THREE.Vector3): DamageResult {
    this.lastWeak = false;
    let mul = this.extraMul;
    if (this.exposedMul > 0) {
      mul *= this.exposedMul;
      this.lastWeak = true;
    } else if (this.weakSide && facing && info.direction) {
      // direction aponta do atacante para o alvo; >0 = golpe vindo de trás
      const d = facing.x * info.direction.x + facing.z * info.direction.z;
      if ((this.weakSide === 'back' && d > 0.35) || (this.weakSide === 'front' && d < -0.35)) {
        mul *= this.weakMul;
        this.lastWeak = true;
      }
    }
    if (this.lastWeak) info.weakPoint = true;
    const saved = info.amount;
    info.amount = saved * mul;
    const floor = this.floor;
    const res = super.applyDamage(info, facing);
    info.amount = saved;
    if (floor > 0 && this.current < floor && res.dealt > 0) {
      const over = floor - this.current;
      this.current = floor;
      res.dealt = Math.max(0, res.dealt - over);
      res.killed = false;
    }
    return res;
  }

  override addStatus(id: StatusId, duration: number, magnitude = 0) {
    if (this.slowResist > 0 && (id === 'slow' || id === 'timeSlow')) {
      const base = magnitude || (id === 'slow' ? 0.4 : 0.5);
      magnitude = base * (1 - this.slowResist);
      duration *= 1 - this.slowResist * 0.5;
    }
    super.addStatus(id, duration, magnitude);
  }
}
