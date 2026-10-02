/**
 * Diretor da cena: UM loop decide onde tudo fica a cada frame, na ordem certa
 * (câmera → churrasqueira → hambúrguer → pedaços do espeto). Os componentes só
 * criam as malhas e se registram em `objetos`.
 *
 * Coreografia (valores escritos pelo GSAP em `cena`):
 *   A. na grelha (hero)      → B. flutuando (saida)      → em pé (vertical)
 *   → C. cada pedaço no seu item do cardápio (pecas.*)   → D. fusão no hambúrguer (fusao)
 * As posições C e D vêm de elementos do DOM (âncoras), convertidos para o
 * espaço da câmera: o 3D acompanha o layout em qualquer tela.
 */
import * as THREE from "three";
import type { RootState } from "@react-three/fiber";
import { ancoras, CAMADAS, cena, PECAS, type Camada } from "@/lib/cena";
import { uniformsBrasa } from "./materiais";
import { limitar, PERIODO, suavizar, tempoDaCena } from "./tempo";

export const objetos = {
  rig: null as THREE.Group | null,
  luzBrasa: null as THREE.PointLight | null,
  luzChave: null as THREE.DirectionalLight | null,
  luzRecorte: null as THREE.DirectionalLight | null,
  espeto: [] as (THREE.Object3D | null)[], // 4 pedaços na ordem de PECAS
  vareta: null as THREE.Object3D | null,
  hamburguer: null as THREE.Group | null,
  camadas: {} as Partial<Record<Camada, THREE.Object3D>>,
  fumaca: [] as (THREE.Mesh | null)[],
  faiscas: null as THREE.ShaderMaterial | null,
};

/** Layout do espeto ao longo da vareta (x local) e a pose de cada pedaço. */
export const LAYOUT_ESPETO = {
  x: [-0.93, -0.31, 0.31, 0.93],
  rotacao: [new THREE.Euler(0.2, 0.3, 0.1), new THREE.Euler(-0.3, 0.6, -0.15), new THREE.Euler(0, 0, 0.12), new THREE.Euler(0.1, -0.2, 0)],
};

/** Altura (y local) onde cada camada do hambúrguer pousa. */
export const ALTURA_CAMADA: Record<Camada, number> = {
  paoBase: 0,
  carne: 0.43,
  queijo: 0.575,
  tomate: 0.63,
  alface: 0.69,
  paoTopo: 0.7,
};

type Layout = { pos: THREE.Vector3; posIntro: THREE.Vector3; alvo: THREE.Vector3; guinada: number; flutua: [number, number]; escalaFlutua: number };

const PAISAGEM: Layout = {
  pos: new THREE.Vector3(0, 1.95, 5.1),
  posIntro: new THREE.Vector3(0, 2.7, 7.8),
  alvo: new THREE.Vector3(0, -0.42, 0),
  guinada: -0.14,
  flutua: [0.34, 0.02],
  escalaFlutua: 0.72,
};

const RETRATO: Layout = {
  pos: new THREE.Vector3(0, 3.3, 11.4),
  posIntro: new THREE.Vector3(0, 4.3, 14.6),
  alvo: new THREE.Vector3(0, -1.15, 0),
  guinada: -0.62,
  flutua: [0.12, 0.3],
  escalaFlutua: 0.5,
};

export const layoutPara = (aspecto: number) => (aspecto < 0.8 ? RETRATO : PAISAGEM);

// Temporários reaproveitados (nada de alocar dentro do loop).
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _cima = new THREE.Vector3();
const _frente = new THREE.Vector3();
const _direita = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _s = new THREE.Vector3();
const _um = new THREE.Vector3(1, 1, 1);

