# Prompt do site: Padaria Armazém do Pão

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Padaria Armazém do Pão** (padaria, confeitaria, pizzaria e restaurante), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Padaria Armazém do Pão
- Ramo: Padaria, confeitaria, pizzaria e restaurante
- Endereço: QNL 14, Via 29, Taguatinga Norte (em frente ao Detran), CEP 72160-429
- Contato: Telefone e WhatsApp (61) 3967-0383
- Instagram: @padariaarmazemdopaoqnl (https://www.instagram.com/padariaarmazemdopaoqnl/)
- Informações públicas já confirmadas: panificadora, confeitaria, pizzaria e restaurante; em frente ao Detran, na QNL 14; delivery próprio e pelo iFood.
- Confirmar com o dono antes de publicar: horários de funcionamento e de fornada; cardápio e preços; prazo mínimo para encomendas; fotos dos produtos

## Objetivo e público
- Objetivo: aumentar pedidos de delivery e encomendas de bolos e salgados para festa pelo WhatsApp.
- Público: famílias da QNL e arredores, quem passa pelo Detran e quem encomenda para festas e eventos.

## Direção de arte
- Conceito: "Saindo do forno": tudo quente e dourado, com farinha no ar e a casca do pão estalando.
- Paleta: crosta #B5651D, miolo #F3E3C3, café #3B2416, farinha #FAF7F0, oliva #6B7B3A.
- Tipografia (Google Fonts via next/font): Young Serif (títulos) + Nunito Sans (texto).
- Tom de voz: acolhedor e de vizinhança: "o pão das 6h", "encomende o bolo do aniversário".
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Um pão francês e um croissant em 3D com textura de casca realista (normal map e subsurface leve) giram devagar sobre uma tábua. Partículas de farinha flutuam e reagem ao mouse. A luz quente vem de um forno ao fundo, com brilho alaranjado pulsando.
- No scroll, o pão se divide em quatro objetos que viram a porta de cada área: pão (padaria), fatia de bolo (confeitaria), pizza (pizzaria) e prato feito (restaurante).
- Na confeitaria, um bolo de andares gira e recebe a cobertura em tempo real (morph targets) enquanto o texto de encomendas aparece.
- Vitrine horizontal com pin, com salgados e doces em 3D ou fotos recortadas com parallax.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Preloader com timer de forno: "assando... 100%".
- Títulos aparecem com fade e leve subida, como vapor.
- Cards do cardápio com hover que "aquece" a foto (filtro de saturação e brilho).
- Selo "Pão quentinho às __h" com pulso suave nos horários de fornada (quando confirmados).
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o pão 3D e os botões "Pedir delivery" e "Encomendar para festa"
2. Padaria (fornadas e pães especiais)
3. Confeitaria (bolos, doces e encomendas)
4. Pizzaria (sabores e horário)
5. Restaurante (almoço)
6. Onde estamos: "em frente ao Detran, QNL 14", com mapa e horário

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo Bakery (com hasMenu para padaria, confeitaria e pizzaria) com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Padaria Armazém do Pão | Padaria, confeitaria, pizzaria e restaurante em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/556139670383?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20fazer%20um%20pedido.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
