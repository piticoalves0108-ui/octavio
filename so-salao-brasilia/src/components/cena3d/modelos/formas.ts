/**
 * Funções de geometria procedural usadas pelos móveis.
 * Unidades em metros. Frente das peças virada para +Z, chão em Y = 0.
 */
import * as THREE from "three";

export type Detalhe = "alto" | "baixo";

export const segmentos = (detalhe: Detalhe, alto: number, baixo: number) => (detalhe === "alto" ? alto : baixo);

/** Retângulo com cantos arredondados, centrado na origem. */
export function retanguloArredondado(largura: number, altura: number, raio: number) {
  const x = -largura / 2;
  const y = -altura / 2;
  const r = Math.min(raio, largura / 2, altura / 2);
  const s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + largura - r, y);
  s.quadraticCurveTo(x + largura, y, x + largura, y + r);
  s.lineTo(x + largura, y + altura - r);
  s.quadraticCurveTo(x + largura, y + altura, x + largura - r, y + altura);
  s.lineTo(x + r, y + altura);
  s.quadraticCurveTo(x, y + altura, x, y + altura - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Encosto: base mais estreita, topo mais largo e bem arredondado. Origem no centro da base. */
export function formaEncosto(larguraBase: number, larguraTopo: number, altura: number, raioTopo: number) {
  const s = new THREE.Shape();
  const b = larguraBase / 2;
  const t = larguraTopo / 2;
  const rb = 0.05;
  s.moveTo(-b + rb, 0);
  s.lineTo(b - rb, 0);
  s.quadraticCurveTo(b, 0, b + 0.004, rb);
  s.bezierCurveTo(b + 0.01, altura * 0.45, t, altura * 0.6, t, altura - raioTopo);
  s.quadraticCurveTo(t, altura, t - raioTopo, altura);
  s.lineTo(-t + raioTopo, altura);
  s.quadraticCurveTo(-t, altura, -t, altura - raioTopo);
  s.bezierCurveTo(-t, altura * 0.6, -b - 0.01, altura * 0.45, -b - 0.004, rb);
  s.quadraticCurveTo(-b, 0, -b + rb, 0);
  return s;
}

/** Arco (retângulo com topo em semicírculo). Origem no centro da base. */
export function caminhoArco(largura: number, altura: number, segmentosArco = 32) {
  const r = largura / 2;
  const pts: THREE.Vector2[] = [];
  pts.push(new THREE.Vector2(r, 0));
  pts.push(new THREE.Vector2(r, altura - r));
  for (let i = 1; i < segmentosArco; i++) {
    const a = (i / segmentosArco) * Math.PI;
    pts.push(new THREE.Vector2(Math.cos(a) * r, altura - r + Math.sin(a) * r));
  }
  pts.push(new THREE.Vector2(-r, altura - r));
  pts.push(new THREE.Vector2(-r, 0));
  return pts;
}

export function formaArco(largura: number, altura: number, segmentosArco = 32) {
  return new THREE.Shape(caminhoArco(largura, altura, segmentosArco));
}

/** Moldura em arco: arco externo com furo em arco interno. */
export function formaMolduraArco(
  largura: number,
  altura: number,
  espessura: number,
  segmentosArco = 32,
  deslocamentoY = 0,
) {
  const externa = new THREE.Shape(caminhoArco(largura, altura, segmentosArco).map((p) => p.setY(p.y + deslocamentoY)));
  const interna = caminhoArco(largura - espessura * 2, altura - espessura * 2, segmentosArco)
    .map((p) => new THREE.Vector2(p.x, p.y + espessura + deslocamentoY))
    .reverse();
  externa.holes.push(new THREE.Path(interna));
  return externa;
}

/** Extrusão com chanfro arredondado, centrada na espessura (eixo Z). */
export function extrudar(forma: THREE.Shape, profundidade: number, chanfro: number, detalhe: Detalhe, curvas = 24) {
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: profundidade,
    bevelEnabled: chanfro > 0,
    bevelThickness: chanfro,
    bevelSize: chanfro * 0.9,
    bevelSegments: segmentos(detalhe, 5, 2),
    curveSegments: segmentos(detalhe, curvas, Math.max(6, Math.round(curvas / 3))),
  });
  geo.translate(0, 0, -profundidade / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Torno (revolução) a partir de pares [raio, altura]. */
export function torno(perfil: [number, number][], detalhe: Detalhe, lados = 48) {
  return new THREE.LatheGeometry(
    perfil.map(([r, y]) => new THREE.Vector2(r, y)),
    segmentos(detalhe, lados, Math.round(lados / 2.5)),
  );
}

/** Tubo suave passando pelos pontos. */
export function tubo(pontos: [number, number, number][], raio: number, detalhe: Detalhe, tensao = 0.5) {
  const curva = new THREE.CatmullRomCurve3(
    pontos.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    "catmullrom",
    tensao,
  );
  return new THREE.TubeGeometry(curva, segmentos(detalhe, 48, 16), raio, segmentos(detalhe, 12, 6), false);
}

/**
 * Setor de coroa circular visto de cima (balcão curvo), extrudado para cima.
 * A frente do arco fica em Z = 0 e a curva "abraça" para trás (centro em Z = -raioCentro).
 */
export function setorCurvo(
  raioCentro: number,
  raioInterno: number,
  raioExterno: number,
  angulo: number,
  altura: number,
  detalhe: Detalhe,
) {
  const passos = segmentos(detalhe, 48, 16);
  const forma = new THREE.Shape();
  const ponto = (r: number, a: number) => new THREE.Vector2(r * Math.sin(a), raioCentro - r * Math.cos(a));
  for (let i = 0; i <= passos; i++) {
    const a = -angulo + (2 * angulo * i) / passos;
    const p = ponto(raioExterno, a);
    if (i === 0) forma.moveTo(p.x, p.y);
    else forma.lineTo(p.x, p.y);
  }
  for (let i = passos; i >= 0; i--) {
    const a = -angulo + (2 * angulo * i) / passos;
    const p = ponto(raioInterno, a);
    forma.lineTo(p.x, p.y);
  }
  forma.closePath();
  const geo = new THREE.ExtrudeGeometry(forma, {
    depth: altura,
    bevelEnabled: false,
    curveSegments: 1,
  });
  // Forma no plano XY → planta no plano XZ, extrusão para +Y.
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/** Libera as geometrias quando o componente sai da tela. */
export function liberar(geos: Record<string, THREE.BufferGeometry | THREE.BufferGeometry[]>) {
  Object.values(geos).forEach((g) => (Array.isArray(g) ? g.forEach((x) => x.dispose()) : g.dispose()));
}
