/**
 * Geometria procedural: todos os modelos 3D do site são gerados aqui, em
 * código (sem .glb externo, sem licença de terceiros, ~0 kB de download).
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import { aleatorio } from "./tempo";

const ruido = new SimplexNoise({ random: aleatorio(23) });

/** Finaliza: junta vértices duplicados e recalcula normais suaves. */
function suavizarGeometria(g: THREE.BufferGeometry) {
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  const unida = mergeVertices(g, 1e-4);
  unida.computeVertexNormals();
  return unida;
}

/** Caixa com cantos arredondados e superfície irregular (carne, frango, queijo). */
export function pedacoIrregular(l: number, a: number, p: number, raio: number, irregular: number, semente: number, segmentos = 10) {
  const g = new THREE.BoxGeometry(l, a, p, segmentos, segmentos, segmentos);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const dentro = new THREE.Vector3();
  const n = new THREE.Vector3();
  const [hx, hy, hz] = [l / 2 - raio, a / 2 - raio, p / 2 - raio];
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    dentro.set(THREE.MathUtils.clamp(v.x, -hx, hx), THREE.MathUtils.clamp(v.y, -hy, hy), THREE.MathUtils.clamp(v.z, -hz, hz));
    n.subVectors(v, dentro).normalize();
    v.copy(dentro).addScaledVector(n, raio);
    const k = ruido.noise3d(v.x * 3.2 + semente, v.y * 3.2, v.z * 3.2) * 0.7 + ruido.noise3d(v.x * 9 + semente, v.y * 9, v.z * 9) * 0.3;
    v.addScaledVector(n, k * irregular);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return suavizarGeometria(g);
}

/** Pedaço de linguiça: cápsula com rugas leves. */
export function pedacoLinguica() {
  const g = new THREE.CapsuleGeometry(0.16, 0.26, 10, 24);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const radial = new THREE.Vector3(v.x, 0, v.z).normalize();
    const k = ruido.noise3d(v.x * 6, v.y * 10, v.z * 6) * 0.012;
    v.addScaledVector(radial, k);
    v.x += Math.sin(v.y * 3) * 0.02; // leve curva
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return suavizarGeometria(g);
}

/** Pedra de carvão em brasa. */
export function pedraCarvao() {
  const g = new THREE.IcosahedronGeometry(0.11, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + ruido.noise3d(v.x * 14, v.y * 14, v.z * 14) * 0.28;
    v.multiplyScalar(k);
    v.y *= 0.7;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return suavizarGeometria(g);
}

/** Pão (base ou topo) por revolução de um perfil. */
export function pao(topo: boolean) {
  const perfil = topo
    ? [
        [0, 0],
        [0.98, 0],
        [1.03, 0.07],
        [1.02, 0.22],
        [0.93, 0.42],
        [0.74, 0.58],
        [0.45, 0.68],
        [0, 0.71],
      ]
    : [
        [0, 0],
        [0.88, 0],
        [0.98, 0.05],
        [1.01, 0.15],
        [0.97, 0.25],
        [0.9, 0.3],
        [0, 0.3],
      ];
  const pontos = perfil.map(([x, y]) => new THREE.Vector2(x, y));
  return suavizarGeometria(new THREE.LatheGeometry(pontos, 56));
}

/** Gergelim distribuído na superfície do pão de cima. */
export function posicoesGergelim(qtd: number) {
  const rnd = aleatorio(7);
  const m = new THREE.Matrix4();
  const lista: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < qtd; i++) {
    const ang = rnd() * Math.PI * 2;
    const t = 0.25 + rnd() * 0.72; // altura relativa no domo
    const raio = Math.sqrt(Math.max(0, 1 - t * t)) * 1.0;
    const y = 0.71 * t + 0.02;
    const pos = new THREE.Vector3(Math.cos(ang) * raio, y, Math.sin(ang) * raio);
    const normal = new THREE.Vector3(pos.x, (pos.y - 0.1) * 1.6, pos.z).normalize();
    q.setFromUnitVectors(up, normal);
    const giro = new THREE.Quaternion().setFromAxisAngle(normal, rnd() * Math.PI);
    m.compose(pos, giro.multiply(q), new THREE.Vector3(0.034, 0.012, 0.02));
    lista.push(m.clone());
  }
  return lista;
}

/** Carne do hambúrguer: disco grosso com borda irregular. */
export function discoCarne() {
  const g = new THREE.CylinderGeometry(1.03, 1.0, 0.26, 56, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r > 0.01) {
      const k = 1 + ruido.noise3d(v.x * 4, v.y * 6, v.z * 4) * 0.035;
      v.x *= k;
      v.z *= k;
    }
    v.y += ruido.noise3d(v.x * 5, 0.3, v.z * 5) * 0.012;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  return suavizarGeometria(g);
}

/** Fatia de queijo caindo pelas bordas. */
export function fatiaQueijo() {
  const g = new THREE.PlaneGeometry(1.8, 1.8, 28, 28);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const queda = Math.max(0, r - 0.92);
    pos.setY(i, -queda * queda * 1.6 - queda * 0.35 + ruido.noise3d(x * 2, 1, z * 2) * 0.01);
  }
  g.computeVertexNormals();
  return g;
}

/** Folha de alface ondulada. */
export function folhaAlface() {
  // Anel subdividido (8 voltas) para conseguir ondular a borda.
  const anel = new THREE.RingGeometry(0.001, 1.12, 96, 8);
  anel.rotateX(-Math.PI / 2);
  const pos = anel.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const r = Math.hypot(x, z);
    const ang = Math.atan2(z, x);
    const onda = Math.sin(ang * 13) * 0.05 + ruido.noise3d(x * 3, 2, z * 3) * 0.04;
    pos.setY(i, onda * r * r - Math.max(0, r - 0.9) * 0.25);
  }
  anel.computeVertexNormals();
  return anel;
}

/** Barras da grelha (matrizes de instância). */
export function barrasGrelha(qtd: number, largura: number) {
  const lista: THREE.Matrix4[] = [];
  for (let i = 0; i < qtd; i++) {
    const x = -largura / 2 + (largura / (qtd - 1)) * i;
    lista.push(new THREE.Matrix4().makeTranslation(x, 0, 0));
  }
  return lista;
}

/** Pedras de carvão espalhadas no fundo da churrasqueira. */
export function posicoesCarvao(qtd: number, semente = 11) {
  const rnd = aleatorio(semente);
  const lista: THREE.Matrix4[] = [];
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (let i = 0; i < qtd; i++) {
    const x = (rnd() - 0.5) * 2.85;
    const z = (rnd() - 0.5) * 1.55;
    const camada = Math.floor(rnd() * 3);
    const y = -0.5 + camada * 0.07 + rnd() * 0.05;
    const s = 0.7 + rnd() * 0.85;
    e.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);
    q.setFromEuler(e);
    lista.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.4), s)));
  }
  return lista;
}
