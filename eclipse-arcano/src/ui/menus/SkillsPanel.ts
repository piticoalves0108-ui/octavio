/**
 * Habilidades: as magias de Kaelen (aprendidas ou não, rank, custo, recarga, efeitos,
 * atribuição aos atalhos 1–4) e a árvore de talentos em quatro ramos.
 * Clique numa magia e depois num atalho (ou tecle 1–4) para colocá-la ali.
 */
import type { GameContext } from '../../core/context';
import { ABILITIES, ABILITY_IDS, ULTIMATE_ID, MAX_RANK, abilityValue, type AbilityId } from '../../data/abilities';
import { TALENTS, TALENT_BRANCHES, TIER_POINTS, type TalentDef } from '../../data/talents';
import { el, htmlEl, fmtDec } from '../dom';
import { abilityIcon, hexToCss } from '../icons';
import { button, confirmBox, Tooltip, escapeHtml, type Panel } from './widgets';

export class SkillsPanel implements Panel {
  readonly el: HTMLElement;
  private mode: 'spells' | 'talents' = 'spells';
  private selected: AbilityId = 'arcaneOrb';
  private body: HTMLElement;
  private tabs: HTMLElement;
  private pointsEl: HTMLElement;
  private tip: Tooltip;
  private dirty = true;
  private offs: (() => void)[] = [];

  constructor(private ctx: GameContext) {
    this.el = el('div', 'ui-panel ui-skills');
    const head = el('div', 'ui-skills-head', this.el);
    this.tabs = el('div', 'ui-subtabs', head);
    for (const [id, label] of [
      ['spells', 'Magias'],
      ['talents', 'Talentos'],
    ] as const) {
      const b = el('button', 'ui-subtab', this.tabs, label);
      b.dataset.id = id;
      b.addEventListener('click', () => {
        this.mode = id;
        this.dirty = true;
      });
    }
    this.pointsEl = el('div', 'ui-skill-points', head);
    this.body = el('div', 'ui-skills-body', this.el);
    this.tip = new Tooltip(this.el);
  }

  /** Abre direto nos talentos (santuário). */
  showTalents() {
    this.mode = 'talents';
    this.dirty = true;
  }

  onOpen() {
    this.dirty = true;
    // no santuário (redistribuir talentos) abre direto na árvore
    if (this.ctx.sys.progression.nearShrine()) this.mode = 'talents';
    const mark = () => (this.dirty = true);
    this.offs.push(this.ctx.events.on('talent:unlocked', mark), this.ctx.events.on('ability:unlocked', mark), this.ctx.events.on('talent:respec', mark), this.ctx.events.on('level:up', mark));
  }

  onClose() {
    for (const off of this.offs.splice(0)) off();
    this.tip.hide();
  }

  update() {
    if (this.dirty) this.render();
  }

  private render() {
    this.dirty = false;
    for (const b of Array.from(this.tabs.children) as HTMLElement[]) b.classList.toggle('on', b.dataset.id === this.mode);
    const pts = this.ctx.sys.progression.skillPoints;
    this.pointsEl.innerHTML = pts > 0 ? `<b>${pts}</b> ponto${pts > 1 ? 's' : ''} de talento para gastar` : 'Nenhum ponto de talento livre';
    this.pointsEl.classList.toggle('has', pts > 0);
    this.body.innerHTML = '';
    if (this.mode === 'spells') this.renderSpells();
    else this.renderTalents();
  }

  // ---------------------------------------------------------------------------
  // Magias
  // ---------------------------------------------------------------------------

