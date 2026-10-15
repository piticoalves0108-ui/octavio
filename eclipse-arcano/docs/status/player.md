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
- `npx tsc --noEmit`: 0 erros no projeto inteiro na última checagem (incluindo os arquivos do módulo).
- `npx vitest run tests/player`: **26 testes passando**. Cobrem:
  - lógica: aceleração, coyote/buffer, dano de queda, custo do voo, inclinação, trava de alvo, consultas de colisão sem alocação e sphere cast;
  - animação: clipes completos, mola estável a 10 FPS, rolamento sem "desgirar", passos por distância, pose da morte, pitch/bank do voo;
  - capa Verlet;
  - construção do modelo, posição das mãos e troca de arma.
- Playwright próprio (`/tmp/claude-0/player-checks/`, esperas em **tempo de simulação**):
  - `moves.mjs`: **21/21 OK**.

    | Teste | Resultado |
    |---|---|
    | Andar | 2,3 m/s |
    | Correr | 5,4 m/s |
    | Disparar | 8,6 m/s |
    | Passos | com superfície |
    | Pulo | 1,03 m |
    | Esquiva | custo 12, i-frames |
    | Decolagem | +2,1 m |
    | Subir | +12,6 m |
    | Cruzeiro | 18 m/s |
    | Turbo | 36 m/s, FOV +10,9° |
    | Energia no voo | 92,7 → 73,1 |
    | Pouso | eventos corretos |
    | Escalada e borda | topo exato |
    | Queda de 40 m | 100 → 55 de vida |
    | Nado | 2,6 m/s |
    | Trava de alvo | modo combat, mira exata, solta ao matar |
    | Mira no centro da tela | ok |
    | Animações de ação | ok |
    | Save/load e validação | ok |
    | Morte e renascimento | eventos e estados corretos |

  - `collide.mjs`: **7/7 OK**.

    | Teste | Resultado |
    |---|---|
    | Pousar em plataforma | ok |
    | Cair da borda | ok |
    | Subir degrau de 0,4 m | ok |
    | Turbo contra parede | não atravessa |
    | Subir sob ilha | para na base |
    | Teto de voo | ok |
    | Planar sem energia | cerca de 3,25 m/s |

  - `scenes.mjs`: tudo ok.
    - Escalada e transposição de parede visível: ok.
    - Câmera com parede atrás: 1,4 m.
    - Interior: distância de 3,3 m.
    - Diálogo: modo `dialogue`, que volta a `explore`.
- Capturas avaliadas (`bench-results/player-*.png`): frente, costas, perfil, retratos, correr, disparar, decolagem, pairar, cruzeiro, turbo, curva, esquiva, escalada, borda, nado, conjurar, Forma Ascendente, diálogo e câmera com parede.
- Custo de CPU a 60 Hz (chamando `update` direto, com o mundo carregado):

  | Situação | Jogador | Câmera |
  |---|---|---|
  | Parado | 0,15–0,22 ms/frame | 0,005–0,015 ms |
  | Correndo | 0,15 ms/frame | 0,005–0,015 ms |
  | Turbo | 0,18–0,21 ms/frame | 0,005–0,015 ms |

  A capa e o tabardo custam cerca de 0,12 ms e a animação cerca de 0,002 ms.

  No loop real headless (0,6–5 FPS, com dt preso em 0,1), o perf monitor mostra o jogador em 0,63–0,88 ms. A capa roda até 4 subpassos por frame quando o FPS é baixo.
- Renderização do personagem: cerca de 9,7 mil triângulos e 8 chamadas de desenho (corpo, cajado, anel, capa, tabardo, 2 olhos e cristal), mais 1 para as partículas quando ativas.
- `scripts/smoke.mjs --port=4192 --out=.smoke/player`:
  - build ok, o jogo entra em `playing` e não há erros de console;
  - o único aviso é `toNonIndexed`, de `src/world/vegetation`;
  - a captura de tela do script estourou o limite de 30 s, porque o mundo completo renderiza a cerca de 0,6 FPS no SwiftShader em 1280×720. Isso é limite do ambiente, não erro do módulo.
  - As capturas próprias em 800×450 e 1280×720 funcionaram.

## Pendente / limitações conhecidas
- **Rosto estilizado e simples** (esfera, cones e caixas): lê bem dentro do capuz com os olhos brilhando, mas não tem detalhe facial.
- **A saia do sobretudo é rígida**: segue o quadril e as coxas. No voo inclinado ela forma "tubos", o que diminuímos aproximando as pernas. Só a capa e o tabardo são tecido simulado.
- **Escalada**: só funciona em colisores marcados `climbable`. Paredes de terreno muito íngremes não são escaláveis. Não há custo de vigor (`CLIMB.energyPerSecond = 0`, ajustável).
- **Golpes e conjurações** são clipes de poses-chave. O módulo de combate decide o quadro de impacto usando a duração retornada por `playAnimation`.
- **Rastros de vento**: são riscos estacionários sem colisão; a quantidade é limitada pelo pool.
- **Câmera de chefe**: só aparece se `ai.activeBoss?.()` existir ou se `setMode('boss')` for chamado. Enquadra afastando a câmera, sem mirar o chefe explicitamente quando não há alvo travado.
- **Diálogo**: `setDialogueFocus` recebe uma posição. Se ela estiver perto do chão, é tratada como os pés do NPC e sobe para a altura do rosto (+1,6 m).
- **FPS absoluto não medido** neste ambiente (renderização por software). As métricas válidas são o tempo de CPU por sistema acima.

## Pedidos para outros módulos
- **combat**:
  - usar `player.playAnimation(anim, {speed})` e a duração retornada para o quadro de impacto;
  - usar `player.lockMovement` em golpes pesados, `player.setBlocking`, `player.isBusy()` antes de iniciar ações, `player.canCastHeavy()` antes de magias pesadas;
  - usar `player.getWeaponTipWorldPosition()` e `player.getHandWorldPosition('left')` como origem de projéteis e `player.getAimRay()` para a direção;
  - o jogador já aplica `health.blocking` em `setBlocking`; a janela de parry continua com o combate.
- **ui**:
  - ouvir `player:lockOn` para o retículo do alvo;
  - chamar `player.respawn()` na tela de derrota (ele mesmo volta o estado para `'playing'`).
- **audio**:
  - ouvir `player:jump` (o jogador também toca `'jump'` direto, então ouvir os dois duplicaria o som);
  - `player:footstep` traz `surface`; `player:flightStart` e `player:flightEnd` marcam o loop de voo.
- **story/npc**: usar `camera.setDialogueFocus(posNPC)` / `setDialogueFocus(null)` e `camera.setCinematicShot(...)` com `setMode('explore')` para devolver a câmera.
- **world**: marcar como `climbable` as paredes que devem ser escaláveis (torres em ruínas, penhascos construídos) e preencher `surface` nos colisores (madeira em pontes etc.) para os passos.
