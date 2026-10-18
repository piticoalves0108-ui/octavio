import * as THREE from 'three';
import type { GameContext } from '../../core/context';
import type { Interactable } from '../../core/Interaction';
import { QUEST_POINTS, type QuestPointDef } from '../../data/quests';
import { evalAll } from '../dialogue/script';
import type { NarrativeBridge } from './bridge';

/**
 * Pontos de interação de missão (altar, pedestal, fragmentos de memória,
 * inscrições, martelo, núcleo do Guardião, quadro de missões...): registram o
 * [E] no InteractionSystem, mostram um modelo procedural quando relevantes e
 * aplicam efeitos/abrem leituras. `once` persiste no save.
 */
export interface PointHost {
  readonly bridge: NarrativeBridge;
  onPointUsed(id: string, viaDialogue: boolean): void;
  startDialogue(dialogueId: string, ownerId: string): boolean;
}

// geometrias/materiais compartilhados
let SHARED: {
  frag: THREE.BufferGeometry;
  ring: THREE.BufferGeometry;
  fragMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  handle: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  wood: THREE.MeshStandardMaterial;
  iron: THREE.MeshStandardMaterial;
  tablet: THREE.BufferGeometry;
  stone: THREE.MeshStandardMaterial;
  rune: THREE.BufferGeometry;
  runeMat: THREE.MeshStandardMaterial;
  core: THREE.BufferGeometry;
  coreMat: THREE.MeshStandardMaterial;
} | null = null;

function shared() {
  if (SHARED) return SHARED;
  SHARED = {
    frag: new THREE.OctahedronGeometry(0.2, 0),
    ring: new THREE.TorusGeometry(0.34, 0.012, 6, 28),
    fragMat: new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x58c8ff, emissiveIntensity: 2.2, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92 }),
    ringMat: new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.55, depthWrite: false }),
    handle: new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6),
    head: new THREE.BoxGeometry(0.2, 0.1, 0.1),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.85 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x8e939b, roughness: 0.4, metalness: 0.7, emissive: 0x3a2a10, emissiveIntensity: 0.4 }),
    tablet: new THREE.BoxGeometry(0.9, 1.2, 0.18),
    stone: new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.95 }),
    rune: new THREE.BoxGeometry(0.6, 0.06, 0.02),
    runeMat: new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x7fd8ff, emissiveIntensity: 1.8 }),
    core: new THREE.IcosahedronGeometry(0.55, 1),
    coreMat: new THREE.MeshStandardMaterial({ color: 0x9ff8ff, emissive: 0x48d8ff, emissiveIntensity: 2.5, roughness: 0.25, metalness: 0.3, flatShading: true }),
  };
  return SHARED;
}

function buildModel(kind: QuestPointDef['model']): THREE.Object3D | null {
  const S = shared();
  const g = new THREE.Group();
  switch (kind) {
    case 'fragment': {
      const m = new THREE.Mesh(S.frag, S.fragMat);
      m.name = 'spin';
      m.scale.set(0.8, 1.5, 0.8);
      g.add(m);
      const r = new THREE.Mesh(S.ring, S.ringMat);
      r.rotation.x = Math.PI / 2;
      r.name = 'ring';
      g.add(r);
      break;
    }
    case 'hammer': {
      const h = new THREE.Mesh(S.handle, S.wood);
      h.rotation.z = Math.PI / 2;
      const hd = new THREE.Mesh(S.head, S.iron);
      hd.position.x = 0.28;
      hd.rotation.y = Math.PI / 2;
      g.add(h, hd);
      g.rotation.y = 0.6;
      break;
    }
    case 'inscription': {
      const t = new THREE.Mesh(S.tablet, S.stone);
      t.position.y = 0.6;
      t.rotation.x = -0.12;
      g.add(t);
      for (let i = 0; i < 4; i++) {
        const r = new THREE.Mesh(S.rune, S.runeMat);
        r.position.set(0, 0.95 - i * 0.2, 0.1);
        r.scale.x = 0.55 + ((i * 37) % 5) * 0.1;
        r.rotation.x = -0.12;
        g.add(r);
      }
      break;
    }
    case 'core': {
      const c = new THREE.Mesh(S.core, S.coreMat);
      c.name = 'spin';
      g.add(c);
      const r = new THREE.Mesh(S.ring, S.ringMat);
      r.scale.setScalar(2.6);
      r.rotation.x = Math.PI / 2;
      r.name = 'ring';
      g.add(r);
      break;
    }
    default:
      return null;
  }
  g.traverse((o) => {
    (o as THREE.Mesh).castShadow = false;
  });
  return g;
}

const V = new THREE.Vector3();

export class QuestPoint {
  readonly interactable: Interactable;
  readonly position = new THREE.Vector3();
  model: THREE.Object3D | null = null;
  active = false;
  private spin: THREE.Object3D | null = null;
  private ring: THREE.Object3D | null = null;
  private t = Math.random() * 6;
  private sparkT = 0;
  private staticPos = new THREE.Vector3();
  private staticOk = false;
  private checkT = Math.random() * 0.2;

