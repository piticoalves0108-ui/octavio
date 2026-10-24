# Status — módulo `interactive` (mundo interativo)

Arquivos: `src/interactive/**`, dados em `src/data/interactive.ts`, painel `src/ui/menus/CookingPanel.ts`.
Sistema `ctx.sys.interactive` (`InteractiveWorld`), salvo com a chave `interactive`.

## O que foi implementado

### Grama e fogo (`groundGrid.ts`, `flames.ts`)
- Grade local de 128 × 128 células (0,75 m, cerca de 96 m) em volta do jogador. Ela se recentraliza
  deslocando os dados, então o que foi cortado ou queimado continua no lugar.
- **Grama cortada** por qualquer golpe corpo a corpo (em arco) ou explosão: os tufos encolhem e crescem de novo
  em `CUT.regrow` s. Cada golpe pode achar moedas e, na floresta, cogumelos.
- **Fogo que se espalha**:
  - passa de célula em célula conforme a densidade da grama;
  - o vento empurra o fogo (`FIRE.windBias`);
  - a umidade e a chuva impedem o fogo de pegar e apagam o que queima;
  - a grama queimada fica em tocos pretos, o chão chamuscado e com brasas;
  - a grama volta depois de `FIRE.regrowBurnt` s.
- As chamas são uma malha instanciada (1 draw call) com língua de fogo animada no shader. Há também luz do
  incêndio, fumaça, faíscas, estalos e dano por queimadura a quem pisa no fogo (jogador, inimigos e criaturas).
- **Corrente de ar quente**: voando por cima do fogo, o jogador sobe e quase não gasta energia
  (`Player.externalLift`).
- O que acende o fogo:
  - golpes, explosões, feixes e projéteis do tipo fogo (de qualquer um);
  - a Centelha [G];
  - relâmpagos com o chão seco;
  - a pólvora rúnica;
  - objetos em chamas.

### Arbustos e árvores (`world/vegetation/scatter.ts`)
- Arbustos podem ser cortados (soltam folhas e às vezes frutas silvestres ou moedas) e queimados. Eles voltam
  em `BUSHES.regrow` s: o chunk é refeito.
- Golpear um carvalho sacode as folhas e pode derrubar maçãs. Cada árvore só dá maçã de novo depois de um tempo.

### Objetos físicos (`props.ts`)
- Tipos: barril, caixote, pedregulho, pote e barril de pólvora rúnica. Ficam em grupos na vila, no acampamento
  dos Corvos, em Ferroluz, nas ruínas, na cripta e no laboratório. Os pedregulhos ficam no alto de encostas.
- A física é própria e simples:
  - o corpo é uma esfera para o chão e as encostas, e um cilindro de colisão;
  - o jogador esbarra, sobe em cima, e os projéteis acertam;
  - os objetos rolam ladeira abaixo, deslizam, quicam e boiam (os de madeira);
  - o jogador anda contra um objeto e o empurra;
  - os objetos voam com golpes e explosões;
  - quando estão rápidos, atropelam e ferem inimigos (o dano é creditado a quem empurrou).
- Quebram com dano ou batida forte e soltam saque. Os de madeira pegam fogo e queimam até quebrar.
- A pólvora acende o pavio, pisca e **explode**: fere todos, empurra objetos, incendeia a grama e faz outros
  barris explodirem em cadeia.
- Objetos longe (mais de 110 m) dormem sem colisor. Os quebrados reaparecem depois de 10 min se o jogador estiver
  longe.

### Poderes utilitários
- **Centelha [G]** (6 de energia): uma faísca de fogo em arco que acende grama, fogueiras, objetos e inimigos.
- **Estase Temporal [T]** (20 de energia, recarga de 10 s):
  - congela no tempo o objeto que está na mira, que fica dourado e pulsando;
  - golpes e magias acumulam força, mostrada por uma seta que cresce e fica vermelha;
  - no fim, o objeto dispara na direção acumulada.

### Fogueiras e cozinha (`campfires.ts`, `cooking.ts`, `CookingPanel.ts`)
- 10 fogueiras pelo mapa. O jogo procura chão plano e livre perto de cada posição nominal. As da vila e de
  Ferroluz começam acesas.
- [E] acende a fogueira (com chuva forte não pega) ou abre a panela. Fogo de magia também acende. Chuva forte apaga.
  Fogueira acesa tem chamas, brasas, luz, fumaça e estalos, e queima quem pisa nela.
- **Panela**: até 4 ingredientes; vale a receita de maior prioridade cujos ingredientes estão todos lá. A tela mostra
  o prato que vai sair.
  - Ingredientes: maçã (carvalhos), frutas silvestres (arbustos), cogumelo (florestas, 140 pontos que renascem a
    cada dia de jogo), carne crua (lobos, cervos, coelhos), erva-lúmen e fragmento de éter.
  - Pratos: assados simples, ensopado, torta (Vigor), prato do caçador (Força do Caçador), chá de lúmen
    (Mente Clara), caldo de éter, assado farto (Regeneração) e banquete arcano.
  - Se nada combina, sai "Comida Duvidosa".
- Comida usa o grupo de recarga `food` (1 s).

### Integração
- Novo evento `world:strike` (forma: esfera, arco ou feixe), emitido por `Combat.meleeSweep`, `explode` e
  `beamAttack` e pelos impactos de projéteis. Também foram adicionados `fire:ignited`, `campfire:lit` e
  `cooking:done`.
- `GLOBAL_UNIFORMS.tGround` e `uGroundRect`: a grama, as flores e o terreno leem a grade
  (R = cortada, G = queimada, B = em chamas).
- Novas teclas `spark` (G) e `stasis` (T), novos sons (`fire_ignite`, `wood_break`, `grass_cut`, `stasis`, `cook`),
  novos ícones de comida e o menu `cooking`.
- Salvo: fogueiras acesas e descobertas, cogumelos colhidos e dicas já mostradas. O fogo, os cortes e os objetos
  recomeçam ao carregar (como no Zelda).

## Testes
- `tests/interactive.ground.test.ts`: o fogo se espalha, não pega sem grama, o vento empurra, a chuva e a umidade
  impedem e apagam, a grama cortada volta, e recentralizar preserva o estado.
- `tests/interactive.props.test.ts`: o pedregulho rola e o caixote fica, a estase acumula força e dispara,
  os objetos quebram, a pólvora explode uma vez e as explosões empurram.
- `tests/interactive.cooking.test.ts`: receitas válidas, a receita mais específica vence e a comida duvidosa.
- `tests/integration.save.test.ts`: ida e volta do salvamento do mundo interativo.
- Navegador (Playwright + SwiftShader), validado:
  - fogo em campo aberto e grama queimada;
  - grama cortada com achados;
  - Centelha;
  - empurrar caixote;
  - estase com 4 golpes;
  - pólvora, pedregulho e cozinhar.

## Pendências e ideias
- Fogo em árvores (só os arbustos queimam), temperatura (frio e calor), pescar, montar acampamento em qualquer lugar.
