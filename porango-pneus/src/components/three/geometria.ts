import * as THREE from "three";

/**
 * GEOMETRIA PROCEDURAL do pneu 175/70 R14 montado na roda.
 * Nada de modelo baixado: tudo nasce aqui, em proporção real, escalado para
 * raio externo = 1 (1 unidade ≈ 300 mm).
 *
 *   largura 175 mm  -> 0,583      flanco 70% -> 122,5 mm
 *   aro 14" (355,6 mm) -> raio do talão 0,592
 *
 * Os perfis são revolvidos com LatheGeometry (eixo Y) e depois o grupo é girado
 * para o eixo da roda ficar em Z. Lado B (+Z) é o lado de fora, com as letras.
 */

export const R = 1;
export const R_TALAO = 0.6;
export const R_OMBRO = 0.975;
export const A_OMBRO = 0.222;
export const LARGURA_BANDA = A_OMBRO * 2;
/** Posição axial dos 4 sulcos circunferenciais (geometria real, não só normal map). */
export const SULCOS = [-0.13, -0.045, 0.045, 0.13];
const LARGURA_SULCO = 0.032;
const PROFUNDIDADE_SULCO = 0.026;

/** Raio onde ficam as letras da medida no flanco. */
export const R_TEXTO = 0.8;

type P = [number, number]; // [raio, axial]

function suave(pts: P[], n: number): THREE.Vector2[] {
  const curva = new THREE.SplineCurve(pts.map(([r, a]) => new THREE.Vector2(r, a)));
  return curva.getSpacedPoints(n);
}

/** Flanco do lado A (axial negativo), do talão até o ombro. */
function perfilFlancoA(): THREE.Vector2[] {
  return suave(
    [
      [0.6, -0.252],
      [0.632, -0.263],
      [0.682, -0.279],
      [0.742, -0.29],
      [0.8, -0.292],
      [0.858, -0.285],
      [0.908, -0.267],
      [0.948, -0.245],
      [R_OMBRO, -A_OMBRO],
    ],
    44,
  );
}

/** Banda de rodagem: ombro A, coroa levemente abaulada com 4 sulcos, ombro B. */
function perfilBanda(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const coroa = (a: number) => R - 0.012 * Math.pow(a / 0.19, 2);

  // ombro A (curva)
  const ombro = new THREE.QuadraticBezierCurve(
    new THREE.Vector2(R_OMBRO, -A_OMBRO),
    new THREE.Vector2(0.997, -0.216),
    new THREE.Vector2(coroa(-0.19), -0.19),
  );
  pts.push(...ombro.getPoints(10));

  // coroa com sulcos (pontos duplicados nos cantos = aresta viva)
  let a = -0.19;
  const passo = 0.012;
  for (const g of SULCOS) {
    const e = g - LARGURA_SULCO / 2;
    const d = g + LARGURA_SULCO / 2;
    for (a += passo; a < e; a += passo) pts.push(new THREE.Vector2(coroa(a), a));
    const fundo = coroa(g) - PROFUNDIDADE_SULCO;
    const borda = 0.004;
    pts.push(new THREE.Vector2(coroa(e), e), new THREE.Vector2(coroa(e), e));
    pts.push(new THREE.Vector2(fundo, e + borda), new THREE.Vector2(fundo, e + borda));
    pts.push(new THREE.Vector2(fundo, d - borda), new THREE.Vector2(fundo, d - borda));
    pts.push(new THREE.Vector2(coroa(d), d), new THREE.Vector2(coroa(d), d));
    a = d;
  }
  for (a += passo; a < 0.19; a += passo) pts.push(new THREE.Vector2(coroa(a), a));

  // ombro B (espelho)
  const ombroB = new THREE.QuadraticBezierCurve(
    new THREE.Vector2(coroa(0.19), 0.19),
    new THREE.Vector2(0.997, 0.216),
    new THREE.Vector2(R_OMBRO, A_OMBRO),
  );
  pts.push(...ombroB.getPoints(10));
  return pts;
}

/** Reescreve as UVs do torno: u em volta, v por uma função do ponto do perfil. */
function uvTorno(
  geo: THREE.LatheGeometry,
  perfil: THREE.Vector2[],
  segmentos: number,
  v: (p: THREE.Vector2) => number,
  inverterU = false,
) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const n = perfil.length;
  for (let i = 0; i <= segmentos; i++) {
    const u = i / segmentos;
    for (let j = 0; j < n; j++) {
      uv.setXY(i * n + j, inverterU ? 1 - u : u, v(perfil[j]));
    }
  }
  uv.needsUpdate = true;
}

