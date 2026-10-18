import { describe, it, expect } from 'vitest';
import { bassToneIndex, chooseMusicState, chordTones, degreeToMidi, hitVelocity, isChordDegree, midiToHz, nextBoundary, planLead, validateStyle, voiceChord, type MusicInputs } from '../src/audio/musicLogic';
import { MODES, MUSIC_STYLES, barSeconds, stepSeconds, stepsPerBar } from '../src/audio/musicStyles';
import { Rng } from '../src/audio/audioMath';
import type { MusicState } from '../src/core/EventBus';

const base = (o: Partial<MusicInputs> = {}): MusicInputs => ({
  gameState: 'playing',
  forced: null,
  hint: null,
  inCombat: false,
  bossActive: false,
  victoryLeft: 0,
  combatLinger: 0,
  locationKind: null,
  tavern: false,
  night: 0,
  ...o,
});

describe('áudio — escolha do estado musical', () => {
  it('menu, boot e carregamento', () => {
    expect(chooseMusicState(base({ gameState: 'menu' }), 'silence')).toBe('menu');
    expect(chooseMusicState(base({ gameState: 'menu', inCombat: true }), 'combat')).toBe('menu');
    expect(chooseMusicState(base({ gameState: 'boot' }), 'menu')).toBe('silence');
    expect(chooseMusicState(base({ gameState: 'loading' }), 'menu')).toBe('silence');
  });

  it('exploração por padrão; combate e chefe têm prioridade', () => {
    expect(chooseMusicState(base(), 'silence')).toBe('explore');
    expect(chooseMusicState(base({ inCombat: true }), 'explore')).toBe('combat');
    expect(chooseMusicState(base({ inCombat: true, bossActive: true }), 'combat')).toBe('boss');
    expect(chooseMusicState(base({ hint: 'boss' }), 'explore')).toBe('boss');
  });

  it('combate persiste (linger) e responde à dica da IA', () => {
    expect(chooseMusicState(base({ combatLinger: 2 }), 'combat')).toBe('combat');
    expect(chooseMusicState(base({ hint: 'combat' }), 'explore')).toBe('combat');
    expect(chooseMusicState(base({ combatLinger: 0 }), 'combat')).toBe('explore');
  });

  it('vitória acima do combate; forçado acima de tudo no jogo; morte = silêncio', () => {
    expect(chooseMusicState(base({ victoryLeft: 3, inCombat: true }), 'boss')).toBe('victory');
    expect(chooseMusicState(base({ forced: 'silence', inCombat: true }), 'combat')).toBe('silence');
    expect(chooseMusicState(base({ forced: 'village' }), 'explore')).toBe('village');
    expect(chooseMusicState(base({ gameState: 'dead', inCombat: true }), 'combat')).toBe('silence');
  });

  it('vila de dia, noite na vila tarde; taverna sempre folk', () => {
    expect(chooseMusicState(base({ locationKind: 'settlement', night: 0 }), 'explore')).toBe('village');
    expect(chooseMusicState(base({ locationKind: 'settlement', night: 0.7 }), 'village')).toBe('village');
    expect(chooseMusicState(base({ locationKind: 'settlement', night: 0.95 }), 'village')).toBe('night');
    expect(chooseMusicState(base({ tavern: true, night: 1 }), 'night')).toBe('village');
  });

  it('cripta/ruínas usam o estilo misterioso', () => {
    expect(chooseMusicState(base({ locationKind: 'dungeon' }), 'explore')).toBe('night');
    expect(chooseMusicState(base({ locationKind: 'ruins' }), 'explore')).toBe('night');
    expect(chooseMusicState(base({ locationKind: 'camp' }), 'explore')).toBe('explore');
  });

  it('histerese da noite (entra 0,65, sai 0,4)', () => {
    expect(chooseMusicState(base({ night: 0.5 }), 'explore')).toBe('explore');
    expect(chooseMusicState(base({ night: 0.7 }), 'explore')).toBe('night');
    expect(chooseMusicState(base({ night: 0.5 }), 'night')).toBe('night');
    expect(chooseMusicState(base({ night: 0.3 }), 'night')).toBe('explore');
  });

  it('dicas de silêncio/vila/noite valem fora do combate', () => {
    expect(chooseMusicState(base({ hint: 'silence' }), 'explore')).toBe('silence');
    expect(chooseMusicState(base({ hint: 'night', inCombat: true }), 'explore')).toBe('combat');
  });
});

