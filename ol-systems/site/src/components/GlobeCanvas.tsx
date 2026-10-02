"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import * as THREE from "three";
import { MERIDIANS, PARALLELS, TILT, VIEW, spinAt, surfacePoints } from "@/lib/globe";

/**
 * Globo do logo em 3D: paralelos e meridianos em linhas brancas, pontos que
 * acendem em verde ("site atualizado") e arcos de dados entre eles.
 * Geometria 100% procedural, sem modelo .glb para baixar.
 */

const SEG = 120;
const deg = (d: number) => (d * Math.PI) / 180;
const onSphere = (lat: number, lon: number, r = 1) =>
  new THREE.Vector3(r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon));

function buildWireframe() {
  const pos: number[] = [];
  const order: number[] = [];
  const lines: THREE.Vector3[][] = [];
  for (const lon of MERIDIANS) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEG; i++) pts.push(onSphere(-Math.PI + (i / SEG) * Math.PI * 2, deg(lon)));
    lines.push(pts);
  }
  for (const lat of PARALLELS) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= SEG; i++) pts.push(onSphere(deg(lat), (i / SEG) * Math.PI * 2));
    lines.push(pts);
  }
  lines.forEach((pts, li) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      // Ordem de desenho: cada linha entra um pouco depois da anterior e se
      // desenha do começo ao fim.
      const o = li / lines.length + (i / pts.length) * 0.35;
      order.push(o, o);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("aOrder", new THREE.Float32BufferAttribute(order.map((o) => o / 1.35), 1));
  return g;
}

const lineVert = /* glsl */ `
  attribute float aOrder;
  varying float vFacing;
  varying float vOrder;
  void main() {
    vec3 n = normalize(normalMatrix * position);
    vFacing = n.z;
    vOrder = aOrder;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const lineFrag = /* glsl */ `
  uniform float uReveal;
  varying float vFacing;
  varying float vOrder;
  void main() {
    if (vOrder > uReveal) discard;
    float a = mix(0.16, 0.95, smoothstep(-0.35, 0.55, vFacing));
    gl_FragColor = vec4(vec3(1.0), a);
  }
`;

const pointVert = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uPx;
  varying float vFacing;
  varying float vFlash;
  void main() {
    vec3 n = normalize(normalMatrix * position);
    vFacing = n.z;
    float t = fract(uTime * 0.11 + aPhase);
    vFlash = smoothstep(0.0, 0.03, t) * (1.0 - smoothstep(0.03, 0.22, t));
    gl_PointSize = uPx * (3.0 + 9.0 * vFlash);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const pointFrag = /* glsl */ `
  varying float vFacing;
  varying float vFlash;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float core = smoothstep(0.5, 0.1, d);
    float ring = smoothstep(0.5, 0.42, d) * smoothstep(0.3, 0.42, d) * vFlash;
    float vis = smoothstep(-0.05, 0.25, vFacing);
    vec3 col = mix(vec3(1.0), vec3(0.145, 0.827, 0.4), vFlash);
    float a = (core * (0.75 + vFlash) + ring) * vis;
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const arcVert = /* glsl */ `
  attribute float aT;
  varying float vT;
  varying float vFacing;
  void main() {
    vT = aT;
    vFacing = normalize(normalMatrix * position).z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const arcFrag = /* glsl */ `
  uniform float uTime;
  uniform float uOffset;
  varying float vT;
  varying float vFacing;
  void main() {
    float head = fract(uTime * 0.16 + uOffset) * 1.6 - 0.3;
    float trail = smoothstep(head - 0.3, head, vT) * step(vT, head);
    float vis = smoothstep(-0.2, 0.3, vFacing);
    float a = (0.08 + trail * 0.9) * vis;
    vec3 col = mix(vec3(1.0), vec3(0.145, 0.827, 0.4), trail * 0.65);
    gl_FragColor = vec4(col, a);
  }
