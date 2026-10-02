"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { partesMedida } from "@/content/textos";
import { FAIXAS, indiceAtivo, palco } from "@/lib/palco";
import { R, R_TEXTO } from "./geometria";
import type { Percurso } from "./percurso";
import { Roda, type CamadasRef, type RecursosRoda } from "./Roda";
import { estadoCena } from "./estado";

/**
 * DIRETOR: decide, a cada quadro, onde estão o pneu, a câmera e a luz.
 *
 * A linha do tempo T vem da rolagem (0..5):
 *   0 hero  ->  1 começo da leitura da medida  ->  2 fim da leitura
 *   ->  3 seletor  ->  4 entrada da vista explodida  ->  5 fim da vista explodida
 *
 * Cada marco tem uma "pose" de câmera (ângulo em volta do pneu, distância, e onde o
 * assunto fica na tela via setViewOffset). Entre marcos a pose é interpolada e,
 * por cima, amortecida, para tudo andar macio mesmo com rolagem brusca.
 */

type Pose = {
  /** azimute relativo à normal do lado de fora da roda (0 = de frente para o flanco) */
  az: number;
  el: number;
  dist: number;
  /** posição do assunto na tela, em NDC (-1..1) */
  ax: number;
  ay: number;
  fov: number;
  /** 0 = centro do pneu, 1 = letras da medida no flanco */
  alvo: number;
  elev: number;
};

function poses(layout: "desktop" | "mobile", guinadaP0: number): Pose[] {
  if (layout === "mobile") {
    return [
      { az: -guinadaP0, el: 0.08, dist: 9.8, ax: 0, ay: -0.04, fov: 40, alvo: 0, elev: 0 },
      { az: 0, el: 0.04, dist: 2.45, ax: 0, ay: 0.4, fov: 40, alvo: 1, elev: 0 },
      { az: 0.05, el: 0.05, dist: 2.3, ax: 0, ay: 0.4, fov: 40, alvo: 1, elev: 0 },
      { az: -0.35, el: 0.12, dist: 7.2, ax: 0, ay: 0.45, fov: 40, alvo: 0, elev: 0 },
      { az: -0.95, el: 0.24, dist: 11.5, ax: 0, ay: 0.36, fov: 40, alvo: 0, elev: 0.35 },
      { az: -0.95, el: 0.24, dist: 12.5, ax: 0, ay: 0.36, fov: 40, alvo: 0, elev: 0.35 },
    ];
  }
  return [
    { az: -guinadaP0, el: 0.07, dist: 7.6, ax: 0.38, ay: -0.06, fov: 30, alvo: 0, elev: 0 },
    { az: 0, el: 0.035, dist: 1.85, ax: 0.27, ay: 0.06, fov: 30, alvo: 1, elev: 0 },
    { az: 0.06, el: 0.05, dist: 1.7, ax: 0.27, ay: 0.06, fov: 30, alvo: 1, elev: 0 },
    { az: -0.32, el: 0.1, dist: 5.2, ax: 0.44, ay: 0.0, fov: 30, alvo: 0, elev: 0 },
    { az: -0.95, el: 0.24, dist: 9, ax: 0.3, ay: 0.0, fov: 30, alvo: 0, elev: 0.35 },
    { az: -0.95, el: 0.24, dist: 10.6, ax: 0.3, ay: 0.02, fov: 30, alvo: 0, elev: 0.35 },
  ];
}

const suave = (t: number) => t * t * (3 - 2 * t);
const damp = THREE.MathUtils.damp;

/** Tokens da medida de exemplo e quais deles acendem (largura, perfil, aro, carga, velocidade). */
const TOKENS_EXEMPLO = ["175", "/", "70", " ", "R14", " ", "84", "T"];
const ROTULOS_EXEMPLO = [0, 2, 4, 6, 7];

