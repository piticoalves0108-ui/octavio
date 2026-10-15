import * as THREE from 'three';
import type { GameContext, GameSystem, Saveable } from '../core/context';
import type { WeatherKind } from '../core/EventBus';
import { GLOBAL_UNIFORMS } from '../core/uniforms';
import { clamp, damp, lerp, smoothstep } from '../core/math';
import { RNG } from '../core/rng';
import { Simplex2 } from '../core/noise';
import { CLOUDS, DAY_CYCLE, ECLIPSE, FOG, GROUND_FOG, LIGHTNING, POST, RAIN, SHADOWS, WEATHER, WEATHER_LABEL, WEATHER_TIMING, WETNESS } from '../data/weather';
import { WATER_LEVEL, WORLD_HALF, type BiomeId } from '../data/world';
import { createSkySample, eclipseDirection, lightLevels, moonDirection, moonPhase, nightFactor, sampleSky, sunDirection, timeOfDayLabel, type LightLevels } from './dayCycle';
import { WeatherMachine, isWeatherKind } from './weatherMachine';
import { WindModel } from './wind';
import { baseFogDensity, biomeFogExtra, flashCurve, fogDensity, groundFogWeight, snapShadowCenter, thunderDelay } from './envMath';
import { envNoiseTexture } from './textures';
import { Sky } from './Sky';
import { Rain } from './Rain';
import { LightningBolt } from './Lightning';
import { GroundFog, type GroundFogSampler } from './GroundFog';
import { PostFX, type PostParams } from './PostFX';

const LUMA = new THREE.Vector3(0.2126, 0.7152, 0.0722);
const WHITE = new THREE.Color(1, 1, 1);

/** Dessatura `c` (linear) em direção ao cinza de mesma luminância. */
function desaturate(c: THREE.Color, k: number, gray: THREE.Color) {
  const l = c.r * LUMA.x + c.g * LUMA.y + c.b * LUMA.z;
  gray.setRGB(l, l, l);
  return c.lerp(gray, clamp(k, 0, 1));
}

/**
 * Céu, ciclo dia/noite, clima, vento, chuva, relâmpagos, névoa, sombras e
 * pós-processamento.
 *
 * - Ciclo a partir de ctx.clock.hours: sol/lua com trajetórias e fases, paleta por
 *   quadros-chave, luz hemisférica, exposição e GLOBAL_UNIFORMS (uSunDir, uSunColor,
 *   uFogColor, uNight, uWindDir, uWindStrength, uWetness, uTime).
 * - Clima: máquina de estados com durações naturais, pesos por região/horário e
 *   transições suaves (WeatherMachine). Saveable.
 * - Luz direcional única (sol de dia, lua à noite) com sombra que segue o jogador,
 *   estabilizada ao texel; reage a 'settings:changed'.
 * - Substitui ctx.render: trabalho dependente da câmera (sombra) + pós-processamento
 *   (bloom + gradação) quando q.bloom, ou render simples.
 */
export class Environment implements GameSystem, Saveable {
  readonly name = 'env';
  readonly saveKey = 'env';
  sun = new THREE.DirectionalLight(0xffffff, 2.2);
  hemi = new THREE.HemisphereLight(0xbfd8ff, 0x4a5a2a, 1.0);
  weather: WeatherKind = 'clear';
  /** 0..1 intensidade de chuva atual (com transição). */
  rainIntensity = 0;
  /** 0..1 umidade das superfícies. */
  wetness = 0;
  /** 0..2 força do vento. */
  windStrength = 0.4;
  protected ctx!: GameContext;

