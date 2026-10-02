import { negocio } from "@/content/negocio";

const NOMES_DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** Dia da semana e hora decimal no fuso de Brasília, independente do fuso do aparelho. */
function agoraEmBrasilia(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(data);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const dia = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(valor("weekday"));
  const hora = Number(valor("hour")) + Number(valor("minute")) / 60;
  return { dia, hora };
}

export type StatusHorario = { aberto: boolean; texto: string };

export function statusHorario(data = new Date()): StatusHorario {
  const { dias, abre, fecha } = negocio.horario;
  const { dia, hora } = agoraEmBrasilia(data);
  const abreHoje = (dias as readonly number[]).includes(dia);

  if (abreHoje && hora >= abre && hora < fecha) {
    return { aberto: true, texto: `Aberto agora · até ${fecha}h` };
  }
  if (abreHoje && hora < abre) {
    return { aberto: false, texto: `Fechado agora · abre hoje às ${abre}h` };
  }
  // Próximo dia de funcionamento.
  for (let i = 1; i <= 7; i++) {
    const proximo = (dia + i) % 7;
    if ((dias as readonly number[]).includes(proximo)) {
      const quando = i === 1 ? "amanhã" : NOMES_DIAS[proximo];
      return { aberto: false, texto: `Fechado agora · abre ${quando} às ${abre}h` };
    }
  }
  return { aberto: false, texto: negocio.horario.resumo };
}
