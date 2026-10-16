# Status — módulo `combat` (combate mágico, armas, projéteis e VFX)

Arquivos: `src/combat/**`, `src/data/abilities.ts`, `src/data/weapons.ts`, testes em `tests/combat.*.test.ts`.
Acréscimos fora da área (permitidos): eventos `ability:unlocked`, `combat:combo`, `combat:parry` e `ultimate:charge` em `GameEvents` (`src/core/EventBus.ts`). Nenhum `SfxId`/`VfxKind` novo foi necessário.

Todas as APIs públicas dos stubs (`Combat`, `Abilities`, `VFX`, `Health`) foram mantidas com as mesmas assinaturas; só houve acréscimos.

## O que foi implementado (funcionando e testado)

### Regras de combate (`Combat.ts`, `Health.ts`, `combatMath.ts`)
- `applyDamage` é o roteamento único de dano: direção a partir da fonte, bloqueio/parry/escudo/i-frames (`Health`), repulsão (chefes recebem 10%), eventos `damage`/`entity:death`/`enemy:killed`/`creature:killed`/`combat:parry`, hit-stop em golpes corpo a corpo do jogador e provocação (fauna neutra atacada fica hostil ao agressor).
- Modificadores: elétrico em alvo molhado ×1,5 (chuva via `env.isRaining()`, água ou marca `wet`), `vulnerable`, `empowered` na fonte e `progression.damageReduction` no jogador.
- `meleeSweep(atacante, origem, frente, alcance, arco, dano, { alreadyHit, maxTargets, verticalReach, filter, modify })`: golpe em arco, mais perto primeiro, com **linha de visão** (não acerta atrás de paredes) e ajuste por alvo (`modify`, usado para crítico condicional).
- `explode(centro, raio, dano, fonte, { falloff, ignoreWalls, filter, hitSource })`: distância até a cápsula do corpo, queda linear com piso de 40%, parede protege.
- `beamAttack(fonte, origem, direção, comprimento, largura, dano, opções)`: feixe que para na primeira parede (ignora árvores), perfura (`pierce` true/false/n), `alreadyHit` para lasers contínuos, `onHit` por alvo, desenho opcional. Usado pela Lança de Energia e por lasers inimigos.
- `chainLightning(fonte, de, saltos, alcance, dano)`: raio em cadeia com linha de visão (Espada de Raios, Sobrecarga).
- Marcas temporárias por entidade (`mark/hasMark/clearMark`: `runeMark`, `chained`, `wet`), `reflectors` (Escudo rank 3), `isWet`, `spawnTrainingDummy`, `stats`.

### Projéteis (`Projectiles.ts`)
- Entidade `Projectile` em pool (máx. 128, `kind: 'projectile'`, fora das consultas espaciais), registrada em `combat.projectileFactory`.
- Velocidade, gravidade (flechas), perseguição com atraso e troca de alvo, perfuração com perda por alvo, explosão (`combat.explode`), explosão ao expirar (bola de fogo), `onHit`, reflexão pelo Escudo Mágico rank 3 (volta ao atirador com +50% de dano).
- Colisão por segmento a cada passo: cenário por `physics.raycast` (água inclusive) e entidades por distância segmento × cápsula — não atravessa alvos em alta velocidade nem paredes.
- Visual por tipo: núcleo (billboard), malha instanciada (flecha, estilhaço, lâmina, onda), rastro, partículas, fumaça e luz. Tipos: `arcaneBolt`, `chargedBolt`, `arcaneOrb`, `voidBolt`, `fireball`, `arrow`, `enemyOrb`, `crystalShard`, `etherealBlade`, `energyWave`, `eclipseOrb`, `lightningBolt`. Outros módulos podem registrar tipos novos com `registerProjectileVisual` / `combat.projectiles.registerVisual`.

