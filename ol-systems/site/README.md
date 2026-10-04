# Página de vendas: OL Systems

Página de vendas da **OL Systems** (@ol_systemss): sites para empresas e perfis do Instagram por **R$ 250/mês, com atualizações sempre que o cliente pedir**. A página tem um único objetivo: levar o visitante a chamar no WhatsApp.

Feita a partir do prompt em [`../prompt-pagina-de-vendas.md`](../prompt-pagina-de-vendas.md), com o globo em wireframe do logo como identidade visual.

## Como rodar

Precisa de Node.js 20 ou mais novo.

```bash
cd ol-systems/site
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção
npm run start      # serve o build
npm run lint       # checagem de tipos (TypeScript)
```

Para gerar uma versão 100% estática (pasta `out/`, sobe em qualquer hospedagem):

```bash
STATIC_EXPORT=1 npm run build
```

## Onde trocar cada coisa

| O quê | Arquivo |
|---|---|
| WhatsApp, preço, Instagram, área de atendimento, CNPJ | `src/config/site.ts` |
| Regras comerciais (taxa, fidelidade, prazos, domínio...) | `src/config/site.ts` → `terms` |
| Todos os textos da página (títulos, cards, FAQ, comparativo) | `src/config/content.ts` |
| Portfólio (sites entregues) | `src/config/content.ts` → `portfolio.items` |
| Depoimentos | `src/config/content.ts` → `testimonials` |
| Cores e fontes | `src/app/globals.css` (bloco `@theme`) e `src/app/layout.tsx` |
| Política de privacidade | `src/app/politica-de-privacidade/page.tsx` |

### WhatsApp

Em `src/config/site.ts`, preencha `whatsapp` só com dígitos: `55` + DDD + número (ex.: `"5561999998888"`). Todos os botões da página passam a abrir o WhatsApp com a mensagem pronta *"Olá! Vim pelo site e quero um site para o meu negócio."*. **Enquanto estiver vazio, os botões abrem o Direct do Instagram** (`ig.me/m/ol_systemss`), para ninguém cair num número errado.

### Preço

Troque `price` e `priceLabel` em `src/config/site.ts`. O valor aparece no título, no card de preço, na barra fixa do celular, no comparativo e nos dados estruturados do Google.

### Título do topo (teste A/B)

Os três títulos ficam em `hero.titles` (`src/config/content.ts`). O primeiro é o padrão. Para testar outro, use `?titulo=2` ou `?titulo=3` no link (por exemplo, no link do anúncio). Dentro do título, `*texto*` fica em destaque e `_texto_` ganha o sublinhado verde.

### Adicionar um site ao portfólio

Em `portfolio.items` (`src/config/content.ts`), adicione:

```ts
{ name: "Nome do cliente", segment: "Ramo", url: "https://site-do-cliente.com.br", example: false, theme: "barber" },
```

`theme` escolhe a miniatura desenhada (`barber`, `pizza`, `pet` ou `bakery`). Clicar no card abre o site real numa nova aba. Os quatro itens com `example: true` são modelos de demonstração e mostram o selo "exemplo": apague-os quando houver sites reais.

### Depoimentos

Só reais, com nome, empresa e autorização. Enquanto `testimonials` estiver vazio, a seção não aparece.

### Fotos e logo

Não há fotos do Instagram no projeto (não deu para baixá-las daqui). O logo e os ícones são o globo redesenhado em SVG (`src/components/SvgGlobe.tsx`, `src/app/icon.svg`). Se o logo oficial for diferente, troque esses dois arquivos. Fotos novas vão em `public/images/`, com autorização.

## Marcadores CONFIRMAR

Tudo que ainda depende do dono está marcado com `{{CONFIRMAR: ...}}` no código e **aparece destacado em amarelo na página**, para nada ir ao ar com informação inventada. Antes de publicar, confirme e troque:

