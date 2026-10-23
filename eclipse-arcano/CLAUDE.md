# Eclipse Arcano: O Mago do Tempo Perdido

RPG de ação 3D em mundo aberto (fantasia cyber-medieval), feito com TypeScript + Three.js + Vite.
Todo o conteúdo (modelos, texturas, sons, música) é procedural, gerado por código.

## Como rodar

```bash
npm ci
npm run dev          # servidor de desenvolvimento (abre em http://localhost:5173)
npm test             # testes unitários (vitest)
npm run build        # checagem de tipos + build de produção (pasta dist/)
node scripts/smoke.mjs   # abre o jogo no Chromium headless, joga alguns segundos e tira uma captura
```

Parâmetros na URL: `?autostart` (começa um jogo novo direto), `?debug` (monitor de desempenho), `?bench=<cenário>`.
No navegador, `window.__game` expõe o `GameContext` para depuração.

## Documentação

- `docs/ARQUITETURA.md`: estrutura de pastas, contratos entre sistemas, convenções e regras de desempenho. **Leia antes de mexer no código.**
- `docs/HISTORIA.md`: bíblia narrativa (personagens, atos, escolhas, finais, missões).
- `docs/status/*.md`: o que cada módulo já faz, como foi testado e o que está pendente.

## Estado atual (23/10/2026)

Concluídos e testados: núcleo, mundo, ambiente (céu, clima, dia/noite), jogador (movimento, voo, câmera),
combate, IA (inimigos, chefe Guardião, criaturas), RPG (inventário, loot, lojas, progressão, talentos),
narrativa (missões, diálogos, NPCs com rotinas), áudio procedural e salvamento.
São 348 testes passando.

**Falta a interface.** `src/ui/UI.ts` ainda é um esboço provisório: só existem o menu principal e o aviso de
interação [E]. Os outros métodos (`showDialogue`, `notify`, `showBossBar`, `showSubtitle`, `fadeOut/fadeIn`,
`worldMarker`) não fazem nada. Por isso o jogador ainda não vê HUD (vida, energia, habilidades), diálogos,
notificações, barra do chefe nem os menus (pausa, inventário, habilidades, diário, mapa, loja, baú, opções).
O contrato entre a UI e os menus está em `src/ui/menus/index.ts` (`MenuHost`), e os nomes dos menus em
`MenuName` (`src/core/EventBus.ts`). Os outros módulos já expõem os dados de que a UI precisa; veja as seções
"Pedidos a outros módulos" e "Pendente" em `docs/status/*.md`.

Outras pendências conhecidas: montaria, pathfinding de inimigos fora da vila e os Atos II a IV da campanha
(hoje está implementado o Prólogo + Ato I).

## Regras do projeto

- Texto visível ao jogador em português do Brasil.
- Números de gameplay ficam em `src/data/*`, nunca espalhados no código.
- Não remova nem mude a assinatura de membros públicos dos sistemas em `ctx.sys`; só acrescente.
- Não aloque objetos por quadro em caminhos quentes; reutilize vetores e use pools.
- Todo dano passa por `ctx.sys.combat.applyDamage`.

## Histórico

O jogo foi criado na branch `claude/affectionate-maxwell-w9q8l9` (outra conta do Claude) e continua em
`claude/hopeful-albattani-21svpl`.
