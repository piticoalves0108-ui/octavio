import * as THREE from "three";

/**
 * Estado interno da cena, escrito pelo Diretor a cada quadro e lido pelos
 * outros componentes 3D (asfalto, poeira, efeitos). Fica fora do React.
 */
export const estadoCena = {
  /** Comprimento de arco atual do pneu no percurso. */
  s: 0,
  posPneu: new THREE.Vector3(),
  /** Ponto em foco (para o depth of field). */
  foco: new THREE.Vector3(),
  /** Intensidade da poça de luz no chão (0..1). */
  luzChao: 1,
  /** Quanto o hero ainda está presente (poeira, balanço). */
  hero: 1,
  /** Relógio da cena em segundos (controlável no modo captura). */
  relogio: 0,
  /** Algo ainda se mexendo: o quadro seguinte precisa ser desenhado. */
  animando: true,
};
