# Status — módulo `player` (protagonista, locomoção, voo e câmera)

Arquivos: `src/player/*` e `src/data/player.ts`, testes em `tests/player.*.test.ts`.
Acréscimos fora da área (permitidos): eventos `player:jump` e `player:lockOn` em `GameEvents` (`src/core/EventBus.ts`).

## O que foi implementado (funcionando e testado)

### Modelo procedural (`PlayerModel.ts`, `meshBuilder.ts`, `rig.ts`, `runeMaterial.ts`, `Cloth.ts`)
- Esqueleto hierárquico de 19 ossos (quadril, coluna, peito, pescoço, cabeça, ombros, braços, antebraços, mãos, coxas, canelas, pés) num `SkinnedMesh` único: o corpo inteiro é **1 chamada de desenho**, com cerca de 7,1 mil vértices e 8,3 mil triângulos.
- Visual: sobretudo longo aberto na frente (saia com pesos entre o quadril e as coxas), capuz com ponta caída, barba branca, olhos com brilho (sprites aditivos), diadema com gema, ombreiras assimétricas, peitoral, braçadeiras, joelheiras e grevas tecnológicas, cinto com fivela-sigilo, bandoleira com frascos e núcleo arcano no peito.
- Shader injetado no `MeshStandardMaterial`, sem texturas:
  - runas, circuitos e sigilos procedurais;
  - brilho que segue `energy.current/max`, pisca com energia baixa e apaga na morte;
  - na Forma Ascendente (`abilities.ascended`), a cor passa de ciano a dourado, o conjunto de glifos muda, o pulso acelera e aparece uma auréola;
  - contorno fresnel, para a silhueta escura se destacar do cenário.
- Capa e tabardo simulados com Verlet em espaço do mundo:
  - passo fixo de 60 Hz, colisão com esferas presas aos ossos e com o chão;
  - reagem ao vento (`GLOBAL_UNIFORMS.uWindDir/uWindStrength`), à inércia e ao voo (tremulação conforme a velocidade);
  - no preset baixo, a capa usa uma grade menor e o tabardo é desligado.
- Cajado ancestral padrão: haste com anéis de circuito, runas, garras de bronze, cristal com brilho e anel orbital girando. `setWeaponModel` troca a arma, e a ponta vem de `userData.tip` ou da caixa envolvente.
- Aura nas mãos ao conjurar (sprites mais centelhas), dirigida pelos clipes.

### Animação (`Animator.ts`, `animClips.ts`)
- Mistura de poses com pesos suavizados por modo: chão, ar, voo, escalada, nado, esquiva e morte.
- Locomoção gerada por funções do ciclo de passada, sincronizada com a distância percorrida:
  - parado (respiração), andar, correr e disparar; no disparo, o cajado vai em empunhadura invertida;
  - passadas laterais e de costas com alvo travado;
  - inclinação nas curvas e na aceleração.
- Ar: pernas recolhidas na subida, abertas na queda.
- Voo:
  - pairar (pernas soltas, braços abertos), cruzeiro (corpo inclinado) e turbo (braço à frente);
  - rolagem nas curvas e postura própria para planar;
  - decolagem e pouso (clipe `takeoff` mais mola de aterrissagem).
- Escalada com alternância de mãos e pés, transposição de borda (`mantle`), nado de peito e boiar parado.
- Esquiva: rolamento completo no chão e giro de barril no voo.
- Morte: clipe que segura a pose final, deitado de costas.
- As 16 `PlayerAnim` têm clipes de poses-chave com máscara (`upper`, `full` ou aditivo), entrada/saída suave e crossfade entre golpes de combo. Também existem `faceAim` (o corpo vira para a mira) e `aura`.
- Ajustes procedurais: a cabeça e o pescoço olham para onde a câmera ou o alvo estão; o tronco acompanha ao mirar; o agachamento de aterrissagem é uma mola amortecida com subpassos, estável mesmo a 10 FPS.

### Locomoção (`Player.ts`, `locomotion.ts`, `probe.ts`)
- Máquina de estados: `ground`, `air`, `flight`, `dodge`, `climb`, `swim`, `stagger` e `dead`.
- Chão:
  - aceleração e desaceleração, com inversão de direção mais rápida;
  - giro suave e limite de inclinação: bloqueia a subida e escorrega em encostas acima de 47°;
  - sobe degraus de até 0,55 m e se apoia em topos caminháveis (pontes, plataformas, ilhas);
  - colisão por subpassos (não atravessa paredes finas em alta velocidade);
  - caminhar dentro da água rasa deixa o movimento mais lento.
