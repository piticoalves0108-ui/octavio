# Status — módulo `env` (céu, dia/noite, clima, vento, névoa e pós-processamento)

Arquivos: `src/env/**`, `src/data/weather.ts`, testes em `tests/env.*.test.ts`.
Nenhum arquivo fora da área foi alterado (os eventos `weather:changed`/`lightning` e o SfxId `thunder` já existiam no contrato).

## Estrutura

| Arquivo | Papel |
|---|---|
| `src/env/Environment.ts` | Sistema `env` (classe `Environment`): orquestra tudo, substitui `ctx.render`, API pública, save. |
| `src/env/dayCycle.ts` | Lógica pura do ciclo: direção do sol/lua (fases contínuas), fator noite, níveis de luz, paleta por quadros-chave, direção do Eclipse, rótulos. |
| `src/env/weatherMachine.ts` | Máquina de estados do clima (lógica pura): Markov + pesos por região/horário, durações naturais, transições com curvas por parâmetro, trava. |
| `src/env/wind.ts` | Vento (lógica pura): direção que deriva, força base suavizada, rajadas por ruído. |
| `src/env/envMath.ts` | Funções puras: densidade de névoa, névoa por bioma/horário, curva do clarão, trajetória do raio, snap da câmera de sombra. |
| `src/env/Sky.ts` | Domo do céu (1 shader): gradiente, dispersão, sol HDR, lua com fase/crateras, estrelas girando no polo + faixa galáctica, nuvens procedurais, clarão, **Eclipse Arcano**. |
| `src/env/Rain.ts` | Chuva na GPU (1 draw) + respingos (1 draw, pool). |
| `src/env/Lightning.ts` | Raio visível (fitas voltadas à câmera, HDR, buffers pré-alocados). |
| `src/env/GroundFog.ts` | Névoa rasteira (sprites instanciados, 1 draw). |
| `src/env/PostFX.ts` | EffectComposer: RenderPass HDR (MSAA opcional) → UnrealBloom → passe final (ACES + sRGB + gradação/vinheta/corrupção/clarão). |
| `src/env/textures.ts` | Textura de ruído procedural 128² (fBm/células/branco), compartilhada. |
| `src/data/weather.ts` | Todos os números: climas, transições, pesos regionais, paleta do céu, eclipse, nuvens, vento, chuva, umidade, raios, névoa, sombras, pós. |

## Implementado (funcional, integrado ao jogo)

### A) Céu
- Domo único (`Sky.ts`, 1 draw call, desenhado depois dos opacos no plano distante: só pinta pixels livres).
- Gradiente zênite/horizonte por quadros-chave (madrugada → amanhecer → dia → entardecer → noite), dispersão em volta do sol (mais forte com o sol baixo), disco do sol em HDR (alimenta o bloom).
- Lua com fase real (iluminação pela direção do sol) e crateras por ruído; nasce ~0,6 h após o pôr do sol e atrasa 0,8 h por dia (fases mudam ao longo dos dias, sem saltos à meia-noite).
- Estrelas procedurais (cintilam, cores variadas) que giram em volta do polo celeste ao norte, mais faixa galáctica com nebulosidade.
- Nuvens procedurais (3 leituras de uma textura de ruído 128² gerada no boot) que se movem com o vento; cobertura, escurecimento (tempestade) e iluminação pelo sol/lua vêm do clima; clarão do relâmpago ilumina as nuvens na direção do raio.
- **Eclipse Arcano**: lua eclipsada sempre ao norte (31° de elevação, oscila devagar), disco escuro, coroa violeta com raios girando, anel fino e anel externo de **28 runas procedurais** que pulsam em onda; visível de dia (42%) e pleno à noite; reage à corrupção (`uCorruption`) e à história (`setEclipse`).
- Horizonte do céu = exatamente a cor da névoa (o terreno distante se funde ao céu); a faixa de horizonte engrossa quando a névoa fecha.

