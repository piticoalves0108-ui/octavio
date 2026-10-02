# Prompt da página de vendas: OL Systems

Você é diretor(a) de arte, copywriter de resposta direta e dev front-end sênior, especialista em landing pages de alta conversão com 3D e motion design. Crie a página de vendas da **OL Systems** (@ol_systemss), que cria sites profissionais para empresas e para perfis/páginas do Instagram no modelo de assinatura: **R$ 250 por mês, com atualizações no site sempre que o cliente pedir**. Quero nível de agência premiada (padrão Awwwards), mas cada efeito precisa ajudar a vender. A página tem um único trabalho: levar o visitante a chamar no WhatsApp.

## Dados reais do negócio (use exatamente estes; não invente outros)
- Nome: OL Systems {{CONFIRMAR: grafia exata do nome e logo}}
- Instagram: @ol_systemss (https://www.instagram.com/ol_systemss/)
- O que vende: site profissional para empresas, comércios locais e perfis/páginas do Instagram
- Preço: R$ 250/mês
- Diferencial principal: atualizações no site sempre que o cliente quiser, incluídas na mensalidade
- WhatsApp: {{CONFIRMAR: DDD e número}}
- Área de atendimento: {{CONFIRMAR: só a cidade/região ou o Brasil todo, online}}
- Confirmar com o dono antes de publicar:
  - Tem taxa de criação ou adesão, ou começa só com a primeira mensalidade?
  - Tem fidelidade mínima? Multa para cancelar?
  - Domínio (.com.br) e hospedagem estão inclusos? O domínio fica registrado no nome de quem?
  - Prazo de entrega do site
  - Prazo de cada atualização (ex.: em até 24 h úteis) e o que conta como atualização (troca de texto, foto, preço, nova seção, nova página)
  - Quantas páginas ou seções o site tem
  - Se inclui e-mail profissional, cadastro no Google Meu Negócio, SEO e certificado SSL
  - Formas de pagamento (Pix, cartão, boleto, cobrança recorrente)
  - Sites já entregues para o portfólio (com autorização dos clientes)
  - Depoimentos e números reais (sites entregues, clientes ativos)

## Objetivo e público
- Conversão principal: botão "Quero meu site", que abre o WhatsApp com mensagem pronta. Secundária: "Ver sites que já fizemos".
- Origem do tráfego: principalmente o link da bio do Instagram e anúncios no Instagram, ou seja, celular e navegador interno do app.
- Público: donos de pequenas empresas e comércios locais (salão, barbearia, restaurante, loja, oficina, clínica), prestadores de serviço, profissionais liberais e perfis/páginas do Instagram que querem mais credibilidade e aparecer no Google.
- Momento do público: sabe que "deveria ter um site", mas acha caro, não sabe por onde começar e tem medo de pagar e ficar com um site desatualizado ou com um programador que some depois da entrega.

## Mensagem central e copy
- Promessa: "Seu site profissional por R$ 250/mês. Mudou alguma coisa? A gente atualiza."
- Ideia que precisa ficar na cabeça: o site não é um projeto que acaba no dia da entrega, é um serviço que acompanha o negócio. Mudou preço, horário, cardápio, endereço, promoção ou foto: manda no WhatsApp e está no ar.
- Opções de título para o hero (use a primeira e deixe as outras prontas para teste A/B):
  1. "Site profissional para o seu negócio por R$ 250/mês, atualizado sempre que você pedir."
  2. "Site pronto, no ar e sempre atualizado. Você só manda mensagem."
  3. "O Instagram mostra. O site vende. Tenha os dois por R$ 250/mês."
- Subtítulo: "A OL Systems cria, publica e cuida do site da sua empresa. Mudou preço, horário ou foto? Manda no WhatsApp que a gente atualiza, sem custo extra."
- Tom de voz: próximo, direto e confiante, de quem resolve. Frases curtas, nada de "soluções digitais inovadoras" nem jargão técnico. Fale com "você" e mostre o resultado (cliente achando a empresa no Google e chamando no WhatsApp), não a tecnologia.
- Objeções que a copy precisa responder:
  - "É caro": R$ 250/mês, menos de R$ 9 por dia.
  - "Não entendo nada de site": você não precisa mexer em nada.
  - "E se eu precisar mudar algo?": é só pedir no WhatsApp.
  - "Já tenho Instagram": o site é o endereço próprio da empresa na internet, aparece quando procuram o nome no Google e não depende do algoritmo.
  - "E se eu quiser cancelar?": {{CONFIRMAR: regra de cancelamento}}

## Direção de arte
- Conceito: "Sempre no ar, sempre atual". A página mostra um site sendo montado e atualizado ao vivo: blocos de interface que se encaixam como peças e um celular em que uma mensagem de WhatsApp vira, na hora, uma mudança no site.
- Paleta: {{CONFIRMAR: cores do logo e do Instagram da OL Systems; se existirem, elas substituem a paleta abaixo}}. Paleta provisória: grafite #0B0D12, painel #151924, azul elétrico #3D7BFF, verde WhatsApp #25D366 (só nos CTAs e nos selos "atualizado"), branco #F5F7FA, cinza texto #9AA3B2.
- Tipografia (Google Fonts via next/font): Space Grotesk (títulos, peso 700) + Inter (texto).
- Layout: grid de 12 colunas, muito respiro, seções curtas, um CTA visível em cada dobra e no máximo um momento "uau" por seção.

## Experiência 3D (React Three Fiber)
- Hero: um notebook e um celular flutuando em luz de estúdio, mostrando o mesmo site de exemplo. As partes do site (menu, banner, cards, rodapé) entram em camadas e se encaixam na tela, como se o site estivesse sendo montado. O mouse inclina levemente os aparelhos. As telas usam HTML de verdade via <Html transform> do drei ou um vídeo curto como textura, nunca imagem borrada.
- "Pediu, atualizou" (a seção mais importante da página): à esquerda, um celular com uma conversa de WhatsApp animada ("Oi! Muda o horário de sábado para 8h às 14h, por favor"). À direita, o site do cliente. Quando a resposta "Feito! ✓" aparece, o trecho do site muda na hora, com um brilho de destaque e o selo "atualizado agora". Três exemplos em sequência controlados pelo scroll (ScrollTrigger com pin): horário, preço de um produto e foto da vitrine.
- Portfólio: os sites dos clientes em telas de notebook e celular num carrossel 3D curvo. Arrastar ou rolar gira o carrossel; clicar abre o site real em nova aba.
- Fundo: grade de pontos sutil que reage ao cursor (shader leve), sem tirar a atenção do texto.

## Motion design (GSAP + ScrollTrigger + Lenis + Motion)
- Títulos entram com SplitText, palavra por palavra; a palavra "atualiza" ganha um sublinhado que se desenha.
- O preço "R$ 250" sobe num contador a partir de 0 e o "/mês" entra logo depois.
- A linha do tempo de "Como funciona" se desenha conforme o scroll e acende cada etapa.
- Na tabela comparativa, as linhas entram uma a uma e os "✓" e "✕" aparecem com um pequeno quique.
- Botão "Quero meu site" magnético, com um pulso discreto a cada 6 s enquanto o usuário não interage.
- No celular, uma barra fixa com o preço e o botão do WhatsApp aparece depois que o usuário passa do hero.

## Estrutura das seções
1. Hero: título, subtítulo, botões "Quero meu site" (WhatsApp) e "Ver sites que já fizemos", e uma linha de confiança abaixo dos botões ({{CONFIRMAR: ex.: sem taxa de adesão, sem fidelidade, site no ar em X dias}}).
2. O problema, "Só o Instagram não basta", em 3 cards curtos: quem procura no Google não te encontra; link da bio improvisado passa menos confiança; site desatualizado (horário errado, preço antigo) perde cliente.
3. A solução: o que a OL Systems faz, em uma frase, seguido da seção 3D "Pediu, atualizou".
4. O que está incluso (lista com ícones, só itens confirmados): site sob medida com a cara da empresa, versão para celular, botão de WhatsApp, mapa e "como chegar", link para o Instagram, SEO básico para aparecer no Google, hospedagem e domínio {{CONFIRMAR}}, certificado SSL {{CONFIRMAR}}, atualizações sempre que pedir.
5. Como funciona, em 4 passos: 1) você chama no WhatsApp e conta sobre o negócio; 2) a gente monta o site com a sua cara (logo, cores e fotos do Instagram); 3) você aprova e o site vai ao ar; 4) precisa mudar algo? Manda mensagem e a gente atualiza.
6. Comparativo "Site do jeito tradicional" x "OL Systems". Linhas: investimento inicial (valor alto pago de uma vez x R$ 250/mês {{CONFIRMAR: sem taxa de criação}}); alterações (cobradas à parte ou feitas por você x inclusas, é só pedir); quem cuida do site (você x a OL Systems); hospedagem e domínio (você contrata e paga x {{CONFIRMAR}}); suporte (some depois da entrega x direto no WhatsApp). Não cite concorrentes nem invente valores de mercado.
7. Para quem é: cards por ramo (comércio local, restaurantes e delivery, beleza e estética, saúde, prestadores de serviço, profissionais liberais, perfis e páginas do Instagram).
8. Portfólio: só sites reais entregues, com autorização. Enquanto não houver, mostre 3 modelos de demonstração com o selo "exemplo".
9. Plano e preço: um card único em destaque, "Site Sempre Atualizado", R$ 250/mês, a lista do que está incluso e o botão "Quero meu site". Abaixo, formas de pagamento e condições ({{CONFIRMAR}}) e a ancoragem "menos de R$ 9 por dia".
10. Depoimentos: só reais (print do WhatsApp ou texto com nome e empresa, com autorização). Se não houver nenhum, a seção não aparece.
11. Perguntas frequentes (accordion): Tem taxa de criação? Tem fidelidade? Em quanto tempo o site fica pronto? O que conta como atualização e em quanto tempo ela é feita? Posso pedir quantas atualizações quiser? O domínio fica no meu nome? Se eu cancelar, o que acontece com o site? Preciso ter CNPJ? Já tenho Instagram, preciso mesmo de site? Use {{CONFIRMAR}} em toda resposta que dependa de regra comercial.
12. CTA final: "Seu site no ar e sempre atualizado por R$ 250/mês." com botão grande do WhatsApp e link para o Instagram.
13. Rodapé: logo, Instagram, WhatsApp, CNPJ {{CONFIRMAR}} e link para a política de privacidade.

