# Status — módulo `rpg` (inventário, equipamentos, saque, lojas, progressão e talentos)

Arquivos: `src/rpg/Inventory.ts`, `src/rpg/Progression.ts`, `src/rpg/inventory/core.ts`, `src/rpg/loot/*` (`LootWorld`, `Chests`, `Pickups`, `Herbs`, `meshes`), `src/data/items.ts`, `src/data/talents.ts`, `src/data/progression.ts`, `src/data/loot.ts`, `src/data/shops.ts`. Testes em `tests/rpg.*.test.ts` (+ `tests/rpg.helpers.ts`).

Fora da área, só acréscimos em `GameEvents` (`src/core/EventBus.ts`): `item:used`, `chest:opened`, `shop:transaction`, `herb:harvested` e `talent:respec`. Os `SfxId` (`potion`, `chest_open`, `ui_error`, `hit_metal`) e `VfxKind` (`heal`, `arcaneSpark`, `arcaneBurst`, `metalSpark`, `levelUp`, `pickupGlow`) usados já existiam.

As classes `Inventory` (`ctx.sys.inventory`) e `Progression` (`ctx.sys.progression`) mantêm todos os membros públicos dos stubs com as mesmas assinaturas (`add`, `remove`, `count`, `has`, `get`, `equip`, `unequip`, `use`, `discard`, `quickUsePotion`, `addGold`, `spendGold`, `equippedWeaponDefId`, `items`, `stash`, `gold`, `capacity`, `equipped`, `collectedUniques`; `level`, `xp`, `skillPoints`, `talentRanks`, `xpToNext`, `addXp`, `getStat`, `canUnlockTalent`, `unlockTalent`, `talentRank`). O tipo `StatId` continua exportado por `rpg/Progression.ts` (agora reexportado de `data/progression.ts`). Só houve acréscimos.

## O que foi implementado (funcionando e testado)

### Itens (`src/data/items.ts`) — 42 definições
- 15 armas geradas de `WEAPONS` (id do item = id da arma), 5 consumíveis, 7 materiais, 6 itens de missão, 4 amuletos e 5 vestes. Todos os ids do contrato C6 existem (teste).
- Cada item tem nome, descrição, lore opcional, **ícone procedural** (`glyph` de texto + `shape` desenhável + `color`), categoria, raridade (`RARITIES`), empilhável/`maxStack`, valor, requisito de nível, bônus de atributos (`stats`), slot, efeito de uso e `bound` (missão/cajado inicial: não vende nem descarta).
- Armas exibem dano (com aprimoramento), velocidade, alcance, crítico e efeito (`weaponLines`); `Inventory.describe(stack)` monta o tooltip completo em pt-BR.
- Consumíveis: poções de vida (menor/normal/maior: pontos + % da vida), poção de energia e **Elixir da Fúria** (efeito temporário de atributos). Recarga por grupo: poções 3 s, elixir 40 s.

### Inventário (`Inventory.ts` + `inventory/core.ts`, lógica pura testável)
- Pilhas com `uid` único (`i1`, `i2`... o gerador avança além dos uids carregados), capacidade de 40 pilhas (equipados e itens de missão não ocupam espaço). O excesso **cai no chão** perto do jogador (nunca se perde). `tryAdd` adiciona só o que couber.
- `uniqueId` em `add`: o item só pode ser recebido uma vez (vai para `collectedUniques`).
- Equipar com requisito de nível (`canEquip` → motivo legível), troca no slot, `unequip`. Emite `equip:changed`; o combate troca a arma (lê `equippedWeaponDefId()` e o `upgrade` da pilha) e o jogador recalcula vida/energia (`refreshStats`).
- **Comparação**: `compare(uid)` e `compareDef(defId)` (itens da loja) devolvem deltas (`StatDelta`: atual, candidato, delta, melhor/pior, formato). Armas: dano, velocidade, alcance, crítico e dano por segundo estimado; amuletos/vestes: atributos (custos de voo/esquiva com "menor é melhor").
- `use(uid)`: consumíveis curam/restauram energia/aplicam efeito, com recarga, animação `drink`, VFX (`heal`, `arcaneSpark`, `arcaneBurst`), som `potion` e evento `item:used`. Não gasta poção com vida cheia. Equipáveis são equipados.
- **Tecla H** (`input 'potion'` no `update`): `quickUsePotion()` escolhe a menor poção que cobre a vida que falta (senão a maior).
- `discard(uid, qty?)`: itens de missão e vinculados não podem ser descartados.
- **Baú pessoal** (stash, 80 pilhas): `openStash()` abre o menu `stash`, `moveToStash`/`moveFromStash` (preservam uid e aprimoramento; itens de missão ficam com o jogador). Modelo de baú no quarto da taverna (âncora `taverna_descanso`).
- Ouro (`addGold`/`spendGold`, limitado), `gold:changed`, `inventory:changed`, `item:pickup`, notificações `ui:notify`.
- `sorted()`/`sortItems()` (categoria → raridade → nome), `displayName` (+N), `freeSlots`, `canAdd`, `spaceFor`.
- **Save robusto** (`v: 2`): valida defIds, limita quantidades ao máximo da pilha, normaliza aprimoramento (0..5), descarta uids duplicados (compartilhado entre mochila e baú: o mesmo item nunca aparece duas vezes), equipado só vale se o uid existir e couber no slot, ouro limitado, lojas/recompra/recargas validadas. Itens soltos raros e ervas colhidas também são salvos.
- Kit de novo jogo: **Cajado Ancestral equipado + 2 Poções de Vida Menores**.

