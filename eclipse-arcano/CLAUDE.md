# Eclipse Arcano: O Mago do Tempo Perdido

RPG de ação 3D em mundo aberto (fantasia cyber-medieval), feito com TypeScript + Three.js + Vite.
Todo o conteúdo (modelos, texturas, sons, música) é procedural, gerado por código.

## Como rodar

```bash
npm ci
npm run dev          # servidor de desenvolvimento (abre em http://localhost:5173)
npm test             # testes unitários (vitest)
npm run build        # checagem de tipos + build de produção (pasta dist/)
npm run build:single  # um único arquivo jogável: dist-single/eclipse-arcano.html (abre com dois cliques)
node scripts/smoke.mjs   # abre o jogo no Chromium headless, joga alguns segundos e tira uma captura
```

Parâmetros na URL: `?autostart` (começa um jogo novo direto), `?debug` (monitor de desempenho), `?bench=<cenário>`.
No navegador, `window.__game` expõe o `GameContext` para depuração.

## Documentação

- `docs/ARQUITETURA.md`: estrutura de pastas, contratos entre sistemas, convenções e regras de desempenho. **Leia antes de mexer no código.**
- `docs/HISTORIA.md`: bíblia narrativa (personagens, atos, escolhas, finais, missões).
- `docs/status/*.md`: o que cada módulo já faz, como foi testado e o que está pendente.

## Estado atual (25/10/2026)

Concluídos e testados:
- núcleo e mundo;
- ambiente (céu, clima, dia/noite);
- jogador (movimento, voo, câmera);
- combate e IA (inimigos, chefe Guardião, 7 chefes da história, criaturas);
- RPG (inventário, loot, lojas, progressão, talentos);
- narrativa completa (Prólogo, Atos I a IV, três finais; missões, diálogos, NPCs com rotinas), áudio procedural e salvamento;
- interface completa (`docs/status/ui.md`).

Etapas "estilo Zelda" pedidas pelo dono do projeto:
1. Gráficos (luz estilizada, folhagem, cores pintadas, grama): **feito**.
2. Movimentos (escalada livre com vigor, escorregar na chuva, pés no chão): **feito** (`docs/status/player.md`).
3. Clima (poças, neve nas alturas, arco-íris, raios perigosos, rajadas visíveis): **feito** (`docs/status/env.md`).
4. Mundo interativo (fogo na grama, cortar grama e arbustos, objetos físicos, Centelha/Estase, fogueiras e
   cozinha): **feito** (`docs/status/interactive.md`).
5. História até o final: Atos II a IV, 7 chefes novos, Cidadela Celeste e os três finais: **feito**
   (`docs/status/story.md`, bíblia em `docs/HISTORIA.md`).

Depois do pedido original:
- Montaria (cavalos mansos e selvagens, domar, marchas, esporas, pulo, assobio): **feito** (`docs/status/mount.md`).
- Arquivo único jogável: `npm run build:single`.

Outras pendências conhecidas: pathfinding de inimigos fora da vila.

## Regras do projeto

- Texto visível ao jogador em português do Brasil.
- Números de gameplay ficam em `src/data/*`, nunca espalhados no código.
- Não remova nem mude a assinatura de membros públicos dos sistemas em `ctx.sys`; só acrescente.
- Não aloque objetos por quadro em caminhos quentes; reutilize vetores e use pools.
- Todo dano passa por `ctx.sys.combat.applyDamage`.

## Histórico

O jogo foi criado na branch `claude/affectionate-maxwell-w9q8l9` (outra conta do Claude) e continua em
`claude/hopeful-albattani-21svpl`.
