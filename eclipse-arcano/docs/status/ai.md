# Status — módulo `ai` (inimigos, chefe, criaturas e população)

Arquivos: `src/ai/**`, `src/data/enemies.ts`, `src/data/bosses.ts`, `src/data/creatures.ts`, `src/data/spawns.ts`, testes em `tests/ai.*.test.ts`.
Nada foi acrescentado fora da área: os eventos (`boss:*`, `enemy:killed`, `npc:alarm`, `music:intensity`), os `SfxId` e os `VfxKind` usados já existiam.

A classe `AI` (`ctx.sys.ai`) manteve todos os membros públicos do stub com as mesmas assinaturas; só houve acréscimos.

## O que foi implementado (funcionando e testado)

### Base de inimigo (`Enemy.ts`, `EnemyHealth.ts`, `rigs/*`)
- Entidade guiada por dados (`src/data/enemies.ts`), com modelo procedural hierárquico: **humanoide** (saqueador, arqueira, caçador, mago, cavaleiro, espreitador, Ravena), **constructo** (sentinela, errante), **golem**, **colosso** (Guardião), **quadrúpede** (lobo, alfa e animais), **voador** (corvo de cristal, fênix, dragão, galinha), **serpente**, **pilar** e **espírito**. Cada osso é uma malha de primitivas fundidas, com geometria em cache por variante e o mesmo programa de shader para todos (`customProgramCacheKey`). Há variações de cor e de equipamento (espada e escudo, arco e aljava, cajado, montante, duas lâminas, martelo e canhão, punhos).
- Material com cor e brilho por vértice e uniforms por instância: clarão de dano, brilho de antecipação (laranja = bloqueável, vermelho = imbloqueável), pulso do núcleo e tinta de superaquecimento ou fortalecimento.
- Animações procedurais por mistura de poses: ocioso, andar, correr, strafe, ataques com antecipação, impacto e recuperação (corte, estocada, golpe por cima, pancada de escudo, giro, arco, conjuração, mordida, bote, uivo, pancada no chão, mergulho, rajada, lâminas duplas, fumaça, teleporte), esquiva direcional, bloqueio, reação a dano, cambaleio, ajoelhar (rendição), superaquecer e morte, que termina com dissolução (`vfx.dissolve`).
- Barra de vida para a UI: `health`, `name`, `elite`, `level`, `barVisible` e `barHeight` em cada inimigo e criatura, e `ai.visibleBars(out)` lista quem tem a barra visível neste quadro.
- `EnemyHealth` (estende `Health`): ponto fraco por lado (núcleo nas costas dos autômatos, ×1,5, marca `DamageInfo.weakPoint`), núcleo exposto (todo golpe vale como ponto fraco), multiplicador extra (escudo de −90% dos pilares), piso de vida (fases do chefe; Ravena não morre antes de se render) e resistência a lentidão.

### IA de combate (`Enemy.ts`, `logic.ts`, `tactics.ts`, `enemyAttacks.ts`, `enemySpecials.ts`)
- Máquina de estados: `idle`, `patrol` (rotas de `PATROL_ROUTES`), `investigate`, `alert`, `combat`, `search`, `return` (volta regenerando), `flee`, `surrender` e `dead`.
- Percepção:
  - visão: cone, distância e `physics.lineOfSight`, com detecção gradual (mais rápida de perto), visão menor à noite e com névoa (`env.visibility` opcional);
  - "sentir" o jogador a curta distância;
  - audição pelos eventos `ability:cast`, `damage`, `player:attack` e `npc:alarm`;
  - memória da última posição, busca e desistência por tempo ou pela trela (distância da origem).
- Cooperação:
  - ao entrar em alerta, chama aliados próximos da mesma facção e emite `npc:alarm` (`monster`);
  - os lobos ocupam posições de flanco em volta do alvo;
  - **tokens de ataque**: no máximo 2 atacantes corpo a corpo e 3 atiradores por alvo; os demais circulam (strafe) na distância preferida.
