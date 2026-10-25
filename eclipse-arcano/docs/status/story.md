# Status: história completa (Atos II a IV, chefes e finais)

Etapa 5 do pedido "estilo Zelda": terminar a campanha. A bíblia narrativa está em `docs/HISTORIA.md`.

## O que foi implementado

### Missões principais (`src/data/quests.ts`)
| Missão | Ato | Resumo |
|---|---|---|
| `q_ferroluz` | II | Viagem a Ferroluz, a sentinela Mirela abre o portão, encontro com o Barão, luta com o Colosso e o pedido dos dois núcleos |
| `q_tempestade` | II | Subir ao Pico das Tempestades, derrotar Morgana e pegar o Coração da Tempestade |
| `q_dragao` | II | Picos de Cristal, Vyrmathal e o Cristal Primordial |
| `q_forja` | II | Acender a Forja Celeste (memória da Grande Cisão, voz de Aldric), arquivo opcional, decidir o destino do Barão |
| `q_pantano` | III | Coração do Pântano e o Devorador de Almas |
| `q_templo` | III | Templo Submerso, Guardião da Primeira Era e o Selo (memória de Darian no farol) |
| `q_darian` | III | Torre do Observador, duelo com Darian, redimir ou matar |
| `q_eclipse` | IV | A Cidadela Celeste desce, luta com o Rei Aldric e a escolha final no Coração do Eclipse |

- `q_ferroluz` começa sozinha quando `q_ecos` (fim do Ato I) termina. `q_tempestade` e `q_dragao` podem ser feitas em qualquer ordem, e `q_forja` começa quando as duas terminam.
- Cada estágio tem "próximo passo" e entradas de diário em pt-BR, com marcadores no mapa.

### Chefes (`src/data/storyBosses.ts`, `src/ai/bosses/StoryBoss.ts`)
- Um motor genérico de chefe, todo dirigido por dados:
  - fases com limiares e ataques por fase: corte, pisão, nova, anel, rajada de projéteis, feixe, rajada de vento, invocação, teleporte, investida e mergulho;
  - eventos de troca de fase: aviso, fala, clima, escala, invocação, voo e ciclo dia/noite;
  - chuva de raios ou cristais anunciada no chão.
- Os chefes:
  - **Colosso de Ferro e Magia** (Ferroluz);
  - **Morgana, a Bruxa das Tempestades** (voa e trava a tempestade);
  - **Vyrmathal, o Dragão de Cristal** (luta aérea com mergulhos);
  - **Devorador de Almas** (rig próprio, `rigs/devourer.ts`: bocarra e 8 tentáculos);
  - **Guardião da Primeira Era** (cada fragmento de memória o enfraquece em 8%, até 40%);
  - **Darian** (se rende com 12% da vida);
  - **Aldric** (3 fases: o Rei, o Rei fundido ao Coração e o Eclipse, que alterna dia e noite).
- Cada chefe aparece quando o jogador entra na arena no estágio certo da missão (`when`), com cartão de nome (`BOSS_CARDS`), barra de vida e música de chefe.
- Quando o jogador morre ou foge da arena, a luta reseta.
- Na luta do Rei, os aliados ajudam conforme as escolhas: Ravena, os canhões de Ferroluz e Darian.
- Recompensas: Placa do Colosso, Amuleto da Tempestade, Escamas de Cristal e materiais.

### Lugares (`src/data/world.ts`, `src/data/places.ts`, `src/world/structures/storySites.ts`)
- Pico das Tempestades, Picos de Cristal, Coração do Pântano e Templo Submerso, com arenas, altares e pedestais.
- **Cidadela Celeste** a 300 m de altura sobre o Desfiladeiro das Cinzas: ilha flutuante com colunata, trono e o pedestal do Coração.
  - Fica escondida (malha e colisores) até a flag `cidadela_surgiu`.
  - O `World` escuta essa flag e também a aplica ao carregar um save.

### NPCs e diálogos (`src/data/npcs.ts`, `src/data/dialogues.ts`)
- **Barão Teodric Vael**:
  - mantém a rotina normal em Ferroluz;
  - durante as missões, espera no pátio ou na forja;
  - se for exposto, some dentro da torre.
- **Mirela Ancoraço** é a sentinela do portão de Ferroluz.
- Conversas novas:
  - `sentinela_portao`, que abre o portão `portao_ferroluz`;
  - `barao_encontro`, `barao_pedido`, `barao_espera`, `barao_forja`, `barao_confronto` e `barao_depois`;
  - `darian_escolha`;
  - `coracao_final`.
- As opções que dependem de escolhas antigas aparecem bloqueadas com o motivo:
  - convencer o Barão;
  - redimir Darian;
  - os finais Reunificação e Ascensão Sombria.

### Cinemáticas e roteiros
- Cinemáticas novas em `CINEMATICS`:
  - `memoria_forja`, `epilogo_ato2`, `memoria_templo`, `epilogo_ato3`, `cidadela_surge`;
  - os três finais: `final_reunificacao`, `final_selo`, `final_sombrio`.
- Passos de cinemática aceitam `when`. Os epílogos usam isso para mostrar só o destino real de cada aliado nesta partida.
  - O `CinematicPlayer` respeita o `when` ao tocar, ao pular e quando as cinemáticas estão desligadas (automação).
- Roteiros novos em `scripts.ts`:
  - `forja_acesa`, `barao_exposto`, `barao_convencido`;
  - `darian_redimir`, `darian_matar`;
  - `eclipse_avanca`, `fim_reunificacao`, `fim_selo`, `fim_sombrio`.
- A intensidade do eclipse por momento da história fica em `ECLIPSE_STORY`.
- A flag `final` é definida no fim da cinemática do final, e isso conclui `q_eclipse` (`jogo_concluido`). Pular a cinemática aplica o mesmo efeito.

## Testes
- `tests/story.bosses.test.ts`:
  - os 7 chefes estão registrados;
  - as fases são coerentes e cada fase tem ao menos 3 tipos de ataque;
  - projéteis, invocações, drops, visuais e arenas existem;
  - o motor monta cada chefe sem WebGL.
- `tests/story.campaign.test.ts` percorre a campanha real (dados + motores puros):
  - caminho luminoso: Barão convencido, Darian redimido, Reunificação;
  - caminho implacável: sem provas o Barão só pode ser exposto, Darian não pode ser redimido, a Reunificação fica bloqueada e a Ascensão Sombria abre;
  - o Selo Eterno está sempre disponível;
  - os epílogos mostram só os destinos certos.
- `tests/narrative.data.test.ts` valida todas as referências: diálogos, roteiros, pontos, itens, estágios e âncoras.
- No navegador (Playwright + SwiftShader), cada chefe foi testado pelo estágio da missão:
  - surge na arena e luta;
  - troca de fase;
  - ao morrer, avança a missão.
  - A conversa com Darian, a Cidadela vista de baixo e de perto e o final com cinemáticas ligadas também foram testados.

## Pendente / limitações
- A Cidadela só é alcançável voando: a energia de voo precisa estar cheia na subida.
- Os aliados da luta final são efeitos (fumaça, canhões, escudo). Eles não são personagens com IA própria.
- Depois do final o mundo continua aberto, mas os NPCs comuns não comentam o final escolhido (só o Barão, se redimido).
