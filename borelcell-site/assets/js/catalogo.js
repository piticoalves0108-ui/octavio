/*
 * Catálogo da Borel Cell.
 * Ajuste esta lista ao estoque real da loja: apague, mude ou acrescente modelos.
 * Não precisa rodar build depois de editar.
 *
 * Campos de cada modelo:
 *   id        identificador único, sem espaço
 *   marca     precisa ser igual a um nome em BOREL_CONFIG.marcas para aparecer no filtro
 *   nome      nome do modelo
 *   selo      etiqueta curta opcional (ex.: "Lançamento")
 *   pontos    até 3 destaques curtos
 *   cores     lista de { nome, hex }
 *   memorias  opções de armazenamento
 *   visual    desenho do celular: "plateau3", "bar1", "pill2", "diag2",
 *             "float3", "float5", "square3" ou "square4"
 *   so        "ios" ou "android"
 *   tamanho   "compacto", "medio" ou "grande"
 *   linha     "top" (topo de linha), "mid" (equilíbrio) ou "entry" (custo-benefício)
 *   notas     de 1 a 5, usadas só no teste de match
 */
window.BOREL_CATALOGO = [
  {
    id: "iphone-17-pro-max", marca: "Apple", nome: "iPhone 17 Pro Max", selo: "Lançamento",
    pontos: ["Tela de 6,9\"", "Três câmeras de 48 MP", "Chip A19 Pro"],
    cores: [
      { nome: "Laranja-cósmico", hex: "#E0702F" },
      { nome: "Azul-intenso", hex: "#2D3B58" },
      { nome: "Prateado", hex: "#DADBDD" }
    ],
    memorias: ["256 GB", "512 GB", "1 TB", "2 TB"],
    visual: "plateau3", so: "ios", tamanho: "grande", linha: "top",
    notas: { camera: 5, desempenho: 5, bateria: 5, custo: 1 }
  },
  {
    id: "iphone-17-pro", marca: "Apple", nome: "iPhone 17 Pro", selo: "Lançamento",
    pontos: ["Tela de 6,3\"", "Três câmeras de 48 MP", "Chip A19 Pro"],
    cores: [
      { nome: "Azul-intenso", hex: "#2D3B58" },
      { nome: "Laranja-cósmico", hex: "#E0702F" },
      { nome: "Prateado", hex: "#DADBDD" }
    ],
    memorias: ["256 GB", "512 GB", "1 TB"],
    visual: "plateau3", so: "ios", tamanho: "compacto", linha: "top",
    notas: { camera: 5, desempenho: 5, bateria: 4, custo: 1 }
  },
  {
    id: "iphone-air", marca: "Apple", nome: "iPhone Air", selo: "Ultrafino",
    pontos: ["O iPhone mais fino até hoje", "Tela de 6,5\"", "Chip A19 Pro"],
    cores: [
      { nome: "Azul-céu", hex: "#C9DBEA" },
      { nome: "Dourado-claro", hex: "#E8DCC5" },
      { nome: "Branco-nuvem", hex: "#F1F0EC" },
      { nome: "Preto-espacial", hex: "#232427" }
    ],
    memorias: ["256 GB", "512 GB", "1 TB"],
    visual: "bar1", so: "ios", tamanho: "medio", linha: "top",
    notas: { camera: 3, desempenho: 5, bateria: 3, custo: 2 }
  },
  {
    id: "iphone-17", marca: "Apple", nome: "iPhone 17", selo: "Lançamento",
    pontos: ["Tela de 6,3\" com 120 Hz", "Câmera dupla de 48 MP", "Chip A19"],
    cores: [
      { nome: "Lavanda", hex: "#CDC2E0" },
      { nome: "Sálvia", hex: "#B7C3A5" },
      { nome: "Azul-névoa", hex: "#AFC4D8" },
      { nome: "Branco", hex: "#F2F2F0" },
      { nome: "Preto", hex: "#2A2B2E" }
    ],
    memorias: ["256 GB", "512 GB"],
    visual: "pill2", so: "ios", tamanho: "compacto", linha: "mid",
    notas: { camera: 4, desempenho: 4, bateria: 4, custo: 3 }
  },
  {
    id: "iphone-16", marca: "Apple", nome: "iPhone 16",
    pontos: ["Tela de 6,1\"", "Botão Controle da Câmera", "Chip A18"],
    cores: [
      { nome: "Ultramarino", hex: "#5B6FD8" },
      { nome: "Verde-acinzentado", hex: "#A9C7C0" },
      { nome: "Rosa", hex: "#F2B8CF" },
      { nome: "Branco", hex: "#F2F2F0" },
      { nome: "Preto", hex: "#2A2B2E" }
    ],
    memorias: ["128 GB", "256 GB", "512 GB"],
    visual: "pill2", so: "ios", tamanho: "compacto", linha: "mid",
    notas: { camera: 4, desempenho: 4, bateria: 3, custo: 3 }
  },
  {
    id: "iphone-15", marca: "Apple", nome: "iPhone 15",
    pontos: ["Tela de 6,1\"", "Câmera principal de 48 MP", "Conector USB-C"],
    cores: [
      { nome: "Rosa", hex: "#F3D3D9" },
      { nome: "Amarelo", hex: "#F4EBC1" },
      { nome: "Verde", hex: "#D3E1CD" },
      { nome: "Azul", hex: "#CFDDE6" },
      { nome: "Preto", hex: "#34363A" }
    ],
    memorias: ["128 GB", "256 GB", "512 GB"],
    visual: "diag2", so: "ios", tamanho: "compacto", linha: "entry",
    notas: { camera: 3, desempenho: 3, bateria: 3, custo: 4 }
  },
  {
    id: "iphone-13", marca: "Apple", nome: "iPhone 13", selo: "Custo-benefício",
    pontos: ["Tela de 6,1\"", "Câmera dupla de 12 MP", "Chip A15 Bionic"],
    cores: [
      { nome: "Meia-noite", hex: "#2B3038" },
      { nome: "Estelar", hex: "#F1EBE1" },
      { nome: "Azul", hex: "#3D6A8C" },
      { nome: "Rosa", hex: "#F5D6D2" },
      { nome: "Verde", hex: "#4D5E4B" },
      { nome: "Vermelho", hex: "#C1252F" }
    ],
    memorias: ["128 GB", "256 GB", "512 GB"],
    visual: "diag2", so: "ios", tamanho: "compacto", linha: "entry",
    notas: { camera: 3, desempenho: 3, bateria: 2, custo: 5 }
  },
  {
    id: "galaxy-s25-ultra", marca: "Samsung", nome: "Galaxy S25 Ultra", selo: "Topo de linha",
    pontos: ["Tela de 6,9\"", "Câmera de 200 MP", "Caneta S Pen integrada"],
    cores: [
      { nome: "Titânio azul-prateado", hex: "#8EA3B5" },
      { nome: "Titânio preto", hex: "#2D2F33" },
      { nome: "Titânio cinza", hex: "#8B8C8E" },
      { nome: "Titânio branco-prateado", hex: "#E4E4E2" }
    ],
    memorias: ["256 GB", "512 GB", "1 TB"],
    visual: "float5", so: "android", tamanho: "grande", linha: "top",
    notas: { camera: 5, desempenho: 5, bateria: 5, custo: 1 }
  },
  {
    id: "galaxy-s25", marca: "Samsung", nome: "Galaxy S25",
    pontos: ["Tela de 6,2\"", "Compacto e leve", "Galaxy AI"],
    cores: [
      { nome: "Azul-gelo", hex: "#BFD3E6" },
      { nome: "Menta", hex: "#C9E3D3" },
      { nome: "Azul-marinho", hex: "#2E3A55" },
      { nome: "Prata", hex: "#C9CACC" }
    ],
    memorias: ["256 GB", "512 GB"],
    visual: "float3", so: "android", tamanho: "compacto", linha: "top",
    notas: { camera: 4, desempenho: 5, bateria: 3, custo: 2 }
  },
  {
    id: "galaxy-a56", marca: "Samsung", nome: "Galaxy A56 5G",
    pontos: ["Tela de 6,7\"", "Câmera de 50 MP", "5G"],
    cores: [
      { nome: "Oliva", hex: "#9DA582" },
      { nome: "Rosa", hex: "#E9C9CF" },
      { nome: "Cinza-claro", hex: "#C7C9CC" },
      { nome: "Grafite", hex: "#3A3C40" }
    ],
    memorias: ["128 GB", "256 GB"],
    visual: "float3", so: "android", tamanho: "grande", linha: "mid",
    notas: { camera: 3, desempenho: 3, bateria: 4, custo: 4 }
  },
  {
    id: "galaxy-a36", marca: "Samsung", nome: "Galaxy A36 5G",
    pontos: ["Tela de 6,7\"", "Carregamento de 45 W", "5G"],
    cores: [
      { nome: "Lavanda", hex: "#C9B9E4" },
      { nome: "Verde-limão", hex: "#D9E7A6" },
      { nome: "Branco", hex: "#EEEEEC" },
      { nome: "Preto", hex: "#2C2D31" }
    ],
    memorias: ["128 GB", "256 GB"],
    visual: "float3", so: "android", tamanho: "grande", linha: "entry",
    notas: { camera: 3, desempenho: 3, bateria: 4, custo: 5 }
  },
  {
    id: "redmi-note-14-pro-5g", marca: "Xiaomi", nome: "Redmi Note 14 Pro 5G",
    pontos: ["Câmera de 200 MP", "Tela AMOLED de 6,67\"", "Resistência IP68"],
    cores: [
      { nome: "Roxo", hex: "#9C86C9" },
      { nome: "Azul", hex: "#4E78A8" },
      { nome: "Preto", hex: "#26272B" }
    ],
    memorias: ["256 GB", "512 GB"],
    visual: "square3", so: "android", tamanho: "grande", linha: "mid",
    notas: { camera: 4, desempenho: 3, bateria: 4, custo: 5 }
  },
  {
    id: "poco-x7-pro", marca: "Xiaomi", nome: "POCO X7 Pro", selo: "Para jogos",
    pontos: ["Processador Dimensity 8400-Ultra", "Bateria de 6.000 mAh", "Tela AMOLED de 6,67\""],
    cores: [
      { nome: "Amarelo", hex: "#F2C531" },
      { nome: "Verde", hex: "#47665A" },
      { nome: "Preto", hex: "#232427" }
    ],
    memorias: ["256 GB", "512 GB"],
    visual: "square4", so: "android", tamanho: "grande", linha: "mid",
    notas: { camera: 3, desempenho: 5, bateria: 5, custo: 5 }
  },
  {
    id: "motorola-edge-60-pro", marca: "Motorola", nome: "Motorola Edge 60 Pro",
    pontos: ["Tela pOLED de 6,7\"", "Resistência IP68 e IP69", "Câmera de 50 MP"],
    cores: [
      { nome: "Azul", hex: "#2F5BA8" },
      { nome: "Uva", hex: "#6B3D63" },
      { nome: "Preto", hex: "#2A2B2F" }
    ],
    memorias: ["256 GB", "512 GB"],
    visual: "square3", so: "android", tamanho: "grande", linha: "mid",
    notas: { camera: 4, desempenho: 4, bateria: 4, custo: 4 }
  },
  {
    id: "moto-g85", marca: "Motorola", nome: "Moto g85 5G",
    pontos: ["Tela pOLED de 6,7\"", "Câmera de 50 MP", "5G"],
    cores: [
      { nome: "Azul-cobalto", hex: "#3C55A5" },
      { nome: "Verde-oliva", hex: "#6F7A55" },
      { nome: "Cinza", hex: "#6D7076" }
    ],
    memorias: ["128 GB", "256 GB"],
    visual: "square3", so: "android", tamanho: "grande", linha: "entry",
    notas: { camera: 3, desempenho: 2, bateria: 4, custo: 5 }
  }
];
