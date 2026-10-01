# Prompt do site: Mega Artesanatos e Festas

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Mega Artesanatos e Festas** (artesanato, mdf, artigos de festa e lembrancinhas), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Mega Artesanatos e Festas
- Ramo: Artesanato, MDF, artigos de festa e lembrancinhas
- Endereço: QNG 39, lote 19, loja 01, Taguatinga Norte (abaixo do Mercado Norte), CEP 72130-390
- Contato: Fixo (61) 3049-1300; Celular (61) 9951-4582 (formato antigo, confirmar o 9 a mais)
- Instagram: @megaartesanatoefestas (https://www.instagram.com/megaartesanatoefestas/)
- Informações públicas já confirmadas: artesanato, peças em MDF, artigos de festa e lembrancinhas; fica abaixo do Mercado Norte, na QNG 39; mantém um grupo de WhatsApp com clientes.
- Confirmar com o dono antes de publicar: número de WhatsApp atual (o celular aparece no formato antigo); horário; categorias e se faz entrega; link do grupo de WhatsApp; fotos

## Objetivo e público
- Objetivo: levar visitas à loja e gerar pedidos pelo WhatsApp de kits de festa e peças em MDF, além de crescer o grupo de clientes.
- Público: mães e pais organizando festa infantil, artesãs que compram MDF e material, e decoradoras de festa.

## Direção de arte
- Conceito: "A festa abre na tela": uma caixa de presente 3D se abre e solta a loja inteira em confete.
- Paleta: papel kraft #E8D5B5, magenta #E0479E, turquesa #2EC4B6, amarelo #FFBF00, lilás #9B5DE5, com fundo escuro #1E1B2E nas seções de destaque.
- Tipografia (Google Fonts via next/font): Lilita One (títulos) + Quicksand (texto).
- Tom de voz: alegre e prático: "tudo para sua festa em um só lugar".
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Uma caixa de presente em 3D com textura de MDF cru abre a tampa ao carregar e solta confetes (partículas instanciadas com física simples) e balões que flutuam e balançam. O cursor empurra os balões (Rapier) e um clique estoura um deles, mostrando uma categoria da loja.
- No scroll, peças de MDF (letras, caixinhas, bandejas, topos de bolo) se montam a partir de chapas planas, como um quebra-cabeça que se dobra em 3D.
- Escolha o tema da festa: a cena muda de cor e de enfeites conforme o tema (ex.: safari, princesa, futebol) e mostra os produtos daquele tema.
- Carrossel 3D em formato de varal de bandeirinhas com as categorias.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Confete leve no fundo ao rolar (canvas, desligado com prefers-reduced-motion).
- Títulos com bounce e cores alternadas por letra.
- Cards de produto com hover que "embrulha" a foto (máscara animada).
- CTA "Entrar no grupo de ofertas" com balão que sobe.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com a caixa 3D e os botões "Ver categorias" e "Chamar no WhatsApp"
2. Categorias: MDF, festa, lembrancinhas, papelaria e material de artesanato
3. Kits por tema de festa
4. Personalizados sob encomenda
5. Grupo de ofertas no WhatsApp
6. Visite a loja: QNG 39, abaixo do Mercado Norte, com horário e mapa

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo Store (HobbyShop) com Product para as categorias principais com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Mega Artesanatos e Festas | Artesanato, MDF, artigos de festa e lembrancinhas em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta ({{CONFIRMAR: número de WhatsApp}}), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
