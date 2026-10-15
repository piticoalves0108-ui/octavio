/**
 * Domo do céu num único shader: gradiente dia/entardecer/noite, dispersão em volta
 * do sol, disco do sol, lua com fase e crateras, estrelas que giram em volta do polo
 * (com faixa da galáxia), nuvens procedurais em movimento (textura de ruído, 6 leituras),
 * clarão de relâmpago e o motivo do jogo: o Eclipse Arcano (disco escuro, coroa
 * violeta e anel de runas que pulsam).
 *
 * Desenhado por último entre os opacos, no plano distante (z = w): só pinta os pixels
 * que nada cobriu (economiza preenchimento). O horizonte usa exatamente a cor da névoa.
 */
import * as THREE from 'three';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { CLOUDS, ECLIPSE } from '../data/weather';

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly uniforms = {
    uSunDir: GLOBAL_UNIFORMS.uSunDir,
    uFogColor: GLOBAL_UNIFORMS.uFogColor,
    uTime: GLOBAL_UNIFORMS.uTime,
    uNight: GLOBAL_UNIFORMS.uNight,
    uCorruption: GLOBAL_UNIFORMS.uCorruption,
    uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
    uEclipseDir: { value: new THREE.Vector3(0, 0.5, -0.86) },
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uSunDisc: { value: new THREE.Color() },
    uCloudAmbient: { value: new THREE.Color() },
    uCloudSun: { value: new THREE.Color() },
    uStormColor: { value: new THREE.Color(CLOUDS.stormColor) },
    uCloudCover: { value: 0.2 },
    uCloudDark: { value: 0 },
    uCloudOffset: { value: new THREE.Vector2() },
    uCloudScale: { value: CLOUDS.scale },
    uDesat: { value: 0 },
    uHorizonBand: { value: 0.08 },
    uSunVisible: { value: 1 },
    uStarRot: { value: new THREE.Matrix3() },
    uFlash: { value: 0 },
    uFlashDir: { value: new THREE.Vector3(0, 1, 0) },
    uEclipse: { value: 1 },
    uEclipseR: { value: ECLIPSE.radius },
    uCorona: { value: new THREE.Color(ECLIPSE.coronaColor) },
    uRuneColor: { value: new THREE.Color(ECLIPSE.runeColor) },
    uNoise: { value: null as THREE.Texture | null },
  };

  constructor(noise: THREE.Texture) {
    this.uniforms.uNoise.value = noise;
    const geo = new THREE.SphereGeometry(1, 40, 20);
    const mat = new THREE.ShaderMaterial({
      name: 'ceu',
      uniforms: this.uniforms,
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      defines: { RUNES: ECLIPSE.runes.toFixed(1) },
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'ceu';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000; // depois dos opacos: só preenche o que sobrou
    this.mesh.matrixAutoUpdate = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  vec4 p = projectionMatrix * viewMatrix * vec4(position * 10.0 + cameraPosition, 1.0);
  // no plano distante (atrás de tudo), sem ser recortado pelo far
  gl_Position = vec4(p.xy, p.w * 0.999999, p.w);
}
`;

const SKY_FRAG = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uFogColor;
uniform float uTime;
uniform float uNight;
uniform float uCorruption;
uniform vec3 uMoonDir;
uniform vec3 uEclipseDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGlow;
uniform vec3 uSunDisc;
uniform vec3 uCloudAmbient;
uniform vec3 uCloudSun;
uniform vec3 uStormColor;
uniform float uCloudCover;
uniform float uCloudDark;
uniform vec2 uCloudOffset;
uniform float uCloudScale;
uniform float uDesat;
uniform float uHorizonBand;
uniform float uSunVisible;
uniform mat3 uStarRot;
uniform float uFlash;
uniform vec3 uFlashDir;
uniform float uEclipse;
uniform float uEclipseR;
uniform vec3 uCorona;
uniform vec3 uRuneColor;
uniform sampler2D uNoise;
varying vec3 vDir;

float hash13(vec3 p) {
  p = fract(p * 0.1031);
  p += dot(p, p.zyx + 31.32);
  return fract((p.x + p.y) * p.z);
}
vec3 hash33(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return fract((p.xxy + p.yxx) * p.zyx);
}
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float bit(float h, float k) { return mod(floor(h / exp2(k)), 2.0); }

// Densidade das nuvens: fBm grande + células (cúmulos) + detalhe fino.
float cloudField(vec2 uv) {
  float n = texture2D(uNoise, uv * 0.11 + uCloudOffset).r * 0.6;
  n += texture2D(uNoise, uv * 0.27 + uCloudOffset * 1.6).b * 0.28;
  n += texture2D(uNoise, uv * 0.9 + uCloudOffset * 2.7).g * 0.12;
  return n;
}

// Runa procedural: haste central + traços escolhidos pelos bits do hash.
float glyph(vec2 q, float id) {
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0) return 0.0;
  float h = floor(hash11(id * 7.31 + 3.7) * 256.0);
  float w = 0.11;
  float s = 1.0 - smoothstep(0.0, w, abs(q.x - 0.5));
  if (bit(h, 0.0) > 0.5) s = max(s, 1.0 - smoothstep(0.0, w, abs(q.x - 0.08)));
  if (bit(h, 1.0) > 0.5) s = max(s, 1.0 - smoothstep(0.0, w, abs(q.x - 0.92)));
  if (bit(h, 2.0) > 0.5) s = max(s, 1.0 - smoothstep(0.0, w, abs(q.y - 0.9)));
  if (bit(h, 3.0) > 0.5) s = max(s, (1.0 - smoothstep(0.0, w, abs(q.y - 0.5))) * step(0.5, q.x));
  if (bit(h, 4.0) > 0.5) s = max(s, 1.0 - smoothstep(0.0, w, abs(q.y - 0.1)));
  if (bit(h, 5.0) > 0.5) s = max(s, 1.0 - smoothstep(0.0, w * 1.2, abs(q.x - q.y) * 0.7071));
  if (bit(h, 6.0) > 0.5) s = max(s, (1.0 - smoothstep(0.0, w * 1.2, abs(q.x + q.y - 1.0) * 0.7071)) * step(q.y, 0.6));
  return s;
}

void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  float hp = max(h, 0.0);

  // --- gradiente base + dispersão em volta do sol
  vec3 col = mix(uHorizon, uZenith, pow(hp, 0.5));
  float sdot = dot(d, uSunDir);
  float sd = max(sdot, 0.0);
  float sunUp = smoothstep(-0.3, 0.02, uSunDir.y);
  float lowSun = 1.0 - smoothstep(0.05, 0.45, uSunDir.y);
  col += uGlow * (pow(sd, 4.0) * (0.25 + 0.5 * lowSun) * (1.0 - smoothstep(0.0, 0.5, hp)) + pow(sd, 42.0) * 0.7) * sunUp * (1.0 - 0.55 * uCloudCover);
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(col, vec3(lum) * vec3(0.92, 0.95, 1.0), uDesat);

  // --- estrelas (giram com a noite) + faixa da galáxia
  vec3 sdir = uStarRot * d;
  if (uNight > 0.01) {
    vec3 p = sdir * 170.0;
    vec3 cell = floor(p);
    float r = hash13(cell);
    float stars = 0.0;
    if (r > 0.982) {
      vec3 sp = cell + 0.15 + 0.7 * hash33(cell + 7.1);
      vec3 dp = p - sp;
      float dist = length(dp - d * dot(dp, d));
      float b = pow((r - 0.982) / 0.018, 3.0);
      stars = smoothstep(0.34, 0.0, dist) * (0.35 + 2.6 * b);
      stars *= 0.75 + 0.25 * sin(uTime * (1.5 + r * 40.0) + r * 300.0);
      vec3 tint = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.85, 0.7), hash13(cell + 3.3));
      col += tint * stars * uNight * smoothstep(-0.02, 0.22, h);
    }
    float band = exp(-pow(dot(sdir, normalize(vec3(0.3, 0.2, 0.93))) / 0.2, 2.0));
    float neb = texture2D(uNoise, vec2(atan(sdir.z, sdir.x) * 0.8, sdir.y * 1.5)).r;
    col += vec3(0.16, 0.12, 0.28) * band * neb * neb * uNight * 0.55 * smoothstep(0.0, 0.3, h);
  }

  // --- lua (fase pela posição do sol + crateras)
  vec3 mr = normalize(cross(uMoonDir, vec3(0.0, 1.0, 0.0)) + vec3(1e-5));
  vec3 mu = cross(mr, uMoonDir);
  float moonR = 0.03;
  vec2 mq = vec2(dot(d, mr), dot(d, mu)) / moonR;
  float ml = length(mq);
  float md = dot(d, uMoonDir);
  if (md > 0.0) {
    if (ml < 1.0) {
      vec3 n = mr * mq.x + mu * mq.y - uMoonDir * sqrt(1.0 - ml * ml);
      float lit = smoothstep(-0.05, 0.12, dot(n, uSunDir));
      float crat = texture2D(uNoise, mq * 0.22 + 0.37).b * 0.5 + texture2D(uNoise, mq * 0.5 + 0.11).r * 0.5;
      vec3 moonCol = vec3(0.92, 0.94, 1.0) * (0.72 + 0.4 * crat) * (lit * 2.4 + 0.035);
      float edge = smoothstep(1.0, 0.94, ml);
      col = mix(col, moonCol, edge * smoothstep(-0.03, 0.03, h));
    }
    col += vec3(0.55, 0.62, 0.85) * pow(md, 900.0) * 0.5 * uNight;
  }

  // --- Eclipse Arcano: disco escuro, coroa violeta, anel fino e runas que pulsam
  float ed = dot(d, uEclipseDir);
  if (ed > 0.9 && uEclipse > 0.001) {
    vec3 er = normalize(cross(uEclipseDir, vec3(0.0, 1.0, 0.0)) + vec3(1e-5));
    vec3 eu = cross(er, uEclipseDir);
    vec2 eq = vec2(dot(d, er), dot(d, eu)) / uEclipseR;
    float el = length(eq);
    float vis = uEclipse * mix(${ECLIPSE.dayVisibility.toFixed(2)}, 1.0, uNight) * (1.0 + uCorruption * 0.6);
    float ang = atan(eq.y, eq.x);
    // raios da coroa (giram devagar)
    float rays = texture2D(uNoise, vec2(ang * 1.2 + uTime * 0.01, 0.5)).r;
    float out1 = max(el - 1.0, 0.0);
    float corona = exp(-out1 * 3.2) * (0.55 + 0.9 * rays * rays) * step(1.0, el);
    float ring = exp(-pow((el - 1.0) / 0.035, 2.0));
    // runas no anel externo
    float a = ang / 6.2831853 + uTime * 0.004;
    float seg = fract(a) * RUNES;
    float id = floor(seg);
    vec2 gq = vec2((fract(seg) - 0.18) / 0.64, (el - 1.42) / 0.26);
    float rune = glyph(gq, id);
    float pulse = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(id * 0.9 - uTime * 1.3), 3.0);
    float runeRing = exp(-pow((el - 1.72) / 0.02, 2.0)) * 0.6 + exp(-pow((el - 1.36) / 0.015, 2.0)) * 0.45;
    // disco (esconde o que está atrás) com brilho violeta fraco na borda
    float disc = smoothstep(1.0, 0.985, el);
    vec3 discCol = vec3(0.012, 0.004, 0.025) + uCorona * 0.06 * pow(el, 6.0);
    col = mix(col, discCol, disc * min(1.0, vis * 1.4));
    vec3 glow = uCorona * (corona * 1.1 + ring * 3.2) + uRuneColor * (rune * pulse * 2.6 + runeRing * (0.6 + 0.4 * pulse));
    col += glow * vis * smoothstep(-0.02, 0.06, h);
  }

  // --- disco do sol (HDR para o bloom)
  float sunR = 0.0115;
  float disc = smoothstep(cos(sunR * 1.12), cos(sunR), sdot);
  col += uSunDisc * disc * 22.0 * uSunVisible * smoothstep(-0.015, 0.01, h);

  // --- nuvens
  if (h > 0.0 && uCloudCover > 0.01) {
    vec2 uv = d.xz / (h + 0.12) * uCloudScale;
    float n = cloudField(uv);
    float thr = mix(0.8, 0.2, uCloudCover);
    float c = smoothstep(thr, thr + 0.2 + 0.1 * uCloudCover, n);
    vec2 toSun = normalize(uSunDir.xz + vec2(1e-4)) * 0.06;
    float n2 = cloudField(uv + toSun);
    float shade = clamp(0.6 + (n - n2) * 4.0, 0.0, 1.0);
    vec3 cc = uCloudAmbient * (0.7 + 0.3 * shade) + uCloudSun * shade;
    cc = mix(cc, uStormColor * (0.25 + 0.75 * (1.0 - uNight * 0.85)), uCloudDark * smoothstep(0.15, 0.9, c) * 0.85);
    cc += uGlow * pow(sd, 6.0) * (1.0 - c) * 1.6 * sunUp;
    cc += vec3(0.75, 0.82, 1.0) * uFlash * (0.5 + 1.6 * pow(max(dot(d, uFlashDir), 0.0), 3.0));
    float a = c * smoothstep(0.0, 0.14, h) * 0.97;
    col = mix(col, cc, a);
  }

  // --- horizonte: exatamente a cor da névoa (casa com o terreno distante)
  float hf = 1.0 - smoothstep(-0.03, uHorizonBand, h);
  col = mix(col, uFogColor, hf);
  col += vec3(0.6, 0.68, 0.9) * uFlash * 0.12;
  col = mix(col, col * vec3(1.1, 0.86, 1.22), uCorruption * 0.3);

  gl_FragColor = vec4(max(col, vec3(0.0)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
