import * as THREE from 'three';

/**
 * Uniforms globais compartilhados por shaders de vários módulos
 * (vegetação, água, céu, runas do personagem...). O Environment atualiza
 * tempo/vento/umidade/sol; o Player atualiza a posição de empurrão da grama.
 */
export const GLOBAL_UNIFORMS = {
  uTime: { value: 0 },
  /** Direção do vento no plano XZ (normalizada). */
  uWindDir: { value: new THREE.Vector2(1, 0.3).normalize() },
  /** 0 = calmo, 1 = vento forte, 2 = tempestade. */
  uWindStrength: { value: 0.4 },
  /** 0 = seco, 1 = encharcado (escurece/brilha superfícies). */
  uWetness: { value: 0 },
  /** Posição do jogador (xyz) e raio de influência (w) para dobrar grama/arbustos. */
  uPlayerPos: { value: new THREE.Vector4(0, 0, 0, 1.6) },
  /** Direção do sol (normalizada, aponta PARA o sol). */
  uSunDir: { value: new THREE.Vector3(0.3, 0.8, 0.2).normalize() },
  uSunColor: { value: new THREE.Color(1, 0.95, 0.85) },
  uFogColor: { value: new THREE.Color(0.6, 0.7, 0.8) },
  /** 0..1 — fase "noite" (para flores que brilham, runas, janelas acesas). */
  uNight: { value: 0 },
  /** Intensidade da corrupção perto do jogador (0..1), para efeitos de tela/terreno. */
  uCorruption: { value: 0 },
  /** Chuva caindo agora (0..1): ondinhas nas poças, respingos. */
  uRain: { value: 0 },
  /** Neve no lugar da chuva (0..1, nas montanhas altas). */
  uSnow: { value: 0 },
};