  constructor(
    readonly def: QuestPointDef,
    private ctx: GameContext,
    private host: PointHost,
    private used: Set<string>,
  ) {
    const kind: Interactable['kind'] = def.kind === 'board' ? 'board' : def.kind === 'read' ? 'read' : def.kind === 'pickup' ? 'pickup' : def.kind === 'talk' ? 'talk' : 'use';
    this.interactable = {
      id: `qp:${def.id}`,
      kind,
      prompt: def.prompt,
      position: this.position,
      range: def.range ?? 2.6,
      enabled: false,
      priority: 3,
      interact: () => this.use(),
    };
  }

  /** Posição atual (âncora + deslocamento, ou o inimigo único seguido). */
  resolve(out: THREE.Vector3): boolean {
    const d = this.def;
    if (d.unique) {
      const e = this.ctx.sys.ai?.findUnique?.(d.unique);
      if (e) {
        out.copy(e.position);
        if (d.offset) out.add(V.set(d.offset[0], d.offset[1], d.offset[2]));
        return true;
      }
    }
    if (d.place) {
      // âncora fixa: calcula o chão uma vez só
      if (!this.staticOk) {
        if (!this.ctx.sys.world.placePosition(d.place, this.staticPos)) return false;
        if (d.offset) this.staticPos.add(V.set(d.offset[0], d.offset[1], d.offset[2]));
        this.staticOk = true;
      }
      out.copy(this.staticPos);
      return true;
    }
    return false;
  }

  update(dt: number) {
    const d = this.def;
    const env = this.host.bridge.env;
    // condições reavaliadas a cada 0,2 s; posição todo quadro só para quem segue um inimigo
    this.checkT -= dt;
    let on = this.active;
    if (this.checkT <= 0 || (on && d.unique)) {
      this.checkT = 0.2;
      on = !(d.once && this.used.has(d.id)) && evalAll(d.when, env);
      if (on) on = this.resolve(this.position);
    }
    if (d.once && this.used.has(d.id)) on = false;
    this.active = on;
    this.interactable.enabled = on && this.ctx.state === 'playing';
    // modelo
    if (on && d.model && d.model !== 'none' && !this.model) {
      this.model = buildModel(d.model);
      if (this.model) {
        this.spin = this.model.getObjectByName('spin') ?? null;
        this.ring = this.model.getObjectByName('ring') ?? null;
        this.ctx.scene.add(this.model);
      }
    }
    if (this.model) {
      this.model.visible = on;
      if (on) {
        this.t += dt;
        this.model.position.copy(this.position);
        if (this.spin) {
          this.spin.rotation.y += dt * 1.4;
          this.spin.position.y = Math.sin(this.t * 1.6) * 0.08;
        }
        if (this.ring) {
          const s = 1 + Math.sin(this.t * 2.2) * 0.08;
          this.ring.scale.set(s * (d.model === 'core' ? 2.6 : 1), s * (d.model === 'core' ? 2.6 : 1), 1);
        }
        // brilho ocasional (só perto do jogador)
        this.sparkT -= dt;
        if ((d.model === 'fragment' || d.model === 'core') && this.sparkT <= 0) {
          this.sparkT = 0.6;
          const pl = this.ctx.sys.player.entity.position;
          if (pl.distanceToSquared(this.position) < 40 * 40) this.ctx.sys.vfx.spark(this.position, 0x9fe8ff, 0.08, 0.9, (Math.random() - 0.5) * 0.4, 0.8, (Math.random() - 0.5) * 0.4, 0);
        }
      }
    }
  }

  use() {
    const d = this.def;
    const env = this.host.bridge.env;
    if (!evalAll(d.requires, env)) {
      if (d.lockedText) this.ctx.sys.ui.notify(d.lockedText, 'info');
      return;
    }
    if (d.once) this.used.add(d.id);
    if (d.effects) this.host.bridge.applyAll(d.effects);
    if (d.model === 'fragment' || d.model === 'inscription') this.ctx.sys.vfx.burst('pickupGlow', this.position, { color: 0x9fe8ff, count: 18 });
    if (d.dialogue && this.host.startDialogue(d.dialogue, d.id)) {
      this.host.onPointUsed(d.id, true);
      return;
    }
    this.host.onPointUsed(d.id, false);
  }

  dispose() {
    this.model?.removeFromParent();
    this.ctx.sys.interaction.unregister(this.interactable.id);
  }
}

export class QuestPoints {
  readonly list: QuestPoint[] = [];
  readonly byId = new Map<string, QuestPoint>();

  constructor(ctx: GameContext, host: PointHost, used: Set<string>) {
    for (const d of QUEST_POINTS) {
      const p = new QuestPoint(d, ctx, host, used);
      this.list.push(p);
      this.byId.set(d.id, p);
      ctx.sys.interaction.register(p.interactable);
    }
  }

  update(dt: number) {
    for (const p of this.list) p.update(dt);
  }
}