  // ---------------------------------------------------------------- extras públicos
  /** Máquina de estados do clima (durações, transições, pesos). */
  readonly machine: WeatherMachine;
  /** Modelo de vento (direção, força, rajadas). */
  readonly wind: WindModel;
  /** Direção do vento no plano XZ (mesmo objeto de GLOBAL_UNIFORMS.uWindDir). */
  readonly windDir = GLOBAL_UNIFORMS.uWindDir.value;
  /** 0..1 rajada atual. */
  gust = 0;
  /** 0..1 cobertura de nuvens atual. */
  cloudCover = 0.2;
  /** Densidade atual da névoa (FogExp2). */
  fogDensity = 0.002;
  /** 0 = dia, 1 = noite. */
  night = 0;
  /** 0..1 clarão de relâmpago atual. */
  flash = 0;
  /** Intensidade do Eclipse Arcano no céu (0..1.6; a história pode aumentar). */
  eclipse = ECLIPSE.intensity;
  /** O jogador está num interior coberto (sem chuva, névoa reduzida). */
  indoors = false;
  readonly sunDirection = new THREE.Vector3(0.3, 0.8, 0.2).normalize();
  readonly moonDirection = new THREE.Vector3(0, -1, 0);
  readonly eclipseDirection = new THREE.Vector3(0, 0.5, -0.86);
  /** Direção atual da luz direcional (sol ou lua). */
  readonly lightDirection = new THREE.Vector3(0.3, 0.8, 0.2).normalize();
  sky!: Sky;
  rain!: Rain;
  bolt!: LightningBolt;
  groundFog!: GroundFog;
  fog!: THREE.FogExp2;
  /** Raios (naturais + lightningFlash) desde o boot. */
  strikes = 0;

  // ---------------------------------------------------------------- privados
  private post: PostFX | null = null;
  private rng = new RNG(((Math.random() * 0xffffffff) >>> 0) || 1);
  private rnd = () => this.rng.next();
  private noise = new Simplex2(911);
  private skyS = createSkySample();
  private levels: LightLevels = { sun: 0, moon: 0, useMoon: false };
  private localFog = 0;
  private tintColor = new THREE.Color(1, 1, 1);
  private tintAmt = 0;
  private indoorK = 0;
  private indoorTimer = 0;
  private nextStrike = 8;
  private strikeAge = 99;
  private strikePower = 0;
  private strikePool = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  private strikeIdx = 0;
  private flashDir = new THREE.Vector3(0, 1, 0);
  private eclipseTarget = ECLIPSE.intensity;
  private eclipseRate = 0.1;
  private shadowSize = -1;
  private shadowExtent = -1;
  private cloudOffset = new THREE.Vector2();
  private starRot = new THREE.Matrix4();
  private pole = new THREE.Vector3();
  private fogColor = new THREE.Color();
  private lightColor = new THREE.Color();
  private gray = new THREE.Color();
  private tmpC = new THREE.Color();
  private tmpC2 = new THREE.Color();
  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private focusV = new THREE.Vector3();
  private postParams: PostParams = { bloomStrength: POST.bloomStrength, vignette: POST.vignette, saturation: POST.saturation, contrast: POST.contrast, tint: new THREE.Color(1, 1, 1), corruption: 0, flash: 0 };
  private nightTint = new THREE.Color(POST.nightTint);
  private stormTint = new THREE.Color(0.86, 0.92, 1.02);
  private fogSampler!: GroundFogSampler;
  private groundFn = (x: number, z: number) => this.splashGround(x, z);
  private splashP = { x: 0, y: 0, z: 0 };
  private lastBiome: BiomeId = 'meadow';

  constructor() {
    this.machine = new WeatherMachine(this.rnd);
    this.wind = new WindModel(1337, this.rng.range(0, Math.PI * 2));
  }

  init(ctx: GameContext) {
    this.ctx = ctx;
    // luzes: uma direcional (sol de dia, lua à noite) + hemisférica
    this.sun.name = 'sol_lua';
    this.sun.target.name = 'sol_alvo';
    this.hemi.name = 'ceu_hemisferica';
    this.sun.position.set(100, 200, 50);
    ctx.scene.add(this.sun, this.sun.target, this.hemi);
    // névoa (FogExp2: o tipo não muda mais → shaders não recompilam) e fundo
    this.fog = new THREE.FogExp2(0x8fb6d8, baseFogDensity(ctx.settings.q.viewDistance));
    ctx.scene.fog = this.fog;
    ctx.scene.background = null;
    // céu, chuva, raio e névoa rasteira
    const noise = envNoiseTexture();
    this.sky = new Sky(noise);
    this.rain = new Rain();
    this.bolt = new LightningBolt();
    this.groundFog = new GroundFog(noise);
    ctx.scene.add(this.sky.mesh, this.rain.drops, this.rain.splashes, this.bolt.mesh, this.groundFog.mesh);
    this.fogSampler = {
      biomeAt: (x, z) => ctx.heightfield.biomeAt(x, z),
      heightAt: (x, z) => ctx.heightfield.heightAt(x, z),
      weight: (b) => groundFogWeight(b, ctx.clock.hours, this.machine.mix.fogExtra),
    };
    this.applySettings();
    ctx.events.on('settings:changed', () => this.applySettings());
    this.resetWeather();
    this.applyVisuals(0, true);
    ctx.render = () => this.render();
  }

