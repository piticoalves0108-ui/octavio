# Prompt do site: Seu Zé e Seu Mané

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Seu Zé e Seu Mané** (bar e restaurante (boteco)), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Seu Zé e Seu Mané
- Ramo: Bar e restaurante (boteco)
- Endereço: EQNL 2/4, bloco B, Setor L Norte, Taguatinga Norte (CEP 72155-215)
- Contato: Celular (61) 98273-5004; Fixo (61) 3042-2456
- Instagram: @seuzeeseumane (https://www.instagram.com/seuzeeseumane/)
- Informações públicas já confirmadas: bar e restaurante no estilo boteco; terça a sexta das 17h à 0h; sábado das 11h à 0h; domingo das 11h às 22h; nota 4,5 de 5 no Tripadvisor; tem página no Comida di Buteco (confirmar o ano de participação).
- Confirmar com o dono antes de publicar: cardápio e preços; ano e prato do Comida di Buteco; agenda fixa de eventos; se aceita reserva e para quantas pessoas; qual número é o WhatsApp

## Objetivo e público
- Objetivo: encher as mesas: reservas pelo WhatsApp, agenda de música ao vivo e jogos, e cardápio de petiscos.
- Público: adultos de Taguatinga que procuram boteco com petisco caprichado, chopp gelado e clima de bairro.

## Direção de arte
- Conceito: "Boteco de raiz com luz de neon": azulejo português, mesa de metal, chopp suando e um letreiro de neon que liga.
- Paleta: verde garrafa #0F5132, âmbar chopp #F4A300, espuma #FFF8E7, azulejo #1D4E89, vermelho boteco #B3261E.
- Tipografia (Google Fonts via next/font): Alfa Slab One (títulos, estilo letreiro) + Karla (texto).
- Tom de voz: bem-humorado e de mesa de bar ("Seu Zé guardou sua mesa"), com informação clara.
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Um copo de chopp em 3D com vidro realista (MeshTransmissionMaterial), espuma que se forma ao carregar e bolhas subindo em partículas. O copo "sua" (gotas em normal map). Ao fundo, uma parede de azulejos em padrão português e um letreiro de neon "Seu Zé e Seu Mané" que pisca ao ligar e depois fica estável. O mouse inclina o copo e o líquido acompanha (shader de superfície do líquido).
- No scroll, a câmera desce para a mesa de metal e os petiscos aparecem um a um em 3D ou em fotos recortadas com profundidade, cada um ligado ao cardápio.
- Seção Comida di Buteco em destaque, com o prato do concurso girando num prato de louça.
- Agenda da semana como um quadro-negro de boteco escrito à mão (SVG animado com traço de giz).

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Letreiro de neon que acende com flicker na entrada e responde ao scroll.
- Títulos com efeito de giz desenhado (stroke-dashoffset).
- Hover em pratos com vapor subindo (shader leve ou sprite).
- Botão "Reservar mesa" com tilintar de copos (som só depois do clique e com botão para silenciar).
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o chopp 3D, horário de hoje e os botões "Reservar mesa" e "Ver cardápio"
2. Cardápio: petiscos, pratos, bebidas
3. Comida di Buteco: o prato e a história
4. Agenda: música ao vivo, jogos e eventos
5. Avaliações (com fonte, ex.: Tripadvisor 4,5)
6. Como chegar na EQNL 2/4, horário completo

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo BarOrPub + Restaurant com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Seu Zé e Seu Mané | Bar e restaurante em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/5561982735004?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20reservar%20uma%20mesa.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
