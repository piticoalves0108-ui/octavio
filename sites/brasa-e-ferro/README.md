# Brasa & Ferro: site one-page

Site premium de hamburgueria artesanal, em dark mode com âmbar, cobre e brasa. Tem um hambúrguer 3D em tempo real que se desmonta em camadas conforme o scroll, além de fumaça e brasas em WebGL e motion em todas as seções.

- **Stack:** React 19, Vite 8, Three.js r186, GSAP 3 (ScrollTrigger), Lenis e Tailwind CSS v4.
- **SEO:** HTML pré-renderizado no build, meta tags, Open Graph, schema.org `Restaurant` com cardápio e horários, sitemap e robots.
- **Perfil do cliente:** os links de pedido e de redes apontam para o Instagram [@delicias_nachapada](https://www.instagram.com/delicias_nachapada/). Veja [Antes de publicar](#antes-de-publicar).

---

## Rodando

Requer Node 20.19+ (ou 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ (com o HTML pré-renderizado)
npm run preview    # serve o dist/ localmente
```

### Arquivo HTML único

`entrega/brasa-e-ferro.html` é o site inteiro num arquivo só (2,2 MB), com código, 3D, fontes e imagens embutidos. Basta abrir com dois cliques no navegador, sem instalar nada. Também dá para subir esse arquivo sozinho em qualquer hospedagem (renomeie para `index.html`).

Para gerar de novo depois de editar o conteúdo:

```bash
npm run build:html   # → entrega/brasa-e-ferro.html
```

Para publicar com o melhor desempenho, prefira o `npm run build` (pasta `dist/`). Nele, o 3D e as imagens carregam sob demanda, em AVIF e no tamanho certo para cada tela.

Para testar a qualidade do 3D, acrescente `?qualidade=low`, `?qualidade=medium` ou `?qualidade=high` à URL.

---

## Onde editar o conteúdo

**Tudo fica em `src/data/site.ts`:** nome, contatos, endereço, horários, textos das seções, cardápio (com a receita do hambúrguer 3D de cada item), ingredientes, galeria e depoimentos. O SEO (title, description, Open Graph, JSON-LD, sitemap) é gerado a partir desse arquivo, então não precisa mexer no HTML.

Os valores de exemplo estão marcados com `confirmar('campo', valor)`. O `npm run build` lista no terminal todos os que ainda faltam.

### Campos a confirmar com o cliente

| Campo | Valor de exemplo hoje |
|---|---|
| WhatsApp de pedidos | vazio: os botões "Peça Agora" abrem a DM do Instagram (`ig.me/m/delicias_nachapada`) |
| Telefone, e-mail | vazios (ficam ocultos) |
| Endereço, bairro, cidade, UF, CEP, referência | "Rua da Brasa, 180 — Centro, Sua Cidade" |
| Latitude e longitude | centro de Brasília (só para o schema) |
| Horário de funcionamento | ter a qui 18h–23h, sex e sáb 18h–00h, dom 18h–23h |
| Domínio do site | `https://brasaeferro.com.br` |
| Descrição para o Google | texto genérico |
| Links do iFood e do TikTok | vazios (ícones ocultos) |
| Endpoint da newsletter | vazio: o formulário só simula o envio |
| História, números da casa (anos, hambúrgueres servidos…) | exemplos |
| Cardápio e preços (8 itens) | exemplos |
| Ingredientes e fornecedores | exemplos |
| Depoimentos | **exemplos fictícios**: troque por avaliações reais (Google, iFood) com autorização antes de publicar |

> **Pedido pelo WhatsApp:** preencha `contato.whatsapp` só com dígitos, com DDI e DDD (ex.: `5561999999999`). Todos os botões passam a abrir o WhatsApp com a mensagem pronta (e com o nome do lanche, nos cards do cardápio).

> **Newsletter:** cole em `newsletterEndpoint` a URL de um serviço que aceite `POST` com JSON `{ "email": "..." }` (ex.: Formspree, Getform ou uma função serverless que fale com o Mailchimp/Brevo).

---

## Imagens

As fotos do cardápio, ingredientes, galeria, o pôster do hero e a imagem de Open Graph são **renderizadas a partir do próprio 3D do site**: mesmo visual, sem banco de imagens, sem problema de licença.

```bash
npm run assets                      # renderiza tudo (leva alguns minutos)
npm run assets -- --so=cardapio     # só um grupo (ou um item: --so=ferro-smash)
npm run assets -- --escala=2        # mais nítido (mais lento)
```

O script abre `studio.html` (página interna, fora do build) no Chromium do Playwright e grava AVIF e WebP em duas larguras em `public/images/<pasta>/<id>-<largura>.{avif,webp}`. Também gera `public/og-image.jpg` e os ícones em `public/icons/`. Os enquadramentos ficam em `src/studio/shots.ts`.

Se o Chromium não estiver instalado, rode `npx playwright install chromium`.

**Para usar fotos reais** (recomendado para a galeria, com autorização do cliente), converta a foto para os tamanhos e formatos do site:

```bash
npm run foto -- galeria g-classico ~/Downloads/foto-do-burger.jpg
npm run foto -- cardapio ferro-smash ~/Downloads/smash.png
```

Depois ajuste `alt`, `legenda` e `formato` (`retrato`, `paisagem` ou `quadrado`) em `galeria.itens` e apague a nota "Imagens ilustrativas…" em `src/sections/Gallery.tsx`.

---

## Estrutura

```
index.html                 página (o SEO entra no lugar de <!--seo-->)
studio.html, og.html       páginas internas para gerar imagens (não vão para o build)
seo/plugin.ts              plugin do Vite: meta tags, OG, JSON-LD Restaurant, robots, sitemap, manifest
entrega/brasa-e-ferro.html site em um único arquivo HTML (npm run build:html)
plugins/imagens.ts         embute as imagens no build de arquivo único
scripts/
  render-assets.mjs        renderiza as imagens a partir do 3D
  prerender.mjs            injeta o HTML do React no dist/index.html (SSG)
  build-html.mjs           gera o arquivo HTML único
  foto.mjs                 converte uma foto real para os tamanhos do site
src/
  data/site.ts             TODO o conteúdo do site
  App.tsx                  ordem das seções, smooth scroll e revelação ao rolar
  main.tsx                 hidrata o HTML pré-renderizado
  entry-server.tsx         renderização no build
  styles/index.css         tema Tailwind, texturas, efeito brasa, botões, movimento reduzido
  lib/                     motion (GSAP + Lenis), progresso do preloader, horário "aberto agora"
  hooks/                   movimento reduzido, efeito magnético
  components/              Preloader, Cursor, Navbar, Button (ripple + glow), Picture, Logo, ícones
  sections/                Hero, About, Menu, Ingredients, Gallery, Testimonials, Location, Footer
  three/
    experience.ts          cena do hero: mouse, scroll, explosão, partículas, pausa fora da tela
    burger.ts              monta um hambúrguer a partir de uma receita e faz a vista explodida
    layers.ts              modelagem procedural de cada camada (pães, carnes, queijo, bacon…)
    materials.ts           shaders procedurais (crosta, marcas de grelha, poros do pão, gordura do bacon)
    particles.ts           fumaça e brasas (animadas no shader)
    scenery.ts             luzes de estúdio, ambiente para reflexos, chapa de ferro
    quality.ts             níveis de qualidade por aparelho (LOD)
    extras.ts              batata e onion rings (só para a galeria)
  studio/                  enquadramentos das imagens geradas
```

---

## Efeitos e onde estão

| Pedido | Implementação |
|---|---|
| Hambúrguer 3D girando, reagindo a mouse e scroll | `three/experience.ts`: giro contínuo, rotação e parallax pelo mouse, rotação e aproximação pelo scroll |
| Ingredientes "explodindo" em camadas no scroll | Hero com 320vh e palco sticky; `burger.explode()` + rótulos que seguem cada camada na tela |
| Fumaça animada (WebGL) | `three/particles.ts`: puffs com ruído no fragment shader |
| Cursor customizado + magnético | `components/Cursor.tsx`, `hooks/useMagnetic.ts` (só com mouse) |
| Scroll reveal (GSAP ScrollTrigger) | `[data-reveal]` + `ScrollTrigger.batch` em `App.tsx` |
| Cards com tilt 3D + light sweep | `sections/Menu.tsx` |
| Texto em brasa nos CTAs | `.text-ember` e `.btn-primary` em `styles/index.css` |
| Preloader de chapa esquentando + logo formando | `components/Preloader.tsx` (espera fontes e 3D, com tempo mínimo e máximo) |
| Smooth scroll | Lenis sincronizado com o ScrollTrigger (`lib/motion.ts`) |
| Navbar que encolhe com blur | `components/Navbar.tsx` |
| Ripple + glow nos botões | `components/Button.tsx` |
| Scroll horizontal de ingredientes | `sections/Ingredients.tsx` (pin no desktop, carrossel com snap no celular) |
| Galeria masonry + hover cinematográfico | `sections/Gallery.tsx` (com lightbox acessível) |
| Carrossel automático de depoimentos | `sections/Testimonials.tsx` (pausa no hover/foco) |
| Mapa estilizado + horários | `sections/Location.tsx` (ruas que se desenham, "aberto agora" calculado no navegador) |
| Logo animado no rodapé | `sections/Footer.tsx` |

---

## Performance

- **Modelo 3D procedural:** todas as camadas são modeladas e texturizadas no código (geometria + shaders). Não há GLB nem textura para baixar: 0 KB de assets 3D, nítido em qualquer resolução, e a mesma fonte gera as imagens do site. Por isso não há arquivo GLB comprimido: ele só acrescentaria download. Se um dia o cliente quiser um modelo escaneado do lanche real, o caminho é exportar GLB com Meshopt + texturas KTX2/WebP (`gltf-transform optimize`) e trocar as camadas de `burger.ts`.
- **LOD por aparelho** (`three/quality.ts`): densidade das malhas, sementes de gergelim, partículas, sombras, oitavas de ruído nos shaders e resolução do canvas mudam conforme o aparelho (celular e máquinas fracas recebem a versão leve). Se o FPS cair, a resolução baixa sozinha.
- **Lazy loading:** o Three.js fica num chunk separado (`import()` dinâmico). Até a cena ficar pronta, aparece o pôster estático. As imagens usam AVIF/WebP responsivos com `loading="lazy"`.
- **Render sob demanda:** a cena para quando o hero sai da tela ou a aba fica oculta.
- **Fontes locais** (Bebas Neue e Inter via Fontsource, só o subconjunto latino, que cobre o português): sem requisição ao Google Fonts.

---

## Acessibilidade

- `prefers-reduced-motion`: desliga o smooth scroll, o cursor, o tilt, o autoplay do carrossel e a vista explodida. O hero fica estático e a anatomia vira uma lista.
- Contraste WCAG AA: texto principal 17:1, texto secundário (`#aaa49b`) 7,8:1, texto escuro sobre os botões âmbar e laranja de 6:1 a 9:1. O vermelho brasa só aparece em detalhes e textos grandes.
- Navegação por teclado com foco visível, link "Pular para o conteúdo", menu do celular que fecha com Esc, lightbox em `<dialog>` com setas e Esc, carrossel com botões e pontos rotulados.
- Texto alternativo em todas as imagens; o canvas é decorativo (`aria-hidden`) e a informação dele existe em texto.
- Sem JavaScript ou sem WebGL, o conteúdo inteiro continua legível.

---

## Deploy

O build gera um site estático em `dist/`. Funciona em qualquer hospedagem estática.

### Vercel (recomendado)

1. Suba o repositório no GitHub.
2. Em vercel.com, use **Add New → Project** e importe o repositório.
3. Em **Root Directory**, escolha `sites/brasa-e-ferro`. O preset **Vite** é detectado sozinho (build `npm run build`, output `dist`).
4. Clique em **Deploy**.
5. Domínio próprio: **Settings → Domains → Add**. Siga as instruções de DNS (registro A `76.76.21.21` para o domínio raiz e CNAME `cname.vercel-dns.com` para o `www`).
6. Atualize `site.url` em `src/data/site.ts` com o domínio final e faça um novo deploy. O canonical, o Open Graph e o sitemap dependem dele.

### Netlify

**Add new site → Import an existing project**. Configure Base directory `sites/brasa-e-ferro`, Build command `npm run build` e Publish directory `sites/brasa-e-ferro/dist`.

### Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**. Configure Root directory `sites/brasa-e-ferro`, Build command `npm run build` e Output `dist`.

### Depois de publicar

- Valide o schema em https://search.google.com/test/rich-results.
- Teste o compartilhamento em https://www.opengraph.xyz.
- Cadastre o domínio no Google Search Console e envie o `sitemap.xml`.
- Coloque o link do site na bio do Instagram.

---

## Antes de publicar

- [ ] Confirmar com o dono **nome e marca**. O briefing pediu a marca "Brasa & Ferro" e os links apontam para o perfil `@delicias_nachapada`. Se o site for desse perfil com o nome dele, troque `site.nome`, `nomeCurto` e os textos em `src/data/site.ts`, o wordmark em `components/Logo.tsx` e no rodapé, o `og.ts` e o `favicon.svg`, e rode `npm run assets`.
- [ ] Preencher todos os campos da tabela acima (o build avisa o que falta).
- [ ] Trocar os depoimentos de exemplo por avaliações reais, com autorização.
- [ ] Trocar as imagens da galeria por fotos reais do Instagram (com autorização), se o cliente preferir.
- [ ] Configurar o domínio e atualizar `site.url`.

---

## Licenças de terceiros

- Three.js, React, Vite, Tailwind, Lenis: MIT. GSAP: licença padrão da GreenSock (gratuita, inclusive para uso comercial).
- Bebas Neue e Inter: SIL Open Font License 1.1.
- Simplex noise em GLSL (`three/glsl.ts`): webgl-noise, de Ashima Arts e Stefan Gustavson, MIT.
- Modelos e imagens 3D: feitos no próprio código deste projeto.
