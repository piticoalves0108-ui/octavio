/**
 * Números do ambiente: ciclo dia/noite, clima, vento, chuva, relâmpagos, névoa,
 * sombras e pós-processamento. Tudo que é ajustável no módulo env/ fica aqui.
 * Cores em hexadecimal sRGB (convertidas para o espaço linear no carregamento).
 */
import type { WeatherKind } from '../core/EventBus';
import type { BiomeId } from './world';

export const WEATHER_KINDS: readonly WeatherKind[] = ['clear', 'cloudy', 'rain', 'storm', 'fog'];

/** Nome do clima visível ao jogador. */
export const WEATHER_LABEL: Record<WeatherKind, string> = {
  clear: 'Céu limpo',
  cloudy: 'Nublado',
  rain: 'Chuva',
  storm: 'Tempestade',
  fog: 'Névoa',
};

/** Parâmetros visuais/físicos de cada clima (o estado atual é uma mistura com transição). */
export interface WeatherParams {
  /** Duração natural (minutos reais) [mín, máx]. */
  durationMin: readonly [number, number];
  /** 0..1 cobertura de nuvens. */
  cloudCover: number;
  /** 0..1 nuvens carregadas (escuras). */
  cloudDarkness: number;
  /** 0..1 intensidade da chuva. */
  rain: number;
  /** 0..2 vento base (uWindStrength). */
  wind: number;
  /** Amplitude das rajadas (fração do vento base). */
  gust: number;
  /** Multiplicador da névoa de distância. */
  fog: number;
  /** Névoa extra absoluta (densidade FogExp2) — névoa "de verdade". */
  fogExtra: number;
  /** Relâmpagos por minuto (média). */
  lightningPerMin: number;
  /** 0..1 quanto a luz direta do sol/lua é bloqueada. */
  sunDim: number;
  /** 0..1 dessaturação do céu/névoa/gradação. */
  desaturate: number;
}

export const WEATHER: Record<WeatherKind, WeatherParams> = {
  clear: { durationMin: [7, 14], cloudCover: 0.22, cloudDarkness: 0, rain: 0, wind: 0.35, gust: 0.45, fog: 1, fogExtra: 0, lightningPerMin: 0, sunDim: 0, desaturate: 0 },
  cloudy: { durationMin: [4, 9], cloudCover: 0.68, cloudDarkness: 0.3, rain: 0, wind: 0.6, gust: 0.55, fog: 1.15, fogExtra: 0.0002, lightningPerMin: 0, sunDim: 0.45, desaturate: 0.3 },
  rain: { durationMin: [3, 7], cloudCover: 0.92, cloudDarkness: 0.62, rain: 0.68, wind: 0.85, gust: 0.6, fog: 1.45, fogExtra: 0.0009, lightningPerMin: 0, sunDim: 0.78, desaturate: 0.5 },
  storm: { durationMin: [2, 5], cloudCover: 1, cloudDarkness: 0.92, rain: 1, wind: 1.65, gust: 0.75, fog: 1.6, fogExtra: 0.0013, lightningPerMin: 7, sunDim: 0.92, desaturate: 0.62 },
  fog: { durationMin: [3, 7], cloudCover: 0.55, cloudDarkness: 0.15, rain: 0, wind: 0.12, gust: 0.3, fog: 1.3, fogExtra: 0.0105, lightningPerMin: 0, sunDim: 0.55, desaturate: 0.55 },
};

/**
 * Cadeia de Markov: peso de ir de um clima para o próximo (antes dos pesos regionais
 * e de horário). Sem autotransição: cada mudança é visível, mas as durações são longas.
 */
export const WEATHER_TRANSITIONS: Record<WeatherKind, Partial<Record<WeatherKind, number>>> = {
  clear: { cloudy: 6, fog: 1.2, clear: 0 },
  cloudy: { clear: 4.5, rain: 3.2, storm: 0.6, fog: 1 },
  rain: { cloudy: 4, storm: 1.6, clear: 0.8, fog: 0.8 },
  storm: { rain: 4.5, cloudy: 2.2 },
  fog: { clear: 3, cloudy: 3, rain: 0.6 },
};