- [ ] Grafia exata do nome e logo oficial (`site.ts`)
- [ ] WhatsApp: DDD e número (`site.ts` → `whatsapp`)
- [ ] O que acontece com o site se o cliente cancelar (`terms.cancel`)
- [ ] Prazo de entrega do site (`terms.deliveryTime`)
- [ ] Prazo de cada atualização (`terms.updateTime`)
- [ ] O que conta como atualização (`terms.updateScope`)
- [ ] Atualizações ilimitadas ou com limite por mês (`terms.updateLimit`)
- [ ] Quantas páginas ou seções o site tem (`terms.pages`)
- [ ] E-mail profissional e Google Meu Negócio inclusos? (`terms.extras`)
- [ ] IDs do GA4 e do Meta Pixel (variáveis de ambiente, ver abaixo)
- [ ] Domínio de produção (`NEXT_PUBLIC_SITE_URL`)
- [ ] Texto da política de privacidade, data e canal para pedidos de privacidade (`politica-de-privacidade/page.tsx`)
- [ ] Sites reais para o portfólio e depoimentos reais

Já confirmados: sem taxa de adesão (começa com a 1ª mensalidade), sem fidelidade, pagamento via Pix, hospedagem e certificado SSL inclusos, domínio não incluso, atendimento em todo o Centro-Oeste, sem CNPJ (a linha do CNPJ não aparece) e o cliente não precisa de CNPJ para contratar.

Quando uma resposta do FAQ ainda tem marcador, ela fica fora dos dados estruturados (FAQPage) que vão para o Google.

## Medição (analytics)

Variáveis de ambiente (na Vercel: *Settings → Environment Variables*):

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Domínio final, ex.: `https://olsystems.com.br` (canonical, Open Graph, sitemap) |
| `NEXT_PUBLIC_GA4_ID` | ID do Google Analytics 4 (`G-XXXXXXX`) |
| `NEXT_PUBLIC_META_PIXEL_ID` | ID do Meta Pixel |

Sem ID, o script correspondente não é carregado. Todo clique em botão de contato dispara `whatsapp_click` no GA4, `Contact` no Pixel e um evento no Vercel Analytics (este só existe quando o site está na Vercel). O evento leva o botão clicado (`cta`: hero, preco, barra-mobile...) e as UTMs da visita, para separar quem veio da bio de quem veio do anúncio. Sugestão de links: `?utm_source=instagram&utm_medium=bio` e `?utm_source=instagram&utm_medium=anuncio`.

## Estrutura de pastas

```
src/
  app/
    layout.tsx               fontes, metadata/SEO, analytics, smooth scroll
    page.tsx                 ordem das seções + dados estruturados (JSON-LD)
    globals.css              paleta, grade de pontos, animações em CSS
    opengraph-image.tsx      imagem de compartilhamento (gerada no build)
    icon.svg                 favicon (o globo)
    sitemap.ts / robots.ts
    politica-de-privacidade/
  config/
    site.ts                  dados do negócio e regras comerciais (CONFIRMAR)
    content.ts               todos os textos
  components/
    sections/                uma seção da página por arquivo
    GlobeCanvas.tsx          globo 3D (React Three Fiber), carregado sob demanda
    SvgGlobe.tsx             o mesmo globo em SVG (logo, celular, sem WebGL)
    HeroVisual.tsx           globo + notebook + celular do topo
    MiniSite.tsx             sites de demonstração em HTML (escalam com a moldura)
    Devices.tsx              molduras de notebook, navegador, celular e o chat
    ContactButton.tsx        botão "Quero meu site" (magnético)
    StickyContact.tsx        barra fixa no celular + botão flutuante no desktop
    Title.tsx / Reveal.tsx   títulos (SplitText) e entradas na rolagem
    Analytics.tsx            GA4, Meta Pixel, eventos de clique e UTMs
  lib/
    globe.ts                 geometria compartilhada do globo (SVG e 3D)
    gsap.ts                  carregamento sob demanda do GSAP
    inview.ts                IntersectionObserver para as entradas
```

## 3D e licenças

Não há nenhum modelo 3D baixado. O globo é **geometria procedural** feita no código (`GlobeCanvas.tsx` + `lib/globe.ts`): paralelos e meridianos em linhas, pontos que acendem em verde e arcos de dados, com shaders próprios. Notebook, celular e sites de exemplo são HTML e CSS. Nada para licenciar.