- Pulo:
  - coyote time e buffer (`JumpAssist`);
  - controle aéreo que mantém o embalo;
  - bate a cabeça em tetos.
- Aterrissagem: no topo da plataforma, sem ser empurrado para fora. O dano de queda é moderado e nunca letal: até 45% da vida máxima e sempre deixa ao menos 1.
- Esquiva direcional:
  - i-frames em `health.invulnerable`;
  - custo de energia (`DODGE.energyCost × progression.dodgeCost`), cooldown e uma esquiva aérea por salto;
  - no voo vira uma investida lateral.
- Escalada em colisores `climbable`:
  - agarra ao andar ou cair contra a parede e se move nas 4 direções;
  - transpõe a borda no topo;
  - pula de costas (Espaço), solta (C/Q) ou decola (F).
- Natação:
  - nada quando a profundidade passa de 1,25 m (sai abaixo de 1,05 m), é lenta e flutua na superfície;
  - pode saltar para fora;
  - golpes pesados viram versões só de braços; `canCastHeavy()` retorna false.
- Atordoamento: ativa com `health.staggered`, sem controle até passar.
- Morte:
  - animação, evento `player:death` e `ctx.setState('dead')` após 2 s;
  - `respawn()` volta ao checkpoint, restaura vida e energia, dá 2 s de invulnerabilidade e retorna a `'playing'`.
- Knockback do `Combat`, somado em `entity.velocity`, é detectado e aplicado com decaimento.
- `health.moveMultiplier()` é respeitado em todos os modos.
- Eventos: `player:footstep` (superfície via `world.surfaceAt` ou do colisor sob os pés), `player:landed`, `player:dodge`, `player:jump`, `player:flightStart` e `player:flightEnd`.

### Escalada livre e pés no chão (etapa "estilo Zelda", 23–24/10/2026)
- **Escalada livre** em paredes, prédios, rochas e penhascos do próprio relevo:
  - no relevo, o personagem gruda na encosta íngreme achada por bisseção (`snapToTerrainWall`) e sobe até o topo;
  - em colisores, sobe e passa pela borda só se houver onde pisar lá em cima; senão, fica pendurado na borda.
- **Vigor**:
  - escalar gasta energia (`CLIMB.energyPerSecond`); parado na parede não gasta, mas também não recupera;
  - o salto de escalada custa `CLIMB.climbJumpCost`;
  - sem energia, o personagem cai e espera um pouco para agarrar de novo.
- **Chuva**: com a parede molhada, o personagem escorrega de tempos em tempos.
- Arenas de chefe não são escaláveis.
- **Pés no chão** (`footIk.ts`): IK de duas articulações por perna sobre a pose animada. O quadril desce até o
  pé mais baixo, e a outra perna dobra em degraus e rampas. O pé acompanha a inclinação do chão.
- Validado no navegador: penhasco de 44 m com cansaço e queda, parede e telhado de casa, escorregões na chuva.
- `externalLift` (mundo interativo): ar quente do fogo empurra o voo para cima e reduz o gasto de energia.
  `wishDir` (somente leitura): direção pedida pelo jogador.

### Voo (mecânica principal)
- **F** alterna o voo. A decolagem tem impulso, clipe, anel de centelhas e um tremor leve.
- Controles: WASD relativo à câmera, **Espaço** sobe, **C/Ctrl** desce e **Shift** liga o turbo. No turbo, mergulha ou sobe conforme a inclinação da câmera em relação à neutra, com zona morta.
- Inércia: acelera com `accel`/`boostAccel` e freia com `brake`. Curvas inclinam o corpo (até 38°) e o tronco inclina conforme o avanço e a subida.
- Pouso automático perto do chão ao descer (C, sem energia ou caindo parado). **F** perto do chão pousa; no alto, desliga o voo e o mago cai.
- Partículas próprias (`PlayerFx`, 1 chamada de desenho, pool sem alocação, tamanho pelo preset): centelhas dos pés e da capa, rastros de vento estacionários no mundo, anéis de decolagem e pouso, aura e Forma Ascendente.
- O FOV aumenta até 11° no turbo e o tremor de câmera aparece em impactos.
- Energia:
  - consumo por segundo: pairar 0,8, cruzeiro 1,4, turbo 4,5 e +1,5 subindo, multiplicado por `progression.flightCost`;
  - a velocidade é multiplicada por `progression.flightSpeed`;
  - sem energia, plana descendo a cerca de 3,2 m/s e pode cair na água e nadar.
