import type { GameContext, GameSystem, Saveable } from '../core/context';

export const SAVE_VERSION = 1;
const PREFIX = 'eclipse-arcano:save:';

export interface SaveMeta {
  slot: string;
  timestamp: number;
  playTime: number;
  level: number;
  location: string;
  quest: string;
  auto: boolean;
}

interface SaveFile {
  version: number;
  meta: SaveMeta;
  data: Record<string, unknown>;
  checksum: string;
}

/** Armazenamento abstrato (localStorage no navegador; pode ser trocado por arquivo no desktop). */
export interface SaveStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export const localStorageBackend: SaveStorage = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  remove: (k) => localStorage.removeItem(k),
  keys: () => Object.keys(localStorage),
};

export function memoryStorage(): SaveStorage {
  const m = new Map<string, string>();
  return { get: (k) => m.get(k) ?? null, set: (k, v) => void m.set(k, v), remove: (k) => void m.delete(k), keys: () => [...m.keys()] };
}

/** FNV-1a 32 bits (detecção de corrupção, não segurança). */
export function checksum(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Migrações de versões antigas do formato. */
const MIGRATIONS: Record<number, (f: SaveFile) => SaveFile> = {
  // 1: (f) => ({ ...f, version: 2, data: { ...f.data, novoSistema: {} } }),
};

/**
 * Salvamento seguro:
 * - grava em `slot.tmp`, valida a leitura, move o save anterior para `slot.bak` e só então grava `slot`;
 * - checksum + versão + migrações;
 * - ao carregar, se o save principal estiver corrompido, usa o backup;
 * - aplica os dados de forma transacional: se algum sistema rejeitar os dados, restaura o estado anterior.
 */
export class SaveSystem implements GameSystem {
  readonly name = 'save';
  alwaysUpdate = true;
  private saveables: Saveable[] = [];
  playTime = 0;
  lastError: string | null = null;
  private ctx!: GameContext;
  private sinceAutosave = 0;
  private autosavePending = false;
  autosaveIntervalSec = 300;

  constructor(public storage: SaveStorage = localStorageBackend) {}

  init(ctx: GameContext) {
    this.ctx = ctx;
    const request = () => (this.autosavePending = true);
    ctx.events.on('quest:completed', request);
    ctx.events.on('boss:defeated', request);
    ctx.events.on('location:discovered', request);
    ctx.events.on('level:up', request);
  }

  register(s: Saveable) {
    if (this.saveables.some((x) => x.saveKey === s.saveKey)) throw new Error(`saveKey duplicado: ${s.saveKey}`);
    this.saveables.push(s);
  }

  update(dt: number, ctx: GameContext) {
    if (ctx.state === 'playing') {
      this.playTime += dt;
      this.sinceAutosave += dt;
      if ((this.autosavePending && this.sinceAutosave > 20) || this.sinceAutosave > this.autosaveIntervalSec) {
        if (this.canAutosave()) {
          this.save('auto', true);
          this.autosavePending = false;
        }
      }
    }
    if (ctx.input.pressed('quicksave') && ctx.state === 'playing') this.save('quick');
    if (ctx.input.pressed('quickload') && (ctx.state === 'playing' || ctx.state === 'paused') && this.hasSave('quick')) void ctx.continueGame('quick');
  }

  private canAutosave() {
    const s = this.ctx.sys;
    return this.ctx.state === 'playing' && s.player.state !== 'dead' && !s.ai.inCombat() && !s.ai.activeBoss();
  }

  serializeAll(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const s of this.saveables) data[s.saveKey] = s.serialize();
    data.__save = { playTime: this.playTime };
    return data;
  }

  save(slot = 'slot1', auto = false): boolean {
    try {
      const data = this.serializeAll();
      const dataJson = JSON.stringify(data);
      const s = this.ctx.sys;
      const tracked = s.quests.tracked ? s.quests.getJournal().find((j) => j.id === s.quests.tracked)?.title ?? '' : '';
      const meta: SaveMeta = {
        slot,
        timestamp: Date.now(),
        playTime: this.playTime,
        level: s.progression.level,
        location: s.world.currentLocation?.name ?? 'Terras selvagens',
        quest: tracked,
        auto,
      };
      const file: SaveFile = { version: SAVE_VERSION, meta, data, checksum: checksum(dataJson) };
      const json = JSON.stringify(file);
      const key = PREFIX + slot;
      this.storage.set(key + '.tmp', json);
      // valida o que foi gravado
      const back = this.storage.get(key + '.tmp');
      if (back !== json) throw new Error('falha ao verificar gravação');
      const prev = this.storage.get(key);
      if (prev) this.storage.set(key + '.bak', prev);
      this.storage.set(key, json);
      this.storage.remove(key + '.tmp');
      this.sinceAutosave = 0;
      this.lastError = null;
      this.ctx.events.emit('game:saved', { slot, auto });
      return true;
    } catch (err) {
      this.lastError = String((err as Error)?.message ?? err);
      console.error('[Save] erro ao salvar', err);
      this.ctx.events.emit('ui:notify', { text: 'Não foi possível salvar o jogo.', kind: 'warning' });
      return false;
    }
  }

  private readFile(key: string): SaveFile | null {
    const raw = this.storage.get(key);
    if (!raw) return null;
    try {
      let f = JSON.parse(raw) as SaveFile;
      if (typeof f?.version !== 'number' || typeof f.data !== 'object' || !f.data) return null;
      if (checksum(JSON.stringify(f.data)) !== f.checksum) {
        console.warn('[Save] checksum inválido em', key);
        return null;
      }
      while (f.version < SAVE_VERSION) {
        const m = MIGRATIONS[f.version];
        if (!m) return null;
        f = m(f);
      }
      if (f.version > SAVE_VERSION) return null;
      return f;
    } catch {
      return null;
    }
  }

  /** Lê e aplica um save. Não muda o estado do jogo (Game.continueGame faz isso). */
  load(slot = 'slot1'): boolean {
    const key = PREFIX + slot;
    let file = this.readFile(key);
    if (!file) {
      file = this.readFile(key + '.bak');
      if (file) this.ctx.events.emit('ui:notify', { text: 'Save principal corrompido — backup restaurado.', kind: 'warning' });
    }
    if (!file) {
      this.lastError = 'Save inexistente ou corrompido.';
      return false;
    }
    const snapshot = this.serializeAll();
    try {
      this.applyData(file.data);
      this.playTime = Number((file.data.__save as any)?.playTime) || file.meta.playTime || 0;
      this.ctx.events.emit('game:loaded', { slot });
      this.lastError = null;
      return true;
    } catch (err) {
      console.error('[Save] dados inválidos, restaurando estado anterior', err);
      this.lastError = String((err as Error)?.message ?? err);
      try {
        this.applyData(snapshot);
      } catch (e2) {
        console.error('[Save] falha ao restaurar estado anterior', e2);
      }
      return false;
    }
  }

  private applyData(data: Record<string, unknown>) {
    for (const s of this.saveables) {
      if (data[s.saveKey] === undefined) continue; // sistema novo: mantém padrão
      s.deserialize(data[s.saveKey], this.ctx);
    }
    this.ctx.sys.player.refreshStats();
  }

  hasSave(slot?: string): boolean {
    if (slot) return this.storage.get(PREFIX + slot) !== null;
    return this.listSaves().length > 0;
  }

  /** Lista saves (mais recente primeiro). */
  listSaves(): SaveMeta[] {
    const out: SaveMeta[] = [];
    for (const k of this.storage.keys()) {
      if (!k.startsWith(PREFIX) || k.endsWith('.bak') || k.endsWith('.tmp')) continue;
      const f = this.readFile(k);
      if (f) out.push(f.meta);
    }
    return out.sort((a, b) => b.timestamp - a.timestamp);
  }

  /** Slot mais recente (para "Continuar"). */
  latestSlot(): string | null {
    return this.listSaves()[0]?.slot ?? null;
  }

  deleteSave(slot: string) {
    const key = PREFIX + slot;
    this.storage.remove(key);
    this.storage.remove(key + '.bak');
    this.storage.remove(key + '.tmp');
  }

  onNewGame() {
    this.playTime = 0;
    this.sinceAutosave = 0;
    this.autosavePending = false;
  }
}
