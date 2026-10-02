# Porango Pneus: site

Site da **Porango Pneus** (loja de pneus em Brasília - DF), no conceito **"Aderência"**: asfalto escuro, borracha fosca, faixa amarela de sinalização e um único pneu 3D como protagonista. A conversão principal é o botão **"Cotar meu pneu"**, que abre o WhatsApp com a mensagem pronta (e com a medida, quando o cliente usa o seletor).

> **Este é o modo prévia.** Tudo que ainda depende do dono da loja está marcado com `{{CONFIRMAR: ...}}` e aparece destacado em amarelo na página. A prévia sai com `noindex`. Veja [Marcadores CONFIRMAR](#marcadores-confirmar) e [Publicar](#publicar-modo-prévia--modo-publicação).

---

## Como rodar

Requisitos: Node 20 ou mais novo e npm.

```bash
cd porango-pneus
npm install
npm run dev          # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (antes roda `npm run confirmar`) |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint |
| `npm run confirmar` | Lista todos os marcadores `{{CONFIRMAR}}` que faltam |
| `npm run capturar` | Grava o pôster (AVIF/JPG) e o vídeo de reserva (WebM/MP4) a partir da própria cena 3D. Precisa do site rodando e de `ffmpeg` |

Variáveis de ambiente (copie `.env.example` para `.env.local`):

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_MODO_PREVIA` | `false` para publicar. Padrão: prévia (marcadores visíveis, `noindex`) |
| `NEXT_PUBLIC_SITE_URL` | Domínio final, ex.: `https://www.seudominio.com.br` (canonical, sitemap, Open Graph) |
| `NEXT_PUBLIC_GA_ID` | Opcional. ID do GA4 (`G-XXXXXXX`), além do Vercel Analytics |
| `INSTAGRAM_ACCESS_TOKEN` | Opcional. Puxa a galeria direto do Instagram (veja abaixo) |

---

## Estrutura de pastas

```
porango-pneus/
├─ public/
│  ├─ images/hero/          pôster do hero (AVIF + JPG, desktop e celular), gravado da cena 3D
│  ├─ images/galeria/       fotos da loja (com autorização do cliente)
│  └─ video/                vídeo curto em loop da cena (WebM + MP4) para aparelhos muito fracos
├─ scripts/
│  ├─ confirmar.mjs         lista os {{CONFIRMAR}}; bloqueia o build de publicação se sobrar algum
│  └─ capturar-cena.mjs     grava pôster e vídeo da própria cena (Playwright + ffmpeg + sharp)
└─ src/
   ├─ content/
   │  ├─ site.ts            DADOS DO NEGÓCIO: nome, endereço, contato, horário, serviços, marcas, galeria
   │  └─ textos.ts          textos fixos: hero, partes da medida, camadas do pneu, FAQ
   ├─ app/                  rotas (App Router)
   │  ├─ layout.tsx         fontes, metadata, JSON-LD, preloader, header/footer, analytics
   │  ├─ page.tsx           home (as 8 seções + vista explodida + alinhamento)
   │  ├─ servicos/          página de serviços (+ imagem OG própria)
   │  ├─ guia-do-pneu/      guia: como ler a medida, tabelas de índices, TWI, calibragem, rodízio
   │  ├─ not-found.tsx      404 ("Pneu furado")
   │  ├─ sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg
   │  └─ _fontes/           TTFs (OFL) usados só para gerar as imagens de Open Graph
   ├─ components/
   │  ├─ three/             CENA 3D (chunk separado, só carrega no cliente)
   │  │  ├─ Palco.tsx       decide pôster / Canvas / vídeo, liga a rolagem à cena
   │  │  ├─ Cena.tsx        <Canvas>, ambiente de estúdio, PerformanceMonitor, qualidade
   │  │  ├─ Diretor.tsx     coreografia por rolagem: entrada com mola, travessia, zoom no flanco, explosão
   │  │  ├─ Roda.tsx        pneu + roda de liga (materiais e camadas internas)
   │  │  ├─ geometria.ts    geometria procedural em proporção real de um 175/70 R14
   │  │  ├─ texturas.ts     normal map da banda, letras do flanco, trama das cintas (tudo em canvas)
   │  │  ├─ percurso.ts     caminho do pneu no chão (o giro acompanha a distância: rola sem patinar)
   │  │  ├─ Asfalto.tsx     chão em shader + marca de pneu desenhada em tempo real num render target
   │  │  ├─ Alinhamento3D.tsx  duas rodas com laser (antes/depois)
   │  │  ├─ Efeitos.tsx     Bloom, Depth of Field, Noise, Vignette, SMAA (só desktop)
   │  │  └─ Poeira.tsx, estado.ts
   │  ├─ sections/          seções da home (Hero, Medida, Seletor, Anatomia, Servicos, Alinhamento,
   │  │                     Marcas, PorQue, Galeria, ComoChegar, Faq) e peças das páginas internas
   │  ├─ fallbacks/         SVGs que mostram o mesmo conteúdo sem WebGL (flanco, corte do pneu, alinhamento, mapa)
   │  ├─ motion/            preloader (velocímetro), smooth scroll, títulos com SplitText, botão magnético,
   │  │                     marquee, card com tilt, cortina de transição, revelar ao rolar
   │  ├─ layout/            Header, Footer, Logo, botão flutuante do WhatsApp
   │  └─ ui/                shadcn/ui (dialog do lightbox), ícones, marcador de pendência, links de contato
   └─ lib/                  links de WhatsApp/tel/mapa, JSON-LD, medição de cliques, GSAP sob demanda,
                            estado compartilhado DOM ↔ 3D (palco.ts), tabelas de medida, Instagram
```

---

## Como trocar textos e fotos

**Textos e dados do negócio:** tudo fica em `src/content/site.ts`. Endereço, telefone, WhatsApp, horário, serviços, marcas, "por que a Porango" e galeria saem dali para a página, para o JSON-LD e para os botões. Os textos explicativos (partes da medida, camadas do pneu, FAQ) ficam em `src/content/textos.ts`.

- **WhatsApp:** só números com DDD, sem o 55 (`"61999998888"`). Enquanto estiver pendente, os botões abrem o Direct do Instagram.
- **Horário:** preencha `horarios` (vai para a página e para o `openingHoursSpecification`). Enquanto estiver vazio, aparece `horarioTexto`.
- **Serviços:** troque `confirmado: false` para `true` nos que a loja faz e **apague** os que ela não faz. A seção de alinhamento e balanceamento em 3D só aparece se um dos dois estiver confirmado.
- **Marcas:** escreva só os nomes, ex.: `["Marca X", "Marca Y"]`. Não use logotipo de fabricante sem autorização.
- **Logo:** troque o componente `src/components/layout/Logo.tsx` por uma `<Image src="/images/logo.svg" ... />`.

**Fotos da galeria:**

1. Com autorização do cliente, salve as fotos do Instagram em `public/images/galeria/` (JPG ou WebP, lado maior com 1600 px já basta; o `next/image` gera AVIF/WebP no tamanho certo).
2. Em `site.ts > galeria`, preencha `src` (ex.: `/images/galeria/fachada.jpg`), um `alt` que descreva a foto e, se quiser, o link do post em `post`.
3. Enquanto `src` estiver vazio, aparece um placeholder na mesma proporção (4:5 ou 1:1) descrevendo a foto ideal.

**Galeria puxada direto do Instagram (opcional):** com uma conta profissional do Instagram, gere um token da *Instagram API with Instagram Login* (permissão `instagram_business_basic`) e defina `INSTAGRAM_ACCESS_TOKEN` na Vercel. O site busca os 6 últimos posts e revalida a cada hora (`src/lib/instagram.ts`). O token de longa duração vale 60 dias e precisa ser renovado.

**Pôster e vídeo do hero:** depois de mexer na cena 3D, rode `npm run dev` numa aba e `npm run capturar` em outra. O script grava o pôster com o mesmo enquadramento da cena e um loop de 6 s.

---

## Marcadores CONFIRMAR

Rode `npm run confirmar` para a lista sempre atualizada, com arquivo e linha. Hoje são estes:

| Marcador | Onde |
|---|---|
| `{{CONFIRMAR: grafia exata do nome e logo}}` | `src/content/site.ts`, `src/components/layout/Logo.tsx` |
| `{{CONFIRMAR: endereço completo}}` | `site.ts > negocio.endereco.logradouro` |
| `{{CONFIRMAR: bairro}}` | `site.ts > negocio.endereco.bairro` (vira o título da home: "Pneus em [bairro] - DF") |
| `{{CONFIRMAR: CEP}}` | `site.ts > negocio.endereco.cep` |
| `{{CONFIRMAR: latitude}}` / `{{CONFIRMAR: longitude}}` | `site.ts > negocio.geo` (JSON-LD e link do mapa) |
| `{{CONFIRMAR: telefone com DDD}}` | `site.ts > negocio.contato.telefone` (link `tel:`) |
| `{{CONFIRMAR: DDD e número do WhatsApp}}` | `site.ts > negocio.contato.whatsapp` (todos os botões "Cotar meu pneu") |
| `{{CONFIRMAR: horário de funcionamento}}` | `site.ts > horarioTexto` / `horarios` |
| `{{CONFIRMAR: quais serviços a loja oferece (...)}}` | `site.ts > servicos` (campo `confirmado`) |
| `{{CONFIRMAR: venda, troca ou reparo de rodas}}` | `site.ts > servicos` (Rodas) |
| `{{CONFIRMAR: quais serviços de suspensão a loja faz}}` | `site.ts > servicos` (Suspensão) |
| `{{CONFIRMAR: quais serviços de freio a loja faz}}` | `site.ts > servicos` (Freios) |
| `{{CONFIRMAR: marcas de pneu que a loja trabalha}}` | `site.ts > marcas` |
| `{{CONFIRMAR: como é o atendimento (...)}}` | `site.ts > diferenciais` |
| `{{CONFIRMAR: garantia dos pneus e dos serviços}}` | `site.ts > diferenciais` |
| `{{CONFIRMAR: formas de pagamento e parcelamento}}` | `site.ts > diferenciais` |
| `{{CONFIRMAR: vende pneu novo, remold ou seminovo}}` | `site.ts > diferenciais` |
| `{{CONFIRMAR: atende carro, moto, caminhonete ou caminhão}}` | `site.ts > diferenciais` |
| `{{CONFIRMAR: fotos da loja e da equipe, com autorização de uso}}` | `site.ts > galeria` |
| `{{CONFIRMAR: a montagem é feita na hora?}}` | `src/content/textos.ts > hero.complemento` |
| `{{CONFIRMAR: domínio próprio do site}}` | `src/lib/site-url.ts` (defina `NEXT_PUBLIC_SITE_URL`) |

Nada de preço, avaliação, prêmio, número de clientes ou depoimento foi inventado. Os números que aparecem no site são técnicos e gerais (1,6 mm do TWI, tabela de índice de carga e de velocidade, 175/70 R14 84T como exemplo de leitura).

---

## Publicar: modo prévia × modo publicação

| | Prévia (padrão) | Publicação (`NEXT_PUBLIC_MODO_PREVIA=false`) |
|---|---|---|
| Marcadores `{{CONFIRMAR}}` | aparecem destacados | o build **falha** se sobrar algum |
| Itens com `confirmado: false` | aparecem com selo "a confirmar" | não aparecem |
| Indexação | `noindex` + `robots.txt` bloqueando | liberada, com sitemap |

Fluxo: preencher `site.ts` com o dono → `npm run confirmar` até zerar → definir `NEXT_PUBLIC_MODO_PREVIA=false` e `NEXT_PUBLIC_SITE_URL` → deploy.

---

## Deploy na Vercel com domínio próprio

1. **Suba o código para o GitHub** (este repositório já serve).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório. Em **Root Directory**, escolha `porango-pneus`. O framework (Next.js) é detectado sozinho; build `npm run build`, saída padrão.
3. Em **Settings → Environment Variables**, cadastre para *Production*:
   - `NEXT_PUBLIC_SITE_URL` = `https://www.seudominio.com.br`
   - `NEXT_PUBLIC_MODO_PREVIA` = `false` (só quando todos os marcadores estiverem resolvidos)
   - opcionais: `NEXT_PUBLIC_GA_ID`, `INSTAGRAM_ACCESS_TOKEN`

   Para mostrar a prévia ao dono, deixe `NEXT_PUBLIC_MODO_PREVIA` sem definir em *Preview*.
4. Clique em **Deploy**. Cada push na branch principal publica de novo; cada branch/PR ganha uma URL de prévia.
5. **Domínio:** em **Settings → Domains**, adicione `seudominio.com.br` e `www.seudominio.com.br`. A Vercel mostra os registros DNS:
   - domínio raiz (`@`): registro **A** apontando para o IP indicado pela Vercel;
   - `www`: **CNAME** para o endereço `cname` indicado pela Vercel.

   Cadastre esses registros no Registro.br (ou onde o domínio estiver). Para usar os nameservers da Vercel, troque os DNS do domínio pelos indicados no painel. O HTTPS é emitido sozinho. Escolha qual dos dois (com ou sem `www`) é o principal; o outro redireciona.
6. **Analytics:** em **Analytics**, clique em *Enable*. Os cliques são medidos como eventos personalizados (`cotar_pneu`, `agendar_servico`, `whatsapp_flutuante`, `ligar`, `como_chegar`, `instagram`), com a origem do clique (hero, seletor, card, etc.). Eventos personalizados exigem plano Pro; no Hobby, use o GA4 via `NEXT_PUBLIC_GA_ID`.
7. Depois de publicar: envie o sitemap (`https://seudominio/sitemap.xml`) no Google Search Console e coloque o link do site no perfil do Google e na bio do Instagram.

---

## 3D: origem e licença dos modelos

**Não há modelo baixado.** Pneu, roda, camadas internas, asfalto e rodas do alinhamento são **geometria procedural feita no código** (`src/components/three/geometria.ts`), em proporção real de um 175/70 R14 (largura 175 mm, flanco 122,5 mm, aro de 355,6 mm), com `LatheGeometry` (perfil do pneu e do tambor da roda) e `ExtrudeGeometry` (raios). As texturas (normal map da banda de rodagem, letras do flanco, trama das cintas de aço, cordonéis da carcaça) são desenhadas em `<canvas>` em tempo de execução (`texturas.ts`). O ambiente de estúdio é feito com `Lightformer` do drei, sem HDRI baixado. **Licença:** código próprio do projeto, sem atribuição de terceiros.

Por isso não há `.glb` nem KTX2 no projeto: o 3D inteiro pesa só o código. Se quiser trocar por um modelo fotográfico:

- Use um modelo CC0 (Poly Pizza) ou CC-BY (Sketchfab, com crédito no rodapé) e registre aqui a URL, o autor e a licença.
- Comprima com [glTF-Transform](https://gltf-transform.dev): `npx @gltf-transform/cli optimize pneu.glb pneu-otimizado.glb --compress meshopt --texture-compress ktx2`.
- Carregue com `useGLTF` do drei (o `useGLTF` já configura Draco/Meshopt) e o `KTX2Loader` (`useKTX2`), substituindo `<Roda>`.

**Escolhas da especificação que ficaram de fora, e por quê:**

- **`@react-three/rapier`:** a única física do conceito é a parada do pneu com balanço. Ela é uma mola amortecida integrada em passos fixos no `Diretor.tsx` (umas 10 linhas), sem carregar o motor de física em WASM, que pesa algumas centenas de kB.
- **`<AccumulativeShadows>`:** serve para cenas paradas (acumula quadros). Aqui o pneu rola e gira o tempo todo, então a sombra é `<ContactShadows>`, que acompanha o pneu.

Fontes das imagens de Open Graph (`src/app/_fontes`): Chakra Petch e Red Hat Text, SIL Open Font License 1.1.

---

## Como a experiência 3D funciona

Um único `<Canvas>` fixo atrás da página. As seções do pneu são transparentes; as outras têm fundo sólido e cobrem o Canvas. A rolagem vira uma linha do tempo (`src/lib/palco.ts`), e o `Diretor` interpola poses de câmera entre marcos:

1. **Hero:** o pneu entra rolando da lateral e para com balanço de mola (integração de mola amortecida). O mouse inclina o pneu e gira a luz principal, e o brilho corre pelos sulcos do normal map. No celular: arrastar gira o pneu, e um botão opcional liga o giroscópio.
2. **Travessia:** o pneu rola até a seção da medida. O giro acompanha a distância (sem patinar), e cada trecho rolado é carimbado com a pegada da banda num render target que o shader do asfalto lê: a marca fica no chão.
3. **Leia a medida:** zoom no flanco; a parte ativa de `175/70 R14 84T` acende em amarelo (mapa emissivo + Bloom) junto com a legenda.
4. **Seletor:** a medida escolhida aparece gravada no flanco 3D, e o botão manda essa medida pronta para o WhatsApp.
5. **Vista explodida:** banda, cintas de aço, carcaça, flanco e talão se separam ao longo do eixo, um acende por vez.
6. **Alinhamento:** duas rodas com laser; "antes" fora de ângulo e tremendo, "depois" paralelas e com contrapeso.

**Performance:**

- **3D fora do carregamento inicial.** O Canvas vem por `next/dynamic` (`ssr: false`). No desktop, carrega quando o hero está visível e o navegador fica ocioso; no toque, no primeiro gesto. Até lá fica o pôster AVIF com o mesmo enquadramento da cena.
- **Render só quando precisa.** `frameloop="demand"` (só desenha quando algo muda), render pausado fora dos atos 3D e `dpr` em [1, 1,75].
- **Qualidade adaptativa.** O `PerformanceMonitor` mede apenas onde a animação é contínua (hero e alinhamento), porque no modo "demand" as pausas pareceriam FPS baixo. Ele baixa a qualidade e, se nem a baixa segurar, troca o Canvas pelo vídeo.
- **Celular mais leve.** Sem pós-processamento e com menos partículas. Aparelho com 2 núcleos ou menos, 2 GB de memória ou menos, ou com economia de dados ligada já começa no vídeo.
- **Motion carregado sob demanda.** GSAP, ScrollTrigger, SplitText e Lenis chegam na primeira interação (rolar, tocar, mover o mouse), e cada título só é dividido em letras quando entra na tela. O Motion (ímã do botão, tilt dos cards, cortina entre páginas) usa o `animate` com mola, baixado no primeiro hover ou na primeira troca de página.
- **Título de abertura pronto no servidor.** O título do hero e das páginas internas já vem dividido em letras no HTML, com a mesma entrada com motion blur, feita por Web Animations. Ele é pintado no primeiro quadro e não empurra o LCP.
- **Preloader barato.** O ponteiro do velocímetro gira por Web Animations no compositor.
- **Hidratação em pedaços.** Cada seção abaixo da dobra fica num limite de `<Suspense>`, então o React hidrata uma por vez, em tarefas curtas. O `content-visibility: auto` foi testado e descartado: as alturas estimadas faziam o rodapé "pular" quando tudo renderizava de uma vez (CLS instável).
- **FAQ sem JavaScript.** O accordion é `<details name="faq">` nativo (um aberto por vez), com o visual do shadcn/ui. As respostas ficam no HTML e o pacote do Radix sai do bundle. O shadcn/ui segue no dialog da galeria, que só carrega quando alguém abre uma foto.
- **Pôster fora da disputa pelo primeiro paint.** Ele é pedido logo depois da hidratação (o Chrome não conta imagem do tamanho da tela como LCP) e, no celular, sai em 720 px (17 kB em AVIF).
- **CSS em arquivo.** O `inlineCss` do Next foi testado e descartado: ele repetia todo o CSS dentro do payload RSC e quase dobrava o HTML.
- **Ajustes gerais.** `browserslist` moderno (o mesmo piso do Tailwind v4) e Vercel Analytics baixado só no primeiro clique medido.

**Resultados medidos** (Lighthouse 12.8, celular com throttling simulado, build de produção local; home: mediana de 3 rodadas, páginas internas: 1 rodada):

| Página | Modo | Performance | Acessibilidade | Boas práticas | SEO | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` | publicação | 96 | 100 | 100 | 100 | 2,46 s | 148 ms | 0 |
| `/` | prévia | 96 | 100 | 100 | 69* | 2,45 s | 135 ms | 0,001 |
| `/servicos` | publicação | 98 | 100 | 100 | 100 | 2,31 s | 94 ms | 0 |
| `/guia-do-pneu` | publicação | 97 | 100 | 100 | 100 | 2,44 s | 122 ms | 0 |

\* Na prévia o SEO perde pontos de propósito: a página sai com `noindex` até as informações serem confirmadas.

JS inicial da home: **141 kB** (gzip, "First Load JS" do `next build`). Não entram aí o chunk do 3D (three.js, R3F, drei e pós-processamento), GSAP, Lenis e Motion, que chegam sob demanda. O LCP observado sem throttling fica em torno de 0,2 s; os números da tabela são a simulação de 4G lento com CPU 4× mais lenta. Para repetir a medição: `npm run build && npm run start` e o Lighthouse no modo celular.

**Acessibilidade:** com `prefers-reduced-motion`, não há smooth scroll, preloader, entrada de letras nem 3D (fica o pôster com as ilustrações SVG, com fades curtos). Todo o conteúdo dos atos 3D existe em HTML e em SVG. Também há: foco visível amarelo, link "Pular para o conteúdo", accordion nativo e dialog do Radix (teclado completo) e contraste AA (texto secundário `#A2A29D` sobre `#0F1012` = 6,8:1).

**SEO local:** metadata e Open Graph por página (imagens OG geradas no build), JSON-LD `AutomotiveBusiness` + `TireShop` com `makesOffer`, `address`, `telephone`, `geo`, `openingHoursSpecification` e Instagram em `sameAs` (campos pendentes ficam de fora até serem confirmados), `FAQPage` e `BreadcrumbList` no guia, `sitemap.xml`, `robots.txt` e `lang="pt-BR"`.

---

## Decisões de direção de arte

Asfalto quase preto como página e um único pneu em luz de estúdio: o produto vira escultura e todo o resto recua.
O amarelo de sinalização só aparece onde há ação ou leitura (botões, número ativo, laser certo), e o vermelho de freio só marca o "errado" (ponteiro no limite, laser desalinhado).
Chakra Petch em caixa alta tem o corte técnico das letras de flanco; Red Hat Text segura a leitura longa sem cansar.
Cada momento 3D responde a uma dúvida real de quem compra (qual a medida, por que pneu bom custa mais, para que serve o alinhamento), e a marca de pneu no asfalto amarra a rolagem ao conceito "Aderência".