type Pose = { p: THREE.Vector3; q: THREE.Quaternion; s: number };
const novaPose = (): Pose => ({ p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1 });
const poseA = PECAS.map(novaPose);
const poseB = PECAS.map(novaPose);
const poseC = PECAS.map(novaPose);
const poseFinal = PECAS.map(novaPose);
const varetaA = novaPose();
const varetaB = novaPose();
const varetaFinal = novaPose();
const poseD = novaPose();
const matB = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _rotCam = new THREE.Matrix4();
const poseHamb = { p: new THREE.Vector3(), q: new THREE.Quaternion(), s: 1, ok: false };
const ponteiroSuave = new THREE.Vector2();
let atividadePonteiro = 0;
const ultimoPonteiro = new THREE.Vector2();

/** Ponto da tela (NDC) a uma distância d da câmera, em coordenadas de mundo. */
export function telaParaMundo(camera: THREE.PerspectiveCamera, nx: number, ny: number, d: number, alvo: THREE.Vector3) {
  const tanY = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return alvo.set(nx * tanY * camera.aspect * d, ny * tanY * d, -d).applyMatrix4(camera.matrixWorld);
}

export const alturaVisivel = (camera: THREE.PerspectiveCamera, d: number) => 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * d;

/** Retângulo de uma âncora do DOM em NDC + fração da tela. null se não existe/está muito fora. */
function lerAncora(id: string, largura: number, altura: number) {
  const el = ancoras.get(id);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.bottom < -altura || r.top > altura * 2) return null;
  return {
    nx: ((r.left + r.width / 2) / largura) * 2 - 1,
    ny: -(((r.top + r.height / 2) / altura) * 2 - 1),
    w: r.width / largura,
    h: r.height / altura,
  };
}

function misturar(saida: Pose, a: Pose, b: Pose, t: number) {
  if (t <= 0) {
    saida.p.copy(a.p);
    saida.q.copy(a.q);
    saida.s = a.s;
  } else if (t >= 1) {
    saida.p.copy(b.p);
    saida.q.copy(b.q);
    saida.s = b.s;
  } else {
    saida.p.lerpVectors(a.p, b.p, t);
    saida.q.slerpQuaternions(a.q, b.q, t);
    saida.s = a.s + (b.s - a.s) * t;
  }
}

function aplicar(obj: THREE.Object3D, pose: Pose) {
  obj.position.copy(pose.p);
  obj.quaternion.copy(pose.q);
  obj.scale.setScalar(Math.max(pose.s, 1e-4));
}

const emRodape = () => cena.secoes.rodape && !cena.secoes.hamburguer && !cena.secoes.espetinhos;

export type OpcoesDiretor = { captura: boolean };