  // ======================================================================
  // Configuração (qualidade)
  // ======================================================================
  private applySettings() {
    const ctx = this.ctx;
    const q = ctx.settings.q;
    // sombras
    const size = q.shadowMapSize;
    const S = Math.max(10, q.shadowDistance);
    this.sun.castShadow = size > 0;
    const sh = this.sun.shadow;
    if (size > 0 && size !== this.shadowSize) {
      sh.mapSize.set(size, size);
      if (sh.map) {
        sh.map.dispose();
        (sh as { map: THREE.WebGLRenderTarget | null }).map = null;
      }
    }
    this.shadowSize = size;
    if (S !== this.shadowExtent) {
      this.shadowExtent = S;
      const cam = sh.camera;
      cam.left = -S;
      cam.right = S;
      cam.top = S;
      cam.bottom = -S;
      cam.near = 1;
      cam.far = SHADOWS.lightDistance * 2;
      cam.updateProjectionMatrix();
    }
    const texel = size > 0 ? (2 * S) / size : 0.1;
    sh.bias = SHADOWS.bias;
    sh.normalBias = texel * SHADOWS.normalBiasPerTexel;
    // pós-processamento
    const msaa = q.antialias;
    if (q.bloom) {
      const wantSamples = msaa ? POST.msaaSamples : 0;
      if (!this.post || (this.post.samples !== wantSamples && ctx.renderer.capabilities.isWebGL2)) {
        this.post?.dispose();
        this.post = new PostFX(ctx.renderer, ctx.scene, ctx.camera, msaa);
      }
    } else if (this.post) {
      this.post.dispose();
      this.post = null;
    }
    // chuva e névoa rasteira
    this.rain.configure(q.rainDrops, clamp(q.rainDrops / 6000, 0.35, 1.3));
    this.groundFog.configure(Math.round(GROUND_FOG.count * clamp(q.propDensity, 0.4, 1.2)));
  }

  // ======================================================================
  // Simulação
  // ======================================================================
  update(dt: number, ctx: GameContext) {
    GLOBAL_UNIFORMS.uTime.value += dt;
    const p = ctx.sys.player.position;
    const hours = ctx.clock.hours;
    const biome = ctx.heightfield.biomeAt(p.x, p.z);
    this.lastBiome = biome;
    // interior coberto (consulta barata, 4×/s)
    this.indoorTimer -= dt;
    if (this.indoorTimer <= 0) {
      this.indoorTimer = 0.25;
      this.indoors = !!ctx.sys.world?.isIndoors?.(p);
    }
    this.indoorK = damp(this.indoorK, this.indoors ? 1 : 0, 5, dt);

    // clima
    const changed = this.machine.update(dt, biome, hours);
    if (changed) this.onWeatherChanged(changed, false);
    const mix = this.machine.mix;

    // vento
    this.wind.update(dt, mix.wind, mix.gust);
    this.windStrength = this.wind.strength;
    this.gust = this.wind.gust;

    // chuva com pancadas (variação lenta) e umidade das superfícies
    const shower = 1 + WEATHER_TIMING.showerVariation * this.noise.noise(GLOBAL_UNIFORMS.uTime.value * 0.03, 2.5);
    this.rainIntensity = clamp(mix.rain * shower, 0, 1);
    if (this.rainIntensity > 0.03) {
      const cap = Math.min(1, 0.35 + this.rainIntensity);
      if (this.wetness < cap) this.wetness = Math.min(cap, this.wetness + WETNESS.wetRate * this.rainIntensity * dt);
    } else {
      const dry = WETNESS.dryRate * lerp(1, WETNESS.nightDryFactor, this.night) * (1 - 0.5 * mix.cloudCover);
      this.wetness = Math.max(0, this.wetness - dry * dt);
    }

    // névoa local do bioma/horário (transição suave)
    this.localFog = damp(this.localFog, biomeFogExtra(biome, hours, this.night), FOG.lambda, dt);
    const tint = FOG.tint[biome];
    if (tint) this.tmpC2.setHex(tint[0]);
    this.tintAmt = damp(this.tintAmt, tint ? tint[1] : 0, FOG.lambda, dt);
    if (tint) this.tintColor.lerp(this.tmpC2, 1 - Math.exp(-FOG.lambda * 2 * dt));

    // eclipse (a história pode mudar a intensidade aos poucos)
    if (this.eclipse !== this.eclipseTarget) {
      const step = this.eclipseRate * dt;
      this.eclipse = Math.abs(this.eclipseTarget - this.eclipse) <= step ? this.eclipseTarget : this.eclipse + Math.sign(this.eclipseTarget - this.eclipse) * step;
    }

    this.updateLightning(dt);
    this.applyVisuals(dt, false);

    // chuva e respingos (sem chuva dentro de interiores)
    const cam = ctx.camera;
    const outside = 1 - this.indoorK;
    const fovRad = (cam.fov * Math.PI) / 180;
    const pixelAngle = (2 * Math.tan(fovRad / 2)) / Math.max(1, ctx.renderer.domElement.height);
    const wv = RAIN.windSpeed * this.windStrength;
    this.rain.update(dt, this.rainIntensity * outside, this.windDir.x * wv, this.windDir.y * wv, pixelAngle);
    const highUp = cam.position.y - ctx.heightfield.heightAt(cam.position.x, cam.position.z) > 70;
    this.rain.updateSplashes(dt, highUp ? 0 : this.rainIntensity * outside, p.x, p.z, this.groundFn, this.rnd);
    this.groundFog.update(dt, p.x, p.z, 1 - this.indoorK, this.fogSampler);
  }

