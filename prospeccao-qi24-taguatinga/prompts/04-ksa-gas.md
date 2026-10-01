# Prompt do site: KSA Distribuidora de Gás

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **KSA Distribuidora de Gás** (distribuidora de gás (revenda autorizada telegás)), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: KSA Distribuidora de Gás
- Ramo: Distribuidora de gás (revenda autorizada Telegás)
- Endereço: QI 16, lotes 19/21, Setor Industrial, Taguatinga Norte
- Contato: Telefone (61) 3355-5222
- Instagram: @ksa_gas (https://www.instagram.com/ksa_gas/)
- Informações públicas já confirmadas: revenda autorizada Telegás; segunda a sábado, das 7h às 21h; endereço no Instagram: QI 16, lote 19/21. Alguns diretórios ainda mostram QI 3, lote 23 (confirmar).
- Confirmar com o dono antes de publicar: endereço atual (QI 16 ou QI 3); se o número fixo tem WhatsApp; produtos e preços; bairros atendidos e prazo; regras de uso da marca Telegás antes de usar o logo

## Objetivo e público
- Objetivo: fazer o pedido de gás em até 2 toques: ligar ou abrir o WhatsApp com o pedido escrito.
- Público: moradores de Taguatinga Norte, Setor Industrial, Ceilândia e Vicente Pires que precisam de gás rápido, muitas vezes pelo celular e com pressa.

## Direção de arte
- Conceito: "Chama azul, entrega rápida": interface limpa e muito clara, com um único momento 3D forte. Velocidade é a mensagem.
- Paleta: azul noite #0A1A3F, azul chama #1E5BFF, laranja segurança #FF7A00, aço #9AA4B2, branco #FFFFFF.
- Tipografia (Google Fonts via next/font): Archivo (títulos em largura expandida, peso 800) + Plus Jakarta Sans (texto).
- Tom de voz: objetivo e confiável: preço claro, prazo claro, segurança em primeiro lugar.
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Um botijão P13 estilizado em 3D (sem logo de terceiros) gira sobre a base. Uma chama azul em shader (ruído + gradiente + Bloom) acende acima dele quando a página carrega. O mouse inclina o botijão com física de mola (react-spring/three).
- No scroll, o botijão percorre uma maquete low-poly do bairro (ruas da QI e quadras vizinhas) até chegar a uma casa, mostrando o trajeto da entrega com uma linha de luz.
- Seção "Qual gás você precisa?": P13, P20, P45 e água mineral (só o que for confirmado) em cards 3D que giram ao passar o mouse, com o botão "Pedir este".
- Seção de segurança com o botijão em vista explodida (válvula, lacre, selo do Inmetro) explicando o que conferir na hora de receber.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Barra fixa no topo e no rodapé (mobile) com "Ligar" e "WhatsApp" sempre visíveis.
- Indicador "Aberto agora" que lê o horário (7h às 21h, seg a sáb) e muda para "Fechado" fora dele.
- Contadores animados de entregas e tempo médio (só com números confirmados).
- Microanimação de chama acendendo nos botões de pedido.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o botijão 3D, "Gás na sua porta" e os botões Ligar e WhatsApp
2. Produtos e preços
3. Bairros atendidos e tempo médio de entrega
4. Por que comprar de revenda autorizada (segurança)
5. Perguntas frequentes: formas de pagamento, troca de vasilhame, horário
6. Endereço na QI 16 com mapa e horário

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo Store (com areaServed listando os bairros atendidos) com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "KSA Distribuidora de Gás | Distribuidora de gás em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/556133555222?text=Ol%C3%A1%21%20Quero%20pedir%20um%20g%C3%A1s.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