- Colisões no voo:
  - terreno: desliza ao longo das encostas;
  - colisores laterais: remove a componente da velocidade que entra na parede;
  - ilhas e tetos acima: para na base, sem ser empurrado para a borda;
  - água: rasante acima da superfície.
- Limites: teto `MAX_FLIGHT_ALTITUDE` com desaceleração e aviso; aviso perto do limite do mundo.

### Câmera (`CameraRig.ts`)
- Órbita por mouse (pointer lock, sensibilidade e inversão das configurações), zoom pela roda e ombro deslocado.
- Seguimento suavizado, com limite de atraso de 3 m em alta velocidade, e `snap()` em teleportes, carregamentos e renascimentos.
- Colisão por sphere cast sem alocação contra terreno e colisores: aproxima na hora e afasta suavemente. Fica sempre acima do terreno e da água.
- Em interiores (teto até 7 m acima), a distância cai para 3,2 m. O modelo se esconde se a câmera entrar no personagem.
- Modos `explore`, `combat`, `flight`, `dialogue`, `boss` e `cinematic`:
  - o modo é automático (estado do jogador, trava de alvo, `ai.activeBoss?.()`);
  - `setMode` força `dialogue`, `cinematic` ou `boss`;
  - no modo `boss`, a câmera se afasta (8,8 m) e, sem trava, puxa o ponto olhado em direção ao chefe quando ele está à frente;
  - `setCinematicShot(pos, look)` define um plano fixo;
  - `setDialogueFocus` enquadra o rosto do NPC por cima do ombro do jogador.
- Trava de alvo (ação `lockOn`):
  - pega o inimigo hostil (`combat.isHostile`) mais centralizado e próximo num cone de 70°, até 30 m, com linha de visão;
  - a câmera gira e enquadra jogador e alvo;
  - um movimento brusco do mouse troca de alvo;
  - solta quando o alvo morre (passa ao próximo), passa de 38 m, fica 2 s sem linha de visão ou quando o jogador morre;
  - emite `player:lockOn`.
- `shake(intensidade, duração)` usa trauma e respeita `settings.data.cameraShake`.
- Mira: `getAimTarget()` é o ponto sob o centro da tela (terreno, colisores ou inimigo próximo do raio, com leve assistência). `Player.getAimRay` mira do peito até esse ponto, ou até o centro do alvo travado.

### Progressão e salvamento
- `refreshStats()`:
  - lê `maxHealth`, `maxEnergy`, `energyRegen`, `healthRegen`, `moveSpeed`, `flightSpeed`, `flightCost` e `dodgeCost`;
  - subir o máximo cura a diferença;
  - também roda nos eventos `level:up`, `talent:unlocked`, `equip:changed` e a cada 2 s.
- `Saveable`:
  - salva posição, yaw, vida, energia, checkpoint e estado de voo;
  - o carregamento valida os dados e lança erro se a posição for inválida;
  - vida e energia salvas são reaplicadas depois de `refreshStats`, sem a cura indevida de subir o máximo.
- A regeneração de energia começa 0,7 s depois do último gasto e não acontece durante o voo.

## API pública acrescentada (outros módulos podem usar)
`Player`:
- `canCastHeavy()`, `isSwimming()`, `isClimbing()`, `isBlocking()`
- `startFlight(fromGround?)`, `endFlight(soft?)`
- `setCheckpoint(x, z, yaw?)`, `setModelVisible(v)`, `debugInfo()`
- `speed`, `horizontalSpeed`, `grounded`, `boosting`, `gliding`, `heightAboveGround`, `waterDepth`, `stats`, `stateTime`
- `model` (`PlayerModel`), `animator`, `fx`

`PlayerEntity`: `onDeathHook` e `onDamagedHook`.

`CameraRig`:
- `snap()`, `findLockTarget()`, `setLockTarget(e|null)`, `cycleLockTarget(±1)`
- `setCinematicShot(pos, look)`, `getRight()`, `getAimTarget(maxDist, out)`, `currentFov`

Eventos: `player:jump` e `player:lockOn { target }`.

## Validação realizada
Última rodada completa: 15/10/2026, após a revisão desta sessão (câmera de chefe, sphere cast sem closure, piso de água da câmera).

