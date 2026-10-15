import type * as THREE from 'three';
import type { GameContext, GameSystem } from '../core/context';
import type { MusicState } from '../core/EventBus';

/** Ids de efeitos sonoros (sintetizados proceduralmente pelo módulo de áudio). */
export type SfxId =
  | 'ui_click'
  | 'ui_hover'
  | 'ui_open'
  | 'ui_close'
  | 'ui_error'
  | 'quest_start'
  | 'quest_complete'
  | 'level_up'
  | 'pickup'
  | 'gold'
  | 'equip'
  | 'potion'
  | 'footstep'
  | 'jump'
  | 'land'
  | 'dodge'
  | 'flight_start'
  | 'flight_loop'
  | 'flight_end'
  | 'swing'
  | 'swing_heavy'
  | 'hit_flesh'
  | 'hit_metal'
  | 'hit_magic'
  | 'block'
  | 'parry'
  | 'cast_arcane'
  | 'cast_lance'
  | 'cast_explosion'
  | 'cast_chains'
  | 'cast_shield'
  | 'cast_teleport'
  | 'cast_lightning'
  | 'cast_blades'
  | 'cast_rift'
  | 'cast_ascend'
  | 'explosion'
  | 'thunder'
  | 'enemy_alert'
  | 'enemy_death'
  | 'boss_roar'
  | 'boss_slam'
  | 'boss_laser'
  | 'creature_call'
  | 'door'
  | 'chest_open'
  | 'death';

export interface PlayOptions {
  position?: THREE.Vector3;
  volume?: number;
  /** Variação de pitch (1 = normal). */
  pitch?: number;
  /** Para passos: superfície. */
  surface?: string;
}

/**
 * STUB — áudio procedural (WebAudio): SFX sintetizados, ambiência por bioma/clima
 * e música adaptativa. O módulo audio/ substitui a implementação mantendo a API.
 */
export class AudioSystem implements GameSystem {
  readonly name = 'audio';
  alwaysUpdate = true;
  music: MusicState = 'silence';
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }
  /** Deve ser chamado após um gesto do usuário (política de autoplay). */
  unlock() {}
  play(_id: SfxId, _opts?: PlayOptions) {}
  setMusic(state: MusicState) {
    this.music = state;
  }
}
