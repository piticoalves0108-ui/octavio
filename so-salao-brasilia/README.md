# Só Salão Brasília: site "Showroom 3D"

Site da **Só Salão Brasília**, fábrica de móveis para salão de beleza e esmalteria na QI 19, Setor Industrial, Taguatinga Norte - DF.

O conceito é o **Showroom 3D**: o site é a vitrine da fábrica. A pessoa gira a cadeira, troca o estofado e o acabamento, monta o salão inteiro e pede o orçamento pelo WhatsApp com a escolha já escrita na mensagem.

- **Stack:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + componentes no padrão shadcn/ui (Radix) para accordion e dialog.
- **3D:** three + React Three Fiber + drei + postprocessing (Bloom, Depth of Field e Noise, só no desktop).
- **Movimento:** GSAP 3 (ScrollTrigger e SplitText) + Lenis (rolagem suave sincronizada com o ScrollTrigger) + Motion (microinterações e transição de página).

---

## 1. Como rodar

Requisitos: Node.js 20.9 ou mais novo e npm.

```bash
cd so-salao-brasilia
npm install
cp .env.example .env.local   # ajuste NEXT_PUBLIC_SITE_URL
npm run dev                  # http://localhost:3000
```

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build de produção e servidor de produção |
| `npm run lint` / `npm run typecheck` | ESLint e TypeScript |
| `npm run confirmar` | Lista todos os marcadores `{{CONFIRMAR: ...}}` (use `-- --falhar` no CI para bloquear a publicação) |
| `npm run capture` | Regrava pôster, renders, maquete e vídeo a partir da própria cena 3D (ver seção 4) |

Para testar os níveis de qualidade do 3D no seu computador, acrescente na URL: `?qualidade=alto`, `?qualidade=medio`, `?qualidade=video` ou `?qualidade=sem-webgl`.

---

## 2. Estrutura de pastas

```
so-salao-brasilia/
├── public/
│   ├── images/
│   │   ├── hero/cadeira-poster.avif    # pôster do hero (LCP), gravado da cena 3D no mesmo enquadramento
│   │   ├── renders/*.avif              # frente e perfil de cada linha (placeholders até as fotos reais)
│   │   ├── salao/*.avif                # maquete do "Monte seu salão" vazia e montada
│   │   └── galeria/                    # coloque aqui as fotos dos salões de clientes (com autorização)
│   └── video/cadeira-giro.{webm,mp4}   # loop da cadeira para aparelhos muito fracos
├── scripts/
│   ├── capturar-cenas.mjs              # grava pôster, renders, maquete, vídeo e imagens de Open Graph
│   └── listar-confirmar.mjs            # lista os marcadores {{CONFIRMAR}}
└── src/
    ├── app/
    │   ├── layout.tsx                  # <html lang="pt-BR">, fontes (next/font), metadata padrão
    │   ├── (site)/                     # páginas públicas, com cabeçalho, rodapé e WhatsApp flutuante
    │   │   ├── layout.tsx              # moldura do site + JSON-LD FurnitureStore/LocalBusiness
    │   │   ├── page.tsx                # home (as 7 seções + "Monte seu salão")
    │   │   ├── configurador/           # configurador 3D em tela cheia, com link compartilhável
    │   │   ├── linhas/[slug]/          # uma página por linha (cadeiras, lavatórios...) + JSON-LD Product
    │   │   └── showroom/               # visita ao showroom: endereço, horário, mapa, contatos
    │   ├── captura/                    # rota interna usada pelo `npm run capture` (desligada em produção)
    │   ├── opengraph-image.tsx         # imagem de compartilhamento (cada página tem a sua)
    │   ├── sitemap.ts · robots.ts · manifest.ts · icon.svg · apple-icon.tsx
    │   └── globals.css                 # tokens da marca (Tailwind v4 @theme), grade de 12 colunas, intro
    ├── content/                        # ★ TODOS os textos e dados do negócio ficam aqui
    │   ├── negocio.ts                  # nome, endereço, WhatsApp, Instagram, horário, fatos confirmados
    │   ├── catalogo.ts                 # linhas de produto, tecidos, cores, acabamentos
    │   └── textos.ts                   # textos das seções, etapas, galeria, perguntas frequentes
    ├── components/
    │   ├── cena3d/                     # tudo que é WebGL (carregado sob demanda, fora do JS inicial)
    │   │   ├── modelos/                # móveis em geometria procedural (cadeira, lavatório, bancada, recepção, espelho)
    │   │   ├── materiais.tsx           # estofado (sheen/clearcoat + mapa normal gerado no navegador) e metais
    │   │   ├── Estudio.tsx             # luz de estúdio com Lightformers (sem baixar HDR)
    │   │   ├── base.tsx                # Canvas comum: dpr [1, 1.75], PerformanceMonitor, frameloop demand/pausa
    │   │   ├── CenaHero.tsx · CenaConfigurador.tsx · CenaSalao.tsx
    │   │   ├── Efeitos.tsx             # Bloom + DoF + Noise (só no nível "alto")
    │   │   ├── giro.ts                 # girar por arraste, teclado e giroscópio
    │   │   └── carregar.ts             # quando montar o Canvas (visível, ocioso, depois da intro)
    │   ├── configurador/               # seletores acessíveis e o configurador completo
    │   ├── secoes/                     # seções da home (Hero, Linhas, MonteSeuSalao, ComoFunciona...)
    │   ├── movimento/                  # TituloAnimado (SplitText) e Contador
    │   ├── layout/                     # cabeçalho, rodapé, intro em shader, transição, Lenis, medição
    │   └── ui/                         # botões, ícones, accordion e dialog (padrão shadcn), placeholders
    ├── lib/                            # WhatsApp, JSON-LD, analytics, qualidade do 3D, GSAP, rolagem
    └── assets/                         # fontes .ttf e PNGs usados só na geração das imagens de Open Graph
```

