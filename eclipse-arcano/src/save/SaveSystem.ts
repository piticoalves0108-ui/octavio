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

export interface SaveFile {
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

/** Migração de uma versão do formato para a seguinte (`version` → `version + 1`). */
export type SaveMigration = (f: SaveFile) => SaveFile;

/** Migrações de versões antigas do formato (chave = versão de origem). */
export const MIGRATIONS: Record<number, SaveMigration> = {
  // 1: (f) => ({ ...f, version: 2, data: { ...f.data, novoSistema: {} } }),
};

/**
 * Aplica as migrações em sequência até `target`. Retorna null se faltar um passo,
 * se uma migração não avançar a versão ou se o arquivo for de uma versão futura.
 */
export function migrateSaveFile(f: SaveFile, migrations: Record<number, SaveMigration> = MIGRATIONS, target = SAVE_VERSION): SaveFile | null {
  let cur = f;
  let guard = 0;
  while (cur.version < target) {
    const m = migrations[cur.version];
    if (!m || guard++ > 64) return null;
    const next = m(cur);
    if (!next || typeof next.version !== 'number' || next.version <= cur.version || typeof next.data !== 'object' || !next.data) return null;
    cur = next;
  }
  return cur.version === target ? cur : null;
}

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
  /** De onde veio o último load bem-sucedido ('main' = arquivo principal, 'bak' = backup). */
  lastLoadSource: 'main' | 'bak' | null = null;
  /** Sistemas cujo serialize falhou no último save (o save segue sem eles). */
  lastSerializeErrors: string[] = [];
  private version: number;
  private migrations: Record<number, SaveMigration>;

  constructor(public storage: SaveStorage = localStorageBackend, opts: { version?: number; migrations?: Record<number, SaveMigration> } = {}) {
    this.version = opts.version ?? SAVE_VERSION;
    this.migrations = opts.migrations ?? MIGRATIONS;
  }

