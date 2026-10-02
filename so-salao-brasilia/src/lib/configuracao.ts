import { create } from "zustand";
import {
  acabamentos,
  configuracaoInicial,
  cores,
  linhas,
  tecidos,
  type AcabamentoId,
  type ModeloId,
  type TecidoId,
} from "@/content/catalogo";

/**
 * Escolhas do cliente, compartilhadas entre o hero, o configurador e o "Monte seu salão".
 * Fica fora do React (zustand) para que a cena 3D e a interface leiam o mesmo estado.
 */
export type Configuracao = {
  modelo: ModeloId;
  tecido: TecidoId;
  cor: string;
  acabamento: AcabamentoId;
  quantidade: number;
  espaco: string;
  momento: string;
  nome: string;
};

type Acoes = {
  definir: (parcial: Partial<Configuracao>) => void;
};

export const useConfiguracao = create<Configuracao & Acoes>((set) => ({
  ...configuracaoInicial,
  quantidade: 1,
  espaco: "",
  momento: "",
  nome: "",
  definir: (parcial) => set(parcial),
}));

/* Link compartilhável: /configurador?modelo=cadeira&tecido=veludo&cor=rose&acabamento=dourado */

export function paramsDaConfiguracao(c: Pick<Configuracao, "modelo" | "tecido" | "cor" | "acabamento">) {
  return new URLSearchParams({ modelo: c.modelo, tecido: c.tecido, cor: c.cor, acabamento: c.acabamento }).toString();
}

export function configuracaoDosParams(params: URLSearchParams): Partial<Configuracao> {
  const saida: Partial<Configuracao> = {};
  const modelo = params.get("modelo");
  const tecido = params.get("tecido");
  const cor = params.get("cor");
  const acabamento = params.get("acabamento");
  if (modelo && linhas.some((l) => l.modelo === modelo)) saida.modelo = modelo as ModeloId;
  if (tecido && tecidos.some((t) => t.id === tecido)) saida.tecido = tecido as TecidoId;
  if (cor && cores.some((c) => c.id === cor)) saida.cor = cor;
  if (acabamento && acabamentos.some((a) => a.id === acabamento)) saida.acabamento = acabamento as AcabamentoId;
  return saida;
}