### Saque no mundo (`src/rpg/loot/*`, dados em `src/data/loot.ts`)
- **Baús** (`Chests.ts`): 10 baús com conteúdo fixo, um por âncora `bau` de `places.ts` (+ extras nas ilhas). Modelo procedural (3 estilos: madeira, ruína, rúnico) com geometrias/materiais compartilhados, runa brilhante enquanto fechado, **animação de abrir** (tampa), som, VFX, XP (+10) e evento `chest:opened`. O id vai para `collectedUniques`: o baú continua aberto e vazio após carregar. Ocultos a mais de `visibleDistance`.
- **Armas especiais** distribuídas: Espada de Raios na sacada da Torre do Observador (só voando), Espada Solar no Farol Celeste (ilha), Cajado do Dragão no Laboratório Abandonado, Orbe do Eclipse nas Ilhas de Elyra (baú da tempestade, ilha 4, y≈205) e o Manto do Guardião do Tempo na ilha de Elyra. As armas de missão (Lâmina Vampírica, Lâmina Temporal, Cajado do Vazio, Manopla Tecnomágica) ficam para a narrativa (`inventory.add`).
- **Recompensas de inimigos** (contrato C1, `LootWorld.onKilled`): ouve `enemy:killed`/`creature:killed`, lê `xp`, `gold` e `drops` de `enemies.ts`/`bosses.ts`/`creatures.ts`. Concede XP via `progression.addXp` e solta ouro + itens rolados **no chão**. Crédito: golpe final do jogador, ou o jogador ter causado dano ao alvo, ou morte sem matador a até 60 m. Nunca recompensa duas vezes a mesma entidade. Chefe: 800 XP + Espada Cyber-Rúnica garantida.
- **Itens soltos** (`Pickups.ts`): pool fixo de 40, 2 `InstancedMesh` (gemas na cor da raridade e moedas), brilho por `vfx.sprite`, queda/flutuação, **ímã** que puxa até o jogador e coleta automática (ou [E]). Comuns e ouro somem em 5 min; raros+ ficam e são salvos. Pool cheio despeja o comum mais antigo. Sem alocação por quadro.
- **Ervas-lúmen** (`Herbs.ts`): 16 pontos na Floresta de Lúmen, 2 `InstancedMesh` (folhas + bulbos que brilham mais à noite, com centelhas), colher com [E] (+XP, `herb:harvested`), **renascem no dia seguinte** de jogo.
- Balcões de loja nas âncoras de `shops.ts` (prompt "Negociar — ...", prioridade baixa para não competir com a conversa do NPC), baú pessoal e **santuário** (`santuario_vila_oracao`): [E] duas vezes para confirmar a redistribuição de talentos.

### Lojas e ferreiro (`src/data/shops.ts` + API em `Inventory`)
- `loja_sabine` (11 itens; compra quase tudo), `forja_doran` (8 itens; armas/vestes/materiais; **aprimora**), `taverna_hilda` (5 itens; poções/materiais).
- `openShop(shopId)` abre `ui.openMenu('shop')` e expõe `activeShop` (`ShopState`: estoque com preços, `buyback`). `closeShop()`.
- `buy(itemId, qty)`, `sell(uid, qty)` (preço de revenda `sellPrice(uid)`, cresce com o aprimoramento; equipados/vinculados não), `canSell(uid)` com motivo, `buyback(i)` (recompra pelo mesmo preço até a renovação), `buyPrice(itemId)`.
- Estoque **renova a cada dia de jogo**; itens com `minLevel` aparecem ao alcançar o nível.
- **Aprimorar** (`upgradeWeapon(uid)`, `upgradeCost(uid)`, `canUpgrade(uid)`): +1 a +5, custo de ouro + materiais crescente (comum: 48/108/216/420/720 de ouro; minério de ferroluz → fragmento de éter → engrenagem → cristal arcano → núcleo de autômato), multiplicador de dano de `upgradeMultiplier` (`weapons.ts`). `grantFreeUpgrade(n)` para recompensas da história (Doran). Não há durabilidade, então não há conserto.
- Evento `shop:transaction` (compra, venda, recompra, aprimoramento).

