# Eclipse Arcano — Arquitetura técnica

## Engine e plataforma

**TypeScript + Three.js (WebGL2) + Vite.** A motivação:

- Roda em qualquer PC com navegador moderno e pode ser empacotado como executável desktop (Electron/Tauri), sem depender de licença de engine.
- Dá para compilar, testar automaticamente (Playwright/Chromium) e medir desempenho dentro do próprio pipeline de desenvolvimento.
- Todos os recursos (modelos, texturas, sons, músicas) são **procedurais e originais**: são gerados por código, então não há problema de licenciamento. Quando houver arte final, a troca é feita módulo a módulo.

## Estrutura

```
src/
  main.ts                ponto de entrada
  core/                  loop, estados, eventos, entrada, entidades, relógio, configurações, interação
  data/                  TODOS os números ajustáveis (dano, vida, custos, raridades, inimigos, missões...)
  world/                 relevo (heightfield), colisão, terreno em chunks + LOD, vegetação, estruturas, água
  env/                   céu, dia/noite, clima, vento, névoa, pós-processamento
  player/                jogador (modelo, animação, locomoção, voo) e câmera
  combat/                regras de dano (Health), Combat, habilidades, armas, projéteis, VFX
  ai/                    inimigos, chefes, criaturas, spawner
  npc/                   NPCs com rotinas, reações e falas contextuais
  rpg/                   inventário, progressão/talentos, missões, diálogos, estado narrativo, saque
  ui/                    HUD e menus (DOM sobre o canvas)
  audio/                 áudio procedural (WebAudio): efeitos, ambiência, música adaptativa
  save/                  salvamento versionado com checksum, backup e aplicação transacional
  perf/                  monitor de desempenho e benchmarks automatizados
tests/                   testes unitários (vitest)
scripts/                 smoke test e benchmark (Playwright)
docs/                    arquitetura, história, status e desempenho
```

## Contratos entre sistemas

- **`GameContext`** (`core/context.ts`) é o service locator. Os sistemas ficam em `ctx.sys.*` e são tipados pela interface `Systems`.
- **Contrato público = membros públicos das classes em `ctx.sys`.** Nenhum módulo pode remover ou mudar a assinatura de um membro público, mas pode acrescentar novos.
- A comunicação opcional (UI, áudio, missões, NPCs) passa pelo **EventBus** tipado (`core/EventBus.ts`, interface `GameEvents`).
- **Todo dano** passa por `ctx.sys.combat.applyDamage(target, info)`. Isso garante eventos, números de dano, XP, missões e reações de IA.
- **Entidades** (`core/Entity.ts`) ficam em `ctx.entities` (`EntityManager`), que mantém um grid espacial, consultas por raio e atualização escalonada por distância:
  - tier 0: atualiza todo frame;
  - tier 1: atualiza a cada N frames, com o dt acumulado;
  - tier 2: chama `farUpdate`, uma simulação barata;
  - tier 3: a entidade fica dormindo e invisível.
- **Colisão** (`world/Collision.ts`): terreno (heightfield bilinear) + cilindros e caixas orientadas num grid. O jogador e as criaturas são cápsulas verticais resolvidas por empurrão (`resolveCapsule`). Também há `groundHeight`, `raycast` e `lineOfSight`.
- **Salvamento**: cada sistema com estado implementa `Saveable` (`serialize`/`deserialize`) e é registrado em `Game.ts`. `deserialize` valida os dados e lança erro se forem inválidos; nesse caso o SaveSystem restaura o estado anterior.
- **Interação [E]**: `ctx.sys.interaction.register({...})` registra NPCs, baús, portas, alavancas, quadros de missão etc.

## Convenções

- Unidades em metros e segundos. O eixo **-Z é o norte** (topo do mapa) e **+X é o leste**.
- `yaw` 0 aponta para +Z. `object3d.rotation.y = yaw`. O `yaw` de `addBox` usa a mesma convenção do `mesh.rotation.y`.
- `forward = (sin(yaw), 0, cos(yaw))`.
- Os números de gameplay ficam em `src/data/*`, nunca espalhados pelo código.
- Texto visível ao jogador fica em português do Brasil.

## Estados do jogo

`boot → menu → playing ⇄ paused | dialogue | cinematic | dead`

- A simulação do mundo roda em `playing`, `dialogue`, `cinematic` e `dead`.
- Sistemas com `alwaysUpdate` (UI, áudio, perf, save) rodam sempre.
- A entrada de gameplay só vale em `playing` (`input.gameplayEnabled`).

Ordem de update: `clock → env → world → player → abilities → ai → combat → vfx → interaction → quests → dialogue → progression → inventory → story → save`, depois `entities.update`, e por fim `camera → ui → audio → perf` (lateUpdate).

Cada sistema roda isolado em try/catch. Um erro num sistema é registrado no log e não derruba o jogo inteiro.

## Regras de desempenho

- **Não alocar** objetos por frame em caminhos quentes. Reutilize vetores (`core/math.ts TMP`, campos privados).
- Compartilhe geometrias e materiais. Use `InstancedMesh` para elementos repetidos (grama, árvores, pedras, partículas).
- Use LOD por distância e carregue o terreno em chunks com streaming em volta do jogador.
- Shaders cuidam de vento e interação da vegetação, sem física por folha.
- Use pools para projéteis, partículas, números de dano e luzes temporárias.
- Respeite `ctx.settings.q` (preset de qualidade): distância de visão, densidade de grama, partículas, luzes, sombras, limites de entidades.
- IA cara só roda no tier 0. Os tiers 1–2 usam lógica simplificada.

## Ferramentas

- `npm run dev`: servidor de desenvolvimento.
- `npm run build`: checagem de tipos + build de produção.
- `npm test`: testes unitários.
- `node scripts/smoke.mjs`: abre o jogo no Chromium headless, inicia um novo jogo, simula entrada e reporta erros/métricas/captura.
- `window.__game` expõe o `GameContext` (debug e automação).
- `?autostart` inicia um novo jogo direto. `?debug` mostra o monitor de desempenho. `?bench=<cenário>` roda um benchmark.