### VFX (`VFX.ts`, `vfx/*`)
- Partículas na GPU: instâncias de quad cujo movimento (velocidade, arrasto, gravidade, chão) é calculado no vertex shader a partir do instante de nascimento; a CPU só escreve partículas novas num buffer circular. Dois pools (aditivo e fumaça) dimensionados por `q.maxParticles` (72%/28%).
- Todos os 21 `VfxKind` têm preset (`vfx/presets.ts`), com anéis/luz conforme o tipo.
- Luzes pontuais temporárias em pool fixo (`q.maxDynamicLights`; a contagem nunca muda, sem recompilar shaders), com prioridade por intensidade, clarões e luzes sustentadas que seguem objetos.
- Anéis/ondas de choque, círculos rúnicos girando, clarões no chão e cascas esféricas (explosão/implosão) num único draw call.
- Feixes, correntes e raios (polilinha irregular com ramificações, cintilação em 2 variantes defasadas) num único draw call; feixes sustentados por handle (`sustainedBeam`).
- Telegraphs no chão (círculo, cone, linha, anel) com preenchimento animado até o golpe, grade que acompanha o terreno e o topo de plataformas, e camada sem teste de profundidade para continuar legível através da grama. Vermelho = imbloqueável; laranja = bloqueável. `cancel()` some com o ataque interrompido.
- Rastros: fita seguindo objeto (projéteis) e fita entre base e ponta da arma (golpes), envelhecendo por tempo.
- Dissolução na morte (ruído + borda brilhante, sem tocar nos materiais compartilhados) com brasas subindo.
- Tudo usa o relógio do jogo (respeita pausa, hit-stop e câmera lenta).
- Qualidade em tempo real: `settings:changed` reduz/restaura o limite de partículas (até o alocado no início) e a densidade dos presets.

### Controle de combate do jogador (`PlayerCombat.ts`, atualizado por `Abilities`)
- LMB: combos por tipo de arma com janela de tempo e buffer — espada 3 golpes, adaga 4, lança 3 (estocadas longas + varredura), manopla 3, cajado 2 (corpo a corpo só com inimigo colado).
- Cajado/artefato: disparo arcano de longo alcance como ataque básico (65 m, 0,38 s); segurar LMB carrega disparo explosivo (×2–3,6).
- Ataque carregado (segurar LMB): ×1,8–3 do dano, alcance/arco maiores, repulsão forte, custa energia.
- RMB: bloqueio frontal (−70%, gasta 0,4 de energia por ponto evitado; sem energia a guarda quebra e atordoa), janela de parry de 0,22 s (anula o dano, atordoa o atacante, devolve energia, Carga Arcana, abre contra-ataque crítico ×1,5 por 1,6 s).
- Quadros de impacto sincronizados com a duração devolvida por `player.playAnimation`; `lockMovement`, `setBlocking`, `isBusy`, avanço do corpo (lunge).
- Dano = arma × `meleePower`/`spellPower` × aprimoramento × golpe, crítico (`critChance + critBonus`, `critMultiplier`), hit-stop por tipo de golpe, VFX/sons de impacto, roubo de vida (`lifeSteal`), energia por acerto.
- No voo: só magias e disparo (cajado; com outra arma, um raio fraco da mão).
- Arma equipada: `inventory.equippedWeaponDefId()` (null → Cajado Ancestral), reage a `equip:changed` trocando modelo (`player.setWeaponModel`) e comportamento; `previewWeapon(id)` para prévias 3D.

