import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { StoryValue } from '../core/EventBus';

/**
 * Estado narrativo: flags e escolhas importantes. Diálogos, missões e NPCs
 * consultam/alteram isto. Ex.: story.get('poupou_lider_corvos') === true.
 */
export class Story implements GameSystem, Saveable {
  readonly name = 'story';
  readonly saveKey = 'story';
  private flags = new Map<string, StoryValue>();
  /** Registro de escolhas marcantes (para epílogo/diário). */
  choices: { id: string; value: StoryValue; day: number }[] = [];
  private ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  get(key: string): StoryValue | undefined {
    return this.flags.get(key);
  }
  is(key: string): boolean {
    return !!this.flags.get(key);
  }
  num(key: string): number {
    const v = this.flags.get(key);
    return typeof v === 'number' ? v : 0;
  }
  set(key: string, value: StoryValue = true) {
    if (this.flags.get(key) === value) return;
    this.flags.set(key, value);
    this.ctx?.events.emit('story:flag', { key, value });
  }
  inc(key: string, n = 1) {
    this.set(key, this.num(key) + n);
  }
  /** Registra uma escolha importante e também define a flag `choice:<id>`. */
  choose(id: string, value: StoryValue) {
    this.choices.push({ id, value, day: this.ctx?.clock.day ?? 1 });
    this.set(`choice:${id}`, value);
  }

  onNewGame() {
    this.flags.clear();
    this.choices = [];
  }

  serialize() {
    return { flags: Object.fromEntries(this.flags), choices: this.choices };
  }

  deserialize(data: any) {
    this.flags.clear();
    if (data?.flags && typeof data.flags === 'object') {
      for (const [k, v] of Object.entries(data.flags)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') this.flags.set(k, v);
      }
    }
    this.choices = Array.isArray(data?.choices) ? data.choices.filter((c: any) => typeof c?.id === 'string') : [];
  }
}
