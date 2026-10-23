/**
 * Viagem rápida pelo mapa: escolhe um ponto seguro no destino (ponto de retorno do
 * local, quando existe; senão um anel ao redor do centro, fora da água, em chão pouco
 * inclinado e sem construção), escurece a tela, teleporta e avança o relógio.
 */
import * as THREE from 'three';
import type { GameContext } from '../core/context';
import { FAST_TRAVEL, LOCATION_BY_ID, LOCATION_CHECKPOINTS, WATER_LEVEL, type LocationDef } from '../data/world';
import { PLACES } from '../data/places';

const TMP = new THREE.Vector3();

export function isTravelPoint(l: LocationDef): boolean {
  return FAST_TRAVEL.kinds.includes(l.kind);
}

/** Motivo para não poder viajar agora (null = pode). */
export function travelBlockReason(ctx: GameContext, locationId: string): string | null {
  const l = LOCATION_BY_ID[locationId];
  const { sys } = ctx;
  if (!l || !isTravelPoint(l)) return 'Não dá para viajar até aqui.';
  if (!sys.world.discovered.has(l.id)) return 'Descubra este lugar primeiro.';
  if (!sys.player.health.alive) return 'Você não pode viajar agora.';
  if (sys.ai.activeBoss()) return 'Não dá para fugir de um chefe.';
  if (sys.ai.inCombat()) return 'Há inimigos por perto.';
  if (sys.quests.cinematicPlaying) return 'Agora não.';
  const p = sys.player.entity.position;
  if (Math.hypot(p.x - l.x, p.z - l.z) < FAST_TRAVEL.minDistance) return 'Você já está aqui.';
  return null;
}

/** Ponto seguro para chegar no local. */
export function travelSpot(ctx: GameContext, l: LocationDef): { x: number; y: number; z: number; yaw: number } {
  const cp = LOCATION_CHECKPOINTS[l.id] ? PLACES[LOCATION_CHECKPOINTS[l.id]] : null;
  if (cp) {
    const y = cp.y ?? ctx.physics.groundHeight(cp.x, cp.z);
    return { x: cp.x, y, z: cp.z, yaw: cp.yaw ?? 0 };
  }
  const hf = ctx.heightfield;
  const maps = ctx.sys.world.maps;
  let best = { x: l.x, z: l.z, score: -Infinity };
  for (const rf of [0.7, 1.0, 1.25, 1.6]) {
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const x = l.x + Math.sin(a) * l.radius * rf;
      const z = l.z + Math.cos(a) * l.radius * rf;
      const h = hf.heightAt(x, z);
      if (h < WATER_LEVEL + 0.3) continue;
      if (maps.blockedAt(x, z)) continue;
      const slope = hf.slopeAt(x, z);
      if (slope > 28) continue;
      // preferir perto do centro, plano e numa estrada
      const score = -rf * 2 - slope * 0.05 + maps.roadAt(x, z);
      if (score > best.score) best = { x, z, score };
    }
    if (best.score > -Infinity) break;
  }
  const y = ctx.physics.groundHeight(best.x, best.z);
  // olhar para o centro do lugar
  const yaw = Math.atan2(l.x - best.x, l.z - best.z);
  return { x: best.x, y, z: best.z, yaw };
}

let travelling = false;

/**
 * Viaja até o local. `onBlack` roda com a tela escura, antes do teleporte (a UI fecha o
 * mapa ali e volta o jogo para 'playing', para o mundo carregar o entorno do destino).
 */
export async function fastTravel(ctx: GameContext, locationId: string, fade: (to: 0 | 1, d: number) => Promise<void>, onBlack?: () => void): Promise<boolean> {
  if (travelling) return false;
  const reason = travelBlockReason(ctx, locationId);
  if (reason) {
    ctx.sys.ui.notify(reason, 'warning');
    return false;
  }
  const l = LOCATION_BY_ID[locationId];
  const { sys } = ctx;
  travelling = true;
  try {
    await fade(1, FAST_TRAVEL.fadeOut);
    onBlack?.();
    const p = sys.player.entity.position;
    const km = Math.hypot(p.x - l.x, p.z - l.z) / 1000;
    if (sys.player.isFlying()) sys.player.endFlight(true);
    const s = travelSpot(ctx, l);
    TMP.set(s.x, s.y + 0.05, s.z);
    sys.player.teleport(TMP, s.yaw);
    sys.camera.yaw = s.yaw;
    sys.camera.snap();
    if (FAST_TRAVEL.hoursPerKm > 0) ctx.clock.advance(km * FAST_TRAVEL.hoursPerKm);
    sys.player.setCheckpoint(s.x, s.z, s.yaw);
    // ninguém ataca enquanto a tela clareia
    sys.player.health.invulnerable = Math.max(sys.player.health.invulnerable, 2.5);
    ctx.events.emit('location:entered', { locationId: l.id, name: l.name });
    // dá tempo ao mundo de carregar o entorno antes de clarear
    await new Promise((r) => setTimeout(r, 450));
    await fade(0, FAST_TRAVEL.fadeIn);
    return true;
  } finally {
    travelling = false;
  }
}
