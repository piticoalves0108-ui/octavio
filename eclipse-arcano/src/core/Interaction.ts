import * as THREE from 'three';
import type { GameContext, GameSystem } from './context';

/**
 * Qualquer coisa com que o jogador pode interagir com [E]:
 * NPCs (conversar), baús, portas, alavancas, itens no chão, quadro de missões, camas...
 */
export interface Interactable {
  id: string;
  kind: 'talk' | 'loot' | 'door' | 'lever' | 'read' | 'shop' | 'rest' | 'board' | 'stash' | 'pickup' | 'use';
  /** Texto mostrado no prompt: "Conversar com Maren". */
  prompt: string;
  /** Posição no mundo (atualizada pelo dono se móvel). */
  position: THREE.Vector3;
  /** Distância máxima de interação. */
  range: number;
  enabled: boolean;
  /** Prioridade quando há vários perto (maior ganha). */
  priority?: number;
  interact(ctx: GameContext): void;
}

/**
 * Encontra o interagível mais adequado à frente do jogador, mostra o prompt
 * (ctx.sys.ui.setInteractPrompt) e dispara com a ação 'interact'.
 */
export class InteractionSystem implements GameSystem {
  readonly name = 'interaction';
  private items = new Map<string, Interactable>();
  current: Interactable | null = null;
  private ctx!: GameContext;
  private tmp = new THREE.Vector3();

  init(ctx: GameContext) {
    this.ctx = ctx;
  }

  register(i: Interactable) {
    this.items.set(i.id, i);
    return i;
  }
  unregister(id: string) {
    this.items.delete(id);
    if (this.current?.id === id) this.current = null;
  }
  get(id: string) {
    return this.items.get(id);
  }

  update(_dt: number, ctx: GameContext) {
    const player = ctx.sys.player;
    const p = player.entity.position;
    const fwd = player.entity.getForward(this.tmp);
    let best: Interactable | null = null;
    let bestScore = -Infinity;
    // só com o jogo rodando: em diálogo/cinemática o [E] é da interface (senão reabriria a conversa)
    if (player.canInteract() && ctx.state === 'playing') {
      for (const it of this.items.values()) {
        if (!it.enabled) continue;
        const dx = it.position.x - p.x;
        const dz = it.position.z - p.z;
        const dy = it.position.y - p.y;
        const d = Math.hypot(dx, dz);
        if (d > it.range || Math.abs(dy) > 3.5) continue;
        const facing = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
        if (facing < -0.2 && d > 1.2) continue;
        const score = (it.priority ?? 0) * 10 + facing * 2 - d;
        if (score > bestScore) {
          bestScore = score;
          best = it;
        }
      }
    }
    if (best !== this.current) {
      this.current = best;
      ctx.sys.ui.setInteractPrompt(best ? best.prompt : null);
    }
    if (best && ctx.state === 'playing' && ctx.input.pressed('interact')) {
      best.interact(ctx);
      ctx.events.emit('interact', { id: best.id, kind: best.kind });
    }
  }

  onStateChange() {
    this.current = null;
    this.ctx?.sys.ui.setInteractPrompt(null);
  }
}