export function dirigir(state: RootState, delta: number, opcoes: OpcoesDiretor) {
  const camera = state.camera as THREE.PerspectiveCamera;
  const { width: largura, height: altura } = state.size;
  const t = tempoDaCena(state.clock.elapsedTime);
  const dt = Math.min(delta, 0.05);
  const layout = layoutPara(largura / altura);
  const giro = (t / PERIODO) * Math.PI * 2;

  // ---------------------------------------------------------------- câmera
  if (!opcoes.captura) cena.intro = Math.min(1, cena.intro + dt / 2.6);
  const intro = 1 - Math.pow(1 - cena.intro, 3);
  const px = cena.inclinacao.ativa ? cena.inclinacao.x : cena.ponteiro.x;
  const py = cena.inclinacao.ativa ? cena.inclinacao.y : cena.ponteiro.y;
  ponteiroSuave.x += (px - ponteiroSuave.x) * Math.min(1, dt * 3);
  ponteiroSuave.y += (py - ponteiroSuave.y) * Math.min(1, dt * 3);
  camera.position.lerpVectors(layout.posIntro, layout.pos, intro);
  if (!opcoes.captura) {
    camera.position.x += ponteiroSuave.x * 0.32;
    camera.position.y += ponteiroSuave.y * 0.16;
  }
  camera.lookAt(layout.alvo);
  camera.updateMatrixWorld();
  _cima.setFromMatrixColumn(camera.matrixWorld, 1);
  _direita.setFromMatrixColumn(camera.matrixWorld, 0);
  _frente.setFromMatrixColumn(camera.matrixWorld, 2).negate();
  const distanciaRig = layout.pos.distanceTo(layout.alvo);

  // Luzes que acompanham a câmera: brasa quente de baixo, recorte frio de cima.
  if (objetos.luzChave) {
    objetos.luzChave.position.copy(camera.position).addScaledVector(_cima, -1.6).addScaledVector(_direita, -2.8).addScaledVector(_frente, 1.5);
    objetos.luzChave.target.position.copy(camera.position).addScaledVector(_frente, distanciaRig);
    objetos.luzChave.target.updateMatrixWorld();
  }
  if (objetos.luzRecorte) {
    objetos.luzRecorte.position.copy(camera.position).addScaledVector(_cima, 5).addScaledVector(_direita, 3).addScaledVector(_frente, 9);
    objetos.luzRecorte.target.position.copy(camera.position).addScaledVector(_frente, distanciaRig);
    objetos.luzRecorte.target.updateMatrixWorld();
  }

  // ------------------------------------------------------ ponteiro / abanar
  if (ultimoPonteiro.x !== cena.ponteiro.x || ultimoPonteiro.y !== cena.ponteiro.y) {
    atividadePonteiro = 1;
    ultimoPonteiro.set(cena.ponteiro.x, cena.ponteiro.y);
  }
  atividadePonteiro = Math.max(0, atividadePonteiro - dt * 0.6);
  if (!opcoes.captura) cena.abanar = Math.max(0, cena.abanar - dt * 0.7);

  // ---------------------------------------------------------- churrasqueira
  const rodape = emRodape();
  const rig = objetos.rig;
  let calor = 1;
  if (rig) {
    const rolagem = opcoes.captura ? 0 : window.scrollY / altura;
    if (rodape) {
      const a = lerAncora("rodape-brasa", largura, altura);
      if (a) {
        const d = distanciaRig * 1.05;
        telaParaMundo(camera, a.nx, a.ny, d, rig.position);
        const larguraMundo = a.w * alturaVisivel(camera, d) * camera.aspect;
        rig.scale.setScalar(THREE.MathUtils.clamp(larguraMundo / 3.4, 0.4, 1.6));
      }
      calor = 1 - 0.88 * suavizar(0, 1, cena.apagar);
      rig.visible = Boolean(a);
    } else {
      rig.position.set(0, 0, 0).addScaledVector(_cima, rolagem * alturaVisivel(camera, distanciaRig));
      rig.scale.setScalar(1);
      rig.rotation.y = 0;
      rig.visible = rolagem < 1.35;
      calor = 1 + cena.abanar * 0.7;
    }
    rig.updateMatrixWorld();
  }
  uniformsBrasa.uTempo.value = t;
  uniformsBrasa.uCalor.value = calor;
  if (objetos.luzBrasa) {
    const tremor = 0.9 + 0.1 * Math.sin(t * 9.1) * Math.sin(t * 3.7 + 1.3);
    objetos.luzBrasa.intensity = 3.2 * calor * tremor;
  }

  // Faíscas e fumaça (somem quando o espeto sai da grelha).
  const presencaHero = rodape ? calor : 1 - suavizar(0.0, 0.7, cena.saida);
  if (objetos.faiscas) {
    const u = objetos.faiscas.uniforms;
    u.uTempo.value = t;
    u.uCalor.value = presencaHero;
    u.uAbanar.value = rodape ? 0 : cena.abanar;
  }
  atualizarFumaca(state, camera, t, rodape ? 0.45 * calor : presencaHero);

  // -------------------------------------------------------------- hambúrguer
  poseHamb.ok = false;
  const hamb = objetos.hamburguer;
  if (hamb) {
    const algumaCamada = CAMADAS.some((c) => cena.camadas[c].escala > 0.001);
    const a = !rodape && (algumaCamada || cena.fusao > 0) ? lerAncora("hamburguer", largura, altura) : null;
    if (a) {
      const d = distanciaRig;
      const hv = alturaVisivel(camera, d);
      const escala = Math.min((a.h * hv) / 3.1, (a.w * hv * camera.aspect) / 3.3);
      telaParaMundo(camera, a.nx, a.ny, d, poseHamb.p).addScaledVector(_cima, -0.62 * escala);
      _q.setFromRotationMatrix(_rotCam.extractRotation(camera.matrixWorld));
      _q2.setFromEuler(_e.set(0.42, t * 0.3, 0));
      poseHamb.q.copy(_q).multiply(_q2);
      poseHamb.s = escala;
      poseHamb.ok = true;
      hamb.position.copy(poseHamb.p);
      hamb.quaternion.copy(poseHamb.q);
      hamb.scale.setScalar(escala);
      hamb.visible = algumaCamada;
      for (const camada of CAMADAS) {
        const malha = objetos.camadas[camada];
        if (!malha) continue;
        const estado = cena.camadas[camada];
        const amassa = camada === "paoTopo" ? 1 - 0.16 * cena.amassar : 1 - 0.05 * cena.amassar;
        malha.visible = estado.escala > 0.001;
        malha.position.y = ALTURA_CAMADA[camada] * (1 - 0.05 * cena.amassar) + estado.y;
        malha.rotation.y = estado.giro;
        malha.scale.set(estado.escala, estado.escala * amassa, estado.escala);
      }
    } else hamb.visible = false;
  }

  // --------------------------------------------------------- espeto/pedaços
  const s = suavizar(0.12, 0.9, cena.saida);
  const vertical = suavizar(0, 1, cena.vertical);
  const espetoAtivo = !rodape && rig !== null;

  // A: na grelha (filhos do rig, girando no próprio eixo).
  _m.copy(rig?.matrixWorld ?? _m.identity());
  _m2.makeRotationFromEuler(_e.set(giro, layout.guinada, 0, "YXZ"));
  _m.multiply(_m2.setPosition(0, 0.44, 0));
  // B: flutuando no espaço da câmera.
  const dB = distanciaRig;
  telaParaMundo(camera, layout.flutua[0], layout.flutua[1] + 0.05 * Math.sin(t * 0.8), dB, _v);
  _q.setFromRotationMatrix(_rotCam.extractRotation(camera.matrixWorld));
  _q2.setFromEuler(_e.set(0.28, 0.42 * (1 - vertical), -vertical * Math.PI * 0.5, "XYZ"));
  _q.multiply(_q2);
  _q2.setFromAxisAngle(_s.set(1, 0, 0), giro * (1 - vertical * 0.6));
  _q.multiply(_q2);
  matB.compose(_v, _q, _s.setScalar(layout.escalaFlutua));

  PECAS.forEach((peca, i) => {
    const obj = objetos.espeto[i];
    if (!obj) return;
    const local = _local.compose(_v2.set(LAYOUT_ESPETO.x[i], 0, 0), _q2.setFromEuler(LAYOUT_ESPETO.rotacao[i]), _um);
    decompor(poseA[i], _m, local);
    decompor(poseB[i], matB, local);
    misturar(poseFinal[i], poseA[i], poseB[i], s);

    // C: âncora do item no cardápio.
    const e = suavizar(0, 1, cena.pecas[peca]);
    if (e > 0) {
      const a = lerAncora(`peca-${peca}`, largura, altura);
      if (a) {
        const d = distanciaRig;
        telaParaMundo(camera, a.nx, a.ny, d, poseC[i].p);
        poseC[i].s = (a.h * alturaVisivel(camera, d) * 0.95) / 0.5;
        _q.setFromRotationMatrix(_rotCam.extractRotation(camera.matrixWorld));
        _q2.setFromEuler(_e.set(0.42, t * 0.45 + i * 1.4, 0.15));
        poseC[i].q.copy(_q).multiply(_q2);
        // arco: o pedaço sobe um pouco no caminho
        const arco = Math.sin(e * Math.PI) * 0.35;
        misturar(poseFinal[i], poseFinal[i], poseC[i], e);
        poseFinal[i].p.addScaledVector(_cima, arco);
      }
    }

    // D: fusão no hambúrguer (escalonada por pedaço).
    const f = suavizar(0, 1, limitar((cena.fusao - i * 0.08) / 0.7));
    if (f > 0 && poseHamb.ok) {
      poseD.p.set(0, ALTURA_CAMADA.carne, 0).multiplyScalar(poseHamb.s).applyQuaternion(poseHamb.q).add(poseHamb.p);
      poseD.q.copy(poseHamb.q);
      poseD.s = poseHamb.s * 0.45;
      misturar(poseFinal[i], poseFinal[i], poseD, f);
      poseFinal[i].s *= 1 - suavizar(0.6, 1, f);
    }

    aplicar(obj, poseFinal[i]);
    obj.visible = espetoAtivo && poseFinal[i].s > 0.002;
  });

  // Vareta: só nas poses A e B; sai pela ponta quando o espeto explode.
  const vareta = objetos.vareta;
  if (vareta) {
    const sai = suavizar(0, 1, cena.vareta);
    const local = _local.makeTranslation(-sai * 4.2, 0, 0);
    decompor(varetaA, _m, local);
    decompor(varetaB, matB, local);
    misturar(varetaFinal, varetaA, varetaB, s);
    varetaFinal.s *= 1 - suavizar(0.55, 1, sai);
    aplicar(vareta, varetaFinal);
    vareta.visible = espetoAtivo && varetaFinal.s > 0.002;
  }
}