### B) Ciclo dia/noite (a partir de `ctx.clock.hours`)
- Sol nasce a leste às 6 h, culmina inclinado ao sul, se põe a oeste às 18 h; trajetória contínua.
- Uma luz direcional (`sun`): segue o sol de dia e a lua à noite; a troca acontece com as duas intensidades ≈ 0 (sem salto visível de sombras). Cor/intensidade da luz, luz hemisférica (céu/chão), exposição do tone mapping e paleta interpolados com suavização (smoothstep) entre 10 quadros-chave.
- `GLOBAL_UNIFORMS` atualizados todo quadro: `uTime`, `uSunDir`, `uSunColor` (já atenuada por nuvens), `uFogColor`, `uNight`, `uWindDir`, `uWindStrength`, `uWetness`. `uCorruption` é escrito pelo `World` (dono do cálculo da corrupção); o env só o consome (céu e gradação).
- Luz hemisférica com escala (`DAY_CYCLE.hemiScale`) e reforço sob céu encoberto (`overcastHemiBoost`): com luzes físicas o preenchimento indireto sai dividido por π e as sombras/noite ficavam pretas.

### C) Sombras
- Câmera ortográfica da sombra centrada no jogador (avança 25% na direção da câmera), tamanho `q.shadowDistance`, mapa `q.shadowMapSize` (0 = sem sombras), estabilizada por **snap ao texel** no espaço da luz (bordas não tremem ao andar). `normalBias` proporcional ao tamanho do texel.
- `settings:changed` recria o mapa ao mudar o tamanho, ajusta a caixa, liga/desliga sombras, pós-processamento, quantidade de chuva e de névoa rasteira.

### D) Clima
- `WeatherMachine`: estados `clear/cloudy/rain/storm/fog` com durações naturais em minutos (céu limpo 7–14, nublado 4–9, chuva 3–7, tempestade 2–5, névoa 3–7), cadeia de Markov sem autotransição, **pesos por região** (pântano/corrompido: mais névoa; montanha: mais tempestade; vila/campos: mais céu limpo) e **névoa matinal** mais provável entre 4h30 e 9h30.
- Transições naturais de 70–150 s com curvas por parâmetro: as nuvens chegam antes da chuva (a chuva só começa com 40% da transição) e a chuva para antes de o céu abrir. Mudar no meio de uma transição parte da mistura atual (sem salto).
- Novo jogo começa com céu limpo por 9–14 min. `setWeather(kind, s)`, `lockWeather(kind|null)` (arena de chefe/cinemática), evento `weather:changed`, `Saveable` (clima, tempo restante, trava, umidade, eclipse, vento) com validação (save inválido lança erro; formato antigo `{weather:'rain'}` aceito).
- Pancadas: intensidade da chuva varia ±25% devagar (ruído).

### E) Chuva
- Gotas na GPU (`InstancedBufferGeometry`, 1 draw): caixa 44×26 m que acompanha a câmera com as gotas fixas no mundo; quantidade = `q.rainDrops × intensidade` (instanceCount); inclinadas pela velocidade do vento; largura mínima de ~1 px com alfa compensado (sem cintilar ao longe); cor iluminada pelo céu e pelo clarão.
- Respingos (pool de 110 no 'high', escala com `q.rainDrops`): anel no chão/água + coroa de gotículas, reposicionados só quando cada um termina; caem no chão real (terreno **ou topo de estrutura caminhável** via `physics.groundHeight`), anel maior na água; nada de respingo voando alto.
- `uWetness` sobe com a chuva (≈50 s até encharcar) e seca devagar (mais devagar à noite e com nuvens).
- Interiores: usa `world.isIndoors(pos)` (4×/s) — sem gotas/respingos dentro e névoa reduzida; respingos também não nascem em pontos cobertos.

### F) Tempestade
- Relâmpagos naturais (Poisson, média 7/min na tempestade, intervalo mínimo 3,5 s) a 160–900 m (12% de chance de 55–140 m), raio visível (tronco + ramos por deslocamento aleatório, fitas HDR com largura que cresce com a distância), clarão em 2–3 pulsos no céu, nas nuvens, na luz direcional/hemisférica, na exposição e no pós; câmera treme se cair perto.
- Evento `lightning { position }` para o áudio; `thunderDelay(pos)` dá o atraso (dist/343 m/s).
- `lightningFlash(pos?)` público (chefes): com posição, o raio cai ali (o dano fica com quem chamou).