- Escolha de ataque ponderada, com alcance, recargas por ataque, linha de visão, altura do alvo e anti-repetição. Há **combos** (`next`/`comboChance`), golpes rápidos e lentos, corpo a corpo, à distância (com mira balística e antecipação do movimento do alvo), área, salto, investida e mergulho.
- Ataques com tempos reais de antecipação, impacto e recuperação. Os fortes têm telegraph no chão (`vfx.telegraph`: cone, círculo, linha, anel) e brilho; o alcance é real (`combat.meleeSweep`, `spawnProjectile`, `explode`). A recuperação é a **janela de abertura**: nela o inimigo não esquiva nem bloqueia.
- Defesa:
  - **esquiva direcional** contra golpes anunciados e contra projéteis que vão acertar (aproximação mais próxima), com chance por tipo e atraso de reação humano;
  - **bloqueio** com escudo ou guarda (`Health.blocking`) e **aparo** (cavaleiro, Ravena);
  - **contra-ataque** depois de bloquear, aparar ou esquivar.
- Posicionamento por arquétipo:
  - duelista e cavaleiro avançam com token e levantam a guarda entre golpes;
  - a matilha flanqueia;
  - arqueiros e magos mantêm distância, **buscam cobertura** atrás de colisores (rochas, muros, barracas) e recuam quando o jogador avança (abortam o disparo e saltam para trás quando pressionados);
  - o espreitador se aproxima furtivo pelas costas;
  - o voador circula e acompanha a altitude de quem voa.
- Recuo com vida baixa (`retreatBelow`).
- Reações aos estados de `Health`: atordoar e cambalear cancelam a ação; enraizado não se desloca; `slow` e `timeSlow` alongam o movimento e as animações; o cambaleio vem da postura (`poise`).
- **Adaptação** (`PlayerStyle`), sem onisciência:
  - se o jogador bloqueia muito, aumenta o peso dos golpes imbloqueáveis e quebra-guarda;
  - se conjura de longe, aumenta o peso dos ataques que fecham distância e a chance de esquiva;
  - se repete a mesma habilidade, aumenta a esquiva contra ela;
  - tudo decai com o tempo.
- Desempenho: a IA completa roda no tier 0. No tier 1 a percepção fica mais espaçada e a linha de visão só é testada a menos de 25 m. No tier 2, `farUpdate` faz a patrulha mínima e desiste do combate. Não há alocação nos caminhos por quadro: vetores são reutilizados e as consultas espaciais e os pesos do chefe usam arrays fixos.

### Tipos (`src/data/enemies.ts`, todos os typeIds de C2)
Cada tipo define vida, armadura, resistências e fraquezas, postura, velocidades, percepção, ataques (dano, alcance, arco, tempos, tipo, telegraph, combos), defesa, comportamento, `xp`, `gold` e `drops` (contrato C1).

| Tipo | Comportamento |
| --- | --- |
| `corvo_saqueador` | Espada e escudo; bloqueia e devolve com riposta. |
| `corva_arqueira` | Mantém distância, usa cobertura, atira flechas com gravidade e saraivada. Pode ficar postada na torre de vigia. |
| `lobo_sombrio` | Matilha que flanqueia; investida e mordida; recua com vida baixa. |
| `alfa_lobo` | Subchefe. O uivo fortalece a matilha (`empowered`), chama os lobos e invoca reforços. |
| `automato_sentinela` | Lento, golpes pesados anunciados. A armadura resiste a físico e é fraca a raio. Núcleo nas costas. Superaquece depois de golpes pesados, abrindo uma janela vulnerável. |
| `automato_errante` | Elite de contrato; versão mais forte, com martelo e canhão. |
| `mago_corrompido` | Orbes; teleporta quando é cercado; põe escudo em aliados feridos. |
| `cavaleiro_encantado` | Elite. Apara, faz combo de 3 golpes e mantém a guarda alta. |
| `espreitador` | Translúcido e sem barra de vida enquanto se aproxima. Ataca pelas costas, recua e volta a se esconder. |
| `corvo_cristal` | Voador: mergulha e atira estilhaços; é uma ameaça para o jogador em voo. |
| `golem_ruinas` | Lento; soco em cone, terremoto em área e pedregulho. |
| `cacador_furtivo` | Arqueiro humano. |
| `ravena` | Duas lâminas, esquivas, contra-ataques, estocada imbloqueável e bomba de fumaça (some e reaparece pelas costas). Chama reforços a 50%. Rendição a 15% (contrato C3). |

