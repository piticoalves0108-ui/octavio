/** Componentes reutilizados pelos menus (botões com som, controles, confirmação). */
import type { GameContext } from '../../core/context';
import { el } from '../dom';

export interface Panel {
  readonly el: HTMLElement;
  onOpen?(): void;
  onClose?(): void;
  update?(dt: number): void;
  /** Devolve true se consumiu a tecla. */
  handleKey?(code: string): boolean;
}

let audioCtx: GameContext | null = null;
export function setWidgetContext(ctx: GameContext) {
  audioCtx = ctx;
}

export function sfx(id: 'ui_click' | 'ui_hover' | 'ui_error' | 'ui_open' | 'ui_close') {
  try {
    audioCtx?.sys.audio.play(id);
  } catch {
    /* sem áudio */
  }
}

export function button(parent: HTMLElement, text: string, onClick: () => void, cls = ''): HTMLButtonElement {
  const b = el('button', `ui-btn ${cls}`.trim(), parent, text);
  b.addEventListener('mouseenter', () => {
    if (!b.disabled) sfx('ui_hover');
  });
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    if (b.disabled) {
      sfx('ui_error');
      return;
    }
    sfx('ui_click');
    onClick();
  });
  return b;
}

export function slider(parent: HTMLElement, label: string, value: number, min: number, max: number, step: number, fmt: (v: number) => string, onChange: (v: number) => void) {
  const row = el('label', 'ui-row', parent);
  el('span', 'ui-row-label', row, label);
  const input = el('input', 'ui-slider', row);
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  const out = el('span', 'ui-row-value', row, fmt(value));
  const paint = () => {
    const p = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty('--p', `${p}%`);
  };
  paint();
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = fmt(v);
    paint();
    onChange(v);
  });
  return row;
}

export function toggle(parent: HTMLElement, label: string, value: boolean, onChange: (v: boolean) => void) {
  const row = el('div', 'ui-row', parent);
  el('span', 'ui-row-label', row, label);
  const b = el('button', `ui-toggle${value ? ' on' : ''}`, row);
  el('span', 'knob', b);
  el('span', 'ui-row-value', row, value ? 'Ligado' : 'Desligado');
  b.addEventListener('click', () => {
    value = !value;
    b.classList.toggle('on', value);
    (row.lastChild as HTMLElement).textContent = value ? 'Ligado' : 'Desligado';
    sfx('ui_click');
    onChange(value);
  });
  return row;
}

export function select<T extends string | number>(parent: HTMLElement, label: string, value: T, options: { value: T; label: string }[], onChange: (v: T) => void) {
  const row = el('div', 'ui-row', parent);
  el('span', 'ui-row-label', row, label);
  const box = el('div', 'ui-choice', row);
  const left = el('button', 'ui-choice-arrow', box, '‹');
  const text = el('span', 'ui-choice-text', box);
  const right = el('button', 'ui-choice-arrow', box, '›');
  let i = Math.max(0, options.findIndex((o) => o.value === value));
  const paint = () => (text.textContent = options[i].label);
  paint();
  const step = (d: number) => {
    i = (i + d + options.length) % options.length;
    paint();
    sfx('ui_click');
    onChange(options[i].value);
  };
  left.addEventListener('click', () => step(-1));
  right.addEventListener('click', () => step(1));
  return row;
}

export function heading(parent: HTMLElement, text: string) {
  return el('h3', 'ui-heading', parent, text);
}

/** Janela de confirmação simples sobre o menu. */
export function confirmBox(parent: HTMLElement, text: string, yes: string, onYes: () => void, no = 'Cancelar') {
  const back = el('div', 'ui-modal', parent);
  const box = el('div', 'ui-modal-box', back);
  el('p', '', box, text);
  const row = el('div', 'ui-modal-row', box);
  button(row, no, () => back.remove(), 'ghost');
  button(row, yes, () => {
    back.remove();
    onYes();
  }, 'primary');
  back.addEventListener('click', (e) => {
    if (e.target === back) back.remove();
  });
  return back;
}

/** Caixa de dica (tooltip) que segue o mouse. */
export class Tooltip {
  readonly el: HTMLElement;
  constructor(parent: HTMLElement) {
    this.el = el('div', 'ui-tooltip', parent);
    this.hide();
  }
  show(html: string, x: number, y: number) {
    this.el.innerHTML = html;
    this.el.style.display = 'block';
    const r = this.el.getBoundingClientRect();
    const px = Math.min(innerWidth - r.width - 12, x + 18);
    const py = Math.min(innerHeight - r.height - 12, y + 12);
    this.el.style.left = `${Math.max(8, px)}px`;
    this.el.style.top = `${Math.max(8, py)}px`;
  }
  hide() {
    this.el.style.display = 'none';
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
