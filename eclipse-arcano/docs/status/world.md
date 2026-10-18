# Status — módulo `world` (mundo aberto: relevo, terreno, água, vegetação, estruturas, âncoras e navegação)

Arquivos: `src/world/**`, `src/data/world.ts`, `src/data/places.ts`, testes em `tests/world.*.test.ts`.
Nenhum arquivo fora da área foi alterado por este módulo (não foi preciso criar eventos, `SfxId` nem `VfxKind`).
`heightfield.ts` e `Collision.ts` foram só **estendidos** (APIs antigas intactas).

## Estrutura

| Arquivo | Papel |
|---|---|
| `src/world/World.ts` | Sistema `world` (classe `World`): monta tudo no `init` (assíncrono, com progresso na tela de carregamento), pré-render dependente da câmera, descoberta de locais, superfícies, interiores, portões, save. |
| `src/world/heightfield.ts` | Relevo 2048×2048 m (grade 1025², 2 m). Estendido: `flattenOuter` por local (encostas suaves), montanhas da borda revistas, `coarseHeightAt(x,z,espaçamento)` e `lodSag(x,z)` (quanto o relevo real fica acima do LOD grosso). |
| `src/world/Collision.ts` | Estendido sem mudar a API: grade com chave numérica e conjunto reutilizado no `raycast` (consultas por quadro sem alocar strings/Sets). |
| `src/world/maps.ts` | Mapas do mundo em grade de 2 m: cor de bioma, dados (estrada, corrupção, grama, flores), máscara de bloqueio, altura exata R32F e normais; GLSL compartilhado (`MAPS_GLSL`). |
| `src/world/terrain.ts` | Terreno em quadtree com LOD na GPU (64/128/256/512 m, mesma malha 33×33 + saias), **1 draw call instanciada**, anel de montanhas do horizonte. |
| `src/world/textures.ts` | Texturas procedurais: detalhe do terreno (canvas), normais da água, `DataArrayTexture` de 14 camadas das estruturas (pedra, madeira, telha, reboco, metal com circuitos, cristal, runas, musgo, palha, tecido...). |
| `src/world/water.ts` | Água (lago, rio, pântano) só onde o relevo fica abaixo do `WATER_LEVEL`, em blocos de 256 m com culling. |
| `src/world/grass.ts` | Grama + flores mágicas posicionadas inteiramente na GPU (anel em volta da câmera). |
| `src/world/vegetation/models.ts` | Modelos procedurais: carvalho, pinheiro, árvore luminosa (Lúmen), árvore morta com musgo (pântano), árvore de cristal (ruínas), arbusto, pedra — cada árvore com malha completa e simplificada; material único com vento/empurrão no vertex shader. |
| `src/world/vegetation/scatter.ts` | Dispersão por chunk de 128 m com streaming (≤ 2 chunks/quadro), LOD por árvore, colisores de troncos/pedras só perto do jogador. |
| `src/world/vegetation/particles.ts` | Partículas ambientes (1 sistema de pontos): folhas, poeira, vagalumes, esporos — pesos por bioma/noite. |
| `src/world/structures/builder.ts` | `GeoBuilder`: geometria mesclada por construção (caixas, vigas, cilindros, arcos, telhados, quadros locais com yaw). |
| `src/world/structures/kit.ts` | `SiteKit`: grupos de malha por sítio, colisores, zonas de superfície/interior, luzes, pegadas no mapa (tira grama/árvores). |
| `src/world/structures/material.ts` | Material **único** das estruturas (MeshStandardMaterial + camadas + emissão por modo: fixa / noite / pulsante / chama). |
| `src/world/structures/parts.ts` | Peças: casa enxaimel/pedra com interior opcional, janelas (acendem à noite), portas, lampião, cerca, barril, caixote, banco, mesa, estante, coluna, tenda, fogueira, braseiro, cristal. |
| `src/world/structures/gates.ts` | Portões animados (giro/deslize, ease) com colisores; `GateSystem`. |
| `src/world/structures/village.ts` | Vila de Brumafria. |
| `src/world/structures/crypt.ts` | Cripta do Despertar. |
| `src/world/structures/ruins.ts` | Ruínas de Aeternum + Câmara do Guardião. |
| `src/world/structures/outposts.ts` | Acampamento dos Corvos, Torre do Observador, Posto Avançado de Ferroluz. |
| `src/world/structures/sky.ts` | Ilhas Suspensas de Elyra + Farol Celeste. |
| `src/world/structures/landmarks.ts` | Laboratório, Santuário de Cristal, arcos do Desfiladeiro, pontes (cruzamentos estrada × rio), placas de direção, adereços do pântano. |
| `src/world/nav.ts` | Grafo de navegação da vila + `findPath`. |
| `src/data/world.ts` | Layout (locais, rios, estradas, ilhas, arenas, início) + números do sistema: `TERRAIN`, `VEGETATION`, `WATER`, `GATES`. |
| `src/data/places.ts` | Plantas das estruturas (vila, cripta, ruínas, arena, acampamento, torre, Ferroluz...) e **180 âncoras nomeadas** + rotas de patrulha. |

