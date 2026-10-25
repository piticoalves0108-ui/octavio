# Status: montaria (cavalos)

Montaria no estilo Zelda: cavalos mansos e selvagens, domar, cavalgar com marchas e esporas, pular, assobiar e o seu
cavalo salvo no jogo.

## Onde fica cada coisa
- `src/data/mounts.ts`: todos os números:
  - marchas, aceleração, giro, esporas, pulo, recusa de terreno e assento;
  - domar, assobio, nomes e câmera montado.
- `src/mount/ride.ts`: lógica pura, testada no vitest:
  - `stepRide` (marchas, esporas, velocidade, pulo, giro) e `stepAir` (queda);
  - `terrainBlock` (água funda, penhasco, subida íngreme) e `stepTaming`.
- `src/mount/Mounts.ts`: sistema `ctx.sys.mounts`. Roda antes do jogador: move o cavalo e põe o mago na sela. Faz o
  prompt "Montar", domar, descer, assobio e salvar.
- `src/data/creatures.ts`:
  - `cavalo` (manso, pasto de Brumafria);
  - `cavalo_baio`, `cavalo_tordilho` e `cavalo_negro` (selvagens);
  - o campo `mount` marca quem pode ser montado.
- `src/data/spawns.ts`: três manadas selvagens, ao sul de Brumafria, no oeste e no leste.
- `src/ai/rigs/quadruped.ts`: pelagens novas, `setSaddle()` (sela com manta, estribos e barra dourada) e a animação
  `rear` (empinar > 0, escoicear < 0).
- `src/ai/creatures/Creature.ts`:
  - `ridden` (a IA para enquanto montado);
  - `owned` (não foge do jogador nem de sons);
  - `callTo()` (vem quando chamado).
- `src/player/Player.ts`: estado `'ride'`, com `startRide`, `setRideTransform`, `endRide` e `isRiding`. A morte e o
  teletransporte desmontam.
- `src/player/Animator.ts`: modo `'ride'`, a pose de montado:
  - pernas abertas, pés nos estribos e mãos nas rédeas;
  - o tronco inclina no galope e o corpo balança conforme a andadura;
  - ao domar, o corpo é jogado e um braço vai para o alto.
- Câmera (`CameraRig`): foco mais alto, distância maior conforme a velocidade e FOV maior no galope.
- HUD: dicas de teclas montado, esporas (4 círculos que enchem ao recarregar) e barra "Domando o cavalo".
- Sons procedurais: `hoof` (cascos, ritmo pela velocidade), `horse_neigh` (relincho) e `whistle` (assobio).

## Como funciona no jogo
- **Montar:** chegue perto de um cavalo e aperte **E**.
  - O cavalo manso do pasto vira seu na hora: ganha sela e nome.
  - O selvagem precisa ser **domado**: ele empina e escoiceia por 3,4 s enquanto a energia do mago se gasta.
  - Sem energia suficiente, o cavalo derruba o mago (um pouco de dano) e foge.
  - Chegar correndo espanta os selvagens. Ande devagar.
- **Cavalgar:**
  - segurar **W** sobe as marchas (passo, trote, meio-galope);
  - **Shift** gasta uma espora e dá galope por 2,8 s (4 esporas, que recarregam);
  - **A/D** viram: curva fechada devagar, aberta no galope;
  - **S** freia e anda de ré;
  - **Espaço** pula, com altura suficiente para cercas;
  - **E** desce para o lado;
  - **F** salta do cavalo direto para o voo.
- **O cavalo recusa** água funda, beira de penhasco e subida acima de 38°, com aviso e um empinar. Bater de frente em
  velocidade faz o cavalo tropeçar e parar.
- **Combate montado:**
  - cajado e artefatos disparam;
  - lâminas não, porque não alcançam do alto do cavalo;
  - magias funcionam, menos o Teleporte e a Forma Ascendente;
  - um golpe forte (atordoar) derruba o mago do cavalo.
- **Assobio (V):** o seu cavalo vem correndo.
  - A mais de 140 m, ele aparece galopando a 55 m, atrás da câmera, em chão seco.
  - Sem cavalo, uma dica explica onde conseguir um.
- **Salvar:** o tipo, o nome e a posição do seu cavalo ficam salvos. Ao carregar, ele volta onde estava, com sela.

## Testes
- `tests/mount.ride.test.ts` (8 testes):
  - as marchas sobem até o meio-galope sem galopar sozinho;
  - a espora dá galope, gasta carga, não funciona sem carga e recarrega;
  - soltar o W para o cavalo e o S faz andar de ré;
  - as curvas são mais fechadas devagar do que no galope;
  - o pulo só sai em movimento, pousa no chão e tem altura de cerca;
  - o cavalo recusa terreno perigoso;
  - domar funciona com energia e falha sem;
  - os dados de cavalos e manadas são válidos.
- `tests/integration.save.test.ts`: ida e volta do save da montaria; tipos que não são montaria são descartados.
- No navegador (Playwright + SwiftShader):
  - montar no cavalo do pasto, marchas, espora e galope, pulo, curva, parar e descer;
  - o assobio de longe;
  - domar um selvagem nos campos ao sul;
  - o save do cavalo.

## Pendente / limitações
- Um cavalo por vez: montar outro faz dele o seu, e o anterior volta a pastar sem sela (não é salvo).
- Os cavalos não têm barra de vigor própria nem vínculo (BotW). O seu cavalo não morre.
- O cavalo não nada: recusa água funda.
- O cavalo não aparece no mapa.
