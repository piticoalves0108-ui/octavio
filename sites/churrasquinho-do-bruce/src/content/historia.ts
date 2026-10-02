import type { Foto } from "./fotos";

/**
 * Seção "Na brasa desde...".
 *
 * Os três blocos usam só fatos confirmados (endereço, horário, o que vende,
 * delivery). A história do Bruce em si ainda precisa ser contada por ele:
 * o campo `historia` de cada bloco aparece só quando for preenchido.
 */

// {{CONFIRMAR: ano de abertura. Com ele o título vira "Na brasa desde <ano>"}}
export const anoDeAbertura: number | null = null;

export const introHistoria =
  "{{CONFIRMAR: história do Bruce em 2 ou 3 frases: quem é, como começou, por que ali na QI 23}}";

export type BlocoHistoria = {
  id: string;
  rotulo: string;
  titulo: string;
  texto: string;
  historia?: string;
  foto: Foto;
};

export const blocosHistoria: BlocoHistoria[] = [
  {
    id: "ponto",
    rotulo: "01 · O ponto",
    titulo: "QI 23, em frente ao Top Life",
    texto:
      "Setor Industrial de Taguatinga Norte. Do outro lado da rua, o Top Life Miami Beach. Quem mora ali já sabe o caminho.",
    historia: "{{CONFIRMAR: desde quando o Bruce está nesse ponto e como escolheu o lugar}}",
    foto: {
      src: null,
      alt: "Fachada do Churrasquinho do Bruce à noite, com a churrasqueira acesa",
      legenda: "Foto ideal: a fachada à noite, churrasqueira acesa e o Top Life ao fundo. Vertical, 4:5.",
      proporcao: "4/5",
    },
  },
  {
    id: "brasa",
    rotulo: "02 · A brasa",
    titulo: "Do almoço ao último espeto",
    texto:
      "Churrasquinho, hambúrguer e almoço. De segunda a sábado, das 11h às 23h: abre na hora do almoço e segue até a noite.",
    historia: "{{CONFIRMAR: como o Bruce começou na brasa (primeira churrasqueira, primeiro cardápio)}}",
    foto: {
      src: null,
      alt: "Espetinhos na churrasqueira do Bruce, com as brasas acesas",
      legenda: "Foto ideal: close dos espetos na grelha, fumaça e brasa bem visíveis. Horizontal, 4:3.",
      proporcao: "4/3",
    },
  },
  {
    id: "turma",
    rotulo: "03 · A turma",
    titulo: "Pra comer aqui ou pedir em casa",
    texto:
      "Morador do Top Life, quem trabalha no Setor Industrial, quem sai à noite atrás de um espeto. Não deu pra vir? Tem delivery pelo iFood.",
    historia: "{{CONFIRMAR: alguma história real de cliente fiel ou da equipe (só com autorização)}}",
    foto: {
      src: null,
      alt: "Clientes comendo churrasquinho nas mesas do Churrasquinho do Bruce",
      legenda: "Foto ideal: mesas cheias no fim da tarde, gente comendo (com autorização de quem aparece). Vertical, 3:4.",
      proporcao: "3/4",
    },
  },
];