### Habilidades (`Abilities.ts`, `abilityEffects.ts`, `abilityVisuals.ts`, `data/abilities.ts`)
- As 10 do design com nome, descrição, ícone, custo, recarga, conjuração, alcance, dano, tipo, raio, estados, nível de desbloqueio e valores por rank 1–3.
- Bola Arcana (explode no impacto), Lança de Energia (segurar para carregar, feixe perfurante até a parede), Explosão Rúnica (área + repulsão + marca rúnica), Correntes Arcanas (enraízam até 3–5 alvos no cone; chefes ficam lentos), Escudo Mágico (absorve 45/70/100; rank 3 reflete projéteis), Teleporte Curto (destino validado por raycast + `groundHeight` + cápsula, i-frames), Tempestade de Raios (nuvem, raios em vários inimigos ao longo do tempo, raio extra na chuva), Lâminas Etéreas (orbitam e perseguem, aplicam vulnerável), Fenda Dimensional (puxa, dano contínuo, implode), Forma Ascendente (R).
- Combinações reais: Estilhaçar (Lança em enraizado: +60% e atordoa), Sobrecarga (Tempestade em alvo com marca rúnica: raio em cadeia), Colapso Dimensional (Explosão Rúnica dentro da Fenda: ×1,8, raio ×1,3, atordoa), elétrico em molhados ×1,5. Emitem `combat:combo`.
- Carga Arcana (0–100) acumulada causando dano (+0,12/ponto, +3/abate, +8/parry); a Forma Ascendente exige carga cheia e a consome: 15–20 s de +40–60% de poder mágico, regeneração de vida, recargas −50%, +30 de energia/s (cobre todo o custo do voo, que fica efetivamente gratuito), aura; seta `abilities.ascended`.
- Custos/recargas via `progression` (`spellPower`, `cooldownReduction`, `shieldPower`); conjuração interrompida por esquiva/atordoamento devolve recarga curta.
- Bola Arcana no início; as demais por nível (ouve `level:up`, ocupa slot livre, notifica `ui:notify` e `ability:unlocked`). Emite `ability:cast`/`ability:fail`. Saveable com validação (ids, ranks 1–3, slots sem a suprema, carga).

### Armas (`data/weapons.ts`, `weaponBehaviors.ts`, `weaponModels.ts`)
- 15 armas, 6 tipos (espada, adaga, lança, cajado, tecnomágica, artefato) e 6 raridades com cores (comum → mítica), com dano, velocidade, alcance, arco, tipo de dano, crítico, postura, escala, nível requerido, valor, descrição e efeito especial. Exporta `WEAPONS`, `WeaponDef`, `RARITIES`, `COMBOS`, `getWeaponDef`, `upgradeMultiplier`.
- Comportamentos reais (ganchos `onEquip/onSwing/onBeforeHit/onHit/onSwingEnd/onHeavyRelease/onShoot/onKill/update`): Cajado Ancestral (4 acertos → disparo triplo), Espada de Raios (descargas em cadeia), Lâmina Vampírica (cura 6%/20% abaixo de 50% de vida, abates curam), Cajado do Vazio (disparos atravessam até 4), Espada Solar (acumula energia e libera golpe explosivo), Lâmina Temporal (`timeSlow`; carregado = pulso), Cajado do Dragão (bolas de fogo; carregado = rajada em cone com queimadura), Espada Cyber-Rúnica (alterna físico/elétrico; finalizador dispara onda), Manopla Tecnomágica (pulso de choque; carregado = impacto no chão), Orbe do Eclipse (esferas que perseguem; carregado = pulso gravitacional), Lança de Cristal (estilhaços), Espada Rúnica (+40% contra constructos/corrompidos), Adaga Arcana (crítico garantido em alvo enraizado/atordoado).
- Modelos procedurais por tipo e variante (rúnica, serrilhada, curva, cristal, dragão, vazio, tecnológica, solar, temporal, orbe), brilho por raridade e aura em lendárias/míticas; 2 malhas por arma, cache por id.

### Boneco de treino (`TrainingDummy.ts`)
- Inimigo de teste com vida/facção que demonstra o uso da API pela IA: telegraph → golpe em cone, slam em círculo, projéteis (`arrow`/`enemyOrb`/`fireball`/`crystalShard`), laser contínuo; reage a repulsão/puxão/raiz/lentidão e se dissolve na morte. `combat.spawnTrainingDummy(pos, opts)`.

