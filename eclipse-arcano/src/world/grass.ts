import * as THREE from 'three';
import type { WorldMaps } from './maps';
import { MAPS_GLSL } from './maps';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { styleFoliage } from '../env/stylize';
import { STYLE } from '../data/graphics';
import { VEGETATION, WATER_LEVEL } from '../data/world';
import type { QualityPreset } from '../data/quality';

/**
 * Grama e flores mágicas posicionadas inteiramente na GPU.
 *
 * Cada instância é um tufo numa grade alinhada ao mundo em volta da câmera
 * (o centro anda de célula em célula, então os tufos não "deslizam"). O vertex
 * shader sorteia o deslocamento por hash da célula, lê a densidade do mapa de
 * dados (bioma × pegadas das estruturas × estradas), a altura exata do relevo,
 * aplica vento (uWindDir/uWindStrength/uTime), dobra para longe do jogador
 * (uPlayerPos) e some suavemente na borda do raio. Custo de CPU: ~zero.
 */

const GRASS_GLSL = /* glsl */ `
${MAPS_GLSL}
uniform vec2 uCenterCell;
uniform float uCell;
uniform float uRadius;
uniform float uTime;
uniform vec2 uWindDir;
uniform float uWindStrength;
uniform vec4 uPlayerPos;
uniform float uDensity;
attribute vec2 aCell;
float gHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
`;

export class GrassField {
  readonly mesh: THREE.Mesh;
  readonly flowers: THREE.Mesh;
  private uniforms: Record<string, THREE.IUniform>;
  private flowerUniforms: Record<string, THREE.IUniform>;
  private cell = 1;
  private flowerCell = 2.4;
  private radius = 50;
  private key = '';

  constructor(private maps: WorldMaps) {
    this.uniforms = {
      ...maps.uniforms(),
      uCenterCell: { value: new THREE.Vector2() },
      uCell: { value: 1 },
      uRadius: { value: 50 },
      uDensity: { value: 1 },
      uTime: GLOBAL_UNIFORMS.uTime,
      uWindDir: GLOBAL_UNIFORMS.uWindDir,
      uWindStrength: GLOBAL_UNIFORMS.uWindStrength,
      uPlayerPos: GLOBAL_UNIFORMS.uPlayerPos,
      uWetness: GLOBAL_UNIFORMS.uWetness,
    };
    this.flowerUniforms = {
      ...maps.uniforms(),
      uCenterCell: { value: new THREE.Vector2() },
      uCell: { value: 2.4 },
      uRadius: { value: 60 },
      uDensity: { value: 1 },
      uTime: GLOBAL_UNIFORMS.uTime,
      uWindDir: GLOBAL_UNIFORMS.uWindDir,
      uWindStrength: GLOBAL_UNIFORMS.uWindStrength,
      uPlayerPos: GLOBAL_UNIFORMS.uPlayerPos,
      uNight: GLOBAL_UNIFORMS.uNight,
    };
    this.mesh = new THREE.Mesh(new THREE.InstancedBufferGeometry(), this.createGrassMaterial());
    this.mesh.name = 'grama';
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
    this.flowers = new THREE.Mesh(new THREE.InstancedBufferGeometry(), this.createFlowerMaterial());
    this.flowers.name = 'flores';
    this.flowers.frustumCulled = false;
    this.flowers.matrixAutoUpdate = false;
  }

  /** Recria as grades se o preset mudou. */
  configure(q: QualityPreset) {
    const key = `${q.grassDensity}|${q.grassRadius}`;
    if (key === this.key) return;
    this.key = key;
    const dens = VEGETATION.grassClumpsPerM2 * Math.max(0.05, q.grassDensity);
    this.cell = 1 / Math.sqrt(dens);
    this.radius = q.grassRadius;
    this.uniforms.uCell.value = this.cell;
    this.uniforms.uRadius.value = this.radius;
    this.mesh.geometry.dispose();
    this.mesh.geometry = buildGrassGeometry(this.cell, this.radius);
    // flores: grade mais esparsa e raio maior (brilham de longe à noite)
    this.flowerCell = 1 / Math.sqrt(VEGETATION.flowersPerM2 * 12 * Math.max(0.2, q.grassDensity));
    const fr = Math.min(q.grassRadius * 1.3, 90);
    this.flowerUniforms.uCell.value = this.flowerCell;
    this.flowerUniforms.uRadius.value = fr;
    this.flowers.geometry.dispose();
    this.flowers.geometry = buildFlowerGeometry(this.flowerCell, fr);
    this.mesh.receiveShadow = q.shadowMapSize >= 2048;
  }

