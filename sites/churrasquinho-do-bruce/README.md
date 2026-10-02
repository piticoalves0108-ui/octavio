# Churrasquinho do Bruce: site

Site do **Churrasquinho do Bruce** (churrasquinho, hambúrguer e almoço), QI 23 nº 01, Setor Industrial, Taguatinga Norte - DF, em frente ao Top Life Miami Beach.

Conceito **"Brasa ao vivo"**: o site parece estar em cima da churrasqueira. Um espeto 3D gira sobre a grelha. Ao rolar, ele sai da brasa, se divide em vista explodida (cada pedaço para ao lado do item no cardápio), vira um hambúrguer montado camada por camada e, no rodapé, as brasas se apagam devagar.

- **Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (Dialog), three.js com React Three Fiber, drei e postprocessing, GSAP (ScrollTrigger e SplitText), Lenis, Motion e Vercel Analytics.
- **Conversão principal:** botão **"Pedir agora"** (WhatsApp com mensagem pronta, iFood ou ligação). Também há botão flutuante de WhatsApp, link `tel:`, "Como chegar" no Google Maps e o Instagram.

---

## 1. Como rodar

Requisitos: Node 20 ou mais novo, npm.

```bash
cd sites/churrasquinho-do-bruce
npm install
cp .env.example .env.local      # opcional: domínio, GA4, token do Instagram
npm run dev                     # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Desenvolvimento. Os marcadores `{{CONFIRMAR: ...}}` aparecem destacados na tela. |
| `npm run build` e `npm start` | Build e servidor de produção. Em produção, o que não foi confirmado some da tela. |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript. |
| `npm run pendencias` | Lista todos os `{{CONFIRMAR: ...}}` com arquivo e linha. |
| `npm run html` | Gera **um único arquivo** `dist/churrasquinho-do-bruce.html` com o site inteiro (CSS, fontes, imagens, 3D e animações embutidos). Abre com dois cliques, sem servidor (ver seção 9). |
| `npm run captura` | Gera pôster, miniaturas, vídeo, imagens de Open Graph e ícones a partir da própria cena 3D (ver seção 6). |

Para o Bruce revisar uma prévia publicada com os marcadores visíveis, use `NEXT_PUBLIC_MOSTRAR_PENDENCIAS=true` no deploy de prévia.

---

## 2. Estrutura de pastas (comentada)

```
sites/churrasquinho-do-bruce/
├── public/
│   ├── images/                 ← FOTOS DO CLIENTE (com autorização) vão aqui
│   ├── poster/                 ← pôster AVIF/WebP do hero (gerado pela cena; é o LCP)
│   ├── video/                  ← loop de 8 s da cena (aparelhos fracos), MP4 + WebM
│   ├── renders/                ← miniaturas dos pedaços e do hambúrguer (sem WebGL)
│   └── icone-192.png, icone-512.png
├── scripts/
│   ├── captura.mjs             ← renderiza pôster/vídeo/miniaturas/OG da própria cena (Playwright + ffmpeg)
│   └── pendencias.mjs          ← lista os {{CONFIRMAR}}
└── src/
    ├── app/
    │   ├── layout.tsx          ← fontes (next/font), metadata, preloader, header, rodapé, analytics
    │   ├── page.tsx            ← home: hero, marquee, cardápio, história, galeria, como chegar + JSON-LD
    │   ├── cardapio/page.tsx   ← cardápio completo (página própria, com metadata e OG)
    │   ├── captura/            ← rota técnica do `npm run captura` (404 em produção)
    │   ├── not-found.tsx       ← "Esse espeto não existe."
    │   ├── sitemap.ts, robots.ts, manifest.ts
    │   ├── icon.svg, apple-icon.png, opengraph-image.jpg (+ .alt.txt)
    │   └── globals.css         ← tokens da paleta, grid de 12 colunas, tipografia, reduced-motion
    ├── content/                ← TODOS OS TEXTOS E DADOS (é aqui que se edita o site)
    │   ├── negocio.ts          ← nome, endereço, WhatsApp, Instagram, iFood, horário, geo, CEP
    │   ├── cardapio.ts         ← categorias, itens, preços (null = a confirmar)
    │   ├── historia.ts         ← "Na brasa desde...": ano, intro e os 3 blocos com foto
    │   ├── galeria.ts          ← fotos da galeria (quando não há token do Instagram)
    │   └── fotos.ts            ← tipo das fotos (src, alt, legenda da foto ideal, proporção)
    ├── lib/
    │   ├── cena.ts             ← estado compartilhado DOM ↔ 3D (o GSAP escreve, a cena lê)
    │   ├── motor.ts            ← carrega GSAP + ScrollTrigger + SplitText + Lenis sob demanda
    │   ├── palco.ts            ← modo do hero: pôster / carregando / 3d / vídeo
    │   ├── links.ts            ← wa.me com mensagem pronta, tel:, Google Maps, iFood, Instagram
    │   ├── horario.ts          ← "Aberto agora" no fuso de Brasília
    │   ├── jsonld.ts           ← schema.org/Restaurant
    │   ├── instagram.ts        ← galeria via API do Instagram (opcional, ISR de 1 h)
    │   ├── analytics.ts        ← eventos de clique (Vercel Analytics + GA4 opcional)
    │   └── pendente.ts         ← regras dos marcadores {{CONFIRMAR}}
    ├── hooks/
    │   ├── useMotor.ts         ← monta animações GSAP em fatias curtas (TBT baixo)
    │   └── useSecaoCena.ts     ← avisa a cena quais seções 3D estão na tela
    └── components/
        ├── secoes/             ← Hero, Cardapio (Espetinhos, Hamburguer, AlmocoBebidas), Historia, Galeria, ComoChegar, MapaEstilizado
        ├── motion/             ← Preloader, TituloCalor (SplitText + tremor de calor), Marquee, Magnetico, CardTilt, ContadorPreco, Transicao (cortina), Parallax, Revelar
        ├── conversao/          ← PedirAgora (dialog), BotoesPedido, WhatsAppFlutuante, StatusHorario, LinkRastreado
        ├── layout/             ← Header (menu mobile em dialog), Rodape, RodapeBrasa
        ├── three/              ← TODO O 3D
        │   ├── Palco.tsx         decide pôster/3D/vídeo e carrega o Canvas com next/dynamic
        │   ├── Experiencia.tsx   <Canvas>, PerformanceMonitor, Environment, frameloop "demand"
        │   ├── diretor.ts        um loop que posiciona câmera, churrasqueira, espeto e hambúrguer
        │   ├── Churrasqueira.tsx caixa, grelha, carvão (shader emissivo), faíscas, fumaça
        │   ├── Espeto.tsx        carne, frango, linguiça, queijo coalho e vareta
        │   ├── Hamburguer3D.tsx  6 camadas + gergelim + ContactShadows
        │   ├── geometrias.ts     modelos procedurais
        │   ├── materiais.ts      shaders de comida, carvão e cama de brasa
        │   ├── Efeitos.tsx       Bloom, Depth of Field, Noise, Vignette, ToneMapping
        │   ├── ruido.ts          simplex noise GLSL (MIT)
        │   └── tempo.ts          relógio periódico (loop perfeito do vídeo) e RNG com semente
        ├── ui/                 ← shadcn/ui: dialog.tsx, campo.tsx (Input/Label)
        ├── Foto.tsx            ← foto real ou placeholder na mesma proporção com a legenda da foto ideal
        ├── Pendente.tsx        ← exibe/esconde {{CONFIRMAR}}
        └── Icones.tsx          ← ícones SVG inline
