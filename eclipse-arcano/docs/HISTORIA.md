# Eclipse Arcano: O Mago do Tempo Perdido — Bíblia narrativa

> Documento de design da campanha completa. A campanha inteira está implementada: **Prólogo**, **Atos I a IV** e os **três finais**. O que cada ato faz no jogo (missões, chefes, escolhas) está em `docs/status/story.md`.

## Premissa

Há cerca de quatro mil anos, o **Império Arcano de Aeternum** dominava a *Arcanotecnia*, a fusão de magia e máquina. Circuitos rúnicos eram alimentados por cristais de **Éter**, a energia vital do planeta.

**Kaelen Aurivar**, Arquimago Guardião do Tempo, foi o maior dos magos de Aeternum. Ele acorda numa cripta esquecida, com as memórias em pedaços, num mundo que regrediu a reinos medievais. A tecnologia jaz adormecida em ruínas, e a magia virou superstição temida.

Uma corrupção arroxeada se espalha a partir do Pântano Sombrio. Criaturas que deviam dormir despertam, e constructos antigos voltam a andar.

## O que aconteceu de verdade (revelado aos poucos)

1. O **Antigo Rei Aldric Valmora** quis se tornar imortal ligando todo o Éter do planeta a si mesmo. O instrumento seria o **Coração do Eclipse**, uma relíquia projetada pelo próprio Kaelen.
2. Kaelen acreditava que o Coração serviria para estabilizar a Arcanotecnia, que estava rachando o mundo. Seu verdadeiro propósito era **reunificar magia e tecnologia de forma segura**. Aldric o perverteu.
3. Para cortar a ligação do Rei, Kaelen e o **Conselho dos Sete** executaram a **Grande Cisão**: separaram à força magia e tecnologia. O império caiu, as máquinas adormeceram e a magia ficou selvagem.
4. Kaelen se tornou a **chave viva do selo**. Ele se aprisionou fora do tempo e fragmentou as próprias memórias para que ninguém arrancasse dele como desfazer a Cisão.
5. A consciência de Aldric sobreviveu dentro do Coração do Eclipse. **O despertar de Kaelen enfraqueceu o selo**, e a corrupção é Aldric vazando para o mundo. O despertar foi provocado por saqueadores pagos para roubar os cristais da cripta.
6. Quem pagou os saqueadores foi o **Barão Teodric Vael**, de Ferroluz. Ele é um engenheiro-nobre idealista que quer "devolver a tecnologia ao povo" e ouve sussurros que acredita serem de um antigo sábio. Na verdade, são de Aldric.

## Personagens principais

| Personagem | Papel | Personalidade |
|---|---|---|
| **Kaelen Aurivar** | Protagonista, mago ancestral cyber | Contido, irônico, carrega culpa que ainda não lembra |
| **Anciã Maren** | Líder de Brumafria, guardiã de lendas | Sábia e desconfiada da magia; protege a vila acima de tudo |
| **Capitão Bran Holt** | Capitão da guarda | Pragmático e ríspido, leal; respeita resultados |
| **Doran Forjafria** | Ferreiro | Jovial, orgulhoso do martelo ancestral da família |
| **Hilda** | Taverneira do Javali Rúnico | Fofoqueira e calorosa; fonte de rumores |
| **Teodoro Lumen** | Estudioso e arquivista | Curioso, nervoso, obcecado pela "era antiga" |
| **Ilsa Vento-Bravo** | Caçadora | Respeita a floresta; odeia caçadores furtivos |
| **Sabine** | Mercadora | Gananciosa mas justa |
| **Irmão Calen** | Sacerdote do santuário | Teme a magia e reage mal a feitiços em público |
| **Ravena, a Corva** | Líder dos saqueadores Corvos (inimiga especial) | Sobrevivente cínica; pode virar aliada |
| **Barão Teodric Vael** | Senhor de Ferroluz | Idealista manipulado (antagonista secundário redimível) |
| **Darian** | Antigo aprendiz de Kaelen (Cavaleiro do Eclipse) | Trágico; serve Aldric por acreditar que Kaelen o abandonou |
| **O Antigo Rei Aldric Valmora** | Antagonista principal | Carismático, paciente; fala nos fragmentos de memória |

## Estrutura da campanha

### Prólogo — O Despertar *(implementado)*

Kaelen acorda na **Cripta do Despertar**. Saqueadores Corvos arrancam cristais do selo. O jogador aprende movimento e a **Bola Arcana**, enfrenta os saqueadores e sai da cripta. Ao longe se vê Brumafria.

