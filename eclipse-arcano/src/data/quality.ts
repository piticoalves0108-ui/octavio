/** Presets de qualidade gráfica. Todos os sistemas leem daqui via ctx.settings. */
export type QualityLevel = 'low' | 'medium' | 'high' | 'ultra';

export interface QualityPreset {
  /** Escala da resolução interna (1 = nativa). */
  renderScale: number;
  /** Limite do devicePixelRatio. */
  maxPixelRatio: number;
  antialias: boolean;
  /** 0 = sem sombras. */
  shadowMapSize: 0 | 512 | 1024 | 2048 | 4096;
  /** Distância (m) coberta pela câmera de sombra ao redor do jogador. */
  shadowDistance: number;
  /** Distância de visão / far plane do terreno (m). */
  viewDistance: number;
  /** Densidade de grama (0..1, multiplica a quantidade de instâncias). */
  grassDensity: number;
  /** Raio (m) do campo de grama ao redor da câmera. */
  grassRadius: number;
  /** Densidade de árvores/arbustos/pedras (0..1). */
  propDensity: number;
  /** Máximo de partículas simultâneas no sistema de VFX. */
  maxParticles: number;
  /** Máximo de luzes pontuais dinâmicas (efeitos). */
  maxDynamicLights: number;
  /** Pós-processamento bloom. */
  bloom: boolean;
  /** Viés de LOD (multiplica distâncias de troca de LOD). */
  lodBias: number;
  /** Gotas de chuva simultâneas. */
  rainDrops: number;
  /** Máximo de inimigos ativos simultâneos perto do jogador. */
  maxActiveEnemies: number;
  /** Máximo de NPCs com IA completa. */
  maxActiveNpcs: number;
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  low: {
    renderScale: 0.75,
    maxPixelRatio: 1,
    antialias: false,
    shadowMapSize: 0,
    shadowDistance: 0,
    viewDistance: 600,
    grassDensity: 0.3,
    grassRadius: 35,
    propDensity: 0.5,
    maxParticles: 600,
    maxDynamicLights: 2,
    bloom: false,
    lodBias: 0.6,
    rainDrops: 1500,
    maxActiveEnemies: 10,
    maxActiveNpcs: 12,
  },
  medium: {
    renderScale: 1,
    maxPixelRatio: 1,
    antialias: false,
    shadowMapSize: 1024,
    shadowDistance: 60,
    viewDistance: 900,
    grassDensity: 0.6,
    grassRadius: 50,
    propDensity: 0.75,
    maxParticles: 1500,
    maxDynamicLights: 4,
    bloom: false,
    lodBias: 0.85,
    rainDrops: 3500,
    maxActiveEnemies: 16,
    maxActiveNpcs: 20,
  },
  high: {
    renderScale: 1,
    maxPixelRatio: 1.5,
    antialias: true,
    shadowMapSize: 2048,
    shadowDistance: 90,
    viewDistance: 1300,
    grassDensity: 0.85,
    grassRadius: 65,
    propDensity: 1,
    maxParticles: 3000,
    maxDynamicLights: 6,
    bloom: true,
    lodBias: 1,
    rainDrops: 6000,
    maxActiveEnemies: 22,
    maxActiveNpcs: 28,
  },
  ultra: {
    renderScale: 1,
    maxPixelRatio: 2,
    antialias: true,
    shadowMapSize: 4096,
    shadowDistance: 120,
    viewDistance: 1800,
    grassDensity: 1,
    grassRadius: 80,
    propDensity: 1,
    maxParticles: 5000,
    maxDynamicLights: 8,
    bloom: true,
    lodBias: 1.3,
    rainDrops: 9000,
    maxActiveEnemies: 30,
    maxActiveNpcs: 36,
  },
};