  private renderSpells() {
    const ab = this.ctx.sys.abilities;
    const wrap = el('div', 'ui-spells', this.body);
    const list = el('div', 'ui-spell-list', wrap);
    for (const id of ABILITY_IDS) {
      const def = ABILITIES[id];
      const unlocked = ab.isUnlocked(id);
      const row = el('div', `ui-spell${unlocked ? '' : ' locked'}${id === this.selected ? ' sel' : ''}`, list);
      row.style.setProperty('--ab', hexToCss(def.color));
      htmlEl('ui-spell-icon', abilityIcon(def.icon, def.color), row);
      const txt = el('div', 'ui-spell-txt', row);
      el('div', 'ui-spell-name', txt, def.name);
      el('div', 'ui-spell-sub', txt, unlocked ? `${def.category} · ${def.cost} de energia` : `Aprende no nível ${def.unlockLevel}`);
      const pips = el('div', 'ui-pips', row);
      for (let r = 1; r <= MAX_RANK; r++) el('span', r <= ab.rank(id) ? 'on' : '', pips);
      const slot = ab.slots.indexOf(id);
      if (slot >= 0) el('span', 'ui-spell-slot', row, String(slot + 1));
      if (id === ULTIMATE_ID && unlocked) el('span', 'ui-spell-slot ult', row, 'R');
      row.addEventListener('click', () => {
        this.selected = id;
        this.dirty = true;
      });
    }

    const det = el('div', 'ui-spell-detail', wrap);
    const def = ABILITIES[this.selected];
    const rank = Math.max(1, ab.rank(this.selected));
    const unlocked = ab.isUnlocked(this.selected);
    const top = el('div', 'ui-spell-dtop', det);
    htmlEl('ui-spell-bigicon', abilityIcon(def.icon, def.color), top);
    const names = el('div', '', top);
    el('div', 'ui-det-name', names, def.name).style.color = hexToCss(def.color);
    el('div', 'ui-det-cat', names, unlocked ? `Rank ${ab.rank(this.selected)} de ${MAX_RANK}` : `Bloqueada · nível ${def.unlockLevel}`);
    el('p', 'ui-det-desc', det, def.description);
    const facts = el('div', 'ui-facts', det);
    const fact = (k: string, v: string) => {
      const f = el('div', 'ui-fact', facts);
      el('span', '', f, k);
      el('b', '', f, v);
    };
    const dmg = abilityValue(def, 'damage', rank);
    const cd = abilityValue(def, 'cooldown', rank);
    const range = abilityValue(def, 'range', rank);
    const radius = abilityValue(def, 'radius', rank);
    if (def.cost) fact('Energia', String(def.cost));
    fact('Recarga', `${fmtDec(cd)} s`);
    if (dmg) fact('Dano base', String(Math.round(dmg)));
    if (range) fact('Alcance', `${Math.round(range)} m`);
    if (radius) fact('Raio', `${fmtDec(radius)} m`);
    fact('No ar', def.canFly ? 'Sim' : 'Não');
    if (def.statusText) el('p', 'ui-det-lore', det, def.statusText);
    const ranks = el('ol', 'ui-ranks', det);
    def.rankNotes.forEach((n, i) => el('li', i < ab.rank(this.selected) ? 'on' : '', ranks, n));
    const hint = el('p', 'ui-hint', det, 'Os ranks sobem com talentos (aba Talentos).');
    void hint;

    if (unlocked && this.selected !== ULTIMATE_ID) {
      el('div', 'ui-det-compare-title', det, 'Colocar no atalho');
      const slots = el('div', 'ui-slot-pick', det);
      for (let i = 0; i < 4; i++) {
        const cur = ab.slots[i];
        const b = el('button', `ui-slot-btn${cur === this.selected ? ' on' : ''}`, slots);
        el('span', 'k', b, String(i + 1));
        if (cur) b.insertAdjacentHTML('beforeend', abilityIcon(ABILITIES[cur as AbilityId].icon, ABILITIES[cur as AbilityId].color));
        b.title = cur ? ABILITIES[cur as AbilityId].name : 'Vazio';
        b.addEventListener('click', () => this.assign(i));
      }
    }
  }

  private assign(slot: number) {
    const ab = this.ctx.sys.abilities;
    if (!ab.isUnlocked(this.selected) || this.selected === ULTIMATE_ID) return;
    if (ab.slots[slot] === this.selected) ab.setSlot(slot, null);
    else ab.setSlot(slot, this.selected);
    this.ctx.sys.audio.play('equip');
    this.dirty = true;
  }

  // ---------------------------------------------------------------------------
  // Talentos
  // ---------------------------------------------------------------------------

