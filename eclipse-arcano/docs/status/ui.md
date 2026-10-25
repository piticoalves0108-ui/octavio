# Status — módulo `ui` (HUD, diálogos, menus e mapa)

Arquivos: `src/ui/**`. Fora da área: `src/world/exploration.ts` (névoa do mapa e carimbos, salvos com o mundo),
`FAST_TRAVEL` em `src/data/world.ts`, `Input.pressedCode/isDown/consume` e a guarda de estado em `core/Interaction.ts`
(o [E] só interage com o jogo rodando, para não reabrir uma conversa ao fechá-la).

A classe `UI` (`ctx.sys.ui`) manteve todos os membros públicos do stub com as mesmas assinaturas e acrescentou
`showTitleCard(title, subtitle?, duration?)`.

## O que foi implementado

### HUD (`Hud.ts`)
- Vida com "sombra" que segue o dano devagar, escudo por cima, pulso quando está baixa e borda vermelha na tela.
  A barra cresce com a vida máxima.
- Energia (dourada na Forma Ascendente), nível, barra de XP e aviso de pontos de talento livres.
- Efeitos ativos (bônus e estados como queimando, preso, lentidão) com tempo restante.
- Barra de magias: 4 atalhos com recarga em varredura, número dos segundos, aviso sem energia e tremida quando a
  magia falha; Forma Ascendente com anel da Carga Arcana; poção rápida com contagem; arma equipada.
- **Roda de energia** ao lado do personagem (como a roda de vigor): aparece ao gastar energia, voar ou escalar e some
  quando enche.
- Mira discreta (vira círculo em combate), barra de conjuração e dicas de controle conforme a situação
  (andando, voando, escalando, nadando, em combate).

### Minimapa (`Minimap.ts`)
- Gira com a câmera; mapa pintado + névoa; locais descobertos, carimbos, inimigos alertas (pontos vermelhos),
  objetivos (o rastreado fica preso à borda), missões disponíveis ("!"), cone de visão e o norte.
- Hora, ícone do clima e nome do lugar.

### Mundo 3D (`WorldOverlay.ts`)
- Barras de vida dos inimigos (nome, nível, elite, sombra de dano, destaque no alvo travado).
- Mira do alvo travado, botão de interação flutuando ao lado do objeto, marcadores avulsos (`worldMarker`).
- Losango do objetivo rastreado com a distância; fora de vista, desliza pela borda de uma área segura.
- Números de dano (críticos, ponto fraco, bloqueado, aparado, imune), respeitando a opção do jogador.
- Barra grande do chefe com as marcas das fases.

### Avisos (`Overlays.ts`)
- Notificações (sem repetir a mesma frase), itens coletados com ícone e cor da raridade, faixas grandes
  (lugar descoberto, nova missão, missão concluída/fracassada, novo nível) em fila, nome do lugar ao entrar,
  legendas ("Nome: fala" com o nome destacado), cartão de título, combinações de magia, "Aparo perfeito!",
  indicador de salvamento e escurecimento de tela (`fadeOut/fadeIn`).
- `fadeOut(duração, cor)` aceita `'white'` para o clarão das memórias; sobre o branco, o cartão de título fica escuro.
- Legendas e cartões de título ficam acima do escurecimento. Antes ficavam escondidos atrás da tela preta,
  inclusive na abertura do jogo e nos epílogos.
- Faixas pretas e dica "Esc pular" nas cinemáticas.

### Diálogo (`DialogueBox.ts`)
- Nome e título do falante, texto que aparece aos poucos, respostas à direita com a postura (compassivo,
  pragmático, arrogante, curioso), destaque para escolhas importantes, opções vistas esmaecidas e bloqueadas
  com o motivo. "Continuar" vira uma seta piscando.
- Mouse ou teclado ([E]/Espaço/Enter, setas, W/S, números).

### Menus (`menus/*`)
- **Título**: logo, Continuar (com nível, lugar e data do último save), Novo jogo, Carregar, Opções, Créditos.
- **Abas do jogo** (Q/E trocam, a mesma tecla fecha): Mapa, Inventário, Habilidades, Diário, Opções.
- **Mapa** (`MapPanel.ts` + `mapRender.ts`): topográfico pintado (relevo sombreado, curvas de nível, água, estradas,
  construções, corrupção), névoa de exploração com textura de mapa em branco, arrastar/zoom/teclado, nomes das
  regiões, cartão do local com distância e **viagem rápida** (`fastTravel.ts`), carimbos de 6 formas e 6 cores,
  objetivos (clique rastreia), missões disponíveis, % explorado e lugares descobertos.
- **Inventário**: equipamento, atributos, filtros, grade, detalhes com comparação, equipar/usar/descartar.
- **Habilidades**: magias (rank, números, atalhos 1–4) e árvore de talentos com dicas.
- **Diário**: missões por estado, objetivos com progresso, próximo passo, recompensas, registro, rastrear e
  "Ver no mapa".
- **Opções**: gráficos, áudio, controles (remapeamento de teclas) e interface (tamanho, minimapa, marcadores,
  números de dano, pausar ao sair da janela).
- **Loja** (comprar, vender, recomprar, aprimorar no ferreiro), **baú**, **pausa** (com resumo), **salvar/carregar**
  (3 espaços + automático + rápido), **derrota** e **créditos**.

## Validação
- `npx tsc --noEmit` e `npm test` (348 testes) passando.
- Capturas no Chromium (SwiftShader) de título, HUD, faixa, diálogo, inventário, habilidades, diário, mapa,
  opções, pausa e derrota.

## Pendente / limitações
- Sem suporte a controle (gamepad) nem a toque.
- O mapa base é desenhado em fatias depois do carregamento (~1 s); antes disso o mapa mostra "Desenhando o mapa…".
- A névoa é uma grade de 16 m suavizada.