## Especificação técnica (obrigatória)
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4. Use shadcn/ui só onde ajudar (accordion do FAQ, dialog, formulários).
- 3D: three + @react-three/fiber + @react-three/drei + @react-three/postprocessing (Bloom e Noise com moderação). Modelos .glb comprimidos com Draco ou Meshopt e texturas KTX2; iluminação de estúdio com <Environment> leve e <ContactShadows>.
- Motion: GSAP 3 + ScrollTrigger + SplitText; Lenis para smooth scroll, sincronizado com o ScrollTrigger; Motion (Framer Motion) para microinterações (hover, botões magnéticos, barra fixa do mobile).
- Performance do 3D: carregue o <Canvas> com next/dynamic e ssr: false, só quando a seção estiver visível. Até lá, mostre um pôster estático (AVIF) com o mesmo enquadramento, para o LCP não depender do WebGL. Limite o dpr a [1, 1.75], use <PerformanceMonitor> do drei para baixar a qualidade em aparelhos fracos, use frameloop "demand" quando a cena estiver parada e pause o render fora da tela.
- Mobile primeiro: a maior parte das visitas vem do navegador interno do Instagram no celular. Lá, a cena é simplificada (sem pós-processamento, menos objetos) e, em aparelhos fracos, o Canvas vira um vídeo curto em loop (WebM/MP4) gravado da própria cena. O botão do WhatsApp precisa estar sempre a um toque de distância.
- Acessibilidade: respeite prefers-reduced-motion (desliga smooth scroll, parallax e animações longas e mantém só fades curtos). Contraste WCAG AA, navegação por teclado com foco visível, texto alternativo em todas as imagens. Todo o conteúdo precisa ser legível sem WebGL.
- SEO: metadata e Open Graph com imagem de compartilhamento própria; JSON-LD schema.org do tipo ProfessionalService com Instagram em sameAs e makesOffer contendo um Offer com price "250.00", priceCurrency "BRL" e priceSpecification do tipo UnitPriceSpecification com unitCode "MON"; JSON-LD FAQPage com as perguntas do FAQ; sitemap.xml, robots.txt, lang="pt-BR". Título da home: "Sites profissionais por R$ 250/mês com atualizações | OL Systems".
- Conversão: botão flutuante de WhatsApp com mensagem pronta (https://wa.me/55{{CONFIRMAR: DDD e número}}?text=Ol%C3%A1%21%20Vim%20pelo%20site%20e%20quero%20um%20site%20para%20o%20meu%20neg%C3%B3cio.), todos os CTAs apontando para o mesmo link, e repasse de parâmetros UTM para separar visitas da bio e dos anúncios. Meça os cliques com GA4 e com o Meta Pixel (evento Contact no clique do WhatsApp) {{CONFIRMAR: IDs do GA4 e do Pixel}}.
- Metas: Lighthouse mobile com 90+ em Performance e 100 em Acessibilidade, SEO e Boas práticas; LCP abaixo de 2,5 s; CLS abaixo de 0,1; JS inicial abaixo de 200 kB, sem contar o chunk do 3D.
- Conteúdo: todos os textos em português do Brasil, prontos para publicar. Não invente preços além dos R$ 250/mês, avaliações, prêmios, números, clientes ou depoimentos. Onde faltar informação, deixe o marcador {{CONFIRMAR: ...}} visível no código e liste todos no README.
- Imagens: use o logo e as fotos do Instagram da OL Systems (com autorização) em /public/images. Até lá, use placeholders na mesma proporção, com uma legenda descrevendo a imagem ideal.

## Entregáveis
- Projeto completo e funcionando, com a estrutura de pastas comentada.
- README com: como rodar, como trocar textos, preço e fotos, como adicionar um site novo ao portfólio, a lista de marcadores CONFIRMAR, a origem e a licença de cada modelo 3D (Sketchfab ou Poly Pizza com licença CC0/CC-BY, ou geometria procedural feita no código) e o passo a passo de deploy na Vercel com domínio próprio.
- No fim, explique em até 5 linhas as decisões de direção de arte e de copy.