- `npx tsc --noEmit`: **0 erros** no projeto inteiro (inclui todos os arquivos do módulo).
- `npx vitest run tests/player`: **27 testes passando**. Cobrem:
  - lógica: aceleração, coyote/buffer, dano de queda, custo do voo, inclinação, trava de alvo, consultas de colisão sem alocação e sphere cast (inclusive com a superfície da água como chão);
  - animação: clipes completos, mola estável a 10 FPS, rolamento sem "desgirar", passos por distância, pose da morte, pitch/bank do voo;
  - capa Verlet;
  - construção do modelo, posição das mãos e troca de arma (qualidade média e baixa).
- Playwright próprio (`/tmp/claude-0/player-checks/`, esperas em **tempo de simulação**, build em `.smoke/player`):
  - `moves.mjs`: **21/21 OK**, sem erros de console.

    | Teste | Resultado |
    |---|---|
    | Andar | 2,3 m/s |
    | Correr | 5,4 m/s |
    | Disparar | 8,6 m/s |
    | Passos | 25 eventos, superfície `stone` |
    | Pulo | 1,02 m |
    | Esquiva | custo 12, i-frames 0,22 s restantes na checagem |
    | Decolagem | +2,17 m |
    | Subir (Espaço) | +12,7 m |
    | Cruzeiro | 18 m/s |
    | Turbo | 36 m/s, FOV +10,9°, inclinação −0,41 rad, 53 partículas |
    | Energia no voo | 92,9 → 73,2 |
    | Pouso | `flightStart`/`flightEnd`/`landed` corretos |
    | Escalada e borda | subiu 2,6 m; transpôs no topo exato (23,61) |
    | Queda de 40 m | 100 → 55 de vida (impacto 42 m/s) |
    | Nado | 2,6 m/s em 2,9 m de profundidade |
    | Trava de alvo | modo `combat`, mira exata (dot 1,0), solta ao matar |
    | Mira no centro da tela | ponto mirado sobre o raio central (dot 1,0) |
    | Animações de ação | durações certas, `speed` 2 → metade |
    | Save/load e validação | ok, dados inválidos lançam erro |
    | Morte e renascimento | 1 `player:death`, 1 `player:respawn`, estados corretos |

  - `collide.mjs`: **7/7 OK**.

    | Teste | Resultado |
    |---|---|
    | Pousar em plataforma | topo exato |
    | Cair da borda | ok |
    | Subir degrau | ok |
    | Turbo contra parede | não atravessa (para 0,9 m antes) |
    | Subir sob ilha | cabeça para na base |
    | Teto de voo | ok |
    | Planar sem energia | desce 3,25 m/s |

  - `boss.mjs` (novo, chefe simulado com `ai.activeBoss`): **5/5 OK**.
    - Modo `boss` ativa; distância 5,2 → 8,8 m.
    - O chefe fica mais centralizado: dot da direção da câmera 0,928 → 0,976.
    - Travar o chefe: modo `combat` com dot 0,997. Ao derrotá-lo, volta a `explore`.
  - `scenes.mjs`: tudo ok.
    - Escalada e transposição de parede visível: topo exato.
    - Câmera com parede atrás: 1,43 m.
    - Interior: distância de 3,28 m.
    - Diálogo: modo `dialogue`, que volta a `explore`.
- Capturas avaliadas (`bench-results/player-*.png`): frente, costas, perfil, retratos, correr, disparar, decolagem, pairar, cruzeiro (lado e costas), turbo, curva, esquiva, escalada, borda, nado, conjurar, Forma Ascendente, diálogo, câmera com parede e câmera de chefe.
- Custo de CPU a 60 Hz (`bench.mjs`, chamando `update` direto, com o mundo carregado, qualidade média):

  | Situação | Jogador | Câmera | Capa + tabardo |
  |---|---|---|---|
  | Parado | 0,18 ms/frame | 0,011 ms | 0,14 ms |
  | Correndo | 0,22 ms/frame | 0,011 ms | 0,23 ms |
  | Turbo | 0,17 ms/frame | 0,005 ms | 0,21 ms |

  A animação custa de 0,001 a 0,009 ms.

  No loop real headless (1–5 FPS, com dt preso em 0,1), o perf monitor mostra o jogador em 0,66–1,07 ms, porque a capa roda até 4 subpassos por frame. A câmera aparece em 0,06–0,07 ms depois de alguns segundos. Nos primeiros segundos, a média móvel do monitor ainda carrega a compilação do JIT, e a câmera aparece em 0,3–0,65 ms.
