# UI Premium (aplicativo desktop)

O protótipo de UI em HTML empacotado como programa de Windows (`.exe`) com [Electron](https://www.electronjs.org/).
Abre numa janela própria, sem navegador, e funciona offline.

A interface continua sendo só visual: desenha o círculo dentro da própria janela e não interage com jogos nem com outros programas.

## Baixar o `.exe` pronto

O GitHub gera o `.exe` sozinho a cada alteração nesta pasta:

1. Abra a aba **Actions** do repositório e entre na execução mais recente de **Build UI Premium (.exe)**.
2. No fim da página, em **Artifacts**, baixe **UI-Premium-Windows** (vem em `.zip`).
3. Extraia o zip e dê dois cliques em `UI-Premium-1.0.0-portable.exe`. Não precisa instalar nada.

Na primeira vez, o Windows pode mostrar "O Windows protegeu o computador", porque o programa não tem assinatura digital paga.
Clique em **Mais informações** e depois em **Executar assim mesmo**.

## Rodar e gerar o `.exe` no seu computador

Precisa do [Node.js](https://nodejs.org/) 22.12 ou mais novo (de preferência a versão LTS atual).

```bash
cd ui-premium-app
npm install          # instala as dependências (só na primeira vez)
npm start            # abre o app para testar
npm run dist:win     # gera dist/UI-Premium-1.0.0-portable.exe
npm run dist:linux   # (opcional, só funciona no Linux) gera dist/UI-Premium-1.0.0.AppImage
```

O `dist:win` funciona tanto no Windows quanto no Linux.

## Onde mexer

| Arquivo | O que é |
| --- | --- |
| `src/index.html` | A interface (HTML, CSS e JavaScript) e o título da janela (tag `<title>`). Edite aqui e rode `npm start` para ver. |
| `main.js` | Cria a janela do programa (tamanho e ícone). |
| `build/icon.ico`, `build/icon.png` | Ícone do `.exe` e da janela. |
| `package.json` | Nome do programa, versão e configuração do empacotamento. |

Para mudar a versão que aparece no nome do arquivo, altere `"version"` no `package.json`.