- **Rendição da Ravena (C3):** para de lutar, ajoelha, vira facção `neutral`, `health.immortal = true` e chama `ctx.sys.story.set('ravena_rendida', true)`. Os Corvos próximos debandam. Se a narrativa a remove (poupar), ela também entra em `defeatedUniques`. Executar com `combat.kill` emite `enemy:killed`. O uniqueId nunca é recriado.
- `pilar_cristal` é um tipo interno do chefe (estático, fraco a raio).

### Chefe — Guardião Mecânico das Ruínas (`bosses/Guardian.ts`, `src/data/bosses.ts`)
- Constructo rúnico colossal (6,2 m) com núcleo luminoso, título e história nos dados.
- **Gatilho:** o jogador entra no raio da arena (`BOSS_ARENAS`) e o chefe ainda não foi derrotado. A IA cria o chefe, fecha o portão `arena_guardiao`, chama `ui.showBossBar(título, chefe)` e emite `boss:start`; a música passa a `boss`.
- **Fase 1** (100–66%): varrida de braço em cone anunciado; pisão com onda de choque em anel que se expande (dá para pular ou esquivar através dela); investida em linha (atordoa o chefe se ele bater na parede ou num pilar).
- **Fase 2** (66–33%):
  - 4 pilares de cristal sobem nos soquetes e ligam-se ao núcleo, dando escudo de −90% até serem destruídos (são entidades com vida, fracas a raio);
  - laser giratório (`combat.beamAttack` por tique e telegraph de linha);
  - invoca 2 sentinelas.
- **Fase 3** (33–0%):
  - respiradouros explodem numa sequência fixa de padrões anunciados (aprendível);
  - combos mais rápidos;
  - depois de cada combo o chefe **superaquece**: núcleo exposto ×2 e postura reduzida, o que abre a janela de stagger.
- **Transições:** rugido, `camera.shake`, `env.lightningFlash`, `boss:phase`, onda de choque, luz da arena muda de cor, aviso na UI. A vida trava no limiar da fase, então um golpe enorme não pula fases.
- Imune a stun, root e bleed; lentidão reduzida (50%).
- **Derrota:** animação de colapso, `boss:defeated` e `enemy:killed` (o rpg dá a recompensa; drop garantido `espada_cyber_runica`), portão reaberto, barra escondida, `ai.defeatedBosses` (salvo) e o chefe não renasce. O corpo fica no lugar (até 180 s, ou até o jogador se afastar 140 m) para a escolha narrativa.
- **Reset:** se o jogador morre (ou fica 5 s fora da arena), a luta reseta: chefe, pilares e invocações são removidos, o portão reabre, a barra some e o chefe volta com vida cheia na próxima entrada.

### Criaturas (`creatures/Creature.ts`, `creatures/BirdFlocks.ts`, `src/data/creatures.ts`)
- Temperamentos:
  - arisco: foge da ameaça e de sons altos;
  - neutro: afasta-se com calma e foge se atacado;
  - territorial: o grifo circula o ninho e mergulha sobre quem invade;
  - hostil: a serpente do lago emerge da água e morde;
  - ambiente: dragão.
- Comportamentos: vagar, pastar e descansar, alerta, fuga, reação a sons, seguir à distância (espíritos), pousar e partir (fênix), atravessar o céu (dragão).
- Condições:
  - cervo luminoso só à noite, na clareira (desvanece de manhã);
  - fênix rara (40%) ao amanhecer no Santuário de Cristal;
  - grifo no ninho das montanhas;
  - dragão distante como evento ambiente raro (8% por hora de jogo; `ai.summonDragon()` força o evento);
  - serpente rara (30%) no Lago Espelhado;
  - espíritos à noite na floresta;
  - ovelhas, galinhas e cavalos confinados nos cercados.
- Pássaros: **uma única `InstancedMesh`** para todos os bandos, com boids baratos (coesão, alinhamento e separação). O bando levanta voo quando o jogador chega perto ou quando há magia, e pousa em outro lugar.

### População (`Spawner.ts`, `src/data/spawns.ts`)
- Zonas de inimigos:
  - acampamento dos Corvos (saqueadores e arqueira na torre de vigia);
  - estrada (patrulhas ocasionais);
  - desfiladeiro (emboscada);
  - toca dos lobos (alfa único `alfa_lobos_toca`);
  - matilha noturna na floresta;
  - caçadores furtivos na floresta;
  - ruínas (sentinelas, golem, corvos de cristal);
  - laboratório (`automato_errante_lab`);
  - torre do Observador (`cavaleiro_torre`);
  - borda e coração do pântano (magos e espreitadores).
