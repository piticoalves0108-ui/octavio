/**
 * HUD do jogo: vida e energia (canto superior esquerdo), nível e XP, efeitos ativos,
 * barra de magias com recargas (embaixo, no centro), Carga Arcana, poção rápida,
 * arma equipada, roda de energia ao lado do personagem (aparece só quando a energia
 * está sendo gasta, como a roda de vigor), mira e barra de conjuração.
 */
import type { GameContext } from '../core/context';
import { ABILITIES, ULTIMATE, type AbilityId } from '../data/abilities';
import { ITEMS } from '../data/items';
import { el, htmlEl, setText, setStyle, show, toggleClass, projectToScreen, keyLabel, fmtDec } from './dom';
import { abilityIcon, itemIcon, hexToCss, heartIcon } from './icons';
import type { StatusId } from '../combat/Health';

const STATUS_INFO: Record<StatusId, { name: string; glyph: string; bad: boolean }> = {
  slow: { name: 'Lentidão', glyph: '≈', bad: true },
  timeSlow: { name: 'Tempo lento', glyph: '⌛', bad: true },
  stun: { name: 'Atordoado', glyph: '✶', bad: true },
  root: { name: 'Preso', glyph: '⛓', bad: true },
  burn: { name: 'Queimando', glyph: '🔥', bad: true },
  shock: { name: 'Eletrizado', glyph: 'ϟ', bad: true },
  bleed: { name: 'Sangrando', glyph: '✚', bad: true },
  vulnerable: { name: 'Vulnerável', glyph: '⚠', bad: true },
  empowered: { name: 'Fortalecido', glyph: '▲', bad: false },
  overheated: { name: 'Superaquecido', glyph: '♨', bad: true },
};

const SCREEN = { x: 0, y: 0, z: 0 };

interface SlotEls {
  root: HTMLElement;
  icon: HTMLElement;
  sweep: HTMLElement;
  key: HTMLElement;
  cd: HTMLElement;
  id: string | null;
}

export class Hud {
  readonly root: HTMLElement;
  private ctx: GameContext;

  // vitais
  private hpFill!: HTMLElement;
  private hpGhost!: HTMLElement;
  private hpShield!: HTMLElement;
  private hpText!: HTMLElement;
  private enFill!: HTMLElement;
  private enText!: HTMLElement;
  private lvl!: HTMLElement;
  private xpFill!: HTMLElement;
  private points!: HTMLElement;
  private effects!: HTMLElement;
  private effectKey = '';
  private ghost = 1;
  private lastHp = -1;
  private vignette!: HTMLElement;
  private hurtFlash!: HTMLElement;
  private hurtT = 0;

  // magias
  private slots: SlotEls[] = [];
  private ult!: SlotEls;
  private ultRing!: HTMLElement;
  private potion!: SlotEls;
  private potionCount!: HTMLElement;
  private weapon!: HTMLElement;
  private weaponId: string | null = '§';

  // roda de energia
  private wheel!: HTMLElement;
  private wheelArc!: SVGCircleElement;
  private wheelAlpha = 0;
  private wheelFullT = 0;

  // mira e conjuração
  private reticle!: HTMLElement;
  private castBar!: HTMLElement;
  private castFill!: HTMLElement;
  private castName!: HTMLElement;

  // dicas de controle
  private hints!: HTMLElement;
  private hintKey = '';

  constructor(ctx: GameContext, parent: HTMLElement) {
    this.ctx = ctx;
    this.root = el('div', 'hud', parent);
    this.buildVitals();
    this.buildAbilities();
    this.buildWheel();
    this.buildReticle();
    this.hints = el('div', 'hud-hints', this.root);
    this.vignette = el('div', 'hud-vignette', this.root);
    this.hurtFlash = el('div', 'hud-hurt', this.root);
    ctx.events.on('damage', ({ target, result }) => {
      if (target === ctx.sys.player.entity && result.dealt > 0) this.hurtT = Math.min(1, 0.35 + result.dealt / Math.max(1, ctx.sys.player.health.max) * 3);
    });
    ctx.events.on('ability:fail', ({ abilityId, reason }) => this.flashSlot(abilityId, reason));
  }