/** pose = decompose(base * local) */
function decompor(pose: Pose, base: THREE.Matrix4, local: THREE.Matrix4) {
  const m = _mDecomp.multiplyMatrices(base, local);
  m.decompose(pose.p, pose.q, _sDecomp);
  pose.s = _sDecomp.x;
}
const _mDecomp = new THREE.Matrix4();
const _sDecomp = new THREE.Vector3();

// --------------------------------------------------------------- fumaça
const _raio = new THREE.Raycaster();
const _plano = new THREE.Plane();
const _ponto = new THREE.Vector3();
const _ndc = new THREE.Vector2();

function atualizarFumaca(state: RootState, camera: THREE.PerspectiveCamera, t: number, presenca: number) {
  const planos = objetos.fumaca;
  if (!planos.length) return;
  _ndc.set(ponteiroSuave.x, ponteiroSuave.y);
  _raio.setFromCamera(_ndc, camera);
  planos.forEach((plano, i) => {
    if (!plano) return;
    const n = planos.length;
    const vida = (t / PERIODO + i / n) % 1;
    const material = plano.material as THREE.ShaderMaterial;
    plano.position.set(Math.sin(i * 2.3) * 0.75 + Math.sin(vida * 3 + i) * 0.18, 0.35 + vida * 2.4, Math.cos(i * 1.7) * 0.35);
    const escala = 1.5 + vida * 2.0;
    plano.scale.set(escala * 1.1, escala * 1.35, 1);
    plano.quaternion.copy(camera.quaternion);
    plano.visible = presenca > 0.01;
    material.uniforms.uTempo.value = t;
    material.uniforms.uOpacidade.value = Math.sin(Math.PI * vida) * 0.42 * presenca;
    material.uniforms.uCalor.value = uniformsBrasa.uCalor.value;
    // Onde o cursor cruza este plano (em UV), para a fumaça desviar.
    plano.updateMatrixWorld();
    _plano.setFromNormalAndCoplanarPoint(_frente, plano.getWorldPosition(_ponto));
    if (_raio.ray.intersectPlane(_plano, _ponto)) {
      plano.worldToLocal(_ponto);
      material.uniforms.uPonteiro.value.set(_ponto.x + 0.5, _ponto.y + 0.5);
    }
    material.uniforms.uForca.value = cena.ponteiro.ativo || cena.abanar > 0 ? Math.max(0.55, atividadePonteiro) : atividadePonteiro;
  });
  void state;
}