- Densidade moderada: no máximo 7 inimigos por zona (ruínas; as demais têm de 1 a 6).
- Zonas de criaturas: 11 (campina, clareira, floresta, plantações, cercados, pasto, ninho, poleiro, lago).
- Regras: ativação por distância; desativação com remoção de quem não está em combate; postos com respawn em horas de jogo (salvo); horários (dia, noite, amanhecer) e chance por ativação; limite `q.maxActiveEnemies`; **nada nasce à vista do jogador** (fora do frustum ou sem linha de visão, ou a mais de 95 m); uniqueIds derrotados nunca voltam. Inimigos não únicos que ficam longe são removidos (260 m).

### Sistema `AI` (`AI.ts`) — API
- Do contrato: `spawnEnemy(typeId, pos, { uniqueId, aggro, patrol, zoneId, level })`, `spawnBoss(id)`, `getNpc(id)` (delega a `ctx.sys.npcs.get`), `alarm(pos, raio, motivo)` (emite `npc:alarm`), `requestAttackToken`/`releaseAttackToken`, `inCombat()`, `activeBoss()`, `defeatedUniques`/`defeatedBosses` (Saveable `ai`, com validação; o respawn pendente também é salvo).
- Acréscimos: `requestRangedToken`, `spawnCreature`, `enemiesNear`, `visibleBars`, `findUnique`, `activeEnemyCount`, `summonDragon`, `resetBossFight`, `debugInfo`, `ambient` (liga e desliga a população ambiente), `stats`.
- Música: emite `music:intensity` `combat`, `boss`, `victory` e `explore`, com 3 s de folga depois do combate.

## Testes e validação (números desta execução)
- `npx tsc --noEmit`: **0 erros** nos arquivos do módulo. Havia erros transitórios em `src/rpg/loot/*`, do agente de rpg.
- `npx vitest run tests/ai`: **32/32**.
  - `ai.logic`: escolha ponderada, anti-repetição, adaptação, tokens, estilo do jogador, mira balística, cone, aproximação de projétil, horários e `EnemyHealth`.
  - `ai.data`: contratos C1, C2 e C6, consistência de ataques e combos, chefe, criaturas, zonas, âncoras e rotas.
- `node scripts/smoke.mjs --quality=low --port=4195 --out=.smoke/ai`: **0 erros e 0 avisos** de console.
- Playwright (`/tmp/claude-0/ai-checks/`, Chromium com SwiftShader, 800×450, fora do repositório):

| Suíte | Resultado | O que cobre |
| --- | --- | --- |
| `behavior.mjs` | **24/24** (3 execuções seguidas) | Tokens (máx. 2 atacando, os outros circulam), esquiva do espreitador (3–9 de 16), esquiva de projéteis da arqueira (3–7 de 14), bloqueio do escudo (≥ 4 de 24) e riposta, combo de 3 do cavaleiro, arqueira recuando e fugindo (média ≥ 5 m com o jogador a 4 m/s), ponto fraco ×1,5, fraquezas, superaquecimento, stagger, uivo do alfa, teleporte e escudo do mago, reforços e rendição da Ravena (C3), percepção (cone e audição) e desistência. |
| `boss.mjs` | **22/22** | Gatilho, portão, barra, `boss:start` e `boss:phase` 2 e 3, as 3 fases (4 pilares e 2 sentinelas, escudo −90%, laser, pilares fracos a raio, respiradouros, superaquecimento ×2 com stagger), imunidades, reset na morte, derrota com eventos, save e não renascer. |
| `world.mjs` | **15/15** | População do acampamento (arqueira na torre), nada nasce no frustum, limite de ativos, despawn, único derrotado não volta, fuga dos cervos, bando levanta voo, ovelhas no cercado, cervo luminoso só à noite, fênix ao amanhecer, dragão, grifo. |
| `extras.mjs` | **11/11** | Corvo de cristal contra jogador voando (3 mergulhos, 4 acertos a 41 m), espreitador pelas costas e recuando, fumaça da Ravena, golem em área com telegraphs, cobertura da arqueira (3 de 3 no acampamento), root, stun e timeSlow (antecipação 0,42 → 0,83 s), `npc:alarm`, `getNpc` e música. |
| `fight.mjs` | **4/4** | Luta com entrada real (Mouse0): lobo, saqueador e sentinela tomam dano e morrem; `enemy:killed` é emitido. |

