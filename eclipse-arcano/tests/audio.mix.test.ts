import { describe, it, expect } from 'vitest';
import { activeVoices, airCutoff, approach, chooseVoice, distanceGain, distanceWet, equalPower, pitchJitter, Rng, sliderToGain, thunderDelaySec, voiceScore, type VoiceSlotInfo } from '../src/audio/audioMath';
import { MUSIC, MUSIC_NOTE_LIMIT, REVERB_SPACES, SFX_DEFS, VOICE_LIMIT } from '../src/audio/data';
import { RECIPES } from '../src/audio/sfxRecipes';

const slot = (o: Partial<VoiceSlotInfo> = {}): VoiceSlotInfo => ({ busy: true, end: 10, start: 0, priority: 5, gain: 0.5, id: 'x', ...o });

describe('áudio — atenuação por distância', () => {
  it('ganho 1 até a referência, cai com a distância e zera no máximo', () => {
    expect(distanceGain(0, 4, 60)).toBeCloseTo(1, 9);
    expect(distanceGain(4, 4, 60)).toBeCloseTo(1, 9);
    let prev = 1;
    for (let d = 5; d < 60; d += 2.5) {
      const g = distanceGain(d, 4, 60);
      expect(g).toBeLessThan(prev);
      expect(g).toBeGreaterThanOrEqual(0);
      prev = g;
    }
    expect(distanceGain(60, 4, 60)).toBe(0);
    expect(distanceGain(1000, 4, 60)).toBe(0);
    expect(distanceGain(NaN, 4, 60)).toBe(0);
  });

  it('modelo inverso (rolloff) antes do desvanecimento final', () => {
    // em 2×ref com rolloff 1 → 0,5
    expect(distanceGain(8, 4, 1000)).toBeCloseTo(0.5, 9);
    // rolloff menor cai mais devagar (trovão)
    expect(distanceGain(600, 300, 6000, 0.35)).toBeGreaterThan(distanceGain(600, 300, 6000, 1));
  });

  it('ar tira agudos e aumenta o reverb com a distância', () => {
    expect(airCutoff(0)).toBe(20000);
    expect(airCutoff(200)).toBeLessThan(airCutoff(20));
    expect(airCutoff(1e6)).toBe(700);
    expect(distanceWet(2, 4)).toBe(0);
    expect(distanceWet(100, 4)).toBeGreaterThan(distanceWet(20, 4));
    expect(distanceWet(1e6, 4)).toBeLessThanOrEqual(0.5);
  });

  it('trovão: atraso pela velocidade do som', () => {
    expect(thunderDelaySec(343)).toBeCloseTo(1, 9);
    expect(thunderDelaySec(1715)).toBeCloseTo(5, 9);
    expect(thunderDelaySec(-5)).toBe(0);
  });
});

describe('áudio — limite de vozes e prioridade', () => {
  it('usa slot livre (inclusive vozes que já terminaram)', () => {
    const s = [slot(), slot({ busy: false }), slot()];
    expect(chooseVoice(s, 1, 'y', 5, 0.5, 4)).toBe(1);
    const t = [slot({ end: 0.5 }), slot()];
    expect(chooseVoice(t, 1, 'y', 5, 0.5, 4)).toBe(0);
  });

  it('limite de instâncias do mesmo id rouba a instância mais antiga', () => {
    const s = [slot({ id: 'a', start: 0.3 }), slot({ id: 'a', start: 0.1 }), slot({ busy: false })];
    expect(chooseVoice(s, 1, 'a', 5, 0.5, 2)).toBe(1);
    expect(chooseVoice(s, 1, 'a', 5, 0.5, 3)).toBe(2);
  });

  it('pool cheio: rouba a menos importante ou descarta', () => {
    const s = [slot({ priority: 9, id: 'boss' }), slot({ priority: 2, id: 'step' }), slot({ priority: 6, id: 'hit' })];
    expect(chooseVoice(s, 1, 'parry', 8, 0.8, 2)).toBe(1);
    // som pouco importante não rouba ninguém
    expect(chooseVoice(s, 1, 'step2', 1, 0.2, 4)).toBe(-1);
  });

  it('pontuação: prioridade e audibilidade sobem, idade desce', () => {
    expect(voiceScore(5, 1, 0)).toBeGreaterThan(voiceScore(5, 0.1, 0));
    expect(voiceScore(5, 0.5, 0)).toBeGreaterThan(voiceScore(5, 0.5, 3));
    expect(voiceScore(9, 0, 4)).toBeGreaterThan(voiceScore(5, 1, 0));
  });

  it('simulação: rajada de 200 sons nunca passa do limite', () => {
    const N = 20;
    const slots: VoiceSlotInfo[] = [];
    for (let i = 0; i < N; i++) slots.push(slot({ busy: false, end: 0 }));
    const rng = new Rng(9);
    let dropped = 0;
    let now = 0;
    for (let k = 0; k < 200; k++) {
      now += 0.01;
      const pr = rng.int(1, 9);
      const idx = chooseVoice(slots, now, 'id' + rng.int(0, 6), pr, rng.next(), 4);
      if (idx < 0) {
        dropped++;
        continue;
      }
      Object.assign(slots[idx], { busy: true, start: now, end: now + 0.5 + rng.next(), priority: pr, gain: 0.5, id: 'id' });
      expect(activeVoices(slots, now)).toBeLessThanOrEqual(N);
    }
    expect(dropped).toBeGreaterThanOrEqual(0);
  });
});