---

## 3. Como trocar textos

Todo o conteúdo está em `src/content/`. Não é preciso mexer nos componentes.

- **Dados do negócio** (`negocio.ts`): endereço, WhatsApp, Instagram, horário, CEP, coordenadas.
  - O **horário** entra no site e no JSON-LD assim que `showroom.horario` for preenchido (há um exemplo comentado no arquivo).
  - **CEP** e **coordenadas** (`geo`) só entram no JSON-LD quando preenchidos.
- **Linhas de produto** (`catalogo.ts`): nome, descrição, medidas e modelos de cada linha; cores e tecidos do configurador.
- **Seções e perguntas frequentes** (`textos.ts`): títulos, etapas do processo, legendas da galeria, FAQ.
- No título do hero, um trecho entre `*asteriscos*` fica em itálico rosé.

Qualquer `{{CONFIRMAR: ...}}` aparece **destacado no próprio site** (borda tracejada) até ser substituído pelo texto real.

## 4. Como trocar fotos

| Onde | Como trocar |
|---|---|
| **Galeria "Salões que já montamos"** | Coloque a foto em `public/images/galeria/` e preencha `imagem: { src, alt }` no item correspondente em `textos.ts → galeria`. O placeholder some sozinho. Mantenha a proporção indicada (`4/5`, `1/1`, `3/2`). |
| **Fachada do showroom** | Troque o `<FotoReservada>` de `components/secoes/Showroom.tsx` por um `<Image>` (ou passe a prop `imagem`). |
| **Frente e perfil de cada linha** | Hoje são renders da cena 3D. Para usar fotos reais, salve `public/images/renders/<modelo>-frente.avif` e `-perfil.avif` (proporção 4:5, fundo claro) ou mude os caminhos em `catalogo.ts → imagens`. |
| **Pôster do hero, maquete e vídeo** | Rode `npm run dev` em um terminal e `npm run capture` em outro. O script abre a rota `/captura` no Chromium e regrava tudo a partir da cena (use `-- --so=hero`, `renders`, `salao` ou `video` para gravar só uma parte). Precisa de `ffmpeg` para o vídeo e de um Chromium (`npx playwright install chromium` ou `CHROMIUM_PATH=/caminho/do/chrome`). |

