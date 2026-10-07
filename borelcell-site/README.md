# Site da Borel Cell (@borelcell)

Site de uma página para a loja de celulares [@borelcell](https://www.instagram.com/borelcell/), com celular 3D interativo, animações de rolagem por toda a página e catálogo com pedido de orçamento direto pelo WhatsApp ou pelo Direct do Instagram.

Funciona em celular, tablet e computador. Não precisa de servidor nem banco de dados: é um site estático.

## O que tem no site

| Seção | O que faz |
|---|---|
| Abertura | Letreiro BOREL CELL desenhado em traço e depois preenchido, contador de 0 a 100% e cortina subindo. |
| Topo | Celular 3D (Three.js) que segue o mouse, gira ao arrastar e troca de cor nas bolinhas. No Android, também responde à inclinação do aparelho. A tela do celular mostra data e hora reais. |
| Faixas | Duas faixas inclinadas com as marcas, que aceleram e invertem o sentido conforme a rolagem. |
| Destaques | O celular 3D gira e muda de tela (câmera, tela de 120 Hz, desempenho, bateria carregando) enquanto você rola. No computador ele cruza de um lado para o outro. No celular a cena fica presa e os cartões trocam embaixo. |
| Catálogo | Filtros por marca com animação (GSAP Flip), busca, cores e memória por modelo, inclinação 3D com brilho nos cards, "Consultar preço" e "+" para a lista. |
| Minha lista | Gaveta lateral que junta vários modelos e monta uma mensagem única de orçamento. Fica salva no navegador. |
| Match | Teste de 4 perguntas que recomenda os 3 modelos que mais combinam, com porcentagem animada. |
| Como funciona | Rolagem horizontal presa no computador (4 passos). No celular vira lista vertical. |
| Compra segura | Checklist interativo (IMEI, bloqueio, bateria, conta anterior, nota fiscal) com anel de progresso. |
| Instagram | O @ gigante se preenche de branco com a rolagem e uma grade leva para o perfil. |
| Dúvidas | Perguntas frequentes em sanfona. |
| Contato | Título com letras animadas, botão circular com texto girando e cartões de contato. |
| Em todo o site | Rolagem suave (Lenis), cursor personalizado e botões magnéticos no computador, barra de progresso, cabeçalho que some ao descer, botão flutuante e avisos. |

Também respeita a opção "reduzir movimento" do sistema e mostra um celular desenhado em SVG quando o navegador não tem WebGL.

## Como ver o site

**Arquivo único:** `borelcell.html` é o site inteiro num arquivo só, com estilos, scripts, 3D, fontes e ícone embutidos. Abre direto no navegador, no PC ou no celular, sem servidor e sem internet. Também dá para subir só ele em qualquer hospedagem. Para trocar os dados da loja nessa versão, procure `window.BOREL_CONFIG` perto do fim do arquivo, ou edite `assets/js/config.js` e rode `npm run build` para gerar o arquivo de novo.

**Versão em pastas:** publique a pasta `borelcell-site/` em qualquer hospedagem estática (veja abaixo). Para ver no próprio computador:

```bash
cd borelcell-site
npx http-server . -p 8080
```

e abra `http://localhost:8080`.

## Como trocar as informações da loja

Tudo fica em **`assets/js/config.js`**. Não precisa rodar build depois: é só salvar o arquivo e recarregar a página.

- `whatsapp`: número com 55 + DDD, só números (ex.: `"5561999998888"`). Enquanto estiver vazio, todos os botões abrem o Direct do Instagram e copiam a mensagem pronta para a pessoa colar. Quando você preencher, os botões passam a abrir o WhatsApp com a mensagem escrita.
- `endereco`: quando `linha` estiver preenchida, aparece o cartão de endereço com o link do mapa.
- `horario`: quando preenchido, aparece o horário e o selo "Aberto agora" / "Fechado agora".
- `pagamento`: resposta da pergunta "Quais são as formas de pagamento?".
- `marcas`: marcas do topo, das faixas e dos filtros.
- `coresDestaque`: cores do celular 3D do topo.
- `instagramFotos`: fotos reais para a grade do Instagram (veja abaixo).

## Como trocar os celulares do catálogo

Edite **`assets/js/catalogo.js`**. Cada modelo tem nome, marca, destaques, cores (nome + cor em hexadecimal), memórias e o tipo de desenho da câmera. O arquivo explica cada campo no topo. A lista que está lá hoje é uma **sugestão inicial** com modelos que existem no mercado: ajuste ao estoque real da loja.

O site não mostra preço de propósito, porque preço de celular muda toda semana. O botão "Consultar preço" manda a mensagem com modelo, cor e memória.

## Como colocar as fotos do Instagram

1. Salve as fotos em `assets/img/instagram/` (JPG ou WebP, de preferência quadradas e com até 1200 px).
2. Liste no `config.js`:

```js
instagramFotos: [
  { src: "assets/img/instagram/post-1.jpg", alt: "Vitrine com iPhones", link: "https://www.instagram.com/p/XXXX/" }
]
```

Enquanto a lista estiver vazia, a grade mostra artes de celulares geradas no código.

## Logo e cores

O letreiro BOREL CELL foi redesenhado em vetor a partir do logo da loja: letras largas e quadradas, com o miolo em fenda e o "CELL" menor alinhado à direita. Em vetor ele fica nítido em qualquer tamanho; a imagem original tem só 147 x 139 px. Ele aparece no cabeçalho, na abertura, na tela do celular 3D, no rodapé e no ícone da aba (o "B"). A paleta do site segue o logo: preto, branco e prata.

A maçã da Apple que aparece em cima do letreiro original ficou de fora de propósito: é marca registrada da Apple, e revendas só podem usá-la com autorização. Se a loja tiver essa autorização, dá para colocar a imagem oficial ao lado do letreiro.

Para mexer no logo e nas cores:

- formato das letras: parâmetros em `tools/wordmark.py`. Rode `python3 tools/wordmark.py` para gerar `src/js/brand.js` e depois atualize os `<svg>` com `logo__svg`, `loader__logo` e `footer__big` em `index.html`;
- ícone da aba: `assets/img/favicon.svg`;
- cores do site: variáveis `--accent`, `--silver`, `--chrome` e companhia no topo de `src/styles/style.css` (depois rode `npm run build`);
- cores do celular 3D do topo: `coresDestaque` em `assets/js/config.js`.

## Para quem for mexer no código

```bash
cd borelcell-site
npm install
npm run build   # gera assets/js/app.js, assets/js/phone3d.js, assets/css/style.css e borelcell.html
npm run dev     # recompila sozinho ao salvar
```

```
borelcell-site/
├── borelcell.html          o site inteiro num arquivo só (gerado pelo build)
├── index.html              estrutura da página
├── assets/                 o que vai para o ar (já compilado)
│   ├── js/config.js        dados da loja (editável)
│   ├── js/catalogo.js      catálogo (editável)
│   ├── js/app.js           gerado pelo build
│   ├── js/phone3d.js       gerado pelo build (carregado sob demanda)
│   ├── css/style.css       gerado pelo build
│   ├── fonts/              Unbounded, Manrope e JetBrains Mono (licença OFL)
│   └── img/                favicon, imagem de compartilhamento e fotos
├── src/
│   ├── js/                 módulos do site (contato, catálogo, lista, match, animações, letreiro…)
│   ├── phone3d/index.js    celular 3D feito no código (Three.js)
│   └── styles/style.css    estilos
├── tools/wordmark.py       gera o letreiro BOREL CELL em vetor (src/js/brand.js)
└── build.mjs               build com esbuild
```

Bibliotecas: [GSAP](https://gsap.com) com ScrollTrigger, SplitText e Flip (licença gratuita da GSAP), [Lenis](https://github.com/darkroomengineering/lenis) (MIT) e [Three.js](https://threejs.org) (MIT). O celular 3D e os desenhos dos aparelhos são feitos no próprio código, sem modelo ou foto de terceiros.

O 3D só é baixado depois da abertura e só renderiza enquanto o topo está na tela. No celular a resolução e a taxa de atualização da tela 3D são menores para economizar bateria.

## Como publicar

Os arquivos compilados já estão na pasta, então dá para publicar sem rodar nada:

- **Vercel**: importe o repositório, defina `borelcell-site` como Root Directory e o preset "Other", sem comando de build.
- **Netlify**: arraste a pasta `borelcell-site` para app.netlify.com/drop.
- **GitHub Pages**: publique a pasta `borelcell-site`.

Depois de ter o domínio, troque `og:image` em `index.html` pelo endereço completo (ex.: `https://borelcell.com.br/assets/img/og.jpg`) para a prévia aparecer no WhatsApp e nas redes.

## O que pesquisei e o que falta confirmar

A rede deste ambiente bloqueia o Instagram, então **não consegui abrir o perfil @borelcell** nem baixar as fotos. Também procurei por "Borel Cell", "borelcell", "Borel Celulares" e variações em buscadores, diretórios de CNPJ, Facebook, TikTok, OLX e Mercado Livre e **não encontrei nenhuma página pública da loja fora do Instagram**: nem site, nem endereço, nem telefone. Por isso o site não inventa nada sobre a loja: onde faltava informação, o campo fica no `config.js` e some do site enquanto estiver vazio.

Antes de publicar, confirme com a loja:

- [ ] Número de WhatsApp (ou se o atendimento é só pelo Direct)
- [ ] Endereço, se tiver loja física, e horário de funcionamento
- [ ] Formas de pagamento
- [ ] Marcas e modelos que a loja realmente vende, com cores e memórias, e se vende seminovos
- [x] Logo (recebido e redesenhado em vetor; confirmar se a loja aprova a versão sem a maçã)
- [ ] Fotos do Instagram com autorização para usar no site
- [ ] Se a loja quer o texto do guia "Compra segura" (cita o site Consulta Aparelho Impedido, da ABR Telecom)
- [ ] Endereço completo da imagem de compartilhamento (`og:image`) depois de publicar
