/**
 * Textos da página. Para trocar qualquer frase, edite aqui.
 * Um texto com confirmar("...") aparece destacado na página até ser trocado.
 */
import { site, terms } from "./site";

export const hero = {
  eyebrow: "Sites para empresas e perfis do Instagram",
  /**
   * Títulos para teste A/B. O primeiro é o padrão. Para testar outro,
   * abra a página com ?titulo=2 ou ?titulo=3 (ex.: no link do anúncio).
   * As partes entre * * ganham destaque e a parte entre _ _ ganha o sublinhado.
   */
  titles: [
    `Site profissional para o seu negócio por *${site.priceLabel}/mês*, _atualizado_ sempre que você pedir.`,
    "Site pronto, no ar e sempre _atualizado_. Você só manda *mensagem*.",
    `O Instagram mostra. O site *vende*. Tenha os dois por *${site.priceLabel}/mês*.`,
  ],
  subtitle:
    "A OL Systems cria, publica e cuida do site da sua empresa. Mudou preço, horário ou foto? Manda no WhatsApp que a gente atualiza, sem custo extra.",
  ctaPrimary: "Quero meu site",
  ctaSecondary: "Ver sites que já fizemos",
  trustLine: terms.trustLine,
};

export const problem = {
  label: "O problema",
  title: "Só o Instagram não basta.",
  cards: [
    {
      title: "No Google, ninguém te encontra",
      text: "Quem procura o nome da sua empresa ou o seu serviço no Google acha o concorrente que tem site.",
    },
    {
      title: "Link da bio improvisado passa menos confiança",
      text: "Um site com o seu nome, suas fotos e seus contatos mostra que o negócio é sério antes da primeira mensagem.",
    },
    {
      title: "Site desatualizado perde cliente",
      text: "Horário errado e preço antigo fazem o cliente desistir. E esperar semanas por uma alteração não dá.",
    },
  ],
};

export const solution = {
  label: "A solução",
  title: "Mudou alguma coisa? A gente _atualiza_.",
  text: "A OL Systems faz o seu site e continua cuidando dele todo mês. Você manda a mudança no WhatsApp e ela vai para o ar, sem pagar nada a mais por isso.",
};

/** Cena "Pediu, atualizou": a conversa e o site de exemplo. */
export const demo = {
  clientName: "Padaria Bom Grão",
  scenarios: [
    {
      tab: "Horário",
      ask: "Oi! Muda o horário de sábado para 8h às 14h, por favor",
      reply: "Feito! ✓ Já está no site.",
    },
    {
      tab: "Preço",
      ask: "Pode atualizar o bolo de cenoura para R$ 35?",
      reply: "Pronto! ✓ Preço novo no ar.",
    },
    {
      tab: "Foto da vitrine",
      ask: "Troca a foto da vitrine por essa nova, por favor",
      reply: "Trocada! ✓ Ficou linda.",
      attachment: true,
    },
  ],
};

export const included = {
  label: "O que está incluso",
  title: "Tudo o que o seu site precisa, num valor só.",
  items: [
    { icon: "palette", title: "Site sob medida", text: "Com o seu logo, suas cores e suas fotos." },
    { icon: "smartphone", title: "Perfeito no celular", text: "Feito primeiro para a tela onde o seu cliente está." },
    { icon: "whatsapp", title: "Botão de WhatsApp", text: "O cliente chama você com um toque." },
    { icon: "map", title: "Mapa e como chegar", text: "Endereço com rota direto no Google Maps." },
    { icon: "instagram", title: "Ligado ao Instagram", text: "Site e perfil trabalhando juntos." },
    { icon: "search", title: "SEO básico", text: "Estrutura certa para aparecer no Google." },
    { icon: "server", title: "Hospedagem inclusa", text: "Seu site no ar sem você contratar servidor. O domínio (.com.br) é à parte." },
    { icon: "lock", title: "Certificado SSL", text: "Cadeado de conexão segura no navegador, incluso." },
    { icon: "refresh", title: "Atualizações sem limite", text: `Mudou algo? Manda no WhatsApp e a gente atualiza em ${terms.updateTime}.` },
  ],
};

export const steps = {
  label: "Como funciona",
  title: "Do primeiro oi ao site no ar em 4 passos.",
  items: [
    { title: "Você chama no WhatsApp", text: "Conta sobre o seu negócio, o que vende e como quer ser encontrado." },
    { title: "A gente monta o site", text: "Com a sua cara: logo, cores e as fotos do seu Instagram." },
    { title: "Você aprova e vai ao ar", text: `Ajustamos o que precisar até ficar do seu jeito. Prazo de entrega: ${terms.deliveryTime}.` },
    { title: "Precisa mudar? É só pedir", text: "Manda mensagem com a mudança e a gente atualiza. Todo mês, sempre que você quiser." },
  ],
};