Use as fotos do Instagram **@sosalaobrasilia** só com autorização da fábrica e, no caso de salões de clientes, com autorização de cada cliente.

---

## 5. Marcadores `{{CONFIRMAR}}`: o que falta confirmar com o dono

Lista gerada por `npm run confirmar` (27 pendências):

| # | Pendência | Arquivo |
|---|---|---|
| 1 | Horário do showroom | `src/content/negocio.ts` |
| 2 | CEP da fábrica | `src/content/negocio.ts` |
| 3 | Latitude e longitude exatas da fábrica | `src/content/negocio.ts` |
| 4 | Qual dos três WhatsApp deve receber os orçamentos do site | `src/content/negocio.ts` |
| 5 | Domínio próprio do site | `.env.example` |
| 6 | Cores e tecidos disponíveis no mostruário | `src/content/catalogo.ts` |
| 7–8 | Cadeiras: medidas (altura, largura, profundidade, regulagem) e modelos fabricados | `src/content/catalogo.ts` |
| 9–10 | Lavatórios: medidas, tipo de cuba e se cuba/misturador acompanham; modelos | `src/content/catalogo.ts` |
| 11–12 | Bancadas de manicure: medidas, número de gavetas; modelos | `src/content/catalogo.ts` |
| 13–14 | Recepção: medidas e formato (reto ou curvo); modelos | `src/content/catalogo.ts` |
| 15–16 | Espelhos: medidas e se a moldura estofada existe; modelos | `src/content/catalogo.ts` |
| 17 | Entrega: regiões atendidas e como é cobrado o frete (etapa "Entrega") | `src/content/textos.ts` |
| 18 | Montagem: está inclusa? quem monta? em quais regiões? (etapa "Montagem") | `src/content/textos.ts` |
| 19 | Fotos de salões de clientes e autorização de uso de imagem | `src/content/textos.ts` |
| 20 | Prazo: a partir de quando os 7 dias úteis são contados | `src/content/textos.ts` (FAQ) |
| 21 | Outras formas de pagamento (Pix, boleto, entrada) | `src/content/textos.ts` (FAQ) |
| 22 | Frete: regiões atendidas no DF e entorno e valor | `src/content/textos.ts` (FAQ) |
| 23 | Montagem (FAQ) | `src/content/textos.ts` (FAQ) |
| 24 | Garantia: prazo e cobertura | `src/content/textos.ts` (FAQ) |
| 25 | Personalizações além de cor e acabamento | `src/content/textos.ts` (FAQ) |
| 26 | Foto da fachada e do showroom | `src/components/secoes/Showroom.tsx` |
| 27 | Foto de cliente com cada linha (páginas de linha) | `src/app/(site)/linhas/[slug]/page.tsx` |

Notas de pesquisa (não publicadas no site):
- Um diretório público (Bendito Guia) cita **seg. a sex. das 9h às 18h e sáb. das 9h às 13h** e "ao lado do Sebrae". Use só se o dono confirmar.
- A fábrica também tem página no Facebook (`facebook.com/sosalaobrasilia`). Se quiser, acrescente em `sameAs` no `src/lib/schema.ts`.

Antes de publicar, rode `npm run confirmar -- --falhar`: ele sai com erro enquanto houver pendências.

---

## 6. Modelos 3D: origem e licença

| Modelo | Origem | Licença |
|---|---|---|
| Cadeira de cabeleireiro | Geometria procedural feita no código (`src/components/cena3d/modelos/Cadeira.tsx`) | Própria do projeto |
| Lavatório | Geometria procedural (`Lavatorio.tsx`) | Própria do projeto |
| Bancada de manicure | Geometria procedural (`BancadaManicure.tsx`) | Própria do projeto |
| Balcão de recepção | Geometria procedural (`Recepcao.tsx`) | Própria do projeto |
| Espelho | Geometria procedural (`Espelho.tsx`) | Própria do projeto |
| Sala da maquete, plantas, pedestal | Geometria procedural (`CenaSalao.tsx`, `CenaHero.tsx`) | Própria do projeto |
| Texturas (grão do corino, pelo do veludo, piso) | Geradas no navegador por ruído procedural (`materiais.tsx`, `CenaSalao.tsx`) | Própria do projeto |
| Iluminação de estúdio | `Lightformer`s do drei (sem arquivo HDR externo) | MIT (drei) |