describe('áudio — teoria musical', () => {
  it('graus → MIDI atravessando oitavas', () => {
    const ion = MODES.ionian;
    expect(degreeToMidi(60, ion, 0)).toBe(60);
    expect(degreeToMidi(60, ion, 2)).toBe(64);
    expect(degreeToMidi(60, ion, 7)).toBe(72);
    expect(degreeToMidi(60, ion, -1)).toBe(59);
    expect(degreeToMidi(60, ion, -7)).toBe(48);
    expect(midiToHz(69)).toBeCloseTo(440, 6);
    expect(midiToHz(81)).toBeCloseTo(880, 6);
  });

  it('acordes em terças no modo', () => {
    expect(chordTones(60, MODES.ionian, 0, 3)).toEqual([60, 64, 67]);
    expect(chordTones(60, MODES.ionian, 4, 4)).toEqual([67, 71, 74, 77]);
    expect(chordTones(62, MODES.aeolian, 0, 3)).toEqual([62, 65, 69]);
    expect(isChordDegree(2, 0)).toBe(true);
    expect(isChordDegree(3, 0)).toBe(false);
    expect(isChordDegree(-3, 0)).toBe(true); // 4 abaixo = quinta da oitava de baixo
  });

  it('condução de vozes mantém o acorde numa oitava', () => {
    const v = voiceChord([67, 71, 74, 77], 60);
    expect(v).toEqual([62, 65, 67, 71]);
    for (const m of v) expect(m >= 60 && m < 72).toBe(true);
  });

  it('caracteres de padrão', () => {
    expect(hitVelocity('x')).toBe(1);
    expect(hitVelocity('o')).toBeGreaterThan(0);
    expect(hitVelocity('.')).toBe(0);
    expect(bassToneIndex('1')).toBe(0);
    expect(bassToneIndex('5')).toBe(2);
    expect(bassToneIndex('8')).toBe(4);
    expect(bassToneIndex('.')).toBe(-1);
  });
});

describe('áudio — estilos musicais', () => {
  const states = Object.keys(MUSIC_STYLES) as Exclude<MusicState, 'silence'>[];

  it('todos os estados (exceto silêncio) têm estilo', () => {
    expect(states.sort()).toEqual(['boss', 'combat', 'explore', 'menu', 'night', 'victory', 'village']);
  });

  it('padrões com o comprimento do compasso e graus válidos', () => {
    for (const s of states) expect(validateStyle(MUSIC_STYLES[s])).toEqual([]);
  });

  it('caráter: chefe mais rápido que combate, que é mais rápido que exploração; noite a mais lenta', () => {
    const bpm = (s: Exclude<MusicState, 'silence'>) => MUSIC_STYLES[s].bpm;
    expect(bpm('boss')).toBeGreaterThan(bpm('combat'));
    expect(bpm('combat')).toBeGreaterThan(bpm('explore'));
    for (const s of states) if (s !== 'night') expect(bpm('night')).toBeLessThanOrEqual(bpm(s));
    expect(MUSIC_STYLES.boss.choir).toBeTruthy();
    expect(MUSIC_STYLES.combat.drums?.some((d) => d.kind === 'kick')).toBe(true);
    expect(MUSIC_STYLES.explore.drums?.some((d) => d.kind === 'kick')).toBeFalsy();
    expect(MUSIC_STYLES.victory.oneShotBars).toBeGreaterThan(0);
  });

  it('combate/chefe entram rápido; estilos calmos com crossfade longo', () => {
    expect(MUSIC_STYLES.combat.urgent).toBe(true);
    expect(MUSIC_STYLES.boss.urgent).toBe(true);
    expect(MUSIC_STYLES.combat.fadeIn).toBeLessThan(1);
    expect(MUSIC_STYLES.explore.fadeIn).toBeGreaterThanOrEqual(2);
    expect(MUSIC_STYLES.night.xfade).toBeGreaterThanOrEqual(2);
  });

  it('durações de passo/compasso', () => {
    const c = MUSIC_STYLES.combat;
    expect(stepsPerBar(c)).toBe(16);
    expect(stepSeconds(c) * 16).toBeCloseTo(barSeconds(c), 9);
    const v = MUSIC_STYLES.village;
    expect(stepsPerBar(v)).toBe(6);
    expect(barSeconds(v)).toBeCloseTo(1.2, 6);
  });
});