export function Diretor({
  recursos,
  percurso,
  layout,
  pularIntro,
}: {
  recursos: RecursosRoda;
  percurso: Percurso;
  layout: "desktop" | "mobile";
  pularIntro: boolean;
}) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const raiz = useRef<THREE.Group>(null);
  const inclina = useRef<THREE.Group>(null);
  const giro = useRef<THREE.Group>(null);
  const sombra = useRef<THREE.Group>(null);
  const luzChave = useRef<THREE.DirectionalLight>(null);
  const luzRecorte = useRef<THREE.DirectionalLight>(null);
  const camadas = useRef<CamadasRef>({ banda: null, cinta: null, carcaca: null, flanco: null, talao: null, aro: null });

  const tabela = useMemo(() => {
    const p = new THREE.Vector3();
    const t = new THREE.Vector3();
    percurso.amostrar(percurso.s0, p, t);
    return poses(layout, percurso.guinada(t));
  }, [layout, percurso]);

  // Texto da medida fica no alto do flanco quando o pneu para em P1.
  useMemo(() => {
    const giroFinal = percurso.giro(percurso.L);
    const phi = Math.PI - giroFinal;
    recursos.flanco.uCentro = (((1 - phi / (2 * Math.PI)) % 1) + 1) % 1;
  }, [percurso, recursos]);

  const st = useRef({
    T: 0,
    s: pularIntro ? percurso.s0 : 0,
    intro: pularIntro ? ("feito" as "espera" | "rolando" | "feito") : ("espera" as "espera" | "rolando" | "feito"),
    introX: pularIntro ? 0 : -percurso.s0,
    introV: 0,
    balanco: 0,
    balancoV: 0,
    yawExtra: 0,
    lean: 0,
    arrasto: 0,
    az: tabela[0].az,
    el: tabela[0].el,
    dist: tabela[0].dist,
    ax: tabela[0].ax,
    ay: tabela[0].ay,
    fov: tabela[0].fov,
    alvoMix: 0,
    elev: 0,
    explode: 0,
    emissFlanco: 0,
    emissCamadas: [0, 0, 0, 0, 0],
    relogio: 0,
    primeiro: true,
  });

  const v = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      centro: new THREE.Vector3(),
      texto: new THREE.Vector3(),
      assunto: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      eixoY: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );

  useFrame((state, dtBruto) => {
    const dt = Math.min(dtBruto, 0.1);
    const e = st.current;
    // primeiro quadro e modo captura: sem amortecimento (vai direto para a pose)
    const k = e.primeiro || palco.captura ? 1000 : 1;
    e.relogio = palco.relogioCaptura ?? e.relogio + dt;
    estadoCena.relogio = e.relogio;
    let animando = false;

    // ---------------- linha do tempo vinda da rolagem ----------------
    const T = palco.heroP + palco.medidaP + palco.seletorP + palco.anatomiaEntradaP + palco.anatomiaP;
    e.T = T;

    // ---------------- intro: entra rolando e para com balanço de mola ----------------
    if (e.intro === "espera" && palco.introLiberada) e.intro = "rolando";
    if (e.intro === "rolando") {
      // integra a mola em passos fixos (estável em qualquer fps)
      const passos = Math.ceil(dt / (1 / 240));
      const h = dt / passos;
      for (let i = 0; i < passos; i++) {
        const acel = -14 * e.introX - 6.2 * e.introV;
        e.introV += acel * h;
        e.introX += e.introV * h;
        // balanço lateral: a frenagem empurra o pneu, a mola devolve
        const acelB = -60 * e.balanco - 3.2 * e.balancoV - acel * 0.0045;
        e.balancoV += acelB * h;
        e.balanco += e.balancoV * h;
      }
      if (Math.abs(e.introX) < 0.0015 && Math.abs(e.introV) < 0.01 && Math.abs(e.balanco) < 0.0008 && Math.abs(e.balancoV) < 0.01) {
        e.intro = "feito";
        e.introX = 0;
        e.balanco = 0;
      }
      animando = true;
    }

    // ---------------- posição no percurso ----------------
    const sRolagem = percurso.s0 + Math.min(1, palco.heroP) * (percurso.L - percurso.s0);
    const sAlvo = THREE.MathUtils.clamp(sRolagem + e.introX, 0, percurso.L);
    e.s = e.intro === "rolando" ? sAlvo : damp(e.s, sAlvo, 7 * k, dt);
    if (Math.abs(e.s - sAlvo) > 1e-4) animando = true;
    estadoCena.s = e.s;

    percurso.amostrar(e.s, v.pos, v.tan);
    const yaw = percurso.guinada(v.tan);
    estadoCena.posPneu.copy(v.pos);

    // ---------------- pose da câmera por interpolação de marcos ----------------
    const i0 = Math.min(4, Math.floor(T));
    const f = suave(THREE.MathUtils.clamp(T - i0, 0, 1));
    const a = tabela[i0];
    const b = tabela[i0 + 1];
    const alvo = {
      az: a.az + (b.az - a.az) * f,
      el: a.el + (b.el - a.el) * f,
      dist: a.dist + (b.dist - a.dist) * f,
      ax: a.ax + (b.ax - a.ax) * f,
      ay: a.ay + (b.ay - a.ay) * f,
      fov: a.fov + (b.fov - a.fov) * f,
      alvo: a.alvo + (b.alvo - a.alvo) * f,
      elev: a.elev + (b.elev - a.elev) * f,
    };

    // hero vivo: balanço lento, mouse/giroscópio e arrasto no toque
    const heroF = THREE.MathUtils.clamp(1 - palco.heroP * 1.6, 0, 1);
    estadoCena.hero = heroF;
    // balanço lento com período de 6 s (o vídeo de reserva tem 6 s e fecha o loop)
    const sway = e.intro === "feito" ? Math.sin((e.relogio * Math.PI * 2) / 6) * 0.1 * heroF : 0;
    e.yawExtra = damp(e.yawExtra, palco.ponteiro.x * 0.32 * heroF + sway, 4 * k, dt);
    e.lean = damp(e.lean, palco.ponteiro.y * 0.06 * heroF, 4 * k, dt);
    e.arrasto = damp(e.arrasto, palco.arrasto * heroF, 6 * k, dt);
    if (heroF > 0.001) animando = true;

    // amortecimento da câmera
    const lam = 5.5 * k;
    e.az = damp(e.az, alvo.az, lam, dt);
    e.el = damp(e.el, alvo.el, lam, dt);
    e.dist = damp(e.dist, alvo.dist, lam, dt);
    e.ax = damp(e.ax, alvo.ax, lam, dt);
    e.ay = damp(e.ay, alvo.ay, lam, dt);
    e.fov = damp(e.fov, alvo.fov, lam, dt);
    e.alvoMix = damp(e.alvoMix, alvo.alvo, lam, dt);
    e.elev = damp(e.elev, alvo.elev, lam, dt);
    const explodeAlvo = T >= 4 ? suave(THREE.MathUtils.clamp(palco.anatomiaP / FAIXAS.explosao, 0, 1)) : 0;
    e.explode = damp(e.explode, explodeAlvo, 6 * k, dt);
    if (
      Math.abs(e.dist - alvo.dist) > 1e-3 ||
      Math.abs(e.az - alvo.az) > 1e-4 ||
      Math.abs(e.ax - alvo.ax) > 1e-4 ||
      Math.abs(e.ay - alvo.ay) > 1e-4 ||
      Math.abs(e.explode - explodeAlvo) > 1e-4 ||
      Math.abs(e.elev - alvo.elev) > 1e-4
    )
      animando = true;

    // ---------------- aplica no pneu ----------------
    if (raiz.current && inclina.current && giro.current) {
      raiz.current.visible = palco.principalVisivel;
      raiz.current.position.set(v.pos.x, 0, v.pos.z);
      raiz.current.rotation.set(0, yaw + e.yawExtra + e.arrasto, 0);
      inclina.current.rotation.set(e.lean + e.balanco, 0, 0);
      inclina.current.position.y = e.elev;
      giro.current.position.y = R;
      giro.current.rotation.z = percurso.giro(e.s);
    }
    if (sombra.current) {
      sombra.current.position.set(v.pos.x, 0.004, v.pos.z);
      // pneu flutuando na vista explodida: sem sombra de contato
      sombra.current.visible = palco.principalVisivel && e.elev < 0.03;
    }

    // vista explodida: camadas se afastam ao longo do eixo
    const c = camadas.current;
    const E = e.explode;
    const esp = layout === "mobile" ? 1.0 : 1.1;
    if (c.banda) c.banda.position.z = 2 * esp * E;
    if (c.cinta) {
      c.cinta.position.z = 1 * esp * E;
      c.cinta.visible = E > 0.002;
    }
    if (c.carcaca) c.carcaca.visible = E > 0.002;
    if (c.flanco) c.flanco.position.z = -1 * esp * E;
    if (c.talao) {
      c.talao.position.z = -2 * esp * E;
      c.talao.visible = E > 0.002;
    }
    if (c.aro) {
      c.aro.position.z = -7 * E;
      c.aro.visible = E < 0.9;
    }

    // ---------------- destaques: partes da medida e camadas ----------------
    const naMedida = T > 0.98 && T < 2.02;
    const destaque = naMedida ? indiceAtivo(palco.medidaP, partesMedida.length, 0.04, 0.97) : null;
    const camadaAtiva = T >= 4 && palco.anatomiaP > FAIXAS.explosao ? indiceAtivo(palco.anatomiaP, 5, FAIXAS.explosao, 1) : -1;
    if (T < 2.5) recursos.flanco.desenhar(TOKENS_EXEMPLO, destaque, ROTULOS_EXEMPLO);
    else {
      const m = palco.medidaEscolhida.match(/^(\d+)\/(\d+) (R\d+)$/);
      const tokens = m ? [m[1], "/", m[2], " ", m[3]] : [palco.medidaEscolhida];
      // na vista explodida, com o flanco ativo, o mapa emissivo vira uma área cheia
      recursos.flanco.desenhar(tokens, null, [], camadaAtiva === 3 || e.emissCamadas[3] > 0.01);
    }
    e.emissFlanco = damp(e.emissFlanco, destaque !== null ? 2.4 : 0, 8 * k, dt);
    if (Math.abs(e.emissFlanco - (destaque !== null ? 2.4 : 0)) > 1e-3) animando = true;

    const mats = [
      [recursos.mat.banda],
      [recursos.mat.cinta],
      [recursos.mat.carcaca],
      [recursos.mat.flancoA, recursos.mat.flancoB],
      [recursos.mat.talao],
    ];
    mats.forEach((lista, i) => {
      // a borracha preta satura rápido: a banda acende mais fraco que o aço
      const alvoE = camadaAtiva === i ? (i === 0 ? 0.28 : 0.5) : 0;
      e.emissCamadas[i] = damp(e.emissCamadas[i], alvoE, 7 * k, dt);
      if (Math.abs(e.emissCamadas[i] - alvoE) > 1e-3) animando = true;
      for (const m of lista) m.emissiveIntensity = e.emissCamadas[i];
    });
    recursos.mat.flancoB.emissiveIntensity = Math.max(e.emissFlanco, e.emissCamadas[3]);

    // ---------------- câmera ----------------
    v.centro.set(v.pos.x, R + e.elev, v.pos.z);
    v.q.setFromAxisAngle(v.eixoY, yaw);
    v.texto.set(0, R_TEXTO + 0.02, 0.3).applyQuaternion(v.q).add(v.centro);
    v.assunto.lerpVectors(v.centro, v.texto, e.alvoMix);
    estadoCena.foco.copy(v.assunto);

    if (!palco.alinhamentoVisivel || palco.principalVisivel) {
      const azMundo = yaw + e.az;
      const ce = Math.cos(e.el);
      camera.position.set(
        v.assunto.x + e.dist * ce * Math.sin(azMundo),
        v.assunto.y + e.dist * Math.sin(e.el),
        v.assunto.z + e.dist * ce * Math.cos(azMundo),
      );
      camera.lookAt(v.assunto);
      camera.fov = e.fov;
      camera.near = 0.05;
      camera.far = 60;
      const { width: w, height: hgt } = state.size;
      camera.setViewOffset(w, hgt, -e.ax * w * 0.5, e.ay * hgt * 0.5, w, hgt);
      camera.updateProjectionMatrix();
    }

    // ---------------- luz: o mouse muda o ângulo e o brilho corre nos sulcos ----------------
    estadoCena.luzChao = damp(estadoCena.luzChao, T > 3.5 ? 0.55 : 1, 4 * k, dt);
    if (luzChave.current) {
      const ang = yaw + 0.9 + palco.ponteiro.x * 0.9 * heroF;
      luzChave.current.position.set(
        v.centro.x + Math.sin(ang) * 5,
        v.centro.y + 3.6 + palco.ponteiro.y * 1.8 * heroF,
        v.centro.z + Math.cos(ang) * 5,
      );
      luzChave.current.target.position.copy(v.centro);
      luzChave.current.target.updateMatrixWorld();
    }
    if (luzRecorte.current) {
      luzRecorte.current.position.set(v.centro.x - Math.sin(yaw) * 4 - 2, v.centro.y + 2.2, v.centro.z - Math.cos(yaw) * 4);
      luzRecorte.current.target.position.copy(v.centro);
      luzRecorte.current.target.updateMatrixWorld();
    }

    e.primeiro = false;
    estadoCena.animando = animando;
    if (animando && (palco.principalVisivel || palco.alinhamentoVisivel)) state.invalidate();
  });

  return (
    <>
      <directionalLight ref={luzChave} intensity={2.4} color="#fff4e6" />
      <directionalLight ref={luzRecorte} intensity={1.6} color="#dbe6ff" />
      <group ref={raiz}>
        <group ref={inclina}>
          <group ref={giro}>
            <Roda recursos={recursos} camadas={camadas.current} comInternas />
          </group>
        </group>
      </group>
      <group ref={sombra}>
        <ContactShadows
          opacity={0.85}
          scale={5}
          blur={2}
          far={0.8}
          resolution={layout === "mobile" ? 256 : 512}
          color="#000000"
          frames={Infinity}
        />
      </group>
    </>
  );
}