export type GeometriasPneu = ReturnType<typeof criarGeometriasPneu>;

export function criarGeometriasPneu(segmentos = 128) {
  const pA = perfilFlancoA();
  const pB = pA.map((p) => new THREE.Vector2(p.x, -p.y)).reverse();
  const pBanda = perfilBanda();

  const flancoA = new THREE.LatheGeometry(pA, segmentos);
  uvTorno(flancoA, pA, segmentos, (p) => (p.x - R_TALAO) / (R_OMBRO - R_TALAO));
  const flancoB = new THREE.LatheGeometry(pB, segmentos);
  uvTorno(flancoB, pB, segmentos, (p) => (p.x - R_TALAO) / (R_OMBRO - R_TALAO), true);
  const banda = new THREE.LatheGeometry(pBanda, segmentos);
  uvTorno(banda, pBanda, segmentos, (p) => (p.y + A_OMBRO) / LARGURA_BANDA);

  // --- camadas internas (só aparecem na vista explodida) ---
  // Carcaça: casca que acompanha o perfil por dentro, de talão a talão.
  const pCarcaca = [...pA, ...suave([[0.985, -0.2], [0.99, 0], [0.985, 0.2]], 10), ...pB].map(
    (p) => new THREE.Vector2(0.6 + (p.x - 0.6) * 0.955, p.y * 0.93),
  );
  const carcaca = new THREE.LatheGeometry(pCarcaca, Math.round(segmentos * 0.75));
  uvTorno(carcaca, pCarcaca, Math.round(segmentos * 0.75), (p) => (p.y + 0.3) / 0.6);

  // Cintas de aço: cilindro aberto logo abaixo da banda.
  const cinta = new THREE.CylinderGeometry(0.952, 0.952, 0.4, Math.round(segmentos * 0.75), 1, true);
  // Talão: anel de arame de aço.
  const talao = new THREE.TorusGeometry(0.608, 0.02, 10, Math.round(segmentos * 0.75));

  return { flancoA, flancoB, banda, carcaca, cinta, talao };
}

/**
 * Roda de liga leve, 5 raios, com leve concavidade na face.
 * A face é extrudada em Z (eixo da roda) e o tambor é torneado.
 */
export function criarGeometriasRoda(segmentos = 96) {
  const pTambor: P[] = [
    [0.648, -0.268],
    [0.664, -0.256],
    [0.662, -0.24],
    [0.62, -0.232],
    [0.594, -0.214],
    [0.592, -0.12],
    [0.545, -0.085],
    [0.54, 0.09],
    [0.592, 0.13],
    [0.594, 0.214],
    [0.62, 0.232],
    [0.662, 0.24],
    [0.664, 0.256],
    [0.648, 0.268],
  ];
  const tambor = new THREE.LatheGeometry(
    pTambor.map(([r, a]) => new THREE.Vector2(r, a)),
    segmentos,
  );

  // Raio: barra larga que afina do cubo para o aro, com chanfro (5 raios).
  const comp = 0.43;
  const barra = new THREE.Shape();
  barra.moveTo(0, -0.085);
  barra.lineTo(comp, -0.05);
  barra.quadraticCurveTo(comp + 0.03, 0, comp, 0.05);
  barra.lineTo(0, 0.085);
  barra.quadraticCurveTo(-0.03, 0, 0, -0.085);
  const raioGeo = new THREE.ExtrudeGeometry(barra, {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.016,
    bevelSegments: 4,
    curveSegments: 12,
  });
  raioGeo.translate(0, 0, -0.025);

  // Cubo central: disco torneado com borda arredondada (eixo Y -> girar para Z)
  const pCubo: P[] = [
    [0.0, 0.0],
    [0.17, 0.0],
    [0.205, -0.012],
    [0.215, -0.035],
    [0.21, -0.06],
  ];
  const cuboFace = new THREE.LatheGeometry(
    // do canto para o centro: normais para fora (+Z depois de girar)
    suave(pCubo, 16).reverse(),
    segmentos,
  );

  const cubo = new THREE.CylinderGeometry(0.068, 0.074, 0.04, 40);
  const aneis = new THREE.TorusGeometry(0.05, 0.0045, 8, 48);
  const porca = new THREE.CylinderGeometry(0.017, 0.017, 0.03, 6);
  const valvula = new THREE.CylinderGeometry(0.011, 0.014, 0.06, 12);
  return { tambor, raio: raioGeo, cuboFace, cubo, aneis, porca, valvula };
}

export type GeometriasRoda = ReturnType<typeof criarGeometriasRoda>;