## Implementado (funcional, integrado ao jogo)

### A) Terreno
- Quadtree estático (16 raízes de 512 m → nós de 256/128/64 m) em arrays tipados; seleção por distância 3D até a caixa do nó × `q.lodBias` (`TERRAIN.lodDistances` = 110/240/480 m) + frustum culling; nós além de `q.viewDistance + 250 m` descartados. Zero alocação por quadro.
- Todos os nós usam a MESMA malha 33×33 deslocada no vertex shader pela altura exata (R32F): 64 m → 2 m/vértice (igual ao heightfield) … 512 m → 16 m/vértice. **1 draw call** para o terreno inteiro; não há geometria a construir em runtime (o "streaming" do terreno é só a troca de instâncias).
- Saias por nível (1,5 / 3 / 7 / 16 m) escondem as rachaduras em T entre LODs; iluminação por mapa de normais por pixel (o relevo longe continua detalhado).
- Material: `MeshStandardMaterial` via `onBeforeCompile` (com névoa): cor de bioma (mapa macro), rocha por inclinação, neve no alto, estradas de terra e ruas (mapa de estradas + `roadDistance`), textura de detalhe procedural (canvas, 2 escalas), escurecimento/brilho por umidade (`uWetness`), tons arroxeados com veios emissivos pulsando à noite na terra corrompida.
- Borda: montanhas na borda do mapa (heightfield) + anel de montanhas do horizonte além do mundo + **barreira arcana** invisível/translúcida (colisor no `PLAYABLE_HALF` = 960 m, aparece só a < 45 m).
- Locais aplainados com transição configurável (`flattenOuter`) — todos têm ao menos uma encosta caminhável (teste).

### B) Água
- Malha só onde há água (grade de 8 m, blocos de 256 m). Shader: ondas no vértice, normais animadas seguindo a correnteza do rio (`riverFlow`), fresnel com a cor do céu/névoa, cor por profundidade (altura exata do relevo), espuma nas margens (mais forte no rio), água turva com "nata" verde no pântano, especular do sol.

### C) Vegetação interativa
- **Grama** (tufos de 5 lâminas) num anel de raio `q.grassRadius` em volta da câmera, densidade = mapa (bioma × pegadas × estradas) × `q.grassDensity`; posição, altura e cor calculadas na GPU (CPU ≈ 0). Vento (`uWindDir/uWindStrength/uTime`) com rajadas que percorrem o campo; **dobra para longe do jogador** (`uPlayerPos`); escurece com a umidade.
- **Flores mágicas** (mesmo esquema): brilham mais perto do jogador e à noite (`uNight`).
- **Árvores** de 5 espécies por bioma (carvalho/pinheiro nos campos e floresta, árvore luminosa na Floresta de Lúmen, árvore morta com musgo pendente no pântano/corrompido, árvore de cristal nas ruínas), **arbustos** (balançam e se afastam ao contato) e **pedras**. Instanciadas: um `InstancedMesh` por espécie × LOD para o mundo inteiro; malha completa até `treeFullDistance × lodBias`, simplificada depois; arbustos/pedras com distância máxima; sombras só perto.
- Streaming por chunk de 128 m em volta da câmera (raio ≤ `viewDistance`), no máximo `VEGETATION.scatterPerFrame` = 2 chunks gerados por quadro; matrizes prontas em `Float32Array` e copiadas só quando a seleção muda.
- **Colisores de troncos e pedras grandes só para chunks a ≤ 200 m do jogador** (add/remove no streaming). Nada de física para objetos distantes.
- **Partículas ambientes** (1 draw): folhas na floresta, poeira no desfiladeiro/ruínas, vagalumes à noite, esporos no pântano/terra corrompida; posições no vertex shader (caixa que acompanha o jogador), pesos por bioma suavizados; dentro de interiores usa o perfil da vila.

