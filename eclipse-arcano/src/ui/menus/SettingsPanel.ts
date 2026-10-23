/**
 * Opções: gráficos, áudio, controles (com remapeamento de teclas) e interface.
 * Tudo é salvo na hora (Settings persiste no navegador).
 */
import type { GameContext } from '../../core/context';
import { ACTION_LABELS, DEFAULT_BINDINGS, type Action } from '../../core/Input';
import type { QualityLevel } from '../../data/quality';
import { el, keyLabel, fmtDec } from '../dom';
import { button, confirmBox, heading, select, slider, toggle, type Panel } from './widgets';

const SECTIONS = [
  ['graphics', 'Gráficos'],
  ['audio', 'Áudio'],
  ['controls', 'Controles'],
  ['interface', 'Interface'],
] as const;
type Section = (typeof SECTIONS)[number][0];

const REBIND: Action[] = ['forward', 'back', 'left', 'right', 'jump', 'descend', 'sprint', 'walk', 'dodge', 'fly', 'attack', 'block', 'ability1', 'ability2', 'ability3', 'ability4', 'ultimate', 'interact', 'lockOn', 'potion', 'inventory', 'skills', 'journal', 'map', 'quicksave', 'quickload'];

export class SettingsPanel implements Panel {
  readonly el: HTMLElement;
  private nav: HTMLElement;
  private body: HTMLElement;
  private section: Section = 'graphics';
  private waiting: Action | null = null;
  private waitEl: HTMLElement | null = null;

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-settings');
    this.nav = el('div', 'ui-settings-nav', this.el);
    for (const [id, label] of SECTIONS) {
      const b = el('button', 'ui-subtab', this.nav, label);
      b.dataset.id = id;
      b.addEventListener('click', () => {
        this.section = id;
        this.render();
      });
    }
    const reset = el('div', 'ui-settings-reset', this.nav);
    button(reset, 'Restaurar padrões', () => {
      confirmBox(this.el, 'Voltar todas as opções ao padrão?', 'Restaurar', () => {
        ctx.settings.reset();
        for (const a of Object.keys(DEFAULT_BINDINGS) as Action[]) ctx.input.setBinding(a, DEFAULT_BINDINGS[a]);
        this.render();
      });
    }, 'ghost small');
    this.body = el('div', 'ui-settings-body', this.el);
  }

  onOpen() {
    this.waiting = null;
    this.render();
  }

  onClose() {
    this.waiting = null;
  }

  private render() {
    for (const b of Array.from(this.nav.querySelectorAll('.ui-subtab')) as HTMLElement[]) b.classList.toggle('on', b.dataset.id === this.section);
    this.body.innerHTML = '';
    const s = this.ctx.settings;
    const d = s.data;
    const b = this.body;
    if (this.section === 'graphics') {
      heading(b, 'Qualidade');
      select<QualityLevel>(b, 'Predefinição', d.quality, [
        { value: 'low', label: 'Baixa' },
        { value: 'medium', label: 'Média' },
        { value: 'high', label: 'Alta' },
        { value: 'ultra', label: 'Ultra' },
      ], (v) => {
        s.set('quality', v);
        this.ctx.sys.ui.notify('Algumas mudanças (sombras, grama) aparecem por completo depois de reiniciar o jogo.', 'info');
      });
      select(b, 'Limite de FPS', d.fpsLimit, [
        { value: 0, label: 'Sem limite' },
        { value: 30, label: '30' },
        { value: 60, label: '60' },
        { value: 90, label: '90' },
        { value: 120, label: '120' },
        { value: 144, label: '144' },
      ], (v) => s.set('fpsLimit', v as 0));
      slider(b, 'Campo de visão', d.fov, 55, 100, 1, (v) => `${v}°`, (v) => s.set('fov', v));
      toggle(b, 'Tremor de câmera', d.cameraShake, (v) => s.set('cameraShake', v));
      toggle(b, 'Mostrar FPS e desempenho', d.showFps, (v) => s.set('showFps', v));
    } else if (this.section === 'audio') {
      heading(b, 'Volume');
      const pct = (v: number) => `${Math.round(v * 100)}%`;
      slider(b, 'Geral', d.masterVolume, 0, 1, 0.01, pct, (v) => s.set('masterVolume', v));
      slider(b, 'Música', d.musicVolume, 0, 1, 0.01, pct, (v) => s.set('musicVolume', v));
      slider(b, 'Efeitos', d.sfxVolume, 0, 1, 0.01, pct, (v) => s.set('sfxVolume', v));
      slider(b, 'Ambiente', d.ambientVolume, 0, 1, 0.01, pct, (v) => s.set('ambientVolume', v));
    } else if (this.section === 'controls') {
      heading(b, 'Mouse');
      slider(b, 'Sensibilidade', d.mouseSensitivity, 0.2, 3, 0.05, (v) => fmtDec(v, 2), (v) => s.set('mouseSensitivity', v));
      toggle(b, 'Inverter eixo vertical', d.invertY, (v) => s.set('invertY', v));
      heading(b, 'Teclas');
      el('p', 'ui-hint', b, 'Clique numa tecla e aperte a nova (ou clique com o mouse). Esc cancela.');
      const grid = el('div', 'ui-binds', b);
      for (const a of REBIND) {
        const row = el('div', 'ui-bind', grid);
        el('span', 'ui-bind-label', row, ACTION_LABELS[a]);
        const codes = this.ctx.input.bindings[a];
        const btn = el('button', `ui-bind-key${this.waiting === a ? ' wait' : ''}`, row, this.waiting === a ? 'Aperte…' : codes.map(keyLabel).join(' / '));
        btn.addEventListener('mousedown', (e) => {
          if (this.waiting === a && e.button >= 0) {
            e.preventDefault();
            this.applyBinding(a, `Mouse${e.button}`);
          }
        });
        btn.addEventListener('click', () => {
          if (this.waiting === a) return;
          this.waiting = a;
          this.waitEl = btn;
          btn.textContent = 'Aperte…';
          btn.classList.add('wait');
        });
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    } else {
      heading(b, 'Interface');
      slider(b, 'Tamanho da interface', d.hudScale, 0.75, 1.4, 0.05, (v) => `${Math.round(v * 100)}%`, (v) => s.set('hudScale', v));
      toggle(b, 'Minimapa', d.showMinimap, (v) => s.set('showMinimap', v));
      toggle(b, 'Marcadores de missão', d.questMarkers, (v) => s.set('questMarkers', v));
      toggle(b, 'Números de dano', d.showDamageNumbers, (v) => s.set('showDamageNumbers', v));
      toggle(b, 'Pausar ao sair da janela', d.pauseOnFocusLoss, (v) => s.set('pauseOnFocusLoss', v));
    }
  }

  private applyBinding(a: Action, code: string) {
    const input = this.ctx.input;
    const cur = input.bindings[a];
    // a nova tecla vira a principal; a segunda é mantida (setas etc.)
    const next = [code, ...cur.slice(1).filter((c) => c !== code)].slice(0, 2);
    // tira a tecla de outras ações para não haver conflito
    for (const other of Object.keys(input.bindings) as Action[]) {
      if (other === a || other === 'pause' || other === 'perf') continue;
      if (input.bindings[other].includes(code)) {
        const rest = input.bindings[other].filter((c) => c !== code);
        input.setBinding(other, rest);
        this.ctx.settings.data.bindings[other] = rest;
      }
    }
    input.setBinding(a, next);
    this.ctx.settings.data.bindings[a] = next;
    this.ctx.settings.set('bindings', { ...this.ctx.settings.data.bindings });
    this.waiting = null;
    this.waitEl = null;
    this.render();
  }

  handleKey(code: string): boolean {
    if (!this.waiting) return false;
    if (code === 'Escape') {
      this.waiting = null;
      this.render();
      return true;
    }
    this.applyBinding(this.waiting, code);
    return true;
  }

  /** Enquanto espera uma tecla, o menu não deve fechar com ela. */
  get capturing(): boolean {
    return this.waiting !== null;
  }
}
