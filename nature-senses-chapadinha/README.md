# Nature Senses Chapadinha · site

Site de uma página para o **Nature Senses Chapadinha**, chalé/pousada em Cavalcante (GO), no lado norte da Chapada dos Veadeiros.
Instagram: [@naturesenseschapadinha](https://www.instagram.com/naturesenseschapadinha/).

Feito só com HTML, CSS e JavaScript puros. Não precisa instalar nada nem compilar.

## Como abrir

- Dê dois cliques em `index.html`, ou
- rode um servidor local na pasta: `python3 -m http.server` e abra `http://localhost:8000`.

## O que tem no site

O motion segue um guia de movimento calmo e discreto: fades, deslocamentos de 8–24px e zoom de no máximo 1.03, só em `transform` e `opacity`.
A especificação completa (tokens, efeitos por seção, versão reduzida e checklist) está em [`MOTION.md`](MOTION.md).

| Seção | Conteúdo | Movimento |
| --- | --- | --- |
| Topo | Logo, menu e "Reservar" | Fundo aparece em fade e o header encolhe ao rolar; sublinhado animado nos links |
| Hero | 3 fotos reais em sequência, título e CTAs | Fade + scale 1.04 → 1.00, texto em fade-up com stagger, crossfade a cada 7s (com pausa), parallax leve |
| A pousada | Apresentação e números (notas, distância) | Fade-up ao rolar |
| Chalé Orquídea | 2 fotos, comodidades e CTAs | Fade-up, comodidades em sequência |
| Banner | Pôr do sol no deck | Parallax leve no fundo |
| Experiências | 3 cards com fotos + os cinco sentidos | Stagger na entrada; hover com elevação e zoom de 1.03 |
| Região | 6 atrações (cachoeiras, Parque, Kalunga) | Stagger; hover com elevação |
| Galeria | 7 fotos | Hover com zoom e legenda em fade; foto ampliada com fade + scale |
| Como chegar | Endereço, dicas e mapa esquemático | Fade-up |
| Dúvidas | 6 perguntas frequentes | Accordion com abertura suave |
| Reserva | Formulário que monta a mensagem | Label flutuante, mensagens com fade + slide, estado de carregamento |
| Botão fixo | WhatsApp (se configurado) ou Instagram | Aparece em fade; destaque discreto a cada 45s |

Quem usa "reduzir movimento" no sistema vê o site completo e parado.

## Configurar

Abra `assets/js/main.js` e edite o bloco `CONFIG` no topo:

```js
var CONFIG = {
  instagram: 'naturesenseschapadinha',
  whatsapp: '',          // ex.: '5562999999999' (DDI + DDD + número)
  booking: '...',        // link do anúncio no Booking
  airbnb: '...',         // link do anúncio no Airbnb
  heroInterval: 7000     // tempo de cada foto do topo, em ms
};
```

Com o WhatsApp preenchido, o botão fixo e o formulário passam a usar o WhatsApp (com a mensagem já escrita). Sem ele, usam o Direct do Instagram.
Os links de Booking e Airbnb hoje são buscas pelo nome da pousada. Troque pelos links diretos dos anúncios.

## Fotos

Ficam em `assets/img/fotos/`, cada uma em duas larguras (`-640.jpg` e `-1080.jpg`); o navegador escolhe a certa.
As marcas d'água foram cortadas. Para trocar ou adicionar uma foto:

1. Salve a foto em `.jpg` nas duas larguras com o mesmo nome (ex.: `cozinha-640.jpg` e `cozinha-1080.jpg`), até ~250 KB cada.
2. **Galeria:** copie um bloco `<li>` da `.gallery__grid` em `index.html` e troque o nome dos arquivos, o `alt`, a legenda e a classe `ph-…`.
3. **Hero:** troque o `<img>` de um `.hero__slide`. O enquadramento é ajustado por `--pos` (computador) e `--pos-m` (celular).
4. **Placeholder desfocado:** cada foto tem uma classe `ph-nome` no fim de `style.css` com uma miniatura de 16 px em base64. Para uma foto nova, gere a miniatura (16 px de largura, JPEG) e adicione a classe; sem ela, aparece um fundo verde liso até a foto carregar.

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