### D) Estruturas (geometria mesclada por sítio, material único, colisores coerentes)
- **Vila de Brumafria**: muralha de 20 lados com torres e ameias, **portões leste e sul** (`portao_brumafria_leste/sul`, folhas que giram) com guaritas; **14 casas** variadas (enxaimel/pedra/reboco, 1–2 andares, telhados e cores diferentes) + **Casa da Anciã** (varanda e jardim); **Taverna do Javali Rúnico com interior acessível** (piso de madeira, balcão com canecas, prateleiras com garrafas, barris, lareira com fogo e luz tremulante, 4 mesas com banquetas, palco do bardo, canto de descanso com cama/cortina, lanternas, placa, quadro de missões na fachada); **forja** aberta com fornalha brilhando, bigorna e armas; **mercado** com 5 barracas; **arquivo/biblioteca** com interior (estantes, mesa de leitura); **santuário**; **praça com poço** e bancos; **torre de cristal adormecida** cyber-medieval; plantações (trigo, repolho, abóbora, vinha) e cercados fora dos muros; **14 lampiões** e janelas que acendem à noite (emissivo por `uNight`), com só **2 luzes pontuais reais** que se movem para as fontes mais próximas (lareira, forja, altar, braseiros...).
- **Cripta do Despertar**: pátio murado a céu aberto (o jogo começa aqui, saída norte com degraus e obeliscos rúnicos, braseiros de chama azul), mausoléu semienterrado (aterros de terra/musgo) com pórtico, porta de laje deslizante (`porta_cripta`), câmara com sarcófago aberto, **círculo de selamento rúnico no chão**, velas, altar com cristal, mural rúnico, faixas de runas e entulho.
- **Ruínas de Aeternum**: avenida de colunas e arcos rúnicos, praça com obelisco tecnológico, muros e colunas **escaláveis** (tag `climbable`, 121 colisores no raio de 80 m), torre arruinada, salão desabado, coluna caída, 4 pilares tecnológicos (1 terminal ativo), condutos de cristal elevados, **fundações de 12 casas** no anel externo do planalto, entulho.
- **Câmara do Guardião**: anfiteatro circular de metal rúnico (piso de luta raio 36 m = `BOSS_ARENAS`), muro-pódio, 6 degraus de arquibancada, pilões com cristais, **4 soquetes** (fase 2), **6 respiradouros** (fase 3), estrado central, corredor de entrada com **grade `arena_guardiao`** (sobe/desce) e o **portão selado `portao_ruinas`** (folhas deslizantes), pedestal do cristal.
- **Acampamento dos Corvos**: paliçada com abertura para a estrada (`portao_corvos`), tendas + tenda do líder, fogueira, caixotes, cristais roubados, estandartes, torre de vigia com plataforma caminhável, jaula.
- **Torre do Observador**: torre de 44 m em colina suave com trilha, porta trancada (`porta_torre`), térreo com estantes (interior), **sacada no topo caminhável** (alcançável voando) com baú, telescópio.
- **Posto Avançado de Ferroluz**: fortaleza com muralhas tecnológicas (faixas de circuito), torres, torre central alta (silhueta vista de longe), **portão `portao_ferroluz` fechado**.
- **Ilhas de Elyra (5) + Farol Celeste**: rocha pendente irregular, topo gramado caminhável, raízes, pequenas ruínas, árvores, colisores escalonados; âncoras de relíquia/baú.
- Laboratório Abandonado (interior), Santuário de Cristal, arcos de pedra no Desfiladeiro, **pontes** em todos os cruzamentos estrada × rio (tabuleiro caminhável, degraus ≤ 0,45 m), placas de direção com texto em pt-BR, árvores mortas e **cristais corrompidos roxos** no pântano + cabana em palafitas.
- **Portões** (`setGateOpen(id, aberto)` anima e liga/desliga o colisor; o colisor só libera depois de meio caminho aberto e bloqueia na hora ao fechar): `portao_brumafria_leste`, `portao_brumafria_sul`, `porta_cripta` (abertos por padrão), `portao_ruinas` (fechado), `arena_guardiao` (aberto; a IA do chefe fecha/abre), `porta_torre` (fechada), `portao_ferroluz` (fechado), `portao_corvos` (aberto). Estado salvo no save.

