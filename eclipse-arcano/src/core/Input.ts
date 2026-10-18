/**
 * Entrada de teclado e mouse com mapeamento de ações (remapeável).
 * Leitura por frame: `down(action)`, `pressed(action)` (borda de subida), `released(action)`.
 */
export type Action =
  | 'forward'
  | 'back'
  | 'left'
  | 'right'
  | 'jump' // pular / subir (voo)
  | 'descend' // descer (voo)
  | 'sprint' // correr / acelerar no voo
  | 'walk' // andar devagar
  | 'dodge'
  | 'fly' // alternar voo
  | 'attack' // LMB
  | 'block' // RMB (defender / escudo)
  | 'ability1'
  | 'ability2'
  | 'ability3'
  | 'ability4'
  | 'ultimate'
  | 'interact'
  | 'lockOn'
  | 'potion'
  | 'inventory'
  | 'skills'
  | 'journal'
  | 'map'
  | 'pause'
  | 'perf'
  | 'quicksave'
  | 'quickload';

export const DEFAULT_BINDINGS: Record<Action, string[]> = {
  forward: ['KeyW', 'ArrowUp'],
  back: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  jump: ['Space'],
  descend: ['KeyC', 'ControlLeft'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  walk: ['CapsLock'],
  dodge: ['KeyQ', 'AltLeft'],
  fly: ['KeyF'],
  attack: ['Mouse0'],
  block: ['Mouse2'],
  ability1: ['Digit1'],
  ability2: ['Digit2'],
  ability3: ['Digit3'],
  ability4: ['Digit4'],
  ultimate: ['KeyR'],
  interact: ['KeyE'],
  lockOn: ['Mouse1', 'Tab'],
  potion: ['KeyH'],
  inventory: ['KeyI'],
  skills: ['KeyK'],
  journal: ['KeyJ'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
  perf: ['F3'],
  quicksave: ['F5'],
  quickload: ['F9'],
};

export const ACTION_LABELS: Record<Action, string> = {
  forward: 'Frente',
  back: 'Trás',
  left: 'Esquerda',
  right: 'Direita',
  jump: 'Pular / Subir',
  descend: 'Descer (voo)',
  sprint: 'Correr / Acelerar',
  walk: 'Andar devagar',
  dodge: 'Esquivar',
  fly: 'Voar / Pousar',
  attack: 'Atacar',
  block: 'Defender',
  ability1: 'Habilidade 1',
  ability2: 'Habilidade 2',
  ability3: 'Habilidade 3',
  ability4: 'Habilidade 4',
  ultimate: 'Forma Ascendente',
  interact: 'Interagir',
  lockOn: 'Travar alvo',
  potion: 'Poção rápida',
  inventory: 'Inventário',
  skills: 'Habilidades',
  journal: 'Diário',
  map: 'Mapa',
  pause: 'Pausa',
  perf: 'Monitor de desempenho',
  quicksave: 'Salvamento rápido',
  quickload: 'Carregamento rápido',
};

export class Input {
  private keys = new Set<string>();
  private pressedThisFrame = new Set<string>();
  private releasedThisFrame = new Set<string>();
  bindings: Record<Action, string[]> = structuredClone(DEFAULT_BINDINGS);

  mouseDX = 0;
  mouseDY = 0;
  wheel = 0;
  sensitivity = 1;
  invertY = false;
  /** Quando false, o jogo ignora entrada de gameplay (menus abertos). */
  gameplayEnabled = true;
  pointerLocked = false;
  /** Última tecla pressionada (para tela de remapeamento). */
  lastCode: string | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('wheel', this.onWheel, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
    });
  }

  requestPointerLock() {
    if (document.pointerLockElement !== this.canvas) {
      try {
        const p = this.canvas.requestPointerLock() as unknown as Promise<void> | undefined;
        p?.catch?.(() => {});
      } catch {
        /* navegadores sem suporte / iframes sem permissão */
      }
    }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private onKeyDown = (e: KeyboardEvent) => {
    // Evita que Tab/F-keys/Espaço rolem a página ou troquem foco.
    if (['Tab', 'Space', 'F3', 'F5', 'F9', 'AltLeft', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    if (!this.keys.has(e.code)) this.pressedThisFrame.add(e.code);
    this.keys.add(e.code);
    this.lastCode = e.code;
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.releasedThisFrame.add(e.code);
  };
  private onBlur = () => {
    this.releaseAll();
  };

  /** Solta todas as teclas/botões (perda de foco, pointer lock perdido, troca de estado). */
  releaseAll() {
    for (const k of this.keys) this.releasedThisFrame.add(k);
    this.keys.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
  private onMouseDown = (e: MouseEvent) => {
    const code = `Mouse${e.button}`;
    if (!this.keys.has(code)) this.pressedThisFrame.add(code);
    this.keys.add(code);
    this.lastCode = code;
    if (this.gameplayEnabled && !this.pointerLocked) this.requestPointerLock();
  };
  private onMouseUp = (e: MouseEvent) => {
    const code = `Mouse${e.button}`;
    this.keys.delete(code);
    this.releasedThisFrame.add(code);
  };
  private onMouseMove = (e: MouseEvent) => {
    if (!this.pointerLocked) return;
    this.mouseDX += e.movementX;
    this.mouseDY += e.movementY;
  };
  private onWheel = (e: WheelEvent) => {
    this.wheel += Math.sign(e.deltaY);
  };

  /** Simula entrada (benchmark/testes automatizados). */
  simulate(code: string, isDown: boolean) {
    if (isDown) {
      if (!this.keys.has(code)) this.pressedThisFrame.add(code);
      this.keys.add(code);
    } else {
      this.keys.delete(code);
      this.releasedThisFrame.add(code);
    }
  }

  down(a: Action): boolean {
    if (!this.gameplayEnabled && !isMetaAction(a)) return false;
    for (const c of this.bindings[a]) if (this.keys.has(c)) return true;
    return false;
  }
  pressed(a: Action): boolean {
    if (!this.gameplayEnabled && !isMetaAction(a)) return false;
    for (const c of this.bindings[a]) if (this.pressedThisFrame.has(c)) return true;
    return false;
  }
  released(a: Action): boolean {
    for (const c of this.bindings[a]) if (this.releasedThisFrame.has(c)) return true;
    return false;
  }
  /** Eixo -1..1 entre duas ações. */
  axis(neg: Action, pos: Action): number {
    return (this.down(pos) ? 1 : 0) - (this.down(neg) ? 1 : 0);
  }

  /** Delta do mouse já escalado pela sensibilidade (radianos aproximados). */
  lookDelta(): { x: number; y: number } {
    if (!this.gameplayEnabled) return { x: 0, y: 0 };
    const s = 0.0022 * this.sensitivity;
    return { x: this.mouseDX * s, y: this.mouseDY * s * (this.invertY ? -1 : 1) };
  }

  setBinding(a: Action, codes: string[]) {
    this.bindings[a] = codes.slice();
  }

  /** Chamar no FIM de cada frame. */
  endFrame() {
    this.pressedThisFrame.clear();
    this.releasedThisFrame.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }
}

/** Ações que funcionam mesmo com gameplay desativado (menus). */
function isMetaAction(a: Action) {
  // quicksave/quickload: o SaveSystem decide em quais estados valem (F9 também na pausa e na tela de derrota)
  return a === 'pause' || a === 'inventory' || a === 'skills' || a === 'journal' || a === 'map' || a === 'perf' || a === 'interact' || a === 'quicksave' || a === 'quickload';
}
