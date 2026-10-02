"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { palco } from "@/lib/palco";
import { R } from "./geometria";
import { Roda, type RecursosRoda } from "./Roda";
import { estadoCena } from "./estado";

/**
 * ALINHAMENTO E BALANCEAMENTO: o eixo dianteiro visto de cima, como na tela da
 * máquina de alinhamento. Linhas de laser saem de cada roda até um alvo à frente.
 *   antes  -> rodas fora de ângulo (laser vermelho fora do centro) e tremendo
 *   depois -> rodas paralelas (laser amarelo no centro) e contrapeso no aro
 * Ângulos exagerados de propósito, para ficar fácil de ver.
 */
const BITOLA = 1.62;
const COMPRIMENTO_LASER = 5.2;
const ORIGEM = new THREE.Vector3(30, 0, 0);

const VERMELHO = new THREE.Color("#e10600").multiplyScalar(3.2);
const AMARELO = new THREE.Color("#ffc400").multiplyScalar(2.6);

type Lado = { sinal: 1 | -1; toe: number; camber: number };
const LADOS: Lado[] = [
  { sinal: -1, toe: 0.13, camber: -0.07 },
  { sinal: 1, toe: 0.05, camber: 0.02 },
];

export function Alinhamento3D({ recursos, layout }: { recursos: RecursosRoda; layout: "desktop" | "mobile" }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const grupo = useRef<THREE.Group>(null);
  const toes = useRef<(THREE.Group | null)[]>([]);
  const cambers = useRef<(THREE.Group | null)[]>([]);
  const giros = useRef<(THREE.Group | null)[]>([]);
  const pesos = useRef<(THREE.Mesh | null)[]>([]);
  const pontos = useRef<(THREE.Mesh | null)[]>([]);
  const luz = useRef<THREE.DirectionalLight>(null);
  const st = useRef({ a: 0, t: 0, ativo: false });

  const mats = useMemo(
    () => ({
      laser: [0, 1].map(() => new THREE.MeshBasicMaterial({ color: VERMELHO.clone(), toneMapped: false })),
      ref: new THREE.MeshBasicMaterial({ color: "#f4f4f2", transparent: true, opacity: 0.22, toneMapped: false }),
      alvo: new THREE.MeshStandardMaterial({ color: "#1c1d20", roughness: 0.6 }),
      marca: new THREE.MeshBasicMaterial({ color: "#f4f4f2", toneMapped: false }),
      prato: new THREE.MeshStandardMaterial({ color: "#26272b", metalness: 0.6, roughness: 0.4 }),
      pratoBorda: new THREE.MeshStandardMaterial({ color: "#ffc400", roughness: 0.5 }),
      eixo: new THREE.MeshStandardMaterial({ color: "#2a2b2f", metalness: 0.8, roughness: 0.35 }),
      peso: new THREE.MeshStandardMaterial({ color: "#ffc400", emissive: "#ffc400", emissiveIntensity: 0.8, metalness: 0.5, roughness: 0.3 }),
    }),
    [],
  );

  useFrame((state, dtBruto) => {
    const dt = Math.min(dtBruto, 1 / 20);
    const s = st.current;
    const ativo = palco.alinhamentoVisivel && !palco.principalVisivel;
    if (grupo.current) grupo.current.visible = ativo;
    if (!ativo) {
      s.ativo = false;
      return;
    }
    const entrou = !s.ativo;
    s.ativo = true;
    s.t += dt;
    s.a = entrou ? palco.alinhado : THREE.MathUtils.damp(s.a, palco.alinhado, 3.2, dt);
    const a = s.a;

    estadoCena.posPneu.copy(ORIGEM);
    estadoCena.foco.set(ORIGEM.x, R, ORIGEM.z - 0.6);

    LADOS.forEach((lado, i) => {
      const toe = toes.current[i];
      const cam = cambers.current[i];
      const giro = giros.current[i];
      const tremor = (1 - a) * Math.sin(s.t * 38 + i * 1.7) * 0.012;
      if (toe) toe.rotation.y = lado.toe * (1 - a);
      if (cam) cam.rotation.z = lado.camber * (1 - a) * lado.sinal + tremor;
      if (giro) giro.rotation.z += dt * 2.4;
      const peso = pesos.current[i];
      if (peso) peso.scale.setScalar(Math.max(0.0001, THREE.MathUtils.smoothstep(a, 0.6, 1)));
      mats.laser[i].color.copy(VERMELHO).lerp(AMARELO, THREE.MathUtils.smoothstep(a, 0.55, 0.95));
      // ponto do laser no alvo
      const ponto = pontos.current[i];
      if (ponto) {
        const ang = lado.toe * (1 - a);
        ponto.position.x = -Math.sin(ang) * COMPRIMENTO_LASER;
      }
    });

    // câmera de cima, um pouco inclinada
    const alvo = new THREE.Vector3(ORIGEM.x, 0.5, ORIGEM.z - 2.2);
    const dist = layout === "mobile" ? 18 : 15;
    // de cima e um pouco à frente (≈ 58°), como a tela da máquina de alinhamento
    camera.position.set(alvo.x, alvo.y + dist * 0.85, alvo.z + dist * 0.53);
    camera.lookAt(alvo);
    camera.fov = layout === "mobile" ? 40 : 30;
    const { width: w, height: h } = state.size;
    const ax = layout === "mobile" ? 0 : 0.34;
    const ay = layout === "mobile" ? 0.38 : 0;
    camera.setViewOffset(w, h, -ax * w * 0.5, ay * h * 0.5, w, h);
    camera.updateProjectionMatrix();

    if (luz.current) {
      luz.current.position.set(ORIGEM.x - 3, 6, ORIGEM.z + 4);
      luz.current.target.position.copy(ORIGEM);
      luz.current.target.updateMatrixWorld();
    }
    state.invalidate();
  });

  return (
    <group ref={grupo} position={ORIGEM} visible={false}>
      <directionalLight ref={luz} intensity={2.2} color="#fff4e6" />
      {/* eixo do carro e linha de centro */}
      <mesh position={[0, R, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.eixo}>
        <cylinderGeometry args={[0.05, 0.05, BITOLA * 2 - 0.5, 16]} />
      </mesh>
      {Array.from({ length: 9 }, (_, k) => (
        <mesh key={k} position={[0, 0.006, 1.2 - k * 0.8]} rotation={[-Math.PI / 2, 0, 0]} material={mats.ref}>
          <planeGeometry args={[0.04, 0.42]} />
        </mesh>
      ))}

      {LADOS.map((lado, i) => (
        <group key={i} position={[lado.sinal * BITOLA, 0, 0]}>
          {/* prato giratório da rampa */}
          <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.prato}>
            <circleGeometry args={[0.95, 48]} />
          </mesh>
          <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.pratoBorda}>
            <ringGeometry args={[0.92, 0.95, 64]} />
          </mesh>
          {/* linha de referência reta (eixo do carro) */}
          <mesh position={[0, R, -COMPRIMENTO_LASER / 2]} material={mats.ref}>
            <boxGeometry args={[0.012, 0.012, COMPRIMENTO_LASER]} />
          </mesh>
          {/* roda: convergência (Y) > cambagem (Z) > giro */}
          <group ref={(g) => void (toes.current[i] = g)}>
            <mesh position={[0, R, -COMPRIMENTO_LASER / 2]} material={mats.laser[i]}>
              <boxGeometry args={[0.02, 0.02, COMPRIMENTO_LASER]} />
            </mesh>
            <group ref={(g) => void (cambers.current[i] = g)}>
              <group position={[0, R, 0]} rotation={[0, (lado.sinal * Math.PI) / 2, 0]}>
                <group ref={(g) => void (giros.current[i] = g)}>
                  <Roda recursos={recursos} />
                  <mesh
                    ref={(m) => void (pesos.current[i] = m)}
                    position={[0, 0.6, 0.2]}
                    material={mats.peso}
                  >
                    <boxGeometry args={[0.07, 0.03, 0.035]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
          {/* alvo à frente, onde o laser bate */}
          <mesh position={[0, R, -COMPRIMENTO_LASER - 0.03]} material={mats.alvo}>
            <boxGeometry args={[1.3, 0.5, 0.04]} />
          </mesh>
          <mesh position={[0, R, -COMPRIMENTO_LASER]} material={mats.marca}>
            <boxGeometry args={[0.012, 0.42, 0.01]} />
          </mesh>
          <mesh ref={(m) => void (pontos.current[i] = m)} position={[0, R, -COMPRIMENTO_LASER + 0.01]} material={mats.laser[i]}>
            <sphereGeometry args={[0.045, 16, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