- **Custo de CPU com 15 inimigos em combate** (tipos variados, todos no tier 0, renderização ligada):
  - atualização dos inimigos: **0,57 ms/quadro**;
  - sistema `ai`: **0,013 ms**;
  - `entities.update` (inclui as criaturas e o jogador): 0,60 ms.

  Medido no SwiftShader (CPU lenta e sem GPU). O FPS absoluto não é representativo.
- Capturas em `bench-results/`: `ai-lineup.png`, `ai-closeup.png`, `ai-closeup2.png`, `ai-combat.png`, `ai-15-inimigos.png`, `ai-criaturas.png`, `ai-cervo-luminoso.png`, `ai-boss-f1.png`, `ai-boss-f1-ataque.png`, `ai-boss-f2.png`, `ai-boss-laser.png`, `ai-boss-f3.png`, `ai-boss-colapso.png` e `ai-smoke.png`.

## Correções desta rodada
- Fechada a rendição: o estado `surrender` estava inacabado e dava erro de tipo.
- Projéteis do pool reutilizam o id. A IA ignorava disparos novos com id já visto, então quase não esquivava de projéteis. A chave agora é (id, instante do disparo).
- Inimigos recuando (`flee`) continuam esquivando e contam como engajados (música e despawn).
- A arqueira não para mais para atirar enquanto o jogador avança. Pressionada, aborta o disparo e salta para trás.
- O gatilho do chefe usa o raio de `BOSS_ARENAS`.
- O chefe não aloca mais nada por quadro na escolha de ataque.
- Corrigida a animação do corpo do chefe durante a dissolução final.
- Ajustes de dados: antecipação do giro final da Ravena 0,4 → 0,5 s (golpe forte legível); bloqueio do saqueador 0,45 → 0,5.

## Pendente / limitações (honestidade)
- **Montaria e domar criaturas: não implementado.** Cavalos e grifo existem só como fauna.
- Sem pathfinding de verdade para inimigos. Eles usam direção direta, separação, desvio lateral quando travados, trela e retorno. Em geometria complexa (vila, interiores, cripta) um inimigo pode travar e desistir. `world.findPath` existe, mas não foi integrado à IA.
- "Procurar comida" é simplificado: os animais vagam até um ponto e pastam. Não há fontes de comida no mundo.
- Os modelos são low-poly de primitivas. Inimigos humanoides usam ~11 chamadas de desenho cada (uma por osso, mais as de sombra) e não há LOD de malha por distância; com 15 humanoides na tela isso dá ~165 chamadas a mais. A densidade moderada das zonas e o limite `q.maxActiveEnemies` seguram isso.
- O FPS real em GPU de PC comum não foi medido aqui (só SwiftShader). O custo de CPU da IA está bem abaixo de 1 ms.
- A barra de vida dos inimigos depende da UI. A IA só expõe os dados (`barVisible`, `ai.visibleBars()`). Hoje `ui.showBossBar` é stub.
- O balanceamento (tempo para matar) foi pouco ajustado. Com a arma inicial, um saqueador cai em ~2,4 s de ataques contínuos e uma sentinela em ~10 s.
- O comportamento é probabilístico (esquiva, bloqueio, escolha de ataque), então os números das suítes variam de uma execução para outra. Os limites dos testes foram escolhidos com folga.

## Pedidos a outros módulos
- **ui**: desenhar `ui.showBossBar(nome, entidade)` (vida em `entidade.health`, fase em `entidade.phase`) e as barras de inimigos e criaturas com `ctx.sys.ai.visibleBars(out)`, posicionadas em `position.y + barHeight`, mostrando `name`, `elite` e `level`. Para não alocar, a UI deve reutilizar o array `out`.
- **rpg**: recompensas por `enemy:killed` (`typeId` em `ENEMIES` ou `BOSSES`). O `pilar_cristal` tem `xp` 10 e não tem drops. `creature:killed` pode ler `CREATURES[typeId]`.
- **narrativa**: Ravena e chefe conforme C3 e C4. Os únicos ambientes `alfa_lobos_toca`, `automato_errante_lab` e `cavaleiro_torre` já são criados pelo spawner e podem ser checados em `ai.defeatedUniques`.
