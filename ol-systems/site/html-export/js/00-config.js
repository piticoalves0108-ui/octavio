/**
 * CONFIGURAÇÃO — edite aqui.
 *
 * whatsapp: só dígitos, 55 + DDD + número. (62) 99929-1420.
 *   Se ficar vazio, todos os botões de contato abrem o Direct do Instagram.
 * ga4Id / metaPixelId: {{CONFIRMAR: IDs do GA4 e do Pixel}}. Vazio = não carrega.
 * heroTitles: títulos do topo para teste A/B (?titulo=2 ou ?titulo=3 no link).
 *   *texto* = destaque; _texto_ = sublinhado verde.
 * demo: a conversa de exemplo da seção "Pediu, atualizou".
 */
const CONFIG = {
  whatsapp: "5562999291420",
  whatsappMessage: "Olá! Vim pelo site e quero um site para o meu negócio.",
  instagramHandle: "ol_systemss",
  ga4Id: "",
  metaPixelId: "",
  heroTitles: [
    "Site profissional para o seu negócio por *R$ 250/mês*, _atualizado_ sempre que você pedir.",
    "Site pronto, no ar e sempre _atualizado_. Você só manda *mensagem*.",
    "O Instagram mostra. O site *vende*. Tenha os dois por *R$ 250/mês*.",
  ],
  price: 250,
  demo: {
    scenarios: [
      { tab: "Horário", ask: "Oi! Muda o horário de sábado para 8h às 14h, por favor", reply: "Feito! ✓ Já está no site.", update: { saturday: "Sábado: 8h às 14h" } },
      { tab: "Preço", ask: "Pode atualizar o bolo de cenoura para R$ 35?", reply: "Pronto! ✓ Preço novo no ar.", update: { cakePrice: "R$ 35" } },
      { tab: "Foto da vitrine", ask: "Troca a foto da vitrine por essa nova, por favor", reply: "Trocada! ✓ Ficou linda.", attachment: true, update: { showcase: "b" } },
    ],
  },
  // Bibliotecas carregadas sob demanda (versões fixas).
  cdn: {
    gsap: "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js",
    scrollTrigger: "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js",
    splitText: "https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js",
    lenis: "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js",
    three: "https://cdn.jsdelivr.net/npm/three@0.186.1/+esm",
    effectComposer: "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/postprocessing/EffectComposer.js/+esm",
    renderPass: "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/postprocessing/RenderPass.js/+esm",
    unrealBloomPass: "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/postprocessing/UnrealBloomPass.js/+esm",
    outputPass: "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/postprocessing/OutputPass.js/+esm",
  },
};