  /** Move o centro das grades para a câmera (snap à célula). */
  update(camX: number, camZ: number) {
    (this.uniforms.uCenterCell.value as THREE.Vector2).set(Math.floor(camX / this.cell), Math.floor(camZ / this.cell));
    (this.flowerUniforms.uCenterCell.value as THREE.Vector2).set(Math.floor(camX / this.flowerCell), Math.floor(camZ / this.flowerCell));
  }

  get instanceCount() {
    return (this.mesh.geometry as THREE.InstancedBufferGeometry).instanceCount + (this.flowers.geometry as THREE.InstancedBufferGeometry).instanceCount;
  }

  private createGrassMaterial(): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: false });
    const u = this.uniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
${GRASS_GLSL}
uniform float uWetness;
varying vec3 vGrassCol;`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `vec2 gCell = uCenterCell + aCell;
float gh1 = gHash(gCell);
float gh2 = gHash(gCell + 17.31);
float gh3 = gHash(gCell + 41.7);
vec2 gRoot = (gCell + 0.15 + vec2(gh1, gh2) * 0.7) * uCell;
vec2 gUv = worldMapUv(gRoot);
vec4 gData = texture(tWorldData, gUv);
float gDist = length(gRoot - cameraPosition.xz);
float gGround = worldHeight(gRoot);
// densidade: mapa × preset; afina com a distância; some na borda do raio
float gKeep = step(gh3, gData.b * uDensity) * step(${(WATER_LEVEL + 0.25).toFixed(2)}, gGround);
float gFade = 1.0 - smoothstep(uRadius * 0.7, uRadius, gDist);
float gScale = gKeep * gFade * (0.65 + 0.7 * gData.b);
vec3 objectNormal = normalize(vec3(normal.x * 0.35, 1.0, normal.z * 0.35));`,
        )
        .replace(
          '#include <begin_vertex>',
          `// rotação aleatória do tufo
