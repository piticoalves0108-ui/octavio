# Nature Senses Chapadinha · site

Site de uma página para o **Nature Senses Chapadinha**, chalé/pousada em Cavalcante (GO), no lado norte da Chapada dos Veadeiros.
Instagram: [@naturesenseschapadinha](https://www.instagram.com/naturesenseschapadinha/).

Feito só com HTML, CSS e JavaScript puros. Não precisa instalar nada nem compilar.

## Como abrir

- Dê dois cliques em `index.html`, ou
- rode um servidor local na pasta: `python3 -m http.server` e abra `http://localhost:8000`.

## O que tem no site

| Seção | Conteúdo | Movimento |
| --- | --- | --- |
| Banners do topo | 3 banners com fotos reais (chalé, hidro, noite) | No computador: foto em arco sobre paisagem animada em canvas, com zoom, paralaxe e selo girando. No celular: foto em tela cheia. Troca com revelação circular, autoplay e arrastar |
| Faixa | Palavras-chave da Chapada | Corre sozinha e acelera/inverte com a rolagem |
| A pousada | Texto de apresentação e números (notas, distância) | Palavras acendem com a rolagem, contadores animados, cristal girando |
| Chalé Orquídea | Foto do deck em arco + foto da hidro e comodidades | Inclinação 3D com o mouse, foto menor flutuando |
| Banner "Desconecte" | Foto do pôr do sol no deck | Paralaxe e zoom ao entrar na tela |
| Cinco sentidos | Ver, ouvir, tocar, cheirar, saborear | Painéis que se expandem |
| Região | Parque Nacional, Santa Bárbara, Capivara, Complexo do Prata, Vale da Lua | Rolagem horizontal fixada (desktop) / arrastar (celular) |
| Banner "Céu" | Via Láctea | Estrelas cadentes; clique/toque lança uma |
| Galeria | 7 fotos | Zoom ao passar o mouse; toque abre a foto ampliada (setas, arrastar, Esc) |
| Avaliações | 9,7 no Booking · 5,0 no Airbnb | Anéis que se preenchem |
| Como chegar | Endereço, dicas de estrada e mapa esquemático | Rota se desenha e um carrinho percorre |
| Reserva | Formulário que monta a mensagem de reserva | Envia por WhatsApp (se configurado) ou Direct do Instagram |

Também: cursor personalizado, botões magnéticos, barra de progresso de leitura, menu que some ao rolar para baixo, menu de celular em tela cheia, botão flutuante "Reservar" no celular.
Quem usa "reduzir movimento" no sistema vê o site completo e parado.

## Configurar

Abra `assets/js/main.js` e edite o bloco `CONFIG` no topo:

```js
var CONFIG = {
  instagram: 'naturesenseschapadinha',
  whatsapp: '',          // ex.: '5562999999999' (DDI + DDD + número)
  booking: '...',        // link do anúncio no Booking
  airbnb: '...',         // link do anúncio no Airbnb
  autoplay: 7000         // tempo de cada banner, em ms
};
```

Com o WhatsApp preenchido, o formulário abre o WhatsApp já com a mensagem escrita. Sem ele, copia a mensagem e abre o Direct do Instagram.
Os links de Booking e Airbnb hoje são buscas pelo nome da pousada. Troque pelos links diretos dos anúncios.

## Fotos

Ficam em `assets/img/fotos/`, cada uma em duas larguras (`-640.jpg` e `-1080.jpg`); o navegador escolhe a certa.
As marcas d'água foram cortadas. Para trocar ou adicionar uma foto:

1. Salve a foto em `.jpg` nas duas larguras com o mesmo nome (ex.: `cozinha-640.jpg` e `cozinha-1080.jpg`), até ~250 KB cada.
2. **Galeria:** copie um bloco `<button class="tile" ...>` em `index.html`, troque o nome dos arquivos, o `alt` e a legenda, e ajuste `data-index` (0, 1, 2…).
3. **Banners do topo:** troque o `<img>` dentro de `.slide__photo`. O enquadramento é ajustado por `--pos` (computador) e `--pos-m` (celular) no `style` de cada banner.

Os cartões da seção Região (cachoeiras) continuam ilustrados. Se tiver fotos delas, troque o `<canvas>` do cartão por um `<img>`.

## Publicar

- **GitHub Pages:** no repositório, *Settings → Pages*, escolha a branch e a pasta. O site fica em `https://<usuário>.github.io/<repo>/nature-senses-chapadinha/`.
- **Netlify / Vercel:** arraste a pasta `nature-senses-chapadinha` para o painel ("Deploy manually") ou conecte o repositório.

## Informações usadas (confira com a pousada)

Levantadas em buscas públicas em outubro de 2026 (Booking.com, Airbnb, Tripadvisor) e nas fotos enviadas pela pousada.

- Endereço: Estrada Cavalcante–Colinas do Sul, Cavalcante – GO, 73790-000.
- Booking.com: nota 9,7 ("Excepcional"); hidromassagem, jardim, Wi‑Fi e estacionamento privativo gratuitos.
- Airbnb: "Chalé Orquídea – Nature Senses Chapadinha", nota 5,0.
- Pelas fotos: chalé em A com fachada de vidro, deck com hidromassagem, poltronas e churrasqueira, sala com sofá e escada para o mezanino.
- Distância de Brasília (~320 km) e rota são aproximadas.
- O logo nas fotos escreve "Nature's Senses"; o site usa "Nature Senses", como no Instagram e no Booking.

Faltam e vale pedir à pousada: telefone/WhatsApp, o logo em arquivo, fotos do interior e das cachoeiras, outros chalés (se houver), café da manhã, regras de check-in/check-out e capacidade de hóspedes.