  // ---------------------------------------------------------------------------
  // Construção
  // ---------------------------------------------------------------------------

  private buildVitals() {
    const box = el('div', 'hud-vitals', this.root);
    const top = el('div', 'hud-vitals-top', box);
    this.lvl = el('div', 'hud-level', top, '1');
    const bars = el('div', 'hud-bars', top);

    const hp = el('div', 'hud-bar hud-hp', bars);
    htmlEl('hud-bar-icon', heartIcon(), hp);
    const hpTrack = el('div', 'hud-bar-track', hp);
    this.hpGhost = el('div', 'hud-bar-ghost', hpTrack);
    this.hpFill = el('div', 'hud-bar-fill', hpTrack);
    this.hpShield = el('div', 'hud-bar-shield', hpTrack);
    el('div', 'hud-bar-ticks', hpTrack);
    this.hpText = el('div', 'hud-bar-text', hp);

    const en = el('div', 'hud-bar hud-en', bars);
    htmlEl('hud-bar-icon', abilityIcon('orb', 0x58d8ff), en);
    const enTrack = el('div', 'hud-bar-track', en);
    this.enFill = el('div', 'hud-bar-fill', enTrack);
    el('div', 'hud-bar-ticks', enTrack);
    this.enText = el('div', 'hud-bar-text', en);

    const xp = el('div', 'hud-xp', box);
    this.xpFill = el('div', 'hud-xp-fill', xp);
    this.points = el('div', 'hud-points', box);
    this.effects = el('div', 'hud-effects', box);
  }

  private makeSlot(parent: HTMLElement, cls: string, key: string): SlotEls {
    const root = el('div', `hud-slot ${cls}`, parent);
    const icon = el('div', 'hud-slot-icon', root);
    const sweep = el('div', 'hud-slot-sweep', root);
    const cd = el('div', 'hud-slot-cd', root);
    const k = el('div', 'hud-slot-key', root, key);
    return { root, icon, sweep, key: k, cd, id: '§' };
  }

  private buildAbilities() {
    const bar = el('div', 'hud-abilities', this.root);
    this.weapon = el('div', 'hud-weapon', bar);
    const group = el('div', 'hud-slot-group', bar);
    for (let i = 0; i < 4; i++) this.slots.push(this.makeSlot(group, '', String(i + 1)));
    this.ult = this.makeSlot(bar, 'hud-ult', 'R');
    this.ultRing = el('div', 'hud-ult-ring', this.ult.root);
    this.potion = this.makeSlot(bar, 'hud-potion', 'H');
    this.potion.icon.innerHTML = itemIcon('potion', '#e0474c');
    this.potionCount = el('div', 'hud-slot-count', this.potion.root);
  }

  private buildWheel() {
    this.wheel = el('div', 'hud-wheel', this.root);
    this.wheel.innerHTML = `<svg viewBox="0 0 48 48"><circle class="bg" cx="24" cy="24" r="19"/><circle class="arc" cx="24" cy="24" r="19" pathLength="100" stroke-dasharray="100 100" transform="rotate(-90 24 24)"/></svg>`;
    this.wheelArc = this.wheel.querySelector('.arc') as SVGCircleElement;
  }

  private buildReticle() {
    this.reticle = el('div', 'hud-reticle', this.root);
    this.castBar = el('div', 'hud-cast', this.root);
    this.castName = el('div', 'hud-cast-name', this.castBar);
    const t = el('div', 'hud-cast-track', this.castBar);
    this.castFill = el('div', 'hud-cast-fill', t);
  }

  // ---------------------------------------------------------------------------
  // Atualização
  // ---------------------------------------------------------------------------