### Progressão (`Progression.ts`, dados em `src/data/progression.ts`)
- Curva: XP do nível L ao L+1 = `round(80 · L^1,3)` (80, 197, 334... 3677 no 19→20); nível máximo 20 (32 230 XP no total). `applyXp` puro sobe vários níveis de uma vez e carrega o excedente.
- Fontes: inimigos/criaturas/chefe (C1), missões (`addXp(amount, reason)`), **descoberta de locais** (`location:discovered` → XP por tipo: 30–120), baús (+10) e ervas (+2).
- Subir de nível: +1 ponto de talento (+1 extra nos níveis 5, 10, 15 e 20: 23 pontos no total), atributos por nível (+12 vida, +6 energia, +3% poder mágico/físico, regenerações), **cura completa**, VFX `levelUp`, `level:up` (o jogador e as habilidades ouvem) e notificação. `addSkillPoints(n)` para recompensas.
- `getStat(stat)` agrega base + nível + talentos + equipamentos (arma/amuleto/vestes) + efeitos temporários (elixir) + bônus externos da história (`setExternalMod`, ex.: absorver o núcleo do Guardião), com limites por atributo. Cache invalidado só quando algo muda (custo ~0 por quadro). `allStats()` e `statBreakdown(stat)` para a ficha.
- Efeitos temporários: `addBuff`/`removeBuff`/`hasBuff`, expiram no `update` com aviso.

### Talentos (`src/data/talents.ts`)
- 4 ramos × 6 talentos (24 talentos, 56 ranks): **Arcano Ofensivo** (poder mágico, crítico, Lança de Energia, Explosão Rúnica, Tempestade de Raios), **Lâmina Rúnica** (poder físico, roubo de vida, defesa, crítico, Lâminas Etéreas), **Égide** (vida, Escudo Mágico, regeneração, Correntes Arcanas, redução de dano), **Errante dos Céus** (voo mais barato/rápido, esquivas, Teleporte Curto, energia, Fenda Dimensional).
- Pré-requisitos por linha (pontos gastos no ramo: 0/2/3/5/7/9) e talento anterior no último nível. Talentos de habilidade chamam `abilities.unlock` (se bloqueada) ou `abilities.upgrade` (C10).
- `canUnlockTalent`, `unlockTalent`, `talentBlockReason`/`talentBlockText` (motivo para a UI), `branchPoints`, `spentTalentPoints`.
- **Redistribuição** `respec(anywhere?)`: custa `60 + 30 · nível` de ouro, exige estar no santuário (ou `anywhere=true` para scripts), devolve todos os pontos e desfaz as habilidades concedidas por talentos (as que o nível já libera ficam). `respecCost()`, `canRespec()`, `nearShrine()`.
- Um ramo completo custa ≤ 23 pontos (teste): qualquer build pura ou híbrida é viável; nenhuma combinação é obrigatória.

## Testes e validação (números desta execução)