## API pública (acréscimos que outros módulos podem usar)
- `ctx.sys.combat`: `meleeSweep(..., { alreadyHit, maxTargets, verticalReach, filter, modify })`, `explode(..., { falloff, ignoreWalls, filter, hitSource })`, `beamAttack(fonte, origem, dir, comp, largura, dano, { pierce, alreadyHit, stopAtWalls, visual, color, visualDuration, filter, onHit })` → `{ hits, end, blocked }`, `chainLightning(...)`, `spawnProjectile(spec)` (campos extras: `pierceFalloff`, `homingDelay`, `retarget`, `ignoreTrees`, `visualScale`), `spawnTrainingDummy(pos, opts)`, `hitStop(s)`, `mark/hasMark/clearMark`, `isWet`, `reflectors`, `projectiles` (`count`, `registerVisual`, `stats`), `stats`.
- `ctx.sys.vfx`: além do contrato (`burst`, `ring`, `beam`, `lightning`, `flash`, `telegraph`, `attachTrail`): `shell`, `runeCircle`, `groundFlash`, `chain`, `sustainedBeam(cor, largura, estilo)` (handle `set(a,b)`/`cancel()`), `bladeTrail`, `ribbonTrail`, `sustainedLight`, `dissolve(obj, { duration, color, height, onDone })`, `sprite`, `spark`, `puff`, `clear`, `applyQuality`, `stats()`, `uTime`.
- `ctx.sys.abilities`: `currentCast()`, `ascendedTime/ascendedDuration`, `spellPower()`, `spellPowerMultiplier()`, `addUltimateCharge(n)`, `syncUnlocks(nível, notificar)`, `debugInfo()`, `combat` (`PlayerCombat`: `equip(id)`, `previewWeapon(id)`, `isAttacking()`, `weaponId`, `def`, `comboStep`, `charge`, `riposteT`, `debugInfo()`), `effects` (`activeZones()`, `stats`).
- `data/weapons.ts`: `WEAPONS`, `WEAPON_IDS`/`getWeaponDef`, `WeaponDef`, `RARITIES`, `WEAPON_TYPE_NAMES`, `COMBOS`, `HEAVY_ATTACK`, `STAFF_SHOT`, `BLOCK`, `WEAPON_UPGRADE`, `upgradeMultiplier`, `DEFAULT_WEAPON_ID`.
- `data/abilities.ts`: `ABILITIES`, `ABILITY_IDS`, `AbilityDef`, `abilityValue`, `ULTIMATE`, `SPELL_COMBOS`, `ABILITY_FAIL_TEXT` (texto das falhas para a UI).
- Eventos: `ability:unlocked`, `combat:combo`, `combat:parry`, `ultimate:charge` (além de `ability:cast`/`ability:fail`/`player:attack`/`damage`).

## Pendente / limitações conhecidas
- **Inventário ainda é stub** (`equip` não faz nada): a troca de arma pelo jogador depende do módulo `rpg/Inventory` implementar `equip`/`equippedWeaponDefId` e emitir `equip:changed` (`slot: 'weapon'`). O combate já reage a isso; nos testes a arma é trocada com `abilities.combat.equip(id)`.
- **IA real não existe ainda**: os inimigos de teste são `TrainingDummy` (boneco com ataques simples). A IA deve usar as mesmas APIs (`meleeSweep`, `spawnProjectile`, `explode`, `beamAttack`, `vfx.telegraph`, `vfx.dissolve`) e respeitar `health.moveMultiplier()`/`actionMultiplier()`/`canAct()` (raiz, lentidão temporal, atordoamento) e `velocity` (repulsão e puxão da Fenda), como o boneco faz.
- **UI**: ícones das habilidades (`def.icon`/`glyph`/`color`), barra de conjuração (`abilities.currentCast()`), recargas (`cooldownFraction`), Carga Arcana (`ultimate:charge`), nomes de combinações (`combat:combo`) e menu de habilidades (`setSlot`/`upgrade`) dependem do módulo de UI.
- **Voo na Forma Ascendente**: o custo do voo continua sendo cobrado pelo jogador; a Forma Ascendente devolve 30 de energia/s, o que cobre o voo (validado: a energia não cai). Um voo literalmente sem custo exigiria o `Player` checar `abilities.ascended`.
- **Qualidade em tempo real**: o limite de partículas acompanha `q.maxParticles` só até o tamanho alocado no início; o número de luzes do pool e o tamanho dos outros pools (segmentos, anéis, rastros) ficam como no início (mudar o número de luzes recompilaria todos os shaders).
- **Ranks 2–3** sobem por `abilities.upgrade(id)`; ainda não há fonte de pontos no jogo (talentos/progressão devem chamar).
- A Fenda e a Tempestade são posicionadas pelo alvo travado ou por `player.getAimPoint(alcance)`; não há marcador de mira no chão antes de conjurar (seria trabalho da UI/câmera).
- Efeitos foram avaliados em capturas renderizadas por software (SwiftShader); FPS absoluto e a aparência exata numa GPU real não foram medidos.

