# Prompt do site: Porango Pneus

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo da **Porango Pneus** (loja de pneus e serviços automotivos), em Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Porango Pneus {{CONFIRMAR: grafia exata do nome e logo}}
- Ramo: loja de pneus {{CONFIRMAR: quais serviços oferece, ex.: montagem, alinhamento, balanceamento, rodas, suspensão, freios}}
- Instagram: @porango.pneus (https://www.instagram.com/porango.pneus/)
- Endereço: {{CONFIRMAR: endereço completo}}
- Contato: {{CONFIRMAR: telefone e WhatsApp}}
- Horário: {{CONFIRMAR: horário de funcionamento}}
- Confirmar com o dono antes de publicar: marcas de pneu que trabalha; se vende pneu novo, remold ou seminovo; formas de pagamento e parcelamento; se atende carro, moto, caminhonete ou caminhão; fotos da loja e da equipe

## Objetivo e público
- Objetivo: fazer o cliente pedir orçamento de pneu pela medida no WhatsApp e agendar serviço; a conversão principal é o botão "Cotar meu pneu".
- Público: motoristas da região que precisam trocar pneu com preço justo e rapidez, motoristas de aplicativo que rodam muito e donos de frota pequena.

## Direção de arte
- Conceito: "Aderência": o site tem a textura e o peso de um pneu novo. Asfalto escuro, borracha fosca, faixas de sinalização amarelas e um único pneu 3D como protagonista.
- Paleta: asfalto #0F1012, borracha #1C1D20, amarelo sinalização #FFC400, branco faixa #F4F4F2, vermelho freio #E10600 (só em detalhes).
- Tipografia (Google Fonts via next/font): Chakra Petch (títulos, peso 700, caixa alta) + Red Hat Text (texto).
- Tom de voz: direto e técnico na medida certa, de quem entende de pneu e explica sem enrolar ("Pneu certo, preço justo, montado na hora").
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: um pneu montado na roda gira devagar em luz de estúdio. A borracha usa material fosco com normal map da banda de rodagem e leve sheen; a roda é metal escovado com reflexos de HDRI. O mouse inclina o pneu e muda o ângulo da luz, que corre pelos sulcos. Ao carregar, o pneu entra rolando da lateral e para com um leve balanço (física de mola).
- Ao rolar a página, o pneu percorre a tela deixando a marca da banda de rodagem no "asfalto" do fundo (decal desenhado em tempo real num render target).
- Vista explodida do pneu no scroll: banda de rodagem, cintas de aço, carcaça, flanco e talão se separam em camadas, cada uma com uma legenda curta explicando o que faz.
- "Leia a medida do seu pneu": a câmera dá zoom no flanco e destaca, parte por parte, uma medida como 175/70 R14 84T (largura, perfil, aro, índice de carga, índice de velocidade). Ao lado, um seletor de medida em que o usuário escolhe largura, perfil e aro; o botão manda essa medida pronta para o WhatsApp.
- Seção de alinhamento e balanceamento: duas rodas de um carro em 3D com linhas de laser mostrando o ângulo antes e depois do alinhamento (só se o serviço for confirmado).

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Preloader com um velocímetro que sobe de 0 a 100 e o ponteiro estalando no fim.
- Títulos entram com SplitText e um leve motion blur horizontal, como algo passando em velocidade.
- Faixa marquee com as marcas de pneu trabalhadas (só as confirmadas), com velocidade que aumenta conforme o scroll.
- Cards de serviço com tilt 3D no hover e um ícone de pneu que gira uma volta.
- Botão "Cotar meu pneu" magnético, com marca de pneu se desenhando por baixo no hover.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o pneu 3D, a frase principal e os botões "Cotar meu pneu" (WhatsApp) e "Ver serviços"
2. Encontre seu pneu pela medida (seletor + leitura do flanco em 3D)
3. Serviços (só os confirmados: montagem, alinhamento, balanceamento etc.)
4. Marcas que trabalhamos
5. Por que trocar na Porango: atendimento, garantia e pagamento (só com informação confirmada)
6. Galeria com fotos da loja e de serviços, puxadas do Instagram
7. Como chegar: endereço, horário, mapa estilizado e botão para o Google Maps
8. Perguntas frequentes: quando trocar o pneu, como ver o desgaste (TWI), rodízio, calibragem

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo AutomotiveBusiness (TireShop) com makesOffer para os serviços com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Porango Pneus | Pneus em {{CONFIRMAR: bairro}} - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/55{{CONFIRMAR: DDD e número}}?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20cotar%20um%20pneu.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
