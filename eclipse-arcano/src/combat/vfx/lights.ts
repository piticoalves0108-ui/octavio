import * as THREE from 'three';

/**
 * Pool fixo de luzes pontuais temporárias (q.maxDynamicLights). As luzes ficam SEMPRE na
 * cena (intensidade 0 quando livres) para o número de luzes nunca mudar — mudar a contagem
 * recompila todos os shaders da cena.
 */
interface Slot {
  light: THREE.PointLight;
  t: number;
  dur: number;
  peak: number;
  /** 0 = clarão (queda quadrática), 1 = sustentada (entra/sai suave). */
  mode: 0 | 1;
  follow: THREE.Object3D | null;
  /** Geração: muda a cada reutilização (invalida handles antigos). */
  gen: number;
}

export interface LightHandle {
  setPosition(p: THREE.Vector3): void;
  setIntensity(v: number): void;
  cancel(): void;
}

export class LightPool {
  private slots: Slot[] = [];
  private tmp = new THREE.Vector3();

  constructor(count: number, parent: THREE.Object3D) {
    for (let i = 0; i < count; i++) {
      const light = new THREE.PointLight(0xffffff, 0, 16, 2);
      light.name = `vfx-luz-${i}`;
      light.castShadow = false;
      parent.add(light);
      this.slots.push({ light, t: 0, dur: 0, peak: 0, mode: 0, follow: null, gen: 0 });
    }
  }

  get count() {
    return this.slots.length;
  }

  /** Escolhe um slot livre ou o que está mais perto de acabar/mais fraco. */
  private pick(priority: number): Slot | null {
    let best: Slot | null = null;
    let bestScore = Infinity;
    for (const s of this.slots) {
      if (s.dur <= 0) return s;
      const remain = s.mode === 1 ? 999 : (1 - s.t / s.dur) * s.peak;
      if (remain < bestScore) {
        bestScore = remain;
        best = s;
      }
    }
    // não rouba uma luz mais importante
    if (best && bestScore > priority) return null;
    return best;
  }

  /** Clarão: intensidade cai com o tempo. */
  flash(pos: THREE.Vector3, color: number, intensity: number, duration: number, distance = 14) {
    const s = this.pick(intensity);
    if (!s) return;
    s.light.position.copy(pos);
    s.light.color.setHex(color);
    s.light.distance = distance;
    s.t = 0;
    s.dur = Math.max(0.03, duration);
    s.peak = intensity;
    s.mode = 0;
    s.follow = null;
    s.gen++;
    s.light.intensity = intensity;
  }

  /** Luz sustentada (fenda, tempestade, projétil de fogo) com handle. */
  sustained(pos: THREE.Vector3, color: number, intensity: number, duration: number, distance = 14, follow: THREE.Object3D | null = null): LightHandle | null {
    const s = this.pick(intensity * 0.5);
    if (!s) return null;
    s.light.position.copy(pos);
    s.light.color.setHex(color);
    s.light.distance = distance;
    s.t = 0;
    s.dur = Math.max(0.05, duration);
    s.peak = intensity;
    s.mode = 1;
    s.follow = follow;
    s.gen++;
    s.light.intensity = 0;
    const slot = s;
    const gen = s.gen;
    const owns = () => slot.gen === gen && slot.dur > 0;
    return {
      setPosition(p: THREE.Vector3) {
        if (owns()) slot.light.position.copy(p);
      },
      setIntensity(v: number) {
        if (owns()) slot.peak = v;
      },
      cancel() {
        if (owns()) slot.t = Math.max(slot.t, slot.dur - 0.15);
      },
    };
  }

  update(dt: number) {
    for (const s of this.slots) {
      if (s.dur <= 0) continue;
      s.t += dt;
      if (s.t >= s.dur) {
        s.dur = 0;
        s.light.intensity = 0;
        s.follow = null;
        continue;
      }
      const k = s.t / s.dur;
      if (s.mode === 0) {
        const f = 1 - k;
        s.light.intensity = s.peak * f * f;
      } else {
        const fin = Math.min(1, s.t / 0.12);
        const fout = Math.min(1, (s.dur - s.t) / 0.25);
        s.light.intensity = s.peak * fin * fout;
        if (s.follow) s.light.position.copy(s.follow.getWorldPosition(this.tmp));
      }
    }
  }

  clear() {
    for (const s of this.slots) {
      s.dur = 0;
      s.light.intensity = 0;
      s.follow = null;
    }
  }

  active(): number {
    let n = 0;
    for (const s of this.slots) if (s.dur > 0) n++;
    return n;
  }
}