Nenhum modelo de terceiros (Sketchfab, Poly Pizza etc.) foi usado, então não há atribuição CC-BY pendente. As peças são **ilustrativas**: representam as linhas da fábrica, não modelos comerciais específicos.

**Quando a fábrica tiver modelos reais** (fotogrametria ou modelagem das peças):

1. Exporte em `.glb` e comprima com Meshopt e texturas KTX2:
   ```bash
   npx @gltf-transform/cli optimize entrada.glb public/models/cadeira.glb --compress meshopt --texture-compress ktx2
   ```
2. No arquivo, chame de `estofado` o material do estofado e de `acabamento` o da base/metais: eles recebem a cor e o acabamento do configurador.
3. Preencha `glb: "/models/cadeira.glb"` na linha correspondente em `catalogo.ts`. O carregador (`ModeloGlb.tsx`, com Meshopt + KTX2) só é baixado quando existe algum `.glb` configurado.
4. Se o modelo for de terceiros, registre aqui a origem e a licença (aceite só CC0 ou CC-BY, com o crédito pedido).

---

## 7. Desempenho

- **LCP sem WebGL:** o hero mostra primeiro um pôster AVIF (gravado da própria cena, mesmo enquadramento, `priority`). O `<Canvas>` vem por `next/dynamic` com `ssr: false` e só é montado quando o hero está visível, o navegador está ocioso e a intro terminou. Ele aparece por cima do pôster com um fade.
- **JS inicial:** three, R3F, drei, pós-processamento, GSAP e Lenis ficam fora do JS inicial (chunks carregados sob demanda).
- **Render sob controle:** dpr limitado a `[1, 1.75]` (`[1, 1.5]` no celular); `<PerformanceMonitor>` reduz o dpr e, se o FPS continuar baixo, troca para o nível "vídeo"; `frameloop="demand"` quando nada se move; `frameloop="never"` fora da tela.
- **Níveis de qualidade** (`src/lib/qualidade.ts`): `alto` (desktop: Bloom + DoF + Noise, sombras acumuladas), `medio` (celular: sem pós-processamento, menos partículas, geometria mais leve, ContactShadows), `video` (aparelho muito fraco ou economia de dados: vídeo em loop gravado da cena) e `sem-webgl` (pôster + todo o conteúdo em HTML).
- **Mapa:** o Google Maps só carrega quando a pessoa clica em "Carregar mapa interativo" (fachada leve, sem cookies de terceiros no carregamento).
- **Intro:** script inline de ~2 kB (WebGL puro, sem three.js), só na primeira visita da sessão à home.

### Decisões técnicas

- **Sem física (Rapier) no "Monte seu salão":** a queda das peças é guiada pela rolagem (ScrollTrigger com `scrub`). Assim ela é reversível (rolar para cima "desmonta" o salão) e sempre igual; uma simulação física daria resultados diferentes a cada vez e somaria mais de 1 MB de WebAssembly ao carregamento.
- **Carrossel coverflow em CSS 3D, não em WebGL:** os cards continuam sendo HTML (texto indexável, links e foco de teclado normais) e funcionam sem WebGL. O tilt e a troca frente/perfil são feitos com Motion.
- **3D no celular só depois da primeira interação:** no nível "medio", o Canvas do hero espera o primeiro toque, rolagem ou tecla. O pôster é idêntico ao primeiro quadro da cena, então a troca é invisível; quem sai antes não gasta bateria nem dados com WebGL.
- **Geometria procedural em vez de .glb:** não há modelos reais das peças da fábrica ainda. Desenhar as peças em código evita usar móveis de terceiros que não representam a fábrica e mantém o chunk 3D leve (sem download de malhas e texturas).

## 8. Acessibilidade

