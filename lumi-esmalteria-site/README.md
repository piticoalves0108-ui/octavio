# Lumi Esmalteria · site

Site da **Lumi Esmalteria** (Brasília-DF): nail design, esmaltação em gel, alongamento e spa dos pés.
Conversão principal: **agendamento pelo WhatsApp** ([wa.me/5561996680622](https://wa.me/5561996680622)) · Instagram [@esmalterialumi](https://www.instagram.com/esmalterialumi/).

## Rodando

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Requer Node 20+. Variável opcional em `.env.example`:

| Variável | Para quê |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Domínio final (ex.: `https://www.lumiesmalteria.com.br`). **Enquanto não for definida, o site fica fora do Google** (`noindex` + `robots.txt` bloqueando), ideal para prévias. |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · motion · GSAP + ScrollTrigger · Lenis (scroll suave) · Three.js com React Three Fiber + drei.

## Páginas

| Rota | Conteúdo |
| --- | --- |
| `/` | Hero com frasco 3D, marquee, serviços em destaque, "Por que a Lumi", provador de cores na mão, galeria, depoimentos, agendamento + horários |
| `/servicos` | Os 7 serviços com descrição, duração, o que inclui, indicação e botão "Agendar pelo WhatsApp"; frasco 360°; como funciona; FAQ |
| `/agendamento` | Assistente: serviço → data → horário → profissional → dados, e a mensagem pronta vai para o WhatsApp |
| `/galeria` | Grade editorial com filtros (unhas, nail art, spa dos pés, alongamento) e zoom |
| `/cores` | Cartela completa com swatches que "pintam", filtros por coleção e acabamento |
| `/sobre` | Manifesto, valores, o espaço, equipe |
| `/tendencias` e `/tendencias/[slug]` | Blog de tendências e cuidados |
| `/clube` | Clube de assinatura (planos sem preço: valores combinados pelo WhatsApp) |
| `/contato` | WhatsApp, Instagram, horários e mapa |

## Efeitos e interações

- **Frasco 3D** (`src/components/three/`): vidro com transmissão real, esmalte que muda de cor com transição, acabamentos cremoso, perolado, metálico e glitter; os reflexos acompanham o mouse e o frasco gira com o scroll. Em `/servicos` há um visualizador 360° (arraste para girar). Sem WebGL, o site continua completo.
- **Provador de cores** (`NailTryOn`): mão ilustrada em SVG; a cor sobe da cutícula até a ponta ao trocar o esmalte; formato, comprimento e francesinha.
- **Swatches "líquidos"** (`PaintSwatch`): o esmalte sobe com borda gelatinosa (filtro SVG).
- Tela de carregamento com o logo se formando, transições entre páginas, textos revelados linha a linha, cards com tilt 3D, botões magnéticos, cursor personalizado com rastro de brilhos, marquee, botão flutuante do WhatsApp.
- `prefers-reduced-motion` desliga animações pesadas; cursor e brilhos só aparecem em mouse.

## Onde editar

| Arquivo | O que tem |
| --- | --- |
| `src/data/brand.ts` | Nome, WhatsApp, Instagram, cidade, **endereço** e **horários** |
| `src/data/services.ts` | Serviços, durações, o que inclui e indicação |
| `src/data/colors.ts` | Cartela de cores (nome, cor, acabamento, coleção) |
| `src/data/gallery.ts` | Itens da galeria (desenho em SVG ou foto) |
| `src/data/content.ts` | Depoimentos, equipe, diferenciais, FAQ, marquee |
| `src/data/posts.ts` | Artigos de tendências |
| `src/data/plans.ts` | Planos do clube |

## ⚠️ Confirmar com a Lumi antes de publicar

Só **nome, WhatsApp e Instagram** foram confirmados. O resto é conteúdo-modelo, marcado para revisão:

- [ ] **Endereço** (o site mostra só "Brasília - DF"; o mapa usa a cidade). Preencher `brand.location.address`.
- [ ] **Horários de funcionamento** (`brand.hours` e `brand.schedule`, usados no rodapé, contato e agendamento).
- [ ] **Equipe**: nomes, especialidades e fotos são ilustrativos.
- [ ] **Depoimentos**: ilustrativos; trocar por avaliações reais (com autorização).
- [ ] **Fotos**: a galeria usa nail art desenhada em SVG e fotos de banco de imagens (Unsplash) para o spa. Substituir por fotos reais do Instagram quando possível.
- [ ] **Serviços e durações**, **clube de assinatura** e **números** da seção "Por que a Lumi".
- [ ] **Política de atendimento** (tolerância de atraso, remarcação, atendimento adaptado) na página de contato e no FAQ.
- [ ] Domínio final em `NEXT_PUBLIC_SITE_URL` (libera a indexação no Google).

Nenhum preço foi publicado: os valores são combinados pelo WhatsApp.
