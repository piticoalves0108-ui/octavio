# Prompts dos sites (10 comércios)

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

---

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

---

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

---

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

---

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

---

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

---

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

---

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

---

# Prompt do site: Snack Grill

Você é diretor(a) de arte e dev front-end sênior, especialista em sites premium com WebGL e motion design. Crie o site completo de **Snack Grill** (lanches e grelhados), em Taguatinga Norte, Brasília - DF. Quero um resultado de nível de agência premiada (padrão Awwwards), com 3D e motion que tenham propósito e que vendam, sem efeito gratuito.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: Snack Grill
- Ramo: Lanches e grelhados
- Endereço: QNG 13, lote 02, lojas 04 e 05, Setor G Norte, Taguatinga Norte (CEP 72130-130)
- Contato: Telefone e WhatsApp (61) 3354-1491
- Instagram: @snack.grillqng (https://www.instagram.com/snack.grillqng/)
- Informações públicas já confirmadas: lanches e grelhados; delivery pelo WhatsApp; empresa aberta em 2013.
- Confirmar com o dono antes de publicar: horário de funcionamento; cardápio e preços; área e taxa de entrega; se o fixo recebe WhatsApp; fotos

## Objetivo e público
- Objetivo: aumentar o delivery próprio pelo WhatsApp, sem taxa de aplicativo.
- Público: moradores do G Norte e arredores, almoço rápido e lanche à noite.

## Direção de arte
- Conceito: "Na chapa": marcas de grelha, fumaça e um lanche que se monta no ar.
- Paleta: grelha #101010, mostarda #F2B705, ketchup #C1121F, pão #E9C46A, fumaça #3A3A3A.
- Tipografia (Google Fonts via next/font): Saira Condensed (títulos, peso 800) + Rubik (texto).
- Tom de voz: rápido e saboroso: "saiu da chapa", "chega quente".
- Layout: grid editorial de 12 colunas, muito respiro, hierarquia forte e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: Um X-tudo em 3D em vista explodida flutua sobre uma chapa quente: pão, carne com marcas de grelha, queijo derretendo, alface, tomate, bacon e ovo, cada camada oscilando devagar. A chapa tem shader de calor (distorção de ar) e gotas de gordura que estalam em partículas.
- No scroll, as camadas descem e se encaixam uma a uma (timeline do GSAP), com um "ploc" visual a cada encaixe; no fim o lanche está montado e o botão de pedir aparece.
- Seção de grelhados com um espeto ou filé girando sobre a chapa e a fumaça subindo.
- Monte seu lanche: o usuário escolhe adicionais e vê as camadas entrarem no 3D; o resumo vai pronto para o WhatsApp.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Marcas de grelha desenhadas em SVG nos títulos ao entrar na tela.
- Botão de pedir fixo no mobile com contador de itens.
- Cards de lanche com tilt e fumaça em CSS no hover.
- Selo "Desde 2013" com rotação contínua lenta.
- Transições entre páginas com cortina na cor de destaque da paleta (Motion + App Router).

## Estrutura das seções
1. Hero com o lanche 3D e o CTA "Pedir no WhatsApp"
2. Cardápio: lanches, grelhados, porções, bebidas
3. Monte seu lanche
4. Combos
5. Desde 2013 no G Norte (história curta)
6. Endereço na QNG 13, horário e área de entrega

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (formulários, accordion, dialog).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom, Depth of Field e Noise com moderação). Física com @react-three/rapier só onde o conceito pedir. Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve, <ContactShadows> e <AccumulativeShadows> quando couber.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações de interface (hover, botões magnéticos, transições de página).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando o hero estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento da cena, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile: cena simplificada (menos partículas, sem pós-processamento) e interação por toque e giroscópio opcional. Em aparelhos muito fracos, troque o Canvas por um vídeo curto em loop (WebM/MP4) gravado da própria cena.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO local: metadata e Open Graph por página; JSON-LD schema.org do tipo Restaurant (servesCuisine: Lanches, Grelhados) com nome, endereço completo, telefone, geo, horário (openingHoursSpecification) e Instagram em sameAs; sitemap.xml, robots.txt, lang="pt-BR". Título da home no formato "Snack Grill | Lanches e grelhados em Taguatinga Norte - DF".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/556133541491?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20fazer%20um%20pedido.), link tel:, botão "Como chegar" abrindo o Google Maps com o endereço, link para o Instagram. Meça os cliques com Vercel Analytics ou GA4.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços, avaliações, prêmios, números ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use as fotos do Instagram do cliente (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a foto ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos e fotos, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte.

---

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

---