export const comparison = {
  label: "Comparativo",
  title: "Por que assinatura e não um site avulso?",
  columns: ["", "Site do jeito tradicional", site.name],
  rows: [
    {
      label: "Investimento inicial",
      them: "Valor alto pago de uma vez",
      us: `${site.priceLabel}/mês, sem taxa de adesão`,
    },
    {
      label: "Alterações",
      them: "Cobradas à parte ou feitas por você",
      us: "Inclusas e sem limite, em até 3 horas",
    },
    { label: "Quem cuida do site", them: "Você", us: site.name },
    {
      label: "Hospedagem",
      them: "Você contrata e paga",
      us: "Inclusa, com certificado SSL",
    },
    {
      label: "Suporte",
      them: "Some depois da entrega",
      us: "Direto no WhatsApp",
    },
  ],
};

export const audience = {
  label: "Para quem é",
  title: "Para quem quer ser encontrado e passar confiança.",
  items: [
    { icon: "store", label: "Comércio local" },
    { icon: "utensils", label: "Restaurantes e delivery" },
    { icon: "scissors", label: "Beleza e estética" },
    { icon: "stethoscope", label: "Saúde e clínicas" },
    { icon: "wrench", label: "Prestadores de serviço" },
    { icon: "briefcase", label: "Profissionais liberais" },
    { icon: "instagram", label: "Perfis e páginas do Instagram" },
  ],
};

/**
 * Portfólio. Só entram sites reais, entregues e com autorização do cliente.
 * Para adicionar um: { name, segment, url, theme } com example: false.
 * Os itens com example: true são modelos de demonstração e mostram o selo "exemplo".
 */
export type PortfolioItem = {
  name: string;
  segment: string;
  url?: string;
  example: boolean;
  theme: "barber" | "pizza" | "pet" | "bakery";
};

export const portfolio = {
  label: "Portfólio",
  title: "Sites que a gente faz.",
  note: "Modelos de demonstração. Os sites dos clientes entram aqui com autorização.",
  items: [
    { name: "Barbearia", segment: "Beleza", example: true, theme: "barber" },
    { name: "Pizzaria", segment: "Restaurante e delivery", example: true, theme: "pizza" },
    { name: "Pet shop", segment: "Comércio local", example: true, theme: "pet" },
    { name: "Padaria", segment: "Comércio local", example: true, theme: "bakery" },
  ] as PortfolioItem[],
};

export const pricing = {
  label: "Plano",
  title: "Um plano. Tudo incluso.",
  planName: "Site Sempre Atualizado",
  features: [
    "Site sob medida com a cara da sua empresa",
    "Versão perfeita para celular",
    "Botão de WhatsApp, mapa e Instagram",
    "SEO básico para aparecer no Google",
    "Hospedagem e certificado SSL inclusos",
    "Atualizações sem limite, em até 3 horas",
    "Suporte direto no WhatsApp",
  ],
  conditions: [`Pagamento via ${terms.payment}`],
};

/**
 * Depoimentos: só reais, com nome, empresa e autorização.
 * Enquanto a lista estiver vazia, a seção não aparece.
 */
export const testimonials: { name: string; business: string; text: string }[] = [];

export const faq = {
  label: "Perguntas frequentes",
  title: "Ficou alguma dúvida?",
  items: [
    { q: "Tem taxa de criação?", a: "Não. Sem taxa de adesão: você começa pagando só a primeira mensalidade." },
    { q: "Tem fidelidade?", a: "Não. O plano não tem fidelidade." },
    { q: "Como é o pagamento?", a: `Via ${terms.payment}, todo mês.` },
    { q: "Vocês atendem a minha cidade?", a: `Atendemos ${site.serviceArea}.` },
    { q: "Em quanto tempo o site fica pronto?", a: `Em ${terms.deliveryTime}.` },
    {
      q: "O que conta como atualização e em quanto tempo ela é feita?",
      a: `Trocas de texto, preço, horário e foto entram na mensalidade, sem limite. Prazo: ${terms.updateTime}.`,
    },
    { q: "Posso pedir quantas atualizações quiser?", a: terms.updateLimit },
    {
      q: "O domínio está incluso?",
      a: "Não. A mensalidade inclui a hospedagem e o certificado SSL; o domínio (.com.br) é contratado à parte.",
    },
    { q: "Se eu cancelar, o que acontece com o site?", a: `${terms.cancel} Como não tem fidelidade, você pode cancelar quando quiser.` },
    { q: "Preciso ter CNPJ?", a: terms.cnpjRequired },
    {
      q: "Já tenho Instagram. Preciso mesmo de site?",
      a: "O site é o endereço próprio da sua empresa na internet. Ele aparece quando procuram o seu nome no Google, não depende do algoritmo e reúne num lugar só o que o cliente precisa para comprar: serviços, preços, horário, endereço e o botão do WhatsApp.",
    },
    {
      q: "Não entendo nada de site. Vou ter que mexer em alguma coisa?",
      a: "Não. A gente cria, publica e cuida de tudo. Você só manda mensagem quando quiser mudar algo.",
    },
  ],
};

export const finalCta = {
  title: `Seu site no ar e sempre atualizado por ${site.priceLabel}/mês.`,
  text: "Chama no WhatsApp, conta sobre o seu negócio e a gente cuida do resto.",
};
