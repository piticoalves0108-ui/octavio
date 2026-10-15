import * as THREE from 'three';
import { B, BONES, BONE_OFFSET, BONE_PARENT, PIVOT_HEIGHT, R_OFFX, R_OFFY, R_OFFZ, R_PITCH, R_ROLL, type Pose } from './rig';
import { MeshBuilder, T, hanging, type SkinInfluence } from './meshBuilder';
import { GLOW, RUNE_UNIFORMS, createBodyMaterial, createCloakMaterial, glowTexture } from './runeMaterial';
import { Cloth } from './Cloth';
import type { QualityPreset } from '../data/quality';

/**
 * Modelo procedural do Mago Ancestral:
 * - corpo inteiro numa SkinnedMesh (1 chamada de desenho) com 19 ossos;
 * - sobretudo longo de vestes antigas (saia com pesos entre quadril e coxas),
 *   capuz com ponta, barba branca, olhos brilhantes, ombreiras/peitoral/braçadeiras/grevas
 *   tecnológicas com circuitos e um núcleo arcano (sigilo) no peito;
 * - capa e tabardo simulados (Verlet), cajado ancestral com cristal energético;
 * - brilhos aditivos (olhos, mãos, cristal) e auréola da Forma Ascendente.
 */

const C = {
  coat: 0x2b3164,
  coatDark: 0x1e2242,
  coatInner: 0x4a2040,
  tunic: 0x5c2438,
  trousers: 0x302f38,
  leather: 0x56402c,
  leatherDark: 0x34261c,
  skin: 0x84624e,
  beard: 0xdcd9d2,
  metal: 0x6f7886,
  metalDark: 0x3e444f,
  bronze: 0xa07a42,
  glowBase: 0x0e1c26,
  wood: 0x3b2a1d,
  sole: 0x16110e,
};

export type WeaponKind = 'sword' | 'staff' | 'dagger' | 'spear' | 'techno' | 'artifact';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