### E) Âncoras e navegação (`src/data/places.ts`, `src/world/nav.ts`)
- 180 âncoras com coordenadas derivadas das MESMAS plantas usadas pelos construtores (batem com a geometria): casa/trabalho/lazer dos NPCs (15 portas de casa, 15 quintais, 31 postos de trabalho — balcão/bardo da taverna, bigorna/fornalha/balcão da forja, vendedores das barracas, mesa do arquivo, altar do santuário, jardim da Anciã, guaritas, plantações, porteiras, guardas de Ferroluz), 45 de lazer (mesas e assentos da taverna, lareira, praça, bancos, poço, clientes das barracas), portas/portões (dentro e fora), **baús** (`bau_cripta`, `bau_ruinas_1..3`, `bau_corvos`, `torre_bau_sacada`, `bau_tempestade`, `laboratorio_bau`), relíquias (`reliquia_elyra`, `fragmento_memoria_2`), **missões** (`altar_cripta`, `cripta_mural`, `pedestal_cristal_ruinas`, `ruinas_terminal`, `quadro_missoes_brumafria`, `corvos_jaula`, `torre_biblioteca`, `torre_telescopio`, `laboratorio_terminal`, `santuario_cristal_altar`...), **inimigos** (18 pontos: fogueira/torre/líder/spawns dos corvos, spawns das ruínas, `toca_lobos`, ninho e borda do pântano, emboscada do desfiladeiro), **arena** (entrada, centro, início do chefe, 4 soquetes, 6 respiradouros), topos das 6 ilhas, **habitats** (`campina_cervos`, `clareira_cervo_luminoso`, `ninho_grifo`, `poleiro_fenix`, `lago_margem`, cercados).
- `PATROL_ROUTES`: muralha e ruas da vila, acampamento e estrada dos corvos, avenida e circuito das ruínas, lobos da floresta, circuito do pântano, muralha de Ferroluz.
- Utilitários: `place(id)`, `placesWithTag(tag)`, `placesOfKind(kind)`, `rotYaw`, `buildingToSite`.
- **Grafo de navegação da vila**: nós nas ruas (a cada ~5 m), anel/centro da praça, portões dentro/fora, portas de todas as casas, postos de trabalho/lazer e **interiores** (taverna, arquivo) ligados pela porta; arestas automáticas cuja reta não atravessa prédios, muralha (fora dos vãos), barracas ou poço. `findPath(de, para)` (A*) aceita ids de âncora ou `{x,z}` e devolve pontos do mundo.

### F) Locais, superfícies, interiores
- Descoberta (`location:discovered`) e entrada (`location:entered`, o menor local que contém o jogador) — sem custo extra.
- `surfaceAt(x, z, y?)`: piso caminhável sob o ponto (madeira nos pisos/pontes, pedra nas ruínas/praça, metal na arena...) → zonas de superfície → água → estrada → bioma. `playerSurface` (cache do quadro).
- `isIndoors(pos)` / `indoorId(pos)`: taverna, arquivo, mausoléu da cripta, térreo da torre, laboratório (já usado pelo `env` para chuva/névoa).
- `uCorruption` = corrupção suavizada perto do jogador (consumida pelo `env`).

### G) Desempenho
- Terreno 1 draw; grama 1 + flores 1; vegetação ≤ 7 espécies × 2 LOD (7–10 draws visíveis); partículas 1; estruturas ~23 malhas mescladas (por sítio/camada) com culling por distância; portões são malhas próprias pequenas; água por bloco. 
- Números medidos: ver "Testes realizados".

## API pública (para outros módulos)

Contrato original mantido (`name`, `saveKey`, `discovered`, `init`, `update`, `discover`, `surfaceAt(x, z)`, `setGateOpen`, `onNewGame`, `serialize`, `deserialize`). Acrescentado em `World`:
- `surfaceAt(x, z, y?)` (altura opcional), `playerSurface`, `isIndoors(pos)`, `indoorId(pos)`, `biomeAt(x, z)`, `currentLocation`, `location(id)`.
- `placePosition(id, out?)` (âncora → posição com o chão aplicado), `findPath(de, para)` (vila).
- `isGateOpen(id)`, `gateIds()`, `gates` (`GateSystem`: `.gates.get(id)` → `open`, `t`, `moving`, `center`).
- `maps` (`roadAt`, `corruptionAt`, `grassAt`, `blockedAt`, texturas `colorTex`/`dataTex`/`heightTex` — úteis p/ minimapa), `uniforms`, `root`, `debugStats()`, `peakPreMs`.
- `src/data/places.ts`: `PLACES`, `PLACE_LIST`, `place(id)`, `placesWithTag(tag)`, `placesOfKind(kind)`, `PATROL_ROUTES`, plantas (`VILLAGE`, `VILLAGE_BUILDINGS`, `CRYPT`, `RUINS`, `ARENA`, `CAMP`, `TOWER`, `FERROLUZ`, `LAB`, `CRYSTAL_SHRINE`...).
- `src/world/nav.ts`: `villageNav()`, `findPath()`, `nearestNode()`, `navObstacles()`.
- `Heightfield.coarseHeightAt(x, z, espaçamento)`, `Heightfield.lodSag(x, z)`.

