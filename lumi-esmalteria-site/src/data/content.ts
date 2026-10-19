import { brand } from "./brand";

/** Textos institucionais. Depoimentos, equipe, valores e diferenciais são ilustrativos: confirme com a Lumi antes de publicar. */

const u = (id: string) => `https://images.unsplash.com/${id}`;

export const testimonials = [
  { quote: "Saio da Lumi mais leve do que entrei. O spa dos pés virou meu presente de toda sexta.", name: "Juliana M.", service: "Spa dos Pés" },
  { quote: "Meu gel dura três semanas certinho e a remoção não destrói minha unha. Achei meu lugar.", name: "Patrícia R.", service: "Esmaltação em Gel" },
  { quote: "Levei uma foto do Pinterest e elas fizeram ainda mais bonito. Nail art com acabamento de joia.", name: "Carol S.", service: "Nail Design" },
  { quote: "Roía as unhas desde criança. Com o alongamento e a blindagem, finalmente deixei crescer.", name: "Bianca F.", service: "Alongamento" },
  { quote: "Atendimento pontual, tudo muito limpo e cuidado em cada detalhe. Faz toda a diferença.", name: "Renata A.", service: "Unhas Tradicionais" },
  { quote: "Fiz as unhas do meu casamento aqui. A prova de cor antes me deu uma paz enorme.", name: "Amanda L.", service: "Dia de Noiva" },
];

export const team = [
  { name: "Lívia", role: "Nail designer · nail art autoral", image: u("photo-1494790108377-be9c29b29330") },
  { name: "Mariana", role: "Especialista em alongamento", image: u("photo-1438761681033-6461ffad8d80") },
  { name: "Clara", role: "Spa dos pés e pedicure", image: u("photo-1544005313-94ddf0286df2") },
  { name: "Bruna", role: "Esmaltação em gel e blindagem", image: u("photo-1580489944761-15a19d654956") },
];

/** Profissionais no agendamento */
export const professionals = [{ id: "qualquer", name: "Sem preferência" }, ...team.map((t) => ({ id: t.name.toLowerCase(), name: t.name }))];

export const values = [
  { title: "Autocuidado sem pressa", text: "Cada atendimento tem tempo de verdade. A sua hora aqui é uma pausa, não uma corrida.", icon: "Hourglass" },
  { title: "Biossegurança", text: "Materiais higienizados e esterilizados e um cuidado rigoroso com a higiene em todos os atendimentos.", icon: "ShieldCheck" },
  { title: "Técnica e delicadeza", text: "Atenção à saúde da unha natural antes da estética, com técnica e cuidado em cada etapa.", icon: "Sparkles" },
  { title: "Acolhimento", text: "Um espaço claro e acolhedor, pensado para você relaxar, com mimos para a sua pausa.", icon: "Heart" },
] as const;

export const whyLumi = [
  { title: "Esmaltação que dura", text: "Camadas finas, cura correta e top coat de alto brilho para o acabamento resistir de verdade.", stat: "Gel", statLabel: "brilho por semanas" },
  { title: "Biossegurança", text: "Materiais higienizados e esterilizados, com cuidado rigoroso em cada etapa. Higiene não é detalhe.", stat: "Higiene", statLabel: "em cada detalhe" },
  { title: "Nail art autoral", text: "Desenhos criados com você, do minimalismo ao cromado espelhado.", stat: "Autoral", statLabel: "criada com você" },
  { title: "Agenda pelo WhatsApp", text: "Escolha o serviço, o dia e o horário em um minuto. A confirmação chega pelo WhatsApp.", stat: "1 min", statLabel: "para agendar" },
];

export const faq = [
  { q: "Quanto tempo dura a esmaltação em gel?", a: "Em média de 15 a 21 dias, dependendo do crescimento da unha e da rotina. Recomendamos a manutenção a cada três semanas." },
  { q: "A remoção do gel estraga a unha?", a: "Não, quando feita com técnica: lixamos só a camada de cor e removemos o restante com cuidado, sem raspar a unha natural." },
  { q: "Preciso levar referência para o nail design?", a: "Pode trazer fotos, mas não é obrigatório. Criamos o desenho com você no início do atendimento." },
  { q: "Como funciona o agendamento?", a: `Você escolhe serviço, dia e horário no site e envia o pedido pelo WhatsApp ${brand.contact.whatsappDisplay}. Confirmamos a disponibilidade pela conversa.` },
  { q: "E se eu me atrasar ou precisar remarcar?", a: "Chegar no horário garante o atendimento completo. Se precisar remarcar ou cancelar, avise pelo WhatsApp com a maior antecedência possível." },
  { q: "Atendem gestantes e diabéticas?", a: "Gestantes e diabéticas pedem cuidados específicos. Conte no agendamento para prepararmos o atendimento adequado." },
];

export const marqueeItems = ["Autocuidado", "Nail Design", "Spa dos Pés", "Alongamento", "Esmaltação em Gel", "Blindagem", "Cromados", "Francesinha"];