  update(dt: number) {
    const ctx = this.ctx;
    const playing = ctx.state === 'playing' || ctx.state === 'dead';
    const visible = ctx.state === 'playing' || ctx.state === 'dead' || ctx.state === 'paused';
    show(this.root, visible && ctx.state !== 'paused');
    if (!visible || ctx.state === 'paused') return;
    this.updateVitals(dt);
    this.updateAbilities();
    this.updateWheel(dt);
    this.updateReticle(playing);
    this.updateHints();
    this.hurtT = Math.max(0, this.hurtT - dt * 2.2);
    setStyle(this.hurtFlash, 'opacity', this.hurtT.toFixed(2));
  }

  private updateVitals(dt: number) {
    const { sys } = this.ctx;
    const h = sys.player.health;
    const frac = h.max > 0 ? Math.max(0, h.current / h.max) : 0;
    if (this.lastHp < 0) this.ghost = frac;
    this.lastHp = frac;
    // a "sombra" segue a vida devagar depois de um dano
    if (this.ghost > frac) this.ghost = Math.max(frac, this.ghost - dt * 0.45);
    else this.ghost = frac;
    setStyle(this.hpFill, 'width', `${(frac * 100).toFixed(1)}%`);
    setStyle(this.hpGhost, 'width', `${(this.ghost * 100).toFixed(1)}%`);
    const sh = h.shieldMax > 0 ? Math.min(1, h.shield / h.max) : 0;
    setStyle(this.hpShield, 'width', `${(sh * 100).toFixed(1)}%`);
    setText(this.hpText, `${Math.ceil(h.current)} / ${Math.round(h.max)}`);
    // largura da barra cresce com a vida máxima (como mais corações)
    setStyle(this.root, '--hp-max', String(Math.min(2.2, Math.max(1, h.max / 120))));
    toggleClass(this.hpFill, 'low', frac < 0.25);
    setStyle(this.vignette, 'opacity', frac < 0.3 && h.alive ? (0.35 + (0.3 - frac) * 2).toFixed(2) : '0');

    const e = sys.player.energy;
    const ef = e.max > 0 ? e.current / e.max : 0;
    setStyle(this.enFill, 'width', `${(ef * 100).toFixed(1)}%`);
    setText(this.enText, `${Math.floor(e.current)} / ${Math.round(e.max)}`);
    toggleClass(this.enFill, 'ascended', sys.abilities.ascended);

    const pr = sys.progression;
    setText(this.lvl, String(pr.level));
    setStyle(this.xpFill, 'width', `${(pr.xpFraction() * 100).toFixed(1)}%`);
    const pts = pr.skillPoints;
    setText(this.points, pts > 0 ? `${pts} ponto${pts > 1 ? 's' : ''} de talento  [${keyLabel(this.ctx.input.bindings.skills[0])}]` : '');
    show(this.points, pts > 0);

    // efeitos ativos (buffs e estados)
    let key = '';
    for (const b of pr.buffs) key += `${b.id}:${Math.ceil(b.remaining)};`;
    for (const [id, s] of h.statuses) key += `${id}:${Math.ceil(s.remaining)};`;
    if (sys.abilities.ascended) key += `asc:${Math.ceil(sys.abilities.ascendedTime)}`;
    if (key !== this.effectKey) {
      this.effectKey = key;
      this.effects.innerHTML = '';
      if (sys.abilities.ascended) this.effectChip('✶', 'Forma Ascendente', sys.abilities.ascendedTime, false, '#ffc040');
      for (const b of pr.buffs) this.effectChip('✚', b.name, b.remaining, false);
      for (const [id, s] of h.statuses) {
        const info = STATUS_INFO[id];
        if (info) this.effectChip(info.glyph, info.name, s.remaining, info.bad);
      }
    }
  }

  private effectChip(glyph: string, name: string, remaining: number, bad: boolean, color?: string) {
    const c = el('div', `hud-effect ${bad ? 'bad' : 'good'}`, this.effects);
    if (color) c.style.setProperty('--fx', color);
    el('span', 'g', c, glyph);
    el('span', 'n', c, name);
    el('span', 't', c, remaining >= 60 ? `${Math.ceil(remaining / 60)} min` : `${Math.ceil(remaining)} s`);
  }

