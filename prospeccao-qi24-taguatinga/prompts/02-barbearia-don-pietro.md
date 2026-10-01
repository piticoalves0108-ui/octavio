# Prompt do site: Barbearia Don Pietro

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Barbearia Don Pietro** (barbearia), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Barbearia Don Pietro
- Ramo: Barbearia
- Endereço: QI 23, lotes 40/41/42, loja 03, Setor Industrial, Taguatinga Norte (CEP 72135-230)
- Contato: WhatsApp (61) 99334-7026; Fixo (61) 3970-6308
- Instagram: @barbeariadonpietro (https://www.instagram.com/barbeariadonpietro/)
- Informações públicas já confirmadas: barbearia na QI 23, a uma quadra do Top Life; agendamento pelo app próprio (iOS e Android).
- Confirmar com o dono antes de publicar: tabela de serviços e preços; horário de funcionamento; nomes e fotos dos barbeiros; link do app no Google Play

## Objetivo e público
- Objetivo: levar o cliente a agendar: botões para o app (App Store e Google Play) e para o WhatsApp.
- Público: homens de 18 a 45 anos de Taguatinga Norte e do Setor Industrial que querem corte e barba com hora marcada.

## Direção de arte
- Conceito: "Clássico italiano, acabamento cromado": barbearia de alfaiataria, com preto profundo, metal polido e luz de estúdio.
- Paleta: ônix #0E0E10, dourado envelhecido #B8955A, couro #6B3E26, marfim #EFE9DF, cromo #C9CDD2.
- Tipografia (Google Fonts via next/font): Bodoni Moda (títulos, itálico nos destaques) + Manrope (texto).
- Tom de voz: confiante e elegante, com pitada italiana ("Benvenuto", "Il taglio") sem exagero.
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Uma navalha clássica em 3D, com lâmina cromada (MeshPhysicalMaterial com clearcoat e reflexos de HDRI de estúdio), abre e fecha devagar enquanto gira. Ao fundo, um barber pole listrado em shader gira em loop. O mouse muda o ângulo da luz principal e o reflexo corre pela lâmina.
- No scroll, a navalha fecha e dá lugar a uma tesoura e a um pente que se alinham como em uma vitrine; cada peça ilumina um serviço (corte, barba, sobrancelha, combo).
- Seção "Antes e depois" com slider e um leve efeito de profundidade (parallax 2.5D com mapa de profundidade nas fotos).
- Transição entre seções com uma "lâmina de luz" que corta a tela na diagonal (máscara animada em GSAP).

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Intro: o logo é desenhado em traço dourado (SVG stroke-dashoffset) e depois preenchido.
- Títulos em Bodoni com reveal de máscara linha a linha.
- Cursor personalizado em forma de círculo fino dourado que cresce sobre links (só no desktop).
- Lista de serviços com hover que revela foto em movimento seguindo o cursor.
- Botões "Agendar no app" magnéticos, com brilho metálico que atravessa no hover.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com a navalha 3D e o CTA "Agende seu horário"
2. Serviços (lista com descrição; preços só depois de confirmados)
3. A experiência: ambiente, bebida, atendimento (com fotos)
4. Equipe de barbeiros com cards de foto e Instagram de cada um
5. Antes e depois
6. Baixe o app: QR code e links para App Store e Google Play
7. Localização na QI 23 e horário

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo BarberShop com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Barbearia Don Pietro | Barbearia em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/5561993347026?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20agendar%20um%20hor%C3%A1rio.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