## Testes realizados

### Tipos e testes unitários
- `npx tsc --noEmit`: **0 erros** no projeto inteiro (inclui os arquivos deste módulo).
- `npx vitest run tests/combat`: **35/35** em 3 arquivos:
  - `combat.math.test.ts` (13): colisão segmento × cápsula, fórmulas de dano/crítico, recarga (redução limitada a 50%), carga, combos, Carga Arcana, geração de raios;
  - `combat.data.test.ts` (9): ≥12 armas, todos os tipos/raridades, textos em pt-BR, comportamentos especiais, combos com animações existentes, 10 habilidades com ranks;
  - `combat.rules.test.ts` (13, novo): `Combat` com contexto falso — arco/alcance/hostilidade/parede do `meleeSweep`, `alreadyHit`, `maxTargets`, `modify` (crítico condicional numa cópia), queda e parede na `explode`, perfuração/parede/ordem do `beamAttack`, molhado ×1,5 e chuva, vulnerável, parry + eventos de morte, provocação de neutros e raio em cadeia.

### Teste de fumaça
- `node scripts/smoke.mjs --port=4193 --out=.smoke/combat --shot=bench-results/combat-smoke.png`: estado `playing`, **0 erros e 0 avisos de console**. Captura: `bench-results/combat-smoke.png`.

