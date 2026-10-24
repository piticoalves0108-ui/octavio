/**
 * Raios perigosos nas tempestades: de tempos em tempos um raio cai perto do jogador
 * (com aviso: estalos e um círculo brilhando no chão). Quem carrega arma de metal
 * atrai o raio (como numa aventura em mundo aberto, guardar a espada na tempestade
 * salva a vida). O raio fere quem estiver no círculo: jogador e inimigos.
 */
import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { Entity } from '../core/Entity';
import { WEATHER_FX } from '../data/weather';
import { ITEMS } from '../data/items';
import { WEAPONS } from '../data/weapons';
import type { VfxHandle } from '../combat/VFX';
import type { Enemy } from '../ai/Enemy';

const METAL = new Set(['sword', 'dagger', 'spear', 'techno']);

export class StormHazard {
  private next = 20;
  private warnT = -1;
  private readonly target = new THREE.Vector3();
  private handle: VfxHandle | null = null;
  private sparkT = 0;
  private warned = false;
  private near: Enemy[] = [];
  private readonly tmp = new THREE.Vector3();
  /** Raios perigosos desde o boot (testes). */
  strikes = 0;

  constructor(private rnd: () => number) {}

  /** O jogador carrega uma arma de metal? */
  metalWeapon(ctx: GameContext): boolean {
    const id = ctx.sys.inventory.equippedWeaponDefId();
    const w = id ? WEAPONS[ITEMS[id]?.weaponId ?? ''] : null;
    return !!w && METAL.has(w.type);
  }

  reset() {
    this.next = 20;
    this.cancel();
  }

  private cancel() {
    this.warnT = -1;
    this.handle?.cancel();
    this.handle = null;
  }

  update(dt: number, ctx: GameContext, storming: boolean, outdoors: boolean, flash: (pos: THREE.Vector3) => void) {
    const pl = ctx.sys.player;
    const active = storming && outdoors && ctx.state === 'playing' && pl.health.alive && !ctx.sys.ai.activeBoss();
    // aviso em andamento: o raio cai no fim
    if (this.warnT >= 0) {
      this.warnT += dt;
      this.sparkT -= dt;
      if (this.sparkT <= 0) {
        this.sparkT = 0.12;
        this.tmp.copy(this.target);
        this.tmp.y += 0.2 + this.rnd() * 0.6;
        ctx.sys.vfx.spark(this.tmp, 0xbfe6ff, 0.12, 0.25, (this.rnd() - 0.5) * 3, 2 + this.rnd() * 2, (this.rnd() - 0.5) * 3, 6, 0.4);
      }
      if (this.warnT >= WEATHER_FX.strikeWarning) {
        this.handle = null;
        this.warnT = -1;
        this.hit(ctx, flash);
      }
      return;
    }
    if (!active) return;
    // metal atrai: a tempestade "procura" o jogador mais cedo
    const metal = this.metalWeapon(ctx);
    this.next -= dt * (metal ? 1.6 : 1);
    if (this.next > 0) return;
    const [a, b] = WEATHER_FX.strikeInterval;
    this.next = a + this.rnd() * (b - a);
    const p = pl.entity.position;
    if (metal && this.rnd() < WEATHER_FX.metalAttraction) {
      this.target.set(p.x, 0, p.z);
      if (!this.warned) {
        this.warned = true;
        ctx.sys.ui.notify('A arma de metal está atraindo os raios! Troque por um cajado ou abrigue-se.', 'warning');
      }
    } else {
      const [n0, n1] = WEATHER_FX.strikeNear;
      const ang = this.rnd() * Math.PI * 2;
      const r = n0 + this.rnd() * (n1 - n0);
      this.target.set(p.x + Math.sin(ang) * r, 0, p.z + Math.cos(ang) * r);
    }
    this.target.y = ctx.physics.groundHeight(this.target.x, this.target.z, p.y + 30, 30, 0.3);
    this.warnT = 0;
    this.sparkT = 0;
    this.handle = ctx.sys.vfx.telegraph({ type: 'circle', position: this.target, radius: WEATHER_FX.strikeRadius, duration: WEATHER_FX.strikeWarning, color: 0x9fd8ff });
    ctx.sys.audio.play('cast_chains', { position: this.target, volume: 0.5 });
  }

  private hit(ctx: GameContext, flash: (pos: THREE.Vector3) => void) {
    this.strikes++;
    flash(this.target);
    const { vfx, combat, ai } = ctx.sys;
    vfx.burst('lightning', this.target, { count: 26, scale: 1.6 });
    vfx.groundFlash(this.target, WEATHER_FX.strikeRadius * 1.3, 0xcfe8ff, 0.5);
    ctx.sys.camera.shake(0.5, 0.4);
    const R = WEATHER_FX.strikeRadius;
    const hurt = (e: Entity) => {
      const d = Math.hypot(e.position.x - this.target.x, e.position.z - this.target.z);
      if (d > R || Math.abs(e.position.y - this.target.y) > 4) return;
      this.tmp.set(e.position.x - this.target.x, 0, e.position.z - this.target.z);
      if (this.tmp.lengthSq() < 1e-4) this.tmp.set(1, 0, 0);
      this.tmp.normalize();
      combat.applyDamage(e, {
        amount: WEATHER_FX.strikeDamage * (1 - 0.5 * (d / R)),
        type: 'lightning',
        unblockable: true,
        direction: this.tmp,
        knockback: WEATHER_FX.strikeKnockback,
        statuses: [{ id: 'shock', duration: 2.5, magnitude: 3 }],
        tag: 'storm',
      });
    };
    hurt(ctx.sys.player.entity);
    for (const e of ai.enemiesNear(this.target, R + 1, this.near)) hurt(e);
  }
}
