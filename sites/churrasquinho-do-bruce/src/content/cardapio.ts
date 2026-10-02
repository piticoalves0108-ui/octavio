/**
 * Cardápio.
 *
 * - `preco: null` = preço ainda não confirmado. O card não mostra preço e a
 *   categoria manda o cliente ver o valor no iFood ou no WhatsApp.
 *   Quando houver preço, troque por um número (ex.: 12.5) e o card passa a
 *   mostrar o valor com a contagem de 0 até o preço.
 * - Textos com `{{CONFIRMAR: ...}}` aparecem como marcador em desenvolvimento
 *   e ficam escondidos em produção (ver src/lib/pendente.ts).
 * - `peca` liga o item ao pedaço do espeto 3D que aparece ao lado dele.
 */

export type PecaEspeto = "carne" | "frango" | "linguica" | "queijo";

export type ItemCardapio = {
  id: string;
  nome: string;
  descricao?: string;
  preco: number | null;
  peca?: PecaEspeto;
};

export type Categoria = {
  id: "espetinhos" | "hamburgueres" | "almoco" | "bebidas";
  titulo: string;
  chamada: string;
  itens: ItemCardapio[];
};

export const cardapio: Categoria[] = [
  {
    id: "espetinhos",
    titulo: "Espetinhos",
    chamada: "Direto da brasa. Escolhe o seu.",
    // Os quatro sabores vêm do briefing (são os pedaços do espeto 3D).
    // {{CONFIRMAR: nomes exatos, descrição e preço de cada espetinho; se há outros sabores}}
    itens: [
      {
        id: "espetinho-carne",
        nome: "Espetinho de carne",
        descricao: "{{CONFIRMAR: descrição do espetinho de carne (corte e tempero)}}",
        preco: null,
        peca: "carne",
      },
      {
        id: "espetinho-frango",
        nome: "Espetinho de frango",
        descricao: "{{CONFIRMAR: descrição do espetinho de frango}}",
        preco: null,
        peca: "frango",
      },
      {
        id: "espetinho-linguica",
        nome: "Espetinho de linguiça",
        descricao: "{{CONFIRMAR: descrição do espetinho de linguiça}}",
        preco: null,
        peca: "linguica",
      },
      {
        id: "espetinho-queijo",
        nome: "Queijo coalho",
        descricao: "{{CONFIRMAR: descrição do queijo coalho (com melaço? orégano?)}}",
        preco: null,
        peca: "queijo",
      },
    ],
  },
  {
    id: "hamburgueres",
    titulo: "Hambúrgueres",
    chamada: "Do espeto pro pão: tem hambúrguer também.",
    itens: [
      { id: "hamburguer-1", nome: "{{CONFIRMAR: nome do hambúrguer 1}}", descricao: "{{CONFIRMAR: ingredientes do hambúrguer 1}}", preco: null },
      { id: "hamburguer-2", nome: "{{CONFIRMAR: nome do hambúrguer 2}}", descricao: "{{CONFIRMAR: ingredientes do hambúrguer 2}}", preco: null },
      { id: "hamburguer-3", nome: "{{CONFIRMAR: nome do hambúrguer 3}}", descricao: "{{CONFIRMAR: ingredientes do hambúrguer 3}}", preco: null },
    ],
  },
  {
    id: "almoco",
    titulo: "Almoço",
    chamada: "De segunda a sábado, a partir das 11h.",
    itens: [
      { id: "almoco-1", nome: "{{CONFIRMAR: prato do almoço 1}}", descricao: "{{CONFIRMAR: o que vem no prato}}", preco: null },
      { id: "almoco-2", nome: "{{CONFIRMAR: prato do almoço 2}}", descricao: "{{CONFIRMAR: o que vem no prato}}", preco: null },
    ],
  },
  {
    id: "bebidas",
    titulo: "Bebidas",
    chamada: "Pra acompanhar o espeto.",
    itens: [
      { id: "bebida-1", nome: "{{CONFIRMAR: bebida 1}}", preco: null },
      { id: "bebida-2", nome: "{{CONFIRMAR: bebida 2}}", preco: null },
      { id: "bebida-3", nome: "{{CONFIRMAR: bebida 3}}", preco: null },
    ],
  },
];

export const categoria = (id: Categoria["id"]) => cardapio.find((c) => c.id === id)!;
