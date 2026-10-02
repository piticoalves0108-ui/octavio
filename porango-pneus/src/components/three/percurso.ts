import * as THREE from "three";
import { R } from "./geometria";

/**
 * PERCURSO do pneu no chão (plano y = 0).
 *
 *   A  (fora da tela, à direita)  --intro-->  P0 (repouso no hero)
 *   P0 --rolagem da página-->  M  -->  P1 (repouso na leitura da medida)
 *
 * A posição é função do comprimento de arco s, e o giro da roda também
 * (giro = s / R): o pneu rola de verdade, sem patinar, e a marca que ele
 * deixa no asfalto é sempre a mesma para o mesmo trecho.
 */
export function criarPercurso() {
  const P0 = new THREE.Vector3(2.0, 0, 0.35);
  const ida = new THREE.Vector3(-0.906, 0, 0.423).normalize();
  const A = P0.clone().addScaledVector(ida, -7.5);
  const M = new THREE.Vector3(-0.35, 0, 1.4);
  const P1 = new THREE.Vector3(-2.7, 0, 1.75);

  const curva = new THREE.CatmullRomCurve3([A, P0, M, P1], false, "centripetal");
  const comprimentos = curva.getLengths(600);
  const L = curva.getLength();
  /** Comprimento de arco até P0 (t = 1/3 numa Catmull-Rom de 4 pontos). */
  const s0 = comprimentos[200];

  const ponto = new THREE.Vector3();
  const tangente = new THREE.Vector3();

  /** Posição e direção no comprimento de arco s. */
  function amostrar(s: number, saidaPos: THREE.Vector3, saidaTan: THREE.Vector3) {
    const u = THREE.MathUtils.clamp(s / L, 0, 1);
    curva.getPointAt(u, saidaPos);
    curva.getTangentAt(u, saidaTan);
    saidaTan.y = 0;
    saidaTan.normalize();
  }

  /**
   * Guinada (rotação em Y) para uma tangente: o lado de fora da roda (+Z local)
   * fica virado para a câmera e o eixo X local aponta contra o movimento.
   */
  function guinada(t: THREE.Vector3) {
    return Math.atan2(t.z, -t.x);
  }

  /** Giro da roda no comprimento de arco s (rola sem patinar). */
  function giro(s: number) {
    return s / R;
  }

  /** Limites do percurso no chão (para o render target da marca). */
  const caixa = new THREE.Box3();
  for (let i = 0; i <= 100; i++) caixa.expandByPoint(curva.getPointAt(i / 100, ponto));
  caixa.expandByScalar(1.2);

  amostrar(L, ponto, tangente);
  const guinadaFinal = guinada(tangente);

  return { curva, L, s0, amostrar, guinada, giro, caixa, guinadaFinal };
}

export type Percurso = ReturnType<typeof criarPercurso>;
