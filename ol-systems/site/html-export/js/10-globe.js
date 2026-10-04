/**
 * Globo do logo (SvgGlobe + GlobeCanvas + parte do HeroVisual).
 * - Todo globo em SVG com data-animate gira a 30 fps e pausa fora da tela.
 * - Em telas com mouse, o globo do hero vira 3D (three.js do CDN) na primeira
 *   interação, com o mesmo enquadramento e o mesmo relógio do SVG: a troca
 *   não dá salto. Se o CDN falhar, fica no SVG sem avisar ninguém.
 */
function initGlobe() {
  const reduce = prefersReducedMotion();

  /* ---------- SVG girando ---------- */

  // Recalcula os meridianos a 30 fps enquanto o SVG está na tela. Devolve o "parar".
  function spinSvg(svg) {
    const nodes = $$("[data-lon]", svg);
    let raf = 0;
    let last = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(svg);
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      // 30 fps é suficiente para um giro lento e poupa bateria.
      if (!visible || t - last < 33) return;
      last = t;
      const spin = GLOBE.spinAt(t);
      for (const n of nodes) {
        const e = GLOBE.meridianEllipse(Number(n.dataset.lon), spin);
        n.setAttribute("ry", e.ry.toFixed(4));
        n.setAttribute("transform", `rotate(${e.rot.toFixed(2)})`);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }

  const svgStops = new Map();
  const startSvg = (svg) => {
    svg.setAttribute("data-animate", "");
    if (reduce || svgStops.has(svg)) return;
    svgStops.set(svg, spinSvg(svg));
  };
  const stopSvg = (svg) => {
    svgStops.get(svg)?.();
    svgStops.delete(svg);
    svg.removeAttribute("data-animate");
  };

  for (const svg of $$('svg[data-h="globe-svg"][data-animate]')) startSvg(svg);

  /* ---------- Hero: SVG → 3D na primeira interação ---------- */

  /**
   * Só em telas com mouse, largas, com WebGL e sem aparelho fraco. Celular fica
   * no SVG: a maior parte das visitas vem do navegador do Instagram.
   */
  function canUpgrade() {
    if (isCoarsePointer() || window.innerWidth < 1024) return false;
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") ?? c.getContext("webgl");
      if (!gl) return false;
      // Solta o contexto de teste (o navegador limita quantos ficam abertos).
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      return false;
    }
    return !((navigator.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2);
  }

  const heroGlobe = $('[data-h="hero-globe"]');
  const heroSvg = heroGlobe && $(':scope > svg[data-h="globe-svg"]', heroGlobe);
  if (!heroSvg || !canUpgrade()) return;

  // Troca para o 3D na primeira interação (não disputa com o carregamento).
  const events = ["pointermove", "wheel", "scroll", "keydown"];
  const go = (e) => {
    if (e.type === "pointermove" && e.pointerType !== "mouse") return;
    events.forEach((n) => window.removeEventListener(n, go));
    upgrade(window.innerWidth < 1280).catch((err) => console.warn("[globe] 3D indisponível, seguindo no SVG", err));
  };
  events.forEach((n) => window.addEventListener(n, go, { passive: true }));

  /* ---------- Cena 3D (port do GlobeCanvas, em three.js puro) ---------- */

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

  // Pós-processamento (bloom) do CDN. Se falhar, o globo sai sem brilho.
  const loadPost = () =>
    Promise.all(
      [CONFIG.cdn.effectComposer, CONFIG.cdn.renderPass, CONFIG.cdn.unrealBloomPass, CONFIG.cdn.outputPass].map((u) => import(u)),
    ).then(([a, b, c, d]) => ({
      EffectComposer: a.EffectComposer,
      RenderPass: b.RenderPass,
      UnrealBloomPass: c.UnrealBloomPass,
      OutputPass: d.OutputPass,
    }));

  /** lite = tela menor que 1280: sem pós-processamento. */
  async function upgrade(lite) {
    const wantBloom = !lite && !reduce;
    const [THREE, post] = await Promise.all([
      import(CONFIG.cdn.three),
      wantBloom ? loadPost().catch(() => null) : null,
    ]).catch(() => []);
    if (!THREE) return; // three não carregou: fica no SVG

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    const maxPx = () => Math.max(1, Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setPixelRatio(maxPx());
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    // Mesmo lugar do React: logo depois do SVG, antes do brilho suave.
    const wrap = document.createElement("div");
    wrap.className = "absolute inset-0 transition-opacity duration-[1200ms] opacity-0";
    wrap.appendChild(canvas);
    heroSvg.after(wrap);

    /* Geometria (100% procedural, sem modelo para baixar) */
    const SEG = 120;
    const deg = (d) => (d * Math.PI) / 180;
    const onSphere = (lat, lon, r = 1) =>
      new THREE.Vector3(r * Math.cos(lat) * Math.sin(lon), r * Math.sin(lat), r * Math.cos(lat) * Math.cos(lon));

    function buildWireframe() {
      const pos = [];
      const order = [];
      const lines = [];
      for (const lon of GLOBE.MERIDIANS) {
        const pts = [];
        for (let i = 0; i <= SEG; i++) pts.push(onSphere(-Math.PI + (i / SEG) * Math.PI * 2, deg(lon)));
        lines.push(pts);
      }
      for (const lat of GLOBE.PARALLELS) {
        const pts = [];
        for (let i = 0; i <= SEG; i++) pts.push(onSphere(deg(lat), (i / SEG) * Math.PI * 2));
        lines.push(pts);
      }
      lines.forEach((pts, li) => {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
          // Ordem de desenho (só usada na entrada animada, aqui desligada).
          const o = li / lines.length + (i / pts.length) * 0.35;
          order.push(o, o);
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("aOrder", new THREE.Float32BufferAttribute(order.map((o) => o / 1.35), 1));
      return g;
    }

    // Linhas: substitui o SVG, então sem desenho de entrada (uReveal = 1).
    const wire = new THREE.LineSegments(
      buildWireframe(),
      new THREE.ShaderMaterial({
        vertexShader: lineVert,
        fragmentShader: lineFrag,
        uniforms: { uReveal: { value: 1 } },
        transparent: true,
        depthWrite: false,
      }),
    );

    // Pontos que acendem em verde ("site atualizado").
    const pts = GLOBE.surfacePoints(16);
    const pointMat = new THREE.ShaderMaterial({
      vertexShader: pointVert,
      fragmentShader: pointFrag,
      uniforms: { uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pointGeo = new THREE.BufferGeometry();
    {
      const pos = [];
      const phase = [];
      for (const p of pts) {
        const v = onSphere(p.lat, p.lon, 1.004);
        pos.push(v.x, v.y, v.z);
        phase.push(p.phase);
      }
      pointGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      pointGeo.setAttribute("aPhase", new THREE.Float32BufferAttribute(phase, 1));
    }
    const points = new THREE.Points(pointGeo, pointMat);

    // Arcos de dados entre os pontos, com um rastro tipo cometa.
    const arcMats = [];
    function buildArc(a, b, offset) {
      const pos = [];
      const ts = [];
      const N = 80;
      const angle = a.angleTo(b);
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        // Interpolação esférica + altura em arco acima da superfície.
        const v = a.clone().multiplyScalar(Math.sin((1 - t) * angle)).add(b.clone().multiplyScalar(Math.sin(t * angle)));
        v.divideScalar(Math.sin(angle)).normalize().multiplyScalar(1 + Math.sin(Math.PI * t) * 0.18 * angle);
        pos.push(v.x, v.y, v.z);
        ts.push(t);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
      const m = new THREE.ShaderMaterial({
        vertexShader: arcVert,
        fragmentShader: arcFrag,
        uniforms: { uTime: { value: 0 }, uOffset: { value: offset } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      arcMats.push(m);
      return new THREE.Line(g, m);
    }
    const pairs = [
      [0, 5],
      [3, 9],
      [7, 12],
      [10, 2],
    ];
    const arcs = pairs.map(([i, j], k) =>
      buildArc(onSphere(pts[i].lat, pts[i].lon), onSphere(pts[j].lat, pts[j].lon), k * 0.27),
    );

    // Grupo de fora: inclinação do eixo (+ mouse). Grupo de dentro: giro.
    const scene = new THREE.Scene();
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.x = GLOBE.TILT;
    const spinGroup = new THREE.Group();
    spinGroup.add(wire, points, ...arcs);
    tiltGroup.add(spinGroup);
    scene.add(tiltGroup);

    // Câmera ortográfica com o mesmo enquadramento do SVG (raio = lado / 2,24).
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    camera.position.set(0, 0, 10);

    /* Bloom (só em tela grande e sem movimento reduzido) */
    let composer = null;
    let degraded = false;
    let size = { w: wrap.clientWidth || 1, h: wrap.clientHeight || 1 };
    if (post) {
      try {
        composer = new post.EffectComposer(renderer);
        composer.addPass(new post.RenderPass(scene, camera));
        // O React usa o Bloom do pmndrs (intensity 0.85, radius 0.7, threshold 0.15).
        // O UnrealBloomPass soma 5 níveis de desfoque bem mais largos (x3 no shader),
        // então os números abaixo foram calibrados lado a lado para o mesmo visual:
        // brilho justo nas linhas e um halo fraco em volta.
        const bloom = new post.UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.17, 0, 0.15);
        bloom.compositeMaterial.uniforms.bloomFactors.value = [1, 0.55, 0.3, 0.18, 0.12];
        // Transição suave do limiar, como o luminanceSmoothing 0.3 do React.
        bloom.highPassUniforms.smoothWidth.value = 0.3;
        composer.addPass(bloom);
        composer.addPass(new post.OutputPass());
      } catch {
        composer = null;
      }
    }
    const dropComposer = () => {
      if (!composer) return;
      for (const p of composer.passes) p.dispose?.();
      composer.dispose?.();
      composer = null;
    };

    function resize(w, h) {
      if (!w || !h) return;
      size = { w, h };
      const px = degraded ? 1 : maxPx();
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.zoom = Math.min(w, h) / (GLOBE.VIEW * 2);
      camera.updateProjectionMatrix();
      if (renderer.getPixelRatio() !== px) renderer.setPixelRatio(px);
      renderer.setSize(w, h, false);
      if (composer) {
        composer.setPixelRatio(px);
        composer.setSize(w, h);
      }
      invalidate();
    }

    /* Mouse: inclina o globo de leve (posição na janela, -1..1) */
    const pointer = { x: 0, y: 0 };
    window.addEventListener(
      "pointermove",
      (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true },
    );

    /* Laço de render: contínuo; fora da tela para; com movimento reduzido só sob demanda */
    let raf = 0;
    let visible = true;
    let lost = false;
    let ready = false;
    let t0 = -1;
    let prev = 0;
    let perfMs = 0;
    let perfFrames = 0;

    function invalidate() {
      if (!raf && !lost) raf = requestAnimationFrame(tick);
    }

    function tick(now) {
      raf = 0;
      if (!visible || lost) return;
      frame(now);
      if (!reduce) invalidate();
      if (!ready) {
        ready = true;
        requestAnimationFrame(() => requestAnimationFrame(showCanvas));
      }
    }

    function frame(now) {
      if (t0 < 0) t0 = prev = now;
      const t = (now - t0) / 1000;
      const dtMs = now - prev;
      prev = now;
      if (!reduce) {
        // Mesmo relógio do globo em SVG: a troca entre os dois não dá salto.
        spinGroup.rotation.y = GLOBE.spinAt(now);
        const k = 1 - Math.exp(-Math.min(dtMs / 1000, 0.1) * 3);
        tiltGroup.rotation.x += (GLOBE.TILT + pointer.y * 0.12 - tiltGroup.rotation.x) * k;
        tiltGroup.rotation.z += (-pointer.x * 0.08 - tiltGroup.rotation.z) * k;
        watchPerf(dtMs, t);
      }
      pointMat.uniforms.uTime.value = t;
      pointMat.uniforms.uPx.value = renderer.getPixelRatio();
      for (const m of arcMats) m.uniforms.uTime.value = t;
      if (composer) composer.render();
      else renderer.render(scene, camera);
    }

    // Aparelho sofrendo (média > 34 ms por ~2 s): tira o bloom e baixa a resolução.
    function watchPerf(dtMs, t) {
      if (degraded || t < 1) return;
      if (dtMs > 250) {
        // Voltou de pausa (fora da tela / aba escondida): recomeça a medir.
        perfMs = perfFrames = 0;
        return;
      }
      perfMs += dtMs;
      perfFrames++;
      if (perfMs < 2000) return;
      if (perfMs / perfFrames > 34) {
        degraded = true;
        dropComposer();
        resize(size.w, size.h);
      }
      perfMs = perfFrames = 0;
    }

    // Primeiro quadro na tela: o 3D aparece e o SVG some (e para de girar).
    function showCanvas() {
      if (lost) return;
      wrap.classList.remove("opacity-0");
      wrap.classList.add("opacity-100");
      heroSvg.classList.remove("opacity-80");
      heroSvg.classList.add("opacity-0");
      stopSvg(heroSvg);
    }

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) invalidate();
      },
      { rootMargin: "100px" },
    );
    io.observe(wrap);
    const ro = new ResizeObserver(([e]) => resize(e.contentRect.width, e.contentRect.height));
    ro.observe(wrap);

    // GPU perdeu o contexto: volta para o SVG em vez de deixar um buraco.
    canvas.addEventListener("webglcontextlost", () => {
      lost = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      wrap.remove();
      heroSvg.classList.remove("opacity-0");
      heroSvg.classList.add("opacity-80");
      startSvg(heroSvg);
    });

    resize(size.w, size.h);
  }
}