/** Multiplicadores regionais (bioma do jogador) sobre os pesos de transição. */
export const REGION_WEATHER_WEIGHTS: Partial<Record<BiomeId, Partial<Record<WeatherKind, number>>>> = {
  swamp: { fog: 3.2, rain: 1.3, clear: 0.7 },
  corrupted: { fog: 2.4, storm: 1.6, rain: 1.2, clear: 0.6 },
  mountain: { storm: 3, rain: 1.3, fog: 1.3, clear: 0.8 },
  rocky: { storm: 1.5, clear: 1.2, fog: 0.6 },
  forest: { fog: 1.5, rain: 1.2 },
  shore: { fog: 1.6 },
  meadow: { clear: 1.2 },
  village: { clear: 1.15 },
};

/** Horas em que a névoa matinal fica mais provável (e o peso extra). */
export const MORNING_FOG = { from: 4.5, peak: 6.5, to: 9.5, weight: 2.4 };

export const WEATHER_TIMING = {
  /** Duração (s) de uma transição natural [mín, máx]. */
  transitionSeconds: [70, 150] as const,
  /** Clima e duração (min) do começo de um novo jogo — dá tempo de ver o mundo com sol. */
  firstWeather: 'clear' as WeatherKind,
  firstDurationMin: [9, 14] as const,
  /** A chuva começa depois que as nuvens se juntam (fração da transição) e para antes de abrir. */
  rainLagIn: 0.4,
  rainLeadOut: 0.6,
  /** Variação lenta da intensidade da chuva (pancadas), fração da intensidade. */
  showerVariation: 0.25,
};

/** Ciclo do sol, da lua e do eclipse. */
export const DAY_CYCLE = {
  sunrise: 6,
  sunset: 18,
  /** Inclinação da trajetória do sol para o sul (+Z) — 0 = passa no zênite. */
  sunTiltSouth: 0.5,
  /** A lua nasce ~`moonLagHours` depois do pôr do sol e avança `moonDriftPerDay` horas por dia (fases). */
  moonLagHours: 0.6,
  moonDriftPerDay: 0.8,
  moonTiltSouth: 0.35,
  /** Intensidades da luz direcional. */
  sunIntensity: 3.1,
  moonIntensity: 0.55,
  /** Polo celeste (estrelas giram em volta): ângulo de elevação ao norte (graus). */
  poleElevationDeg: 38,
};

/** Quadro-chave da paleta do céu/luz por hora (interpolado em ciclo). */
export interface SkyKey {
  hour: number;
  zenith: number;
  horizon: number;
  /** Cor da névoa / horizonte distante. */
  fog: number;
  /** Cor da luz do sol nessa hora. */
  sun: number;
  /** Brilho em volta do sol (dispersão). */
  glow: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  exposure: number;
}

export const SKY_KEYS: readonly SkyKey[] = [
  { hour: 0, zenith: 0x02040c, horizon: 0x0b1226, fog: 0x0b1222, sun: 0x9fb6ff, glow: 0x101830, hemiSky: 0x4a5c94, hemiGround: 0x161a24, hemiIntensity: 0.62, exposure: 1.3 },
  { hour: 4.6, zenith: 0x03060f, horizon: 0x101830, fog: 0x0e1626, sun: 0x9fb6ff, glow: 0x141c38, hemiSky: 0x4a5c94, hemiGround: 0x161a24, hemiIntensity: 0.6, exposure: 1.3 },
  { hour: 5.5, zenith: 0x141c46, horizon: 0x5a4266, fog: 0x3e3654, sun: 0xff8a5a, glow: 0x8a4a5a, hemiSky: 0x5a5a90, hemiGround: 0x241e26, hemiIntensity: 0.62, exposure: 1.2 },
  { hour: 6.25, zenith: 0x3c5a9c, horizon: 0xf0a072, fog: 0xc89a86, sun: 0xffa868, glow: 0xff9a5a, hemiSky: 0x8aa0d0, hemiGround: 0x4a3a30, hemiIntensity: 0.75, exposure: 1.05 },
  { hour: 7.4, zenith: 0x3f7bc4, horizon: 0xc6d6e6, fog: 0xb4c4d6, sun: 0xffe2bc, glow: 0xffd4a0, hemiSky: 0xa8c4ec, hemiGround: 0x5a5236, hemiIntensity: 0.88, exposure: 1.0 },
  { hour: 12, zenith: 0x2f6fc4, horizon: 0xb4d0ee, fog: 0xa6c0dc, sun: 0xfff3e2, glow: 0xfff0d8, hemiSky: 0xb4d0f4, hemiGround: 0x5a5a38, hemiIntensity: 0.95, exposure: 0.95 },
  { hour: 16.4, zenith: 0x3a74c0, horizon: 0xc8d4e0, fog: 0xb6c2d2, sun: 0xffe6c4, glow: 0xffd8a8, hemiSky: 0xacc4e8, hemiGround: 0x5a5236, hemiIntensity: 0.9, exposure: 0.98 },
  { hour: 17.7, zenith: 0x34569a, horizon: 0xf09056, fog: 0xc88a6e, sun: 0xff9a52, glow: 0xff8a40, hemiSky: 0x8a90c0, hemiGround: 0x4a3426, hemiIntensity: 0.78, exposure: 1.02 },
  { hour: 18.5, zenith: 0x1c2456, horizon: 0x8a4868, fog: 0x5a3e5c, sun: 0xff6a48, glow: 0xb04a5a, hemiSky: 0x5a5a92, hemiGround: 0x2a2028, hemiIntensity: 0.66, exposure: 1.15 },
  { hour: 19.4, zenith: 0x060a1e, horizon: 0x1e2442, fog: 0x161c32, sun: 0x9fb6ff, glow: 0x1c2040, hemiSky: 0x4a5c94, hemiGround: 0x181a24, hemiIntensity: 0.62, exposure: 1.28 },
];

