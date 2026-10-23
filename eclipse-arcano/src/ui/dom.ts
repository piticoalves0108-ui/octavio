import * as THREE from 'three';

/** Cria um elemento com classe opcional, pai opcional e texto opcional. */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', parent?: HTMLElement | null, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

/** Elemento com HTML (ícones SVG). */
export function htmlEl(cls: string, html: string, parent?: HTMLElement | null, tag: keyof HTMLElementTagNameMap = 'span'): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export function clear(e: HTMLElement) {
  while (e.firstChild) e.removeChild(e.firstChild);
}

/** Troca o texto só se mudou (evita refazer layout à toa). */
export function setText(e: HTMLElement, t: string) {
  if (e.textContent !== t) e.textContent = t;
}

export function setStyle(e: HTMLElement, prop: string, value: string) {
  if (e.style.getPropertyValue(prop) !== value) e.style.setProperty(prop, value);
}

export function show(e: HTMLElement, visible: boolean, display = '') {
  const v = visible ? display : 'none';
  if (e.style.display !== v) e.style.display = v;
}

export function toggleClass(e: HTMLElement, cls: string, on: boolean) {
  if (e.classList.contains(cls) !== on) e.classList.toggle(cls, on);
}

/** Número com separador de milhar em pt-BR. */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

export function fmtDec(n: number, digits = 1): string {
  return n.toFixed(digits).replace('.', ',');
}

export function fmtDistance(m: number): string {
  return m >= 1000 ? `${fmtDec(m / 1000)} km` : `${Math.round(m)} m`;
}

export function fmtTime(hours: number): string {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function fmtPlayTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}

/** Nome legível de uma tecla (código do KeyboardEvent / Mouse0..2). */
export function keyLabel(code: string | undefined): string {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    Mouse0: 'Clique esq.',
    Mouse1: 'Clique meio',
    Mouse2: 'Clique dir.',
    Space: 'Espaço',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift dir.',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl dir.',
    AltLeft: 'Alt',
    AltRight: 'Alt dir.',
    Escape: 'Esc',
    Tab: 'Tab',
    CapsLock: 'Caps',
    Enter: 'Enter',
    Backspace: 'Backspace',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  };
  return map[code] ?? code;
}

const PROJ = new THREE.Vector3();

/**
 * Projeta um ponto do mundo na tela (pixels CSS). Devolve false se estiver atrás da câmera.
 * `out.z` recebe a profundidade normalizada (NDC).
 */
export function projectToScreen(camera: THREE.Camera, x: number, y: number, z: number, out: { x: number; y: number; z: number }): boolean {
  PROJ.set(x, y, z).project(camera);
  out.x = (PROJ.x * 0.5 + 0.5) * innerWidth;
  out.y = (-PROJ.y * 0.5 + 0.5) * innerHeight;
  out.z = PROJ.z;
  return PROJ.z < 1 && PROJ.z > -1;
}

/** Transform de posição (com centralização). */
export function placeAt(e: HTMLElement, x: number, y: number, extra = '') {
  e.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%)${extra}`;
}
