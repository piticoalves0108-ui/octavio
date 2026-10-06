# VisuAlg em 4 horas

Página de estudo para a N1 de Algoritmos (Portugol no VisuAlg): algoritmo e variáveis,
operadores e precedência, `se`/`senao`/`escolha`, `e`/`ou`/`nao` e repetição
(`enquanto`, `repita ... ate`, `para`).

Abra `index.html` no navegador. Todo exemplo roda na própria página com um mini-interpretador
de VisuAlg (Executar, Passo a passo, memória e teste de mesa), os exercícios têm correção
automática e há um simulado no fim.

## Código-fonte (`src/`)

- `visualg.js`: interpretador (léxico, sintaxe, execução, explicação de expressões, correção).
- `app.js`: interface (editor, console, exercícios, perguntas, cronômetro).
- `style.css` e `content.html`: visual e conteúdo das aulas.
- `build.py`: junta tudo em `index.html`.

```sh
python3 estudo-visualg/src/build.py        # gera index.html
node estudo-visualg/src/test-interp.js      # testa o interpretador
node estudo-visualg/src/test-content.js     # roda todos os exemplos, respostas e perguntas da página
```