  private renderTalents() {
    const pr = this.ctx.sys.progression;
    const tree = el('div', 'ui-tree', this.body);
    for (const br of TALENT_BRANCHES) {
      const col = el('div', 'ui-branch', tree);
      col.style.setProperty('--br', br.color);
      const head = el('div', 'ui-branch-head', col);
      el('div', 'ui-branch-glyph', head, br.glyph);
      const t = el('div', '', head);
      el('div', 'ui-branch-name', t, br.name);
      el('div', 'ui-branch-role', t, `${br.role} · ${pr.branchPoints(br.id)} pontos`);
      head.title = br.description;
      for (let tier = 0; tier < TIER_POINTS.length; tier++) {
        const row = el('div', 'ui-tier', col);
        el('span', 'ui-tier-req', row, String(TIER_POINTS[tier]));
        for (const tal of TALENTS.filter((x) => x.branch === br.id && x.tier === tier)) this.talentNode(row, tal);
      }
    }
    const foot = el('div', 'ui-tree-foot', this.body);
    const spent = pr.spentTalentPoints();
    el('span', '', foot, `Pontos gastos: ${spent}. O número à esquerda de cada linha é quantos pontos no ramo ela exige.`);
    if (spent > 0) {
      const can = pr.canRespec();
      const b = button(foot, `Redistribuir (${pr.respecCost()} de ouro)`, () => {
        confirmBox(this.el, `Devolver todos os ${spent} pontos de talento por ${pr.respecCost()} de ouro?`, 'Redistribuir', () => {
          pr.respec();
          this.dirty = true;
        });
      }, 'ghost small');
      if (!can) {
        b.disabled = true;
        b.title = 'Só no Santuário de Brumafria, com ouro suficiente.';
      }
    }
  }

  private talentNode(parent: HTMLElement, tal: TalentDef) {
    const pr = this.ctx.sys.progression;
    const rank = pr.talentRank(tal.id);
    const can = pr.canUnlockTalent(tal.id);
    const node = el('button', `ui-talent${rank > 0 ? ' has' : ''}${rank >= tal.maxRank ? ' max' : ''}${can ? ' can' : ''}`, parent);
    el('span', 'ui-talent-glyph', node, tal.glyph);
    el('span', 'ui-talent-rank', node, `${rank}/${tal.maxRank}`);
    node.addEventListener('mouseenter', (e) => this.showTalentTip(tal, e));
    node.addEventListener('mousemove', (e) => this.showTalentTip(tal, e));
    node.addEventListener('mouseleave', () => this.tip.hide());
    node.addEventListener('click', () => {
      if (pr.unlockTalent(tal.id)) {
        this.ctx.sys.audio.play('ui_click');
        this.dirty = true;
      } else this.ctx.sys.audio.play('ui_error');
    });
  }

  private showTalentTip(tal: TalentDef, e: MouseEvent) {
    const pr = this.ctx.sys.progression;
    const rank = pr.talentRank(tal.id);
    const block = pr.talentBlockText(tal.id);
    const req = tal.requires ? TALENTS.find((t) => t.id === tal.requires)?.name : null;
    this.tip.show(
      `<b>${escapeHtml(tal.name)}</b><span class="r">Rank ${rank}/${tal.maxRank}</span><p>${escapeHtml(tal.description)}</p>` +
        (req ? `<p class="req">Requer: ${escapeHtml(req)}</p>` : '') +
        (tal.levelReq ? `<p class="req">Nível ${tal.levelReq}</p>` : '') +
        (block && rank < tal.maxRank ? `<p class="no">${escapeHtml(block)}</p>` : rank < tal.maxRank ? '<p class="ok">Clique para aprender</p>' : ''),
      e.clientX,
      e.clientY,
    );
  }

  handleKey(code: string): boolean {
    if (this.mode === 'spells') {
      const m = /^Digit([1-4])$/.exec(code);
      if (m) {
        this.assign(Number(m[1]) - 1);
        return true;
      }
      const i = ABILITY_IDS.indexOf(this.selected);
      if (code === 'ArrowDown' || code === 'ArrowUp') {
        const n = (i + (code === 'ArrowDown' ? 1 : -1) + ABILITY_IDS.length) % ABILITY_IDS.length;
        this.selected = ABILITY_IDS[n];
        this.dirty = true;
        return true;
      }
    }
    if (code === 'ArrowLeft' || code === 'ArrowRight') {
      this.mode = this.mode === 'spells' ? 'talents' : 'spells';
      this.dirty = true;
      return true;
    }
    return false;
  }
}