function smooth01(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export class PlayerModel {
  /** Raiz (filha do object3d da entidade; recebe o yaw da entidade). */
  readonly root = new THREE.Group();
  /** Pivô no quadril: inclinação para frente (x) e rolagem (z) do corpo inteiro. */
  readonly pivot = new THREE.Group();
  private offset = new THREE.Group();
  readonly bones: THREE.Bone[] = [];
  readonly body: THREE.SkinnedMesh;
  readonly bodyMaterial: THREE.MeshStandardMaterial;
  readonly cloakMaterial: THREE.MeshStandardMaterial;
  readonly cape: Cloth;
  readonly tabard: Cloth | null;
  /** Dimensões da grade da capa (para emitir partículas na bainha). */
  readonly capeCols: number;
  readonly capeRows: number;
  /** Encaixe da arma na mão direita (eixo +Y do modelo da arma = para cima com o antebraço à frente). */
  readonly weaponSocket = new THREE.Group();
  readonly defaultStaff: THREE.Group;
  private staffRing: THREE.Mesh;
  private weapon: THREE.Object3D | null = null;
  weaponKind: WeaponKind = 'staff';
  private weaponTip = new THREE.Vector3(0, 1.07, 0);
  private crystalGlow: THREE.Sprite;
  private eyeGlow: THREE.Sprite[] = [];
  readonly handAura: THREE.Sprite[] = [];
  private halo: THREE.Mesh;
  private haloGlow: THREE.Sprite;
  private glowMats: THREE.SpriteMaterial[] = [];
  /** Intensidade atual da aura nas mãos (0..1) [esquerda, direita]. */
  readonly auraLevel = [0, 0];
  private time = 0;

  constructor(q: QualityPreset) {
    this.root.name = 'mago';
    this.pivot.rotation.order = 'ZXY';
    this.pivot.position.y = PIVOT_HEIGHT;
    this.offset.position.y = -PIVOT_HEIGHT;
    this.root.add(this.pivot);
    this.pivot.add(this.offset);

    // ---------- Esqueleto ----------
    const bind: THREE.Matrix4[] = [];
    const worldPos: THREE.Vector3[] = [];
    for (let i = 0; i < BONES.length; i++) {
      const name = BONES[i];
      const bone = new THREE.Bone();
      bone.name = name;
      const [x, y, z] = BONE_OFFSET[name];
      bone.position.set(x, y, z);
      const parent = BONE_PARENT[name];
      const wp = new THREE.Vector3(x, y, z);
      if (parent) {
        this.bones[B[parent]].add(bone);
        wp.add(worldPos[B[parent]]);
      }
      worldPos.push(wp);
      bind.push(new THREE.Matrix4().makeTranslation(wp.x, wp.y, wp.z));
      this.bones.push(bone);
    }

    this.bodyMaterial = createBodyMaterial();
    this.cloakMaterial = createCloakMaterial();

    // ---------- Corpo ----------
    const mb = new MeshBuilder(bind);
    this.buildBody(mb);
    const geo = mb.build(true);
    this.body = new THREE.SkinnedMesh(geo, this.bodyMaterial);
    this.body.name = 'mago-corpo';
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.frustumCulled = false;
    this.body.add(this.bones[0]);
    this.offset.add(this.body);
    this.root.updateMatrixWorld(true);
    this.body.bind(new THREE.Skeleton(this.bones));

    // ---------- Cajado padrão + encaixe da arma ----------
    // Com o antebraço à frente, o +Z local da mão aponta para cima: gira o encaixe para o +Y da arma ficar no +Z da mão.
    this.weaponSocket.position.set(0, -0.085, 0.012);
    this.weaponSocket.rotation.x = Math.PI / 2;
    this.bones[B.handR].add(this.weaponSocket);
    const staff = this.buildStaff();
    this.defaultStaff = staff.group;
    this.staffRing = staff.ring;
    this.weaponSocket.add(this.defaultStaff);
    this.crystalGlow = this.makeGlow(0.42);
    this.crystalGlow.position.set(0, 1.07, 0);
    this.defaultStaff.add(this.crystalGlow);

    // ---------- Brilhos: olhos, mãos, auréola ----------
    const head = this.bones[B.head];
    for (const sx of [1, -1]) {
      const e = this.makeGlow(0.07);
      e.position.set(0.036 * sx, 0.116, 0.1);
      head.add(e);
      this.eyeGlow.push(e);
    }
    for (const side of [B.handL, B.handR]) {
      const a = this.makeGlow(0.5);
      a.position.set(0, -0.09, 0.03);
      a.visible = false;
      this.bones[side].add(a);
      this.handAura.push(a);
    }
    const haloGeo = new THREE.TorusGeometry(0.34, 0.012, 6, 48);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.halo = new THREE.Mesh(haloGeo, haloMat);
    this.halo.position.set(0, 0.12, -0.22);
    this.halo.visible = false;
    head.add(this.halo);
    this.haloGlow = this.makeGlow(1.1);
    this.haloGlow.position.copy(this.halo.position);
    this.haloGlow.visible = false;
    head.add(this.haloGlow);

    // ---------- Capa e tabardo (Verlet) ----------
    const low = q.maxParticles <= 600;
    const chest = this.bones[B.chest];
    const capeCols = low ? 7 : 9;
    const capeRows = low ? 9 : 13;
    this.capeCols = capeCols;
    this.capeRows = capeRows;
    const capeAnchors: THREE.Vector3[] = [];
    for (let c = 0; c < capeCols; c++) {
      const a = -1.32 + (2.64 * c) / (capeCols - 1);
      capeAnchors.push(new THREE.Vector3(Math.sin(a) * 0.235, 0.27 - Math.abs(Math.sin(a)) * 0.015, -Math.cos(a) * 0.165 - 0.025));
    }
    const sp = (bone: number, x: number, y: number, z: number, r: number) => ({ bone: this.bones[bone], offset: new THREE.Vector3(x, y, z), radius: r });
    this.cape = new Cloth(
      {
        cols: capeCols,
        rows: capeRows,
        length: 1.36,
        flare: 0.75,
        anchor: chest,
        anchorPoints: capeAnchors,
        restOut: new THREE.Vector3(0, 0, -1),
        spheres: [
          sp(B.chest, 0, 0.14, -0.02, 0.27),
          sp(B.chest, 0.13, 0.22, -0.02, 0.17),
          sp(B.chest, -0.13, 0.22, -0.02, 0.17),
          sp(B.spine, 0, 0.08, -0.01, 0.24),
          sp(B.hips, 0, -0.04, -0.01, 0.27),
          sp(B.thighL, 0, -0.18, -0.02, 0.2),
          sp(B.thighR, 0, -0.18, -0.02, 0.2),
          sp(B.thighL, 0, -0.42, -0.04, 0.22),
          sp(B.thighR, 0, -0.42, -0.04, 0.22),
          sp(B.shinL, 0, -0.2, -0.02, 0.16),
          sp(B.shinR, 0, -0.2, -0.02, 0.16),
        ],
        gravity: 11,
        drag: 2.4,
        bendStiffness: 0.3,
        iterations: low ? 3 : 4,
      },
      this.cloakMaterial,
    );
    this.cape.mesh.name = 'mago-capa';

    if (!low) {
      const hipAnchors: THREE.Vector3[] = [];
      for (let c = 0; c < 3; c++) hipAnchors.push(new THREE.Vector3(0.085 - c * 0.085, 0.02, 0.165));
      this.tabard = new Cloth(
        {
          cols: 3,
          rows: 7,
          length: 0.66,
          flare: 0.2,
          anchor: this.bones[B.hips],
          anchorPoints: hipAnchors,
          restOut: new THREE.Vector3(0, 0, 1),
          spheres: [sp(B.hips, 0, -0.05, 0.0, 0.19), sp(B.thighL, 0, -0.2, 0.02, 0.12), sp(B.thighR, 0, -0.2, 0.02, 0.12), sp(B.thighL, 0, -0.42, 0.02, 0.11), sp(B.thighR, 0, -0.42, 0.02, 0.11)],
          uRange: [0.36, 0.64],
          gravity: 12,
          drag: 2.0,
          bendStiffness: 0.5,
          iterations: 3,
        },
        this.cloakMaterial,
      );
      this.tabard.mesh.name = 'mago-tabardo';
    } else this.tabard = null;
  }

  private makeGlow(scale: number): THREE.Sprite {
    const m = new THREE.SpriteMaterial({ map: glowTexture(), color: RUNE_UNIFORMS.uRuneColor.value.clone(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    this.glowMats.push(m);
    const s = new THREE.Sprite(m);
    s.scale.setScalar(scale);
    s.renderOrder = 5;
    return s;
  }

  /** Adiciona os tecidos (em espaço do mundo) à cena. */
  addToScene(scene: THREE.Object3D) {
    scene.add(this.cape.mesh);
    if (this.tabard) scene.add(this.tabard.mesh);
  }

  setVisible(v: boolean) {
    this.root.visible = v;
    this.cape.mesh.visible = v;
    if (this.tabard) this.tabard.mesh.visible = v;
  }

  // =====================================================================
  // Construção do corpo
  // =====================================================================
  private buildBody(mb: MeshBuilder) {
    const P = Math.PI;
    // Pesos da saia do sobretudo: quadril no topo, coxas embaixo, conforme o lado.
    const skirtSkin = (p: THREE.Vector3): SkinInfluence => {
      const t = Math.min(1, Math.max(0, (0.98 - p.y) / 0.86));
      const s = p.x / Math.max(0.05, Math.hypot(p.x, p.z));
      const front = p.z > 0 ? 1 : 0.75;
      const wl = t * 0.85 * smooth01(-0.45, 0.65, s) * front;
      const wr = t * 0.85 * smooth01(-0.45, 0.65, -s) * front;
      return { bones: [B.hips, B.thighL, B.thighR, 0], weights: [Math.max(0.05, 1 - wl - wr), wl, wr, 0] };
    };
    const blend2 = (a: number, b: number, wb: number) => (): SkinInfluence => ({ bones: [a, b, 0, 0], weights: [1 - wb, wb, 0, 0] });

    // ---- Quadril ----
    mb.add(new THREE.CylinderGeometry(0.17, 0.18, 0.22, 14), T(0, -0.02, 0, 0, 0, 0, 1, 1, 0.8), { bone: B.hips, color: C.tunic });
    mb.add(new THREE.CylinderGeometry(0.188, 0.19, 0.075, 16), T(0, 0.05, 0, 0, 0, 0, 1, 1, 0.83), { bone: B.hips, color: C.leather });
    // fivela-sigilo
    mb.add(new THREE.CylinderGeometry(0.048, 0.048, 0.018, 20), T(0, 0.05, 0.158, P / 2), { bone: B.hips, color: C.bronze, glow: GLOW.sigil, metal: true });
    mb.add(new THREE.TorusGeometry(0.052, 0.008, 6, 20), T(0, 0.05, 0.166), { bone: B.hips, color: C.bronze, metal: true });
    // bolsas e frasco de energia no cinto
    mb.add(new THREE.BoxGeometry(0.07, 0.09, 0.05), T(0.165, -0.0, 0.06, 0, 0.5, 0), { bone: B.hips, color: C.leatherDark });
    mb.add(new THREE.BoxGeometry(0.06, 0.08, 0.05), T(-0.17, -0.0, -0.02, 0, -0.9, 0), { bone: B.hips, color: C.leatherDark });
    mb.add(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 8), T(-0.14, 0.0, 0.1, 0, 0, 0.15), { bone: B.hips, color: C.glowBase, glow: GLOW.soft });
    mb.add(new THREE.CylinderGeometry(0.02, 0.02, 0.015, 8), T(-0.143, 0.04, 0.1, 0, 0, 0.15), { bone: B.hips, color: C.bronze, metal: true });

    // Saia longa do sobretudo, aberta na frente (com forro interno)
    const gap = 0.62;
    mb.add(hanging(0.192, 0.37, 0.86, 22, true, gap, P * 2 - gap * 2, 6), T(0, 0.03, 0, 0, 0, 0, 1, 1, 0.92), { color: C.coat, skin: skirtSkin, tint: 0.05 });
    mb.add(hanging(0.188, 0.364, 0.86, 22, true, gap, P * 2 - gap * 2, 6), T(0, 0.03, 0, 0, 0, 0, 1, 1, 0.92), { color: C.coatInner, skin: skirtSkin, flip: true });
    // barra com runas
    mb.add(hanging(0.364, 0.372, 0.075, 22, true, gap, P * 2 - gap * 2), T(0, -0.76, 0, 0, 0, 0, 1.005, 1, 0.925), {
      color: C.glowBase,
      glow: GLOW.runes,
      uvScale: [16, 1],
      skin: skirtSkin,
    });
    // acabamento das bordas da abertura frontal
    for (const sx of [1, -1]) {
      const a = new THREE.Vector3(Math.sin(gap) * 0.195 * sx, 0.03, Math.cos(gap) * 0.195 * 0.92 + 0.004);
      const b = new THREE.Vector3(Math.sin(gap) * 0.372 * sx, -0.83, Math.cos(gap) * 0.372 * 0.92 + 0.004);
      mb.addBetween(new THREE.BoxGeometry(0.03, 1, 0.012), a, b, { bone: B.hips, color: C.glowBase, glow: GLOW.runes, uvScale: [1, 9], skin: skirtSkin });
    }

    // ---- Abdômen ----
    mb.add(new THREE.CylinderGeometry(0.172, 0.17, 0.24, 14), T(0, 0.1, 0, 0, 0, 0, 1, 1, 0.78), { bone: B.spine, color: C.tunic });
    mb.add(new THREE.CylinderGeometry(0.183, 0.188, 0.24, 16, 1, true, 0.4, P * 2 - 0.8), T(0, 0.1, 0, 0, 0, 0, 1, 1, 0.84), { bone: B.spine, color: C.coat });
    mb.add(new THREE.CylinderGeometry(0.18, 0.185, 0.24, 16, 1, true, 0.4, P * 2 - 0.8), T(0, 0.1, 0, 0, 0, 0, 1, 1, 0.84), { bone: B.spine, color: C.coatInner, flip: true });

    // ---- Peito ----
    mb.add(new THREE.CylinderGeometry(0.235, 0.18, 0.32, 16), T(0, 0.12, 0, 0, 0, 0, 1, 1, 0.72), { bone: B.chest, color: C.tunic });
    mb.add(new THREE.CylinderGeometry(0.248, 0.19, 0.32, 18, 1, true, 0.5, P * 2 - 1.0), T(0, 0.12, 0, 0, 0, 0, 1, 1, 0.76), { bone: B.chest, color: C.coat });
    mb.add(new THREE.CylinderGeometry(0.244, 0.186, 0.32, 18, 1, true, 0.5, P * 2 - 1.0), T(0, 0.12, 0, 0, 0, 0, 1, 1, 0.76), { bone: B.chest, color: C.coatInner, flip: true });
    mb.add(new THREE.SphereGeometry(0.248, 18, 6, 0, P * 2, 0, P / 2), T(0, 0.275, 0, 0, 0, 0, 1, 0.32, 0.76), { bone: B.chest, color: C.coat });
    // peitoral tecnológico com circuitos
    mb.add(new THREE.CylinderGeometry(0.212, 0.19, 0.24, 14, 1, true, -0.78, 1.56), T(0, 0.13, 0, 0, 0, 0, 1, 1, 0.8), { bone: B.chest, color: C.metal, glow: GLOW.circuit, metal: true, uvScale: [7, 4] });
    mb.add(new THREE.CylinderGeometry(0.205, 0.183, 0.24, 14, 1, true, -0.78, 1.56), T(0, 0.13, 0, 0, 0, 0, 1, 1, 0.8), { bone: B.chest, color: C.metalDark, metal: true, flip: true });
    // núcleo arcano (sigilo) e moldura
    mb.add(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 24), T(0, 0.15, 0.172, P / 2), { bone: B.chest, color: C.glowBase, glow: GLOW.sigil, metal: true });
    mb.add(new THREE.TorusGeometry(0.063, 0.011, 6, 24), T(0, 0.15, 0.177), { bone: B.chest, color: C.bronze, metal: true });
    // gola alta (metal com circuitos) atrás do pescoço
    mb.add(new THREE.CylinderGeometry(0.135, 0.115, 0.13, 16, 1, true, 1.0, P * 2 - 2.0), T(0, 0.33, -0.01, 0, 0, 0, 1, 1, 0.95), { bone: B.chest, color: C.metal, glow: GLOW.circuit, metal: true, uvScale: [6, 1.5] });
    mb.add(new THREE.CylinderGeometry(0.13, 0.11, 0.13, 16, 1, true, 1.0, P * 2 - 2.0), T(0, 0.33, -0.01, 0, 0, 0, 1, 1, 0.95), { bone: B.chest, color: C.metalDark, metal: true, flip: true });
    // bandoleira com frascos
    mb.addBetween(new THREE.BoxGeometry(0.045, 1, 0.014), new THREE.Vector3(0.17, 0.27, 0.11), new THREE.Vector3(-0.15, -0.08, 0.15), { bone: B.chest, color: C.leather });
    for (let i = 0; i < 3; i++) {
      const t = 0.3 + i * 0.18;
      const p = new THREE.Vector3(0.17 + (-0.32 * t), 0.27 - 0.35 * t, 0.122 + 0.04 * t + 0.008);
      mb.add(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8), T(p.x, p.y, p.z, 0, 0, 0.75), { bone: B.chest, color: C.glowBase, glow: GLOW.soft });
    }
    // conduíte nas costas (aparece entre a capa e a gola)
    mb.add(new THREE.BoxGeometry(0.05, 0.26, 0.03), T(0, 0.14, -0.185), { bone: B.chest, color: C.metalDark, glow: GLOW.circuit, metal: true, uvScale: [1, 4] });

    // ---- Pescoço e cabeça ----
    mb.add(new THREE.CylinderGeometry(0.056, 0.062, 0.14, 10), T(0, 0.04, 0), { bone: B.neck, color: C.skin });
    const H = B.head;
    mb.add(new THREE.SphereGeometry(0.105, 18, 14), T(0, 0.1, 0, 0, 0, 0, 0.9, 1.08, 1), { bone: H, color: C.skin });
    mb.add(new THREE.ConeGeometry(0.018, 0.05, 6), T(0, 0.09, 0.105, P / 2 + 0.25, 0, 0), { bone: H, color: C.skin });
    // sobrancelhas brancas e espessas
    for (const sx of [1, -1]) mb.add(new THREE.BoxGeometry(0.055, 0.018, 0.03), T(0.034 * sx, 0.138, 0.09, 0.1, 0, -0.22 * sx), { bone: H, color: C.beard });
    // olhos (brilho sólido)
    for (const sx of [1, -1]) mb.add(new THREE.SphereGeometry(0.0135, 8, 6), T(0.036 * sx, 0.116, 0.09), { bone: H, color: C.glowBase, glow: GLOW.solid });
    // bigode e barba longa com anel de bronze
    for (const sx of [1, -1]) mb.add(new THREE.ConeGeometry(0.016, 0.09, 6), T(0.03 * sx, 0.055, 0.1, 0, 0, P - 0.9 * sx), { bone: H, color: C.beard });
    mb.add(new THREE.ConeGeometry(0.08, 0.36, 12), T(0, -0.1, 0.07, P + 0.28, 0, 0, 1, 1, 0.7), { bone: H, color: C.beard, tint: 0.04 });
    mb.add(new THREE.SphereGeometry(0.075, 12, 8), T(0, 0.03, 0.055, 0, 0, 0, 1, 0.8, 0.75), { bone: H, color: C.beard });
    mb.add(new THREE.TorusGeometry(0.024, 0.008, 6, 14), T(0, -0.15, 0.115, P / 2 + 0.28), { bone: H, color: C.bronze, glow: GLOW.circuit, metal: true, uvScale: [3, 1] });
    // cabelo atrás
    mb.add(new THREE.ConeGeometry(0.09, 0.3, 10), T(0, -0.02, -0.07, P - 0.25, 0, 0, 1, 1, 0.6), { bone: H, color: C.beard });
    // capuz (aberto na frente) com forro escuro e ponta caída
    const hgap = 1.5;
    mb.add(new THREE.SphereGeometry(0.152, 20, 14, P / 2 + hgap / 2, P * 2 - hgap, 0, P * 0.7), T(0, 0.105, 0.004, 0, 0, 0, 1.04, 1.12, 1.24), { bone: H, color: C.coatDark });
    mb.add(new THREE.SphereGeometry(0.147, 20, 14, P / 2 + hgap / 2, P * 2 - hgap, 0, P * 0.7), T(0, 0.105, 0.004, 0, 0, 0, 1.04, 1.12, 1.24), { bone: H, color: 0x07070c, flip: true });
    mb.add(new THREE.ConeGeometry(0.085, 0.3, 10), T(0, 0.17, -0.2, -2.25, 0, 0, 1, 1, 0.75), { bone: H, color: C.coatDark });
    // diadema de bronze com gema
    mb.add(new THREE.TorusGeometry(0.108, 0.007, 6, 22, P), T(0, 0.158, 0.0, P / 2, 0, 0, 0.92, 1.05, 1), { bone: H, color: C.bronze, metal: true });
    mb.add(new THREE.OctahedronGeometry(0.019), T(0, 0.162, 0.108, 0, 0, 0, 0.8, 1.3, 0.6), { bone: H, color: C.glowBase, glow: GLOW.solid });
    // borda do capuz com runas (em volta do rosto)
    mb.add(new THREE.TorusGeometry(0.15, 0.009, 5, 20, P * 1.15), T(0, 0.085, 0.07, -0.25, 0, -P * 0.075 + 0.0, 0.98, 1.25, 1), { bone: H, color: C.glowBase, glow: GLOW.runes, uvScale: [10, 1] });

    // ---- Braços ----
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      const sh = side === 'L' ? B.shoulderL : B.shoulderR;
      const ua = side === 'L' ? B.upperArmL : B.upperArmR;
      const fa = side === 'L' ? B.foreArmL : B.foreArmR;
      const hd = side === 'L' ? B.handL : B.handR;
      // ombro (preenche a junta)
      mb.add(new THREE.SphereGeometry(0.085, 12, 8), T(0.13 * sx, -0.02, 0), { bone: sh, color: C.coat, skin: blend2(sh, ua, 0.5) });
      // manga superior
      mb.add(hanging(0.074, 0.067, 0.3, 12), T(0, 0, 0), { bone: ua, color: C.coat });
      mb.add(new THREE.SphereGeometry(0.067, 10, 8), T(0, -0.29, 0), { bone: ua, color: C.coat, skin: blend2(ua, fa, 0.5) });
      // ombreiras tecnológicas (a esquerda maior e em camadas — silhueta assimétrica)
      const pw = (o: { b: number }) => ({ bones: [o.b, sh, 0, 0], weights: [0.55, 0.45, 0, 0] });
      const pauldronSkin = () => pw({ b: ua });
      if (side === 'L') {
        mb.add(new THREE.SphereGeometry(0.125, 16, 8, 0, P * 2, 0, P / 2), T(0.01, 0.04, 0, 0, 0, -0.42, 1.2, 0.75, 1.12), { bone: ua, color: C.metal, glow: GLOW.circuit, metal: true, uvScale: [6, 3], skin: pauldronSkin });
        mb.add(new THREE.SphereGeometry(0.128, 16, 6, 0, P * 2, 0, P / 2), T(0.03, -0.015, 0, 0, 0, -0.55, 1.1, 0.6, 1.05), { bone: ua, color: C.metalDark, metal: true, skin: pauldronSkin });
        mb.add(new THREE.TorusGeometry(0.14, 0.008, 4, 24), T(0.03, -0.02, 0, P / 2, 0.55, 0, 1.1, 1.05, 1), { bone: ua, color: C.glowBase, glow: GLOW.runes, uvScale: [12, 1], skin: pauldronSkin });
        mb.add(new THREE.BoxGeometry(0.018, 0.13, 0.12), T(0.05, 0.1, 0, 0, 0, -0.42), { bone: ua, color: C.metal, glow: GLOW.circuit, metal: true, uvScale: [2, 3], skin: pauldronSkin });
      } else {
        mb.add(new THREE.SphereGeometry(0.112, 14, 8, 0, P * 2, 0, P / 2), T(-0.01, 0.03, 0, 0, 0, 0.42, 1.15, 0.7, 1.08), { bone: ua, color: C.bronze, glow: GLOW.circuit, metal: true, uvScale: [5, 2], skin: pauldronSkin });
        mb.add(new THREE.TorusGeometry(0.118, 0.007, 4, 22), T(-0.02, -0.005, 0, P / 2, -0.45, 0, 1.12, 1.05, 1), { bone: ua, color: C.metalDark, metal: true, skin: pauldronSkin });
      }
      // manga em sino com punho rúnico
      mb.add(hanging(0.072, 0.118, 0.2, 14, true), T(0, 0, 0), { bone: fa, color: C.coat });
      mb.add(hanging(0.069, 0.114, 0.2, 14, true), T(0, 0, 0), { bone: fa, color: C.coatInner, flip: true });
      mb.add(hanging(0.12, 0.123, 0.035, 16, true), T(0, -0.18, 0), { bone: fa, color: C.glowBase, glow: GLOW.runes, uvScale: [8, 1] });
      // braçadeira tecnológica
      mb.add(hanging(0.056, 0.05, 0.12, 12), T(0, -0.15, 0), { bone: fa, color: C.metal, glow: GLOW.circuit, metal: true, uvScale: [5, 2] });
      if (side === 'R') {
        // manopla mais pesada na mão do cajado
        mb.add(new THREE.BoxGeometry(0.03, 0.1, 0.05), T(-0.052, -0.2, 0), { bone: fa, color: C.metalDark, metal: true });
        mb.add(new THREE.TorusGeometry(0.058, 0.008, 5, 16), T(0, -0.235, 0, P / 2), { bone: fa, color: C.glowBase, glow: GLOW.solid });
      } else {
        mb.add(new THREE.TorusGeometry(0.056, 0.007, 5, 16), T(0, -0.225, 0, P / 2), { bone: fa, color: C.bronze, glow: GLOW.runes, uvScale: [6, 1], metal: true });
      }
      // mão (luva) — palma, dedos levemente curvados e polegar
      mb.add(new THREE.BoxGeometry(0.072, 0.09, 0.034), T(0, -0.05, 0.005), { bone: hd, color: C.leather });
      mb.add(new THREE.BoxGeometry(0.068, 0.07, 0.03), T(0, -0.115, 0.018, -0.35), { bone: hd, color: C.leather });
      mb.add(new THREE.BoxGeometry(0.022, 0.06, 0.026), T(0.034 * -sx, -0.05, 0.03, -0.3, 0, 0.35 * sx), { bone: hd, color: C.leather });
      mb.add(new THREE.BoxGeometry(0.074, 0.03, 0.02), T(0, -0.085, -0.015), { bone: hd, color: C.metal, metal: true, glow: GLOW.circuit, uvScale: [2, 1] });
    }

    // ---- Pernas ----
    for (const side of ['L', 'R'] as const) {
      const th = side === 'L' ? B.thighL : B.thighR;
      const sn = side === 'L' ? B.shinL : B.shinR;
      const ft = side === 'L' ? B.footL : B.footR;
      mb.add(hanging(0.09, 0.072, 0.46, 12), T(0, 0.02, 0), { bone: th, color: C.trousers });
      mb.add(new THREE.SphereGeometry(0.07, 10, 8), T(0, -0.44, 0), { bone: th, color: C.trousers, skin: blend2(th, sn, 0.5) });
      // joelheira
      mb.add(new THREE.SphereGeometry(0.06, 12, 8, 0, P * 2, 0, P / 2), T(0, -0.43, 0.055, P / 2, 0, 0, 1, 0.55, 1.25), { bone: th, color: C.metal, glow: GLOW.circuit, metal: true, uvScale: [3, 2], skin: blend2(th, sn, 0.4) });
      // bota e greva
      mb.add(hanging(0.068, 0.06, 0.38, 12), T(0, -0.03, 0), { bone: sn, color: C.leather });
      mb.add(hanging(0.078, 0.076, 0.05, 12), T(0, -0.04, 0), { bone: sn, color: C.leatherDark });
      mb.add(hanging(0.076, 0.068, 0.26, 10, true, -0.95, 1.9), T(0, -0.1, 0.002), { bone: sn, color: C.metal, glow: GLOW.circuit, metal: true, uvScale: [3, 4] });
      // pé
      mb.add(new THREE.BoxGeometry(0.1, 0.085, 0.24), T(0, -0.035, 0.055), { bone: ft, color: C.leatherDark });
      mb.add(new THREE.BoxGeometry(0.104, 0.055, 0.07), T(0, -0.05, 0.16, 0.12), { bone: ft, color: C.metal, metal: true });
      mb.add(new THREE.BoxGeometry(0.108, 0.022, 0.255), T(0, -0.075, 0.055), { bone: ft, color: C.sole });
    }
  }

  // =====================================================================
  // Cajado ancestral: haste de madeira com anéis de circuito, garras de bronze e cristal
  // =====================================================================
  private buildStaff(): { group: THREE.Group; ring: THREE.Mesh } {
    const P = Math.PI;
    const mb = new MeshBuilder();
    mb.add(new THREE.CylinderGeometry(0.019, 0.025, 1.72, 8), T(0, 0.11, 0), { color: C.wood, tint: 0.04 });
    mb.add(new THREE.ConeGeometry(0.026, 0.1, 8), T(0, -0.8, 0, P), { color: C.metal, metal: true });
    mb.add(new THREE.CylinderGeometry(0.027, 0.027, 0.24, 8), T(0, 0, 0), { color: C.leather });
    for (const y of [-0.55, -0.16, 0.16, 0.5, 0.82]) {
      mb.add(new THREE.CylinderGeometry(0.03, 0.03, 0.035, 10), T(0, y, 0), { color: C.metal, metal: true, glow: GLOW.circuit, uvScale: [4, 1] });
    }
    // runas gravadas na parte de cima da haste
    mb.add(new THREE.CylinderGeometry(0.0225, 0.0225, 0.28, 8, 1, true), T(0, 0.67, 0), { color: C.glowBase, glow: GLOW.runes, uvScale: [2, 4] });
    // cabeça: colar e três garras curvas abraçando o cristal
    mb.add(new THREE.CylinderGeometry(0.045, 0.026, 0.07, 10), T(0, 0.95, 0), { color: C.bronze, metal: true });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * P * 2;
      mb.add(new THREE.TorusGeometry(0.075, 0.009, 5, 12, P * 0.92), T(Math.sin(a) * 0.045, 1.06, Math.cos(a) * 0.045, 0, a + P / 2, P / 2 + 0.25, 1, 1.25, 1), { color: C.bronze, metal: true, glow: GLOW.circuit, uvScale: [4, 1] });
    }
    mb.add(new THREE.OctahedronGeometry(0.058), T(0, 1.07, 0, 0, 0.4, 0, 1, 1.75, 1), { color: C.glowBase, glow: GLOW.solid });
    const geo = mb.build(false);
    const group = new THREE.Group();
    group.name = 'cajado-ancestral';
    const mesh = new THREE.Mesh(geo, this.bodyMaterial);
    mesh.castShadow = true;
    group.add(mesh);
    const rb = new MeshBuilder();
    rb.add(new THREE.TorusGeometry(0.11, 0.0055, 4, 28), T(0, 0, 0, P / 2), { color: C.glowBase, glow: GLOW.soft });
    rb.add(new THREE.TorusGeometry(0.135, 0.004, 4, 28), T(0, 0, 0, P / 2 + 0.6), { color: C.glowBase, glow: GLOW.soft });
    const ring = new THREE.Mesh(rb.build(false), this.bodyMaterial);
    ring.position.set(0, 1.07, 0);
    group.add(ring);
    return { group, ring };
  }

  // =====================================================================
  // Por frame
  // =====================================================================
  /** Aplica a pose ao esqueleto e ao pivô do corpo. */
  applyPose(p: Pose) {
    const bones = this.bones;
    for (let i = 0; i < bones.length; i++) {
      const o = i * 3;
      bones[i].rotation.set(p[o], p[o + 1], p[o + 2]);
    }
    this.pivot.position.set(p[R_OFFX], PIVOT_HEIGHT + p[R_OFFY], p[R_OFFZ]);
    this.pivot.rotation.x = p[R_PITCH];
    this.pivot.rotation.z = p[R_ROLL];
  }

  /**
   * Atualiza brilhos (cristal, olhos, aura das mãos, auréola) e o anel do cajado.
   * `energy` 0..1, `ascend` 0..1.
   */
  updateGlow(dt: number, energy: number, ascend: number, cast: number) {
    this.time += dt;
    const t = this.time;
    const col = RUNE_UNIFORMS.uRuneColor.value;
    for (const m of this.glowMats) m.color.copy(col);
    const pulse = 0.85 + 0.15 * Math.sin(t * 3.1);
    this.crystalGlow.scale.setScalar((0.28 + 0.22 * energy + 0.25 * cast + 0.25 * ascend) * pulse);
    (this.crystalGlow.material as THREE.SpriteMaterial).opacity = 0.55 + 0.45 * energy;
    this.staffRing.rotation.y += dt * (1.2 + 2.5 * cast + 2 * ascend);
    this.staffRing.rotation.z = Math.sin(t * 0.7) * 0.3;
    const eye = (0.055 + 0.03 * ascend + 0.012 * Math.sin(t * 5.3)) * (0.7 + 0.3 * energy);
    for (const e of this.eyeGlow) e.scale.setScalar(eye);
    for (let i = 0; i < 2; i++) {
      const a = this.auraLevel[i];
      const s = this.handAura[i];
      s.visible = a > 0.02;
      if (s.visible) {
        s.scale.setScalar((0.22 + 0.4 * a) * (0.9 + 0.1 * Math.sin(t * 13 + i)));
        (s.material as THREE.SpriteMaterial).opacity = Math.min(1, a * 1.2);
      }
    }
    const haloOn = ascend > 0.02;
    this.halo.visible = this.haloGlow.visible = haloOn;
    if (haloOn) {
      this.halo.rotation.z += dt * 0.6;
      const hm = this.halo.material as THREE.MeshBasicMaterial;
      hm.opacity = ascend * 0.9;
      hm.color.copy(col);
      this.halo.scale.setScalar(0.7 + 0.3 * ascend);
      this.haloGlow.scale.setScalar(1.1 * ascend);
      (this.haloGlow.material as THREE.SpriteMaterial).opacity = 0.35 * ascend;
    }
  }

  /** Troca a arma da mão direita. null = volta ao cajado ancestral. */
  setWeapon(model: THREE.Object3D | null, kind: WeaponKind = 'staff') {
    if (this.weapon) this.weaponSocket.remove(this.weapon);
    this.weapon = model;
    this.weaponKind = model ? kind : 'staff';
    this.defaultStaff.visible = !model;
    if (model) {
      this.weaponSocket.add(model);
      model.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) o.castShadow = true;
      });
      const tip = model.userData?.tip;
      if (tip && typeof tip.x === 'number') this.weaponTip.set(tip.x, tip.y, tip.z);
      else {
        // ponta = ponto mais alto (+Y) da caixa envolvente do modelo
        const box = new THREE.Box3().setFromObject(model, true);
        model.updateWorldMatrix(true, true);
        const inv = new THREE.Matrix4().copy(this.weaponSocket.matrixWorld).invert();
        box.applyMatrix4(inv);
        this.weaponTip.set(0, isFinite(box.max.y) ? box.max.y : 0.9, 0);
      }
    } else this.weaponTip.set(0, 1.07, 0);
  }

  getWeaponObject(): THREE.Object3D {
    return this.weapon ?? this.defaultStaff;
  }

  /** Centro da palma no mundo. */
  getHandWorld(side: 'left' | 'right', out: THREE.Vector3): THREE.Vector3 {
    const b = this.bones[side === 'left' ? B.handL : B.handR];
    return out.set(0, -0.08, 0.025).applyMatrix4(b.matrixWorld);
  }

  getTipWorld(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.weaponTip).applyMatrix4(this.weaponSocket.matrixWorld);
  }

  /** Posição mundial de um osso (com deslocamento local opcional). */
  getBoneWorld(bone: number, out: THREE.Vector3, ox = 0, oy = 0, oz = 0): THREE.Vector3 {
    return out.set(ox, oy, oz).applyMatrix4(this.bones[bone].matrixWorld);
  }

  /** Orientação mundial de um osso. */
  getBoneQuaternion(bone: number, out: THREE.Quaternion): THREE.Quaternion {
    this.bones[bone].matrixWorld.decompose(_v, out, _v);
    return out;
  }

  dispose() {
    this.body.geometry.dispose();
    this.bodyMaterial.dispose();
    this.cloakMaterial.dispose();
    this.cape.dispose();
    this.tabard?.dispose();
    for (const m of this.glowMats) m.dispose();
    this.root.removeFromParent();
  }
}

// evita aviso de não uso em builds estritos
void _q;
void _m;
