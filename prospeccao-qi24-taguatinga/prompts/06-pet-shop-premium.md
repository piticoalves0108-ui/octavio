# Prompt do site: Pet Shop Premium

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Pet Shop Premium** (pet shop: banho e tosa, rações, vacinas e acessórios), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Pet Shop Premium
- Ramo: Pet shop: banho e tosa, rações, vacinas e acessórios
- Endereço: QNL 01/03, bloco D, loja 06, Taguatinga Norte (CEP 72150-000)
- Contato: WhatsApp (61) 99186-0612; Fixo (61) 3028-0629
- Instagram: @petshoppremiumm (https://www.instagram.com/petshoppremiumm/)
- Informações públicas já confirmadas: banho e tosa; rações, vacinas e brinquedos.
- Confirmar com o dono antes de publicar: horário de funcionamento; tabela de banho e tosa por porte; quem aplica as vacinas (veterinário responsável); se faz busca e entrega do pet; fotos

## Objetivo e público
- Objetivo: agendar banho e tosa pelo WhatsApp e vender ração com entrega.
- Público: tutores de cães e gatos da QNL, do Setor Industrial e do M Norte.

## Direção de arte
- Conceito: "Spa pet": leve, limpo e divertido, com espuma, bolhas e um mascote 3D que reage ao visitante.
- Paleta: marinho #14213D, turquesa #19C2B5, amarelo #FFD23F, espuma #F5FBFF, coral #FF6B6B.
- Tipografia (Google Fonts via next/font): Fredoka (títulos) + Nunito (texto).
- Tom de voz: carinhoso e alegre, mas profissional sobre saúde e cuidado.
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Um cachorro estilizado em 3D (low-poly arredondado, toon shading) toma banho numa banheira. Bolhas de sabão iridescentes (MeshTransmissionMaterial com iridescência) sobem e estouram quando o cursor passa. O mascote segue o cursor com a cabeça e abana o rabo quando o mouse para sobre o botão de agendar.
- No scroll, o mascote sai da banheira, se sacode (partículas de água) e aparece tosado e com laço, ilustrando o "antes e depois" do serviço.
- Seção de produtos com sacos de ração e brinquedos em 3D numa prateleira que gira (ou fotos recortadas com profundidade).
- Na seção de vacinas, uma linha do tempo com o mascote crescendo de filhote a adulto.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Bolhas de fundo em canvas leve que seguem o scroll.
- Patinhas animadas marcando o caminho entre as seções.
- Botão "Agendar banho" com micro-bounce e bolha que estoura no clique.
- Cards de serviço com flip mostrando o que está incluso.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o mascote 3D e o CTA "Agende o banho do seu pet"
2. Serviços: banho, tosa, hidratação e outros que forem confirmados
3. Loja: rações, petiscos, brinquedos
4. Vacinas (com aviso para consultar o veterinário responsável)
5. Galeria de clientes de quatro patas (fotos do Instagram)
6. Endereço na QNL 01/03, horário e WhatsApp

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo PetStore com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Pet Shop Premium | Pet shop em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/5561991860612?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20agendar%20banho%20e%20tosa.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
