/*
 * Celular 3D da Borel Cell (Three.js).
 * Geometria toda feita no código: nada de modelo externo, nada de marca de terceiros.
 * Exposto como window.BorelPhone3D.create(canvas, opções).
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Shape, ExtrudeGeometry, ShapeGeometry, Mesh,
  MeshPhysicalMaterial, MeshStandardMaterial, CanvasTexture, SRGBColorSpace, ACESFilmicToneMapping,
  PMREMGenerator, DirectionalLight, AmbientLight, CylinderGeometry, CircleGeometry, BoxGeometry, Color, MathUtils
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BOREL, CELL, LOCKUP } from '../js/brand.js';

const W = 0.76;
const H = 1.6;
const D = 0.084;
const R = 0.13;
const B = 0.016;

function roundedRect(w, h, r) {
  const s = new Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function planeFromShape(w, h, r, segments = 40) {
  const geo = new ShapeGeometry(roundedRect(w, h, r), segments);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  uv.needsUpdate = true;
  return geo;
}

function mixHex(a, b, t) {
  return '#' + new Color(a).lerp(new Color(b), t).getHexString();
}

/* ---------- Conteúdo da tela (canvas 2D) ---------- */
function createScreen(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const sx = width / 600;
  const state = { mode: 'home', color: '#d9dadd', t: 0 };
  const borelPath = typeof Path2D === 'function' ? new Path2D(BOREL.d) : null;
  const cellPath = typeof Path2D === 'function' ? new Path2D(CELL.d) : null;
  const display = 'Unbounded, "Arial Black", sans-serif';
  const body = 'Manrope, system-ui, sans-serif';

  const rr = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const blob = (x, y, r, color, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 600, 1300);
    ctx.globalAlpha = 1;
  };
  const clock = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  function statusBar(dark = false) {
    ctx.fillStyle = dark ? '#111' : '#fff';
    ctx.font = `700 30px ${body}`;
    ctx.textAlign = 'left';
    ctx.fillText(clock(), 58, 72);
    // sinal
    for (let i = 0; i < 4; i++) { rr(440 + i * 13, 64 - i * 6, 9, 10 + i * 6, 3); ctx.fill(); }
    // bateria
    ctx.lineWidth = 3;
    ctx.strokeStyle = ctx.fillStyle;
    rr(503, 50, 42, 22, 7); ctx.stroke();
    rr(507, 54, 30, 14, 4); ctx.fill();
    // ilha
    ctx.fillStyle = '#000';
    rr(222, 34, 156, 46, 23); ctx.fill();
    // barra inferior
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = dark ? '#111' : '#fff';
    rr(220, 1262, 160, 9, 5); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function home() {
    const c = state.color;
    const bg = ctx.createLinearGradient(0, 0, 200, 1300);
    bg.addColorStop(0, mixHex(c, '#000000', 0.15));
    bg.addColorStop(0.45, '#17233f');
    bg.addColorStop(1, '#07070b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 600, 1300);
    blob(480, 260, 420, c, 0.85);
    blob(80, 820, 480, '#3d5afe', 0.55);
    blob(520, 1150, 380, '#ffffff', 0.12);

    const d = new Date();
    let date = '';
    try { date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(d); } catch (e) { date = ''; }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = `600 34px ${body}`;
    ctx.fillText(date, 300, 205);
    ctx.fillStyle = '#fff';
    ctx.font = `800 138px ${display}`;
    ctx.fillText(clock(), 300, 360);

    // letreiro da loja
    if (borelPath) {
      const k = 230 / LOCKUP.w;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#ffffff';
      ctx.translate(300 - 115, 1062);
      ctx.scale(k, k);
      ctx.fill(borelPath, 'evenodd');
      ctx.translate(LOCKUP.cellX, LOCKUP.cellY);
      ctx.scale(LOCKUP.cellScale, LOCKUP.cellScale);
      ctx.fill(cellPath, 'evenodd');
      ctx.restore();
    }
    statusBar();
  }

  function displayMode() {
    const t = state.t;
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, 600, 1300);
    const colors = [state.color, '#3d5afe', '#9fb4ff', '#ff6a2b'];
    for (let i = 0; i < 4; i++) {
      const x = 300 + Math.sin(t * 0.6 + i * 1.7) * 220;
      const y = 650 + Math.cos(t * 0.5 + i * 2.1) * 420;
      blob(x, y, 520, colors[i], 0.9);
    }
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.textAlign = 'center';
    ctx.font = `800 120px ${display}`;
    ctx.fillText('120', 300, 640);
    ctx.font = `600 40px ${body}`;
    ctx.fillText('Hz', 300, 700);
    statusBar();
  }

  function perf() {
    const t = state.t;
    ctx.fillStyle = '#08080d';
    ctx.fillRect(0, 0, 600, 1300);
    blob(300, 300, 520, '#3d5afe', 0.35);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.font = `800 54px ${display}`;
    ctx.fillText('Desempenho', 50, 210);
    const gauges = [
      { label: 'CPU', v: 0.72 + Math.sin(t * 2.1) * 0.18, c: state.color },
      { label: 'GPU', v: 0.6 + Math.sin(t * 1.6 + 1) * 0.25, c: '#8fa3ff' },
      { label: 'RAM', v: 0.5 + Math.sin(t * 1.2 + 2) * 0.15, c: '#ffffff' }
    ];
    gauges.forEach((g, i) => {
      const cx = 115 + i * 185;
      const cy = 400;
      ctx.lineWidth = 20;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.beginPath(); ctx.arc(cx, cy, 70, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = g.c;
      ctx.beginPath(); ctx.arc(cx, cy, 70, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.v); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `800 36px ${display}`;
      ctx.fillText(`${Math.round(g.v * 100)}`, cx, cy + 12);
      ctx.font = `700 24px ${body}`;
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillText(g.label, cx, cy + 120);
    });
    // barras
    for (let i = 0; i < 14; i++) {
      const v = 0.3 + Math.abs(Math.sin(t * 2.4 + i * 0.6)) * 0.7;
      const h = 330 * v;
      const g = ctx.createLinearGradient(0, 1150 - h, 0, 1150);
      g.addColorStop(0, state.color);
      g.addColorStop(1, '#3d5afe');
      ctx.fillStyle = g;
      rr(50 + i * 36, 1150 - h, 24, h, 10); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.textAlign = 'left';
    ctx.font = `600 26px ${body}`;
    ctx.fillText('Modo desempenho ativo', 50, 1210);
    statusBar();
  }

  function battery() {
    const t = state.t;
    ctx.fillStyle = '#060609';
    ctx.fillRect(0, 0, 600, 1300);
    const cycle = (((t % 5) + 5) % 5) / 4;
    const level = Math.min(1, 0.18 + cycle * 0.82);
    blob(300, 700, 560, state.color, 0.18 + level * 0.25);
    const bx = 190, by = 360, bw = 220, bh = 520;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    rr(260, by - 34, 80, 40, 14); ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    rr(bx, by, bw, bh, 48); ctx.stroke();
    const fh = (bh - 36) * level;
    const g = ctx.createLinearGradient(0, by + bh, 0, by);
    g.addColorStop(0, '#3d5afe');
    g.addColorStop(1, state.color);
    ctx.fillStyle = g;
    if (fh > 4) { rr(bx + 18, by + bh - 18 - fh, bw - 36, fh, Math.min(32, fh / 2)); ctx.fill(); }
    // raio
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(318, 520); ctx.lineTo(262, 640); ctx.lineTo(300, 640); ctx.lineTo(282, 740); ctx.lineTo(340, 610); ctx.lineTo(302, 610);
    ctx.closePath(); ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = `800 120px ${display}`;
    ctx.fillText(`${Math.round(level * 100)}%`, 300, 1040);
    ctx.font = `600 32px ${body}`;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('Carregando', 300, 1100);
    statusBar();
  }

  function camera() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 600, 1300);
    const g = ctx.createLinearGradient(0, 150, 0, 1050);
    g.addColorStop(0, '#2b3d6b');
    g.addColorStop(0.55, '#d77a4a');
    g.addColorStop(1, '#1a1020');
    ctx.fillStyle = g;
    ctx.fillRect(0, 150, 600, 900);
    blob(420, 520, 160, '#ffe4a8', 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 2;
    [350, 650].forEach((y) => { ctx.beginPath(); ctx.moveTo(0, y + 50); ctx.lineTo(600, y + 50); ctx.stroke(); });
    [200, 400].forEach((x) => { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 1050); ctx.stroke(); });
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.arc(300, 1170, 62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(300, 1170, 52, 0, Math.PI * 2); ctx.stroke();
    statusBar();
  }

  const modes = { home, display: displayMode, perf, battery, camera };
  const animated = { display: true, perf: true, battery: true };

  function draw() {
    ctx.setTransform(sx, 0, 0, sx, 0, 0);
    (modes[state.mode] || home)();
  }

  return { canvas, state, draw, isAnimated: () => !!animated[state.mode] };
}

/* ---------- Cena ---------- */
function create(canvas, opts = {}) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  if (!renderer.getContext()) return null;

  const mobile = window.matchMedia('(max-width: 900px)').matches;
  const reduced = !!opts.reducedMotion;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 6);

  // Luzes
  scene.add(new AmbientLight(0xffffff, 0.2));
  const key = new DirectionalLight(0xffffff, 1.7);
  key.position.set(2.5, 3, 4);
  scene.add(key);
  const rimA = new DirectionalLight(new Color(opts.color || '#d9dadd'), 2.4);
  rimA.position.set(-4, 1.5, -2.5);
  scene.add(rimA);
  const rimB = new DirectionalLight(0x8fa3ff, 2.6);
  rimB.position.set(4, -1.2, -2);
  scene.add(rimB);

  // Materiais
  const color = new Color(opts.color || '#d9dadd');
  const targetColor = color.clone();
  const frameMat = new MeshPhysicalMaterial({ color, metalness: 1, roughness: 0.24, clearcoat: 0.35, clearcoatRoughness: 0.2 });
  const capMat = new MeshStandardMaterial({ color: 0x050507, roughness: 0.35, metalness: 0.3 });
  const backMat = new MeshPhysicalMaterial({ color, roughness: 0.4, metalness: 0.08, clearcoat: 1, clearcoatRoughness: 0.3 });
  const moduleMat = new MeshPhysicalMaterial({ color, roughness: 0.14, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const lensMat = new MeshPhysicalMaterial({ color: 0x020205, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 520] });
  const lensInnerMat = new MeshStandardMaterial({ color: 0x090920, emissive: 0x2a1e78, emissiveIntensity: 0.7, roughness: 0.2 });
  const flashMat = new MeshStandardMaterial({ color: 0xeee6cc, emissive: 0x2c281c, roughness: 0.4 });
  const dotMat = new MeshStandardMaterial({ color: 0x060608, roughness: 0.6 });

  const screen = createScreen(mobile ? 420 : 600, mobile ? 910 : 1300);
  screen.state.color = '#' + color.getHexString();
  screen.draw();
  const screenTex = new CanvasTexture(screen.canvas);
  screenTex.colorSpace = SRGBColorSpace;
  screenTex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const screenMat = new MeshPhysicalMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: screenTex, emissiveIntensity: 1, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 });

  // Corpo
  const rig = new Group();
  const spinner = new Group();
  const phone = new Group();
  rig.add(spinner);
  spinner.add(phone);
  scene.add(rig);

  const bodyGeo = new ExtrudeGeometry(roundedRect(W - 2 * B, H - 2 * B, R - B), {
    depth: D - 2 * B, bevelEnabled: true, bevelThickness: B, bevelSize: B, bevelSegments: 8, curveSegments: 40, steps: 1
  });
  bodyGeo.center();
  phone.add(new Mesh(bodyGeo, [capMat, frameMat]));

  const screenMesh = new Mesh(planeFromShape(W - 0.038, H - 0.038, R - 0.019), screenMat);
  screenMesh.position.z = D / 2 + 0.0012;
  phone.add(screenMesh);

  const backMesh = new Mesh(planeFromShape(W - 0.034, H - 0.034, R - 0.017), backMat);
  backMesh.position.z = -D / 2 - 0.0012;
  backMesh.rotation.y = Math.PI;
  phone.add(backMesh);

  // Módulo de câmeras (canto superior esquerdo, olhando pelas costas)
  const modW = 0.37;
  const modDepth = 0.012;
  const modBevel = 0.006;
  const modGeo = new ExtrudeGeometry(roundedRect(modW - 2 * modBevel, modW - 2 * modBevel, 0.1 - modBevel), {
    depth: modDepth, bevelEnabled: true, bevelThickness: modBevel, bevelSize: modBevel, bevelSegments: 4, curveSegments: 28
  });
  modGeo.center();
  const mx = W / 2 - 0.046 - modW / 2;
  const my = H / 2 - 0.046 - modW / 2;
  const modThickness = modDepth + 2 * modBevel;
  const mod = new Mesh(modGeo, [moduleMat, frameMat]);
  mod.position.set(mx, my, -D / 2 - modThickness / 2);
  phone.add(mod);
  const zMod = -D / 2 - modThickness;

  const ringGeo = new CylinderGeometry(1, 1.04, 1, 48);
  const circleGeo = new CircleGeometry(1, 48);
  function lens(x, y, r) {
    const g = new Group();
    const ring = new Mesh(ringGeo, frameMat);
    ring.scale.set(r * 1.2, 0.03, r * 1.2);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const glass = new Mesh(circleGeo, lensMat);
    glass.scale.setScalar(r);
    glass.position.z = -0.0152;
    glass.rotation.y = Math.PI;
    g.add(glass);
    const inner = new Mesh(circleGeo, lensInnerMat);
    inner.scale.setScalar(r * 0.42);
    inner.position.z = -0.0156;
    inner.rotation.y = Math.PI;
    g.add(inner);
    g.position.set(x, y, zMod - 0.006);
    return g;
  }
  const lr = 0.058;
  phone.add(lens(mx + 0.083, my + 0.083, lr));
  phone.add(lens(mx + 0.083, my - 0.083, lr));
  phone.add(lens(mx - 0.08, my, lr));
  const flash = new Mesh(circleGeo, flashMat);
  flash.scale.setScalar(0.022);
  flash.rotation.y = Math.PI;
  flash.position.set(mx - 0.09, my + 0.105, zMod - 0.001);
  phone.add(flash);
  const mic = new Mesh(circleGeo, dotMat);
  mic.scale.setScalar(0.012);
  mic.rotation.y = Math.PI;
  mic.position.set(mx - 0.09, my - 0.105, zMod - 0.001);
  phone.add(mic);

  // Botões laterais
  const btnGeo = new BoxGeometry(1, 1, 1);
  [[-1, 0.5, 0.06], [-1, 0.36, 0.11], [-1, 0.21, 0.11], [1, 0.3, 0.17]].forEach(([side, y, len]) => {
    const b = new Mesh(btnGeo, frameMat);
    b.scale.set(0.012, len, 0.026);
    b.position.set(side * (W / 2 + 0.002), y, 0);
    phone.add(b);
  });

  /* ---------- Estado ---------- */
  const pose = { px: 0.22, py: 0, s: 0.62, rx: 0.1, ry: -0.4, rz: 0.05 };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let spin = 0;
  let spinVel = 0;
  let dragging = false;
  let t = 0;
  let lastScreenDraw = 0;
  let raf = 0;
  let last = 0;
  let visH = 1;
  let visW = 1;

  function resize() {
    const parent = canvas.parentElement || canvas;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    visH = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    visW = visH * camera.aspect;
    if (!raf) render();
  }

  function applyPose() {
    rig.position.set(pose.px * visW, pose.py * visH, 0);
    rig.scale.setScalar((pose.s * visH) / H);
    rig.rotation.set(pose.rx, pose.ry, pose.rz);
  }

  function render() {
    applyPose();
    renderer.render(scene, camera);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    t += dt;

    ptr.x += (ptr.tx - ptr.x) * 0.06;
    ptr.y += (ptr.ty - ptr.y) * 0.06;

    if (!dragging) {
      spin += spinVel;
      spinVel *= 0.93;
      if (Math.abs(spinVel) < 0.002) {
        const target = Math.round(spin / (Math.PI * 2)) * Math.PI * 2;
        spin += (target - spin) * 0.05;
      }
    }

    color.lerp(targetColor, 0.08);
    rimA.color.lerp(targetColor, 0.08);

    spinner.rotation.y = spin + ptr.x * 0.42;
    spinner.rotation.x = -ptr.y * 0.24 + (reduced ? 0 : Math.sin(t * 0.8) * 0.03);
    spinner.position.y = reduced ? 0 : Math.sin(t * 1.1) * 0.025;

    screen.state.t = t;
    if (screen.isAnimated() && now - lastScreenDraw > (mobile ? 50 : 33)) {
      screen.draw();
      screenTex.needsUpdate = true;
      lastScreenDraw = now;
    }

    render();
  }

  function setActive(on) {
    if (on && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!on && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement || canvas);
  resize();

  // Atualiza o relógio da tela a cada minuto
  const clockTimer = setInterval(() => {
    if (!screen.isAnimated()) { screen.draw(); screenTex.needsUpdate = true; }
  }, 30000);

  return {
    setPose(p) { Object.assign(pose, p); if (!raf) render(); },
    getPose() { return { ...pose }; },
    setPointer(x, y) { ptr.tx = x; ptr.ty = y; },
    setDragging(v) { dragging = v; },
    addSpin(dx) { spin += dx; spinVel = dx; },
    setColor(hex) {
      targetColor.set(hex);
      screen.state.color = hex;
      if (!screen.isAnimated()) { screen.draw(); screenTex.needsUpdate = true; }
    },
    setScreen(mode) {
      if (screen.state.mode === mode) return;
      screen.state.mode = mode;
      screen.draw();
      screenTex.needsUpdate = true;
    },
    setActive,
    resize,
    destroy() {
      setActive(false);
      clearInterval(clockTimer);
      ro.disconnect();
      renderer.dispose();
    }
  };
}

window.BorelPhone3D = { create };
