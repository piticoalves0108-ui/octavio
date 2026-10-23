/**
 * Caixa de diálogo: nome do falante, texto que aparece aos poucos e respostas à direita
 * (postura de cada fala, opções importantes destacadas, opções já vistas esmaecidas,
 * bloqueadas com o motivo). Quando a única opção é "Continuar", aparece só a seta
 * piscando. Mouse: clique. Teclado: [E]/Espaço/Enter avança ou escolhe, setas ou
 * W/S trocam a opção, números escolhem direto.
 */
import type { GameContext } from '../core/context';
import type { DialogueView } from '../rpg/Dialogue';
import { el, show, toggleClass } from './dom';
import { TONE_INFO } from './icons';

const CHARS_PER_SECOND = 58;
const CONTINUE = 'Continuar';

export class DialogueBox {
  readonly root: HTMLElement;
  private nameEl: HTMLElement;
  private titleEl: HTMLElement;
  private textEl: HTMLElement;
  private nextEl: HTMLElement;
  private optionsEl: HTMLElement;
  private optionEls: HTMLElement[] = [];
  private view: DialogueView | null = null;
  private full = '';
  private shown = 0;
  private typing = false;
  private selected = 0;
  /** Evita que a mesma tecla que abriu a conversa já avance a primeira fala. */
  private grace = 0;

  constructor(private ctx: GameContext, parent: HTMLElement) {
    this.root = el('div', 'ui-dialogue', parent);
    const box = el('div', 'ui-dlg-box', this.root);
    const head = el('div', 'ui-dlg-head', box);
    this.nameEl = el('div', 'ui-dlg-name', head);
    this.titleEl = el('div', 'ui-dlg-title', head);
    this.textEl = el('div', 'ui-dlg-text', box);
    this.nextEl = el('div', 'ui-dlg-next', box, '▼');
    this.optionsEl = el('div', 'ui-dlg-options', this.root);
    box.addEventListener('click', () => this.advance());
  }

  get open(): boolean {
    return this.view !== null;
  }

  show(view: DialogueView | null) {
    this.view = view;
    if (!view) {
      this.root.classList.remove('in');
      this.optionsEl.innerHTML = '';
      this.optionEls = [];
      return;
    }
    this.root.classList.add('in');
    toggleClass(this.root, 'narration', !!view.narration);
    this.nameEl.textContent = view.speaker;
    this.titleEl.textContent = view.speakerTitle ?? '';
    show(this.titleEl, !!view.speakerTitle);
    this.full = view.text;
    this.shown = 0;
    this.typing = true;
    this.textEl.textContent = '';
    this.selected = Math.max(0, view.options.findIndex((o) => !o.disabled));
    this.optionsEl.innerHTML = '';
    this.optionEls = [];
    show(this.nextEl, false);
    this.grace = 0.15;
  }

  private onlyContinue(): boolean {
    const v = this.view;
    return !!v && v.options.length === 1 && v.options[0].text === CONTINUE;
  }

  private finishTyping() {
    this.typing = false;
    this.shown = this.full.length;
    this.textEl.textContent = this.full;
    this.buildOptions();
  }

  private buildOptions() {
    const v = this.view;
    if (!v) return;
    if (this.onlyContinue()) {
      show(this.nextEl, true);
      return;
    }
    this.optionsEl.innerHTML = '';
    this.optionEls = v.options.map((o, i) => {
      const b = el('button', 'ui-dlg-opt', this.optionsEl);
      const tone = o.tone ? TONE_INFO[o.tone] : null;
      const mark = el('span', 'ui-dlg-tone', b, tone ? tone.glyph : '◆');
      if (tone) {
        mark.style.color = tone.color;
        b.title = tone.label;
      }
      el('span', 'ui-dlg-num', b, String(i + 1));
      el('span', 'ui-dlg-opt-text', b, o.text);
      toggleClass(b, 'seen', !!o.seen);
      toggleClass(b, 'important', !!o.important);
      toggleClass(b, 'disabled', !!o.disabled);
      b.addEventListener('mouseenter', () => {
        if (!o.disabled) this.select(i);
      });
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.choose(i);
      });
      return b;
    });
    this.select(this.selected);
  }

  private select(i: number) {
    const v = this.view;
    if (!v || !v.options.length) return;
    this.selected = Math.max(0, Math.min(v.options.length - 1, i));
    this.optionEls.forEach((b, k) => toggleClass(b, 'sel', k === this.selected));
    if (this.optionEls.length) this.ctx.sys.audio.play('ui_hover');
  }

  private move(dir: number) {
    const v = this.view;
    if (!v) return;
    const n = v.options.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.selected + dir * k + n * 4) % n;
      if (!v.options[i].disabled) {
        this.select(i);
        return;
      }
    }
  }

  private choose(i: number) {
    const v = this.view;
    if (!v || this.typing) return;
    const o = v.options[i];
    if (!o || o.disabled) {
      this.ctx.sys.audio.play('ui_error');
      return;
    }
    this.ctx.sys.audio.play('ui_click');
    this.ctx.sys.dialogue.choose(o.index);
  }

  /** Clique na caixa ou [E]: completa o texto ou avança. */
  private advance() {
    if (!this.view) return;
    if (this.typing) {
      this.finishTyping();
      return;
    }
    if (this.onlyContinue()) this.choose(0);
    else this.choose(this.selected);
  }

  update(dt: number) {
    if (!this.view) return;
    if (this.typing) {
      this.shown = Math.min(this.full.length, this.shown + dt * CHARS_PER_SECOND);
      const n = Math.floor(this.shown);
      if (this.textEl.textContent!.length !== n) this.textEl.textContent = this.full.slice(0, n);
      if (n >= this.full.length) this.finishTyping();
    }
    if (this.grace > 0) {
      this.grace -= dt;
      return;
    }
    const input = this.ctx.input;
    if (input.pressed('interact') || input.pressedCode('Space') || input.pressedCode('Enter') || input.pressedCode('NumpadEnter')) {
      input.consume('interact');
      this.advance();
      return;
    }
    if (this.typing) return;
    if (input.pressedCode('ArrowDown') || input.pressedCode('KeyS')) this.move(1);
    if (input.pressedCode('ArrowUp') || input.pressedCode('KeyW')) this.move(-1);
    for (let i = 0; i < 9; i++) {
      if (input.pressedCode(`Digit${i + 1}`) || input.pressedCode(`Numpad${i + 1}`)) {
        if (this.view && i < this.view.options.length && !this.onlyContinue()) this.choose(i);
        return;
      }
    }
  }
}
