# Analisador de Sinais 15s

Página única (`index.html`) que mostra quando cada estratégia de análise técnica manda **comprar (CALL)** ou **vender (PUT)** e mede, com preço real segundo a segundo da Binance, quantas vezes ela acerta em 15 segundos.

## Como abrir no celular

https://raw.githack.com/piticoalves0108-ui/octavio/ccr-22f756aa-y5hqda/analisador-sinais-15s/index.html

Abra no navegador (Chrome ou Safari). A página busca o preço direto da Binance; não precisa de cadastro.

## Corretoras

- **Binance**: histórico e ao vivo segundo a segundo.
- **KuCoin**: ao vivo montado negócio por negócio. A KuCoin só guarda velas de 1 minuto, então o histórico do placar vem da Binance (preço praticamente igual). Ativos: BTC, ETH, SOL e XRP. Se a KuCoin bloquear a conexão direta do navegador, a página avisa e oferece trocar para a Binance.

## O que tem na tela

- **Sinal agora**: avisa no segundo em que a estratégia escolhida dispara, com contagem regressiva de 15s e o resultado. Pode tocar som e vibrar.
- **Placar das estratégias**: taxa de acerto de cada estratégia no histórico, faixa provável (95%), comparação com o ponto de equilíbrio do payout, 1ª x 2ª metade do período e resultado em R$.
- **Cara ou coroa**: fica no placar como régua da pura sorte.
- **Onde operar**: em "Opção binária" o resultado usa o payout; em "Binance (com taxa)" usa o quanto o preço andou menos a taxa da compra e da venda (0,1% por ordem, ajustável).

## Estratégias testadas

| Estratégia | Regra |
| --- | --- |
| Confluência RSI + Bollinger | RSI < 30 e preço abaixo da banda → compra; RSI > 70 e acima da banda → venda |
| RSI 14 | cruza abaixo de 25 → compra; acima de 75 → venda |
| Bandas de Bollinger (20, 2) | fura a banda de baixo → compra; a de cima → venda |
| Médias 5/20 | média rápida cruza a lenta para cima → compra; para baixo → venda |
| Tendência forte 15s | variação de 15s maior que 2 desvios do normal → segue a direção |
| 3 velas iguais | 3 velas de 15s da mesma cor → aposta na contrária |

Cada estratégia faz uma operação por vez, entra no fechamento do segundo e confere o preço 15 segundos depois. Preço igual conta como empate.

## Limites

- O preço vem da Binance. A Bric Trade usa o próprio gráfico, que pode ser diferente.
- O tempo para apertar o botão muda o preço de entrada; na prática o resultado tende a ser pior que o do placar.
- Ferramenta de estudo. Não é recomendação de investimento e não garante resultado.