## Correções desta rodada
- **Arena do chefe tinha uma saída lateral**: perto do corredor de entrada o anel inteiro (pódio + arquibancadas) era removido em segmentos de 11,25°, mais largos que os blocos laterais do corredor — sobrava um vão de 2–6 m entre o bloco e as arquibancadas (visível em `world-arena_dentro.png` antigo) e, com a grade `arena_guardiao` fechada, dava para sair andando em 22 direções. Agora esses segmentos são montados em subsetores e só fica de fora o que o bloco cobre. Teste novo `tests/world.arena.test.ts` (falha no código antigo, passa no novo) + checagem no jogo (629 direções, raio máx. 38,46 m).
- Cripta: câmara ganhou círculo de selamento rúnico, faixas rúnicas e pedestal no sarcófago, velas e entulho.
- Ruínas: o planalto (raio 130 m) parecia vazio de cima — 12 fundações de casas com muretas irregulares (algumas escaláveis), pisos, colunas partidas e arcos.
- Pedras: cores lineares mais escuras (antes estouravam para verde-claro ao sol, especialmente no pântano).

## Pendente / limitações conhecidas
- **Interações não são registradas pelo mundo**: baús, portas, quadro de missões, altar etc. existem como geometria + âncoras (`placesOfKind('chest')`, `placesWithTag('missao')`...), mas o registro em `ctx.sys.interaction` e o conteúdo (saque, diálogos) ficam com os módulos rpg/npc (ainda stubs).
- Interiores navegáveis com mobília: taverna, arquivo, câmara da cripta, térreo da torre e laboratório. As outras 14 casas da vila têm porta decorativa (sem interior).
- O grafo de navegação cobre só a vila (ruas, portas, interiores). Fora dela há rotas de patrulha e âncoras; IA de campo aberto usa o próprio steering + `physics`.
- Relevo é um heightfield (sem cavernas/saliências). Nós distantes do terreno usam vértices a 8–16 m: em cristas agudas objetos pequenos podem "flutuar" um pouco de longe (`heightfield.lodSag` mede isso).
- Água sem reflexo planar real (fresnel com a cor do céu/névoa) e sem efeito subaquático próprio.
- Colisores de árvores/pedras existem só a ≤ 200 m do jogador (por projeto): inimigos/criaturas longe do jogador não colidem com troncos.
- O planalto das ruínas continua com o relevo plano e cor uniforme (agora preenchido com fundações); a grama no preset médio é relativamente rala em closes (ajustável em `VEGETATION.grassClumpsPerM2`).
- Portões não emitem evento/som próprio ao abrir/fechar (o áudio pode usar `world.gates.gates.get(id).moving`/`.center`).
- Medições feitas no Chromium com SwiftShader (renderização por software): FPS absoluto não é representativo; os números de custo são de CPU por sistema.

## Testes realizados

Rodada final (17/10), build de produção em `.smoke/world`, Chromium headless com SwiftShader.

**a) Tipos** — `npx tsc --noEmit`: 0 erros nos arquivos do módulo (e 0 no projeto inteiro no momento da medição).

