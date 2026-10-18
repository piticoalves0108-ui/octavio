import { QUALITY_PRESETS, type QualityLevel, type QualityPreset } from '../data/quality';
import { DEFAULT_BINDINGS, type Action } from './Input';
import type { EventBus } from './EventBus';

export interface SettingsData {
  quality: QualityLevel;
  /** Sobrescritas individuais do preset (o usuário pode ajustar item a item). */
  overrides: Partial<QualityPreset>;
  /** 0 = sem limite (vsync do navegador). */
  fpsLimit: 0 | 30 | 60 | 90 | 120 | 144;
  fov: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  mouseSensitivity: number;
  invertY: boolean;
  cameraShake: boolean;
  showDamageNumbers: boolean;
  showMinimap: boolean;
  showFps: boolean;
  hudScale: number;
  /** Mostrar marcadores de objetivo (bússola/minimapa). */
  questMarkers: boolean;
  /** Pausar automaticamente ao perder o foco / ocultar a aba / perder o pointer lock. */
  pauseOnFocusLoss: boolean;
  bindings: Partial<Record<Action, string[]>>;
}

const KEY = 'eclipse-arcano:settings';

export const DEFAULT_SETTINGS: SettingsData = {
  quality: 'medium',
  overrides: {},
  fpsLimit: 0,
  fov: 70,
  masterVolume: 0.8,
  musicVolume: 0.6,
  sfxVolume: 0.8,
  ambientVolume: 0.7,
  mouseSensitivity: 1,
  invertY: false,
  cameraShake: true,
  showDamageNumbers: true,
  showMinimap: true,
  showFps: false,
  hudScale: 1,
  questMarkers: true,
  pauseOnFocusLoss: true,
  bindings: {},
};

/**
 * Configurações do jogador (persistidas separadamente do save).
 * `q` = preset efetivo (preset + overrides).
 */
export class Settings {
  data: SettingsData;
  q: QualityPreset;

  constructor(private events?: EventBus) {
    this.data = this.load();
    this.q = this.computeQuality();
  }

  private load(): SettingsData {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed, overrides: { ...(parsed.overrides ?? {}) }, bindings: { ...(parsed.bindings ?? {}) } };
      }
    } catch {
      /* armazenamento indisponível ou corrompido: usa padrão */
    }
    // Sugere qualidade inicial pelo hardware.
    const d = structuredClone(DEFAULT_SETTINGS);
    const cores = navigator.hardwareConcurrency ?? 4;
    d.quality = cores >= 8 ? 'high' : cores >= 4 ? 'medium' : 'low';
    return d;
  }

  private computeQuality(): QualityPreset {
    return { ...QUALITY_PRESETS[this.data.quality], ...this.data.overrides };
  }

  set<K extends keyof SettingsData>(key: K, value: SettingsData[K]) {
    this.data[key] = value;
    if (key === 'quality') this.data.overrides = {};
    this.q = this.computeQuality();
    this.persist();
    this.events?.emit('settings:changed', { key });
  }

  setOverride<K extends keyof QualityPreset>(key: K, value: QualityPreset[K]) {
    this.data.overrides[key] = value;
    this.q = this.computeQuality();
    this.persist();
    this.events?.emit('settings:changed', { key: String(key) });
  }

  bindingsFor(a: Action): string[] {
    return this.data.bindings[a] ?? DEFAULT_BINDINGS[a];
  }

  reset() {
    this.data = structuredClone(DEFAULT_SETTINGS);
    this.q = this.computeQuality();
    this.persist();
    this.events?.emit('settings:changed', {});
  }

  persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* ignora: modo privado etc. */
    }
  }
}