### Checagens Playwright (`/tmp/claude-0/combat-checks/`, Chromium + SwiftShader, preset médio)
- `core.mjs` — **20/20**: cajado acerta a 12 m (12 = 12 × spellPower); combo da espada 0→1→2 com dano 16 / 17,6 / 26,4 e reinício após a janela; não acerta a 4,5 m (alcance 2,3 m) nem **atrás de parede**; projétil para na parede; carregado 16 → 48 (×3) gastando energia; parry anula o dano e atordoa o atacante; bloqueio 20 → 6 (−70%) gastando energia; guarda quebra sem energia; contra-ataque crítico (36); no voo com espada o LMB só dispara (8 de dano, 0 golpes); flechas com gravidade acertam o jogador (100 → 86); laser contínuo de inimigo com `beamAttack` por tick (100 → 88); telegraph de círculo seguido do impacto (100 → 85).
- `abilities.mjs` — **35/35**: só a Bola Arcana no início; falhas `locked`/`energy`; `level:up` desbloqueia e notifica ("Nova habilidade: Lança de Energia [2]"); Bola Arcana explode e fere 3 alvos (26 / 14 / 11,4); recarga com fração para a UI; Lança carregada perfura 3 em linha (72 cada; toque rápido 35,1) e para na parede (3º protegido); Correntes enraízam (chefe fica lento) e o alvo não se desloca; Estilhaçar (+60%, atordoa); Explosão Rúnica fere os 3 próximos (21,3 / 19,3 / 15,1), ignora o distante, repele (2,5 → 4,8 m) e marca; Tempestade com 20 raios em 3 alvos; Sobrecarga encadeia 2 alvos; molhado e chuva 20 → 30; Lâminas Etéreas perseguem 3 alvos (inclusive atrás) e aplicam vulnerável (20 → 25); Fenda puxa (5 → 1,3 m), 8 pulsos e implosão; Colapso Dimensional; Escudo absorve 45 (vida intacta); rank 3 reflete 2 projéteis e acerta o atirador; Teleporte de 11 m com i-frames de 0,45 s e parada antes da parede (3,95 m com parede a 5 m); Carga Arcana +12 com 100 de dano; Forma Ascendente: +40% (×1,4), consome a carga, Explosão 8 s → 4 s, regeneração, energia não cai no voo, termina após 15 s; save valida dados ruins.
- `weapons.mjs` — **21/21**: modelos das 15 armas; Espada de Raios encadeia (2 descargas em 4 golpes); Lâmina Vampírica cura 1,74 (6%) e 8,18 (20% com vida baixa); Cajado do Vazio atravessa 3 (17 / 14,5 / 12,3); Espada Solar acumula 84 de energia em 7 golpes e libera a explosão (38,4 + queimadura); Lâmina Temporal deixa as ações do alvo a 55% e o carregado faz o pulso; Cajado do Dragão explode (22 / 8,8 + queimadura) e a rajada em cone acerta à frente e não atrás; Cyber-Rúnica alterna físico/elétrico e a onda acerta a 9 m (32,5); Manopla: pulso de choque a 3 m e impacto no chão com repulsão; Orbe do Eclipse: 3 esferas acertam (14,4 cada) e o carregado puxa e deixa vulnerável; Lança de Cristal: estocadas longas e 3 estilhaços que acertam a 12 m; Cajado Ancestral: o 5º disparo se divide em 3; adaga com combo de 4 golpes e crítico garantido em alvo enraizado (um único número: 12,8 = 8,5 × 1,5).
- `stress.mjs` — **6/6**: 40 inimigos atacando (projéteis, slam, cone, laser) + Tempestade, Fenda, Lâminas, Bola Arcana, Explosão Rúnica e 8 projéteis a cada 0,7 s: custo **abilities + combat + vfx ≈ 0,30–0,44 ms/quadro** em duas execuções (abilities 0,12–0,22; combat 0,10–0,14; vfx 0,08; média móvel); pools dentro dos limites (≤ 1500 partículas no médio, 4 luzes, 0 projéteis rejeitados); troca de qualidade em tempo real 1500 → 600 → 1500 partículas.
- Sem erros de console do módulo em todas as execuções. A bateria final (smoke + core + abilities + weapons + stress) rodou de ponta a ponta sobre o mesmo build final: 0 erros, 20/20, 35/35, 21/21 e 6/6.

### Custo de CPU (ms/quadro, média móvel do `perf.report().systems`)
| Cenário | abilities | combat | vfx |
|---|---|---|---|
| combate leve (core/abilities/weapons) | 0,02 | 0,01–0,02 | 0,01–0,02 |
| estresse (40 inimigos + todas as zonas) | 0,12–0,22 | 0,10–0,14 | 0,08 |

FPS absoluto não é representativo (renderização por software); a meta de 40–50 FPS depende sobretudo da renderização — o combate inteiro custa menos de 0,5 ms de CPU por quadro no pior caso testado.

### Capturas (avaliadas visualmente)
`bench-results/combat-*.png`: `orb-voo`, `orb-explosao`, `tempestade`, `fenda`, `fenda-implosao`, `ascendente-ativacao`, `ascendente`, `lanca-carregando`, `lanca`, `explosao-runica`, `correntes`, `escudo`, `laminas`, `telegraphs`, `espada-solar-golpe`, `espada-solar-explosao`, `espada-raios`, `cajado-dragao`, `dissolucao`, `armas`, `smoke`.
Ajustes feitos a partir delas nesta etapa: reflexo procedural no metal das armas (antes apareciam pretas contra o céu) e limpeza dos efeitos entre cenas do script de capturas.