  private updateAbilities() {
    const { sys, input } = this.ctx;
    const ab = sys.abilities;
    const energy = sys.player.energy.current;
    const binds = input.bindings;
    for (let i = 0; i < 4; i++) {
      const s = this.slots[i];
      const id = ab.slots[i];
      this.setSlotAbility(s, id);
      setText(s.key, keyLabel(binds[`ability${i + 1}` as 'ability1'][0]));
      if (!id) continue;
      const def = ABILITIES[id as AbilityId];
      const frac = ab.cooldownFraction(id);
      setStyle(s.sweep, '--cd', `${(frac * 360).toFixed(0)}deg`);
      const rem = ab.cooldownRemaining(id);
      setText(s.cd, rem > 0.05 ? (rem < 10 ? fmtDec(rem) : String(Math.ceil(rem))) : '');
      toggleClass(s.root, 'no-energy', energy < def.cost);
      toggleClass(s.root, 'ready', frac <= 0 && energy >= def.cost);
    }
    // suprema
    const ultId = ab.ultimate;
    this.setSlotAbility(this.ult, ultId);
    setText(this.ult.key, keyLabel(binds.ultimate[0]));
    show(this.ult.root, !!ultId, 'flex');
    if (ultId) {
      const charge = ab.ascended ? ab.ascendedTime / Math.max(0.01, ab.ascendedDuration) : ab.ultimateCharge / ULTIMATE.max;
      setStyle(this.ultRing, '--p', `${(charge * 360).toFixed(0)}deg`);
      const ready = !ab.ascended && ab.ultimateCharge >= ULTIMATE.max && ab.cooldownRemaining(ultId) <= 0;
      toggleClass(this.ult.root, 'ready', ready);
      toggleClass(this.ult.root, 'active', ab.ascended);
      const frac = ab.cooldownFraction(ultId);
      setStyle(this.ult.sweep, '--cd', `${(frac * 360).toFixed(0)}deg`);
      setText(this.ult.cd, ab.ascended ? String(Math.ceil(ab.ascendedTime)) : '');
    }
    // poção
    const inv = sys.inventory;
    let count = 0;
    for (const st of inv.items) {
      const u = ITEMS[st.defId]?.use;
      if (u && u.cooldownGroup === 'potion' && ((u.heal ?? 0) > 0 || (u.healPct ?? 0) > 0)) count += st.qty;
    }
    setText(this.potionCount, String(count));
    setText(this.potion.key, keyLabel(binds.potion[0]));
    toggleClass(this.potion.root, 'empty', count === 0);
    setStyle(this.potion.sweep, '--cd', `${(inv.cooldownFraction('potion') * 360).toFixed(0)}deg`);
    // arma
    const w = inv.equippedItem('weapon');
    const wid = w?.defId ?? null;
    if (wid !== this.weaponId) {
      this.weaponId = wid;
      const def = wid ? ITEMS[wid] : null;
      this.weapon.innerHTML = def ? itemIcon(def.icon.shape, def.icon.color) : '';
      this.weapon.title = def ? inv.displayName(w!) : '';
    }
  }

  private setSlotAbility(s: SlotEls, id: string | null) {
    if (s.id === id) return;
    s.id = id;
    const def = id ? ABILITIES[id as AbilityId] : null;
    s.icon.innerHTML = def ? abilityIcon(def.icon, def.color) : '';
    s.root.title = def ? `${def.name} — ${def.cost} de energia` : 'Vazio';
    toggleClass(s.root, 'empty', !def);
    if (def) s.root.style.setProperty('--ab', hexToCss(def.color));
  }

  private flashSlot(abilityId: string, reason: string) {
    const all = [...this.slots, this.ult];
    const s = all.find((x) => x.id === abilityId);
    if (!s) return;
    s.root.classList.remove('fail');
    void s.root.offsetWidth;
    s.root.classList.add('fail');
    s.root.dataset.reason = reason;
  }