```

---

## 3. Como trocar textos e fotos

**Textos e dados:** tudo está em `src/content/`. Não é preciso mexer em componente.

- **Telefone, endereço, horário, iFood, Instagram:** `src/content/negocio.ts`. O horário alimenta o "Aberto agora", o JSON-LD e os textos.
- **Cardápio:** `src/content/cardapio.ts`.
  - Troque `nome`/`descricao` (tire o `{{CONFIRMAR: ...}}`).
  - Preço: troque `preco: null` por um número, ex. `preco: 14.9`. O card passa a mostrar `R$ 14,90` com a contagem de 0 até o valor. Quando todos os itens da categoria tiverem preço, o aviso "Veja os preços no iFood" some sozinho.
  - Itens novos: copie um objeto e mude o `id`.
- **História:** `src/content/historia.ts`. Com `anoDeAbertura: 2015`, por exemplo, o título vira "Na brasa desde 2015".
- **Reserva para grupos:** se o Bruce aceitar, mude `aceitaReservaGrupos` para `true` em `negocio.ts`. Aparece um formulário em "Como chegar" que monta a mensagem e abre o WhatsApp, e o JSON-LD ganha `acceptsReservations`.

**Fotos:** peça ao Bruce autorização e os originais em alta (do celular, não o print do Instagram).

1. Coloque o arquivo em `public/images/` (ex.: `public/images/historia/fachada.jpg`).
2. No conteúdo, preencha `src: "/images/historia/fachada.jpg"` e revise o `alt`.
3. Mantenha a `proporcao` indicada (4:5, 4:3, 3:4...). O placeholder já ocupa exatamente esse espaço, então trocar a foto não mexe no layout. O Next gera AVIF/WebP no tamanho certo.

**Galeria do Instagram (automática, opcional):** com `INSTAGRAM_ACCESS_TOKEN` (Instagram API with Instagram Login, conta profissional), a galeria puxa as 9 últimas fotos e se atualiza a cada hora. O token de longa duração vale 60 dias; renove com `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=TOKEN` (dá para agendar um cron). Sem token, ou se a API falhar, a galeria usa `src/content/galeria.ts`.

---

## 4. Marcadores `{{CONFIRMAR: ...}}`

Regra do projeto: **nada foi inventado**. Preço, avaliação, prêmio, número e depoimento só entram depois de confirmados. Onde falta informação, o código tem um marcador `{{CONFIRMAR: ...}}`:

- **em desenvolvimento** (ou com `NEXT_PUBLIC_MOSTRAR_PENDENCIAS=true`): aparece na tela, tracejado em âmbar;
- **em produção:** o item some e, no lugar, entra uma chamada honesta ("Veja as opções e os preços no iFood" ou "Perguntar no WhatsApp"). O site pode ir ao ar hoje.

Lista atual (`npm run pendencias` mostra arquivo e linha):

**Negócio** (`src/content/negocio.ts`, `src/lib/site.ts`)
1. CEP do endereço (QI 23 nº 01). Entra no JSON-LD quando for preenchido.
2. Latitude e longitude exatas da porta (copiar do Google Maps). Sem isso o JSON-LD sai sem `geo`.
3. Link da loja no iFood (achado em pesquisa pública em 01/10/2026; conferir se é a loja certa).
4. Horário de domingo e de feriados (hoje o site trata domingo como fechado).
5. Se aceita reserva para grupos.
6. Faixa de preço para o Google (`$`, `$$`...).
7. Domínio próprio do site.

**Cardápio** (`src/content/cardapio.ts`)
8. Nomes exatos, descrição e preço de cada espetinho, e se há outros sabores. Carne, frango, linguiça e queijo coalho vêm do briefing e aparecem no site.
9. Descrição dos espetinhos de carne, frango e linguiça e do queijo coalho (com melaço? orégano?).
10. Nome e ingredientes dos hambúrgueres (o site está preparado para 3).
11. Pratos do almoço e o que vem em cada um.
12. Bebidas.
13. Preço de todos os itens.

**História** (`src/content/historia.ts`)
14. Ano de abertura ("Na brasa desde...").
15. História do Bruce em 2 ou 3 frases.
16. Desde quando está no ponto e como escolheu o lugar.
17. Como começou na brasa.
18. Alguma história real de cliente fiel ou da equipe (só com autorização).

**Fotos** (placeholders com a legenda da foto ideal)
19. Três fotos da história: fachada à noite (4:5), espetos na grelha (4:3), mesas cheias (3:4).
20. Nove fotos da galeria (ou o token do Instagram).

---

## 5. Os modelos 3D: origem e licença

**Todos os modelos são geometria procedural, feita no próprio código** (`src/components/three/geometrias.ts`). Não há nenhum `.glb`, textura ou HDR de terceiros. Não há licença a creditar, nada a baixar (o 3D pesa 0 kB de assets) e o visual fica 100% sob controle.

| Objeto | Como é feito |
|---|---|
| Carne, frango, queijo coalho | Caixa arredondada com deslocamento por simplex noise. A cor, as marcas de grelha e o tostado vêm de um shader (`materialComida`). |
| Linguiça | Cápsula com rugas e leve curva |
| Vareta | Cilindro + cone (ponta) |
| Churrasqueira e grelha | Caixas e cilindros instanciados de aço |
| Carvão em brasa | Icosaedro deformado, instanciado. Rachaduras emissivas animadas em shader, com Bloom. |
| Faíscas | Quads instanciados, movimento e turbulência 100% no vertex shader |
| Fumaça | Planos com fbm + domain warp, que se abrem em volta do cursor |
| Hambúrguer | Pães por revolução (LatheGeometry), disco de carne, queijo que escorre, tomate, alface ondulada e gergelim instanciado |

Código de terceiros dentro do 3D: simplex noise GLSL de Ian McEwan / Ashima Arts (**MIT**), em `ruido.ts`. `SimplexNoise` e `BufferGeometryUtils` vêm dos exemplos do three.js (**MIT**).

**Se um dia quiser trocar por um modelo pronto** (Sketchfab ou Poly Pizza, licença CC0 ou CC-BY):
1. Comprima: `npx @gltf-transform/cli optimize entrada.glb saida.glb --compress meshopt --texture-compress ktx2`.
2. Carregue com `useGLTF` do drei (Meshopt/Draco e KTX2 já são suportados) no lugar da geometria em `Espeto.tsx` ou `Hamburguer3D.tsx`.
3. Registre autor, link e licença nesta seção (CC-BY exige crédito visível no site).

Decisões técnicas do 3D:
- **Sem @react-three/rapier.** A montagem do hambúrguer precisa ser determinística e reversível com o scroll (rolar para cima desmonta). Física não volta no tempo, e o wasm do Rapier pesaria cerca de 600 kB a mais. A timeline do GSAP faz esse papel.
- **Sem AccumulativeShadows.** Ela é feita para cenas paradas, e aqui tudo se move. No lugar entram ContactShadows sob o hambúrguer e a luz quente vinda de baixo.
- **Environment leve:** só Lightformers, renderizados uma vez (`frames={1}`), sem HDR externo.

---

## 6. Performance e acessibilidade

Como o 3D carrega:
1. O hero chega com um **pôster AVIF** (11 a 14 kB) que é um frame da própria cena, no mesmo enquadramento. É o que o Lighthouse vê, e o LCP não depende de WebGL.
2. O chunk do 3D (three.js + R3F + pós, cerca de 190 kB gzip, fora do orçamento inicial) é baixado com **next/dynamic + ssr:false**, só com o hero na tela e **depois da primeira interação** (mouse, toque, scroll ou tecla). Quem não interage continua vendo o pôster, que é idêntico ao primeiro frame.
3. `dpr` limitado a [1, 1,75]. `PerformanceMonitor` desce de nível (DoF → Bloom → nada). Se ainda assim não aguentar, troca o Canvas pelo vídeo.
4. `frameloop="demand"`: só renderiza com uma seção 3D na tela e a aba visível. Fora disso, zero frames.
5. **Mobile:** menos carvão, faíscas e fumaça, sem pós-processamento. Tocar na brasa "abana" (faíscas e calor). Há um botão opcional "Inclinar o celular" (giroscópio; no iOS pede permissão).
6. **Aparelho muito fraco** (≤ 2 GB de RAM, ≤ 2 núcleos ou WebGL só por software): vídeo de 8 s em loop, gravado da própria cena (MP4 de 130 a 260 kB).
7. GSAP e Lenis também vêm sob demanda, depois da hidratação, e montam as animações em fatias curtas. O SplitText só divide um título quando ele se aproxima da tela.

Resultados medidos neste ambiente (build de produção, Lighthouse 12, mobile, 4G lento simulado):

| Página | Performance | Acessibilidade | Boas práticas | SEO | CLS | TBT |
|---|---|---|---|---|---|---|
| `/` | 93–94 | 100 | 100 | 100 | 0,045 | 70–150 ms |
| `/cardapio` | 95 | 100 | 100 | 100 | 0,002 | 60–130 ms |

- **JS inicial:** 180 kB na home e 160 kB no cardápio (First Load JS do `next build`, sem o chunk do 3D).
- **LCP:** o LCP observado é de cerca de 0,3 s. O **simulado** pelo Lighthouse em 4G lento fica em 2,8 a 2,9 s, acima da meta de 2,5 s. Esse número pesa sobretudo o download das fontes. Para baixar mais, dá para usar um subset da Big Shoulders só com as letras usadas nos títulos. Meça de novo no domínio final (a CDN da Vercel ajuda).

**Acessibilidade:**
- `prefers-reduced-motion`: sem Lenis, sem parallax, sem trilhos com sticky, sem preloader, sem 3D (fica o pôster) e só fades curtos.
- Contraste AA em toda a paleta: osso, âmbar e brasa sobre carvão; carvão sobre os botões brasa.
- Foco visível em âmbar, link "Pular para o conteúdo", dialogs com foco preso.
- `alt` em todas as imagens. O SplitText usa `aria: auto` (o leitor de tela lê a palavra, não letra por letra). Todo o conteúdo é HTML do servidor e funciona sem WebGL e sem JS.

**Analytics:** os cliques de conversão (`pedir_whatsapp`, `pedir_ifood`, `ligar`, `como_chegar`, `instagram`, `abrir_pedir_agora`, `reserva_grupo`, com a origem do clique) vão para a Vercel Web Analytics (eventos personalizados exigem plano **Pro**) e, se `NEXT_PUBLIC_GA_ID` existir, para o **GA4**. Com plano Hobby, use o GA4 para os eventos.

---

## 7. Deploy na Vercel com domínio próprio

1. **Suba o repositório no GitHub** (já está em `piticoalves0108-ui/octavio`).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
   - **Root Directory:** `sites/churrasquinho-do-bruce` (importante: o site fica numa subpasta).
   - Framework: Next.js (detectado). Build `next build`, sem mudar nada.
3. **Variáveis de ambiente** (Settings → Environment Variables):
   - `NEXT_PUBLIC_SITE_URL` = `https://seudominio.com.br` (sem barra no fim)
   - `NEXT_PUBLIC_GA_ID` (opcional)
   - `INSTAGRAM_ACCESS_TOKEN` (opcional)
   - Em **Preview**, opcional: `NEXT_PUBLIC_MOSTRAR_PENDENCIAS=true` para o Bruce revisar.