- Renderização do personagem: cerca de 9,7 mil triângulos e 8 chamadas de desenho (corpo, cajado, anel, capa, tabardo, 2 olhos e cristal), mais 1 para as partículas quando ativas.
- `scripts/smoke.mjs --port=4192 --out=.smoke/player`: build ok, jogo em `playing`, **0 erros e 0 avisos de console**, nas qualidades padrão e `low`.

## Pendente / limitações conhecidas
- **Rosto estilizado e simples** (esfera, cones e caixas): lê bem dentro do capuz com os olhos brilhando, mas não tem detalhe facial.
- **A saia do sobretudo é rígida**: segue o quadril e as coxas. No voo inclinado ela forma "tubos", o que diminuímos aproximando as pernas. Só a capa e o tabardo são tecido simulado.
- **Escalada**: só funciona em colisores marcados `climbable`. Paredes de terreno muito íngremes não são escaláveis. Não há custo de vigor (`CLIMB.energyPerSecond = 0`, ajustável).
- **Golpes e conjurações** são clipes de poses-chave. O módulo de combate decide o quadro de impacto usando a duração retornada por `playAnimation`.
- **Rastros de vento**: são riscos estacionários sem colisão; a quantidade é limitada pelo pool.
- **Câmera de chefe**: só aparece se `ai.activeBoss?.()` existir (hoje o stub da IA retorna `null`) ou se `setMode('boss')` for chamado. Sem alvo travado, ela se afasta e puxa o enquadramento em direção ao chefe quando ele está à frente da câmera, mas não gira a câmera sozinha; para girar e enquadrar os dois, é preciso travar o alvo (Tab).
- **Colisão da câmera só vê colisores**: peças visuais sem colisor podem ser atravessadas pela câmera. Exemplo: o entablamento e o frontão do pórtico da cripta, perto do início do jogo, quando a câmera recua 8,8 m ou mais. Árvores são ignoradas de propósito, para a copa não empurrar a câmera.
- **Mira sem retículo**: `getAimPoint` devolve exatamente o ponto sob o centro da tela, mas a UI (stub) ainda não desenha um retículo. Na inclinação padrão da câmera, o centro da tela toca o chão cerca de 6–7 m à frente; para alvos distantes, o jogador ergue a câmera ou trava o alvo.
- **Diálogo**: `setDialogueFocus` recebe uma posição. Se ela estiver perto do chão, é tratada como os pés do NPC e sobe para a altura do rosto (+1,6 m).
- **FPS absoluto não medido** neste ambiente (renderização por software). As métricas válidas são o tempo de CPU por sistema acima.

## Pedidos para outros módulos
- **combat**:
  - usar `player.playAnimation(anim, {speed})` e a duração retornada para o quadro de impacto;
  - usar `player.lockMovement` em golpes pesados, `player.setBlocking`, `player.isBusy()` antes de iniciar ações, `player.canCastHeavy()` antes de magias pesadas;
  - usar `player.getWeaponTipWorldPosition()` e `player.getHandWorldPosition('left')` como origem de projéteis e `player.getAimRay()` para a direção;
  - o jogador já aplica `health.blocking` em `setBlocking`; a janela de parry continua com o combate.
- **ui**:
  - desenhar um retículo fixo no centro da tela (é para lá que `getAimRay`/`getAimPoint` miram);
  - ouvir `player:lockOn` para o retículo do alvo;
  - chamar `player.respawn()` na tela de derrota (ele mesmo volta o estado para `'playing'`).
- **audio**:
  - ouvir `player:jump` (o jogador também toca `'jump'` direto, então ouvir os dois duplicaria o som);
  - `player:footstep` traz `surface`; `player:flightStart` e `player:flightEnd` marcam o loop de voo.
- **ai**: fazer `activeBoss()` retornar o chefe em combate; a câmera entra sozinha no modo `boss` quando ele está a menos de 90 m.
- **story/npc**: usar `camera.setDialogueFocus(posNPC)` / `setDialogueFocus(null)` e `camera.setCinematicShot(...)` com `setMode('explore')` para devolver a câmera.
- **world**:
  - pôr colisor no entablamento e no frontão do pórtico da cripta (`structures/crypt.ts`, `b.box(0, dh + 0.75, t.z0 - 0.45, ...)` e o `b.tri` do frontão); hoje só as colunas têm colisor e a câmera afastada entra na pedra;
  - marcar como `climbable` as paredes que devem ser escaláveis (torres em ruínas, penhascos construídos);
  - preencher `surface` nos colisores (madeira em pontes etc.) para os passos.