describe('áudio — conversões', () => {
  it('volume perceptual, crossfade de potência constante, aproximação', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(1)).toBe(1);
    expect(sliderToGain(0.5)).toBeCloseTo(0.25, 9);
    expect(sliderToGain(2)).toBe(1);
    const [a, b] = equalPower(0.5);
    expect(a * a + b * b).toBeCloseTo(1, 9);
    expect(approach(0, 1, 1e9, 1)).toBeCloseTo(1, 6);
    expect(approach(0, 1, 0.5, 0)).toBe(1);
    // independente do dt: dois passos de 0,1 = um de 0,2
    const two = approach(approach(0, 1, 0.1, 0.5), 1, 0.1, 0.5);
    expect(two).toBeCloseTo(approach(0, 1, 0.2, 0.5), 9);
    expect(pitchJitter(0.5, 2)).toBeCloseTo(1, 9);
    expect(pitchJitter(1, 12)).toBeCloseTo(2, 6);
  });
});

describe('áudio — catálogo de efeitos', () => {
  it('toda receita tem definição e vice-versa', () => {
    expect(Object.keys(RECIPES).sort()).toEqual(Object.keys(SFX_DEFS).sort());
    expect(Object.keys(SFX_DEFS).length).toBeGreaterThanOrEqual(66);
  });

  it('definições coerentes', () => {
    for (const [id, d] of Object.entries(SFX_DEFS)) {
      expect(d.priority, id).toBeGreaterThanOrEqual(0);
      expect(d.priority, id).toBeLessThanOrEqual(10);
      expect(d.gain, id).toBeGreaterThan(0);
      expect(d.gain, id).toBeLessThanOrEqual(1);
      expect(d.maxInstances, id).toBeGreaterThanOrEqual(1);
      if (d.positional) expect(d.max, id).toBeGreaterThan(d.ref);
      expect(d.reverb, id).toBeGreaterThanOrEqual(0);
      expect(d.reverb, id).toBeLessThanOrEqual(1);
    }
    // interface é 2D; impactos são posicionais
    expect(SFX_DEFS.ui_click.positional).toBe(false);
    expect(SFX_DEFS.hit_flesh.positional).toBe(true);
    expect(SFX_DEFS.thunder.max).toBeGreaterThan(3000);
  });

  it('limites por qualidade crescem e espaços de reverb existem', () => {
    expect(VOICE_LIMIT.low).toBeLessThan(VOICE_LIMIT.ultra);
    expect(MUSIC_NOTE_LIMIT.low).toBeLessThan(MUSIC_NOTE_LIMIT.ultra);
    expect(MUSIC_NOTE_LIMIT.ultra).toBeLessThanOrEqual(128);
    expect(REVERB_SPACES.crypt.hall).toBeGreaterThan(REVERB_SPACES.outdoor.hall);
    expect(REVERB_SPACES.indoor.room).toBeGreaterThan(REVERB_SPACES.outdoor.room);
    expect(MUSIC.lookahead).toBeGreaterThan(0.05);
  });
});