4. **Deploy.** A Vercel gera uma URL `*.vercel.app` para testar.
5. **Analytics:** no projeto, aba **Analytics** → Enable (o componente já está no código).
6. **Domínio próprio:** registre no [Registro.br](https://registro.br) (ex.: algo como `churrasquinhodobruce.com.br`, a confirmar com o Bruce). Depois:
   - Vercel → Settings → **Domains** → Add `seudominio.com.br` e `www.seudominio.com.br` (deixe um redirecionando para o outro).
   - No Registro.br, em **DNS**, use os registros que a Vercel mostrar (normalmente `A @ 76.76.21.21` e `CNAME www cname.vercel-dns.com`), ou troque os servidores DNS para os da Vercel.
   - O HTTPS sai automático quando o DNS propaga (de minutos a algumas horas).
7. Atualize `NEXT_PUBLIC_SITE_URL` para o domínio final e faça **Redeploy** (canonical, OG, sitemap e JSON-LD usam esse valor).
8. **Depois do ar:**
   - Envie `https://seudominio.com.br/sitemap.xml` no Google Search Console.
   - Valide o JSON-LD em [Rich Results Test](https://search.google.com/test/rich-results).
   - Coloque o link do site na bio do Instagram, no iFood e no Perfil da Empresa no Google.

**Gerar de novo pôster, vídeo, miniaturas e OG** (depois de mexer na cena):

```bash
npm run captura                         # sobe `next dev` na 3123, precisa de Chromium e ffmpeg
CHROMIUM_PATH=/caminho/do/chrome npm run captura
SO=poster,og npm run captura            # só algumas etapas (poster, og, miniaturas, video, icones)
```

---

## 8. Observações

- **Fonte dos títulos:** no Google Fonts, a "Big Shoulders Display" hoje é o corte de tamanho óptico 72 da família variável **Big Shoulders**. O site carrega essa família com o eixo `opsz` e fixa `opsz 72` nos títulos, que é exatamente o desenho Display, peso 800, em caixa alta.
- `npm audit` acusa uma vulnerabilidade no PostCSS que vem embutido no próprio Next 15 (só roda no build, não no navegador). A correção do audit exige o Next 16, e o briefing pede o Next 15.

---

## 9. Site em um arquivo só (`dist/churrasquinho-do-bruce.html`)

`npm run html` faz o build de produção, renderiza a home e junta tudo num HTML autocontido (cerca de 2,4 MB): CSS e fontes embutidos, pôster e miniaturas em base64, e um bundle (esbuild) com a **mesma** cena 3D e o **mesmo** motor GSAP/Lenis do projeto (`scripts/html-unico/entrada.tsx`).

Serve para mostrar o site ao Bruce (abre direto do celular ou do computador), mandar por WhatsApp ou e-mail, ou hospedar em qualquer servidor estático. Diferenças em relação ao site Next:
- é uma página só: os links de menu rolam até as seções, e "Cardápio completo" leva à seção do cardápio;
- sem o vídeo de fallback (aparelhos sem WebGL ficam no pôster) e sem analytics;
- os textos pendentes (`{{CONFIRMAR}}`) seguem a regra de produção: ficam escondidos.

Para publicar de verdade, use o projeto Next (seção 7): SEO, analytics e performance são melhores.
