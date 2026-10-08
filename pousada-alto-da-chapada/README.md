# Site da Pousada Alto da Chapada

Site institucional de página única para a **Pousada Alto da Chapada** (Alto Paraíso de Goiás, Chapada dos Veadeiros). É HTML, CSS e JavaScript puros, sem build: basta subir a pasta para qualquer hospedagem estática.

## O que tem no site

| Seção | Destaques |
| --- | --- |
| Topo (hero) | Ilustração original de céu estrelado sobre a Chapada (SVG leve, com estrelas piscando e estrela cadente), título, subtítulo e **barra de reserva** (check-in, check-out, hóspedes) que abre o WhatsApp com a mensagem pronta |
| A pousada | 3 parágrafos institucionais, fotos e 4 cards (localização, atendimento familiar, conforto, guia de passeios) |
| Acomodações | Quarto Família e Quarto Standard com metragem, capacidade, camas, comodidades, galeria (lightbox) e botão "Reservar via WhatsApp" |
| Comodidades | 8 ícones + destaques do licor de boas-vindas e dos passeios sob medida |
| Galeria | Fotos da pousada e da natureza com lightbox (setas, teclado, arrastar no celular) |
| Localização | Google Maps incorporado, distâncias, 6 atrações próximas e como chegar (carro, ônibus, avião) |
| Avaliações | Depoimento real + carrossel que liga sozinho quando houver 2 ou mais avaliações |
| FAQ | 7 perguntas em acordeão (com dados estruturados FAQPage) |
| Contato | Formulário validado que monta a mensagem e abre o WhatsApp (62) 98186-7142 |
| Rodapé | Links rápidos, contato, Instagram, Política de Privacidade e Termos de Uso |

Também inclui: botão flutuante de WhatsApp em todas as páginas, menu fixo que fica sólido ao rolar, menu mobile, SEO (meta tags, Open Graph, `LodgingBusiness` + `FAQPage` em JSON-LD, `robots.txt`, `sitemap.xml`), imagens WebP com lazy loading, página 404, suporte a "reduzir movimento" e Google Analytics opcional com aviso de cookies (LGPD).

## Estrutura

```
pousada-alto-da-chapada/
├── index.html          página principal
├── privacidade.html    Política de Privacidade (LGPD)
├── termos.html         Termos de Uso
├── 404.html            página de erro
├── robots.txt
├── sitemap.xml
└── assets/
    ├── css/style.css
    ├── js/main.js      WhatsApp, formulários, galeria, carrossel, menu, Analytics
    └── img/            fotos em WebP, logo, favicon e imagem de compartilhamento
```

## Ver no computador

```bash
cd pousada-alto-da-chapada
python3 -m http.server 8000
# abra http://localhost:8000
```

## Publicar

Qualquer hospedagem estática serve: Netlify (arrastar a pasta em app.netlify.com/drop), Vercel, GitHub Pages, Cloudflare Pages ou a hospedagem do domínio (subir a pasta via FTP). Use a pasta `pousada-alto-da-chapada/` como raiz do site.

## Antes de publicar: checklist

### 1. Domínio
O site usa `https://www.pousadaaltodachapada.com.br` nas URLs absolutas (canonical, Open Graph, JSON-LD, robots e sitemap). Se o domínio for outro, troque em todos os arquivos de uma vez:

```bash
grep -rl "www.pousadaaltodachapada.com.br" . | xargs sed -i 's#www.pousadaaltodachapada.com.br#SEU-DOMINIO.com.br#g'
```

### 2. Confirmar com a pousada
Estas informações vieram do briefing ou de listagens públicas e **precisam ser conferidas com os donos**:

- **Metragem e camas dos quartos**: usei 20 m² / 3 camas de solteiro / até 3 hóspedes no Família (o que aparece na foto) e 14 m² / casal ou 2 de solteiro / até 2 hóspedes no Standard. Ajuste em `index.html` (cards e JSON-LD).
- **Check-in 14h e check-out 12h**: as listagens divergem (algumas dizem check-in 13h30).
- **Animais de estimação**: listagens dizem que não aceita.
- **Estacionamento gratuito**, café da manhã incluso, serviço de quarto, TV a cabo e recepção 24h.
- **Telefone**: o briefing informa (62) 98186-7142, mas a ficha do Google lista +55 61 99264-8263. Confirme qual é o WhatsApp principal (o número fica em `CONFIG.whatsapp` no `main.js` e nos links do HTML).
- **Distâncias das atrações** são aproximadas.

### 3. Avaliações
Só entrou **uma** avaliação verificável (Maikon Leandro, Foursquare). Copie de 2 a 4 avaliações reais do Google, Tripadvisor ou Booking, do jeito que o hóspede escreveu, e cole no bloco indicado no comentário da seção `#avaliacoes`. Com 2 ou mais, as setas e bolinhas do carrossel aparecem sozinhas. Não invente nem edite depoimentos.

### 4. Fotos
As fotos atuais vieram do Instagram e têm baixa resolução (cerca de 560 px). O ideal é pedir à pousada:

- fotos de **cada tipo de quarto** (hoje o card do Standard usa recortes da foto do quarto com três camas, com legenda de "decoração padrão");
- café da manhã, fachada, terraço e banheiro;
- de preferência com 1600 px ou mais de largura.

Para converter para WebP: `cwebp -q 80 foto.jpg -o assets/img/foto.webp` (ou squoosh.app).

**Galeria dos quartos**: cada foto é um link `<a href="assets/img/…" data-gallery="familia" data-caption="…">`. Para adicionar uma foto, copie um desses links dentro do card do quarto; o lightbox junta todas as fotos com o mesmo `data-gallery`.

**Foto no topo**: se quiser trocar a ilustração por uma foto real da Chapada, coloque o arquivo em `assets/img/hero.webp` e adicione dentro de `<div class="hero__bg">`, logo depois dos dois `<svg>`:

```html
<img class="hero__photo" src="assets/img/hero.webp" alt="" fetchpriority="high">
```

### 5. Google Analytics e Search Console
- **Analytics (GA4)**: preencha `gaMeasurementId: 'G-XXXXXXXXXX'` no início de `assets/js/main.js`. O script só carrega depois que o visitante aceita o aviso de cookies.
- **Search Console**: descomente a meta `google-site-verification` no `<head>` do `index.html` e cole o código. Depois envie o `sitemap.xml`.
- Vale cadastrar/atualizar o **Perfil da Empresa no Google** com o link do site, que pesa muito na busca local.

### 6. Crédito
Há um comentário no rodapé do `index.html` para incluir o crédito de quem desenvolveu o site.