### G) Névoa
- `FogExp2` com densidade base = 1,75 / `q.viewDistance` (≥ 95% de névoa na borda do terreno, compatível com `camera.far = viewDistance + 400`), × multiplicador do clima + extras do clima (névoa de verdade no clima `fog`).
- Névoa local por bioma/horário com transição suave (λ = 0,45/s) na posição do jogador: pântano denso (+tinta esverdeada), corrompido (+tinta roxa), floresta/margem/campos com névoa matinal, baixadas com névoa noturna leve. A névoa local some ao voar acima da camada (~30–260 m), a de distância diminui um pouco.
- Névoa rasteira: até 56 sprites instanciados (1 draw) por células de 16 m num raio de 120 m, conforme bioma/hora/clima (pântano sempre, floresta/margem de manhã); layout refeito só ao mudar de célula ou a cada 4 s; ruído animado com o vento; somem de perto/de cima.

### H) Vento
- `WindModel`: direção deriva devagar (±~75°) + turbulência, força base acompanha o clima com suavização (0,35 calmo … 1,65 tempestade), rajadas esparsas por ruído (0..1). Escreve `uWindDir`/`uWindStrength` (a vegetação do `world` já lê). Também move as nuvens, a chuva e a névoa rasteira.

### I) Pós-processamento
- Com `q.bloom`: `EffectComposer` com alvo HDR half-float (MSAA ×4 se `q.antialias`) → `UnrealBloomPass` (cadeia interna começa em meia resolução) → passe final único que faz tone mapping ACES + sRGB + gradação (saturação/contraste), vinheta, tinta noturna azulada, tinta de tempestade, tinta/vinheta roxa com `uCorruption` e clarão. Bloom mais forte à noite (runas/eclipse brilham).
- Substitui `ctx.render`; o tamanho é conferido a cada quadro com o drawing buffer (resize e pixel ratio). Sem bloom: render simples (o tone mapping do renderer continua valendo).

### J) Clima rico (etapa "estilo Zelda", 24/10/2026)
- **Poças** (shader do terreno): aparecem em manchas no chão plano e baixo (estradas, baixadas) quando a umidade
  passa de `WEATHER_FX.puddleWetness`. Ficam escuras e lisas e refletem o céu, mais na visão rasante. Enquanto
  chove, mostram ondinhas (anéis animados que perturbam a normal).
- **Neve**: com a câmera acima de `WEATHER_FX.snowLine`, a chuva vira flocos que caem devagar e balançam
  (`uSnow` no shader das gotas). A neve desce pela montanha (`uSnow` no terreno), e os respingos somem.
- **Arco-íris**: aparece depois de mais de 25 s de chuva, quando ela para e o sol está baixo (de dia). Tem arco
  primário e secundário, de cores invertidas, do lado oposto ao sol (shader do céu, `uRainbow`).
- **Raios perigosos** (`stormHazard.ts`):
  - na tempestade, ao ar livre, um raio cai perto do jogador a cada 16–34 s;
  - antes do raio há aviso: círculo no chão e estalos;
  - armas de metal (espada, adaga, lança, manopla) atraem o raio e fazem os raios virem mais cedo; o jogo avisa
    uma vez;
  - o raio fere o jogador e os inimigos no círculo.
- **Rajadas visíveis** (`WindStreaks.ts`): riscos brancos curvos (com um caracol no fim) que cruzam o ar com
  vento forte. São instanciados, em 1 draw call.
- Uniforms globais novos: `uRain` e `uSnow`.
- Correção: a luz estilizada (`stylize.ts`) não era aplicada aos materiais Standard/Physical no build,
  porque o texto do three compilado tem outro espaçamento. Agora os trechos casam por regex.
- Validado no navegador: poças na chuva e depois dela, arco-íris duplo, neve no pico, raio com aviso e rajadas.

## Correções feitas na revisão final (retomada)

- **Chuva invisível (bug real)**: os quads das gotas e o anel dos respingos eram orientados no vertex shader com a ordem de vértices "de costas" para a câmera e o material usava `FrontSide` → o back-face culling descartava tudo (as checagens numéricas diziam 3.500+ gotas ativas, mas nada aparecia nas capturas). Agora `DoubleSide`; diagnosticado com captura em cor de depuração; teste de regressão em `tests/env.parts.test.ts`.
- **Sombras/noite/tempestade pretas**: com luzes físicas o preenchimento da `HemisphereLight` sai dividido por π. Escala `hemiScale` 2,3 + reforço sob céu encoberto + quadros-chave de amanhecer/entardecer/noite mais claros; exposição diurna levemente reduzida para compensar. Lua 0,55 → 0,8.
- **Estatísticas de render com pós**: o `EffectComposer` faz vários `renderer.render()` por quadro e o `renderer.info` (com `autoReset`) ficava só com o último passe → o monitor mostrava 1 draw call. Agora o PostFX soma todos os passes.
- **Respingos em estruturas**: caem no topo de estruturas caminháveis (muralha, ponte, praça) via `physics.groundHeight`, não mais no terreno escondido embaixo.
- Faixa de horizonte do céu mais larga com névoa densa, nuvens rareando perto do horizonte, e cor da névoa mais escura e puxada para o tom das nuvens sob céu encoberto (`FOG.cloudTone`): montanhas enevoadas não ficam "recortadas" contra o céu; chuva levemente mais visível.

