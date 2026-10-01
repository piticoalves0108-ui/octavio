# Prompt do site: Churrasquinho do Bruce

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Churrasquinho do Bruce** (churrasquinho, hambúrguer e almoço), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Churrasquinho do Bruce
- Ramo: Churrasquinho, hambúrguer e almoço
- Endereço: QI 23 nº 01, Setor Industrial, Taguatinga Norte (em frente ao Top Life Miami Beach)
- Contato: WhatsApp (61) 99177-8057
- Instagram: @churrasquinhodobruce (https://www.instagram.com/churrasquinhodobruce/)
- Informações públicas já confirmadas: segunda a sábado, das 11h às 23h; delivery pelo iFood; fica na QI 23/24, em frente ao Top Life Miami Beach.
- Confirmar com o dono antes de publicar: cardápio completo e preços; ano de abertura e história; fotos em alta resolução; se aceita reserva para grupos

## Objetivo e público
- Objetivo: levar o cliente a pedir pelo WhatsApp ou pelo iFood e a vir comer no local; a conversão principal é o botão "Pedir agora".
- Público: moradores do Top Life e do Setor Industrial, trabalhadores da região na hora do almoço e quem busca um churrasquinho à noite.

## Direção de arte
- Conceito: "Brasa ao vivo": o site parece estar em cima da churrasqueira. Fundo de carvão, luz quente vindo de baixo, fumaça que reage ao mouse.
- Paleta: carvão #121212, brasa #FF5A1F, âmbar #FFB347, osso #F2EDE4, fumaça #8A8580.
- Tipografia (Google Fonts via next/font): Big Shoulders Display (títulos, peso 800, caixa alta) + Barlow (texto).
- Tom de voz: direto, de bairro e com fome: frases curtas como "Espeto saindo agora", sem gourmetização.
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Um espeto de churrasquinho em 3D gira devagar sobre uma grelha com brasas. As brasas usam shader emissivo com ruído animado e Bloom; faíscas são partículas instanciadas que sobem com turbulência; a fumaça é feita com planos volumétricos em shader de ruído que se desviam do cursor. A câmera faz um leve dolly-in na entrada.
- Ao rolar, o espeto sai da grelha e os pedaços (carne, frango, linguiça, queijo coalho) se separam em vista explodida, cada um ligado ao item do cardápio que aparece ao lado.
- Na seção de hambúrguer, o espeto vira um hambúrguer que se monta camada por camada, sincronizado com o scroll (timeline do GSAP controlando posições e rotações).
- No rodapé, as brasas se apagam devagar e sobra só o brilho, junto ao endereço e ao horário.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Preloader com o contador "acendendo a brasa" de 0 a 100% e uma chama SVG que cresce.
- Títulos entram com SplitText caractere a caractere, com leve tremor de calor (displacement em CSS/SVG).
- Cardápio em cards com tilt 3D no hover e preço contando de 0 até o valor (quando houver preço confirmado).
- Faixa marquee infinita com "Churrasquinho • Hambúrguer • Almoço • Delivery".
- Botão "Pedir agora" magnético, com pulso de brasa a cada 6 segundos.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o espeto 3D, nome, horário de funcionamento e os botões "Pedir no WhatsApp" e "Pedir no iFood"
2. Cardápio por categoria (espetinhos, hambúrgueres, almoço, bebidas)
3. "Na brasa desde..." com a história do Bruce, em 3 blocos com fotos
4. Galeria em grid masonry puxando fotos do Instagram
5. Como chegar: "em frente ao Top Life Miami Beach", com mapa estilizado e botão para o Google Maps
6. Rodapé com horário, telefone, Instagram e iFood

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo Restaurant (servesCuisine: Churrasco, Hambúrguer) com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Churrasquinho do Bruce | Churrasquinho, hambúrguer e almoço em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/5561991778057?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20fazer%20um%20pedido.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