- `npx tsc --noEmit`: **0 erros** (projeto inteiro).
- `npx vitest run tests/rpg`: **46/46** (3 arquivos: dados 9, inventário 22, progressão 15). Cobrem: ids C6, consistência de itens e drops, baús/âncoras/armas especiais, ervas, rolagens, lojas e preços; empilhar, capacidade, transbordar no chão, uniqueId, equipar com requisito, comparar, usar poção/elixir, recarga, descartar, baú pessoal, comprar/vender/recomprar/renovar, aprimorar até +5 e grátis, save/load sem duplicar, save corrompido, SaveSystem real; curva, level-up, descoberta, getStat agregado, talentos, pré-requisitos, builds, respec e save da progressão.
- Smoke (`scripts/smoke.mjs --quality=low --port=4196 --out=.smoke/rpg`): **0 erros e 0 avisos de console**. Tempo médio do sistema `inventory` no relatório: 0,61 ms, inflado pela construção única do saque no primeiro quadro (média móvel do PerfMonitor começa no valor do 1º quadro); em regime o custo medido no Playwright é o abaixo.
- Playwright (`/tmp/claude-0/rpg-checks/rpg.mjs`, Chromium SwiftShader 800×450): **19/19 OK, 0 erros de console**:
  1. kit inicial (cajado equipado, 2 poções; o combate usa o cajado);
  2. prompt do baú aparece perto; 3. abrir com [E] dá conteúdo/ouro/XP, tampa abre (−1,9 rad) e não reabre;
  4. os 10 baús assentados em posição válida (sacada da torre y=71,6 e ilhas y≈190–205, acessíveis só voando);
  5. alfa derrotado de verdade (dano do combate): +120 XP e ouro/itens no chão; 6. o ímã coleta tudo ao se aproximar;
  7. equipar Espada de Ferro troca a arma do combate; comparação de dano 12 → 16;
  8. loja: abre o menu `shop`, compra 2 por 60 cada e vende 1 por 18 (saldo −102 de ouro);
  9. ferreiro pelo balcão [E]: aprimorar +2 sobe o dano do combate de 16,5 para 20,4;
  10. subir de nível: `level:up`, cura completa, vida máx. 112 → 124, +1 ponto, Explosão Rúnica liberada;
  11. talentos: poder mágico 1,06 → 1,12; Escudo Aprimorado desbloqueia o Escudo Mágico antes do nível 6;
  12. tecla H: vida 77 → 154, gasta 1 poção, recarga ativa; 13. colher erva-lúmen com [E];
  14. baú pessoal com [E] abre o menu `stash` e guarda; 15–16. save/load do inventário (sem duplicar, baú continua aberto, arma igual) e da progressão;
  17. custo em regime: `inventory` 0,008 ms/quadro ocioso e 0,047 ms com 40 itens soltos; `progression` ≤ 0,001 ms;
  18. chefe (Guardião): +800 XP e Espada Cyber-Rúnica no chão; 19. nenhum erro de console.
  Capturas em `bench-results/rpg-*.png` (baú aberto na cripta, baús da torre/farol/ruínas, saque no chão, 40 itens, erva à noite, nível).

## Correções desta rodada
- `LootWorld.update`/`HerbField.update` acessavam `ctx.camera.position` sem checar (quebrava o teste unitário sem câmera): agora caem para a posição do jogador.
- Medição do tempo de construção do saque (`loot.stats.buildMs`).
- Novo teste Playwright do chefe (XP + drop garantido).
- As capturas antigas da sacada da torre e do Farol Celeste não mostravam o baú (enquadramento da câmera cinemática colidindo com a parede, não um defeito do baú). Um script de depuração (`dbg-chests.mjs`) confirmou que os dois estão visíveis e acessíveis (prompt "[E] Abrir ..." aparece em cima da sacada/ilha), e as capturas foram trocadas.

## Pendente / limitações (honestidade)
- **Interface**: os menus `inventory`, `shop`, `stash` e `skills` são da UI (outro módulo). O rpg expõe tudo (estado e métodos), mas sem a UI pronta o jogador só usa lojas/baú/talentos por script ou pela UI que o módulo de interface fizer.
- Lojas também abrem pelo balcão ([E]); quando a narrativa ligar o diálogo dos lojistas, os dois caminhos coexistem (o NPC tem prioridade no prompt).
- Ervas usam a altura do terreno (não a colisão de objetos); um ponto que caia sob uma pedra grande fica escondido.
- Itens soltos comuns somem em 5 min e não são salvos se o jogo for salvo e recarregado depois disso (por design); raros ficam para sempre.
- Ícones são descritos por dados (`glyph`/`shape`/`color`); o desenho é responsabilidade da UI.
- Não há durabilidade (portanto não há conserto no ferreiro).
- A construção do saque (10 baús, 16 ervas, balcões) acontece no primeiro quadro de jogo (3,7 ms medidos no SwiftShader).

## Pedidos a outros módulos
- **Interface**: menus `inventory` (usar `sorted()`, `describe()`, `compare()`, `equip/use/discard`, `freeSlots`), `shop` (`activeShop`, `buy/sell/buyback/upgradeWeapon/upgradeCost/canUpgrade/canSell/compareDef`), `stash` (`moveToStash/moveFromStash`, `stashUsedSlots`) e `skills` (`TALENTS`, `TALENT_BRANCHES`, `talentBlockText`, `unlockTalent`, `respecCost`). Ícones via `ITEMS[id].icon`.
- **Narrativa**: entregar armas de missão com `inventory.add(id, 1, { uniqueId })`; XP de missão com `progression.addXp(n, 'missao:id')`; Doran pode dar `inventory.grantFreeUpgrade(1)`; escolha do núcleo do Guardião pode usar `progression.setExternalMod('nucleo_guardiao', {...})`; lojistas podem chamar `inventory.openShop(id)` no fim do diálogo.
- **Áudio**: pode ouvir `item:used`, `chest:opened`, `shop:transaction`, `herb:harvested`, `level:up` e `talent:respec` (o rpg já toca `potion`, `chest_open`, `hit_metal` e `ui_error` diretamente).