float gAng = gh1 * 6.2831;
float gc = cos(gAng);
float gs = sin(gAng);
vec3 gp = position;
gp.xz = vec2(gp.x * gc - gp.z * gs, gp.x * gs + gp.z * gc);
float gH = position.y; // 0..1 (altura relativa da lâmina)
float gHeight = mix(${VEGETATION.bladeHeight[0].toFixed(2)}, ${VEGETATION.bladeHeight[1].toFixed(2)}, gh2) * gScale * (0.7 + 0.6 * gData.b);
gp.y = gH * gHeight;
gp.xz *= 0.8 + gh3 * 0.5;
// vento: balanço de baixa frequência + rajadas que percorrem o campo
float gPhase = dot(gRoot, uWindDir) * 0.18 - uTime * (1.4 + uWindStrength);
float gWind = (0.35 + 0.65 * sin(gPhase) * 0.5 + 0.5 * sin(gPhase * 2.3 + gh1 * 6.0) * 0.25) * (0.15 + uWindStrength);
float gBend = gH * gH;
gp.xz += uWindDir * gWind * gBend * gHeight * 0.9;
// dobra para longe do jogador
vec2 gPd = gRoot + gp.xz - uPlayerPos.xz;
float gPl = length(gPd);
float gPush = (1.0 - smoothstep(0.0, uPlayerPos.w, gPl)) * step(abs(gGround - uPlayerPos.y), 2.5);
gp.xz += gPd / max(gPl, 0.001) * gPush * gBend * gHeight * 1.1;
gp.y -= gPush * gBend * gHeight * 0.45;
// tufo descartado (estrada, água, fora do raio): some por inteiro, sem lâmina deitada no chão
gp *= step(0.02, gScale);
vec3 transformed = vec3(gRoot.x + gp.x, gGround + gp.y, gRoot.y + gp.z);
// cor: base do terreno, pontas mais claras/secas, variação por tufo
vec3 gBase = texture(tWorldColor, gUv).rgb;
vec3 gTip = gBase * vec3(1.5, 1.42, 0.88) + vec3(0.07, 0.07, 0.0) * gh2;
vGrassCol = mix(gBase * 0.8, gTip, gH * gH * 0.6 + gH * 0.4) * (0.88 + 0.26 * gh3);
vGrassCol = mix(vGrassCol, vGrassCol * vec3(1.15, 1.05, 0.7), smoothstep(0.6, 1.0, gh1) * 0.5);
vGrassCol *= 1.0 - 0.3 * uWetness;`,
        )
        .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);\ngl_Position = projectionMatrix * mvPosition;')
        .replace('#include <worldpos_vertex>', '#if defined( USE_SHADOWMAP )\nvec4 worldPosition = vec4(transformed, 1.0);\n#endif');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGrassCol;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= vGrassCol;')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
    };
    styleFoliage(mat, STYLE.translucency * 1.3, STYLE.rim * 0.3, STYLE.cel * 0.6);
    mat.customProgramCacheKey = () => 'grass-v2';
    return mat;
  }

  private createFlowerMaterial(): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, vertexColors: true });
    const u = this.flowerUniforms;
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
${GRASS_GLSL}
uniform float uNight;
varying vec3 vFlowerCol;
varying float vGlow;`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          `vec2 gCell = uCenterCell + aCell;
float gh1 = gHash(gCell + 3.3);
float gh2 = gHash(gCell + 27.1);
float gh3 = gHash(gCell + 55.5);
vec2 gRoot = (gCell + 0.1 + vec2(gh1, gh2) * 0.8) * uCell;
vec2 gUv = worldMapUv(gRoot);
vec4 gData = texture(tWorldData, gUv);
float gDist = length(gRoot - cameraPosition.xz);
float gGround = worldHeight(gRoot);
float gKeep = step(gh3, gData.a * 1.4) * step(${(WATER_LEVEL + 0.3).toFixed(2)}, gGround);
float gScale = gKeep * (1.0 - smoothstep(uRadius * 0.75, uRadius, gDist)) * (0.85 + 0.5 * gh2);
vec3 objectNormal = vec3(0.0, 1.0, 0.0);`,
        )
        .replace(
          '#include <begin_vertex>',
          `float gAng = gh2 * 6.2831;
float gc = cos(gAng);
float gs = sin(gAng);
vec3 gp = position * gScale;
gp.xz = vec2(gp.x * gc - gp.z * gs, gp.x * gs + gp.z * gc);
float gH = clamp(position.y / 0.68, 0.0, 1.0);
float gPhase = dot(gRoot, uWindDir) * 0.2 - uTime * 1.6;
gp.xz += uWindDir * sin(gPhase + gh1 * 6.0) * (0.1 + uWindStrength * 0.25) * gH * gH;
vec2 gPd = gRoot - uPlayerPos.xz;
float gPl = length(gPd);
float gNear = 1.0 - smoothstep(0.5, 7.0, gPl);
float gPush = (1.0 - smoothstep(0.0, uPlayerPos.w, gPl)) * gH;
gp.xz += gPd / max(gPl, 0.001) * gPush * 0.35;
vec3 transformed = vec3(gRoot.x + gp.x, gGround + gp.y, gRoot.y + gp.z);
// paleta mágica: ciano, violeta, dourado, rosa
vec3 pal[4];
pal[0] = vec3(0.3, 0.85, 1.0);
pal[1] = vec3(0.7, 0.4, 1.0);
pal[2] = vec3(1.0, 0.8, 0.3);
pal[3] = vec3(1.0, 0.45, 0.65);
vFlowerCol = pal[int(gh3 * 3.99)];
// brilho: fraco de dia, forte à noite e perto do jogador (sem estourar no tone mapping)
vGlow = color.r * (0.05 + 0.85 * uNight + 0.55 * gNear) * (0.8 + 0.2 * sin(uTime * 2.0 + gh1 * 20.0));`,
        )
        .replace('#include <project_vertex>', 'vec4 mvPosition = viewMatrix * vec4(transformed, 1.0);\ngl_Position = projectionMatrix * mvPosition;')
        .replace('#include <worldpos_vertex>', '#if defined( USE_SHADOWMAP )\nvec4 worldPosition = vec4(transformed, 1.0);\n#endif');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFlowerCol;\nvarying float vGlow;')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);')
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= mix(vec3(0.25, 0.5, 0.2), vFlowerCol, step(0.5, vColor.g));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vFlowerCol * vGlow;');
    };
    mat.customProgramCacheKey = () => 'flowers-v2';
    return mat;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.flowers.geometry.dispose();
    (this.flowers.material as THREE.Material).dispose();
  }
}