describe('áudio — melodia gerativa', () => {
  it('notas dentro da faixa, primeira posição sempre toca, determinística pela semente', () => {
    for (const id of ['menu', 'explore', 'village', 'night', 'combat', 'boss'] as const) {
      const s = MUSIC_STYLES[id];
      const spb = stepsPerBar(s);
      const notes = new Float32Array(spb);
      const lens = new Uint8Array(spb);
      const rng = new Rng(42);
      let prev = NaN;
      let played = 0;
      let rests = 0;
      for (let bar = 0; bar < 200; bar++) {
        const chord = s.progressions[0][bar % s.progressions[0].length];
        prev = planLead(s, rng, chord, prev, notes, lens);
        let n = 0;
        for (let k = 0; k < spb; k++) {
          const d = notes[k];
          if (d !== d) continue;
          n++;
          expect(d).toBeGreaterThanOrEqual(s.lead!.range[0]);
          expect(d).toBeLessThanOrEqual(s.lead!.range[1]);
          expect(lens[k]).toBeGreaterThan(0);
          // tempos fortes caem na nota do acorde na maioria das vezes
        }
        if (n === 0) rests++;
        played += n;
      }
      expect(played).toBeGreaterThan(100);
      // respiros existem, mas não dominam
      expect(rests).toBeGreaterThan(0);
      expect(rests).toBeLessThan(150);
    }
    const s = MUSIC_STYLES.explore;
    const a = new Float32Array(16);
    const b = new Float32Array(16);
    const la = new Uint8Array(16);
    const lb = new Uint8Array(16);
    planLead(s, new Rng(7), 0, NaN, a, la);
    planLead(s, new Rng(7), 0, NaN, b, lb);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('notas em tempo forte tendem às notas do acorde', () => {
    const s = MUSIC_STYLES.combat;
    const notes = new Float32Array(16);
    const lens = new Uint8Array(16);
    const rng = new Rng(3);
    let strong = 0;
    let inChord = 0;
    let prev = NaN;
    for (let bar = 0; bar < 300; bar++) {
      prev = planLead(s, rng, 0, prev, notes, lens);
      for (let k = 0; k < 16; k += 4) {
        const d = notes[k];
        if (d !== d) continue;
        strong++;
        if (isChordDegree(d, 0)) inChord++;
      }
    }
    expect(strong).toBeGreaterThan(50);
    expect(inChord / strong).toBeGreaterThan(0.75);
  });
});

describe('áudio — quantização das transições', () => {
  it('próximo compasso', () => {
    // 120 bpm, 4/4 → compasso de 2 s começando em t0 = 1
    expect(nextBoundary(1.5, 1, 0.5, 4, 5, false)).toBeCloseTo(3, 9);
    expect(nextBoundary(3, 1, 0.5, 4, 5, false)).toBeCloseTo(3, 9);
    expect(nextBoundary(3.01, 1, 0.5, 4, 5, false)).toBeCloseTo(5, 9);
    // antes do início da grade → o próprio início
    expect(nextBoundary(0.2, 1, 0.5, 4, 5, false)).toBeCloseTo(1, 9);
  });

  it('cai para a próxima batida quando o compasso está longe e é urgente', () => {
    expect(nextBoundary(1.6, 1, 0.5, 4, 0.8, true)).toBeCloseTo(2, 9);
    expect(nextBoundary(2.6, 1, 0.5, 4, 0.8, true)).toBeCloseTo(3, 9); // compasso a 0,4 s
    expect(nextBoundary(1.6, 1, 0.5, 4, 0.8, false)).toBeCloseTo(3, 9);
  });
});