  private updateWheel(dt: number) {
    const { sys, camera } = this.ctx;
    const pl = sys.player;
    const e = pl.energy;
    const frac = e.max > 0 ? e.current / e.max : 1;
    const busy = frac < 0.995 || pl.isFlying() || pl.isClimbing();
    if (busy) this.wheelFullT = 0;
    else this.wheelFullT += dt;
    const target = busy || this.wheelFullT < 0.6 ? 1 : 0;
    this.wheelAlpha += (target - this.wheelAlpha) * Math.min(1, dt * (target ? 10 : 4));
    if (this.wheelAlpha < 0.02) {
      show(this.wheel, false);
      return;
    }
    const p = pl.entity.position;
    if (!projectToScreen(camera, p.x, p.y + 1.55, p.z, SCREEN)) {
      show(this.wheel, false);
      return;
    }
    show(this.wheel, true);
    // à direita do personagem, proporcional à distância da câmera
    const dist = camera.position.distanceTo(p);
    const off = Math.max(36, Math.min(120, 380 / Math.max(1, dist)));
    this.wheel.style.transform = `translate3d(${(SCREEN.x + off).toFixed(1)}px, ${(SCREEN.y - off * 0.3).toFixed(1)}px, 0) translate(-50%, -50%)`;
    setStyle(this.wheel, 'opacity', this.wheelAlpha.toFixed(2));
    this.wheelArc.setAttribute('stroke-dasharray', `${(frac * 100).toFixed(1)} 100`);
    toggleClass(this.wheel, 'low', frac < 0.25);
  }

  private updateReticle(playing: boolean) {
    const { sys } = this.ctx;
    const cast = sys.abilities.currentCast();
    const locked = !!sys.player.lockTarget;
    show(this.reticle, playing && !locked && sys.player.health.alive);
    toggleClass(this.reticle, 'combat', sys.ai.inCombat());
    if (cast) {
      show(this.castBar, true, 'flex');
      const def = ABILITIES[cast.id as AbilityId];
      setText(this.castName, def?.name ?? '');
      setStyle(this.castFill, 'width', `${(Math.min(1, cast.progress) * 100).toFixed(0)}%`);
      if (def) this.castBar.style.setProperty('--ab', hexToCss(def.color));
    } else show(this.castBar, false);
  }

  private updateHints() {
    const { sys, input } = this.ctx;
    const pl = sys.player;
    const b = input.bindings;
    let list: [string, string][];
    if (pl.isFlying()) list = [[keyLabel(b.jump[0]), 'Subir'], [keyLabel(b.descend[0]), 'Descer'], [keyLabel(b.sprint[0]), 'Acelerar'], [keyLabel(b.fly[0]), 'Pousar']];
    else if (pl.isClimbing()) list = [[keyLabel(b.jump[0]), 'Saltar'], [keyLabel(b.dodge[0]), 'Soltar']];
    else if (pl.isSwimming()) list = [[keyLabel(b.fly[0]), 'Voar'], [keyLabel(b.sprint[0]), 'Nadar rápido']];
    else if (sys.ai.inCombat()) list = [[keyLabel(b.lockOn[1] ?? b.lockOn[0]), 'Travar alvo'], [keyLabel(b.dodge[0]), 'Esquivar'], [keyLabel(b.block[0]), 'Defender']];
    else list = [[keyLabel(b.map[0]), 'Mapa'], [keyLabel(b.inventory[0]), 'Inventário'], [keyLabel(b.journal[0]), 'Diário'], [keyLabel(b.fly[0]), 'Voar']];
    const key = list.map((x) => x.join(':')).join('|');
    if (key === this.hintKey) return;
    this.hintKey = key;
    this.hints.innerHTML = list.map(([k, t]) => `<span><span class="ui-key">${k}</span>${t}</span>`).join('');
  }
}
