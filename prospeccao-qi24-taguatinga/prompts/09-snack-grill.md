# Prompt do site: Snack Grill

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Snack Grill** (lanches e grelhados), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Snack Grill
- Ramo: Lanches e grelhados
- Endereço: QNG 13, lote 02, lojas 04 e 05, Setor G Norte, Taguatinga Norte (CEP 72130-130)
- Contato: Telefone e WhatsApp (61) 3354-1491
- Instagram: @snack.grillqng (https://www.instagram.com/snack.grillqng/)
- Informações públicas já confirmadas: lanches e grelhados; delivery pelo WhatsApp; empresa aberta em 2013.
- Confirmar com o dono antes de publicar: horário de funcionamento; cardápio e preços; área e taxa de entrega; se o fixo recebe WhatsApp; fotos

## Objetivo e público
- Objetivo: aumentar o delivery próprio pelo WhatsApp, sem taxa de aplicativo.
- Público: moradores do G Norte e arredores, almoço rápido e lanche à noite.

## Direção de arte
- Conceito: "Na chapa": marcas de grelha, fumaça e um lanche que se monta no ar.
- Paleta: grelha #101010, mostarda #F2B705, ketchup #C1121F, pão #E9C46A, fumaça #3A3A3A.
- Tipografia (Google Fonts via next/font): Saira Condensed (títulos, peso 800) + Rubik (texto).
- Tom de voz: rápido e saboroso: "saiu da chapa", "chega quente".
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Um X-tudo em 3D em vista explodida flutua sobre uma chapa quente: pão, carne com marcas de grelha, queijo derretendo, alface, tomate, bacon e ovo, cada camada oscilando devagar. A chapa tem shader de calor (distorção de ar) e gotas de gordura que estalam em partículas.
- No scroll, as camadas descem e se encaixam uma a uma (timeline do GSAP), com um "ploc" visual a cada encaixe; no fim o lanche está montado e o botão de pedir aparece.
- Seção de grelhados com um espeto ou filé girando sobre a chapa e a fumaça subindo.
- Monte seu lanche: o usuário escolhe adicionais e vê as camadas entrarem no 3D; o resumo vai pronto para o WhatsApp.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Marcas de grelha desenhadas em SVG nos títulos ao entrar na tela.
- Botão de pedir fixo no mobile com contador de itens.
- Cards de lanche com tilt e fumaça em CSS no hover.
- Selo "Desde 2013" com rotação contínua lenta.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o lanche 3D e o CTA "Pedir no WhatsApp"
2. Cardápio: lanches, grelhados, porções, bebidas
3. Monte seu lanche
4. Combos
5. Desde 2013 no G Norte (história curta)
6. Endereço na QNG 13, horário e área de entrega

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo Restaurant (servesCuisine: Lanches, Grelhados) com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Snack Grill | Lanches e grelhados em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/556133541491?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20fazer%20um%20pedido.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