### Ato I — Ecos de Brumafria *(implementado)*

1. **Estranho em Brumafria:** o Capitão Bran barra o mago no portão sul. A depender da conversa, ele deixa entrar ou exige que Kaelen prove boa-fé. Na vila, a **Anciã Maren** conta sobre a corrupção e sobre os roubos de cristais pelos Corvos. Um cristal específico, o **Cristal-Chave**, abre as Ruínas de Aeternum.
2. **As Asas dos Corvos:** no **Acampamento dos Corvos** há combate contra saqueadores e um confronto com **Ravena** (elite com bloqueios, contra-ataques e chamados de reforço). Derrotada, ela se rende. **Escolha:**
   - *Poupar:* Ravena revela que o Barão de Ferroluz pagou pelos cristais. Ela ajudará no futuro. Os guardas desaprovam (Bran mais frio).
   - *Executar:* o jogador ganha a lâmina dela (**Lâmina Vampírica**). Bran aprova, e a informação sobre o Barão só aparece num bilhete encontrado no acampamento, de forma incompleta.
3. **O Selo de Aeternum:** nas **Ruínas** há constructos guardiões. O Cristal-Chave vai no pedestal e o portão se abre. A Câmara do Guardião espera.
4. **O Guardião Mecânico das Ruínas** (Chefe 1): luta em três fases (ver Chefes). **Escolha** ao final:
   - *Absorver o núcleo:* Kaelen recebe poder imediato (desbloqueia a **Forma Ascendente** e +poder mágico). Inclina para o final sombrio, e o Irmão Calen passa a temê-lo.
   - *Libertar o espírito do Guardião:* o espírito entrega a **Lâmina Temporal** e um **fragmento de memória** extra. Inclina para os finais luminosos.
5. **Ecos do Passado:** o primeiro fragmento de memória revela Kaelen projetando o Coração do Eclipse e a voz do Rei agradecendo. Maren reage conforme as escolhas e aponta Ferroluz. O Ato I se encerra com um epílogo de capítulo. O mundo segue aberto para exploração e missões secundárias.

### Ato II — A Cidade de Ferro *(implementado)*

- Os portões de **Ferroluz** se abrem. O **Barão Teodric** recebe Kaelen como "herói da era antiga" e pede ajuda para religar a **Forja Celeste**.
- Chefes: **Colosso de Ferro e Magia** (o teste do Barão), **Bruxa das Tempestades** (montanhas do norte; controla o clima da arena), **Dragão de Cristal Corrompido** (picos cristalinos; luta aérea).
- Revelações: a **Grande Cisão** foi obra de Kaelen. Os sussurros que guiam o Barão vêm do Coração.
- Escolha: expor o Barão publicamente (Ferroluz entra em guerra civil) ou convencê-lo em particular. A segunda opção exige ter poupado Ravena *ou* ter as cartas do arquivo.
- No jogo: `q_ferroluz` (sentinela Mirela abre o portão, encontro com o Barão, Colosso), `q_tempestade` (Morgana, uma das Sete do Conselho) e `q_dragao` (Vyrmathal) em qualquer ordem, depois `q_forja`. Os dois núcleos acendem a Forja Celeste e tocam a memória da Grande Cisão; a voz de Aldric sai da forja. Convencer o Barão aceita a carta com lacre, as cartas do arquivo (ponto opcional na torre) ou ter poupado Ravena. Recompensa: Placa do Colosso + aprimoramento grátis (convencido) ou 400 de ouro (exposto).

### Ato III — A Primeira Era *(implementado)*

- No **Pântano Sombrio**, o **Devorador de Almas** é a fonte visível da corrupção. Num templo submerso está o **Guardião da Primeira Era**, que testa a memória de Kaelen com fases baseadas nos fragmentos coletados.
- O **Cavaleiro do Eclipse** é Darian, o aprendiz que Kaelen deixou para trás durante a Cisão. Ele pode ser redimido se o jogador tiver os fragmentos de memória certos.
- Reviravolta: o selo só se fecha de novo se Kaelen voltar a dormir... ou se o Coração for usado.
- No jogo: `q_pantano` (Devorador de Almas, que não se move e ataca com tentáculos), `q_templo` (cada fragmento de memória enfraquece o Guardião em 8%, até 40%; o Selo da Primeira Era mostra Darian trancado do lado de fora do farol) e `q_darian` (duelo; Darian se rende com 12% da vida). Redimir Darian exige o fragmento do Farol Celeste e 5 fragmentos; ele dá o Emblema de Darian. Matá-lo dá a Insígnia do Eclipse.

