import {
  acabamentoPorId,
  corPorId,
  linhaPorModelo,
  linhas,
  tecidoPorId,
  type AcabamentoId,
  type ModeloId,
  type TecidoId,
} from "@/content/catalogo";
import { whatsappPrincipal } from "@/content/negocio";

/** encodeURIComponent que também codifica ! ' ( ) * (o WhatsApp lida melhor assim). */
function codificar(texto: string) {
  return encodeURIComponent(texto).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function linkWhatsapp(mensagem: string, numero: string = whatsappPrincipal.e164) {
  return `https://wa.me/${numero}?text=${codificar(mensagem)}`;
}

export const tiposDeEspaco = [
  { id: "salao", nome: "Salão de beleza" },
  { id: "esmalteria", nome: "Esmalteria" },
  { id: "barbearia", nome: "Barbearia" },
  { id: "estudio", nome: "Estúdio de beleza" },
] as const;

export const momentos = [
  { id: "abrindo", nome: "Estou abrindo o espaço" },
  { id: "reformando", nome: "Estou reformando" },
] as const;

export type DadosDoPedido = {
  modelo: ModeloId;
  tecido: TecidoId;
  cor: string;
  acabamento: AcabamentoId;
  quantidade: number;
  espaco: string;
  momento: string;
  nome: string;
  linkConfiguracao?: string;
};

export function mensagemDoConfigurador(d: DadosDoPedido) {
  const linha = linhaPorModelo(d.modelo);
  const espaco = tiposDeEspaco.find((e) => e.id === d.espaco)?.nome;
  const momento = momentos.find((m) => m.id === d.momento)?.nome;
  const partes = [
    "Olá! Vim pelo site e quero um orçamento deste modelo:",
    "",
    `• Modelo: ${linha.nomeDoModelo}`,
    `• Estofado: ${tecidoPorId(d.tecido).nome}, cor ${corPorId(d.cor).nome}`,
    `• Acabamento da base: ${acabamentoPorId(d.acabamento).nome}`,
    `• Quantidade: ${d.quantidade}`,
  ];
  if (espaco) partes.push(`• Espaço: ${espaco}${momento ? ` (${momento.toLowerCase()})` : ""}`);
  else if (momento) partes.push(`• Momento: ${momento}`);
  if (d.nome.trim()) partes.push(`• Meu nome: ${d.nome.trim()}`);
  if (d.linkConfiguracao) partes.push("", `Configuração: ${d.linkConfiguracao}`);
  return partes.join("\n");
}

export function mensagemDoSalaoCompleto(d: Pick<DadosDoPedido, "tecido" | "cor" | "acabamento">) {
  return [
    "Olá! Vim pelo site e quero um orçamento para montar o salão completo:",
    "",
    `• Peças: ${linhas.map((l) => l.nome.toLowerCase()).join(", ")}`,
    `• Estofado: ${tecidoPorId(d.tecido).nome}, cor ${corPorId(d.cor).nome}`,
    `• Acabamento: ${acabamentoPorId(d.acabamento).nome}`,
    "",
    "Posso passar as quantidades e as medidas do espaço.",
  ].join("\n");
}

export function mensagemDaLinha(modelo: ModeloId) {
  return `Olá! Vim pelo site e quero um orçamento de ${linhaPorModelo(modelo).nome.toLowerCase()}.`;
}