## API pública acrescentada (além do contrato do stub, que foi mantido)

`Environment`:
- Estado: `machine` (WeatherMachine), `wind` (WindModel), `windDir`, `gust`, `cloudCover`, `fogDensity`, `night`, `flash`, `eclipse`, `indoors`, `sunDirection`, `moonDirection`, `eclipseDirection`, `lightDirection`, `strikes`, `sky`, `rain`, `bolt`, `groundFog`, `fog`.
- Métodos: `lockWeather(kind | null, s?)`, `setEclipse(intensidade 0..1.6, s?)`, `thunderDelay(pos, ouvinte?)`, `weatherLabel(kind?)` (pt-BR), `timeOfDayLabel()` (pt-BR: Madrugada/Amanhecer/Manhã/Meio-dia/Tarde/Entardecer/Noite), `visibility()` (m), `postEnabled`, `debugStats()`.
- Funções puras exportadas: `dayCycle.ts` (`sunDirection`, `moonDirection`, `moonPhase`, `nightFactor`, `lightLevels`, `sampleSky`, `eclipseDirection`, `timeOfDayLabel`), `envMath.ts` (`baseFogDensity`, `fogDensity`, `fogVisibility`, `biomeFogExtra`, `groundFogWeight`, `flashCurve`, `thunderDelay`, `buildBoltSegments`, `snapShadowCenter`), `weatherMachine.ts` (`WeatherMachine`, `morningFogFactor`, `isWeatherKind`).

## Pedidos para outros módulos

- **audio**: assinar `'lightning'` e tocar `'thunder'` com atraso `ctx.sys.env.thunderDelay(position)` (volume pela distância); ambiência de chuva/vento pode ler `env.rainIntensity`, `env.windStrength`, `env.gust`, `env.indoors`; `'weather:changed'` para trocar a camada de ambiência.
- **ui**: mostrar `env.weatherLabel()` / `env.timeOfDayLabel()` no HUD ou no mapa (opcional).
- **ai (chefes)**: `env.lightningFlash(pos)` para ataques de raio (o dano fica com o chefe) e `env.lockWeather('storm')` / `lockWeather(null)` na arena.
- **rpg/story**: `env.setEclipse(1.3, 20)` em marcos da história (o eclipse cresce e as runas brilham mais); o valor é salvo.

## Pendente / limitações conhecidas

- O céu/clima não avançam no menu principal nem na pausa (o `env` não é `alwaysUpdate`, de propósito: pausar congela chuva/raios). No menu o céu fica parado na hora do relógio.
- O trovão em si é do módulo de áudio (o env só emite o evento e calcula o atraso).
- Interiores dependem de `world.isIndoors`; a chuva some/aparece pela posição do jogador (se a câmera ficar do lado de fora com o jogador dentro, não chove em volta da câmera).
- Névoa rasteira é de sprites (cartões): de cima ela some de propósito; não há névoa volumétrica.
- Reflexos de poças não existem: "molhado" é só o `uWetness` (escurecer/brilho) que terreno/estruturas/vegetação do `world` já leem.
- Sem neve (não há clima frio no mapa atual).
- FPS absoluto no ambiente de teste (SwiftShader, CPU) não é representativo; ver custo de CPU abaixo.

## Validação (números reais desta execução — 15/10/2026)

Ambiente: Chromium headless com SwiftShader (render por CPU) numa máquina de 4 núcleos compartilhada com outros agentes; FPS absoluto não é representativo, o custo foi medido em CPU.