  /** Chaves registradas (diagnóstico/testes). */
  get registeredKeys(): string[] {
    return this.saveables.map((s) => s.saveKey);
  }

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
    // F5: só jogando e com o jogador vivo (não grava um mago morto com 0 de vida)
    if (ctx.input.pressed('quicksave') && ctx.state === 'playing') {
      if (ctx.sys.player?.state !== 'dead') this.save('quick');
      else ctx.events.emit('ui:notify', { text: 'Não é possível salvar agora.', kind: 'warning' });
    }
    // F9: jogando, na pausa ou na tela de derrota
    if (ctx.input.pressed('quickload') && (ctx.state === 'playing' || ctx.state === 'paused' || ctx.state === 'dead') && this.hasSave('quick')) void ctx.continueGame('quick');
  }

  private canAutosave() {
    const s = this.ctx.sys;
    return this.ctx.state === 'playing' && s.player.state !== 'dead' && !s.ai.inCombat() && !s.ai.activeBoss();
  }

  serializeAll(): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    this.lastSerializeErrors = [];
    for (const s of this.saveables) {
      try {
        const v = s.serialize();
        // cópia profunda (o snapshot não pode compartilhar referências com o estado vivo)
        data[s.saveKey] = v === undefined ? undefined : JSON.parse(JSON.stringify(v));
      } catch (err) {
        // um sistema com erro não impede o save dos outros (ao carregar, ele fica no padrão)
        this.lastSerializeErrors.push(s.saveKey);
        console.error(`[Save] erro ao serializar ${s.saveKey}`, err);
      }
    }
    data.__save = { playTime: this.playTime };
    return data;
  }

  /** Metadados do slot; cada campo é opcional (módulos em construção não derrubam o save). */
  private buildMeta(slot: string, auto: boolean): SaveMeta {
    const s = this.ctx?.sys;
    const safe = <T>(fn: () => T, def: T): T => {
      try {
        const v = fn();
        return v ?? def;
      } catch {
        return def;
      }
    };
    return {
      slot,
      timestamp: Date.now(),
      playTime: this.playTime,
      level: safe(() => Number(s.progression.level) || 1, 1),
      location: safe(() => s.world.currentLocation?.name ?? 'Terras selvagens', 'Terras selvagens'),
      quest: safe(() => (s.quests.tracked ? (s.quests.getJournal().find((j) => j.id === s.quests.tracked)?.title ?? '') : ''), ''),
      auto,
    };
  }

  save(slot = 'slot1', auto = false): boolean {
    const key = PREFIX + slot;
    try {
      const data = this.serializeAll();
      const dataJson = JSON.stringify(data);
      const meta = this.buildMeta(slot, auto);
      const file: SaveFile = { version: this.version, meta, data, checksum: checksum(dataJson) };
      const json = JSON.stringify(file);
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
      try {
        this.storage.remove(key + '.tmp');
      } catch {
        /* armazenamento indisponível */
      }
      this.ctx?.events.emit('ui:notify', { text: 'Não foi possível salvar o jogo.', kind: 'warning' });
      return false;
    }
  }

  private readFile(key: string): SaveFile | null {
    let raw: string | null = null;
    try {
      raw = this.storage.get(key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const f = JSON.parse(raw) as SaveFile;
      if (typeof f?.version !== 'number' || typeof f.data !== 'object' || !f.data) return null;
      if (checksum(JSON.stringify(f.data)) !== f.checksum) {
        console.warn('[Save] checksum inválido em', key);
        return null;
      }
      if (f.version > this.version) return null; // save de uma versão mais nova do jogo
      const m = migrateSaveFile(f, this.migrations, this.version);
      if (!m) return null;
      if (typeof m.meta !== 'object' || !m.meta) m.meta = { slot: key.slice(PREFIX.length), timestamp: 0, playTime: 0, level: 1, location: '', quest: '', auto: false };
      return m;
    } catch {
      return null;
    }
  }

  /** O slot tem um save legível (principal ou backup) com checksum e versão válidos? */
  isLoadable(slot = 'slot1'): boolean {
    const key = PREFIX + slot;
    return this.readFile(key) !== null || this.readFile(key + '.bak') !== null;
  }

  /**
   * Lê e aplica um save. Não muda o estado do jogo (Game.continueGame faz isso).
   * Transacional: se algum sistema rejeitar os dados, restaura o estado anterior e,
   * se o principal falhar, tenta o backup (`.bak`).
   */
  load(slot = 'slot1'): boolean {
    const key = PREFIX + slot;
    const main = this.readFile(key);
    const bak = this.readFile(key + '.bak');
    const candidates: { file: SaveFile; src: 'main' | 'bak' }[] = [];
    if (main) candidates.push({ file: main, src: 'main' });
    if (bak) candidates.push({ file: bak, src: 'bak' });
    if (!candidates.length) {
      this.lastError = 'Save inexistente ou corrompido.';
      return false;
    }
    const snapshot = this.serializeAll();
    let lastErr: unknown = null;
    for (const { file, src } of candidates) {
      try {
        this.applyData(file.data);
        this.playTime = Number((file.data.__save as { playTime?: number } | undefined)?.playTime) || file.meta.playTime || 0;
        this.sinceAutosave = 0;
        this.autosavePending = false;
        this.lastLoadSource = src;
        this.lastError = null;
        if (src === 'bak') this.ctx?.events.emit('ui:notify', { text: 'Save principal corrompido — backup restaurado.', kind: 'warning' });
        this.ctx?.events.emit('game:loaded', { slot });
        return true;
      } catch (err) {
        lastErr = err;
        console.error(`[Save] dados inválidos (${src}), restaurando estado anterior`, err);
        this.rollback(snapshot);
      }
    }
    this.lastError = String((lastErr as Error)?.message ?? lastErr);
    return false;
  }

  /**
   * Reaplica um snapshot de `serializeAll()` (ex.: o estado de antes de um F9 que falhou).
   * Sistema a sistema: um erro não impede a restauração dos demais.
   */
  restoreSnapshot(snapshot: Record<string, unknown>) {
    this.rollback(snapshot);
    const pt = Number((snapshot.__save as { playTime?: number } | undefined)?.playTime);
    if (isFinite(pt)) this.playTime = pt;
  }

  /** Restaura o snapshot sistema a sistema (um erro não impede a restauração dos demais). */
  private rollback(snapshot: Record<string, unknown>) {
    for (const s of this.saveables) {
      if (snapshot[s.saveKey] === undefined) continue;
      try {
        s.deserialize(snapshot[s.saveKey], this.ctx);
      } catch (e2) {
        console.error(`[Save] falha ao restaurar ${s.saveKey}`, e2);
      }
    }
    this.refreshPlayer();
  }

  private applyData(data: Record<string, unknown>) {
    for (const s of this.saveables) {
      if (data[s.saveKey] === undefined) continue; // sistema novo: mantém padrão
      s.deserialize(data[s.saveKey], this.ctx);
    }
    this.refreshPlayer();
  }

  private refreshPlayer() {
    try {
      this.ctx?.sys?.player?.refreshStats();
    } catch (err) {
      console.error('[Save] refreshStats', err);
    }
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
