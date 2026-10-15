import type { GameContext, GameSystem, Saveable } from './context';

/**
 * Relógio do mundo. 1 dia de jogo = `dayLengthMinutes` minutos reais (padrão 24).
 * `hours` vai de 0 a 24. Emite 'time:hour' a cada hora cheia.
 */
export class WorldClock implements GameSystem, Saveable {
  readonly name = 'clock';
  readonly saveKey = 'clock';
  day = 1;
  hours = 8.5; // começa de manhã
  dayLengthMinutes = 24;
  paused = false;
  private lastHour = Math.floor(this.hours);
  private ctx!: GameContext;

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  get hoursPerSecond() {
    return 24 / (this.dayLengthMinutes * 60);
  }

  /** 0 = meia-noite, 0.25 = 6h, 0.5 = meio-dia... */
  get dayFraction() {
    return this.hours / 24;
  }

  isNight() {
    return this.hours < 5.5 || this.hours > 19.5;
  }

  update(dt: number) {
    if (this.paused) return;
    this.advance(dt * this.hoursPerSecond);
  }

  /** Avança o tempo em horas de jogo (ex.: descansar na taverna). */
  advance(hours: number) {
    this.hours += hours;
    while (this.hours >= 24) {
      this.hours -= 24;
      this.day++;
    }
    const h = Math.floor(this.hours);
    if (h !== this.lastHour) {
      this.lastHour = h;
      this.ctx?.events.emit('time:hour', { hour: h, day: this.day });
    }
  }

  setTime(hours: number) {
    this.hours = ((hours % 24) + 24) % 24;
    this.lastHour = Math.floor(this.hours);
  }

  onNewGame() {
    this.day = 1;
    this.setTime(8.5);
  }

  serialize() {
    return { day: this.day, hours: this.hours };
  }

  deserialize(data: any) {
    if (typeof data?.day === 'number' && data.day >= 1) this.day = Math.floor(data.day);
    if (typeof data?.hours === 'number' && data.hours >= 0 && data.hours < 24) this.setTime(data.hours);
  }
}