- `prefers-reduced-motion`: desliga Lenis, intro, pin das seções, contadores, tilt, botões magnéticos e animações longas; a cortina de transição vira navegação direta; "Monte seu salão" já aparece montado.
- Seletores do configurador são `radio` nativos (setas do teclado), com `fieldset`/`legend`; a peça 3D gira com as setas do teclado.
- Foco visível em todos os elementos, link "Pular para o conteúdo", menu do celular em `Dialog` com foco preso.
- Texto alternativo em todas as imagens; o 3D é complementar: todo o conteúdo existe em HTML.
- Contraste AA: o champanhe ganhou uma versão escurecida (`#7a6440`) para texto pequeno sobre fundo claro.

## 9. SEO local

- `metadata` e Open Graph por página (com imagem gerada por página), `lang="pt-BR"`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`.
- JSON-LD `FurnitureStore` + `LocalBusiness` com nome, endereço, telefones, Instagram em `sameAs` e um `Product` para cada linha; `geo`, `postalCode` e `openingHoursSpecification` entram quando confirmados. Cada página de linha tem `Product` + `BreadcrumbList`; a home tem `FAQPage` só com respostas confirmadas.
- Título da home: "Só Salão Brasília | Fábrica de móveis para salão de beleza e esmalteria em Taguatinga Norte - DF".

## 10. Conversão e medição

- Botão flutuante de WhatsApp com a mensagem pronta do briefing, link `tel:`, "Como chegar" (Google Maps com rota), Instagram.
- O configurador abre o WhatsApp com modelo, tecido, cor, acabamento, quantidade, tipo de espaço, momento, nome e um link que reabre a configuração.
- Eventos medidos (`src/lib/analytics.ts`): `whatsapp_clique`, `telefone_clique`, `como_chegar_clique`, `instagram_clique`, `orcamento_configurador`, `orcamento_salao_completo`, `configuracao_copiada` (todos com a `origem` do clique).
- **Vercel Analytics** liga sozinho na Vercel (eventos personalizados exigem o plano Pro). **GA4** é opcional: defina `NEXT_PUBLIC_GA_ID`.

---

## 11. Deploy na Vercel com domínio próprio

1. **Suba o código** para um repositório no GitHub (o projeto fica na pasta `so-salao-brasilia/`).
2. Em [vercel.com/new](https://vercel.com/new), importe o repositório e, em **Root Directory**, escolha `so-salao-brasilia`. O framework é detectado como Next.js; não mude os comandos de build.
3. Em **Settings → Environment Variables**, crie:
   - `NEXT_PUBLIC_SITE_URL` = `https://www.seudominio.com.br` (o domínio final, sem barra no fim)
   - `NEXT_PUBLIC_GA_ID` (opcional)
4. Clique em **Deploy**. Confira o site no endereço `*.vercel.app`.
5. Em **Settings → Domains**, adicione `seudominio.com.br` e `www.seudominio.com.br`. Defina um deles como principal (o outro redireciona).
6. No painel onde o domínio foi registrado (ex.: Registro.br), configure o DNS como a Vercel indicar:
   - domínio raiz: registro **A** apontando para o IP mostrado pela Vercel;
   - `www`: registro **CNAME** apontando para o endereço mostrado pela Vercel.
   No Registro.br, isso fica em "Editar zona" (ou troque os servidores DNS para os da Vercel, se preferir).
7. Aguarde a propagação (de minutos a algumas horas). O HTTPS é emitido automaticamente.
8. Em **Analytics**, clique em **Enable** para ligar o Vercel Analytics.
9. Depois do deploy no domínio final: envie `https://www.seudominio.com.br/sitemap.xml` no Google Search Console e valide o JSON-LD no [Teste de pesquisa aprimorada](https://search.google.com/test/rich-results).
10. Atualize o Perfil da Empresa no Google com o mesmo endereço, telefone e horário do site (consistência ajuda no SEO local).

## 12. Checklist antes de publicar

- [ ] `npm run confirmar -- --falhar` sem pendências
- [ ] Fotos com autorização em `public/images/galeria/` e da fachada
- [ ] `NEXT_PUBLIC_SITE_URL` com o domínio final
- [ ] Teste do botão "Pedir orçamento deste modelo" no celular (abre o WhatsApp certo?)
- [ ] Lighthouse mobile no domínio final