/** O "Eclipse Arcano": anel rúnico/lua eclipsada sempre presente no céu do norte. */
export const ECLIPSE = {
  /** Azimute (graus; 0 = norte, 90 = leste) e elevação (graus). */
  azimuthDeg: -18,
  elevationDeg: 31,
  /** Oscilação lenta do azimute (graus) ao longo do dia. */
  wobbleDeg: 4,
  /** Raio angular do disco escuro (radianos). */
  radius: 0.075,
  /** Visibilidade de dia (fração da de noite). */
  dayVisibility: 0.42,
  /** Intensidade inicial (a história pode aumentar até 1.6 com setEclipse). */
  intensity: 1,
  coronaColor: 0x9a5cff,
  runeColor: 0x6ff6ff,
  /** Quantidade de runas no anel. */
  runes: 28,
};

export const CLOUDS = {
  /** Velocidade das nuvens (unidades de textura por s por unidade de vento). */
  speed: 0.0035,
  baseSpeed: 0.0012,
  /** Escala da projeção das nuvens no céu. */
  scale: 0.42,
  litColor: 0xffffff,
  shadowColor: 0x8a96a8,
  stormColor: 0x2c323c,
};

/** Vento: direção que gira devagar + rajadas. */
export const WIND = {
  /** Amplitude (rad) e frequência do ruído da deriva da direção. */
  dirWander: 1.3,
  dirWanderFreq: 0.004,
  /** Frequência das rajadas (Hz aproximado do ruído). */
  gustFreq: 0.11,
  /** Suavização da força base ao mudar de clima (1/s). */
  baseLambda: 0.5,
  max: 2,
};

/** Chuva na GPU em volta da câmera. */
export const RAIN = {
  /** Caixa (m) em volta da câmera: largura e altura. */
  boxWidth: 44,
  boxHeight: 26,
  fallSpeed: 11,
  /** Velocidade horizontal (m/s) por unidade de vento. */
  windSpeed: 4.2,
  dropLength: 0.75,
  dropWidth: 0.018,
  /** Respingos simultâneos no chão no preset 'high' (escala com q.rainDrops). */
  splashes: 110,
  splashRadius: 14,
  splashLife: 0.42,
  /** Intensidade mínima para considerar "chovendo" (isRaining). */
  rainingThreshold: 0.2,
};

/** Umidade das superfícies. */
export const WETNESS = {
  /** Por segundo, com chuva 1.0. */
  wetRate: 1 / 50,
  /** Secagem por segundo (de dia, sem chuva) e fator noturno. */
  dryRate: 1 / 260,
  nightDryFactor: 0.4,
};