/** Offsets de célula dentro do círculo (instâncias). */
function cellOffsets(cell: number, radius: number): Float32Array {
  const n = Math.ceil(radius / cell);
  const out: number[] = [];
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) if ((i * i + j * j) * cell * cell <= (radius + cell) * (radius + cell)) out.push(i, j);
  return new Float32Array(out);
}

/** Tufo de 5 lâminas (cada uma 5 vértices: 2 segmentos + ponta). position.y = altura relativa 0..1. */
function buildGrassGeometry(cell: number, radius: number): THREE.InstancedBufferGeometry {
  const blades = VEGETATION.bladesPerClump;
  const pos: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  for (let b = 0; b < blades; b++) {
    const a = (b / blades) * Math.PI * 2 + b * 0.7;
    const r = 0.1 + (b % 3) * 0.09;
    const ox = Math.cos(a) * r;
    const oz = Math.sin(a) * r;
    const yaw = a + 1.2 + b;
    const cx = Math.cos(yaw);
    const sz = Math.sin(yaw);
    const w = 0.06;
    const lean = 0.15 + (b % 2) * 0.1;
    const base = pos.length / 3;
    const levels = [0, 0.45, 1];
    const widths = [w, w * 0.7, 0];
    for (let k = 0; k < 3; k++) {
      const y = levels[k];
      const ww = widths[k];
      const lx = ox + Math.cos(a) * lean * y * y;
      const lz = oz + Math.sin(a) * lean * y * y;
      if (k < 2) {
        pos.push(lx - cx * ww, y, lz - sz * ww, lx + cx * ww, y, lz + sz * ww);
        nrm.push(-sz, 0.4, cx, -sz, 0.4, cx);
      } else {
        pos.push(lx, y, lz);
        nrm.push(-sz, 0.4, cx);
      }
    }
    idx.push(base, base + 1, base + 3, base, base + 3, base + 2, base + 2, base + 3, base + 4);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  const cells = cellOffsets(cell, radius);
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
  g.instanceCount = cells.length / 2;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}

/** Flor: caule + folha + corola em taça (5 pétalas) + miolo luminoso. color.r = intensidade do brilho, color.g = pétala. */
function buildFlowerGeometry(cell: number, radius: number): THREE.InstancedBufferGeometry {
  const pos: number[] = [];
  const nrm: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const v = (x: number, y: number, z: number, glow: number, petal: number) => {
    pos.push(x, y, z);
    nrm.push(0, 1, 0);
    col.push(glow, petal, 0);
    return pos.length / 3 - 1;
  };
  // caule
  const s0 = v(-0.02, 0, 0, 0, 0);
  const s1 = v(0.02, 0, 0, 0, 0);
  const s2 = v(0.02, 0.62, 0, 0, 0);
  const s3 = v(-0.02, 0.62, 0, 0, 0);
  idx.push(s0, s1, s2, s0, s2, s3);
  // folhas
  const l0 = v(0, 0.12, 0, 0, 0);
  const l1 = v(0.16, 0.22, 0.05, 0, 0);
  const l2 = v(0.02, 0.26, 0, 0, 0);
  idx.push(l0, l1, l2);
  // corola em taça: 5 pétalas abertas para cima (legíveis de lado e de cima)
  const cy = 0.6;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const base = v(Math.cos(a) * 0.025, cy, Math.sin(a) * 0.025, 0.7, 1);
    const sl = v(Math.cos(a - 0.45) * 0.1, cy + 0.07, Math.sin(a - 0.45) * 0.1, 0.55, 1);
    const sr = v(Math.cos(a + 0.45) * 0.1, cy + 0.07, Math.sin(a + 0.45) * 0.1, 0.55, 1);
    const tip = v(Math.cos(a) * 0.2, cy + 0.17, Math.sin(a) * 0.2, 0.4, 1);
    idx.push(base, sr, sl, sl, sr, tip);
  }
  // miolo luminoso (pequena pirâmide dupla)
  const top = v(0, cy + 0.1, 0, 1.2, 1);
  const bot = v(0, cy - 0.02, 0, 1.2, 1);
  const mid: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    mid.push(v(Math.cos(a) * 0.045, cy + 0.04, Math.sin(a) * 0.045, 1.2, 1));
  }
  for (let i = 0; i < 4; i++) idx.push(top, mid[(i + 1) % 4], mid[i], bot, mid[i], mid[(i + 1) % 4]);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const cells = cellOffsets(cell, radius);
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
  g.instanceCount = cells.length / 2;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  return g;
}