Bibliotecas: Next.js 15, React 19, Tailwind CSS 4, three + @react-three/fiber + drei + postprocessing, GSAP 3 (ScrollTrigger e SplitText, gratuitos desde a 3.13), Lenis, Motion, lucide-react. Todas com licença MIT ou ISC, exceto o GSAP (licença própria, gratuita inclusive para uso comercial).

## Desempenho e acessibilidade

Medido com Lighthouse 12 no build de produção, rodando local:

| | Performance | Acessibilidade | Boas práticas | SEO |
|---|---|---|---|---|
| Celular | 86 a 95 (varia entre rodadas) | 100 | 100 | 100 |
| Desktop | 100 | 100 | 100 | 100 |

- JavaScript inicial: 167 kB. O three.js, o GSAP e o Lenis carregam depois.
- CLS 0 e TBT entre 60 e 160 ms no celular.
- **LCP no celular: a meta de 2,5 s não foi batida de forma consistente.** O LCP simulado do Lighthouse variou de 2,7 s a 3,6 s, e uma medição com throttling real (devtools) deu 2,3 s. O elemento do LCP é o título, que é estático e aparece já na primeira pintura (cerca de 0,25 s sem throttling). O número simulado pesa porque conta todo o JavaScript baixado antes dela. Vale medir de novo no PageSpeed Insights depois do deploy, que roda em condições mais estáveis que esta máquina.
- **Globo:** começa em SVG, girando, em todos os aparelhos. Em telas com mouse vira 3D na primeira interação (mexer o mouse, rolar ou usar o teclado). No celular fica no SVG, que tem o mesmo desenho do logo e quase nenhum custo de CPU.
- **"Reduzir movimento"** (prefers-reduced-motion) desliga o smooth scroll, a cena fixa e as animações longas. Ficam só fades curtos.
- Todo o conteúdo é legível sem WebGL e sem JavaScript.

## Deploy na Vercel com domínio próprio

1. Suba o repositório no GitHub (já está em `piticoalves0108-ui/octavio`).
2. Na Vercel: **Add New → Project → Import** o repositório.
3. Em **Root Directory**, escolha `ol-systems/site`. O framework (Next.js) é detectado sozinho.
4. Em **Environment Variables**, adicione `NEXT_PUBLIC_SITE_URL` e, se tiver, `NEXT_PUBLIC_GA4_ID` e `NEXT_PUBLIC_META_PIXEL_ID`.
5. Clique em **Deploy**.
6. Domínio próprio: **Settings → Domains → Add**, digite o domínio (ex.: `olsystems.com.br`) e crie no registro do domínio (Registro.br, por exemplo) os registros DNS que a Vercel mostrar (normalmente um `A` para `76.76.21.21` no domínio raiz e um `CNAME` `cname.vercel-dns.com` para o `www`). O HTTPS é automático.
7. Ative o **Analytics** no painel do projeto para os eventos do Vercel Analytics.
8. Coloque o link no lugar do link da bio do @ol_systemss.

## Decisões de direção de arte e de copy

1. **Identidade:** o globo do logo é o protagonista (preto e branco). O verde do WhatsApp só aparece em botões e selos "atualizado", então tudo que é verde significa "fale com a gente" ou "foi atualizado".
2. **Mostrar, não prometer:** o topo e a seção "Pediu, atualizou" mostram um pedido no WhatsApp virando mudança no site. É o diferencial (atualização inclusa) virando cena.
3. **Copy:** frases curtas, em "você". O preço aparece cedo e várias vezes (título, card, barra fixa), ancorado em "menos de R$ 9 por dia", e cada objeção tem resposta no FAQ.
4. **Celular primeiro:** a maior parte das visitas vem do navegador do Instagram. Por isso o botão do WhatsApp está sempre a um toque, o globo é SVG no celular e o 3D só carrega quando faz sentido.
5. **Nada inventado:** preços de mercado, números, clientes e depoimentos ficaram de fora. Onde falta informação, o marcador amarelo aparece na própria página.