- **TypeScript**: `npx tsc --noEmit` → 0 erros (no projeto inteiro e nos arquivos do env).
- **Testes unitários**: `npx vitest run tests/env` → **44 testes, 4 arquivos, todos passando** (`env.cycle` 13, `env.math` 11, `env.weather` 15, `env.parts` 5). Cobrem: trajetória contínua do sol/lua (inclusive à meia-noite), fases, troca sol→lua com luzes ≈ 0, paleta cíclica sem saltos, eclipse ao norte, rótulos pt-BR; névoa (≥ 95% na borda, piso, camada que some ao voar, pântano × campos, visibilidade 80–400 m no pântano), curva do clarão, atraso do trovão, trajetória do raio (tronco contínuo até o alvo, ramos), snap da sombra (na grade de texels, profundidade preservada, luz vertical); máquina do clima (curvas nuvem/chuva, sem salto ao trocar no meio, só muda após a duração, nunca para o mesmo, travada, 6 h simuladas com 20–120 mudanças e durações dentro das faixas, pesos regionais com estatística de 40 h, save/restore e erro em save inválido); vento (limites, rajadas, deriva, suavização); chuva/respingos/névoa rasteira/raio na CPU (regressão do culling, contagem por intensidade, respingos nunca em ponto coberto, superfície da água).
- **Smoke** (`node scripts/smoke.mjs --port=4194 --out=.smoke/env --shot=bench-results/env-smoke.png`): saída 0, **0 erros e 0 avisos de console**, jogo em `playing`, 71 draw calls (preset padrão da máquina = medium, sem bloom).
- **Checagens Playwright próprias** (`/tmp/claude-0/env-checks/shots2.mjs --checks --bench`, preset high com bloom): **18/18 OK** — `setWeather` emite `weather:changed` e aplica na hora com transição 0; clima inválido ignorado; `lightningFlash(pos)` emite `lightning` na posição; `thunderDelay` = dist/343; tempestade gera raios naturais (2–5 em 30 s simulados); umidade sobe na chuva (0,56 em 30 s) e seca devagar (−0,10 em 30 s); transição de 60 s gradual (nuvens 0,22 → 0,74 na metade); **interior sem gotas/respingos** e volta a chover fora (4.084 gotas, 108 respingos); save/restore (clima, tempo restante, umidade, eclipse, vento) e erro em save inválido; `lockWeather` segura o clima; dia/noite coerente; cor da névoa = `scene.fog` = `uFogColor`; **sombra estável** (mover 4 mm não move a caixa no plano da luz: 5e-14 m; mover 3 m move 2,9 m); pântano com visibilidade 261 m × 1.108 m nos campos e 56 sprites de névoa rasteira.
- **Qualidade (`settings:changed`)**: low → sem pós e sem sombras (1.500 gotas); medium → sombras 1024, sem pós; high → sombras 2048 (caixa ±90 m) + pós; ultra → 4096 (±120 m) + pós.
- **Custo de CPU** (preset high):
  - `env.update` medido em 40 quadros reais durante tempestade: **0,17–0,26 ms/quadro**; média móvel do PerfMonitor: `env` 0,21 ms, `env.render` (sombra/foco) 0,01 ms (para comparação, no mesmo relatório: `player` 0,87 ms, `world.render` 2,3 ms).
  - Laço quente (3.000 chamadas após aquecer o JIT): `update` 5–15 µs por chamada em céu limpo/chuva/tempestade/névoa; `preRender` 0,5–4 µs.
  - Sem alocação por quadro nos caminhos quentes (vetores/cores reutilizados; buffers de chuva/raio/névoa pré-alocados; layout da névoa rasteira só ao mudar de célula ou a cada 4 s).
  - GPU: céu 1 draw, chuva 1 + respingos 1, raio 1 (só quando visível), névoa rasteira 1; pós = render HDR + cadeia do bloom (começa em meia resolução) + 1 passe final.
- **Capturas** (olhadas uma a uma; câmera cinemática controlada, 1280×720, preset high): `bench-results/env-noon.png` (meio-dia com nuvens e o Eclipse pálido de dia), `env-sunset.png` (entardecer), `env-night.png` (noite estrelada com o Eclipse Arcano, runas e coroa; paisagem legível ao luar), `env-dawn.png` (amanhecer nublado com névoa matinal), `env-rain.png` (chuva com gotas inclinadas e anéis de respingo), `env-storm.png` (tempestade com raio visível e chuva forte), `env-swamp.png` (névoa densa do pântano + névoa rasteira), `env-fog.png` (clima de névoa na floresta), `env-smoke.png` (smoke).