`;

function Arc({ a, b, offset }: { a: THREE.Vector3; b: THREE.Vector3; offset: number }) {
  const { line, material } = useMemo(() => {
    const pts: number[] = [];
    const ts: number[] = [];
    const N = 80;
    const angle = a.angleTo(b);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      // Interpolação esférica + altura em arco acima da superfície.
      const v = a.clone().multiplyScalar(Math.sin((1 - t) * angle)).add(b.clone().multiplyScalar(Math.sin(t * angle)));
      v.divideScalar(Math.sin(angle)).normalize().multiplyScalar(1 + Math.sin(Math.PI * t) * 0.18 * angle);
      pts.push(v.x, v.y, v.z);
      ts.push(t);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: arcVert,
      fragmentShader: arcFrag,
      uniforms: { uTime: { value: 0 }, uOffset: { value: offset } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { line: new THREE.Line(g, m), material: m };
  }, [a, b, offset]);

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
  });

  return <primitive object={line} />;
}

type SceneProps = { reduced: boolean; pointer: React.RefObject<{ x: number; y: number }>; drawIn: boolean };

function Globe({ reduced, pointer, drawIn }: SceneProps) {
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const { camera, size, gl, invalidate } = useThree();

  // Câmera ortográfica com o mesmo enquadramento do SVG (raio = lado / 2,24).
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.zoom = Math.min(size.width, size.height) / (VIEW * 2);
    cam.updateProjectionMatrix();
    invalidate();
  }, [camera, size, invalidate]);

  const wire = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: lineVert,
      fragmentShader: lineFrag,
      uniforms: { uReveal: { value: reduced || !drawIn ? 1 : 0 } },
      transparent: true,
      depthWrite: false,
    });
    return new THREE.LineSegments(buildWireframe(), m);
  }, [reduced, drawIn]);

  const pts = useMemo(() => surfacePoints(16), []);
  const points = useMemo(() => {
    const pos: number[] = [];
    const phase: number[] = [];
    for (const p of pts) {
      const v = onSphere(p.lat, p.lon, 1.004);
      pos.push(v.x, v.y, v.z);
      phase.push(p.phase);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: pointVert,
      fragmentShader: pointFrag,
      uniforms: { uTime: { value: 0 }, uPx: { value: gl.getPixelRatio() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return new THREE.Points(g, m);
  }, [pts, gl]);

  const arcs = useMemo(() => {
    const pairs: [number, number][] = [
      [0, 5],
      [3, 9],
      [7, 12],
      [10, 2],
    ];
    return pairs.map(([i, j], k) => ({
      a: onSphere(pts[i].lat, pts[i].lon),
      b: onSphere(pts[j].lat, pts[j].lon),
      offset: k * 0.27,
    }));
  }, [pts]);

  const start = useRef<number | null>(null);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (start.current === null) start.current = t;
    const age = t - start.current;
    const wm = wire.material as THREE.ShaderMaterial;
    if (!reduced) {
      if (drawIn) {
        // Entrada: as linhas se desenham em ~2,4 s com desaceleração.
        const r = Math.min(age / 2.4, 1);
        wm.uniforms.uReveal.value = 1 - Math.pow(1 - r, 3);
      }
      // Mesmo relógio do globo em SVG: a troca entre os dois não dá salto.
      if (spinRef.current) spinRef.current.rotation.y = spinAt(performance.now());
    }
    (points.material as THREE.ShaderMaterial).uniforms.uTime.value = t;
    (points.material as THREE.ShaderMaterial).uniforms.uPx.value = gl.getPixelRatio();
    if (tiltRef.current && pointer.current) {
      const g = tiltRef.current;
      const k = 1 - Math.exp(-delta * 3);
      g.rotation.x += (TILT + pointer.current.y * 0.12 - g.rotation.x) * k;
      g.rotation.z += (-pointer.current.x * 0.08 - g.rotation.z) * k;
    }
  });

  return (
    <group ref={tiltRef} rotation={[TILT, 0, 0]}>
      <group ref={spinRef}>
        <primitive object={wire} />
        <primitive object={points} />
        {arcs.map((a, i) => (
          <Arc key={i} {...a} />
        ))}
      </group>
    </group>
  );
}

export default function GlobeCanvas({
  onReady,
  lite,
  drawIn = true,
}: {
  onReady?: () => void;
  /** Tela menor: sem pós-processamento. */
  lite: boolean;
  /** Linhas se desenham na entrada (desligado quando substitui o globo em SVG). */
  drawIn?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [visible, setVisible] = useState(true);
  const [bloom, setBloom] = useState(!lite);
  const [dpr, setDpr] = useState(1.5);
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <div ref={wrap} className="absolute inset-0">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 10], near: 0.1, far: 50, zoom: 100 }}
        dpr={[1, Math.min(dpr, 1.75)]}
        // Fora da tela o render para; com movimento reduzido só desenha quando precisa.
        frameloop={!visible ? "never" : reduced ? "demand" : "always"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()))}
        aria-hidden="true"
      >
        <PerformanceMonitor
          onDecline={() => {
            setBloom(false);
            setDpr(1);
          }}
          onIncline={() => setDpr(1.75)}
        >
          <Globe reduced={reduced} pointer={pointer} drawIn={drawIn} />
          {bloom && !reduced && (
            <EffectComposer multisampling={0}>
              <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.15} luminanceSmoothing={0.3} radius={0.7} />
            </EffectComposer>
          )}
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