  /** Altura do chão para um respingo (NaN = não respingar: interior/fora do mundo). */
  private splashGround(x: number, z: number): number {
    if (Math.abs(x) > WORLD_HALF - 4 || Math.abs(z) > WORLD_HALF - 4) return NaN;
    const h = this.ctx.heightfield.heightAt(x, z);
    const sp = this.splashP;
    sp.x = x;
    sp.y = Math.max(h, WATER_LEVEL) + 1;
    sp.z = z;
    if (this.ctx.sys.world?.isIndoors?.(sp)) return NaN;
    return h;
  }

  private onWeatherChanged(kind: WeatherKind, forced: boolean) {
    this.weather = kind;
    if (WEATHER[kind].lightningPerMin > 0) this.nextStrike = forced ? 2 + this.rnd() * 3 : 8 + this.rnd() * 10;
    this.groundFog.invalidate();
    this.ctx.events.emit('weather:changed', { weather: kind });
  }

  // ======================================================================
  // Relâmpagos
  // ======================================================================
  private updateLightning(dt: number) {
    const rate = this.machine.mix.lightningPerMin;
    if (rate > 0.05) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        this.strike(null);
        const mean = 60 / rate;
        this.nextStrike = Math.max(LIGHTNING.minInterval, -Math.log(1 - this.rnd() * 0.999) * mean);
      }
    }
    this.strikeAge += dt;
    const f = flashCurve(this.strikeAge);
    this.flash = f * this.strikePower;
    this.bolt.setAlpha(this.strikeAge < LIGHTNING.boltLife ? Math.min(1, f * 1.3 + 0.25 * (1 - this.strikeAge / LIGHTNING.boltLife)) : 0);
  }

  /** Cria um raio em `pos` (ou num ponto aleatório distante) com clarão e evento. */
  private strike(pos: THREE.Vector3 | null) {
    const ctx = this.ctx;
    const cam = ctx.camera.position;
    const target = this.strikePool[this.strikeIdx++ & 3];
    if (pos) {
      target.copy(pos);
    } else {
      const near = this.rnd() < LIGHTNING.nearChance;
      const [d0, d1] = near ? LIGHTNING.nearDistance : LIGHTNING.distance;
      const d = d0 + (d1 - d0) * this.rnd();
      const a = this.rnd() * Math.PI * 2;
      const lim = WORLD_HALF - 20;
      const x = clamp(cam.x + Math.cos(a) * d, -lim, lim);
      const z = clamp(cam.z + Math.sin(a) * d, -lim, lim);
      target.set(x, Math.max(ctx.heightfield.heightAt(x, z), WATER_LEVEL), z);
    }
    const top = this.tmpV.set(target.x + (this.rnd() - 0.5) * 90, Math.max(target.y, cam.y) + LIGHTNING.cloudHeight, target.z + (this.rnd() - 0.5) * 90);
    this.bolt.strike(top, target, this.rnd);
    this.strikeAge = 0;
    this.strikes++;
    const dist = cam.distanceTo(target);
    this.strikePower = lerp(1, 0.5, smoothstep(80, 900, dist));
    this.flashDir.copy(top).sub(cam).normalize();
    ctx.events.emit('lightning', { position: target });
    if (dist < LIGHTNING.shakeDistance) ctx.sys.camera?.shake?.(0.45 * (1 - dist / LIGHTNING.shakeDistance), 0.45);
  }

  // ======================================================================
  // Visual (dia/noite + clima → luzes, céu, névoa, uniforms, pós)
  // ======================================================================
  private applyVisuals(dt: number, instant: boolean) {
    const ctx = this.ctx;
    const hours = ctx.clock.hours;
    const mix = this.machine.mix;
    const S = this.skyS;
    const G = GLOBAL_UNIFORMS;

    sunDirection(hours, this.sunDirection);
    moonDirection(hours, ctx.clock.day, this.moonDirection);
    eclipseDirection(hours, this.eclipseDirection);
    const phase = moonPhase(this.sunDirection, this.moonDirection);
    this.night = nightFactor(this.sunDirection.y);
    lightLevels(this.sunDirection.y, this.moonDirection.y, phase, this.levels);
    sampleSky(hours, S);

    const dim = mix.sunDim;
    const desat = mix.desaturate;
    const dark = mix.cloudDarkness;
    const flash = this.flash;
    this.cloudCover = mix.cloudCover;

    // --- luz direcional (sol ou lua)
    const useMoon = this.levels.useMoon;
    this.lightDirection.copy(useMoon ? this.moonDirection : this.sunDirection);
    const lightI = (this.levels.sun * DAY_CYCLE.sunIntensity + this.levels.moon * DAY_CYCLE.moonIntensity) * (1 - dim);
    this.lightColor.copy(S.sun);
    desaturate(this.lightColor, desat * 0.6, this.gray);
    this.sun.color.copy(this.lightColor);
    this.sun.intensity = lightI + flash * 1.2;
    if (flash > 0.01) this.sun.color.lerp(WHITE, Math.min(1, flash));

    // --- hemisférica
    desaturate(this.hemi.color.copy(S.hemiSky), desat * 0.7, this.gray);
    this.hemi.color.multiplyScalar(1 - dark * 0.25);
    this.hemi.groundColor.copy(S.hemiGround);
    this.hemi.intensity = S.hemiIntensity * (1 + 0.22 * dim) + flash * 2.4;

    // --- névoa: cor sincronizada com o horizonte do céu
    const fc = this.fogColor.copy(S.fog);
    desaturate(fc, desat, this.gray);
    fc.multiplyScalar(1 - dark * 0.42);
    if (this.tintAmt > 0.001) fc.lerp(this.tmpC.copy(this.tintColor).multiplyScalar(0.25 + 0.75 * (1 - this.night * 0.85)), this.tintAmt);
    if (flash > 0.01) fc.lerp(this.tmpC.setRGB(0.55, 0.6, 0.75), flash * 0.35);
    this.fog.color.copy(fc);
    G.uFogColor.value.copy(fc);

    const cam = ctx.camera.position;
    const camGround = ctx.heightfield.heightAt(cam.x, cam.z);
    const vd = ctx.settings.q.viewDistance;
    const d = fogDensity({ viewDistance: vd, weatherFog: mix.fog, weatherFogExtra: mix.fogExtra, localExtra: this.localFog, altitude: cam.y - Math.max(camGround, WATER_LEVEL), indoor: false });
    const dIndoor = d * lerp(1, FOG.indoorFactor, this.indoorK);
    this.fogDensity = instant ? dIndoor : damp(this.fogDensity, dIndoor, 3, dt);
    this.fog.density = this.fogDensity;

    // --- uniforms globais
    G.uSunDir.value.copy(this.sunDirection);
    G.uSunColor.value.copy(this.lightColor).multiplyScalar(this.levels.sun * (1 - dim));
    G.uNight.value = this.night;
    G.uWindDir.value.set(this.wind.dir.x, this.wind.dir.z);
    G.uWindStrength.value = this.wind.strength;
    G.uWetness.value = this.wetness;

    // --- céu
    const u = this.sky.uniforms;
    u.uMoonDir.value.copy(this.moonDirection);
    u.uEclipseDir.value.copy(this.eclipseDirection);
    const cloudShade = 1 - dark * 0.55 * mix.cloudCover;
    desaturate(u.uZenith.value.copy(S.zenith), desat, this.gray).multiplyScalar(cloudShade);
    desaturate(u.uHorizon.value.copy(S.horizon), desat, this.gray).multiplyScalar(1 - dark * 0.4);
    u.uGlow.value.copy(S.glow).multiplyScalar(1 - dim * 0.75);
    u.uSunDisc.value.copy(S.sun);
    u.uSunVisible.value = 1 - dim * 0.85;
    u.uCloudAmbient.value.copy(this.hemi.color).multiplyScalar(S.hemiIntensity * 0.9);
    u.uCloudSun.value
      .copy(this.lightColor)
      .multiplyScalar(this.levels.sun * 0.6 * (1 - dim * 0.6))
      .add(this.tmpC.setRGB(0.5, 0.56, 0.75).multiplyScalar(this.levels.moon * 0.25));
    u.uCloudCover.value = mix.cloudCover;
    u.uCloudDark.value = dark;
    u.uDesat.value = desat * 0.8;
    const ratio = this.fogDensity / baseFogDensity(vd);
    u.uHorizonBand.value = 0.05 + 0.45 * smoothstep(1.2, 7, ratio);
    const cs = (CLOUDS.baseSpeed + CLOUDS.speed * this.wind.strength) * dt;
    this.cloudOffset.x = (this.cloudOffset.x + this.wind.dir.x * cs) % 1000;
    this.cloudOffset.y = (this.cloudOffset.y + this.wind.dir.z * cs) % 1000;
    u.uCloudOffset.value.copy(this.cloudOffset);
    // estrelas giram em volta do polo celeste (ao norte, elevado)
    const pe = (DAY_CYCLE.poleElevationDeg * Math.PI) / 180;
    this.pole.set(0, Math.sin(pe), -Math.cos(pe));
    this.starRot.makeRotationAxis(this.pole, (hours / 24) * Math.PI * 2);
    u.uStarRot.value.setFromMatrix4(this.starRot);
    u.uFlash.value = flash;
    u.uFlashDir.value.copy(this.flashDir);
    u.uEclipse.value = this.eclipse;

    // --- chuva: cor iluminada pelo céu
    this.rain.dropUniforms.uColor.value
      .copy(this.hemi.color)
      .multiplyScalar(0.35 + 0.45 * S.hemiIntensity)
      .add(this.tmpC.setRGB(0.6, 0.65, 0.8).multiplyScalar(flash * 1.5));

    // --- exposição e pós
    ctx.renderer.toneMappingExposure = S.exposure * (1 + 0.12 * dim) + flash * 0.3;
    if (this.post) {
      const pp = this.postParams;
      const corr = G.uCorruption.value;
      pp.bloomStrength = lerp(POST.bloomStrength, POST.bloomStrengthNight, this.night) * (1 + flash * 0.6);
      pp.vignette = POST.vignette * (1 + 0.4 * this.night);
      pp.saturation = POST.saturation * (1 - desat * 0.22);
      pp.contrast = POST.contrast;
      pp.tint.setRGB(1, 1, 1).lerp(this.nightTint, this.night * POST.nightTintAmount * 4).lerp(this.stormTint, dark * 0.5);
      pp.tint.multiplyScalar(1 / Math.max(0.5, pp.tint.r * LUMA.x + pp.tint.g * LUMA.y + pp.tint.b * LUMA.z));
      pp.corruption = corr;
      pp.flash = flash;
      this.post.setParams(pp);
    }
  }

  // ======================================================================
  // Render (substitui ctx.render)
  // ======================================================================
  private render() {
    const ctx = this.ctx;
    const t0 = performance.now();
    this.preRender();
    ctx.sys.perf?.measure('env.render', performance.now() - t0);
    if (this.post) this.post.render();
    else ctx.renderer.render(ctx.scene, ctx.camera);
  }

  /** Trabalho que depende da câmera/jogador do quadro (roda em qualquer estado). */
  private preRender() {
    const ctx = this.ctx;
    const f = this.focusV;
    if (ctx.state === 'menu' || ctx.state === 'boot' || ctx.state === 'loading') {
      const e = ctx.entities.focus;
      f.set(e.x, ctx.heightfield.heightAt(e.x, e.z), e.z);
    } else {
      f.copy(ctx.sys.player.position);
    }
    const q = ctx.settings.q;
    const L = this.lightDirection;
    if (this.sun.castShadow) {
      const S = Math.max(10, q.shadowDistance);
      // a caixa avança um pouco para onde a câmera olha (sombra à frente importa mais)
      ctx.camera.getWorldDirection(this.tmpV2);
      const h = Math.hypot(this.tmpV2.x, this.tmpV2.z) || 1;
      f.x += (this.tmpV2.x / h) * S * SHADOWS.forwardShift;
      f.z += (this.tmpV2.z / h) * S * SHADOWS.forwardShift;
      snapShadowCenter(f, L, (2 * S) / Math.max(1, this.shadowSize), f);
    }
    this.sun.target.position.copy(f);
    this.sun.position.copy(f).addScaledVector(L, SHADOWS.lightDistance);
  }

  // ======================================================================
  // API pública
  // ======================================================================
  setWeather(kind: WeatherKind, transitionSeconds = 30) {
    if (!isWeatherKind(kind)) {
      console.warn(`[Env] clima desconhecido: ${String(kind)}`);
      return;
    }
    this.machine.set(kind, Math.max(0, transitionSeconds));
    this.weather = kind;
    if (!this.ctx) return;
    this.onWeatherChanged(kind, true);
    if (transitionSeconds <= 0) this.snapVisuals();
  }

  isRaining() {
    return this.rainIntensity > RAIN.rainingThreshold;
  }

  /**
   * Clarão de relâmpago com raio visível. Com `position`, o raio cai ali (ataque de
   * chefe — o dano fica com quem chamou); sem, cai num ponto distante aleatório.
   * Emite 'lightning' (o áudio toca o trovão com atraso: distância / 343 m/s).
   */
  lightningFlash(position?: THREE.Vector3) {
    if (!this.ctx) return;
    this.strike(position ?? null);
  }

  /**
   * Trava o clima (arena de chefe, cinemática): muda para `kind` e não troca sozinho.
   * `null` destrava e o clima volta a seguir as durações naturais.
   */
  lockWeather(kind: WeatherKind | null, transitionSeconds = 8) {
    if (kind) {
      this.setWeather(kind, transitionSeconds);
      this.machine.locked = true;
    } else {
      this.machine.locked = false;
      this.machine.timeLeft = Math.min(this.machine.timeLeft, this.machine.durationFor(this.machine.current) * 0.5);
    }
  }

  /** Intensidade do Eclipse Arcano no céu (0..1.6), com transição em segundos. */
  setEclipse(intensity: number, seconds = 10) {
    this.eclipseTarget = clamp(intensity, 0, 1.6);
    this.eclipseRate = Math.abs(this.eclipseTarget - this.eclipse) / Math.max(0.01, seconds);
    if (seconds <= 0) this.eclipse = this.eclipseTarget;
  }

  /** Atraso (s) entre o clarão e o trovão para quem ouve em `listener`. */
  thunderDelay(position: THREE.Vector3, listener: THREE.Vector3 = this.ctx.camera.position): number {
    return thunderDelay(position.distanceTo(listener), LIGHTNING.soundSpeed);
  }

  /** Nome do clima atual (pt-BR), para a UI. */
  weatherLabel(kind: WeatherKind = this.weather): string {
    return WEATHER_LABEL[kind];
  }

  /** Período do dia (pt-BR): Madrugada, Amanhecer, Manhã, Meio-dia, Tarde, Entardecer, Noite. */
  timeOfDayLabel(): string {
    return timeOfDayLabel(this.ctx?.clock.hours ?? 12);
  }

  /** Visibilidade aproximada (m) com a névoa atual. */
  visibility(): number {
    return Math.sqrt(-Math.log(0.1)) / Math.max(1e-6, this.fogDensity);
  }

  /** Pós-processamento ativo? */
  get postEnabled(): boolean {
    return this.post !== null;
  }

  /** Estatísticas para depuração/automação. */
  debugStats() {
    const m = this.machine;
    return {
      weather: this.weather,
      previous: m.previous,
      progress: +m.progress.toFixed(3),
      timeLeft: +m.timeLeft.toFixed(1),
      locked: m.locked,
      cloudCover: +this.cloudCover.toFixed(3),
      rain: +this.rainIntensity.toFixed(3),
      wetness: +this.wetness.toFixed(3),
      wind: +this.windStrength.toFixed(3),
      gust: +this.gust.toFixed(3),
      fogDensity: +this.fogDensity.toFixed(5),
      visibility: Math.round(this.visibility()),
      night: +this.night.toFixed(3),
      sunY: +this.sunDirection.y.toFixed(3),
      moonY: +this.moonDirection.y.toFixed(3),
      lightIntensity: +this.sun.intensity.toFixed(3),
      hemiIntensity: +this.hemi.intensity.toFixed(3),
      exposure: +this.ctx.renderer.toneMappingExposure.toFixed(3),
      flash: +this.flash.toFixed(3),
      strikes: this.strikes,
      indoors: this.indoors,
      biome: this.lastBiome,
      drops: this.rain.activeDrops,
      splashes: this.rain.activeSplashes,
      groundFog: this.groundFog.active,
      post: this.post !== null,
      shadows: this.sun.castShadow,
      eclipse: +this.eclipse.toFixed(3),
    };
  }

  // ======================================================================
  // Ciclo de vida / save
  // ======================================================================
  private resetWeather() {
    const [a, b] = WEATHER_TIMING.firstDurationMin;
    this.machine.reset(WEATHER_TIMING.firstWeather, (a + (b - a) * this.rnd()) * 60);
    this.weather = this.machine.current;
  }

  /** Aplica o estado atual imediatamente (sem suavizações). */
  private snapVisuals() {
    const mix = this.machine.mix;
    this.wind.snap(mix.wind);
    this.windStrength = this.wind.strength;
    this.rainIntensity = mix.rain;
    const p = this.ctx.sys.player?.position;
    if (p) {
      const b = this.ctx.heightfield.biomeAt(p.x, p.z);
      this.localFog = biomeFogExtra(b, this.ctx.clock.hours, nightFactor(this.sunDirection.y));
    }
    this.applyVisuals(0, true);
    this.groundFog.invalidate();
  }

  onNewGame() {
    this.resetWeather();
    this.wetness = 0;
    this.strikeAge = 99;
    this.flash = 0;
    this.eclipse = this.eclipseTarget = ECLIPSE.intensity;
    if (this.ctx) this.snapVisuals();
  }

  serialize() {
    return {
      v: 1,
      weather: this.machine.serialize(),
      wetness: Math.round(this.wetness * 1000) / 1000,
      eclipse: Math.round(this.eclipseTarget * 1000) / 1000,
      windAngle: Math.round(this.wind.angle * 1000) / 1000,
    };
  }

  deserialize(data: unknown) {
    const d = data as Record<string, unknown> | null;
    if (!d || typeof d !== 'object') throw new Error('dados do ambiente inválidos');
    // formato antigo do stub: { weather: 'rain' }
    const w = typeof d.weather === 'string' ? { current: d.weather } : d.weather;
    this.machine.restore(w);
    this.weather = this.machine.current;
    const num = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) ? v : def);
    this.wetness = clamp(num(d.wetness, 0), 0, 1);
    this.eclipse = this.eclipseTarget = clamp(num(d.eclipse, ECLIPSE.intensity), 0, 1.6);
    this.wind.angle = num(d.windAngle, this.wind.angle);
    this.strikeAge = 99;
    this.flash = 0;
    if (WEATHER[this.weather].lightningPerMin > 0) this.nextStrike = 4 + this.rnd() * 6;
    if (this.ctx) this.snapVisuals();
  }

  dispose() {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.scene.remove(this.sun, this.sun.target, this.hemi, this.sky.mesh, this.rain.drops, this.rain.splashes, this.bolt.mesh, this.groundFog.mesh);
    this.sky.dispose();
    this.rain.dispose();
    this.bolt.dispose();
    this.groundFog.dispose();
    this.post?.dispose();
    this.post = null;
    ctx.render = () => ctx.renderer.render(ctx.scene, ctx.camera);
  }
}