/** Relâmpagos. */
export const LIGHTNING = {
  /** Distância (m) dos raios naturais [mín, máx] e chance de cair perto. */
  distance: [160, 900] as const,
  nearChance: 0.12,
  nearDistance: [55, 140] as const,
  /** Altura (m) da base das nuvens de onde o raio sai (acima do chão). */
  cloudHeight: 330,
  /** Velocidade do som (m/s), para o atraso do trovão. */
  soundSpeed: 343,
  /** Duração visível do raio (s). */
  boltLife: 0.5,
  /** Intervalo mínimo entre raios naturais (s). */
  minInterval: 3.5,
  /** Largura (m) do raio a 1 km da câmera (cresce com a distância para continuar visível). */
  widthPerKm: 5,
  minWidth: 0.35,
  segments: 22,
  branches: 4,
  color: 0xc8dcff,
  /** Raio perto do jogador sacode a câmera. */
  shakeDistance: 160,
};

/**
 * Névoa: FogExp2 com densidade = k / viewDistance (garante névoa total na borda
 * do terreno) × multiplicador do clima + extras do clima/bioma/horário.
 */
export const FOG = {
  k: 1.75,
  /** Ao voar alto a névoa de distância diminui um pouco (fração mínima). */
  altitudeRelief: 0.82,
  /** Suavização das mudanças de densidade/cor (1/s). */
  lambda: 0.45,
  /** Densidade extra por bioma em que o jogador está (névoa local). */
  biomeExtra: { swamp: 0.0065, corrupted: 0.0045, forest: 0.0006, shore: 0.0008 } as Partial<Record<BiomeId, number>>,
  /** Névoa matinal (extra) na floresta/margem/campos entre as horas de MORNING_FOG. */
  morningExtra: { forest: 0.0042, shore: 0.003, meadow: 0.0016, swamp: 0.002 } as Partial<Record<BiomeId, number>>,
  /** Névoa noturna leve nas baixadas. */
  nightExtra: { forest: 0.0012, swamp: 0.0015, shore: 0.001 } as Partial<Record<BiomeId, number>>,
  /** Tinta da névoa por bioma (mistura 0..1 com a cor). */
  tint: { swamp: [0x5c6a4a, 0.4], corrupted: [0x5a3a6e, 0.45] } as Partial<Record<BiomeId, readonly [number, number]>>,
  /** Interiores: névoa reduzida a esta fração. */
  indoorFactor: 0.35,
};

/** Névoa rasteira (sprites baratos) no pântano/floresta. */
export const GROUND_FOG = {
  /** Sprites no preset 'high' (escala com q.propDensity). */
  count: 56,
  cell: 16,
  radius: 120,
  size: [14, 26] as const,
  height: [1.2, 3.2] as const,
  /** Peso por bioma (probabilidade de a célula ter névoa) — swamp sempre, floresta de manhã. */
  biome: { swamp: 0.85, corrupted: 0.75, forest: 0.12, shore: 0.25 } as Partial<Record<BiomeId, number>>,
  morningBiome: { forest: 0.55, meadow: 0.22, shore: 0.5 } as Partial<Record<BiomeId, number>>,
  opacity: 0.32,
};

/** Sombras da luz direcional. */
export const SHADOWS = {
  /** A caixa avança na direção da câmera (fração de q.shadowDistance). */
  forwardShift: 0.25,
  /** Distância da luz até o centro (m). */
  lightDistance: 420,
  bias: -0.00035,
  /** normalBias por metro de texel. */
  normalBiasPerTexel: 0.9,
};

/** Pós-processamento (só com q.bloom). */
export const POST = {
  bloomStrength: 0.42,
  bloomStrengthNight: 0.62,
  bloomRadius: 0.55,
  bloomThreshold: 0.82,
  vignette: 0.28,
  /** Vinheta/tinta extra com corrupção máxima. */
  corruptionVignette: 0.32,
  corruptionTint: 0x7a3cff,
  corruptionTintAmount: 0.16,
  nightTint: 0x5a78c8,
  nightTintAmount: 0.08,
  saturation: 1.06,
  contrast: 1.04,
  /** Amostras de MSAA do alvo de renderização quando q.antialias. */
  msaaSamples: 4,
};

/** Rótulos de período do dia (UI). */
export const TIME_OF_DAY_LABELS: readonly { until: number; label: string }[] = [
  { until: 4.5, label: 'Madrugada' },
  { until: 7, label: 'Amanhecer' },
  { until: 11, label: 'Manhã' },
  { until: 13.5, label: 'Meio-dia' },
  { until: 17, label: 'Tarde' },
  { until: 19.5, label: 'Entardecer' },
  { until: 24, label: 'Noite' },
];
