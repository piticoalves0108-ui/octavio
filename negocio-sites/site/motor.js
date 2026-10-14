/*
 * Motor da Fábrica de Sites (Vitrine 61)
 * Gera um site completo (um único HTML) a partir de uma configuração simples.
 * Funciona no navegador (window.Vitrine) e no Node (require('./motor.js')).
 */
(function (raiz) {
  'use strict';

  // ---------------------------------------------------------------- ícones
  var ICONES = {
    whatsapp: '<path fill="currentColor" stroke="none" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>',
    telefone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    pino: '<path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
    estrela: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    rota: '<path d="M3 11 22 2l-9 19-2-8z"/>',
    entrega: '<path d="M1 4h13v12H1zM14 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2"/><circle cx="17.5" cy="18.5" r="2"/>',
    calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    conversa: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
    escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    pessoas: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    tesoura: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
    navalha: '<path d="M3 21l7.5-7.5"/><path d="M10.5 13.5 20 4l-1.5-1.5L9 12z"/><path d="M14 9.5l1.5 1.5"/>',
    brilho: '<path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    talheres: '<path d="M3 2v7c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2V2M6 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
    chama: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    burger: '<path d="M4 11h16a1 1 0 0 0 1-1 9 7 0 0 0-18 0 1 1 0 0 0 1 1z"/><path d="M2.5 14.5c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1"/><path d="M4 18h16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
    pizza: '<path d="M3 5c5.5-2.7 12.5-2.7 18 0L12 22z"/><path d="M4.6 8.2c4.6-2 10.2-2 14.8 0"/><circle cx="10" cy="11.5" r="1.2"/><circle cx="14" cy="13.5" r="1.2"/><circle cx="11.6" cy="16.4" r="1"/>',
    pao: '<path d="M5 10.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 19 10.5V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M9.5 9l1.5 2.5M13.5 9l1.5 2.5"/>',
    cafe: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    bolo: '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20M7 8v3M12 8v3M17 8v3"/>',
    chopp: '<path d="M17 11h1a3 3 0 0 1 0 6h-1"/><path d="M9 12v6M13 12v6"/><path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8"/><path d="M5 8a2.5 2.5 0 0 1 .5-5c.9 0 1.5.6 2.5.6S9.5 2 11 2s2 1.5 3 1.5 1.6-.5 2.5-.5a2.5 2.5 0 0 1 .5 5z"/>',
    pata: '<circle cx="5" cy="10" r="2"/><circle cx="9" cy="5.5" r="2"/><circle cx="15" cy="5.5" r="2"/><circle cx="19" cy="10" r="2"/><path d="M8 16c0-2.2 1.8-4 4-4s4 1.8 4 4c0 1.4 1.3 1.9 1.3 3.2A2.3 2.3 0 0 1 15 21.5c-1.2 0-1.9-.6-3-.6s-1.8.6-3 .6a2.3 2.3 0 0 1-2.3-2.3C6.7 17.9 8 17.4 8 16z"/>',
    gota: '<path d="M12 2.7 6.3 8.4a8 8 0 1 0 11.4 0z"/>',
    pacote: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
    seringa: '<path d="m18 2 4 4M17 7l3-3M19 9 8.7 19.3a2.4 2.4 0 0 1-3.4 0l-.6-.6a2.4 2.4 0 0 1 0-3.4L15 5M9 11l4 4M5 19l-3 3M14 4l6 6"/>',
    chave: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    carro: '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M5 12h14"/>',
    pneu: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
    botijao: '<path d="M9 2h6v3H9z"/><path d="M7 5h10a3 3 0 0 1 3 3v9a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8a3 3 0 0 1 3-3z"/><path d="M4 11h16"/>',
    sacola: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    presente: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    paleta: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z"/>',
    balao: '<path d="M12 2a6 6 0 0 0-6 6c0 4 3 7 6 8 3-1 6-4 6-8a6 6 0 0 0-6-6z"/><path d="M11 16h2l-1 2z"/><path d="M12 18c0 2-2 2-2 4"/>',
    halter: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    coracao: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
    estetoscopio: '<path d="M5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 12 0V4a2 2 0 0 0-2-2h-1"/><path d="M8 15v1a6 6 0 0 0 12 0v-4"/><circle cx="20" cy="10" r="2"/>',
    martelo: '<path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15 22 10.64M20.91 11.7l-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91"/>',
    raio: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    casa: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    etiqueta: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5"/>',
    loja: '<path d="M3 9l1.5-5h15L21 9"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9M10 21v-5h4v5"/>',
    sofa: '<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>',
    regua: '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0z"/><path d="m14.5 12.5 2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"/>'
  };

  function icone(nome, classe) {
    var corpo = ICONES[nome] || ICONES.brilho;
    return '<svg class="' + (classe || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + corpo + '</svg>';
  }

  // ---------------------------------------------------------------- temas
  // Cada tema tem cores (todas com contraste AA para o texto em cima) e um par de fontes do Google Fonts.
  var TEMAS = {
    barbearia:   { escuro: true,  fundo: '#111111', fundo2: '#181716', cartao: '#201E1C', texto: '#F3EFE8', suave: '#B9B1A5', destaque: '#C9A24A', sobre: '#15120C', fTitulo: 'Oswald', pesos: '500;600;700', fTexto: 'Manrope', caixaAlta: true },
    salao:       { escuro: false, fundo: '#FBF7F4', fundo2: '#F4EAE4', cartao: '#FFFFFF', texto: '#2A1F24', suave: '#6E5C63', destaque: '#A63E66', sobre: '#FFFFFF', fTitulo: 'Playfair Display', pesos: '500;600;700', fTexto: 'Manrope' },
    restaurante: { escuro: false, fundo: '#FBF6EE', fundo2: '#F3EADB', cartao: '#FFFDF9', texto: '#2B1D14', suave: '#6F5B4B', destaque: '#A8401A', sobre: '#FFFFFF', fTitulo: 'Fraunces', pesos: '600;700;800', fTexto: 'Manrope' },
    lanchonete:  { escuro: true,  fundo: '#161210', fundo2: '#1E1916', cartao: '#28211C', texto: '#FFF6EC', suave: '#C9B9A8', destaque: '#F2A516', sobre: '#1A1208', fTitulo: 'Archivo', pesos: '700;800;900', fTexto: 'Manrope', caixaAlta: true },
    pizzaria:    { escuro: false, fundo: '#FFF8F0', fundo2: '#F6E8D8', cartao: '#FFFFFF', texto: '#2A1712', suave: '#72574D', destaque: '#B3211A', sobre: '#FFFFFF', fTitulo: 'DM Serif Display', pesos: '400', fTexto: 'Manrope' },
    padaria:     { escuro: false, fundo: '#FCF8F2', fundo2: '#F2E7D6', cartao: '#FFFFFF', texto: '#3A2716', suave: '#756049', destaque: '#8C5220', sobre: '#FFFFFF', fTitulo: 'Lora', pesos: '600;700', fTexto: 'Nunito' },
    petshop:     { escuro: false, fundo: '#F5FBFA', fundo2: '#E4F3F0', cartao: '#FFFFFF', texto: '#12302C', suave: '#4E6B68', destaque: '#0B7468', sobre: '#FFFFFF', fTitulo: 'Baloo 2', pesos: '600;700;800', fTexto: 'Nunito' },
    oficina:     { escuro: true,  fundo: '#0F1012', fundo2: '#16171A', cartao: '#1D1E21', texto: '#F4F4F2', suave: '#A9ABAF', destaque: '#FFC400', sobre: '#111111', fTitulo: 'Chakra Petch', pesos: '600;700', fTexto: 'Red Hat Text', caixaAlta: true },
    gas:         { escuro: false, fundo: '#F6F8FC', fundo2: '#E8EDF7', cartao: '#FFFFFF', texto: '#0F1B33', suave: '#4F5B73', destaque: '#B03A0B', sobre: '#FFFFFF', fTitulo: 'Archivo', pesos: '700;800', fTexto: 'Manrope' },
    loja:        { escuro: false, fundo: '#FFF9FB', fundo2: '#FAE9F1', cartao: '#FFFFFF', texto: '#2E1530', suave: '#6E5470', destaque: '#A0206F', sobre: '#FFFFFF', fTitulo: 'Fredoka', pesos: '500;600;700', fTexto: 'Nunito' },
    academia:    { escuro: true,  fundo: '#0B0B0C', fundo2: '#141416', cartao: '#1B1B1E', texto: '#F5F5F4', suave: '#A6A6AB', destaque: '#B6F23A', sobre: '#0B0B0C', fTitulo: 'Anton', pesos: '400', fTexto: 'Manrope', caixaAlta: true },
    saude:       { escuro: false, fundo: '#F7FAFB', fundo2: '#E8F1F3', cartao: '#FFFFFF', texto: '#10282F', suave: '#52666C', destaque: '#0A6A7C', sobre: '#FFFFFF', fTitulo: 'Figtree', pesos: '600;700;800', fTexto: 'Figtree' },
    servicos:    { escuro: false, fundo: '#F7F7F5', fundo2: '#EBEDF1', cartao: '#FFFFFF', texto: '#111827', suave: '#535C6B', destaque: '#B03A0B', sobre: '#FFFFFF', fTitulo: 'Archivo', pesos: '700;800', fTexto: 'Manrope' },
    outro:       { escuro: false, fundo: '#F8F8FB', fundo2: '#ECECF5', cartao: '#FFFFFF', texto: '#18181F', suave: '#585868', destaque: '#4338CA', sobre: '#FFFFFF', fTitulo: 'Manrope', pesos: '700;800', fTexto: 'Manrope' }
  };

  // ---------------------------------------------------------------- nichos
  // Textos padrão de cada ramo. Nada de preço, prêmio ou número inventado: só o que vale para qualquer negócio do ramo.
  var NICHOS = {
    barbearia: {
      rotulo: 'Barbearia', schema: 'HairSalon', icone: 'tesoura',
      titulo: 'Corte e barba no capricho{local}',
      subtitulo: 'Corte, barba e acabamento com atenção aos detalhes. Marque seu horário pelo WhatsApp em menos de um minuto.',
      cta: 'Agendar horário', msg: 'Olá! Vim pelo site e quero agendar um horário.',
      tituloServicos: 'Serviços',
      servicos: [
        ['Corte masculino', 'Na tesoura ou na máquina, do jeito que você pedir.'],
        ['Barba', 'Barba desenhada e acabamento na navalha.'],
        ['Corte + barba', 'O combo completo para sair renovado.'],
        ['Pezinho e sobrancelha', 'Acabamento rápido entre um corte e outro.'],
        ['Pigmentação', 'Para disfarçar falhas e realçar o desenho do corte.'],
        ['Corte infantil', 'Paciência e cuidado com os pequenos.']
      ],
      iconesServicos: ['tesoura', 'navalha', 'brilho', 'regua', 'paleta', 'pessoas'],
      diferenciais: [
        ['calendario', 'Horário marcado', 'Chame no WhatsApp, escolha o horário e chegue na hora certa.'],
        ['brilho', 'Atenção aos detalhes', 'Do degradê ao acabamento da barba, tudo feito com calma.'],
        ['pino', 'Fácil de chegar', 'Use o botão Como chegar e abra a rota direto no celular.']
      ],
      sobre: 'Na {nome}, cada cliente sai do jeito que pediu. Corte, barba e acabamento feitos com calma, num ambiente para você se sentir à vontade.',
      faq: [
        ['Preciso agendar?', 'O jeito mais rápido é chamar no WhatsApp: você escolhe o horário e já chega na hora certa.']
      ]
    },
    salao: {
      rotulo: 'Salão de beleza', schema: 'BeautySalon', icone: 'brilho',
      titulo: 'Sua beleza em boas mãos{local}',
      subtitulo: 'Cabelo, unhas e cuidados que fazem você se sentir bem. Agende pelo WhatsApp e escolha o melhor horário.',
      cta: 'Agendar horário', msg: 'Olá! Vim pelo site e quero agendar um horário.',
      tituloServicos: 'Serviços',
      servicos: [
        ['Corte e escova', 'Corte pensado para o seu rosto e finalização caprichada.'],
        ['Coloração e mechas', 'Da cobertura de brancos às mechas iluminadas.'],
        ['Tratamentos capilares', 'Hidratação, nutrição e reconstrução para os fios.'],
        ['Manicure e pedicure', 'Unhas bem feitas, com higiene e cuidado.'],
        ['Design de sobrancelhas', 'Desenho que valoriza o seu olhar.'],
        ['Maquiagem', 'Para festas, eventos e datas especiais.']
      ],
      iconesServicos: ['tesoura', 'paleta', 'gota', 'brilho', 'regua', 'estrela'],
      diferenciais: [
        ['calendario', 'Agende sem ligar', 'Mande uma mensagem no WhatsApp e reserve o seu horário.'],
        ['coracao', 'Atendimento com carinho', 'Um momento só seu, sem pressa.'],
        ['brilho', 'Cuidado em cada detalhe', 'Do corte à finalização, você sai como imaginou.']
      ],
      sobre: 'A {nome} é o lugar para você cuidar de si. Cabelo, unhas e beleza com atendimento atencioso, do jeito que você merece.',
      faq: [
        ['Como faço para agendar?', 'Chame no WhatsApp pelo botão do site, diga o serviço e escolha o melhor horário.']
      ]
    },
    restaurante: {
      rotulo: 'Restaurante', schema: 'Restaurant', icone: 'talheres',
      titulo: 'Comida boa, ambiente gostoso{local}',
      subtitulo: 'Venha comer com a gente ou faça seu pedido pelo WhatsApp. Veja o cardápio, o horário e como chegar.',
      cta: 'Fazer pedido', msg: 'Olá! Vim pelo site e quero fazer um pedido.',
      tituloServicos: 'Cardápio',
      servicos: [
        ['Almoço', 'Pratos do dia com aquele gostinho de comida de casa.'],
        ['Pratos executivos', 'Completo, bem servido e pronto rapidinho.'],
        ['Porções', 'Para dividir com os amigos.'],
        ['Bebidas', 'Sucos, refrigerantes e bebidas geladas.'],
        ['Sobremesas', 'Para fechar a refeição com doçura.'],
        ['Encomendas', 'Pedidos para grupos, eventos e confraternizações.']
      ],
      iconesServicos: ['talheres', 'estrela', 'chama', 'chopp', 'bolo', 'pessoas'],
      diferenciais: [
        ['conversa', 'Peça pelo WhatsApp', 'Mande seu pedido em poucos toques, sem baixar aplicativo.'],
        ['chama', 'Feito na hora', 'Comida preparada no capricho, do jeito que tem que ser.'],
        ['pessoas', 'Para toda a família', 'Ambiente para almoçar, jantar e encontrar os amigos.']
      ],
      sobre: 'O {nome} serve comida feita com carinho para quem mora e trabalha na região. Venha conhecer ou peça pelo WhatsApp.',
      faq: [
        ['Dá para pedir pelo WhatsApp?', 'Sim. Toque no botão do WhatsApp, mande seu pedido e combine a retirada ou a entrega.']
      ]
    },
    lanchonete: {
      rotulo: 'Lanchonete', schema: 'FastFoodRestaurant', icone: 'burger',
      titulo: 'Lanche caprichado e quentinho{local}',
      subtitulo: 'Hambúrgueres, espetinhos e porções feitos na hora. Peça pelo WhatsApp ou venha comer com a gente.',
      cta: 'Pedir agora', msg: 'Olá! Vim pelo site e quero fazer um pedido.',
      tituloServicos: 'Cardápio',
      servicos: [
        ['Hambúrgueres', 'Pão macio, carne suculenta e muito recheio.'],
        ['Espetinhos', 'Na brasa, no ponto certo.'],
        ['Porções', 'Batata, calabresa e outras para dividir.'],
        ['Lanches na chapa', 'Clássicos que nunca saem de moda.'],
        ['Bebidas', 'Refrigerantes, sucos e bebidas geladas.'],
        ['Combos', 'Lanche, acompanhamento e bebida num pedido só.']
      ],
      iconesServicos: ['burger', 'chama', 'estrela', 'pao', 'chopp', 'pacote'],
      diferenciais: [
        ['conversa', 'Pedido rápido', 'Mande seu pedido pelo WhatsApp em poucos toques.'],
        ['chama', 'Feito na hora', 'Nada de lanche parado: sai quentinho da chapa.'],
        ['pino', 'Fácil de achar', 'Abra a rota no celular com um toque.']
      ],
      sobre: 'O {nome} é parada certa para matar a fome com lanche bem feito. Venha comer aqui ou peça pelo WhatsApp.',
      faq: [
        ['Vocês fazem entrega?', 'Chame no WhatsApp e consulte a entrega para o seu endereço.']
      ]
    },
    pizzaria: {
      rotulo: 'Pizzaria', schema: 'Restaurant', icone: 'pizza', cozinha: 'Pizza',
      titulo: 'Pizza quentinha, massa no ponto{local}',
      subtitulo: 'Sabores tradicionais e especiais saindo do forno. Peça pelo WhatsApp em poucos toques.',
      cta: 'Pedir pizza', msg: 'Olá! Vim pelo site e quero pedir uma pizza.',
      tituloServicos: 'Cardápio',
      servicos: [
        ['Pizzas tradicionais', 'Calabresa, mussarela, portuguesa e os clássicos de sempre.'],
        ['Pizzas especiais', 'Combinações da casa para sair do comum.'],
        ['Pizzas doces', 'Para fechar a noite com sobremesa.'],
        ['Bordas recheadas', 'Aquele extra que faz diferença.'],
        ['Bebidas', 'Refrigerantes e sucos para acompanhar.'],
        ['Combos para a família', 'Mais pizza para dividir com quem você gosta.']
      ],
      iconesServicos: ['pizza', 'estrela', 'bolo', 'chama', 'chopp', 'pessoas'],
      diferenciais: [
        ['conversa', 'Peça pelo WhatsApp', 'Escolha os sabores e mande o pedido sem complicação.'],
        ['chama', 'Saindo do forno', 'Pizza preparada na hora do pedido.'],
        ['pessoas', 'Noite em família', 'Para pedir em casa ou comer com a gente.']
      ],
      sobre: 'Na {nome}, a noite fica melhor com pizza quentinha. Massa no ponto, recheio generoso e pedido fácil pelo WhatsApp.',
      faq: [
        ['Como faço o pedido?', 'Toque em Pedir pizza, escolha os sabores pelo WhatsApp e combine entrega ou retirada.']
      ]
    },
    padaria: {
      rotulo: 'Padaria', schema: 'Bakery', icone: 'pao',
      titulo: 'Pão quentinho todo dia{local}',
      subtitulo: 'Pães, bolos, salgados e café fresquinho. Faça sua encomenda pelo WhatsApp.',
      cta: 'Fazer encomenda', msg: 'Olá! Vim pelo site e quero fazer uma encomenda.',
      tituloServicos: 'Nossos produtos',
      servicos: [
        ['Pães', 'Francês, de forma, doces e especiais.'],
        ['Bolos e tortas', 'Para o café da tarde ou para comemorar.'],
        ['Salgados', 'Assados e fritos, perfeitos para o lanche.'],
        ['Café da manhã', 'Comece o dia com café fresquinho.'],
        ['Doces e sobremesas', 'Aquele docinho que alegra o dia.'],
        ['Encomendas para festas', 'Bolos, salgados e kits para o seu evento.']
      ],
      iconesServicos: ['pao', 'bolo', 'estrela', 'cafe', 'presente', 'pessoas'],
      diferenciais: [
        ['chama', 'Fornadas fresquinhas', 'Pão quentinho para o seu café.'],
        ['conversa', 'Encomende pelo WhatsApp', 'Peça bolos e salgados com antecedência e retire na hora marcada.'],
        ['pino', 'Pertinho de você', 'Abra a rota no celular com um toque.']
      ],
      sobre: 'A {nome} faz parte do dia a dia do bairro: pão quentinho, café e aquele bolo para a família.',
      faq: [
        ['Vocês aceitam encomendas?', 'Sim. Chame no WhatsApp com o que precisa e a data, que a gente confirma tudo com você.']
      ]
    },
    petshop: {
      rotulo: 'Pet shop', schema: 'PetStore', icone: 'pata',
      titulo: 'Cuidado e carinho para o seu pet{local}',
      subtitulo: 'Banho e tosa, rações e acessórios num lugar só. Agende pelo WhatsApp.',
      cta: 'Agendar banho', msg: 'Olá! Vim pelo site e quero agendar um banho e tosa.',
      tituloServicos: 'Serviços e produtos',
      servicos: [
        ['Banho', 'Seu pet limpinho, cheiroso e bem tratado.'],
        ['Tosa', 'Higiênica, na máquina ou na tesoura.'],
        ['Rações', 'Opções para cães e gatos de todas as idades.'],
        ['Acessórios e brinquedos', 'Coleiras, camas, potes e diversão.'],
        ['Petiscos', 'Mimos para recompensar o seu melhor amigo.'],
        ['Higiene e cuidados', 'Shampoos, tapetes e itens do dia a dia.']
      ],
      iconesServicos: ['gota', 'tesoura', 'pacote', 'presente', 'estrela', 'brilho'],
      diferenciais: [
        ['calendario', 'Agende pelo WhatsApp', 'Escolha o dia e o horário do banho sem precisar ligar.'],
        ['coracao', 'Tratado como família', 'Cuidado e paciência com cada bichinho.'],
        ['sacola', 'Tudo num lugar só', 'Do banho à ração, resolva tudo numa parada.']
      ],
      sobre: 'Na {nome}, o seu pet é tratado com carinho. Banho, tosa e tudo o que ele precisa, pertinho de você.',
      faq: [
        ['Como agendo o banho e tosa?', 'Chame no WhatsApp, diga o porte do seu pet e escolha o melhor horário.']
      ]
    },
    oficina: {
      rotulo: 'Oficina mecânica', schema: 'AutoRepair', icone: 'chave',
      titulo: 'Seu carro em boas mãos{local}',
      subtitulo: 'Mecânica, revisão e manutenção para você rodar tranquilo. Peça seu orçamento pelo WhatsApp.',
      cta: 'Pedir orçamento', msg: 'Olá! Vim pelo site e quero um orçamento para o meu carro.',
      tituloServicos: 'Serviços',
      servicos: [
        ['Revisão preventiva', 'Checagem completa para evitar surpresas na estrada.'],
        ['Troca de óleo e filtros', 'Rápido e com o produto certo para o seu motor.'],
        ['Freios', 'Pastilhas, discos e fluido para frear com segurança.'],
        ['Suspensão', 'Amortecedores, molas e buchas.'],
        ['Alinhamento e balanceamento', 'Direção firme e pneus durando mais.'],
        ['Diagnóstico', 'Descobrimos a causa antes de trocar qualquer peça.']
      ],
      iconesServicos: ['escudo', 'gota', 'pneu', 'carro', 'regua', 'raio'],
      diferenciais: [
        ['conversa', 'Orçamento pelo WhatsApp', 'Mande o modelo do carro e o problema, e receba o retorno.'],
        ['escudo', 'Serviço explicado', 'Você entende o que vai ser feito antes de aprovar.'],
        ['pino', 'Fácil de chegar', 'Abra a rota direto no seu celular.']
      ],
      sobre: 'A {nome} cuida do seu carro com seriedade: diagnóstico, serviço bem feito e conversa clara do começo ao fim.',
      faq: [
        ['Como peço um orçamento?', 'Chame no WhatsApp com o modelo, o ano do carro e o que está acontecendo.']
      ]
    },
    gas: {
      rotulo: 'Distribuidora de gás e água', schema: 'Store', icone: 'botijao',
      titulo: 'Gás e água na sua porta{local}',
      subtitulo: 'Peça pelo WhatsApp ou ligue. Entrega para a sua casa ou comércio.',
      cta: 'Pedir gás', msg: 'Olá! Vim pelo site e quero pedir um gás.',
      tituloServicos: 'Produtos',
      servicos: [
        ['Gás de cozinha P13', 'O botijão de casa, entregue no seu endereço.'],
        ['Gás P45', 'Para comércios, restaurantes e uso maior.'],
        ['Água mineral 20 L', 'Galão para casa e escritório.'],
        ['Entrega no endereço', 'Peça pelo WhatsApp e receba onde estiver.']
      ],
      iconesServicos: ['botijao', 'chama', 'gota', 'entrega'],
      diferenciais: [
        ['conversa', 'Pedido em 1 minuto', 'Mande o endereço pelo WhatsApp e pronto.'],
        ['entrega', 'Entrega na porta', 'Sem precisar sair de casa.'],
        ['escudo', 'Revenda autorizada', 'Gás de procedência, com segurança.']
      ],
      sobre: 'A {nome} leva gás e água até você. Peça pelo WhatsApp ou ligue e receba no seu endereço.',
      faq: [
        ['Como peço o gás?', 'Toque em Pedir gás, mande o endereço e a forma de pagamento pelo WhatsApp.']
      ]
    },
    loja: {
      rotulo: 'Loja', schema: 'Store', icone: 'sacola',
      titulo: 'Tudo o que você procura{local}',
      subtitulo: 'Confira os produtos e as novidades. Fale com a gente pelo WhatsApp e reserve o seu.',
      cta: 'Falar com a loja', msg: 'Olá! Vim pelo site e quero saber mais sobre os produtos.',
      tituloServicos: 'Produtos',
      servicos: [
        ['Novidades', 'Peças e produtos que acabaram de chegar.'],
        ['Mais vendidos', 'Os queridinhos dos nossos clientes.'],
        ['Encomendas', 'Peça o que precisa e a gente separa para você.'],
        ['Presentes', 'Ideias para todas as ocasiões.']
      ],
      iconesServicos: ['estrela', 'etiqueta', 'pacote', 'presente'],
      diferenciais: [
        ['conversa', 'Atendimento no WhatsApp', 'Tire dúvidas, veja fotos e reserve sem sair de casa.'],
        ['sacola', 'Variedade', 'Muita opção num lugar só.'],
        ['pino', 'Loja física', 'Venha ver de perto: a rota abre no seu celular.']
      ],
      sobre: 'A {nome} reúne produtos escolhidos com cuidado para você. Venha visitar ou chame no WhatsApp.',
      faq: [
        ['Posso reservar pelo WhatsApp?', 'Sim. Mande uma mensagem com o produto que você quer e a gente responde.']
      ]
    },
    academia: {
      rotulo: 'Academia', schema: 'ExerciseGym', icone: 'halter',
      titulo: 'Treine perto de casa e evolua de verdade{local}',
      subtitulo: 'Musculação, funcional e acompanhamento para você chegar no seu objetivo. Chame no WhatsApp e venha conhecer.',
      cta: 'Quero treinar', msg: 'Olá! Vim pelo site e quero saber dos planos.',
      tituloServicos: 'Modalidades',
      servicos: [
        ['Musculação', 'Equipamentos para treinar todos os grupos musculares.'],
        ['Treino funcional', 'Força, resistência e condicionamento.'],
        ['Aulas coletivas', 'Treinar em turma é mais animado.'],
        ['Avaliação física', 'Para saber de onde você parte e acompanhar a evolução.'],
        ['Planos', 'Mensal, trimestral e outras opções.'],
        ['Acompanhamento', 'Professores para orientar o seu treino.']
      ],
      iconesServicos: ['halter', 'raio', 'pessoas', 'regua', 'calendario', 'escudo'],
      diferenciais: [
        ['relogio', 'Horário amplo', 'Treine no horário que cabe na sua rotina.'],
        ['pessoas', 'Orientação', 'Professores para te ajudar a treinar certo.'],
        ['conversa', 'Matrícula fácil', 'Chame no WhatsApp e tire suas dúvidas.']
      ],
      sobre: 'A {nome} é para quem quer cuidar do corpo e da saúde perto de casa, com estrutura e orientação.',
      faq: [
        ['Como faço a matrícula?', 'Chame no WhatsApp, conheça os planos e venha fazer a sua matrícula.']
      ]
    },
    saude: {
      rotulo: 'Clínica', schema: 'MedicalClinic', icone: 'estetoscopio',
      titulo: 'Cuidado de verdade com a sua saúde{local}',
      subtitulo: 'Atendimento atencioso e horário marcado. Agende sua consulta pelo WhatsApp.',
      cta: 'Agendar consulta', msg: 'Olá! Vim pelo site e quero agendar uma consulta.',
      tituloServicos: 'Atendimentos',
      servicos: [
        ['Consultas', 'Atendimento com hora marcada.'],
        ['Retornos', 'Acompanhamento do seu tratamento.'],
        ['Exames', 'Consulte quais exames realizamos.'],
        ['Procedimentos', 'Fale com a gente para saber mais.']
      ],
      iconesServicos: ['estetoscopio', 'calendario', 'coracao', 'escudo'],
      diferenciais: [
        ['calendario', 'Agendamento fácil', 'Marque pelo WhatsApp, sem fila no telefone.'],
        ['coracao', 'Atendimento humano', 'Tempo para ouvir e explicar.'],
        ['pino', 'Bem localizada', 'Abra a rota no celular com um toque.']
      ],
      sobre: 'A {nome} oferece atendimento atencioso, com hora marcada e respeito ao seu tempo.',
      faq: [
        ['Como agendo uma consulta?', 'Chame no WhatsApp com o seu nome e o melhor dia e horário.']
      ]
    },
    servicos: {
      rotulo: 'Serviços para casa e empresa', schema: 'HomeAndConstructionBusiness', icone: 'martelo',
      titulo: 'Serviço bem feito, sem dor de cabeça{local}',
      subtitulo: 'Orçamento pelo WhatsApp. Atendemos casas, apartamentos e comércios da região.',
      cta: 'Pedir orçamento', msg: 'Olá! Vim pelo site e quero um orçamento.',
      tituloServicos: 'Serviços',
      servicos: [
        ['Instalações', 'Feitas com cuidado e acabamento limpo.'],
        ['Manutenção', 'Para evitar problemas maiores lá na frente.'],
        ['Reparos', 'Resolvemos aquele problema que está te incomodando.'],
        ['Reformas', 'Do pequeno ajuste à obra completa.']
      ],
      iconesServicos: ['raio', 'chave', 'martelo', 'casa'],
      diferenciais: [
        ['conversa', 'Orçamento pelo WhatsApp', 'Mande fotos do serviço e receba o retorno.'],
        ['relogio', 'Pontualidade', 'Horário combinado é horário cumprido.'],
        ['escudo', 'Serviço limpo', 'Trabalho bem feito e local organizado no final.']
      ],
      sobre: 'A {nome} resolve o seu problema com serviço bem feito e conversa clara do orçamento à entrega.',
      faq: [
        ['Como peço um orçamento?', 'Mande pelo WhatsApp fotos e uma descrição do serviço. A gente responde com os próximos passos.']
      ]
    },
    outro: {
      rotulo: 'Negócio local', schema: 'LocalBusiness', icone: 'loja',
      titulo: 'Qualidade e bom atendimento{local}',
      subtitulo: 'Conheça o que fazemos e fale com a gente pelo WhatsApp.',
      cta: 'Falar no WhatsApp', msg: 'Olá! Vim pelo site e quero mais informações.',
      tituloServicos: 'O que fazemos',
      servicos: [
        ['Atendimento', 'Fale com a gente e tire suas dúvidas.'],
        ['Produtos e serviços', 'Conheça o que oferecemos.'],
        ['Encomendas', 'Peça pelo WhatsApp.']
      ],
      iconesServicos: ['conversa', 'estrela', 'pacote'],
      diferenciais: [
        ['conversa', 'Atendimento no WhatsApp', 'Resposta rápida, sem complicação.'],
        ['estrela', 'Qualidade', 'Feito com cuidado.'],
        ['pino', 'Fácil de chegar', 'Abra a rota no celular com um toque.']
      ],
      sobre: 'A {nome} atende a região com cuidado e bom atendimento.',
      faq: []
    }
  };

  var LISTA_NICHOS = Object.keys(NICHOS).map(function (k) { return { id: k, rotulo: NICHOS[k].rotulo }; });

  // Horários padrão por ramo (domingo = 0). Só usados quando o usuário pede, nunca em prévias de clientes reais.
  var HORARIOS_PADRAO = {
    barbearia: ['', '09:00-20:00', '09:00-20:00', '09:00-20:00', '09:00-20:00', '09:00-20:00', '08:00-18:00'],
    salao: ['', '', '09:00-19:00', '09:00-19:00', '09:00-19:00', '09:00-19:00', '08:00-18:00'],
    restaurante: ['11:00-15:00', '11:00-15:00', '11:00-15:00', '11:00-15:00', '11:00-15:00', '11:00-15:00', '11:00-15:00'],
    lanchonete: ['18:00-23:30', '', '18:00-23:30', '18:00-23:30', '18:00-23:30', '18:00-00:00', '18:00-00:00'],
    pizzaria: ['18:00-23:30', '', '18:00-23:30', '18:00-23:30', '18:00-23:30', '18:00-00:00', '18:00-00:00'],
    padaria: ['06:00-13:00', '06:00-21:00', '06:00-21:00', '06:00-21:00', '06:00-21:00', '06:00-21:00', '06:00-21:00'],
    petshop: ['', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-14:00'],
    oficina: ['', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-12:00'],
    gas: ['08:00-12:00', '07:00-20:00', '07:00-20:00', '07:00-20:00', '07:00-20:00', '07:00-20:00', '07:00-20:00'],
    loja: ['', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-14:00'],
    academia: ['08:00-12:00', '06:00-22:00', '06:00-22:00', '06:00-22:00', '06:00-22:00', '06:00-22:00', '08:00-14:00'],
    saude: ['', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', ''],
    servicos: ['', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-18:00', '08:00-12:00'],
    outro: ['', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-18:00', '09:00-13:00']
  };

  // ---------------------------------------------------------------- utilidades
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function digitos(s) { return String(s || '').replace(/\D/g, ''); }

  // Remove o 55 do começo se vier com código do país e devolve DDD + número.
  function numeroBR(s) {
    var d = digitos(s);
    if (d.length >= 12 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length === 11 && d[0] === '0') d = d.slice(1);
    return d;
  }

  function formatarTelefone(s) {
    var d = numeroBR(s);
    if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
    if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
    return String(s || '');
  }

  function linkWhats(numero, msg) {
    var d = numeroBR(numero);
    if (!d) return '';
    return 'https://wa.me/55' + d + (msg ? '?text=' + encodeURIComponent(msg) : '');
  }

  function slug(s) {
    return String(s || 'site').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'site';
  }

  function iniciais(nome) {
    var ignorar = { de: 1, da: 1, do: 1, das: 1, dos: 1, e: 1, a: 1, o: 1 };
    var p = String(nome || '').split(/\s+/).filter(function (w) { return w && !ignorar[w.toLowerCase()]; });
    if (!p.length) return 'V';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[1][0]).toUpperCase();
  }

  function limparInstagram(s) {
    s = String(s || '').trim();
    var m = s.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
    if (m) s = m[1];
    return s.replace(/^@/, '').replace(/\/$/, '');
  }

  // "Samambaia Norte - DF" -> { bairro: 'Samambaia Norte', uf: 'DF' }
  function separarCidade(cidade) {
    var c = String(cidade || '').trim();
    var m = c.match(/^(.*?)[\s,\-–\/]+([A-Z]{2})$/);
    if (m) return { bairro: m[1].trim(), uf: m[2] };
    return { bairro: c, uf: '' };
  }

  // Converte "11h às 23h", "11:00-23:00" ou "08:00-12:00, 14:00-18:00" em faixas de minutos.
  function lerFaixas(txt) {
    var t = String(txt || '').toLowerCase().trim();
    if (!t || /fechad/.test(t)) return [];
    if (/24\s*h(oras)?/.test(t) && !/\d\s*[:h]\s*\d/.test(t.replace(/24\s*h(oras)?/, ''))) return [[0, 1440]];
    var horas = [];
    var re = /(\d{1,2})\s*(?:[:h]\s*(\d{2})?)?/g, m;
    while ((m = re.exec(t))) {
      var h = parseInt(m[1], 10), mi = m[2] ? parseInt(m[2], 10) : 0;
      if (h > 24 || mi > 59) continue;
      horas.push(h * 60 + mi);
    }
    var faixas = [];
    for (var i = 0; i + 1 < horas.length; i += 2) {
      var ini = horas[i], fim = horas[i + 1];
      if (fim <= ini) fim += 1440; // vira a meia-noite
      faixas.push([ini, fim]);
    }
    return faixas;
  }

  function hhmm(min) {
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function horaBonita(min) {
    var h = Math.floor(min / 60) % 24, m = min % 60;
    return h + 'h' + (m ? (m < 10 ? '0' : '') + m : '');
  }

  function faixaBonita(f) {
    if (f[0] === 0 && f[1] >= 1440) return '24 horas';
    var fim = f[1] % 1440 === 0 ? 'à meia-noite' : 'às ' + horaBonita(f[1]);
    return horaBonita(f[0]) + ' ' + fim;
  }

  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  var DIAS_SCHEMA = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

  function temHorario(horarios) {
    return Array.isArray(horarios) && horarios.some(function (h) { return lerFaixas(h).length; });
  }

  function textoDia(h) {
    var f = lerFaixas(h);
    return f.length ? f.map(faixaBonita).join(' e ') : 'Fechado';
  }

  // Agrupa dias seguidos com o mesmo horário: "Segunda a sexta: 8h às 18h".
  function resumoHorarios(horarios) {
    var grupos = [];
    ORDEM_SEMANA.forEach(function (d) {
      var txt = textoDia(horarios[d]);
      var ult = grupos[grupos.length - 1];
      if (ult && ult.txt === txt) ult.dias.push(d); else grupos.push({ txt: txt, dias: [d] });
    });
    return grupos.map(function (g) {
      var nome = g.dias.length === 1 ? DIAS[g.dias[0]]
        : g.dias.length === 2 ? DIAS[g.dias[0]] + ' e ' + DIAS[g.dias[1]].toLowerCase()
        : DIAS[g.dias[0]] + ' a ' + DIAS[g.dias[g.dias.length - 1]].toLowerCase();
      return { dias: nome, txt: g.txt };
    });
  }

  function frasesHorario(horarios) {
    return resumoHorarios(horarios).map(function (g) { return g.dias + ': ' + g.txt.toLowerCase(); }).join('; ');
  }

  // Aceita lista de [nome, desc] ou texto "Nome | descrição | preço" por linha.
  function lerServicos(v) {
    if (!v) return [];
    if (typeof v === 'string') {
      return v.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
        var p = l.split('|').map(function (x) { return x.trim(); });
        return { nome: p[0], desc: p[1] || '', preco: p[2] || '' };
      });
    }
    return v.map(function (s) {
      if (Array.isArray(s)) return { nome: s[0], desc: s[1] || '', preco: s[2] || '' };
      return { nome: s.nome, desc: s.desc || '', preco: s.preco || '' };
    }).filter(function (s) { return s.nome; });
  }

  function lerLinhas(v) {
    if (!v) return [];
    if (typeof v === 'string') return v.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    return v;
  }

  function servicosParaTexto(lista) {
    return lerServicos(lista).map(function (s) { return [s.nome, s.desc, s.preco].filter(Boolean).join(' | '); }).join('\n');
  }

  function preencher(txt, d) {
    return String(txt || '').replace(/\{(\w+)\}/g, function (_, k) { return d[k] != null ? d[k] : ''; });
  }

  // Ajusta a cor de destaque escolhida para manter contraste com o texto do botão.
  function luminancia(hex) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var rgb = [0, 2, 4].map(function (i) {
      var c = parseInt(h.substr(i, 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  }

  function contraste(a, b) {
    var la = luminancia(a), lb = luminancia(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function hexValido(c) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(c || '')); }

  // ---------------------------------------------------------------- configuração
  function normalizar(cfg) {
    cfg = cfg || {};
    var nichoId = NICHOS[cfg.nicho] ? cfg.nicho : 'outro';
    var n = NICHOS[nichoId];
    var tema = {};
    var base = TEMAS[nichoId];
    for (var k in base) tema[k] = base[k];
    if (hexValido(cfg.cor)) {
      tema.destaque = cfg.cor;
      tema.sobre = contraste(cfg.cor, '#FFFFFF') >= contraste(cfg.cor, '#111111') ? '#FFFFFF' : '#111111';
    }
    var cid = separarCidade(cfg.cidade);
    var nome = String(cfg.nome || 'Seu Negócio').trim();
    var local = cid.bairro ? ' em ' + cid.bairro : '';
    var dados = { nome: nome, local: local, bairro: cid.bairro };
    var servicos = lerServicos(cfg.servicos);
    if (!servicos.length) servicos = lerServicos(n.servicos);
    var difs = cfg.diferenciais && cfg.diferenciais.length ? cfg.diferenciais : n.diferenciais;
    difs = lerLinhas(difs).map(function (d, i) {
      if (Array.isArray(d)) return { icone: d[0], titulo: d[1], texto: d[2] };
      var p = String(d).split('|').map(function (x) { return x.trim(); });
      return { icone: (n.diferenciais[i] || n.diferenciais[0])[0], titulo: p[0], texto: p[1] || '' };
    });
    var agencia = cfg.agencia || {};
    return {
      nicho: nichoId, n: n, tema: tema,
      nome: nome,
      rotulo: cfg.rotulo || n.rotulo,
      whatsapp: numeroBR(cfg.whatsapp),
      telefone: numeroBR(cfg.telefone),
      instagram: limparInstagram(cfg.instagram),
      endereco: String(cfg.endereco || '').trim(),
      bairro: cid.bairro, uf: cid.uf, cidade: String(cfg.cidade || '').trim(),
      titulo: preencher(cfg.titulo || n.titulo, dados),
      subtitulo: preencher(cfg.subtitulo || n.subtitulo, dados),
      sobre: preencher(cfg.sobre || n.sobre, dados),
      cta: cfg.cta || n.cta,
      msg: cfg.msg || n.msg,
      tituloServicos: cfg.tituloServicos || n.tituloServicos,
      servicos: servicos,
      iconesServicos: n.iconesServicos,
      diferenciais: difs,
      faq: (cfg.faq ? lerFaqs(cfg.faq) : n.faq.map(function (f) { return { p: f[0], r: f[1] }; })),
      horarios: Array.isArray(cfg.horarios) && cfg.horarios.length === 7 ? cfg.horarios : null,
      links: cfg.links || {},
      destaques: lerLinhas(cfg.destaques),
      depoimentos: (cfg.depoimentos || []).map(function (d) {
        if (typeof d === 'string') { var p = d.split('|'); return { nome: (p[0] || '').trim(), texto: (p[1] || '').trim() }; }
        return d;
      }).filter(function (d) { return d.texto; }),
      fotos: cfg.fotos || {},
      modo: cfg.modo || 'final',
      creditos: cfg.creditos !== false,
      agencia: {
        nome: agencia.nome || 'Vitrine 61',
        whatsapp: numeroBR(agencia.whatsapp),
        url: String(agencia.url || '').replace(/\/+$/, ''),
        preco: agencia.preco || 'R$250'
      },
      urlSite: cfg.urlSite || ''
    };
  }

  function lerFaqs(v) {
    if (typeof v === 'string') {
      return v.split(/\n+/).map(function (l) { var p = l.split('|'); return { p: (p[0] || '').trim(), r: (p[1] || '').trim() }; })
        .filter(function (f) { return f.p && f.r; });
    }
    return v.map(function (f) { return Array.isArray(f) ? { p: f[0], r: f[1] } : f; });
  }

  // ---------------------------------------------------------------- HTML do site
  function urlFonte(t) {
    var fams = [t.fTitulo + ':wght@' + t.pesos];
    if (t.fTexto !== t.fTitulo) fams.push(t.fTexto + ':wght@400;500;600;700;800');
    return 'https://fonts.googleapis.com/css2?' + fams.map(function (f) { return 'family=' + f.replace(/ /g, '+'); }).join('&') + '&display=swap';
  }

  function css(c) {
    var t = c.tema;
    var linha = t.escuro ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.09)';
    var sombra = t.escuro ? '0 18px 50px rgba(0,0,0,.45)' : '0 18px 50px rgba(30,20,10,.10)';
    return [
      ':root{--fundo:' + t.fundo + ';--fundo2:' + t.fundo2 + ';--cartao:' + t.cartao + ';--texto:' + t.texto + ';--suave:' + t.suave + ';--destaque:' + t.destaque + ';--sobre:' + t.sobre + ';--linha:' + linha + ';--sombra:' + sombra + ';--ft:"' + t.fTitulo + '",Georgia,serif;--fb:"' + t.fTexto + '",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;--r:18px}',
      '*,*::before,*::after{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}',
      'body{margin:0;background:var(--fundo);color:var(--texto);font-family:var(--fb);font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased}',
      'img{max-width:100%;display:block}a{color:inherit}',
      '.ic{width:1.15em;height:1.15em;flex:none}',
      '.wrap{width:min(1120px,100% - 40px);margin-inline:auto}',
      'h1,h2,h3{font-family:var(--ft);line-height:1.08;margin:0;letter-spacing:-.01em' + (t.caixaAlta ? ';text-transform:uppercase;letter-spacing:.01em' : '') + '}',
      'h2{font-size:clamp(30px,5vw,46px)}h3{font-size:21px' + (t.caixaAlta ? ';letter-spacing:.02em' : '') + '}',
      '.olho{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--destaque)}',
      '.olho::before{content:"";width:22px;height:2px;background:currentColor;border-radius:2px}',
      '.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 24px;border-radius:999px;font-weight:700;font-size:16px;text-decoration:none;border:2px solid transparent;transition:transform .2s ease,box-shadow .2s ease,background .2s ease;cursor:pointer}',
      '.btn:hover{transform:translateY(-2px)}.btn:focus-visible,a:focus-visible,summary:focus-visible{outline:3px solid var(--destaque);outline-offset:3px}',
      '.btn-p{background:var(--destaque);color:var(--sobre);box-shadow:0 10px 30px -10px var(--destaque)}',
      '.btn-s{border-color:var(--linha);color:var(--texto);background:transparent}.btn-s:hover{border-color:var(--destaque)}',
      // faixa de prévia
      '.previa{position:relative;z-index:60;background:#111;color:#fff;font-size:14px;line-height:1.4;padding:10px 0}',
      '.previa .wrap{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}',
      '.previa b{color:#FFD24A}.previa a{background:#FFD24A;color:#111;font-weight:800;text-decoration:none;padding:7px 14px;border-radius:999px;white-space:nowrap}',
      // topo
      '.topo{position:sticky;top:0;z-index:50;background:color-mix(in srgb,var(--fundo) 86%,transparent);backdrop-filter:saturate(1.4) blur(12px);-webkit-backdrop-filter:saturate(1.4) blur(12px);border-bottom:1px solid var(--linha)}',
      '.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:70px}',
      '.marca{display:flex;align-items:center;gap:12px;text-decoration:none;font-weight:800;font-size:17px;line-height:1.15}',
      '.mono{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--destaque);color:var(--sobre);font-family:var(--ft);font-weight:700;font-size:17px;flex:none;overflow:hidden}',
      '.mono img{width:100%;height:100%;object-fit:cover}',
      '.menu{display:none;gap:26px;font-weight:600;font-size:15px}.menu a{text-decoration:none;color:var(--suave)}.menu a:hover{color:var(--texto)}',
      '.topo .btn{min-height:44px;padding:0 18px;font-size:15px}',
      '@media(min-width:900px){.menu{display:flex}}',
      '@media(max-width:520px){.topo .btn span{display:none}.topo .btn{padding:0 13px}}',
      // hero
      '.hero{position:relative;overflow:hidden;padding:64px 0 72px;isolation:isolate}',
      '.hero::before{content:"";position:absolute;inset:-20% -10% auto auto;width:70vmax;height:70vmax;background:radial-gradient(closest-side,color-mix(in srgb,var(--destaque) 26%,transparent),transparent 70%);z-index:-2}',
      '.hero .emblema{position:absolute;right:-6vmax;top:50%;width:min(56vmax,640px);height:auto;transform:translateY(-50%) rotate(-12deg);color:var(--destaque);opacity:.10;z-index:-1;stroke-width:1.1}',
      '.hero .grade{display:grid;gap:40px;align-items:center}',
      '@media(min-width:960px){.hero{padding:96px 0 110px}.hero .grade{grid-template-columns:1.25fr .85fr}}',
      '.hero h1{font-size:clamp(40px,7.4vw,76px);margin:18px 0 18px;text-wrap:balance;overflow-wrap:break-word}',
      '.hero p.sub{font-size:clamp(17px,2.2vw,20px);color:var(--suave);max-width:36em;margin:0 0 30px}',
      '.acoes{display:flex;flex-wrap:wrap;gap:12px}',
      '.chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px;padding:0;list-style:none}',
      '.chips li{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;padding:8px 14px;border-radius:999px;background:var(--cartao);border:1px solid var(--linha)}',
      '.chips .ic{color:var(--destaque)}',
      '.info{background:var(--cartao);border:1px solid var(--linha);border-radius:24px;padding:26px;box-shadow:var(--sombra)}',
      '.status{display:flex;align-items:center;gap:10px;font-weight:800;font-size:15px}',
      '.status i{width:10px;height:10px;border-radius:50%;background:#9CA3AF;box-shadow:0 0 0 4px color-mix(in srgb,#9CA3AF 25%,transparent)}',
      '.status.aberto i{background:#22C55E;box-shadow:0 0 0 4px rgba(34,197,94,.22);animation:pulso 2s infinite}',
      '.status.fechado i{background:#EF4444;box-shadow:0 0 0 4px rgba(239,68,68,.2)}',
      '@keyframes pulso{50%{box-shadow:0 0 0 8px rgba(34,197,94,0)}}',
      '.info ul{list-style:none;margin:18px 0 0;padding:0;display:grid;gap:14px}',
      '.info li{display:flex;gap:12px;font-size:15px;line-height:1.45;color:var(--suave)}.info li .ic{color:var(--destaque);margin-top:2px}',
      '.info li b{display:block;color:var(--texto);font-size:15px}',
      '.info a{text-decoration:none}.info a:hover{text-decoration:underline}',
      // hero com foto
      '.hero.foto{color:#fff;padding:120px 0 90px;min-height:min(86vh,760px);display:flex;align-items:flex-end}',
      '.hero.foto::before{display:none}',
      '.hero.foto .capa{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover}',
      '.hero.foto::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,.55) 45%,rgba(0,0,0,.86) 100%)}',
      '.hero.foto p.sub{color:rgba(255,255,255,.86)}.hero.foto .btn-s{color:#fff;border-color:rgba(255,255,255,.45)}',
      '.hero.foto .chips li{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.22);color:#fff;backdrop-filter:blur(6px)}',
      '.hero.foto .info{color:var(--texto)}',
      // seções
      'section.sec{padding:84px 0}.sec.alt{background:var(--fundo2)}',
      '.cab{display:flex;flex-direction:column;gap:12px;margin-bottom:40px;max-width:720px}',
      '.cab p{color:var(--suave);margin:0;font-size:18px}',
      '.cards{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}',
      '.card{position:relative;background:var(--cartao);border:1px solid var(--linha);border-radius:var(--r);padding:24px;transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}',
      '.card:hover{transform:translateY(-4px);border-color:color-mix(in srgb,var(--destaque) 55%,transparent);box-shadow:var(--sombra)}',
      '.card .ico{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--destaque) 14%,transparent);color:var(--destaque);margin-bottom:16px}',
      '.card .ico .ic{width:24px;height:24px}',
      '.card p{margin:8px 0 0;color:var(--suave);font-size:15.5px}',
      '.preco{display:inline-block;margin-top:14px;font-weight:800;color:var(--destaque)}',
      '.mais{margin-top:28px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;color:var(--suave);font-size:15px}',
      // sobre
      '.sobre{display:grid;gap:40px}@media(min-width:900px){.sobre{grid-template-columns:1fr 1fr;align-items:start}}',
      '.sobre .texto p{font-size:19px;color:var(--suave);margin:18px 0 0}',
      '.difs{display:grid;gap:14px}',
      '.dif{display:flex;gap:16px;align-items:flex-start;background:var(--cartao);border:1px solid var(--linha);border-radius:var(--r);padding:20px}',
      '.dif .ico{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:var(--destaque);color:var(--sobre);flex:none}',
      '.dif p{margin:4px 0 0;color:var(--suave);font-size:15.5px}',
      '.dif h3{font-size:18px}',
      // galeria
      '.galeria{display:grid;gap:12px;grid-template-columns:repeat(2,1fr)}@media(min-width:800px){.galeria{grid-template-columns:repeat(3,1fr)}}',
      '.galeria figure{margin:0;border-radius:16px;overflow:hidden;aspect-ratio:1;background:var(--cartao)}',
      '.galeria figure:first-child{grid-row:span 2;aspect-ratio:auto}',
      '.galeria img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}.galeria figure:hover img{transform:scale(1.05)}',
      '.insta{display:grid;gap:24px;align-items:center;padding:36px;border-radius:28px;color:#fff;background:radial-gradient(120% 140% at 0% 100%,#FFD600 0%,#FF7A00 22%,#FF0069 48%,#D300C5 72%,#7638FA 100%)}',
      '@media(min-width:800px){.insta{grid-template-columns:1fr auto;padding:48px}}',
      '.insta h2{font-size:clamp(28px,4.4vw,40px);text-transform:none;letter-spacing:-.01em}.insta p{margin:10px 0 0;opacity:.92}',
      '.insta .btn{background:#fff;color:#111}',
      // depoimentos
      '.depos{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}',
      '.depo{background:var(--cartao);border:1px solid var(--linha);border-radius:var(--r);padding:24px;margin:0}',
      '.depo .estrelas{display:flex;gap:2px;color:#F5B301;margin-bottom:10px}.depo .estrelas .ic{fill:currentColor;width:18px;height:18px}',
      '.depo blockquote{margin:0;font-size:16.5px}.depo figcaption{margin-top:12px;font-weight:700;color:var(--suave);font-size:15px}',
      // horário e mapa
      '.local{display:grid;gap:24px}@media(min-width:900px){.local{grid-template-columns:.9fr 1.1fr}}',
      '.tab{background:var(--cartao);border:1px solid var(--linha);border-radius:24px;padding:12px 24px}',
      '.tab table{width:100%;border-collapse:collapse;font-size:16px}',
      '.tab td{padding:13px 0;border-bottom:1px solid var(--linha)}.tab tr:last-child td{border-bottom:0}',
      '.tab td:last-child{text-align:right;color:var(--suave)}.tab tr.hoje td{font-weight:800;color:var(--destaque)}',
      '.tab .sem{padding:18px 0;color:var(--suave)}',
      '.mapa{border-radius:24px;overflow:hidden;border:1px solid var(--linha);min-height:340px;background:var(--cartao);display:flex;flex-direction:column}',
      '.mapa iframe{border:0;width:100%;flex:1;min-height:300px;filter:' + (t.escuro ? 'grayscale(.3) invert(.92) hue-rotate(180deg)' : 'none') + '}',
      '.mapa .end{padding:18px 20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;border-top:1px solid var(--linha)}',
      '.mapa .end p{margin:0;display:flex;gap:10px;font-size:15px;color:var(--suave)}.mapa .end p .ic{color:var(--destaque);margin-top:3px}',
      '.mapa .end .btn{min-height:44px;font-size:15px;padding:0 16px}',
      // faq
      '.faq{display:grid;gap:12px;max-width:820px}',
      '.faq details{background:var(--cartao);border:1px solid var(--linha);border-radius:16px;padding:0 22px}',
      '.faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;align-items:center;padding:20px 0;font-weight:700;font-size:17px}',
      '.faq summary::-webkit-details-marker{display:none}.faq summary::after{content:"+";font-size:26px;line-height:1;color:var(--destaque);transition:transform .25s}',
      '.faq details[open] summary::after{transform:rotate(45deg)}.faq details p{margin:0 0 20px;color:var(--suave)}',
      // cta final
      '.final{padding:90px 0;text-align:center;background:var(--destaque);color:var(--sobre);position:relative;overflow:hidden}',
      '.final h2{max-width:16em;margin:0 auto 14px}.final p{margin:0 auto 30px;max-width:34em;opacity:.9;font-size:18px}',
      '.final .btn{background:var(--sobre);color:var(--destaque)}',
      '.final .emblema{position:absolute;left:-70px;bottom:-90px;width:320px;height:320px;opacity:.10;transform:rotate(14deg);pointer-events:none}',
      // rodapé
      'footer{padding:48px 0 110px;font-size:15px;color:var(--suave);border-top:1px solid var(--linha)}',
      'footer .wrap{display:grid;gap:22px}@media(min-width:800px){footer .wrap{grid-template-columns:1.2fr 1fr 1fr}}',
      'footer h3{font-size:16px;color:var(--texto);margin-bottom:10px;font-family:var(--fb);text-transform:none;letter-spacing:0;font-weight:800}',
      'footer p{margin:0 0 6px}footer a{text-decoration:none}footer a:hover{color:var(--texto);text-decoration:underline}',
      '.credito{grid-column:1/-1;padding-top:22px;border-top:1px solid var(--linha);display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;font-size:13.5px}',
      // botão flutuante
      '.zap{position:fixed;right:18px;bottom:18px;z-index:70;width:62px;height:62px;border-radius:50%;background:#25D366;color:#fff;display:grid;place-items:center;box-shadow:0 12px 30px rgba(0,0,0,.28);transition:transform .2s}',
      '.zap:hover{transform:scale(1.07)}.zap .ic{width:32px;height:32px}',
      '.zap::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #25D366;animation:onda 2.4s infinite}',
      '@keyframes onda{from{transform:scale(1);opacity:.7}to{transform:scale(1.6);opacity:0}}',
      // animações de entrada
      '.revela{opacity:0;transform:translateY(22px);transition:opacity .7s ease,transform .7s cubic-bezier(.2,.7,.2,1)}.revela.in{opacity:1;transform:none}',
      '.hero .revela{transition-delay:calc(var(--i,0) * 90ms)}',
      '@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.revela{opacity:1;transform:none;transition:none}.zap::after,.status.aberto i{animation:none}.card,.btn,.galeria img{transition:none}}',
      '.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
    ].join('\n');
  }

  function jsonLd(c) {
    var d = {
      '@context': 'https://schema.org',
      '@type': c.n.schema,
      name: c.nome,
      description: c.subtitulo
    };
    if (c.endereco) {
      d.address = { '@type': 'PostalAddress', streetAddress: c.endereco, addressCountry: 'BR' };
      if (c.bairro) d.address.addressLocality = c.bairro;
      if (c.uf) d.address.addressRegion = c.uf;
    }
    var tel = c.whatsapp || c.telefone;
    if (tel) d.telephone = '+55' + tel;
    if (c.instagram) d.sameAs = ['https://www.instagram.com/' + c.instagram + '/'];
    if (c.urlSite) d.url = c.urlSite;
    if (c.n.cozinha) d.servesCuisine = c.n.cozinha;
    if (c.horarios && temHorario(c.horarios)) {
      d.openingHoursSpecification = [];
      c.horarios.forEach(function (h, i) {
        lerFaixas(h).forEach(function (f) {
          d.openingHoursSpecification.push({
            '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/' + DIAS_SCHEMA[i],
            opens: hhmm(f[0]), closes: f[1] >= 1440 && f[1] % 1440 === 0 ? '23:59' : hhmm(f[1])
          });
        });
      });
    }
    return JSON.stringify(d).replace(/</g, '\\u003c');
  }

  // Script do site: status aberto/fechado no horário de Brasília e animação de entrada.
  function scriptSite(c) {
    var h = c.horarios && temHorario(c.horarios) ? c.horarios.map(lerFaixas) : null;
    return '(function(){' +
      'var H=' + JSON.stringify(h) + ';' +
      'var D=["domingo","segunda","terça","quarta","quinta","sexta","sábado"];' +
      'function hb(m){m=m%1440;var h=Math.floor(m/60),x=m%60;return h+"h"+(x?(x<10?"0":"")+x:"")}' +
      'if(H){try{' +
      'var p=new Intl.DateTimeFormat("en-US",{timeZone:"America/Sao_Paulo",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date());' +
      'var o={};p.forEach(function(x){o[x.type]=x.value});' +
      'var dia=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(o.weekday),agora=(+o.hour%24)*60+(+o.minute);' +
      'var aberto=null;' +
      'H[dia].forEach(function(f){if(agora>=f[0]&&agora<f[1])aberto=f});' +
      'var ontem=(dia+6)%7;H[ontem].forEach(function(f){if(f[1]>1440&&agora<f[1]-1440)aberto=[f[0]-1440,f[1]-1440]});' +
      'var txt;' +
      'if(aberto){txt="Aberto agora · fecha "+(aberto[1]%1440===0?"à meia-noite":"às "+hb(aberto[1]))}' +
      'else{for(var k=0;k<8;k++){var d=(dia+k)%7,prox=null;H[d].forEach(function(f){if(prox===null&&(k>0||f[0]>agora))prox=f[0]});' +
      'if(prox!==null){txt="Fechado agora · abre "+(k===0?"hoje":k===1?"amanhã":D[d])+" às "+hb(prox);break}}}' +
      'document.querySelectorAll("[data-status]").forEach(function(el){el.classList.add(aberto?"aberto":"fechado");var s=el.querySelector("span");if(s&&txt)s.textContent=txt});' +
      'var tr=document.querySelector("[data-dia=\\""+dia+"\\"]");if(tr)tr.classList.add("hoje");' +
      '}catch(e){}}' +
      'var els=document.querySelectorAll(".revela");' +
      'if(!("IntersectionObserver" in window)||matchMedia("(prefers-reduced-motion: reduce)").matches){els.forEach(function(e){e.classList.add("in")});}' +
      'else{var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{rootMargin:"0px 0px -8% 0px"});els.forEach(function(e){io.observe(e)});}' +
      'var a=document.getElementById("ano");if(a)a.textContent=new Date().getFullYear();' +
      '})();';
  }

  function gerarSite(cfgBruta, opcoes) {
    opcoes = opcoes || {};
    var foto = opcoes.urlFoto || function (src) { return src; };
    var c = normalizar(cfgBruta);
    var t = c.tema, n = c.n;
    var previa = c.modo === 'previa', exemplo = c.modo === 'exemplo';
    var ag = c.agencia;
    var linkAg = ag.whatsapp
      ? linkWhats(ag.whatsapp, exemplo ? 'Olá! Vi o site de exemplo de ' + c.rotulo.toLowerCase() + ' e quero um site assim para o meu negócio.' : 'Olá! Vi a prévia do site da ' + c.nome + ' e quero colocar no ar.')
      : (ag.url || '#');
    // No site de exemplo, os botões levam para o WhatsApp da agência.
    var zap = exemplo ? linkAg : linkWhats(c.whatsapp, c.msg);
    // Sem WhatsApp: liga no fixo. Sem telefone nenhum: abre o direct do Instagram.
    var acaoPrincipal = zap ? { href: zap, txt: c.cta, ic: 'whatsapp' }
      : c.telefone ? { href: 'tel:+55' + c.telefone, txt: 'Ligar agora', ic: 'telefone' }
      : c.instagram ? { href: 'https://ig.me/m/' + c.instagram, txt: 'Chamar no Instagram', ic: 'instagram' } : null;
    var consulta = [c.nome, c.endereco].filter(Boolean).join(', ');
    var rota = c.endereco ? 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(consulta) : '';
    var waze = c.endereco ? 'https://waze.com/ul?q=' + encodeURIComponent(c.endereco) + '&navigate=yes' : '';
    var mapaEmbed = c.endereco ? 'https://maps.google.com/maps?q=' + encodeURIComponent(consulta) + '&z=16&output=embed' : '';
    var avaliar = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(consulta || c.nome);
    var insta = c.instagram ? 'https://www.instagram.com/' + c.instagram + '/' : '';
    var temH = c.horarios && temHorario(c.horarios);

    var titulo = c.nome + ' | ' + c.rotulo + (c.bairro ? ' em ' + c.bairro : '') + (c.uf ? ' - ' + c.uf : '');
    var descricao = (c.subtitulo + (c.endereco ? ' ' + c.endereco + '.' : '')).slice(0, 300);

    var o = [];
    o.push('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">');
    o.push('<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">');
    o.push('<title>' + esc(titulo) + '</title>');
    o.push('<meta name="description" content="' + esc(descricao) + '">');
    if (previa || exemplo) o.push('<meta name="robots" content="noindex,nofollow">');
    o.push('<meta name="theme-color" content="' + esc(t.fundo) + '">');
    o.push('<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR">');
    o.push('<meta property="og:title" content="' + esc(previa ? 'Prévia do site: ' + c.nome : titulo) + '">');
    o.push('<meta property="og:description" content="' + esc(previa ? 'Veja como ficaria o site da ' + c.nome + '. Toque para abrir.' : c.subtitulo) + '">');
    if (opcoes.ogImagem) o.push('<meta property="og:image" content="' + esc(opcoes.ogImagem) + '"><meta name="twitter:card" content="summary_large_image">');
    if (c.urlSite && !previa) o.push('<link rel="canonical" href="' + esc(c.urlSite) + '">');
    var favTxt = iniciais(c.nome);
    var fav = c.fotos.logo ? foto(c.fotos.logo, 'logo')
      : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="' + t.destaque + '"/><text x="32" y="42" font-family="Arial,sans-serif" font-size="28" font-weight="700" text-anchor="middle" fill="' + t.sobre + '">' + esc(favTxt) + '</text></svg>');
    o.push('<link rel="icon" href="' + esc(fav) + '">');
    o.push('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    o.push('<link rel="stylesheet" href="' + urlFonte(t) + '">');
    o.push('<style>' + css(c) + '</style>');
    o.push('<script type="application/ld+json">' + jsonLd(c) + '</script>');
    o.push('</head><body>');

    if (previa || exemplo) {
      o.push('<div class="previa" role="note"><div class="wrap"><span>' +
        (previa ? '<b>Prévia</b> do site da ' + esc(c.nome) + ' feita pela ' + esc(ag.nome) + '. Ainda não está no ar.'
                : '<b>Site de exemplo</b> da ' + esc(ag.nome) + '. O seu fica assim, com seus dados e fotos.') +
        '</span><a href="' + esc(linkAg) + '" target="_blank" rel="noopener">' + (previa ? 'Quero no ar' : 'Quero o meu por ' + esc(ag.preco)) + '</a></div></div>');
    }

    // topo
    o.push('<header class="topo"><div class="wrap">');
    o.push('<a class="marca" href="#inicio"><span class="mono">' + (c.fotos.logo ? '<img src="' + esc(foto(c.fotos.logo, 'logo')) + '" alt="">' : esc(favTxt)) + '</span><span>' + esc(c.nome) + '</span></a>');
    o.push('<nav class="menu" aria-label="Seções"><a href="#servicos">' + esc(c.tituloServicos) + '</a><a href="#sobre">Sobre</a>' + (temH || c.endereco ? '<a href="#local">Horário e local</a>' : '') + '</nav>');
    if (acaoPrincipal) o.push('<a class="btn btn-p" href="' + esc(acaoPrincipal.href) + '" target="_blank" rel="noopener">' + icone(acaoPrincipal.ic) + '<span>' + esc(acaoPrincipal.txt) + '</span></a>');
    o.push('</div></header>');

    // hero
    var capa = c.fotos.capa;
    o.push('<main id="inicio"><section class="hero' + (capa ? ' foto' : '') + '">');
    if (capa) o.push('<img class="capa" src="' + esc(foto(capa, 'capa')) + '" alt="' + esc(c.nome) + '" fetchpriority="high">');
    else o.push(icone(n.icone, 'emblema'));
    o.push('<div class="wrap grade"><div>');
    o.push('<span class="olho revela" style="--i:0">' + esc(c.rotulo + (c.bairro ? ' · ' + c.bairro : '')) + '</span>');
    // Palavra muito comprida no título (ex.: CHURRASQUINHO) não pode estourar a tela do celular.
    var maior = Math.max.apply(null, c.titulo.split(/\s+/).map(function (w) { return w.length; }));
    var minimo = Math.max(28, Math.min(40, Math.floor(340 / (maior * (t.caixaAlta ? 0.7 : 0.58)))));
    o.push('<h1 class="revela" style="--i:1' + (minimo < 40 ? ';font-size:clamp(' + minimo + 'px,7.4vw,76px)' : '') + '">' + esc(c.titulo) + '</h1>');
    o.push('<p class="sub revela" style="--i:2">' + esc(c.subtitulo) + '</p>');
    o.push('<div class="acoes revela" style="--i:3">');
    if (acaoPrincipal) o.push('<a class="btn btn-p" href="' + esc(acaoPrincipal.href) + '" target="_blank" rel="noopener">' + icone(acaoPrincipal.ic) + esc(acaoPrincipal.txt) + '</a>');
    if (c.links.ifood) o.push('<a class="btn btn-s" href="' + esc(c.links.ifood) + '" target="_blank" rel="noopener">' + icone('entrega') + 'Pedir no iFood</a>');
    else if (c.links.cardapio) o.push('<a class="btn btn-s" href="' + esc(c.links.cardapio) + '" target="_blank" rel="noopener">' + icone('talheres') + 'Ver cardápio</a>');
    else if (c.links.agendamento) o.push('<a class="btn btn-s" href="' + esc(c.links.agendamento) + '" target="_blank" rel="noopener">' + icone('calendario') + 'Agendar online</a>');
    else if (rota) o.push('<a class="btn btn-s" href="' + esc(rota) + '" target="_blank" rel="noopener">' + icone('rota') + 'Como chegar</a>');
    o.push('</div>');
    var chips = c.destaques.slice(0, 4);
    if (!chips.length) {
      if (zap) chips.push('Atendimento pelo WhatsApp');
      if (c.links.ifood) chips.push('Delivery pelo iFood');
      if (c.instagram) chips.push('@' + c.instagram);
    }
    if (chips.length) {
      o.push('<ul class="chips revela" style="--i:4">' + chips.map(function (ch) {
        var ic = /^@/.test(ch) ? 'instagram' : /whats/i.test(ch) ? 'conversa' : /deliv|entreg|ifood/i.test(ch) ? 'entrega' : 'check';
        return '<li>' + icone(ic) + esc(ch) + '</li>';
      }).join('') + '</ul>');
    }
    o.push('</div>');
    // cartão de informações
    o.push('<aside class="info revela" style="--i:3" aria-label="Informações rápidas">');
    if (temH) o.push('<div class="status" data-status><i></i><span>Veja o horário abaixo</span></div>');
    var canalTxt = acaoPrincipal ? ({ whatsapp: 'pelo WhatsApp', telefone: 'por telefone', instagram: 'no Instagram' })[acaoPrincipal.ic] : 'com a gente';
    if (!temH) o.push('<div class="status"><i></i><span>Consulte o horário ' + canalTxt + '</span></div>');
    o.push('<ul>');
    if (c.endereco) o.push('<li>' + icone('pino') + '<div><b>Endereço</b>' + esc(c.endereco) + '</div></li>');
    if (temH) o.push('<li>' + icone('relogio') + '<div><b>Horário</b>' + resumoHorarios(c.horarios).map(function (g) { return esc(g.dias + ': ' + g.txt.toLowerCase()); }).join('<br>') + '</div></li>');
    if (c.whatsapp) o.push('<li>' + icone('whatsapp') + '<div><b>WhatsApp</b><a href="' + esc(zap) + '" target="_blank" rel="noopener">' + esc(formatarTelefone(c.whatsapp)) + '</a></div></li>');
    if (c.telefone && c.telefone !== c.whatsapp) o.push('<li>' + icone('telefone') + '<div><b>Telefone</b><a href="tel:+55' + esc(c.telefone) + '">' + esc(formatarTelefone(c.telefone)) + '</a></div></li>');
    if (insta) o.push('<li>' + icone('instagram') + '<div><b>Instagram</b><a href="' + esc(insta) + '" target="_blank" rel="noopener">@' + esc(c.instagram) + '</a></div></li>');
    o.push('</ul></aside>');
    o.push('</div></section>');

    // serviços
    o.push('<section class="sec alt" id="servicos"><div class="wrap">');
    o.push('<div class="cab revela"><span class="olho">' + esc(c.tituloServicos) + '</span><h2>' + esc(n.tituloServicos === 'Cardápio' ? 'Escolha o seu favorito' : 'O que a gente faz por você') + '</h2></div>');
    o.push('<div class="cards">');
    c.servicos.forEach(function (s, i) {
      var ic = c.iconesServicos[i % c.iconesServicos.length];
      o.push('<article class="card revela"><div class="ico">' + icone(ic) + '</div><h3>' + esc(s.nome) + '</h3>' +
        (s.desc ? '<p>' + esc(s.desc) + '</p>' : '') + (s.preco ? '<span class="preco">' + esc(s.preco) + '</span>' : '') + '</article>');
    });
    o.push('</div>');
    if (acaoPrincipal) {
      o.push('<div class="mais revela"><a class="btn btn-p" href="' + esc(acaoPrincipal.href) + '" target="_blank" rel="noopener">' + icone(acaoPrincipal.ic) + esc(acaoPrincipal.txt) + '</a>' +
        (c.links.cardapio && !c.links.ifood ? '' : c.links.cardapio ? '<a class="btn btn-s" href="' + esc(c.links.cardapio) + '" target="_blank" rel="noopener">Ver cardápio completo</a>' : '') +
        '<span>Valores e disponibilidade ' + ({ whatsapp: 'pelo WhatsApp', telefone: 'por telefone', instagram: 'pelo direct do Instagram' })[acaoPrincipal.ic] + '.</span></div>');
    }
    o.push('</div></section>');

    // sobre + diferenciais
    o.push('<section class="sec" id="sobre"><div class="wrap sobre">');
    o.push('<div class="texto revela"><span class="olho">Sobre</span><h2 style="margin-top:12px">' + esc(c.nome) + '</h2><p>' + esc(c.sobre) + '</p></div>');
    o.push('<div class="difs">');
    c.diferenciais.forEach(function (d) {
      o.push('<div class="dif revela"><div class="ico">' + icone(d.icone) + '</div><div><h3>' + esc(d.titulo) + '</h3>' + (d.texto ? '<p>' + esc(d.texto) + '</p>' : '') + '</div></div>');
    });
    o.push('</div></div></section>');

    // galeria ou Instagram
    var gal = (c.fotos.galeria || []).filter(Boolean);
    if (gal.length) {
      o.push('<section class="sec alt" id="fotos"><div class="wrap"><div class="cab revela"><span class="olho">Fotos</span><h2>Um pouco do nosso dia a dia</h2></div><div class="galeria">');
      gal.slice(0, 9).forEach(function (g, i) {
        o.push('<figure class="revela"><img src="' + esc(foto(g, 'galeria-' + (i + 1))) + '" alt="Foto ' + (i + 1) + ' de ' + esc(c.nome) + '" loading="lazy"></figure>');
      });
      o.push('</div>');
      if (insta) o.push('<div class="mais revela"><a class="btn btn-s" href="' + esc(insta) + '" target="_blank" rel="noopener">' + icone('instagram') + 'Ver mais no Instagram</a></div>');
      o.push('</div></section>');
    } else if (insta) {
      o.push('<section class="sec alt" id="fotos"><div class="wrap"><div class="insta revela"><div><h2>Acompanhe a gente no Instagram</h2><p>Fotos, novidades e promoções em primeira mão no @' + esc(c.instagram) + '.</p></div>' +
        '<a class="btn" href="' + esc(insta) + '" target="_blank" rel="noopener">' + icone('instagram') + 'Seguir no Instagram</a></div></div></section>');
    }

    // depoimentos (só reais, informados pelo dono)
    if (c.depoimentos.length) {
      o.push('<section class="sec" id="depoimentos"><div class="wrap"><div class="cab revela"><span class="olho">Clientes</span><h2>Quem vem, volta</h2></div><div class="depos">');
      c.depoimentos.forEach(function (d) {
        o.push('<figure class="depo revela"><div class="estrelas" aria-label="5 estrelas">' + new Array(6).join(icone('estrela')) + '</div><blockquote>' + esc(d.texto) + '</blockquote>' + (d.nome ? '<figcaption>' + esc(d.nome) + '</figcaption>' : '') + '</figure>');
      });
      o.push('</div><div class="mais revela"><a class="btn btn-s" href="' + esc(avaliar) + '" target="_blank" rel="noopener">' + icone('estrela') + 'Ver avaliações no Google</a></div></div></section>');
    }

    // horário e localização
    if (temH || c.endereco) {
      o.push('<section class="sec' + (c.depoimentos.length ? ' alt' : '') + '" id="local"><div class="wrap"><div class="cab revela"><span class="olho">Horário e local</span><h2>Venha nos visitar</h2></div><div class="local">');
      o.push('<div class="tab revela">');
      if (temH) {
        o.push('<table><caption class="sr">Horário de funcionamento</caption><tbody>');
        ORDEM_SEMANA.forEach(function (d) { o.push('<tr data-dia="' + d + '"><td>' + DIAS[d] + '</td><td>' + esc(textoDia(c.horarios[d])) + '</td></tr>'); });
        o.push('</tbody></table>');
      } else {
        o.push('<p class="sem">Consulte o horário de funcionamento ' + canalTxt + '.</p>');
      }
      o.push('</div>');
      if (c.endereco) {
        o.push('<div class="mapa revela"><iframe title="Mapa de ' + esc(c.nome) + '" src="' + esc(mapaEmbed) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '<div class="end"><p>' + icone('pino') + '<span>' + esc(c.endereco) + '</span></p><span style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-p" href="' + esc(rota) + '" target="_blank" rel="noopener">' + icone('rota') + 'Como chegar</a>' +
          '<a class="btn btn-s" href="' + esc(waze) + '" target="_blank" rel="noopener">Waze</a></span></div></div>');
      }
      o.push('</div></div></section>');
    }

    // perguntas frequentes
    var faqs = c.faq.slice();
    if (c.endereco) faqs.push({ p: 'Onde fica?', r: c.endereco + '. Toque em Como chegar para abrir a rota no seu celular.' });
    if (temH) faqs.push({ p: 'Qual o horário de funcionamento?', r: frasesHorario(c.horarios) + '.' });
    if (c.links.ifood) faqs.push({ p: 'Tem delivery?', r: 'Sim, pelo iFood. Toque em Pedir no iFood para fazer o seu pedido.' });
    if (faqs.length) {
      o.push('<section class="sec alt" id="duvidas"><div class="wrap"><div class="cab revela"><span class="olho">Dúvidas</span><h2>Perguntas frequentes</h2></div><div class="faq">');
      faqs.forEach(function (f) { o.push('<details class="revela"><summary>' + esc(f.p) + '</summary><p>' + esc(f.r) + '</p></details>'); });
      o.push('</div></div></section>');
    }

    // chamada final
    if (acaoPrincipal) {
      o.push('<section class="final">' + icone(n.icone, 'emblema') + '<div class="wrap revela"><h2>' + esc(n.cta === 'Agendar horário' || n.cta === 'Agendar consulta' ? 'Garanta o seu horário' : 'Fale com a gente agora') + '</h2>' +
        '<p>' + ({ whatsapp: 'Resposta rápida pelo WhatsApp', telefone: 'Atendimento por telefone', instagram: 'Mande uma mensagem no direct' })[acaoPrincipal.ic] + '. É só tocar no botão.</p><a class="btn" href="' + esc(acaoPrincipal.href) + '" target="_blank" rel="noopener">' + icone(acaoPrincipal.ic) + esc(acaoPrincipal.txt) + '</a></div></section>');
    }
    o.push('</main>');

    // rodapé
    o.push('<footer><div class="wrap">');
    o.push('<div><h3>' + esc(c.nome) + '</h3><p>' + esc(c.rotulo + (c.bairro ? ' em ' + c.bairro : '')) + '</p>' + (c.endereco ? '<p>' + esc(c.endereco) + '</p>' : '') + '</div>');
    o.push('<div><h3>Contato</h3>' +
      (c.whatsapp ? '<p><a href="' + esc(zap) + '" target="_blank" rel="noopener">WhatsApp ' + esc(formatarTelefone(c.whatsapp)) + '</a></p>' : '') +
      (c.telefone && c.telefone !== c.whatsapp ? '<p><a href="tel:+55' + esc(c.telefone) + '">Telefone ' + esc(formatarTelefone(c.telefone)) + '</a></p>' : '') +
      (insta ? '<p><a href="' + esc(insta) + '" target="_blank" rel="noopener">Instagram @' + esc(c.instagram) + '</a></p>' : '') + '</div>');
    o.push('<div><h3>Links</h3><p><a href="#servicos">' + esc(c.tituloServicos) + '</a></p>' + (c.endereco ? '<p><a href="' + esc(rota) + '" target="_blank" rel="noopener">Como chegar</a></p>' : '') +
      '<p><a href="' + esc(avaliar) + '" target="_blank" rel="noopener">Avalie no Google</a></p></div>');
    o.push('<div class="credito"><span>© <span id="ano"></span> ' + esc(c.nome) + '. Todos os direitos reservados.</span>' +
      (c.creditos ? '<span>Site feito por ' + (ag.url ? '<a href="' + esc(ag.url) + '" target="_blank" rel="noopener">' + esc(ag.nome) + '</a>' : esc(ag.nome)) + '</span>' : '') + '</div>');
    o.push('</div></footer>');

    if (zap) o.push('<a class="zap" href="' + esc(zap) + '" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">' + icone('whatsapp') + '</a>');
    o.push('<script>' + scriptSite(c) + '</script>');
    o.push('</body></html>');
    return o.join('\n');
  }

  // ---------------------------------------------------------------- link de prévia (configuração dentro da URL)
  function b64url(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    var b = typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64');
    return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function deB64url(str) {
    var b = str.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    var s = typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString('binary');
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  function lerStream(stream) {
    return new Response(stream).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }

  function paraLink(cfg) {
    var limpo = {};
    Object.keys(cfg || {}).forEach(function (k) {
      if (k === 'fotos' || k === 'agencia' || k === 'modo') return;
      var v = cfg[k];
      if (v === '' || v == null || (Array.isArray(v) && !v.length)) return;
      limpo[k] = v;
    });
    var bytes = new TextEncoder().encode(JSON.stringify(limpo));
    if (typeof CompressionStream === 'function') {
      var cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return lerStream(cs).then(function (z) { return 'z' + b64url(z); });
    }
    return Promise.resolve('j' + b64url(bytes));
  }

  function deLink(codigo) {
    codigo = String(codigo || '').replace(/^#/, '');
    var tipo = codigo[0], bytes = deB64url(codigo.slice(1));
    if (tipo === 'z') {
      var ds = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return lerStream(ds).then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
    }
    return Promise.resolve(JSON.parse(new TextDecoder().decode(bytes)));
  }

  // ---------------------------------------------------------------- .zip simples (sem compressão) para baixar o site
  var TABELA_CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();

  function crc32(b) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // arquivos: [{ nome: 'index.html', dados: Uint8Array }]
  function criarZip(arquivos) {
    var enc = new TextEncoder(), partes = [], central = [], pos = 0;
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    arquivos.forEach(function (a) {
      var nome = enc.encode(a.nome), dados = a.dados, crc = crc32(dados);
      var local = [].concat([0x50, 0x4b, 0x03, 0x04], u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0));
      partes.push(new Uint8Array(local), nome, dados);
      central.push(new Uint8Array([].concat([0x50, 0x4b, 0x01, 0x02], u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(dados.length), u32(dados.length), u16(nome.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(pos))), nome);
      pos += local.length + nome.length + dados.length;
    });
    var tamCentral = central.reduce(function (s, p) { return s + p.length; }, 0);
    var fim = new Uint8Array([].concat([0x50, 0x4b, 0x05, 0x06], u16(0), u16(0), u16(arquivos.length), u16(arquivos.length), u32(tamCentral), u32(pos), u16(0)));
    return new Blob(partes.concat(central, [fim]), { type: 'application/zip' });
  }

  function dataUrlParaBytes(url) {
    var m = String(url).match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!m) return null;
    if (m[2]) {
      var s = typeof atob === 'function' ? atob(m[3]) : Buffer.from(m[3], 'base64').toString('binary');
      var out = new Uint8Array(s.length);
      for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
      return { tipo: m[1], bytes: out };
    }
    return { tipo: m[1], bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
  }

  // Site final com as fotos em arquivos separados (carrega mais rápido que tudo dentro do HTML).
  function gerarPacote(cfg, opcoes) {
    var extras = [];
    var html = gerarSite(cfg, Object.assign({}, opcoes, {
      urlFoto: function (src, chave) {
        var d = dataUrlParaBytes(src);
        if (!d) return src;
        var ext = /png/.test(d.tipo) ? 'png' : /webp/.test(d.tipo) ? 'webp' : 'jpg';
        var nome = 'img/' + chave + '.' + ext;
        if (!extras.some(function (e) { return e.nome === nome; })) extras.push({ nome: nome, dados: d.bytes });
        return nome;
      }
    }));
    return [{ nome: 'index.html', dados: new TextEncoder().encode(html) }].concat(extras);
  }

  // Troca a página atual pelo site gerado (usado nas prévias e nos exemplos).
  function substituirPagina(html) {
    function fazer() { document.open(); document.write(html); document.close(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fazer); else fazer();
  }

  var api = {
    NICHOS: NICHOS, TEMAS: TEMAS, LISTA_NICHOS: LISTA_NICHOS, HORARIOS_PADRAO: HORARIOS_PADRAO, DIAS: DIAS,
    gerarSite: gerarSite, gerarPacote: gerarPacote, criarZip: criarZip, normalizar: normalizar,
    paraLink: paraLink, deLink: deLink, linkWhats: linkWhats, numeroBR: numeroBR, formatarTelefone: formatarTelefone,
    substituirPagina: substituirPagina, slug: slug, servicosParaTexto: servicosParaTexto, lerFaixas: lerFaixas, contraste: contraste, icone: icone, esc: esc
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  raiz.Vitrine = api;
})(typeof window !== 'undefined' ? window : globalThis);
