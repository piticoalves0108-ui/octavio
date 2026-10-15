import type { Faction } from '../core/Entity';

/**
 * Tabela de hostilidade entre facções (simétrica). true = se atacam.
 * Guardas viram hostis ao jogador por flag de história (ver Combat.isHostile).
 */
const HOSTILE: Partial<Record<Faction, Faction[]>> = {
  player: ['bandit', 'corrupted', 'construct', 'wild'],
  villager: ['bandit', 'corrupted', 'wild'],
  guard: ['bandit', 'corrupted', 'construct', 'wild'],
  bandit: ['player', 'villager', 'guard', 'corrupted', 'construct'],
  corrupted: ['player', 'villager', 'guard', 'bandit', 'neutral'],
  construct: ['player', 'guard', 'bandit'],
  wild: ['player', 'villager', 'guard', 'neutral'],
  neutral: [],
};

export function factionsHostile(a: Faction, b: Faction): boolean {
  if (a === b) return false;
  return !!(HOSTILE[a]?.includes(b) || HOSTILE[b]?.includes(a));
}

export const FACTION_NAMES: Record<Faction, string> = {
  player: 'Jogador',
  villager: 'Habitantes',
  guard: 'Guarda de Brumafria',
  bandit: 'Corvos (saqueadores)',
  corrupted: 'Corrompidos',
  construct: 'Constructos Arcanos',
  wild: 'Feras',
  neutral: 'Fauna',
};
