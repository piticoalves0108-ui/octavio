import type * as THREE from 'three';
import type { RigKind } from '../../data/enemies';
import type { CreatureRig } from '../../data/creatures';
import { HumanoidRig } from './humanoid';
import { QuadrupedRig } from './quadruped';
import { FlyerRig, SerpentRig } from './flyer';
import { PillarRig, SpiritRig } from './misc';
import type { Rig } from './anim';

/** Cria o rig de um inimigo a partir do tipo de esqueleto e da variante visual. */
export function createEnemyRig(kind: RigKind, look: string, material: THREE.Material): Rig {
  switch (kind) {
    case 'humanoid':
    case 'construct':
    case 'golem':
      return new HumanoidRig(look, material);
    case 'wolf':
      return new QuadrupedRig(look, material);
    case 'flyer':
      return new FlyerRig(look, material);
    case 'pillar':
      return new PillarRig(material);
  }
}

/** Rig das criaturas (pássaros usam instâncias: ver BirdFlocks). */
export function createCreatureRig(kind: CreatureRig, material: THREE.Material, id = ''): Rig {
  switch (kind) {
    case 'deer':
      return new QuadrupedRig(id === 'cervo_luminoso' ? 'cervo_luminoso' : 'cervo', material);
    case 'rabbit':
      return new QuadrupedRig('coelho', material);
    case 'horse':
      return new QuadrupedRig('cavalo', material);
    case 'sheep':
      return new QuadrupedRig('ovelha', material);
    case 'griffin':
      return new QuadrupedRig('grifo', material);
    case 'chicken':
      return new FlyerRig('galinha', material);
    case 'phoenix':
      return new FlyerRig('fenix', material);
    case 'dragon':
      return new FlyerRig('dragao', material);
    case 'serpent':
      return new SerpentRig(material);
    case 'spirit':
    case 'bird':
      return new SpiritRig(material);
  }
}
