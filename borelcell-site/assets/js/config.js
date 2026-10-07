/*
 * Dados da Borel Cell.
 * Este é o único arquivo que você precisa editar para trocar contato, endereço e horário.
 * Não precisa rodar build depois de editar: é só salvar e recarregar a página.
 *
 * Campos vazios ("") ou listas vazias ([]) somem do site sozinhos.
 */
window.BOREL_CONFIG = {
  nome: "Borel Cell",

  // Usuário do Instagram, sem o @.
  instagram: "borelcell",

  // WhatsApp com DDI 55 + DDD + número, só números. Ex.: "5561999998888".
  // Enquanto estiver vazio, todos os botões abrem o Direct do Instagram
  // e a mensagem pronta é copiada para a pessoa só colar.
  whatsapp: "",

  // Primeira mensagem dos botões "Chamar".
  mensagemPadrao: "Olá, Borel Cell! Vim pelo site e quero saber mais sobre os celulares.",

  // Endereço da loja. Deixe "linha" vazio para esconder o cartão de endereço.
  endereco: {
    linha: "",      // Ex.: "Rua Exemplo, 123, loja 4"
    bairro: "",     // Ex.: "Centro"
    cidade: "",     // Ex.: "Brasília"
    uf: "",         // Ex.: "DF"
    cep: "",        // Ex.: "70000-000"
    mapsUrl: ""     // Link do Google Maps. Se ficar vazio, o site monta um link com o endereço.
  },

  // Horário de funcionamento. Dias: 0 = domingo, 1 = segunda ... 6 = sábado.
  // Deixe a lista vazia para esconder o horário e o selo "Aberto agora".
  horario: [
    // { dias: [1, 2, 3, 4, 5], abre: "09:00", fecha: "18:00" },
    // { dias: [6], abre: "09:00", fecha: "13:00" }
  ],
  fuso: "America/Sao_Paulo",

  // Formas de pagamento (aparece nas perguntas frequentes). Vazio = resposta genérica.
  pagamento: "",    // Ex.: "Pix, dinheiro e cartão de crédito."

  // Marcas que aparecem no topo, nas faixas animadas e nos filtros do catálogo.
  marcas: ["Apple", "Samsung", "Xiaomi", "Motorola"],

  // Cores do celular 3D do topo (nome + cor).
  coresDestaque: [
    { nome: "Lima", hex: "#C8FF2E" },
    { nome: "Grafite", hex: "#2E3036" },
    { nome: "Violeta", hex: "#6F58E8" },
    { nome: "Laranja", hex: "#F0682A" },
    { nome: "Titânio", hex: "#C9CBD0" }
  ],

  // Fotos do Instagram para a grade da seção "Instagram".
  // Coloque os arquivos em assets/img/instagram/ e liste aqui. Ex.:
  // { src: "assets/img/instagram/post-1.jpg", alt: "Vitrine com iPhones", link: "https://www.instagram.com/p/XXXX/" }
  // Lista vazia = o site mostra artes geradas no código.
  instagramFotos: []
};
