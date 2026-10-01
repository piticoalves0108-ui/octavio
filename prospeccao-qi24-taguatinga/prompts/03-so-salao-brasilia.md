# Prompt do site: Só Salão Brasília

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Só Salão Brasília** (fábrica de móveis para salão de beleza e esmalteria), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Só Salão Brasília
- Ramo: Fábrica de móveis para salão de beleza e esmalteria
- Endereço: QI 19, lotes 34 a 38, Setor Industrial, Taguatinga Norte
- Contato: WhatsApp (61) 99999-7349; WhatsApp (61) 99911-6311; WhatsApp (61) 98417-4212
- Instagram: @sosalaobrasilia (https://www.instagram.com/sosalaobrasilia/)
- Informações públicas já confirmadas: fábrica própria de móveis para salão de beleza e esmalteria; showroom na fábrica, na QI 19; produção sob encomenda com entrega em até 7 dias úteis; parcelamento em até 12x sem juros no cartão.
- Confirmar com o dono antes de publicar: catálogo de modelos com medidas; cores e tecidos disponíveis; garantia e frete; horário do showroom; fotos de salões de clientes (com autorização)

## Objetivo e público
- Objetivo: gerar pedidos de orçamento qualificados pelo WhatsApp, já com o modelo e a cor escolhidos no configurador.
- Público: donas e donos de salão, esmalteria, barbearia e estúdio de beleza no DF e entorno, abrindo ou reformando o espaço.

## Direção de arte
- Conceito: "Showroom 3D": o site é a vitrine da fábrica. O cliente gira, troca a cor do estofado e monta o salão antes de pedir.
- Paleta: grafite #2A2A2E, rosé #E8C5BD, nude #D9C3B0, champanhe #CBB089, branco gelo #F7F5F3.
- Tipografia (Google Fonts via next/font): DM Serif Display (títulos) + Outfit (texto e interface).
- Tom de voz: consultivo e seguro, voltado a quem empreende: prazo, qualidade e parcelamento em primeiro plano.
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Uma cadeira de cabeleireiro em 3D gira sobre um pedestal com sombra de contato, em luz de estúdio fotográfico. Ao lado, amostras de tecido clicáveis trocam em tempo real a cor e o material do estofado (MeshPhysicalMaterial com sheen para corino e veludo) e o acabamento da base (cromado, preto fosco, dourado).
- Configurador 3D completo (modelo, cor do estofado, acabamento da base) com resumo e o botão "Pedir orçamento deste modelo", que abre o WhatsApp com a configuração escrita na mensagem.
- "Monte seu salão": cena isométrica de um salão vazio que, no scroll, vai sendo mobiliado peça por peça (cadeira, lavatório, bancada de manicure, recepção) com animação de queda suave e sombra.
- Catálogo em carrossel 3D (cards em curva, estilo coverflow) com os modelos da fábrica.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Intro curta: tecido em shader de ondulação revela o nome da marca.
- Números da fábrica animados: "até 7 dias úteis" e "12x sem juros" contando ao entrar na tela.
- Timeline horizontal com pin do ScrollTrigger mostrando o processo: escolha, produção, entrega e montagem.
- Hover nos cards do catálogo com tilt e troca de foto (frente e perfil).
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com a cadeira 3D configurável e o CTA "Monte e peça seu orçamento"
2. Linhas de produto: cadeiras, lavatórios, bancadas de manicure, recepção, espelhos
3. Configurador 3D
4. Como funciona: prazo de até 7 dias úteis e pagamento em até 12x sem juros
5. Salões que já montamos (galeria de clientes)
6. Visite o showroom na QI 19: endereço, horário e mapa
7. Perguntas frequentes: frete, montagem, garantia, personalização

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo FurnitureStore + LocalBusiness (com Product para cada linha de móvel) com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Só Salão Brasília | Fábrica de móveis para salão de beleza e esmalteria em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/5561999997349?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20um%20or%C3%A7amento%20de%20m%C3%B3veis%20para%20sal%C3%A3o.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.
