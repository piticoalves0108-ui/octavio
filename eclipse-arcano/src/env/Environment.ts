import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { WeatherKind } from '../core/EventBus';
import { GLOBAL_UNIFORMS } from '../core/uniforms';

/**
 * STUB — céu, ciclo dia/noite, clima, vento, névoa e pós-processamento.
 * O módulo env/ substitui a implementação mantendo a API pública.
 */
export class Environment implements GameSystem, Saveable {
  readonly name = 'env';
  readonly saveKey = 'env';
  sun = new THREE.DirectionalLight(0xffffff, 2.2);
  hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5a2a, 1.0);
  weather: WeatherKind = 'clear';
  /** 0..1 intensidade de chuva atual (com transição). */
  rainIntensity = 0;
  /** 0..1 umidade das superfícies. */
  wetness = 0;
  /** 0..2 força do vento. */
  windStrength = 0.4;
  protected ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
    this.sun.position.set(100, 200, 50);
    ctx.scene.add(this.sun, this.sun.target, this.hemi);
    ctx.scene.background = new THREE.Color(0x8fb6d8);
    ctx.scene.fog = new THREE.Fog(0x8fb6d8, 150, ctx.settings.q.viewDistance);
  }

  update(dt: number) {
    GLOBAL_UNIFORMS.uTime.value += dt;
  }

  setWeather(kind: WeatherKind, _transitionSeconds = 30) {
    this.weather = kind;
    this.ctx.events.emit('weather:changed', { weather: kind });
  }

  isRaining() {
    return this.rainIntensity > 0.2;
  }

  /** Clarão de relâmpago (evento de tempestade ou ataque de chefe). */
  lightningFlash(_position?: THREE.Vector3) {}

  onNewGame() {
    this.weather = 'clear';
  }
  serialize() {
    return { weather: this.weather };
  }
  deserialize(data: any) {
    if (typeof data?.weather === 'string') this.weather = data.weather;
  }
}
