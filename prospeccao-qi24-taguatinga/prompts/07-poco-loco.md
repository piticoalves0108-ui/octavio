# Prompt do site: Poco Loco Pizzaria

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Poco Loco Pizzaria** (pizzaria), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Poco Loco Pizzaria
- Ramo: Pizzaria
- Endereço: QNL 3, conjunto A, lote 17, Taguatinga Norte (CEP 72150-301)
- Contato: WhatsApp (61) 99804-2052
- Instagram: @pocolocoqnl (https://www.instagram.com/pocolocoqnl/)
- Informações públicas já confirmadas: pizzaria; quinta a domingo, das 19h às 23h; pedidos pelo cardápio digital ola.click.
- Confirmar com o dono antes de publicar: sabores, tamanhos e preços; se trabalha com meio a meio; área e taxa de entrega; fotos

## Objetivo e público
- Objetivo: gerar pedidos de quinta a domingo, levando para o cardápio de pedidos ou para o WhatsApp.
- Público: famílias e grupos de amigos da QNL e arredores, principalmente no fim de semana à noite.

## Direção de arte
- Conceito: "Um pouco loca": energia de fim de semana, cores fortes e uma pizza que se monta sozinha na tela.
- Paleta: forno #1B1B1B, tomate #D7263D, mussarela #FFF4D6, manjericão #2E8B57, orégano #6A7F3B.
- Tipografia (Google Fonts via next/font): Bowlby One (títulos) + Work Sans (texto).
- Tom de voz: brincalhão e animado ("loucura de quinta a domingo"), sem perder a clareza no pedido.
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Uma pizza em 3D gira sobre uma pá de forno. Ao carregar, ela se monta: a massa abre (morph), o molho espalha em espiral (shader com máscara animada), o queijo derrete (deformação de vértices) e os ingredientes caem com física (Rapier) e quicam de leve. O fundo tem a boca do forno a lenha com brilho de brasa.
- No scroll, a pizza é fatiada e cada fatia vira um sabor do cardápio, com o "puxa-puxa" do queijo animado entre a fatia e a pizza.
- Seção "Monte a sua" (se houver meio a meio): o usuário clica em dois sabores e vê a pizza meio a meio em 3D antes de pedir.
- Contagem regressiva para abrir ("Abrimos quinta às 19h") quando estiver fechado.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Status "Aberto agora" ou "Abre quinta às 19h" calculado pelo horário real.
- Títulos com SplitText em bounce desencontrado (stagger) para dar o tom "loco".
- Marquee de sabores com velocidade que aumenta conforme o scroll.
- Botão "Pedir agora" grudado no rodapé do mobile, com animação de fatia saindo.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com a pizza 3D, horário e o CTA "Pedir agora" (cardápio ola.click) e WhatsApp
2. Sabores (salgadas e doces) com destaque para as mais pedidas
3. Monte a sua / meio a meio
4. Combos e promoções da semana
5. Galeria e avaliações reais (só com autorização e fonte)
6. Endereço na QNL 3, horário e entrega

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo Restaurant (servesCuisine: Pizza) com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Poco Loco Pizzaria | Pizzaria em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/5561998042052?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20pedir%20uma%20pizza.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