**d) Unitários** — `npx vitest run tests/world`: **4 arquivos, 32 testes, todos passando** (~3 s):
- `world.nav.test.ts` (7): grafo com nós/arestas suficientes, nenhuma aresta externa atravessa prédios/muralha, todas as âncoras externas alcançáveis da praça, caminho até o balcão passa pela porta da taverna, caminho de fora do portão sul até a Anciã fica dentro da vila, aceita coordenadas, plantações alcançáveis pelos portões.
- `world.places.test.ts` (11): ids únicos, âncoras essenciais existem, 4 soquetes e 6 respiradouros dentro do raio do chefe, topos/segredos nas alturas das ilhas, sacada no anel caminhável, início no pátio com saída norte, prédios dentro da muralha e sem sobreposição, rotas dentro do limite, portões documentados, pontes (cruzamento estrada × rio; degraus ≤ 0,45 m e meio acima da água).
- `world.terrain.test.ts` (12): todo local aplainado tem encosta caminhável (≤ inclinação máx. do jogador), colina suave da torre, leito do rio abaixo da água, `coarseHeightAt`/`lodSag`, portão fecha/abre colisor no meio da animação, `groundHeight` em plataformas, convenção de yaw do `GeoBuilder`, caixa com normais para fora, `inZone` com rotação, correnteza do rio.
- `world.arena.test.ts` (2, **novo**): com a grade fechada não há saída a pé da arena em 629 direções (falhava no código anterior: 22 direções de fuga); com a grade aberta sai-se pelo corredor até o portão selado.

**b) Fumaça** — `node scripts/smoke.mjs --port=4191 --out=.smoke/world --shot=bench-results/world-smoke.png`: estado `playing`, **0 erros e 0 avisos de console**; 89 draw calls / 466 mil triângulos no início (cripta, preset padrão com sombras); custo de CPU `world` 0,17 ms + `world.render` (pré-render dependente da câmera) 2,4 ms sob SwiftShader.

**c) Playwright próprio** (`/tmp/claude-0/world-checks/`, via `window.__game`):
- `checks.mjs` — **17/17 OK**: início no pátio da cripta sobre a laje (pedra, local descoberto/entrado), saída norte caminhável (degrau máx. 0,30 m), muro do pátio bloqueia, `portao_ferroluz` fechado por padrão → `setGateOpen` anima e libera o colisor, 8 portões registrados, taverna = interior com piso de madeira, ponte com tabuleiro a 6,6 m sobre o leito (madeira), `findPath` portão leste → balcão (11 pontos), sacada da torre / topo de ilha / piso da arena caminháveis na altura das âncoras, save/load (descobertas + portões), streaming com teleportes por 5 regiões (pico do pré-render 1,1–7,0 ms), sem erros de console do mundo.
- `checks2.mjs` — **9/9 OK**: grade da arena bloqueia o corredor (39,6 m do centro) e aberta deixa entrar; `surfaceAt` coerente (praça pedra, rua terra, taverna madeira, arena metal, ruínas pedra, lago água, floresta grama, sacada pedra, ilha grama); `indoorId` (cripta, arquivo, térreo da torre, laboratório; praça não); colisores de vegetação: 145 → 536 na floresta → 161 longe, 21/21 troncos bloqueiam; eventos `location:discovered/entered` da vila; 121 colisores escaláveis nas ruínas; barreira segura o jogador em x = 960; caminho praça → arquivo sem tocar colisores.
- `walk.mjs` — **4/4 OK** com entrada simulada real (W/Shift, câmera apontando): trilha → porta da Torre (1,2 m), encosta → Laboratório (1,5 m), campo → altar do Santuário (0,6 m), porta da taverna → balcão (1,4 m). (A versão anterior do teste falhava às vezes no último trecho só por tempo: a 2–3 FPS no SwiftShader o jogo anda ~0,25 s por segundo real; o limite subiu de 20 para 60 s.)
- `arenaescape.mjs` — grade fechada, 629 direções a partir do raio 30 m: **0 fugas**, raio máximo 38,46 m.
- `prof.mjs` (custo de CPU por chamada, médio, com o streaming parado): `terrain.update` 0,008 ms, `grass.update` 0,0003 ms, `scatter.update` 0,002 ms ocioso / 0,14 ms com a câmera trocando de chunk, luzes 0,001 ms, `World.update` 0,005 ms, `surfaceAt` 0,0006 ms, `isIndoors` 0,0006 ms, `findPath` 0,03 ms. Construção de um chunk de vegetação: pico 6,7 ms sob SwiftShader (orçamento de 3 ms/quadro, ≤ 2 chunks).
- `shots.mjs` — 29 vistas de dia (`bench-results/world-*.png`) + 7 à noite (`world-*-noite.png`), conferidas visualmente: vila de cima/rua/praça/forja, interior da taverna, cripta e câmara, floresta (alto e chão), ruínas (alto e perto), arena (alto e dentro), ilhas e topo, pântano (alto e perto), Ferroluz ao longe e portão, acampamento, torre, laboratório, santuário, desfiladeiro, panorama, lago. **Draw calls do quadro: 22–66 (médio), 246–500 mil triângulos.**