### Ato IV — Eclipse *(implementado)*

A **Cidadela Celeste** emerge dos céus (só alcançável voando). A batalha final contra **O Antigo Rei** tem três fases: o Rei, o Rei fundido ao Coração e o Eclipse em si, uma arena que gira entre noite e dia.

No jogo: `q_eclipse` começa com a cinemática da cidadela descendo sobre o Desfiladeiro das Cinzas (300 m de altura) e o eclipse escurecendo o céu. Na luta, os aliados aparecem conforme as escolhas: Ravena (bombas de fumaça e dano), os canhões de Ferroluz (Barão convencido) e Darian (escudo e cura na fase 3). Depois do Rei, o jogador fala com o Coração do Eclipse e escolhe o final.

### Finais (dependem das escolhas acumuladas) *(implementados)*

1. **Reunificação:** Kaelen usa o Coração como foi projetado. Magia e tecnologia voltam a coexistir, e Kaelen perde a imortalidade e envelhece normalmente. Exige ter libertado o Guardião, redimido o Barão ou Darian e coletado os fragmentos.
2. **Selo Eterno:** Kaelen sela Aldric e a si mesmo de novo. O mundo continua dividido, mas seguro. É agridoce, e os aliados lembram dele em lendas.
3. **Ascensão Sombria:** Kaelen absorve o Coração e se torna o novo eclipse. O final fica disponível se ele absorveu os núcleos dos chefes e fez escolhas implacáveis.

Os aliados poupados (Ravena, Darian, o Barão) aparecem na batalha final e nos epílogos conforme as escolhas.

Requisitos no jogo (conversa `coracao_final`; opções bloqueadas mostram o motivo):
- **Reunificação:** Guardião libertado, Barão *ou* Darian redimido e 6 fragmentos de memória. O eclipse some do céu.
- **Selo Eterno:** sempre disponível. O eclipse fica fraco no céu.
- **Ascensão Sombria:** núcleo do Guardião absorvido e ao menos uma escolha implacável (Ravena executada, Barão exposto ou Darian morto). O eclipse fica no máximo para sempre e Kaelen ganha +20% de poder mágico.

Cada final tem sua cinemática e um epílogo que mostra só o destino real de cada aliado (Ravena, Barão, Darian, Guardião, Cervo de Luz). Depois dos créditos o mundo continua aberto.

## Missões secundárias da fatia vertical

| Id | Título | Quem | Resumo | Recompensa |
|---|---|---|---|---|
| `q_martelo` | O Martelo Perdido | Doran | Recuperar o martelo ancestral da família, perdido no Laboratório Abandonado (com autômato errante) | Aprimoramento grátis + Espada Rúnica |
| `q_cervo` | O Cervo de Luz | Ilsa | À noite, encontrar o Cervo Luminoso na Floresta de Lúmen. Caçadores furtivos aparecem; escolha protegê-lo ou deixá-los caçar | Amuleto da Floresta / ouro dos caçadores |
| `q_elyra` | Relíquias de Elyra | Teodoro | Voar até as Ilhas Suspensas e decifrar 3 inscrições | Cajado do Vazio + lore |
| `q_lobos` | Contrato: Lobos Sombrios | Quadro de missões | Eliminar a matilha da toca na floresta, incluindo o Alfa | Ouro + XP |
| `q_automato` | Contrato: Autômato Errante | Quadro de missões | Destruir o autômato de elite perto do Laboratório | Ouro + Manopla Tecnomágica |
| `q_fragmentos` | Fragmentos de Memória | Mistério (automática) | Encontrar 3 fragmentos (Cripta, Farol Celeste, Santuário de Cristal) | Ponto de talento + revelações |
| `q_taverna` | Ervas para Hilda | Hilda | Colher 5 ervas-lúmen na floresta | Poções + rumores |

## Tom e escrita

- Fantasia épica com melancolia. Humor seco em Kaelen.
- NPCs falam de forma simples e regional. O Rei fala de forma polida e antiga.
- Diálogos curtos, com escolhas que soam como posturas: compassivo, pragmático, arrogante ou curioso.
- Nenhuma escolha é "certa": cada uma tem custo e recompensa.
